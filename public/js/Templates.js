// ================== Inject header + sidebar ==================
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

// ================== Active menu Templates ==================
function activateTemplatesMenu() {
  const links = document.querySelectorAll(".nav .nav-item");
  links.forEach((a) => a.classList.remove("is-active"));

  const byData = document.querySelector('.nav .nav-item[data-target="templates"]');
  if (byData) {
    byData.classList.add("is-active");
    return;
  }

  const tmplLink = [...links].find((a) =>
    /templates/i.test(a.textContent.trim())
  );
  if (tmplLink) tmplLink.classList.add("is-active");
}

// ================== DATA: 5 nhóm template ==================
const TEMPLATE_GROUPS = [
  {
    id: "education",
    title: "Education",
    boards: [
      {
        id: "classroom",
        name: "Classroom management",
        category: "Education",
        accent: "./images/classroommanagement.png",
        lists: [],
      },
      {
        id: "course-plan",
        name: "Course planning",
        category: "Education",
        accent: "./images/courseplanning.png",
        lists: [],
      },
      {
        id: "student-projects",
        name: "Student projects",
        category: "Education",
        accent: "./images/studentprojects.png",
        lists: [],
      },
      {
        id: "exam-prep",
        name: "Exam preparation",
        category: "Education",
        accent: "./images/exampreparation.png",
        lists: [],
      },
    ],
  },

  {
    id: "business",
    title: "Business",
    boards: [
      {
        id: "okr",
        name: "OKR tracking",
        category: "Business",
        accent: "./images/okrtracking.png",          // <-- chèn ảnh OKR ở đây
        lists: [],
      },
      {
        id: "sales",
        name: "Sales pipeline",
        category: "Business",
        accent: "./images/salespipeline.png",        // <-- ảnh Sales
        lists: [],
      },
      {
        id: "marketing",
        name: "Marketing campaigns",
        category: "Business",
        accent: "./images/marketingcampaigns.png",   // <-- ảnh Marketing
        lists: [],
      },
      {
        id: "hiring",
        name: "Hiring process",
        category: "Business",
        accent: "./images/hiringprocess.png",        // <-- ảnh Hiring
        lists: [],
      },
    ],
  },

  {
    id: "economy",
    title: "Economy",
    boards: [
      {
        id: "budget",
        name: "Budget planning",
        category: "Economy",
        accent: "./images/budgetplanning.png",       // <-- ảnh Budget
        lists: [],
      },
      {
        id: "invest",
        name: "Investment ideas",
        category: "Economy",
        accent: "./images/investmentideas.png",      // <-- ảnh Investment
        lists: [],
      },
      {
        id: "cost",
        name: "Cost control",
        category: "Economy",
        accent: "./images/costcontrol.png",          // <-- ảnh Cost control
        lists: [],
      },
      {
        id: "report",
        name: "Financial reports",
        category: "Economy",
        accent: "./images/financialreports.png",     // <-- ảnh Report
        lists: [],
      },
    ],
  },

  {
    id: "engineering",
    title: "Engineering",
    boards: [
      {
        id: "sprint",
        name: "Sprint board",
        category: "Engineering",
        accent: "./images/sprintboard.png",          // <-- ảnh Sprint
        lists: [],
      },
      {
        id: "bug",
        name: "Bug tracking",
        category: "Engineering",
        accent: "./images/bugtracking.png",          // <-- ảnh Bug
        lists: [],
      },
      {
        id: "release",
        name: "Release checklist",
        category: "Engineering",
        accent: "./images/releasechecklist.png",     // <-- ảnh Release
        lists: [],
      },
      {
        id: "roadmap",
        name: "Tech roadmap",
        category: "Engineering",
        accent: "./images/techroadmap.png",          // <-- ảnh Roadmap
        lists: [],
      },
    ],
  },

  {
    id: "production",
    title: "Production",
    boards: [
      {
        id: "schedule",
        name: "Production schedule",
        category: "Production",
        accent: "./images/productionschedule.png",   // <-- ảnh Schedule
        lists: [],
      },
      {
        id: "qc",
        name: "Quality control",
        category: "Production",
        accent: "./images/qualitycontrol.png",       // <-- ảnh QC
        lists: [],
      },
      {
        id: "maintenance",
        name: "Maintenance tasks",
        category: "Production",
        accent: "./images/maintenancetasks.png",     // <-- ảnh Maintenance
        lists: [],
      },
      {
        id: "inventory",
        name: "Inventory",
        category: "Production",
        accent: "./images/inventory.png",            // <-- ảnh Inventory
        lists: [],
      },
    ],
  },
];

let currentTemplate = null;

