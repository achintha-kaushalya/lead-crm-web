// ─────────────────────────────────────────────────────────────────────────────
//  MY LEADS PAGE — Lead CRM
//
//  HOW IT WORKS:
//  1. On load, fetches member list from Apps Script Web App (doGet?action=getMembers)
//  2. When member selected, fetches their leads (doGet?action=getLeads&member=NAME)
//  3. Renders a web table — no Excel filter involved
//  4. "Second Call" button opens slide-in panel
//  5. On save, POSTs to Apps Script doPost → updates the Master Leads sheet row
//
//  IMPORTANT: Replace APPS_SCRIPT_URL below with your deployed Web App URL!
//  Get it from: Extensions → Apps Script → Deploy → Manage deployments → copy URL
// ─────────────────────────────────────────────────────────────────────────────

const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
// Example: "https://script.google.com/macros/s/AKfycbxxxxxxxx/exec"

const SESSION_KEY = "lead_crm_session";

// ── Auth Guard ────────────────────────────────────────────────────────────────
(function checkAuth() {
  if (!sessionStorage.getItem(SESSION_KEY)) window.location.href = "index.html";
})();

function handleLogout() {
  if (confirm("Sign out?")) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  }
}

// ── State ─────────────────────────────────────────────────────────────────────
let allLeads       = [];   // all leads for current member
let filteredLeads  = [];   // after status pill filter
let activeStatus   = "";   // current status pill filter
let currentLead    = null; // lead open in second-call panel

// ── Load Members into Dropdown ────────────────────────────────────────────────
async function loadMembers() {
  const select = document.getElementById("memberSelect");
  try {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=getMembers`);
    const data = await res.json();
    if (data.members && data.members.length) {
      data.members.forEach(name => {
        const opt = document.createElement("option");
        opt.value       = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    // If URL not set yet, show placeholder members
    console.warn("Could not load members:", err);
    const placeholder = ["(Set Apps Script URL to load members)"];
    placeholder.forEach(name => {
      const opt = document.createElement("option");
      opt.value       = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }
}

// ── Load Leads for Selected Member ───────────────────────────────────────────
async function loadLeads() {
  const member = document.getElementById("memberSelect").value;
  if (!member) return;

  showLoading(true);

  try {
    const url  = `${APPS_SCRIPT_URL}?action=getLeads&member=${encodeURIComponent(member)}`;
    const res  = await fetch(url);
    const data = await res.json();

    allLeads = data.leads || [];
    activeStatus = "";
    // Reset pills
    document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    document.querySelector(".pill[data-status='']").classList.add("active");

    applyFilter();
    updateStats(allLeads);
    document.getElementById("statsStrip").style.display = "flex";

  } catch (err) {
    showLoading(false);
    showError("⚠ Could not connect to Google Sheets API. Check your Apps Script URL.");
  }
}

// ── Apply Status Pill Filter ──────────────────────────────────────────────────
function filterStatus(status, btn) {
  activeStatus = status;
  document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  applyFilter();
}

function applyFilter() {
  filteredLeads = activeStatus
    ? allLeads.filter(l => l.status === activeStatus)
    : allLeads;
  renderTable(filteredLeads);
}

// ── Render Table ──────────────────────────────────────────────────────────────
function renderTable(leads) {
  showLoading(false);
  const tbody = document.getElementById("leadsBody");
  const table = document.getElementById("leadsTable");
  const empty = document.getElementById("emptyState");

  tbody.innerHTML = "";

  if (!leads.length) {
    table.style.display = "none";
    empty.style.display = "flex";
    empty.querySelector(".empty-icon").textContent  = "📭";
    empty.querySelector(".empty-title").textContent = "No leads found";
    empty.querySelector(".empty-sub").textContent   = activeStatus
      ? `No leads with status "${activeStatus}" for this member`
      : "This member has no assigned leads";
    return;
  }

  table.style.display = "table";
  empty.style.display = "none";

  leads.forEach(lead => {
    const tr = document.createElement("tr");
    if (lead.status === "Second Call Pending") tr.classList.add("warning-row");

    tr.innerHTML = `
      <td class="fcode-cell">${esc(lead.fcode)}</td>
      <td class="phone-cell">${esc(lead.phone || lead.rawPhone)}</td>
      <td>${statusBadge(lead.status)}</td>
      <td>${esc(lead.grade) || "—"}</td>
      <td>${esc(lead.campaign) || "—"}</td>
      <td>${esc(lead.date) || "—"}</td>
      <td style="text-align:center;">${lead.secondCallDone === "Yes"
        ? '<span class="done-yes">✓</span>'
        : '<span class="done-no">—</span>'}</td>
      <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(lead.secondCallNotes)}">${esc(lead.secondCallNotes) || "—"}</td>
      <td class="col-action">
        <button class="btn-second-call" onclick="openCallPanel(${JSON.stringify(lead.fcode)})">
          📞 2nd Call
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── Status Badge HTML ─────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    "New":                  "s-new",
    "Contacted":            "s-contacted",
    "Interested":           "s-interested",
    "Converted":            "s-converted",
    "No Answer":            "s-no-answer",
    "Not Interested":       "s-not-interested",
    "Follow-up":            "s-follow-up",
    "Second Call Pending":  "s-second-call",
    "Busy":                 "s-busy",
  };
  const cls = map[status] || "s-default";
  return `<span class="status-badge ${cls}">${esc(status) || "—"}</span>`;
}

