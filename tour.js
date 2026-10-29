/* SkillShow legacy tour disabled.
   The old automatic tour and its App Guide click interception have been turned off.
   This file is intentionally inert to prevent the first tour from reappearing if cached
   or accidentally re-added to index.html. */
(function () {
  "use strict";
  window.SkillTour = {
    start: function () {},
    end: function () {}
  };
})();
