package in.ruralconnect;

import static in.ruralconnect.Store.*;

import jakarta.servlet.http.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.time.*;
import java.util.*;
import javax.imageio.*;
import javax.imageio.stream.ImageInputStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.http.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.*;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class Api {
  final Store st;
  final String dummy;

  Api(Store st) {
    this.st = st;
    this.dummy = st.encoder().encode(UUID.randomUUID().toString());
  }

  Map<String, Object> current(Authentication a) {
    if (a == null || a instanceof AnonymousAuthenticationToken) return null;
    return st.user(Long.parseLong(a.getName()));
  }

  Map<String, Object> role(Authentication a, String... roles) {
    Map<String, Object> u = current(a);
    if (u == null || !List.of(roles).contains(u.get("role"))) throw denied();
    return u;
  }

  void sign(long uid, String role, HttpServletRequest req, HttpServletResponse res) {
    if (req.getSession(false) != null) req.getSession().invalidate();
    req.getSession(true);
    SecurityContext c = SecurityContextHolder.createEmptyContext();
    c.setAuthentication(
        UsernamePasswordAuthenticationToken.authenticated(
            String.valueOf(uid), null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    SecurityContextHolder.setContext(c);
    new HttpSessionSecurityContextRepository().saveContext(c, req, res);
  }

  @GetMapping("/session")
  Object session(Authentication a, CsrfToken token, HttpServletRequest req) {
    var m = new HashMap<String, Object>();
    m.put("csrf", token.getToken());
    m.put("csrfHeader", token.getHeaderName());
    try {
      m.put("user", current(a));
    } catch (ResponseStatusException ex) {
      if (req.getSession(false) != null) req.getSession().invalidate();
      m.put("user", null);
    }
    return m;
  }

  @PostMapping("/register")
  Object register(
      @RequestBody Map<String, Object> b, HttpServletRequest req, HttpServletResponse res) {
    long uid = st.register(b);
    sign(uid, s(b, "role"), req, res);
    return Map.of("id", uid);
  }

  @PostMapping("/login")
  Object login(
      @RequestBody Map<String, Object> b, HttpServletRequest req, HttpServletResponse res) {
    var l = st.rows("SELECT id,role,enabled,password_hash FROM users WHERE email=?", email(b));
    String raw = Objects.toString(b.get("password"), "");
    boolean ok =
        raw.length() <= 72
            && st.encoder()
                .matches(raw, l.isEmpty() ? dummy : (String) l.get(0).get("password_hash"));
    if (!ok
        || l.isEmpty()
        || !flag(l.get(0).get("enabled"))
        || !l.get(0).get("role").equals(b.get("role")))
      throw new ResponseStatusException(
          HttpStatus.UNAUTHORIZED,
          "Email, password or account type is incorrect, or this account is inactive.");
    sign(id(l.get(0)), s(b, "role"), req, res);
    return Map.of("ok", true);
  }

  @PostMapping("/logout")
  void logout(HttpServletRequest req) {
    req.getSession().invalidate();
    SecurityContextHolder.clearContext();
  }

  @GetMapping("/jobs")
  Object jobs(
      Authentication a,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String location) {
    return st.jobs(
        LIVE
            + " AND (j.title LIKE ? OR e.company LIKE ? OR EXISTS(SELECT 1 FROM job_required_skills"
            + " js JOIN skills ss ON ss.id=js.skill_id WHERE js.job_id=j.id AND ss.label LIKE ?))"
            + " AND j.location LIKE ?",
        current(a),
        "%" + q + "%",
        "%" + q + "%",
        "%" + q + "%",
        "%" + location + "%");
  }

  @GetMapping("/job/{jid}")
  Object job(Authentication a, @PathVariable long jid) {
    return st.job(jid, current(a));
  }

  @GetMapping("/workspace")
  Object workspace(Authentication a) {
    return st.workspace(role(a, "SEEKER", "EMPLOYER", "ADMIN"));
  }

  @PutMapping("/profile")
  void profile(Authentication a, @RequestBody Map<String, Object> b) {
    st.updateProfile(role(a, "SEEKER", "EMPLOYER"), b);
  }

  @GetMapping("/person/{uid}")
  Object person(Authentication a, @PathVariable long uid) {
    var u = role(a, "SEEKER", "EMPLOYER", "ADMIN");
    if (!st.canReadPerson(uid, u)) throw denied();
    return st.profile(uid);
  }

  @PostMapping("/vacancy")
  Object post(Authentication a, @RequestBody Map<String, Object> b) {
    return Map.of("id", st.vacancy(0, id(role(a, "EMPLOYER")), b));
  }

  @PutMapping("/vacancy/{jid}")
  Object update(Authentication a, @PathVariable long jid, @RequestBody Map<String, Object> b) {
    return Map.of("id", st.vacancy(jid, id(role(a, "EMPLOYER")), b));
  }

  @PostMapping("/vacancy/{jid}/close")
  void close(Authentication a, @PathVariable long jid) {
    var u = role(a, "ADMIN", "EMPLOYER");
    if (u.get("role").equals("EMPLOYER")) st.checkOwner(jid, id(u));
    if (st.db().update("UPDATE jobs SET publication='Closed' WHERE id=?", jid) == 0) throw absent();
  }

  @DeleteMapping("/vacancy/{jid}")
  void delete(Authentication a, @PathVariable long jid) {
    long uid = id(role(a, "EMPLOYER"));
    st.checkOwner(jid, uid);
    if (st.db()
            .update(
                "DELETE FROM jobs WHERE id=? AND employer_id=? AND (publication<>'Published' OR"
                    + " deadline<CURDATE()) AND NOT EXISTS(SELECT 1 FROM applications WHERE"
                    + " job_id=?)",
                jid,
                uid,
                jid)
        == 0) throw bad("Only inactive jobs without applications may be deleted.");
  }

  @PostMapping("/apply/{jid}")
  void apply(Authentication a, @PathVariable long jid) {
    st.apply(jid, role(a, "SEEKER"));
  }

  @PostMapping("/save/{jid}")
  @Transactional
  void save(Authentication a, @PathVariable long jid) {
    var u = role(a, "SEEKER");
    if (st.db().update("DELETE FROM saved_jobs WHERE user_id=? AND job_id=?", id(u), jid) == 0) {
      st.job(jid, u);
      st.db().update("INSERT INTO saved_jobs VALUES(?,?)", id(u), jid);
    }
  }

  @PutMapping("/application/{aid}")
  void decide(Authentication a, @PathVariable long aid, @RequestBody Map<String, Object> b) {
    st.decision(aid, id(role(a, "EMPLOYER")), s(b, "status"));
  }

  @PostMapping("/read")
  void read(Authentication a) {
    st.db().update("UPDATE notifications SET seen=TRUE WHERE user_id=?", id(role(a, "SEEKER")));
  }

  @PostMapping("/user/{uid}/toggle")
  void toggle(Authentication a, @PathVariable long uid) {
    role(a, "ADMIN");
    if (st.db().update("UPDATE users SET enabled=NOT enabled WHERE id=? AND role<>'ADMIN'", uid)
        == 0) throw denied();
  }

  @PostMapping("/contact")
  void contact(@RequestBody Map<String, Object> b) {
    st.db()
        .update(
            "INSERT INTO contact_messages(email,message) VALUES(?,?)",
            email(b),
            str(b, "message", 5000, true));
  }

  @PostMapping("/resume")
  void resume(Authentication a, @RequestParam MultipartFile file) throws IOException {
    long uid = id(role(a, "SEEKER"));
    if (!Objects.toString(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT).endsWith(".pdf")
        || !"application/pdf".equals(file.getContentType())
        || file.getSize() > 5 * 1024 * 1024
        || file.isEmpty()) throw bad("Choose a PDF résumé no larger than 5 MB.");
    byte[] bytes = file.getBytes();
    if (bytes.length < 5
        || !new String(bytes, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-"))
      throw bad("The uploaded file is not a PDF.");
    try (PDDocument d = Loader.loadPDF(bytes)) {
      if (d.isEncrypted() || d.getNumberOfPages() < 1 || d.getNumberOfPages() > 100)
        throw bad("Use an unencrypted résumé of 1–100 pages.");
    } catch (IOException ex) {
      throw bad("The PDF could not be read.");
    }
    st.db().update("UPDATE job_seeker_profiles SET resume=? WHERE user_id=?", bytes, uid);
  }

  @GetMapping("/resume/{uid}")
  ResponseEntity<byte[]> resume(
      Authentication a,
      @PathVariable long uid,
      @RequestParam(defaultValue = "false") boolean download) {
    var u = role(a, "SEEKER", "EMPLOYER", "ADMIN");
    if (!st.canReadPerson(uid, u)) throw denied();
    byte[] bytes =
        (byte[])
            st.one(
                    "SELECT resume FROM job_seeker_profiles WHERE user_id=? AND resume IS NOT NULL",
                    uid)
                .get("resume");
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(
            "Content-Disposition",
            (download ? "attachment" : "inline") + "; filename=\"resume.pdf\"")
        .header("Content-Security-Policy", "sandbox; default-src 'none'")
        .cacheControl(CacheControl.noStore())
        .body(bytes);
  }

  @PostMapping("/logo")
  void logo(Authentication a, @RequestParam MultipartFile file) throws IOException {
    long uid = id(role(a, "EMPLOYER"));
    if (!Set.of("image/png", "image/jpeg").contains(Objects.toString(file.getContentType(), ""))
        || file.getSize() > 2 * 1024 * 1024) throw bad("Choose a PNG or JPEG under 2 MB.");
    try (ImageInputStream is = ImageIO.createImageInputStream(file.getInputStream())) {
      var it = ImageIO.getImageReaders(is);
      if (!it.hasNext()) throw bad("Invalid image.");
      ImageReader r = it.next();
      try {
        r.setInput(is, true, true);
        if (!Set.of("png", "jpeg", "jpg").contains(r.getFormatName().toLowerCase(Locale.ROOT))
            || (long) r.getWidth(0) * r.getHeight(0) > 4_000_000)
          throw bad("Use a PNG or JPEG logo under 4 megapixels.");
        BufferedImage img = r.read(0);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        st.db()
            .update("UPDATE employer_profiles SET logo=? WHERE user_id=?", out.toByteArray(), uid);
      } finally {
        r.dispose();
      }
    }
  }

  @GetMapping("/logo/{uid}")
  ResponseEntity<byte[]> logo(@PathVariable long uid) {
    byte[] b =
        (byte[])
            st.one("SELECT logo FROM employer_profiles WHERE user_id=? AND logo IS NOT NULL", uid)
                .get("logo");
    return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(b);
  }
}
