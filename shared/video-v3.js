(function () {
  "use strict";
  document.querySelectorAll("[data-load-video]").forEach(function (button) {
    button.addEventListener("click", function () {
      const host = button.closest("[data-youtube-id]");
      if (!host) return;
      const id = host.dataset.youtubeId;
      const title = host.dataset.videoTitle || "Primary Industries learning video";
      host.innerHTML = '<div class="video-loaded"><iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0" title="' + title.replace(/"/g, "&quot;") + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe><button type="button" class="secondary" data-stop-video>Stop and unload video</button></div>';
      const frame = host.querySelector("iframe");
      frame.focus();
      host.querySelector("[data-stop-video]").addEventListener("click", function () {
        window.location.reload();
      });
    });
  });
}());
