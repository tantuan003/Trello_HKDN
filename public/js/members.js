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

// ---------------- Load members ----------------
async function loadMembers(workspaceId) {
  const membersContainer = document.querySelector(".members-list");

  try {
    const res = await fetch(`${API_BASE}/v1/workspace/${workspaceId}/members`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load members list!");

    const response = await res.json();
    window.currentWorkspaceRole = response.data.currentUserRole;
    const members = response.data.members;

    console.log("Members: ", members);

    membersContainer.innerHTML = "";

    if (!members.length) {
      membersContainer.innerHTML = "<p>No members in this workspace</p>";
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

      // Info
      const infoHTML = `
        <div class="member-info">
          <div class="name">${member.username}</div>
          <div class="email">${member.email}</div>
        </div>
      `;

      // Actions : only members
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

// ---------------- Edit/Remove actions ----------------
function attachMemberActions(workspaceId) {
  document.querySelectorAll(".edit-role").forEach(icon => {
    icon.addEventListener("click", (e) => {
      const userId = e.target.dataset.userId;
      const currentRole = e.target.dataset.currentRole.toLowerCase();

      // Show dropdown
      const select = document.createElement("select");
      select.className = "role-select";
      select.dataset.userId = userId;
      select.innerHTML = `
      <option value="member" ${currentRole === "member" ? "selected" : ""}>Member</option>
      <option value="admin" ${currentRole === "admin" ? "selected" : ""}>Admin</option>
    `;

      e.target.replaceWith(select);

      // Edit role
      select.addEventListener("change", async () => {
        const newRole = select.value;
        try {
          const res = await fetch(`${API_BASE}/v1/workspace/${workspaceId}/members/${userId}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ role: newRole })
          });
          if (!res.ok) throw new Error("Update role failed");
          alert("Role updated!");
          await loadMembers(workspaceId);
        } catch (err) {
          console.error(err);
          alert("Failed to update role");
        }
      });

      // Close dropdown
      function handleClickOutside(ev) {
        if (!select.contains(ev.target)) {
          const newIcon = document.createElement("i");
          newIcon.className = "fa-solid fa-pen-to-square edit-role";
          newIcon.dataset.userId = select.dataset.userId;
          newIcon.dataset.currentRole = currentRole;
          newIcon.title = "Edit role";

          select.replaceWith(newIcon);
          document.removeEventListener("click", handleClickOutside);
          attachMemberActions(workspaceId);
        }
      }

      setTimeout(() => { 
        document.addEventListener("click", handleClickOutside); 
      }, 0);
    });
  });

  // Remove member
  document.querySelectorAll(".remove-member").forEach(icon => {
    icon.addEventListener("click", async (e) => {

      const memberSubId = e.target.dataset.memberId;
      const userId = e.target.dataset.userId;        

      console.log("Removing:", { workspaceId, memberSubId, userId });

      if (!memberSubId) { 
        alert("Missing memberSubId."); 
        return; 
      }

      const confirmed = confirm("Are you sure you want to remove this member?"); 
      if (!confirmed) {
        console.log("Cancelling removing", { workspaceId, memberSubId, userId });
        return;  
      }

      try {
        const res = await fetch(`${API_BASE}/v1/workspace/${workspaceId}/members/${memberSubId}`, {
          method: "DELETE",
          credentials: "include"
        });
        if (!res.ok) throw new Error("Remove member failed");
        alert("Member removed!");
        await loadMembers(workspaceId);
      } catch (err) {
        console.error(err);
        alert("Failed to remove member");
      }
    });
  });
}

// ---------------- Invite modal ----------------
function bindInviteModal() {
  const inviteModal = document.getElementById("inviteModal");
  const inviteBtn = document.querySelector(".invite-btn");
  const closeBtn = inviteModal.querySelector(".close");
  const sendBtn = document.getElementById("sendInvite");
  const inviteEmailInput = document.getElementById("inviteEmail");

  if (!inviteModal || !inviteBtn || !closeBtn || !sendBtn || !inviteEmailInput) return;

  // Show modal
  inviteBtn.addEventListener("click", () => {
    const wsId = localStorage.getItem("currentWorkspaceId") || window.currentWorkspaceId;
    if (!wsId) {
      alert("Missing wsp_id!");
      return;
    }
    inviteModal.classList.add("show");
    inviteModal.style.display = "flex";
    inviteEmailInput.value = "";
    inviteEmailInput.focus();
  });

  // Close modal
  closeBtn.addEventListener("click", () => {
    inviteModal.classList.remove("show");
    setTimeout(() => {
      inviteModal.style.display = "none";
    }, 300);
  });

  // Hide modal
  inviteModal.addEventListener("click", (e) => {
    if (e.target === inviteModal) {
      inviteModal.classList.remove("show");
      setTimeout(() => {
        inviteModal.style.display = "none";
      }, 300);
    }
  });

  // Invite logic
  sendBtn.addEventListener("click", async () => {
    const email = inviteEmailInput.value.trim();
    const wsId = localStorage.getItem("currentWorkspaceId") || window.currentWorkspaceId;

    if (!email) {
      alert("Please enter a valid email!");
      return;
    }
    if (!wsId) {
      alert("Missing wsp_id!");
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

      alert(data.message || "Invitation sent successfully!");
      inviteModal.classList.remove("show");
      setTimeout(() => {
        inviteModal.style.display = "none";
      }, 300);

      // reload members list
      await loadMembers(wsId);

    } catch (err) {
      console.error("Invite error:", err);
      alert("Error: " + err.message);
    }
  });
}

