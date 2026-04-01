/* ════════════════════════════════════════════
   mediQ — index.js
   Theme toggle + QR Scanner logic
   ════════════════════════════════════════════ */

/* ─────────────────────── THEME TOGGLE */
function toggleTheme() {
  var html  = document.documentElement;
  var label = document.getElementById('theme-label');
  var isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) {
    html.setAttribute('data-theme', 'light');
    label.textContent = 'Dark Mode';
    localStorage.setItem('mediq-theme', 'light');
  } else {
    html.setAttribute('data-theme', 'dark');
    label.textContent = 'Light Mode';
    localStorage.setItem('mediq-theme', 'dark');
  }
}

/* Restore saved theme on page load */
(function () {
  var saved = localStorage.getItem('mediq-theme');
  var label = document.getElementById('theme-label');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (label) label.textContent = 'Dark Mode';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (label) label.textContent = 'Light Mode';
  }
})();

/* ─────────────────────── QR SCANNER STATE */
var inlineScannerActive = false;
var modalScannerActive  = false;
var inlineHtml5QrCode   = null;
var modalHtml5QrCode    = null;

/* ─────────────────────── INLINE SCANNER */
function startScanner() {
  if (inlineScannerActive) return;
  document.getElementById('scanner-placeholder').style.display = 'none';
  document.getElementById('qr-reader').style.display = 'block';
  document.getElementById('scan-line').classList.add('visible');
  document.getElementById('btn-start').classList.add('hidden');
  document.getElementById('btn-stop').classList.remove('hidden');
  setStatus('scanning', 'Scanning...');

  inlineHtml5QrCode = new Html5Qrcode('qr-reader');
  inlineHtml5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    function (decodedText) { showInlineResult(decodedText); },
    function () {}
  ).then(function () {
    inlineScannerActive = true;
  }).catch(function () {
    resetInlineScanner();
    setStatus('off', 'Camera Error');
    showInlineError('Camera access denied or unavailable. Please use the Upload option below.');
  });
}

function stopScanner() {
  if (inlineHtml5QrCode && inlineScannerActive) {
    inlineHtml5QrCode.stop().then(function () {
      inlineScannerActive = false;
      resetInlineScanner();
      setStatus('off', 'Camera Off');
    }).catch(function () {
      inlineScannerActive = false;
      resetInlineScanner();
    });
  }
}

function resetInlineScanner() {
  document.getElementById('scanner-placeholder').style.display = 'flex';
  document.getElementById('qr-reader').style.display = 'none';
  document.getElementById('scan-line').classList.remove('visible');
  document.getElementById('btn-start').classList.remove('hidden');
  document.getElementById('btn-stop').classList.add('hidden');
}

function setStatus(state, text) {
  var dot = document.getElementById('status-dot');
  var txt = document.getElementById('status-text');
  dot.className = 'status-dot';
  if (state === 'scanning') dot.classList.add('scanning');
  if (state === 'active')   dot.classList.add('active');
  txt.textContent = text;
}

function showInlineResult(text) {
  stopScanner();
  setStatus('active', 'Code Detected!');
  var el      = document.getElementById('scan-result');
  var content = document.getElementById('result-content');
  var icon    = document.getElementById('result-icon');
  var title   = document.getElementById('result-title');
  el.className = 'scan-result';
  el.classList.remove('hidden');
  icon.textContent  = '✅';
  title.className   = 'result-title';
  title.textContent = 'QR Code Successfully Scanned!';
  var parsed = tryParse(text);
  var html = '';
  if (parsed && parsed.length) {
    html += '<div class="result-data">';
    parsed.forEach(function (pair) {
      html += '<div class="result-row"><span class="result-key">' + escHtml(pair[0]) + '</span><span class="result-val">' + escHtml(pair[1]) + '</span></div>';
    });
    html += '</div>';
  }
  html += '<div class="result-raw">' + escHtml(text) + '</div>';
  content.innerHTML = html;
}

function showInlineError(msg) {
  var el    = document.getElementById('scan-result');
  var icon  = document.getElementById('result-icon');
  var title = document.getElementById('result-title');
  var cont  = document.getElementById('result-content');
  el.className = 'scan-result error-result';
  el.classList.remove('hidden');
  icon.textContent  = '❌';
  title.className   = 'result-title error';
  title.textContent = 'Scan Failed';
  cont.innerHTML = '<div class="result-raw error">' + escHtml(msg) + '</div>';
}

