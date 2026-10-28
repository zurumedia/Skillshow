/* Skillshow Community group chat - STEP 1
   Tabs (Chat / Posts / Members), realtime messages, send text, member list.
   Loaded AFTER skillshow-patch.js. Replaces loadCview and toggleJoin only. */

const GC = { cid: null, tab: 'chat', c: null, members: [], prof: {}, msgs: [], ch: null, sending: false, was: false };

(function () {
  const s = document.createElement('style');
  s.textContent = 'body.gcchat nav,body.gcchat #fab{display:none!important}';
  document.head.appendChild(s);
})();

const gcP = id => GC.prof[id] || { full_name: 'Member', username: 'member' };
const gcMember = () => !!GC.c && (GC.c.creator_id == me.id || GC.members.some(x => x.user_id == me.id));
function gcRole(uid) {
  if (GC.c && GC.c.creator_id == uid) return 'creator';
  const m = GC.members.find(x => x.user_id == uid);
  return m && String(m.role).toLowerCase() == 'admin' ? 'admin' : 'member';
}
const gcMod = () => gcRole(me.id) != 'member';
const gcCanSend = () => gcMember() && (gcMod() || (GC.c.messaging_mode == 'everyone' && !GC.c.is_locked));

async function gcProfiles(ids) {
  const need = [...new Set(ids)].filter(x => x && !GC.prof[x]);
  if (!need.length) return;
  const { data } = await sb.from('profiles').select('id,username,full_name,avatar_url,verified').in('id', need);
  (data || []).forEach(p => { GC.prof[p.id] = p; });
}

function gcLeave() {
  if (GC.ch) { sb.removeChannel(GC.ch); GC.ch = null; }
  document.body.classList.remove('gcchat');
}

async function loadCview() {
  gcLeave();
  const id = cur;
  if (GC.cid !== id) { GC.cid = id; GC.tab = 'chat'; GC.msgs = []; GC.was = false; }
  const [c, m] = await Promise.all([
    sb.from('communities').select('id,name,description,creator_id,is_locked,messaging_mode,created_at').eq('id', id).maybeSingle(),
    sb.from('community_members').select('user_id,role,joined_at').eq('community_id', id)
  ]);
  const h = $('#chead');
  if (!h || cur !== id || tab != 'cview') return;
  if (!c.data) { h.innerHTML = '<p class="co" style="padding:20px">Community not found.</p>'; return; }
  GC.c = c.data; GC.members = m.data || [];
  await gcProfiles(GC.members.map(x => x.user_id));
  if (cur !== id || tab != 'cview') return;
  if (gcMember()) joinedC.add(id); else joinedC.delete(id);
  GC.was = gcMember();
  if (gcMember()) {
    const r = await sb.from('community_messages')
      .select('id,sender_id,body,image_url,reply_to,created_at')
      .eq('community_id', id).order('created_at', { ascending: false }).limit(200);
    if (r.error) toast(r.error.message);
    GC.msgs = (r.data || []).reverse();
    await gcProfiles(GC.msgs.map(x => x.sender_id));
    if (cur !== id || tab != 'cview') return;
  } else GC.msgs = [];
  gcSubscribe(id);
  gcHead(); gcBody();
}

