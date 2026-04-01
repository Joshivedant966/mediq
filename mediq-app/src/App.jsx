import { useState, useEffect, useRef } from "react";

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_MEDICINES = [
  {
    id: "MQ-0001",
    name: "Amoxicillin 500mg",
    category: "Antibiotic",
    manufacturer: "Sun Pharma",
    batchNumber: "SP-2024-001",
    quantity: 250,
    unit: "Capsules",
    purchasePrice: 4.5,
    sellingPrice: 8.0,
    registeredDate: "2024-01-15",
    manufactureDate: "2023-12-01",
    expiryDate: "2026-12-01",
    location: "Shelf A-1",
    description: "Broad-spectrum antibiotic used to treat bacterial infections.",
    supplier: "MedSupply Co.",
    reorderLevel: 50,
  },
  {
    id: "MQ-0002",
    name: "Paracetamol 650mg",
    category: "Analgesic",
    manufacturer: "Cipla Ltd.",
    batchNumber: "CL-2024-045",
    quantity: 500,
    unit: "Tablets",
    purchasePrice: 1.2,
    sellingPrice: 2.5,
    registeredDate: "2024-02-10",
    manufactureDate: "2024-01-01",
    expiryDate: "2026-01-01",
    location: "Shelf B-2",
    description: "Pain reliever and fever reducer.",
    supplier: "PharmaDist Inc.",
    reorderLevel: 100,
  },
  {
    id: "MQ-0003",
    name: "Metformin 500mg",
    category: "Antidiabetic",
    manufacturer: "Dr. Reddy's",
    batchNumber: "DR-2024-112",
    quantity: 30,
    unit: "Tablets",
    purchasePrice: 3.8,
    sellingPrice: 6.5,
    registeredDate: "2024-03-05",
    manufactureDate: "2024-02-01",
    expiryDate: "2025-08-01",
    location: "Shelf C-3",
    description: "First-line medication for type 2 diabetes.",
    supplier: "MedSupply Co.",
    reorderLevel: 60,
  },
  {
    id: "MQ-0004",
    name: "Atorvastatin 10mg",
    category: "Cardiovascular",
    manufacturer: "Pfizer India",
    batchNumber: "PF-2024-078",
    quantity: 180,
    unit: "Tablets",
    purchasePrice: 6.0,
    sellingPrice: 10.5,
    registeredDate: "2024-01-28",
    manufactureDate: "2023-11-01",
    expiryDate: "2025-11-01",
    location: "Shelf A-4",
    description: "Used to lower cholesterol and prevent cardiovascular disease.",
    supplier: "GlobalMed",
    reorderLevel: 40,
  },
  {
    id: "MQ-0005",
    name: "Cetirizine 10mg",
    category: "Antihistamine",
    manufacturer: "Abbott India",
    batchNumber: "AB-2024-033",
    quantity: 320,
    unit: "Tablets",
    purchasePrice: 2.1,
    sellingPrice: 4.0,
    registeredDate: "2024-04-01",
    manufactureDate: "2024-03-01",
    expiryDate: "2026-03-01",
    location: "Shelf D-1",
    description: "Antihistamine for allergies and hay fever.",
    supplier: "PharmaDist Inc.",
    reorderLevel: 80,
  },
];

const CATEGORIES = [
  "Antibiotic", "Analgesic", "Antidiabetic", "Cardiovascular",
  "Antihistamine", "Antifungal", "Antiviral", "Vitamin/Supplement",
  "Antacid", "Antihypertensive", "Antipyretic", "Other",
];

