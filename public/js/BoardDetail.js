
import { socket } from "../js/socket.js";
// ===================================================================
// Lấy boardId từ URL
// ===================================================================
const urlParams = new URLSearchParams(window.location.search);
let boardId = urlParams.get("id");
let members = "";
const attachmentInput = document.getElementById("attachmentInput");
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
function openAttachment(fileDataURL, fileName = "file") {
  // Chia base64 và type
  const [meta, base64Data] = fileDataURL.split(",");
  const mime = meta.match(/:(.*?);/)[1];

  // Chuyển base64 -> byte array
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  // Tạo Blob
  const blob = new Blob([byteArray], { type: mime });

  // Tạo URL tạm thời
  const blobUrl = URL.createObjectURL(blob);

  // Mở trong tab mới
  window.open(blobUrl, "_blank");

  // Tạm thời, URL sẽ tự giải phóng khi tab đóng (hoặc bạn có thể URL.revokeObjectURL(blobUrl) sau)
}


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
  const cardAssignedEl = document.getElementById("cardAssigned");
  cardAssignedEl.innerHTML = ""; // reset trước khi render
  (card.assignedTo || []).forEach(member => {
    const li = document.createElement("li");
    li.textContent = member.username;
    li.dataset.id = member._id; // quan trọng để saveCardChanges lấy id
    cardAssignedEl.appendChild(li);
    document.getElementById("addLabelBtn").addEventListener("click", openLabelPopup);
  });


  document.getElementById("cardTitle").textContent = card.name;
  document.getElementById("cardDescription").textContent = card.description || "";
  // Assigned To
  const assignBtn = document.getElementById("AssignedMember-btn");
  assignBtn.addEventListener("click", () => {
    assignPopup.style.display = "flex";
    loadAssignList(members);
  });

  // Labels
  const labelsEl = document.getElementById("cardLabels");
  labelsEl.innerHTML = "";

  // card.labels lưu dạng mảng màu: ["red", "green", "blue"]
  (card.labels || []).forEach(color => {
    const span = document.createElement("span");
    span.className = "label";           // CSS để định dạng
    span.style.background = color;      // màu hiển thị
    span.dataset.color = color;         // lưu data-color để lấy khi save
    span.textContent = "";              // nếu muốn, để trống
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

  // Hàm hiển thị attachments hiện có
   function renderAttachments(card) {
  const attachmentsEl = document.getElementById("cardAttachments");
  attachmentsEl.innerHTML = "";

  (card.attachments || []).forEach((fileDataURL, index) => {
    const li = document.createElement("li");

    // Nếu là ảnh, hiển thị preview
    if (fileDataURL.startsWith("data:image")) {
      const img = document.createElement("img");
      img.src = fileDataURL;
      img.style.maxWidth = "150px";   // điều chỉnh size preview
      img.style.display = "block";
      img.style.marginBottom = "5px";
      li.appendChild(img);
    }

    // Nút mở file
    const openBtn = document.createElement("button");
    openBtn.textContent = "Mở file";
    openBtn.onclick = () => window.open(fileDataURL, "_blank");
    li.appendChild(openBtn);

    // Nút xóa
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "x";
    removeBtn.style.marginLeft = "5px";
    removeBtn.onclick = () => {
      card.attachments.splice(index, 1);
      renderAttachments(card);
    };
    li.appendChild(removeBtn);

    attachmentsEl.appendChild(li);
  });
}
  renderAttachments(card);

  // Hiển thị modal
  modal.style.display = "block";
  document.getElementById("save-card-btn").onclick = () => {
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
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
attachmentInput.addEventListener("change", () => {
  const files = Array.from(attachmentInput.files);
  files.forEach(file => currentAttachments.push(file));
  renderAttachments();
});
 async function saveCardChanges(cardId) {
  const cardAssignedEl = document.getElementById("cardAssigned");
  const assignedMembers = Array.from(cardAssignedEl.querySelectorAll("li"))
    .map(li => li.dataset.id);
  const labels = Array.from(document.querySelectorAll("#cardLabels span"))
    .map(span => span.dataset.color);
  const attachmentsBase64 = await Promise.all(
    currentAttachments.map(file => fileToBase64(file))
  );

  const updatedCard = {
    name: document.getElementById("cardTitle").textContent,
    description: document.getElementById("cardDescription").textContent,
    dueDate: document.getElementById("cardDueDate").value,
    assignedTo: assignedMembers,
    labels: labels,
    attachments: attachmentsBase64
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
  popup.style.display = popup.style.display === "none" ? "block" : "none";
  loadAssignList(); // load tất cả member lần đầu
});

// Tìm kiếm
document.getElementById("assignSearch").addEventListener("input", (e) => {
  loadAssignList(e.target.value);
});
let assignedMembers = []; // lưu member._id đã assign

function assignMemberToCard(memberId) {
  // toggle member
  if (assignedMembers.includes(memberId)) {
    assignedMembers = assignedMembers.filter(id => id !== memberId);
  } else {
    assignedMembers.push(memberId);
  }

  // Cập nhật hiển thị
  renderAssignedMembers();
}
function renderAssignedMembers() {
  const cardAssignedEl = document.getElementById("cardAssigned");
  assignedMembers.forEach(id => {
    const member = members.find(m => m._id === id);
    if (!member) return;

    const li = document.createElement("li");
    li.textContent = member.username;
    li.dataset.id = member._id;
    cardAssignedEl.appendChild(li);
  });
}



//thêm màu cho lable
const colors = ["red", "blue", "green", "orange", "purple", "gray"]; // có thể thêm màu

function openLabelPopup() {
  const popup = document.getElementById("labelPopup");
  const colorsContainer = document.getElementById("labelColors");
  colorsContainer.innerHTML = "";

  colors.forEach(color => {
    const div = document.createElement("div");
    div.style.backgroundColor = color;

    div.addEventListener("click", () => {
      addLabelToCard(color);
      popup.style.display = "none";
    });

    colorsContainer.appendChild(div);
  });

  popup.style.display = "flex";
}

function addLabelToCard(color) {
  const labelsEl = document.getElementById("cardLabels");
  const span = document.createElement("span");
  span.style.backgroundColor = color;
  span.dataset.color = color;
  labelsEl.appendChild(span);
}

//attackment


