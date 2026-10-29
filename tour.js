/* SkillShow Tour — shows new users where everything is.
   Add to index.html (last script line):  <script src="tour.js?v=1"></script>
   Starts by itself once for each person after login.
   Replay anytime: open  skillshowng.netlify.app/?tour=1   or run  SkillTour.start()  */
(function () {
  "use strict";
  var KEY = "ss_tour_v3", idx = 0, root = null, ring = null, card = null, running = false, prevOverflow = "";
  var $ = function (q) { return document.querySelector(q); };

  function navItem(key) {
    var nav = $("nav");
    if (!nav) return null;
    for (var i = 0; i < nav.children.length; i++) {
      if ((nav.children[i].getAttribute("onclick") || "").indexOf(key) !== -1) return nav.children[i];
    }
    return null;
  }
  function hi(n) { var h = $(".hd .hi"); return h ? h.children[n] || null : null; }
  function hiLast() { var h = $(".hd .hi"); return h ? h.lastElementChild : null; }

  var STEPS = [
    { t: "Welcome to SkillShow 👋", d: "Here is a quick look at where everything is. It takes about one minute." },
    { t: "Home", d: "See posts, stories and new work from creators you follow.", el: function () { return navItem("'home'"); } },
    { t: "Jobs", d: "Find work, or post a job when you need someone with a skill.", el: function () { return navItem("'jobs'"); } },
    { t: "Post something", d: "Tap the + in the middle to share a photo, a video or your work. It is the quickest way to show your skill.", el: function () { return navItem("openNew"); } },
    { t: "Communities", d: "Join groups of people in your field. Chat, share and find opportunities together.", el: function () { return navItem("'comm'"); } },
    { t: "Messages", d: "Chat privately with anyone. A pink number shows how many chats you have not read.", el: function () { return navItem("'msgs'"); } },
    { t: "Search", d: "Look for people, skills and posts.", el: function () { return hi(0); } },
    { t: "Notifications", d: "The bell tells you about likes, comments and new followers.", el: function () { return hi(1); } },
    { t: "Your profile", d: "Tap your photo to open your profile, edit it and show your work.", el: hiLast },
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

  function auto() {
    var forced = /[?&]tour=1/.test(location.search), n = 0;
    var t = setInterval(function () {
      if (++n > 120) return clearInterval(t);
      if (typeof step === "undefined" || step !== "app" || typeof me === "undefined" || !me) return;
      if (!$("nav") || (typeof tab !== "undefined" && tab === "chat")) return;
      clearInterval(t);
      if (forced || !seen()) setTimeout(start, 900);
    }, 1000);
  }

  window.SkillTour = { start: start, end: finish };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto);
  else auto();
})();


/* =====================================================
   SKILLSHOW — CLAUDE STYLE APP TOUR
   File: tour.js
   ===================================================== */

