import { socket } from "../js/socket.js";
import { API_BASE } from "../js/config.js";

export async function initWorkspaceBoardsPage() {
    const boardContainer = document.getElementById("boardContainer");
    let pendingDelete = { boardId: null, cardEl: null };

    // ===================== DELETE MODAL =====================
    function ensureDeleteModal() {
        if (document.getElementById("deleteBoardModal")) return;

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.id = "deleteBoardModal";
        overlay.style.display = "none";

        overlay.innerHTML = `
        <div class="modal-box">
            <h3>Delete board?</h3>
            <p class="delete-desc">Bạn chắc chắn muốn xoá board này? Hành động này không thể hoàn tác.</p>
            <div class="modal-actions">
                <button id="confirmDeleteBoard" class="btn-danger">Delete</button>
                <button id="cancelDeleteBoard" class="btn-outline">Cancel</button>
            </div>
        </div>
    `;

        document.body.appendChild(overlay);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.style.display = "none";
        });
    }

    function openDeleteModal(boardId, cardEl) {
        ensureDeleteModal();
        pendingDelete = { boardId, cardEl };
        const overlay = document.getElementById("deleteBoardModal");
        overlay.style.display = "flex";

        const btnCancel = document.getElementById("cancelDeleteBoard");
        const btnConfirm = document.getElementById("confirmDeleteBoard");

        btnCancel.onclick = () => {
            overlay.style.display = "none";
            pendingDelete = { boardId: null, cardEl: null };
        };

        btnConfirm.onclick = async () => {
            btnConfirm.disabled = true;
            try {
                const res = await fetch(`${API_BASE}/v1/board/board/${pendingDelete.boardId}`, {
                    method: "DELETE",
                    credentials: "include"
                });
                const data = await res.json().catch(() => null);
                if (!res.ok || (data && data.success === false)) return alert(data?.message || "Xoá board thất bại!");
                if (pendingDelete.cardEl) pendingDelete.cardEl.remove();
                overlay.style.display = "none";
                pendingDelete = { boardId: null, cardEl: null };
            } catch (err) {
                console.error(err);
                alert("Lỗi server khi xoá board!");
            } finally {
                btnConfirm.disabled = false;
            }
        };
    }

    // ===================== LOAD WORKSPACE INFO =====================
    async function loadWorkspaceInfo(workspaceId) {
        try {
            const res = await fetch(`${API_BASE}/v1/workspace/${workspaceId}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Không thể lấy thông tin workspace");
            const workspace = await res.json();

            const workspaceTitleEl = document.getElementById("workspaceTitle");
            if (workspaceTitleEl) workspaceTitleEl.textContent = `${workspace.name} - Board`;

            return workspace;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    // ===================== LOAD BOARDS =====================
    async function loadBoards(workspaceId) {
        if (!boardContainer) return;
        let apiUrl = workspaceId
            ? `${API_BASE}/v1/board/workspace/${workspaceId}`
            : `${API_BASE}/v1/board/recent`;

        try {
            const res = await fetch(apiUrl, { credentials: "include" });
            const result = await res.json();
            const boards = result.data || result.boards || [];

            boardContainer.innerHTML = "";
            if (!boards.length) return boardContainer.innerHTML = `<p class="no-recent">No recently viewed boards yet.</p>`;
            boards.forEach(b => boardContainer.appendChild(createBoardCard(b)));
        } catch (err) {
            console.error(err);
        }
    }

    function createBoardCard(board) {
        const card = document.createElement("a");
        card.className = "board-card";
        card.href = `./BoardDetail.html?id=${board._id}`;
        card.dataset.boardId = board._id;

        const cover = document.createElement("div");
        cover.className = "board-cover";
        if (board.background?.startsWith("gradient")) cover.classList.add(board.background);
        else cover.style.backgroundImage = `url("${board.background}")`;

        const footer = document.createElement("div");
        footer.className = "board-footer";
        footer.innerHTML = `<span class="board-title">${board.name}</span>`;

        const delBtn = document.createElement("button");
        delBtn.className = "board-delete-btn";
        const delIcon = document.createElement("img");
        delIcon.src = "/uploads/icons8-delete-128.png";
        delIcon.alt = "Delete";
        delBtn.appendChild(delIcon);
        delBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openDeleteModal(board._id, card);
        };

        card.append(cover, footer, delBtn);
        return card;
    }

    // ===================== SOCKET =====================
    socket.on("board:deleted", ({ boardId }) => {
        const card = document.querySelector(`.board-card[data-board-id="${boardId}"]`);
        if (card) card.remove();
    });

    // ===================== INIT =====================
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get("ws"); // lấy workspaceId từ URL

    await loadWorkspaceInfo(workspaceId);
    await loadBoards(workspaceId);
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadNav("board-wsp"); // load nav nếu cần
    await initWorkspaceBoardsPage();
});
