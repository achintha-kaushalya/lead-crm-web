// ── Auth Config ───────────────────────────────────────────────────────────────
// NOTE: In a production system, move credentials to a server-side check.
// This is Phase 1 — simple client-side authentication.
const CREDENTIALS = {
  email:    "decima@gmail.com",   // case-insensitive match
  password: "Decima@123"
};

const SESSION_KEY = "lead_crm_session";

// ── Toggle Password Visibility ────────────────────────────────────────────────
function togglePassword() {
  const pwInput = document.getElementById("password");
  const btn     = document.getElementById("toggleBtn");
  if (pwInput.type === "password") {
    pwInput.type = "text";
    btn.textContent = "🙈";
  } else {
    pwInput.type = "password";
    btn.textContent = "👁";
  }
}

// ── Handle Login ──────────────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const errorDiv = document.getElementById("errorMsg");
  const btnText  = document.getElementById("btnText");
  const btnLoader= document.getElementById("btnLoader");
  const loginBtn = document.getElementById("loginBtn");

  // Show loading state
  btnText.style.display   = "none";
  btnLoader.style.display = "inline";
  loginBtn.disabled       = true;
  errorDiv.style.display  = "none";

  // Simulate a slight delay for UX feel
  setTimeout(() => {
    if (
      email    === CREDENTIALS.email.toLowerCase() &&
      password === CREDENTIALS.password
    ) {
      // ✅ Success — store session & redirect to dashboard
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email, loginTime: Date.now() }));
      window.location.href = "dashboard.html";
    } else {
      // ❌ Failure
      errorDiv.style.display = "block";
      btnText.style.display   = "inline";
      btnLoader.style.display = "none";
      loginBtn.disabled       = false;
      document.getElementById("password").value = "";
      document.getElementById("password").focus();
    }
  }, 700);
}

// ── Auto-redirect if already logged in ───────────────────────────────────────
(function checkSession() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (session) {
    window.location.href = "dashboard.html";
  }
})();
