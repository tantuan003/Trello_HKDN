let currentVisibility = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadNav("settings-wsp");
  await loadWorkspaceForSettings();

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
      if (!dropdown.contains(e.target)) {
        dropdownContent.classList.remove("show");
      }
    }
  });

  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", async () => {
      const newVisibility = item.dataset.value.toLowerCase();
      await updateVisibilityOnServer(newVisibility);
      dropdownContent.classList.remove("show");
    });
  });

  const editBtn = document.getElementById("editWorkspaceName");
  const wsNameDiv = document.getElementById("ws-name");
  if (editBtn && wsNameDiv) {
    editBtn.addEventListener("click", () => enterEditMode(wsNameDiv.textContent));
  }

  const deleteBtn = document.querySelector(".delete-workspace");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const wsId = localStorage.getItem("currentWorkspaceId");
      if (!wsId) {
        showToast("No workspace selected!", "error");
        return;
      }
      try {
        const res = await fetch(`http://localhost:8127/v1/workspace/${wsId}`, { credentials: "include" });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const workspace = await res.json();
        openDeleteModal(wsId, workspace.name);
      } catch (err) {
        console.error("Error fetching workspace:", err);
        showToast("Error fetching workspace info!", "error");
      }
    });
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

    let wsId = new URLSearchParams(window.location.search).get("ws") || localStorage.getItem("currentWorkspaceId");
    let workspace = workspaces.find(ws => ws._id === wsId) || workspaces[0];

    localStorage.setItem("currentWorkspaceId", workspace._id);
    currentVisibility = workspace.visibility.toLowerCase();

    const url = new URL(window.location);
    url.searchParams.set("ws", workspace._id);
    window.history.replaceState({}, "", url);

    const wsNameDiv = document.getElementById("ws-name");
    if (wsNameDiv) wsNameDiv.textContent = workspace.name;

    updateVisibilityUI(currentVisibility);
    updateWsVisibility(currentVisibility);
  } catch (err) {
    console.error("Error loading workspace:", err);
    showToast("Error loading workspace: " + err.message, "error");
  }
}

// ---------------- Visibility ----------------
async function updateVisibilityOnServer(newVisibility) {
  const wsId = localStorage.getItem("currentWorkspaceId");
  if (!wsId) return showToast("Workspace ID not found!", "error");

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
      showToast("Workspace visibility updated successfully", "success");
    } else if (res.status === 403) {
      showToast("You are not owner of this workspace", "error");
    } else {
      showToast("Failed to update visibility: " + (data.message || "Unknown error"), "error");
    }
  } catch (err) {
    console.error("Error updating visibility:", err);
    showToast("Error updating visibility", "error");
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
  wsVisibilityDiv.innerHTML = visibility === "private"
    ? '<i class="fas fa-lock"></i> <span>Private</span>'
    : '<i class="fas fa-globe"></i> <span>Public</span>';
}

// ---------------- Edit workspace name ----------------
function enterEditMode(oldName) {
  const wsNameWrapper = document.querySelector(".ws-name-wrapper");
  if (!wsNameWrapper) return;

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
  if (!wsId) return showToast("Workspace ID not found!", "error");

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
          wsTitleEl.innerHTML = `<span class="ws-icon">${newName.charAt(0).toUpperCase()}</span>${newName}`;
        }
        showToast("Workspace name updated successfully", "success");
      } else if (res.status === 403) {
        showToast("You are not owner of this workspace", "error");
        restoreSpan(oldName);
      } else {
        showToast(data.message || "Failed to update workspace name", "error");
        restoreSpan(oldName);
      }
    })
    .catch(err => {
      console.error(err);
      showToast("Error connecting to server", "error");
      restoreSpan(oldName);
    });
}

function restoreSpan(name) {
  const span = document.createElement("div");
  span.id = "ws-name";
  span.textContent = name;

  const wrapper = document.getElementById("ws-edit-wrapper");
  if (wrapper) wrapper.replaceWith(span);

  const editBtn = document.getElementById("editWorkspaceName");
  if (editBtn) editBtn.style.display = "inline-block";
}

// ---------------- Delete workspace ----------------
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

  input.addEventListener("input", () => {
    confirmBtn.disabled = input.value.trim() !== wsName;
    confirmBtn.classList.toggle("enabled", input.value.trim() === wsName);
  });

  confirmBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`http://localhost:8127/v1/workspace/${wsId}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Workspace deleted successfully!", "success");
        window.location.href = "/home.html";
      } else {
        showToast(data.message || "Failed to delete workspace!", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server!", "error");
    }
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 300);
  });
}

// ---------------- Toastify helper ----------------
function showToast(message, type = "info") {
  let bg = "linear-gradient(to right, #2193b0, #6dd5ed)";
  if (type === "success") bg = "linear-gradient(to right, #4caf50, #2e7d32)";
  else if (type === "error") bg = "linear-gradient(to right, #f87171, #ef4444)";
  Toastify({ text: message, duration: 3000, gravity: "top", position: "right", close: true, style: { background: bg } }).showToast();
}
