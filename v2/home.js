/* Skillshow Home (v2): work cards + opportunity cards, endorse, comments, apply. */
(function () {
  "use strict";
  var SS = window.SS, $ = SS.$, esc = SS.esc, sb = SS.sb, filter = "all";
  SS.addIcons({
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    play: '<path d="M8 5v14l11-7z"/>'
  });
  var TICK = '<span class="vf" title="Verified">' + SS.icon("check") + "</span>";

  /* WhatsApp link, reused by the profile screen later */
  SS.waLink = function (num, name, topic) {
    var d = String(num || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.length === 11 && d[0] === "0") d = "234" + d.slice(1);
    var t = "Hi " + (name || "") + ", I found you on Skillshow" + (topic ? ' and saw "' + topic + '"' : "") + ". I would like to book you.";
    return "https://wa.me/" + d + "?text=" + encodeURIComponent(t);
  };

  function chips() {
    var f = [["all", "For you"], ["work", "Work"], ["hiring", "Hiring"], ["following", "Following"]];
    return '<div class="chips">' + f.map(function (x) { return '<button class="chip' + (filter === x[0] ? " on" : "") + '" data-f="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>";
  }

  function workCard(p) {
    var u = p.profiles || {}, mine = p.user_id === SS.me.id, likes = p.likes || [];
    var liked = likes.some(function (l) { return l.user_id === SS.me.id; });
    var cc = (p.comments && p.comments[0] && p.comments[0].count) || 0;
    var wa = !mine && u.whatsapp_number ? SS.waLink(u.whatsapp_number, u.full_name, p.title) : "";
    var tag = p.skill && p.skill !== "Other" ? '<span class="ptag">' + esc(p.skill) + "</span>" : "";
    var media = "";
    if (p.media_url) {
      media = p.media_type === "video"
        ? '<div class="pm vid" data-play><video src="' + esc(p.media_url) + '#t=0.1" playsinline preload="metadata"></video>' + tag + '<span class="play">' + SS.icon("play") + '</span><span class="du"></span></div>'
        : '<div class="pm"><img src="' + esc(p.media_url) + '" alt="" loading="lazy">' + tag + "</div>";
    }
    var cap = (p.caption || "").trim(), more = cap.length > 90 ? '<button class="more" data-more>more</button>' : "";
    var body = (p.title ? '<h3 class="pt">' + esc(p.title) + "</h3>" : "") + (cap ? '<p class="pcap">' + esc(cap) + "</p>" + more : "");
    var sub = [u.headline, SS.ago(p.created_at)].filter(Boolean).join(" · ");
    return '<article class="post" data-pid="' + p.id + '"><header class="ph"><button class="who" data-user="' + esc(p.user_id) + '">' + SS.avatar(u, 38) +
      '<span class="wn"><span class="nm">' + esc(u.full_name || u.username || "Someone") + (u.verified ? TICK : "") + '</span><span class="sub">' + esc(sub) + "</span></span></button>" +
      (wa ? '<a class="btn sm" href="' + wa + '" target="_blank" rel="noopener">Book me</a>' : "") +
      '<button class="dots" data-menu="' + p.id + '" data-mine="' + (mine ? 1 : 0) + '" aria-label="More">' + SS.icon("dots") + "</button></header>" + media +
      '<div class="pb">' + body + "</div>" +
      '<div class="acts"><button class="act' + (liked ? " on" : "") + '" data-endorse="' + p.id + '" aria-label="Endorse">' + SS.icon("award") + "<span>" + likes.length + "</span></button>" +
      '<button class="act" data-comments="' + p.id + '" aria-label="Comments">' + SS.icon("message") + "<span>" + cc + "</span></button>" +
      '<button class="act" data-share="' + p.id + '" data-t="' + esc(p.title || cap.slice(0, 60)) + '">' + SS.icon("share") + "<span>Share</span></button></div></article>";
  }

  function menu(id, mine) {
    var html = mine ? '<button class="row" data-do="del"><b>Delete this post</b></button>' :
      '<p class="muted" style="margin:0 0 8px">Report this post</p>' + ["Spam", "Scam or fake offer", "Inappropriate", "Something else"].map(function (r) {
        return '<button class="row" data-reason="' + esc(r) + '"><b>' + esc(r) + "</b></button>";
      }).join("");
    var d = SS.sheet(html);
    d.addEventListener("click", async function (e) {
      var b = e.target.closest("[data-do],[data-reason]");
      if (!b) return;
      if (b.dataset.do === "del") {
        if (!confirm("Delete this post? This cannot be undone.")) return;
        var r = await sb.from("posts").delete().eq("id", id).eq("user_id", SS.me.id);
        SS.closeSheet();
        if (r.error) return SS.toast("Could not delete");
        var card = document.querySelector('[data-pid="' + id + '"]'); if (card) card.remove();
        SS.toast("Deleted");
      } else {
        var w = await sb.from("reports").insert({ reporter_id: SS.me.id, target_type: "post", target_id: String(id), reason: b.dataset.reason });
        SS.closeSheet(); SS.toast(w.error ? "Could not send the report" : "Thanks, we will look into it");
      }
    });
  }

  function share(t) {
    var url = location.origin + location.pathname;
    if (navigator.share) navigator.share({ title: "Skillshow", text: t, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { SS.toast("Link copied"); });
  }
  function mmss(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

  function oppCard(j) {
    var u = j.profiles || {}, req = j.kind === "request", mine = j.poster_id === SS.me.id;
    var meta = [j.company || u.full_name, j.location, j.pay].filter(Boolean).join(" · ");
    return '<article class="card opp"><span class="tile">' + SS.icon(req ? "help" : "briefcase") + '</span><div class="om"><b>' + (req ? "Looking for: " : "Hiring: ") + esc(j.title) +
      '</b><span class="muted">' + esc(meta || "Posted " + SS.ago(j.created_at)) + '</span></div><button class="btn pink sm" data-job="' + j.id + '">' + (mine ? "View" : req ? "Offer" : "Apply") + "</button></article>";
  }

  async function load(v) {
    v.innerHTML = chips() + '<div id="feed" class="empty">Loading…</div>';
    var feed = $("#feed");
    try {
      var uids = null;
      if (filter === "following") {
        var f = await sb.from("follows").select("following_id").eq("follower_id", SS.me.id);
        uids = (f.data || []).map(function (x) { return x.following_id; });
        if (!uids.length) { feed.outerHTML = '<div class="empty">You are not following anyone yet.<br>Find people in Discover.</div>'; return; }
      }
      var qp = null, qj = null;
      if (filter !== "hiring") {
        qp = sb.from("posts").select("id,user_id,title,skill,caption,media_url,media_type,kind,created_at,profiles!user_id(id,username,full_name,avatar_url,verified,headline,whatsapp_number),likes(user_id),comments(count)")
          .is("community_id", null).order("created_at", { ascending: false }).limit(30);
        if (uids) qp = qp.in("user_id", uids);
      }
      if (filter === "all" || filter === "hiring") {
        qj = sb.from("jobs").select("id,poster_id,title,company,location,pay,kind,created_at,status,profiles!poster_id(id,full_name,username,avatar_url)")
          .or("status.is.null,status.neq.closed").order("created_at", { ascending: false }).limit(15);
      }
      var res = await Promise.all([qp, qj]);
      if ((res[0] && res[0].error) || (res[1] && res[1].error)) throw (res[0] && res[0].error) || res[1].error;
      var items = [];
      ((res[0] && res[0].data) || []).forEach(function (p) { items.push({ t: "w", d: p, at: p.created_at }); });
      ((res[1] && res[1].data) || []).forEach(function (j) { items.push({ t: "o", d: j, at: j.created_at }); });
      items.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
      feed.outerHTML = '<div id="feed">' + (items.length ? items.map(function (i) { return i.t === "w" ? workCard(i.d) : oppCard(i.d); }).join("") :
        '<div class="empty">Nothing here yet.<br>Tap the gold + to post the first one.</div>') + "</div>";
    } catch (e) {
      feed.outerHTML = '<div class="empty">Could not load the feed.<br>' + esc(e.message || "") + '<br><button class="btn line sm" data-f="' + filter + '" style="margin-top:12px">Try again</button></div>';
    }
  }

  async function endorse(b) {
    var id = +b.dataset.endorse, on = b.classList.contains("on"), n = b.querySelector("span");
    b.classList.toggle("on", !on); n.textContent = Math.max(0, +n.textContent + (on ? -1 : 1));
    var r = on ? await sb.from("likes").delete().eq("post_id", id).eq("user_id", SS.me.id) : await sb.from("likes").insert({ post_id: id, user_id: SS.me.id });
    if (r.error) { b.classList.toggle("on", on); n.textContent = Math.max(0, +n.textContent + (on ? 1 : -1)); SS.toast("Could not save that"); }
  }

  async function comments(id, btn) {
    SS.sheet('<h2>Comments</h2><div id="cl" class="empty">Loading…</div><div class="send"><input class="inp" id="ci" placeholder="Add a comment" maxlength="500"><button class="btn pink" id="cs">Send</button></div>');
    async function draw() {
      var r = await sb.from("comments").select("id,body,created_at,user_id,parent_comment_id").eq("post_id", id).order("created_at");
      var list = r.data || [], ids = list.map(function (c) { return c.user_id; }).filter(function (x, i, a) { return a.indexOf(x) === i; }), pm = {};
      if (ids.length) { var pr = await sb.from("profiles").select("id,username,full_name,avatar_url").in("id", ids); (pr.data || []).forEach(function (p) { pm[p.id] = p; }); }
      $("#cl").outerHTML = '<div id="cl">' + (list.length ? list.map(function (c) {
        var p = pm[c.user_id] || {};
        return '<div class="cm' + (c.parent_comment_id ? " re" : "") + '">' + SS.avatar(p, 30) + '<div><b>' + esc(p.full_name || p.username || "Someone") + '</b> <span class="muted">' + SS.ago(c.created_at) + "</span><p>" + esc(c.body) + "</p></div></div>";
      }).join("") : '<div class="empty">No comments yet. Be the first.</div>') + "</div>";
      if (btn) btn.querySelector("span").textContent = list.length;
    }
    draw();
    $("#cs").onclick = async function () {
      var i = $("#ci"), t = i.value.trim();
      if (!t) return;
      $("#cs").disabled = true;
      var r = await sb.from("comments").insert({ post_id: id, user_id: SS.me.id, body: t });
      $("#cs").disabled = false;
      if (r.error) return SS.toast("Could not send: " + r.error.message);
      i.value = ""; draw();
    };
  }

  async function openJob(id) {
    var r = await sb.from("jobs").select("*,profiles!poster_id(id,full_name,username,avatar_url)").eq("id", id).maybeSingle();
    if (r.error || !r.data) return SS.toast("Could not open that");
    var j = r.data, u = j.profiles || {}, req = j.kind === "request", mine = j.poster_id === SS.me.id;
    var tags = [j.category, j.job_type, j.work_mode, j.location, j.pay, j.deadline ? "Deadline " + j.deadline : ""].filter(Boolean);
    var html = "<h2>" + (req ? "Looking for: " : "") + esc(j.title) + '</h2><p class="muted" style="margin:-8px 0 12px">' + esc(j.company || u.full_name || "") + "</p>" +
      '<div class="jch">' + tags.map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("") + '</div><p style="white-space:pre-wrap;word-break:break-word">' + esc(j.description || "") + "</p>";
    if (mine) return SS.sheet(html + '<p class="muted">This is your post. People who respond appear in Discover, Jobs.</p>');
    var ex = await sb.from("job_applications").select("status").eq("job_id", id).eq("applicant_id", SS.me.id).maybeSingle();
    if (ex.data) return SS.sheet(html + '<p class="muted">You already responded. Status: ' + esc(ex.data.status || "sent") + ".</p>");
    SS.sheet(html + '<label class="f"><span>' + (req ? "Your offer" : "Why are you a good fit?") + '</span><textarea class="inp" id="am" maxlength="800" placeholder="A short message"></textarea></label>' +
      '<label class="f"><span>Link to your work (optional)</span><input class="inp" id="al" type="url" placeholder="https://"></label><button class="btn block" id="as">' + (req ? "Send offer" : "Apply") + "</button>");
    $("#as").onclick = async function () {
      var m = $("#am").value.trim();
      if (m.length < 5) return SS.toast("Write a short message");
      $("#as").disabled = true;
      var w = await sb.from("job_applications").insert({ job_id: id, applicant_id: SS.me.id, message: m, link: $("#al").value.trim() || null });
      $("#as").disabled = false;
      if (w.error) return SS.toast(w.error.code === "23505" ? "You already responded" : "Could not send: " + w.error.message);
      SS.closeSheet(); SS.toast(req ? "Offer sent" : "Application sent");
    };
  }

  SS.register("home", function (v) {
    load(v);
    v.onclick = function (e) {
      var b;
      if ((b = e.target.closest("[data-f]"))) { filter = b.dataset.f; return load(v); }
      if ((b = e.target.closest("[data-endorse]"))) return endorse(b);
      if ((b = e.target.closest("[data-comments]"))) return comments(+b.dataset.comments, b);
      if ((b = e.target.closest("[data-job]"))) return openJob(+b.dataset.job);
      if ((b = e.target.closest("[data-user]"))) return SS.go("profile", b.dataset.user);
      if ((b = e.target.closest("[data-more]"))) { var c = b.previousElementSibling; c.classList.toggle("open"); b.textContent = c.classList.contains("open") ? "less" : "more"; return; }
      if ((b = e.target.closest("[data-menu]"))) return menu(+b.dataset.menu, b.dataset.mine === "1");
      if ((b = e.target.closest("[data-share]"))) return share(b.dataset.t);
      if ((b = e.target.closest("[data-play]"))) {
        if (!b.classList.contains("on")) { var vd = b.querySelector("video"); b.classList.add("on"); vd.controls = true; vd.play(); }
      }
    };
    v.addEventListener("loadedmetadata", function (e) {
      if (e.target.tagName !== "VIDEO") return;
      var d = e.target.parentNode.querySelector(".du"); if (d) d.textContent = mmss(e.target.duration);
    }, true);
    v.addEventListener("play", function (e) {
      if (e.target.tagName !== "VIDEO") return;
      v.querySelectorAll("video").forEach(function (o) { if (o !== e.target) o.pause(); });
    }, true);
  });
})();
