/* SkillShow legacy-tour disable fix.
   Load this AFTER skillshow-patch.js and BEFORE/AFTER tour.js.
   Keeps the Cloud-style window.SkillTour tour untouched.
   Disables only the old #ss-tour flow and its "Take the app tour" button. */
(function () {
  "use strict";

  // The old patch uses ss_tour_v2 for its automatic first-visit tour.
  // Mark it as seen so its delayed auto-start does not launch.
  try { localStorage.setItem("ss_tour_v2", "1"); } catch (e) {}

  function removeLegacyTour() {
    var oldTour = document.getElementById("ss-tour");
    if (oldTour) oldTour.remove();

    var oldButton = document.getElementById("ss-tour-btn");
    if (oldButton) oldButton.remove();
  }

  // Clean up immediately and after profile/feed rerenders.
  removeLegacyTour();

  if (window.MutationObserver && document.documentElement) {
    var observer = new MutationObserver(function () {
      removeLegacyTour();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Also clean up if a legacy tour was already on screen before this script ran.
  window.addEventListener("DOMContentLoaded", removeLegacyTour);
})();
