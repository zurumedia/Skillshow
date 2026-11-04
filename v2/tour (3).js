/* Skillshow Product Tour (v2): a calm, professional walkthrough.
   Runs once for each new account. Restart it from Profile > Take the app tour. */
(function () {
  "use strict";
  var SS = window.SS, $ = SS.$, E = SS.esc, idx = 0, steps = [], root = null, running = false;

  var STEPS = [
    { t: "Welcome to Skillshow", x: "A short tour of the main areas. It takes about a minute.", welcome: true },
    { t: "Home", x: "Your feed. See work from people you follow, together with new job opportunities.", s: '[data-nav="home"]' },
    { t: "Stories", x: "Share a photo or video that stays for 24 hours. Tap Your story to add one.", s: "#strip .st" },
    { t: "Discover", x: "Browse skills, jobs, communities and featured talent in one place.", s: '[data-nav="discover"]' },
    { t: "Create", x: "Post your work, publish a job, ask for help, or add a story.", s: '[data-nav="create"]' },
    { t: "Messages", x: "Private conversations with clients, employers and collaborators.", s: '[data-nav="messages"]' },
    { t: "Search", x: "Find people, skills, jobs and work.", s: '[data-act="search"]' },
    { t: "Notifications", x: "Endorsements, comments, new followers and updates on your job applications.", s: '[data-act="notifs"]' },
    { t: "Your profile", x: "Your professional profile: portfolio, skills, experience and contact options.", s: "#meb" },
    { t: "You are ready", x: "You can restart this tour at any time from your profile.", done: true }
  ];

  function css() {
    if ($("#tour-css")) return;
    var s = document.createElement("style");
    s.id = "tour-css";
    s.textContent =
      "#tour{position:fixed;inset:0;z-index:90}" +
      "#tour .dim{position:absolute;inset:0;background:color-mix(in srgb,var(--bg) 66%,transparent)}" +
      "#tour .hl{position:fixed;border-radius:14px;border:1.5px solid var(--gold);box-shadow:0 0 0 9999px color-mix(in srgb,var(--bg) 66%,transparent);pointer-events:none;transition:all .25s ease}" +
      "#tour .tc{position:fixed;box-sizing:border-box;width:min(320px,calc(100vw - 32px));background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:var(--s4);transition:top .25s ease,left .25s ease}" +
      "#tour .eb{font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mu)}" +
      "#tour h3{margin:6px 0 4px;font-size:17px;font-weight:700}" +
      "#tour p{margin:0 0 var(--s4);font-size:14px;line-height:1.5;color:var(--mu)}" +
      "#tour .pg{height:3px;border-radius:2px;background:var(--line);margin-bottom:var(--s4);overflow:hidden}#tour .pg i{display:block;height:100%;background:var(--gold);transition:width .25s ease}" +
      "#tour .bt{display:flex;align-items:center;gap:var(--s2)}" +
      "#tour .bt .sp{flex:1}" +
      "#tour button{min-height:38px;padding:0 var(--s4);border-radius:var(--r-pill);font-weight:700;font-size:13.5px}" +
      "#tour .pri{background:var(--gold);color:var(--on-gold)}" +
      "#tour .sec{border:1px solid var(--line);color:var(--tx)}" +
      "#tour .txt{color:var(--mu);padding:0 var(--s2)}";
    document.head.appendChild(s);
  }

  function target(i) {
    var s = steps[i].s; if (!s) return null;
    var el = document.querySelector(s); if (!el) return null;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }

  function end() {
    running = false;
    if (root) root.remove(); root = null;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", key);
    window.removeEventListener("resize", show);
    try { localStorage.setItem("ss_tour_v2_" + SS.me.id, "1"); } catch (e) {}
  }
  function key(e) { if (e.key === "Escape") confirmLeave(); }

  function confirmLeave() {
    var c = $("#tour .tc"); if (!c) return;
    c.innerHTML = '<div class="eb">Leave tour</div><h3>Leave the tour?</h3><p>You can restart it any time from your profile.</p><div class="bt"><span class="sp"></span><button class="sec" data-a="stay">Continue</button><button class="pri" data-a="leave">Leave</button></div>';
  }

  function show() {
    if (!running) return;
    var s = steps[idx], r = target(idx), vw = window.innerWidth, vh = window.innerHeight, last = idx === steps.length - 1;
    root.innerHTML = '<div class="dim" style="display:' + (r ? "none" : "block") + '"></div><div class="hl" style="display:' + (r ? "block" : "none") + '"></div><div class="tc">' +
      '<div class="eb">' + (s.welcome || s.done ? "Skillshow" : "Step " + idx + " of " + (steps.length - 2)) + "</div><h3>" + E(s.t) + "</h3><p>" + E(s.x) + "</p>" +
      '<div class="pg"><i style="width:' + Math.round(idx / (steps.length - 1) * 100) + '%"></i></div><div class="bt">' +
      (s.welcome ? '<button class="txt" data-a="skip">Not now</button><span class="sp"></span><button class="pri" data-a="next">Start tour</button>' :
        last ? '<span class="sp"></span><button class="pri" data-a="end">Finish</button>' :
          '<button class="txt" data-a="skip">Skip</button><span class="sp"></span><button class="sec" data-a="back">Back</button><button class="pri" data-a="next">Next</button>') + "</div></div>";
    var c = $("#tour .tc"), h = $("#tour .hl"), cw = c.offsetWidth, ch = c.offsetHeight, left, top;
    if (r) {
      var pad = 6;
      h.style.left = r.left - pad + "px"; h.style.top = r.top - pad + "px"; h.style.width = r.width + pad * 2 + "px"; h.style.height = r.height + pad * 2 + "px";
      left = Math.max(16, Math.min(vw - cw - 16, r.left + r.width / 2 - cw / 2));
      top = r.top + r.height / 2 > vh / 2 ? r.top - ch - 18 : r.bottom + 18;
      top = Math.max(12, Math.min(vh - ch - 12, top));
    } else { left = (vw - cw) / 2; top = (vh - ch) / 2; }
    c.style.left = left + "px"; c.style.top = top + "px";
  }

  function start() {
    if (running) return;
    css(); SS.closeSheet();
    if (!/^#\/home/.test(location.hash)) SS.go("home");
    setTimeout(function () {
      steps = STEPS.filter(function (s, i) { return i === 0 || i === STEPS.length - 1 || !s.s || document.querySelector(s.s); });
      idx = 0; running = true;
      root = document.createElement("div"); root.id = "tour";
      root.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]"); if (!b) return;
        var a = b.dataset.a;
        if (a === "next") { idx++; show(); } else if (a === "back") { idx = Math.max(1, idx - 1); show(); }
        else if (a === "skip") confirmLeave(); else if (a === "stay") show();
        else end();
      });
      document.body.appendChild(root); document.body.style.overflow = "hidden";
      document.addEventListener("keydown", key); window.addEventListener("resize", show);
      show();
    }, 450);
  }

  SS.tour = { start: start, end: end };

  /* first visit for each account */
  var n = 0, t = setInterval(function () {
    if (++n > 80) return clearInterval(t);
    if (!SS.me || !SS.prof || !$("#view") || !$("#strip")) return;
    clearInterval(t);
    var seen = false; try { seen = !!localStorage.getItem("ss_tour_v2_" + SS.me.id); } catch (e) {}
    if (!seen) setTimeout(start, 1200);
  }, 700);
})();
