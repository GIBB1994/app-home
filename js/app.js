let allApps = [];
let deferredPrompt = null;

async function loadText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.text();
}

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function render(apps) {
  const grid = document.getElementById("grid");
  const q = document.getElementById("search").value.trim().toLowerCase();

  const filtered = apps.filter(a => {
    const hay = `${a.name} ${a.slug} ${a.description ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  document.getElementById("countAll").textContent = `All: ${apps.length}`;
  document.getElementById("countShown").textContent = `Shown: ${filtered.length}`;

  grid.innerHTML = filtered.map(a => `
    <article class="card">
      <h3>${escapeHtml(a.name)}</h3>
      <p>${escapeHtml(a.description ?? "")}</p>
      <div class="actions">
        <a class="btnlink" href="${escapeHtml(a.url)}" rel="noopener">Open</a>
      </div>
      <div class="pill">Repo: ${escapeHtml(a.slug)}</div>
    </article>
  `).join("");

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="card"><h3>No matches</h3><p>Try a different search.</p></div>`;
  }
}

async function refresh() {
  try {
    allApps = await loadJSON("./apps.json");
    render(allApps);
  } catch (e) {
    const grid = document.getElementById("grid");
    grid.innerHTML = `<div class="card">
      <h3>Couldn’t load apps.json</h3>
      <p>${escapeHtml(e.message)}</p>
      <p class="pill">Tip: Make sure apps.json is in the repo root.</p>
    </div>`;
  }
}

async function setVersionBadge() {
  try {
    const v = (await loadText("./VERSION.txt")).trim();
    document.getElementById("versionBadge").textContent = v || "v?";
  } catch {
    document.getElementById("versionBadge").textContent = "v?";
  }
}

function setupInstall() {
  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.disabled = false;
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.disabled = true;
  });
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (e) {
    // Don’t hard-fail the UI if SW fails.
    console.warn("SW registration failed:", e);
  }
}

document.getElementById("search").addEventListener("input", () => render(allApps));
document.getElementById("refreshBtn").addEventListener("click", refresh);

(async function init() {
  await setVersionBadge();
  setupInstall();
  await registerSW();
  await refresh();
})();

