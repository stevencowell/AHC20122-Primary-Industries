(function () {
  "use strict";

  const root = document.querySelector("[data-pi-activity]");
  if (!root) return;

  const saveKey = root.dataset.saveKey;
  const completionKey = root.dataset.completionKey;
  const activityId = root.dataset.activityId;
  const moduleIds = (root.dataset.moduleIds || "").split(",").filter(Boolean);
  const status = root.querySelector("[data-save-status]");
  const result = root.querySelector("[data-check-result]");
  let saveTimer;

  function formControls() {
    return Array.from(root.querySelectorAll("input[name], select[name], textarea[name]"));
  }

  function valueOf(control) {
    if (control.type === "radio") {
      const selected = root.querySelector('input[type="radio"][name="' + CSS.escape(control.name) + '"]:checked');
      return selected ? selected.value : "";
    }
    if (control.type === "checkbox") return control.checked;
    return control.value;
  }

  function collectState() {
    const values = {};
    formControls().forEach(function (control) {
      if (control.type === "radio" && Object.prototype.hasOwnProperty.call(values, control.name)) return;
      values[control.name] = valueOf(control);
    });
    return {
      schemaVersion: "1.0.0",
      activityId: activityId,
      moduleIds: moduleIds,
      values: values,
      updatedAt: new Date().toISOString(),
      formativeOnly: true
    };
  }

  function showSaveState(message, state) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || "saved";
  }

  function saveNow() {
    window.clearTimeout(saveTimer);
    try {
      localStorage.setItem(saveKey, JSON.stringify(collectState()));
      showSaveState("Saved on this device", "saved");
    } catch (error) {
      showSaveState("Could not save in this browser. Print or download a backup before leaving.", "error");
    }
  }

  function scheduleSave() {
    showSaveState("Saving…", "saving");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 250);
  }

  function restore() {
    try {
      const state = JSON.parse(localStorage.getItem(saveKey) || "null");
      if (!state || !state.values) return;
      formControls().forEach(function (control) {
        if (!Object.prototype.hasOwnProperty.call(state.values, control.name)) return;
        const saved = state.values[control.name];
        if (control.type === "radio") control.checked = control.value === saved;
        else if (control.type === "checkbox") control.checked = Boolean(saved);
        else control.value = saved;
      });
      showSaveState("Restored from this device", "saved");
    } catch (error) {
      showSaveState("Saved data could not be restored. You can safely reset this activity.", "error");
    }
  }

  function setFeedback(node, correct, message) {
    if (!node) return;
    node.textContent = message;
    node.dataset.state = correct ? "correct" : "retry";
    node.closest(".check-item")?.classList.toggle("is-correct", correct);
    node.closest(".check-item")?.classList.toggle("needs-review", !correct);
  }

  function checkRadioGroup(group) {
    const expected = group.dataset.answer;
    const selected = group.querySelector('input[type="radio"]:checked');
    const feedback = group.querySelector("[data-item-feedback]");
    if (!selected) {
      setFeedback(feedback, false, "Choose a response before checking this item.");
      return false;
    }
    const correct = selected.value === expected;
    setFeedback(feedback, correct, selected.dataset.feedback || (correct ? "Correct." : "Review the evidence and try again."));
    return correct;
  }

  function checkSelect(control) {
    const expected = control.dataset.answer;
    const option = control.options[control.selectedIndex];
    const feedback = control.closest(".check-item")?.querySelector("[data-item-feedback]");
    const correct = control.value === expected;
    setFeedback(feedback, correct, option?.dataset.feedback || (control.value ? "Review the supplied evidence." : "Choose a response before checking this item."));
    control.classList.toggle("is-correct", correct);
    control.classList.toggle("needs-review", !correct);
    return correct;
  }

  function checkNumber(control) {
    const expected = Number(control.dataset.answer);
    const tolerance = Number(control.dataset.tolerance || "0");
    const entered = Number(control.value);
    const feedback = control.closest(".check-item")?.querySelector("[data-item-feedback]");
    const correct = control.value.trim() !== "" && Number.isFinite(entered) && Math.abs(entered - expected) <= tolerance;
    setFeedback(feedback, correct, correct ? control.dataset.correctFeedback : (control.value.trim() ? "Check the operation, units and supplied figures." : "Enter a value before checking this item."));
    control.classList.toggle("is-correct", correct);
    control.classList.toggle("needs-review", !correct);
    return correct;
  }

  function runCheck() {
    const radios = Array.from(root.querySelectorAll("[data-check-radio]"));
    const selects = Array.from(root.querySelectorAll("select[data-answer]"));
    const numbers = Array.from(root.querySelectorAll('input[type="number"][data-answer]'));
    const total = radios.length + selects.length + numbers.length;
    const score = radios.filter(checkRadioGroup).length + selects.filter(checkSelect).length + numbers.filter(checkNumber).length;
    if (result) {
      result.innerHTML = "<strong>" + score + " of " + total + " checked decisions are accurate.</strong> " + (score === total
        ? "Now complete the written practice record and explain the evidence behind your choices."
        : "Read the item feedback, use the support prompt and check again. Your responses remain saved.");
      result.dataset.state = score === total ? "correct" : "retry";
      result.focus();
    }
    saveNow();
  }

  function evidenceControls() {
    return Array.from(root.querySelectorAll("[data-evidence-field]"));
  }

  function markReady(button) {
    const missing = evidenceControls().filter(function (control) { return !control.value.trim(); });
    evidenceControls().forEach(function (control) {
      control.setAttribute("aria-invalid", missing.includes(control) ? "true" : "false");
    });
    if (missing.length) {
      showSaveState("Complete the highlighted evidence fields before marking the practice record ready.", "error");
      missing[0].focus();
      return;
    }
    try {
      localStorage.setItem(completionKey, JSON.stringify({ ready: true, at: new Date().toISOString(), formativeOnly: true }));
      button.textContent = "Practice record ready";
      button.dataset.state = "ready";
      showSaveState("Practice record marked ready on this device—not submitted or assessed.", "saved");
      saveNow();
    } catch (error) {
      showSaveState("Could not mark the record ready in this browser. Print or download a backup.", "error");
    }
  }

  function downloadRecord() {
    const state = collectState();
    state.exportedAt = new Date().toISOString();
    state.boundary = "Private formative practice only. This export is not an RTO assessment, workplace record or competency decision.";
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = activityId + "-practice-record.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 0);
  }

  function resetActivity() {
    if (!window.confirm("Reset only this activity's saved choices and written practice record on this device?")) return;
    localStorage.removeItem(saveKey);
    localStorage.removeItem(completionKey);
    root.querySelector("form")?.reset();
    root.querySelectorAll("[data-item-feedback]").forEach(function (node) { node.textContent = ""; node.removeAttribute("data-state"); });
    root.querySelectorAll(".is-correct, .needs-review").forEach(function (node) { node.classList.remove("is-correct", "needs-review"); });
    if (result) { result.textContent = ""; result.removeAttribute("data-state"); }
    const readyButton = root.querySelector("[data-mark-ready]");
    if (readyButton) {
      readyButton.textContent = "Mark practice record ready";
      readyButton.removeAttribute("data-state");
    }
    showSaveState("This activity has been reset on this device.", "saved");
  }

  root.addEventListener("input", scheduleSave);
  root.addEventListener("change", scheduleSave);
  root.querySelector("[data-check-activity]")?.addEventListener("click", runCheck);
  root.querySelector("[data-reset-activity]")?.addEventListener("click", resetActivity);
  root.querySelector("[data-download-record]")?.addEventListener("click", downloadRecord);
  root.querySelector("[data-print-activity]")?.addEventListener("click", function () { window.print(); });
  root.querySelector("[data-mark-ready]")?.addEventListener("click", function (event) { markReady(event.currentTarget); });

  restore();
  const readyButton = root.querySelector("[data-mark-ready]");
  if (readyButton && localStorage.getItem(completionKey)) {
    readyButton.textContent = "Practice record ready";
    readyButton.dataset.state = "ready";
  }
}());
