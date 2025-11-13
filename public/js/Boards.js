import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

const socket = io("http://localhost:8127", { withCredentials: true });

const boardCards = document.querySelectorAll(".board-card"); // NodeList
const cardGrid = document.querySelector(".card-grid"); // chỉ 1 grid
const boardView = document.getElementById("boardView");
const boardTitle = document.getElementById("boardTitle");
const listsContainer = document.getElementById("listsContainer");
let currentBoardId = null;
let uploadedBg = "";
let selectedColor = "";


async function loadMyBoards() {
  try {
    const res = await fetch("http://localhost:8127/v1/board/myboards", {
      method: "GET",
      credentials: "include"
    });
    const boards = await res.json();

    const container = document.getElementById("boardContainer");

    if (!Array.isArray(boards)) {
      console.error("Boards không phải mảng:", boards);
      return;
    }
    container.innerHTML = "";

    // Render các board card
    boards.forEach(board => {
      const div = document.createElement("div");
      div.classList.add("board-card");
      div.dataset.id = board._id;

      // ✅ Khai báo cover trước khi dùng
      const cover = document.createElement("div");
      cover.classList.add("board-cover");

      if (board.background.startsWith("/uploads/") || board.background.startsWith("/backgrounds/")) {
        cover.style.backgroundImage = `url(${board.background})`;
        cover.style.backgroundSize = "cover";
        cover.style.backgroundPosition = "center";
        cover.style.backgroundRepeat = "no-repeat";
      } else {
        cover.classList.add(board.background || "gradient-1");
        cover.style.backgroundImage = ""; // reset nếu trước đó có ảnh
      }

      // footer
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
        socket.emit("joinBoard", currentBoardId);

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
        contentBoards.classList.add("fullwidth");

        // Reset trước khi gán

        if (board.background.startsWith("/uploads/") || board.background.startsWith("/backgrounds/")) {
          // background là ảnh
          contentBoards.style.backgroundImage = `url(${board.background})`;
          contentBoards.style.backgroundSize = "cover";
          contentBoards.style.backgroundPosition = "center";
        } else {
          // background là gradient/màu
          contentBoards.classList.add(board.background || "gradient-1");
        }

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
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    const html = await res.text();
    document.querySelector(targetSelector).innerHTML = html;

    if (file.includes("sidebar_header")) {
      const mod = await import("./Sidebar_Header.js");
      mod.initSidebarHeader();
    }
  } catch (err) {
    console.error("Load component failed:", file, err);
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
    if (!name || !workspaceId)
      return Toastify({
        text: "⚠️ Vui lòng nhập đầy đủ!",
        duration: 2000,            // 3 giây
        gravity: "top",            // top hoặc bottom
        position: "right",         // left, center, right
        backgroundColor: "#FF9800", // màu cam cảnh báo
        close: true,               // có nút (x) để tắt
        stopOnFocus: true          // dừng khi rê chuột vào
      }).showToast();
    try {
      const res = await fetch("http://localhost:8127/v1/board/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          workspaceId,
          visibility,
          background: uploadedBg || selectedColor
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Toastify({
          text: "✅ Tạo board thành công!",
          duration: 2000,
          gravity: "top",
          position: "right",
          close: true,
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)"
        }).showToast();
        modal.style.display = "none";
        titleInput.value = "";
        loadMyBoards();
      } else {
        Toastify({
          text: `❌ ${result.message || "Tạo board thất bại!"}`,
          duration: 2000,
          gravity: "top",
          position: "right",
          backgroundColor: "#F44336",
          close: true
        }).showToast();
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
    const lists = data.board?.lists || [];
    console.log("📦 Board data:", data);
    // Xóa list cũ
    listsContainer.innerHTML = "";

    // Render list và card
    lists.forEach(list => {
      const listEl = createListElement(list);
      listsContainer.appendChild(listEl);
    });

  } catch (err) {
    console.error("Error loading board:", err);
  }
}

//hàm thêm list html
function createListElement(list) {
  const listEl = document.createElement("div");
  listEl.className = "list";
  listEl.dataset.id = list._id.toString();

  // Tên list
  const h3 = document.createElement("h3");
  h3.textContent = list.name;
  listEl.appendChild(h3);

  // Container chứa card
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";

  // Render các card cũ nếu có
  (Array.isArray(list.cards) ? list.cards : []).forEach(card => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.textContent = card.name;
    cardsContainer.appendChild(cardEl);
  });

  listEl.appendChild(cardsContainer);

  // Nút Add Card
  attachAddCard(listEl, list._id);

  return listEl;
}

//hàm thêm nút card vào list tương ứng 
function attachAddCard(listEl, listId) {
  const cardsContainer = listEl.querySelector(".cards-container");

  // Nút "Add a card"
  const addCardBtn = document.createElement("button");
  addCardBtn.className = "add-card-btn";
  addCardBtn.textContent = "+ Add a card";

  // Container input (ẩn ban đầu)
  const inputContainer = document.createElement("div");
  inputContainer.className = "add-card-input-container hidden";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter a card title...";
  input.className = "add-card-input";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Add";
  saveBtn.className = "save-card-btn";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "cancel-card-btn";

  inputContainer.appendChild(input);
  inputContainer.appendChild(saveBtn);
  inputContainer.appendChild(cancelBtn);

  // Gắn các phần tử vào list
  listEl.appendChild(inputContainer);
  listEl.appendChild(addCardBtn);

  // --- Sự kiện ---
  addCardBtn.addEventListener("click", () => {
    addCardBtn.classList.add("hidden");
    setTimeout(() => inputContainer.classList.add("show"), 10);  // bật transition
    inputContainer.classList.remove("hidden");
    input.focus();
  });

  cancelBtn.addEventListener("click", () => {
    inputContainer.classList.remove("show");  // đóng form mượt
    setTimeout(() => {
      inputContainer.classList.add("hidden");
    }, 300); // thời gian khớp transition
    addCardBtn.classList.remove("hidden");
    input.value = "";
  });

  saveBtn.addEventListener("click", async () => {
    const cardName = input.value.trim();
    if (!cardName) return Toastify({
      text: "⚠️ Vui lòng nhập tên thẻ!",
      duration: 2000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF9800",
      close: true
    }).showToast();
    saveBtn.disabled = true;

    try {
      const res = await fetch(`http://localhost:8127/v1/board/create-card/${listId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: cardName, description: "" }),
      });

      if (!res.ok) throw new Error("Không thể thêm thẻ");
      inputContainer.classList.remove("show");
      setTimeout(() => inputContainer.classList.add("hidden"), 10);

      // Reset UI
      input.value = "";
      inputContainer.classList.add("hidden");
      addCardBtn.classList.remove("hidden");

    } catch (err) {
      console.error("Error adding card:", err);
      alert("Lỗi khi thêm card!");
    } finally {
      saveBtn.disabled = false;
    }
  });
}


//socket cho việc add card
// Lắng nghe card mới realtime
socket.on("newCard", (card) => {
  const listId = card.list._id ? card.list._id : card.list; // nếu populate
  const listEl = document.querySelector(`.list[data-id="${listId}"] .cards-container`);
  if (!listEl) return;
  const cardEl = document.createElement("div");
  cardEl.className = "card";
  cardEl.textContent = card.name;
  listEl.appendChild(cardEl);
});

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
    newListTitle.value = "";
  } catch (err) {
    console.error("Error adding list:", err);
    alert("Failed to add list");
  }
});
socket.on("newList", (list) => {
  addListToBoard(list);
});


// Mời user
const inviteForm = document.getElementById("inviteForm");

inviteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const boardId = currentBoardId;
  const email = inviteForm.querySelector("input").value.trim();

  // Kiểm tra rỗng
  if (!email) {
    Toastify({
      text: "⚠️ Vui lòng nhập email!",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF9800",
      close: true,
      stopOnFocus: true
    }).showToast();
    return;
  }

  try {
    const res = await fetch(`http://localhost:8127/v1/board/${boardId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok) {
      Toastify({
        text: "✅ Mời thành công!",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
        close: true,
        stopOnFocus: true
      }).showToast();

      inviteForm.reset(); // Xóa giá trị input sau khi gửi
    } else {
      Toastify({
        text: `❌ ${data.message || "Mời thất bại!"}`,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#F44336", // đỏ báo lỗi
        close: true,
        stopOnFocus: true
      }).showToast();
    }
  } catch (err) {
    console.error(err);
    Toastify({
      text: "🚫 Lỗi server, vui lòng thử lại sau!",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#9C27B0", // tím báo lỗi hệ thống
      close: true,
      stopOnFocus: true
    }).showToast();
  }
});

//bật tắt invite
document.addEventListener("DOMContentLoaded", () => {
  const inviteIcon = document.getElementById("invite-icon");
  const inviteFormContainer = document.getElementById("inviteFormContainer");

  inviteIcon.addEventListener("click", (e) => {
    e.stopPropagation(); // tránh click ra ngoài tự ẩn form ngay
    inviteFormContainer.classList.toggle("hidden");
    inviteIcon.style.display = "none";
  });

  // Click ra ngoài sẽ ẩn form
  document.addEventListener("click", (e) => {
    if (!inviteFormContainer.contains(e.target) && e.target !== inviteIcon) {
      inviteIcon.style.display = "flex";
      inviteFormContainer.classList.add("hidden");
    }
  });
});

function addListToBoard(list) {
  // list là object list từ server
  const listsContainer = document.getElementById("listsContainer");

  const listEl = document.createElement("div");
  listEl.className = "list";

  const h3 = document.createElement("h3");
  h3.textContent = list.name;
  listEl.appendChild(h3);

  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";

  listEl.appendChild(cardsContainer);
  attachAddCard(listEl, list._id);
  listsContainer.appendChild(listEl);
}


// Lắng nghe list mới realtime
socket.off("newList");
socket.on("newList", (list) => {
  console.log("📩 Received new list:", list);

  const listEl = createListElement(list); // dùng lại function
  listsContainer.appendChild(listEl);
});


// tải background từ máy
const bgUpload = document.getElementById("bgUpload");

bgUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("background", file);

  const res = await fetch("http://localhost:8127/v1/upload/bg", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  uploadedBg = data.imageUrl; // đường dẫn ảnh trên server
  console.log("đường dẫn ảnh là ", data.imageUrl);
  selectedColor = "";
});

window.addEventListener("DOMContentLoaded", loadMyBoards);