(function () {
  if (window.__skillshowTourLoaded) return;
  window.__skillshowTourLoaded = true;

  const steps = [
    {
      title: "Welcome to SkillShow",
      text: "Your creative journey starts here. Discover opportunities, connect with talented people and showcase what you can do.",
      target: null
    },
    {
      title: "Your Home Feed",
      text: "Explore posts, updates, creative work and opportunities shared by the SkillShow community.",
      target: "#feed, #home, [data-tab='feed']"
    },
    {
      title: "Discover Opportunities",
      text: "Find jobs, internships, freelance projects and other opportunities that match your skills.",
      target: "#jobs, [data-tab='jobs']"
    },
    {
      title: "Create Something",
      text: "Share your work, publish updates, upload media and let the community discover your creativity.",
      target: "#create, [data-tab='create']"
    },
    {
      title: "Join Communities",
      text: "Discover communities, connect with people who share your interests and build meaningful relationships.",
      target: "#communities, [data-tab='communities']"
    },
    {
      title: "Your Messages",
      text: "Connect and communicate with other creators, clients and members of SkillShow.",
      target: "#messages, [data-tab='messages']"
    },
    {
      title: "Discover People",
      text: "Find creators, professionals and businesses to follow and connect with.",
      target: "#search, [data-tab='search']"
    },
    {
      title: "Stay Updated",
      text: "Keep track of important activities, interactions and updates through your notifications.",
      target: "#notifications, [data-tab='notifications']"
    },
    {
      title: "Your Profile",
      text: "Showcase your identity, skills, portfolio and professional experience. Let people know what you bring to the table.",
      target: "#profile, [data-tab='profile']"
    },
    {
      title: "You're Ready!",
      text: "That's your introduction to SkillShow. Start exploring, sharing your creativity and discovering opportunities. Welcome aboard!",
      target: null
    }
  ];

  let current = 0;
  let active = false;

  const css = `
    #ss-tour-overlay {
      position:fixed; inset:0; z-index:999999;
      background:rgba(4,10,24,.78);
      display:none; pointer-events:auto;
    }
    #ss-tour-spot {
      position:fixed; display:none; z-index:1000000;
      border:2px solid #C9A86A;
      border-radius:13px;
      box-shadow:0 0 0 9999px rgba(4,10,24,.72),
                 0 0 25px rgba(201,168,106,.35);
      pointer-events:none;
      transition:all .25s ease;
    }
    #ss-tour-card {
      position:fixed; z-index:1000001;
      left:50%; bottom:25px;
      transform:translateX(-50%);
      width:calc(100% - 32px);
      max-width:390px;
      background:#152642;
      color:#fff;
      border:1px solid rgba(201,168,106,.35);
      border-radius:19px;
      padding:22px;
      box-sizing:border-box;
      box-shadow:0 15px 55px rgba(0,0,0,.4);
      font-family:Inter,Arial,sans-serif;
    }
    #ss-tour-card h3 {
      margin:0 0 10px;
      font-size:20px;
      color:#C9A86A;
    }
    #ss-tour-card p {
      font-size:14px;
      line-height:1.65;
      color:#DCE4F0;
      margin:0 0 20px;
    }
    #ss-tour-progress {
      font-size:11px;color:#8A9BB3;
      margin-bottom:9px;
    }
    #ss-tour-track {
      height:4px;background:#293D59;
      border-radius:10px;margin-bottom:20px;
      overflow:hidden;
    }
    #ss-tour-bar {
      height:100%;background:#C9A86A;
      transition:width .2s;
    }
    #ss-tour-actions {
      display:flex;align-items:center;gap:9px;
    }
    #ss-tour-actions button {
      border:0;border-radius:9px;padding:11px 15px;
      font-weight:600;font-size:13px;
      cursor:pointer;
    }
    #ss-tour-next {
      background:#C9A86A;color:#152642;flex:1;
    }
    #ss-tour-back {
      background:#293D59;color:white;
    }
    #ss-tour-skip {
      background:transparent;color:#AAB9CC;
      padding-left:0!important;
    }
    #ss-tour-launch {
      position:fixed;right:16px;bottom:85px;
      z-index:999990;background:#C9A86A;
      color:#152642;border:0;border-radius:30px;
      padding:12px 17px;font-weight:700;
      font-size:12px;box-shadow:0 5px 20px #0004;
      cursor:pointer;
    }
    @media(max-width:420px) {
      #ss-tour-card {bottom:15px;}
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "ss-tour-overlay";

  const spot = document.createElement("div");
  spot.id = "ss-tour-spot";

  const card = document.createElement("div");
  card.id = "ss-tour-card";

  const launch = document.createElement("button");
  launch.id = "ss-tour-launch";
  launch.textContent = "✦ Take App Tour";

  document.body.append(overlay, spot, card, launch);

  function findTarget(selector) {
    if (!selector) return null;

    for (const s of selector.split(",")) {
      const el = document.querySelector(s.trim());
      if (el) return el;
    }
    return null;
  }

  function render() {
    const step = steps[current];
    const target = findTarget(step.target);

    spot.style.display = "none";

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      setTimeout(() => {
        if (!active) return;
        const r = target.getBoundingClientRect();

        spot.style.display = "block";
        spot.style.top = (r.top - 7) + "px";
        spot.style.left = (r.left - 7) + "px";
        spot.style.width = (r.width + 14) + "px";
        spot.style.height = (r.height + 14) + "px";
      }, 300);
    }

    card.innerHTML = `
      <div id="ss-tour-progress">
        STEP ${current + 1} OF ${steps.length}
      </div>
      <div id="ss-tour-track">
        <div id="ss-tour-bar"
          style="width:${((current + 1) / steps.length) * 100}%">
        </div>
      </div>
      <h3>${step.title}</h3>
      <p>${step.text}</p>
      <div id="ss-tour-actions">
        <button id="ss-tour-skip">Skip</button>
        <button id="ss-tour-back"
          ${current === 0 ? "disabled" : ""}>Back</button>
        <button id="ss-tour-next">
          ${current === steps.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    `;

    card.querySelector("#ss-tour-skip").onclick = close;
    card.querySelector("#ss-tour-back").onclick = () => {
      if (current > 0) {
        current--;
        render();
      }
    };
    card.querySelector("#ss-tour-next").onclick = () => {
      if (current < steps.length - 1) {
        current++;
        render();
      } else {
        close();
      }
    };
  }

  function start() {
    current = 0;
    active = true;
    overlay.style.display = "block";
    card.style.display = "block";
    launch.style.display = "none";
    render();
  }

  function close() {
    active = false;
    overlay.style.display = "none";
    spot.style.display = "none";
    card.style.display = "none";
    launch.style.display = "block";
  }

  launch.addEventListener("click", start);
  overlay.addEventListener("click", close);

  card.style.display = "none";

})();

