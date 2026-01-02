
const WSP_KEY = "wspMenuCollapsed";
const SEARCH_HISTORY_KEY = "recentBoardSearches";
import { API_BASE } from "../js/config.js";
import { initProfile } from "../js/profile.js"

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
        <li><a href="board-wsp.html?ws=${workspace._id}"><i class="fa-solid fa-briefcase"></i>Boards</a></li>
        <li><a href="members.html?ws=${workspace._id}"><i class="fa-solid fa-user-group"></i>Members</a></li>
        <li><a href="settings-wsp.html?ws=${workspace._id}"><i class="fa-solid fa-gear"></i>Settings</a></li>
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
// ================= BRAND =================
function initBrandHome() {
  const brand = document.getElementById("brandHome");
  if (!brand) return;

  brand.style.cursor = "pointer";
  brand.addEventListener("click", () => {
    // về boards chính, không kèm ws
    window.location.href = "boards.html";
  });
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

    const result = await res.json();

    // ❌ res.ok nhưng data sai format
    if (!res.ok || !result.success || !Array.isArray(result.data)) {
      console.error("Không thể load boards cho search:", result);
      return [];
    }

    // ✅ LẤY ĐÚNG ARRAY
    cachedSearchBoards = result.data;
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

async function initGlobalSearch() {
  const input = document.querySelector(".searchbar input");
  const panel = document.getElementById("globalSearchResults");
  if (!input || !panel) return;

  let debounceTimer = null;
  let currentUserId = null;

  // Lấy user hiện tại
  try {
    const resUser = await fetch(`${API_BASE}/v1/User/me`, { credentials: "include" });
    if (resUser.ok) {
      const user = await resUser.json();
      currentUserId = user._id;
    }
  } catch (err) {
    console.error("Không lấy được user:", err);
  }

  input.addEventListener("focus", () => {
    if (input.value.trim() !== "") return;
    const history = loadSearchHistory();
    renderSearchPanel(panel, history, { mode: "history" });
  });

  input.addEventListener("input", () => {
    const keyword = normalizeVi(input.value);
    clearTimeout(debounceTimer);

    if (!keyword) {
      const history = loadSearchHistory();
      renderSearchPanel(panel, history, { mode: "history" });
      return;
    }

    debounceTimer = setTimeout(async () => {
      const boards = await fetchBoardsForSearch();
      const matches = boards.filter((b) => {
        const name = normalizeVi(b.name || "");
        const ws = normalizeVi(b.workspace?.name || "");
        const keywordMatch = name.includes(keyword) || ws.includes(keyword);

        const isVisible =
          b.visibility === "public" ||
          b.visibility === "workspace" ||
          (b.visibility === "private" && b.owner?._id === currentUserId);

        return keywordMatch && isVisible;
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
export function initUserMenu() {
  const avatarBtn = document.getElementById("avatarBtn");
  const dropdown = document.getElementById("userDropdown");
  const logoutBtn = document.getElementById("logoutBtn");
  const profileBtn = document.getElementById("profileBtn");
  const userMenu = document.getElementById("userMenu");

  const profileModal = document.getElementById("profileModal");
  const profileContainer = document.getElementById("profileContainer");
  const modalClose = profileContainer.querySelector(".profile-modal-close");

  if (!avatarBtn || !dropdown || !logoutBtn || !profileBtn || !userMenu || !profileModal) return;

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
      await fetch("/v1/User/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error(err);
    } finally {
      clearClientStateOnLogout();
      window.location.href = "/login.html";
    }
  });

  profileBtn.addEventListener("click", async () => {
    dropdown.classList.remove("is-open");
    avatarBtn.setAttribute("aria-expanded", "false");

    profileModal.style.display = "flex";

    try {
      const resHtml = await fetch("/profile.html");
      if (!resHtml.ok) throw new Error("Không load được profile.html");
      const html = await resHtml.text();
      profileContainer.innerHTML = `<button class="profile-modal-close">&times;</button>${html}`;

      if (!document.getElementById("profileCSS")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/css/profile.css";
        link.id = "profileCSS";
        document.head.appendChild(link);
      }
      if (!document.getElementById("faCSS")) {
        const link = document.createElement("link");
        link.id = "faCSS";
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";
        document.head.appendChild(link);
      }

      initProfile();

      const resUser = await fetch("/v1/User/me", { credentials: "include" });
      if (!resUser.ok) throw new Error("Không lấy được thông tin user");
      const user = await resUser.json();

      const usernameInput = profileContainer.querySelector("#username");
      const emailInput = profileContainer.querySelector("#email");
      if (usernameInput) usernameInput.value = user.username || "";
      if (emailInput) emailInput.value = user.email || "";

      const avatarWrapper = profileContainer.querySelector(".avatar-wrapper img");
      if (avatarWrapper) {
        avatarWrapper.src = user.avatar || "/images/default-avatar.png";
        avatarWrapper.style.display = "block"; 
      }

      profileContainer.querySelectorAll("#password, #retype-password").forEach(i => i.value = "");

      profileContainer.querySelectorAll("small").forEach(s => s.style.display = "none");

      profileContainer.dataset.loaded = "1";

    } catch (err) {
      profileContainer.innerHTML = `<button class="profile-modal-close">&times;</button>
      <div style="color:red">Lỗi load profile: ${err.message}</div>`;
    }
  });

  profileContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("profile-modal-close")) {
      profileModal.style.display = "none";
    }
  });

  window.addEventListener("click", (e) => {
    if (e.target === profileModal) profileModal.style.display = "none";
  });
}

function clearClientStateOnLogout() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);

  cachedSearchBoards = null;

  currentWorkspaceId = null;
  currentVisibility = null;

  sessionStorage.clear();
}

async function loadCurrentUserAvatar() {
  const avatarBtn = document.getElementById("avatarBtn");
  if (!avatarBtn) return;

  try {
    const res = await fetch(`${API_BASE}/v1/User/me`, {
      credentials: "include",
    });

    if (!res.ok) return;

    const user = await res.json();

    if (user?.avatar) {
      const isAbsolute = /^https?:\/\//i.test(user.avatar);
      const rel = user.avatar.startsWith("/") ? user.avatar : `/${user.avatar}`;
      const avatarUrl = isAbsolute ? user.avatar : `${API_BASE}${rel}`;

      avatarBtn.style.backgroundImage = `url("${avatarUrl}")`;
      avatarBtn.textContent = "";
      avatarBtn.title = user.username || "User";
      avatarBtn.setAttribute("aria-label", user.username || "User");
      return;
    }

    // Fallback: show first letter of username
    const letter = (user?.username || "U").charAt(0).toUpperCase();
    avatarBtn.style.backgroundImage = "";
    avatarBtn.textContent = letter;
  } catch (err) {
    console.error("Load current user avatar error:", err);
  }
}

export function initSidebarHeader() {
  if (document.body.dataset.sidebarHeaderInit === "1") return;
  initBrandHome();

  loadSidebarWorkspace();
  initWorkspaceToggle();
  initActiveMenu();
  initGlobalSearch();
  initUserMenu();
  loadCurrentUserAvatar();


  document.body.dataset.sidebarHeaderInit = "1";
}

const addBtn = document.getElementById("addWorkspaceBtn");
const modal = document.getElementById("createWorkspaceModal");
const closeBtn = modal.querySelector(".close");
const form = document.getElementById("workspaceForm");
const input = document.getElementById("workspaceName");

// Mở modal khi bấm "+"
addBtn.addEventListener("click", () => {
  modal.style.display = modal.style.display === "block" ? "none" : "block";
  input.value = "";
  input.focus();
});

// Đóng modal khi bấm dấu ×
closeBtn.addEventListener("click", () => modal.style.display = "none");

// Đóng modal khi click ra ngoài
window.addEventListener("click", e => {
  if (!modal.contains(e.target) && e.target !== addBtn) {
    modal.style.display = "none";
  }
});

// Submit form tạo workspace
form.addEventListener("submit", async e => {
  e.preventDefault();
  const name = input.value.trim();
  if (!name) return alert("Vui lòng nhập tên workspace");

  try {
    const res = await fetch(`${API_BASE}/v1/workspace/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
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

