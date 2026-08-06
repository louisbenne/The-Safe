require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');

const db = require('./db');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-prod';
if (JWT_SECRET === 'change-me-in-prod') console.warn('Warning: using default JWT_SECRET. Set JWT_SECRET in .env for production.');
const upload = multer({ dest: path.join(__dirname, 'tmp') });

// Helper: run SQL with Promise
function runAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}
function allAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}
function getAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  // Basic validation
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRe.test(email)) return res.status(400).json({ error: 'invalid_email' });
  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'password_too_short' });

  try {
    const hash = await bcrypt.hash(password, 10);
    await runAsync('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash]);
    const user = await getAsync('SELECT id, email FROM users WHERE email = ?', [email]);
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ error: 'email_exists' });
    res.status(500).json({ error: 'register_failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await getAsync('SELECT id, email, password_hash FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'login_failed' });
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' });
  const token = auth.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// Import endpoint: accepts XLSX or CSV, parses rows and inserts items for the authenticated user
app.post('/api/import', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file_required' });
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    // Expect columns: Order ID, Name / Type, Metal, Weight (oz), Date Bought, Price Paid (£), Notes
    const stmtPromise = rows.reduce(async (prevP, row) => {
      await prevP;
      const orderId = row['Order ID'] || row['index'] || row['OrderID'] || '';
      const name = row['Name / Type'] || row['Name'] || '';
      const metal = row['Metal'] || '';
      const weight = parseFloat(String(row['Weight (oz)'] || row['Weight'] || 0)) || 0;
      const dateBought = row['Date Bought'] ? String(row['Date Bought']) : null;
      const price = parseFloat(String(row['Price Paid (£)'] || row['Price Paid'] || 0)) || 0;
      const notes = row['Notes'] || '';
      await runAsync(
        `INSERT INTO items (user_id, order_id, name, metal, weight_oz, date_bought, price_paid_gbp, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.userId, orderId, name, metal, weight, dateBought, price, notes]
      );
    }, Promise.resolve());

    await stmtPromise;
    res.json({ imported: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'import_failed' });
  }
});

// Items CRUD
app.get('/api/items', authMiddleware, async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'list_failed' });
  }
});

app.post('/api/items', authMiddleware, async (req, res) => {
  const { order_id, name, metal, weight_oz, date_bought, price_paid_gbp, notes } = req.body;
  try {
    const r = await runAsync(
      `INSERT INTO items (user_id, order_id, name, metal, weight_oz, date_bought, price_paid_gbp, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, order_id || '', name || '', metal || '', weight_oz || 0, date_bought || null, price_paid_gbp || 0, notes || '']
    );
    res.json({ id: r.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'create_failed' });
  }
});

app.delete('/api/items/:id', authMiddleware, async (req, res) => {
  try {
    await runAsync('DELETE FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ deleted: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'delete_failed' });
  }
});

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`THE SAFE API listening on ${PORT}`));
