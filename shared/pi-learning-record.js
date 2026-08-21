(function () {
  "use strict";

  const root = document.querySelector("[data-pi-learning-record]");
  const dataNode = document.getElementById("pi-learning-record-data");
  if (!root || !dataNode) return;

  let data;
  try {
    data = JSON.parse(dataNode.textContent);
  } catch (error) {
    root.innerHTML = "<p role=\"alert\">The learning-record map could not be loaded. Return to the course home and try again.</p>";
    return;
  }

  const timers = new WeakMap();
  const status = root.querySelector("[data-record-status]");
  const restoreInput = root.querySelector("[data-restore-record]");
  const allModuleKeys = data.tasks.flatMap(function (task) { return task.modules.map(function (module) { return module.storageKey; }); });
  const allActivityKeys = data.tasks.flatMap(function (task) { return [task.activity.saveKey, task.activity.completionKey]; });
  const allReflectionKeys = data.tasks.map(function (task) { return task.reflection.saveKey; });
  const allOwnedKeys = allModuleKeys.concat(allActivityKeys, allReflectionKeys);

  function localValue(key) {
    try { return localStorage.getItem(key); }
    catch (error) { return null; }
  }

  function hasText(key) {
    const value = localValue(key);
    return typeof value === "string" && value.trim().length > 0;
  }

  function activityState(task) {
    const saved = hasText(task.activity.saveKey);
    const completionRaw = localValue(task.activity.completionKey);
    let ready = false;
    if (completionRaw) {
      try {
        const parsed = JSON.parse(completionRaw);
        ready = parsed === true || parsed?.ready === true;
      }
      catch (error) { ready = completionRaw === "true"; }
    }
    return { saved: saved, ready: ready };
  }

  function announce(message, state) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || "ok";
  }

  function wordCount(field) {
    const count = field.value.trim() ? field.value.trim().split(/\s+/).length : 0;
    const target = root.querySelector('[data-word-count-for="' + CSS.escape(field.id) + '"]');
    if (target) target.textContent = count + (count === 1 ? " word" : " words");
  }

  function saveReflection(field) {
    window.clearTimeout(timers.get(field));
    try {
      if (field.value.trim()) localStorage.setItem(field.dataset.reflectionKey, field.value);
      else localStorage.removeItem(field.dataset.reflectionKey);
      const saved = field.closest(".reflection-box")?.querySelector("[data-reflection-status]");
      if (saved) saved.textContent = field.value.trim() ? "Saved on this device" : "Optional reflection is blank";
      wordCount(field);
      renderStatuses();
      announce("Optional reflection saved on this device—not submitted.", "ok");
    } catch (error) {
      announce("This browser could not save the reflection. Download a private backup before leaving.", "error");
    }
  }

  function scheduleReflectionSave(field) {
    const saved = field.closest(".reflection-box")?.querySelector("[data-reflection-status]");
    if (saved) saved.textContent = "Saving…";
    window.clearTimeout(timers.get(field));
    timers.set(field, window.setTimeout(function () { saveReflection(field); }, 250));
  }

  function restoreReflections() {
    root.querySelectorAll("[data-reflection-key]").forEach(function (field) {
      const value = localValue(field.dataset.reflectionKey);
      field.value = value || "";
      wordCount(field);
      const saved = field.closest(".reflection-box")?.querySelector("[data-reflection-status]");
      if (saved) saved.textContent = value ? "Restored from this device" : "Optional reflection is blank";
    });
  }

  function setStatus(selector, text, state) {
    const node = root.querySelector(selector);
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
  }

  function renderStatuses() {
    let moduleSaved = 0;
    let activitySaved = 0;
    let activityReady = 0;
    let reflectionsSaved = 0;
    let nextAction = null;

    data.tasks.forEach(function (task) {
      let taskModules = 0;
      task.modules.forEach(function (module) {
        const saved = hasText(module.storageKey);
        if (saved) { moduleSaved += 1; taskModules += 1; }
        if (!saved && !nextAction) nextAction = { href: module.route, text: "Continue with " + module.title, detail: "Task " + task.number + " lesson response is not yet saved on this device." };
        setStatus('[data-module-status="' + CSS.escape(module.saveId) + '"]', saved ? "Saved locally" : "Not yet saved", saved ? "saved" : "empty");
      });

      const activity = activityState(task);
      if (activity.saved) activitySaved += 1;
      if (activity.ready) activityReady += 1;
      if (!activity.saved && !nextAction) nextAction = { href: task.activity.route, text: "Open " + task.activity.title, detail: "Task " + task.number + " activity record is not yet saved on this device." };
      const activityLabel = activity.ready ? "Practice record marked ready locally" : (activity.saved ? "Practice responses saved locally" : "Not yet saved");
      setStatus('[data-activity-status="' + CSS.escape(task.activity.id) + '"]', activityLabel, activity.ready ? "ready" : (activity.saved ? "saved" : "empty"));

      const reflectionSaved = hasText(task.reflection.saveKey);
      if (reflectionSaved) reflectionsSaved += 1;
      setStatus('[data-reflection-index-status="' + CSS.escape(task.id) + '"]', reflectionSaved ? "Optional reflection saved" : "Optional reflection blank", reflectionSaved ? "saved" : "optional");

      const taskStatus = root.querySelector('[data-task-status="' + CSS.escape(task.id) + '"]');
      if (taskStatus) {
        taskStatus.textContent = taskModules + " of 4 lesson responses saved · " + activityLabel.toLowerCase() + " · " + (reflectionSaved ? "optional reflection saved" : "optional reflection blank");
      }
    });

    setStatus("[data-module-summary]", moduleSaved + " of 52 lesson responses saved on this device", moduleSaved ? "saved" : "empty");
    setStatus("[data-activity-summary]", activitySaved + " of 13 activity records saved; " + activityReady + " marked ready locally", activitySaved ? "saved" : "empty");
    setStatus("[data-reflection-summary]", reflectionsSaved + " optional task reflections saved", reflectionsSaved ? "saved" : "optional");

    const nextLink = root.querySelector("[data-next-action-link]");
    const nextDetail = root.querySelector("[data-next-action-detail]");
    if (nextLink && nextDetail) {
      if (nextAction) {
        nextLink.hidden = false;
        nextLink.href = nextAction.href;
        nextLink.textContent = nextAction.text;
        nextDetail.textContent = nextAction.detail;
      } else {
        nextLink.hidden = true;
        nextLink.removeAttribute("href");
        nextDetail.textContent = "All 52 lesson responses and 13 activity records are present on this device. Optional reflections can still be revised at any time.";
      }
    }
  }

  function collectBackup() {
    const moduleResponses = {};
    const activities = {};
    const reflections = {};
    data.tasks.forEach(function (task) {
      task.modules.forEach(function (module) {
        const value = localValue(module.storageKey);
        if (value !== null) moduleResponses[module.saveId] = value;
      });
      const saved = localValue(task.activity.saveKey);
      const completion = localValue(task.activity.completionKey);
      if (saved !== null || completion !== null) activities[task.activity.id] = { savedState: saved, completionState: completion };
      const reflection = localValue(task.reflection.saveKey);
      if (reflection !== null) reflections[task.id] = reflection;
    });
    return {
      schemaVersion: 1,
      courseCode: data.courseCode,
      recordType: "supplementary-learning-record-backup",
      createdAt: new Date().toISOString(),
      privacyNotice: "Private device-local formative learning record. Not an RTO assessment, competency decision, work-placement record or formal submission. No photos are included.",
      moduleResponses: moduleResponses,
      activities: activities,
      optionalReflections: reflections
    };
  }

  function downloadBackup() {
    const backup = collectBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "ahc20122-primary-industries-private-learning-record-v1.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 0);
    announce("Private JSON backup downloaded. It contains entered text but no photos; store it securely.", "ok");
  }

  function clearOwnedKeys() {
    allOwnedKeys.forEach(function (key) { localStorage.removeItem(key); });
  }

  function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function normaliseOwnBackup(backup) {
    if (backup.schemaVersion !== 1 || backup.courseCode !== data.courseCode || backup.recordType !== "supplementary-learning-record-backup") throw new Error("wrong-record");
    if (!isObject(backup.moduleResponses) || !isObject(backup.activities) || !isObject(backup.optionalReflections)) throw new Error("missing-groups");
    const values = new Map();
    data.tasks.forEach(function (task) {
      task.modules.forEach(function (module) {
        const value = backup.moduleResponses[module.saveId];
        if (typeof value === "string") values.set(module.storageKey, value);
      });
      const activity = backup.activities[task.activity.id];
      if (isObject(activity)) {
        if (typeof activity.savedState === "string") values.set(task.activity.saveKey, activity.savedState);
        if (typeof activity.completionState === "string") values.set(task.activity.completionKey, activity.completionState);
      }
      const reflection = backup.optionalReflections[task.id];
      if (typeof reflection === "string") values.set(task.reflection.saveKey, reflection);
    });
    return { values: values, type: "learning-record" };
  }

  function normaliseSharedBackup(backup) {
    if (![1, 2, 3].includes(backup.schema) || backup.course !== data.courseCode || !isObject(backup.responses)) throw new Error("wrong-shared-record");
    const values = new Map();
    data.tasks.forEach(function (task) {
      task.modules.forEach(function (module) {
        const value = backup.responses[module.saveId];
        if (typeof value === "string") values.set(module.storageKey, value);
      });
      if (backup.schema >= 3 && isObject(backup.activities)) {
        const saved = backup.activities[task.activity.id];
        if (typeof saved === "string") values.set(task.activity.saveKey, saved);
      }
      if (isObject(backup.progress)) {
        const completion = backup.progress["activity:" + task.activity.id];
        if (typeof completion === "string") values.set(task.activity.completionKey, completion);
      }
    });
    return { values: values, type: "compatible course" };
  }

  function restoreBackup(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      announce("That file is larger than 5 MB and is not a valid text-only learning-record backup.", "error");
      restoreInput.value = "";
      return;
    }
    file.text().then(function (text) {
      const parsed = JSON.parse(text);
      let normalised;
      try { normalised = normaliseOwnBackup(parsed); }
      catch (ownError) { normalised = normaliseSharedBackup(parsed); }
      if (!window.confirm("Restore this " + normalised.type + " backup? It will replace only the 52 indexed lesson responses, 13 activity records and optional task reflections on this device. Other course data is left unchanged.")) {
        restoreInput.value = "";
        announce("Restore cancelled. Nothing changed.", "ok");
        return;
      }
      clearOwnedKeys();
      normalised.values.forEach(function (value, key) { localStorage.setItem(key, value); });
      restoreReflections();
      renderStatuses();
      restoreInput.value = "";
      announce("Backup restored on this device. Review the indexed statuses before continuing.", "ok");
    }).catch(function () {
      restoreInput.value = "";
      announce("That file is not a valid AHC20122 learning-record or compatible course backup. Nothing changed.", "error");
    });
  }

  function resetRecord() {
    if (!window.confirm("Reset this device-local learning record? This clears the 52 indexed lesson responses, 13 activity records and optional task reflections only. Download a private backup first if you may need them.")) return;
    clearOwnedKeys();
    restoreReflections();
    renderStatuses();
    announce("The indexed learning record has been cleared from this device. Other course data was not changed.", "ok");
  }

  function preparePrint() {
    root.querySelectorAll("[data-reflection-key]").forEach(function (field) {
      const target = field.closest(".reflection-box")?.querySelector("[data-print-reflection]");
      if (target) target.textContent = field.value.trim() || "No optional reflection saved.";
    });
  }

  root.querySelectorAll("[data-reflection-key]").forEach(function (field) {
    field.addEventListener("input", function () { scheduleReflectionSave(field); });
  });
  root.querySelector("[data-download-record]")?.addEventListener("click", downloadBackup);
  restoreInput?.addEventListener("change", function () { restoreBackup(restoreInput.files?.[0]); });
  root.querySelector("[data-reset-record]")?.addEventListener("click", resetRecord);
  root.querySelector("[data-refresh-record]")?.addEventListener("click", function () { renderStatuses(); announce("Device-local status refreshed.", "ok"); });
  root.querySelector("[data-print-record]")?.addEventListener("click", function () { preparePrint(); window.print(); });
  window.addEventListener("beforeprint", preparePrint);

  restoreReflections();
  renderStatuses();
}());