// ── Stats Strip Update ────────────────────────────────────────────────────────
function updateStats(leads) {
  document.getElementById("statTotal").textContent     = leads.length;
  document.getElementById("statInterested").textContent= leads.filter(l => l.status === "Interested").length;
  document.getElementById("statContacted").textContent = leads.filter(l => l.status === "Contacted").length;
  document.getElementById("statPending").textContent   = leads.filter(l => l.status === "Second Call Pending").length;
  document.getElementById("statConverted").textContent = leads.filter(l => l.status === "Converted").length;
}

// ── Second Call Panel ─────────────────────────────────────────────────────────
function openCallPanel(fcode) {
  currentLead = allLeads.find(l => l.fcode === fcode);
  if (!currentLead) return;

  document.getElementById("panelFCodeLabel").textContent = `F-Code: ${currentLead.fcode}`;
  document.getElementById("callStatus").value    = currentLead.status || "";
  document.getElementById("callDoneCheck").checked = currentLead.secondCallDone === "Yes";
  document.getElementById("callNotes").value     = currentLead.secondCallNotes || "";
  document.getElementById("saveResult").style.display = "none";

  // Lead summary card
  document.getElementById("leadSummaryCard").innerHTML = `
    <div class="lsc-row"><span class="lsc-label">Phone</span>      <span class="lsc-val">${esc(currentLead.phone || currentLead.rawPhone)}</span></div>
    <div class="lsc-row"><span class="lsc-label">Member</span>     <span class="lsc-val">${esc(currentLead.member)}</span></div>
    <div class="lsc-row"><span class="lsc-label">Current Status</span><span class="lsc-val">${esc(currentLead.status)}</span></div>
    <div class="lsc-row"><span class="lsc-label">Grade</span>      <span class="lsc-val">${esc(currentLead.grade) || "—"}</span></div>
    <div class="lsc-row"><span class="lsc-label">Campaign</span>   <span class="lsc-val">${esc(currentLead.campaign) || "—"}</span></div>
    <div class="lsc-row"><span class="lsc-label">Date Added</span> <span class="lsc-val">${esc(currentLead.date) || "—"}</span></div>
  `;

  document.getElementById("callOverlay").classList.add("active");
  document.getElementById("callPanel").classList.add("open");
}

function closeCallPanel() {
  document.getElementById("callOverlay").classList.remove("active");
  document.getElementById("callPanel").classList.remove("open");
  currentLead = null;
}

// ── Save Second Call → POST to Apps Script ────────────────────────────────────
async function saveSecondCall() {
  if (!currentLead) return;

  const btn       = document.getElementById("saveCallBtn");
  const resultEl  = document.getElementById("saveResult");
  const newStatus = document.getElementById("callStatus").value;
  const doneBool  = document.getElementById("callDoneCheck").checked;
  const notes     = document.getElementById("callNotes").value.trim();

  btn.disabled     = true;
  btn.textContent  = "⏳ Saving...";
  resultEl.style.display = "none";

  const payload = {
    action:          "updateLead",
    fcode:           currentLead.fcode,
    status:          newStatus || currentLead.status,
    secondCallDone:  doneBool ? "Yes" : "No",
    secondCallNotes: notes
  };

  try {
    const res  = await fetch(APPS_SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      // Update local state so table reflects change immediately
      const idx = allLeads.findIndex(l => l.fcode === currentLead.fcode);
      if (idx !== -1) {
        allLeads[idx].status          = payload.status;
        allLeads[idx].secondCallDone  = payload.secondCallDone;
        allLeads[idx].secondCallNotes = payload.secondCallNotes;
      }
      applyFilter();
      updateStats(allLeads);

      showPanelResult("success", `✅ Updated! Row ${data.updatedRow} in Master Leads saved.`);
      setTimeout(closeCallPanel, 2000);
    } else {
      showPanelResult("error", `❌ Error: ${data.error}`);
    }
  } catch (err) {
    showPanelResult("error", `❌ Network error. Check Apps Script URL.\n${err.message}`);
  } finally {
    btn.disabled    = false;
    btn.textContent = "💾 Save & Update Master Sheet";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showLoading(on) {
  document.getElementById("loadingState").style.display = on ? "flex"  : "none";
  document.getElementById("leadsTable").style.display   = on ? "none"  : "";
  document.getElementById("emptyState").style.display   = on ? "none"  : "";
}

function showError(msg) {
  const empty = document.getElementById("emptyState");
  empty.style.display = "flex";
  empty.querySelector(".empty-icon").textContent  = "⚠";
  empty.querySelector(".empty-title").textContent = "Connection Error";
  empty.querySelector(".empty-sub").textContent   = msg;
}

function showPanelResult(type, msg) {
  const el = document.getElementById("saveResult");
  el.className          = `save-result ${type}`;
  el.textContent        = msg;
  el.style.display      = "block";
  el.style.whiteSpace   = "pre-wrap";
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", loadMembers);
