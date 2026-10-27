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

  if (canDetect) arm();
})();
      
