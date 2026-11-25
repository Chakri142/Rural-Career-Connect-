async function render(reset = true) {
  let turn = ++epoch;
  let [p, q] = (location.hash.slice(1) || "/").split("?");
  route = p;
  params = new URLSearchParams(q || "");
  if (reset) page = 1;
  document.title =
    (route === "/"
      ? "Grow your career"
      : route.split("/")[1].replace(/^./, (s) => s.toUpperCase())) +
    " · Rural Career Connect";
  head();
  let bar = document.createElement("div");
  bar.className = "loadbar";
  document.body.append(bar);
  try {
    if (route === "/" || route === "/jobs") {
      jobs = await api(
        "/jobs" +
          (route === "/jobs"
            ? "?" +
              new URLSearchParams({
                q: params.get("q") || "",
                location: params.get("location") || "",
              })
            : ""),
      );
      if (turn !== epoch) return;
      route === "/" ? home() : findjobs();
    } else if (route.startsWith("/job/")) {
      let j = await api(route);
      if (turn === epoch) details(j);
    } else if (route === "/guidance") guide();
    else if (infoPages[route.slice(1)]) infopage(route.slice(1));
    else if (["/register", "/login"].includes(route)) {
      if (state.user) {
        go("/dashboard");
        return;
      }
      auth(route === "/register");
    } else {
      if (!state.user) {
        go("/login?next=" + U(route));
        return;
      }
      if (!menus[state.user.role].some((m) => "/" + m[0] === route)) {
        put(pg("Page not available", btn("Go to workspace", "#/dashboard")));
        return;
      }
      db = await api("/workspace");
      if (turn !== epoch) return;
      ({
        "/dashboard": dashboard,
        "/profile": profile,
        "/applications": apps,
        "/vacancies": vacs,
        "/post": jobform,
        "/notifications": messages,
        "/users": people,
        "/reports": reports,
        "/saved": () =>
          shell(
            "Saved jobs",
            `<h1 class="pagetitle">Saved jobs</h1>${paginate(db.saved, (list) => `<div class="cardgrid">${list.map(card).join("")}</div>`)}`,
          ),
      })[route]();
      if (route === "/dashboard" && state.user.role === "EMPLOYER") {
        $(".dashwrap").insertAdjacentHTML(
          "beforeend",
          `<br><section class="panel"><h2>Recruitment activity</h2>${
            db.apps.length
              ? db.apps
                  .slice(0, 5)
                  .map(
                    (a) =>
                      `<div class="record"><b>${H(a.name)}</b> · ${H(a.title)}<p>${badge(a.status)} Updated ${fmt(a.updated)}</p></div>`,
                  )
                  .join("")
              : empty(
                  "No decisions yet",
                  "Status updates appear here after candidates apply.",
                )
          }</section>`,
        );
      }
      if (
        route === "/dashboard" &&
        state.user.role === "ADMIN" &&
        db.contacts.length
      ) {
        $(".dashwrap").insertAdjacentHTML(
          "beforeend",
          `<br><div class="panel"><h2>Contact inbox</h2>${db.contacts.map((c) => `<div class="record"><b>${H(c.email)}</b><p>${H(c.message)}</p><small>${fmt(c.created)}</small></div>`).join("")}</div>`,
        );
      }
    }
    if (reset) window.scrollTo(0, 0);
  } catch (ex) {
    if (turn === epoch)
      put(
        pg(
          "Unable to open this page",
          `<div class="panel"><p>${H(ex.message)}</p>${btn("Return home", "#/")}</div>`,
        ),
      );
  } finally {
    bar.remove();
    icons();
  }
}
async function submit(ev) {
  let f = ev.target;
  if (!f.id) return;
  ev.preventDefault();
  let o = Object.fromEntries(new FormData(f)),
    submitter = ev.submitter;
  if (submitter) submitter.disabled = true;
  let err = f.querySelector(".errfield");
  if (err) err.innerHTML = "";
  try {
    switch (f.id) {
      case "hero":
        go("/jobs?" + new URLSearchParams(o));
        break;
      case "filters":
        if (o.from && o.to && o.from > o.to)
          throw Error("The end date must not be before the start date.");
        go(route + "?" + new URLSearchParams(o));
        break;
      case "authform":
        if (f.dataset.reg === "true" && o.password !== o.confirm)
          throw Error("Passwords must match.");
        await api(f.dataset.reg === "true" ? "/register" : "/login", "POST", {
          ...o,
          role: f.dataset.role,
        });
        await readState();
        go(
          f.dataset.reg === "true"
            ? "/profile"
            : val("next").startsWith("/")
              ? val("next")
              : "/dashboard",
        );
        break;
      case "profile":
        if ($("#newskill")?.value.trim()) {
          let pending = $("#newskill").value.trim();
          if (!skillList.some((s) => s.toLowerCase() === pending.toLowerCase()))
            skillList.push(pending);
        }
        await api("/profile", "PUT", { ...o, skills: skillList });
        await readState();
        notice("Profile saved. Your recommendations are up to date.");
        await render(false);
        break;
      case "upload":
        await api("/" + f.dataset.file, "POST", new FormData(f));
        notice("File saved.");
        await render(false);
        break;
      case "jobform":
        o.skills = o.skills
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        o.publication = submitter?.value || "Draft";
        await api(
          "/vacancy" + (f.dataset.id ? "/" + f.dataset.id : ""),
          f.dataset.id ? "PUT" : "POST",
          o,
        );
        notice(
          o.publication === "Draft" ? "Draft saved." : "Vacancy published.",
        );
        go("/vacancies");
        break;
      case "contact":
        await api("/contact", "POST", o);
        f.reset();
        notice("Your message has been sent to the administrator.");
        break;
    }
  } catch (ex) {
    if (err) err.innerHTML = `<p class="error">${H(ex.message)}</p>`;
    else alertError(ex);
  } finally {
    if (submitter) submitter.disabled = false;
  }
}
function profileSummary(p) {
  let omit = [
    "id",
    "user_id",
    "skills",
    "hasLogo",
    "resume",
    "created",
    "enabled",
    "role",
    "sample",
    "details",
  ];
  return (
    Object.entries(p)
      .filter(
        ([k, v]) =>
          !omit.includes(k) && typeof v !== "object" && v !== "" && v != null,
      )
      .map(
        ([k, v]) => `<p><b>${H(k.replace(/([A-Z])/g, " $1"))}:</b> ${H(v)}</p>`,
      )
      .join("") +
    (p.skills?.length ? `<p>${tags(p.skills)}</p>` : "") +
    (p.resume
      ? `<a href="/api/resume/${p.id}" target="_blank" rel="noopener" class="btn">Review PDF résumé</a> <a href="/api/resume/${p.id}?download=true" class="btn">Download</a>`
      : "")
  );
}
async function action(ev) {
  let b = ev.target.closest("[data-action]");
  if (!b) return;
  let k = b.dataset.action,
    id = Number(b.dataset.id);
  try {
    switch (k) {
      case "advanced": {
        const panel = $("#homefilters");
        panel.hidden = !panel.hidden;
        b.setAttribute("aria-expanded", String(!panel.hidden));
        return;
      }
      case "menu":
        $("#navmenu").classList.toggle("open");
        return;
      case "eye": {
        let i = b.previousElementSibling;
        i.type = i.type === "password" ? "text" : "password";
        return;
      }
      case "reset":
        go(route);
        return;
      case "previous":
        page--;
        render(false);
        return;
      case "next":
        page++;
        render(false);
        return;
      case "lesson": {
        let [t, , desc, steps] = lessons[id];
        modal(
          t,
          `<p>${desc}</p><ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>${id === 4 ? '<a class="btn" href="https://swayam.gov.in/" target="_blank" rel="noopener">Open SWAYAM ↗</a> <a class="btn" href="https://nptel.ac.in/" target="_blank" rel="noopener">Open NPTEL ↗</a>' : ""}`,
        );
        return;
      }
      case "logout":
        await api("/logout", "POST");
        await readState();
        notice("Signed out.");
        go("/");
        return;
      case "addskill": {
        let v = $("#newskill").value.trim();
        if (v && !skillList.some((s) => s.toLowerCase() === v.toLowerCase()))
          skillList.push(v);
        $("#newskill").value = "";
        renderSkills();
        return;
      }
      case "rmskill":
        skillList.splice(id, 1);
        renderSkills();
        return;
      case "apply":
        if (!confirm("Submit your profile for this vacancy?")) return;
        await api("/apply/" + id, "POST");
        notice("Application submitted. Status: Pending.");
        break;
      case "save":
        await api("/save/" + id, "POST");
        notice("Saved jobs updated.");
        break;
      case "closejob":
      case "deletejob":
        if (
          !confirm(
            k === "closejob"
              ? "Close this vacancy to new applications?"
              : "Permanently delete this unfilled vacancy?",
          )
        )
          return;
        await api(
          "/vacancy/" + id + (k === "closejob" ? "/close" : ""),
          k === "closejob" ? "POST" : "DELETE",
        );
        notice("Vacancy updated.");
        break;
      case "decision": {
        let status = document.querySelector(`[data-status="${id}"]`).value;
        if (!confirm("Record " + status + " for this application?")) return;
        await api("/application/" + id, "PUT", { status });
        notice("Decision saved and candidate notified.");
        break;
      }
      case "appinfo": {
        let a = db.apps.find((v) => v.id === id),
          p = await api("/person/" + a.candidate_id);
        modal(
          "Application review",
          `<p>${H(a.title)} · ${badge(a.status)}</p><p>Applied ${fmt(a.applied)} · Last updated ${fmt(a.updated)}</p><h3>${a.score}% skill match</h3><p>Matched: ${H(a.matched.join(", ") || "None")}</p><p>Missing: ${H(a.missing.join(", ") || "None")}</p>${profileSummary(p)}`,
        );
        return;
      }
      case "person":
        modal("Profile details", profileSummary(await api("/person/" + id)));
        return;
      case "toggle":
        if (!confirm("Change the activation status of this account?")) return;
        await api("/user/" + id + "/toggle", "POST");
        notice("Account updated.");
        break;
      case "read":
        await api("/read", "POST");
        break;
      case "csv": {
        let d = JSON.parse($("#csvdata").textContent),
          u = URL.createObjectURL(
            new Blob(
              ["Metric,Count\n" + d.map((row) => row.map((value) => { let s = String(value ?? ""); if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }).join(",")).join("\n")],
              { type: "text/csv" },
            ),
          );
        let a = document.createElement("a");
        a.href = u;
        a.download = "recruitment-report.csv";
        a.click();
        setTimeout(() => URL.revokeObjectURL(u), 1000);
        return;
      }
    }
    await render(false);
  } catch (ex) {
    alertError(ex);
  }
}
document.addEventListener("submit", submit);
document.addEventListener("click", action);
document.addEventListener("change", (ev) => {
  if (ev.target.id === "sort") {
    params.set("sort", ev.target.value);
    go("/jobs?" + params);
  }
});
window.addEventListener("hashchange", () => render());
$("#dismiss").onclick = () => $("#dialog").close();
(async () => {
  try {
    await readState();
    await render();
  } catch (ex) {
    put(
      pg(
        "Connection unavailable",
        `<p>${H(ex.message)}</p><a class="btn primary" href="/">Try again</a>`,
      ),
    );
  } finally {
    setTimeout(() => $("#splash")?.remove(), 800);
  }
})();
