// ---------------- Members Page ----------------
import { API_BASE } from "../js/config.js";
document.addEventListener("DOMContentLoaded", async () => {
  // Inject nav và highlight menu "members"
  await loadNav("members");

  // Sau khi nav đã load, khởi tạo trang members
  await initMembersPage();

  // Bind invite modal
  bindInviteModal();
});

// ---------------- Init Members Page ----------------
async function initMembersPage() {
  try {
    const resUser = await fetch(`${API_BASE}/v1/User/me`, { credentials: "include" });
    const user = await resUser.json();

    if (!user.workspaces || user.workspaces.length === 0) {
      throw new Error("User không thuộc workspace nào");
    }

    // Lấy workspaceId từ URL hoặc localStorage
    let wsId = new URLSearchParams(window.location.search).get("ws") || localStorage.getItem("currentWorkspaceId");
    let workspace = user.workspaces.find(ws => ws._id === wsId) || user.workspaces[0];

    currentWorkspaceId = workspace._id;
    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set("ws", currentWorkspaceId);
    window.history.replaceState({}, "", url);

    // Hiển thị tên workspace trong nav
    const wsTitle = document.querySelector('.workspace-title');
    if (wsTitle) {
      wsTitle.innerHTML = `
        <span class="ws-icon">${workspace.name.charAt(0).toUpperCase()}</span>
        ${workspace.name}
        `;
    }

    // Render workspace list (sidebar switcher)
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
          localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

          const url = new URL(window.location);
          url.searchParams.set("ws", ws._id);
          window.history.replaceState({}, "", url);

          wsListContainer.querySelectorAll(".workspace-item").forEach(el => el.classList.remove("active"));
          div.classList.add("active");
          wsTitle.innerHTML = `
              <span class="ws-icon">${ws.name.charAt(0).toUpperCase()}</span>
              ${ws.name}
            `;

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
function canEditRole(member) {
  const currentUserRole = window.currentWorkspaceRole; 
  // "owner" | "admin" | "member"

  if (!currentUserRole) return false;

  const targetRole = member.role.toLowerCase();

  // ❌ Không ai được sửa Owner
  if (targetRole === "Owner") return false;

  // ✅ Owner sửa được tất cả
  if (currentUserRole === "Owner") return true;

  // ✅ Admin chỉ sửa Member
  if (currentUserRole === "admin" && targetRole === "member") return true;

  return false;
}


// ---------------- Load members ----------------
async function loadMembers(workspaceId) {
  const membersContainer = document.querySelector(".members-list");
  
  try {
    const res = await fetch(`${API_BASE}/v1/workspace/${workspaceId}/members`, { credentials: "include" });
    if (!res.ok) throw new Error("Không thể load danh sách members");

    const response = await res.json();
    const members = response.data || []; // Lấy đúng mảng từ backend
    console.log("members của workspace", members);

    membersContainer.innerHTML = "";

    if (!members.length) {
      membersContainer.innerHTML = "<p>Chưa có member nào trong workspace</p>";
      return;
    }

    members.forEach(member => {
      const div = document.createElement("div");
      div.className = "member-row";

      // Avatar
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      if (member.avatar) {
        const img = document.createElement("img");
        img.src = `${API_BASE}/${member.avatar}`;
        img.alt = member.username || "member";
        avatar.appendChild(img);
      } else if (member.username) {
        avatar.textContent = member.username.charAt(0).toUpperCase();
      } else {
        avatar.textContent = "?";
      }

      // 🔽 Role select
  let roleHTML = `<div class="role-text">${member.role}</div>`;
  console.log("member:", member);
console.log("canEditRole:", typeof canEditRole, canEditRole?.(member));


  if (canEditRole(member)) {
    roleHTML = `
      <select class="role-select" data-user-id="${member._id}">
        <option value="member" ${member.role === "member" ? "selected" : ""}>Member</option>
        <option value="admin" ${member.role === "admin" ? "selected" : ""}>Admin</option>
      </select>
    `;
  }

  div.innerHTML = `
    <div class="member-info">
      <div class="name">${member.username}</div>
      <div class="email">${member.email}</div>
    </div>
    ${roleHTML}
  `;

  div.prepend(avatar);
  membersContainer.appendChild(div);
});

  } catch (err) {
    console.error(err);
    membersContainer.innerHTML = "<p>Lỗi khi load danh sách members</p>";
  }
}



// ---------------- Invite modal ----------------
function bindInviteModal() {
  const inviteBtn = document.querySelector(".invite-btn");
  const inviteModal = document.getElementById("inviteModal");
  const closeBtn = document.querySelector(".modal .close");
  const sendInviteBtn = document.getElementById("sendInvite");
  const inviteEmailInput = document.getElementById("inviteEmail");

  if (!inviteBtn || !inviteModal || !closeBtn || !sendInviteBtn || !inviteEmailInput) return;

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
      const res = await fetch(`${API_BASE}/v1/workspace/${currentWorkspaceId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: "member" }) // gửi role nếu muốn
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Không thể mời user");

      alert(data.message);
      inviteModal.style.display = "none";

      // reload members list
      await loadMembers(currentWorkspaceId);

    } catch (err) {
      console.error("Invite error:", err);
      alert("Error: " + err.message);
    }
  });
}
