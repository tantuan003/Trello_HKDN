
let currentWorkspaceId = null; // khai báo global
let currentVisibility = null;

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
    if (item.getAttribute("data-page") === "settings-wsp") {
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

function updateVisibilityUI(visibility) {
  const visibilityText = document.getElementById("visibility-text");
  const visibilityIcon = document.getElementById("visibility-icon");

  if (!visibilityText || !visibilityIcon) return;

  if (visibility === "private") {
    visibilityIcon.textContent = "🔒";
    visibilityText.textContent = "Private – This Workspace is private. It's not indexed or visible to others.";
  } else {
    visibilityIcon.textContent = "🌐";
    visibilityText.textContent = "Public – This Workspace is public. Anyone can find and view this workspace.";
  }
}

async function loadUserAndWorkspace() {
  try {
    const res = await fetch("http://localhost:8127/v1/workspace", { credentials: "include" });
    const workspaces = await res.json();
    console.log("USER WORKSPACES:", workspaces);

    if (!workspaces || workspaces.length === 0) throw new Error("User không thuộc workspace nào");

    // 1. Lấy workspaceId từ URL
    let workspaceId = new URLSearchParams(window.location.search).get("ws");

    // 2. Nếu URL rỗng, lấy từ localStorage
    if (!workspaceId) workspaceId = localStorage.getItem("currentWorkspaceId");

    // 3. Nếu vẫn không có → workspace đầu tiên
    let workspace = workspaces.find(ws => ws._id === workspaceId);
    if (!workspace) workspace = workspaces[0];

    currentWorkspaceId = workspace._id;
    currentVisibility = workspace.visibility;

    // Lưu workspace hiện tại vào localStorage
    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set("ws", currentWorkspaceId);
    window.history.replaceState({}, "", url);

    // Hiển thị tên workspace
    const wsTitle = document.querySelector('.workspace-title');
    if (wsTitle) wsTitle.textContent = workspace.name;

    const wsNameSpan = document.getElementById("ws-name");
    if (wsNameSpan) wsNameSpan.textContent = workspace.name;

    // Hiển thị trạng thái visibility
    updateVisibilityUI(currentVisibility);

    // Nếu muốn render danh sách workspace chọn switch, bạn có thể thêm code tương tự members.js

  } catch (err) {
    console.error("Error loading workspace:", err);
    alert("Lỗi khi load workspace: " + err.message);
  }
}

//Update workspace name
document.addEventListener("DOMContentLoaded", () => {
    const wsNameSpan = document.getElementById("ws-name");
    const editBtn = document.getElementById("editWorkspaceName");

    editBtn.addEventListener("click", () => {
        const oldName = wsNameSpan.textContent;

        const input = document.createElement("input");
        input.type = "text";
        input.value = oldName;
        input.id = "ws-name-input";
        input.classList.add("ws-name-input");

        const wrapper = document.createElement("div");
        wrapper.id = "ws-edit-wrapper";
        wrapper.classList.add("ws-edit-wrapper");

        const btnRow = document.createElement("div");
        btnRow.classList.add("btn-row");

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save";
        saveBtn.classList.add("btn-save");

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.classList.add("btn-cancel");

        btnRow.appendChild(saveBtn);
        btnRow.appendChild(cancelBtn);

        wrapper.appendChild(input);
        wrapper.appendChild(btnRow);

        wsNameSpan.replaceWith(wrapper);

        input.focus();

        // SAVE
        saveBtn.addEventListener("click", () => {
            saveWorkspaceName(input.value, oldName);
        });

        // ENTER = SAVE
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveWorkspaceName(input.value, oldName);
        });

        // CANCEL
        cancelBtn.addEventListener("click", () => {
            restoreSpan(oldName);
        });
    });

    function saveWorkspaceName(newName, oldName) {
        if (!newName.trim()) return;

        if (!currentWorkspaceId) {
            alert("Không tìm thấy workspaceId!");
            return;
        }

        fetch(`http://localhost:8127/v1/workspace/${currentWorkspaceId}/update-name`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: newName })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    restoreSpan(newName);
                } else {
                    alert("Failed to update workspace name!");
                    restoreSpan(oldName);
                }
            })
            .catch(err => {
                console.error(err);
                alert("Error connecting to server!");
                restoreSpan(oldName);
            });
    }

    function restoreSpan(name) {
        const span = document.createElement("span");
        span.id = "ws-name";
        span.textContent = name;

        const wrapper = document.getElementById("ws-edit-wrapper");
        wrapper.replaceWith(span);
    }
});

document.addEventListener("DOMContentLoaded", () => {
  const changeBtn = document.getElementById("change-visibility-btn");
  const visibilityText = document.getElementById("visibility-text");
  const visibilityIcon = document.getElementById("visibility-icon");

  if (!changeBtn || !visibilityText || !visibilityIcon) {
    console.warn("Không tìm thấy nút hoặc các phần tử visibility trong DOM");
    return;
  }

  changeBtn.addEventListener("click", async () => {
    if (!currentWorkspaceId) return alert("Workspace chưa được chọn!");
    const newVisibility = currentVisibility === "private" ? "public" : "private";

    try {
      const res = await fetch(`http://localhost:8127/v1/workspace/${currentWorkspaceId}/update-visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility: newVisibility }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentVisibility = newVisibility;
        updateVisibilityUI(newVisibility);
        alert("Workspace visibility updated successfully.");
      } else {
        alert("Failed to update visibility: " + (data.message || "Unknown error"));
      }

    } catch (err) {
      console.error("Error updating visibility:", err);
      alert("Error updating visibility.");
    }
  });

  function updateVisibilityUI(visibility) {
    if (visibility === "private") {
      visibilityIcon.textContent = "🔒";
      visibilityText.textContent = "Private – This Workspace is private. It's not indexed or visible to others.";
    } else {
      visibilityIcon.textContent = "🌐";
      visibilityText.textContent = "Public – This Workspace is public. Anyone can find and view this workspace.";
    }
  }
});

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => loadUserAndWorkspace());