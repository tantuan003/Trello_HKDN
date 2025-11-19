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

  // 🧩 Hàm tạo 1 thẻ board-card từ object board
  function createBoardCard(board) {
    const a = document.createElement('a');
    a.className = 'board-card';
    a.href = `/boards/${board._id}`; // link sang trang board chi tiết

    const cover = document.createElement('div');
    // dùng class background từ DB, fallback "gradient-1"
    cover.className = `board-cover ${board.background || 'gradient-1'}`;

    const footer = document.createElement('div');
    footer.className = 'board-footer';

    const title = document.createElement('span');
    title.className = 'board-title';
    title.textContent = board.name;

    footer.appendChild(title);
    a.appendChild(cover);
    a.appendChild(footer);

    return a;
  }

  // 🧩 Hàm gọi API lấy danh sách board đã xem gần đây
  async function loadRecentBoards() {
    const container = document.getElementById('recent-boards');
    const loadingEl = document.getElementById('recent-loading');

    try {
      const res = await fetch('http://localhost:8127/v1/board/recent', {
        credentials: 'include', // nếu bạn dùng cookie auth
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch recent boards');
      }

      const boards = await res.json();

      // Xoá text "Đang tải..."
      if (loadingEl) loadingEl.remove();

      if (!boards || boards.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'Chưa có board nào được xem gần đây.';
        container.appendChild(empty);
        return;
      }

      boards.forEach(board => {
        const card = createBoardCard(board);
        container.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      if (loadingEl) loadingEl.textContent = 'Không tải được danh sách board.';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await inject('./components/sidebar_header.html', '#app-shell');
    import("./js/Sidebar_Header.js").then(module => {
      module.initSidebarHeader();  
    });
    activateBoardsMenu();

    // 👉 Gọi API và render board-card
    loadRecentBoards();
  });