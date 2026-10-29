/* SkillShow Tour — manual launch only.
   Entry point: Profile → Send feedback → Take app tour.
   No automatic tour on login. */
(function () {
  "use strict";
  var idx = 0, root = null, ring = null, card = null, running = false, prevOverflow = "";
  var $ = function (q) { return document.querySelector(q); };

  function navItem(key) {
    var nav = $("nav");
    if (!nav) return null;
    for (var i = 0; i < nav.children.length; i++) {
      if ((nav.children[i].getAttribute("onclick") || "").indexOf(key) !== -1) return nav.children[i];
    }
    return null;
  }
  function headerItem(n) {
    var h = $(".hd .hi");
    return h ? h.children[n] || null : null;
  }
  function profileItem() {
    var nav = $("nav");
    return nav && nav.lastElementChild ? nav.lastElementChild : null;
  }

  var STEPS = [
    { t: "Welcome to SkillShow 👋", d: "Here is a quick tour of the main places to create, connect and find opportunities." },
    { t: "Home feed", d: "See posts, stories and creative work shared by the SkillShow community.", el: function () { return navItem("'home'"); } },
    { t: "Find jobs", d: "Browse opportunities or post a job when you need someone with a skill.", el: function () { return navItem("'jobs'"); } },
    { t: "Communities", d: "Find communities around shared interests, connect with members and share work.", el: function () { return navItem("'comm'"); } },
    { t: "Create a post", d: "Use the + button to share a photo, video or a piece of work.", el: function () { return navItem("openNew"); } },
    { t: "Search people", d: "Use Search in the top bar to discover people by name or username.", el: function () { return headerItem(0); } },
    { t: "Notifications", d: "Check activity such as likes, comments and new followers.", el: function () { return headerItem(1); } },
    { t: "Messages", d: "Open private chats from the Messages icon in the top bar.", el: function () { return headerItem(2); } },
    { t: "Your profile", d: "Open your profile to manage your details, skills and portfolio.", el: profileItem },
    { t: "You're ready! 🎉", d: "Start exploring SkillShow. You can run this tour again anytime from Profile → Send feedback → Take app tour." }
  ];

  function css() {
    if ($("#sstour-css")) return;
    var s = document.createElement("style");
    s.id = "sstour-css";
    s.textContent =
      "#sstour{position:fixed;inset:0;z-index:99999;font-family:inherit}" +
      "#sstour.dim{background:rgba(5,10,25,.84)}" +
      "#sstour .ring{position:fixed;border-radius:14px;box-shadow:0 0 0 9999px rgba(5,10,25,.84);border:2px solid #ff2d8a;pointer-events:none;transition:all .22s ease}" +
      "#sstour .card{position:fixed;width:min(320px,calc(100vw - 32px));box-sizing:border-box;background:var(--bg,#0a1a3a);color:var(--tx,#fff);border:1px solid var(--ln,#1D2E45);border-radius:18px;padding:16px;box-shadow:0 10px 40px #0009}" +
      "#sstour h3{margin:0 0 6px;font-size:18px}#sstour p{margin:0 0 14px;font-size:14.5px;line-height:1.45;color:var(--mu,#93A3B8)}" +
      "#sstour .row{display:flex;align-items:center;gap:8px}#sstour .n{flex:1;font-size:12px;color:var(--mu,#93A3B8)}" +
      "#sstour button{border:0;font:inherit;font-size:14px;font-weight:700;border-radius:20px;padding:9px 16px;cursor:pointer}" +
      "#sstour .go{background:var(--ac,#C8963E);color:#1E1403}#sstour .bk{background:var(--so,#12233A);color:var(--tx,#fff)}" +
      "#sstour .sk{background:none;color:var(--mu,#93A3B8);padding:9px 6px}";
    document.head.appendChild(s);
  }

  function render() {
    if (!running || !root || !card || !ring) return;
    var s = STEPS[idx], el = s.el ? s.el() : null, r = el ? el.getBoundingClientRect() : null;
    var last = idx === STEPS.length - 1, vw = window.innerWidth, vh = window.innerHeight;
    var hasT = !!(r && r.width > 0 && r.height > 0);
    root.className = hasT ? "" : "dim";
    ring.style.display = hasT ? "block" : "none";
    card.innerHTML = '<h3>' + s.t + '</h3><p>' + s.d + '</p><div class="row"><span class="n">' +
      (idx + 1) + ' / ' + STEPS.length + '</span>' +
      (last ? '' : '<button class="sk" data-a="skip">Skip</button>') +
      (idx > 0 ? '<button class="bk" data-a="back">Back</button>' : '') +
      '<button class="go" data-a="next">' + (last ? 'Finish' : 'Next') + '</button></div>';
    var cw = card.offsetWidth, ch = card.offsetHeight, left, top;
    if (hasT) {
      var pad = 6;
      ring.style.left = Math.max(0, r.left - pad) + 'px';
      ring.style.top = Math.max(0, r.top - pad) + 'px';
      ring.style.width = (r.width + pad * 2) + 'px';
      ring.style.height = (r.height + pad * 2) + 'px';
      left = Math.max(16, Math.min(vw - cw - 16, r.left + r.width / 2 - cw / 2));
      top = (r.top + r.height / 2 > vh / 2) ? r.top - ch - 18 : r.bottom + 18;
      top = Math.max(12, Math.min(vh - ch - 12, top));
    } else {
      left = (vw - cw) / 2; top = (vh - ch) / 2;
    }
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }

  function finish() {
    running = false;
    if (root) root.remove();
    root = ring = card = null;
    document.body.style.overflow = prevOverflow;
    window.removeEventListener('resize', render);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') finish(); }

  function start() {
    if (running) return;
    // Close the feedback sheet safely and return to the home view, where the
    // header and bottom navigation are all present for accurate highlighting.
    var overlay = $('#ov');
    if (overlay) overlay.remove();
    if (typeof step === 'undefined' || step !== 'app' || typeof me === 'undefined' || !me) {
      if (typeof toast === 'function') toast('Please log in to take the app tour.');
      return;
    }
    if (typeof tab !== 'undefined' && tab !== 'home' && typeof draw === 'function') {
      tab = 'home';
      draw();
    }
    window.setTimeout(function () {
      if (running) return;
      css(); running = true; idx = 0;
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      root = document.createElement('div'); root.id = 'sstour';
      root.innerHTML = '<div class="ring"></div><div class="card"></div>';
      ring = root.querySelector('.ring'); card = root.querySelector('.card');
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]');
        if (!b) return;
        var a = b.dataset.a;
        if (a === 'skip') return finish();
        if (a === 'back') idx = Math.max(0, idx - 1);
        if (a === 'next') { if (idx >= STEPS.length - 1) return finish(); idx++; }
        render();
      });
      document.body.appendChild(root);
      window.addEventListener('resize', render);
      document.addEventListener('keydown', onKey);
      render();
    }, 350);
  }

  // Add the manual tour action to the existing Send feedback sheet without
  // replacing its feedback form or touching any database functionality.
  function addTourButton() {
    if (typeof tab === 'undefined' || tab !== 'profile') return;
    var sh = $('#ov .sh');
    if (!sh || sh.querySelector('[data-skillshow-tour]')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn o';
    b.style.marginTop = '12px';
    b.setAttribute('data-skillshow-tour', '1');
    b.textContent = 'Take app tour';
    b.addEventListener('click', start);
    sh.appendChild(b);
  }
  function patchFeedback() {
    if (typeof window.feedbackSheet !== 'function' || window.feedbackSheet.__tourPatched) return;
    var original = window.feedbackSheet;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      window.setTimeout(addTourButton, 0);
      return result;
    };
    wrapped.__tourPatched = true;
    window.feedbackSheet = wrapped;
  }

  window.SkillTour = { start: start, end: finish };
  patchFeedback();
  // No auto-start and no URL-query auto-start by design.
})();