function gcSubscribe(id) {
  GC.ch = sb.channel('gc-' + id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: 'community_id=eq.' + id }, p => gcAdd(p.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_messages' }, p => {
      const n = GC.msgs.length;
      GC.msgs = GC.msgs.filter(x => x.id != p.old.id);
      if (GC.msgs.length != n) gcDraw(true);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_members', filter: 'community_id=eq.' + id }, () => gcRefresh())
    .subscribe();
}

async function gcRefresh() {
  const id = GC.cid;
  const m = await sb.from('community_members').select('user_id,role,joined_at').eq('community_id', id);
  if (!m.data || GC.cid !== id || tab != 'cview') return;
  GC.members = m.data;
  await gcProfiles(GC.members.map(x => x.user_id));
  if (GC.was && !gcMember()) {
    joinedC.delete(id); toast('You are no longer a member of this community');
    tab = 'comm'; draw(); return;
  }
  if (!GC.was && gcMember()) { loadCview(); return; }
  gcHead();
  if (GC.tab == 'members') gcBody();
}

async function gcAdd(m) {
  if (GC.msgs.some(x => x.id == m.id)) return;
  await gcProfiles([m.sender_id]);
  if (GC.msgs.some(x => x.id == m.id)) return;
  GC.msgs.push(m);
  gcDraw(false, m.sender_id == me.id);
}

function gcHead() {
  const h = $('#chead'), c = GC.c; if (!h || !c) return;
  const n = GC.members.length, j = gcMember();
  const t = (k, l) => `<div class="${GC.tab == k ? 'on' : ''}" onclick="gcTab('${k}')">${l}</div>`;
  const note = c.is_locked ? ' · Locked' : c.messaging_mode == 'admins_only' ? ' · Admins only' : '';
  h.innerHTML = `<div class="cvh"><div class="av big" style="background:${CC[c.id % 5]};color:#fff">${esc(c.name[0].toUpperCase())}</div><div style="flex:1;min-width:0"><b style="font-size:18px">${esc(c.name)}</b><small class="co" style="display:block">${n} member${n == 1 ? '' : 's'}${note}</small></div>${j ? '' : `<button class="btn" style="width:auto;padding:10px 16px" onclick="toggleJoin(${c.id})">Join</button>`}</div>`
    + `<div class="jsg">${t('chat', 'Chat')}${t('posts', 'Posts')}${t('members', 'Members')}</div>`
    + (GC.tab == 'posts' && j ? `<div class="row" style="padding:10px 14px"><button class="btn" onclick="openNew(${c.id})">Post here</button></div>` : '');
}

function gcTab(k) {
  GC.tab = k; gcHead(); gcBody();
  window.scrollTo(0, 0);
}

function gcBody() {
  const f = $('#feed'); if (!f || !GC.c) return;
  const chatOn = GC.tab == 'chat' && gcMember();
  document.body.classList.toggle('gcchat', chatOn);
  f.style.paddingBottom = GC.tab == 'chat' ? '0' : '';
  if (GC.tab == 'chat') {
    if (!gcMember()) {
      f.innerHTML = '<p class="co" style="padding:30px 20px;text-align:center">Join this community to read and send messages.</p>';
      return;
    }
    f.innerHTML = '<div id="cmsgs"></div>' + gcBar();
    gcDraw(false, true);
  } else if (GC.tab == 'posts') {
    f.innerHTML = '<p class="co" style="padding:30px 20px;text-align:center">Loading…</p>';
    loadFeed();
  } else gcMembersView();
}

function gcBar() {
  if (!gcCanSend()) {
    const why = GC.c.is_locked ? 'This community is locked. Only the creator and admins can send messages.' : 'Only the creator and admins can send messages here.';
    return `<div class="cbar" id="gbar"><div class="co" style="text-align:center;padding:8px 4px">${why}</div></div>`;
  }
  return `<div class="cbar" id="gbar"><div class="crow"><input class="fi" id="gi" placeholder="Message…" maxlength="2000" onkeydown="if(event.key==='Enter')gcSend()"><button class="jb ib" onclick="gcSend()">${SND}</button></div></div>`;
}

function gcDraw(keep, force) {
  const g = $('#cmsgs'); if (!g || GC.tab != 'chat') return;
  const near = innerHeight + scrollY >= document.body.scrollHeight - 220;
  if (!GC.msgs.length) {
    g.innerHTML = '<p class="co" style="text-align:center;padding:30px 10px">No messages yet. Say hello 👋</p>';
    return;
  }
  let last = '', h = '', prev = null;
  GC.msgs.forEach(m => {
    const d = new Date(m.created_at).toDateString();
    if (d != last) { h += `<div class="dsep">${dayLbl(m.created_at)}</div>`; last = d; prev = null; }
    const mine = m.sender_id == me.id, p = gcP(m.sender_id), r = gcRole(m.sender_id);
    const showName = !mine && prev != m.sender_id; prev = m.sender_id;
    const tag = r == 'creator' ? 'Creator' : r == 'admin' ? 'Admin' : '';
    h += `<div class="mr ${mine ? 'me' : ''}" data-id="${m.id}"><div class="mb ${mine ? 'me' : ''}">`
      + (showName ? `<b style="display:block;font-size:12px;color:var(--ac);margin-bottom:2px">${esc(p.full_name)}${tag ? ` <span style="opacity:.75;font-weight:600">· ${tag}</span>` : ''}</b>` : '')
      + `${esc(m.body)}<small class="mt">${fmtT(m.created_at)}</small></div></div>`;
  });
  g.innerHTML = h;
  if (force || (!keep && near)) window.scrollTo(0, document.body.scrollHeight);
}

async function gcSend() {
  if (GC.sending) return;
  const i = $('#gi'), t = i ? i.value.trim() : '';
  if (!t || !gcCanSend()) return;
  GC.sending = true;
  const { data, error } = await sb.from('community_messages')
    .insert({ community_id: GC.c.id, sender_id: me.id, body: t })
    .select('id,sender_id,body,image_url,reply_to,created_at').single();
  GC.sending = false;
  if (error) { toast(error.code === '42501' ? 'You are not allowed to send messages here' : error.message); return; }
  if (i) i.value = '';
  gcAdd(data);
}

function gcMembersView() {
  const f = $('#feed'); if (!f) return;
  const rank = { creator: 0, admin: 1, member: 2 };
  const list = [...GC.members].sort((a, b) => rank[gcRole(a.user_id)] - rank[gcRole(b.user_id)] || new Date(a.joined_at) - new Date(b.joined_at));
  const c = GC.c;
  let h = c.description ? `<p class="co" style="padding:4px 14px 10px">${esc(c.description)}</p>` : '';
  h += list.map(m => {
    const p = gcP(m.user_id), r = gcRole(m.user_id);
    return `<div class="lr" onclick="openUser('${esc(m.user_id)}')"><div class="av">${avt(p.avatar_url, p.full_name)}</div><div style="flex:1;min-width:0"><b>${esc(p.full_name)}${m.user_id == me.id ? ' (You)' : ''}</b><small>@${esc(p.username)}</small></div>${r != 'member' ? `<span class="pill ok">${r == 'creator' ? 'Creator' : 'Admin'}</span>` : ''}</div>`;
  }).join('');
  h += '<div style="padding:14px">';
  if (gcMember() && c.creator_id != me.id) h += `<button class="btn o" onclick="toggleJoin(${c.id})">Leave community</button>`;
  if (c.creator_id == me.id) h += `<button class="lk" style="padding-left:0" onclick="delComm(${c.id})">Delete this community</button>`;
  h += '</div>';
  f.innerHTML = h;
}

async function toggleJoin(id) {
  const j = joinedC.has(id);
  if (j) {
    const r = await sb.from('communities').select('creator_id').eq('id', id).maybeSingle();
    if (r.data && r.data.creator_id == me.id) { toast('You created this community, so you cannot leave it. You can delete it instead.'); return; }
    if (!confirm('Leave this community?')) return;
  }
  const { error } = j
    ? await sb.from('community_members').delete().eq('community_id', id).eq('user_id', me.id)
    : await sb.from('community_members').insert({ community_id: id, user_id: me.id, role: 'member' });
  if (error) { toast(error.message); return; }
  toast(j ? 'You left the community' : 'You joined the community');
  if (tab == 'cview') loadCview(); else loadComms();
}

(function () {
  const prev = window.draw;
  window.draw = function () {
    if (tab != 'cview') { gcLeave(); if (tab != 'user') GC.cid = null; }
    return prev.apply(this, arguments);
  };
})();
