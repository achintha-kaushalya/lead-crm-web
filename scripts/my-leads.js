// ─────────────────────────────────────────────────────────────────────────────
//  MY LEADS — Full CRUD (Read, Update, Delete) via Apps Script Web App API
// ─────────────────────────────────────────────────────────────────────────────

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvOLULps5iaWiKHIsfFLQcFOowxll0FFTecAES3Y6KgqoibnjNYI7nEStnataQvuQ/exec";
const SESSION_KEY     = "lead_crm_session";

// ── Auth Guard ────────────────────────────────────────────────────────────────
(function checkAuth() {
  if (!sessionStorage.getItem(SESSION_KEY)) window.location.href = "index.html";
})();
function handleLogout() {
  if (confirm("Sign out?")) { sessionStorage.removeItem(SESSION_KEY); window.location.href = "index.html"; }
}

// ── State ─────────────────────────────────────────────────────────────────────
let allLeads      = [];
let filteredLeads = [];
let activeStatus  = "";
let currentLead   = null;
let membersList   = [];

// ── Load Members ──────────────────────────────────────────────────────────────
async function loadMembers() {
  const select = document.getElementById("memberSelect");
  try {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=getMembers`);
    const data = await res.json();
    membersList = data.members || [];
    membersList.forEach(name => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = name;
      select.appendChild(opt);
    });
    // Populate edit panel member select
    populateEditMemberSelect();
  } catch (err) {
    console.warn("Members load error:", err);
  }
}

function populateEditMemberSelect() {
  const sel = document.getElementById("editMember");
  sel.innerHTML = '<option value="">— Select —</option>';
  membersList.forEach(name => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = name;
    sel.appendChild(opt);
  });
}

// ── Load Leads ────────────────────────────────────────────────────────────────
async function loadLeads() {
  const member = document.getElementById("memberSelect").value;
  setUIState("loading");

  try {
    const memberParam = member ? `&member=${encodeURIComponent(member)}` : "";
    const url  = `${APPS_SCRIPT_URL}?action=getLeads${memberParam}`;
    const res  = await fetch(url);
    const data = await res.json();

    allLeads     = data.leads || [];
    activeStatus = "";
    // reset pills
    document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    document.querySelector(".pill[data-status='']").classList.add("active");

    const badge = document.getElementById("leadCountBadge");
    badge.textContent = `${allLeads.length} leads`;
    badge.style.display = allLeads.length ? "inline-block" : "none";

    applyFilter();
    updateStats(allLeads);
    document.getElementById("statsStrip").style.display = "flex";

  } catch (err) {
    setUIState("error", "⚠ Cannot connect to Google Sheets. Check Apps Script deployment.");
  }
}

// ── Filter ────────────────────────────────────────────────────────────────────
function filterStatus(status, btn) {
  activeStatus = status;
  document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  applyFilter();
}

function onSearchInput() {
  applyFilter();
}

function applyFilter() {
  const query = (document.getElementById("searchInput") ? document.getElementById("searchInput").value : "").trim().toLowerCase();

  filteredLeads = allLeads.filter(l => {
    // 1. Status pill filter
    if (activeStatus && l.status !== activeStatus) return false;

    // 2. Keyword search filter across all fields
    if (query) {
      const match =
        (l.fcode && l.fcode.toLowerCase().includes(query)) ||
        (l.phone && l.phone.toLowerCase().includes(query)) ||
        (l.rawPhone && l.rawPhone.toLowerCase().includes(query)) ||
        (l.member && l.member.toLowerCase().includes(query)) ||
        (l.status && l.status.toLowerCase().includes(query)) ||
        (l.grade && l.grade.toLowerCase().includes(query)) ||
        (l.campaign && l.campaign.toLowerCase().includes(query)) ||
        (l.comments && l.comments.toLowerCase().includes(query)) ||
        (l.secondCallNotes && l.secondCallNotes.toLowerCase().includes(query)) ||
        (l.date && l.date.toLowerCase().includes(query));
      if (!match) return false;
    }

    return true;
  });

  // Update lead count badge with filtered count
  const badge = document.getElementById("leadCountBadge");
  if (badge) {
    badge.textContent = `${filteredLeads.length} / ${allLeads.length} leads`;
  }

  renderTable(filteredLeads);
}

// ── Render Table ──────────────────────────────────────────────────────────────
function renderTable(leads) {
  const tbody  = document.getElementById("leadsBody");
  const scroll = document.getElementById("tableScroll");
  const empty  = document.getElementById("emptyState");

  tbody.innerHTML = "";
  setUIState("done");

  if (!leads.length) {
    scroll.style.display = "none";
    empty.style.display  = "flex";
    empty.querySelector(".empty-icon").textContent  = "📭";
    empty.querySelector(".empty-title").textContent = "No leads found";
    empty.querySelector(".empty-sub").textContent   =
      activeStatus ? `No leads with status "${activeStatus}"` : "No leads assigned to this member";
    return;
  }

  scroll.style.display = "flex";
  empty.style.display  = "none";

  leads.forEach(lead => {
    const tr = document.createElement("tr");
    if (lead.status === "Second Call Pending") tr.classList.add("highlight-row");

    tr.innerHTML = `
      <td class="fcode-cell">${esc(lead.fcode)}</td>
      <td class="phone-cell">${esc(lead.phone || lead.rawPhone)}</td>
      <td class="member-cell">${esc(lead.member) || "—"}</td>
      <td style="white-space:nowrap;">${esc(lead.date) || "—"}</td>
      <td>${statusBadge(lead.status)}</td>
      <td>${esc(lead.grade) || "—"}</td>
      <td class="truncate-cell" title="${esc(lead.comments)}">${esc(lead.comments) || "—"}</td>
      <td>${esc(lead.campaign) || "—"}</td>
      <td style="text-align:center;">${lead.secondCallDone === "Yes"
        ? '<span class="done-yes">✓ Yes</span>'
        : '<span class="done-no">—</span>'}</td>
      <td class="truncate-cell" title="${esc(lead.secondCallNotes)}">${esc(lead.secondCallNotes) || "—"}</td>
      <td class="col-actions">
        <div class="action-btns">
          <button class="btn-edit" onclick="openEditPanel('${esc(lead.fcode)}')">✏ Edit</button>
          <button class="btn-del"  onclick="confirmDeleteLead('${esc(lead.fcode)}')">🗑</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function statusBadge(s) {
  const map = {
    "New":"b-new","Contacted":"b-contacted","Interested":"b-interested",
    "Converted":"b-converted","No Answer":"b-no-answer","Not Interested":"b-not-interested",
    "Follow-up":"b-follow-up","Second Call Pending":"b-second-call","Busy":"b-busy"
  };
  return `<span class="badge ${map[s]||'b-default'}">${esc(s)||"—"}</span>`;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats(leads) {
  document.getElementById("statTotal").textContent     = leads.length;
  document.getElementById("statInterested").textContent= count(leads,"Interested");
  document.getElementById("statContacted").textContent = count(leads,"Contacted");
  document.getElementById("statPending").textContent   = count(leads,"Second Call Pending");
  document.getElementById("statConverted").textContent = count(leads,"Converted");
  document.getElementById("statNoAnswer").textContent  = count(leads,"No Answer");
}
function count(arr, status) { return arr.filter(l => l.status === status).length; }

// ── Edit Panel ────────────────────────────────────────────────────────────────
function openEditPanel(fcode) {
  currentLead = allLeads.find(l => l.fcode === fcode);
  if (!currentLead) return;

  const l = currentLead;
  document.getElementById("editFCodeLabel").textContent = l.fcode;

  // Readonly card
  document.getElementById("readonlyCard").innerHTML = `
    <div class="rc-row"><span class="rc-label">📞 Phone</span>    <span class="rc-val">${esc(l.phone||l.rawPhone)}</span></div>
    <div class="rc-row"><span class="rc-label">🆔 F-Code</span>   <span class="rc-val">${esc(l.fcode)}</span></div>
    <div class="rc-row"><span class="rc-label">📅 Date Added</span><span class="rc-val">${esc(l.date)||"—"}</span></div>
  `;

  // Pre-fill editable fields
  document.getElementById("editMember").value         = l.member     || "";
  document.getElementById("editStatus").value         = l.status     || "New";
  document.getElementById("editGrade").value          = l.grade      || "";
  document.getElementById("editCampaign").value       = l.campaign   || "";
  document.getElementById("editComments").value       = l.comments   || "";
  document.getElementById("editSecondCallDone").checked = (l.secondCallDone === "Yes");
  document.getElementById("editSecondCallNotes").value  = l.secondCallNotes || "";
  document.getElementById("saveResult").style.display   = "none";

  document.getElementById("editOverlay").classList.add("active");
  document.getElementById("editPanel").classList.add("open");
}

function closeEditPanel() {
  document.getElementById("editOverlay").classList.remove("active");
  document.getElementById("editPanel").classList.remove("open");
  currentLead = null;
}

// ── Save (Update) ─────────────────────────────────────────────────────────────
async function saveLead() {
  if (!currentLead) return;

  const btn    = document.getElementById("saveBtn");
  const resEl  = document.getElementById("saveResult");

  btn.disabled    = true;
  btn.textContent = "⏳ Saving to Google Sheets...";
  resEl.style.display = "none";

  const payload = {
    action:          "updateLead",
    fcode:           currentLead.fcode,
    member:          document.getElementById("editMember").value,
    status:          document.getElementById("editStatus").value,
    grade:           document.getElementById("editGrade").value.trim(),
    campaign:        document.getElementById("editCampaign").value.trim(),
    comments:        document.getElementById("editComments").value.trim(),
    secondCallDone:  document.getElementById("editSecondCallDone").checked ? "Yes" : "No",
    secondCallNotes: document.getElementById("editSecondCallNotes").value.trim()
  };

  try {
    // Use GET with URLSearchParams to avoid CORS preflight (Apps Script blocks POST cross-origin)
    const params = new URLSearchParams({
      action:          "updateLead",
      fcode:           currentLead.fcode,
      member:          document.getElementById("editMember").value,
      status:          document.getElementById("editStatus").value,
      grade:           document.getElementById("editGrade").value.trim(),
      campaign:        document.getElementById("editCampaign").value.trim(),
      comments:        document.getElementById("editComments").value.trim(),
      secondCallDone:  document.getElementById("editSecondCallDone").checked ? "Yes" : "No",
      secondCallNotes: document.getElementById("editSecondCallNotes").value.trim()
    });
    const res  = await fetch(`${APPS_SCRIPT_URL}?${params}`);
    const data = await res.json();

    if (data.success) {
    // Update local state immediately (before close)
    const idx = allLeads.findIndex(l => l.fcode === currentLead.fcode);
    if (idx !== -1) Object.assign(allLeads[idx], {
      member:          document.getElementById("editMember").value,
      status:          document.getElementById("editStatus").value,
      grade:           document.getElementById("editGrade").value.trim(),
      campaign:        document.getElementById("editCampaign").value.trim(),
      comments:        document.getElementById("editComments").value.trim(),
      secondCallDone:  document.getElementById("editSecondCallDone").checked ? "Yes" : "No",
      secondCallNotes: document.getElementById("editSecondCallNotes").value.trim()
    });
    applyFilter();
    updateStats(allLeads);
    showPanelResult("success", `✅ Row ${data.updatedRow} updated in Master Leads!`);
    setTimeout(closeEditPanel, 2000);
    } else {
      showPanelResult("error", `❌ ${data.error}`);
    }
  } catch (err) {
    showPanelResult("error", `❌ Network error: ${err.message}`);
  } finally {
    btn.disabled    = false;
    btn.textContent = "💾 Save Changes to Master Sheet";
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
let pendingDeleteFCode = null;

function confirmDeleteLead(fcode) {
  const lead = allLeads.find(l => l.fcode === fcode);
  if (!lead) return;
  pendingDeleteFCode = fcode;
  document.getElementById("deleteModalMsg").textContent =
    `This will permanently remove ${fcode} (${lead.phone || lead.rawPhone}) from Master Leads. This cannot be undone.`;
  document.getElementById("deleteModalOverlay").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("deleteModalOverlay").style.display = "none";
  pendingDeleteFCode = null;
}

async function deleteLead() {
  if (!pendingDeleteFCode) return;

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  confirmBtn.disabled    = true;
  confirmBtn.textContent = "⏳ Deleting...";

  try {
    // Use GET with URLSearchParams to avoid CORS preflight
    const params = new URLSearchParams({ action: "deleteLead", fcode: pendingDeleteFCode });
    const res  = await fetch(`${APPS_SCRIPT_URL}?${params}`);
    const data = await res.json();

    if (data.success) {
      // Remove from local state
      allLeads = allLeads.filter(l => l.fcode !== pendingDeleteFCode);
      applyFilter();
      updateStats(allLeads);
      closeDeleteModal();
      closeEditPanel();
      showToast(`🗑 ${pendingDeleteFCode} deleted from Master Leads`);
    } else {
      alert(`❌ Delete failed: ${data.error}`);
    }
  } catch (err) {
    alert(`❌ Network error: ${err.message}`);
  } finally {
    confirmBtn.disabled    = false;
    confirmBtn.textContent = "Delete Permanently";
  }
}

// ── UI State Helper ───────────────────────────────────────────────────────────
function setUIState(state, msg = "") {
  const loading = document.getElementById("loadingState");
  const empty   = document.getElementById("emptyState");
  const scroll  = document.getElementById("tableScroll");

  loading.style.display = state === "loading" ? "flex"  : "none";
  if (state === "loading") { scroll.style.display = "none"; empty.style.display = "none"; }
  if (state === "error") {
    empty.style.display = "flex";
    empty.querySelector(".empty-icon").textContent  = "⚠";
    empty.querySelector(".empty-title").textContent = "Connection Error";
    empty.querySelector(".empty-sub").textContent   = msg;
  }
}

function showPanelResult(type, msg) {
  const el = document.getElementById("saveResult");
  el.className = `save-result ${type}`;
  el.textContent = msg;
  el.style.display = "block";
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, ms = 3500) {
  let t = document.getElementById("_toast");
  if (!t) {
    t = document.createElement("div"); t.id = "_toast";
    t.style.cssText =
      "position:fixed;bottom:28px;left:50%;transform:translateX(-50%);" +
      "background:#0F172A;color:#fff;padding:10px 22px;border-radius:30px;" +
      "font-family:Inter,sans-serif;font-size:13px;font-weight:600;z-index:9999;" +
      "box-shadow:0 4px 20px rgba(0,0,0,.25);opacity:0;transition:opacity .3s;" +
      "pointer-events:none;max-width:90vw;text-align:center;";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = "0"; }, ms);
}

// ── Escape HTML ───────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function() {
  await loadMembers();
  // Check for search query parameter 'q' in URL
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  if (q) {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = q;
    }
  }
  // Auto-load all leads by default
  await loadLeads();
});
