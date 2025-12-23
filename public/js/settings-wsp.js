// Chỉ khai báo biến visibility ở đây, workspaceId sẽ lấy từ nav.js hoặc từ API
let currentVisibility = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Load nav và highlight menu
  await loadNav("settings-wsp");

  // Load workspace info
  await loadWorkspaceForSettings();

  // Dropdown toggle
  const changeBtn = document.getElementById("change-visibility-btn");
  const dropdown = document.querySelector(".dropdown");
  const dropdownContent = document.querySelector(".dropdown-content");

  if (changeBtn && dropdownContent) {
    changeBtn.addEventListener("click", () => {
      dropdownContent.classList.toggle("show");
    });
  }

  document.addEventListener("click", (e) => {
    if (dropdownContent && dropdownContent.classList.contains("show")) {
      // nếu click không nằm trong dropdown
      if (!dropdown.contains(e.target)) {
        dropdownContent.classList.remove("show");
      }
    }
  });

  // Dropdown item click
  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", async () => {
      const newVisibility = item.dataset.value.toLowerCase();
      await updateVisibilityOnServer(newVisibility);
      dropdownContent.classList.remove("show");
    });
  });

  // Edit workspace name
  const editBtn = document.getElementById("editWorkspaceName");
  const wsNameDiv = document.getElementById("ws-name");
  if (editBtn && wsNameDiv) {
    editBtn.addEventListener("click", () => enterEditMode(wsNameDiv.textContent));
  }
});

// ---------------- Load workspace info ----------------
async function loadWorkspaceForSettings() {
  try {
    const res = await fetch("http://localhost:8127/v1/workspace", { credentials: "include" });
    const workspaces = await res.json();

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      throw new Error("No workspace found");
    }

    // Lấy workspaceId từ URL hoặc localStorage
    let wsId = new URLSearchParams(window.location.search).get("ws") || localStorage.getItem("currentWorkspaceId");
    let workspace = workspaces.find(ws => ws._id === wsId) || workspaces[0];

    // Lưu workspaceId vào localStorage để nav.js dùng chung
    localStorage.setItem("currentWorkspaceId", workspace._id);

    currentVisibility = workspace.visibility.toLowerCase();

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set("ws", workspace._id);
    window.history.replaceState({}, "", url);

    // Hiển thị tên workspace
    const wsNameDiv = document.getElementById("ws-name");
    if (wsNameDiv) wsNameDiv.textContent = workspace.name;

    // Hiển thị trạng thái visibility
    updateVisibilityUI(currentVisibility);
    updateWsVisibility(currentVisibility);
  } catch (err) {
    console.error("Error loading workspace:", err);
    alert("Error loading workspace: " + err.message);
  }
}

// ---------------- Visibility ----------------
async function updateVisibilityOnServer(newVisibility) {
  const wsId = localStorage.getItem("currentWorkspaceId");
  if (!wsId) return alert("Workspace ID not found!");

  try {
    const res = await fetch(`http://localhost:8127/v1/workspace/${wsId}/update-visibility`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ visibility: newVisibility }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      currentVisibility = newVisibility;
      updateVisibilityUI(newVisibility);
      updateWsVisibility(newVisibility);
      alert("Workspace visibility updated successfully.");
    } else {
      alert("Failed to update visibility: " + (data.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Error updating visibility:", err);
    alert("Error updating visibility.");
  }
}

function updateVisibilityUI(visibility) {
  const visibilityIcon = document.getElementById("visibility-icon");
  const visibilityText = document.getElementById("visibility-text");
  if (!visibilityIcon || !visibilityText) return;

  if (visibility === "private") {
    visibilityIcon.innerHTML = '<i class="fas fa-lock"></i>';
    visibilityText.innerHTML = `<strong id="current-visibility">Private</strong> – This Workspace is private. It's not indexed or visible to others.`;
  } else {
    visibilityIcon.innerHTML = '<i class="fas fa-globe"></i>';
    visibilityText.innerHTML = `<strong id="current-visibility">Public</strong> – This Workspace is public. Anyone can find and view this workspace.`;
  }
}

function updateWsVisibility(visibility) {
  const wsVisibilityDiv = document.querySelector(".ws-visibility");
  if (!wsVisibilityDiv) return;

  if (visibility === "private") {
    wsVisibilityDiv.innerHTML = '<i class="fas fa-lock"></i> <span>Private</span>';
  } else {
    wsVisibilityDiv.innerHTML = '<i class="fas fa-globe"></i> <span>Public</span>';
  }
}

// ---------------- Edit workspace name ----------------
function enterEditMode(oldName) {
  const wsNameWrapper = document.querySelector(".ws-name-wrapper");
  if (!wsNameWrapper) return;

  // Ẩn icon edit khi vào chế độ edit
  const editBtn = document.getElementById("editWorkspaceName");
  if (editBtn) editBtn.style.display = "none";

  const wsNameDiv = document.getElementById("ws-name");
  if (!wsNameDiv) return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = oldName;
  input.id = "ws-name-input";
  input.classList.add("ws-name-input");

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

  const wrapper = document.createElement("div");
  wrapper.id = "ws-edit-wrapper";
  wrapper.classList.add("ws-edit-wrapper");
  wrapper.appendChild(input);
  wrapper.appendChild(btnRow);

  wsNameDiv.replaceWith(wrapper);
  input.focus();

  saveBtn.addEventListener("click", () => saveWorkspaceName(input.value, oldName));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveWorkspaceName(input.value, oldName);
  });
  cancelBtn.addEventListener("click", () => restoreSpan(oldName));
}

