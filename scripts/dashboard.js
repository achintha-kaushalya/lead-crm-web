// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD JS — Lead CRM
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY  = "lead_crm_session";
const SHEET_ID     = "10ZKNM3tEtCTcXSYLZPFBhkrZQ7qR1XXkl84b7j0Ss_Q";

// Google Sheets tab GIDs (get from your sheet URL when you click each tab)
const SHEET_TABS = {
  sheet:   { label: "📋 Master Leads",  gid: "0" },
  summary: { label: "📈 Leads Summary", gid: "1" },   // update if GID differs
  members: { label: "👥 Members",       gid: "2" }    // update if GID differs
};

let currentTab = "sheet";

// ── Auth Guard ────────────────────────────────────────────────────────────────
(function checkAuth() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session) window.location.href = "index.html";
})();

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout() {
  if (confirm("Are you sure you want to sign out?")) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  }
}

// ── Sidebar Toggle ────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}

// ── Top Nav Search ─────────────────────────────────────────────────────────────
function handleTopSearch(e) {
  if (e.key === "Enter") {
    triggerTopSearch();
  }
}

function triggerTopSearch() {
  const query = document.getElementById("topSearchInput").value.trim();
  if (!query) return;
  // Redirect to My Leads page with search query
  window.location.href = `my-leads.html?q=${encodeURIComponent(query)}`;
}

// ── Tab Switching (changes the embedded Google Sheet tab) ─────────────────────
function switchTab(tabKey, btn) {
  currentTab = tabKey;
  const tabInfo = SHEET_TABS[tabKey];

  // Update iframe src to show the correct sheet tab
  const frame = document.getElementById("sheetFrame");
  frame.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${tabInfo.gid}&usp=sharing&rm=minimal`;

  // Update label
  document.getElementById("sheetLabel").textContent = tabInfo.label;
  document.querySelector(".open-in-sheets").href =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${tabInfo.gid}`;

  // Update active tab button
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
}

// ── Refresh Sheet ─────────────────────────────────────────────────────────────
function refreshSheet() {
  const frame = document.getElementById("sheetFrame");
  const tab   = SHEET_TABS[currentTab];
  frame.src   = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${tab.gid}&usp=sharing&rm=minimal`;
  showToast("🔄 Sheet refreshed!");
}

// ── Panel Control ─────────────────────────────────────────────────────────────
function openPanel(name) {
  document.getElementById(name + "Overlay").classList.add("active");
  document.getElementById(name + "Panel").classList.add("open");
}

function closePanel(name) {
  document.getElementById(name + "Overlay").classList.remove("active");
  document.getElementById(name + "Panel").classList.remove("open");
}

function openAddLeadPanel()  { openPanel("addLead"); }
function openSearchPanel()   { openPanel("search"); document.getElementById("searchPhone").focus(); }
function openCallLogPanel()  { openPanel("callLog"); }

// ── Filter Handlers ───────────────────────────────────────────────────────────
// NOTE: Because the sheet is in an iFrame, direct filtering is not possible
// via JavaScript. These buttons show a tip to the user with instructions.
function applyMemberFilter() {
  const val = document.getElementById("memberFilter").value;
  if (!val) return;
  showToast(`💡 In the sheet: Use Data → Filter Views and select "${val}"`, 4000);
}

function applyStatusFilter() {
  const val = document.getElementById("statusFilter").value;
  if (!val) return;
  showToast(`💡 In the sheet: Use the Status column filter to select "${val}"`, 4000);
}

// ── Search Number ─────────────────────────────────────────────────────────────
// NOTE: Requires Google Sheets API key. Currently shows a guide message.
// In Phase 2, this will query the sheet directly via Apps Script Web App API.
function searchNumber() {
  const phone = document.getElementById("searchPhone").value.trim();
  const area  = document.getElementById("searchResult");

  if (phone.length < 5) {
    area.innerHTML = '<div class="search-placeholder">Type a number above to search...</div>';
    return;
  }

  // Phase 2 placeholder: call your Apps Script doGet() endpoint here
  area.innerHTML = `
    <div class="result-card">
      <h4>🔍 Search: ${phone}</h4>
      <div class="result-row">
        <span class="label">Status</span>
        <span class="value">⏳ Live search coming in Phase 2</span>
      </div>
      <div class="result-row">
        <span class="label">How to find now</span>
        <span class="value">Use Ctrl+F inside the sheet</span>
      </div>
      <div class="panel-note" style="margin-top:8px;">
        📌 Press <b>Ctrl+F</b> (or ⌘+F) inside the embedded sheet to instantly find any phone number.
      </div>
    </div>`;
}

// ── Add Lead (Phase 2 — Apps Script API integration placeholder) ──────────────
function submitAddLead() {
  const phone    = document.getElementById("addPhone").value.trim();
  const member   = document.getElementById("addMember").value;
  const grade    = document.getElementById("addGrade").value.trim();
  const campaign = document.getElementById("addCampaign").value.trim();
  const status   = document.getElementById("addStatus").value;
  const resultEl = document.getElementById("addLeadResult");

  if (!phone) {
    showResult(resultEl, "error", "⚠ Please enter a phone number.");
    return;
  }

  // Phase 2: POST to Apps Script Web App endpoint
  // fetch(APPS_SCRIPT_URL, { method:'POST', body: JSON.stringify({phone,member,grade,campaign,status}) })
  //   .then(r => r.json()).then(data => { ... });

  showResult(resultEl, "success",
    `✅ Phase 2 feature — Open the sheet and add: ${phone} (${member || "Unassigned"}, ${campaign || "—"})`);
}

// ── Log a Call ────────────────────────────────────────────────────────────────
function submitCallLog() {
  const fcode    = document.getElementById("callFCode").value.trim();
  const result   = document.getElementById("callResult").value;
  const duration = document.getElementById("callDuration").value;
  const notes    = document.getElementById("callNotes").value.trim();
  const resultEl = document.getElementById("callLogResult");

  if (!fcode) {
    showResult(resultEl, "error", "⚠ Please enter an F-Code.");
    return;
  }

  const logEntry = {
    fcode, result, duration, notes,
    timestamp: new Date().toLocaleString("en-LK", { timeZone: "Asia/Colombo" })
  };

  // Save to localStorage for Phase 1 (Phase 2 will sync to Google Sheets)
  const logs = JSON.parse(localStorage.getItem("callLogs") || "[]");
  logs.push(logEntry);
  localStorage.setItem("callLogs", JSON.stringify(logs));

  showResult(resultEl, "success",
    `✅ Call logged! ${fcode} → ${result} (${duration || "0"} min) at ${logEntry.timestamp}`);

  // Clear form
  document.getElementById("callFCode").value    = "";
  document.getElementById("callDuration").value = "";
  document.getElementById("callNotes").value    = "";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showResult(el, type, msg) {
  el.textContent  = msg;
  el.className    = `result-msg ${type}`;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 5000);
}

let toastTimer;
function showToast(msg, duration = 3000) {
  let toast = document.getElementById("_toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "_toast";
    toast.style.cssText = `
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
      background: #0F172A; color: #fff; padding: 10px 20px; border-radius: 30px;
      font-family: Inter, sans-serif; font-size: 13px; font-weight: 500;
      z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      opacity: 0; transition: opacity 0.3s; pointer-events: none; max-width: 90vw; text-align: center;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.opacity = "0"; }, duration);
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  // Init empty
});
