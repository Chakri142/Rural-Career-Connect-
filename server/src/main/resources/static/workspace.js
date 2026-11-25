const menus = {
  SEEKER: [
    ["dashboard", "Overview", "layout-dashboard"],
    ["profile", "My profile", "user-round"],
    ["jobs", "Find jobs", "search"],
    ["saved", "Saved jobs", "bookmark"],
    ["applications", "My applications", "files"],
    ["notifications", "Notifications", "bell"],
    ["guidance", "Career guidance", "book-open"],
  ],
  EMPLOYER: [
    ["dashboard", "Overview", "layout-dashboard"],
    ["profile", "Company profile", "building-2"],
    ["post", "Post a job", "plus-circle"],
    ["vacancies", "My vacancies", "briefcase-business"],
    ["applications", "Applicants", "users"],
  ],
  ADMIN: [
    ["dashboard", "Overview", "layout-dashboard"],
    ["users", "User directory", "users"],
    ["vacancies", "All vacancies", "briefcase-business"],
    ["applications", "Applications", "files"],
    ["reports", "Reports", "chart-column"],
  ],
};
function shell(t, html) {
  let r = state.user.role;
  put(
    `<div class="pagebg"><div class="wrap shell"><aside class="dashnav"><span class="eyebrow">${roles[r]} workspace</span>${menus[r].map(([p, l, i]) => btn(l, "#/" + p, route === "/" + p ? "on" : "", i)).join("")}</aside><div class="dashwrap"><div class="breadcrumbs">Workspace / ${H(t)}</div>${html}</div></div></div>`,
  );
}
const stats = (arr) =>
    `<div class="stats">${arr.map(([k, v]) => `<div class="stat"><span>${H(k)}</span><strong>${v}</strong></div>`).join("")}</div>`,
  badge = (s) => `<span class="badge ${H(s)}">${H(s)}</span>`,
  active = (j) => j.lifecycle === "Active",
  statusIs = (a, s) => a.status === s;
