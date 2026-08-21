(function () {
  "use strict";
  const search = document.querySelector("[data-glossary-search]");
  if (!search) return;
  const cards = Array.from(document.querySelectorAll("[data-glossary-text]"));
  const empty = document.querySelector("[data-glossary-empty]");
  search.addEventListener("input", function () {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(function (card) {
      const match = !query || card.dataset.glossaryText.includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });
    empty.hidden = visible !== 0;
  });
}());
