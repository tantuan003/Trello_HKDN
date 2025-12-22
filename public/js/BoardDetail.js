import { socket } from "../js/socket.js";
import { API_BASE } from "../js/config.js";

// ===================================================================
// ✅ GLOBAL CONFIRM MODAL (DÙNG CHUNG) — thay cho confirm() browser
// ===================================================================
function ensureConfirmModal() {
  if (document.getElementById("confirmActionModal")) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "confirmActionModal";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <div class="modal delete-modal">
      <h3 id="confirmModalTitle">Confirm?</h3>
      <p class="delete-desc" id="confirmModalDesc">Bạn chắc chắn chứ?</p>
      <div class="modal-actions">
        <button id="confirmModalOk" class="btn-danger">Delete</button>
        <button id="confirmModalCancel" class="btn-outline">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // click ra ngoài overlay để đóng
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });
}

let pendingConfirm = {
  onConfirm: null,
  onCancel: null,
};

function openConfirmModal({
  title = "Confirm?",
  desc = "Bạn chắc chắn chứ?",
  okText = "Delete",
  cancelText = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}) {
  ensureConfirmModal();
  pendingConfirm = { onConfirm, onCancel };

  const overlay = document.getElementById("confirmActionModal");
  const titleEl = document.getElementById("confirmModalTitle");
  const descEl = document.getElementById("confirmModalDesc");
  const btnOk = document.getElementById("confirmModalOk");
  const btnCancel = document.getElementById("confirmModalCancel");

  titleEl.textContent = title;
  descEl.textContent = desc;

  btnOk.textContent = okText;
  btnCancel.textContent = cancelText;

  // đổi style OK button nếu không danger
  btnOk.className = danger ? "btn-danger" : "btn-primary";

  overlay.style.display = "flex";

  btnCancel.onclick = () => {
    overlay.style.display = "none";
    if (typeof pendingConfirm.onCancel === "function") pendingConfirm.onCancel();
    pendingConfirm = { onConfirm: null, onCancel: null };
  };

  btnOk.onclick = async () => {
    btnOk.disabled = true;
    try {
      if (typeof pendingConfirm.onConfirm === "function") {
        await pendingConfirm.onConfirm();
      }
      overlay.style.display = "none";
    } finally {
      btnOk.disabled = false;
      pendingConfirm = { onConfirm: null, onCancel: null };
    }
  };
}

// ===================================================================
// Lấy boardId từ URL
// ===================================================================
const urlParams = new URLSearchParams(window.location.search);
let boardId = urlParams.get("id");
let members = [];
const attachmentInput = document.getElementById("attachmentInput");
let currentCardId = null;
let assignedMembers = []; // chứa array ID user
let currentCard = [];
let boardData = {
  lists: [], // array of lists, mỗi list có cards
  members: [], // array of members
};
// Map lưu các hàm render UI của từng card
const cardUIActions = {};

const currentBoardId = boardId; // gán biến chung cho toàn file

if (!boardId) {
  alert("Board không tồn tại!");
  window.location.href = "./Boards.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  activateBoardsMenu();
});

function activateBoardsMenu() {
  const links = document.querySelectorAll(".nav .nav-item");
  links.forEach((a) => a.classList.remove("is-active"));
  const boardsLink = [...links].find((a) => /boards/i.test(a.textContent.trim()));
  if (boardsLink) boardsLink.classList.add("is-active");
}

// ===================================================================
// RENDER BOARD + LIST + CARD
// ===================================================================
const listsContainer = document.getElementById("listsContainer");

function renderAssignedMembersinvite(members) {
  const container = document.getElementById("assignedAvatars");
  container.innerHTML = "";

  if (!members || members.length === 0) {
    container.innerHTML = "";
    return;
  }

  members.forEach((member) => {
    const avatar = document.createElement("div");
    avatar.className = "assigned-avatar";
    avatar.textContent = member.username[0].toUpperCase();
    avatar.title = member.email;
    container.appendChild(avatar);
  });
}

renderBoardWithLists();