function recs(list) {
  return list.length
    ? list
        .slice(0, 4)
        .map(
          (a) =>
            `<div class="record row"><div><b>${H(a.title)}</b><div class="small">${H(a.company)} · ${fmt(a.applied)}</div></div>${badge(a.status)}</div>`,
        )
        .join("")
    : empty(
        "No applications yet",
        "Applications and their latest decisions will appear here.",
      );
}
function charts() {
  const bars = (title, rows) =>
    `<article class="panel"><h3>${title}</h3>${rows.length ? rows.map(([name, v], i) => `<div class="chartrow"><span>${H(name)}</span><i class="bar" style="width:${(v / Math.max(...rows.map((p) => p[1]), 1)) * 100}%;background:${["#a9cbe7", "#afc9a4", "#e9ad91", "#dccbe9"][i % 4]}"></i><b>${v}</b></div>`).join("") : empty("No data yet", "No matching records.")}</article>`;
  let group = (ar, key) =>
    Object.entries(
      ar.reduce((v, a) => ((v[key(a)] = (v[key(a)] || 0) + 1), v), {}),
    );
  return `<div class="stack">${bars(
    "Monthly registrations",
    group(db.users, (u) => String(u.created).slice(0, 7))
      .sort()
      .slice(-12),
  )}${bars(
    "Vacancies by category",
    group(db.jobs, (j) => j.category),
  )}${bars(
    "Applications by status",
    statuses.map((k) => [k, db.apps.filter((a) => a.status === k).length]),
  )}</div>`;
}
function dashboard() {
  let { user: u } = state,
    r = u.role,
    j = db.jobs,
    a = db.apps,
    p = db.profile || {},
    d =
      r === "SEEKER"
        ? [
            ["Jobs available", j.length],
            ["Applications submitted", a.length],
            ["Saved jobs", db.saved.length],
            ["Shortlisted", a.filter((i) => i.status === "Shortlisted").length],
          ]
        : r === "EMPLOYER"
          ? [
              ["Active jobs", j.filter(active).length],
              ["Total applications", a.length],
              [
                "Pending review",
                a.filter((i) => i.status === "Pending").length,
              ],
              [
                "Shortlisted",
                a.filter((i) => i.status === "Shortlisted").length,
              ],
            ]
          : [
              [
                "Job seekers",
                db.users.filter((i) => i.role === "SEEKER").length,
              ],
              [
                "Employers",
                db.users.filter((i) => i.role === "EMPLOYER").length,
              ],
              ["Total vacancies", j.length],
              ["Applications", a.length],
              ["Active vacancies", j.filter(active).length],
              [
                "Closed vacancies",
                j.filter((v) => v.lifecycle === "Closed").length,
              ],
            ];
  let completion = Math.round(
    ([
      p.name,
      p.location,
      p.qualification,
      p.degree,
      p.institution,
      p.skills?.length,
      p.resume,
      p.mobile,
    ].filter(Boolean).length /
      8) *
      100,
  );
  shell(
    "Overview",
    `<div class="welcome"><div><span class="eyebrow">${roles[r]} workspace</span><h1>${r === "SEEKER" ? "Good morning, " : "Welcome, "}${H(u.name.split(" ")[0])}!</h1><p>${r === "SEEKER" ? "Let's find your next opportunity." : r === "EMPLOYER" ? "Your recruitment activity, in one place." : "A live view of the recruitment platform."}</p></div><img src="/art/hero.jpg" alt="Painted village"></div>${stats(d)}<div class="stack">${
      r === "SEEKER"
        ? `<div class="panel"><div class="row"><b>Profile completion · ${completion}%</b>${link("Edit profile", "#/profile")}</div><div class="prog"><i style="width:${completion}%"></i></div></div><div>${heading("For your skills", "Recommended jobs", link("Explore", "#/jobs?sort=match"))}<div class="cardgrid">${
            [...j]
              .sort((a, b) => b.score - a.score)
              .slice(0, 2)
              .map(card)
              .join("") ||
            empty(
              "No current vacancies",
              "Check back when an employer posts a job.",
            )
          }</div></div><div class="panel"><h2>Recently posted</h2>${
            j
              .slice(0, 3)
              .map(
                (v) =>
                  `<p>${link(H(v.title), "#/job/" + v.id)} · ${H(v.location)}</p>`,
              )
              .join("") || "No open roles."
          }</div><div class="panel"><h2>Application status</h2>${recs(a)}</div><div class="panel"><h2>Recent notifications</h2>${
            db.notifications
              .slice(0, 2)
              .map((v) => `<p>${H(v.message)}</p>`)
              .join("") || "<p>No updates yet.</p>"
          }${link("All notifications", "#/notifications")}</div>${link("Open the guidance notebook", "#/guidance")}`
        : r === "EMPLOYER"
          ? `<div class="panel"><h2>Quick actions</h2><div class="actions">${btn("Post new job", "#/post", "btn primary", "plus")}${btn("Manage vacancies", "#/vacancies")}${btn("View applicants", "#/applications")}</div></div><div class="panel"><h2>Recent applications</h2>${recs(a)}</div><div class="panel"><h2>Recently posted vacancies</h2>${
              j
                .slice(0, 4)
                .map(
                  (v) =>
                    `<p>${link(H(v.title), "#/job/" + v.id)} · ${v.lifecycle}</p>`,
                )
                .join("") || "No vacancies yet."
            }</div>`
          : `${charts()}<div class="panel"><h2>Recent recruitment activity</h2>${recs(a)}</div>`
    }</div>`,
  );
}
function filterForm(id, html) {
  return `<form class="panel filters" id="${id}">${html}<div class="actions"><button class="primary">${icon("search")}Search</button><button type="button" class="btn" data-action="reset">Reset</button></div></form>`;
}
const val = (k) => params.get(k) || "",
  filt = (l, k, arr = null) => field(l, k, val(k), "text", false, arr),
  matches = (v, q) =>
    String(v ?? "")
      .toLowerCase()
      .includes(
        String(q || "")
          .trim()
          .toLowerCase(),
      );
