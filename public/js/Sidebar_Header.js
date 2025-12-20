
const WSP_KEY = "wspMenuCollapsed";
const SEARCH_HISTORY_KEY = "recentBoardSearches";
import { API_BASE } from "../js/config.js";

let currentWorkspaceId = null;
let currentVisibility = null;

// ================= WORKSPACE SIDEBAR =================
export async function loadSidebarWorkspace() {
  const list = document.getElementById("workspace-list");
  if (!list) return console.error("Không tìm thấy #workspace-list");

  list.innerHTML = "<div>Đang tải workspace...</div>";

  try {
    const res = await fetch(`${API_BASE}/v1/workspace`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Fetch workspace lỗi: ${res.status}`);

    const workspaces = await res.json();
    list.innerHTML = "";

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      list.innerHTML = "<div>Chưa tham gia workspace nào</div>";
      return;
    }

    const workspaceIdFromUrl = new URLSearchParams(window.location.search).get("ws");

    workspaces.forEach((workspace, index) => {
      const firstLetter = workspace.name.charAt(0).toUpperCase();

      const item = document.createElement("div");
      item.classList.add("workspace-item");

      const head = document.createElement("button");
      head.className = "wsp-head";
      head.type = "button";
      head.setAttribute("aria-expanded", "false");
      head.innerHTML = `
        <span class="wsp-badge">${firstLetter}</span>
        <span class="wsp-name">${workspace.name}</span>
        <span class="chev"></span>
      `;

      const menu = document.createElement("ul");
      menu.className = "wsp-menu";
      menu.style.display = "none";
      menu.innerHTML = `
        <li><a href="boards.html?ws=${workspace._id}">Boards</a></li>
        <li><a href="members.html?ws=${workspace._id}">Members</a></li>
        <li><a href="settings-wsp.html?ws=${workspace._id}">Settings</a></li>
      `;

      // **Chỉ mở menu và set currentWorkspaceId nếu URL match**
      if (workspaceIdFromUrl === workspace._id) {
        currentWorkspaceId = workspace._id;
        currentVisibility = workspace.visibility;
        head.setAttribute("aria-expanded", "false");
        menu.style.display = "none";
      }

      // Nếu URL không có ws, mặc định workspace đầu tiên
      if (!workspaceIdFromUrl && index === 0) {
        currentWorkspaceId = workspace._id;
        currentVisibility = workspace.visibility;
        head.setAttribute("aria-expanded", "false");
        menu.style.display = "none";
      }

      head.addEventListener("click", () => {
        const isOpen = menu.style.display === "block";
        menu.style.display = isOpen ? "none" : "block";
        head.setAttribute("aria-expanded", isOpen ? "false" : "true");
      });

      item.appendChild(head);
      item.appendChild(menu);
      list.appendChild(item);
    });

  } catch (err) {
    console.error("Lỗi load workspace:", err);
    list.innerHTML = `<div>Lỗi khi tải workspace: ${err.message}</div>`;
  }
}

export function getCurrentWorkspaceId() {
  // Luôn ưu tiên URL
  const wsFromUrl = new URLSearchParams(window.location.search).get("ws");
  return wsFromUrl || currentWorkspaceId;
}

// ================= TOGGLE WORKSPACE =================
function initWorkspaceToggle() {
  const wsp = document.getElementById("wsp");
  const btn = document.getElementById("wspToggle");
  if (!wsp || !btn) return;

  const saved = localStorage.getItem(WSP_KEY);
  const collapsed = saved === "1";
  wsp.classList.toggle("is-collapsed", collapsed);
  btn.setAttribute("aria-expanded", String(!collapsed));

  btn.addEventListener("click", () => {
    const isCollapsed = wsp.classList.toggle("is-collapsed");
    btn.setAttribute("aria-expanded", String(!isCollapsed));
    localStorage.setItem(WSP_KEY, isCollapsed ? "1" : "0");
  });
}

// ================= TOGGLE TEMPLATES =================
function initTemplatesMenuToggle() {
  const nav = document.getElementById("sideNav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const head = e.target.closest(".nav-item.has-sub");
    if (!head) return;

    const section = head.closest(".nav-section");
    const clickOnChevron = !!e.target.closest(".chev");

    if (clickOnChevron) {
      e.preventDefault();
      section?.classList.toggle("open");
      head.classList.toggle("active");
    } else {
      const href = head.getAttribute("href") || "templates.html";
      window.location.href = href;
    }
  });
}

// ================= ACTIVE MENU =================
function initActiveMenu() {
  const path = window.location.pathname;
  const page = path.split("/").pop();

  if (page === "boards.html") document.getElementById("boardsMenu")?.classList.add("is-active");
  if (page === "templates.html") {
    document.getElementById("templateMenu")?.classList.add("is-active");
  }
  if (page === "home.html") document.getElementById("homeMenu")?.classList.add("is-active");
}

// ================= GLOBAL SEARCH =================
let cachedSearchBoards = null;

function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSearchHistory(board) {
  if (!board?._id) return;
  const history = loadSearchHistory().filter((b) => b._id !== board._id);
  history.unshift({
    _id: board._id,
    name: board.name,
    background: board.background,
    workspace: board.workspace ? { name: board.workspace.name } : null,
  });
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

async function fetchBoardsForSearch() {
  if (localStorage.getItem("boardsDirty")) {
    cachedSearchBoards = null;
    localStorage.removeItem("boardsDirty");
  }
  if (cachedSearchBoards) return cachedSearchBoards;

  try {
    const res = await fetch(`${API_BASE}/v1/board/myboards`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data)) {
      console.error("Không thể load boards cho search:", data);
      return [];
    }
    cachedSearchBoards = data;
    return cachedSearchBoards;
  } catch (err) {
    console.error("Lỗi fetch boards cho search:", err);
    return [];
  }
}

function normalizeVi(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

function initGlobalSearch() {
  const input = document.querySelector(".searchbar input");
  const panel = document.getElementById("globalSearchResults");
  if (!input || !panel) return;

  let debounceTimer = null;

  input.addEventListener("focus", () => {
    if (input.value.trim() !== "") return;
    const history = loadSearchHistory();
    renderSearchPanel(panel, history, { mode: "history" });
  });

  input.addEventListener("input", () => {
    const keyword = normalizeVi(input.value);
    clearTimeout(debounceTimer);

    // Không có keyword → quay lại hiển thị lịch sử
    if (!keyword) {
      const history = loadSearchHistory();
      renderSearchPanel(panel, history, { mode: "history" });
      return;
    }

    // Debounce 200ms rồi search
    debounceTimer = setTimeout(async () => {
      const boards = await fetchBoardsForSearch();
      const matches = boards.filter((b) => {
        const name = normalizeVi(b.name || "");
        const ws = normalizeVi(b.workspace?.name || "");
        return name.includes(keyword) || ws.includes(keyword);
      });
      renderSearchPanel(panel, matches, { mode: "search" });
    }, 200);
  });

  document.addEventListener("click", (e) => {
    const isInside = panel.contains(e.target) || input.contains(e.target);
    if (!isInside) panel.classList.remove("is-open");
  });
}

function renderSearchPanel(panel, boards, { mode }) {
  panel.innerHTML = "";

  if (!boards || boards.length === 0) {
    const text = mode === "history" ? "No recent searches" : "No boards found";
    panel.innerHTML = `<div class="search-empty">${text}</div>`;
    panel.classList.add("is-open");
    return;
  }

  const header = document.createElement("div");
  header.className = "search-results-header";
  const title = document.createElement("span");
  title.textContent = mode === "history" ? "RECENT SEARCHES" : "RESULTS";
  header.appendChild(title);

  if (mode === "history") {
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "search-clear-btn";
    clearBtn.textContent = "Clear";
    clearBtn.addEventListener("click", () => {
      clearSearchHistory();
      panel.innerHTML = `<div class="search-empty">No recent searches</div>`;
    });
    header.appendChild(clearBtn);
  }

  panel.appendChild(header);

  boards.forEach((board) => {
    const bg = board.background;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "search-result-item";

    const thumb = document.createElement("div");
    thumb.className = "search-result-thumb";
    if (
      bg &&
      (
        bg.endsWith(".png") ||
        bg.endsWith(".jpg") ||
        bg.endsWith(".jpeg") ||
        bg.includes("/images/") ||
        bg.startsWith("./images/") ||
        bg.startsWith("/uploads/") ||
        bg.startsWith("/backgrounds/")
      )
    ) {
      thumb.style.backgroundImage = `url("${bg}")`;
      thumb.style.backgroundSize = "cover";
      thumb.style.backgroundPosition = "center";
      thumb.style.backgroundRepeat = "no-repeat";
    }
    // 🔥 MÀU (class gradient,…)
    else if (bg) {
      thumb.classList.add(bg);
    }
    // fallback
    else {
      thumb.classList.add("gradient-1");
    }

    const body = document.createElement("div");
    body.className = "search-result-body";

    const nameEl = document.createElement("div");
    nameEl.className = "search-result-name";
    nameEl.textContent = board.name;

    const wsEl = document.createElement("div");
    wsEl.className = "search-result-workspace";
    wsEl.textContent = board.workspace?.name || "Workspace";

    body.appendChild(nameEl);
    body.appendChild(wsEl);

    item.appendChild(thumb);
    item.appendChild(body);

    item.addEventListener("click", () => {
      saveSearchHistory(board);
      window.location.href = `./BoardDetail.html?id=${board._id}`;
    });

    panel.appendChild(item);
  });

  panel.classList.add("is-open");
}

// ================= INIT =================
function initUserMenu() {
  const avatarBtn = document.getElementById("avatarBtn");
  const dropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("logoutBtn");
  const userMenu = document.getElementById("userMenu");

  if (!avatarBtn || !dropdown || !logoutBtn || !userMenu) return;

  avatarBtn.addEventListener("click", () => {
    const open = dropdown.classList.toggle("is-open");
    avatarBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#userMenu")) {
      dropdown.classList.remove("is-open");
      avatarBtn.setAttribute("aria-expanded", "false");
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE}/v1/User/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearClientStateOnLogout(); // ✅ CHỈ THÊM DÒNG NÀY
      window.location.href = "/login.html";
    }
  });

}
function clearClientStateOnLogout() {
  // Xóa history search (nguyên nhân chính gây dính board cũ)
  localStorage.removeItem(SEARCH_HISTORY_KEY);

  // Reset cache search trong memory
  cachedSearchBoards = null;

  // Reset workspace state
  currentWorkspaceId = null;
  currentVisibility = null;

  // Xóa session storage nếu có
  sessionStorage.clear();
}

export function initSidebarHeader() {
  if (document.body.dataset.sidebarHeaderInit === "1") return;

  loadSidebarWorkspace();
  initWorkspaceToggle();
  initActiveMenu();
  initGlobalSearch();
  initUserMenu();

  document.body.dataset.sidebarHeaderInit = "1";
}

// tạo mới workspace
const addBtn = document.getElementById("addWorkspaceBtn");
const modal = document.getElementById("workspaceModal");
const closeBtn = modal.querySelector(".close");
const form = document.getElementById("workspaceForm");
const input = document.getElementById("workspaceName");

// Mở modal khi bấm "+"
addBtn.addEventListener("click", () => {
  modal.style.display = "flex";
  input.value = "";
  input.focus();
});

// Đóng modal khi bấm dấu ×
closeBtn.addEventListener("click", () => modal.style.display = "none");

// Đóng modal khi click ra ngoài
window.addEventListener("click", e => {
  if (e.target === modal) modal.style.display = "none";
});

// Xử lý submit form
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return alert("Vui lòng nhập tên workspace");

    try {
      const res = await fetch(`${API_BASE}/v1/workspace/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // gửi cookie token nếu có
        body: JSON.stringify({ name })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi tạo workspace");

      alert(data.message);
      modal.style.display = "none";

      // reload danh sách workspace
      loadSidebarWorkspace();

    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
  });
