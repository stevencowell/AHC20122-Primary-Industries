(function () {
  "use strict";

  const responsePrefix = window.PRIMARY_INDUSTRIES_STORAGE_PREFIX || "tas:primary-industries:ahc20122:2026:v1:";
  const progressPrefix = window.PRIMARY_INDUSTRIES_PROGRESS_PREFIX || "tas:primary-industries:ahc20122:2026:progress:v1:";
  const activityPrefix = window.PRIMARY_INDUSTRIES_ACTIVITY_PREFIX || "tas:primary-industries:ahc20122:2026:activity:v1:";
  const artefactPrefix = window.PRIMARY_INDUSTRIES_ARTEFACT_PREFIX || "tas:primary-industries:ahc20122:2026:artefact:v1:";
  const timers = new WeakMap();

  function fieldValue(field) {
    if (field.type === "checkbox") return String(field.checked);
    return field.value;
  }
  function restoreField(field, value) {
    if (field.type === "checkbox") field.checked = value === "true";
    else field.value = value;
  }
  function updateWordCount(field) {
    if (!field.id) return;
    const target = document.querySelector('[data-word-count-for="' + CSS.escape(field.id) + '"]');
    if (!target) return;
    const words = field.value.trim() ? field.value.trim().split(/\s+/).length : 0;
    target.textContent = words + (words === 1 ? " word" : " words");
  }
  function saveState(field, message) {
    const owner = field.closest(".response-card, .video-guide, .evidence-stage, .record-row, .panel");
    const state = owner?.querySelector(".save-state");
    if (!state) return;
    state.textContent = message || "Saved on this device";
  }

  document.querySelectorAll("[data-save]").forEach(function (field) {
    const key = responsePrefix + field.dataset.save;
    const legacyIds = (field.dataset.legacySave || "").split("|").filter(Boolean);
    let saved = localStorage.getItem(key);
    if (saved === null) {
      const legacyId = legacyIds.find(function (id) { return localStorage.getItem(responsePrefix + id) !== null; });
      if (legacyId) {
        saved = localStorage.getItem(responsePrefix + legacyId);
        localStorage.setItem(key, saved);
      }
    }
    if (saved !== null) restoreField(field, saved);
    updateWordCount(field);
    const eventName = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, function () {
      try {
        localStorage.setItem(key, fieldValue(field));
        updateWordCount(field);
        saveState(field, "Saving…");
        clearTimeout(timers.get(field));
        timers.set(field, setTimeout(function () { saveState(field); }, 300));
      } catch (error) {
        saveState(field, "Could not save — download a backup or free browser storage");
      }
    });
  });

  function showCheckFeedback(box, selected) {
    const feedback = box.querySelector(".feedback");
    if (!feedback || !selected) return;
    const correct = selected.value === box.dataset.answer;
    const specific = selected.dataset.feedback || "Review the explanation and workplace consequence.";
    const summary = correct ? (box.dataset.correct || "") : "";
    const specificClean = correct ? specific.replace(/^Correct[.!]?\s*/i, "") : specific;
    const summaryClean = correct ? summary.replace(/^Correct\s*[—.!]?\s*/i, "") : "";
    if (correct) {
      feedback.innerHTML = '<strong>Correct.</strong> ' + specificClean + (summaryClean && !specificClean.includes(summaryClean) ? ' <span>' + summaryClean + '</span>' : '');
    } else {
      feedback.innerHTML = '<strong>Review and retry.</strong> ' + specific + '<span class="feedback-help"><strong>Help:</strong> ' + (box.dataset.help || "Return to the explanation and compare the workplace consequence.") + '</span>';
    }
    feedback.dataset.state = correct ? "correct" : "retry";
  }

  document.querySelectorAll(".knowledge-check").forEach(function (box) {
    const inputs = Array.from(box.querySelectorAll('input[type="radio"]'));
    const saveKey = responsePrefix + "check:" + box.dataset.checkSave;
    const saved = localStorage.getItem(saveKey);
    if (saved !== null) {
      const input = inputs.find(function (item) { return item.value === saved; });
      if (input) {
        input.checked = true;
        showCheckFeedback(box, input);
      }
    }
    inputs.forEach(function (input) {
      input.addEventListener("change", function () {
        localStorage.setItem(saveKey, input.value);
        showCheckFeedback(box, input);
      });
    });
    box.querySelector("[data-clear-check]")?.addEventListener("click", function () {
      inputs.forEach(function (input) { input.checked = false; });
      localStorage.removeItem(saveKey);
      const feedback = box.querySelector(".feedback");
      feedback.textContent = "Answer cleared. Choose an option when you are ready to practise again.";
      feedback.dataset.state = "";
    });
  });

  document.querySelectorAll("[data-reveal]").forEach(function (button) {
    const target = document.getElementById(button.dataset.reveal);
    if (!target) return;
    button.addEventListener("click", function () {
      const open = target.hidden;
      target.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Hide response scaffold" : "Show response scaffold";
    });
  });

  document.querySelectorAll("[data-copy-from]").forEach(function (button) {
    button.addEventListener("click", function () {
      const source = document.getElementById(button.dataset.copyFrom);
      if (!source) return;
      navigator.clipboard.writeText(source.value).then(function () {
        const original = button.textContent;
        button.textContent = "Copied";
        setTimeout(function () { button.textContent = original; }, 1200);
      }).catch(function () { window.alert("Select the response and copy it manually."); });
    });
  });

  function collect(prefix) {
    const result = {};
    Object.keys(localStorage).forEach(function (key) {
      if (key.startsWith(prefix)) result[key.slice(prefix.length)] = localStorage.getItem(key);
    });
    return result;
  }
  const backupButton = document.querySelector("[data-backup]");
  if (backupButton) backupButton.addEventListener("click", function () {
    const data = {
      schema: 3,
      course: "AHC20122",
      savedAt: new Date().toISOString(),
      responses: collect(responsePrefix),
      progress: collect(progressPrefix),
      activities: collect(activityPrefix),
      artefacts: collect(artefactPrefix)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ahc20122-primary-industries-learning-backup-v1.json";
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
  });

  function restoreGroup(group, prefix) {
    if (!group || typeof group !== "object") return;
    Object.entries(group).forEach(function (entry) { localStorage.setItem(prefix + entry[0], String(entry[1])); });
  }
  const restoreInput = document.querySelector("[data-restore]");
  if (restoreInput) restoreInput.addEventListener("change", function () {
    const file = restoreInput.files?.[0];
    if (!file) return;
    file.text().then(function (text) {
      const data = JSON.parse(text);
      if (![1, 2, 3].includes(data.schema) || data.course !== "AHC20122" || !data.responses) throw new Error("Invalid backup");
      restoreGroup(data.responses, responsePrefix);
      restoreGroup(data.progress, progressPrefix);
      if (data.schema >= 3) {
        restoreGroup(data.activities, activityPrefix);
        restoreGroup(data.artefacts, artefactPrefix);
      }
      window.location.reload();
    }).catch(function () { window.alert("That file is not a valid AHC20122 learning backup."); });
  });

  const resetButton = document.querySelector("[data-reset]");
  if (resetButton) resetButton.addEventListener("click", function () {
    if (!window.confirm("Clear all saved Primary Industries responses, checks, activities, artefacts and progress from this device? Download a backup first if you need one.")) return;
    const prefixes = [responsePrefix, progressPrefix, activityPrefix, artefactPrefix];
    Object.keys(localStorage).forEach(function (key) {
      if (prefixes.some(function (prefix) { return key.startsWith(prefix); })) localStorage.removeItem(key);
    });
    window.location.reload();
  });
}());
