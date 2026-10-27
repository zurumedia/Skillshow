/* Skillshow patch: full-size photo viewer + "press back again to exit" */
(function () {
  if (window.__ssPatch) return;
  window.__ssPatch = true;

  /* ---------- styles ---------- */
  var css =
    '#ss-viewer{position:fixed;inset:0;z-index:2147483000;background:rgba(2,10,28,.96);display:none;align-items:center;justify-content:center;touch-action:none}' +
    '#ss-viewer.open{display:flex}' +
    '#ss-viewer img{max-width:100%;max-height:100%;object-fit:contain;transform-origin:center;will-change:transform;user-select:none;-webkit-user-drag:none}' +
    '#ss-viewer .ss-x{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);right:14px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:26px;line-height:44px;text-align:center;cursor:pointer;padding:0}' +
    '#ss-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);transform:translateX(-50%);z-index:2147483001;background:#02183d;color:#f6f7fb;border:1px solid #e8bb67;padding:12px 20px;border-radius:999px;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:none;white-space:nowrap}' +
    '#ss-toast.show{display:block}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- viewer ---------- */
  var viewer, img, closeBtn, viewerOpen = false;
  var sc = 1, tx = 0, ty = 0, sd = 0, ssc = 1, lx = 0, ly = 0, lastTap = 0;

  function build() {
    if (viewer) return;
    viewer = document.createElement('div');
    viewer.id = 'ss-viewer';
    img = document.createElement('img');
    img.alt = '';
    closeBtn = document.createElement('button');
    closeBtn.className = 'ss-x';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    viewer.appendChild(img);
    viewer.appendChild(closeBtn);
    document.body.appendChild(viewer);

    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeViewer(); });
    viewer.addEventListener('click', function (e) { if (e.target === viewer && sc === 1) closeViewer(); });

    function dist(e) {
      var a = e.touches[0], b = e.touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
    viewer.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) { sd = dist(e); ssc = sc; }
      else if (e.touches.length === 1) {
        lx = e.touches[0].clientX; ly = e.touches[0].clientY;
        var now = Date.now();
        if (now - lastTap < 300 && e.target === img) { sc = sc > 1 ? 1 : 2.5; tx = ty = 0; apply(); }
        lastTap = now;
      }
    }, { passive: true });
    viewer.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && sd) {
        sc = Math.min(5, Math.max(1, ssc * dist(e) / sd));
        if (sc === 1) { tx = ty = 0; }
        apply(); e.preventDefault();
      } else if (e.touches.length === 1 && sc > 1) {
        var x = e.touches[0].clientX, y = e.touches[0].clientY;
        tx += x - lx; ty += y - ly; lx = x; ly = y;
        apply(); e.preventDefault();
      }
    }, { passive: false });
    viewer.addEventListener('touchend', function (e) { if (e.touches.length < 2) sd = 0; }, { passive: true });
  }

  function apply() {
    img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
  }

  function openViewer(src) {
    build();
    sc = 1; tx = ty = 0; apply();
    img.src = src;
    viewer.classList.add('open');
    viewerOpen = true;
    try { history.pushState({ ssViewer: 1 }, '', location.href); } catch (e) {}
  }

  function hideViewer() {
    if (!viewerOpen) return;
    viewerOpen = false;
    viewer.classList.remove('open');
    img.removeAttribute('src');
  }

  function closeViewer() {
    if (!viewerOpen) return;
    if (history.state && history.state.ssViewer) history.back(); // popstate hides it
    else hideViewer();
  }

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
    var TOUR_KEY = 'ss_tour_v1';
    var tsteps = [
      { t: 'Welcome to Skillshow', x: 'Here is a quick tour so you know where everything is. It takes about 30 seconds.' },
      { t: 'Scroll for more', x: 'Swipe up on the home feed to see the next post. Tap the heart to like and the bubble to comment.', hand: true },
      { sel: 'nav span:nth-child(4)', t: 'Share your work', x: 'Tap the + button to share a post and show people what you can do.' },
      { sel: '.hd .hi span:nth-child(1)', t: 'Find people', x: 'Search for people, skills and opportunities.' },
      { sel: 'nav span:nth-child(2)', t: 'Jobs', x: 'Browse jobs, apply with your CV, or post a job of your own.' },
      { sel: 'nav span:nth-child(3)', t: 'Communities', x: 'Join communities for your field and meet people who do what you do.' },
      { sel: '.hd .hi span:nth-child(3)', t: 'Messages', x: 'Message anyone directly. Your chats live here.' },
      { sel: 'nav span:nth-child(5)', t: 'Your profile', x: 'Add a photo, cover, headline, skills, CV and portfolio. A complete profile gets noticed and trusted.' },
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
      var cw = Math.min(vw - 24, 340);
      card.style.width = cw + 'px';
      var h4 = document.createElement('h4'); h4.textContent = st.t;
      var p = document.createElement('p'); p.textContent = st.x;
      var row = document.createElement('div'); row.className = 'ss-row';
      var skip = document.createElement('button'); skip.className = 'ss-skip'; skip.textContent = i === tsteps.length - 1 ? '' : 'Skip';
      skip.onclick = endTour;
      var dots = document.createElement('div'); dots.className = 'ss-dots';
      for (var d = 0; d < tsteps.length; d++) { var di = document.createElement('i'); if (d === i) di.className = 'on'; dots.appendChild(di); }
      var next = document.createElement('button'); next.className = 'ss-next';
      next.textContent = i === tsteps.length - 1 ? 'Done' : 'Next';
      next.onclick = function () { if (tidx >= tsteps.length - 1) endTour(); else tshow(tidx + 1); };
      row.appendChild(skip); row.appendChild(dots); row.appendChild(next);
      card.appendChild(h4); card.appendChild(p); card.appendChild(row);
      o.appendChild(card);
      document.body.appendChild(o);
      var left = r ? Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), vw - cw - 12) : (vw - cw) / 2;
      card.style.left = left + 'px';
      var ch = card.offsetHeight;
      if (!r) card.style.top = Math.max(12, (vh - ch) / 2 + (st.hand ? 70 : 0)) + 'px';
      else if (r.top > vh / 2) card.style.top = Math.max(12, r.top - ch - 20) + 'px';
      else card.style.top = Math.min(vh - ch - 12, r.bottom + 20) + 'px';
    }
    function startTour() {
      if (document.getElementById('ss-tour')) return;
      tmark();
      tshow(0);
    }
    window.addEventListener('resize', function () {
      if (document.getElementById('ss-tour')) tshow(tidx);
    });

    /* auto-start once, on the home feed, for anyone who has not seen it */
    var tpending = false, drawWithFixes = window.draw;
    window.draw = function () {
      drawWithFixes();
      if (tpending || tseen() || step !== 'app' || tab !== 'home') return;
      tpending = true;
      setTimeout(function () {
        tpending = false;
        if (!tseen() && step === 'app' && tab === 'home' && !document.getElementById('ss-tour')) startTour();
      }, 1400);
    };

    /* "Take the app tour" button on the profile page */
    var appEl = document.getElementById('app');
    if (appEl && window.MutationObserver) {
      new MutationObserver(function () {
        if (tab !== 'profile' || document.getElementById('ss-tour-btn')) return;
        var btns = document.querySelectorAll('#app button'), fb = null;
        for (var k = 0; k < btns.length; k++) {
          if (/Send feedback or suggestion/i.test(btns[k].textContent)) { fb = btns[k]; break; }
        }
        if (!fb) return;
        var nb = document.createElement('button');
        nb.id = 'ss-tour-btn';
        nb.className = fb.className;
        nb.textContent = 'Take the app tour';
        nb.onclick = function () {
          tab = 'home'; draw();
          setTimeout(startTour, 600);
        };
        fb.parentNode.insertBefore(nb, fb.nextSibling);
      }).observe(appEl, { childList: true, subtree: true });
    }
  } catch (err2) { console.warn('Skillshow patch (tour) skipped:', err2); }


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
                            
