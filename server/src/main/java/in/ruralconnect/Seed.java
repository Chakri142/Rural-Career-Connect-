package in.ruralconnect;

import static in.ruralconnect.Store.*;

import java.io.*;
import java.time.*;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.springframework.boot.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class Seed implements ApplicationRunner {
  final Store st;

  Seed(Store s) {
    st = s;
  }

  static String env(String k) {
    return Objects.toString(System.getenv(k), "");
  }

  static Map<String, Object> map(String... vs) {
    Map<String, Object> b = new HashMap<>();
    for (int i = 0; i < vs.length; i += 2) b.put(vs[i], vs[i + 1]);
    return b;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) throws Exception {
    if (st.count("SELECT COUNT(*) FROM users WHERE role='ADMIN'") == 0
        && !env("RCC_ADMIN_PASSWORD").isEmpty()) {
      if (env("RCC_ADMIN_PASSWORD").length() < 12)
        throw new IllegalArgumentException(
            "Administrator password must be at least 12 characters.");
      st.db()
          .update(
              "INSERT INTO users(name,email,mobile,password_hash,role) VALUES(?,?,?,?, 'ADMIN')",
              "Platform administrator",
              env("RCC_ADMIN_EMAIL").isEmpty() ? "admin@example.test" : env("RCC_ADMIN_EMAIL"),
              "0000000000",
              st.encoder().encode(env("RCC_ADMIN_PASSWORD")));
    }
    if (!env("RCC_SEED").equalsIgnoreCase("true")
        || st.count("SELECT COUNT(*) FROM users WHERE email='meena@example.test'") > 0) return;
    String ep = env("RCC_EMPLOYER_PASSWORD"), cp = env("RCC_SEEKER_PASSWORD");
    Map<String, Object> b =
        map(
            "name",
            "Arun",
            "company",
            "Marudham Community Works",
            "email",
            "employer@example.test",
            "mobile",
            "9000000001",
            "password",
            ep,
            "confirm",
            ep,
            "role",
            "EMPLOYER",
            "industry",
            "Community services",
            "address",
            "Kanchipuram, Tamil Nadu");
    long emp = st.register(b);
    b.put(
        "description",
        "A fictional community enterprise used for learning and project demonstrations. These are"
            + " sample openings, not real offers.");
    st.updateProfile(st.user(emp), b);
    b =
        map(
            "name",
            "Meena",
            "email",
            "meena@example.test",
            "mobile",
            "9000000002",
            "password",
            cp,
            "confirm",
            cp,
            "role",
            "SEEKER",
            "location",
            "Kanchipuram",
            "qualification",
            "B.Com.");
    long uid = st.register(b);
    b.putAll(
        map(
            "degree",
            "B.Com.",
            "district",
            "Kanchipuram",
            "state",
            "Tamil Nadu",
            "interest",
            "Office work",
            "institution",
            "Sample Arts and Science College",
            "type",
            "Full-time"));
    b.put("skills", List.of("Excel", "Typing", "Email"));
    st.updateProfile(st.user(uid), b);
    try (var doc = new PDDocument();
        var out = new ByteArrayOutputStream()) {
      var p = new PDPage();
      doc.addPage(p);
      try (var cs = new PDPageContentStream(doc, p)) {
        cs.beginText();
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 21);
        cs.newLineAtOffset(52, 730);
        cs.showText("Meena | Sample resume");
        cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 13);
        for (String line :
            List.of(
                "Fictional candidate for Rural Career Connect.",
                "Qualification: B.Com.",
                "Preferred location: Kanchipuram, Tamil Nadu",
                "Skills: Excel, Typing, Email",
                "Career interest: Office administration")) {
          cs.newLineAtOffset(0, -31);
          cs.showText(line);
        }
        cs.endText();
      }
      doc.save(out);
      st.db()
          .update(
              "UPDATE job_seeker_profiles SET resume=? WHERE user_id=?", out.toByteArray(), uid);
    }
    String[][] data = {
      {
        "Office Assistant",
        "Office Jobs",
        "B.Com.",
        "Kanchipuram",
        "Excel,Typing,Email,Tally",
        "Maintain office records, prepare spreadsheets and coordinate daily correspondence."
      },
      {
        "Accounts Assistant",
        "Accounting",
        "B.Com.",
        "Chennai",
        "Tally,Excel,Bookkeeping",
        "Record transactions and reconcile sample invoices with the accounts team."
      },
      {
        "Data Entry Operator",
        "Data Entry",
        "Any degree",
        "Chengalpattu",
        "Typing,Excel,Accuracy",
        "Enter records carefully, verify entries and prepare daily data summaries."
      },
      {
        "Junior IT Support",
        "IT Jobs",
        "Diploma",
        "Chennai",
        "Networking,Troubleshooting,Email",
        "Assist staff with device setup and record support requests."
      },
      {
        "Customer Support Associate",
        "Customer Support",
        "Any degree",
        "Kanchipuram",
        "Tamil,Email,Communication",
        "Answer customer questions and maintain clear service records."
      },
      {
        "Learning Centre Teacher",
        "Education",
        "B.Ed.",
        "Tiruvallur",
        "Teaching,Tamil,Lesson planning",
        "Plan learning activities and support small groups of students."
      },
      {
        "Clinic Receptionist",
        "Healthcare",
        "Any degree",
        "Kanchipuram",
        "Scheduling,Typing,Communication",
        "Coordinate appointments and assist visitors at reception."
      },
      {
        "Marketing Coordinator",
        "Marketing",
        "BBA",
        "Chennai",
        "Communication,Excel,Planning",
        "Prepare outreach calendars and organise community events."
      }
    };
    int i = 0;
    for (String[] j : data) {
      var v =
          map(
              "title",
              j[0],
              "category",
              j[1],
              "qualification",
              j[2],
              "location",
              j[3],
              "responsibilities",
              j[5],
              "description",
              "This fictional "
                  + j[0]
                  + " vacancy illustrates a local employment opportunity. Work with a small team"
                  + " and build practical experience.",
              "experience",
              "Entry level",
              "type",
              i == 5 ? "Part-time" : "Full-time",
              "deadline",
              LocalDate.now().plusDays(90 + i).toString(),
              "publication",
              "Published");
      v.put("skills", List.of(j[4].split(",")));
      long jid = st.vacancy(0, emp, v);
      st.db()
          .update(
              "UPDATE jobs SET sample=1,posted=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL ? DAY) WHERE"
                  + " id=?",
              i++,
              jid);
    }
  }
}
