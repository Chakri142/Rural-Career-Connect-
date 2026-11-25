# Verification record

Verified on a running Spring Boot server with MySQL 8.4 and Chromium. Test data was removed from the preview afterward.

- both public registration flows, role-specific profile redirect
- private draft, edit, publish
- normalized unique skills, 75% match, saving, applying and duplicate prevention
- employer ownership and independent application decisions, candidate notification
- shortlisting persists across re-login and appears in administrator reports
- PDF upload, authorized employer retrieval and invalid-file rejection
- read state and account deactivation
- closed vacancy hidden from discovery, application history retained
- responsive layout checks across roles at 390, 820 and 1366 px; no uncaught JS errors
- end-to-end verification complete

Initial visual review was performed on the homepage and all role dashboard shells before data wiring. Final checks include live database-backed routes. Testing covers the listed scenarios, not a security audit or production load test.

## Security-first upgrade verification (current release)

Environment: disposable freshly initialized MySQL Community 8.4.13, Java 21, Maven 3.9.9, Spring Boot, Chromium via Playwright; all accounts and records were fictional. Native startup was tested; Docker Compose and public HTTPS were not tested in this run.

- `mvn package` — passed, including three new JUnit tests for matching and fixed-window limits. An initial run exposed a test assertion type mismatch (Integer vs Long); the assertion was corrected and the build rerun successfully.
- `node scripts/verify.cjs` — passed end-to-end against the server: registrations, draft/publish, 75% match, duplicate apply, cross-employer ownership, résumé upload, decisions, deactivation, close/history, and 390/820/1366 px routes. A first attempt timed out during a heavily loaded parallel browser run; the test timeout was increased and the complete serial rerun passed.
- `node scripts/verify-security.cjs` — passed unauthorized roles, public administrator registration denial, missing CSRF, unrelated résumé access, unauthorized job edits, two simultaneous apply requests (one success and one conflict), invalid status, employer decision ownership, invalid PDF, disabled session, logout and HTTP 429. A test-fixture duplicate email was fixed before the successful run.
- A manual disposable-DB fixture was changed to an expired published vacancy: public list omitted it, public detail returned 404, and its existing application row remained. This is a manually prepared test, not an automated test.
- `node scripts/verify-csv.cjs` — passed formula-leading cells and CSV quoting for both editions when the root `index.html` exists.
- Offline Playwright review — passed isolated role workflows, privacy guards, draft/publish, match/apply, per-application decisions, reload, and mobile/desktop role navigation with network disabled and no browser errors.

Limits: No penetration test, independent security certification, malware scan, real TLS/cookie deployment, distributed/proxy rate-limit test, timed 30-minute session expiration, concurrent vacancy edit test, backup/restore, dependency vulnerability audit, or user study was performed. The previous original verification record above records earlier project-authored work, not third-party assurance. Do not use production data until the remaining security and privacy work is complete.
