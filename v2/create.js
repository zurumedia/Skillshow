/* Skillshow Create (v2, Stage 2a): Post work, Post a job, Ask for help. */
(function () {
  "use strict";
  var SS = window.SS, sb = SS.sb, esc = SS.esc, $ = SS.$;
  var CAT = ["Design", "Video", "Development", "Music", "Writing", "Marketing", "Photography", "Other"];
  var TYPE = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"], MODE = ["Remote", "On-site", "Hybrid"];
  var opts = function (a) { return a.map(function (x) { return "<option>" + x + "</option>"; }).join(""); };
  var fld = function (id, label, inner) { return '<label class="f"><span>' + label + "</span>" + inner + "</label>"; };
  var inp = function (id, ph, max, type) { return '<input class="inp" id="' + id + '" type="' + (type || "text") + '" maxlength="' + (max || 120) + '" placeholder="' + (ph || "") + '">'; };
  var sel = function (id, a) { return '<select class="inp" id="' + id + '">' + opts(a) + "</select>"; };
  var ta = function (id, ph) { return '<textarea class="inp" id="' + id + '" maxlength="1500" placeholder="' + ph + '"></textarea>'; };

  function shrink(file) {
    return new Promise(function (res) {
      if (!/^image\//.test(file.type) || file.type === "image/gif") return res(file);
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(u); res(b ? new File([b], "p.jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { res(file); };
      img.src = u;
    });
  }
  async function upload(file) {
    var ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    var path = SS.me.id + "/" + Date.now() + "." + ext;
    var r = await sb.storage.from("posts").upload(path, file, { contentType: file.type || undefined, upsert: true });
    if (r.error) throw r.error;
    return sb.storage.from("posts").getPublicUrl(path).data.publicUrl;
  }
  function done(msg) { SS.refreshHome && SS.refreshHome(); SS.closeSheet(); SS.toast(msg); SS.go("home"); }

  SS.register("create:post", function () {
    var d = SS.sheet("<h3>Post work</h3>" + fld("pf", "Photo or video", '<input class="inp" id="pf" type="file" accept="image/*,video/*" style="padding-top:10px">') +
      fld("pt", "Title", inp("pt", "Brand identity for a bakery", 80)) + fld("ps", "Skill", sel("ps", CAT)) +
      fld("pc", "About this work (optional)", ta("pc", "What did you do? Who was it for?")) + '<button class="btn block" id="pg">Post</button>');
    $("#pg", d).onclick = async function () {
      var f = $("#pf", d).files[0], t = $("#pt", d).value.trim();
      if (!f) return SS.toast("Choose a photo or video"); if (!t) return SS.toast("Add a title");
      var vid = /^video\//.test(f.type); if (vid && f.size > 50 * 1048576) return SS.toast("Videos must be under 50 MB");
      this.disabled = true; this.textContent = "Posting…";
      try {
        var url = await upload(vid ? f : await shrink(f));
        var r = await sb.from("posts").insert({ user_id: SS.me.id, title: t, skill: $("#ps", d).value, caption: $("#pc", d).value.trim() || null, media_url: url, media_type: vid ? "video" : "image", kind: "work" });
        if (r.error) throw r.error;
        done("Posted!");
      } catch (e) { this.disabled = false; this.textContent = "Post"; SS.toast("Could not post: " + (e.message || "try again")); }
    };
  });

  function jobForm(kind) {
    var req = kind === "request";
    var d = SS.sheet("<h3>" + (req ? "Ask for help" : "Post a job") + "</h3>" +
      fld("jt", req ? "What do you need?" : "Job title", inp("jt", req ? "A logo designer" : "Video editor", 80)) +
      (req ? "" : fld("jc", "Company or business (optional)", inp("jc", "", 80))) +
      fld("jk", "Category", sel("jk", CAT)) + (req ? "" : fld("jy", "Job type", sel("jy", TYPE))) + fld("jm", "Work mode", sel("jm", MODE)) +
      fld("jl", "Location (optional)", inp("jl", "Port Harcourt", 60)) + fld("jp", req ? "Budget" : "Pay", inp("jp", "N50,000 or Negotiable", 40)) +
      fld("jd", "Deadline (optional)", inp("jd", "", 20, "date")) +
      fld("jx", req ? "Tell people what you need" : "Description", ta("jx", "Describe the work, skills needed and how to apply")) + '<button class="btn block" id="jg">Post</button>');
    $("#jg", d).onclick = async function () {
      var t = $("#jt", d).value.trim(), x = $("#jx", d).value.trim();
      if (!t) return SS.toast("Add a title"); if (x.length < 10) return SS.toast("Add a short description");
      this.disabled = true; this.textContent = "Posting…";
      var r = await sb.from("jobs").insert({
        poster_id: SS.me.id, title: t, company: req ? SS.prof.full_name : $("#jc", d).value.trim(), description: x, category: $("#jk", d).value,
        job_type: req ? "Freelance" : $("#jy", d).value, work_mode: $("#jm", d).value, location: $("#jl", d).value.trim(), pay: $("#jp", d).value.trim(),
        deadline: $("#jd", d).value || null, kind: kind
      });
      if (r.error) { this.disabled = false; this.textContent = "Post"; return SS.toast("Could not post: " + r.error.message); }
      done(req ? "Request posted!" : "Job posted!");
    };
  }
  SS.register("create:job", function () { jobForm("job"); });
  SS.register("create:ask", function () { jobForm("request"); });
})();
