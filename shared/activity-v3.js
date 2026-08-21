(function () {
  "use strict";

  const workspace = document.querySelector("[data-activity-save]");
  if (!workspace) return;
  const saveId = workspace.dataset.activitySave;
  const activityId = workspace.dataset.activityId;
  const activityPrefix = window.PRIMARY_INDUSTRIES_ACTIVITY_PREFIX || "tas:primary-industries:ahc20122:2026:activity:v1:";
  const responsePrefix = window.PRIMARY_INDUSTRIES_STORAGE_PREFIX || "tas:primary-industries:ahc20122:2026:v1:";
  const progressPrefix = window.PRIMARY_INDUSTRIES_PROGRESS_PREFIX || "tas:primary-industries:ahc20122:2026:progress:v1:";
  const stateKey = activityPrefix + saveId;
  const feedback = workspace.querySelector(".activity-feedback");

  function controls() {
    return Array.from(workspace.querySelectorAll("input, select"));
  }
  function currentState() {
    const sequence = workspace.querySelector("[data-sequence]");
    return {
      values: controls().map(function (control) {
        if (control.type === "radio") return control.checked ? control.value : null;
        if (control.type === "checkbox") return control.checked;
        return control.value;
      }),
      sequence: sequence ? Array.from(sequence.children).map(function (item) { return item.dataset.value; }) : null,
      checkedAt: new Date().toISOString()
    };
  }
  function save() {
    try { localStorage.setItem(stateKey, JSON.stringify(currentState())); }
    catch (error) { feedback.textContent = "This browser could not save the activity. Download a course backup or free browser storage."; }
  }
  function restore() {
    try {
      const state = JSON.parse(localStorage.getItem(stateKey) || "null");
      if (!state) return;
      controls().forEach(function (control, index) {
        const value = state.values?.[index];
        if (control.type === "radio") control.checked = value !== null && control.value === value;
        else if (control.type === "checkbox") control.checked = Boolean(value);
        else if (value != null) control.value = value;
      });
      const sequence = workspace.querySelector("[data-sequence]");
      if (sequence && Array.isArray(state.sequence)) {
        state.sequence.forEach(function (value) {
          const item = Array.from(sequence.children).find(function (node) { return node.dataset.value === value; });
          if (item) sequence.append(item);
        });
        renumber(sequence);
      }
    } catch (error) { localStorage.removeItem(stateKey); }
  }
  function renumber(sequence) {
    Array.from(sequence.children).forEach(function (item, index) { item.querySelector(".sequence-position").textContent = index + 1; });
  }
  function resultMessage(score, total) {
    const complete = score === total;
    feedback.dataset.state = complete ? "correct" : "retry";
    feedback.innerHTML = '<strong>' + score + ' of ' + total + ' correct.</strong> ' + (complete ? "You used all supplied evidence accurately. Record the decision and next step below." : "Review the marked items, use the support prompt and check again. Your saved choices remain here.");
  }

  function checkActivity() {
    const type = workspace.querySelector("[data-activity-check]")?.dataset.activityCheck;
    let score = 0;
    let total = 0;
    if (type === "checklist") {
      const items = Array.from(workspace.querySelectorAll("[data-item]"));
      total = items.length;
      items.forEach(function (item) {
        const expected = item.dataset.answer === "true";
        const correct = item.checked === expected;
        item.closest("label")?.classList.toggle("is-correct", correct);
        item.closest("label")?.classList.toggle("needs-review", !correct);
        if (correct) score += 1;
      });
    } else if (type === "selects") {
      const items = Array.from(workspace.querySelectorAll("select[data-item]"));
      total = items.length;
      items.forEach(function (item) {
        const correct = item.value === item.dataset.answer;
        item.classList.toggle("is-correct", correct);
        item.classList.toggle("needs-review", !correct);
        if (correct) score += 1;
      });
    } else if (type === "radios") {
      const decisions = Array.from(workspace.querySelectorAll("[data-decision]"));
      total = decisions.length;
      decisions.forEach(function (decision) {
        const selected = decision.querySelector('input[type="radio"]:checked');
        const correct = selected && selected.value === decision.dataset.answer;
        const itemFeedback = decision.querySelector(".item-feedback");
        itemFeedback.textContent = selected ? selected.dataset.feedback : "Choose a response before checking this situation.";
        itemFeedback.dataset.state = correct ? "correct" : "retry";
        if (correct) score += 1;
      });
    } else if (type === "record") {
      const rows = Array.from(workspace.querySelectorAll(".record-row"));
      total = rows.length;
      rows.forEach(function (row) {
        const correct = row.querySelector('input[type="checkbox"]').checked && Boolean(row.querySelector("textarea").value.trim());
        row.classList.toggle("is-correct", correct);
        row.classList.toggle("needs-review", !correct);
        if (correct) score += 1;
      });
    } else {
      const sequence = workspace.querySelector("[data-sequence]");
      if (sequence) {
        const answer = JSON.parse(sequence.dataset.answer || "[]");
        const values = Array.from(sequence.children).map(function (item) { return item.dataset.value; });
        total = answer.length;
        values.forEach(function (value, index) {
          const correct = value === answer[index];
          sequence.children[index].classList.toggle("is-correct", correct);
          sequence.children[index].classList.toggle("needs-review", !correct);
          if (correct) score += 1;
        });
      }
    }
    resultMessage(score, total);
    save();
  }

  workspace.addEventListener("change", save);
  workspace.querySelector("[data-check-activity]")?.addEventListener("click", checkActivity);
  workspace.querySelector("[data-reset-activity]")?.addEventListener("click", function () {
    if (!window.confirm("Reset this activity's choices and saved response on this device?")) return;
    localStorage.removeItem(stateKey);
    Object.keys(localStorage).forEach(function (key) { if (key.startsWith(responsePrefix + saveId)) localStorage.removeItem(key); });
    window.location.reload();
  });

  const sequence = workspace.querySelector("[data-sequence]");
  if (sequence) sequence.addEventListener("click", function (event) {
    const button = event.target.closest("[data-move]");
    if (!button) return;
    const item = button.closest("li");
    if (button.dataset.move === "up" && item.previousElementSibling) sequence.insertBefore(item, item.previousElementSibling);
    if (button.dataset.move === "down" && item.nextElementSibling) sequence.insertBefore(item.nextElementSibling, item);
    renumber(sequence);
    save();
    button.focus();
  });

  document.querySelectorAll("[data-mark-activity-complete]").forEach(function (button) {
    const key = progressPrefix + "activity:" + button.dataset.markActivityComplete;
    if (localStorage.getItem(key) === "true") button.textContent = "Activity marked complete";
    button.addEventListener("click", function () {
      localStorage.setItem(key, "true");
      button.textContent = "Activity marked complete";
    });
  });

  restore();
}());
