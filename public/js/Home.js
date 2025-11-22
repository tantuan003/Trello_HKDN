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

// TODO: thay URL API cho đúng backend của bạn
async function loadRecentlyViewedBoards() {
  const container = document.getElementById("recentBoards");
  if (!container) return;

  try {
    const res = await fetch("http://localhost:8127/v1/board/recent", {
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

      // === ẢNH ===
      if (
        board.background?.startsWith("/uploads/") ||
        board.background?.startsWith("/backgrounds/")
      ) {
        thumb.style.backgroundImage = `url(${board.background})`;
        thumb.className = "recent-board-card__thumb"; // reset class
      }
      // === MÀU ===
      else if (board.background) {
        thumb.style.backgroundImage = ""; // xoá ảnh nếu còn
        thumb.classList.add(board.background);
      }
      // === fallback ===
      else {
        thumb.style.backgroundImage = "";
        thumb.classList.add("gradient-1");
      }

      card.addEventListener("click", () => {
        window.location.href = `/boardDetail.html?id=${board._id}`;
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
