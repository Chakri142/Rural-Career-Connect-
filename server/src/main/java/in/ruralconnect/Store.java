package in.ruralconnect;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.text.Normalizer;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class Store {
  JdbcTemplate db() {
    return sql;
  }

  BCryptPasswordEncoder encoder() {
    return enc;
  }

  final JdbcTemplate sql;
  final ObjectMapper json;
  final BCryptPasswordEncoder enc;

  Store(JdbcTemplate sql, ObjectMapper json, BCryptPasswordEncoder enc) {
    this.sql = sql;
    this.json = json;
    this.enc = enc;
  }

  static ResponseStatusException bad(String m) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, m);
  }

  static ResponseStatusException denied() {
    return new ResponseStatusException(
        HttpStatus.FORBIDDEN, "You do not have access to this record.");
  }

  static ResponseStatusException absent() {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, "This record was not found.");
  }

  static final List<String>
      CATS =
          List.of(
              "Office Jobs",
              "IT Jobs",
              "Accounting",
              "Data Entry",
              "Customer Support",
              "Education",
              "Healthcare",
              "Marketing"),
      TYPES = List.of("Full-time", "Part-time", "Contract", "Internship"),
      STATES = List.of("Pending", "Shortlisted", "Selected", "Rejected");

  static String str(Map<String, ?> m, String k, int max, boolean required) {
    Object v = m.get(k);
    String s = v == null ? "" : v instanceof String ? (String) v : String.valueOf(v);
    s = s.strip();
    if (required && s.isEmpty()) throw bad("Please enter " + k + ".");
    if (s.length() > max) throw bad(k + " is too long.");
    return s;
  }

  static String s(Map<String, ?> m, String k) {
    return str(m, k, 180, true);
  }

  static String email(Map<String, ?> m) {
    String v = s(m, "email").toLowerCase(Locale.ROOT);
    if (!v.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw bad("Enter a valid email address.");
    return v;
  }

  static String mobile(Map<String, ?> m) {
    String v = str(m, "mobile", 18, true);
    if (!v.matches("[+0-9 ()-]+") || !v.replaceAll("\\D", "").matches("[0-9]{10,15}"))
      throw bad("Enter a mobile number with 10–15 digits.");
    return v;
  }

  static long num(Object v) {
    return ((Number) v).longValue();
  }

  static long id(Map<String, Object> m) {
    return num(m.get("id"));
  }

  static boolean flag(Object o) {
    return Boolean.TRUE.equals(o) || o instanceof Number && ((Number) o).intValue() != 0;
  }

  List<Map<String, Object>> rows(String q, Object... args) {
    return sql.queryForList(q, args);
  }

  Map<String, Object> one(String q, Object... args) {
    List<Map<String, Object>> l = rows(q, args);
    if (l.isEmpty()) throw absent();
    return l.get(0);
  }

  long count(String q, Object... a) {
    return sql.queryForObject(q, Long.class, a);
  }

  long insert(String q, Object... args) {
    KeyHolder k = new GeneratedKeyHolder();
    sql.update(
        c -> {
          PreparedStatement p = c.prepareStatement(q, Statement.RETURN_GENERATED_KEYS);
          for (int i = 0; i < args.length; i++) p.setObject(i + 1, args[i]);
          return p;
        },
        k);
    return k.getKey().longValue();
  }

  Map<String, Object> user(long id) {
    Map<String, Object> u =
        one("SELECT id,name,email,role,mobile,enabled,created FROM users WHERE id=?", id);
    if (!flag(u.get("enabled"))) throw denied();
    return u;
  }

  String encode(Object o) {
    try {
      return json.writeValueAsString(o);
    } catch (Exception e) {
      throw bad("Invalid profile information.");
    }
  }

  @SuppressWarnings("unchecked")
  Map<String, Object> decode(Object o) {
    try {
      return json.readValue(String.valueOf(o), Map.class);
    } catch (Exception e) {
      throw bad("Invalid saved profile.");
    }
  }

  @Transactional
  public long register(Map<String, Object> b) {
    String role = s(b, "role");
    if (!List.of("SEEKER", "EMPLOYER").contains(role)) throw bad("Select a public account type.");
    String pw = Objects.toString(b.get("password"), "");
    if (pw.length() < 8
        || pw.getBytes(StandardCharsets.UTF_8).length > 72
        || !pw.equals(b.get("confirm")))
      throw bad("Use an 8–72 byte password and confirm it correctly.");
    long uid =
        insert(
            "INSERT INTO users(name,email,mobile,password_hash,role) VALUES(?,?,?,?,?)",
            str(b, "name", 150, true),
            email(b),
            mobile(b),
            enc.encode(pw),
            role);
    if (role.equals("SEEKER"))
      sql.update(
          "INSERT INTO job_seeker_profiles VALUES(?,?,?,'{}',NULL)",
          uid,
          s(b, "location"),
          str(b, "qualification", 160, true));
    else
      sql.update(
          "INSERT INTO employer_profiles VALUES(?,?,?,NULL)",
          uid,
          s(b, "company"),
          encode(Map.of("industry", s(b, "industry"), "address", str(b, "address", 500, true))));
    return uid;
  }

  List<String> labels(long uid, boolean job) {
    return sql.queryForList(
        job
            ? "SELECT s.label FROM job_required_skills x JOIN skills s ON s.id=x.skill_id WHERE"
                + " x.job_id=? ORDER BY s.id"
            : "SELECT s.label FROM candidate_skills x JOIN skills s ON s.id=x.skill_id WHERE"
                + " x.candidate_id=? ORDER BY s.id",
        String.class,
        uid);
  }

  static String norm(String v) {
    return Normalizer.normalize(v, Normalizer.Form.NFKC)
        .strip()
        .replaceAll("\\s+", " ")
        .toLowerCase(Locale.ROOT);
  }

  void skills(long id, Object raw, boolean job) {
    if (!(raw instanceof List<?> vs) || vs.size() > 80)
      throw bad("Provide a list of up to 80 skills.");
    String table = job ? "job_required_skills" : "candidate_skills",
        key = job ? "job_id" : "candidate_id";
    sql.update("DELETE FROM " + table + " WHERE " + key + "=?", id);
    Set<String> seen = new HashSet<>();
    for (Object v : vs) {
      if (!(v instanceof String)) throw bad("Invalid skill.");
      String display = ((String) v).strip(), name = norm(display);
      if (name.isBlank()) continue;
      if (name.length() > 64 || display.length() > 64)
        throw bad("Each skill must be at most 64 characters.");
      if (!seen.add(name)) continue;
      sql.update(
          "INSERT INTO skills(norm,label) VALUES(?,?) ON DUPLICATE KEY UPDATE norm=norm",
          name,
          display);
      sql.update(
          "INSERT INTO " + table + " (" + key + ",skill_id) SELECT ?,id FROM skills WHERE norm=?",
          id,
          name);
    }
    if (job && seen.isEmpty()) throw bad("List at least one required skill.");
  }

  Map<String, Object> profile(long uid) {
    Map<String, Object> out =
        new LinkedHashMap<>(
            one("SELECT id,name,email,mobile,role,enabled,created FROM users WHERE id=?", uid));
    String r = (String) out.get("role");
    if (r.equals("ADMIN")) return out;
    Map<String, Object> p =
        one(
            r.equals("SEEKER")
                ? "SELECT location,qualification,details,resume IS NOT NULL AS resume FROM"
                    + " job_seeker_profiles WHERE user_id=?"
                : "SELECT company,details,logo IS NOT NULL AS hasLogo FROM employer_profiles WHERE"
                    + " user_id=?",
            uid);
    out.putAll(decode(p.remove("details")));
    out.putAll(p);
    if (r.equals("SEEKER")) out.put("skills", labels(uid, false));
    return out;
  }

  @Transactional
  public void updateProfile(Map<String, Object> u, Map<String, Object> b) {
    long uid = id(u);
    String r = (String) u.get("role");
    if (r.equals("ADMIN")) throw denied();
    sql.update(
        "UPDATE users SET name=?,email=?,mobile=? WHERE id=?",
        str(b, "name", 150, true),
        email(b),
        mobile(b),
        uid);
    Map<String, String> extras = new LinkedHashMap<>();
    List<String> keys =
        r.equals("SEEKER")
            ? List.of(
                "dob",
                "gender",
                "address",
                "district",
                "state",
                "degree",
                "institution",
                "graduationYear",
                "grade",
                "experience",
                "employment",
                "type",
                "salary",
                "interest")
            : List.of("industry", "address", "description", "website");
    for (String k : keys) extras.put(k, str(b, k, k.equals("description") ? 5000 : 500, false));
    if (r.equals("SEEKER")) {
      String dob = extras.get("dob"), year = extras.get("graduationYear");
      if (!dob.isEmpty() && LocalDate.parse(dob).isAfter(LocalDate.now()))
        throw bad("Date of birth cannot be in the future.");
      if (!year.isEmpty() && !year.matches("(19|20)[0-9]{2}"))
        throw bad("Enter a four-digit graduation year.");
      sql.update(
          "UPDATE job_seeker_profiles SET location=?,qualification=?,details=? WHERE user_id=?",
          s(b, "location"),
          str(b, "qualification", 160, true),
          encode(extras),
          uid);
      skills(uid, b.get("skills"), false);
    } else {
      sql.update(
          "UPDATE employer_profiles SET company=?,details=? WHERE user_id=?",
          s(b, "company"),
          encode(extras),
          uid);
    }
  }

  static final String BASE =
      "SELECT j.*,e.company,JSON_UNQUOTE(JSON_EXTRACT(e.details,'$.description')) AS"
          + " companyInfo,e.logo IS NOT NULL AS hasLogo, CASE WHEN j.publication='Draft' THEN"
          + " 'Draft' WHEN j.publication='Closed' OR u.enabled=0 THEN 'Closed' WHEN"
          + " j.deadline<CURDATE() THEN 'Expired' ELSE 'Active' END AS lifecycle,(SELECT COUNT(*)"
          + " FROM applications a WHERE a.job_id=j.id) AS appCount FROM jobs j JOIN"
          + " employer_profiles e ON e.user_id=j.employer_id JOIN users u ON u.id=j.employer_id ";
  static final String LIVE = "j.publication='Published' AND j.deadline>=CURDATE() AND u.enabled=1";

  void match(Map<String, Object> m, List<String> need, List<String> have) {
    Set<String> normalized = new HashSet<>();
    have.forEach(v -> normalized.add(norm(v)));
    // Defensively deduplicate requirements; the database also enforces uniqueness.
    Map<String, String> unique = new LinkedHashMap<>();
    for (String v : need) if (v != null && !norm(v).isBlank()) unique.putIfAbsent(norm(v), v);
    List<String> requirements = new ArrayList<>(unique.values());
    List<String> yes = new ArrayList<>(), no = new ArrayList<>();
    for (String v : requirements) (normalized.contains(norm(v)) ? yes : no).add(v);
    m.put("skills", requirements);
    m.put("matched", yes);
    m.put("missing", no);
    m.put("score", requirements.isEmpty() ? 0 : Math.round(yes.size() * 100.0 / requirements.size()));
  }

  List<Map<String, Object>> jobs(String where, Map<String, Object> u, Object... args) {
    var list = rows(BASE + " WHERE " + where + " ORDER BY j.posted DESC,j.id ASC", args);
    boolean cand = u != null && "SEEKER".equals(u.get("role"));
    var have = cand ? labels(id(u), false) : List.<String>of();
    for (var j : list) {
      match(j, labels(id(j), true), have);
      if (cand) {
        j.put(
            "saved",
            count("SELECT COUNT(*) FROM saved_jobs WHERE user_id=? AND job_id=?", id(u), id(j))
                > 0);
        j.put(
            "applied",
            count(
                    "SELECT COUNT(*) FROM applications WHERE candidate_id=? AND job_id=?",
                    id(u),
                    id(j))
                > 0);
      }
    }
    return list;
  }

  Map<String, Object> job(long jid, Map<String, Object> u) {
    var a = jobs("j.id=?", u, jid);
    if (a.isEmpty()) throw absent();
    var j = a.get(0);
    if (!"Active".equals(j.get("lifecycle"))
        && (u == null
            || !("ADMIN".equals(u.get("role"))
                || num(j.get("employer_id")) == id(u)
                || count(
                        "SELECT COUNT(*) FROM applications WHERE job_id=? AND candidate_id=?",
                        jid,
                        id(u))
                    > 0
                || count("SELECT COUNT(*) FROM saved_jobs WHERE job_id=? AND user_id=?", jid, id(u))
                    > 0))) throw absent();
    return j;
  }

  void checkOwner(long jid, long uid) {
    if (count("SELECT COUNT(*) FROM jobs WHERE id=? AND employer_id=?", jid, uid) == 0)
      throw denied();
  }

  @Transactional
  public long vacancy(long jid, long uid, Map<String, Object> b) {
    if (jid != 0) checkOwner(jid, uid);
    String pub = s(b, "publication"), category = s(b, "category"), type = s(b, "type");
    if (!List.of("Draft", "Published").contains(pub)
        || !CATS.contains(category)
        || !TYPES.contains(type)) throw bad("Invalid vacancy options.");
    LocalDate date = LocalDate.parse(s(b, "deadline"));
    if (pub.equals("Published") && date.isBefore(LocalDate.now(ZoneId.of("Asia/Kolkata"))))
      throw bad("A published vacancy needs a current or future deadline.");
    var a =
        new ArrayList<Object>(
            List.of(
                s(b, "title"),
                str(b, "description", 5000, true),
                str(b, "responsibilities", 5000, true),
                str(b, "qualification", 160, true),
                s(b, "experience"),
                s(b, "location"),
                category,
                type,
                str(b, "salary", 150, false),
                date,
                pub));
    boolean publish =
        jid == 0
            || !"Published"
                .equals(one("SELECT publication FROM jobs WHERE id=?", jid).get("publication"));
    if (jid == 0) {
      a.add(uid);
      jid =
          insert(
              "INSERT INTO"
                  + " jobs(title,description,responsibilities,qualification,experience,location,category,type,salary,deadline,publication,employer_id)"
                  + " VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
              a.toArray());
    } else {
      a.add(jid);
      a.add(uid);
      sql.update(
          "UPDATE jobs SET"
              + " title=?,description=?,responsibilities=?,qualification=?,experience=?,location=?,category=?,type=?,salary=?,deadline=?,publication=?"
              + " WHERE id=? AND employer_id=?",
          a.toArray());
    }
    skills(jid, b.get("skills"), true);
    if (pub.equals("Published"))
      sql.update(
          "INSERT INTO notifications(user_id,message) SELECT DISTINCT cs.candidate_id,? FROM"
              + " candidate_skills cs JOIN job_required_skills js ON js.skill_id=cs.skill_id JOIN"
              + " users us ON us.id=cs.candidate_id AND us.enabled=1 WHERE js.job_id=?",
          (publish ? "New" : "Updated") + " vacancy matching your skills: " + s(b, "title"),
          jid);
    return jid;
  }

  List<Map<String, Object>> apps(Map<String, Object> u) {
    String r = (String) u.get("role");
    String q =
        "SELECT a.*,j.title,e.company,u.name,p.qualification,p.location FROM applications a JOIN"
            + " jobs j ON a.job_id=j.id JOIN employer_profiles e ON e.user_id=j.employer_id JOIN"
            + " users u ON u.id=a.candidate_id JOIN job_seeker_profiles p ON p.user_id=u.id";
    var result =
        r.equals("ADMIN")
            ? rows(q + " ORDER BY a.updated DESC,a.id DESC")
            : rows(
                q
                    + (r.equals("EMPLOYER") ? " WHERE j.employer_id=?" : " WHERE a.candidate_id=?")
                    + " ORDER BY a.updated DESC,a.id DESC",
                id(u));
    for (var a : result)
      match(a, labels(num(a.get("job_id")), true), labels(num(a.get("candidate_id")), false));
    return result;
  }

  @Transactional
  public void apply(long jid, Map<String, Object> u) {
    if (rows(
            "SELECT j.id FROM jobs j JOIN users u ON u.id=j.employer_id WHERE j.id=? AND "
                + LIVE
                + " FOR SHARE",
            jid)
        .isEmpty()) throw bad("This vacancy is not accepting applications.");
    sql.update("INSERT INTO applications(candidate_id,job_id) VALUES(?,?)", id(u), jid);
    sql.update(
        "INSERT INTO notifications(user_id,message) SELECT ?,CONCAT('Application submitted:"
            + " ',title,'. Current status: Pending.') FROM jobs WHERE id=?",
        id(u),
        jid);
  }

  @Transactional
  public void decision(long aid, long employer, String status) {
    if (!STATES.contains(status)) throw bad("Choose a valid application status.");
    var l =
        rows(
            "SELECT a.candidate_id,a.status,j.title FROM applications a JOIN jobs j ON"
                + " j.id=a.job_id WHERE a.id=? AND j.employer_id=? FOR UPDATE",
            aid,
            employer);
    if (l.isEmpty()) throw denied();
    var a = l.get(0);
    if (status.equals(a.get("status"))) return;
    sql.update(
        "UPDATE applications SET status=?,updated=CURRENT_TIMESTAMP WHERE id=?", status, aid);
    sql.update(
        "INSERT INTO notifications(user_id,message) VALUES(?,?)",
        a.get("candidate_id"),
        a.get("title") + ": your application status is now " + status + ".");
  }

  boolean canReadPerson(long target, Map<String, Object> u) {
    return id(u) == target
        || "ADMIN".equals(u.get("role"))
        || ("EMPLOYER".equals(u.get("role"))
            && count(
                    "SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id=j.id WHERE"
                        + " a.candidate_id=? AND j.employer_id=?",
                    target,
                    id(u))
                > 0);
  }

  Map<String, Object> workspace(Map<String, Object> u) {
    long uid = id(u);
    String r = (String) u.get("role");
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("profile", profile(uid));
    m.put("apps", apps(u));
    switch (r) {
      case "SEEKER" -> {
        m.put("jobs", jobs(LIVE, u));
        m.put("saved", jobs("j.id IN (SELECT job_id FROM saved_jobs WHERE user_id=?)", u, uid));
        m.put(
            "notifications",
            rows("SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC", uid));
      }
      case "EMPLOYER" -> m.put("jobs", jobs("j.employer_id=?", u, uid));
      case "ADMIN" -> {
        m.put("jobs", jobs("1=1", u));
        m.put(
            "users",
            rows(
                "SELECT u.id,u.name,u.email,u.role,u.enabled,u.created,e.company FROM users u LEFT"
                    + " JOIN employer_profiles e ON e.user_id=u.id ORDER BY u.id DESC"));
        m.put(
            "contacts",
            rows("SELECT email,message,created FROM contact_messages ORDER BY id DESC"));
      }
    }
    return m;
  }
}
