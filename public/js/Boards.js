import { socket } from "../js/socket.js";
import { API_BASE } from "../js/config.js";

const boardCards = document.querySelectorAll(".board-card"); // NodeList
const cardGrid = document.querySelector(".card-grid"); // chỉ 1 grid
const boardView = document.getElementById("boardView");
const boardTitle = document.getElementById("boardTitle");
const listsContainer = document.getElementById("listsContainer");
let currentBoardId = null;
let uploadedBg = "";
let selectedColor = "";
let pendingDelete = { boardId: null, cardEl: null };

/* ===========================
   ✅ DELETE BOARD (ICON + MODAL + API)
=========================== */

function ensureDeleteModal() {
  if (document.getElementById("deleteBoardModal")) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "deleteBoardModal";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <div class="modal delete-modal">
      <h3>Delete board?</h3>
      <p class="delete-desc">Bạn chắc chắn muốn xoá board này? Hành động này không thể hoàn tác.</p>
      <div class="modal-actions">
        <button id="confirmDeleteBoard" class="btn-danger">Delete</button>
        <button id="cancelDeleteBoard" class="btn-outline">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // click ra ngoài overlay để đóng
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });
}

function openDeleteModal(boardId, cardEl) {
  ensureDeleteModal();
  pendingDelete = { boardId, cardEl };

  const overlay = document.getElementById("deleteBoardModal");
  overlay.style.display = "flex";

  const btnCancel = document.getElementById("cancelDeleteBoard");
  const btnConfirm = document.getElementById("confirmDeleteBoard");

  btnCancel.onclick = () => {
    overlay.style.display = "none";
    pendingDelete = { boardId: null, cardEl: null };
  };

  btnConfirm.onclick = async () => {
    btnConfirm.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/v1/board/delete/${pendingDelete.boardId}`, {
        method: "DELETE",
        credentials: "include",
      });

      // ✅ JSON safe parse (DELETE đôi khi không trả body)
      let data = null;
      try {
        data = await res.json();
      } catch { }

      if (!res.ok || (data && data.success === false)) {
        Toastify({
          text: `❌ ${(data && data.message) || "Xoá board thất bại!"}`,
          duration: 2000,
          gravity: "top",
          position: "right",
          backgroundColor: "#F44336",
          close: true,
        }).showToast();
        return;
      }

      // ✅ remove UI card
      if (pendingDelete.cardEl) pendingDelete.cardEl.remove();

      // ✅ báo cho global search reload lại list boards
      localStorage.setItem("boardsDirty", "1");

      // ✅ xoá khỏi recent search history nếu có
      try {
        const key = "recentBoardSearches";
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          const next = Array.isArray(arr)
            ? arr.filter((b) => b?._id !== pendingDelete.boardId)
            : [];
          localStorage.setItem(key, JSON.stringify(next));
        }
      } catch { }

      Toastify({
        text: "🗑️ Xoá board thành công!",
        duration: 2000,
        gravity: "top",
        position: "right",
        close: true,
        backgroundColor: "linear-gradient(to right, #ef4444, #f97316)",
      }).showToast();

      // ✅ reload list boards
      loadRecentlyViewedBoards();

      overlay.style.display = "none";
      pendingDelete = { boardId: null, cardEl: null };
    } catch (err) {
      console.error("Delete board error:", err);
      Toastify({
        text: "🚫 Lỗi server khi xoá board!",
        duration: 2000,
        gravity: "top",
        position: "right",
        backgroundColor: "#9C27B0",
        close: true,
      }).showToast();
    } finally {
      btnConfirm.disabled = false;
    }
  };
}

/* ===========================
   RECENTLY VIEWED
=========================== */

async function loadRecentlyViewedBoards() {
  const urlParams = new URLSearchParams(window.location.search);
  const workspaceId = urlParams.get("ws");
  const container = document.getElementById("boardContainer");

  if (!container) return;

  let apiUrl = "";
  if (workspaceId) {
    apiUrl = `${API_BASE}/v1/board/workspace/${workspaceId}`;
  } else {
    apiUrl = `${API_BASE}/v1/board/recent`;
  }

  try {
    const res = await fetch(apiUrl, {
      credentials: "include",
    });

    const result = await res.json();

    container.innerHTML = "";
    container.classList.remove("empty");

    const boards = result.data || result.boards || [];

    if (!res.ok || !result.success) {
      return showEmptyRecentlyViewed(container);
    }

    if (boards.length === 0) {
      return showEmptyRecentlyViewed(container);
    }

    boards.forEach((board) => {
      const card = createBoardCard(board);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Lỗi load recently viewed:", err);
    showEmptyRecentlyViewed(container);
  }
}

function showEmptyRecentlyViewed(container) {
  container.classList.add("empty");
  container.innerHTML = `<p class="no-recent">No recently viewed boards yet.</p>`;
}

/* ===========================
   ✅ Tạo card board (SỬA ĐÚNG CHỖ: delete button + hover)
=========================== */
function createBoardCard(board) {
  const card = document.createElement("a");
  card.className = "board-card";
  card.href = `./BoardDetail.html?id=${board._id}`;
  card.dataset.boardId = board._id;

  // Cover
  const cover = document.createElement("div");
  cover.className = "board-cover";

  const bg = board.background;

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
    cover.style.backgroundImage = `url("${bg}")`;
    cover.style.backgroundSize = "cover";
    cover.style.backgroundPosition = "center";
    cover.style.backgroundRepeat = "no-repeat";
  } else if (bg) {
    cover.classList.add(bg);
  } else {
    cover.classList.add("gradient-1");
  }

  // Footer
  const footer = document.createElement("div");
  footer.className = "board-footer";

  const title = document.createElement("span");
  title.className = "board-title";
  title.textContent = board.name;

  footer.appendChild(title);

  // ✅ Delete button: absolute bottom-right, hover show
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "board-delete-btn";
  delBtn.setAttribute("aria-label", "Delete board");

  const delIcon = document.createElement("img");
  delIcon.src = "/uploads/icons8-delete-128.png"; // ✅ fix path
  delIcon.alt = "Delete";
  delBtn.appendChild(delIcon);

  delBtn.addEventListener("click", (e) => {
    e.preventDefault();   // chặn <a> navigate
    e.stopPropagation();  // chặn bubble
    openDeleteModal(board._id, card); // ✅ dùng modal+API chuẩn bên trên
  });

  card.appendChild(cover);
  card.appendChild(footer);
  card.appendChild(delBtn); // ✅ append vào card để absolute đúng góc

  return card;
}

/* ===========================
   ✅ Realtime: board deleted
   (Đặt cùng level với các socket.on khác, KHÔNG đặt trong DOMContentLoaded)
=========================== */
socket.on("board:deleted", ({ boardId }) => {
  const card = document.querySelector(`.board-card[data-board-id="${boardId}"]`);
  if (card) card.remove();
});

/* ===========================
   inject sidebar + load boards
=========================== */
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

function activateBoardsMenu() {
  const links = document.querySelectorAll(".nav .nav-item");
  links.forEach((a) => a.classList.remove("is-active"));
  const boardsLink = [...links].find((a) => /boards/i.test(a.textContent.trim()));
  if (boardsLink) boardsLink.classList.add("is-active");
}

document.addEventListener("DOMContentLoaded", async () => {
  await inject("./components/sidebar_header.html", "#app-shell");
  activateBoardsMenu();
  loadRecentlyViewedBoards();
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
      const res = await fetch(`${API_BASE}/v1/workspace`, {
        credentials: "include", // để gửi cookie
      }); // endpoint lấy workspace
      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        workspaceSelect.innerHTML = "";
        data.forEach((ws) => {
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
  colorOptions.forEach((opt) => {
    opt.addEventListener("click", () => {
      colorOptions.forEach((o) => o.classList.remove("selected"));
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
        duration: 2000, // 3 giây
        gravity: "top", // top hoặc bottom
        position: "right", // left, center, right
        backgroundColor: "#FF9800", // màu cam cảnh báo
        close: true, // có nút (x) để tắt
        stopOnFocus: true, // dừng khi rê chuột vào
      }).showToast();
    try {
      const res = await fetch(`${API_BASE}/v1/board/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          workspaceId,
          visibility,
          background: uploadedBg || selectedColor,
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
          backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
        }).showToast();
        modal.style.display = "none";
        titleInput.value = "";
        loadRecentlyViewedBoards();
        localStorage.setItem("boardsDirty", "1");
      } else {
        Toastify({
          text: `❌ ${data.message || "Tạo board thất bại!"}`,
          duration: 2000,
          gravity: "top",
          position: "right",
          backgroundColor: "#F44336",
          close: true,
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

if (showAddListBtn && addListForm && cancelAddListBtn && addListBtn && newListTitle) {
  showAddListBtn.addEventListener("click", () => {
    showAddListBtn.style.display = "none";
    addListForm.style.display = "flex";
  });

  cancelAddListBtn.addEventListener("click", () => {
    addListForm.style.display = "none";
    showAddListBtn.style.display = "inline-block";
    newListTitle.value = "";
  });
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
  (Array.isArray(list.cards) ? list.cards : []).forEach((card) => {
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
  listEl.appendChild(addCardBtn);

  // --- Sự kiện ---
  addCardBtn.addEventListener("click", () => {
    addCardBtn.classList.add("hidden");

    if (!cardsContainer.contains(inputContainer)) {
      cardsContainer.appendChild(inputContainer);
    }

    inputContainer.classList.remove("hidden");
    setTimeout(() => inputContainer.classList.add("show"), 10);
    input.focus();

    // 🔽 Cuộn đến đáy .cards-container
    setTimeout(() => {
      cardsContainer.scrollTo({
        top: cardsContainer.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  });

  cancelBtn.addEventListener("click", () => {
    inputContainer.classList.remove("show");
    setTimeout(() => {
      inputContainer.classList.add("hidden");
      inputContainer.remove();
    }, 300);
    addCardBtn.classList.remove("hidden");
    input.value = "";
  });

  saveBtn.addEventListener("click", async () => {
    const cardName = input.value.trim();
    if (!cardName)
      return Toastify({
        text: "⚠️ Vui lòng nhập tên thẻ!",
        duration: 2000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF9800",
        close: true,
      }).showToast();
    saveBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/v1/board/create-card/${listId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: cardName, description: "" }),
      });

      if (!res.ok) throw new Error("Không thể thêm thẻ");

      inputContainer.classList.remove("show");
      setTimeout(() => inputContainer.classList.add("hidden"), 10);

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
socket.on("newCard", (card) => {
  const listId = card.list._id ? card.list._id : card.list;
  const listEl = document.querySelector(`.list[data-id="${listId}"] .cards-container`);
  if (!listEl) return;
  const cardEl = document.createElement("div");
  cardEl.className = "card";
  cardEl.textContent = card.name;
  listEl.appendChild(cardEl);
});

if (addListBtn) {
  addListBtn.addEventListener("click", async () => {
    const title = newListTitle.value.trim();
    if (!title) return alert("Please enter list title");
    if (!currentBoardId) return alert("Board not selected");

    try {
      await fetch(`${API_BASE}/v1/board/create-list/${currentBoardId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title }),
      });
      newListTitle.value = "";
    } catch (err) {
      console.error("Error adding list:", err);
      alert("Failed to add list");
    }
  });
}

socket.on("newList", (list) => {
  addListToBoard(list);
});

// Mời user
const inviteForm = document.getElementById("inviteForm");

if (inviteForm) {
  inviteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const boardId = currentBoardId;
    const email = inviteForm.querySelector("input").value.trim();

    if (!email) {
      Toastify({
        text: "⚠️ Vui lòng nhập email!",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF9800",
        close: true,
        stopOnFocus: true,
      }).showToast();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/v1/board/${boardId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
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
          stopOnFocus: true,
        }).showToast();

        inviteForm.reset();
      } else {
        Toastify({
          text: `❌ ${data.message || "Mời thất bại!"}`,
          duration: 3000,
          gravity: "top",
          position: "right",
          backgroundColor: "#F44336",
          close: true,
          stopOnFocus: true,
        }).showToast();
      }
    } catch (err) {
      console.error(err);
      Toastify({
        text: "🚫 Lỗi server, vui lòng thử lại sau!",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#9C27B0",
        close: true,
        stopOnFocus: true,
      }).showToast();
    }
  });
}

//bật tắt invite
document.addEventListener("DOMContentLoaded", () => {
  const inviteIcon = document.getElementById("invite-icon");
  const inviteFormContainer = document.getElementById("inviteFormContainer");

  if (!inviteIcon || !inviteFormContainer) return;

  inviteIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    inviteFormContainer.classList.toggle("hidden");
    inviteIcon.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (!inviteFormContainer.contains(e.target) && e.target !== inviteIcon) {
      inviteIcon.style.display = "flex";
      inviteFormContainer.classList.add("hidden");
    }
  });
});

function addListToBoard(list) {
  const listsContainer = document.getElementById("listsContainer");
  if (!listsContainer) return;

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

  const listEl = createListElement(list);
  listsContainer?.appendChild(listEl);
});

// tải background từ máy
const bgUpload = document.getElementById("bgUpload");

if (bgUpload) {
  bgUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("background", file);

    const res = await fetch(`${API_BASE}/v1/upload/bg`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    uploadedBg = data.imageUrl;
    console.log("đường dẫn ảnh là ", data.imageUrl);
    selectedColor = "";
  });
}