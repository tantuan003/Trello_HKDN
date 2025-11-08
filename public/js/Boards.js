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
                cover.classList.add("board-cover", board.cover || "gradient-1");
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

window.addEventListener("DOMContentLoaded", loadMyBoards);