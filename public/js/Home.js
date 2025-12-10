import { API_BASE } from "../js/config.js";
// Inject component dùng lại cách như templates.html
async function inject(file, targetSelector) {
  try {
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    const html = await res.text();
    document.querySelector(targetSelector).innerHTML = html;

    // Khởi tạo logic sidebar + header
    if (file.includes("sidebar_header")) {
      const mod = await import("./Sidebar_Header.js");
      mod.initSidebarHeader();
    }
  } catch (err) {
    console.error("Load component failed:", file, err);
  }
}

// Đánh dấu menu Home active (giả sử trong sidebar_header.html có id="homeMenu")
function activateHomeMenu() {
  const head = document.getElementById("homeMenu");
  if (head) {
    head.classList.add("is-active", "active");
    const section = head.closest(".nav-section");
    section?.classList.add("open");
  }
}

// ===== Load Recently viewed boards trên trang Home =====
async function loadRecentlyViewedBoards() {
  const container = document.getElementById("recentBoards");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/v1/board/recent`, {
      credentials: "include",
    });

    const result = await res.json();

    if (!result.success || !Array.isArray(result.data)) {
      container.innerHTML =
        "<p class='no-recent'>No recently viewed boards yet.</p>";
      return;
    }

    const boards = result.data;

    if (boards.length === 0) {
      container.innerHTML =
        "<p class='no-recent'>No recently viewed boards yet.</p>";
      return;
    }

    container.innerHTML = "";

    boards.forEach((board) => {
      const card = document.createElement("article");
      card.className = "recent-board-card";

      const workspaceName = board.workspace?.name || "Untitled workspace";

      card.innerHTML = `
        <div class="recent-board-card__thumb"></div>
        <div class="recent-board-card__body">
          <div class="recent-board-card__name">${board.name}</div>
          <div class="recent-board-card__workspace">${workspaceName}</div>
        </div>
      `;

      const thumb = card.querySelector(".recent-board-card__thumb");
      const bg = board.background;

      // reset class & style
      thumb.className = "recent-board-card__thumb";
      thumb.style.backgroundImage = "";

      // === ẢNH (URL) ===
      if (
        bg &&
        (
          bg.endsWith(".png") ||
          bg.endsWith(".jpg") ||
          bg.endsWith(".jpeg") ||
          bg.includes("/images/") ||
          bg.startsWith("/uploads/") ||
          bg.startsWith("/backgrounds/")
        )
      ) {
        thumb.style.backgroundImage = `url("${bg}")`;
        thumb.style.backgroundSize = "cover";
        thumb.style.backgroundPosition = "center";
        thumb.style.backgroundRepeat = "no-repeat";
      }
      // === MÀU (class) ===
      else if (bg) {
        thumb.classList.add(bg);
      }
      // === fallback default ===
      else {
        thumb.classList.add("gradient-1");
      }

      // Đi đến chi tiết board
      card.addEventListener("click", () => {
        // dùng đúng path như các trang khác
        window.location.href = `./BoardDetail.html?id=${board._id}`;
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error("Load recently viewed boards failed:", err);
    container.innerHTML =
      "<p class='no-recent'>Lỗi khi tải danh sách board gần đây.</p>";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await inject("./components/sidebar_header.html", "#app-shell");
  activateHomeMenu();
  loadRecentlyViewedBoards();
});
