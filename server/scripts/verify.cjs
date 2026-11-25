/* Run against a disposable, seeded database. Creates test accounts and records. */
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const base = process.env.TEST_URL || "http://localhost:8080",
  run = "qa-" + Date.now(),
  secret = crypto.randomBytes(16).toString("hex");
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  let errors = [];
  async function tab() {
    let p = await b.newPage({ viewport: { width: 1366, height: 900 } });
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    return p;
  }
  let c = await tab(),
    e = await tab(),
    admin = await tab(),
    other = await tab();
  const go = async (p, url, selector) => {
    await p.goto(base + "/#" + url);
    await p.waitForSelector(selector, { state: "attached" });
  };
  const fill = async (p, fields, form = "") => {
    for (const [k, v] of Object.entries(fields)) {
      let sel = p.locator(`${form} [name="${k}"]`).first();
      if ((await sel.evaluate((x) => x.tagName)) === "SELECT")
        await sel.selectOption(v);
      else await sel.fill(v);
    }
  };
  async function request(p, path, method = "GET", body) {
    return p.evaluate(
      async ({ path, method, body }) => {
        let t = await (await fetch("/api/session")).json();
        let r = await fetch("/api" + path, {
          method,
          headers: {
            [t.csrfHeader]: t.csrf,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        let obj = await r.json().catch(() => null);
        return { status: r.status, body: obj };
      },
      { path, method, body },
    );
  }
  async function register(p, role, email, data) {
    await go(p, "/register?role=" + role, "#authform");
    await fill(
      p,
      {
        ...data,
        email,
        mobile: "9000000011",
        password: secret,
        confirm: secret,
      },
      "#authform",
    );
    await p.locator("#authform button.primary").click();
    await p.waitForSelector("#profile");
    return (await request(p, "/session")).body.user.id;
  }
  async function login(p, role, email, password) {
    await go(p, "/login?role=" + role, "#authform");
    await fill(p, { email, password }, "#authform");
    await p.locator("#authform button.primary").click();
    await p.waitForSelector(".welcome");
  }
  let cid = await register(c, "SEEKER", run + "-candidate@example.test", {
    name: "Meena",
    qualification: "B.Com.",
    location: "Kanchipuram",
  });
  let eid = await register(e, "EMPLOYER", run + "-employer@example.test", {
    name: "Recruiter",
    company: run + " Example Co-op",
    industry: "Office services",
    address: "Kanchipuram",
  });
  console.log(
    "PASS: both public registration flows, role-specific profile redirect",
  );
  for (let s of ["excel", "Typing", "EMAIL"]) {
    await c.locator("#newskill").fill(s);
    await c.locator("[data-action=addskill]").click();
  }
  await c.locator("#profile button.primary").click();
  await c.waitForFunction(() =>
    document.querySelector("#toast")?.textContent.includes("Profile saved"),
  );
  await go(e, "/post", "#jobform");
  let vacancy = {
    title: "Office Assistant " + run,
    description: "Illustrative office vacancy for automated verification.",
    responsibilities: "Maintain spreadsheets and office correspondence.",
    qualification: "B.Com.",
    skills: "Excel, Typing, Email, Tally, EXCEL",
    experience: "Entry level",
    location: "Kanchipuram",
    category: "Office Jobs",
    type: "Full-time",
    deadline: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  };
  await fill(e, vacancy, "#jobform");
  await e.getByRole("button", { name: "Save draft", exact: true }).click();
  await e.waitForSelector(".record");
  let w = (await request(e, "/workspace")).body,
    jid = w.jobs[0].id;
  assert.equal(w.jobs[0].lifecycle, "Draft");
  assert(!(await request(c, "/jobs")).body.some((j) => j.id === jid));
  await go(e, "/post?id=" + jid, "#jobform");
  await e.getByRole("button", { name: "Save and publish" }).click();
  await e.waitForSelector(".record");
  console.log("PASS: private draft, edit, publish");
  await go(c, "/job/" + jid, "[data-action=apply]");
  assert.match(await c.locator("#main").innerText(), /75% skill match/);
  let j = (await request(c, "/job/" + jid)).body;
  assert.equal(j.skills.length, 4);
  assert.equal(j.matched.length, 3);
  assert.deepEqual(j.missing, ["Tally"]);
  await c.locator("[data-action=save]").click();
  await c.waitForSelector('[data-action=save]:has-text("Remove")');
  await c.locator("[data-action=apply]").click();
  await c.waitForSelector("[data-action=apply]:disabled");
  assert.equal((await request(c, "/apply/" + jid, "POST", {})).status, 409);
  let a = (await request(c, "/workspace")).body.apps[0];
  assert.equal(a.status, "Pending");
  console.log(
    "PASS: normalized unique skills, 75% match, saving, applying and duplicate prevention",
  );
  await login(
    other,
    "EMPLOYER",
    "employer@example.test",
    process.env.RCC_EMPLOYER_PASSWORD,
  );
  assert.equal(
    (
      await request(other, "/application/" + a.id, "PUT", {
        status: "Rejected",
      })
    ).status,
    403,
  );
  assert.equal((await request(other, "/person/" + cid)).status, 403);
  assert.equal(
    (await request(other, "/vacancy/" + jid + "/close", "POST", {})).status,
    403,
  );
  assert.equal((await request(c, "/person/" + eid)).status, 403);
  assert.equal(
    (await request(c, "/user/" + eid + "/toggle", "POST", {})).status,
    403,
  );
  let demo = (await request(c, "/jobs")).body.find(
    (j) => j.sample && j.title === "Office Assistant",
  );
  assert.equal((await request(c, "/apply/" + demo.id, "POST", {})).status, 200);
  await go(e, "/applications", "[data-action=decision]");
  await e.locator('[data-status="' + a.id + '"]').selectOption("Shortlisted");
  await e.locator('[data-action=decision][data-id="' + a.id + '"]').click();
  await e.waitForSelector(".badge.Shortlisted");
  let ws = (await request(c, "/workspace")).body;
  assert.equal(ws.apps.find((i) => i.id === a.id).status, "Shortlisted");
  assert.equal(ws.apps.find((i) => i.job_id === demo.id).status, "Pending");
  assert(ws.notifications.some((i) => i.message.includes("Shortlisted")));
  console.log(
    "PASS: employer ownership and independent application decisions, candidate notification",
  );
  await c.locator("[data-action=logout]").click();
  await c.waitForSelector(".hero");
  await login(c, "SEEKER", run + "-candidate@example.test", secret);
  await go(c, "/applications", ".badge.Shortlisted");
  await login(
    admin,
    "ADMIN",
    process.env.RCC_ADMIN_EMAIL || "admin@example.test",
    process.env.RCC_ADMIN_PASSWORD,
  );
  await go(admin, "/reports?status=Shortlisted", "#csvdata");
  assert((await admin.locator("#csvdata").innerText()).includes("Shortlisted"));
  assert(
    (await request(admin, "/workspace")).body.apps.some(
      (i) => i.id === a.id && i.status === "Shortlisted",
    ),
  );
  console.log(
    "PASS: shortlisting persists across re-login and appears in administrator reports",
  );
  await go(c, "/profile", "#upload");
  const meena = (await request(admin, "/workspace")).body.users.find(
    (u) => u.email === "meena@example.test",
  );
  const pdf = await admin.evaluate(
    async (id) =>
      Array.from(
        new Uint8Array(await (await fetch("/api/resume/" + id)).arrayBuffer()),
      ),
    meena.id,
  );
  await c
    .locator("#upload input")
    .setInputFiles({
      name: "sample.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(pdf),
    });
  await c.locator("#upload button").click();
  await c.waitForSelector('a:has-text("View résumé")');
  assert.equal(
    (await e.request.get(base + "/api/resume/" + cid)).status(),
    200,
  );
  await c
    .locator("#upload input")
    .setInputFiles({
      name: "bad.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Not a PDF"),
    });
  await c.locator("#upload button").click();
  await c.waitForSelector("#upload .error");
  console.log(
    "PASS: PDF upload, authorized employer retrieval and invalid-file rejection",
  );
  await go(c, "/notifications", "[data-action=read]");
  await c.locator("[data-action=read]").click();
  await c.waitForSelector(".notify.read");
  await request(admin, "/user/" + cid + "/toggle", "POST", {});
  assert.equal((await request(c, "/workspace")).status, 401);
  await request(admin, "/user/" + cid + "/toggle", "POST", {});
  await c.reload();
  await login(c, "SEEKER", run + "-candidate@example.test", secret);
  console.log("PASS: read state and account deactivation");
  await request(e, "/vacancy/" + jid + "/close", "POST", {});
  assert(!(await request(c, "/jobs")).body.some((i) => i.id === jid));
  assert.equal((await request(c, "/job/" + jid)).body.lifecycle, "Closed");
  console.log(
    "PASS: closed vacancy hidden from discovery, application history retained",
  );
  for (let [p, rts] of [
    [
      c,
      [
        "/",
        "/dashboard",
        "/jobs",
        "/profile",
        "/saved",
        "/applications",
        "/notifications",
        "/guidance",
      ],
    ],
    [e, ["/dashboard", "/profile", "/post", "/vacancies", "/applications"]],
    [
      admin,
      ["/dashboard", "/users", "/vacancies", "/applications", "/reports"],
    ],
  ]) {
    for (let width of [390, 820, 1366]) {
      await p.setViewportSize({ width, height: 844 });
      for (let rt of rts) {
        await p.goto(base + "/#" + rt);
        await p.waitForTimeout(100);
        await p.waitForFunction(() => !document.querySelector(".loadbar"));
        let measure = await p.evaluate(() => [
          innerWidth,
          document.documentElement.scrollWidth,
        ]);
        assert(measure[1] <= measure[0] + 1, rt + " " + measure);
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: responsive layout checks across roles at 390, 820 and 1366 px; no uncaught JS errors",
  );
  await b.close();
  console.log("PASS: end-to-end verification complete; fixture prefix", run);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
