/* Skillshow core (v2): connection, session, router, shell (top bar + bottom bar), helpers.
   Other files register their screens with SS.register(name, fn). No file edits another file's code. */
(function () {
  "use strict";
  var SS = window.SS = {
    cfg: { url: "https://aavzlrerdnnkmecpmjsi.supabase.co", key: "sb_publishable_toXur_ed2gk7POMvB2Lfvw_J2JT-dFa" },
    me: null, prof: null, screens: {}, unread: 0
  };
  if (typeof supabase === "undefined") {
    document.getElementById("app").innerHTML = '<div style="padding:40px 20px;text-align:center"><b style="font-size:18px">Could not start Skillshow</b><p style="color:#8A9BB3">The connection library did not load. Check your internet and try again.</p><button onclick="location.reload()" style="padding:12px 26px;border-radius:22px;background:#E1AD48;color:#1E1403;font-weight:700">Reload</button></div>';
    throw new Error("Supabase library did not load");
  }
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
  SS.addIcons = function (o) { for (var k in o) ICONS[k] = o[k]; };
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
    view.innerHTML = ""; view.onclick = null;
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
    var rows = [["image", "Post work", "Show a project or skill", "post"], ["briefcase", "Post a job", "Hire someone with a skill", "job"], ["help", "Ask for help", "Looking for a designer, editor or developer", "ask"], ["plus", "Add story", "Share a photo or video for 24 hours", "story"]];
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
    SS.refreshUnread(); SS.refreshNotifs(); SS.guardBack();
    clearInterval(SS._u); SS._u = setInterval(function () { SS.refreshUnread(); SS.refreshNotifs(); }, 90000);
  };
  SS.stop = function () { clearInterval(SS._u); SS.me = null; SS.prof = null; };
  window.addEventListener("hashchange", route);


  /* ---------- press back again to exit ---------- */
  var armed = false, armT;
  SS.guardBack = function () {
    if (SS._g) return; SS._g = 1;
    try { history.replaceState({ base: 1 }, ""); history.pushState({ ssg: 1 }, ""); } catch (e) { return; }
    window.addEventListener("popstate", function (e) {
      if (!e.state || !e.state.base) return;
      if (armed) { armed = false; history.back(); return; }
      armed = true; SS.toast("Press back again to exit");
      history.pushState({ ssg: 1 }, "");
      clearTimeout(armT); armT = setTimeout(function () { armed = false; }, 2200);
    });
  };

  /* ---------- search ---------- */
  function rowHtml(attr, id, left, title, sub) {
    return '<button class="srow" ' + attr + '="' + SS.esc(id) + '">' + left + '<span class="sm2"><b>' + title + "</b>" + (sub ? '<span class="muted">' + SS.esc(sub) + "</span>" : "") + "</span></button>";
  }
  SS.register("search", function (v, arg) {
    v.innerHTML = '<input class="inp" id="q" type="search" placeholder="Search people, skills, jobs and work" autocomplete="off" value="' + SS.esc(decodeURIComponent(arg || "")) + '"><div id="sr" class="empty">Type at least 2 letters</div>';
    var inp = $("#q"), t;
    async function run() {
      var q = inp.value.trim().replace(/[%*,()]/g, ""), box = $("#sr");
      if (q.length < 2) { box.className = "empty"; box.textContent = "Type at least 2 letters"; return; }
      var w = "*" + q + "*", sb = SS.sb;
      var res = await Promise.all([
        sb.from("profiles").select("id,username,full_name,avatar_url,headline,verified").or("username.ilike." + w + ",full_name.ilike." + w + ",headline.ilike." + w).neq("id", SS.me.id).limit(8),
        sb.from("jobs").select("id,title,company,kind,location").ilike("title", "%" + q + "%").limit(6),
        sb.from("posts").select("id,title,caption,skill,media_url,media_type").is("community_id", null).or("title.ilike." + w + ",caption.ilike." + w + ",skill.ilike." + w).limit(8)
      ]);
      var pe = res[0].data || [], jo = res[1].data || [], po = res[2].data || [], h = "";
      if (pe.length) h += '<h4 class="hsec">People</h4>' + pe.map(function (x) { return rowHtml("data-u", x.id, SS.avatar(x, 44), SS.esc(x.full_name || x.username), x.headline || "@" + x.username); }).join("");
      if (jo.length) h += '<h4 class="hsec">Jobs and requests</h4>' + jo.map(function (x) { return rowHtml("data-job", x.id, '<span class="avatar" style="width:44px;height:44px">' + SS.icon(x.kind === "request" ? "help" : "briefcase") + "</span>", SS.esc(x.title), [x.company, x.location].filter(Boolean).join(" · ")); }).join("");
      if (po.length) h += '<h4 class="hsec">Work</h4>' + po.map(function (x) {
        var th = x.media_url && x.media_type !== "video" ? '<span class="avatar" style="width:44px;height:44px"><img src="' + SS.esc(x.media_url) + '" alt=""></span>' : '<span class="avatar" style="width:44px;height:44px">' + SS.icon("image") + "</span>";
        return rowHtml("data-p", x.id, th, SS.esc(x.title || (x.caption || "").slice(0, 50) || "Post"), x.skill || "");
      }).join("");
      box.className = ""; box.innerHTML = h || '<div class="empty">Nothing found for "' + SS.esc(q) + '"</div>';
    }
    inp.oninput = function () { clearTimeout(t); t = setTimeout(run, 300); };
    v.onclick = function (e) {
      var b;
      if ((b = e.target.closest("[data-u]"))) return SS.go("profile", b.dataset.u);
      if ((b = e.target.closest("[data-job]"))) return SS.openJob && SS.openJob(+b.dataset.job);
      if ((b = e.target.closest("[data-p]"))) return SS.go("post", b.dataset.p);
    };
    if (inp.value) run(); else inp.focus();
  });

  /* ---------- notifications ---------- */
  function notifQ(n) {
    var me = SS.me.id, sb = SS.sb, o = { ascending: false };
    return Promise.all([
      sb.from("likes").select("post_id,user_id,created_at,posts!inner(id,title,user_id)").eq("posts.user_id", me).neq("user_id", me).order("created_at", o).limit(n),
      sb.from("comments").select("post_id,user_id,body,created_at,posts!inner(id,title,user_id)").eq("posts.user_id", me).neq("user_id", me).order("created_at", o).limit(n),
      sb.from("follows").select("follower_id,created_at").eq("following_id", me).order("created_at", o).limit(n),
      sb.from("job_applications").select("job_id,applicant_id,created_at,jobs!inner(id,title,poster_id)").eq("jobs.poster_id", me).order("created_at", o).limit(n),
      sb.from("job_applications").select("job_id,status,status_at,jobs(title)").eq("applicant_id", me).not("status_at", "is", null).order("status_at", o).limit(n)
    ]);
  }
  SS.refreshNotifs = async function () {
    if (!SS.me || !SS.prof) return;
    try {
      var r = await notifQ(1), newest = 0;
      r.forEach(function (x) { (x.data || []).forEach(function (d) { newest = Math.max(newest, new Date(d.status_at || d.created_at).getTime()); }); });
      var seen = SS.prof.notif_seen_at ? new Date(SS.prof.notif_seen_at).getTime() : 0, dot = $("#nd");
      if (dot) dot.hidden = !(newest > seen);
    } catch (e) {}
  };
  SS.register("notifs", async function (v) {
    v.innerHTML = '<h2 style="margin:0 0 12px;font-size:20px">Notifications</h2><div id="nl" class="empty">Loading…</div>';
    var r = await notifQ(30), items = [], sb = SS.sb;
    (r[0].data || []).forEach(function (d) { items.push({ t: "like", at: d.created_at, who: d.user_id, post: d.post_id, title: d.posts && d.posts.title }); });
    (r[1].data || []).forEach(function (d) { items.push({ t: "comment", at: d.created_at, who: d.user_id, post: d.post_id, body: d.body }); });
    (r[2].data || []).forEach(function (d) { items.push({ t: "follow", at: d.created_at, who: d.follower_id }); });
    (r[3].data || []).forEach(function (d) { items.push({ t: "apply", at: d.created_at, who: d.applicant_id, job: d.job_id, title: d.jobs && d.jobs.title }); });
    (r[4].data || []).forEach(function (d) { items.push({ t: "status", at: d.status_at, job: d.job_id, title: d.jobs && d.jobs.title, status: d.status }); });
    items.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    items = items.slice(0, 40);
    var ids = items.map(function (i) { return i.who; }).filter(function (x, k, a) { return x && a.indexOf(x) === k; }), pm = {};
    if (ids.length) { var pr = await sb.from("profiles").select("id,username,full_name,avatar_url").in("id", ids); (pr.data || []).forEach(function (p) { pm[p.id] = p; }); }
    var seen = SS.prof.notif_seen_at ? new Date(SS.prof.notif_seen_at).getTime() : 0, E = SS.esc;
    $("#nl").outerHTML = '<div id="nl">' + (items.length ? items.map(function (i) {
      var p = pm[i.who] || {}, nm = "<b>" + E(p.full_name || p.username || "Someone") + "</b>", txt, go, left = SS.avatar(p, 44);
      if (i.t === "like") { txt = nm + " endorsed your post" + (i.title ? " “" + E(i.title) + "”" : ""); go = 'data-p="' + i.post + '"'; }
      else if (i.t === "comment") { txt = nm + " commented: " + E((i.body || "").slice(0, 80)); go = 'data-p="' + i.post + '"'; }
      else if (i.t === "follow") { txt = nm + " started following you"; go = 'data-u="' + E(i.who) + '"'; }
      else if (i.t === "apply") { txt = nm + " applied to “" + E(i.title || "your job") + "”"; go = 'data-job="' + i.job + '"'; }
      else { txt = "Your application for “" + E(i.title || "a job") + "” is now <b>" + E(i.status || "updated") + "</b>"; go = 'data-job="' + i.job + '"'; left = '<span class="avatar" style="width:44px;height:44px;background:var(--gold);color:var(--on-gold)">' + SS.icon("briefcase") + "</span>"; }
      return '<button class="srow' + (new Date(i.at).getTime() > seen ? " new" : "") + '" ' + go + ">" + left + '<span class="sm2">' + txt + '<span class="muted">' + SS.ago(i.at) + "</span></span></button>";
    }).join("") : '<div class="empty">No notifications yet.<br>Likes, comments, followers and job updates show up here.</div>') + "</div>";
    var now = new Date().toISOString();
    SS.prof.notif_seen_at = now;
    sb.from("profiles").update({ notif_seen_at: now }).eq("id", SS.me.id).then(function () {});
    var dot = $("#nd"); if (dot) dot.hidden = true;
    v.onclick = function (e) {
      var b;
      if ((b = e.target.closest("[data-u]"))) return SS.go("profile", b.dataset.u);
      if ((b = e.target.closest("[data-job]"))) return SS.openJob && SS.openJob(+b.dataset.job);
      if ((b = e.target.closest("[data-p]"))) return SS.go("post", b.dataset.p);
    };
  });

  /* simple profile screen until Stage 2 replaces it */
  SS.register("profile", function (v, id) {
    var p = SS.prof;
    if (id && id !== SS.me.id) { v.innerHTML = '<div class="card"><b>Profile</b><p class="muted" style="margin:6px 0 0">Other people\'s profiles arrive in Stage 2b.</p></div>'; return; }
    v.innerHTML = '<div class="card" style="display:flex;gap:12px;align-items:center">' + SS.avatar(p, 56) +
      '<div style="flex:1"><b style="font-size:16px">' + SS.esc(p.full_name) + '</b><div class="muted">@' + SS.esc(p.username) + "</div></div></div>" +
      '<p class="muted">Your full profile arrives in Stage 2.</p><button class="btn line block" id="so">Sign out</button>';
    $("#so").onclick = function () { SS.signOut(); };
  });
})();
