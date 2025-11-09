const boardCards = document.querySelectorAll(".board-card"); // NodeList
const cardGrid = document.querySelector(".card-grid"); // chỉ 1 grid
const boardView = document.getElementById("boardView");
const boardTitle = document.getElementById("boardTitle");
const listsContainer = document.getElementById("listsContainer");
let currentBoardId = null; 
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

    // Render các board card
    boards.forEach(board => {
      const div = document.createElement("div");
      div.classList.add("board-card");
      div.dataset.id = board._id;

      const cover = document.createElement("div");
      if (board.type === "template") {
        cover.classList.add("board-cover", "img-cover");
        const badge = document.createElement("span");
        badge.classList.add("badge", "badge-dark");
        badge.textContent = "TEMPLATE";
        cover.appendChild(badge);
      } else {
        cover.classList.add("board-cover", board.background || "gradient-1");
      }

      const footer = document.createElement("div");
      footer.classList.add("board-footer");
      const title = document.createElement("span");
      title.classList.add("board-title");
      title.textContent = board.name;
      footer.appendChild(title);

      div.appendChild(cover);
      div.appendChild(footer);
      container.appendChild(div);
    });

    // Gắn sự kiện click cho từng board
    const boardCards = document.querySelectorAll(".board-card");
    boardCards.forEach(card => {
      card.addEventListener("click", async (e) => {
        e.preventDefault();
        const boardId = card.dataset.id;
        if (!boardId) return;

        currentBoardId = boardId;

        // Render board với lists và add card
        await renderBoardWithLists(currentBoardId);

        // Lấy dữ liệu board để set các thông tin khác
        const res = await fetch(`http://localhost:8127/v1/board/${boardId}`);
        const data = await res.json();
        const board = data.board;

        // Ẩn các section khác
        document.querySelector(".card-grid").style.display = "none";
        document.querySelector(".workspace-info").style.display = "none";
        document.querySelector(".section-head").style.display = "none";
        const sidebar = document.querySelector(".sidebar");
        if (sidebar) sidebar.style.display = "none";

        // Hiển thị board view
        const boardView = document.getElementById("boardView");
        boardView.style.display = "block";

        // Thêm class background
        const contentBoards = document.querySelector(".content-boards");
        contentBoards.classList.add("fullwidth", board.background);

        // Set tiêu đề board
        document.getElementById("boardTitle").textContent = board.name;
      });
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
    const workspaceSelect = document.getElementById("workspaceSelect");
    const visibility = document.getElementById("visibilitySelect").value;
    let selectedColor = "gradient-1";

    // ====== LOAD WORKSPACES ======
    async function loadWorkspaces() {
        try {
            const res = await fetch("http://localhost:8127/v1/workspace", {
                credentials: "include" // để gửi cookie
            }); // endpoint lấy workspace
            const data = await res.json();

            if (res.ok && Array.isArray(data)) {
                workspaceSelect.innerHTML = "";
                data.forEach(ws => {
                    const opt = document.createElement("option");
                    opt.value = ws._id;
                    opt.textContent = ws.name;
                    workspaceSelect.appendChild(opt);
                });
            } else {
                workspaceSelect.innerHTML = `<option value="">No workspace found</option>`;
            }

        } catch (err) {
            console.error("Lỗi khi tải workspace:", err);
        }
    }

    // Hiển thị popup
    createCardBtn.addEventListener("click", async () => {
        modal.style.display = "flex";
        await loadWorkspaces(); // load workspace mỗi khi mở popup
        titleInput.focus();
    });

    // Chọn màu
    colorOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            colorOptions.forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
            selectedColor = opt.dataset.color;
            console.log("Màu đã chọn:", selectedColor); // kiểm tra
        });
    });

    // Đóng modal
    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
        titleInput.value = "";
    });

    // ====== CREATE BOARD ======
    createBtn.addEventListener("click", async () => {
        const name = titleInput.value.trim();
        const workspaceId = workspaceSelect.value;
        const visibility = document.getElementById("visibilitySelect").value;
        if (!name) return alert("Vui lòng nhập tên board");
        if (!workspaceId) return alert("Vui lòng chọn workspace");

        try {
            const res = await fetch("http://localhost:8127/v1/board/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    workspaceId,
                    visibility,
                    background: selectedColor
                }),
            });

            const data = await res.json();
            if (res.ok) {
                alert("Tạo board thành công!");
                modal.style.display = "none";
                titleInput.value = "";
                loadMyBoards();
            } else {
                alert("Lỗi tạo board: " + data.message);
            }
        } catch (err) {
            console.error("Create board error:", err);
        }
    });
});

