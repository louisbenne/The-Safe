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
- The server enables CORS for dev. In production set a proper JWT_SECRET env var (JWT_SECRET) and restrict origins.
- npm audit reported some transitive vulnerabilities; review dependencies before production use.
