import { API_BASE } from "../js/config.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNav("members");
  await initMembersPage();
  bindInviteModal();
});

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

async function loadMembers(workspaceId) {
  const membersContainer = document.querySelector(".members-list");

  try {
    const res = await fetch(`${API_BASE}/v1/workspace/${workspaceId}/members`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load members list!");

    const response = await res.json();
    window.currentWorkspaceRole = response.data.currentUserRole;
    const members = response.data.members;

    membersContainer.innerHTML = "";

    if (!members.length) {
      membersContainer.innerHTML = "<p>No members in this workspace</p>";
      return;
    }

    members.forEach(member => {
      const div = document.createElement("div");
      div.className = "member-row";

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

      const infoHTML = `
        <div class="member-info">
          <div class="name">${member.username}</div>
          <div class="email">${member.email}</div>
        </div>
      `;

      let actionsHTML = "";
      if (member.role.toLowerCase() !== "owner") {
        actionsHTML = `
          <div class="member-actions">
            <i class="fa-solid fa-pen-to-square edit-role"
              data-user-id="${member._id}"             
              data-current-role="${member.role}"
              title="Edit role"></i>
            <i class="fa-solid fa-user-minus remove-member"
              data-member-id="${member.memberSubId}"    
              data-user-id="${member._id}"
              title="Remove member"></i>
          </div>
        `;
      } else {
        actionsHTML = `<div class="role-owner">OWNER</div>`;
      }

      div.innerHTML = infoHTML + actionsHTML;
      div.prepend(avatar);
      membersContainer.appendChild(div);
    });

    attachMemberActions(workspaceId);
  } catch (err) {
    console.error(err);
    membersContainer.innerHTML = "<p>Error loading members list</p>";
  }
}

function attachMemberActions(workspaceId) {
  document.querySelectorAll(".edit-role").forEach(icon => {
    icon.addEventListener("click", (e) => {
      const userId = e.target.dataset.userId;
      const currentRole = e.target.dataset.currentRole.toLowerCase();
      const myRole = window.currentWorkspaceRole.toLowerCase();

      let canEdit = false;
      if (myRole === "owner") canEdit = true;
      else if (myRole === "admin" && currentRole === "member") canEdit = true;

      if (!canEdit) {
        Toastify({
          text: "You do not have permission to edit this role",
          duration: 3000,
          gravity: "top",
          position: "right",
          close: true,
          style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
        }).showToast();
        return;
      }

      const parent = e.target.closest(".member-actions") || e.target.parentElement;

      const roleMenu = document.createElement("div");
      roleMenu.className = "inline-role-picker";
      roleMenu.innerHTML = `
        <button class="role-btn ${currentRole === 'member' ? 'active' : ''}" data-role="member">Member</button>
        <button class="role-btn ${currentRole === 'admin' ? 'active' : ''}" data-role="admin">Admin</button>
      `;
      icon.replaceWith(roleMenu);

      roleMenu.querySelectorAll(".role-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const newRole = btn.dataset.role;
          if (newRole === currentRole) return;

          try {
            const res = await fetch(
              `${API_BASE}/v1/workspace/${workspaceId}/members/${userId}/role`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role: newRole })
              }
            );

            if (!res.ok) throw new Error();

            Toastify({
              text: "Role updated successfully",
              duration: 2000,
              gravity: "top",
              position: "right",
              close: true,
              style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
            }).showToast();

            await loadMembers(workspaceId);

          } catch (err) {
            Toastify({
              text: "Failed to update role",
              duration: 3000,
              gravity: "top",
              position: "right",
              close: true,
              style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
            }).showToast();
          }
        });
      });

      function handleClickOutside(ev) {
        if (!roleMenu.contains(ev.target)) {
          const newIcon = document.createElement("i");
          newIcon.className = "fa-solid fa-pen-to-square edit-role";
          newIcon.dataset.userId = userId;
          newIcon.dataset.currentRole = currentRole;
          newIcon.title = "Edit role";
          roleMenu.replaceWith(newIcon);
          document.removeEventListener("click", handleClickOutside);
          attachMemberActions(workspaceId);
        }
      }

      setTimeout(() => {
        document.addEventListener("click", handleClickOutside);
      }, 0);
    });
  });


  document.querySelectorAll(".remove-member").forEach(btn => {
    btn.removeEventListener("click", handleRemoveMember);
    btn.addEventListener("click", handleRemoveMember);
  });

  function showConfirmModal(memberName = "this member") {
    return new Promise((resolve) => {
      const overlay = document.getElementById("confirm-modal");
      const textEl = overlay.querySelector("p");
      const btnOk = document.getElementById("confirm-ok");
      const btnCancel = document.getElementById("confirm-cancel");

      textEl.textContent = `Are you sure you want to remove ${memberName} from this workspace?`;
      overlay.classList.remove("hidden");

      const cleanup = () => {
        overlay.classList.add("hidden");
        btnOk.onclick = null;
        btnCancel.onclick = null;
      };

      btnOk.onclick = () => {
        cleanup();
        resolve(true);
      };

      btnCancel.onclick = () => {
        cleanup();
        resolve(false);
      };
    });
  }

  async function handleRemoveMember(e) {
    const btn = e.currentTarget;
    const memberSubId = btn.dataset.memberId;

    const confirmed = await showConfirmModal();
    if (!confirmed) return;

    btn.disabled = true;
    btn.title = "Removing...";

    try {
      const res = await fetch(
        `${API_BASE}/v1/workspace/${workspaceId}/members/${memberSubId}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (res.status === 403) {
        Toastify({
          text: "You are not owner of this workspace",
          duration: 3000,
          gravity: "top",
          position: "right",
          close: true,
          style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
        }).showToast();
        return;
      }

      if (!res.ok) {
        throw new Error("Remove member failed");
      }

      Toastify({
        text: "Member removed successfully",
        duration: 2000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
      }).showToast();

      btn.closest(".member-row")?.remove();

    } catch (err) {
      Toastify({
        text: "Something went wrong. Please try again.",
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
      }).showToast();
    } finally {
      btn.disabled = false;
      btn.title = "Remove member";
    }
  }
}

function bindInviteModal() {
  const inviteModal = document.getElementById("inviteModal");
  const inviteBtn = document.querySelector(".invite-btn");
  const closeBtn = inviteModal.querySelector(".close");
  const sendBtn = document.getElementById("sendInvite");
  const inviteEmailInput = document.getElementById("inviteEmail");

  if (!inviteModal || !inviteBtn || !closeBtn || !sendBtn || !inviteEmailInput) return;

  inviteBtn.addEventListener("click", () => {
    const wsId = localStorage.getItem("currentWorkspaceId") || window.currentWorkspaceId;
    if (!wsId) {
      Toastify({
        text: "Missing workspace ID!",
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
      }).showToast();
      return;
    }
    inviteModal.classList.add("show");
    inviteModal.style.display = "flex";
    inviteEmailInput.value = "";
    inviteEmailInput.focus();
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

  sendBtn.addEventListener("click", async () => {
    const email = inviteEmailInput.value.trim();
    const wsId = localStorage.getItem("currentWorkspaceId") || window.currentWorkspaceId;

    if (!email) {
      Toastify({
        text: "Please enter a valid email!",
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
      }).showToast();
      return;
    }
    if (!wsId) {
      Toastify({
        text: "Missing workspace ID!",
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
      }).showToast();
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/v1/workspace/${wsId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: "member" })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Error");

      Toastify({
        text: data.message || "Invitation sent successfully!",
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #4caf50, #2e7d32)" }
      }).showToast();

      inviteModal.classList.remove("show");
      setTimeout(() => {
        inviteModal.style.display = "none";
      }, 300);

      await loadMembers(wsId);

    } catch (err) {
      console.error("Invite error:", err);
      Toastify({
        text: "Error: " + err.message,
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #f87171, #ef4444)" }
      }).showToast();
    }
  });
}

