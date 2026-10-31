/* Skillshow Home (v2, Stage 2a): feed of work cards and opportunity cards. */
(function () {
  "use strict";
  var SS = window.SS, sb = SS.sb, esc = SS.esc, $ = SS.$, data = null, filter = "all";
  var P = {
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    job: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>'
  };
  var ic = function (k) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + P[k] + "</svg>"; };
  var onHome = function () { return !location.hash || /^#\/home/.test(location.hash); };
  SS.refreshHome = function () { data = null; };

  async function load() {
    var me = SS.me.id;
    var r = await Promise.all([
      sb.from("posts").select("id,user_id,caption,title,skill,kind,media_url,media_type,created_at").is("community_id", null).order("created_at", { ascending: false }).limit(30),
      sb.from("jobs").select("*").neq("status", "closed").order("created_at", { ascending: false }).limit(15),
      sb.from("follows").select("following_id").eq("follower_id", me),
      sb.from("job_applications").select("job_id").eq("applicant_id", me)
    ]);
    var posts = r[0].data || [], jobs = r[1].data || [], pids = posts.map(function (p) { return p.id; });
    var uids = posts.map(function (p) { return p.user_id; }).concat(jobs.map(function (j) { return j.poster_id; }));
    uids = uids.filter(function (u, i) { return uids.indexOf(u) === i; });
    var x = await Promise.all([
      uids.length ? sb.from("profiles").select("id,username,full_name,avatar_url,headline,whatsapp_number,verified").in("id", uids) : { data: [] },
      pids.length ? sb.from("likes").select("post_id,user_id").in("post_id", pids) : { data: [] },
      pids.length ? sb.from("comments").select("post_id").in("post_id", pids) : { data: [] }
    ]);
    var d = { posts: posts, jobs: jobs, prof: {}, likes: {}, com: {}, following: {}, applied: {} };
    (x[0].data || []).forEach(function (p) { d.prof[p.id] = p; });
    (x[1].data || []).forEach(function (l) { var o = d.likes[l.post_id] || (d.likes[l.post_id] = { n: 0, mine: false }); o.n++; if (l.user_id === me) o.mine = true; });
    (x[2].data || []).forEach(function (c) { d.com[c.post_id] = (d.com[c.post_id] || 0) + 1; });
    (r[2].data || []).forEach(function (f) { d.following[f.following_id] = 1; });
    (r[3].data || []).forEach(function (a) { d.applied[a.job_id] = 1; });
    data = d;
  }

  function workCard(p) {
    var u = data.prof[p.user_id] || {}, l = data.likes[p.id] || { n: 0, mine: false }, c = data.com[p.id] || 0;
    var media = p.media_url ? (p.media_type === "video" ? '<video class="media" src="' + esc(p.media_url) + '" controls preload="metadata" playsinline></video>' : '<img class="media" src="' + esc(p.media_url) + '" alt="" loading="lazy">') : "";
    var digits = String(u.whatsapp_number || "").replace(/\D/g, "");
    var book = digits ? '<a class="btn line sm" target="_blank" rel="noopener" href="https://wa.me/' + digits + "?text=" + encodeURIComponent("Hi " + (u.full_name || "") + ", I found you on Skillshow and I would like to book you.") + '">Book me</a>' : "";
    return '<article class="card" data-p="' + p.id + '">' + media + (p.skill ? '<span class="tag">' + esc(p.skill) + "</span>" : "") +
      (p.title ? '<p class="wt">' + esc(p.title) + "</p>" : "") + (p.caption ? '<p class="muted" style="margin:0 0 var(--s3)">' + esc(p.caption) + "</p>" : "") +
      '<div class="line-row"><button class="who" data-u="' + p.user_id + '">' + SS.avatar(u, 34) + "<span><b>" + esc(u.full_name || "User") + "</b><small>" + esc(u.headline || "@" + (u.username || "")) + "</small></span></button>" + book + "</div>" +
      '<div class="acts"><button class="act' + (l.mine ? " on" : "") + '" data-e="' + p.id + '">' + ic("award") + "<span>" + l.n + "</span> Endorse</button>" +
      '<button class="act" data-c="' + p.id + '">' + ic("chat") + "<span>" + c + "</span></button></div></article>";
  }
  function oppCard(j) {
    var req = j.kind === "request", u = data.prof[j.poster_id] || {}, mine = j.poster_id === SS.me.id, done = data.applied[j.id];
    var left = "";
    if (j.deadline) { var dl = Math.ceil((new Date(j.deadline + "T23:59:59") - Date.now()) / 864e5); left = dl < 0 ? "Closed" : dl === 0 ? "Last day" : dl + (dl === 1 ? " day left" : " days left"); }
    var meta = [j.company || u.full_name, j.work_mode || j.location, j.pay, left].filter(Boolean).map(esc).join(" · ");
    var btn = mine ? '<button class="btn line sm" disabled>Yours</button>' : done ? '<button class="btn line sm" disabled>Applied</button>' :
      '<button class="btn pink sm" data-a="' + j.id + '">' + (req ? "Offer" : "Apply") + "</button>";
    return '<article class="card opp"><span class="tile2">' + ic(req ? "help" : "job") + '</span><div class="mid"><b>' + (req ? "Looking for: " : "Hiring: ") + esc(j.title) + "</b><small>" + meta + "</small></div>" + btn + "</article>";
  }

  function render(v) {
    if (!onHome() || !data) return;
    var items = [];
    if (filter !== "opps") data.posts.forEach(function (p) { if (filter !== "following" || data.following[p.user_id]) items.push({ at: p.created_at, h: workCard(p) }); });
    if (filter === "all" || filter === "opps") data.jobs.forEach(function (j) { items.push({ at: j.created_at, h: oppCard(j) }); });
    items.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
    var chip = function (k, t) { return '<button class="chip' + (filter === k ? " on" : "") + '" data-f="' + k + '">' + t + "</button>"; };
    v.innerHTML = '<div class="chips">' + chip("all", "For you") + chip("work", "Work") + chip("opps", "Opportunities") + chip("following", "Following") + "</div>" +
      (items.length ? items.map(function (i) { return i.h; }).join("") : '<div class="card muted">Nothing here yet. Tap Create to post the first one.</div>');
  }

  async function endorse(pid, btn) {
    var l = data.likes[pid] || (data.likes[pid] = { n: 0, mine: false }), was = l.mine, me = SS.me.id;
    l.mine = !was; l.n += was ? -1 : 1;
    btn.classList.toggle("on", l.mine); btn.querySelector("span").textContent = l.n;
    var r = was ? await sb.from("likes").delete().eq("post_id", pid).eq("user_id", me) : await sb.from("likes").insert({ post_id: pid, user_id: me });
    if (r.error) { l.mine = was; l.n += was ? 1 : -1; btn.classList.toggle("on", was); btn.querySelector("span").textContent = l.n; SS.toast("Could not save that"); }
  }

  async function comments(pid, btn) {
    var d = SS.sheet("<h3>Comments</h3><div id=\"cml\" class=\"muted\">Loading…</div><div class=\"cmin\"><input class=\"inp\" id=\"cmt\" maxlength=\"500\" placeholder=\"Add a comment\"><button class=\"btn pink sm\" id=\"cms\">Send</button></div>");
    var list = [], names = {};
    function paint() {
      $("#cml").innerHTML = list.length ? list.map(function (c) { var u = names[c.user_id] || {};
        return '<div class="cm">' + SS.avatar(u, 30) + "<div><b>" + esc(u.full_name || "User") + ' <span class="muted" style="font-weight:500">' + SS.ago(c.created_at) + "</span></b><div>" + esc(c.body) + "</div></div></div>"; }).join("") : "No comments yet.";
    }
    var r = await sb.from("comments").select("id,user_id,body,created_at").eq("post_id", pid).order("created_at").limit(100);
    list = r.data || [];
    var ids = list.map(function (c) { return c.user_id; }).concat(SS.me.id).filter(function (u, i, a) { return a.indexOf(u) === i; });
    var pr = await sb.from("profiles").select("id,full_name,avatar_url,username").in("id", ids);
    (pr.data || []).forEach(function (p) { names[p.id] = p; });
    paint();
    $("#cms", d).onclick = async function () {
      var inp = $("#cmt", d), t = inp.value.trim();
      if (!t) return;
      inp.value = "";
      var w = await sb.from("comments").insert({ post_id: pid, user_id: SS.me.id, body: t }).select("id,user_id,body,created_at").single();
      if (w.error) return SS.toast("Could not post your comment");
      list.push(w.data); names[SS.me.id] = names[SS.me.id] || SS.prof; paint();
      data.com[pid] = (data.com[pid] || 0) + 1; btn.querySelector("span").textContent = data.com[pid];
    };
  }

  function apply(jid) {
    var j = data.jobs.filter(function (x) { return x.id === jid; })[0]; if (!j) return;
    var d = SS.sheet("<h3>" + (j.kind === "request" ? "Offer to help" : "Apply") + ": " + esc(j.title) + "</h3>" +
      '<label class="f"><span>Short message</span><textarea class="inp" id="am" maxlength="600" placeholder="Tell them why you are a good fit"></textarea></label>' +
      '<label class="f"><span>Portfolio link (optional)</span><input class="inp" id="al" type="url" placeholder="https://"></label><button class="btn block" id="as">Send</button>');
    $("#as", d).onclick = async function () {
      var m = $("#am", d).value.trim(), l = $("#al", d).value.trim();
      if (!m) return SS.toast("Write a short message");
      this.disabled = true;
      var r = await sb.from("job_applications").insert({ job_id: jid, applicant_id: SS.me.id, message: m, link: l || null });
      if (r.error && r.error.code !== "23505") { this.disabled = false; return SS.toast("Could not send: " + r.error.message); }
      data.applied[jid] = 1; SS.closeSheet(); SS.toast(r.error ? "You already applied" : "Sent!"); render($("#view"));
    };
  }

  SS.register("home", function (v) {
    if (data) render(v); else v.innerHTML = '<div class="card muted">Loading…</div>';
    load().then(function () { render(v); }, function () { if (!data) v.innerHTML = '<div class="card muted">Could not load the feed. Check your connection.</div>'; });
    v.onclick = function (e) {
      var t;
      if ((t = e.target.closest("[data-f]"))) { filter = t.dataset.f; return render(v); }
      if ((t = e.target.closest("[data-e]"))) return endorse(Number(t.dataset.e), t);
      if ((t = e.target.closest("[data-c]"))) return comments(Number(t.dataset.c), t);
      if ((t = e.target.closest("[data-a]"))) return apply(Number(t.dataset.a));
      if ((t = e.target.closest("[data-u]"))) return SS.go("profile", t.dataset.u);
    };
  });
})();