function paginate(a, render, size = 9) {
  let total = Math.ceil(a.length / size);
  page = Math.max(1, Math.min(page, total || 1));
  return (
    (a.length
      ? render(a.slice((page - 1) * size, page * size))
      : empty(
          "No matching records",
          "Try a different search or clear your filters.",
        )) +
    (total > 1
      ? `<div class="pagination"><button data-action="previous" class="btn" ${page === 1 ? "disabled" : ""}>Previous</button><span>${page} / ${total}</span><button class="btn" data-action="next" ${page === total ? "disabled" : ""}>Next</button></div>`
      : "")
  );
}
function findjobs() {
  let ar = jobs.filter(
    (j) =>
      matches(j.title + " " + j.company + " " + j.skills.join(" "), val("q")) &&
      ["location", "qualification", "experience"].every((k) =>
        matches(j[k], val(k)),
      ) &&
      ["type", "category"].every((k) => !val(k) || j[k] === val(k)) &&
      matches(j.skills.join(", "), val("skill")),
  );
  if (val("sort") === "match") ar.sort((a, b) => b.score - a.score);
  if (val("sort") === "location")
    ar.sort((a, b) => a.location.localeCompare(b.location));
  put(
    pg(
      "Find jobs",
      filterForm(
        "filters",
        filt("Job title or keyword", "q") +
          filt("City or district", "location") +
          filt("Qualification", "qualification") +
          filt("Job category", "category", cats) +
          filt("Required skill", "skill") +
          filt("Job type", "type", types) +
          filt("Experience", "experience"),
      ) +
        `<div class="row"><b>${ar.length} open ${ar.length === 1 ? "vacancy" : "vacancies"}</b><label class="controls">Sort <select id="sort"><option value="latest">Latest jobs</option><option value="match" ${val("sort") === "match" ? "selected" : ""}>Highest skill match</option><option value="location" ${val("sort") === "location" ? "selected" : ""}>Location</option></select></label></div><br>` +
        paginate(
          ar,
          (a) => `<div class="cardgrid">${a.map(card).join("")}</div>`,
        ),
      "Explore current vacancies and compare what each role requires.",
    ),
  );
}
function details(j) {
  let candidate = state.user?.role === "SEEKER",
    saved = j.saved,
    applied = j.applied;
  put(
    pg(
      j.title,
      `<div class="grid2"><div class="panel stack"><div class="company">${j.hasLogo ? `<img src="/api/logo/${j.employer_id}" width="40" alt="Company logo">` : ""}${H(j.company)} ${j.sample ? '<span class="tag gold">Sample listing</span>' : ""}</div><h2>${H(j.title)}</h2><div class="meta">${icon("map-pin")}${H(j.location)} · ${H(j.type)} · ${H(j.lifecycle)}</div><p><b>Qualification:</b> ${H(j.qualification)}<br><b>Experience:</b> ${H(j.experience)}<br><b>Salary:</b> ${H(j.salary || "Discuss with employer")}<br><b>Apply by:</b> ${fmt(j.deadline)}</p><h3>About this role</h3><p>${H(j.description)}</p><h3>Responsibilities</h3><p>${H(j.responsibilities)}</p><h3>About the company</h3><p>${H(j.companyInfo || j.company)}</p><div class="tags">${tags(j.skills)}</div></div><section class="panel stack" style="align-self:start"><span class="eyebrow">Transparent recommendations</span><h2>Your skill comparison</h2>${candidate ? `<h3>${j.score}% skill match</h3><div class="prog"><i style="width:${j.score}%"></i></div><p>${j.matched.length} of ${j.skills.length} required skills are listed in your profile.</p><b>Matched</b><div>${tags(j.matched) || "None listed"}</div><b>Not yet listed</b><div>${tags(j.missing, "coral") || "All required skills matched"}</div>${j.missing.length ? `<p class="small">Learning suggestion: practise ${H(j.missing[0])}. ${link("Plan your learning", "#/guidance")}</p>` : ""}` : `<p>Sign in as a job seeker to compare your saved skills with the ${j.skills.length} required for this role.</p>`}<p class="info">A match is the share of required skills in your profile, not a prediction of hiring. The employer makes the decision.</p><div class="actions">${candidate ? `<button class="primary" data-action="apply" data-id="${j.id}" ${applied || !active(j) ? "disabled" : ""}>${applied ? "Applied" : active(j) ? "Apply now" : "Not accepting applications"}</button><button class="btn" data-action="save" data-id="${j.id}">${icon("bookmark")}${saved ? "Remove from saved" : "Save job"}</button>` : !state.user ? btn("Sign in to apply", `#/login?next=${U("/job/" + j.id)}`, "btn primary") : ""}</div></section></div>`,
    ),
  );
}
const defs = {
  SEEKER: [
    [
      "Personal information",
      [
        ["Full name", "name"],
        ["Email", "email", "email"],
        ["Mobile number", "mobile", "tel"],
        ["Date of birth", "dob", "date"],
        ["Gender (optional)", "gender"],
        ["Address", "address"],
        ["District", "district"],
        ["State", "state"],
        ["Preferred job location", "location"],
      ],
    ],
    [
      "Education",
      [
        ["Highest qualification", "qualification"],
        ["Degree", "degree"],
        ["Institution", "institution"],
        ["Graduation year", "graduationYear", "number"],
        ["Percentage or CGPA", "grade"],
      ],
    ],
    [
      "Professional information",
      [
        ["Experience", "experience"],
        ["Previous employment", "employment"],
        ["Preferred job type", "type"],
        ["Expected salary (optional)", "salary"],
        ["Career interest", "interest"],
      ],
    ],
  ],
  EMPLOYER: [
    [
      "Company information",
      [
        ["Employer name", "name"],
        ["Company name", "company"],
        ["Email", "email", "email"],
        ["Mobile number", "mobile", "tel"],
        ["Industry", "industry"],
        ["Company address", "address"],
        ["Company description", "description", "textarea"],
        ["Website (optional)", "website", "url"],
      ],
    ],
  ],
};
let skillList = [];
function profile() {
  const r = state.user.role,
    p = db.profile;
  skillList = [...(p.skills || [])];
  shell(
    "Profile",
    `<h1 class="pagetitle">${r === "SEEKER" ? "My profile" : "Company profile"}</h1><p class="sub">Keep your information up to date. Changes are saved to your account.</p><form id="profile" class="stack">${defs[r].map(([t, fs]) => `<section class="panel"><h2>${t}</h2><div class="formgrid">${fs.map(([l, k, ty]) => field(l, k, p[k], ty || "text", ["name", "email", "mobile", "company", "location", "qualification"].includes(k), k === "type" ? types : null)).join("")}</div></section>`).join("")}${r === "SEEKER" ? `<section class="panel"><h2>Skills</h2><p class="small">Add a skill, or select a tag to remove it.</p><div class="controls"><input id="newskill" placeholder="e.g. Excel" aria-label="New skill" maxlength="64"><button class="btn" type="button" data-action="addskill">Add skill</button></div><div class="tags" id="skilltags"></div></section>` : ""}<div class="errfield"></div><button class="primary">Save profile ${icon("check")}</button></form><br><form id="upload" class="panel stack" data-file="${r === "SEEKER" ? "resume" : "logo"}"><h2>${r === "SEEKER" ? "Your résumé" : "Company logo"}</h2>${p.resume ? `<div class="actions"><a target="_blank" rel="noopener" class="btn" href="/api/resume/${state.user.id}">View résumé</a><a class="btn" href="/api/resume/${state.user.id}?download=true">Download PDF</a></div>` : ""}${p.hasLogo ? `<img width="70" src="/api/logo/${state.user.id}" alt="Current company logo">` : ""}<label class="field">${r === "SEEKER" ? "PDF résumé (max 5 MB)" : "PNG or JPEG logo (max 2 MB)"}<input name="file" type="file" accept="${r === "SEEKER" ? "application/pdf" : "image/png,image/jpeg"}" required></label><button class="secondary">Upload or replace</button><div class="errfield"></div></form>`,
  );
  renderSkills();
}
function renderSkills() {
  if ($("#skilltags"))
    $("#skilltags").innerHTML = skillList
      .map(
        (s, i) =>
          `<button class="tag" type="button" data-action="rmskill" data-id="${i}" aria-label="Remove ${H(s)}">${H(s)} ×</button>`,
      )
      .join(" ");
}
function jobform() {
  let j = db.jobs.find((j) => String(j.id) === val("id")) || {};
  shell(
    "Vacancy editor",
    `<h1 class="pagetitle">${j.id ? "Edit vacancy" : "Post a new job"}</h1><form id="jobform" class="panel formgrid" data-id="${j.id || ""}">${field("Job title", "title", j.title, "text", true)}<label class="field">Company<input readonly value="${H(db.profile.company)}"></label>${field("Job description", "description", j.description, "textarea", true, null, true)}${field("Responsibilities", "responsibilities", j.responsibilities, "textarea", true, null, true)}${field("Qualification", "qualification", j.qualification, "text", true)}${field("Required skills (comma separated)", "skills", (j.skills || []).join(", "), "text", true)}${field("Experience required", "experience", j.experience, "text", true)}${field("Job location", "location", j.location, "text", true)}${field("Category", "category", j.category, "text", true, cats)}${field("Job type", "type", j.type, "text", true, types)}${field("Salary range (optional)", "salary", j.salary)}${field("Application deadline", "deadline", j.deadline, "date", true)}<div class="wide errfield"></div><div class="actions wide"><button class="primary" name="action" value="Published">${j.id ? "Save and publish" : "Publish job"}</button><button class="btn" name="action" value="Draft">Save draft</button></div></form>`,
  );
}
function vacs() {
  let admin = state.user.role === "ADMIN",
    ar = db.jobs.filter(
      (j) =>
        matches(j.title + " " + j.company, val("q")) &&
        (!val("status") || j.lifecycle === val("status")) &&
        (!val("category") || j.category === val("category")),
    );
  shell(
    "Vacancies",
    `<div class="row"><h1 class="pagetitle">${admin ? "Vacancy management" : "My vacancies"}</h1>${!admin ? btn("Post a job", "#/post", "btn primary", "plus") : ""}</div>${filterForm("filters", filt("Title or company", "q") + filt("Status", "status", ["Active", "Draft", "Closed", "Expired"]) + filt("Category", "category", cats))}${paginate(ar, (list) => `<div class="panel">${list.map((j) => `<div class="record"><div class="row"><h3>${H(j.title)}</h3>${badge(j.lifecycle)}</div><p class="small">${H(j.company)} · ${H(j.location)} · ${j.appCount} applications · Closes ${fmt(j.deadline)}</p><div class="actions">${btn("View details", "#/job/" + j.id)}${!admin ? btn("Edit", "#/post?id=" + j.id) : ""}${j.lifecycle !== "Closed" ? `<button class="btn" data-action="closejob" data-id="${j.id}">Close vacancy</button>` : ""}${!admin && !j.appCount && j.lifecycle !== "Active" ? `<button class="btn" data-action="deletejob" data-id="${j.id}">Delete</button>` : ""}${btn("Applications", "#/applications?jobId=" + j.id)}</div></div>`).join("")}</div>`)}`,
  );
}
function apps() {
  let r = state.user.role,
    a = db.apps.filter(
      (a) =>
        (!val("jobId") || String(a.job_id) === val("jobId")) &&
        (!val("status") || a.status === val("status")) &&
        matches(a.title, val("job")) &&
        matches(a.company, val("company")),
    );
  shell(
    "Applications",
    `<h1 class="pagetitle">${r === "SEEKER" ? "My applications" : r === "ADMIN" ? "Application monitoring" : "Review applicants"}</h1>${filterForm("filters", filt("Job title", "job") + filt("Company", "company") + filt("Application status", "status", statuses))}${paginate(a, (list) => `<div class="panel">${list.map((i) => `<div class="record"><div class="row"><h3>${H(i.title)}</h3>${badge(i.status)}</div><p>${H(i.company)} · ${H(i.name)} · ${fmt(i.applied)}</p><div class="meta">${H(i.qualification)} · ${H(i.location)} · ${i.score}% current skill match</div><div class="actions">${btn("Job details", "#/job/" + i.job_id)}<button class="btn" data-action="appinfo" data-id="${i.id}">Review ${r === "EMPLOYER" ? "candidate" : "details"}</button>${r === "EMPLOYER" ? `<label class="controls">Decision <select data-status="${i.id}">${opts(statuses, i.status)}</select></label><button class="secondary" data-action="decision" data-id="${i.id}">Save decision</button>` : ""}</div></div>`).join("")}</div>`)}`,
  );
}
function people() {
  let a = db.users.filter(
    (i) =>
      matches(i.name + " " + i.email + " " + (i.company || ""), val("q")) &&
      (!val("role") || roles[i.role] === val("role")) &&
      (!val("status") || (i.enabled ? "Active" : "Inactive") === val("status")),
  );
  shell(
    "User directory",
    `<h1 class="pagetitle">User directory</h1>${filterForm("filters", filt("Search users or companies", "q") + filt("Role", "role", Object.values(roles)) + filt("Account status", "status", ["Active", "Inactive"]))}${paginate(a, (list) => `<div class="panel">${list.map((u) => `<div class="record row"><div><b>${H(u.name)}</b> · ${roles[u.role]}<p class="small">${H(u.email)} · ${u.enabled ? "Active" : "Inactive"}</p></div><div class="actions">${u.role !== "ADMIN" ? `<button class="btn" data-action="person" data-id="${u.id}">View profile</button><button class="btn" data-action="toggle" data-id="${u.id}">${u.enabled ? "Deactivate" : "Activate"}</button>` : ""}</div></div>`).join("")}</div>`)}`,
  );
}
function reports() {
  let range = (d) => {
    d = String(d).slice(0, 10);
    return (!val("from") || d >= val("from")) && (!val("to") || d <= val("to"));
  };
  let users = db.users.filter((u) => range(u.created)),
    js = db.jobs.filter((j) => range(j.posted) && j.publication !== "Draft"),
    as = db.apps.filter(
      (i) => range(i.applied) && (!val("status") || i.status === val("status")),
    );
  let d = [
    ["Registered job seekers", users.filter((i) => i.role === "SEEKER").length],
    ["Registered employers", users.filter((i) => i.role === "EMPLOYER").length],
    ["Published vacancies", js.length],
    ["Applications submitted", as.length],
    ...statuses.map((k) => [k, as.filter((i) => i.status === k).length]),
  ];
  shell(
    "Reports",
    `<h1 class="pagetitle">Recruitment reports</h1><p class="sub">Counts use the creation date of each record. Status filters apply to applications only.</p>${filterForm("filters", field("From date", "from", val("from"), "date") + field("To date", "to", val("to"), "date") + filt("Application status", "status", statuses))}${stats(d)}<button class="btn" data-action="csv">${icon("download")} Download report CSV</button><div id="csvdata" hidden>${H(JSON.stringify(d))}</div><div class="panel"><h2>Matching applications</h2>${recs(as)}</div>`,
  );
}
function messages() {
  shell(
    "Notifications",
    `<div class="row"><h1 class="pagetitle">Notifications</h1>${db.notifications.some((n) => !n.seen) ? '<button class="btn" data-action="read">Mark all as read</button>' : ""}</div>${db.notifications.length ? paginate(db.notifications, (list) => list.map((n) => `<div class="notify ${n.seen ? "read" : ""}"><b>${n.seen ? "Read" : "New"}</b> · ${fmt(n.created)}<p>${H(n.message)}</p></div>`).join("")) : empty("You are all caught up", "Updates about applications and relevant vacancies appear here.")}`,
  );
}
const infoPages = {
  about: [
    "About us",
    "Every talent deserves an opportunity.",
    "Rural Career Connect is an employment and career-guidance project for rural youth. Candidates can see exactly how their skills fit a role, employers keep control of recruitment decisions, and administrators monitor activity. The platform uses Java Spring Boot and MySQL. Sample companies, vacancies and Meena are fictional.",
  ],
  help: [
    "Help centre",
    "How can we help?",
    "Create a job-seeker account, complete your profile and add your skills. Open a vacancy to see your match and apply. Employers can publish jobs and review applications in their workspace. A skill score never automatically shortlists a candidate.",
  ],
  privacy: [
    "Privacy policy",
    "Your profile is not a public directory.",
    "Your account information, skills and résumé are stored to provide recruitment services. Employers can review candidates who apply to their own vacancies. Authorised administrators can access records for platform management. Passwords are hashed and are not shown to other users. Do not upload sensitive personal documents to the demonstration environment.",
  ],
  terms: [
    "Terms and conditions",
    "Use the platform responsibly.",
    "Provide accurate information and do not upload documents you do not have permission to share. No hiring outcome is guaranteed. Review employer requirements before applying. Sample jobs are for demonstration only, not real offers.",
  ],
  contact: [
    "Contact us",
    "Ask the platform team",
    "Send a question about using the portal. Messages are visible to the platform administrator. Do not include private identity numbers or passwords.",
  ],
};
function infopage(key) {
  let [t, h, b] = infoPages[key];
  put(
    pg(
      t,
      `<div class="guidebox"><img src="/art/village.jpg" alt="Painted village noticeboard"><div><span class="eyebrow">Rural Career Connect</span><h2>${h}</h2><p>${b}</p>${key === "help" ? link("Contact the team", "#/contact") : ""}</div></div>${key === "contact" ? `<br><form class="panel formgrid" id="contact">${field("Your email", "email", state.user?.email, "email", true)}${field("Message", "message", "", "textarea", true, null, true)}<button class="primary">Send message</button></form>` : ""}`,
    ),
  );
}