async function renderBoardWithLists() {
  if (!currentBoardId) {
    console.error("❌ currentBoardId chưa có!");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/v1/board/${currentBoardId}`);
    const data = await res.json();
    members = data.board.members;
    boardData.lists = data.board.lists;
    boardData.members = data.board.members;
    renderAssignedMembersinvite(members);

    socket.emit("joinBoard", currentBoardId);
    socket.on("connect", () => {
      socket.emit("joinBoard", currentBoardId);
    });

    if (!data.board) return;

    const { background, lists } = data.board;
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.style.display = "none";

    // Reset layout khi không có sidebar
    const shell = document.getElementById("app-shell");
    if (shell) {
      shell.style.display = "block"; // không còn flex/grid
      shell.style.gridTemplateColumns = ""; // xoá cột sidebar
      shell.style.width = "100%";
    }
    const boardTitle = document.getElementById("boardTitle");
    if (boardTitle) {
      boardTitle.textContent = data.board.name;
    }
    // ⬇️ Áp dụng background vào trang
    applyBoardBackground(background);

    listsContainer.innerHTML = "";

    lists.forEach((list) => {
      const listEl = createListElement(list);
      listsContainer.appendChild(listEl);
    });
  } catch (err) {
    console.error("Error loading board:", err);
  }
}

function applyBoardBackground(bg) {
  const boardPage = document.body;
  if (!boardPage) return;

  if (bg.startsWith("gradient")) {
    const className = `body-${bg}`;
    boardPage.classList.add(className);

    // Xóa backgroundImage nếu trước đó có
    boardPage.style.backgroundImage = "";
  } else {
    // ảnh
    boardPage.style.backgroundImage = `url('${bg}')`;
    boardPage.style.backgroundSize = "cover";
    boardPage.style.backgroundPosition = "center";
    boardPage.style.backgroundRepeat = "no-repeat";

    // Xóa class gradient nếu trước đó có
    boardPage.classList.remove("body-gradient-1", "body-gradient-2", "body-gradient-3");
  }
}

// ===================================================================
// Tạo LIST
// ===================================================================
function createListElement(list) {
  const listEl = document.createElement("div");
  listEl.className = "list";
  listEl.dataset.id = list._id;

  // ===== LIST HEADER =====
  const header = document.createElement("div");
  header.className = "list-header";

  // Title
  const h3 = document.createElement("h3");
  h3.className = "list-title";
  h3.textContent = list.name;

  // Nút ...
  const menuBtn = document.createElement("button");
  menuBtn.className = "list-menu-btn";
  menuBtn.textContent = "⋯";

  // Menu dropdown
  const menu = document.createElement("div");
  menu.className = "list-menu";
  menu.style.display = "none";

  menu.innerHTML = `
    <div class="list-menu-item" data-action="clear-cards">Xoá tất cả card trong list</div>
    <div class="list-menu-item danger" data-action="delete-list">Xoá list</div>
  `;

  // CARD container (cần tạo trước để dùng trong clear-cards)
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  });

  menu.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    // === XOÁ TẤT CẢ CARD TRONG LIST ===
    if (action === "clear-cards") {
      openConfirmModal({
        title: "Clear cards?",
        desc: "Bạn chắc chắn muốn xoá TẤT CẢ card trong list này? Hành động này không thể hoàn tác.",
        okText: "Delete",
        cancelText: "Cancel",
        danger: true,
        onConfirm: async () => {
          try {
            // UI: xoá card trước
            cardsContainer.innerHTML = "";

            // Backend
            const res = await fetch(`${API_BASE}/v1/board/${list._id}/clear-cards`, {
              method: "DELETE",
              credentials: "include",
            });

            if (!res.ok) throw new Error("Clear cards failed");

            // Nếu backend có emit socket "cards-cleared" thì người khác sẽ tự update
            // Còn nếu bạn muốn chủ động báo:
            socket.emit("cards-cleared", { listId: list._id });
          } catch (err) {
            Toastify({
              text: "❌ Xoá card thất bại!",
              duration: 2000,
              gravity: "top",
              position: "right",
              backgroundColor: "#F44336",
              close: true,
            }).showToast();
            console.error(err);
          }
        },
      });
    }

    // === XOÁ LIST ===
    if (action === "delete-list") {
      openConfirmModal({
        title: "Delete list?",
        desc: "Bạn chắc chắn muốn xoá list này? Tất cả card sẽ mất và không thể hoàn tác.",
        okText: "Delete",
        cancelText: "Cancel",
        danger: true,
        onConfirm: async () => {
          try {
            // UI: xoá list
            listEl.remove();

            // Backend
            const res = await fetch(`${API_BASE}/v1/board/${list._id}`, {
              method: "DELETE",
              credentials: "include",
            });

            if (!res.ok) throw new Error("Delete list failed");

            socket.emit("list-deleted", { listId: list._id });
          } catch (err) {
            Toastify({
              text: "❌ Xoá list thất bại!",
              duration: 2000,
              gravity: "top",
              position: "right",
              backgroundColor: "#F44336",
              close: true,
            }).showToast();
            console.error(err);
          }
        },
      });
    }

    menu.style.display = "none";
  });

  // Click ra ngoài thì đóng menu
  document.addEventListener("click", () => {
    menu.style.display = "none";
  });

  header.appendChild(h3);
  header.appendChild(menuBtn);
  header.appendChild(menu);
  listEl.appendChild(header);

  listEl.appendChild(cardsContainer);

  // Render các card
  (list.cards || []).forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.dataset.id = card._id;

    // Tạo topBar
    const topBar = document.createElement("div");
    topBar.className = "card-topbar";

    // --- LABELS ---
    if (Array.isArray(card.labels) && card.labels.length > 0) {
      const labelsEl = document.createElement("div");
      labelsEl.className = "card-labels";

      card.labels.forEach((color) => {
        const labelColor = document.createElement("div");
        labelColor.className = "card-label";
        labelColor.style.background = color;
        labelsEl.appendChild(labelColor);
      });

      topBar.appendChild(labelsEl);
    }

    // --- FOOTER ---
    const footerEl = document.createElement("div");
    footerEl.className = "card-footer";

    // --- COMPLETE FOOTER ---
    const completeFooter = document.createElement("div");
    completeFooter.className = "card-complete-footer";
    footerEl.appendChild(completeFooter);

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "card-actions";

    // Checkbox complete
    const checkboxEl = document.createElement("input");
    checkboxEl.type = "checkbox";
    checkboxEl.className = "card-checkbox";
    checkboxEl.checked = card.complete === true;

    // Icon thùng rác
    const deleteBtn = document.createElement("img");
    deleteBtn.src = "/uploads/icons8-delete-128.png";
    deleteBtn.className = "card-delete-btn";
    deleteBtn.alt = "Delete card";

    // ✅ THAY confirm() BROWSER BẰNG MODAL
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      openConfirmModal({
        title: "Delete card?",
        desc: "Bạn chắc chắn muốn xoá card này? Hành động này không thể hoàn tác.",
        okText: "Delete",
        cancelText: "Cancel",
        danger: true,
        onConfirm: async () => {
          try {
            // UI trước
            cardEl.remove();

            // Backend
            const res = await fetch(`${API_BASE}/v1/board/delete/${card._id}`, {
              method: "DELETE",
              credentials: "include",
            });

            // safe parse (DELETE đôi khi không trả body)
            let data = null;
            try {
              data = await res.json();
            } catch {}

            if (!res.ok || (data && data.success === false)) {
              Toastify({
                text: `❌ ${(data && data.message) || "Xoá card thất bại!"}`,
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "#F44336",
                close: true,
              }).showToast();
              return;
            }

            // nếu backend có broadcast card-deleted thì ok
            // nếu không, bạn vẫn có listener card-deleted ở dưới:
            socket.emit("card-deleted", { cardId: card._id });
          } catch (err) {
            Toastify({
              text: "❌ Xoá card thất bại!",
              duration: 2000,
              gravity: "top",
              position: "right",
              backgroundColor: "#F44336",
              close: true,
            }).showToast();
            console.error(err);
          }
        },
      });
    });

    // Gộp vào wrapper
    actionsWrap.appendChild(deleteBtn);
    actionsWrap.appendChild(checkboxEl);

    function renderCompleteElement() {
      completeFooter.innerHTML = `
        <div class="card-complete">
          <img src="uploads/checks (2).svg" width="16" height="16">
          <span style="margin-left:4px">Complete</span>
        </div>
      `;
    }

    cardUIActions[card._id] = {
      render: renderCompleteElement,
      checkboxEl,
    };

    // LOAD LẦN ĐẦU
    if (card.complete === true) {
      renderCompleteElement();
    }

    topBar.appendChild(actionsWrap);
    cardEl.appendChild(topBar);

    // Tên card
    const titleEl = document.createElement("div");
    titleEl.className = "card-title";
    titleEl.textContent = card.name;
    cardEl.appendChild(titleEl);

    // --- Due date ---
    let dueEl = null;
    const leftEl = document.createElement("div");
    leftEl.style.display = "flex";
    leftEl.style.alignItems = "center";
    leftEl.style.gap = "4px";

    if (card.dueDate) {
      const date = new Date(card.dueDate).toLocaleDateString("vi-VN");

      dueEl = document.createElement("div");
      dueEl.className = "card-due";
      dueEl.style.display = "flex";
      dueEl.style.alignItems = "center";
      dueEl.style.gap = "4px";

      const icon = document.createElement("img");
      icon.src = "uploads/clock-countdown-black.svg";
      icon.alt = "calendar";
      icon.style.width = "16px";
      icon.style.height = "16px";

      const dateText = document.createTextNode(` ${date}`);

      dueEl.appendChild(icon);
      dueEl.appendChild(dateText);
      leftEl.appendChild(dueEl);

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const due = new Date(card.dueDate);
      due.setHours(0, 0, 0, 0);

      const diffDays = (due - now) / (1000 * 60 * 60 * 24);

      if (diffDays < 0) dueEl.style.backgroundColor = "#ff4d4f";
      else if (diffDays <= 2) dueEl.style.backgroundColor = "#f2d600";
      else dueEl.style.backgroundColor = "#61bd4f";
    }

    // --- Middle (attachments + comments) ---
    const midEl = document.createElement("div");
    midEl.className = "mid-footer";
    midEl.style.display = "flex";
    midEl.style.alignItems = "center";
    midEl.style.gap = "6px";

    if (card.attachments && card.attachments.length > 0) {
      const iconAttachments = document.createElement("img");
      iconAttachments.src = "uploads/attachments-icon.svg";
      iconAttachments.alt = "attachments";
      iconAttachments.style.width = "16px";
      iconAttachments.style.height = "16px";

      const attText = document.createTextNode(card.attachments.length);

      midEl.appendChild(iconAttachments);
      midEl.appendChild(attText);
    }

    if (card.comments && card.comments.length > 0) {
      const commentBox = document.createElement("div");
      commentBox.className = "comment-info";

      const icon = document.createElement("img");
      icon.src = "uploads/comments-icon.svg";
      icon.alt = "comments";
      icon.style.width = "16px";
      icon.style.height = "16px";

      const count = document.createElement("span");
      count.className = "comment-count";
      count.textContent = card.comments.length;

      commentBox.appendChild(icon);
      commentBox.appendChild(count);
      midEl.appendChild(commentBox);
    }

    // --- Members ---
    const membersEl = document.createElement("div");
    membersEl.className = "card-members";
    membersEl.style.display = "flex";
    membersEl.style.gap = "4px";

    (card.assignedTo || []).forEach((userId) => {
      const user = members.find((u) => u._id === userId);
      if (!user) return;

      const memberEl = document.createElement("div");
      memberEl.className = "card-member";
      memberEl.title = user.username + `(${user.email})` || "Unknown";

      if (user.avatarUrl) {
        const img = document.createElement("img");
        img.src = user.avatarUrl;
        img.alt = user.name || "member";
        memberEl.appendChild(img);
      } else {
        memberEl.textContent = (user.username || "?")[0].toUpperCase();
      }

      membersEl.appendChild(memberEl);
    });

    if (dueEl) footerEl.appendChild(dueEl);
    footerEl.appendChild(midEl);
    footerEl.appendChild(membersEl);

    cardEl.appendChild(footerEl);
    cardEl.appendChild(completeFooter);

    // --- CLICK CHECKBOX ---
    checkboxEl.addEventListener("click", async (e) => {
      e.stopPropagation();

      const isComplete = checkboxEl.checked;

      if (isComplete) renderCompleteElement();
      else completeFooter.innerHTML = "";

      socket.emit("card:completeToggle", {
        cardId: card._id,
        complete: isComplete,
      });

      try {
        await fetch(`${API_BASE}/v1/board/complete/${card._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complete: isComplete }),
        });
      } catch (err) {
        console.error("Error updating card complete:", err);
      }
    });

    // ⭐ mở chi tiết
    cardEl.addEventListener("click", () => {
      openCardDetail(card._id);
    });

    cardsContainer.appendChild(cardEl);
  });

  // Nút Add card
  attachAddCard(listEl, list._id);

  return listEl;
}