/* ─────────────────────── FILE UPLOAD */
function scanFromFile(input, mode) {
  var file = input.files[0];
  if (!file) return;
  var tmpId = (mode === 'modal') ? 'modal-file-tmp' : 'inline-file-tmp';
  var tmp = document.getElementById(tmpId);
  if (!tmp) {
    tmp = document.createElement('div');
    tmp.id = tmpId;
    tmp.style.display = 'none';
    document.body.appendChild(tmp);
  }
  var sc = new Html5Qrcode(tmpId);
  sc.scanFile(file, true).then(function (text) {
    sc.clear();
    if (mode === 'modal') showModalResult(text);
    else                  showInlineResult(text);
  }).catch(function () {
    sc.clear();
    if (mode === 'modal') showModalResult(null);
    else showInlineError('Could not decode QR code. Please try a clearer image.');
  });
  input.value = '';
}

/* ─────────────────────── MODAL SCANNER */
function openQRModal() {
  document.getElementById('qr-modal').classList.add('open');
  document.getElementById('modal-result').classList.add('hidden');
  document.getElementById('modal-result-raw').textContent  = '';
  document.getElementById('modal-result-parsed').innerHTML = '';
  setTimeout(startModalScanner, 250);
}

function closeQRModal() {
  stopModalScanner();
  document.getElementById('qr-modal').classList.remove('open');
}

function startModalScanner() {
  if (modalScannerActive) return;
  modalHtml5QrCode = new Html5Qrcode('modal-qr-reader');
  modalHtml5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    function (text) { showModalResult(text); },
    function () {}
  ).then(function () {
    modalScannerActive = true;
  }).catch(function () {
    modalScannerActive = false;
  });
}

function stopModalScanner() {
  if (modalHtml5QrCode && modalScannerActive) {
    modalHtml5QrCode.stop().catch(function () {});
    modalScannerActive = false;
  }
}

function showModalResult(text) {
  stopModalScanner();
  var el     = document.getElementById('modal-result');
  var lbl    = document.getElementById('modal-result-label');
  var raw    = document.getElementById('modal-result-raw');
  var parsed = document.getElementById('modal-result-parsed');
  el.classList.remove('hidden');
  if (!text) {
    lbl.textContent = '❌ Could Not Read QR Code';
    lbl.style.color = 'var(--red)';
    raw.textContent = 'Please try a clearer or better-lit image.';
    parsed.innerHTML = '';
    return;
  }
  lbl.textContent = '✅ QR Code Detected';
  lbl.style.color = 'var(--green)';
  raw.textContent = text;
  var pairs = tryParse(text);
  if (pairs && pairs.length) {
    parsed.innerHTML = pairs.map(function (p) {
      return '<div class="modal-result-row"><span class="modal-result-key">' + escHtml(p[0]) + '</span><span class="modal-result-val">' + escHtml(p[1]) + '</span></div>';
    }).join('');
  } else {
    parsed.innerHTML = '';
  }
}

/* Close on backdrop click */
document.getElementById('qr-modal').addEventListener('click', function (e) {
  if (e.target === this) closeQRModal();
});

/* ─────────────────────── PARSE QR DATA */
function tryParse(text) {
  try {
    var obj = JSON.parse(text);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.keys(obj).map(function (k) {
        var lbl = k.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) { return s.toUpperCase(); });
        return [lbl, String(obj[k])];
      });
    }
  } catch (e) {}
  var lines = text.split(/[\n|]+/);
  if (lines.length > 1) {
    var pairs = [];
    lines.forEach(function (line) {
      var idx = line.indexOf(':');
      if (idx > 0) pairs.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    });
    if (pairs.length > 0) return pairs;
  }
  if (/^MQ-\d{4}/.test(text)) {
    return [['Medicine ID', text.split('|')[0].trim()], ['System', 'mediQ Database Entry']];
  }
  return null;
}

/* ─────────────────────── HTML ESCAPE */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────── SCROLL REVEAL */
var revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry, i) {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeUp 0.5s ease ' + (i * 80) + 'ms both';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .step, .info-card, .about-card').forEach(function (el) {
  el.style.opacity = '0';
  revealObserver.observe(el);
});

/* ─────────────────────── NAVBAR SHADOW ON SCROLL */
window.addEventListener('scroll', function () {
  var nav = document.getElementById('navbar');
  nav.style.boxShadow = window.scrollY > 20 ? '0 4px 30px rgba(0,0,0,0.15)' : 'none';
});
