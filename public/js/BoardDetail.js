import { socket } from "../js/socket.js";
// ===================================================================
// Lấy boardId từ URL
// ===================================================================
const urlParams = new URLSearchParams(window.location.search);
let boardId = urlParams.get("id");
let members = "";
const attachmentInput = document.getElementById("attachmentInput");
let currentCardId = null;
let currentCard = []
let currentAttachments = []; // khai báo ở đầu file
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
    members = data.board.members;
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
    if (boardTitle) {
      boardTitle.textContent = data.board.name
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
  currentCardId = cardId; // lưu id card hiện tại
  const res = await fetch(`http://localhost:8127/v1/board/get-card/cards/${cardId}`, {
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
  const cardAssignedEl = document.getElementById("cardAssigned");
cardAssignedEl.innerHTML = "";

(card.assignedTo || []).forEach(member => {
  const li = document.createElement("li");
  li.textContent = member.username;
  li.dataset.id = member._id;
  cardAssignedEl.appendChild(li);
});


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
  cardTitleEl.textContent = card.name;
  cardTitleEl.addEventListener("input", () => {
    const newName = cardTitleEl.textContent.trim();
    currentCard.name = newName;
    socket.emit("card:updateName", { cardId: card._id, name: newName });
  });
  socket.off("card:nameUpdated");
  socket.on("card:nameUpdated", ({ name }) => {
    currentCard.name = name;
    cardTitleEl.textContent = name;
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

//thêm file attachments
attachmentInput.addEventListener("change", async () => {
  const files = Array.from(attachmentInput.files);

  for (let file of files) {
    // tránh trùng lặp
    if (!currentCard.attachments?.some(f => f.name === file.name && f.size === file.size)) {
      const fileObj = { name: file.name, data: await fileToBase64(file) };

      if (!currentCard.attachments) currentCard.attachments = [];
      currentCard.attachments.push(fileObj);

      // emit lên server
      socket.emit("card:updateAttachments", { cardId: currentCardId, file: fileObj });
    }
  }

  attachmentInput.value = "";
  renderAttachments(currentCard);
});

function removeAttachment(index) {
  const file = currentCard.attachments[index];
  currentCard.attachments.splice(index, 1);
  renderAttachments(currentCard);

  // Gửi sự kiện xóa file
  socket.emit("card:removeAttachment", { cardId: currentCard._id, fileName: file.name });
}

function loadAssignList(filter = "") {
  const assignListEl = document.getElementById("assignList");
  assignListEl.innerHTML = "";

  members
    .filter(member => member.username.toLowerCase().includes(filter.toLowerCase()))
    .forEach(member => {
      const li = document.createElement("li");
      li.dataset.id = member._id; // <- thêm id vào đây

      const avatar = document.createElement("div");
      avatar.className = "member-avatar";

      const name = document.createElement("span");
      name.className = "member-name";
      name.textContent = member.username;

      li.appendChild(avatar);
      li.appendChild(name);

      li.addEventListener("click", () => {
        assignMemberToCard(member._id);
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



// Tìm kiếm
document.getElementById("assignSearch").addEventListener("input", (e) => {
  loadAssignList(e.target.value);
});
let assignedMembers = []; // lưu member._id đã assign

function assignMemberToCard(userId) {
  socket.emit("card:assignMember", {
    cardId: currentCard._id,
    userId
  });
}

function renderAssignedMembers() {
  const cardAssignedEl = document.getElementById("cardAssigned");
  cardAssignedEl.innerHTML = ""; // clear UI

  assignedMembers.forEach(id => {
    const member = members.find(m => m._id === id);
    if (!member) return;

    const li = document.createElement("li");
    li.textContent = member.username;
    li.dataset.id = member._id;
    cardAssignedEl.appendChild(li);
  });
}



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
  span.style.gap= "10px"
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
socket.on("card:labelRemoved", ({ color }) => {
  removeLabelFromCard(color);
});


// Nút tắt popup
document.getElementById("closeLabelPopup").onclick = () => {
  document.getElementById("labelPopup").style.display = "none";
};
// Nhận realtime
socket.off("card:labelAdded");
socket.on("card:labelAdded", ({ cardId: updatedCardId, color }) => {
  if (!currentCard || updatedCardId !== currentCard._id) return;
  addLabelToCard(color);
});

// Khi mở modal, render label từ DB
function renderLabelsFromCard(card) {
  const labelsEl = document.getElementById("cardLabels");
  labelsEl.innerHTML = "";
  (card.labels || []).forEach(color => addLabelToCard(color));
}

//socket attackment
socket.on("card:attachmentsUpdated", ({ file }) => {
  if (!Array.isArray(currentCard.attachments)) currentCard.attachments = [];
  currentCard.attachments.push(file);

  // Render lại
  renderAttachments(currentCard);
});

socket.on("card:attachmentRemoved", ({ fileName }) => {
  currentCard.attachments = currentCard.attachments.filter(f => f.name !== fileName);
  renderAttachments(currentCard);
});

// socket assign member
socket.off("card:memberAssigned");
socket.on("card:memberAssigned", ({ cardId, assignedTo }) => {
  if (!currentCard || currentCard._id !== cardId) return;

  // Cập nhật danh sách assigned
  assignedMembers = assignedTo.map(m => m._id);

  renderAssignedMembers();
});

