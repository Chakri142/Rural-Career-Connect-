"use strict";
const $ = (s) => document.querySelector(s),
  H = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  U = encodeURIComponent,
  icon = (n) => `<i data-lucide="${n}" aria-hidden="true"></i>`,
  cats = [
    "Office Jobs",
    "IT Jobs",
    "Accounting",
    "Data Entry",
    "Customer Support",
    "Education",
    "Healthcare",
    "Marketing",
  ],
  types = ["Full-time", "Part-time", "Contract", "Internship"],
  statuses = ["Pending", "Shortlisted", "Selected", "Rejected"],
  roles = {
    SEEKER: "Job seeker",
    EMPLOYER: "Employer",
    ADMIN: "Administrator",
  },
  artcols = [
    "#e7eddf",
    "#dfeaf4",
    "#f6ecd1",
    "#e4eef0",
    "#f3e6dc",
    "#eae4f2",
    "#e5efe7",
    "#f9e7dd",
  ],
  motifs = [
    `<rect x="15" y="18" width="36" height="25" rx="4" fill="#c89e70"/><path d="M25 18v-5h14v5M15 26q17 10 36 0"/><rect x="30" y="27" width="6" height="6" fill="#eccf8e"/>`,
    `<rect x="13" y="12" width="39" height="27" rx="2" fill="#819aa7"/><path d="M16 15h33v20H16z" fill="#d4e8ed"/><path d="M13 39h39l5 5H8z" fill="#a4b7ba"/><path d="m23 22-4 3 4 3m12-6 4 3-4 3"/>`,
    `<rect x="19" y="9" width="27" height="37" rx="3" fill="#9eae98"/><rect x="23" y="14" width="19" height="8" fill="#dce3c8"/><path d="M24 28h3m5 0h3m5 0h1M24 34h3m5 0h3m5 0h1M24 40h3m5 0h3m5 0h1"/>`,
    `<rect x="13" y="11" width="39" height="25" rx="2" fill="#9cbdc8"/><path d="M17 15h31v17H17z" fill="#e5efed"/><path d="M30 37v5m-6 1h16M20 20h18m-18 5h14M11 46h43"/>`,
    `<path d="M16 32v-7a17 17 0 0 1 34 0v9" fill="none" stroke="#a97f65" stroke-width="5"/><rect x="13" y="26" width="9" height="15" rx="4" fill="#cfac87"/><rect x="44" y="26" width="9" height="15" rx="4" fill="#cfac87"/><path d="M48 41q-1 6-12 4"/><circle cx="34" cy="45" r="2" fill="#b08675"/>`,
    `<path d="m8 23 24-12 26 12-26 12z" fill="#9a91ac"/><path d="M17 28v9q15 11 30-1v-8" fill="#b6a9bf"/><path d="m32 23 20 7v10" fill="none"/><path d="m50 43 2-4 3 4" fill="#ddb67d"/>`,
    `<rect x="12" y="19" width="43" height="26" rx="4" fill="#adc4ae"/><path d="M23 19v-5h20v5"/><path d="M29 24h7v5h6v6h-6v6h-7v-6h-6v-6h6z" fill="#fcf4e5"/>`,
    `<path d="m15 26 30-12v29L15 33z" fill="#d9a383"/><path d="M13 25h7v11h-7z" fill="#a8bbad"/><path d="m21 34 6 12h7l-5-15" fill="#c39872"/><path d="m49 22 7-3m-6 10h8m-9 8 7 3"/>`,
  ];
function paint(i) {
  return `<svg class="painticon" viewBox="0 0 67 54" aria-hidden="true"><path d="M6 31Q0 15 14 10q12-13 29-6 16-1 18 13 10 11-1 22-5 13-24 10Q9 56 6 31" fill="${artcols[i % 8]}"/><g stroke="#647269" stroke-width="1.55" stroke-linejoin="round" stroke-linecap="round">${motifs[i % 8]}</g></svg>`;
}
const brand = `<a class="brand" href="#/"><img src="/art/mark.svg" alt="">Rural Career Connect</a>`,
  btn = (t, h, cl = "btn", ic = "") =>
    `<a class="${cl}" href="${h}">${ic ? icon(ic) : ""}${t}</a>`,
  link = (t, h) =>
    `<a class="textlink" href="${h}">${t} ${icon("arrow-right")}</a>`,
  fmt = (d) =>
    d
      ? new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString(
          "en-IN",
          { day: "numeric", month: "short", year: "numeric" },
        )
      : "—",
  e = H;
