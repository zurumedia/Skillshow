/* SkillShow Tour — shows new users where everything is.
   Add to index.html (last script line):  <script src="tour.js?v=1"></script>
   Starts by itself once for each person after login.
   Replay anytime: open  skillshowng.netlify.app/?tour=1   or run  SkillTour.start()  */
(function () {
  "use strict";
  var KEY = "ss_tour_v3", idx = 0, root = null, ring = null, card = null, running = false, prevOverflow = "";
  var $ = function (q) { return document.querySelector(q); };

  function navItem(which) {
    var nav = $("nav");
    if (!nav) return null;
    for (var i = 0; i < nav.children.length; i++) {
      var onclick = nav.children[i].getAttribute("onclick") || "";
      if (which === "home" && /tab\s*=\s*['\"]home['\"]/.test(onclick)) return nav.children[i];
      if (which === "jobs" && /tab\s*=\s*['\"]jobs['\"]/.test(onclick)) return nav.children[i];
      if (which === "comm" && /tab\s*=\s*['\"]comm['\"]/.test(onclick)) return nav.children[i];
      if (which === "post" && /^\s*openNew\s*\(/.test(onclick)) return nav.children[i];
    }
    return null;
  }
  function hi(n) { var h = $(".hd .hi"); return h ? h.children[n] || null : null; }
  function hiLast() { var h = $(".hd .hi"); return h ? h.lastElementChild : null; }

  var STEPS = [
    { t: "Welcome to SkillShow 👋", d: "Here is a quick look at where everything is. It takes about one minute." },
    { t: "Home", d: "See posts, stories and new work from creators you follow.", el: function () { return navItem("home"); } },
    { t: "Jobs", d: "Find work, or post a job when you need someone with a skill.", el: function () { return navItem("jobs"); } },
    { t: "Post something", d: "Tap the + in the middle to share a photo, a video or your work. It is the quickest way to show your skill.", el: function () { return navItem("post"); } },
    { t: "Communities", d: "Join groups of people in your field. Chat, share and find opportunities together.", el: function () { return navItem("comm"); } },
    { t: "Messages", d: "Chat privately with anyone. A pink number shows how many chats you have not read.", el: function () { return hi(2); } },
    { t: "Search", d: "Look for people, skills and posts.", el: function () { return hi(0); } },
    { t: "Notifications", d: "The bell tells you about likes, comments and new followers.", el: function () { return hi(1); } },
    { t: "Your profile", d: "Tap your photo to open your profile, edit it and show your work.", el: function () { var nav = $("nav"); return nav ? nav.lastElementChild : null; } },
    { t: "You are ready! 🎉", d: "Start by posting your first skill with the + button. Want to see this again? Open skillshowng.netlify.app/?tour=1" }
  ];

  function userKey() { return KEY + ":" + (typeof me !== "undefined" && me ? me.id : "x"); }
  function seen() { try { return !!localStorage.getItem(userKey()); } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(userKey(), "1"); } catch (e) {} }

  function css() {
    if (document.getElementById("sstour-css")) return;
    var s = document.createElement("style");
    s.id = "sstour-css";
    s.textContent =
      "#sstour{position:fixed;inset:0;z-index:99999;font-family:inherit}" +
      "#sstour.dim{background:rgba(5,10,25,.85)}" +
      "#sstour .ring{position:fixed;border-radius:16px;box-shadow:0 0 0 9999px rgba(5,10,25,.85);border:2px solid #ff2d8a;pointer-events:none;transition:all .25s ease}" +
      "#sstour .card{position:fixed;width:min(320px,calc(100vw - 32px));box-sizing:border-box;background:var(--bg,#0a1a3a);color:var(--tx,#fff);border:1px solid var(--ln,#1D2E45);border-radius:18px;padding:16px 16px 14px;box-shadow:0 10px 40px #0009}" +
      "#sstour h3{margin:0 0 6px;font-size:18px}#sstour p{margin:0 0 14px;font-size:14.5px;line-height:1.45;color:var(--mu,#93A3B8)}" +
      "#sstour .row{display:flex;align-items:center;gap:8px}#sstour .n{flex:1;font-size:12px;color:var(--mu,#93A3B8)}" +
      "#sstour button{border:0;font:inherit;font-size:14px;font-weight:700;border-radius:20px;padding:9px 18px;cursor:pointer}" +
      "#sstour .go{background:var(--ac,#C8963E);color:#1E1403}#sstour .bk{background:var(--so,#12233A);color:var(--tx,#fff)}" +
      "#sstour .sk{background:none;color:var(--mu,#93A3B8);padding:9px 6px}";
    document.head.appendChild(s);
  }

  function render() {
    if (!running) return;
    var s = STEPS[idx], el = s.el ? s.el() : null, r = el ? el.getBoundingClientRect() : null;
    var last = idx === STEPS.length - 1, vw = window.innerWidth, vh = window.innerHeight;
    var hasT = !!(r && r.width > 0 && r.height > 0);

    root.className = hasT ? "" : "dim";
    ring.style.display = hasT ? "block" : "none";
    card.innerHTML = '<h3>' + s.t + "</h3><p>" + s.d + '</p><div class="row"><span class="n">' + (idx + 1) + " / " + STEPS.length + "</span>" +
      (last ? "" : '<button class="sk" data-a="skip">Skip</button>') +
      (idx > 0 ? '<button class="bk" data-a="back">Back</button>' : "") +
      '<button class="go" data-a="next">' + (last ? "Start" : "Next") + "</button></div>";

    var cw = card.offsetWidth, ch = card.offsetHeight, left, top;
    if (hasT) {
      var pad = 6;
      ring.style.left = r.left - pad + "px"; ring.style.top = r.top - pad + "px";
      ring.style.width = r.width + pad * 2 + "px"; ring.style.height = r.height + pad * 2 + "px";
      left = Math.max(16, Math.min(vw - cw - 16, r.left + r.width / 2 - cw / 2));
      top = (r.top + r.height / 2 > vh / 2) ? r.top - ch - 18 : r.bottom + 18;
      top = Math.max(12, Math.min(vh - ch - 12, top));
    } else {
      left = (vw - cw) / 2; top = (vh - ch) / 2;
    }
    card.style.left = left + "px"; card.style.top = top + "px";
  }

  function finish() {
    running = false; markSeen();
    if (root) root.remove();
    root = ring = card = null;
    document.body.style.overflow = prevOverflow;
    window.removeEventListener("resize", render);
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") finish(); }

  function start() {
    if (running) return;
    var overlay = $("#ov");
    if (overlay) overlay.remove();
    if (typeof step === "undefined" || step !== "app" || typeof me === "undefined" || !me) {
      if (typeof toast === "function") toast("Please log in to take the app tour.");
      return;
    }
    if (typeof tab !== "undefined" && tab !== "home" && typeof draw === "function") { tab = "home"; draw(); }
    setTimeout(function () {
      if (running) return;
      css(); running = true; idx = 0;
      prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
      root = document.createElement("div"); root.id = "sstour";
      root.innerHTML = '<div class="ring"></div><div class="card"></div>';
      ring = root.querySelector(".ring"); card = root.querySelector(".card");
      root.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]");
        if (!b) return;
        var a = b.dataset.a;
        if (a === "skip") return finish();
        if (a === "back") idx = Math.max(0, idx - 1);
        if (a === "next") { if (idx >= STEPS.length - 1) return finish(); idx++; }
        render();
      });
      document.body.appendChild(root);
      window.addEventListener("resize", render);
      document.addEventListener("keydown", onKey);
      render();
    }, 400);
  }


  window.SkillTour = { start: start, end: finish };
  // Add a replay button only when the user opens Send feedback from Profile.
  function addTourButton() {
    if (typeof tab === "undefined" || tab !== "profile") return;
    var sh = $("#ov .sh");
    if (!sh || sh.querySelector("[data-skillshow-tour]")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn o";
    b.style.marginTop = "12px";
    b.setAttribute("data-skillshow-tour", "1");
    b.textContent = "Take app tour";
    b.addEventListener("click", start);
    sh.appendChild(b);
  }
  function patchFeedback() {
    if (typeof window.feedbackSheet !== "function" || window.feedbackSheet.__tourPatched) return;
    var original = window.feedbackSheet;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      window.setTimeout(addTourButton, 0);
      return result;
    };
    wrapped.__tourPatched = true;
    window.feedbackSheet = wrapped;
  }
  patchFeedback();
  // Manual launch only. No auto-start and no ?tour=1 auto-start.
})();
