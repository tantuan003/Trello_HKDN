// members.js

// ======================
// Load nav
// ======================
fetch("components/nav_menu.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("nav-container").innerHTML = html;
    highlightActiveMenu();
    bindMenuEvents();
  });

function highlightActiveMenu() {
  document.querySelectorAll(".menu-item").forEach(item => {
    if(item.getAttribute("data-page") === "members") {
      item.classList.add("active");
    }
  });
}

function bindMenuEvents() {
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const page = item.getAttribute("data-page");
      window.location.href = page + ".html";
    });
  });
}

// ======================
// Variables DOM
// ======================
const inviteBtn = document.querySelector(".invite-btn");
const inviteModal = document.getElementById("inviteModal");
const closeBtn = document.querySelector(".modal .close");
const sendInviteBtn = document.getElementById("sendInvite");
const inviteEmailInput = document.getElementById("inviteEmail");
const membersContainer = document.querySelector(".members-list");

let currentWorkspaceId = null;

// ======================
// Load user + workspace + members
// ======================
async function loadUserAndMembers() {
  try {
    const resUser = await fetch("http://localhost:8127/v1/User/me", { credentials: "include" });
    const user = await resUser.json();
    console.log("USER LOGIN:", user);

    if (!user.workspaces || user.workspaces.length === 0) {
      throw new Error("User không thuộc workspace nào");
    }

    // Lấy workspace đầu tiên
    const workspace = user.workspaces[0];
    currentWorkspaceId = workspace._id;

    // Hiển thị tên workspace (nếu có)
    const wsTitle = document.querySelector('.workspace-title');
    if (wsTitle) wsTitle.textContent = workspace.name;

    // Load members
    await loadMembers(currentWorkspaceId);

  } catch (err) {
    console.error(err);
    alert("Lỗi khi load user hoặc workspace: " + err.message);
  }
}

// ======================
// Load members
// ======================
async function loadMembers(workspaceId) {
  try {
    const res = await fetch(`http://localhost:8127/v1/workspace/${workspaceId}/members`, { credentials: "include" });
    const members = await res.json();
    console.log("MEMBERS:", members);

    membersContainer.innerHTML = "";
    members.forEach(member => {
      const div = document.createElement("div");
      div.classList.add("member-row");
      div.innerHTML = `
        <div class="avatar">${member.username.charAt(0).toUpperCase()}</div>
        <div class="member-info">
          <div class="name">${member.username}</div>
          <div class="email">${member.email}</div>
        </div>
        <div class="role">${member.role || "Member"}</div>
      `;
      membersContainer.appendChild(div);
    });

  } catch (err) {
    console.error("Error loading members:", err);
    membersContainer.innerHTML = "<p>Không thể load danh sách members</p>";
  }
}

// ======================
// Invite modal events
// ======================

// Mở modal
inviteBtn.addEventListener("click", () => {
  if (!currentWorkspaceId) return alert("Workspace chưa được chọn!");
  inviteModal.style.display = "block";
  inviteEmailInput.value = "";
  inviteEmailInput.focus();
});

// Đóng modal khi click X
closeBtn.addEventListener("click", () => {
  inviteModal.style.display = "none";
});

// Đóng modal khi click ra ngoài
window.addEventListener("click", (e) => {
  if (e.target === inviteModal) inviteModal.style.display = "none";
});

// Gửi invite
sendInviteBtn.addEventListener("click", async () => {
  const email = inviteEmailInput.value.trim();
  if (!email) return alert("Vui lòng nhập email");

  try {
    const res = await fetch(`http://localhost:8127/v1/workspace/${currentWorkspaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    alert(data.message);
    inviteModal.style.display = "none";
    // Reload members
    await loadMembers(currentWorkspaceId);

  } catch (err) {
    console.error("Invite error:", err);
    alert("Error: " + err.message);
  }
});

// ======================
// Init
// ======================
loadUserAndMembers();
