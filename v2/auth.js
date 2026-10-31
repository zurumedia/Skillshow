/* Skillshow login and sign-up (v2). Same flow as the live app:
   new people: email, 6-digit code, choose password, set up profile. Returning people: email + password. */
(function () {
  "use strict";
  var SS = window.SS, $ = SS.$, esc = SS.esc, sb = SS.sb;
  var mode = "login", step = "welcome", em = "", busy = false, wait = 0, tp = { name: "", user: "", headline: "" };

  function lock(b) { busy = b; document.querySelectorAll(".auth button").forEach(function (x) { x.disabled = b; }); }
  function nice(e) { var m = (e && e.message) || "Something went wrong"; return /rate|seconds/i.test(m) ? "Please wait a little before trying again" : m; }
  function draw(html) { $("#app").innerHTML = '<div class="auth">' + html + "</div>"; var f = $(".auth input"); if (f) f.focus(); }
  function bind(map) { Object.keys(map).forEach(function (k) { var el = $("#" + k); if (el) el.onclick = map[k]; }); }
  function field(id, label, type, ph, val, extra) {
    return '<label class="f"><span>' + label + '</span><input class="inp" id="' + id + '" type="' + type + '" placeholder="' + (ph || "") + '" value="' + esc(val || "") + '" ' + (extra || "") + "></label>";
  }
  function enterKey(fn) { document.querySelectorAll(".auth input").forEach(function (i) { i.onkeydown = function (e) { if (e.key === "Enter") fn(); }; }); }

  /* ---------- screens ---------- */
  function welcome() {
    step = "welcome";
    draw('<div class="big">Skillshow<i>.</i></div><p class="muted">Show your skills. Connect. Get hired.</p>' +
      '<div class="stack"><button class="btn block" id="li">Log in</button><button class="btn line block" id="su">Create an account</button></div>');
    bind({ li: function () { mode = "login"; login(); }, su: function () { mode = "signup"; email(); } });
  }
  function login() {
    step = "login";
    draw('<h1>Welcome back</h1><p class="muted">Log in with your email and password.</p>' +
      field("em", "Email address", "email", "you@email.com", em, 'autocomplete="email"') +
      field("pw", "Password", "password", "Your password", "", 'autocomplete="current-password"') +
      '<div class="stack"><button class="btn block" id="go">Log in</button><button class="link" id="fg" style="display:block;margin:12px auto 0">Forgot password?</button>' +
      '<button class="link" id="nw" style="display:block;margin:6px auto 0">New here? Create an account</button></div>');
    bind({ go: doLogin, fg: function () { em = $("#em").value.trim(); mode = "forgot"; email(); }, nw: function () { em = $("#em").value.trim(); mode = "signup"; email(); } });
    enterKey(doLogin);
  }
  function email() {
    step = "email";
    var t = mode === "forgot" ? "Reset your password" : "Create your account";
    draw("<h1>" + t + '</h1><p class="muted">We will email you a code to confirm it is you.</p>' +
      field("em", "Email address", "email", "you@email.com", em, 'autocomplete="email"') +
      '<div class="stack"><button class="btn block" id="go">Send code</button><button class="link" id="bk" style="display:block;margin:12px auto 0">Back</button></div>');
    bind({ go: function () { sendCode(false); }, bk: welcome });
    enterKey(function () { sendCode(false); });
  }
  function verify() {
    step = "verify";
    draw("<h1>Enter your code</h1><p class=\"muted\">We sent a code to " + esc(em) + ".</p>" +
      field("cd", "Code", "text", "123456", "", 'inputmode="numeric" autocomplete="one-time-code" maxlength="8"') +
      '<div class="stack"><button class="btn block" id="go">Continue</button><button class="link" id="rs" style="display:block;margin:12px auto 0">Send a new code</button></div>');
    bind({ go: doVerify, rs: function () { sendCode(true); } });
    enterKey(doVerify);
  }
  function setPassword() {
    step = "pw";
    draw("<h1>Choose a password</h1><p class=\"muted\">At least 8 characters. You will use it to log in next time.</p>" +
      field("p1", "Password", "password", "New password", "", 'autocomplete="new-password"') +
      field("p2", "Confirm password", "password", "Type it again", "", 'autocomplete="new-password"') +
      '<button class="btn block" id="go">Save password</button>');
    bind({ go: doSetPw });
    enterKey(doSetPw);
  }
  function setup() {
    step = "setup";
    draw("<h1>Set up your profile</h1><p class=\"muted\">This is how people will find you. You can add a photo and more later.</p>" +
      field("nm", "Your name", "text", "Ada Obi", tp.name, 'maxlength="60"') +
      field("un", "Username", "text", "ada.obi", tp.user, 'maxlength="20" autocapitalize="none" autocomplete="off"') +
      field("hl", "What do you do? (optional)", "text", "Graphic designer", tp.headline, 'maxlength="80"') +
      '<button class="btn block" id="go">Finish</button>');
    bind({ go: doSave });
    enterKey(doSave);
  }

  /* ---------- actions ---------- */
  async function doLogin() {
    if (busy) return;
    var e = $("#em").value.trim().toLowerCase(), p = $("#pw").value;
    if (!e || !p) return SS.toast("Enter your email and password");
    lock(true);
    var r = await sb.auth.signInWithPassword({ email: e, password: p });
    lock(false);
    if (r.error) return SS.toast(/invalid/i.test(r.error.message) ? "Wrong email or password" : nice(r.error));
    em = e; SS.me = r.data.user; enter();
  }
  async function sendCode(resend) {
    if (busy) return;
    var e = resend ? em : $("#em").value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return SS.toast("Enter a valid email");
    if (resend && Date.now() < wait) return SS.toast("Please wait a few seconds before resending");
    lock(true);
    var r = await sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: mode !== "forgot" } });
    lock(false);
    if (r.error) return SS.toast(nice(r.error));
    em = e; wait = Date.now() + 30000;
    if (resend) SS.toast("New code sent"); else verify();
  }
  async function doVerify() {
    if (busy) return;
    var t = $("#cd").value.replace(/\s/g, "");
    if (t.length < 6) return SS.toast("Enter the code from your email");
    lock(true);
    var r = await sb.auth.verifyOtp({ email: em, token: t, type: "email" });
    lock(false);
    if (r.error) return SS.toast(/expired|invalid/i.test(r.error.message) ? "That code is wrong or has expired" : nice(r.error));
    SS.me = r.data.user; setPassword();
  }
  async function doSetPw() {
    if (busy) return;
    var a = $("#p1").value, b = $("#p2").value;
    if (a.length < 8) return SS.toast("Password must be at least 8 characters");
    if (a !== b) return SS.toast("Passwords do not match");
    lock(true);
    var r = await sb.auth.updateUser({ password: a });
    lock(false);
    if (r.error) return SS.toast(r.error.message);
    SS.toast("Password saved"); enter();
  }
  async function doSave() {
    if (busy) return;
    var n = $("#nm").value.trim(), u = $("#un").value.trim().toLowerCase(), h = $("#hl").value.trim().slice(0, 80);
    tp = { name: n, user: u, headline: h };
    if (!n) return SS.toast("Enter your name");
    if (!/^[a-z0-9._]{3,20}$/.test(u)) return SS.toast("Username: 3 to 20 letters, numbers, . or _");
    lock(true);
    var r = await sb.from("profiles").upsert({ id: SS.me.id, username: u, full_name: n, headline: h }).select().single();
    lock(false);
    if (r.error) return SS.toast(r.error.code === "23505" ? "That username is taken, try another" : r.error.message);
    SS.prof = r.data; SS.toast("Welcome to Skillshow"); location.hash = "#/home"; SS.start();
  }
  async function enter() {
    var r = await sb.from("profiles").select("*").eq("id", SS.me.id).maybeSingle();
    if (r.error) { SS.toast("Could not load your profile: " + r.error.message); return welcome(); }
    if (r.data) { SS.prof = r.data; if (!location.hash) location.hash = "#/home"; SS.start(); } else setup();
  }
  SS.signOut = async function () {
    await sb.auth.signOut(); SS.stop(); em = ""; location.hash = ""; welcome();
  };

  /* ---------- start ---------- */
  (async function boot() {
    var r = await sb.auth.getSession();
    if (r.data && r.data.session) { SS.me = r.data.session.user; enter(); } else welcome();
  })();
})();
