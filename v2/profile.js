/* Skillshow Profile (v2): full profile, editing, portfolio, experience, CV, photo viewer, follow, Book me. */
(function () {
  "use strict";
  var SS = window.SS, $ = SS.$, E = SS.esc, sb = SS.sb, ptab = "portfolio", cur = null;
  var CATS = ["Design", "Video", "Development", "Music", "Writing", "Marketing", "Photography", "Other"];
  SS.addIcons({ x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="m5 12 5 5 9-10"/>' });
  var TICK = '<span class="vf">' + SS.icon("check") + "</span>";

  /* ---------- full-screen photo viewer with pinch zoom, drag and double tap ---------- */
  SS.viewImage = function (url) {
    var o = document.createElement("div");
    o.className = "lb";
    o.innerHTML = '<img src="' + E(url) + '" alt="" draggable="false"><button class="lbx" aria-label="Close">&times;</button>';
    document.body.appendChild(o);
    var im = o.querySelector("img"), s = 1, x = 0, y = 0, d0 = 0, s0 = 1, px = 0, py = 0, last = 0;
    function ap() { im.style.transform = "translate(" + x + "px," + y + "px) scale(" + s + ")"; }
    function dist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
    o.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) { d0 = dist(e.touches); s0 = s; }
      else if (e.touches.length === 1) {
        px = e.touches[0].clientX - x; py = e.touches[0].clientY - y;
        var n = Date.now(); if (n - last < 300) { s = s > 1 ? 1 : 2.5; x = 0; y = 0; ap(); } last = n;
      }
    }, { passive: true });
    o.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2) { s = Math.min(5, Math.max(1, s0 * dist(e.touches) / d0)); ap(); e.preventDefault(); }
      else if (e.touches.length === 1 && s > 1) { x = e.touches[0].clientX - px; y = e.touches[0].clientY - py; ap(); e.preventDefault(); }
    }, { passive: false });
    o.addEventListener("click", function (e) { if (e.target.closest(".lbx") || (s === 1 && e.target === o)) o.remove(); });
  };

  function skillsOf(p) { return Array.isArray(p.skills) ? p.skills : []; }
  function opts(a, sel) { return a.map(function (x) { return "<option" + (x === sel ? " selected" : "") + ">" + x + "</option>"; }).join(""); }
  function field(id, label, val, ph, max, type) { return '<label class="f"><span>' + label + '</span><input class="inp" id="' + id + '" type="' + (type || "text") + '" maxlength="' + (max || 80) + '" placeholder="' + (ph || "") + '" value="' + E(val || "") + '"></label>'; }

  /* ---------- load and draw ---------- */
  async function load(v, id) {
    v.innerHTML = '<div class="empty">Loading…</div>';
    var mine = id === SS.me.id, o = { ascending: false };
    var r = await Promise.all([
      sb.from("profiles").select("*").eq("id", id).maybeSingle(),
      sb.from("follows").select("follower_id").eq("following_id", id).limit(2000),
      sb.from("follows").select("following_id").eq("follower_id", id).limit(2000),
      sb.from("posts").select("id,title,caption,skill,media_url,media_type", { count: "exact" }).eq("user_id", id).is("community_id", null).order("created_at", o).limit(30),
      sb.from("portfolio_items").select("*").eq("user_id", id).order("created_at", o),
      sb.from("experience").select("*").eq("user_id", id).order("start_year", o)
    ]);
    if (r[0].error || !r[0].data) { v.innerHTML = '<div class="empty">This profile is not available.</div>'; return; }
    var fers = (r[1].data || []).map(function (x) { return x.follower_id; }), fing = (r[2].data || []).map(function (x) { return x.following_id; });
    cur = { id: id, mine: mine, p: r[0].data, followers: fers, following: fing, friends: fers.filter(function (x) { return fing.indexOf(x) >= 0; }).length,
      posts: r[3].data || [], nposts: r[3].count || (r[3].data || []).length, items: r[4].data || [], exp: r[5].data || [], isF: fers.indexOf(SS.me.id) >= 0 };
    draw(v);
  }

  function strength(c) {
    var p = c.p, list = [["a profile photo", !!p.avatar_url], ["a cover photo", !!p.cover_url], ["a headline", !!p.headline], ["your skills", skillsOf(p).length > 0], ["a bio", !!(p.bio || "").trim()], ["your CV", !!p.cv_url], ["a portfolio project", c.items.length > 0], ["work experience", c.exp.length > 0]];
    var n = list.filter(function (x) { return x[1]; }).length, pct = Math.round(n / list.length * 100), todo = list.filter(function (x) { return !x[1]; }).map(function (x) { return x[0]; });
    return '<div class="card"><div style="display:flex;justify-content:space-between"><b>Profile strength</b><b>' + pct + '%</b></div><div class="meter"><i style="width:' + pct + '%"></i></div><p class="muted" style="margin:0;font-size:12.5px">' +
      (todo.length ? "Add " + todo.join(", ") + "." : "Your profile is complete. Clients can find and trust you.") + "</p></div>";
  }

  function tabBody(c) {
    if (ptab === "portfolio") {
      return (c.mine ? '<button class="btn line block" data-addp style="margin-bottom:12px">Add a project</button>' : "") +
        (c.items.length ? '<div class="pgrid">' + c.items.map(function (i) {
          return '<button class="pcard" data-pi="' + i.id + '"><div class="th" style="background-image:url(\'' + E(i.cover_url || "") + '\')"></div><div class="tt"><b>' + E(i.title) + "</b><span class=\"muted\">" + E(i.skill || "") + "</span></div></button>";
        }).join("") + "</div>" : '<div class="empty">' + (c.mine ? "Show what you can do. Add your first project." : "No projects yet.") + "</div>");
    }
    if (ptab === "about") {
      var p = c.p, h = (p.bio ? '<p style="white-space:pre-wrap;word-break:break-word;margin:0">' + E(p.bio) + "</p>" : '<p class="muted" style="margin:0">' + (c.mine ? "Add a bio from Edit profile." : "No bio yet.") + "</p>");
      h += '<h4 class="hsec">Work experience</h4>' + (c.exp.length ? c.exp.map(function (x) {
        return '<div class="xp"><b>' + E(x.role) + "</b><div class=\"muted\">" + E(x.org || "") + " · " + (x.start_year || "") + " to " + (x.end_year || "Present") + "</div>" + (x.description ? "<p style=\"margin:6px 0 0\">" + E(x.description) + "</p>" : "") +
          (c.mine ? '<button class="link" data-delx="' + x.id + '" style="margin-top:6px">Remove</button>' : "") + "</div>";
      }).join("") : '<p class="muted">None added.</p>') + (c.mine ? '<button class="btn line block" data-addx style="margin-top:12px">Add experience</button>' : "");
      h += '<h4 class="hsec">CV</h4>' + (p.cv_url ? '<a class="btn line block" href="' + E(p.cv_url) + '" target="_blank" rel="noopener noreferrer">View or download CV</a>' : '<p class="muted">No CV uploaded.</p>') +
        (c.mine ? '<button class="btn line block" data-cv style="margin-top:8px">' + (p.cv_url ? "Replace CV" : "Upload CV") + "</button>" : "");
      return h;
    }
    return c.posts.length ? '<div class="tgrid">' + c.posts.map(function (x) {
      var st = x.media_url && x.media_type !== "video" ? ' style="background-image:url(\'' + E(x.media_url) + '\')"' : "";
      return '<button class="tg" data-post="' + x.id + '"' + st + ">" + (st ? "" : E(x.title || (x.caption || "").slice(0, 40) || (x.media_type === "video" ? "Video" : "Post"))) + "</button>";
    }).join("") + "</div>" : '<div class="empty">No posts yet.</div>';
  }

  function draw(v) {
    var c = cur, p = c.p, wa = !c.mine && p.whatsapp_number ? SS.waLink(p.whatsapp_number, p.full_name) : "";
    var actions = c.mine ? "" : (c.isF ? '<button class="btn line sm" data-fol>Following</button>' : '<button class="btn pink sm" data-fol>Follow</button>') +
      '<button class="btn line sm" data-msg>Message</button>' + (wa ? '<a class="btn sm" href="' + wa + '" target="_blank" rel="noopener">Book me</a>' : "") + '<button class="btn line sm" data-rep aria-label="Report">Report</button>';
    v.innerHTML = '<button class="pcover" data-view="cover" aria-label="Cover photo"' + (p.cover_url ? ' style="background-image:url(\'' + E(p.cover_url) + '\')"' : "") + "></button>" +
      '<div class="prow"><button class="pav" data-view="avatar" aria-label="Profile photo">' + SS.avatar(p) + '</button><div class="pact">' + actions + "</div></div>" +
      '<h1 class="pn">' + E(p.full_name || p.username) + (p.verified ? TICK : "") + '</h1><div class="pu">@' + E(p.username || "") + "</div>" +
      (p.headline ? '<div class="phl">' + E(p.headline) + "</div>" : "") +
      (skillsOf(p).length || p.open_to_work ? '<div class="skills">' + (p.open_to_work ? '<span class="chip ok">Open to work</span>' : "") + skillsOf(p).map(function (s) { return '<span class="chip">' + E(s) + "</span>"; }).join("") + "</div>" : "") +
      '<div class="stats"><div><b>' + c.nposts + "</b><span>Posts</span></div><div><b data-nf>" + c.followers.length + "</b><span>Followers</span></div><div><b>" + c.following.length + "</b><span>Following</span></div><div><b>" + c.friends + "</b><span>Friends</span></div></div>" +
      (c.mine ? strength(c) + '<div class="two"><button class="btn line" data-edit>Edit profile</button><button class="btn line" data-out>Sign out</button></div><button class="btn line block" data-fb style="margin-top:8px">Send feedback or suggestion</button><button class="btn line block" data-tour style="margin-top:8px">Take the app tour</button>' : "") +
      '<div class="tabs ptabs">' + [["portfolio", "Portfolio"], ["about", "About"], ["posts", "Posts"]].map(function (t) { return '<button class="tab' + (ptab === t[0] ? " on" : "") + '" data-tab="' + t[0] + '">' + t[1] + "</button>"; }).join("") + '</div><div id="tb">' + tabBody(c) + "</div>";
  }

  /* ---------- actions ---------- */
  async function toggleFollow(b) {
    var c = cur; b.disabled = true;
    var r = c.isF ? await sb.from("follows").delete().eq("follower_id", SS.me.id).eq("following_id", c.id) : await sb.from("follows").insert({ follower_id: SS.me.id, following_id: c.id });
    b.disabled = false;
    if (r.error && r.error.code !== "23505") return SS.toast("Could not save that");
    c.isF = !c.isF;
    if (c.isF) c.followers.push(SS.me.id); else c.followers = c.followers.filter(function (x) { return x !== SS.me.id; });
    b.textContent = c.isF ? "Following" : "Follow"; b.className = "btn sm " + (c.isF ? "line" : "pink");
    var n = $("[data-nf]"); if (n) n.textContent = c.followers.length;
  }

  async function upload(bucket, blob, ext) {
    var path = SS.me.id + "/" + Date.now() + "-" + Math.floor(Math.random() * 1e4) + "." + ext;
    var up = await sb.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type || undefined, cacheControl: "3600" });
    if (up.error) throw up.error;
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  function editProfile() {
    var p = SS.prof;
    SS.sheet("<h2>Edit profile</h2>" + field("en", "Name", p.full_name, "", 60) + field("eu", "Username", p.username, "", 20) + field("eh", "Headline", p.headline, "e.g. Graphic designer", 80) +
      '<label class="f"><span>Bio</span><textarea class="inp" id="eb" maxlength="500">' + E(p.bio || "") + "</textarea></label>" +
      field("es", "Skills (separate with commas)", skillsOf(p).join(", "), "Branding, Logo design", 200) + field("ew", "WhatsApp number (for Book me)", p.whatsapp_number, "e.g. 08012345678", 20, "tel") +
      '<label class="swr"><input type="checkbox" id="eo"' + (p.open_to_work ? " checked" : "") + "> <span>Open to work</span></label>" +
      '<label class="f"><span>Profile photo</span><input class="inp" id="ea" type="file" accept="image/*" style="padding-top:11px"></label>' +
      '<label class="f"><span>Cover photo</span><input class="inp" id="ec" type="file" accept="image/*" style="padding-top:11px"></label><button class="btn block" id="go">Save changes</button>');
    $("#go").onclick = async function () {
      var n = $("#en").value.trim(), u = $("#eu").value.trim().toLowerCase(), w = $("#ew").value.replace(/[^\d+]/g, "");
      if (!n) return SS.toast("Enter your name");
      if (!/^[a-z0-9._]{3,20}$/.test(u)) return SS.toast("Username: 3 to 20 letters, numbers, . or _");
      if (w && (w.replace(/\D/g, "").length < 10 || w.replace(/\D/g, "").length > 15)) return SS.toast("Enter a valid WhatsApp number");
      $("#go").disabled = true; $("#go").textContent = "Saving…";
      try {
        var row = { full_name: n, username: u, headline: $("#eh").value.trim(), bio: $("#eb").value.trim(), whatsapp_number: w || null, open_to_work: $("#eo").checked,
          skills: $("#es").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 12) };
        var fa = $("#ea").files[0], fc = $("#ec").files[0];
        if (fa) row.avatar_url = await upload("avatars", await SS.shrink(fa, 640), "jpg");
        if (fc) row.cover_url = await upload("covers", await SS.shrink(fc, 1600), "jpg");
        var r = await sb.from("profiles").update(row).eq("id", SS.me.id).select().single();
        if (r.error) throw r.error;
        SS.prof = r.data; var m = $("#meb"); if (m) m.innerHTML = SS.avatar(SS.prof, 30);
        SS.closeSheet(); SS.toast("Profile saved"); SS.go("profile");
      } catch (e) {
        $("#go").disabled = false; $("#go").textContent = "Save changes";
        SS.toast(e.code === "23505" ? "That username is taken" : "Could not save: " + (e.message || "try again"));
      }
    };
  }

  function addProject() {
    SS.sheet("<h2>Add a project</h2>" + field("pt", "Title", "", "e.g. Brand identity for a bakery", 80) + '<label class="f"><span>Skill</span><select class="inp" id="ps">' + opts(CATS) + "</select></label>" +
      '<label class="f"><span>Description</span><textarea class="inp" id="pd" maxlength="1000" placeholder="What did you do, and for whom?"></textarea></label>' + field("pl", "Link (optional)", "", "https://", 200, "url") +
      '<label class="f"><span>Photos (first one is the cover, up to 5)</span><input class="inp" id="pf" type="file" accept="image/*" multiple style="padding-top:11px"></label><button class="btn block" id="go">Save project</button>');
    $("#go").onclick = async function () {
      var t = $("#pt").value.trim(), files = Array.prototype.slice.call($("#pf").files, 0, 5);
      if (t.length < 3) return SS.toast("Add a title");
      if (!files.length) return SS.toast("Add at least one photo");
      $("#go").disabled = true; $("#go").textContent = "Saving…";
      try {
        var urls = [];
        for (var i = 0; i < files.length; i++) urls.push(await upload("portfolio", await SS.shrink(files[i], 1600), "jpg"));
        var r = await sb.from("portfolio_items").insert({ user_id: SS.me.id, title: t, skill: $("#ps").value, description: $("#pd").value.trim() || null, link: $("#pl").value.trim() || null, cover_url: urls[0], images: urls.slice(1) });
        if (r.error) throw r.error;
        SS.closeSheet(); SS.toast("Project added"); load($("#view"), SS.me.id);
      } catch (e) { $("#go").disabled = false; $("#go").textContent = "Save project"; SS.toast("Could not save: " + (e.message || "try again")); }
    };
  }

  function openProject(id) {
    var i = cur.items.filter(function (x) { return x.id === id; })[0];
    if (!i) return;
    var imgs = [i.cover_url].concat(i.images || []).filter(Boolean);
    var d = SS.sheet('<div class="gal">' + imgs.map(function (u) { return '<img src="' + E(u) + '" alt="" data-v="' + E(u) + '">'; }).join("") + "</div><h2 style=\"margin-top:12px\">" + E(i.title) + '</h2><div class="jch">' + (i.skill ? '<span class="chip">' + E(i.skill) + "</span>" : "") + "</div>" +
      (i.description ? '<p style="white-space:pre-wrap;word-break:break-word">' + E(i.description) + "</p>" : "") + (i.link ? '<a class="btn line block" href="' + E(i.link) + '" target="_blank" rel="noopener noreferrer">Open link</a>' : "") +
      (cur.mine ? '<button class="btn line block" data-dp style="margin-top:8px">Delete project</button>' : ""));
    d.addEventListener("click", async function (e) {
      var im = e.target.closest("[data-v]");
      if (im) return SS.viewImage(im.dataset.v);
      if (e.target.closest("[data-dp]") && confirm("Delete this project?")) {
        var r = await sb.from("portfolio_items").delete().eq("id", id).eq("user_id", SS.me.id);
        SS.closeSheet(); if (r.error) return SS.toast("Could not delete");
        SS.toast("Project deleted"); load($("#view"), SS.me.id);
      }
    });
  }

  function addExperience() {
    SS.sheet("<h2>Add experience</h2>" + field("xr", "Role", "", "e.g. Graphic designer", 80) + field("xo", "Company or client", "", "", 80) + field("xs", "Start year", "", "2022", 4, "number") + field("xe", "End year (leave empty if current)", "", "", 4, "number") +
      '<label class="f"><span>Description (optional)</span><textarea class="inp" id="xd" maxlength="600"></textarea></label><button class="btn block" id="go">Save</button>');
    $("#go").onclick = async function () {
      var role = $("#xr").value.trim(), s = parseInt($("#xs").value, 10), e = parseInt($("#xe").value, 10);
      if (!role) return SS.toast("Add your role");
      if (!(s > 1950 && s <= new Date().getFullYear())) return SS.toast("Enter a valid start year");
      $("#go").disabled = true;
      var r = await sb.from("experience").insert({ user_id: SS.me.id, role: role, org: $("#xo").value.trim() || null, start_year: s, end_year: e > 1950 ? e : null, description: $("#xd").value.trim() || null });
      if (r.error) { $("#go").disabled = false; return SS.toast("Could not save: " + r.error.message); }
      SS.closeSheet(); SS.toast("Experience added"); load($("#view"), SS.me.id);
    };
  }

  function uploadCV() {
    var f = document.createElement("input"); f.type = "file"; f.accept = ".pdf,.doc,.docx,application/pdf";
    f.onchange = async function () {
      var file = f.files[0]; if (!file) return;
      if (file.size > 10 * 1024 * 1024) return SS.toast("The CV must be under 10 MB");
      SS.toast("Uploading…");
      try {
        var url = await upload("resumes", file, (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, ""));
        var r = await sb.from("profiles").update({ cv_url: url }).eq("id", SS.me.id).select().single();
        if (r.error) throw r.error;
        SS.prof = r.data; SS.toast("CV uploaded"); load($("#view"), SS.me.id);
      } catch (e) { SS.toast("Could not upload: " + (e.message || "try again")); }
    };
    f.click();
  }

  function feedback() {
    SS.sheet('<h2>Send feedback</h2><label class="f"><span>Type</span><select class="inp" id="fk"><option>Problem</option><option>Idea</option><option>Question</option></select></label><label class="f"><span>Message</span><textarea class="inp" id="fm" maxlength="1500" placeholder="Tell us what happened or what you would like"></textarea></label><button class="btn block" id="go">Send</button>');
    $("#go").onclick = async function () {
      var m = $("#fm").value.trim();
      if (m.length < 5) return SS.toast("Write a few words");
      $("#go").disabled = true;
      var r = await sb.from("feedback").insert({ user_id: SS.me.id, kind: $("#fk").value.toLowerCase(), message: m, screen: location.hash, device: navigator.userAgent.slice(0, 200), app_version: "v2" });
      if (r.error) { $("#go").disabled = false; return SS.toast("Could not send"); }
      SS.closeSheet(); SS.toast("Thank you. We read every message.");
    };
  }

  function report() {
    var d = SS.sheet("<h2>Report this profile</h2>" + ["Spam or fake account", "Scam", "Inappropriate content", "Something else"].map(function (r) { return '<button class="row" data-r="' + E(r) + '"><b>' + E(r) + "</b></button>"; }).join(""));
    d.addEventListener("click", async function (e) {
      var b = e.target.closest("[data-r]"); if (!b) return;
      var w = await sb.from("reports").insert({ reporter_id: SS.me.id, target_type: "profile", target_id: String(cur.id), reason: b.dataset.r });
      SS.closeSheet(); SS.toast(w.error ? "Could not send the report" : "Thanks, we will look into it");
    });
  }

  SS.register("profile", function (v, id) {
    id = id || SS.me.id; ptab = "portfolio";
    load(v, id);
    v.onclick = async function (e) {
      var b;
      if ((b = e.target.closest("[data-view]"))) { var u = b.dataset.view === "avatar" ? cur.p.avatar_url : cur.p.cover_url; return u && SS.viewImage(u); }
      if ((b = e.target.closest("[data-tab]"))) { ptab = b.dataset.tab; v.querySelectorAll("[data-tab]").forEach(function (x) { x.classList.toggle("on", x === b); }); $("#tb").innerHTML = tabBody(cur); return; }
      if ((b = e.target.closest("[data-fol]"))) return toggleFollow(b);
      if (e.target.closest("[data-msg]")) return SS.go("messages", cur.id);
      if (e.target.closest("[data-rep]")) return report();
      if (e.target.closest("[data-edit]")) return editProfile();
      if (e.target.closest("[data-out]")) return SS.signOut();
      if (e.target.closest("[data-fb]")) return feedback();
      if (e.target.closest("[data-tour]")) return SS.tour ? SS.tour.start() : SS.toast("The tour is not available");
      if (e.target.closest("[data-addp]")) return addProject();
      if (e.target.closest("[data-addx]")) return addExperience();
      if (e.target.closest("[data-cv]")) return uploadCV();
      if ((b = e.target.closest("[data-pi]"))) return openProject(+b.dataset.pi);
      if ((b = e.target.closest("[data-post]"))) return SS.go("post", b.dataset.post);
      if ((b = e.target.closest("[data-delx]")) && confirm("Remove this experience?")) {
        var r = await sb.from("experience").delete().eq("id", +b.dataset.delx).eq("user_id", SS.me.id);
        if (r.error) return SS.toast("Could not remove"); load(v, SS.me.id);
      }
    };
  });
})();