const UNITS = ["Tablets", "Capsules", "Syrup (ml)", "Injection (ml)", "Cream (g)", "Drops (ml)", "Powder (g)", "Sachets"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const generateId = (medicines) => {
  const nums = medicines.map((m) => parseInt(m.id.split("-")[1]));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `MQ-${String(next).padStart(4, "0")}`;
};
const isExpiringSoon = (dateStr) => {
  const exp = new Date(dateStr);
  const now = new Date();
  const diff = (exp - now) / (1000 * 60 * 60 * 24);
  return diff <= 90 && diff > 0;
};
const isExpired = (dateStr) => new Date(dateStr) < new Date();
const isLowStock = (med) => med.quantity <= med.reorderLevel;

// ─── Icons (inline SVGs) ─────────────────────────────────────────────────────
const Icon = {
  logo: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#2563EA" />
      <path d="M14 6v16M6 14h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  dashboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  medicines: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>,
  add: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  delete: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  logout: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  alert: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  report: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#0f172a" : t.type === "error" ? "#dc2626" : "#1e40af",
          color: "#fff", padding: "12px 18px", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", fontSize: 14, fontWeight: 500,
          animation: "slideIn .25s ease", minWidth: 260,
        }}>
          {t.type === "success" ? <span style={{ color: "#4ade80" }}><Icon.check /></span>
            : t.type === "error" ? <span>⚠️</span> : <span style={{ color: "#93c5fd" }}>ℹ️</span>}
          {t.message}
          <button onClick={() => removeToast(t.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", cursor: "pointer", opacity: .7 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (message, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };
  const remove = (id) => setToasts((p) => p.filter((t) => t.id !== id));
  return { toasts, add, remove };
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 32, maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 18, color: "#0f172a" }}>Confirm Delete</h3>
        <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>{msg}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#374151" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const USERS = [
    { username: "admin", password: "admin123", role: "Administrator", name: "Dr. Rajesh Kumar" },
    { username: "pharmacist", password: "pharma123", role: "Pharmacist", name: "Ms. Priya Sharma" },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      const user = USERS.find((u) => u.username === username && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid username or password. Try admin / admin123");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        input:focus { outline: none; border-color: #2563EA !important; box-shadow: 0 0 0 3px rgba(37,99,234,.12) !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #f1f5f9; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      <div style={{ display: "flex", width: "min(960px, 96vw)", minHeight: 560, borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.12)" }}>
        {/* Left panel */}
        <div style={{ flex: 1, background: "#2563EA", padding: 48, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <div style={{ position: "absolute", bottom: -80, left: -40, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
              <div style={{ background: "#fff", borderRadius: 10, padding: "6px 10px" }}>
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="7" fill="#2563EA"/><path d="M14 6v16M6 14h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.5px" }}>mediQ</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 14, fontFamily: "'Space Grotesk', sans-serif" }}>Medical Inventory<br />Management</h1>
            <p style={{ opacity: .8, lineHeight: 1.6, fontSize: 15 }}>A complete solution to track, manage, and control your pharmaceutical inventory with precision.</p>
          </div>
          <div style={{ position: "relative" }}>
            {[
              { icon: "🗄️", text: "Complete inventory database" },
              { icon: "📊", text: "Real-time stock monitoring" },
              { icon: "⚠️", text: "Expiry & low-stock alerts" },
              { icon: "🔒", text: "Role-based secure access" },
            ].map((f) => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, opacity: .9 }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontSize: 14 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: "0 0 400px", background: "#fff", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>Welcome back</h2>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>Sign in to your mediQ account</p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username"
                style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 15, color: "#0f172a", background: "#f8fafc", transition: "all .2s" }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
                style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 15, color: "#0f172a", background: "#f8fafc", transition: "all .2s" }} />
            </div>
            {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ padding: "12px", borderRadius: 9, border: "none", background: "#2563EA", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4, opacity: loading ? .7 : 1, transition: "opacity .2s" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: "14px", background: "#f8fafc", borderRadius: 9, border: "1px dashed #e2e8f0" }}>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>DEMO CREDENTIALS</p>
            <p style={{ fontSize: 13, color: "#64748b" }}>Admin: <strong>admin</strong> / <strong>admin123</strong></p>
            <p style={{ fontSize: 13, color: "#64748b" }}>Pharmacist: <strong>pharmacist</strong> / <strong>pharma123</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Medicine Form Modal ──────────────────────────────────────────────────────
