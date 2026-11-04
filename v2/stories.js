/* Skillshow Stories (v2): a row at the top of Home, a full-screen viewer, and adding a story. */
(function () {
  "use strict";
  var SS = window.SS, $ = SS.$, esc = SS.esc, sb = SS.sb;
  SS.addIcons({
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  });
  var groups = [], seen = new Set(), strip = null, timer = null, ov = null, cur = { g: 0, i: 0 };

  function unseen(g) { return g.items.some(function (s) { return !seen.has(s.id); }); }
  function rank(g) { return g.uid === SS.me.id ? 0 : unseen(g) ? 1 : 2; }

  function draw() {
    if (!strip) return;
    groups.sort(function (a, b) { return rank(a) - rank(b); });
    var mine = groups.filter(function (g) { return g.uid === SS.me.id; })[0];
    var h = '<button class="st" data-mine><span class="ring ' + (mine ? (unseen(mine) ? "new" : "") : "none") + '">' + SS.avatar(SS.prof, 56) +
      '<span class="plus" data-add>' + SS.icon("plus") + '</span></span><span class="sn">Your story</span></button>';
    groups.forEach(function (g, i) {
      if (g.uid === SS.me.id) return;
      h += '<button class="st" data-st="' + i + '"><span class="ring ' + (unseen(g) ? "new" : "") + '">' + SS.avatar(g.p, 56) + '</span><span class="sn">' + esc((g.p.full_name || g.p.username || "").split(" ")[0]) + "</span></button>";
    });
    strip.innerHTML = h;
  }

  async function mount(el) {
    strip = el;
    strip.onclick = function (e) {
      if (e.target.closest("[data-add]")) return add();
      var b = e.target.closest("[data-mine]");
      if (b) { var i = groups.findIndex(function (g) { return g.uid === SS.me.id; }); return i < 0 ? add() : view(i, 0); }
      b = e.target.closest("[data-st]");
      if (b) view(+b.dataset.st, 0);
    };
    draw();
    try {
      var r = await sb.from("stories").select("id,user_id,media_url,media_type,caption,created_at,profiles!user_id(id,username,full_name,avatar_url)")
        .gt("expires_at", new Date().toISOString()).order("created_at");
      if (r.error) throw r.error;
      var list = r.data || [], ids = list.map(function (s) { return s.id; }), m = {};
      seen = new Set();
      if (ids.length) {
        var v = await sb.from("story_views").select("story_id").eq("viewer_id", SS.me.id).in("story_id", ids);
        (v.data || []).forEach(function (x) { seen.add(x.story_id); });
      }
      list.forEach(function (s) { (m[s.user_id] = m[s.user_id] || { uid: s.user_id, p: s.profiles || {}, items: [] }).items.push(s); });
      groups = Object.keys(m).map(function (k) { return m[k]; });
      draw();
    } catch (e) { /* the row still shows "Your story" */ }
  }

  /* ---------- viewer ---------- */
  function view(g, i) {
    close(true); cur = { g: g, i: i || 0 };
    ov = document.createElement("div"); ov.className = "sv";
    document.body.appendChild(ov); document.body.style.overflow = "hidden";
    ov.onclick = function (e) {
      if (e.target.closest("[data-x]")) return close();
      if (e.target.closest("[data-del]")) return del();
      if (e.target.closest(".svh")) return;
      if (e.clientX < window.innerWidth / 3) prev(); else next();
    };
    show();
  }
  function show() {
    clearTimeout(timer);
    var g = groups[cur.g], s = g.items[cur.i], mine = g.uid === SS.me.id;
    ov.innerHTML = '<div class="svb">' + g.items.map(function (x, k) { return '<i class="' + (k < cur.i ? "d" : k === cur.i ? "a" : "") + '"><b></b></i>'; }).join("") + "</div>" +
      '<div class="svh"><span class="who2">' + SS.avatar(g.p, 36) + "<span><b>" + esc(g.p.full_name || g.p.username || "") + "</b><small>" + SS.ago(s.created_at) + "</small></span></span>" +
      '<span class="x">' + (mine ? '<span class="vw" id="vw"></span><button data-del aria-label="Delete story">' + SS.icon("trash") + "</button>" : "") +
      '<button data-x aria-label="Close">' + SS.icon("x") + "</button></span></div>" +
      '<div class="svm">' + (s.media_type === "video" ? '<video src="' + esc(s.media_url) + '" autoplay playsinline></video>' : '<img src="' + esc(s.media_url) + '" alt="">') + "</div>" +
      (s.caption ? '<p class="svc">' + esc(s.caption) + "</p>" : "");
    var bar = ov.querySelector(".svb i.a b");
    function run(ms) {
      bar.style.transition = "width " + ms + "ms linear";
      requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = "100%"; }); });
      timer = setTimeout(next, ms + 150);
    }
    var vd = ov.querySelector("video");
    if (vd) {
      vd.onloadedmetadata = function () { run((vd.duration || 5) * 1000); };
      var p = vd.play(); if (p && p.catch) p.catch(function () { vd.muted = true; vd.play(); });
    } else run(5000);
    if (mine) {
      sb.from("story_views").select("viewer_id", { count: "exact", head: true }).eq("story_id", s.id).then(function (r) {
        var el = $("#vw"); if (el && !r.error) el.innerHTML = SS.icon("eye") + (r.count || 0);
      });
    } else if (!seen.has(s.id)) {
      seen.add(s.id);
      sb.from("story_views").insert({ story_id: s.id, viewer_id: SS.me.id }).then(function () {});
    }
  }
  function next() {
    var g = groups[cur.g];
    if (cur.i < g.items.length - 1) { cur.i++; show(); }
    else if (cur.g < groups.length - 1) { cur.g++; cur.i = 0; show(); }
    else close();
  }
  function prev() {
    if (cur.i > 0) cur.i--; else if (cur.g > 0) { cur.g--; cur.i = groups[cur.g].items.length - 1; }
    show();
  }
  function close(quiet) {
    clearTimeout(timer);
    if (ov) { ov.remove(); ov = null; }
    document.body.style.overflow = "";
    if (!quiet) draw();
  }
  async function del() {
    if (!confirm("Delete this story?")) return;
    clearTimeout(timer);
    var g = groups[cur.g], s = g.items[cur.i];
    var r = await sb.from("stories").delete().eq("id", s.id).eq("user_id", SS.me.id);
    if (r.error) { SS.toast("Could not delete"); return show(); }
    var key = (s.media_url.split("/stories/")[1] || "").split("?")[0];
    if (key) sb.storage.from("stories").remove([decodeURIComponent(key)]).then(function () {});
    g.items.splice(cur.i, 1);
    if (!g.items.length) { groups.splice(cur.g, 1); return close(); }
    if (cur.i >= g.items.length) cur.i = g.items.length - 1;
    show();
  }

  /* ---------- add a story ---------- */
  function add() {
    var f = document.createElement("input");
    f.type = "file"; f.accept = "image/*,video/*";
    f.onchange = function () {
      var file = f.files[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) return SS.toast("That file is over 50 MB");
      var isVid = /^video\//.test(file.type), url = URL.createObjectURL(file);
      SS.sheet("<h2>New story</h2>" + (isVid ? '<video src="' + url + '" style="width:100%;max-height:260px;border-radius:12px;background:#000" muted playsinline></video>' : '<img src="' + url + '" alt="" style="width:100%;max-height:260px;object-fit:contain;border-radius:12px;background:#000">') +
        '<label class="f" style="margin-top:12px"><span>Caption (optional)</span><input class="inp" id="sc" maxlength="150" placeholder="Say something"></label><button class="btn block" id="sg">Share story</button>');
      $("#sg").onclick = async function () {
        $("#sg").disabled = true; $("#sg").textContent = "Sharing…";
        try {
          var blob = isVid ? file : await SS.shrink(file, 1280);
          var ext = isVid ? ((file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "")) : "jpg";
          var path = SS.me.id + "/" + Date.now() + "." + ext;
          var up = await sb.storage.from("stories").upload(path, blob, { upsert: true, contentType: blob.type || file.type, cacheControl: "3600" });
          if (up.error) throw up.error;
          var pub = sb.storage.from("stories").getPublicUrl(path).data.publicUrl;
          var r = await sb.from("stories").insert({ user_id: SS.me.id, media_url: pub, media_type: isVid ? "video" : "image", caption: $("#sc").value.trim() || null });
          if (r.error) throw r.error;
          SS.closeSheet(); SS.toast("Story shared");
          if (strip) mount(strip);
        } catch (e) { $("#sg").disabled = false; $("#sg").textContent = "Share story"; SS.toast("Could not share: " + (e.message || "try again")); }
      };
    };
    f.click();
  }

  SS.stories = { mount: mount, add: add };
  SS.register("create:story", add);
})();
