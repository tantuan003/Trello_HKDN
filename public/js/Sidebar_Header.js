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

  // Uỷ quyền sự kiện để hoạt động cả khi HTML được inject sau
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

/**
 * Gọi hàm này SAU KHI đã inject 'components/sidebar_header.html'
 * để gắn toàn bộ behavior cho component.
 */
export function initSidebarHeader() {
  // Chống init nhiều lần
  if (document.body.dataset.sidebarHeaderInit === "1") return;
  initWorkspaceToggle();
  initTemplatesMenuToggle();
  document.body.dataset.sidebarHeaderInit = "1";
}
