
/* SkillShow Messenger — Safe UI Foundation
   Visual-only enhancement. Does not change messages or Supabase.
*/
(function () {
  "use strict";

  if (window.SkillShowMessengerUI) return;

  var STYLE_ID = "skillshow-messenger-ui-style";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #clistm {
        color: #fff;
      }

      #clistm .lr {
        border-radius: 12px;
        margin: 6px 0;
        transition: background-color .15s ease;
      }

      #clistm .lr:active {
        background: rgba(201, 168, 106, .12);
      }

      #clistm input,
      #clistm button {
        font: inherit;
      }

      .ssm-header {
        color: #fff;
        font-size: 21px;
        font-weight: 700;
        padding: 12px 0;
      }

      .ssm-subtitle {
        color: #8A9BB3;
        font-size: 13px;
        margin-top: 3px;
        font-weight: 400;
      }

      @media (prefers-reduced-motion: reduce) {
        #clistm .lr {
          transition: none;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function init() {
    addStyles();

    window.SkillShowMessengerUI = {
      version: "1.0.0",
      refresh: addStyles,
      destroy: function () {
        var style = document.getElementById(STYLE_ID);
        if (style) style.remove();
        delete window.SkillShowMessengerUI;
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
