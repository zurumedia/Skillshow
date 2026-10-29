/* Skillshow layout update
   - Notifications icon becomes a bell
   - Messages moves to the bottom bar (5th slot)
   - Profile moves to the top bar as your photo
   - Post (+) sits in the middle of the bottom bar
   Load AFTER the other scripts. */

(function () {
  const BELL = '<svg class="i" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

  function avatarHtml() {
    const ring = tab === 'profile' ? 'var(--ac)' : 'transparent';
    if (prof && prof.avatar_url) {
      return '<img src="' + esc(prof.avatar_url) + '" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;border:2px solid ' + ring + '">';
    }
    return '<span style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ' + ring + '">' + USER + '</span>';
  }

  function fix() {
    if (step !== 'app') return;
    const nav = document.querySelector('nav');
    if (!nav || nav.dataset.ss || nav.children.length < 5) return;
    const hi = document.querySelector('.hd .hi');
    const profSpan = nav.children[4];

    let msg = hi && hi.children[2];
    if (!msg) {
      msg = document.createElement('span');
      msg.setAttribute('onclick', "tab='msgs';draw()");
      msg.innerHTML = SND + '<i class="bd" id="mb"></i>';
    }
    const w = document.createElement('div');
    w.style.cssText = 'position:relative;display:flex';
    while (msg.firstChild) w.appendChild(msg.firstChild);
    msg.appendChild(w);
    msg.className = tab === 'msgs' ? 'on' : '';

    if (hi) {
      const bell = hi.children[1], svg = bell && bell.querySelector('svg');
      if (svg) svg.outerHTML = BELL;
    }
    nav.replaceChild(msg, profSpan);
    if (hi) {
      profSpan.className = '';
      profSpan.innerHTML = avatarHtml();
      hi.appendChild(profSpan);
    }
    /* Post (+) goes in the middle, Communities moves next to Messages */
    let plus = null, comm = null;
    Array.from(nav.children).forEach(function (k) {
      const oc = k.getAttribute('onclick') || '';
      if (oc.indexOf('openNew') !== -1) plus = k;
      else if (oc.indexOf("'comm'") !== -1) comm = k;
    });
    if (plus && comm && Array.from(nav.children).indexOf(plus) > Array.from(nav.children).indexOf(comm)) {
      nav.insertBefore(plus, comm);
    }
    nav.dataset.ss = '1';
  }

  const prev = window.draw;
  window.draw = function () {
    const r = prev.apply(this, arguments);
    try { fix(); } catch (e) { console.warn('layout fix skipped', e); }
    return r;
  };
})();
