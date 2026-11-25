# Rural Career Connect

A browser-based employment and career-guidance platform for rural youth. The frontend is HTML, custom responsive CSS and JavaScript. The backend is **Java 17+ with Spring Boot, Spring Security, Spring JDBC and MySQL 8.4**. There is no Swing client, Node backend, browser-only database or mock authentication.

## Start on your computer

Install Docker with the Compose plugin. From this directory:

```sh
python3 scripts/setup-env.py
docker compose up --build -d
```

On Windows, `py scripts/setup-env.py` also works. The setup script generates private random passwords and refuses to overwrite an existing `.env`. **Python is only a configuration helper**: alternatively create `.env` yourself with `MYSQL_ROOT_PASSWORD`, `DB_PASSWORD`, `RCC_ADMIN_PASSWORD`, `RCC_SEEKER_PASSWORD`, `RCC_EMPLOYER_PASSWORD` and `RCC_SEED=true`. Use strong unique passwords; the initial administrator password must have at least 12 characters.

Open **http://localhost:8080**. First build downloads Java dependencies; the page becomes available after MySQL and Spring finish starting. Check `docker compose logs web` for startup messages. Stop with `docker compose down`. Data is retained in the named `career_data` volume. Do not run `docker compose down -v` unless you want to erase the database.

### Local example accounts

| Sign-in tab | Account | Password key in your private `.env` |
|---|---|---|
| Job seeker | `meena@example.test` | `RCC_SEEKER_PASSWORD` |
| Employer | `employer@example.test` | `RCC_EMPLOYER_PASSWORD` |
| Administrator | `admin@example.test` (configurable) | `RCC_ADMIN_PASSWORD` |

**Live Arena preview:** its passwords are different. See the separately delivered `Preview sign-in.txt`. Credentials are not published on the login page or bundled in this source archive. Use fictional data in a shared demonstration workspace.

`RCC_SEED=true` populates a fresh database with fictional users, an example PDF résumé and eight explicitly marked sample vacancies. Deadlines are relative to initialization. They expire normally; employers can edit or renew their own postings. The seed does not invent applications or decisions. Set `RCC_SEED=false` before first startup to use an empty recruitment database. Initial admin creation is separate from public registration. Changing initial password variables does not reset existing accounts.

### Native Java / Maven installation

Use Java 17 or 21, Maven 3.9 and a private MySQL 8 database. Create the `ruralconnect` schema with utf8mb4 and grant the application user privileges on that schema (including initial table creation). Export `DB_URL`, `DB_USER`, `DB_PASSWORD`, and the initial admin and optional seed variables above. Then run:

```sh
mvn package
java -jar target/rural-career-connect-1.0.0.jar
```

Spring initializes tables using `src/main/resources/schema.sql`. By default the server listens on 8080; `PORT` overrides it. The application serves the frontend and API on one origin. `COOKIE_SECURE=true` is for HTTPS; `COOKIE_SAMESITE=none` with secure cookies is for an embedded HTTPS preview. For ordinary local HTTP, use the defaults `false` and `lax`.

## Try the Meena walkthrough

1. Sign in as Meena. Open **My profile** to see her B.Com., Kanchipuram location, PDF résumé and Excel, Typing and Email skills. Alternatively register a new candidate and add those skills yourself.
2. Open **Find Jobs → Office Assistant**. The vacancy requires **Excel, Typing, Email and Tally**. The server normalizes and deduplicates skills, finds three matches, names Tally as the gap and returns **3 / 4 × 100 = 75%**. A matching percentage is not a hiring probability.
3. Click **Apply now**. View **My applications**: the initial state is Pending. A second submission is blocked by a database uniqueness constraint.
4. Sign out or use a separate browser profile. Sign in as the employer, open **Applicants**, review the candidate and résumé, select **Shortlisted** and save the decision.
5. Sign back in as Meena. The application now says Shortlisted, and Notifications contains the update. In the administrator workspace, report counts and the application list reflect the same database record.

## Implemented workspaces

- **Public:** watercolor village hero; title/skill and location search; advanced discovery with qualification, category, skill, experience, job type and sort controls; active-only featured vacancies; educational guides, resources, contact inbox, help and policies.
- **Job seeker:** registration, persistent session, editable profile, skill tags, private PDF upload/view/download/replace, profile completion, recommended and recent roles, saved jobs, matched/missing skills, applications and notifications.
- **Employer:** company profile/logo; draft, publish, edit and close owned jobs; remove inactive jobs with no applications; review candidates and résumés; independent Pending, Shortlisted, Selected and Rejected decisions.
- **Administrator:** non-public account provisioning; user and employer activation; vacancy oversight; application monitoring; registration, category and status charts; date- and status-filtered reports and CSV export; contact inbox. Administrators do not make hiring decisions on behalf of employers.

