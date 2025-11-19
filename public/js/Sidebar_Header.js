// js/sidebar_header.js
const WSP_KEY = "wspMenuCollapsed";

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

/* ---------------------------------------------------
   Gọi sau khi inject HTML
   --------------------------------------------------- */
export function initSidebarHeader() {
  if (document.body.dataset.sidebarHeaderInit === "1") return;

  initWorkspaceToggle();
  initTemplatesMenuToggle();
  initActiveMenu();     // 👈 thêm dòng này

  document.body.dataset.sidebarHeaderInit = "1";
}
