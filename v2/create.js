/* Skillshow Create (v2): Post work, Post a job, Ask for help. */
(function () {
  "use strict";
  var SS = window.SS, $ = SS.$, esc = SS.esc, sb = SS.sb;
  var CATS = SS.JCAT = ["Design", "Video", "Development", "Music", "Writing", "Marketing", "Photography", "Other"];
  var TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"], MODES = ["Remote", "On-site", "Hybrid"];

  function opts(a) { return a.map(function (x) { return "<option>" + x + "</option>"; }).join(""); }
  function sel(id, label, a) { return '<label class="f"><span>' + label + '</span><select class="inp" id="' + id + '">' + opts(a) + "</select></label>"; }
  function txt(id, label, ph, max) { return '<label class="f"><span>' + label + '</span><input class="inp" id="' + id + '" maxlength="' + (max || 80) + '" placeholder="' + (ph || "") + '"></label>'; }
  function area(id, label, ph) { return '<label class="f"><span>' + label + '</span><textarea class="inp" id="' + id + '" maxlength="1500" placeholder="' + (ph || "") + '"></textarea></label>'; }
  function done(msg) { SS.closeSheet(); SS.toast(msg); if (location.hash === "#/home" || !location.hash) SS.go("home"); else location.hash = "#/home"; }

  function shrink(file, max) {
    return new Promise(function (res) {
      if (!/^image\//.test(file.type) || file.type === "image/gif") return res(file);
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(u); res(b || file); }, "image/jpeg", 0.82);
      };
      img.onerror = function () { res(file); };
      img.src = u;
    });
  }

  SS.shrink = shrink;

  /* Post work */
  SS.register("create:post", function () {
    SS.sheet("<h2>Post your work</h2>" + txt("wt", "Title", "e.g. Brand identity for a bakery") + sel("ws", "Skill", CATS) +
      area("wd", "About this work (optional)", "What did you make, and for whom?") +
      '<label class="f"><span>Photo or video (optional)</span><input class="inp" id="wf" type="file" accept="image/*,video/*" style="padding-top:11px"></label><button class="btn block" id="go">Post</button>');
    $("#go").onclick = async function () {
      var t = $("#wt").value.trim(), f = $("#wf").files[0];
      if (t.length < 3) return SS.toast("Add a title");
      if (f && f.size > 50 * 1024 * 1024) return SS.toast("That file is over 50 MB");
      $("#go").disabled = true; $("#go").textContent = "Posting…";
      try {
        var url = null, kind = null;
        if (f) {
          kind = /^video\//.test(f.type) ? "video" : "image";
          var blob = kind === "image" ? await shrink(f, 1600) : f;
          var ext = kind === "image" ? "jpg" : ((f.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, ""));
          var path = SS.me.id + "/" + Date.now() + "." + ext;
          var up = await sb.storage.from("posts").upload(path, blob, { upsert: true, contentType: blob.type || f.type, cacheControl: "3600" });
          if (up.error) throw up.error;
          url = sb.storage.from("posts").getPublicUrl(path).data.publicUrl;
        }
        var r = await sb.from("posts").insert({ user_id: SS.me.id, title: t, skill: $("#ws").value, caption: $("#wd").value.trim() || null, media_url: url, media_type: kind, kind: "work" });
        if (r.error) throw r.error;
        done("Posted");
      } catch (e) {
        $("#go").disabled = false; $("#go").textContent = "Post"; SS.toast("Could not post: " + (e.message || "try again"));
      }
    };
  });

  /* Post a job */
  SS.register("create:job", function () {
    SS.sheet("<h2>Post a job</h2>" + txt("jt", "Job title", "e.g. Video editor for a music video") + txt("jc", "Company or your name (optional)", "", 60) + sel("jca", "Category", CATS) +
      sel("jty", "Type", TYPES) + sel("jmo", "Work mode", MODES) + txt("jl", "Location (optional)", "e.g. Port Harcourt", 60) + txt("jp", "Pay (optional)", "e.g. N50,000 or Negotiable", 40) +
      '<label class="f"><span>Deadline (optional)</span><input class="inp" id="jd" type="date"></label>' + area("jde", "Describe the job", "What will the person do?") + '<button class="btn block" id="go">Post job</button>');
    $("#go").onclick = async function () {
      var t = $("#jt").value.trim(), d = $("#jde").value.trim();
      if (t.length < 3) return SS.toast("Add a job title");
      if (d.length < 10) return SS.toast("Describe the job (at least 10 characters)");
      $("#go").disabled = true;
      var r = await sb.from("jobs").insert({ poster_id: SS.me.id, title: t, company: $("#jc").value.trim(), description: d, category: $("#jca").value, job_type: $("#jty").value, work_mode: $("#jmo").value, location: $("#jl").value.trim(), pay: $("#jp").value.trim(), deadline: $("#jd").value || null, kind: "job" });
      if (r.error) { $("#go").disabled = false; return SS.toast("Could not post: " + r.error.message); }
      done("Job posted");
    };
  });

  /* Ask for help */
  SS.register("create:ask", function () {
    SS.sheet("<h2>Ask for help</h2>" + txt("at", "What do you need?", "e.g. Logo designer for my bakery") + sel("ac", "Category", CATS) + txt("ab", "Budget (optional)", "e.g. N20,000", 40) +
      txt("al", "Location (optional)", "Remote is fine", 60) + area("ad", "Details", "Tell people what you need and when.") + '<button class="btn block" id="go">Post request</button>');
    $("#go").onclick = async function () {
      var t = $("#at").value.trim(), d = $("#ad").value.trim();
      if (t.length < 3) return SS.toast("Say what you need");
      if (d.length < 10) return SS.toast("Add a few details (at least 10 characters)");
      $("#go").disabled = true;
      var r = await sb.from("jobs").insert({ poster_id: SS.me.id, title: t, description: d, category: $("#ac").value, job_type: "Freelance", work_mode: "Remote", location: $("#al").value.trim(), pay: $("#ab").value.trim(), kind: "request" });
      if (r.error) { $("#go").disabled = false; return SS.toast("Could not post: " + r.error.message); }
      done("Request posted");
    };
  });
})();
