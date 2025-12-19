let currentVisibility = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Load nav và highlight menu "settings-wsp"
  await loadNav("settings-wsp");

  // Sau khi nav đã load, lấy workspace hiện tại
  await loadWorkspaceForSettings();

  // Bind sự kiện đổi visibility
  const changeBtn = document.getElementById("change-visibility-btn");
  if (changeBtn) changeBtn.addEventListener("click", onToggleVisibility);

  // Bind edit workspace name
  const editBtn = document.getElementById("editWorkspaceName");
  const wsNameSpan = document.getElementById("ws-name");
  if (editBtn && wsNameSpan) {
    editBtn.addEventListener("click", () => enterEditMode(wsNameSpan.textContent));
  }
});

// ---------------- Load workspace info ----------------
async function loadWorkspaceForSettings() {
  try {
    const res = await fetch("http://localhost:8127/v1/workspace", { credentials: "include" });
    const workspaces = await res.json();

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      throw new Error("User không thuộc workspace nào");
    }

    // Lấy workspaceId từ URL hoặc localStorage
    let wsId = new URLSearchParams(window.location.search).get("ws") || localStorage.getItem("currentWorkspaceId");
    let workspace = workspaces.find(ws => ws._id === wsId) || workspaces[0];

    currentWorkspaceId = workspace._id;
    currentVisibility = workspace.visibility;
    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set("ws", currentWorkspaceId);
    window.history.replaceState({}, "", url);

    // Hiển thị tên workspace
    const wsNameSpan = document.getElementById("ws-name");
    if (wsNameSpan) wsNameSpan.textContent = workspace.name;

    // Hiển thị trạng thái visibility
    updateVisibilityUI(currentVisibility);
  } catch (err) {
    console.error("Error loading workspace:", err);
    alert("Lỗi khi load workspace: " + err.message);
  }
}

// ---------------- Visibility toggle ----------------
async function onToggleVisibility() {
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
}

// ---------------- Edit workspace name ----------------
function enterEditMode(oldName) {
  const wsNameSpan = document.getElementById("ws-name");
  if (!wsNameSpan) return;

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

  saveBtn.addEventListener("click", () => saveWorkspaceName(input.value, oldName));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveWorkspaceName(input.value, oldName);
  });
  cancelBtn.addEventListener("click", () => restoreSpan(oldName));
}

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
        // Update nav title too
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
  const span = document.createElement("span");
  span.id = "ws-name";
  span.textContent = name;

  const wrapper = document.getElementById("ws-edit-wrapper");
  if (wrapper) wrapper.replaceWith(span);
}

// ---------------- UI helpers ----------------
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
