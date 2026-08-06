A powerful, privacy-first precious metals portfolio tracker for Silver, Gold, Platinum, and Palladium. Runs entirely in your browser — no accounts, no cloud, no data collection. Your stack, your data, your rules.

Contact: Louis@benne.co.uk for more info

---

Local development

1. Start the backend API (creates server/package-lock.json on first run):

   cd server
   npm install
   npm start   # starts THE SAFE API on :4000

2. Serve the frontend (optional):

   # from repo root
   python3 -m http.server 8000
   open http://localhost:8000

3. If frontend is served separately (file:// or different origin), set the server URL in the browser console before using auth/import:

   window.THE_SAFE_SERVER_URL = 'http://localhost:4000'

4. Quick smoke test in the browser:
   - Click Register (prompts), provide email/password.
   - Use the Import form to upload an XLSX/CSV; status shows imported/added counts.

Notes:
- The server enables CORS for development by default. In production, copy server/.env.example to server/.env and set a secure JWT_SECRET before starting the server. Example:

    cd server
    cp .env.example .env
    # edit .env and set JWT_SECRET to a secure random string

  If NODE_ENV=production and JWT_SECRET is unset, the server will refuse to start to avoid insecure deployments.

- Temporary uploads are written to server/tmp by multer during imports. To avoid disk buildup the server prunes tmp files older than TMP_PRUNE_MINUTES (default: 60). Configure TMP_PRUNE_MINUTES and TMP_PRUNE_INTERVAL_MINUTES in server/.env if you need different retention or pruning cadence.

- server/.env.example contains placeholders for JWT_SECRET and PORT. Do not commit sensitive secrets into the repository; add server/.env to .gitignore (already present).

- npm audit reported some transitive vulnerabilities; review dependencies before production use.
