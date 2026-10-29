/* SkillShow phone notifications (client side)
   Add to index.html (last script line):  <script src="push.js?v=1"></script>
   1) Paste your VAPID PUBLIC key below.  2) Needs push_setup.sql + send-push function. */
(function () {
  "use strict";
  var VAPID_PUBLIC = "BIsqmU12Lergyw3hs1mo46P9htu68-ysC9QuV8gDMTfidSClVtX0_21VmQC4sg4NMsXHiLSkrqt0UQNRhEnGTuQ";
  var ASK = "ss_push_asked";

  var supported = function () { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; };
  var ready = function () { return typeof sb !== "undefined" && typeof me !== "undefined" && me && typeof step !== "undefined" && step === "app"; };
  var say = function (t) { if (typeof toast === "function") toast(t); };

  function key(u) {
    var pad = "=".repeat((4 - (u.length % 4)) % 4), raw = atob((u + pad).replace(/-/g, "+").replace(/_/g, "/")), a = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  }

  async function subscribe() {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID_PUBLIC) });
    var j = sub.toJSON();
    var r = await sb.rpc("save_push", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
    return !r.error;
  }

  async function enable() {
    if (!supported()) { say("This phone or browser can't show notifications"); return false; }
    if (Notification.permission === "denied") { say("Notifications are blocked. Turn them on in your browser settings."); return false; }
    var perm = Notification.permission;
    if (perm !== "granted") perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    try {
      var ok = await subscribe();
      say(ok ? "Notifications are on 🔔" : "Could not turn on notifications");
      return ok;
    } catch (e) { say("Could not turn on notifications"); return false; }
  }

  /* friendly one-time ask */
  function prompt() {
    if (document.getElementById("ss-pushask")) return;
    var d = document.createElement("div");
    d.id = "ss-pushask";
    d.style.cssText = "position:fixed;left:12px;right:12px;bottom:84px;z-index:9998;background:var(--bg,#0a1a3a);color:var(--tx,#fff);border:1px solid var(--ln,#1D2E45);border-radius:18px;padding:14px;box-shadow:0 10px 40px #0009;font-family:inherit";
    d.innerHTML = '<div style="font-weight:800;font-size:16px;margin-bottom:4px">Never miss a thing 🔔</div>' +
      '<div style="font-size:14px;line-height:1.4;color:var(--mu,#93A3B8);margin-bottom:12px">Get a buzz when someone messages you, likes your post, comments or follows you.</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end"><button data-n style="background:none;border:0;color:var(--mu,#93A3B8);font:inherit;font-weight:700;padding:9px 12px">Not now</button>' +
      '<button data-y style="background:var(--ac,#C8963E);color:#1E1403;border:0;border-radius:20px;font:inherit;font-weight:800;padding:9px 20px">Turn on</button></div>';
    d.querySelector("[data-n]").onclick = function () { try { localStorage.setItem(ASK, String(Date.now())); } catch (e) {} d.remove(); };
    d.querySelector("[data-y]").onclick = function () { d.remove(); enable(); };
    document.body.appendChild(d);
  }

  /* open the right screen when a notification is tapped */
  function route(go) {
    if (!go) return;
    var i = go.indexOf(":"), k = i < 0 ? go : go.slice(0, i), v = i < 0 ? "" : go.slice(i + 1);
    if (k === "chat" && typeof openChat === "function") return openChat(v);
    if (k === "post" && typeof npPost === "function") return npPost(v);
    if (k === "user" && typeof openUser === "function") return openUser(v);
    if (k === "msgs") { tab = "msgs"; draw(); return; }
    if (k === "notif") { tab = "notif"; draw(); }
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", function (e) {
      if (e.data && e.data.type === "ss-open") route(e.data.go);
    });
  }

  var n = 0, t = setInterval(function () {
    if (++n > 120) return clearInterval(t);
    if (!ready() || !supported()) return;
    clearInterval(t);
    var m = /[?&]go=([^&]+)/.exec(location.search);
    if (m) { route(decodeURIComponent(m[1])); history.replaceState(null, "", location.pathname); }
    if (Notification.permission === "granted") { subscribe().catch(function () {}); return; }
    if (Notification.permission !== "default") return;
    var last = 0; try { last = Number(localStorage.getItem(ASK) || 0); } catch (e) {}
    if (Date.now() - last > 3 * 864e5) setTimeout(prompt, 20000);
  }, 1000);

  window.SkillPush = { enable: enable };
})();
