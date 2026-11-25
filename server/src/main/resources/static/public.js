function card(j) {
  return `<article class="card"><div class="row"><span class="company"><b class="monogram">${H(j.company.slice(0, 2).toUpperCase())}</b>${H(j.company)}</span><span class="tag blue">${H(j.type)}</span></div><h3><a href="#/job/${j.id}">${H(j.title)}</a></h3><div class="meta">${icon("map-pin")}${H(j.location)} · ${H(j.qualification)}</div><div class="tags">${tags(j.skills)}</div>${state.user?.role === "SEEKER" ? `<b class="small">${j.score}% skill match</b>` : ""}<div class="small">Posted ${fmt(j.posted)}${j.sample ? " · Sample listing" : ""}</div><div class="cardfoot">${state.user?.role === "SEEKER" ? `<button class="iconbtn" data-action="save" data-id="${j.id}" aria-label="${j.saved ? "Unsave" : "Save"} ${H(j.title)}" title="${j.saved ? "Remove saved job" : "Save job"}">${icon(j.saved ? "bookmark-check" : "bookmark")}</button>` : ""}<small>Closes ${fmt(j.deadline)}</small>${link("View details", "#/job/" + j.id)}</div></article>`;
}
function home() {
  put(
    `<section class="hero"><div class="wrap herogrid"><div class="copy"><span class="eyebrow pill-label">${icon("sprout")} Careers rooted in opportunity</span><h1><span>Your Skills.</span><br><span>Your Dreams.</span><br><span class="ink">Your Career.</span></h1><p class="intro">Discover employment opportunities, explore your skills and take your next step towards a better future.</p><form id="hero" class="searchbar"><label>${icon("search")}<input name="q" aria-label="Job title or skill" placeholder="Job title or skill"></label><label>${icon("map-pin")}<input name="location" aria-label="Location" placeholder="City or district"></label><button class="primary">Find Jobs ${icon("arrow-right")}</button></form><div class="popular"><b>Popular:</b>${["Office Assistant", "Data Entry", "Teacher"].map((k) => `<a class="chiplink" href="#/jobs?q=${U(k)}">${k}</a>`).join("")}<button type="button" class="flat" style="font-size:12px" data-action="advanced" aria-expanded="false" aria-controls="homefilters">More filters ${icon("sliders-horizontal")}</button></div><div id="homefilters" hidden><div class="grid2" style="margin-top:14px"><label class="field">Qualification<input form="hero" name="qualification" placeholder="e.g. B.Com."></label><label class="field">Job category<select form="hero" name="category">${opts(cats, "", "All categories")}</select></label></div></div></div><img class="heroart" src="/art/hero.jpg" alt="Watercolor of two graduates exploring opportunities beside fields in a Tamil village"></div></section><section class="section wrap">${heading("Explore your path", "Popular Job Categories", link("Browse all jobs", "#/jobs"))}<div class="catgrid">${cats.map((c, i) => `<a href="#/jobs?category=${U(c)}" class="cat">${paint(i)}<b>${c}</b></a>`).join("")}</div></section><section class="section tinted"><div class="wrap">${heading("Fresh opportunities", "Featured Jobs", link("View all jobs", "#/jobs"))}<div class="cardgrid">${jobs.slice(0, 3).map(card).join("") || empty("New opportunities are on their way", "Check back for published vacancies.")}</div></div></section><section class="section wrap">${heading("A simple journey", "How it works")}<div class="steps">${[
      [
        "Create your profile",
        "Tell us about your skills, education and preferred location.",
      ],
      [
        "Discover suitable jobs",
        "Compare the skills you have with the skills each role needs.",
      ],
      [
        "Apply for opportunities",
        "Send your profile and résumé to the employer.",
      ],
      [
        "Track your application",
        "See the latest decision in your own workspace.",
      ],
    ]
      .map(
        ([t, s], i) =>
          `<div class="step">${paint([5, 1, 0, 3][i])}<div class="eyebrow">STEP 0${i + 1}</div><h3>${t}</h3><p>${s}</p></div>`,
      )
      .join(
        "",
      )}</div></section><section class="section wrap"><div class="guidebox"><img src="/art/candidate.jpg" alt="Painting of a graduate at her laptop"><div><span class="eyebrow">The guidance notebook</span><h2>Prepare for your next chapter.</h2><p>Build a résumé, practise for an interview and make a learning plan for the role you want.</p>${btn("Explore career guidance", "#/guidance", "btn secondary", "book-open")}</div></div></section>`,
  );
}
const opts = (vals, chosen = "", all = "") =>
  (all ? `<option value="">${H(all)}</option>` : "") +
  vals
    .map(
      (s) =>
        `<option ${s === chosen ? "selected" : ""} value="${H(s)}">${H(s)}</option>`,
    )
    .join("");