// hiển thị list

const showAddListBtn = document.getElementById("showAddListBtn");
const addListForm = document.getElementById("addListForm");
const cancelAddListBtn = document.getElementById("cancelAddListBtn");
const addListBtn = document.getElementById("addListBtn");
const newListTitle = document.getElementById("newListTitle");

showAddListBtn.addEventListener("click", () => {
  showAddListBtn.style.display = "none";
  addListForm.style.display = "flex";
});

cancelAddListBtn.addEventListener("click", () => {
  addListForm.style.display = "none";
  showAddListBtn.style.display = "inline-block";
  newListTitle.value = "";
});
// ========================
// Hàm render các list
// ========================
async function renderBoardWithLists(boardId) {
  const listsContainer = document.getElementById("listsContainer");
  
  try {
    // Lấy dữ liệu board
    const res = await fetch(`http://localhost:8127/v1/board/${boardId}`);
    const data = await res.json();

    // Lấy mảng lists
    const lists = data.board?.lists || [];

    // Xóa list cũ
    listsContainer.innerHTML = "";

    // Render list và card
    lists.forEach(list => {
      const listEl = document.createElement("div");
      listEl.className = "list";

      const h3 = document.createElement("h3");
      h3.textContent = list.name;
      listEl.appendChild(h3);

      const cardsContainer = document.createElement("div");
      cardsContainer.className = "cards-container";

      (Array.isArray(list.cards) ? list.cards : []).forEach(card => {
        const cardEl = document.createElement("div");
        cardEl.className = "card";
        cardEl.textContent = card.name;
        cardsContainer.appendChild(cardEl);
      });

      // Nút Add Card
      const addCardBtn = document.createElement("button");
      addCardBtn.className = "add-card-btn";
      addCardBtn.textContent = "+ Add a card";
      addCardBtn.addEventListener("click", async () => {
        const cardName = prompt("Enter card title");
        if (!cardName) return;

        const cardEl = document.createElement("div");
        cardEl.className = "card";
        cardEl.textContent = cardName;
        cardsContainer.appendChild(cardEl);

        // Gọi API tạo card backend nếu muốn lưu
        try {
          await fetch(`http://localhost:8127/v1/board/create-card/${list._id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: cardName ,description:""})
          });
        } catch (err) {
          console.error("Error adding card:", err);
        }
      });

      listEl.appendChild(cardsContainer);
      listEl.appendChild(addCardBtn);

      listsContainer.appendChild(listEl);
    });

  } catch (err) {
    console.error("Error loading board:", err);
  }
}

addListBtn.addEventListener("click", async () => {
  const title = newListTitle.value.trim();
  if (!title) return alert("Please enter list title");
  if (!currentBoardId) return alert("Board not selected");

  try {
    const res = await fetch(`http://localhost:8127/v1/board/create-list/${currentBoardId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: title })
    });

    const newList = await res.json();

    // Sau khi thêm list, gọi lại renderBoardLists để fetch tất cả list mới nhất
    await renderBoardWithLists(currentBoardId);

    newListTitle.value = "";
  } catch (err) {
    console.error("Error adding list:", err);
    alert("Failed to add list");
  }
});

window.addEventListener("DOMContentLoaded", loadMyBoards);