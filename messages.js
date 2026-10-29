/* SkillShow Messages — full upgrade (replaces old messages.js)
   Adds on top of index.html: All/Unread/Groups/Requests tabs, Archived view, number badges,
   and a chat options panel (⋮): profile, search, media, mute, favorite, unread, archive, delete, block.
   Needs the chat_prefs table (see chat_prefs.sql). */
(function () {
  "use strict";
  var STYLE_ID = "ss-messages-enhancement", BAR_ID = "ss-messages-toolbar";
  var query = "", filter = "all", listObserver = null, currentList = null;
  var replied = new Set(), repReady = false, repKey = "";
  var prefs = new Map(), prefsFor = null;

  var T = function () { return typeof tab !== "undefined" ? tab : ""; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var P = function (id) { return prefs.get(String(id)) || {}; };
  var ready = function () { return typeof sb !== "undefined" && typeof me !== "undefined" && me; };

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

  /* wrap index.html's drawConvs / openChat so settings apply */
  function hook() {
    if (window.__ssmHooked || typeof drawConvs !== "function" || typeof openChat !== "function") return;
    window.__ssmHooked = true;
    var od = window.drawConvs, oc = window.openChat;
    window.drawConvs = function () {
      var all = convs;
      try {
        convs = all.filter(visible).map(function (c) { if (P(c.o).manual_unread && !c.unread) c.unread = 1; return c; });
        convs.sort(function (a, b) { return (P(b.o).favorite ? 1 : 0) - (P(a.o).favorite ? 1 : 0); });
        return od.apply(this, arguments);
      } finally { convs = all; }
    };
    window.openChat = function (id) {
      if (P(id).manual_unread) setPref(id, { manual_unread: false });
      return oc.apply(this, arguments);
    };
  }
  window.SSM = { isMuted: function (id) { return !!P(id).muted; } };

  /* ---------- styles ---------- */
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var B = "#" + BAR_ID, s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent =
      B + "{padding:10px 14px 14px;background:var(--bg)}" +
      B + " .ssm-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}" +
      B + " .ssm-heading strong{font-size:20px;color:var(--tx)}" +
      B + " .ssm-count{font-size:12px;color:var(--mu);margin-right:10px}" +
      B + " .ssm-arch{background:none;border:0;color:var(--mu);font-size:13px;font-weight:650;padding:4px 2px}" +
      B + " .ssm-arch.active{color:var(--ac)}" +
      B + " .ssm-search{width:100%;box-sizing:border-box;padding:13px 16px;border-radius:24px;border:1px solid var(--ln);background:var(--so);color:var(--tx);font:inherit;outline:none;margin-bottom:12px}" +
      B + " .ssm-search:focus{border-color:var(--ac)}" +
      B + " .ssm-filters{display:flex;gap:9px;overflow-x:auto}" +
      B + " .ssm-filter{border:1px solid var(--ln);background:var(--so);color:var(--mu);padding:9px 17px;border-radius:22px;font-size:13px;font-weight:650;white-space:nowrap}" +
      B + " .ssm-filter.active{background:var(--bn);color:var(--bt,#fff);border-color:var(--bn)}" +
      B + " .ssm-b{display:inline-block;min-width:18px;padding:1px 6px;margin-left:6px;border-radius:10px;background:#ff2d8a;color:#fff;font-size:11px;font-weight:700}" +
      B + " .ssm-b:empty{display:none}" +
      B + " .ssm-empty{display:none;text-align:center;color:var(--mu);font-size:14px;padding:22px 0 4px}" +
      B + " #ssm-groups{display:none;margin-top:6px}" +
      B + " .ssm-g{display:flex;align-items:center;gap:11px;padding:12px 2px;border-bottom:1px solid var(--ln);color:var(--tx)}" +
      B + " .ssm-g i{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-style:normal;font-weight:700}" +
      B + " .ssm-g small{display:block;color:var(--mu)}" +
      "#clistm .lr{padding:15px 14px;gap:11px;transition:background .15s ease}" +
      "#clistm .lr:active{background:var(--so)}" +
      "#clistm .lr .av{width:48px;height:48px;font-size:17px}" +
      "#clistm .lr b{font-size:14px}" +
      "#clistm .lr small{display:block;margin-top:5px;line-height:1.4}" +
      "#clistm .lr[data-fav] b::before{content:'⭐ '}" +
      "#clistm .lr[data-mute] b::after{content:' 🔕'}" +
      "#clistm .lr .dt[data-n]{width:auto;min-width:20px;height:20px;border-radius:10px;background:#ff2d8a;color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 6px}" +
      "#clistm .lr .dt[data-n]::after{content:attr(data-n)}" +
      "#ssm-opt{background:none;border:0;color:var(--tx);font-size:24px;padding:0 8px;line-height:1}" +
      "#ssm-sheet{position:fixed;inset:0;z-index:9999;background:#0007;display:flex;align-items:flex-end}" +
      "#ssm-sheet .p{width:100%;max-height:80%;overflow-y:auto;background:var(--bg);color:var(--tx);border-radius:20px 20px 0 0;padding:8px 16px 22px}" +
      "#ssm-sheet .t{text-align:center;font-weight:700;padding:14px 0 8px}" +
      "#ssm-sheet button.k{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--ln);color:var(--tx);font:inherit;padding:15px 4px}" +
      "#ssm-sheet button.k.d{color:#ff2d8a}" +
      "#ssm-sheet .g{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}#ssm-sheet .g img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px}" +
      "@media (prefers-reduced-motion:reduce){#clistm .lr{transition:none}}";
    document.head.appendChild(s);
  }

  /* ---------- inbox toolbar ---------- */
  function makeToolbar() {
    var bar = document.createElement("section");
    bar.id = BAR_ID;
    bar.innerHTML =
      '<div class="ssm-heading"><strong>Messages</strong><span><span class="ssm-count" id="ssm-count">Chats</span><button class="ssm-arch" type="button" data-ssm-filter="archived">Archived</button></span></div>' +
      '<input class="ssm-search" id="ssm-search" type="search" placeholder="Search conversations" aria-label="Search conversations">' +
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

  function showGroups() {
    var box = document.getElementById("ssm-groups");
    if (!box || !ready()) return;
    box.innerHTML = '<div class="ssm-empty" style="display:block">Loading…</div>';
    sb.from("community_members").select("community_id,communities(id,name,description)").eq("user_id", me.id).then(function (r) {
      var list = (r.data || []).map(function (x) { return x.communities; }).filter(Boolean);
      box.innerHTML = list.length ? list.map(function (g) {
        var col = typeof CC !== "undefined" ? CC[g.id % 5] : "#5B1424";
        return '<div class="ssm-g" onclick="openCommunity(' + Number(g.id) + ')"><i style="background:' + col + '">' + esc((g.name || "?")[0].toUpperCase()) + '</i><div><b>' + esc(g.name) + '</b><small>' + esc(g.description || "Community") + '</small></div></div>';
      }).join("") : '<div class="ssm-empty" style="display:block">You haven\'t joined any communities yet</div>';
    });
  }

  function convOf(row) {
    var m = /openChat\('([^']+)'\)/.exec(row.getAttribute("onclick") || "");
    if (!m || typeof convs === "undefined") return null;
    for (var i = 0; i < convs.length; i++) if (String(convs[i].o) === m[1]) return convs[i];
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
    var list = document.getElementById("clistm"), bar = document.getElementById(BAR_ID);
    if (!list || !bar) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll(":scope > .lr"));
    var shown = 0, unreadN = 0, reqN = 0;

    rows.forEach(function (row) {
      var c = convOf(row), p = c ? P(c.o) : {};
      var unread = !!(c && c.unread > 0), req = isRequest(c);
      if (unread) unreadN++;
      if (req) reqN++;
      if (p.favorite) row.dataset.fav = "1"; else delete row.dataset.fav;
      if (p.muted) row.dataset.mute = "1"; else delete row.dataset.mute;
      var dt = row.querySelector(".dt");
      if (dt) { if (unread) dt.dataset.n = c.unread > 9 ? "9+" : String(c.unread); else delete dt.dataset.n; }

      var okSearch = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
      var okTab = filter === "all" || filter === "archived" || (filter === "unread" && unread) || (filter === "requests" && req);
      var show = okSearch && okTab && filter !== "groups";
      row.style.display = show ? "" : "none";
      if (show) shown++;
    });

    bar.querySelector('[data-b="unread"]').textContent = unreadN || "";
    bar.querySelector('[data-b="requests"]').textContent = reqN || "";
    document.getElementById("ssm-count").textContent = filter === "groups" ? "" : shown + (shown === 1 ? " chat" : " chats");
    document.getElementById("ssm-groups").style.display = filter === "groups" ? "block" : "none";

    var msg = "";
    if (filter !== "groups" && !shown) {
      msg = query ? "No chats match your search" : filter === "unread" ? "You're all caught up" :
        filter === "requests" ? "No message requests" : filter === "archived" ? "No archived chats" : "";
    }
    var empty = document.getElementById("ssm-empty");
    empty.textContent = msg; empty.style.display = msg ? "block" : "none";
  }

  /* ---------- chat options panel ---------- */
  function injectOpt() {
    var hd = document.querySelector("#app .hd");
    if (!hd || hd.querySelector("#ssm-opt")) return;
    hd.style.display = "flex"; hd.style.alignItems = "center"; hd.style.justifyContent = "space-between";
    var b = document.createElement("button");
    b.id = "ssm-opt"; b.type = "button"; b.textContent = "⋮"; b.setAttribute("aria-label", "Chat options");
    b.onclick = openSheet;
    hd.appendChild(b);
  }
  function closeSheet() { var s = document.getElementById("ssm-sheet"); if (s) s.remove(); }
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
  function enhanceInbox() {
    var list = document.getElementById("clistm");
    if (!list) return;
    addStyles();
    var bar = document.getElementById(BAR_ID);
    if (!bar || bar.nextElementSibling !== list) {
      if (bar) bar.remove();
      bar = makeToolbar();
      list.parentNode.insertBefore(bar, list);
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
    if (T() === "chat") { addStyles(); injectOpt(); }
  }

  function start() {
    tick(); enhanceInbox();
    var timer = null;
    new MutationObserver(function () {
      tick();
      var live = document.getElementById("clistm"), bar = document.getElementById(BAR_ID);
      if (!live || (live === currentList && bar && bar.nextElementSibling === live)) return;
      clearTimeout(timer);
      timer = setTimeout(enhanceInbox, 150);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
