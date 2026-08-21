(function () {
  "use strict";
  const deck = document.querySelector("[data-deck]");
  if (!deck) return;
  const slides = Array.from(deck.querySelectorAll(".slide"));
  const status = deck.querySelector("[data-slide-status]");
  const previous = deck.querySelector("[data-prev]");
  const next = deck.querySelector("[data-next]");
  let index = Math.max(0, Math.min(slides.length - 1, Number(window.location.hash.replace("#slide-", "")) - 1 || 0));
  function show() {
    slides.forEach(function (slide, slideIndex) {
      slide.hidden = slideIndex !== index;
      slide.setAttribute("aria-hidden", String(slideIndex !== index));
    });
    status.textContent = (index + 1) + " of " + slides.length;
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    window.history.replaceState(null, "", "#slide-" + (index + 1));
    slides[index]?.focus();
  }
  function move(change) { index = Math.max(0, Math.min(slides.length - 1, index + change)); show(); }
  previous.addEventListener("click", function () { move(-1); });
  next.addEventListener("click", function () { move(1); });
  deck.querySelector("[data-fullscreen]").addEventListener("click", function () { deck.requestFullscreen?.(); });
  document.addEventListener("keydown", function (event) {
    if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); move(1); }
    if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); move(-1); }
    if (event.key === "Home") { index = 0; show(); }
    if (event.key === "End") { index = slides.length - 1; show(); }
  });
  show();
}());
