/**
 * mediQ — Backend API Server
 * api.js  (run with: node api.js)
 *
 * Stack: Node.js + Express + @neondatabase/serverless
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 * 1. npm init -y
 * 2. npm install express @neondatabase/serverless dotenv cors
 * 3. Create .env  (see below)
 * 4. node api.js
 *
 * ── .env ─────────────────────────────────────────────────────────────────────
 * DATABASE_URL=postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
 * PORT=3000
 *
 * ── Neon Setup ───────────────────────────────────────────────────────────────
 * 1. Go to https://neon.tech  → create a project
 * 2. Copy the connection string (postgres://...)  → paste in .env as DATABASE_URL
 * 3. Run this server once — it auto-creates the `medicines` table for you
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',   // tighten this in production to your domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Neon Connection ───────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Create a .env file — see comments at top of this file.');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

// ── Auto-create table on startup ──────────────────────────────────────────────
async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS medicines (
        id               TEXT        PRIMARY KEY,
        name             TEXT        NOT NULL,
        category         TEXT        NOT NULL,
        manufacturer     TEXT        NOT NULL,
        batch_number     TEXT        NOT NULL,
        quantity         INTEGER     NOT NULL DEFAULT 0,
        unit             TEXT        NOT NULL DEFAULT 'Tablets',
        purchase_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
        selling_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
        reorder_level    INTEGER     NOT NULL DEFAULT 0,
        registered_date  DATE        NOT NULL,
        manufacture_date DATE        NOT NULL,
        expiry_date      DATE        NOT NULL,
        location         TEXT,
        supplier         TEXT,
        description      TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log('✅  Neon DB table ready');
  } catch (err) {
    console.error('❌  DB init failed:', err.message);
    process.exit(1);
  }
}

// ── Row mapper: DB snake_case → JS camelCase ──────────────────────────────────
function rowToMed(row) {
  return {
    id:              row.id,
    name:            row.name,
    category:        row.category,
    manufacturer:    row.manufacturer,
    batchNumber:     row.batch_number,
    quantity:        Number(row.quantity),
    unit:            row.unit,
    purchasePrice:   Number(row.purchase_price),
    sellingPrice:    Number(row.selling_price),
    reorderLevel:    Number(row.reorder_level),
    registeredDate:  row.registered_date ? row.registered_date.toISOString().split('T')[0] : '',
    manufactureDate: row.manufacture_date ? row.manufacture_date.toISOString().split('T')[0] : '',
    expiryDate:      row.expiry_date      ? row.expiry_date.toISOString().split('T')[0]      : '',
    location:        row.location    || '',
    supplier:        row.supplier    || '',
    description:     row.description || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/** Health check */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/** GET all medicines */
app.get('/api/medicines', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM medicines ORDER BY created_at DESC
    `;
    res.json(rows.map(rowToMed));
  } catch (err) {
    console.error('GET /api/medicines:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET single medicine by id */
app.get('/api/medicines/:id', async (req, res) => {
  try {
    const rows = await sql`
      SELECT * FROM medicines WHERE id = ${req.params.id}
    `;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rowToMed(rows[0]));
  } catch (err) {
    console.error('GET /api/medicines/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** POST create a new medicine */
app.post('/api/medicines', async (req, res) => {
  const m = req.body;
  // Basic validation
  if (!m.id || !m.name || !m.category || !m.manufacturer || !m.batchNumber) {
    return res.status(400).json({ error: 'Missing required fields: id, name, category, manufacturer, batchNumber' });
  }
  try {
    const rows = await sql`
      INSERT INTO medicines (
        id, name, category, manufacturer, batch_number,
        quantity, unit, purchase_price, selling_price, reorder_level,
        registered_date, manufacture_date, expiry_date,
        location, supplier, description
      ) VALUES (
        ${m.id}, ${m.name}, ${m.category}, ${m.manufacturer}, ${m.batchNumber},
        ${m.quantity || 0}, ${m.unit || 'Tablets'},
        ${m.purchasePrice || 0}, ${m.sellingPrice || 0}, ${m.reorderLevel || 0},
        ${m.registeredDate}, ${m.manufactureDate}, ${m.expiryDate},
        ${m.location || null}, ${m.supplier || null}, ${m.description || null}
      )
      RETURNING *
    `;
    res.status(201).json(rowToMed(rows[0]));
  } catch (err) {
    console.error('POST /api/medicines:', err.message);
    // Handle duplicate ID
    if (err.message.includes('duplicate key') || err.code === '23505') {
      return res.status(409).json({ error: `Medicine with ID "${m.id}" already exists` });
    }
    res.status(500).json({ error: err.message });
  }
});

/** PUT update an existing medicine */
app.put('/api/medicines/:id', async (req, res) => {
  const m  = req.body;
  const id = req.params.id;
  try {
    const rows = await sql`
      UPDATE medicines SET
        name             = ${m.name},
        category         = ${m.category},
        manufacturer     = ${m.manufacturer},
        batch_number     = ${m.batchNumber},
        quantity         = ${m.quantity || 0},
        unit             = ${m.unit || 'Tablets'},
        purchase_price   = ${m.purchasePrice || 0},
        selling_price    = ${m.sellingPrice  || 0},
        reorder_level    = ${m.reorderLevel  || 0},
        registered_date  = ${m.registeredDate},
        manufacture_date = ${m.manufactureDate},
        expiry_date      = ${m.expiryDate},
        location         = ${m.location    || null},
        supplier         = ${m.supplier    || null},
        description      = ${m.description || null},
        updated_at       = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows.length) return res.status(404).json({ error: 'Medicine not found' });
    res.json(rowToMed(rows[0]));
  } catch (err) {
    console.error('PUT /api/medicines/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/** DELETE a medicine */
app.delete('/api/medicines/:id', async (req, res) => {
  try {
    const rows = await sql`
      DELETE FROM medicines WHERE id = ${req.params.id} RETURNING id
    `;
    if (!rows.length) return res.status(404).json({ error: 'Medicine not found' });
    res.json({ deleted: true, id: rows[0].id });
  } catch (err) {
    console.error('DELETE /api/medicines/:id:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀  mediQ API running at http://localhost:${PORT}`);
    console.log(`📡  Neon endpoint: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0]}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET    /api/health`);
    console.log(`  GET    /api/medicines`);
    console.log(`  GET    /api/medicines/:id`);
    console.log(`  POST   /api/medicines`);
    console.log(`  PUT    /api/medicines/:id`);
    console.log(`  DELETE /api/medicines/:id\n`);
  });
});
