// ---------------- Members Page ----------------

document.addEventListener("DOMContentLoaded", async () => {
  await loadNav("members");
  await initMembersPage();
  bindInviteModal();
});

// ---------------- Init Members Page ----------------
async function initMembersPage() {
  try {
    const resUser = await fetch("http://localhost:8127/v1/User/me", { credentials: "include" });
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

// ---------------- Load members ----------------
async function loadMembers(workspaceId) {
  const membersContainer = document.querySelector(".members-list");
  try {
    const res = await fetch(`http://localhost:8127/v1/workspace/${workspaceId}/members`, { credentials: "include" });
    if (!res.ok) throw new Error("Cannot load members list");

    const members = await res.json();
    membersContainer.innerHTML = "";

    if (!members || members.length === 0) {
      membersContainer.innerHTML = "<p>No members in this workspace</p>";
      return;
    }

    members.forEach(member => {
      const div = document.createElement("div");
      div.className = "member-row";

      let avatarHTML;
      if (member.avatar) {
        avatarHTML = `<img src="${member.avatar}" alt="${member.username}" class="avatar-img" />`;
      } else {
        avatarHTML = `<div class="avatar">${member.username.charAt(0).toUpperCase()}</div>`;
      }

      div.innerHTML = `
        ${avatarHTML}
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
      const res = await fetch(`http://localhost:8127/v1/workspace/${wsId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email })
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
      console.error("Error sending invite:", err);
      alert("Server connection error!");
    }
  });
}
