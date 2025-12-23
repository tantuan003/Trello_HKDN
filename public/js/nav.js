let currentWorkspaceId = null;

async function loadNav(activePage) {
  try {
    console.log("Loading nav...");
    const res = await fetch("components/nav_menu.html");
    const html = await res.text();
    console.log("Nav HTML length:", html.length);
    const container = document.getElementById("nav-container");
    if (!container) {
      console.error("nav-container not found in DOM");
      return;
    }
    container.innerHTML = html;
    console.log("Nav injected");

    document.querySelectorAll(".menu-item").forEach(item => {
      if (item.dataset.page === activePage) item.classList.add("active");
      item.addEventListener("click", () => {
        window.location.href = item.dataset.page + ".html";
      });
    });

    await setWorkspaceUI();
  } catch (err) {
    console.error("Error loading nav:", err);
  }
}


/**
 * Fetch workspaces, determine current workspace (URL -> localStorage -> first),
 * update URL and show name in .workspace-title. If #workspace-select exists, populate it.
 */
async function setWorkspaceUI() {
  try {
    const res = await fetch("http://localhost:8127/v1/workspace", { credentials: "include" });
    const workspaces = await res.json();

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      console.warn("No workspaces found for user");
      return;
    }

    // Get workspace from URL or fallback to localStorage or first
    const params = new URLSearchParams(window.location.search);
    let wsId = params.get("ws") || localStorage.getItem("currentWorkspaceId");
    let currentWs = workspaces.find(ws => ws._id === wsId) || workspaces[0];

    currentWorkspaceId = currentWs._id;
    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    // Update URL to ensure ?ws=currentWorkspaceId is set
    const url = new URL(window.location);
    url.searchParams.set("ws", currentWorkspaceId);
    window.history.replaceState({}, "", url);

    // Update title in nav
    const wsTitleEl = document.querySelector(".workspace-title");
    if (wsTitleEl) {
      wsTitleEl.innerHTML = `
        <span class="ws-icon">${(currentWs.name || "W").charAt(0).toUpperCase()}</span>
        ${currentWs.name || "Workspace"}
      `;
    }

    // Optional dropdown (if present in the page)
    const select = document.getElementById("workspace-select");
    if (select) {
      select.innerHTML = "";
      workspaces.forEach(ws => {
        const opt = document.createElement("option");
        opt.value = ws._id;
        opt.textContent = ws.name;
        if (ws._id === currentWorkspaceId) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener("change", (e) => {
        const newWsId = e.target.value;
        if (newWsId === currentWorkspaceId) return;
        currentWorkspaceId = newWsId;
        localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

        const url = new URL(window.location);
        url.searchParams.set("ws", currentWorkspaceId);
        window.history.replaceState({}, "", url);

        // Reload page content theo workspace mới
        location.reload();
      });
    }
  } catch (err) {
    console.error("Error setting workspace UI:", err);
  }
}
