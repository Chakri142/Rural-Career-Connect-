# Rural Career Connect — security-first upgrade

This is the **first, security-focused phase** of the attached roadmap, not the complete four-week roadmap or a penetration test.

## What changed
- The Java/MySQL server now limits repeated login, registration and contact requests per direct network peer, with HTTP 429. This is a basic single-process safeguard, not distributed production protection; proxy users may share one limit.
- The skill-matching calculation deduplicates normalized required skills and has automated edge-case tests. The visible score remains skill overlap, not a hiring probability or automatic shortlisting.
- Both editions now quote CSV fields and protect against potentially dangerous spreadsheet formula prefixes. Current exported reports contain aggregate labels and counts, not applicant records.
- Added Java unit tests, CSV regression checks, and a repeatable server security test covering authorization, CSRF, simultaneous applications, invalid PDF, deactivation, logout and throttling.
- Added a free GitHub Dependabot configuration for the server's Maven dependencies; GitHub must be configured/enabled for alerts and updates. No paid API is used.

## Test results and boundaries
Both offline and server workflows were rerun with fictional data. The server was built and tested against a disposable MySQL 8.4 database; see `server/VERIFICATION.md` for results and limitations. The offline copy was tested in Chromium without network access. No real hosting environment, penetration test, real TLS, inactivity timeout or independent audit was tested.

## Versions
- `index.html`: double-click to run the offline edition or upload to the root of GitHub Pages. Its accounts and data are **local to each browser**, visible to the device owner and not synchronized. Use fictional data only. Do not publish your private administrator sign-in note.
- `server/`: separate Java Spring Boot/MySQL application. Read `server/README.md` to set it up. GitHub Pages cannot run the Java backend or MySQL. Set `RCC_SEED=false` for a real deployment; disabling seeding does not delete existing demo data.

## Still to do
Tamil translations, curated career guidance, district/taluk filters, session-timeout and concurrent-edit tests, proper trusted-proxy/distributed throttling, HTTPS/cookie verification, upload malware scanning, dependency review, backups/restore, privacy review, accessibility/user testing and PPT architecture update are **not completed in this phase**. Do not collect real personal information before the remaining security and privacy work is addressed.
