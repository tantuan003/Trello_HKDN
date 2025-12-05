// js/sidebar_header.js
const WSP_KEY = "wspMenuCollapsed";
const SEARCH_HISTORY_KEY = "recentBoardSearches";
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
  // cho board mới nhất lên đầu, tối đa 8
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
function initWorkspaceToggle() {
  const wsp = document.getElementById("wsp");
  const btn = document.getElementById("wspToggle");
  if (!wsp || !btn) return;

  // Khởi tạo theo trạng thái đã lưu
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

function initTemplatesMenuToggle() {
  const nav = document.getElementById("sideNav");
  if (!nav) return;

  // Uỷ quyền sự kiện
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

/* ---------------------------------------------------
   AUTO ACTIVE MENU DỰA THEO URL
   --------------------------------------------------- */
function initActiveMenu() {
  const path = window.location.pathname;
  const page = path.split("/").pop(); // vd: boards.html

  // Boards
  if (page === "boards.html") {
    document.getElementById("boardsMenu")?.classList.add("is-active");
  }

  // Templates + mở submenu
  if (page === "templates.html") {
    const head = document.getElementById("templateMenu");
    if (head) {
      head.classList.add("is-active", "active");
      const section = head.closest(".nav-section");
      section?.classList.add("open");
    }
  }

  // Home
  if (page === "home.html") {
    document.getElementById("homeMenu")?.classList.add("is-active");
  }
}
// ===== Global search by board title =====
let cachedSearchBoards = null;

// Load danh sách board 1 lần, dùng lại cho search
async function fetchBoardsForSearch() {
  if (cachedSearchBoards) return cachedSearchBoards;

  try {
    const res = await fetch("http://localhost:8127/v1/board/myboards", {
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

  // Focus: nếu input trống → show RECENT SEARCHES
  input.addEventListener("focus", () => {
    if (input.value.trim() !== "") return;
    const history = loadSearchHistory();
    renderSearchPanel(panel, history, { mode: "history" });
  });

  // Gõ: search theo tên board + workspace (có hỗ trợ không dấu)
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
        return name.includes(keyword);
      });

      renderSearchPanel(panel, matches, { mode: "search" });
    }, 200);
  });

  // Click ra ngoài thì đóng panel
  document.addEventListener("click", (e) => {
    const isInside =
      panel.contains(e.target) || input.contains(e.target);
    if (!isInside) {
      panel.classList.remove("is-open");
    }
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

  // Header: RECENT BOARDS + nút Clear khi mode là history
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
    const item = document.createElement("button");
    item.type = "button";
    item.className = "search-result-item";

    const thumb = document.createElement("div");
    thumb.className = "search-result-thumb";

    if (
      board.background?.startsWith("/uploads/") ||
      board.background?.startsWith("/backgrounds/")
    ) {
      thumb.style.backgroundImage = `url(${board.background})`;
    } else if (board.background) {
      thumb.classList.add(board.background);
    } else {
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
      // lưu vào lịch sử khi user chọn
      saveSearchHistory(board);
      window.location.href = `./BoardDetail.html?id=${board._id}`;
    });

    panel.appendChild(item);
  });

  panel.classList.add("is-open");
}

/* ---------------------------------------------------
   Gọi sau khi inject HTML
   --------------------------------------------------- */
export function initSidebarHeader() {
  if (document.body.dataset.sidebarHeaderInit === "1") return;

  initWorkspaceToggle();
  initTemplatesMenuToggle();
  initActiveMenu();
  initGlobalSearch();

  document.body.dataset.sidebarHeaderInit = "1";
}