function MedicineForm({ medicine, onSave, onClose, nextId }) {
  const empty = {
    id: nextId, name: "", category: "", manufacturer: "", batchNumber: "",
    quantity: "", unit: "Tablets", purchasePrice: "", sellingPrice: "",
    registeredDate: today(), manufactureDate: "", expiryDate: "",
    location: "", description: "", supplier: "", reorderLevel: "",
  };
  const [form, setForm] = useState(medicine || empty);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Medicine name is required";
    if (!form.category) e.category = "Category is required";
    if (!form.manufacturer.trim()) e.manufacturer = "Manufacturer is required";
    if (!form.batchNumber.trim()) e.batchNumber = "Batch number is required";
    if (!form.quantity || isNaN(form.quantity) || form.quantity < 0) e.quantity = "Valid quantity required";
    if (!form.manufactureDate) e.manufactureDate = "Manufacture date required";
    if (!form.expiryDate) e.expiryDate = "Expiry date required";
    if (form.manufactureDate && form.expiryDate && form.expiryDate <= form.manufactureDate) e.expiryDate = "Expiry must be after manufacture date";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    onSave({ ...form, quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice), sellingPrice: Number(form.sellingPrice), reorderLevel: Number(form.reorderLevel) });
  };

  const Field = ({ label, k, type = "text", options, required, placeholder }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: ".5px" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {options ? (
        <select value={form[k]} onChange={(e) => set(k, e.target.value)}
          style={{ padding: "9px 12px", border: `1.5px solid ${errors[k] ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, background: "#f8fafc", color: "#0f172a" }}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder}
          style={{ padding: "9px 12px", border: `1.5px solid ${errors[k] ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 14, background: "#f8fafc", color: "#0f172a" }} />
      )}
      {errors[k] && <span style={{ fontSize: 12, color: "#ef4444" }}>{errors[k]}</span>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 7000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px 0" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(760px, 96vw)", boxShadow: "0 24px 80px rgba(0,0,0,.2)", animation: "slideIn .25s ease" }}>
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>{medicine ? "Edit Medicine" : "Add New Medicine"}</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>ID: <strong style={{ color: "#2563EA" }}>{form.id}</strong></p>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#64748b" }}><Icon.close /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {/* Basic Info */}
          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Basic Information</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Field label="Medicine Name" k="name" required placeholder="e.g. Amoxicillin 500mg" />
            <Field label="Category" k="category" required options={CATEGORIES} />
            <Field label="Manufacturer" k="manufacturer" required placeholder="e.g. Sun Pharma" />
            <Field label="Batch / Lot Number" k="batchNumber" required placeholder="e.g. SP-2024-001" />
            <Field label="Supplier" k="supplier" placeholder="e.g. MedSupply Co." />
            <Field label="Storage Location" k="location" placeholder="e.g. Shelf A-1" />
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Stock & Pricing</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Field label="Quantity" k="quantity" type="number" required placeholder="0" />
            <Field label="Unit" k="unit" options={UNITS} />
            <Field label="Purchase Price (₹)" k="purchasePrice" type="number" placeholder="0.00" />
            <Field label="Selling Price (₹)" k="sellingPrice" type="number" placeholder="0.00" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 20 }}>
            <Field label="Reorder Level (Min Stock Alert)" k="reorderLevel" type="number" placeholder="e.g. 50" />
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Dates</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Field label="Registered Date" k="registeredDate" type="date" required />
            <Field label="Manufacture Date" k="manufactureDate" type="date" required />
            <Field label="Expiry Date" k="expiryDate" type="date" required />
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Additional Notes</p>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Medicine description, usage instructions, side effects..."
            rows={3} style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#0f172a", background: "#f8fafc", resize: "vertical", fontFamily: "inherit" }} />

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 24px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#374151" }}>Cancel</button>
            <button type="submit" style={{ padding: "10px 28px", borderRadius: 9, border: "none", background: "#2563EA", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              {medicine ? "Update Medicine" : "Add Medicine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View Medicine Modal ──────────────────────────────────────────────────────
function ViewMedicine({ medicine, onClose, onEdit }) {
  const exp = isExpired(medicine.expiryDate);
  const soon = isExpiringSoon(medicine.expiryDate);
  const low = isLowStock(medicine);

  const Row = ({ label, value, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: accent || "#0f172a", fontWeight: 600 }}>{value || "—"}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 7000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(620px, 96vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.2)", animation: "slideIn .25s ease" }}>
        <div style={{ padding: "22px 26px", background: "#2563EA", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>{medicine.name}</h2>
              {exp && <span style={{ background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>EXPIRED</span>}
              {!exp && soon && <span style={{ background: "#f59e0b", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>EXPIRING SOON</span>}
              {low && <span style={{ background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>LOW STOCK</span>}
            </div>
            <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, margin: "4px 0 0" }}>{medicine.id} · {medicine.category}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onEdit} style={{ background: "rgba(255,255,255,.2)", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Edit</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#fff" }}><Icon.close /></button>
          </div>
        </div>
        <div style={{ padding: 26 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Basic Info</p>
          <Row label="Medicine ID" value={medicine.id} accent="#2563EA" />
          <Row label="Manufacturer" value={medicine.manufacturer} />
          <Row label="Batch / Lot Number" value={medicine.batchNumber} />
          <Row label="Supplier" value={medicine.supplier} />
          <Row label="Storage Location" value={medicine.location} />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 4px" }}>Stock & Pricing</p>
          <Row label="Current Quantity" value={`${medicine.quantity} ${medicine.unit}`} accent={low ? "#dc2626" : "#0f172a"} />
          <Row label="Reorder Level" value={`${medicine.reorderLevel} ${medicine.unit}`} />
          <Row label="Purchase Price" value={`₹ ${medicine.purchasePrice}`} />
          <Row label="Selling Price" value={`₹ ${medicine.sellingPrice}`} />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 4px" }}>Dates</p>
          <Row label="Registered On" value={medicine.registeredDate} />
          <Row label="Manufacture Date" value={medicine.manufactureDate} />
          <Row label="Expiry Date" value={medicine.expiryDate} accent={exp ? "#ef4444" : soon ? "#f59e0b" : "#0f172a"} />
          {medicine.description && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#2563EA", textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 8px" }}>Description</p>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{medicine.description}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ medicines }) {
  const total = medicines.length;
  const expired = medicines.filter((m) => isExpired(m.expiryDate)).length;
  const expiringSoon = medicines.filter((m) => isExpiringSoon(m.expiryDate)).length;
  const lowStock = medicines.filter((m) => isLowStock(m)).length;
  const totalValue = medicines.reduce((s, m) => s + m.sellingPrice * m.quantity, 0);

  const categories = {};
  medicines.forEach((m) => { categories[m.category] = (categories[m.category] || 0) + 1; });
  const topCats = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = topCats[0]?.[1] || 1;

  const recent = [...medicines].sort((a, b) => new Date(b.registeredDate) - new Date(a.registeredDate)).slice(0, 5);
  const alerts = medicines.filter((m) => isExpired(m.expiryDate) || isExpiringSoon(m.expiryDate) || isLowStock(m)).slice(0, 5);

  const Stat = ({ label, value, sub, color, bg }) => (
    <div style={{ background: bg || "#fff", borderRadius: 14, padding: "22px 24px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
      <p style={{ fontSize: 13, color: "#64748b", fontWeight: 500, margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 700, color: color || "#0f172a", margin: 0, letterSpacing: "-1px" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Dashboard</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Overview of your pharmaceutical inventory</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <Stat label="Total Medicines" value={total} sub="in database" color="#2563EA" />
        <Stat label="Expired" value={expired} sub="need removal" color="#dc2626" />
        <Stat label="Expiring Soon" value={expiringSoon} sub="within 90 days" color="#d97706" />
        <Stat label="Low Stock" value={lowStock} sub="below reorder level" color="#dc2626" />
        <Stat label="Inventory Value" value={`₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} sub="at selling price" color="#059669" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Category breakdown */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 18px" }}>By Category</h3>
          {topCats.map(([cat, count]) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{cat}</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>{count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "#2563EA", width: `${(count / maxCat) * 100}%`, transition: "width .5s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 18px" }}>⚠️ Active Alerts</h3>
          {alerts.length === 0 ? <p style={{ color: "#64748b", fontSize: 14 }}>No alerts at this time. All good! ✅</p> : (
            alerts.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f8fafc" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{m.id}</p>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {isExpired(m.expiryDate) && <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>EXPIRED</span>}
                  {!isExpired(m.expiryDate) && isExpiringSoon(m.expiryDate) && <span style={{ background: "#fef3c7", color: "#d97706", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>SOON</span>}
                  {isLowStock(m) && <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>LOW</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recently added */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 18px" }}>Recently Added</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
              {["ID", "Name", "Category", "Quantity", "Registered"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((m) => (
              <tr key={m.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                <td style={{ padding: "10px 12px", color: "#2563EA", fontWeight: 600, fontFamily: "monospace" }}>{m.id}</td>
                <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 500 }}>{m.name}</td>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>{m.category}</td>
                <td style={{ padding: "10px 12px", color: "#0f172a" }}>{m.quantity} {m.unit}</td>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>{m.registeredDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Medicine Table ───────────────────────────────────────────────────────────
function MedicinesTable({ medicines, onAdd, onEdit, onDelete, onView }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const filtered = medicines.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.manufacturer.toLowerCase().includes(q) || m.batchNumber.toLowerCase().includes(q);
    const matchCat = !filterCat || m.category === filterCat;
    const matchStatus = !filterStatus ||
      (filterStatus === "expired" && isExpired(m.expiryDate)) ||
      (filterStatus === "expiring" && !isExpired(m.expiryDate) && isExpiringSoon(m.expiryDate)) ||
      (filterStatus === "low" && isLowStock(m)) ||
      (filterStatus === "ok" && !isExpired(m.expiryDate) && !isExpiringSoon(m.expiryDate) && !isLowStock(m));
    return matchSearch && matchCat && matchStatus;
  }).sort((a, b) => {
    let va = a[sortBy], vb = b[sortBy];
    if (typeof va === "string") va = va.toLowerCase(), vb = vb.toLowerCase();
    return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const Th = ({ col, label }) => (
    <th onClick={() => toggleSort(col)} style={{ textAlign: "left", padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
      {label} {sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Medicine Database</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{filtered.length} of {medicines.length} records</p>
        </div>
        <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 9, border: "none", background: "#2563EA", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          <Icon.add /> Add Medicine
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", background: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1.5px solid #e2e8f0" }}>
          <Icon.search />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, manufacturer, batch..."
            style={{ border: "none", background: "none", outline: "none", fontSize: 14, width: "100%", color: "#0f172a" }} />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          style={{ padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", color: "#374151" }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", color: "#374151" }}>
          <option value="">All Status</option>
          <option value="ok">Normal</option>
          <option value="expired">Expired</option>
          <option value="expiring">Expiring Soon</option>
          <option value="low">Low Stock</option>
        </select>
        {(search || filterCat || filterStatus) && (
          <button onClick={() => { setSearch(""); setFilterCat(""); setFilterStatus(""); }}
            style={{ padding: "9px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, color: "#64748b" }}>Clear</button>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <Th col="id" label="ID" />
                <Th col="name" label="Medicine Name" />
                <Th col="category" label="Category" />
                <Th col="manufacturer" label="Manufacturer" />
                <Th col="quantity" label="Stock" />
                <Th col="expiryDate" label="Expiry" />
                <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Status</th>
                <th style={{ textAlign: "center", padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 15 }}>No medicines found.</td></tr>
              ) : filtered.map((m) => {
                const exp = isExpired(m.expiryDate);
                const soon = isExpiringSoon(m.expiryDate);
                const low = isLowStock(m);
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f8fafc", transition: "background .15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafbff"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 14px", color: "#2563EA", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{m.id}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{m.name}</span>
                      <br /><span style={{ fontSize: 12, color: "#94a3b8" }}>{m.batchNumber}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}><span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20 }}>{m.category}</span></td>
                    <td style={{ padding: "12px 14px", color: "#374151" }}>{m.manufacturer}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontWeight: 600, color: low ? "#dc2626" : "#0f172a" }}>{m.quantity}</span>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}> {m.unit}</span>
                    </td>
                    <td style={{ padding: "12px 14px", color: exp ? "#dc2626" : soon ? "#d97706" : "#374151", fontWeight: exp || soon ? 600 : 400 }}>{m.expiryDate}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {exp ? <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>EXPIRED</span>
                          : soon ? <span style={{ background: "#fef3c7", color: "#d97706", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>EXPIRING SOON</span>
                          : <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>OK</span>}
                        {low && <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>LOW STOCK</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {[
                          { icon: <Icon.eye />, action: () => onView(m), bg: "#f1f5f9", color: "#374151", title: "View" },
                          { icon: <Icon.edit />, action: () => onEdit(m), bg: "#eff6ff", color: "#2563EA", title: "Edit" },
                          { icon: <Icon.delete />, action: () => onDelete(m), bg: "#fef2f2", color: "#dc2626", title: "Delete" },
                        ].map((btn) => (
                          <button key={btn.title} onClick={btn.action} title={btn.title}
                            style={{ padding: "6px 8px", border: "none", borderRadius: 7, background: btn.bg, color: btn.color, cursor: "pointer", display: "flex", alignItems: "center" }}>
                            {btn.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────
function Reports({ medicines }) {
  const expired = medicines.filter((m) => isExpired(m.expiryDate));
  const expiringSoon = medicines.filter((m) => !isExpired(m.expiryDate) && isExpiringSoon(m.expiryDate));
  const lowStock = medicines.filter((m) => isLowStock(m));
  const totalVal = medicines.reduce((s, m) => s + m.purchasePrice * m.quantity, 0);
  const sellVal = medicines.reduce((s, m) => s + m.sellingPrice * m.quantity, 0);

  const Section = ({ title, items, color, emptyMsg }) => (
    <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #f1f5f9", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color, margin: "0 0 16px" }}>{title} <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>({items.length})</span></h3>
      {items.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 14 }}>{emptyMsg}</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr style={{ borderBottom: "2px solid #f1f5f9" }}>
            {["ID", "Name", "Category", "Quantity", "Expiry / Stock"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{items.map((m) => (
            <tr key={m.id} style={{ borderBottom: "1px solid #f8fafc" }}>
              <td style={{ padding: "9px 12px", color: "#2563EA", fontWeight: 600, fontFamily: "monospace", fontSize: 13 }}>{m.id}</td>
              <td style={{ padding: "9px 12px", fontWeight: 500, color: "#0f172a" }}>{m.name}</td>
              <td style={{ padding: "9px 12px", color: "#64748b" }}>{m.category}</td>
              <td style={{ padding: "9px 12px" }}>{m.quantity} {m.unit}</td>
              <td style={{ padding: "9px 12px", color, fontWeight: 600 }}>{m.expiryDate} (Reorder: {m.reorderLevel})</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>Reports & Analytics</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Inventory health, valuation, and compliance reports</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Medicines", value: medicines.length, color: "#2563EA" },
          { label: "Expired Medicines", value: expired.length, color: "#dc2626" },
          { label: "Expiring in 90 Days", value: expiringSoon.length, color: "#d97706" },
          { label: "Low Stock Items", value: lowStock.length, color: "#dc2626" },
          { label: "Purchase Value", value: `₹${totalVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "#374151" },
          { label: "Selling Value", value: `₹${sellVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: "#059669" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase" }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0, letterSpacing: "-0.5px" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <Section title="🔴 Expired Medicines" items={expired} color="#dc2626" emptyMsg="No expired medicines. Great!" />
      <Section title="🟡 Expiring Within 90 Days" items={expiringSoon} color="#d97706" emptyMsg="No medicines expiring within 90 days." />
      <Section title="📦 Low Stock Items" items={lowStock} color="#dc2626" emptyMsg="All items are adequately stocked." />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [medicines, setMedicines] = useState(SEED_MEDICINES);
  const [page, setPage] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editMed, setEditMed] = useState(null);
  const [viewMed, setViewMed] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toasts, add: addToast, remove: removeToast } = useToast();

  if (!user) return <LoginPage onLogin={setUser} />;

  const handleSave = (med) => {
    if (editMed) {
      setMedicines((p) => p.map((m) => m.id === med.id ? med : m));
      addToast(`"${med.name}" updated successfully`);
    } else {
      setMedicines((p) => [...p, med]);
      addToast(`"${med.name}" added to database`);
      setPage("medicines");
    }
    setShowForm(false);
    setEditMed(null);
  };

  const handleDelete = (med) => setConfirmDelete(med);
  const confirmDel = () => {
    setMedicines((p) => p.filter((m) => m.id !== confirmDelete.id));
    addToast(`"${confirmDelete.name}" deleted`, "error");
    setConfirmDelete(null);
    if (viewMed?.id === confirmDelete.id) setViewMed(null);
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <Icon.dashboard /> },
    { id: "medicines", label: "Medicines", icon: <Icon.medicines /> },
    { id: "reports", label: "Reports", icon: <Icon.report /> },
  ];

  const alerts = medicines.filter((m) => isExpired(m.expiryDate) || isExpiringSoon(m.expiryDate) || isLowStock(m)).length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #2563EA !important; box-shadow: 0 0 0 3px rgba(37,99,234,.12) !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #f1f5f9; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 240, background: "#0f172a", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100 }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "#2563EA", borderRadius: 9, padding: "6px 8px" }}>
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><path d="M14 4v20M4 14h20" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.5px" }}>mediQ</span>
          </div>
          <p style={{ fontSize: 11, color: "#475569", marginTop: 4, letterSpacing: .3 }}>MEDICAL MANAGEMENT</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 10px" }}>
          {navItems.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 2, fontSize: 14, fontWeight: page === n.id ? 600 : 400, background: page === n.id ? "#2563EA" : "transparent", color: page === n.id ? "#fff" : "#94a3b8", textAlign: "left", transition: "all .15s", fontFamily: "inherit" }}>
              {n.icon} {n.label}
              {n.id === "reports" && alerts > 0 && <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{alerts}</span>}
            </button>
          ))}

          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", marginTop: 16, paddingTop: 16 }}>
            <button onClick={() => { setShowForm(true); setEditMed(null); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "rgba(37,99,234,.15)", color: "#60a5fa", textAlign: "left", fontFamily: "inherit" }}>
              <Icon.add /> Add Medicine
            </button>
          </div>
        </nav>

        {/* User */}
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2563EA", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
              {user.name.charAt(0)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>{user.role}</p>
            </div>
          </div>
          <button onClick={() => setUser(null)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            <Icon.logout /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: "32px 32px", minHeight: "100vh" }}>
        {page === "dashboard" && <Dashboard medicines={medicines} />}
        {page === "medicines" && (
          <MedicinesTable medicines={medicines}
            onAdd={() => { setEditMed(null); setShowForm(true); }}
            onEdit={(m) => { setEditMed(m); setShowForm(true); }}
            onDelete={handleDelete}
            onView={setViewMed} />
        )}
        {page === "reports" && <Reports medicines={medicines} />}
      </main>

      {/* Modals */}
      {showForm && (
        <MedicineForm medicine={editMed} nextId={generateId(medicines)}
          onSave={handleSave} onClose={() => { setShowForm(false); setEditMed(null); }} />
      )}
      {viewMed && (
        <ViewMedicine medicine={viewMed} onClose={() => setViewMed(null)}
          onEdit={() => { setEditMed(viewMed); setViewMed(null); setShowForm(true); }} />
      )}
      {confirmDelete && (
        <ConfirmDialog msg={`Are you sure you want to delete "${confirmDelete.name}" (${confirmDelete.id})? This action cannot be undone.`}
          onConfirm={confirmDel} onCancel={() => setConfirmDelete(null)} />
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}