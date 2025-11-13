
// Inject component dùng lại cách như boards.html
async function inject(file, targetSelector) {
  try {
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    const html = await res.text();
    document.querySelector(targetSelector).innerHTML = html;

    if (file.includes("sidebar_header")) {
      const mod = await import("./Sidebar_Header.js");
      mod.initSidebarHeader();
    }
  } catch (err) {
    console.error("Load component failed:", file, err);
  }
}


// Đánh dấu menu Templates active & mở submenu
function activateTemplatesMenu() {
  const head = document.getElementById('templateMenu');
  if (head) {
    head.classList.add('is-active', 'active');
    const section = head.closest('.nav-section');
    section?.classList.add('open');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // templates.html ở /public → component ở ./components/...
  await inject('./components/sidebar_header.html', '#app-shell');
  activateTemplatesMenu();
});


// Tìm kiếm (ẩn/hiện card theo từ khoá)
document.addEventListener('input', (e) => {
  if (e.target.id !== 'templateSearch') return;
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#templateGrid .template-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});