All dashboard totals, charts, match results and reports derive from database records. Search/filter/pagination controls operate on API results; the backend independently enforces visibility and ownership. Profile skill changes recalculate **current** match scores; they do not change application statuses. Role listings are paginated in the browser; server-side pagination and bulk queries would be appropriate for a much larger installation.

## Structure

```
src/main/java/in/ruralconnect/
  Main.java           Spring Boot application and Spring Security setup
  Api.java            HTTP endpoints, authentication, access and upload checks
  Store.java          Parameterized JDBC queries, transactions and matching
  Seed.java           Opt-in fictional fixtures and initial admin provisioning
  Errors.java         Safe user-facing validation errors
  PreviewCookies.java HTTPS embedded-preview cookie settings
src/main/resources/
  schema.sql          Ten requested relational tables plus contact_messages
  application.properties
  static/             Website, local fonts, artwork and icons
    ui.js             Shared UI, API client and navigation
    public.js         Public screens and authentication forms
    workspace.js      Role screens, filters, reports and profile editor
    app.js            Routing, form submission and actions
scripts/verify.cjs    Browser + real API integration checks
```

## Design and accessibility

All routes use a light ivory/white palette with watercolor blue, sage, coral, butter yellow and lavender. Paintings, fonts and icons are served locally. The splash, headline reveal, page entrances, loading indicator and button hover/press animations respect `prefers-reduced-motion`. Forms have labels, keyboard focus indicators, visible validation and password visibility controls. Navigation collapses on small screens.

## Security and deployment notes

Passwords use BCrypt. Sessions use HttpOnly cookies, are renewed on login, and expire after inactivity. Spring Security CSRF tokens are required for mutations. User roles, disabled-account checks, job ownership and applicant relationships are enforced server-side. Queries use bound parameters. Public registration cannot create administrators. PDF content is validated by signature, MIME type, size and PDF parsing; files are stored as private database BLOBs and delivered only after an ownership check. Logos are validated and re-encoded as PNG. Input text is escaped in the UI. Administrators have explicit oversight access.

This source and live development preview are **not a production security certification**. Before collecting real candidate data: deploy behind HTTPS, restrict embedding to trusted origins, apply login/contact throttling at the reverse proxy, disable sample seeding, configure backups and retention, scan uploads for malware, add operational monitoring and review privacy obligations. Keep database credentials outside source control; the database should not have a public port. Use a TLS-verified database connection for remote databases. Compose's default local networking is intended for a single-host demonstration.

## Verification

The app was built with Maven and exercised against actual MySQL 8.4, not an in-memory test substitute. See `VERIFICATION.md`. To repeat the browser checks on a **disposable seeded installation**:

```sh
npm install --no-save playwright
npx playwright install chromium
set -a; . ./.env; set +a
node scripts/verify.cjs
```

Node is used only for browser testing. The script creates temporary users, vacancies and applications; use a fresh database or remove the test fixtures afterward. The preview was cleaned after verification so you can perform the original walkthrough yourself.

## Assets

The career artwork was generated specifically for this project. Category illustrations and the sprouting book logo are original SVG artwork. Poppins, Inter and Lucide licenses are included in `src/main/resources/static/licenses/`. External resources are linked, not embedded; the application itself does not depend on a font or icon CDN.

## Security-first upgrade (this release)

- `RequestRateLimit` applies a bounded, per-process fixed window to POST login (10), registration (8), and contact (12) requests per direct peer address per 10 minutes. It returns HTTP 429 and `Retry-After`. It deliberately ignores untrusted `X-Forwarded-For` headers. This is basic friction, not complete brute-force protection: it resets when the process restarts, is not shared across instances and cannot distinguish people behind a reverse proxy or shared address. Configure a trusted, distributed edge limiter for production and test it behind the actual proxy. It may temporarily block other users behind the same proxy.
- CSV export quotes cells, escapes quotes and prefixes potentially formula-leading values, including values with leading whitespace. The current export contains only fixed metric names and counts; this is defensive protection for future report changes.
- Match calculations deduplicate normalized required skills defensively. Case, Unicode compatibility and whitespace are normalized; spelling mistakes or synonyms are not guessed. No skills required yields 0, not a probability or automatic decision.
- Added repeatable JUnit tests (`mvn test`), a CSV test (`node scripts/verify-csv.cjs`) and API security regression (`node scripts/verify-security.cjs`). The latter **creates records, toggles a test user and intentionally exhausts the login rate limit**. Run only on a disposable seeded database, after the regular browser checks. It needs `RCC_ADMIN_PASSWORD` and Playwright installed; restart the test server afterward to clear the in-memory test limit. Do not use against real user data.

The server and the standalone GitHub Pages demo are separate editions, and their stored data is not shared. The offline edition is not a security boundary: do not enter real personal information. This upgrade does not certify production readiness. Actual HTTPS/cookie behavior, distributed rate limiting, malware scanning, backups, long-idle expiration, vulnerability review and privacy obligations remain to be assessed in the deployment environment.
