/* SkillShow: "Take App Tour" button on your own profile (next to Edit profile / Sign out).
   Load after skillshow-patch.js:  <script src="skillshow-tourbutton.js"></script> */
(function () {
  "use strict";
  var app = document.getElementById("app");
  if (!app || !window.MutationObserver) return;
  function add() {
    if (document.getElementById("ss-tourbtn")) return;
    var out = app.querySelector('button[onclick="out()"]');
    if (!out || !out.parentNode) return;
    var b = document.createElement("button");
    b.id = "ss-tourbtn"; b.type = "button"; b.className = "btn o";
    b.style.marginTop = "8px"; b.textContent = "✦ Take App Tour";
    b.onclick = function () { if (window.SkillTour && window.SkillTour.start) window.SkillTour.start(); };
    out.parentNode.parentNode.insertBefore(b, out.parentNode.nextSibling);
  }
  new MutationObserver(add).observe(app, { childList: true, subtree: true });
  add();
})();