// ================== Tạo 1 card template ==================
function createTemplateCard(tpl) {
  const card = document.createElement("article");
  card.className = "template-card";

  const thumb = document.createElement("div");
  thumb.className = "template-card__thumb";

  // Nếu accent là URL ảnh → hiển thị ảnh
  if (
    tpl.accent &&
    (tpl.accent.endsWith(".png") ||
      tpl.accent.endsWith(".jpg") ||
      tpl.accent.endsWith(".jpeg") ||
      tpl.accent.includes("/"))
  ) {
    thumb.style.backgroundImage = `url("${tpl.accent}")`;
    thumb.style.backgroundSize = "cover";
    thumb.style.backgroundPosition = "center";
  } else {
    thumb.className += " " + (tpl.accent || "template-gradient-1");
  }

  const body = document.createElement("div");
  body.className = "template-card__body";

  const title = document.createElement("h3");
  title.className = "template-card__title";
  title.textContent = tpl.name;

  const desc = document.createElement("p");
  desc.className = "template-card__desc";
  desc.textContent = tpl.desc || "";

  const meta = document.createElement("div");
  meta.className = "template-card__meta";

  const cat = document.createElement("span");
  cat.className = "template-card__category";
  cat.textContent = tpl.category;

  const btn = document.createElement("button");
  btn.className = "template-card__btn";
  btn.textContent = "Use template";

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    useTemplate(tpl);
  });

  card.addEventListener("click", () => useTemplate(tpl));

  meta.appendChild(cat);
  meta.appendChild(btn);
  body.appendChild(title);
  body.appendChild(desc);
  body.appendChild(meta);

  card.appendChild(thumb);
  card.appendChild(body);

  return card;
}

// ================== Render ==================
function renderTemplateSections() {
  const container = document.getElementById("templateSections");
  if (!container) return;
  container.innerHTML = "";

  TEMPLATE_GROUPS.forEach((group) => {
    const section = document.createElement("section");
    section.className = "template-section";

    const heading = document.createElement("h2");
    heading.className = "template-section-heading";
    heading.textContent = group.title;

    const grid = document.createElement("div");
    grid.className = "template-grid";

    group.boards.forEach((tpl) => {
      grid.appendChild(createTemplateCard(tpl));
    });

    section.appendChild(heading);
    section.appendChild(grid);
    container.appendChild(section);
  });
}

// ================== Modal ==================
async function loadWorkspacesIntoSelect(selectEl) {
  try {
    const res = await fetch("http://localhost:8127/v1/workspace", { credentials: "include" });
    const workspaces = await res.json();

    if (!Array.isArray(workspaces) || workspaces.length === 0)
      return (selectEl.innerHTML = "<option>(Không có workspace)</option>");

    selectEl.innerHTML = "";
    workspaces.forEach((w) => {
      const opt = document.createElement("option");
      opt.value = w._id;
      opt.textContent = w.name;
      selectEl.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

function openCreateBoardModalFromTemplate(tpl) {
  currentTemplate = tpl;

  const modal = document.getElementById("createBoardModal");
  const titleInput = document.getElementById("boardTitleInput");
  const workspaceSelect = document.getElementById("workspaceSelect");
  const visibilitySelect = document.getElementById("visibilitySelect");

  titleInput.value = "";
  visibilitySelect.value = "private";

  modal.style.display = "flex";
  loadWorkspacesIntoSelect(workspaceSelect);
  titleInput.focus();
}

function initTemplateModal() {
  const modal = document.getElementById("createBoardModal");
  const cancelBtn = document.getElementById("cancelCreateBoard");
  const createBtn = document.getElementById("createBoardBtn");

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    currentTemplate = null;
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      currentTemplate = null;
    }
  });

  createBtn.addEventListener("click", async () => {
    const titleInput = document.getElementById("boardTitleInput");
    const workspaceSelect = document.getElementById("workspaceSelect");
    const visibilitySelect = document.getElementById("visibilitySelect");

    const boardName = titleInput.value.trim() || "New board";
    const workspaceId = workspaceSelect.value;
    const visibility = visibilitySelect.value;

    if (!workspaceId) return alert("Hãy chọn workspace.");

    await createBoardFromTemplate(currentTemplate, {
      workspaceId,
      boardName,
      visibility,
    });
  });
}

// ================== Tạo board ==================
async function createBoardFromTemplate(tpl, { workspaceId, boardName, visibility }) {
  try {
    const res = await fetch("http://localhost:8127/v1/board/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: boardName,
        workspaceId,
        visibility,
        background: tpl.accent, // accent = URL ảnh
      }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Tạo board thất bại.");

    const boardId = data.board?._id || data._id;
    if (!boardId) return alert("Không tìm thấy ID board.");

    for (const list of tpl.lists || []) {
      const listRes = await fetch(
        `http://localhost:8127/v1/board/create-list/${boardId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: list.name }),
        }
      );
      const newList = await listRes.json();

      for (const card of list.cards || []) {
        await fetch(
          `http://localhost:8127/v1/board/create-card/${newList._id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: card.name,
              description: card.description || "",
            }),
          }
        );
      }
    }

    window.location.href = `./BoardDetail.html?id=${boardId}`;
  } catch (err) {
    console.error(err);
    alert("Có lỗi xảy ra.");
  }
}

// ================== Use template ==================
function useTemplate(tpl) {
  openCreateBoardModalFromTemplate(tpl);
}

// ================== Init ==================
document.addEventListener("DOMContentLoaded", async () => {
  await inject("./components/sidebar_header.html", "#app-shell");
  activateTemplatesMenu();
  renderTemplateSections();
  initTemplateModal();
});
