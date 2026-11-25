# Rural Career Connect — security-first upgrade

## GitHub Pages / double-click edition

Extract the ZIP. Double-click the root `index.html`, or upload the extracted files to the root of your GitHub repository. For GitHub Pages choose Settings > Pages > Deploy from a branch > main > / (root). See UPGRADE-NOTES.md for privacy and security limitations. If you only need GitHub Pages, uploading index.html alone is sufficient. Do not publish private administrator credentials.

## Java/MySQL server edition

The `server/` folder is the separate Spring Boot/MySQL edition. GitHub Pages does not run its backend. Follow `server/README.md`; this archive deliberately excludes compiled JARs, environment files, passwords, databases and private sign-in notes. Build a JAR with `mvn package`.

This package implements the first security-focused phase only. See UPGRADE-NOTES.md and server/VERIFICATION.md.
