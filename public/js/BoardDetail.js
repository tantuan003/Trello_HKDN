
import { socket } from "../js/socket.js";
// ===================================================================
// Lấy boardId từ URL
// ===================================================================
const urlParams = new URLSearchParams(window.location.search);
let boardId = urlParams.get("id");
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

async function renderBoardWithLists() {
  if (!currentBoardId) {
    console.error("❌ currentBoardId chưa có!");
    return;
  }

  try {
    const res = await fetch(`http://localhost:8127/v1/board/${currentBoardId}`);
    const data = await res.json();
    socket.emit("joinBoard", currentBoardId);

    if (!data.board) return;

    const { background, lists } = data.board;
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.style.display = "none";

    // Reset layout khi không có sidebar
    const shell = document.getElementById("app-shell");
    if (shell) {
      shell.style.display = "block";         // không còn flex/grid
      shell.style.gridTemplateColumns = "";  // xoá cột sidebar
      shell.style.width = "100%";
    }
    const boardTitle = document.getElementById("boardTitle");
    if(boardTitle){
      boardTitle.textContent=data.board.name
    }



    // ⬇️ Áp dụng background vào trang
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
renderBoardWithLists();
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

  // Title
  const h3 = document.createElement("h3");
  h3.textContent = list.name;
  listEl.appendChild(h3);

  // CARD container
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";
  listEl.appendChild(cardsContainer);

  // Render các card
  (list.cards || []).forEach(card => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.textContent = card.name;

    // ⭐ Thêm sự kiện click mở cardDetail
    cardEl.addEventListener("click", () => {
      openCardDetail(card._id); // Hàm gọi API lấy chi tiết card
    });

    cardsContainer.appendChild(cardEl);
  });

  // Nút Add card
  attachAddCard(listEl, list._id);

  return listEl;
}


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
      const res = await fetch(`http://localhost:8127/v1/board/create-card/${listId}`, {
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
  listEl.appendChild(cardEl);
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
    await fetch(`http://localhost:8127/v1/board/create-list/${currentBoardId}`, {
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
socket.on("newList", (list) => {
  console.log("📩 Received new list:", list);

  const listEl = createListElement(list); // dùng lại function
  listsContainer.appendChild(listEl);
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

// card detail
async function openCardDetail(cardId) {
  try {
    const res = await fetch(`http://localhost:8127/v1/board/get-card/cards/${cardId}`, {
      credentials: "include"
    });
    const result = await res.json();

    if (!result.success) {
      alert(result.message || "Lỗi khi tải chi tiết card");
      return;
    }

    const card = result.data;
    showCardDetailModal(card); // Hiển thị modal hoặc trang card detail

  } catch (err) {
    console.error("openCardDetail error:", err);
    alert("Lỗi khi tải chi tiết card");
  }
}
function showCardDetailModal(card) {
  const modal = document.getElementById("cardDetailModal");

  document.getElementById("cardTitle").textContent = card.name;
  document.getElementById("cardDescription").textContent = card.description || "";
  document.getElementById("cardList").textContent = card.list?.name || "Unknown list";

  // Assigned To
  const assignedEl = document.getElementById("cardAssigned");
  assignedEl.innerHTML = "";
  (card.assignedTo || []).forEach(user => {
    const li = document.createElement("li");
    li.textContent = user.username || "Unknown";
    assignedEl.appendChild(li);
  });

  // Labels
  const labelsEl = document.getElementById("cardLabels");
  labelsEl.innerHTML = "";
  (card.labels || []).forEach(label => {
    const span = document.createElement("span");
    span.textContent = label;
    labelsEl.appendChild(span);
  });

  // Due date
  document.getElementById("cardDueDate").value = card.dueDate
  ? new Date(card.dueDate).toISOString().split("T")[0]
  : "";

  // Comments
  const commentsEl = document.getElementById("cardComments");
  commentsEl.innerHTML = "";
  (card.comments || []).forEach(comment => {
    const li = document.createElement("li");
    li.textContent = `${comment.user?.username || "Unknown"}: ${comment.text}`;
    commentsEl.appendChild(li);
  });

  // Attachments
  const attachmentsEl = document.getElementById("cardAttachments");
  attachmentsEl.innerHTML = "";
  (card.attachments || []).forEach(file => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = file;
    a.target = "_blank";
    a.textContent = file.split("/").pop(); // chỉ tên file
    li.appendChild(a);
    attachmentsEl.appendChild(li);
  });

  // Hiển thị modal
  modal.style.display = "block";
  document.getElementById("save-card-btn").onclick=()=>{
    saveCardChanges(card._id);

  };

  // Nút đóng
  document.getElementById("closeModal").onclick = () => {
    modal.style.display = "none";
  };

  // Click ngoài modal đóng
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}
function saveCardChanges(cardId) {
  const updatedCard = {
    name: document.getElementById("cardTitle").textContent,
    description: document.getElementById("cardDescription").textContent,
    dueDate:document.getElementById("cardDueDate").value,
    labels: Array.from(document.querySelectorAll("#cardLabels span")).map(s => s.textContent)
  };

  fetch(`http://localhost:8127/v1/board/update-card/cards/${cardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updatedCard)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      Toastify({
        text: "lưu thành công!",
        duration: 3000,          // 3 giây
        gravity: "top",          // xuất hiện ở trên
        position: "right",       // bên phải
        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
        close: true
      }).showToast();
    } else {
      Toastify({
        text: data.message || "Lưu thất bại",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #e52d27, #b31217)",
        close: true
      }).showToast();
    }
  })
  .catch(err => {
    console.error(err);
    Toastify({
      text: "Error occurred while saving",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "linear-gradient(to right, #e52d27, #b31217)",
      close: true
    }).showToast();
  });
}

