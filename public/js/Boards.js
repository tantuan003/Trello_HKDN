async function loadMyBoards() {
    try {
        const res = await fetch("http://localhost:8127/v1/board/myboards", {
            method: "GET",
            credentials: "include"
        });
        const boards = await res.json();

        const container = document.getElementById("boardContainer");
        container.innerHTML = "";
        if (!Array.isArray(boards)) {
            console.error("Boards không phải mảng:", boards);
            return;
        }

        boards.forEach(board => {
            const a = document.createElement("a");
            a.classList.add("board-card");
            a.href = `/board/${board._id}`;

            const cover = document.createElement("div");
            if (board.type === "template") {
                cover.classList.add("board-cover", "img-cover");
                const badge = document.createElement("span");
                badge.classList.add("badge", "badge-dark");
                badge.textContent = "TEMPLATE";
                cover.appendChild(badge);
            } else {
                cover.classList.add("board-cover", board.background || "gradient-1"); // <-- dùng background
            }

            const footer = document.createElement("div");
            footer.classList.add("board-footer");
            const title = document.createElement("span");
            title.classList.add("board-title");
            title.textContent = board.name;
            footer.appendChild(title);

            a.appendChild(cover);
            a.appendChild(footer);

            container.appendChild(a);
        });

    } catch (err) {
        console.error("Lỗi load boards:", err);
    }
}
// Chèn file components/sidebar_header.html vào #app-shell
async function inject(file, targetSelector) {
    try {
        const res = await fetch(file, { cache: 'no-store' });
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        const html = await res.text();
        document.querySelector(targetSelector).innerHTML = html;
    } catch (err) {
        console.error('Load component failed:', file, err);
    }
}

// Đánh dấu menu "Boards" sáng trong sidebar
function activateBoardsMenu() {
    const links = document.querySelectorAll('.nav .nav-item');
    links.forEach(a => a.classList.remove('is-active'));
    const boardsLink = [...links].find(a => /boards/i.test(a.textContent.trim()));
    if (boardsLink) boardsLink.classList.add('is-active');
}

document.addEventListener('DOMContentLoaded', async () => {
    // boards.html ở /public → component ở ./components/...
    await inject('./components/sidebar_header.html', '#app-shell');
    activateBoardsMenu();
});

//mở – đóng – tạo board
document.addEventListener("DOMContentLoaded", () => {
    const createCardBtn = document.querySelector(".create-card");
    const modal = document.getElementById("createBoardModal");
    const cancelBtn = document.getElementById("cancelCreateBoard");
    const createBtn = document.getElementById("createBoardBtn");
    const titleInput = document.getElementById("boardTitleInput");
    const colorOptions = document.querySelectorAll(".color-swatch");
    const workspaceSelect = document.getElementById("workspaceSelect");
    const visibility = document.getElementById("visibilitySelect").value;
    let selectedColor = "gradient-1";

    // ====== LOAD WORKSPACES ======
    async function loadWorkspaces() {
        try {
            const res = await fetch("http://localhost:8127/v1/workspace", {
                credentials: "include" // để gửi cookie
            }); // endpoint lấy workspace
            const data = await res.json();

            if (res.ok && Array.isArray(data)) {
                workspaceSelect.innerHTML = "";
                data.forEach(ws => {
                    const opt = document.createElement("option");
                    opt.value = ws._id;
                    opt.textContent = ws.name;
                    workspaceSelect.appendChild(opt);
                });
            } else {
                workspaceSelect.innerHTML = `<option value="">No workspace found</option>`;
            }

        } catch (err) {
            console.error("Lỗi khi tải workspace:", err);
        }
    }

    // Hiển thị popup
    createCardBtn.addEventListener("click", async () => {
        modal.style.display = "flex";
        await loadWorkspaces(); // load workspace mỗi khi mở popup
        titleInput.focus();
    });

    // Chọn màu
    colorOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            colorOptions.forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
            selectedColor = opt.dataset.color;
            console.log("Màu đã chọn:", selectedColor); // kiểm tra
        });
    });

    // Đóng modal
    cancelBtn.addEventListener("click", () => {
        modal.style.display = "none";
        titleInput.value = "";
    });

    // ====== CREATE BOARD ======
    createBtn.addEventListener("click", async () => {
        const name = titleInput.value.trim();
        const workspaceId = workspaceSelect.value;
        const visibility = document.getElementById("visibilitySelect").value;
        if (!name) return alert("Vui lòng nhập tên board");
        if (!workspaceId) return alert("Vui lòng chọn workspace");

        try {
            const res = await fetch("http://localhost:8127/v1/board/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    workspaceId,
                    visibility,
                    background: selectedColor
                }),
            });

            const data = await res.json();
            if (res.ok) {
                alert("Tạo board thành công!");
                modal.style.display = "none";
                titleInput.value = "";
                loadMyBoards();
            } else {
                alert("Lỗi tạo board: " + data.message);
            }
        } catch (err) {
            console.error("Create board error:", err);
        }
    });
});

window.addEventListener("DOMContentLoaded", loadMyBoards);