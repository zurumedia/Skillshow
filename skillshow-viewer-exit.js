/* SkillShow: Profile Photo Viewer + Press Back Again to Exit
   Save as: skillshow-viewer-exit.js
   Load once, after your existing app scripts.
*/
(function () {
  "use strict";
  if (window.__skillShowViewerExitLoaded) return;
  window.__skillShowViewerExitLoaded = true;

  var STYLE_ID = "ss-viewer-exit-styles";
  var VIEWER_ID = "ss-full-photo-viewer";
  var viewer, photo, closeBtn, toastEl, toastTimer;
  var scale = 1, startDistance = 0, startScale = 1;
  var lastTap = 0, exitArmed = false, exitTimer = null;
  var EXIT_WINDOW_MS = 2000;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#" + VIEWER_ID + "{position:fixed;inset:0;z-index:2147483647;background:rgba(3,8,20,.97);display:none;align-items:center;justify-content:center;overflow:hidden;touch-action:none}",
      "#" + VIEWER_ID + ".ss-open{display:flex}",
      "#" + VIEWER_ID + " img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;transform:scale(1);transform-origin:center center;user-select:none;-webkit-user-drag:none}",
      "#" + VIEWER_ID + " .ss-photo-close{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);right:16px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:30px;line-height:1;z-index:2}",
      "#ss-viewer-exit-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);transform:translateX(-50%);z-index:2147483647;max-width:90vw;padding:12px 18px;border-radius:24px;background:#152642;color:#fff;border:1px solid #c9a86a;box-shadow:0 6px 24px rgba(0,0,0,.35);font:500 14px/1.4 system-ui,sans-serif;text-align:center;display:none}",
      "#ss-viewer-exit-toast.ss-show{display:block}",
      ".dp,.cov{cursor:zoom-in}"
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "ss-viewer-exit-toast";
      toastEl.setAttribute("role", "status");
      (document.body || document.documentElement).appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("ss-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (toastEl) toastEl.classList.remove("ss-show");
    }, 1800);
  }

  function resetZoom() {
    scale = 1;
    if (photo) photo.style.transform = "scale(1)";
  }

  function buildViewer() {
    if (viewer) return;
    viewer = document.createElement("div");
    viewer.id = VIEWER_ID;
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Photo viewer");
    photo = document.createElement("img");
    photo.alt = "Full-size profile photo";
    photo.draggable = false;
    closeBtn = document.createElement("button");
    closeBtn.className = "ss-photo-close";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close photo");
    closeBtn.textContent = "×";
    viewer.appendChild(photo);
    viewer.appendChild(closeBtn);
    (document.body || document.documentElement).appendChild(viewer);

    closeBtn.addEventListener("click", closeViewer);
    viewer.addEventListener("click", function (e) {
      if (e.target === viewer) closeViewer();
    });
    viewer.addEventListener("touchstart", function (e) {
      if (e.touches && e.touches.length === 2) {
        startDistance = distance(e.touches[0], e.touches[1]);
        startScale = scale;
      }
    }, { passive: true });
    viewer.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches.length === 2 && startDistance > 0) {
        e.preventDefault();
        scale = Math.max(1, Math.min(4, startScale * distance(e.touches[0], e.touches[1]) / startDistance));
        photo.style.transform = "scale(" + scale + ")";
      }
    }, { passive: false });
    viewer.addEventListener("touchend", function (e) {
      if (!e.touches || e.touches.length < 2) startDistance = 0;
    }, { passive: true });
    photo.addEventListener("click", function () {
      var now = Date.now();
      if (now - lastTap < 300) {
        scale = scale > 1 ? 1 : 2;
        photo.style.transform = "scale(" + scale + ")";
      }
      lastTap = now;
    });
  }

  function distance(a, b) {
    var x = a.clientX - b.clientX, y = a.clientY - b.clientY;
    return Math.sqrt(x * x + y * y);
  }

  function getImageSource(el) {
    if (!el) return "";
    var img = el.matches && el.matches("img") ? el : (el.querySelector ? el.querySelector("img") : null);
    if (img) {
      var src = img.currentSrc || img.src || img.getAttribute("data-src");
      if (src) return src;
    }
    var bg = "";
    try { bg = window.getComputedStyle(el).backgroundImage || ""; } catch (_) {}
    var match = bg.match(/url\((?:"|')?(.*?)(?:"|')?\)/);
    return match ? match[1] : "";
  }

  function openViewer(src) {
    if (!src) return;
    buildViewer();
    resetZoom();
    photo.src = src;
    viewer.classList.add("ss-open");
    document.body.style.overflow = "hidden";
    try {
      history.pushState({ ssSkillShowPhotoViewer: true }, "", location.href);
    } catch (_) {}
  }

  function closeViewer(fromPopState) {
    if (!viewer || !viewer.classList.contains("ss-open")) return;
    viewer.classList.remove("ss-open");
    if (photo) photo.removeAttribute("src");
    resetZoom();
    if (document.body) document.body.style.overflow = "";
    if (!fromPopState) {
      try {
        if (history.state && history.state.ssSkillShowPhotoViewer) history.back();
      } catch (_) {}
    }
  }

  function handlePhotoClick(e) {
    if (!e.target || !e.target.closest) return;
    if (viewer && viewer.classList.contains("ss-open")) return;
    /* Only open profile/cover images, not unrelated images in posts or chat. */
    var el = e.target.closest(".dp img, .cov img, .dp, .cov");
    if (!el) return;
    var container = el.matches("img") ? el.parentElement : el;
    var src = getImageSource(el);
    if (!src && container) src = getImageSource(container);
    if (!src) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    openViewer(src);
  }

  function isViewerOpen() {
    return !!(viewer && viewer.classList.contains("ss-open"));
  }

  function onPopState() {
    if (isViewerOpen()) {
      closeViewer(true);
      return;
    }
    /* Some Android webviews do not expose an app-exit event.
       This handler only supplies the in-page Back confirmation. */
    armExitWarning();
  }

  function armExitWarning() {
    if (exitArmed) {
      exitArmed = false;
      clearTimeout(exitTimer);
      showToast("Exiting SkillShow…");
      /* Do not force window.close(): browsers usually block it.
         The second Back is allowed to continue to the host/browser. */
      return;
    }
    exitArmed = true;
    showToast("Press back again to exit SkillShow");
    clearTimeout(exitTimer);
    exitTimer = setTimeout(function () {
      exitArmed = false;
    }, EXIT_WINDOW_MS);
  }

  function onKeyDown(e) {
    if (e.key !== "Escape" && e.key !== "Backspace" && e.keyCode !== 27) return;
    if (isViewerOpen()) {
      e.preventDefault();
      closeViewer(false);
    }
  }

  function init() {
    addStyles();
    buildViewer();
    document.addEventListener("click", handlePhotoClick, true);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("keydown", onKeyDown);
    /* Mobile browser back: keep a lightweight state while the app is active.
       Viewer opens add their own state and are closed first. */
    try {
      if (!history.state || !history.state.ssSkillShowExitGuard) {
        history.pushState({ ssSkillShowExitGuard: true }, "", location.href);
      }
    } catch (_) {}

    /* Some hybrid app shells dispatch this custom event for hardware Back.
       If the shell already handles Back, it can call this event to show the warning. */
    window.addEventListener("skillshow:back", function () {
      if (isViewerOpen()) closeViewer(false);
      else armExitWarning();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  /* Optional API for debugging/integration from the app shell. */
  window.SkillShowPhotoViewer = {
    open: openViewer,
    close: function () { closeViewer(false); },
    back: function () {
      if (isViewerOpen()) closeViewer(false);
      else armExitWarning();
    }
  };
})();