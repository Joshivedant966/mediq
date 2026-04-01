/**
 * mediQ — Medical Inventory Management System
 * app.js — Frontend Logic + Neon DB Integration
 *
 * Architecture:
 *  - DB layer  : NeonDB class  → talks to your backend API (api.js / server)
 *  - Data layer: medicines[]   → in-memory cache of DB rows
 *  - UI layer  : render*()     → pure DOM updates, reads from medicines[]
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION  — Edit this to point to your backend
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  // URL of your Node/Express backend that wraps Neon.
  // When running locally: 'http://localhost:3000/api'
  // When deployed (Vercel/Render): 'https://your-app.vercel.app/api'
  API_BASE: 'http://localhost:3000/api',

  // Fallback: if true and API is unreachable, use built-in seed data
  USE_SEED_FALLBACK: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS (local auth — move to DB in production)
// ─────────────────────────────────────────────────────────────────────────────
const USERS = [
  { username: 'admin',       password: 'admin123',  role: 'Administrator', name: 'Dr. Rajesh Kumar' },
  { username: 'pharmacist',  password: 'pharma123', role: 'Pharmacist',    name: 'Ms. Priya Sharma' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA (used when backend is unavailable)
// ─────────────────────────────────────────────────────────────────────────────
const SEED_MEDICINES = [
  { id:'MQ-0001', name:'Amoxicillin 500mg',  category:'Antibiotic',    manufacturer:'Sun Pharma',    batchNumber:'SP-2024-001', quantity:250, unit:'Capsules',   purchasePrice:4.5,  sellingPrice:8.0,  registeredDate:'2024-01-15', manufactureDate:'2023-12-01', expiryDate:'2026-12-01', location:'Shelf A-1', description:'Broad-spectrum antibiotic used to treat bacterial infections.', supplier:'MedSupply Co.',    reorderLevel:50  },
  { id:'MQ-0002', name:'Paracetamol 650mg',  category:'Analgesic',     manufacturer:'Cipla Ltd.',    batchNumber:'CL-2024-045', quantity:500, unit:'Tablets',    purchasePrice:1.2,  sellingPrice:2.5,  registeredDate:'2024-02-10', manufactureDate:'2024-01-01', expiryDate:'2026-01-01', location:'Shelf B-2', description:'Pain reliever and fever reducer.',                             supplier:'PharmaDist Inc.', reorderLevel:100 },
  { id:'MQ-0003', name:'Metformin 500mg',    category:'Antidiabetic',  manufacturer:"Dr. Reddy's",   batchNumber:'DR-2024-112', quantity:30,  unit:'Tablets',    purchasePrice:3.8,  sellingPrice:6.5,  registeredDate:'2024-03-05', manufactureDate:'2024-02-01', expiryDate:'2025-08-01', location:'Shelf C-3', description:'First-line medication for type 2 diabetes.',                  supplier:'MedSupply Co.',   reorderLevel:60  },
  { id:'MQ-0004', name:'Atorvastatin 10mg',  category:'Cardiovascular',manufacturer:'Pfizer India',  batchNumber:'PF-2024-078', quantity:180, unit:'Tablets',    purchasePrice:6.0,  sellingPrice:10.5, registeredDate:'2024-01-28', manufactureDate:'2023-11-01', expiryDate:'2025-11-01', location:'Shelf A-4', description:'Used to lower cholesterol and prevent cardiovascular disease.', supplier:'GlobalMed',       reorderLevel:40  },
  { id:'MQ-0005', name:'Cetirizine 10mg',    category:'Antihistamine', manufacturer:'Abbott India',  batchNumber:'AB-2024-033', quantity:320, unit:'Tablets',    purchasePrice:2.1,  sellingPrice:4.0,  registeredDate:'2024-04-01', manufactureDate:'2024-03-01', expiryDate:'2026-03-01', location:'Shelf D-1', description:'Antihistamine for allergies and hay fever.',                  supplier:'PharmaDist Inc.', reorderLevel:80  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DB API LAYER
// All communication with the Neon-backed Express API lives here.
// ─────────────────────────────────────────────────────────────────────────────
const DB = {
  _online: false,

  /** Test connectivity by calling the health endpoint */
  async ping() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
      this._online = res.ok;
    } catch {
      this._online = false;
    }
    return this._online;
  },

  /** Fetch all medicines from Neon */
  async getAll() {
    const res = await fetch(`${CONFIG.API_BASE}/medicines`);
    if (!res.ok) throw new Error(`GET /medicines failed: ${res.status}`);
    return res.json();          // returns array of medicine objects
  },

  /** Insert a new medicine row */
  async create(med) {
    const res = await fetch(`${CONFIG.API_BASE}/medicines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(med),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `POST /medicines failed: ${res.status}`);
    }
    return res.json();
  },

  /** Update an existing medicine row by id */
  async update(id, med) {
    const res = await fetch(`${CONFIG.API_BASE}/medicines/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(med),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `PUT /medicines/${id} failed: ${res.status}`);
    }
    return res.json();
  },

  /** Delete a medicine row by id */
  async remove(id) {
    const res = await fetch(`${CONFIG.API_BASE}/medicines/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`DELETE /medicines/${id} failed: ${res.status}`);
    return res.json();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────────────────────────
let medicines   = [];
let currentUser = null;
let sortCol     = 'id';
let sortDir     = 'asc';
let editingId   = null;
let deletingId  = null;
let viewingId   = null;
let _pendingNewId = '';
let _dbMode     = false;   // true when connected to Neon, false = seed fallback

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const today      = () => new Date().toISOString().split('T')[0];
const isExpired  = d  => new Date(d) < new Date();
const isExpSoon  = d  => { const diff = (new Date(d) - new Date()) / 86400000; return diff <= 90 && diff > 0; };
const isLowStock = m  => Number(m.quantity) <= Number(m.reorderLevel);
const fmtINR     = n  => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const esc        = s  => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function genId() {
  if (medicines.length === 0) return 'MQ-0001';
  const nums = medicines.map(m => parseInt(m.id.split('-')[1]) || 0);
  return 'MQ-' + String(Math.max(...nums) + 1).padStart(4, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADER
// ─────────────────────────────────────────────────────────────────────────────
function showLoader(text = 'Loading...') {
  document.getElementById('loader-text').textContent = text;
  document.getElementById('global-loader').classList.add('show');
}
function hideLoader() {
  document.getElementById('global-loader').classList.remove('show');
}

// ─────────────────────────────────────────────────────────────────────────────
// DB STATUS INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function setDbStatus(status) {
  // status: 'connected' | 'disconnected' | 'connecting'
  const ind  = document.getElementById('db-status-indicator');
  const text = document.getElementById('db-status-text');
  ind.className = 'db-status ' + status;
  const labels = { connected: 'Neon DB Connected', disconnected: 'Offline (Seed Data)', connecting: 'Connecting...' };
  text.textContent = labels[status] || status;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] || ''}</span> ${esc(msg)} <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT — load data from Neon or fallback to seed
// ─────────────────────────────────────────────────────────────────────────────
async function initData() {
  setDbStatus('connecting');
  showLoader('Connecting to database...');
  try {
    const online = await DB.ping();
    if (online) {
      showLoader('Fetching medicines...');
      medicines = await DB.getAll();
      _dbMode = true;
      setDbStatus('connected');
      showToast('Connected to Neon DB', 'info');
    } else {
      throw new Error('API unreachable');
    }
  } catch (err) {
    console.warn('DB offline, using seed data:', err.message);
    if (CONFIG.USE_SEED_FALLBACK) {
      medicines = [...SEED_MEDICINES];
      _dbMode = false;
      setDbStatus('disconnected');
      showToast('Using offline seed data', 'info');
    } else {
      medicines = [];
      setDbStatus('disconnected');
    }
  } finally {
    hideLoader();
    updateAlertBadge();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
async function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const user = USERS.find(x => x.username === u && x.password === p);

  if (!user) {
    document.getElementById('login-err').classList.add('show');
    return;
  }
  document.getElementById('login-err').classList.remove('show');

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  currentUser = user;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('user-name-display').textContent = user.name;
  document.getElementById('user-role-display').textContent = user.role;
  document.getElementById('user-avatar').textContent = user.name.charAt(0);

  await initData();
  showPage('dashboard');

  btn.disabled = false;
  btn.textContent = 'Sign In';
}

function doLogout() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  medicines = [];
  currentUser = null;
}

// Keyboard shortcuts for login
document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('login-user').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'medicines') renderTable();
  if (name === 'reports')   renderReports();
  updateAlertBadge();
}

function updateAlertBadge() {
  const count = medicines.filter(m => isExpired(m.expiryDate) || isExpSoon(m.expiryDate) || isLowStock(m)).length;
  const b = document.getElementById('alert-badge');
  if (!b) return;
  b.textContent = count;
  b.style.display = count > 0 ? 'inline-block' : 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD RENDER
// ─────────────────────────────────────────────────────────────────────────────
function renderDashboard() {
  const total   = medicines.length;
  const expired = medicines.filter(m => isExpired(m.expiryDate)).length;
  const expSoon = medicines.filter(m => !isExpired(m.expiryDate) && isExpSoon(m.expiryDate)).length;
  const low     = medicines.filter(m => isLowStock(m)).length;
  const sellVal = medicines.reduce((s, m) => s + (m.sellingPrice * m.quantity), 0);

  document.getElementById('dash-stats').innerHTML = [
    { label: 'Total Medicines',  value: total,          sub: 'in database',         color: '#2563EA' },
    { label: 'Expired',          value: expired,        sub: 'need removal',        color: '#dc2626' },
    { label: 'Expiring Soon',    value: expSoon,        sub: 'within 90 days',      color: '#d97706' },
    { label: 'Low Stock',        value: low,            sub: 'below reorder level', color: '#dc2626' },
    { label: 'Inventory Value',  value: fmtINR(sellVal),sub: 'at selling price',    color: '#059669' },
  ].map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value" style="color:${s.color};">${s.value}</div>
      <div class="stat-sub">${s.sub}</div>
    </div>`).join('');

  // Category breakdown bars
  const cats = {};
  medicines.forEach(m => { cats[m.category] = (cats[m.category] || 0) + 1; });
  const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxC = top[0]?.[1] || 1;
  document.getElementById('dash-categories').innerHTML = top.length
    ? top.map(([c, n]) => `
        <div class="cat-row">
          <div class="cat-row-top"><span class="cat-name">${esc(c)}</span><span class="cat-count">${n}</span></div>
          <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${(n / maxC) * 100}%;"></div></div>
        </div>`).join('')
    : '<p style="color:#94a3b8;font-size:14px;">No data.</p>';

  // Active alerts
  const alerts = medicines.filter(m => isExpired(m.expiryDate) || isExpSoon(m.expiryDate) || isLowStock(m)).slice(0, 6);
  document.getElementById('dash-alerts').innerHTML = alerts.length
    ? alerts.map(m => {
        let b = '';
        if (isExpired(m.expiryDate))           b += '<span class="badge badge-solid-red">EXPIRED</span> ';
        else if (isExpSoon(m.expiryDate))      b += '<span class="badge badge-solid-yellow">EXPIRING SOON</span> ';
        if (isLowStock(m))                     b += '<span class="badge badge-solid-red">LOW STOCK</span>';
        return `<div class="alert-row">
          <div style="flex:1;min-width:0;">
            <div class="alert-name">${esc(m.name)}</div>
            <div class="alert-id">${m.id}</div>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">${b}</div>
        </div>`;
      }).join('')
    : '<p style="color:#64748b;font-size:14px;">No alerts. All good! ✅</p>';

  // Recently added
  const recent = [...medicines].sort((a, b) => new Date(b.registeredDate) - new Date(a.registeredDate)).slice(0, 5);
  document.getElementById('dash-recent').innerHTML = recent.map(m => `
    <tr>
      <td class="td-id">${m.id}</td>
      <td class="td-name">${esc(m.name)}</td>
      <td><span class="badge badge-blue">${esc(m.category)}</span></td>
      <td>${m.quantity} ${esc(m.unit)}</td>
      <td style="color:#64748b;">${m.registeredDate}</td>
    </tr>`).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICINE TABLE — filter / sort / render
// ─────────────────────────────────────────────────────────────────────────────
function getFiltered() {
  const q   = document.getElementById('med-search').value.toLowerCase();
  const cat = document.getElementById('med-filter-cat').value;
  const sts = document.getElementById('med-filter-status').value;
  return medicines.filter(m => {
    const mQ = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
                  || m.manufacturer.toLowerCase().includes(q) || m.batchNumber.toLowerCase().includes(q);
    const mC = !cat || m.category === cat;
    const mS = !sts
      || (sts === 'expired'  &&  isExpired(m.expiryDate))
      || (sts === 'expiring' && !isExpired(m.expiryDate) && isExpSoon(m.expiryDate))
      || (sts === 'low'      &&  isLowStock(m))
      || (sts === 'ok'       && !isExpired(m.expiryDate) && !isExpSoon(m.expiryDate) && !isLowStock(m));
    return mQ && mC && mS;
  }).sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
}

function sortTable(col) {
  if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortCol = col; sortDir = 'asc'; }
  ['id', 'name', 'category', 'manufacturer', 'quantity', 'expiryDate'].forEach(c => {
    const el = document.getElementById('sort-' + c);
    if (el) el.textContent = c === col ? (sortDir === 'asc' ? '↑' : '↓') : '';
  });
  renderTable();
}

