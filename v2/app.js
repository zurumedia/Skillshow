/* Skillshow core (v2): connection, session, router, shell (top bar + bottom bar), helpers.
   Other files register their screens with SS.register(name, fn). No file edits another file's code. */
(function () {
  "use strict";
  var SS = window.SS = {
    cfg: { url: "https://aavzlrerdnnkmecpmjsi.supabase.co", key: "sb_publishable_toXur_ed2gk7POMvB2Lfvw_J2JT-dFa" },
    me: null, prof: null, screens: {}, unread: 0
  };
  SS.sb = supabase.createClient(SS.cfg.url, SS.cfg.key);
  var $ = SS.$ = function (q, r) { return (r || document).querySelector(q); };

  /* ---------- helpers ---------- */
  SS.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>'
  };
  SS.icon = function (n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || "") + "</svg>"; };
  SS.avatar = function (p, size) {
    p = p || {};
    var st = size ? ' style="width:' + size + "px;height:" + size + 'px"' : "";
    return '<span class="avatar"' + st + ">" + (p.avatar_url ? '<img src="' + SS.esc(p.avatar_url) + '" alt="">' : SS.esc(((p.full_name || p.username || "?")[0] || "?").toUpperCase())) + "</span>";
  };
  SS.ago = function (t) {
    var s = Math.max(1, (Date.now() - new Date(t).getTime()) / 1000);
    if (s < 60) return "now"; if (s < 3600) return Math.floor(s / 60) + "m"; if (s < 86400) return Math.floor(s / 3600) + "h";
    if (s < 604800) return Math.floor(s / 86400) + "d"; return new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });
  };
  var tt;
  SS.toast = function (m) { var t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("on"); }, 2600); };
  SS.sheet = function (html) {
    SS.closeSheet();
    var d = document.createElement("div");
    d.className = "sheet-bg"; d.id = "sheet";
    d.innerHTML = '<div class="sheet" role="dialog"><div class="grab"></div>' + html + "</div>";
    d.addEventListener("click", function (e) { if (e.target === d) SS.closeSheet(); });
    document.body.appendChild(d);
    return d;
  };
  SS.closeSheet = function () { var s = $("#sheet"); if (s) s.remove(); };
  SS.register = function (name, fn) { SS.screens[name] = fn; };

  /* ---------- router (uses the address hash, so the phone's back button works) ---------- */
  SS.go = function (name, arg) {
    var h = "#/" + name + (arg ? "/" + arg : "");
    if (location.hash === h) route(); else location.hash = h;
  };
  function parts() { var p = location.hash.replace(/^#\/?/, "").split("/"); return { name: p[0] || "home", arg: p[1] || "" }; }
  function route() {
    if (!SS.me || !SS.prof) return;
    var r = parts(), view = $("#view");
    if (!view) return SS.shell();
    SS.closeSheet();
    var fn = SS.screens[r.name];
    view.innerHTML = "";
    if (fn) fn(view, r.arg);
    else view.innerHTML = '<div class="card"><b>' + SS.esc(r.name.charAt(0).toUpperCase() + r.name.slice(1)) + '</b><p class="muted" style="margin:6px 0 0">This screen arrives in the next stage.</p></div>';
    var own = r.name === "profile" && (!r.arg || r.arg === SS.me.id);
    document.querySelectorAll("[data-nav]").forEach(function (b) { b.classList.toggle("on", b.dataset.nav === r.name); });
    var me = $("#meb"); if (me) me.classList.toggle("on", own);
    window.scrollTo(0, 0);
  }

  /* ---------- shell ---------- */
  function nav(name, icon, label, extra) {
    return '<button class="nb" data-nav="' + name + '" data-act="' + name + '"><span class="pill' + (name === "create" ? " gold" : "") + '">' + SS.icon(icon) + (extra || "") + "</span>" + label + "</button>";
  }
  SS.shell = function () {
    $("#app").innerHTML =
      '<div class="shell"><header class="top"><button class="wm" data-act="home" aria-label="Home">Skillshow<i>.</i></button>' +
      '<button class="tb" data-act="search" aria-label="Search">' + SS.icon("search") + "</button>" +
      '<button class="tb" data-act="notifs" aria-label="Notifications">' + SS.icon("bell") + '<span class="dot" id="nd" hidden></span></button>' +
      '<button class="me" id="meb" data-act="profile" aria-label="Your profile">' + SS.avatar(SS.prof, 30) + "</button></header>" +
      '<main id="view"></main></div>' +
      '<nav class="nav" aria-label="Main">' + nav("home", "home", "Home") + nav("discover", "compass", "Discover") + nav("create", "plus", "Create") +
      nav("messages", "message", "Messages", '<span class="badge" id="mb" hidden></span>') + "</nav>";
    $("#app").onclick = function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var a = b.dataset.act;
      if (a === "create") return SS.createSheet();
      SS.go(a);
    };
    route();
  };
  SS.createSheet = function () {
    var rows = [["image", "Post work", "Show a project or skill", "post"], ["briefcase", "Post a job", "Hire someone with a skill", "job"], ["help", "Ask for help", "Looking for a designer, editor or developer", "ask"]];
    var d = SS.sheet(rows.map(function (r) {
      return '<button class="row" data-new="' + r[3] + '"><span class="tile">' + SS.icon(r[0]) + "</span><span><b>" + r[1] + '</b><span class="muted">' + r[2] + "</span></span></button>";
    }).join(""));
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-new]");
      if (!b) return;
      SS.closeSheet();
      if (SS.screens["create:" + b.dataset.new]) SS.screens["create:" + b.dataset.new](); else SS.toast("This arrives in the next stage");
    });
  };
  SS.setUnread = function (n) {
    SS.unread = n;
    var b = $("#mb"); if (!b) return;
    b.hidden = !n; b.textContent = n > 9 ? "9+" : n;
  };
  SS.refreshUnread = function () {
    if (!SS.me) return;
    SS.sb.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", SS.me.id).is("read_at", null)
      .then(function (r) { if (!r.error) SS.setUnread(r.count || 0); });
  };

  /* called by auth.js once the person is logged in and has a profile */
  SS.start = function () {
    SS.shell();
    SS.refreshUnread();
    clearInterval(SS._u); SS._u = setInterval(SS.refreshUnread, 60000);
  };
  SS.stop = function () { clearInterval(SS._u); SS.me = null; SS.prof = null; };
  window.addEventListener("hashchange", route);

  /* simple profile screen until Stage 2 replaces it */
  SS.register("profile", function (v, id) {
    var p = SS.prof;
    v.innerHTML = '<div class="card" style="display:flex;gap:12px;align-items:center">' + SS.avatar(p, 56) +
      '<div style="flex:1"><b style="font-size:16px">' + SS.esc(p.full_name) + '</b><div class="muted">@' + SS.esc(p.username) + "</div></div></div>" +
      '<p class="muted">Your full profile arrives in Stage 2.</p><button class="btn line block" id="so">Sign out</button>';
    $("#so").onclick = function () { SS.signOut(); };
  });
})();
