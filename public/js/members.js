// ---------------- Globals ----------------
let currentWorkspaceId = null;

// ---------------- Get workspaceId from URL ----------------
function getWorkspaceIdFromURL() {
  return new URLSearchParams(window.location.search).get("ws");
}

// ---------------- Load nav ----------------
fetch("components/nav_menu.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("nav-container").innerHTML = html;
    document.querySelectorAll(".menu-item").forEach(item => {
      if (item.dataset.page === "members") item.classList.add("active");
      item.addEventListener("click", () => {
        window.location.href = item.dataset.page + ".html";
      });
    });
  });

// ---------------- Load user + workspace ----------------
async function initMembersPage() {
  try {
    const resUser = await fetch("http://localhost:8127/v1/User/me", { credentials: "include" });
    const user = await resUser.json();

    if (!user.workspaces || user.workspaces.length === 0) {
      throw new Error("User không thuộc workspace nào");
    }

    // 1. Lấy workspaceId từ URL
    let wsId = getWorkspaceIdFromURL();

    // 2. Nếu URL không có, lấy từ localStorage
    if (!wsId) wsId = localStorage.getItem("currentWorkspaceId");

    // 3. Nếu vẫn không có → workspace đầu tiên
    let workspace = user.workspaces.find(ws => ws._id === wsId);
    if (!workspace) workspace = user.workspaces[0];

    currentWorkspaceId = workspace._id;

    // Lưu workspace hiện tại vào localStorage
    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    // Cập nhật URL
    const url = new URL(window.location);
    url.searchParams.set("ws", currentWorkspaceId);
    window.history.replaceState({}, "", url);

    // Hiển thị tên workspace
    const wsTitle = document.querySelector('.workspace-title');
    if (wsTitle) wsTitle.textContent = workspace.name;

    // Render workspace list
    const wsListContainer = document.getElementById("workspace-list");
    if (wsListContainer) {
      wsListContainer.innerHTML = "";
      user.workspaces.forEach(ws => {
        const div = document.createElement("div");
        div.className = "workspace-item";
        div.textContent = ws.name;
        if (ws._id === currentWorkspaceId) div.classList.add("active");

        div.addEventListener("click", () => {
          if (currentWorkspaceId === ws._id) return;

          currentWorkspaceId = ws._id;

          // Lưu workspace hiện tại vào localStorage
          localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

          // Update URL
          const url = new URL(window.location);
          url.searchParams.set("ws", ws._id);
          window.history.replaceState({}, "", url);

          // Update UI
          wsListContainer.querySelectorAll(".workspace-item").forEach(el => el.classList.remove("active"));
          div.classList.add("active");
          wsTitle.textContent = ws.name;

          loadMembers(currentWorkspaceId);
        });

        wsListContainer.appendChild(div);
      });
    }

    // Load members lần đầu
    await loadMembers(currentWorkspaceId);

  } catch (err) {
    console.error(err);
    document.querySelector(".members-list").innerHTML = "<p>Lỗi khi load workspace hoặc members</p>";
  }
}

// ---------------- Load members ----------------
async function loadMembers(workspaceId) {
  const membersContainer = document.querySelector(".members-list");
  try {
    const res = await fetch(`http://localhost:8127/v1/workspace/${workspaceId}/members`, { credentials: "include" });
    if (!res.ok) throw new Error("Không thể load danh sách members");

    const members = await res.json();
    membersContainer.innerHTML = "";

    if (!members || members.length === 0) {
      membersContainer.innerHTML = "<p>Chưa có member nào trong workspace</p>";
      return;
    }

    members.forEach(member => {
      const div = document.createElement("div");
      div.className = "member-row";
      div.innerHTML = `
        <div class="avatar">${member.username.charAt(0).toUpperCase()}</div>
        <div class="member-info">
          <div class="name">${member.username}</div>
          <div class="email">${member.email}</div>
        </div>
        <div class="role">${member.role}</div>
      `;
      membersContainer.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    membersContainer.innerHTML = "<p>Lỗi khi load danh sách members</p>";
  }
}

// ---------------- Invite modal ----------------
const inviteBtn = document.querySelector(".invite-btn");
const inviteModal = document.getElementById("inviteModal");
const closeBtn = document.querySelector(".modal .close");
const sendInviteBtn = document.getElementById("sendInvite");
const inviteEmailInput = document.getElementById("inviteEmail");

inviteBtn.addEventListener("click", () => {
  if (!currentWorkspaceId) return alert("Workspace chưa được chọn!");
  inviteModal.style.display = "block";
  inviteEmailInput.value = "";
  inviteEmailInput.focus();
});

closeBtn.addEventListener("click", () => inviteModal.style.display = "none");
window.addEventListener("click", e => { if (e.target === inviteModal) inviteModal.style.display = "none"; });

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
    await loadMembers(currentWorkspaceId);

  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
});

// ---------------- Init ----------------
document.addEventListener("DOMContentLoaded", initMembersPage);
