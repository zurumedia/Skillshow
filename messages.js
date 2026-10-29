/* SkillShow Messages — full redesign (replaces old messages.js)
   Header, search, tabs and chat rows styled like the SkillShow mock.
   Groups tab, Archived, number badges, and chat options panel (⋮).
   Needs the chat_prefs table (chat_prefs.sql). */
(function () {
  "use strict";
  var STYLE_ID = "ss-messages-enhancement", BAR_ID = "ss-messages-toolbar";
  var query = "", filter = "all", listObserver = null, currentList = null;
  var replied = new Set(), repReady = false, repKey = "";
  var prefs = new Map(), prefsFor = null, ver = {}, viewConvs = [];

  var T = function () { return typeof tab !== "undefined" ? tab : ""; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var P = function (id) { return prefs.get(String(id)) || {}; };
  var ready = function () { return typeof sb !== "undefined" && typeof me !== "undefined" && me; };
  var $id = function (i) { return document.getElementById(i); };

  var TICK = '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-left:4px"><circle cx="12" cy="12" r="11" fill="#1d9bf0"/><path d="m7 12.5 3.2 3.2L17 9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var GRP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15.5 14c2.8-.2 5.5 1.4 5.5 4.5"/></svg>';
  var SRCH = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
  var NEWM = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="m18.5 3.5 2 2L12 14l-3 1 1-3z"/></svg>';

  function tfmt(t) {
    var d = new Date(t), n = new Date();
    var sod = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var diff = Math.round((sod(n) - sod(d)) / 864e5);
    if (diff <= 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  }
  function avHtml(url, name, color) {
    if (typeof avt === "function" && !color) return '<div class="av">' + avt(url, name) + "</div>";
    if (url) return '<div class="av"><img src="' + esc(url) + '" alt=""></div>';
    return '<div class="av" style="background:' + (color || "#5B1424") + ';color:#fff">' + esc(((name || "?")[0] || "?").toUpperCase()) + "</div>";
  }

  /* ---------- saved chat settings ---------- */
  function loadPrefs() {
    if (!ready() || prefsFor === me.id) return;
    prefsFor = me.id;
    sb.from("chat_prefs").select("*").eq("user_id", me.id).then(function (r) {
      if (r.error) return;
      prefs = new Map((r.data || []).map(function (x) { return [String(x.other_id), x]; }));
      redrawInbox();
    });
  }
  function setPref(id, patch) {
    var row = Object.assign({}, P(id), patch, { user_id: me.id, other_id: id, updated_at: new Date().toISOString() });
    prefs.set(String(id), row);
    sb.from("chat_prefs").upsert(row, { onConflict: "user_id,other_id" }).then(function (r) {
      if (r.error) toast("Could not save: " + r.error.message);
    });
  }
  function redrawInbox() { if (T() === "msgs" && typeof drawConvs === "function") drawConvs(); }

  function visible(c) {
    var p = P(c.o);
    if (filter === "archived") return !!p.archived && !p.blocked;
    if (p.blocked || p.archived) return false;
    if (p.cleared_at && c.last && new Date(c.last.created_at) <= new Date(p.cleared_at)) return false;
    return true;
  }

  /* ---------- inbox rows (replaces index.html's drawConvs) ---------- */
  function convRow(c) {
    var p = (typeof pmap !== "undefined" && pmap[c.o]) || { full_name: "User" }, l = c.last, pr = P(c.o);
    var isTyp = typeof typing !== "undefined" && typing[c.o];
    var prev = isTyp ? '<span style="color:#22c55e">typing…</span>' :
      (l.sender_id == me.id ? "You: " : "") + esc(l.body || (l.image_url ? "Photo" : l.audio_url ? "Voice message" : ""));
    var on = typeof online !== "undefined" && online.has(c.o);
    return '<div class="ssm-row" onclick="openChat(\'' + esc(c.o) + '\')"><div class="ssm-av" onclick="event.stopPropagation();openUser(\'' + esc(c.o) + '\')">' + avHtml(p.avatar_url, p.full_name) + (on ? '<i class="ssm-on"></i>' : "") +
      '</div><div class="ssm-mid"><b>' + (pr.favorite ? "⭐ " : "") + esc(p.full_name) + (ver[c.o] ? TICK : "") + (pr.muted ? " 🔕" : "") + "</b><small>" + prev +
      '</small></div><div class="ssm-rt"><span>' + tfmt(l.created_at) + "</span>" +
      (c.unread ? "<em>" + (c.unread > 9 ? "9+" : c.unread) + "</em>" : "") + "</div></div>";
  }
  function drawInbox() {
    var g = $id("clistm");
    if (!g || typeof convs === "undefined" || !ready()) return;
    if (typeof drawAct === "function") drawAct();
    viewConvs = convs.filter(visible).map(function (c) {
      return Object.assign({}, c, { unread: c.unread || (P(c.o).manual_unread ? 1 : 0) });
    }).sort(function (a, b) { return (P(b.o).favorite ? 1 : 0) - (P(a.o).favorite ? 1 : 0); });
    g.innerHTML = viewConvs.length ? viewConvs.map(convRow).join("") :
      '<p class="co" style="padding:30px 20px;text-align:center">' + (filter === "archived" ? "No archived chats." : "No chats yet. Tap the pen icon to start one.") + "</p>";
    loadVer();
  }
  function loadVer() {
    var ids = convs.map(function (c) { return c.o; }).filter(function (i) { return !(i in ver); });
    if (!ids.length) return;
    ids.forEach(function (i) { ver[i] = false; });
    sb.from("profiles").select("id,verified").in("id", ids).then(function (r) {
      var any = false;
      (r.data || []).forEach(function (x) { if (x.verified) { ver[x.id] = true; any = true; } });
      if (any) redrawInbox();
    });
  }

  function hook() {
    if (window.__ssmHooked || typeof drawConvs !== "function" || typeof openChat !== "function") return;
    window.__ssmHooked = true;
    var oc = window.openChat;
    window.drawConvs = drawInbox;
    if (typeof sendMsg === "function") {
      var os = window.sendMsg;
      window.sendMsg = async function () {
        var r = await os.apply(this, arguments);
        var i = $id("mi");
        if (i && i.tagName === "TEXTAREA") grow(i);
        return r;
      };
    }
    window.openChat = function (id) {
      if (P(id).manual_unread) setPref(id, { manual_unread: false });
      return oc.apply(this, arguments);
    };
  }
  window.SSM = { isMuted: function (id) { return !!P(id).muted; } };

  /* ---------- styles ---------- */
  function addStyles() {
    if ($id(STYLE_ID)) return;
    var B = "#" + BAR_ID, s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      B + "{padding:8px 14px 0;background:var(--bg)}" +
      B + " button{font:inherit}" +
      B + " .ssm-top{display:flex;align-items:center;gap:10px;margin-bottom:4px}" +
      B + " .ssm-me{width:36px;height:36px;border-radius:50%;overflow:hidden;position:relative;flex:none;cursor:pointer}" +
      B + " .ssm-me .av{width:36px;height:36px;font-size:14px}" +
      B + " .ssm-logo{flex:1;font-size:22px;font-weight:800;color:#ff2d8a;letter-spacing:-.5px}" +
      B + " .ssm-ic{background:none;border:0;color:var(--tx);padding:6px;display:flex}" +
      B + " .ssm-ic svg{width:21px;height:21px}" +
      B + " .ssm-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}" +
      B + " .ssm-title h1{margin:0;font-size:20px;font-weight:800;color:var(--tx)}" +
      B + " .ssm-arch{background:none;border:0;color:var(--mu);font-size:12.5px;font-weight:650;padding:4px 2px}" +
      B + " .ssm-arch.active{color:var(--ac)}" +
      B + " .ssm-sw{display:none;position:relative;margin-bottom:8px;color:var(--mu)}" +
      B + " .ssm-sw.open{display:block}" +
      B + " .ssm-sw svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:18px;height:18px}" +
      B + " .ssm-search{width:100%;box-sizing:border-box;padding:9px 14px 9px 40px;border-radius:22px;border:0;background:var(--so);color:var(--tx);font:inherit;font-size:14px;outline:none}" +
      B + " .ssm-filters{display:flex;gap:7px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}" +
      B + " .ssm-filter{border:0;background:var(--so);color:var(--tx);padding:7px 12px;border-radius:20px;font-size:12.5px;font-weight:600;white-space:nowrap;flex:none}" +
      B + " .ssm-filter.active{background:var(--bn);color:var(--bt,#fff);font-weight:800}" +
      B + " .ssm-b{display:inline-block;min-width:16px;padding:1px 5px;margin-left:5px;border-radius:10px;background:#ff2d8a;color:#fff;font-size:10.5px;font-weight:800;text-align:center}" +
      B + " .ssm-b:empty{display:none}" +
      B + " .ssm-empty{display:none;text-align:center;color:var(--mu);font-size:14px;padding:22px 0 4px}" +
      B + " #ssm-slot .sb2{padding:0 0 8px}" +
      B + " #ssm-slot #sres:empty{display:none}" +
      ".ssm-row{display:flex;align-items:center;gap:12px;padding:9px 14px;border-bottom:1px solid var(--ln);cursor:pointer;color:var(--tx)}" +
      ".ssm-row:active{background:var(--so)}" +
      ".ssm-av{position:relative;flex:none;width:48px;height:48px}" +
      ".ssm-av .av{width:48px;height:48px;font-size:17px;border-radius:50%;overflow:hidden}" +
      ".ssm-av .av img,.ssm-av img{width:100%;height:100%;object-fit:cover;border-radius:50%}" +
      ".ssm-on{position:absolute;right:0;bottom:2px;width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid var(--bg)}" +
      ".ssm-mid{flex:1;min-width:0}" +
      ".ssm-mid b{display:block;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ssm-mid small{display:block;margin-top:2px;font-size:13px;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".ssm-rt{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px;font-size:11.5px;color:var(--mu);min-width:48px}" +
      ".ssm-rt em{font-style:normal;min-width:20px;height:20px;border-radius:10px;background:#ff2d8a;color:#fff;font-weight:800;font-size:11.5px;display:flex;align-items:center;justify-content:center;padding:0 7px;box-sizing:border-box}" +
      "textarea#mi{resize:none;display:block;box-sizing:border-box;max-height:60vh;overflow-y:auto;line-height:1.35;padding:10px 13px;min-height:44px}" +
      "#app .crow{align-items:flex-end}" +
      ".mb{white-space:pre-wrap}" +
      "#ssm-opt{background:none;border:0;color:var(--tx);font-size:24px;padding:0 8px;line-height:1}" +
      "#ssm-sheet{position:fixed;inset:0;z-index:9999;background:#0007;display:flex;align-items:flex-end}" +
      "#ssm-sheet .p{width:100%;max-height:80%;overflow-y:auto;background:var(--bg);color:var(--tx);border-radius:20px 20px 0 0;padding:8px 16px 22px}" +
      "#ssm-sheet .t{text-align:center;font-weight:700;padding:14px 0 8px}" +
      "#ssm-sheet button.k{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--ln);color:var(--tx);font:inherit;padding:15px 4px}" +
      "#ssm-sheet button.k.d{color:#ff2d8a}" +
      "#ssm-sheet .g{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}#ssm-sheet .g img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px}";
    document.head.appendChild(s);
  }

  /* ---------- toolbar ---------- */
  function makeToolbar() {
    var bar = document.createElement("section");
    bar.id = BAR_ID;
    var pf = typeof prof !== "undefined" && prof ? prof : {};
    bar.innerHTML =
      '<div class="ssm-top"><div class="ssm-me" id="ssm-me"><div class="ssm-av" style="width:36px;height:36px">' + avHtml(pf.avatar_url, pf.full_name) + '</div></div><span class="ssm-logo">SkillShow</span>' +
      '<button class="ssm-ic" type="button" id="ssm-find" aria-label="Search">' + SRCH + '</button><button class="ssm-ic" type="button" id="ssm-new" aria-label="New message">' + NEWM + "</button></div>" +
      '<div id="ssm-slot"></div>' +
      '<div class="ssm-title"><h1>Messages</h1><button class="ssm-arch" type="button" data-ssm-filter="archived">Archived</button></div>' +
      '<div class="ssm-sw" id="ssm-sw">' + SRCH + '<input class="ssm-search" id="ssm-search" type="search" placeholder="Search conversations" aria-label="Search conversations"></div>' +
      '<div class="ssm-filters">' +
      '<button class="ssm-filter active" type="button" data-ssm-filter="all">All</button>' +
      '<button class="ssm-filter" type="button" data-ssm-filter="unread">Unread<span class="ssm-b" data-b="unread"></span></button>' +
      '<button class="ssm-filter" type="button" data-ssm-filter="groups">Groups</button>' +
      '<button class="ssm-filter" type="button" data-ssm-filter="requests">Requests<span class="ssm-b" data-b="requests"></span></button>' +
      '</div><div id="ssm-groups"></div><div class="ssm-empty" id="ssm-empty"></div>';

    bar.addEventListener("input", function (e) {
      if (e.target.id === "ssm-search") { query = e.target.value.toLowerCase().trim(); applyFilters(); }
    });
    bar.addEventListener("click", function (e) {
      if (e.target.closest("#ssm-me")) { if (typeof openUser === "function" && ready()) openUser(me.id); return; }
      if (e.target.closest("#ssm-find")) {
        var sw = bar.querySelector(".ssm-sw"), inp = $id("ssm-search");
        var opening = !sw.classList.contains("open");
        sw.classList.toggle("open", opening);
        if (opening) inp.focus(); else { inp.value = ""; query = ""; applyFilters(); }
        return;
      }
      if (e.target.closest("#ssm-new")) {
        var box = document.querySelector("#app .sb2"), res = $id("sres"), slot = $id("ssm-slot");
        if (box) {
          if (!slot.contains(box)) { slot.appendChild(box); if (res) slot.appendChild(res); }
          var open = box.style.display === "block";
          box.style.display = open ? "none" : "block";
          var q = $id("sq");
          if (!open && q) q.focus(); else if (res) res.innerHTML = "";
        }
        return;
      }
      var btn = e.target.closest("[data-ssm-filter]");
      if (!btn) return;
      var prev = filter;
      filter = (btn.dataset.ssmFilter === "archived" && prev === "archived") ? "all" : btn.dataset.ssmFilter;
      bar.querySelectorAll("[data-ssm-filter]").forEach(function (b) { b.classList.toggle("active", b.dataset.ssmFilter === filter); });
      if ((prev === "archived") !== (filter === "archived")) redrawInbox();
      if (filter === "groups") showGroups();
      applyFilters();
    });
    return bar;
  }

  function groupRow(g, l) {
    var col = typeof CC !== "undefined" ? CC[g.id % 5] : "#5B1424";
    var img = g.avatar_url || g.image_url || g.icon_url || g.photo_url || g.cover_url || "";
    var txt = l ? (l.body || l.content || l.text || l.message || (l.image_url ? "Photo" : "")) : "";
    var uid = l ? (l.user_id || l.sender_id) : null, who = "";
    if (l && uid == me.id) who = "You: ";
    else if (l && typeof pmap !== "undefined" && pmap[uid]) who = esc((pmap[uid].full_name || "").split(" ")[0]) + ": ";
    return '<div class="ssm-row" onclick="openCommunity(' + Number(g.id) + ')"><div class="ssm-av">' + avHtml(img, g.name, img ? "" : col) +
      '</div><div class="ssm-mid"><b>' + esc(g.name) + "</b><small>" + (txt ? who + esc(txt) : esc(g.description || "Community")) + '</small></div><div class="ssm-rt"><span>' +
      (l ? tfmt(l.created_at) : "") + "</span>" + GRP + "</div></div>";
  }
  function showGroups() {
    var box = $id("ssm-groups");
    if (!box || !ready()) return;
    box.innerHTML = '<div class="ssm-empty" style="display:block">Loading…</div>';
    sb.from("community_members").select("community_id,communities(*)").eq("user_id", me.id).then(function (r) {
      var gs = (r.data || []).map(function (x) { return x.communities; }).filter(Boolean);
      if (!gs.length) { box.innerHTML = '<div class="ssm-empty" style="display:block">You haven\'t joined any communities yet</div>'; return; }
      sb.from("community_messages").select("*").in("community_id", gs.map(function (g) { return g.id; })).order("created_at", { ascending: false }).limit(300).then(function (m) {
        var last = {};
        (m.data || []).forEach(function (x) { if (!last[x.community_id]) last[x.community_id] = x; });
        gs.sort(function (a, b) { return new Date((last[b.id] || {}).created_at || 0) - new Date((last[a.id] || {}).created_at || 0); });
        box.innerHTML = gs.map(function (g) { return groupRow(g, last[g.id]); }).join("");
        applyFilters();
      });
    });
  }

  function convOf(row) {
    var m = /openChat\('([^']+)'\)/.exec(row.getAttribute("onclick") || "");
    if (!m) return null;
    for (var i = 0; i < viewConvs.length; i++) if (String(viewConvs[i].o) === m[1]) return viewConvs[i];
    return null;
  }
  function isRequest(c) {
    return !!(repReady && c && c.last && ready() && c.last.sender_id != me.id && !replied.has(String(c.o)));
  }
  function loadReplied() {
    if (typeof convs === "undefined" || !ready()) return;
    var ids = convs.map(function (c) { return String(c.o); }), key = ids.join(",");
    if (!ids.length || key === repKey) return;
    repKey = key;
    sb.from("messages").select("receiver_id").eq("sender_id", me.id).in("receiver_id", ids).then(function (r) {
      if (r.error) return;
      replied = new Set((r.data || []).map(function (x) { return String(x.receiver_id); }));
      repReady = true; applyFilters();
    });
  }

  function applyFilters() {
    var list = $id("clistm"), bar = $id(BAR_ID);
    if (!list || !bar) return;
    var shown = 0, unreadN = 0, reqN = 0;
    Array.prototype.forEach.call(list.querySelectorAll(":scope > .ssm-row"), function (row) {
      var c = convOf(row), unread = !!(c && c.unread > 0), req = isRequest(c);
      if (unread) unreadN++;
      if (req) reqN++;
      var okSearch = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
      var okTab = filter === "all" || filter === "archived" || (filter === "unread" && unread) || (filter === "requests" && req);
      var show = okSearch && okTab && filter !== "groups";
      row.style.display = show ? "" : "none";
      if (show) shown++;
    });
    var gshown = 0;
    Array.prototype.forEach.call(bar.querySelectorAll("#ssm-groups .ssm-row"), function (row) {
      var show = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
      row.style.display = show ? "" : "none";
      if (show) gshown++;
    });
    bar.querySelector('[data-b="unread"]').textContent = unreadN || "";
    bar.querySelector('[data-b="requests"]').textContent = reqN || "";
    $id("ssm-groups").style.display = filter === "groups" ? "block" : "none";
    list.style.display = filter === "groups" ? "none" : "";

    var msg = "";
    if (filter === "groups") { if (query && !gshown && bar.querySelector("#ssm-groups .ssm-row")) msg = "No groups match your search"; }
    else if (viewConvs.length && !shown) {
      msg = query ? "No chats match your search" : filter === "unread" ? "You're all caught up" : filter === "requests" ? "No message requests" : "";
    }
    var empty = $id("ssm-empty");
    empty.textContent = msg; empty.style.display = msg ? "block" : "none";
  }

  /* ---------- chat options panel ---------- */
  function fixHeader() {
    var h = $id("chh");
    if (!h || h.dataset.ssm) return;
    h.dataset.ssm = "1"; h.style.cursor = "pointer";
    h.addEventListener("click", function (e) {
      e.stopPropagation();
      if (typeof openUser === "function" && typeof chat !== "undefined") openUser(chat);
    });
  }
  function grow(t) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, Math.round(window.innerHeight * 0.6)) + "px"; }
  /* WhatsApp-style box: Enter makes a new line, the round button sends */
  function fixInput() {
    var old = $id("mi");
    if (!old || old.tagName !== "INPUT") return;
    var ta = document.createElement("textarea");
    ta.id = "mi"; ta.className = old.className; ta.rows = 1;
    ta.maxLength = old.maxLength > 0 ? old.maxLength : 2000;
    ta.placeholder = old.placeholder; ta.value = old.value;
    ta.setAttribute("enterkeyhint", "enter");
    var oi = old.getAttribute("oninput");
    if (oi) ta.setAttribute("oninput", oi);
    ta.addEventListener("input", function () { grow(ta); });
    var had = document.activeElement === old;
    old.parentNode.replaceChild(ta, old);
    grow(ta);
    if (had) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  function injectOpt() {
    var hd = document.querySelector("#app .hd");
    if (!hd || hd.querySelector("#ssm-opt")) return;
    hd.style.display = "flex"; hd.style.alignItems = "center"; hd.style.justifyContent = "space-between";
    var b = document.createElement("button");
    b.id = "ssm-opt"; b.type = "button"; b.textContent = "⋮"; b.setAttribute("aria-label", "Chat options");
    b.onclick = openSheet;
    hd.appendChild(b);
  }
  function closeSheet() { var s = $id("ssm-sheet"); if (s) s.remove(); }
  function sheet(title, html) {
    closeSheet();
    var s = document.createElement("div");
    s.id = "ssm-sheet";
    s.innerHTML = '<div class="p"><div class="t">' + esc(title) + "</div>" + html + "</div>";
    s.addEventListener("click", function (e) {
      if (e.target === s) return closeSheet();
      var k = e.target.closest("[data-k]");
      if (k) act(k.dataset.k);
    });
    document.body.appendChild(s);
  }
  function openSheet() {
    var id = chat, p = P(id), u = (typeof pmap !== "undefined" && pmap[id]) || { full_name: "User" };
    var it = [["profile", "👤 View profile"], ["search", "🔎 Search in conversation"], ["media", "🖼 Media & photos"],
      ["mute", "🔕 " + (p.muted ? "Unmute notifications" : "Mute notifications")],
      ["fav", "⭐ " + (p.favorite ? "Remove from favorites" : "Add to favorites")],
      ["unread", "✉️ Mark as unread"], ["arch", "🗄 " + (p.archived ? "Unarchive" : "Archive")],
      ["del", "🗑 Delete chat"], ["block", "🚫 " + (p.blocked ? "Unblock" : "Block"), 1]];
    sheet(u.full_name, it.map(function (x) { return '<button class="k' + (x[2] ? " d" : "") + '" data-k="' + x[0] + '">' + x[1] + "</button>"; }).join(""));
  }
  function toInbox() { closeSheet(); tab = "msgs"; draw(); }

  function act(k) {
    var id = chat, p = P(id);
    if (k === "profile") { closeSheet(); return openUser(id); }
    if (k === "search") {
      closeSheet();
      var q = (prompt("Search this conversation") || "").toLowerCase().trim();
      if (!q) return;
      var hit = msgs.filter(function (m) { return m.body && m.body.toLowerCase().indexOf(q) !== -1; });
      if (!hit.length) return toast("No messages found");
      toast(hit.length + " found, showing the latest");
      return jumpTo(hit[hit.length - 1].id);
    }
    if (k === "media") {
      var imgs = msgs.filter(function (m) { return m.image_url && urlCache[m.image_url]; });
      return sheet("Media & photos", imgs.length ? '<div class="g">' + imgs.map(function (m) {
        return '<img src="' + esc(urlCache[m.image_url]) + '" alt="" onclick="closeSheet2();openImg(\'' + esc(m.image_url) + "')\">";
      }).join("") + "</div>" : '<p style="text-align:center;color:var(--mu)">No photos in this chat yet</p>');
    }
    if (k === "mute") { setPref(id, { muted: !p.muted }); toast(p.muted ? "Notifications on" : "Chat muted"); return closeSheet(); }
    if (k === "fav") { setPref(id, { favorite: !p.favorite }); toast(p.favorite ? "Removed from favorites" : "Added to favorites"); return closeSheet(); }
    if (k === "unread") { setPref(id, { manual_unread: true }); return toInbox(); }
    if (k === "arch") { setPref(id, { archived: !p.archived }); toast(p.archived ? "Unarchived" : "Chat archived"); return toInbox(); }
    if (k === "del") { if (!confirm("Delete this chat from your inbox? It comes back if they message you again.")) return; setPref(id, { cleared_at: new Date().toISOString() }); return toInbox(); }
    if (k === "block") {
      if (!p.blocked && !confirm("Block this person? They will not be able to message you.")) return;
      setPref(id, { blocked: !p.blocked }); toast(p.blocked ? "Unblocked" : "Blocked"); return p.blocked ? closeSheet() : toInbox();
    }
  }
  window.closeSheet2 = closeSheet;

  /* ---------- wiring ---------- */
  function barPlaced(bar, list) {
    return !!(bar && bar.parentNode === list.parentNode && (bar.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING));
  }
  function enhanceInbox() {
    var list = $id("clistm");
    if (!list) return;
    addStyles();
    var bar = $id(BAR_ID);
    var old = document.querySelector("#app .sb2");
    if (old && old.querySelector("#sq") && !old.dataset.ssm) { old.dataset.ssm = "1"; old.style.display = "none"; }
    var hd = document.querySelector("#app > .hd");
    if (hd && !hd.dataset.ssm) { hd.dataset.ssm = "1"; hd.style.display = "none"; }
    if (!barPlaced(bar, list)) {
      if (bar) bar.remove();
      bar = makeToolbar();
      var anchor = old && old.parentNode === list.parentNode && !bar.contains(old) ? old : list;
      anchor.parentNode.insertBefore(bar, anchor);
    }
    if (currentList !== list) {
      if (listObserver) listObserver.disconnect();
      currentList = list;
      listObserver = new MutationObserver(function () { loadReplied(); applyFilters(); });
      listObserver.observe(list, { childList: true, subtree: true });
    }
    loadReplied(); applyFilters();
  }

  function tick() {
    hook(); loadPrefs();
    if (T() === "chat") { addStyles(); injectOpt(); fixInput(); fixHeader(); }
  }

  function start() {
    tick(); enhanceInbox();
    var timer = null;
    new MutationObserver(function () {
      tick();
      var live = $id("clistm");
      if (!live || (live === currentList && barPlaced($id(BAR_ID), live))) return;
      clearTimeout(timer);
      timer = setTimeout(enhanceInbox, 150);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