function clearFilters() {
  document.getElementById('med-search').value = '';
  document.getElementById('med-filter-cat').value = '';
  document.getElementById('med-filter-status').value = '';
  renderTable();
}

function renderTable() {
  const filtered = getFiltered();
  document.getElementById('med-count').textContent = `${filtered.length} of ${medicines.length} records`;
  document.getElementById('med-tbody').innerHTML = filtered.length
    ? filtered.map(m => {
        const exp  = isExpired(m.expiryDate);
        const soon = !exp && isExpSoon(m.expiryDate);
        const low  = isLowStock(m);
        let sb = '';
        if (exp)       sb += '<span class="badge badge-red">EXPIRED</span> ';
        else if (soon) sb += '<span class="badge badge-yellow">EXPIRING SOON</span> ';
        else           sb += '<span class="badge badge-green">OK</span> ';
        if (low)       sb += '<span class="badge badge-red">LOW STOCK</span>';
        return `<tr>
          <td class="td-id">${m.id}</td>
          <td><div class="td-name">${esc(m.name)}</div><div class="td-batch">${esc(m.batchNumber)}</div></td>
          <td><span class="badge badge-blue">${esc(m.category)}</span></td>
          <td style="color:#374151;">${esc(m.manufacturer)}</td>
          <td style="font-weight:600;color:${low ? '#dc2626' : '#0f172a'};">${m.quantity} <span style="color:#94a3b8;font-weight:400;font-size:12px;">${esc(m.unit)}</span></td>
          <td style="color:${exp ? '#dc2626' : soon ? '#d97706' : '#374151'};font-weight:${exp || soon ? 600 : 400};">${m.expiryDate}</td>
          <td>${sb}</td>
          <td><div class="actions-row">
            <button class="act-btn act-view" title="View" onclick="openView('${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="act-btn act-edit" title="Edit" onclick="openEditForm('${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="act-btn act-del" title="Delete" onclick="openConfirmDelete('${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div></td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="8" style="padding:40px;text-align:center;color:#94a3b8;">No medicines found.</td></tr>';
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM MODAL — add / edit
// ─────────────────────────────────────────────────────────────────────────────
const FORM_FIELDS = ['name','category','manufacturer','batchNumber','supplier','location',
                     'quantity','unit','purchasePrice','sellingPrice','reorderLevel',
                     'registeredDate','manufactureDate','expiryDate','description'];
const REQUIRED    = ['name','category','manufacturer','batchNumber','quantity','registeredDate','manufactureDate','expiryDate'];

function clearFormErrors() {
  REQUIRED.forEach(k => {
    const e = document.getElementById('e-' + k); if (e) e.textContent = '';
    const i = document.getElementById('f-' + k); if (i) i.classList.remove('err');
  });
}

function setFormValues(m) {
  FORM_FIELDS.forEach(k => {
    const el = document.getElementById('f-' + k);
    if (el) el.value = m[k] !== undefined ? m[k] : '';
  });
}

function gv(id) { return (document.getElementById('f-' + id) || {}).value || ''; }

function openAddForm() {
  editingId = null;
  clearFormErrors();
  setFormValues({ unit: 'Tablets', registeredDate: today() });
  _pendingNewId = genId();
  document.getElementById('form-modal-title').textContent    = 'Add New Medicine';
  document.getElementById('form-modal-id-label').textContent = 'ID: ' + _pendingNewId;
  document.getElementById('form-save-btn').textContent       = 'Add Medicine';
  document.getElementById('form-modal').classList.add('open');
}

function openEditForm(id) {
  const m = medicines.find(x => x.id === id); if (!m) return;
  editingId = id;
  clearFormErrors();
  setFormValues(m);
  document.getElementById('form-modal-title').textContent    = 'Edit Medicine';
  document.getElementById('form-modal-id-label').textContent = 'ID: ' + id;
  document.getElementById('form-save-btn').textContent       = 'Update Medicine';
  document.getElementById('form-modal').classList.add('open');
}

function closeFormModal() {
  document.getElementById('form-modal').classList.remove('open');
  editingId = null;
}

async function saveForm() {
  clearFormErrors();
  const name  = gv('name').trim();
  const cat   = gv('category');
  const mfr   = gv('manufacturer').trim();
  const batch = gv('batchNumber').trim();
  const qty   = gv('quantity');
  const mfgD  = gv('manufactureDate');
  const expD  = gv('expiryDate');
  const regD  = gv('registeredDate');

  let valid = true;
  const setErr = (k, msg) => {
    const e = document.getElementById('e-' + k);
    const i = document.getElementById('f-' + k);
    if (e) e.textContent = msg;
    if (i) i.classList.add('err');
    valid = false;
  };

  if (!name)                                    setErr('name',            'Medicine name is required');
  if (!cat)                                     setErr('category',        'Category is required');
  if (!mfr)                                     setErr('manufacturer',    'Manufacturer is required');
  if (!batch)                                   setErr('batchNumber',     'Batch number is required');
  if (!qty || isNaN(qty) || Number(qty) < 0)    setErr('quantity',        'Valid quantity required');
  if (!regD)                                    setErr('registeredDate',  'Registered date required');
  if (!mfgD)                                    setErr('manufactureDate', 'Manufacture date required');
  if (!expD)                                    setErr('expiryDate',      'Expiry date required');
  if (mfgD && expD && expD <= mfgD)             setErr('expiryDate',      'Expiry must be after manufacture date');
  if (!valid) return;

  const med = {
    id:              editingId || _pendingNewId,
    name,
    category:        cat,
    manufacturer:    mfr,
    batchNumber:     batch,
    quantity:        Number(qty),
    unit:            gv('unit'),
    purchasePrice:   Number(gv('purchasePrice')) || 0,
    sellingPrice:    Number(gv('sellingPrice'))  || 0,
    reorderLevel:    Number(gv('reorderLevel'))  || 0,
    registeredDate:  regD,
    manufactureDate: mfgD,
    expiryDate:      expD,
    location:        gv('location'),
    supplier:        gv('supplier'),
    description:     gv('description'),
  };

  const btn = document.getElementById('form-save-btn');
  btn.disabled = true;
  btn.textContent = editingId ? 'Updating...' : 'Adding...';

  try {
    if (_dbMode) {
      // ── Neon DB ──
      if (editingId) {
        const updated = await DB.update(editingId, med);
        medicines = medicines.map(m => m.id === editingId ? (updated || med) : m);
        showToast(`"${med.name}" updated in Neon DB`);
      } else {
        const created = await DB.create(med);
        medicines.push(created || med);
        showToast(`"${med.name}" saved to Neon DB`);
        showPage('medicines');
      }
    } else {
      // ── Offline fallback ──
      if (editingId) {
        medicines = medicines.map(m => m.id === editingId ? med : m);
        showToast(`"${med.name}" updated (offline)`);
        if (viewingId === editingId) openView(editingId);
      } else {
        medicines.push(med);
        showToast(`"${med.name}" added (offline)`);
        showPage('medicines');
      }
    }
    closeFormModal();
    updateAlertBadge();
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? 'Update Medicine' : 'Add Medicine';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────
function openView(id) {
  const m = medicines.find(x => x.id === id); if (!m) return;
  viewingId = id;
  const exp  = isExpired(m.expiryDate);
  const soon = !exp && isExpSoon(m.expiryDate);
  const low  = isLowStock(m);
  let badges = '';
  if (exp)       badges += '<span class="badge badge-solid-red" style="margin-left:6px;">EXPIRED</span>';
  else if (soon) badges += '<span class="badge badge-solid-yellow" style="margin-left:6px;">EXPIRING SOON</span>';
  if (low)       badges += '<span class="badge badge-solid-red" style="margin-left:4px;">LOW STOCK</span>';

  document.getElementById('view-name').textContent   = m.name;
  document.getElementById('view-badges').innerHTML   = badges;
  document.getElementById('view-id-cat').textContent = `${m.id} · ${m.category}`;

  const row = (lbl, val, color) =>
    `<div class="detail-row"><span class="detail-key">${lbl}</span><span class="detail-val" style="color:${color || '#0f172a'};">${esc(String(val ?? '—'))}</span></div>`;

  document.getElementById('view-body').innerHTML = `
    <div class="detail-section-title" style="margin-top:0;">Basic Info</div>
    ${row('Medicine ID', m.id, '#2563EA')}
    ${row('Manufacturer', m.manufacturer)}
    ${row('Batch / Lot Number', m.batchNumber)}
    ${row('Supplier', m.supplier)}
    ${row('Storage Location', m.location)}
    <div class="detail-section-title">Stock &amp; Pricing</div>
    ${row('Current Quantity', `${m.quantity} ${m.unit}`, low ? '#dc2626' : '#0f172a')}
    ${row('Reorder Level', `${m.reorderLevel} ${m.unit}`)}
    ${row('Purchase Price', `₹ ${m.purchasePrice}`)}
    ${row('Selling Price', `₹ ${m.sellingPrice}`)}
    <div class="detail-section-title">Dates</div>
    ${row('Registered On', m.registeredDate)}
    ${row('Manufacture Date', m.manufactureDate)}
    ${row('Expiry Date', m.expiryDate, exp ? '#dc2626' : soon ? '#d97706' : '#0f172a')}
    ${m.description ? `<div class="detail-section-title">Description</div><p style="font-size:14px;color:#374151;line-height:1.6;">${esc(m.description)}</p>` : ''}`;
  document.getElementById('view-modal').classList.add('open');
}

function closeViewModal() {
  document.getElementById('view-modal').classList.remove('open');
  viewingId = null;
}

function editFromView() {
  const id = viewingId;
  closeViewModal();
  openEditForm(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────
function openConfirmDelete(id) {
  const m = medicines.find(x => x.id === id); if (!m) return;
  deletingId = id;
  document.getElementById('confirm-msg').textContent =
    `Are you sure you want to delete "${m.name}" (${m.id})? This action cannot be undone.`;
  document.getElementById('confirm-modal').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-modal').classList.remove('open');
  deletingId = null;
}

async function confirmDeleteExec() {
  const m = medicines.find(x => x.id === deletingId);
  try {
    if (_dbMode) await DB.remove(deletingId);
    medicines = medicines.filter(x => x.id !== deletingId);
    showToast(`"${m ? m.name : ''}" deleted`, 'error');
    closeConfirm();
    if (viewingId === deletingId) closeViewModal();
    renderTable();
    updateAlertBadge();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────
function renderReports() {
  const expired = medicines.filter(m =>  isExpired(m.expiryDate));
  const expSoon = medicines.filter(m => !isExpired(m.expiryDate) && isExpSoon(m.expiryDate));
  const low     = medicines.filter(m =>  isLowStock(m));
  const buyVal  = medicines.reduce((s, m) => s + (m.purchasePrice  * m.quantity), 0);
  const sellVal = medicines.reduce((s, m) => s + (m.sellingPrice   * m.quantity), 0);

  document.getElementById('report-stats').innerHTML = [
    { label: 'Total Medicines',     value: medicines.length, color: '#2563EA' },
    { label: 'Expired Medicines',   value: expired.length,  color: '#dc2626' },
    { label: 'Expiring in 90 Days', value: expSoon.length,  color: '#d97706' },
    { label: 'Low Stock Items',     value: low.length,      color: '#dc2626' },
    { label: 'Purchase Value',      value: fmtINR(buyVal),  color: '#374151' },
    { label: 'Selling Value',       value: fmtINR(sellVal), color: '#059669' },
  ].map(s => `
    <div class="report-stat">
      <div class="report-stat-label">${s.label}</div>
      <div class="report-stat-val" style="color:${s.color};">${s.value}</div>
    </div>`).join('');

  const rows = (list, lastFn) => list.length
    ? list.map(m => `<tr>
        <td class="td-id">${m.id}</td>
        <td class="td-name">${esc(m.name)}</td>
        <td><span class="badge badge-blue">${esc(m.category)}</span></td>
        <td>${m.quantity} ${esc(m.unit)}</td>
        <td style="font-weight:600;">${lastFn(m)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;">None found ✅</td></tr>';

  document.getElementById('rep-expired').innerHTML  = rows(expired, m => `<span style="color:#dc2626;">${m.expiryDate}</span>`);
  document.getElementById('rep-expiring').innerHTML = rows(expSoon, m => `<span style="color:#d97706;">${m.expiryDate}</span>`);
  document.getElementById('rep-low').innerHTML      = rows(low,     m => `${m.reorderLevel} ${esc(m.unit)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSE MODALS ON OVERLAY CLICK
// ─────────────────────────────────────────────────────────────────────────────
['form-modal', 'view-modal', 'confirm-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target !== this) return;
    if (id === 'form-modal')    closeFormModal();
    if (id === 'view-modal')    closeViewModal();
    if (id === 'confirm-modal') closeConfirm();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────────────────────
updateAlertBadge();
