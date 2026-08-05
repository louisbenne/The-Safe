import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from project root (index.html + js/ + css/ + data/)
app.use(express.static(path.join(__dirname, ".")));

// SPA fallback for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`StakTrakr server listening on port ${PORT}`);
});
