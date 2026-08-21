(function () {
  "use strict";

  const RESPONSE_PREFIX = "tas:primary-industries:ahc20122:2026:v1:";
  const PROGRESS_PREFIX = "tas:primary-industries:ahc20122:2026:progress:v1:";
  const LAST_VISIT_KEY = PROGRESS_PREFIX + "last-visit";
  const root = document.body.dataset.root || "";
  const page = document.body.dataset.page || "home";
  const courseMap = window.PRIMARY_INDUSTRIES_COURSE_MAP || { tasks: {} };
  const tasks = Object.values(courseMap.tasks || {});
  const allModules = tasks.flatMap(function (task) {
    return task.modules.map(function (module) { return Object.assign({ taskId: task.id, taskTitle: task.title }, module); });
  });

  window.PRIMARY_INDUSTRIES_STORAGE_PREFIX = RESPONSE_PREFIX;
  window.PRIMARY_INDUSTRIES_PROGRESS_PREFIX = PROGRESS_PREFIX;
  window.PRIMARY_INDUSTRIES_ACTIVITY_PREFIX = "tas:primary-industries:ahc20122:2026:activity:v1:";
  window.PRIMARY_INDUSTRIES_ARTEFACT_PREFIX = "tas:primary-industries:ahc20122:2026:artefact:v1:";

  function local(href) { return root + href; }
  function completeById(id) { return localStorage.getItem(PROGRESS_PREFIX + id) === "true"; }
  function moduleComplete(module) {
    return completeById(module.progressId) || (module.legacyProgressIds || []).some(completeById);
  }
  function taskProgress(task) {
    const done = task.modules.filter(moduleComplete).length;
    return { done: done, total: task.modules.length, percent: task.modules.length ? Math.round(done / task.modules.length * 100) : 0 };
  }
  function overallProgress() {
    const done = allModules.filter(moduleComplete).length;
    return { done: done, total: allModules.length, percent: allModules.length ? Math.round(done / allModules.length * 100) : 0 };
  }

  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.href = local("assets/favicon.svg");
  icon.type = "image/svg+xml";
  document.head.append(icon);

  if (!document.body.classList.contains("toolkit-print-page")) {
    const navItems = [
      ["home", "Home", "index.html"],
      ["tasks", "Learning", "index.html#tasks"],
      ["activities", "Activities", "activities.html"],
      ["learning-record", "Learning Record", "learning-record.html"],
      ["progress", "Progress", "progress.html"],
      ["resources", "Resources", "resources.html"],
      ["teacher", "Teacher", "teacher-resources.html"]
    ];
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = '<a class="skip-link" href="#main-content">Skip to main content</a>' +
      '<div class="nav-wrap"><a class="brand" href="' + local("index.html") + '" aria-label="Primary Industries course home">' +
      '<span class="brand-mark" aria-hidden="true">PI</span><span class="brand-text">Stage 6 Primary Industries</span></a>' +
      '<span class="header-progress" data-header-progress aria-label="Course lesson progress">0%</span>' +
      '<button class="menu-button" type="button" aria-expanded="false" aria-controls="site-navigation">Menu</button>' +
      '<nav class="site-nav" id="site-navigation" aria-label="Course navigation">' +
      navItems.map(function (item) { return '<a href="' + local(item[2]) + '"' + (item[0] === page ? ' aria-current="page"' : '') + '>' + item[1] + '</a>'; }).join("") +
      '<a href="https://stevencowell.github.io/Main-Page/">Main Menu</a></nav></div>';
    document.body.prepend(header);

    const menuButton = header.querySelector(".menu-button");
    const navigation = header.querySelector(".site-nav");
    function closeMenu() {
      navigation.dataset.open = "false";
      menuButton.setAttribute("aria-expanded", "false");
    }
    menuButton.addEventListener("click", function () {
      const open = navigation.dataset.open === "true";
      navigation.dataset.open = String(!open);
      menuButton.setAttribute("aria-expanded", String(!open));
    });
    navigation.addEventListener("click", closeMenu);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navigation.dataset.open === "true") {
        closeMenu();
        menuButton.focus();
      }
    });

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = '<div class="footer-inner"><div><strong>AHC20122 Primary Industries</strong><p>Supplementary learning support · local saves stay on this device.</p></div>' +
      '<nav aria-label="Footer navigation"><a href="' + local("course-information.html") + '">Course information</a><a href="' + local("work-placement.html") + '">Work placement</a><a href="' + local("hsc-study.html") + '">HSC study</a><a href="' + local("teacher-resources.html") + '">Teacher program</a></nav></div>';
    document.body.append(footer);
  }

  function updateProgressUI() {
    const overall = overallProgress();
    document.querySelectorAll("[data-header-progress]").forEach(function (node) { node.textContent = overall.percent + "%"; });
    document.querySelectorAll("[data-overall-progress]").forEach(function (node) { node.textContent = overall.done + " of " + overall.total + " lessons"; });
    document.querySelectorAll("[data-overall-percent]").forEach(function (node) { node.textContent = overall.percent + "%"; });
    document.querySelectorAll("[data-overall-bar]").forEach(function (node) { node.style.width = overall.percent + "%"; });
    tasks.forEach(function (task) {
      const value = taskProgress(task);
      document.querySelectorAll('[data-task-progress="' + task.id + '"]').forEach(function (node) { node.textContent = value.done + "/" + value.total; });
      document.querySelectorAll('[data-task-bar="' + task.id + '"]').forEach(function (node) { node.style.width = value.percent + "%"; });
    });
    const last = localStorage.getItem(LAST_VISIT_KEY);
    const firstIncomplete = allModules.find(function (module) { return !moduleComplete(module); });
    const resume = allModules.find(function (module) { return module.href === last; }) || firstIncomplete || allModules[0];
    document.querySelectorAll("[data-resume]").forEach(function (link) {
      if (resume) {
        link.href = local(resume.href);
        link.textContent = overall.done ? "Resume: " + resume.title : "Start learning";
      }
    });
  }

  document.querySelectorAll("[data-progress]").forEach(function (checkbox) {
    const id = checkbox.dataset.progress;
    const legacy = (checkbox.dataset.legacyProgress || "").split("|").filter(Boolean);
    checkbox.checked = completeById(id) || legacy.some(completeById);
    checkbox.addEventListener("change", function () {
      localStorage.setItem(PROGRESS_PREFIX + id, String(checkbox.checked));
      updateProgressUI();
    });
    const current = allModules.find(function (module) { return module.progressId === id; });
    if (current) localStorage.setItem(LAST_VISIT_KEY, current.href);
  });

  const dashboard = document.querySelector("[data-progress-dashboard]");
  if (dashboard) {
    dashboard.innerHTML = tasks.map(function (task) {
      const value = taskProgress(task);
      return '<section class="panel progress-task"><div class="progress-task-head"><div><p class="micro-label">Learning package ' + task.number + '</p><h2>' + task.title + '</h2></div><strong>' + value.percent + '%</strong></div>' +
        '<div class="progress-track"><span style="width:' + value.percent + '%"></span></div><ol class="progress-module-list">' +
        task.modules.map(function (module, index) { return '<li class="' + (moduleComplete(module) ? 'is-complete' : '') + '"><span>' + (moduleComplete(module) ? '✓' : String(index + 1).padStart(2, "0")) + '</span><a href="' + local(module.href) + '">' + module.title + '</a></li>'; }).join("") +
        '</ol><a class="button-link secondary" href="' + local(task.href) + '">Open package ' + task.number + '</a></section>';
    }).join("");
  }

  document.querySelectorAll("[data-print]").forEach(function (button) { button.addEventListener("click", function () { window.print(); }); });

  const lightbox = document.createElement("dialog");
  lightbox.className = "visual-lightbox";
  lightbox.innerHTML = '<button type="button" class="lightbox-close">Close</button><img alt=""><p></p>';
  document.body.append(lightbox);
  let lightboxTrigger = null;
  function openLightbox(image) {
    lightboxTrigger = image;
    lightbox.querySelector("img").src = image.currentSrc || image.src;
    lightbox.querySelector("img").alt = image.alt || "Enlarged course visual";
    lightbox.querySelector("p").textContent = image.closest("figure")?.querySelector("figcaption")?.textContent.replace("Open larger", "").trim() || image.alt;
    lightbox.showModal();
    lightbox.querySelector("button").focus();
  }
  document.querySelectorAll("figure.visual-block > img, .lesson-visual > img").forEach(function (image) {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", (image.alt || "Course visual") + ". Open larger.");
    image.addEventListener("click", function () { openLightbox(image); });
    image.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openLightbox(image); } });
  });
  lightbox.querySelector("button").addEventListener("click", function () { lightbox.close(); });
  lightbox.addEventListener("click", function (event) { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener("close", function () { lightboxTrigger?.focus(); });

  updateProgressUI();
}());
