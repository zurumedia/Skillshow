
/* SkillShow Patch: Full-screen photo viewer */
(function () {
  "use strict";

  if (window.__ssPhotoViewerV2) return;
  window.__ssPhotoViewerV2 = true;

  var viewer, photo, closeBtn;
  var opened = false;
  var scale = 1;
  var startScale = 1;
  var startDistance = 0;
  var lastX = 0;
  var lastY = 0;
  var moveX = 0;
  var moveY = 0;
  var lastTap = 0;

  var style = document.createElement("style");
  style.textContent = `
    #ss-viewer {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(2,10,28,.97);
      overflow: hidden;
      touch-action: none;
    }
    #ss-viewer.open { display: flex; }
    #ss-viewer img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      transform-origin: center;
      user-select: none;
      -webkit-user-drag: none;
    }
    #ss-viewer .ss-x {
      position: absolute;
      top: calc(env(safe-area-inset-top,0px) + 14px);
      right: 14px;
      width: 46px;
      height: 46px;
      border: 0;
      border-radius: 50%;
      background: rgba(255,255,255,.16);
      color: white;
      font-size: 30px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  function buildViewer() {
    if (viewer) return;

    viewer = document.createElement("div");
    viewer.id = "ss-viewer";

    photo = document.createElement("img");
    photo.alt = "Full-size photo";
    photo.draggable = false;

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "ss-x";
    closeBtn.textContent = "\u00d7";
    closeBtn.setAttribute("aria-label", "Close photo");

    viewer.appendChild(photo);
    viewer.appendChild(closeBtn);
    document.body.appendChild(viewer);

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeViewer();
    });

    viewer.addEventListener("click", function (e) {
      if (e.target === viewer) closeViewer();
    });

    photo.addEventListener("click", function (e) {
      e.stopPropagation();
      var now = Date.now();

      if (now - lastTap < 300) {
        scale = scale > 1 ? 1 : 2.5;
        moveX = 0;
        moveY = 0;
        applyTransform();
      }

      lastTap = now;
    });

    viewer.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) {
        startDistance = distance(e.touches);
        startScale = scale;
      } else if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    viewer.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && startDistance) {
        scale = Math.max(
          1,
          Math.min(5, startScale * distance(e.touches) / startDistance)
        );

        if (scale === 1) moveX = moveY = 0;
        applyTransform();
        e.preventDefault();
      } else if (e.touches.length === 1 && scale > 1) {
        var x = e.touches[0].clientX;
        var y = e.touches[0].clientY;

        moveX += x - lastX;
        moveY += y - lastY;
        lastX = x;
        lastY = y;

        applyTransform();
        e.preventDefault();
      }
    }, { passive: false });

    viewer.addEventListener("touchend", function (e) {
      if (e.touches.length < 2) startDistance = 0;
    }, { passive: true });
  }

  function distance(touches) {
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function applyTransform() {
    photo.style.transform =
      "translate(" + moveX + "px," + moveY + "px) scale(" + scale + ")";
  }

  function openViewer(src) {
    if (!src) return;
    buildViewer();

    scale = 1;
    moveX = moveY = 0;
    applyTransform();

    photo.src = src;
    viewer.classList.add("open");
    opened = true;

    try {
      history.pushState({ ssViewer: true }, "", location.href);
    } catch (e) {}
  }

  function hideViewer() {
    if (!opened) return;

    opened = false;
    viewer.classList.remove("open");
    photo.removeAttribute("src");
    scale = 1;
    moveX = moveY = 0;
  }

  function closeViewer() {
    if (!opened) return;

    if (history.state && history.state.ssViewer) {
      history.back();
    } else {
      hideViewer();
    }
  }

  window.addEventListener("popstate", function () {
    if (opened) hideViewer();
  });

  document.addEventListener("click", function (e) {
    if (opened || !e.target.closest) return;

    var el = e.target.closest(".dp, .cov");
    if (!el) return;

    var image = el.querySelector("img");
    var src = image && (image.currentSrc || image.src);

    if (!src) {
      var bg = getComputedStyle(el).backgroundImage;
      var match = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      if (match) src = match[1];
    }

    if (!src || src === "none") return;

    e.preventDefault();
    e.stopPropagation();
    openViewer(src);
  }, true);

      

  /* ---------- profile photo (.dp) and cover (.cov) taps ---------- */
  var cs = document.createElement('style');
  cs.textContent = '.dp,.cov{cursor:pointer}';
  document.head.appendChild(cs);

  function srcOf(el) {
    var i = el.querySelector && el.querySelector('img');
    if (i && (i.currentSrc || i.src)) return i.currentSrc || i.src;
    var bg = getComputedStyle(el).backgroundImage || '';
    var m = /url\(["']?(.*?)["']?\)/.exec(bg);
    return m ? m[1] : null;
  }

  document.addEventListener('click', function (e) {
    if (viewerOpen) return;
    var el = e.target.closest && e.target.closest('.dp,.cov');
    console.log('[SkillShow Photo Viewer] Tapped:', e.target, 'Matched:', el);
    if (!el) return;
    var src = srcOf(el);
    if (!src) return; // no photo uploaded yet (letter placeholder / plain cover)
    e.preventDefault();
    e.stopPropagation();
    openViewer(src);
  }, true);

  /* ---------- press back again to exit ---------- */
  var toast, toastTimer;
  function showToast() {
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ss-toast';
      toast.textContent = 'Press back again to exit Skillshow';
      document.body.appendChild(toast);
    }
    toast.classList.add('show');
  }
  function hideToast() { if (toast) toast.classList.remove('show'); }

  var canDetect = !!(window.navigation && typeof window.navigation.canGoBack === 'boolean');

  function arm() {
    try { history.pushState({ ssBuf: 1 }, '', location.href); } catch (e) {}
  }

  window.addEventListener('popstate', function () {
    if (viewerOpen) { hideViewer(); return; }
    if (!canDetect) return;
    setTimeout(function () {
      if (window.navigation.canGoBack) return; // still inside the app's own history
      // at the very first entry: next back press will leave the app
      showToast();
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        hideToast();
        if (!window.navigation.canGoBack) arm(); // user stayed: re-arm
      }, 2500);
    }, 0);
  });


  /* ---------- profile editing fixes ---------- */
  try {
    /* 1. no length limits on bio, headline and skills */
    window.parseSkills = function (x) {
      return Array.from(new Set((x || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean)));
    };

    var origSetup = V.setup;
    V.setup = function () {
      return origSetup()
        .replace('rows="3" maxlength="150" oninput="tp.bio=this.value"',
                 'rows="4" style="min-height:100px;overflow:hidden;resize:none" oninput="tp.bio=this.value;this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'"')
        .replace('<input class="fi" maxlength="80" value=', '<input class="fi" value=')
        .replace('Skills (separate with commas, up to 8)', 'Skills (separate with commas)');
    };

    var lc = document.createElement('style');
    lc.textContent = '.bio{white-space:pre-wrap;overflow-wrap:anywhere}.hl{overflow-wrap:anywhere}';
    document.head.appendChild(lc);

    var origDraw = window.draw;
    window.draw = function () {
      origDraw();
      document.querySelectorAll('textarea.fi').forEach(function (t) {
        t.style.height = 'auto';
        t.style.height = Math.max(100, t.scrollHeight) + 'px';
      });
    };

    /* 2. easy photo changes: no 5 MB cap, photos are shrunk before upload */
    window.pick = function (w, inp) {
      var f = inp.files[0];
      if (!f) return;
      if (!f.type.startsWith('image/')) { toast('Please choose an image'); return; }
      tp[w + 'File'] = f;
      tp[w + 'Prev'] = URL.createObjectURL(f);
      var y = window.scrollY;
      draw();
      window.scrollTo(0, y); // stay where you were instead of jumping to the top
    };

    function asFile(blob) { return new File([blob], 'photo.jpg', { type: 'image/jpeg' }); }

    window.save = async function () {
      if (busy) return;
      var n = tp.name.trim(), u = tp.user.trim();
      if (!n) { toast('Enter your name'); return; }
      if (!/^[a-z0-9._]{3,20}$/.test(u)) { toast('Username: 3 to 20 letters, numbers, . or _'); return; }
      lock(true);
      try {
        var av = prof ? prof.avatar_url : null, cv = prof ? prof.cover_url : null;
        if (tp.avatarFile) av = await up('avatars', asFile(await compress(tp.avatarFile)));
        if (tp.coverFile) cv = await up('covers', asFile(await compress(tp.coverFile)));
        var row = {
          id: me.id, username: u, full_name: n, bio: tp.bio.trim(),
          avatar_url: av, cover_url: cv, headline: (tp.headline || '').trim(),
          skills: parseSkills(tp.skills), open_to_work: !!tp.open
        };
        var res = await sb.from('profiles').upsert(row).select().single();
        if (res.error) {
          toast(res.error.code === '23505' ? 'That username is taken, try another' : res.error.message);
          lock(false); return;
        }
        var first = !prof;
        prof = res.data; lock(false); step = 'app'; startRT();
        tab = first ? 'home' : 'profile'; draw();
        toast(first ? 'Welcome to Skillshow' : 'Profile updated');
      } catch (e) { lock(false); toast('Upload failed: ' + (e.message || e)); }
    };
  } catch (err) { console.warn('Skillshow patch (profile fixes) skipped:', err); }


  /* ---------- guided tour for new users ---------- */
  try {
    var TOUR_KEY = 'ss_tour_v2';
    var tsteps = [
      { t: 'Welcome to Skillshow', x: 'Here is a quick tour so you know where everything is. It takes about 30 seconds.' },
      { t: 'Scroll for more', x: 'Swipe up on the home feed to see the next post. Tap the heart to like and the bubble to comment.', hand: true },
      { sel: 'nav span:nth-child(3)', t: 'Share your work', x: 'Tap the + button to share a post and show people what you can do.' },
      { sel: '.hd .hi span:nth-child(1)', t: 'Find people', x: 'Search for people, skills and opportunities.' },
      { sel: 'nav span:nth-child(2)', t: 'Jobs', x: 'Browse jobs, apply with your CV, or post a job of your own.' },
      { sel: 'nav span:nth-child(4)', t: 'Communities', x: 'Join communities, chat with the group, reply, react and share photos.' },
      { sel: 'nav span:nth-child(5)', t: 'Messages', x: 'Message anyone directly. Your chats live here.' },
      { sel: '.hd .hi span:nth-child(3)', t: 'Your profile', x: 'Add a photo, cover, headline, skills, CV and portfolio. A complete profile gets noticed and trusted.' },
      { sel: '#fab', t: 'Tell us what you think', x: 'Have an idea or found a problem? Tap the bulb and tell the Skillshow Team.' }
    ];
    var tcss = document.createElement('style');
    tcss.textContent =
      '#ss-tour{position:fixed;inset:0;z-index:2147482000;touch-action:none}' +
      '#ss-tour .ss-dim{position:absolute;inset:0;background:rgba(2,10,28,.86)}' +
      '#ss-tour .ss-hole{position:absolute;border-radius:16px;border:2px solid #e8bb67;box-shadow:0 0 0 100vmax rgba(2,10,28,.86);pointer-events:none;transition:all .25s ease}' +
      '#ss-tour .ss-card{position:absolute;background:#02183d;border:1px solid #e8bb67;border-radius:18px;padding:18px 18px 14px;color:#f6f7fb;font:400 15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.5)}' +
      '#ss-tour .ss-card h4{margin:0 0 6px;font:700 18px/1.25 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#eb99c1}' +
      '#ss-tour .ss-card p{margin:0 0 14px}' +
      '#ss-tour .ss-row{display:flex;align-items:center;justify-content:space-between;gap:10px}' +
      '#ss-tour .ss-dots{display:flex;gap:5px}' +
      '#ss-tour .ss-dots i{width:6px;height:6px;border-radius:50%;background:#33496f}' +
      '#ss-tour .ss-dots i.on{background:#e8bb67}' +
      '#ss-tour .ss-skip{background:none;border:0;color:#a5b4d0;font:600 14px system-ui,sans-serif;padding:8px 6px}' +
      '#ss-tour .ss-next{background:#e8bb67;color:#02183d;border:0;border-radius:999px;font:700 15px system-ui,sans-serif;padding:10px 22px}' +
      '#ss-tour .ss-hand{position:absolute;left:50%;top:34%;width:46px;height:46px;margin-left:-23px;border-radius:50%;background:rgba(232,187,103,.18);border:2px solid #e8bb67;display:flex;align-items:center;justify-content:center;animation:ssup 1.2s ease-in-out infinite}' +
      '@keyframes ssup{0%{transform:translateY(40px);opacity:0}30%{opacity:1}100%{transform:translateY(-40px);opacity:0}}';
    document.head.appendChild(tcss);

    var tidx = 0;
    function tseen() { try { return !!localStorage.getItem(TOUR_KEY); } catch (e) { return true; } }
    function tmark() { try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {} }
    function trect(sel) {
      var e = document.querySelector(sel);
      if (!e) return null;
      var r = e.getBoundingClientRect();
      return (r.width > 0 && r.height > 0) ? r : null;
    }
    function endTour() {
      var o = document.getElementById('ss-tour');
      if (o) o.remove();
      tmark();
    }
    function tshow(i) {
      while (i < tsteps.length && tsteps[i].sel && !trect(tsteps[i].sel)) i++;
      if (i >= tsteps.length) { endTour(); return; }
      tidx = i;
      var st = tsteps[i], r = st.sel ? trect(st.sel) : null;
      var o = document.getElementById('ss-tour');
      if (o) o.remove();
      o = document.createElement('div');
      o.id = 'ss-tour';
      var vw = window.innerWidth, vh = window.innerHeight;
      if (r) {
        var hole = document.createElement('div');
        hole.className = 'ss-hole';
        var pad = 8;
        hole.style.left = (r.left - pad) + 'px';
        hole.style.top = (r.top - pad) + 'px';
        hole.style.width = (r.width + pad * 2) + 'px';
        hole.style.height = (r.height + pad * 2) + 'px';
        o.appendChild(hole);
        var block = document.createElement('div');
        block.style.cssText = 'position:absolute;inset:0';
        o.appendChild(block);
      } else {
        var dim = document.createElement('div');
        dim.className = 'ss-dim';
        o.appendChild(dim);
      }
      if (st.hand) {
        var h = document.createElement('div');
        h.className = 'ss-hand';
        h.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8bb67" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
        o.appendChild(h);
      }
      var card = document.createElement('div');
      card.className = 'ss-card';
      var last = i === tsteps.length - 1, dots = '';
      for (var d = 0; d < tsteps.length; d++) dots += '<i' + (d === i ? ' class="on"' : '') + '></i>';
      card.innerHTML = '<h4></h4><p></p><div class="ss-row"><div class="ss-dots">' + dots + '</div><div>' +
        (last ? '' : '<button class="ss-skip" type="button">Skip</button>') +
        '<button class="ss-next" type="button">' + (last ? 'Done' : 'Next') + '</button></div></div>';
      card.querySelector('h4').textContent = st.t;
      card.querySelector('p').textContent = st.x;
      o.appendChild(card);
      document.body.appendChild(o);
      var cw = Math.min(340, vw - 32);
      card.style.width = cw + 'px';
      var ch = card.offsetHeight, top;
      if (r) top = (r.top + r.height / 2 > vh / 2) ? r.top - ch - 18 : r.bottom + 18;
      else top = (vh - ch) / 2;
      top = Math.max(12, Math.min(vh - ch - 12, top));
      var cx = r ? r.left + r.width / 2 - cw / 2 : (vw - cw) / 2;
      card.style.left = Math.max(16, Math.min(vw - cw - 16, cx)) + 'px';
      card.style.top = top + 'px';
      card.querySelector('.ss-next').onclick = function () { if (last) endTour(); else tshow(i + 1); };
      var sk = card.querySelector('.ss-skip');
      if (sk) {
        var armed = false, armT;
        sk.onclick = function () {
          if (!armed) {
            armed = true; sk.textContent = 'Tap again to exit';
            armT = setTimeout(function () { armed = false; sk.textContent = 'Skip'; }, 2500);
          } else { clearTimeout(armT); endTour(); }
        };
      }
    }
    window.SkillTour = { start: function () { tshow(0); }, end: endTour };
  } catch (errTour) { console.warn('Skillshow patch (tour) skipped:', errTour); }



  /* ---------- Cloud tour: first visit per account ---------- */
  try {
    if (!window.__ssCloudAutoTourHook && typeof window.draw === 'function') {
      window.__ssCloudAutoTourHook = true;

      var ssOriginalDraw = window.draw;
      var ssTourPending = false;

      window.draw = function () {
        var result = ssOriginalDraw.apply(this, arguments);

        if (
          ssTourPending ||
          step !== 'app' ||
          tab !== 'home' ||
          !uinfo ||
          !uinfo.p ||
          !uinfo.p.username
        ) {
          return result;
        }

        var ssUsername = String(uinfo.p.username).toLowerCase();
        var ssTourKey = 'ss_cloud_tour_seen_v1_' +
          ssUsername.replace(/[^a-z0-9_-]/g, '_');

        try {
          if (localStorage.getItem(ssTourKey)) return result;
        } catch (e) {
          return result;
        }

        ssTourPending = true;

        setTimeout(function () {
          ssTourPending = false;

          if (
            step !== 'app' ||
            tab !== 'home' ||
            !uinfo ||
            !uinfo.p ||
            String(uinfo.p.username).toLowerCase() !== ssUsername
          ) {
            return;
          }

          if (
            !window.SkillTour ||
            typeof window.SkillTour.start !== 'function'
          ) {
            return;
          }

          try {
            if (localStorage.getItem(ssTourKey)) return;

            localStorage.setItem(ssTourKey, '1');
            window.SkillTour.start();
          } catch (e) {
            console.warn('SkillShow Cloud tour could not start:', e);
          }
        }, 1600);

        return result;
      };
    }
  } catch (err) {
    console.warn('SkillShow Cloud auto-tour skipped:', err);
        }
          
  /* ---------- no "Hire me" button on the official support account ---------- */
  try {
    var hmApp = document.getElementById('app');
    if (hmApp && window.MutationObserver) {
      new MutationObserver(function () {
        if (typeof uinfo === 'undefined' || !uinfo || !uinfo.p || uinfo.p.username !== 'skillshowsupport') return;
        var hb = document.querySelectorAll('#app button[onclick^="hireMe("]');
        for (var q = 0; q < hb.length; q++) hb[q].remove();
      }).observe(hmApp, { childList: true, subtree: true });
    }
  } catch (err3) { console.warn('Skillshow patch (hire button) skipped:', err3); }

  if (canDetect) arm();
})();

    
/* SkillShow Patch: Confirm before exiting the app */
(function () {
  "use strict";

  if (window.__ssConfirmExitInstalled) return;
  window.__ssConfirmExitInstalled = true;

  var lastBackPress = 0;
  var exitDelay = 2000;
  var toastTimer = null;
  var toastEl = null;

  function showExitMessage() {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "ss-exit-toast";
      toastEl.textContent = "Press Back again to exit SkillShow";

      toastEl.style.cssText =
        "position:fixed;" +
        "left:50%;" +
        "bottom:calc(env(safe-area-inset-bottom,0px) + 28px);" +
        "transform:translateX(-50%);" +
        "z-index:2147483647;" +
        "background:#152642;" +
        "color:#fff;" +
        "border:1px solid #C9A86A;" +
        "border-radius:14px;" +
        "padding:13px 18px;" +
        "font:600 14px system-ui,sans-serif;" +
        "box-shadow:0 5px 20px rgba(0,0,0,.35);" +
        "max-width:90%;" +
        "text-align:center;" +
        "pointer-events:none;";

      document.body.appendChild(toastEl);
    }

    toastEl.style.display = "block";

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (toastEl) toastEl.style.display = "none";
    }, exitDelay);
  }

  function installExitGuard() {
    if (!document.body) return;

    // Create a history entry so the first Back press
    // can be intercepted instead of leaving immediately.
    try {
      history.pushState({ ssExitGuard: true }, "", location.href);
    } catch (e) {
      return;
    }

    window.addEventListener("popstate", function () {
      // Do not interfere with the full-screen photo viewer.
      if (
        document.getElementById("ss-viewer") &&
        document.getElementById("ss-viewer").classList.contains("open")
      ) {
        return;
      }

      var now = Date.now();

      if (now - lastBackPress < exitDelay) {
        // Let the browser or installed app handle the next Back press.
        lastBackPress = 0;
        return;
      }

      lastBackPress = now;
      showExitMessage();

      // Restore the history entry to keep the app open.
      try {
        history.pushState({ ssExitGuard: true }, "", location.href);
      } catch (e) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installExitGuard, {
      once: true
    });
  } else {
    installExitGuard();
  }
})();
      