// ===================================================================
// SOCKET realtime xoá/clear/list
// ===================================================================
socket.on("cards-cleared", ({ listId }) => {
  const listEl = document.querySelector(`.list[data-id="${listId}"]`);
  if (!listEl) return;

  const cardsContainer = listEl.querySelector(".cards-container");
  cardsContainer.innerHTML = "";
});

socket.on("list-deleted", ({ listId }) => {
  const listEl = document.querySelector(`.list[data-id="${listId}"]`);
  if (listEl) listEl.remove();
});

socket.on("card-deleted", ({ cardId }) => {
  const cardEl = document.querySelector(`.card[data-id="${cardId}"]`);
  if (cardEl) cardEl.remove();
});

socket.on("card:completeUpdated", ({ cardId, complete }) => {
  const ui = cardUIActions[cardId];
  if (!ui) return;

  ui.checkboxEl.checked = complete;

  if (complete) {
    ui.render();
  } else {
    const footer = ui.checkboxEl.closest(".card").querySelector(".card-complete-footer");
    if (footer) footer.innerHTML = "";
  }
});

// ===================================================================
// Thêm card vào list
// ===================================================================
function attachAddCard(listEl, listId) {
  const cardsContainer = listEl.querySelector(".cards-container");

  const addCardBtn = document.createElement("button");
  addCardBtn.className = "add-card-btn";
  addCardBtn.textContent = "+ Add a card";

  const inputContainer = document.createElement("div");
  inputContainer.className = "add-card-input-container hidden";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter a card title...";

  const saveBtn = document.createElement("button");
  saveBtn.className = "save-card-btn";
  saveBtn.textContent = "Add";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel-card-btn";
  cancelBtn.textContent = "Cancel";

  inputContainer.appendChild(input);
  inputContainer.appendChild(saveBtn);
  inputContainer.appendChild(cancelBtn);

  listEl.appendChild(addCardBtn);

  addCardBtn.addEventListener("click", () => {
    addCardBtn.classList.add("hidden");

    if (!cardsContainer.contains(inputContainer)) {
      cardsContainer.appendChild(inputContainer);
    }

    inputContainer.classList.remove("hidden");
    setTimeout(() => inputContainer.classList.add("show"), 10);
    input.focus();

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
      inputContainer.remove();
    }, 300);
    addCardBtn.classList.remove("hidden");
    input.value = "";
  });

  saveBtn.addEventListener("click", async () => {
    const cardName = input.value.trim();
    if (!cardName) return alert("Vui lòng nhập tên thẻ!");

    saveBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/v1/board/create-card/${listId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: cardName, description: "" }),
      });

      if (!res.ok) throw new Error("Không thể thêm thẻ");

      input.value = "";
      inputContainer.remove();
      addCardBtn.classList.remove("hidden");
    } catch (err) {
      console.error(err);
    } finally {
      saveBtn.disabled = false;
    }
  });
}