let state = { user: null },
  db = {},
  jobs = [],
  route = "",
  params = new URLSearchParams(),
  epoch = 0,
  page = 1;
const refresh = () => window.dispatchEvent(new Event("hashchange"));
function go(s) {
  if (location.hash === "#" + s) refresh();
  else location.hash = s;
}
function icons() {
  window.lucide?.createIcons();
}
function notice(m, err = false) {
  let el = $("#toast");
  el.textContent = m;
  el.className = err ? "err" : "";
  el.style.display = "block";
  clearTimeout(notice.t);
  notice.t = setTimeout(() => (el.style.display = "none"), 4000);
}
function modal(title, body) {
  $("#dialogbody").innerHTML = `<h2>${H(title)}</h2>${body}`;
  $("#dialog").showModal();
  icons();
}
function alertError(ex) {
  notice(ex.message, true);
}
async function api(url, method = "GET", data) {
  let opts = { method, headers: {}, credentials: "same-origin" };
  if (method !== "GET") {
    opts.headers[state.csrfHeader || "X-CSRF-TOKEN"] = state.csrf || "";
    if (data instanceof FormData) opts.body = data;
    else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(data || {});
    }
  }
  let res = await fetch("/api" + url, opts);
  let obj = await res.json().catch(() => ({}));
  if (!res.ok)
    throw Error(
      obj.error ||
        "This request could not be completed. Refresh or sign in again.",
    );
  return obj;
}
const readState = async () => (state = await api("/session"));
function head() {
  const u = state.user,
    nav = [
      ["Home", "/"],
      ["Find Jobs", "/jobs"],
      ["Career Guidance", "/guidance"],
      ["About Us", "/about"],
    ];
  $("#header").innerHTML =
    `<div class="wrap nav">${brand}<nav class="navlinks" id="navmenu">${nav.map(([t, p]) => `<a class="${route === p ? "on" : ""}" href="#${p}">${t}</a>`).join("")}</nav><div class="actions">${u ? `${btn("Dashboard", "#/dashboard", "btn secondary", "layout-dashboard")}<button class="iconbtn" data-action="logout" title="Sign out" aria-label="Sign out">${icon("log-out")}</button>` : `${btn("Login", "#/login")}${btn("Register", "#/register", "btn secondary", "user-round-plus")}`}</div><button class="iconbtn menu" aria-label="Toggle navigation" data-action="menu">${icon("menu")}</button></div>`;
  $("#footer").innerHTML =
    `<div class="wrap"><div class="footer"><div>${brand}<p class="small">Every talent deserves an opportunity.<br>Every dream deserves a direction.</p></div><div class="footlinks">${[
      ["About us", "about"],
      ["Contact us", "contact"],
      ["Help centre", "help"],
      ["Privacy", "privacy"],
      ["Terms", "terms"],
      ["Login", "login"],
    ]
      .map(([a, b]) => btn(a, "#/" + b, "").trim())
      .join(
        "",
      )}</div></div><p class="fineprint">© ${new Date().getFullYear()} Rural Career Connect · Illustrative vacancies are marked as sample listings.</p></div>`;
}
function put(html) {
  $("#main").innerHTML = `<div class="enter">${html}</div>`;
  icons();
}
const pg = (t, body, sub = "") =>
    `<div class="pagebg"><div class="wrap"><div class="breadcrumbs"><a href="#/">Home</a> / ${H(t)}</div><h1 class="pagetitle">${H(t)}</h1>${sub ? `<p class="sub">${H(sub)}</p>` : ""}${body}</div></div>`,
  empty = (t, desc) =>
    `<div class="empty"><img src="/art/mark.svg" alt=""><h3>${H(t)}</h3><p>${H(desc)}</p></div>`,
  tags = (arr, cl = "") =>
    (arr || []).map((t) => `<span class="tag ${cl}">${H(t)}</span>`).join(" "),
  heading = (k, t, right = "") =>
    `<div class="sectionhead"><div><span class="eyebrow">${icon("sprout")} ${k}</span><h2>${t}</h2></div>${right}</div>`;
