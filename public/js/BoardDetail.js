import { socket } from "../js/socket.js";
import { API_BASE } from "../js/config.js";
// ===================================================================
// Lấy boardId từ URL
// ===================================================================
const urlParams = new URLSearchParams(window.location.search);
let boardId = urlParams.get("id");
let members = [];
const attachmentInput = document.getElementById("attachmentInput");
let currentCardId = null;
let assignedMembers = [];  // chứa array ID user
let currentCard = []
let boardData = {
  lists: [],   // array of lists, mỗi list có cards
  members: [], // array of members
  visibility: ""
};
// Map lưu các hàm render UI của từng card
const cardUIActions = {};


const currentBoardId = boardId; // gán biến chung cho toàn file

if (!boardId) {
  alert("Board không tồn tại!");
  window.location.href = "./Boards.html";
}
document.addEventListener('DOMContentLoaded', async () => {
  activateBoardsMenu();

});
function activateBoardsMenu() {
  const links = document.querySelectorAll('.nav .nav-item');
  links.forEach(a => a.classList.remove('is-active'));
  const boardsLink = [...links].find(a => /boards/i.test(a.textContent.trim()));
  if (boardsLink) boardsLink.classList.add('is-active');
}
// ===================================================================

// ===================================================================
// RENDER BOARD + LIST + CARD
// ===================================================================
const listsContainer = document.getElementById("listsContainer");
function renderAssignedMembersinvite(members) {
  const container = document.getElementById("assignedAvatars");
  container.innerHTML = "";

  if (!members || members.length === 0) return;

  members.forEach(member => {
    if (!member.user) return;
    const avatar = document.createElement("div");
    avatar.className = "assigned-avatar";

    if (member.user.avatar) {
      avatar.style.backgroundImage = `url('${member.user.avatar}')`;
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
      avatar.textContent = ""; // có ảnh thì không cần chữ
    } else {
      avatar.textContent =
        member.user.username?.charAt(0).toUpperCase() || "?";
    }

    avatar.title = member.user.email || "";
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
    const result = await res.json();

    if (!result.success) return;

    // ✅ LẤY ĐÚNG DATA
    const { board, currentUserRole } = result.data;

    window.currentboardRole = currentUserRole;

    members = board.members;
    boardData.lists = board.lists;
    boardData.members = board.members;
    boardData.visibility = board.visibility;
    renderAssignedMembersinvite(members);

    // socket
    socket.emit("joinBoard", currentBoardId);
    socket.on("connect", () => {
      socket.emit("joinBoard", currentBoardId);
    });

    const { background, lists } = board;

    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.style.display = "none";

    const shell = document.getElementById("app-shell");
    if (shell) {
      shell.style.display = "block";
      shell.style.gridTemplateColumns = "";
      shell.style.width = "100%";
    }

    let isEditing = false;

    const boardTitle = document.getElementById("boardTitle");

    if (boardTitle) {
      boardTitle.textContent = board.name;

      // ✅ chỉ gắn event nếu có quyền
      if (["owner", "admin"].includes(currentUserRole)) {
        boardTitle.addEventListener("click", () => {
          if (isEditing) return;
          isEditing = true;

          const oldTitle = boardTitle.innerText;

          const input = document.createElement("input");
          input.type = "text";
          input.value = oldTitle;
          input.className = "board-title-input";

          boardTitle.replaceWith(input);
          input.focus();
          input.select();

          let isDone = false;

          async function save() {
            if (isDone) return;
            isDone = true;

            const newTitle = input.value.trim();

            input.replaceWith(boardTitle);
            isEditing = false;

            if (!newTitle || newTitle === oldTitle) return;

            boardTitle.innerText = newTitle;

            try {
              await updateBoardTitle(newTitle);
            } catch (err) {
              boardTitle.innerText = oldTitle;
              alert("Không thể cập nhật tên board");
            }
          }

          function cancel() {
            if (isDone) return;
            isDone = true;

            input.replaceWith(boardTitle);
            isEditing = false;
          }

          input.addEventListener("blur", save);

          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          });
        });
      }
    }

    applyBoardBackground(background);

    listsContainer.innerHTML = "";
    lists.forEach(list => {
      const listEl = createListElement(list);
      listsContainer.appendChild(listEl);
    });

  } catch (err) {
    console.error("Error loading board:", err);
  }
}
async function updateBoardTitle(title) {
  const boardId = new URLSearchParams(window.location.search).get("id");
  console.log("🔥 CALL API updateBoardTitle:", title);


  try {
    await fetch(`${API_BASE}/v1/board/${boardId}/title`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      credentials: "include"
    });
  } catch (err) {
    alert("Cập nhật board thất bại");
    console.error(err);
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

//realtime cho việc sửa tên board
socket.on("board:titleUpdated", (data) => {
  const boardTitle = document.getElementById("boardTitle");
  if (boardTitle) {
    boardTitle.textContent = data.name;
  }
});


// ===================================================================
// Tạo LIST

// ===================================================================

function createListElement(list) {
  const listEl = document.createElement("div");
  listEl.className = "list";
  listEl.dataset.id = list._id;

  // Title
  // ===== LIST HEADER =====
  const header = document.createElement("div");
  header.className = "list-header";

  // Title
  const h3 = document.createElement("h3");
  h3.className = "list-title";
  h3.textContent = list.name;

  h3.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = h3.textContent;
    input.className = "edit-list-input";
    h3.replaceWith(input);
    input.focus();

    let isSubmitting = false; // ✅ cờ chỉ submit 1 lần

    const submitChange = async () => {
      if (isSubmitting) return;
      isSubmitting = true;

      const newTitle = input.value.trim();
      if (!newTitle || newTitle === h3.textContent) {
        input.replaceWith(h3);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/v1/board/list/${list._id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });

        const data = await res.json();

        if (!res.ok) {
          Notiflix.Notify.failure(data.message || "Không thể cập nhật list");
          input.focus();
          isSubmitting = false; // reset cờ nếu cần thử lại
          return;
        }

        h3.textContent = newTitle;
        Notiflix.Notify.success("Đã cập nhật tên list");
      } catch (err) {
        Notiflix.Notify.failure("Cập nhật thất bại");
        console.error(err);
      } finally {
        input.replaceWith(h3);
      }
    };

    // Nhấn Enter → submit
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitChange();
      if (e.key === "Escape") {
        if (!isSubmitting) input.replaceWith(h3);
        isSubmitting = true;
      }
    });

    // Blur → submit, nhưng sẽ không submit nếu đang submit bởi Enter
    input.addEventListener("blur", submitChange);
  });


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
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  });
  menu.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    // === XOÁ TẤT CẢ CARD TRONG LIST ===
    if (action === "clear-cards") {
      Notiflix.Confirm.show(
        "Xác nhận",
        "Xoá TẤT CẢ card trong list này?",
        "Xoá",
        "Huỷ",
        async () => {
          Notiflix.Loading.circle("Đang xoá tất cả card...");
          try {
            const res = await fetch(`${API_BASE}/v1/board/${list._id}/clear-cards`, {
              method: "DELETE",
              credentials: "include",
            });

            const data = await res.json();

            Notiflix.Loading.remove();

            if (!res.ok) {
              Notiflix.Notify.failure(data.message || "Không thể xoá card");
              return;
            }

            // ✅ UI xoá khi socket bắn về hoặc tự xoá
            // cardsContainer.innerHTML = ""; // nếu muốn xoá ngay

            Notiflix.Notify.success(data.message || "Đã xoá toàn bộ card");
          } catch (err) {
            Notiflix.Loading.remove();
            Notiflix.Notify.failure("Xoá card thất bại");
            console.error(err);
          }
        }
      );
    }

    // === XOÁ LIST ===
    if (action === "delete-list") {
      Notiflix.Confirm.show(
        "Xác nhận",
        "Xoá list này? Tất cả card sẽ mất!",
        "Xoá",
        "Huỷ",
        async () => {
          Notiflix.Loading.circle("Đang xoá list...");
          try {
            const res = await fetch(
              `${API_BASE}/v1/board/${list._id}`,
              {
                method: "DELETE",
                credentials: "include",
              }
            );

            const data = await res.json();
            Notiflix.Loading.remove();

            if (!res.ok) {
              Notiflix.Notify.failure(
                data.message || "Bạn không có quyền xoá list"
              );
              return;
            }

            // ❗ KHÔNG xoá UI ở đây
            // UI sẽ xoá khi socket "list-deleted" bắn về

            Notiflix.Notify.success("Đã xoá list");
          } catch (err) {
            Notiflix.Notify.failure("Xoá list thất bại");
            console.error(err);
          }
        }
      );
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

  // CARD container
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";
  listEl.appendChild(cardsContainer);

  // Render các card
  (list.cards || []).forEach(card => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.dataset.id = card._id;

    // Tạo topBar (luôn có)
    const topBar = document.createElement("div");
    topBar.className = "card-topbar";
    // --- LABELS (nếu có) ---
    if (Array.isArray(card.labels) && card.labels.length > 0) {
      const labelsEl = document.createElement("div");
      labelsEl.className = "card-labels";

      card.labels.forEach(color => {
        const labelColor = document.createElement("div");
        labelColor.className = "card-label";
        labelColor.style.background = color;
        labelsEl.appendChild(labelColor);
      });

      topBar.appendChild(labelsEl); // thêm labels vào topBar
    }

    // --- CHECKBOX (luôn tạo) ---
    const footerEl = document.createElement("div");
    footerEl.className = "card-footer";

    // --- COMPLETE FOOTER (luôn có, nhưng rỗng) ---
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
    deleteBtn.src = "uploads/icons8-delete-128.png"; // sửa đúng path của bạn
    deleteBtn.className = "card-delete-btn";
    deleteBtn.alt = "Delete card"

    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      e.preventDefault();

      Notiflix.Confirm.show(
        "Xác nhận",
        "Xoá card này?",
        "Xoá",
        "Huỷ",
        async () => {
          deleteBtn.disabled = true;
          Notiflix.Loading.circle("Đang xoá card...");

          try {
            const res = await fetch(`${API_BASE}/v1/board/card/${card._id}`, {
              method: "DELETE",
              credentials: "include",
            });

            const data = await res.json();

            Notiflix.Loading.remove();
            deleteBtn.disabled = false;

            if (!res.ok) {
              Notiflix.Notify.failure(data.message || "Không thể xoá card");
              return;
            }

            // ✅ UI sẽ xoá khi socket bắn về
            Notiflix.Notify.success(data.message || "Đã xoá card");
          } catch (err) {
            Notiflix.Loading.remove();
            deleteBtn.disabled = false;
            Notiflix.Notify.failure("Xoá card thất bại");
            console.error(err);
          }
        }
      );
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
      checkboxEl
    };

    // LOAD LẦN ĐẦU
    if (card.complete === true) {
      renderCompleteElement();
    }


    // Thêm checkbox vào topBar
    topBar.appendChild(actionsWrap);
    cardEl.appendChild(topBar);

    cardEl.appendChild(topBar);

    // Tên card
    const titleEl = document.createElement("div");
    titleEl.className = "card-title";
    titleEl.textContent = card.name;
    cardEl.appendChild(titleEl);
    // --- Due date (trái) ---
    let dueEl = null;
    const leftEl = document.createElement("div");
    leftEl.style.display = "flex";
    leftEl.style.alignItems = "center";
    leftEl.style.gap = "4px"

    if (card.dueDate) {
      const date = new Date(card.dueDate).toLocaleDateString("vi-VN");

      dueEl = document.createElement("div");
      dueEl.className = "card-due";
      dueEl.style.display = "flex";
      dueEl.style.alignItems = "center";
      dueEl.style.gap = "4px";

      // Icon calendar
      const icon = document.createElement("img");
      icon.src = "uploads/clock-countdown-black.svg";
      icon.alt = "calendar";
      icon.style.width = "16px";
      icon.style.height = "16px";

      // Text date
      const dateText = document.createTextNode(` ${date}`);

      dueEl.appendChild(icon);
      dueEl.appendChild(dateText);
      leftEl.appendChild(dueEl);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // bỏ giờ phút giây

      const due = new Date(card.dueDate);
      due.setHours(0, 0, 0, 0); // bỏ giờ phút giây

      const diffDays = (due - now) / (1000 * 60 * 60 * 24);

      if (diffDays < 0) dueEl.style.backgroundColor = "#ff4d4f"; // đỏ quá hạn
      else if (diffDays <= 2) dueEl.style.backgroundColor = "#f2d600"; // vàng gần hạn
      else dueEl.style.backgroundColor = "#61bd4f"; // xanh còn nhiều thời gian
    }
    // --- Middle (attachments + comments) ---
    const midEl = document.createElement("div");
    midEl.className = "mid-footer"
    midEl.style.display = "flex";
    midEl.style.alignItems = "center";
    midEl.style.gap = "6px";


    // --- Attachments count ---
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


    // --- Comments count ---
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

    // --- Members (phải) ---
    const membersEl = document.createElement("div");
    membersEl.className = "card-members";
    membersEl.style.display = "flex";
    membersEl.style.gap = "4px";

    (card.assignedTo || []).forEach(userId => {
      const member = members.find(
        m => String(m.user?._id) === String(userId)
      );
      if (!member) return;

      const user = member.user;

      const memberEl = document.createElement("div");
      memberEl.className = "card-member";
      memberEl.title = `${user.username} (${user.email})`;

      if (user.avatar) {
        const img = document.createElement("img");
        img.src = `${API_BASE}/${user.avatar}`; // nhớ đúng path
        img.alt = user.username;
        img.className = "card-member-avatar";
        memberEl.appendChild(img);
      } else {
        memberEl.textContent = user.username
          ?.charAt(0)
          .toUpperCase();
      }

      membersEl.appendChild(memberEl);
    });


    // Thêm due date + members vào footer
    if (dueEl) footerEl.appendChild(dueEl);
    footerEl.appendChild(midEl);
    footerEl.appendChild(membersEl);
    // Thêm footer vào card
    cardEl.appendChild(footerEl);
    cardEl.appendChild(completeFooter);

    //checkbox render   
    // --- CLICK CHECKBOX ---
    checkboxEl.addEventListener("click", async (e) => {
      e.stopPropagation();

      const isComplete = checkboxEl.checked;

      // UI local (client A)
      if (isComplete) renderCompleteElement();
      else completeFooter.innerHTML = "";

      // Emit realtime
      socket.emit("card:completeToggle", {
        cardId: card._id,
        complete: isComplete
      });

      // Update DB
      try {
        await fetch(`${API_BASE}/v1/board/complete/${card._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complete: isComplete })
        });
      } catch (err) {
        console.error("Error updating card complete:", err);
      }
    });
    // ⭐ Sự kiện mở chi tiết
    cardEl.addEventListener("click", () => {
      openCardDetail(card._id);
    });

    cardsContainer.appendChild(cardEl);
  });


  // Nút Add card
  attachAddCard(listEl, list._id);

  return listEl;
}
//socket edit list
socket.on("list-updated", ({ listId, title }) => {
  const h3 = document.querySelector(`.list[data-id='${listId}'] .list-title`);
  if (h3) {
    h3.textContent = title;
  }
});

//socket xoá 
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
  const cardEl = document.querySelector(
    `.card[data-id="${cardId}"]`
  );
  if (cardEl) cardEl.remove();
});


socket.on("card:completeUpdated", ({ cardId, complete }) => {
  const ui = cardUIActions[cardId];
  if (!ui) return;

  // Cập nhật checkbox
  ui.checkboxEl.checked = complete;

  // Cập nhật UI
  if (complete) {
    ui.render();      // ✔ gọi hàm render đúng
  } else {
    const footer = ui.checkboxEl
      .closest(".card")
      .querySelector(".card-complete-footer");
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

  // mở form
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
        behavior: "smooth"
      });
    }, 100);
  });

  // hủy
  cancelBtn.addEventListener("click", () => {
    inputContainer.classList.remove("show");
    setTimeout(() => {
      inputContainer.remove();
    }, 300);
    addCardBtn.classList.remove("hidden");
    input.value = "";
  });

  // thêm card
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
      body: JSON.stringify({ name: title })
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

  const listEl = createListElement(list); // dùng lại function
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
    const res = await fetch(`${API_BASE}/v1/board/${boardId}/invite`, {
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
  });


  // Click ra ngoài sẽ ẩn form
  document.addEventListener("click", (e) => {
    if (!inviteFormContainer.contains(e.target) && e.target !== inviteIcon) {
      inviteIcon.style.display = "flex";
      inviteFormContainer.classList.add("hidden");
    }
  });
});

// menu
const moreBtn = document.getElementById("moreBtn");
const moreMenu = document.getElementById("moreMenu");
const settingOpen = document.getElementById("settingOpen");

moreBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  moreMenu.classList.toggle("hidden");
});

// click ngoài → đóng menu
document.addEventListener("click", () => {
  moreMenu.classList.add("hidden");
});

// click trong menu không đóng
moreMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  if (e.target.closest("#settingMenu")) {
    moreMenu.classList.add("hidden");
    settingOpen.classList.remove("hidden");
  }
});
const memberModal = document.getElementById("memberModal");
function renderMembersboard(members) {
  const container = document.getElementById("memberForm");
  container.innerHTML = "";

  if (!members || members.length === 0) {
    container.innerHTML = "<p>Không có thành viên</p>";
    return;
  }

  members.forEach(member => {
    const row = document.createElement("div");
    row.className = "member-row";

    /* ===== Avatar ===== */
    const avatar = document.createElement("div");
    avatar.className = "member-avatar";

    if (member.user.avatar) {
      avatar.style.backgroundImage = `url('${member.user.avatar}')`;
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
    } else {
      avatar.textContent =
        member.user.username?.charAt(0).toUpperCase() || "?";
    }

    /* ===== Info ===== */
    const info = document.createElement("div");
    info.className = "member-info";
    info.innerHTML = `
      <div class="member-name">${member.user.username}</div>
      <div class="member-email">${member.user.email}</div>
    `;

    /* ===== Role ===== */
    const roleWrap = document.createElement("div");
    roleWrap.className = "member-role";

    // OWNER hiển thị text
    if (member.role === "owner") {
      const ownerLabel = document.createElement("span");
      ownerLabel.className = "owner-badge";
      ownerLabel.textContent = "Owner";
      roleWrap.appendChild(ownerLabel);
    } else {
      const select = document.createElement("select");
      select.dataset.userId = member.user._id; // ✅ FIX

      ["member", "admin"].forEach(r => {
        const option = document.createElement("option");
        option.value = r;
        option.textContent = r.charAt(0).toUpperCase() + r.slice(1);
        if (member.role === r) option.selected = true;
        select.appendChild(option);
      });

      // 🔒 CHỈ OWNER ĐƯỢC CHỈNH
      select.disabled = currentboardRole !== "owner";

      roleWrap.appendChild(select);
    }

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(roleWrap);

    container.appendChild(row);
  });
}

//chỉnh role
document.getElementById("memberForm").addEventListener("change", async (e) => {
  const select = e.target.closest("select");
  if (!select) return;

  // 🔒 chỉ owner mới được chỉnh (phòng hờ)
  if (window.currentboardRole !== "owner") {
    alert("Bạn không có quyền chỉnh role");
    return;
  }

  const userId = select.dataset.userId;
  const newRole = select.value;

  try {
    const res = await fetch(
      `${API_BASE}/v1/board/${currentBoardId}/member-role`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          role: newRole
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Không thể cập nhật role");
      return;
    }

    // ✅ cập nhật local state
    const member = members.find(m => m.user._id === userId);
    if (member) member.role = newRole;

    // (optional) re-render nếu muốn
    renderMembersboard(members);

  } catch (err) {
    console.error("Update role error:", err);
    alert("Lỗi server");
  }
});


settingOpen.addEventListener("click", (e) => {
  e.stopPropagation();

  if (e.target.closest("#settingOpen .back-btn")) {
    settingOpen.classList.add("hidden");
    moreMenu.classList.remove("hidden");
  }
  const manageMemberItem = e.target.closest(".manager-member");
  if (manageMemberItem) {
    settingOpen.classList.add("hidden");
    memberModal.classList.remove("hidden");
    renderMembersboard(members);
  }
});

// click ngoài → đóng tất cả
document.addEventListener("click", () => {
  moreMenu.classList.add("hidden");
  settingOpen.classList.add("hidden");
});

// đóng modal
memberModal.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("modal-overlay") ||
    e.target.classList.contains("close-modal") ||
    e.target.classList.contains("cancel")
  ) {
    memberModal.classList.add("hidden");
  }
});


const addList = document.querySelector(".add-list");
const showAddListBtn = document.getElementById("showAddListBtn");
const addListForm = document.getElementById("addListForm");
const cancelAddListBtn = document.getElementById("cancelAddListBtn");

// Click vào div cha → mở form
addList.addEventListener("click", () => {
  showAddListBtn.style.display = "none";
  addListForm.style.display = "flex";
  newListTitle.focus();
});

// Ngăn click trong form làm đóng/mở lại
addListForm.addEventListener("click", (e) => {
  e.stopPropagation();
});

// Cancel → quay lại nút Add list
cancelAddListBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  addListForm.style.display = "none";
  showAddListBtn.style.display = "inline-block";
});
const visibilityBtn = document.querySelector(".fa-eye-slash").parentElement;
const visibilityMenu = document.getElementById("visibilityMenu");


visibilityBtn.addEventListener("click", () => {
  moreMenu.classList.add("hidden");
  visibilityMenu.classList.remove("hidden");
  console.log("visibility hiện tại là ", boardData.visibility)
  setActiveVisibility(boardData.visibility);
});

//quay lại menu
visibilityMenu.addEventListener("click", (e) => {
  e.stopPropagation();

  if (e.target.closest("#visibilityMenu .back-btn")) {
    visibilityMenu.classList.add("hidden");
    moreMenu.classList.remove("hidden");
  }
});


//click chọn visibility
document.querySelectorAll(".visibility-option").forEach(item => {
  item.addEventListener("click", async () => {
    const newVisibility = item.dataset.value;

    // Không gọi API nếu chọn lại cái cũ
    if (newVisibility === boardData.visibility) {
      visibilityMenu.classList.add("hidden");
      moreMenu.classList.remove("hidden");
      return;
    }

    try {
      Notiflix.Loading.standard("Updating...");
      const res = await fetch(
        `${API_BASE}/v1/board/${boardId}/visibility`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ visibility: newVisibility })
        }
      );

      const data = await res.json();
      Notiflix.Loading.remove();
      if (!res.ok) throw new Error(data.message || "Update failed");

      // update state
      boardData.visibility = data.visibility;

      // update UI
      setActiveVisibility(boardData.visibility);

      // notify success
      Notiflix.Notify.success("Board visibility updated");

      visibilityMenu.classList.add("hidden");
      moreMenu.classList.remove("hidden");

    } catch (err) {
      Notiflix.Notify.failure(err.message || "Something went wrong");
    }
  });
});



//lấy visibility

function setActiveVisibility(visibility) {
  document.querySelectorAll(".visibility-option").forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.value === visibility
    );
  });
}



// card detail
async function openCardDetail(cardId) {
  currentCardId = cardId; // lưu id card hiện tại
  const res = await fetch(`${API_BASE}/v1/board/get-card/cards/${cardId}`, {
    credentials: "include"
  });
  const result = await res.json();
  if (!result.success) return alert(result.message || "Lỗi khi tải chi tiết card");

  currentCard = result.data;
  socket.emit("card:join", currentCard._id);
  showCardDetailModal(currentCard);
}

function showCardDetailModal(card) {
  const modal = document.getElementById("cardDetailModal");
  // Assigned members
  assignedMembers = (card.assignedTo || []).map(m => m._id);
  // Render assigned member đầy đủ
  renderAssignedMembers();
  // Labels - gắn 1 lần duy nhất
  const labelsEl = document.getElementById("cardLabels");
  labelsEl.innerHTML = "";

  // render tất cả label đã có
  (card.labels || []).forEach(color => {
    addLabelToCard(color);
  });

  const addLabelBtn = document.getElementById("addLabelBtn");
  addLabelBtn.removeEventListener("click", addLabelBtn._listener);
  addLabelBtn._listener = () => openLabelPopup(currentCard._id);
  addLabelBtn.addEventListener("click", addLabelBtn._listener);
  renderLabelsFromCard(card)

  // Title
  const cardTitleEl = document.getElementById("cardTitle");
  cardTitleEl.contentEditable = true;
  cardTitleEl.textContent = currentCard.name;

  cardTitleEl.addEventListener("input", () => {
    const newName = cardTitleEl.textContent.trim();
    if (!newName || newName === currentCard.name) return;

    currentCard.name = newName;

    socket.emit("card:updateName", { cardId: currentCard._id, name: newName });

  });

  // Description
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
    const mm = String(due.getMonth() + 1).padStart(2, '0');
    const dd = String(due.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;

    const hh = String(due.getHours()).padStart(2, '0');
    const min = String(due.getMinutes()).padStart(2, '0');
    timeInput.value = `${hh}:${min}`;

    statusEl.textContent = formatDateDMY(due) + " đến hạn";
  } else {
    dateInput.value = "";
    timeInput.value = "";
    statusEl.textContent = "";
  }

  updateDueStatus();

  // Lắng nghe khi người dùng chỉnh
  dateInput.addEventListener("change", () => { updateDueStatus(); saveDueDate(); });
  timeInput.addEventListener("change", () => { updateDueStatus(); saveDueDate(); });
  // Comments
  renderComments(card.comments || []);

  // Attachments
  renderAttachments(card);

  // Hiển thị modal
  modal.style.display = "flex";
  document.getElementById("closeModal").onclick = () => modal.style.display = "none";
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
// Hàm hiển thị attachments hiện có
function renderAttachments(card) {
  const attachmentsEl = document.getElementById("cardAttachments");
  attachmentsEl.innerHTML = "";

  (card.attachments || []).forEach((fileObj, index) => {
    const { name, data } = fileObj;
    const li = document.createElement("li");

    // Preview ảnh
    if (data.startsWith("data:image")) {
      const img = document.createElement("img");
      img.src = data;
      img.style.maxWidth = "150px";
      img.style.display = "block";
      img.style.marginBottom = "5px";
      img.onclick = e => e.stopPropagation();
      li.appendChild(img);
    } else {
      // Hiển thị tên file
      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;
      nameSpan.style.marginRight = "10px";
      li.appendChild(nameSpan);
    }

    // Nút mở/download
    const openBtn = document.createElement("button");
    openBtn.textContent = "Mở / Download";
    openBtn.onclick = e => {
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

    // Nút xóa
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "x";
    removeBtn.style.marginLeft = "5px";
    removeBtn.onclick = e => {
      e.stopPropagation();
      removeAttachment(index);
    };
    li.appendChild(removeBtn);

    attachmentsEl.appendChild(li);
  });
}

socket.on("card:nameUpdated", ({ cardId, name }) => {
  // 1️⃣ Update state
  boardData.lists.forEach(list => {
    const c = (list.cards || []).find(c => c._id === cardId);
    if (c) c.name = name;
  });

  // 2️⃣ Update list view
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




//thêm file attachments
attachmentInput.onchange = async () => {
  const files = Array.from(attachmentInput.files);

  for (let file of files) {
    if (!currentCard.attachments?.some(f => f.name === file.name && f.size === file.size)) {
      const fileObj = { name: file.name, data: await fileToBase64(file) };
      currentCard.attachments ??= [];
      currentCard.attachments.push(fileObj);

      socket.emit("card:updateAttachments", {
        cardId: currentCardId,
        file: fileObj
      });
    }
  }
  console.log("render from onchange");

  attachmentInput.value = "";
};


function removeAttachment(index) {
  const file = currentCard.attachments[index];
  currentCard.attachments.splice(index, 1);
  // Gửi sự kiện xóa file
  socket.emit("card:removeAttachment", { cardId: currentCard._id, fileName: file.name });
}

function loadAssignList(filter = "") {
  const assignListEl = document.getElementById("assignList");
  assignListEl.innerHTML = "";

  if (!Array.isArray(members)) return;

  members
    .filter(m =>
      m.user &&
      m.user.username.toLowerCase().includes(filter.toLowerCase())
    )
    .forEach(m => {
      const li = document.createElement("li");
      li.dataset.id = m.user._id;
      li.className = "assign-member-item";

      // Avatar tròn
      const avatar = document.createElement("div");
      avatar.className = "member-avatar";
      avatar.textContent = m.user.username
        ?.charAt(0)
        .toUpperCase() || "?";

      // Tên member
      const name = document.createElement("span");
      name.className = "member-name";
      name.textContent = m.user.username;

      li.appendChild(avatar);
      li.appendChild(name);

      // Nếu member đã assign → đánh dấu
      if (assignedMembers.includes(m.user._id)) {
        li.classList.add("assigned");
      }

      // Click assign member
      li.addEventListener("click", () => {
        assignMemberToCard(m.user._id);
      });

      assignListEl.appendChild(li);
    });
}


// Hiển thị popup
document.getElementById("AssignedMember-btn").addEventListener("click", () => {
  const popup = document.getElementById("assignPopup");

  popup.style.display =
    (popup.style.display === "none" || popup.style.display === "")
      ? "flex"
      : "none";

  loadAssignList(); // load member
});

document.getElementById("assign-close").addEventListener("click", () => {
  document.getElementById("assignPopup").style.display = "none";
});

window.addEventListener("click", (e) => {
  const popup = document.getElementById("assignPopup");
  if (e.target === popup) popup.style.display = "none";
});



// Tìm kiếm member
document.getElementById("assignSearch").addEventListener("input", (e) => {
  loadAssignList(e.target.value);
});


function assignMemberToCard(userId) {
  console.log("assign user:", userId);
  console.log("currentCard:", currentCard);

  if (!currentCard || !currentCard._id) {
    console.error("❌ currentCard chưa có");
    return;
  }

  socket.emit("card:assignMember", {
    cardId: currentCard._id,
    userId
  });
}


function removeMemberFromCard(userId) {
  if (!currentCard || !currentCard._id) return;
  socket.emit("card:removeMember", {
    cardId: currentCard._id,
    userId
  });
}

// Render assigned
function renderAssignedMembers() {
  const cardAssignedEl = document.getElementById("cardAssigned");
  cardAssignedEl.innerHTML = "";

  if (!Array.isArray(assignedMembers) || !Array.isArray(members)) return;

  assignedMembers.forEach(userId => {
    const member = members.find(
      m => m.user && m.user._id === userId
    );

    if (!member) return;

    const li = document.createElement("li");

    // Avatar
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = member.user.username
      ?.charAt(0)
      .toUpperCase() || "?";

    // Name
    const name = document.createElement("span");
    name.className = "member-name";
    name.textContent = member.user.username;

    // Remove button
    const removeBtn = document.createElement("span");
    removeBtn.className = "remove-member";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      removeMemberFromCard(member.user._id);
    });

    li.appendChild(avatar);
    li.appendChild(name);
    li.appendChild(removeBtn);
    cardAssignedEl.appendChild(li);
  });
}

function updateBoardViewAssignedUI(cardId, updated) {
  console.log("🧪 members:", members);
  console.log("🧪 updated assigned:", updated);

  const cardEl = document.querySelector(`.card[data-id='${cardId}']`);
  if (!cardEl) {
    requestAnimationFrame(() =>
      updateBoardViewAssignedUI(cardId, updated)
    );
    return;
  }

  const membersEl = cardEl.querySelector(".card-members");
  if (!membersEl) return;

  membersEl.innerHTML = "";

  if (!Array.isArray(updated) || !Array.isArray(members)) return;

  updated.forEach(userId => {
    const member = members.find(
      m => String(m.user?._id) === String(userId)
    );
    if (!member) return;

    const avatar = document.createElement("div");
    avatar.className = "card-member";
    avatar.title = `${member.user.username} (${member.user.email})`;
    avatar.textContent = member.user.username
      ?.charAt(0)
      .toUpperCase();

    membersEl.appendChild(avatar);
  });
}


function updateAssignedMembersInState(cardId, updated) {
  if (!boardData?.lists || !Array.isArray(updated)) return;

  for (const list of boardData.lists) {
    const card = list.cards?.find(c => c._id === cardId);
    console.log("Updated assigned:", cardId, updated);
    if (card) {
      card.assignedTo = [...updated]; // clone để tránh reference bug
      break;
    }
  }
}



// SOCKET UPDATE
socket.off("card:assignedMembersUpdated");
socket.on("card:assignedMembersUpdated", ({ cardId, assignedMembers: updated }) => {
  if (currentCard && currentCard._id === cardId) {
    assignedMembers = updated;
    renderAssignedMembers();
  }

  // đồng thời cập nhật state trong boardData
  updateAssignedMembersInState(cardId, updated);

  // và update UI ngoài board
  updateBoardViewAssignedUI(cardId, updated);
});





// Nhận realtime
socket.off("card:labelAdded");
socket.on("card:labelAdded", ({ cardId, color }) => {
  boardData.lists.forEach(list => {
    const card = list.cards.find(c => c._id === cardId);
    if (card && !card.labels.includes(color)) {
      card.labels.push(color);
    }
  });
  renderBoardWithLists();
  if (currentCard && currentCard._id === cardId) {
    currentCard.labels.push(color);

    // Nếu popup đang mở
    const labelsEl = document.getElementById("cardLabels");
    if (labelsEl) {
      addLabelToCard(color); // thêm trực tiếp vào popup DOM
    }
  }
});

// Mảng màu
const colors = ["#61bd4f", "#f2d600", "#ff9f1a", "#eb5a46", "#c377e0"];

// Thêm label vào DOM
function addLabelToCard(color) {
  const labelsEl = document.getElementById("cardLabels");
  if (Array.from(labelsEl.children).some(span => span.dataset.color === color)) return;

  const span = document.createElement("span");
  span.classList.add("card-label");
  span.style.display = "inline-block";
  span.style.backgroundColor = color;
  span.style.width = "30px";
  span.style.height = "30px";
  span.style.gap = "10px"
  span.dataset.color = color;
  labelsEl.appendChild(span);

}

// Popup chọn màu
function openLabelPopup(cardId) {
  const popup = document.getElementById("labelPopup");
  const colorsContainer = document.getElementById("labelColors");
  colorsContainer.innerHTML = "";

  const currentLabels = currentCard.labels || [];

  colors.forEach(color => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("color-item");
    wrapper.style.backgroundColor = color;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("color-checkbox");
    checkbox.checked = currentLabels.includes(color);

    // Click checkbox để chọn/bỏ
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

  Array.from(labelsEl.children).forEach(span => {
    if (span.dataset.color === color) {
      span.remove();
    }
  });

  // remove trong client copy
  currentCard.labels = currentCard.labels.filter(c => c !== color);
}

socket.on("card:labelRemoved", ({ cardId, color }) => {
  boardData.lists.forEach(list => {
    const card = list.cards.find(c => c._id === cardId);
    if (card) {
      card.labels = card.labels.filter(c => c !== color);
    }
  });
  renderBoardWithLists();

  if (currentCard && currentCard._id === cardId) {
    currentCard.labels = currentCard.labels.filter(c => c !== color);
    const labelsEl = document.getElementById("cardLabels");
    if (labelsEl) removeLabelFromCard(color);
  }
});


// Nút tắt popup
document.getElementById("closeLabelPopup").onclick = () => {
  document.getElementById("labelPopup").style.display = "none";
};
// Khi mở modal, render label từ DB
function renderLabelsFromCard(card) {
  const labelsEl = document.getElementById("cardLabels");
  labelsEl.innerHTML = "";
  (card.labels || []).forEach(color => addLabelToCard(color));
}

//socket attackment
socket.on("card:attachmentsUpdated", ({ cardId, attachments }) => {
  if (currentCardId !== cardId) return;

  currentCard.attachments = attachments; // luôn đồng bộ DB

  console.log("render from socket");
  renderAttachments(currentCard);
});


socket.on("card:attachmentRemoved", ({ fileName }) => {
  currentCard.attachments = currentCard.attachments.filter(f => f.name !== fileName);
  renderAttachments(currentCard);
  renderBoardWithLists()
});

// due date
// Cập nhật giá trị khi mở card
// Format hiển thị DD/MM/YYYY HH:MM
function formatDateDMY(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

// Lấy giá trị từ input date + time
function getDueDateTime() {
  const dateInput = document.getElementById("cardDueDate").value;
  const timeInput = document.getElementById("cardDueTime").value || "00:00";

  if (!dateInput) return null;

  const [yyyy, mm, dd] = dateInput.split("-").map(Number);
  const [hh, min] = timeInput.split(":").map(Number);

  const due = new Date(yyyy, mm - 1, dd, hh, min);
  return due;
}

// Cập nhật trạng thái hiển thị
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

// Gửi lên server + realtime
function saveDueDate() {
  const due = getDueDateTime();
  if (!due) return;

  currentCard.dueDate = due;

  socket.emit("card:updateDueDate", {
    cardId: currentCard._id,
    dueDate: due
  });
}

// Lắng nghe realtime
socket.on("card:dueDateUpdated", ({ dueDate }) => {
  const due = new Date(dueDate);
  const dateInput = document.getElementById("cardDueDate");
  const timeInput = document.getElementById("cardDueTime");

  // Hiển thị input theo local
  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, '0');
  const dd = String(due.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;

  const hh = String(due.getHours()).padStart(2, '0');
  const min = String(due.getMinutes()).padStart(2, '0');
  timeInput.value = `${hh}:${min}`;

  updateDueStatus();
  renderBoardWithLists()
});

//comment
// Khi mở card, render comment
let commentsCache = []; // lưu comment để khỏi render lại toàn bộ

function renderComments(comments = []) {
  commentsCache = comments;
  const el = document.getElementById("cardComments");
  el.innerHTML = "";
  comments.forEach(c => appendComment(c));
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
  // 1. Tìm card trong boardData
  let card = null;
  for (const list of boardData.lists) {
    const found = (list.cards || []).find(c => c._id === cardId);
    if (found) {
      card = found;
      break;
    }
  }

  if (!card) return console.log("Không thấy card trong boardData");

  // 2. Tăng số comment trong boardData
  card.comments.push(comment);

  // 3. Lấy element card ngoài board
  const cardEl = document.querySelector(`.card[data-id='${cardId}']`);
  if (!cardEl) return console.log("Không thấy cardEL");

  const countEl = cardEl.querySelector(".comment-count");
  if (!countEl) return console.log("Không thấy comment-count");

  // 4. Cập nhật lại số
  countEl.textContent = card.comments.length;
}

//kéo ngang bằng chuột
let isDown = false, startX, scrollLeft;
const c = document.getElementById("board-content");

c.onmousedown = e => {
  isDown = true;
  startX = e.pageX;
  scrollLeft = c.scrollLeft;
};

c.onmouseup = c.onmouseleave = () => isDown = false;

c.onmousemove = e => {
  if (window.getSelection().toString()) return;
  // ❌ scroll dọc trong card → bỏ qua
  if (e.target.closest(".card, input, textarea")) return;
  if (!isDown) return;
  c.scrollLeft = scrollLeft - (e.pageX - startX);
};


// activity
const activityMenu = document.getElementById("activityMenu");

document.querySelector(".fa-clock-rotate-left")
  .closest(".menu-item")
  .addEventListener("click", () => {
    moreMenu.classList.add("hidden");
    activityMenu.classList.remove("hidden");
    loadActivities();
    Notiflix.Loading.circle("Đang tải...");
  });

// nút back về

activityMenu.addEventListener("click", (e) => {
  e.stopPropagation();

  if (e.target.closest("#activityMenu .back-btn")) {
    activityMenu.classList.add("hidden");
    moreMenu.classList.remove("hidden");
  }
});

//back về trang list board
const backlistboard = document.getElementById("back-list-board")
backlistboard.addEventListener("click",(e) =>{
  e.stopPropagation();
  window.history.back();
})

// đổ dữ liệu acitivity

function loadActivities() {
  const activityList = document.getElementById("activityList");
  fetch(`${API_BASE}/v1/activitys/boards/${boardId}/activities?limit=30`)
    .then(res => res.json())
    .then(data => {
      console.log("activity-logs", data)
      Notiflix.Loading.remove();
      if (!data.length) {
        activityList.innerHTML = "<p>No activity yet</p>";
        return;
      }
      activityList.innerHTML = "";

      data.forEach(act => {
        const item = document.createElement("div");
        item.className = "activity-item";

        const username = act.userId?.username || "Someone";
        const avatar = act.userId?.avatar || null;
        const firstChar = username.charAt(0).toUpperCase();

        item.innerHTML = `
    <div class="activity-avatar">
      ${avatar
            ? `<img title="${act.userId.email}" src="${avatar}" alt="${username}">`
            : `<span class="avatar-fallback" title="${act.userId.email}">${firstChar}</span>`
          }
    </div>

    <div class="activity-content">
      <div class="activity-text">
        <b>${username}</b>
        ${renderActivityText(act)}
      </div>
      <div class="activity-time">
        ${formatTime(act.createdAt)}
      </div>
    </div>
  `;

        activityList.appendChild(item);
      });

    });
}
function renderActivityText(act) {
  switch (act.action) {
    case "BOARD_RENAME":
      return ` changed board title from <b>${act.data.oldValue}</b> to <b>${act.data.newValue}</b>`;
    case "LIST_RENAME":
      return ` changed list title from <b>${act.data.oldValue}</b> to <b>${act.data.newValue}</b>`;
    case "CREATE_LIST":
      return ` added list <b>${act.target.title}</b>`;
    case "DELETE_LIST":
      return ` deleted list <b>${act.target.title}</b>`;
    case "CREATE_CARD":
      return ` added card <b>${act.target.title}</b>`;
    case "DELETE_CARD":
      return ` deleted card <b>${act.target.title}</b>`;
    case "CLEAR_CARDS_IN_LIST":
      return ` cleared <b>${act.data.extra.cardCount}</b> cards in list <b>${act.target.title}</b>`;
    default:
      return ` ${act.action || "did something"}`;
  }
}
function formatTime(date) {
  return new Date(date).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