// ===================================================================
// REALTIME CARD
// ===================================================================
socket.on("newCard", (card) => {
  const listId = card.list._id ? card.list._id : card.list; // nếu populate
  const listEl = document.querySelector(`.list[data-id="${listId}"] .cards-container`);
  if (!listEl) return;

  const cardEl = document.createElement("div");
  cardEl.className = "card";
  cardEl.textContent = card.name;
  cardEl.addEventListener("click", () => {
    openCardDetail(card._id);
  });

  listEl.appendChild(cardEl);
  renderBoardWithLists();
});

// ===================================================================
// Tạo LIST mới
// ===================================================================
const addListBtn = document.getElementById("addListBtn");
const newListTitle = document.getElementById("newListTitle");

addListBtn.addEventListener("click", async () => {
  const title = newListTitle.value.trim();
  if (!title) return alert("Please enter list title");

  try {
    await fetch(`${API_BASE}/v1/board/create-list/${currentBoardId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: title }),
    });
    newListTitle.value = "";
  } catch (err) {
    console.error(err);
    alert("Failed to add list");
  }
});

// ===================================================================
// REALTIME LIST
// ===================================================================
socket.on("newList", (list) => {
  console.log("📩 Received new list:", list);

  const listEl = createListElement(list);
  listsContainer.appendChild(listEl);
  renderBoardWithLists();
});

// ===================================================================
// Invite user
// ===================================================================
const inviteForm = document.getElementById("inviteForm");

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

// bật tắt invite
document.addEventListener("DOMContentLoaded", () => {
  const inviteIcon = document.getElementById("invite-icon");
  const inviteFormContainer = document.getElementById("inviteFormContainer");

  inviteIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    inviteFormContainer.classList.toggle("hidden");
    inviteIcon.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (!inviteFormContainer.contains(e.target) && e.target !== inviteIcon) {
      inviteIcon.style.display = "block";
      inviteFormContainer.classList.add("hidden");
    }
  });
});

const showAddListBtn = document.getElementById("showAddListBtn");
const addListForm = document.getElementById("addListForm");
const cancelAddListBtn = document.getElementById("cancelAddListBtn");

showAddListBtn.addEventListener("click", () => {
  showAddListBtn.style.display = "none";
  addListForm.style.display = "flex";
});

cancelAddListBtn.addEventListener("click", () => {
  addListForm.style.display = "none";
  showAddListBtn.style.display = "inline-block";
  newListTitle.value = "";
});

// ===================================================================
// CARD DETAIL
// ===================================================================
async function openCardDetail(cardId) {
  currentCardId = cardId;
  const res = await fetch(`${API_BASE}/v1/board/get-card/cards/${cardId}`, {
    credentials: "include",
  });
  const result = await res.json();
  if (!result.success) return alert(result.message || "Lỗi khi tải chi tiết card");

  currentCard = result.data;
  socket.emit("card:join", currentCard._id);
  showCardDetailModal(currentCard);
}

function showCardDetailModal(card) {
  const modal = document.getElementById("cardDetailModal");

  assignedMembers = (card.assignedTo || []).map((m) => m._id);
  renderAssignedMembers();

  const labelsEl = document.getElementById("cardLabels");
  labelsEl.innerHTML = "";

  (card.labels || []).forEach((color) => {
    addLabelToCard(color);
  });

  const addLabelBtn = document.getElementById("addLabelBtn");
  addLabelBtn.removeEventListener("click", addLabelBtn._listener);
  addLabelBtn._listener = () => openLabelPopup(currentCard._id);
  addLabelBtn.addEventListener("click", addLabelBtn._listener);
  renderLabelsFromCard(card);

  const cardTitleEl = document.getElementById("cardTitle");
  cardTitleEl.contentEditable = true;
  cardTitleEl.textContent = currentCard.name;

  cardTitleEl.addEventListener("input", () => {
    const newName = cardTitleEl.textContent.trim();
    if (!newName || newName === currentCard.name) return;

    currentCard.name = newName;
    socket.emit("card:updateName", { cardId: currentCard._id, name: newName });
  });

  const cardDescriptionEl = document.getElementById("cardDescription");
  cardDescriptionEl.contentEditable = true;
  cardDescriptionEl.textContent = card.description || "";
  cardDescriptionEl.addEventListener("input", () => {
    const newDescription = cardDescriptionEl.textContent.trim();
    currentCard.description = newDescription;
    socket.emit("card:updateDescription", { cardId: card._id, description: newDescription });
  });

  socket.off("card:descriptionUpdated");
  socket.on("card:descriptionUpdated", ({ description }) => {
    if (document.activeElement !== cardDescriptionEl) {
      cardDescriptionEl.textContent = description;
    }
  });

  // Due date
  const dateInput = document.getElementById("cardDueDate");
  const timeInput = document.getElementById("cardDueTime");
  const statusEl = document.getElementById("dueDateStatus");

  if (card.dueDate) {
    const due = new Date(card.dueDate);

    const yyyy = due.getFullYear();
    const mm = String(due.getMonth() + 1).padStart(2, "0");
    const dd = String(due.getDate()).padStart(2, "0");
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    const hh = String(due.getHours()).padStart(2, "0");
    const min = String(due.getMinutes()).padStart(2, "0");
    timeInput.value = `${hh}:${min}`;

    statusEl.textContent = formatDateDMY(due) + " đến hạn";
  } else {
    dateInput.value = "";
    timeInput.value = "";
    statusEl.textContent = "";
  }

  updateDueStatus();

  dateInput.addEventListener("change", () => {
    updateDueStatus();
    saveDueDate();
  });
  timeInput.addEventListener("change", () => {
    updateDueStatus();
    saveDueDate();
  });

  renderComments(card.comments || []);
  renderAttachments(card);

  modal.style.display = "flex";
  document.getElementById("closeModal").onclick = () => (modal.style.display = "none");
  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = "none";
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderAttachments(card) {
  const attachmentsEl = document.getElementById("cardAttachments");
  attachmentsEl.innerHTML = "";

  (card.attachments || []).forEach((fileObj, index) => {
    const { name, data } = fileObj;
    const li = document.createElement("li");

    if (data.startsWith("data:image")) {
      const img = document.createElement("img");
      img.src = data;
      img.style.maxWidth = "150px";
      img.style.display = "block";
      img.style.marginBottom = "5px";
      img.onclick = (e) => e.stopPropagation();
      li.appendChild(img);
    } else {
      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;
      nameSpan.style.marginRight = "10px";
      li.appendChild(nameSpan);
    }

    const openBtn = document.createElement("button");
    openBtn.textContent = "Mở / Download";
    openBtn.onclick = (e) => {
      e.stopPropagation();
      const [header, base64] = data.split(",");
      const mime = header.match(/data:(.*?);base64/)[1];
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);

      const blob = new Blob([buffer], { type: mime });
      const blobURL = URL.createObjectURL(blob);

      if (mime.startsWith("text")) {
        window.open(blobURL, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = blobURL;
        a.download = name;
        a.click();
      }

      setTimeout(() => URL.revokeObjectURL(blobURL), 1000);
    };
    li.appendChild(openBtn);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "x";
    removeBtn.style.marginLeft = "5px";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      removeAttachment(index);
    };
    li.appendChild(removeBtn);

    attachmentsEl.appendChild(li);
  });
}

socket.on("card:nameUpdated", ({ cardId, name }) => {
  boardData.lists.forEach((list) => {
    const c = (list.cards || []).find((c) => c._id === cardId);
    if (c) c.name = name;
  });

  const cardEl = document.querySelector(`.card[data-id='${cardId}']`);
  if (cardEl) {
    const nameEl = cardEl.querySelector(".card-title");
    if (nameEl) nameEl.textContent = name;
  }

  const cardTitleEl = document.getElementById("cardTitle");
  if (cardTitleEl && currentCard._id === cardId && document.activeElement !== cardTitleEl) {
    cardTitleEl.textContent = name;
  }
});

attachmentInput.onchange = async () => {
  const files = Array.from(attachmentInput.files);

  for (let file of files) {
    if (!currentCard.attachments?.some((f) => f.name === file.name && f.size === file.size)) {
      const fileObj = { name: file.name, data: await fileToBase64(file) };
      currentCard.attachments ??= [];
      currentCard.attachments.push(fileObj);

      socket.emit("card:updateAttachments", {
        cardId: currentCardId,
        file: fileObj,
      });
    }
  }

  attachmentInput.value = "";
};

function removeAttachment(index) {
  const file = currentCard.attachments[index];
  currentCard.attachments.splice(index, 1);
  socket.emit("card:removeAttachment", { cardId: currentCard._id, fileName: file.name });
}

function loadAssignList(filter = "") {
  const assignListEl = document.getElementById("assignList");
  assignListEl.innerHTML = "";

  members
    .filter((member) => member.username.toLowerCase().includes(filter.toLowerCase()))
    .forEach((member) => {
      const li = document.createElement("li");
      li.dataset.id = member._id;
      li.className = "assign-member-item";

      const avatar = document.createElement("div");
      avatar.className = "member-avatar";
      avatar.textContent = member.username[0].toUpperCase();

      const name = document.createElement("span");
      name.className = "member-name";
      name.textContent = member.username;

      li.appendChild(avatar);
      li.appendChild(name);

      if (assignedMembers.includes(member._id)) {
        li.classList.add("assigned");
      }

      li.addEventListener("click", () => {
        assignMemberToCard(member._id);
      });

      assignListEl.appendChild(li);
    });
}

document.getElementById("AssignedMember-btn").addEventListener("click", () => {
  const popup = document.getElementById("assignPopup");

  popup.style.display = popup.style.display === "none" || popup.style.display === "" ? "flex" : "none";

  loadAssignList();
});

document.getElementById("assign-close").addEventListener("click", () => {
  document.getElementById("assignPopup").style.display = "none";
});

window.addEventListener("click", (e) => {
  const popup = document.getElementById("assignPopup");
  if (e.target === popup) popup.style.display = "none";
});

document.getElementById("assignSearch").addEventListener("input", (e) => {
  loadAssignList(e.target.value);
});

function assignMemberToCard(userId) {
  if (!currentCard || !currentCard._id) return;
  socket.emit("card:assignMember", {
    cardId: currentCard._id,
    userId,
  });
}

function removeMemberFromCard(userId) {
  if (!currentCard || !currentCard._id) return;
  socket.emit("card:removeMember", {
    cardId: currentCard._id,
    userId,
  });
}

function renderAssignedMembers() {
  const cardAssignedEl = document.getElementById("cardAssigned");
  cardAssignedEl.innerHTML = "";

  assignedMembers.forEach((id) => {
    const member = members.find((m) => m._id === id);
    if (!member) return;

    const li = document.createElement("li");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = member.username[0].toUpperCase();

    const name = document.createElement("span");
    name.className = "member-name";
    name.textContent = member.username;

    const removeBtn = document.createElement("span");
    removeBtn.className = "remove-member";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      removeMemberFromCard(member._id);
    });

    li.appendChild(avatar);
    li.appendChild(name);
    li.appendChild(removeBtn);
    cardAssignedEl.appendChild(li);
  });
}

function updateBoardViewAssignedUI(cardId, updated) {
  const cardEl = document.querySelector(`.card[data-id='${cardId}']`);
  if (!cardEl) {
    requestAnimationFrame(() => updateBoardViewAssignedUI(cardId, updated));
    return;
  }

  const membersEl = cardEl.querySelector(".card-members");
  if (!membersEl) return;

  membersEl.innerHTML = "";

  updated.forEach((uid) => {
    const m = members.find((mem) => mem._id === uid);
    if (!m) return;

    const avatar = document.createElement("div");
    avatar.className = "card-member";
    avatar.title = m.username + `(${m.email})` || "Unknown";
    avatar.textContent = m.username[0].toUpperCase();

    membersEl.appendChild(avatar);
  });
}

function updateAssignedMembersInState(cardId, updated) {
  boardData.lists.forEach((list) => {
    const c = list.cards.find((c) => c._id === cardId);
    if (c) c.assignedTo = updated;
  });
}

socket.off("card:assignedMembersUpdated");
socket.on("card:assignedMembersUpdated", ({ cardId, assignedMembers: updated }) => {
  if (currentCard && currentCard._id === cardId) {
    assignedMembers = updated;
    renderAssignedMembers();
  }

  updateAssignedMembersInState(cardId, updated);
  updateBoardViewAssignedUI(cardId, updated);
});

// labels realtime
socket.off("card:labelAdded");
socket.on("card:labelAdded", ({ cardId, color }) => {
  boardData.lists.forEach((list) => {
    const card = list.cards.find((c) => c._id === cardId);
    if (card && !card.labels.includes(color)) {
      card.labels.push(color);
    }
  });
  renderBoardWithLists();
  if (currentCard && currentCard._id === cardId) {
    currentCard.labels.push(color);

    const labelsEl = document.getElementById("cardLabels");
    if (labelsEl) {
      addLabelToCard(color);
    }
  }
});

const colors = ["#61bd4f", "#f2d600", "#ff9f1a", "#eb5a46", "#c377e0"];

function addLabelToCard(color) {
  const labelsEl = document.getElementById("cardLabels");
  if (Array.from(labelsEl.children).some((span) => span.dataset.color === color)) return;

  const span = document.createElement("span");
  span.classList.add("card-label");
  span.style.display = "inline-block";
  span.style.backgroundColor = color;
  span.style.width = "30px";
  span.style.height = "30px";
  span.style.gap = "10px";
  span.dataset.color = color;
  labelsEl.appendChild(span);
}

function openLabelPopup(cardId) {
  const popup = document.getElementById("labelPopup");
  const colorsContainer = document.getElementById("labelColors");
  colorsContainer.innerHTML = "";

  const currentLabels = currentCard.labels || [];

  colors.forEach((color) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("color-item");
    wrapper.style.backgroundColor = color;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("color-checkbox");
    checkbox.checked = currentLabels.includes(color);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        addLabelToCard(color);
        socket.emit("card:addLabel", { cardId: currentCard._id, color });
      } else {
        removeLabelFromCard(color);
        socket.emit("card:removeLabel", { cardId: currentCard._id, color });
      }
    });

    wrapper.appendChild(checkbox);
    colorsContainer.appendChild(wrapper);
  });

  popup.style.display = "flex";
}

function removeLabelFromCard(color) {
  const labelsEl = document.getElementById("cardLabels");

  Array.from(labelsEl.children).forEach((span) => {
    if (span.dataset.color === color) {
      span.remove();
    }
  });

  currentCard.labels = currentCard.labels.filter((c) => c !== color);
}

socket.on("card:labelRemoved", ({ cardId, color }) => {
  boardData.lists.forEach((list) => {
    const card = list.cards.find((c) => c._id === cardId);
    if (card) {
      card.labels = card.labels.filter((c) => c !== color);
    }
  });
  renderBoardWithLists();

  if (currentCard && currentCard._id === cardId) {
    currentCard.labels = currentCard.labels.filter((c) => c !== color);
    const labelsEl = document.getElementById("cardLabels");
    if (labelsEl) removeLabelFromCard(color);
  }
});

document.getElementById("closeLabelPopup").onclick = () => {
  document.getElementById("labelPopup").style.display = "none";
};

function renderLabelsFromCard(card) {
  const labelsEl = document.getElementById("cardLabels");
  labelsEl.innerHTML = "";
  (card.labels || []).forEach((color) => addLabelToCard(color));
}

// attachments socket
socket.on("card:attachmentsUpdated", ({ cardId, attachments }) => {
  if (currentCardId !== cardId) return;

  currentCard.attachments = attachments;
  renderAttachments(currentCard);
});

socket.on("card:attachmentRemoved", ({ fileName }) => {
  currentCard.attachments = currentCard.attachments.filter((f) => f.name !== fileName);
  renderAttachments(currentCard);
  renderBoardWithLists();
});

// due date helpers
function formatDateDMY(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

function getDueDateTime() {
  const dateInput = document.getElementById("cardDueDate").value;
  const timeInput = document.getElementById("cardDueTime").value || "00:00";

  if (!dateInput) return null;

  const [yyyy, mm, dd] = dateInput.split("-").map(Number);
  const [hh, min] = timeInput.split(":").map(Number);

  const due = new Date(yyyy, mm - 1, dd, hh, min);
  return due;
}

function updateDueStatus() {
  const due = getDueDateTime();
  const statusEl = document.getElementById("dueDateStatus");

  if (!due) {
    statusEl.textContent = "";
    statusEl.className = "due-status";
    return;
  }

  const diff = due - new Date();

  statusEl.textContent = formatDateDMY(due) + " đến hạn";

  if (diff < 0) statusEl.className = "due-status overdue";
  else if (diff < 24 * 60 * 60 * 1000) statusEl.className = "due-status warning";
  else statusEl.className = "due-status normal";
}

function saveDueDate() {
  const due = getDueDateTime();
  if (!due) return;

  currentCard.dueDate = due;

  socket.emit("card:updateDueDate", {
    cardId: currentCard._id,
    dueDate: due,
  });
}

socket.on("card:dueDateUpdated", ({ dueDate }) => {
  const due = new Date(dueDate);
  const dateInput = document.getElementById("cardDueDate");
  const timeInput = document.getElementById("cardDueTime");

  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  const dd = String(due.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;

  const hh = String(due.getHours()).padStart(2, "0");
  const min = String(due.getMinutes()).padStart(2, "0");
  timeInput.value = `${hh}:${min}`;

  updateDueStatus();
  renderBoardWithLists();
});

// comments
let commentsCache = [];

function renderComments(comments = []) {
  commentsCache = comments;
  const el = document.getElementById("cardComments");
  el.innerHTML = "";
  comments.forEach((c) => appendComment(c));
}

function appendComment(comment) {
  const el = document.getElementById("cardComments");

  const li = document.createElement("li");
  li.className = "comment-item";
  li.textContent = `${comment.user?.username || "Unknown"}: ${comment.text}`;

  el.appendChild(li);
}

document.getElementById("addCommentBtn").addEventListener("click", () => {
  const text = document.getElementById("commentInput").innerText.trim();
  const input = document.getElementById("commentInput");

  if (!text) return;

  socket.emit("card:addComment", { cardId: currentCardId, text });
  input.innerText = "";
});

socket.on("card:commentAdded", ({ cardId, comment }) => {
  if (currentCardId !== cardId) return;

  commentsCache.push(comment);
  appendComment(comment);
});

socket.on("board:commentAdded", ({ cardId, comment }) => {
  updateCardCommentCount(cardId, comment);
});

function updateCardCommentCount(cardId, comment) {
  let card = null;
  for (const list of boardData.lists) {
    const found = (list.cards || []).find((c) => c._id === cardId);
    if (found) {
      card = found;
      break;
    }
  }

  if (!card) return console.log("Không thấy card trong boardData");

  card.comments.push(comment);

  const cardEl = document.querySelector(`.card[data-id='${cardId}']`);
  if (!cardEl) return console.log("Không thấy cardEL");

  const countEl = cardEl.querySelector(".comment-count");
  if (!countEl) return console.log("Không thấy comment-count");

  countEl.textContent = card.comments.length;
}
