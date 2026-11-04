/* Skillshow Home (v2): work cards + opportunity cards, endorse, comments, apply. */
(function () {
  "use strict";
  var SS = window.SS, $ = SS.$, esc = SS.esc, sb = SS.sb, filter = "all";
  SS.addIcons({
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    play: '<path d="M8 5v14l11-7z"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-5"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'
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
    var f = [["all", "For you"], ["following", "Following"], ["hiring", "Hiring"]];
    return '<div class="tabs">' + f.map(function (x) { return '<button class="tab' + (filter === x[0] ? " on" : "") + '" data-f="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>";
  }

  var cache = {}, myFollows = new Set();
  function when(t) {
    var s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
    if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago";
    if (s < 604800) return Math.floor(s / 86400) + " d ago"; return new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });
  }
  function rich(t) { return esc(t).replace(/(^|\s)#([A-Za-z][A-Za-z0-9_]{1,29})/g, '$1<span class="ht" data-tag="$2">#$2</span>'); }

  function workCard(p) {
    cache[p.id] = p;
    var u = p.profiles || {}, mine = p.user_id === SS.me.id, likes = p.likes || [];
    var liked = likes.some(function (l) { return l.user_id === SS.me.id; });
    var cc = (p.comments && p.comments[0] && p.comments[0].count) || 0;
    var wa = !mine && u.whatsapp_number ? SS.waLink(u.whatsapp_number, u.full_name, p.title) : "";
    var media = "";
    if (p.media_url) {
      media = p.media_type === "video"
        ? '<div class="pm vid" data-play><video src="' + esc(p.media_url) + '#t=0.1" playsinline preload="metadata"></video><span class="play">' + SS.icon("play") + '</span><span class="du"></span></div>'
        : '<div class="pm"><img src="' + esc(p.media_url) + '" alt="" loading="lazy"></div>';
    }
    var cap = (p.caption || "").trim(), more = cap.length > 90 ? '<button class="more" data-more>more</button>' : "";
    var tags = p.skill && p.skill !== "Other" ? '<p class="ptags"><span class="ht" data-tag="' + esc(p.skill.replace(/\s+/g, "")) + '">#' + esc(p.skill.replace(/\s+/g, "")) + "</span></p>" : "";
    var body = (p.title ? '<h3 class="pt">' + esc(p.title) + "</h3>" : "") + (cap ? '<p class="pcap">' + rich(cap) + "</p>" + more : "") + tags;
    var follow = !mine && !myFollows.has(p.user_id) ? '<button class="btn pink sm" data-follow="' + esc(p.user_id) + '">Follow</button>' : "";
    return '<article class="post" data-pid="' + p.id + '"><header class="ph"><button class="who" data-user="' + esc(p.user_id) + '">' + SS.avatar(u, 40) +
      '<span class="wn"><span class="nm">' + esc(u.full_name || u.username || "Someone") + (u.verified ? TICK : "") + '</span><span class="sub">' + esc(when(p.created_at)) + "</span></span></button>" + follow + "</header>" + media +
      '<div class="acts"><button class="act' + (liked ? " on" : "") + '" data-endorse="' + p.id + '" aria-label="Endorse">' + SS.icon("award") + "<span>" + likes.length + "</span></button>" +
      '<button class="act" data-comments="' + p.id + '" aria-label="Comments">' + SS.icon("message") + "<span>" + cc + "</span></button>" +
      '<button class="act" data-share="' + p.id + '" data-t="' + esc(p.title || cap.slice(0, 60)) + '" aria-label="Share">' + SS.icon("share") + "</button>" +
      '<button class="act" data-menu="' + p.id + '" aria-label="More options">' + SS.icon("dots") + "</button>" +
      (wa ? '<a class="btn sm book" href="' + wa + '" target="_blank" rel="noopener">Book me</a>' : "") + "</div>" +
      '<div class="pb">' + body + "</div></article>";
  }

  function vidOf(id) { return document.querySelector('[data-pid="' + id + '"] video'); }
  function fullscreen(id) {
    var p = cache[id], vd = vidOf(id);
    if (vd) {
      vd.parentNode.classList.add("on"); vd.controls = true;
      var f = vd.requestFullscreen || vd.webkitRequestFullscreen || vd.webkitEnterFullscreen;
      if (f) f.call(vd); vd.play();
    } else if (p && p.media_url) {
      var o = document.createElement("div"); o.className = "lb";
      o.innerHTML = '<img src="' + esc(p.media_url) + '" alt=""><button class="lbx" aria-label="Close">' + "&times;" + "</button>";
      o.onclick = function () { o.remove(); };
      document.body.appendChild(o);
    }
  }
  async function save(p) {
    SS.toast("Saving…");
    var ext = (p.media_url.split("?")[0].split(".").pop() || (p.media_type === "video" ? "mp4" : "jpg")).slice(0, 4);
    try {
      var b = await (await fetch(p.media_url)).blob(), a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = "skillshow-" + Date.now() + "." + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    } catch (e) { window.open(p.media_url, "_blank"); }
  }
  function copyLink() {
    var url = location.origin + location.pathname;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { SS.toast("Link copied"); });
  }
  function speedSheet(id) {
    var vd = vidOf(id), cur = vd ? vd.playbackRate : 1, rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    var d = SS.sheet("<h2>Playback speed</h2>" + rates.map(function (r) {
      return '<button class="row" data-rate="' + r + '"><b>' + (r === 1 ? "Normal" : r + "x") + (r === cur ? " ✓" : "") + "</b></button>";
    }).join(""));
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-rate]");
      if (!b || !vd) return;
      vd.playbackRate = +b.dataset.rate; vd.defaultPlaybackRate = +b.dataset.rate;
      SS.closeSheet(); SS.toast("Speed " + (+b.dataset.rate === 1 ? "normal" : b.dataset.rate + "x"));
    });
  }
  function reportSheet(id) {
    var d = SS.sheet('<h2>Report this post</h2>' + ["Spam", "Scam or fake offer", "Inappropriate", "Something else"].map(function (r) {
      return '<button class="row" data-reason="' + esc(r) + '"><b>' + esc(r) + "</b></button>";
    }).join(""));
    d.addEventListener("click", async function (e) {
      var b = e.target.closest("[data-reason]");
      if (!b) return;
      var w = await sb.from("reports").insert({ reporter_id: SS.me.id, target_type: "post", target_id: String(id), reason: b.dataset.reason });
      SS.closeSheet(); SS.toast(w.error ? "Could not send the report" : "Thanks, we will look into it");
    });
  }
  async function del(id) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    var r = await sb.from("posts").delete().eq("id", id).eq("user_id", SS.me.id);
    SS.closeSheet();
    if (r.error) return SS.toast("Could not delete");
    var card = document.querySelector('[data-pid="' + id + '"]'); if (card) card.remove();
    SS.toast("Deleted");
  }
  function menu(id) {
    var p = cache[id];
    if (!p) return;
    var mine = p.user_id === SS.me.id, vid = p.media_type === "video", items = [];
    if (vid) items.push(["gauge", "Playback speed", "speed"], ["expand", "Full screen", "full"]);
    else if (p.media_url) items.push(["expand", "View full screen", "full"]);
    if (p.media_url) items.push(["download", vid ? "Save video" : "Save photo", "save"]);
    items.push(["copy", "Copy link", "copy"]);
    items.push(mine ? ["trash", "Delete post", "del"] : ["flag", "Report", "report"]);
    var d = SS.sheet(items.map(function (i) { return '<button class="row" data-do="' + i[2] + '"><span class="mi">' + SS.icon(i[0]) + "</span><b>" + i[1] + "</b></button>"; }).join(""));
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-do]");
      if (!b) return;
      var a = b.dataset.do;
      if (a === "speed") return speedSheet(id);
      if (a === "report") return reportSheet(id);
      if (a === "del") return del(id);
      SS.closeSheet();
      if (a === "full") fullscreen(id); else if (a === "save") save(p); else if (a === "copy") copyLink();
    });
  }
  function share(t) {
    var url = location.origin + location.pathname;
    if (navigator.share) navigator.share({ title: "Skillshow", text: t, url: url }).catch(function () {});
    else copyLink();
  }
  async function follow(b) {
    var uid = b.dataset.follow; b.disabled = true;
    var r = await sb.from("follows").insert({ follower_id: SS.me.id, following_id: uid });
    if (r.error && r.error.code !== "23505") { b.disabled = false; return SS.toast("Could not follow"); }
    myFollows.add(uid);
    document.querySelectorAll('[data-follow="' + uid + '"]').forEach(function (x) { x.remove(); });
    SS.toast("Following");
  }
  function mmss(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

  function oppCard(j) {
    var u = j.profiles || {}, req = j.kind === "request", mine = j.poster_id === SS.me.id;
    var meta = [j.company || u.full_name, j.location, j.pay].filter(Boolean).join(" · ");
    return '<article class="card opp"><span class="tile">' + SS.icon(req ? "help" : "briefcase") + '</span><div class="om"><b>' + (req ? "Looking for: " : "Hiring: ") + esc(j.title) +
      '</b><span class="muted">' + esc(meta || "Posted " + SS.ago(j.created_at)) + '</span></div><button class="btn pink sm" data-job="' + j.id + '">' + (mine ? "View" : req ? "Offer" : "Apply") + "</button></article>";
  }

  async function load(v) {
    v.innerHTML = '<div class="strip" id="strip"></div>' + chips() + '<div id="feed" class="empty">Loading…</div>';
    if (SS.stories) SS.stories.mount($("#strip"));
    var feed = $("#feed");
    try {
      var fr = await sb.from("follows").select("following_id").eq("follower_id", SS.me.id);
      myFollows = new Set((fr.data || []).map(function (x) { return x.following_id; }));
      var uids = null;
      if (filter === "following") {
        uids = Array.from(myFollows);
        if (!uids.length) { feed.outerHTML = '<div class="empty">You are not following anyone yet.<br>Tap Follow on a post you like.</div>'; return; }
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
    var parent = null;
    SS.sheet('<h2>Comments</h2><div id="cl" class="empty">Loading…</div><div id="rp" class="muted" hidden></div><div class="send"><input class="inp" id="ci" placeholder="Add a comment" maxlength="500"><button class="btn pink" id="cs">Send</button></div>');
    async function draw() {
      var r = await sb.from("comments").select("id,body,created_at,user_id,parent_comment_id").eq("post_id", id).order("created_at");
      var list = r.data || [], ids = list.map(function (c) { return c.user_id; }).filter(function (x, k, a) { return a.indexOf(x) === k; }), pm = {};
      if (ids.length) { var pr = await sb.from("profiles").select("id,username,full_name,avatar_url").in("id", ids); (pr.data || []).forEach(function (p) { pm[p.id] = p; }); }
      $("#cl").outerHTML = '<div id="cl">' + (list.length ? list.map(function (c) {
        var p = pm[c.user_id] || {}, nm = p.full_name || p.username || "Someone";
        return '<div class="cm' + (c.parent_comment_id ? " re" : "") + '">' + SS.avatar(p, 30) + '<div style="flex:1"><b>' + esc(nm) + '</b> <span class="muted">' + SS.ago(c.created_at) + "</span><p>" + esc(c.body) +
          '</p><span class="cact"><button data-rp="' + (c.parent_comment_id || c.id) + '" data-n="' + esc(nm) + '">Reply</button>' + (c.user_id === SS.me.id ? '<button data-cd="' + c.id + '">Delete</button>' : "") + "</span></div></div>";
      }).join("") : '<div class="empty">No comments yet. Be the first.</div>') + "</div>";
      if (btn) btn.querySelector("span").textContent = list.length;
    }
    draw();
    $("#sheet").addEventListener("click", async function (e) {
      var b = e.target.closest("[data-rp]");
      if (b) { parent = +b.dataset.rp; var r = $("#rp"); r.hidden = false; r.innerHTML = "Replying to " + esc(b.dataset.n) + ' · <button class="link" data-cancel>Cancel</button>'; $("#ci").focus(); return; }
      if (e.target.closest("[data-cancel]")) { parent = null; $("#rp").hidden = true; return; }
      b = e.target.closest("[data-cd]");
      if (b && confirm("Delete this comment?")) {
        var d = await sb.from("comments").delete().eq("id", +b.dataset.cd).eq("user_id", SS.me.id);
        if (d.error) SS.toast("Could not delete"); else draw();
      }
    });
    $("#cs").onclick = async function () {
      var inp = $("#ci"), t = inp.value.trim();
      if (!t) return;
      $("#cs").disabled = true;
      var r = await sb.from("comments").insert({ post_id: id, user_id: SS.me.id, body: t, parent_comment_id: parent });
      $("#cs").disabled = false;
      if (r.error) return SS.toast("Could not send: " + r.error.message);
      inp.value = ""; parent = null; $("#rp").hidden = true; draw();
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

  SS.openJob = openJob;
  SS.register("home", function (v) {
    load(v);
    bindFeed(v);
  });

  function bindFeed(v) {
    v.onclick = function (e) {
      var b;
      if ((b = e.target.closest("[data-tag]"))) return SS.go("search", encodeURIComponent(b.dataset.tag));
      if ((b = e.target.closest("[data-f]"))) { filter = b.dataset.f; return load(v); }
      if ((b = e.target.closest("[data-endorse]"))) return endorse(b);
      if ((b = e.target.closest("[data-comments]"))) return comments(+b.dataset.comments, b);
      if ((b = e.target.closest("[data-job]"))) return openJob(+b.dataset.job);
      if ((b = e.target.closest("[data-user]"))) return SS.go("profile", b.dataset.user);
      if ((b = e.target.closest("[data-more]"))) { var c = b.previousElementSibling; c.classList.toggle("open"); b.textContent = c.classList.contains("open") ? "less" : "more"; return; }
      if ((b = e.target.closest("[data-menu]"))) return menu(+b.dataset.menu);
      if ((b = e.target.closest("[data-share]"))) return share(b.dataset.t);
      if ((b = e.target.closest("[data-follow]"))) return follow(b);
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
  }

  var SEL = "id,user_id,title,skill,caption,media_url,media_type,kind,created_at,profiles!user_id(id,username,full_name,avatar_url,verified,headline,whatsapp_number),likes(user_id),comments(count)";
  SS.register("post", async function (v, id) {
    v.innerHTML = '<div class="empty">Loading…</div>';
    var res = await Promise.all([sb.from("posts").select(SEL).eq("id", id).maybeSingle(), sb.from("follows").select("following_id").eq("follower_id", SS.me.id)]);
    if (res[0].error || !res[0].data) { v.innerHTML = '<div class="empty">This post is not available.</div>'; return; }
    myFollows = new Set((res[1].data || []).map(function (x) { return x.following_id; }));
    v.innerHTML = '<button class="link" data-back style="margin:0 0 8px">&larr; Back</button>' + workCard(res[0].data);
    bindFeed(v);
    v.addEventListener("click", function (e) { if (e.target.closest("[data-back]")) history.back(); });
  });
})();