function field(
  label,
  name,
  val = "",
  type = "text",
  req = false,
  sel = null,
  wide = false,
) {
  return `<label class="field ${wide ? "wide" : ""}">${H(label)}${type === "textarea" ? `<textarea name="${name}" ${req ? "required" : ""} maxlength="5000">${H(val)}</textarea>` : sel ? `<select name="${name}" ${req ? "required" : ""}>${opts(sel, val, "Choose…")}</select>` : type === "password" ? `<span class="password"><input type="password" name="${name}" minlength="8" maxlength="72" required autocomplete="${route === "/login" ? "current" : "new"}-password"><button type="button" data-action="eye" aria-label="Show or hide password">${icon("eye")}</button></span>` : `<input name="${name}" type="${type}" value="${H(val)}" ${req ? "required" : ""} ${type === "tel" ? 'pattern="[0-9+ ()-]{10,17}"' : ""} maxlength="${name === "email" ? 180 : 500}">`}</label>`;
}
function auth(reg) {
  const role = params.get("role") || (reg ? "SEEKER" : "SEEKER"),
    em = role === "EMPLOYER";
  const selectRoles = reg ? ["SEEKER", "EMPLOYER"] : Object.keys(roles);
  put(
    pg(
      reg ? "Create an account" : "Welcome back",
      `<div class="auth"><aside class="authaside"><img src="/art/hero.jpg" alt="Watercolor village career illustration"><span class="eyebrow">Your career companion</span><h2>Grow at your own pace.</h2><p>One place to discover work, understand your skills and follow your next opportunity.</p></aside><section class="authbody"><h2>${reg ? "Join Rural Career Connect" : "Sign in to your workspace"}</h2><div class="tabs">${selectRoles.map((r) => btn(roles[r], `#/${reg ? "register" : "login"}?role=${r}`, r === role ? "active" : "")).join("")}</div><form id="authform" class="formgrid" data-reg="${reg}" data-role="${H(role)}">${reg ? field(em ? "Employer name" : "Full name", "name", "", "text", true) : ""}${field("Email address", "email", "", "email", true)}${reg ? field("Mobile number", "mobile", "", "tel", true) : ""}${reg ? (em ? field("Company name", "company", "", "text", true) + field("Company address", "address", "", "text", true) + field("Industry", "industry", "", "text", true) : field("Preferred location", "location", "", "text", true) + field("Qualification", "qualification", "", "text", true)) : ""}${field(reg ? "Password (8–72 characters)" : "Password", "password", "", "password", true)}${reg ? field("Confirm password", "confirm", "", "password", true) : ""}<div class="wide errfield"></div><button class="primary wide">${reg ? "Create account" : "Sign in"} ${icon("arrow-right")}</button></form><p class="small">${reg ? "Already registered? " + btn("Sign in", "#/login", "textlink") : "New here? " + btn("Create an account", "#/register", "textlink")}</p></section></div>`,
    ),
  );
}
const lessons = [
  [
    "Résumé preparation",
    "file-text",
    "Write a one-page résumé with a clear role in mind.",
    [
      "Start with your contact details, district and a two-line summary of the work you want.",
      "List your degree, institution and graduation year. Include a project or volunteer task that demonstrates a skill.",
      "For an office role, describe a spreadsheet you maintained or a report you prepared. Avoid listing software you have not used.",
      "Export as a PDF, read it on a phone and upload it from My profile.",
    ],
  ],
  [
    "Skill development",
    "sprout",
    "Turn a missing skill into a manageable learning goal.",
    [
      "Open a suitable vacancy and read its missing skills list. Choose one skill that appears in several roles you want.",
      "For example, Meena can practise Tally by recording sample transactions and checking a ledger. Do not use real customer information.",
      "Practise for a week, save a small example of your work and add the skill to your profile when you can demonstrate it.",
    ],
  ],
  [
    "Interview preparation",
    "messages-square",
    "Practise answers using specific examples.",
    [
      "Read the job responsibilities. Prepare one example of completing a similar task.",
      "Use four parts: situation, task, action and result. Explain what you personally did.",
      "Practise a short introduction and ask about hours, location and the next step. Never pay an interview fee.",
    ],
  ],
  [
    "Career planning",
    "route",
    "Compare roles against your own priorities.",
    [
      "Write down your preferred district, travel time, hours and salary needs.",
      "Compare two vacancies against these priorities. A high skill match alone does not make a job suitable.",
      "Set a weekly target for applications and review your application tracker before following up.",
    ],
  ],
  [
    "Free learning resources",
    "library-big",
    "Find accessible learning material to practise with.",
    [
      "SWAYAM offers online courses across subjects; check each course for language, time and any exam fees.",
      "NPTEL provides lectures and courses in technical and professional topics.",
      "Use a specific learning goal, such as spreadsheet formulas, instead of enrolling in many courses at once.",
    ],
  ],
];
function guide() {
  put(
    pg(
      "Career guidance",
      `<div class="guidebox"><img src="/art/candidate.jpg" alt="Painted career learner"><div><span class="eyebrow">The guidance notebook</span><h2>Small steps, stronger skills.</h2><p>Use these practical guides to prepare an application that reflects what you can do.</p></div></div><div class="section cardgrid">${lessons.map(([t, i, d], n) => `<article class="card">${icon(i)}<h3>${t}</h3><p>${d}</p><button class="btn" data-action="lesson" data-id="${n}">Read guide ${icon("arrow-right")}</button></article>`).join("")}</div>`,
    ),
  );
}
