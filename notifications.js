/* Skillshow notifications: tapping a notification opens the right place.
   likes/comments -> the post (with comments), follows -> that person's profile,
   job notifications -> the job. Load AFTER the other scripts. */

async function loadNotifs() {
  const [l, c, f, ja, js] = await Promise.all([
    sb.from('likes').select('created_at,post_id,user_id,profiles!user_id(username,full_name,avatar_url),posts!inner(user_id)').eq('posts.user_id', me.id).neq('user_id', me.id).order('created_at', { ascending: false }).limit(30),
    sb.from('comments').select('created_at,body,post_id,user_id,profiles!user_id(username,full_name,avatar_url),posts!inner(user_id)').eq('posts.user_id', me.id).neq('user_id', me.id).order('created_at', { ascending: false }).limit(30),
    sb.from('follows').select('created_at,follower_id,profiles!follower_id(username,full_name,avatar_url)').eq('following_id', me.id).order('created_at', { ascending: false }).limit(30),
    sb.from('job_applications').select('created_at,applicant_id,profiles!applicant_id(username,full_name,avatar_url),jobs!inner(id,poster_id,title)').eq('jobs.poster_id', me.id).order('created_at', { ascending: false }).limit(30),
    sb.from('job_applications').select('status,status_at,jobs(id,title,profiles!poster_id(username,full_name,avatar_url))').eq('applicant_id', me.id).not('status_at', 'is', null).order('status_at', { ascending: false }).limit(30)
  ]);
  const A = [].concat(
    (l.data || []).map(x => ({ t: 'like', at: x.created_at, p: x.profiles, post: x.post_id })),
    (c.data || []).map(x => ({ t: 'comment', at: x.created_at, p: x.profiles, b: x.body, post: x.post_id })),
    (f.data || []).map(x => ({ t: 'follow', at: x.created_at, p: x.profiles, uid: x.follower_id })),
    (ja.data || []).map(x => ({ t: 'applied', at: x.created_at, p: x.profiles, b: x.jobs && x.jobs.title, job: x.jobs && x.jobs.id })),
    (js.data || []).map(x => ({ t: 'jstatus', at: x.status_at, p: x.jobs && x.jobs.profiles, b: x.jobs && x.jobs.title, s: x.status, job: x.jobs && x.jobs.id }))
  );
  A.sort((a, b) => new Date(b.at) - new Date(a.at));
  notifs = A.slice(0, 40);
  const seen = new Date(prof.notif_seen_at || 0);
  setBadge('nb', notifs.filter(n => new Date(n.at) > seen).length);
}

async function loadNotifsView() {
  await loadNotifs();
  const seen = new Date(prof.notif_seen_at || 0), g = $('#nlist'); if (!g) return;
  g.innerHTML = notifs.length ? notifs.map((n, i) => {
    const p = n.p || {};
    const t = n.t == 'like' ? 'liked your post'
      : n.t == 'comment' ? 'commented: ' + esc(n.b)
      : n.t == 'applied' ? 'applied to your job: ' + esc(n.b)
      : n.t == 'jstatus' ? (n.s == 'shortlisted' ? 'shortlisted you for: ' : 'updated your application for: ') + esc(n.b)
      : 'started following you';
    return `<div class="lr ${new Date(n.at) > seen ? 'nw' : ''}" style="cursor:pointer" onclick="npGo(${i})"><div class="av">${avt(p.avatar_url, p.full_name)}</div><div style="flex:1;min-width:0"><b>${esc(p.full_name)}</b><small style="white-space:normal">${t}</small></div><span class="co" style="font-size:12px">${ago(n.at)}</span></div>`;
  }).join('') : `<p class="co" style="padding:30px 20px;text-align:center">No notifications yet. Likes, comments and new followers will show here.</p>`;
  const now = new Date().toISOString(); prof.notif_seen_at = now;
  sb.from('profiles').update({ notif_seen_at: now }).eq('id', me.id).then(() => {});
}

function npGo(i) {
  const n = notifs[i]; if (!n) return;
  if (n.t == 'like' || n.t == 'comment') npPost(n.post);
  else if (n.t == 'follow' && n.uid) openUser(n.uid);
  else if ((n.t == 'applied' || n.t == 'jstatus') && n.job) openJob(n.job);
  else toast('Could not open this notification');
}

async function npPost(id) {
  if (!id) { toast('This post is no longer available'); return; }
  const { data: p, error } = await sb.from('posts')
    .select('id,user_id,caption,media_url,media_type,created_at,profiles!user_id(username,full_name,avatar_url),likes(user_id),comments(id,body,created_at,profiles!user_id(username))')
    .eq('id', id).maybeSingle();
  if (error || !p) { toast('This post is no longer available'); return; }
  const o = document.querySelector('#ov .sh');
  const h = npHtml(p);
  if (o) o.innerHTML = h; else sheetOpen(h);
}

function npHtml(p) {
  const pr = p.profiles || {};
  const cs = (p.comments || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const nl = (p.likes || []).length;
  const media = p.media_url
    ? (p.media_type == 'video'
      ? `<video src="${esc(p.media_url)}" controls playsinline preload="metadata" style="width:100%;border-radius:12px;margin:10px 0"></video>`
      : `<img src="${esc(p.media_url)}" alt="" style="width:100%;border-radius:12px;margin:10px 0;display:block">`)
    : '';
  return `<div class="ph" style="cursor:pointer" onclick="closeNew();openUser('${esc(p.user_id)}')"><div class="av">${avt(pr.avatar_url, pr.full_name)}</div><div><b>${esc(pr.full_name)}</b><small>@${esc(pr.username)} · ${ago(p.created_at)}</small></div></div>`
    + media
    + (p.caption ? `<p style="margin:6px 0">${esc(p.caption)}</p>` : '')
    + `<p class="co" style="margin:6px 0 10px"><b>${nl} like${nl == 1 ? '' : 's'}</b> · ${cs.length} comment${cs.length == 1 ? '' : 's'}</p>`
    + `<div class="cm">${cs.map(c => `<p><b>${esc(c.profiles && c.profiles.username)}</b> ${esc(c.body)}</p>`).join('')}<div class="cin"><input class="fi" id="npc" placeholder="Add a comment" maxlength="500" onkeydown="if(event.key==='Enter')npAdd(${p.id})"><button class="lk" onclick="npAdd(${p.id})">Post</button></div></div>`;
}

async function npAdd(id) {
  const e = $('#npc'), t = e ? e.value.trim() : ''; if (!t) return;
  const { error } = await sb.from('comments').insert({ post_id: id, user_id: me.id, body: t });
  if (error) { toast(error.message); return; }
  npPost(id);
}
