async function loadMyBoards() {
    try {
        const res = await fetch("http://localhost:8127/v1/board/myboards", {
            method: "GET",
            credentials: "include"
        });
        const boards = await res.json();

        const container = document.getElementById("boardContainer");
        container.innerHTML = "";
        if (!Array.isArray(boards)) {
            console.error("Boards không phải mảng:", boards);
            return;
        }

        boards.forEach(board => {
            const a = document.createElement("a");
            a.classList.add("board-card");
            a.href = `/board/${board._id}`;

            const cover = document.createElement("div");
            if (board.type === "template") {
                cover.classList.add("board-cover", "img-cover");
                const badge = document.createElement("span");
                badge.classList.add("badge", "badge-dark");
                badge.textContent = "TEMPLATE";
                cover.appendChild(badge);
            } else {
                cover.classList.add("board-cover", board.cover || "gradient-1");
            }

            const footer = document.createElement("div");
            footer.classList.add("board-footer");
            const title = document.createElement("span");
            title.classList.add("board-title");
            title.textContent = board.name;
            footer.appendChild(title);

            a.appendChild(cover);
            a.appendChild(footer);

            container.appendChild(a);
        });
    } catch (err) {
        console.error("Lỗi load boards:", err);
    }
}
  // Chèn file components/sidebar_header.html vào #app-shell
  async function inject(file, targetSelector) {
    try {
      const res = await fetch(file, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
      const html = await res.text();
      document.querySelector(targetSelector).innerHTML = html;
    } catch (err) {
      console.error('Load component failed:', file, err);
    }
  }

  // Đánh dấu menu "Boards" sáng trong sidebar
  function activateBoardsMenu() {
    const links = document.querySelectorAll('.nav .nav-item');
    links.forEach(a => a.classList.remove('is-active'));
    const boardsLink = [...links].find(a => /boards/i.test(a.textContent.trim()));
    if (boardsLink) boardsLink.classList.add('is-active');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // boards.html ở /public → component ở ./components/...
    await inject('./components/sidebar_header.html', '#app-shell');
    activateBoardsMenu();
  });

  //mở – đóng – tạo board
  document.addEventListener("DOMContentLoaded", () => {
  const createCardBtn = document.querySelector(".create-card");
  const modal = document.getElementById("createBoardModal");
  const cancelBtn = document.getElementById("cancelCreateBoard");
  const createBtn = document.getElementById("createBoardBtn");
  const titleInput = document.getElementById("boardTitleInput");
  const colorOptions = document.querySelectorAll(".color-swatch");
  let selectedColor = "gradient-1";

  // Hiển thị modal
  createCardBtn.addEventListener("click", () => {
    modal.style.display = "flex";
    titleInput.focus();
  });

  // Chọn màu
  colorOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      colorOptions.forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      selectedColor = opt.dataset.color;
    });
  });

  // Đóng modal
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    titleInput.value = "";
  });

  // Tạo board (demo hiển thị trực tiếp)
  createBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    if (!title) {
      alert("Vui lòng nhập tên board");
      return;
    }

    // 👇 Gửi API tạo board
    try {
      const res = await fetch("http://localhost:8127/v1/board/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, background: selectedColor }),
      });

      const data = await res.json();
      if (res.ok) {
        // Thêm board vào giao diện
        const boardContainer = document.getElementById("boardContainer");
        const newBoard = document.createElement("a");
        newBoard.className = "board-card";
        newBoard.innerHTML = `
          <div class="board-cover ${selectedColor}"></div>
          <div class="board-footer"><span class="board-title">${title}</span></div>`;
        boardContainer.appendChild(newBoard);

        modal.style.display = "none";
        titleInput.value = "";
      } else {
        alert("Lỗi tạo board: " + data.message);
      }
    } catch (err) {
      console.error("Create board error:", err);
    }
  });
});

window.addEventListener("DOMContentLoaded", loadMyBoards);