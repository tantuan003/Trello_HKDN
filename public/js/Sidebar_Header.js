const WSP_KEY = "wspMenuCollapsed";

function initWorkspaceToggle() {
  const wsp = document.getElementById("wsp");
  const btn = document.getElementById("wspToggle");
  if (!wsp || !btn) return;

  const saved = localStorage.getItem(WSP_KEY);
  const collapsed = saved === "1";
  wsp.classList.toggle("is-collapsed", collapsed);
  btn.setAttribute("aria-expanded", String(!collapsed));

  btn.addEventListener("click", () => {
    const isCollapsed = wsp.classList.toggle("is-collapsed");
    btn.setAttribute("aria-expanded", String(!isCollapsed));
    localStorage.setItem(WSP_KEY, isCollapsed ? "1" : "0");
  });
}

function initTemplatesMenuToggle() {
  const nav = document.getElementById("sideNav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const head = e.target.closest(".nav-item.has-sub");
    if (!head) return;

    const section = head.closest(".nav-section");
    const clickOnChevron = !!e.target.closest(".chev");

    if (clickOnChevron) {
      e.preventDefault();
      section?.classList.toggle("open");
      head.classList.toggle("active");
    } else {
      const href = head.getAttribute("href") || "templates.html";
      window.location.href = href;
    }
  });
}

async function checkLogin() {
  const res = await fetch("http://localhost:8127/v1/User/checkToken", {
    method: "GET",
    credentials: "include"
  });

  const loginbtn = document.getElementById("loginBtn");
  const logoutbtn = document.getElementById("logoutBtn");
  if (!loginbtn || !logoutbtn) return;

  if (res.ok) {
    loginbtn.style.display = "none";
    logoutbtn.style.display = "flex";
  } else {
    loginbtn.style.display = "flex";
    logoutbtn.style.display = "none";
  }
}

export function initSidebarHeader() {
  if (document.body.dataset.sidebarHeaderInit === "1") return;

  initWorkspaceToggle();
  initTemplatesMenuToggle();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("http://localhost:8127/v1/User/logout", {
          method: "POST",
          credentials: "include"
        });
        const data = await res.json();
        console.log("Logout:", data);

        if (res.ok) {
          window.location.href = "/login.html";
        }
      } catch (err) {
        console.error("Lỗi logout:", err);
      }
    });
  }

  checkLogin();

  document.body.dataset.sidebarHeaderInit = "1";
}
