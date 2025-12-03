async function setupWorkspaceDropdown() {
    try {
        const res = await fetch("http://localhost:8127/v1/workspace", { credentials: "include" });
        const workspaces = await res.json();
        if (!workspaces || workspaces.length === 0) return;

        const wsContainer = document.getElementById("workspace-dropdown-container");
        const select = document.getElementById("workspace-select");

        // Lấy workspace hiện tại từ URL hoặc localStorage
        let wsId = new URLSearchParams(window.location.search).get("ws") || localStorage.getItem("currentWorkspaceId");
        let currentWs = workspaces.find(ws => ws._id === wsId) || workspaces[0];

        currentWorkspaceId = currentWs._id;
        localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

        select.innerHTML = "";
        workspaces.forEach(ws => {
            const option = document.createElement("option");
            option.value = ws._id;
            option.textContent = ws.name;
            if (ws._id === currentWorkspaceId) option.selected = true;
            select.appendChild(option);
        });

        select.addEventListener("change", (e) => {
            const newWsId = e.target.value;
            if (newWsId === currentWorkspaceId) return;

            currentWorkspaceId = newWsId;
            localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

            // Update URL
            const url = new URL(window.location);
            url.searchParams.set("ws", currentWorkspaceId);
            window.history.replaceState({}, "", url);

            // Reload page content theo workspace mới (tuỳ bạn gọi)
            // loadMembers(currentWorkspaceId);
        });

    } catch (err) {
        console.error("Error loading workspaces for dropdown:", err);
    }
}