function saveWorkspaceName(newName, oldName) {
  if (!newName.trim()) return;
  const wsId = localStorage.getItem("currentWorkspaceId");
  if (!wsId) {
    alert("Workspace ID not found!");
    return;
  }

  fetch(`http://localhost:8127/v1/workspace/${wsId}/update-name`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name: newName })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        restoreSpan(newName);
        const wsTitleEl = document.querySelector(".workspace-title");
        if (wsTitleEl) {
          wsTitleEl.innerHTML = `
            <span class="ws-icon">${newName.charAt(0).toUpperCase()}</span>
            ${newName}
          `;
        }
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
  const span = document.createElement("div");
  span.id = "ws-name";
  span.textContent = name;

  const wrapper = document.getElementById("ws-edit-wrapper");
  if (wrapper) wrapper.replaceWith(span);

  // Hiện lại icon edit khi thoát chế độ edit
  const editBtn = document.getElementById("editWorkspaceName");
  if (editBtn) editBtn.style.display = "inline-block";
}

// ---------------- Gắn sự kiện cho nút delete ----------------
const deleteBtn = document.querySelector(".delete-workspace");
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    const wsId = localStorage.getItem("currentWorkspaceId"); // lấy workspace hiện tại
    if (!wsId) {
      alert("No workspace selected!");
      return;
    }

    try {
      // Lấy thông tin workspace để hiển thị tên
      const res = await fetch(`http://localhost:8127/v1/workspace/${wsId}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const workspace = await res.json();

      // mở modal confirm xoá, truyền id và tên
      openDeleteModal(wsId, workspace.name);
    } catch (err) {
      console.error("Error fetching workspace:", err);
      alert("Error fetching workspace info!");
    }
  });
}

// ---------------- Hàm mở modal xoá workspace ----------------
function openDeleteModal(wsId, wsName) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "delete-modal";

  const modal = document.createElement("div");
  modal.className = "modal";

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.innerHTML = "&times;";

  const title = document.createElement("h3");
  title.textContent = "Enter workspace name to delete";

  const input = document.createElement("input");
  input.type = "text";
  input.id = "confirm-delete-input";
  input.placeholder = `Enter "${wsName}"`;

  const confirmBtn = document.createElement("button");
  confirmBtn.id = "confirm-delete-btn";
  confirmBtn.textContent = "Delete Workspace";
  confirmBtn.disabled = true;

  modal.appendChild(closeBtn);
  modal.appendChild(title);
  modal.appendChild(input);
  modal.appendChild(confirmBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.classList.add("show"), 10);

  // Đóng modal
  closeBtn.addEventListener("click", () => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 300);
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 300);
    }
  });

  // Kiểm tra input
  input.addEventListener("input", () => {
    if (input.value.trim() === wsName) {
      confirmBtn.disabled = false;
      confirmBtn.classList.add("enabled");
    } else {
      confirmBtn.disabled = true;
      confirmBtn.classList.remove("enabled");
    }
  });

  // Xác nhận xoá
  confirmBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`http://localhost:8127/v1/workspace/${wsId}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert("Workspace deleted successfully!");
        window.location.href = "/home.html"; // redirect sau khi xoá
      } else {
        alert(data.message || "Failed to delete workspace!");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server!");
    }

    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 300);
  });
}







