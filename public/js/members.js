// ---------------- Members Page ----------------
import { API_BASE } from "../js/config.js";
document.addEventListener("DOMContentLoaded", async () => {
  await loadNav("members");
  await initMembersPage();
  bindInviteModal();
});

// ---------------- Init Members Page ----------------
async function initMembersPage() {
  try {
    const resUser = await fetch(`${API_BASE}/v1/User/me`, { credentials: "include" });
    const user = await resUser.json();

    if (!user.workspaces || user.workspaces.length === 0) {
      throw new Error("User does not belong to any workspace");
    }

    let wsId = new URLSearchParams(window.location.search).get("ws") || localStorage.getItem("currentWorkspaceId");
    let workspace = user.workspaces.find(ws => ws._id === wsId) || user.workspaces[0];

    currentWorkspaceId = workspace._id;
    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    const url = new URL(window.location);
    url.searchParams.set("ws", currentWorkspaceId);
    window.history.replaceState({}, "", url);

    const wsTitle = document.querySelector('.workspace-title');
    if (wsTitle) {
      wsTitle.innerHTML = `
        <span class="ws-icon">${workspace.name.charAt(0).toUpperCase()}</span>
        ${workspace.name}
      `;
    }

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

    await loadMembers(currentWorkspaceId);

  } catch (err) {
    console.error(err);
    document.querySelector(".members-list").innerHTML = "<p>Error loading workspace or members</p>";
  }
}


function canEditRole(member) {
  if (!window.currentWorkspaceRole) return false;

  const currentUserRole = window.currentWorkspaceRole.toLowerCase();
  const targetRole = member.role.toLowerCase();

  // ❌ Không ai được sửa Owner
  if (targetRole === "owner") return false;

  // ✅ Chỉ Owner mới được sửa role
  if (currentUserRole === "owner") return true;

  return false;
}
function attachRoleChangeEvents(workspaceId) {
  const selects = document.querySelectorAll(".role-select");

  selects.forEach(select => {
    select.addEventListener("change", async (e) => {
      const memberId = e.target.dataset.userId;
      const newRole = e.target.value;

      const oldRole = e.target.getAttribute("data-old-role");

      // UI optimistic
      e.target.disabled = true;

      try {
        const res = await fetch(
          `${API_BASE}/v1/workspace/${workspaceId}/members/${memberId}/role`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ role: newRole })
          }
        );

        if (!res.ok) {
          throw new Error("Update role failed");
        }

        // cập nhật old role
        e.target.setAttribute("data-old-role", newRole);

        console.log(`✅ Role updated: ${memberId} → ${newRole}`);

      } catch (err) {
        console.error(err);

        // rollback UI nếu lỗi
        if (oldRole) {
          e.target.value = oldRole;
        }

        alert("Không thể cập nhật role. Vui lòng thử lại.");
      } finally {
        e.target.disabled = false;
      }
    });

    // lưu role cũ để rollback
    select.setAttribute("data-old-role", select.value);
  });
}



// ---------------- Load members ----------------
async function loadMembers(workspaceId) {
  const membersContainer = document.querySelector(".members-list");

  try {
    const res = await fetch(`${API_BASE}/v1/workspace/${workspaceId}/members`, { credentials: "include" });
    if (!res.ok) throw new Error("Không thể load danh sách members");

    const response = await res.json();

    window.currentWorkspaceRole = response.data.currentUserRole;
    const members = response.data.members;
    // Lấy đúng mảng từ backend
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
      <select class="role-select" data-user-id="${member._id}" data-old-role="${member.role}">
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
    attachRoleChangeEvents(workspaceId);

  } catch (err) {
    console.error(err);
    membersContainer.innerHTML = "<p>Error loading members list</p>";
  }
}



// ---------------- Invite modal ----------------
function bindInviteModal() {
  const inviteModal = document.getElementById("inviteModal");
  const inviteBtn = document.querySelector(".invite-btn");
  const closeBtn = inviteModal.querySelector(".close");

  inviteBtn.addEventListener("click", () => {
    inviteModal.classList.add("show");
    inviteModal.style.display = "flex";
  });

  closeBtn.addEventListener("click", () => {
    inviteModal.classList.remove("show");
    setTimeout(() => {
      inviteModal.style.display = "none";
    }, 300);
  });

  inviteModal.addEventListener("click", (e) => {
    if (e.target === inviteModal) {
      inviteModal.classList.remove("show");
      setTimeout(() => {
        inviteModal.style.display = "none";
      }, 300);
    }
  });

  const sendBtn = document.getElementById("sendInvite");
  sendBtn.addEventListener("click", async () => {
    const email = document.getElementById("inviteEmail").value.trim();
    const wsId = localStorage.getItem("currentWorkspaceId");

    if (!email) {
      alert("Please enter an email!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/v1/workspace/${currentWorkspaceId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: "member" }) // gửi role nếu muốn
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert("Invitation sent successfully!");
        inviteModal.classList.remove("show");
        setTimeout(() => {
          inviteModal.style.display = "none";
        }, 300);
      } else {
        alert("Failed to send invitation!");
      }
    } catch (err) {
      console.error("Invite error:", err);
      alert("Error: " + err.message);
    }
  });
}
