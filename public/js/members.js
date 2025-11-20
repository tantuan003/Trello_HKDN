// Load nav
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

// Lấy user login + workspaces
fetch('http://localhost:8127/v1/User/me', { credentials: 'include' })
  .then(res => res.json())
  .then(user => {
    console.log("USER LOGIN:", user); // kiểm tra

    if (!user.workspaces || user.workspaces.length === 0) {
      throw new Error("User không thuộc workspace nào");
    }

    const workspace = user.workspaces[0];
    const workspaceId = workspace._id;
    const workspaceName = workspace.name;

    // Hiển thị tên
    const wsTitle = document.querySelector('.workspace-title');
    if (wsTitle) wsTitle.textContent = workspaceName;

    // Lấy members
    return fetch(`http://localhost:8127/v1/workspace/${workspaceId}/members`, { 
      credentials: 'include'
    });
  })
  .then(res => res.json())
  .then(members => {
    console.log("MEMBERS:", members);

    const container = document.querySelector(".members-list");
    container.innerHTML = "";

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
      container.appendChild(div);
    });
  })
  .catch(err => console.error(err));


