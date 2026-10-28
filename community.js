/* Skillshow Community group chat - STEP 2
   Chat / Posts / Members, realtime, replies, emoji reactions, photos. */

const GC = { cid: null, tab: 'chat', c: null, members: [], prof: {}, msgs: [], ch: null, sending: false, was: false, reacts: {}, urls: {}, rep: null, att: null, attUrl: '', rxT: null };

(function () {
  const s = document.createElement('style');
  s.textContent = 'body.gcchat nav,body.gcchat #fab{display:none!important}';
  document.head.appendChild(s);
})();

const gcP = id => GC.prof[id] || { full_name: 'Member', username: 'member' };
const gcPrev = m => m.body || (m.image_url ? 'Photo' : '');
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

async function gcSign(list) {
  const need = [...new Set(list.map(m => m.image_url).filter(p => p && !GC.urls[p]))];
  if (!need.length) return;
  const { data } = await sb.storage.from('community-chat').createSignedUrls(need, 3600);
  (data || []).forEach(x => { if (x.signedUrl) GC.urls[x.path] = x.signedUrl; });
}

async function gcLoadReacts(redraw) {
  const ids = GC.msgs.map(m => m.id), r = {};
  if (ids.length) {
    const { data } = await sb.from('community_message_reactions').select('message_id,user_id,emoji').in('message_id', ids);
    (data || []).forEach(x => { (r[x.message_id] = r[x.message_id] || []).push(x); });
  }
  GC.reacts = r;
  if (redraw) gcDraw(true);
}

function gcReactsSoon() {
  clearTimeout(GC.rxT);
  GC.rxT = setTimeout(() => { if (GC.cid && tab == 'cview' && GC.c) gcLoadReacts(true); }, 350);
}

function gcLeave() {
  if (GC.ch) { sb.removeChannel(GC.ch); GC.ch = null; }
  clearTimeout(GC.rxT);
  document.body.classList.remove('gcchat');
}

async function loadCview() {
  gcLeave();
  const id = cur;
  if (GC.cid !== id) { GC.cid = id; GC.tab = 'chat'; GC.msgs = []; GC.reacts = {}; GC.was = false; GC.rep = null; GC.att = null; }
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
    await Promise.all([gcProfiles(GC.msgs.map(x => x.sender_id)), gcSign(GC.msgs), gcLoadReacts(false)]);
    if (cur !== id || tab != 'cview') return;
  } else { GC.msgs = []; GC.reacts = {}; }
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_message_reactions' }, () => gcReactsSoon())
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
  await Promise.all([gcProfiles([m.sender_id]), gcSign([m])]);
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
  closePick();
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
    gcDraw(false, true); gcGest(); gcPre();
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
  return `<div class="cbar" id="gbar"><div id="gpre"></div><div class="crow"><button class="x" onclick="$('#gca').click()">${IMG}</button><input class="fi" id="gi" placeholder="Message…" maxlength="2000" onkeydown="if(event.key==='Enter')gcSend()"><button class="jb ib" onclick="gcSend()">${SND}</button></div><input type="file" id="gca" accept="image/*" hidden onchange="gcPickAtt(this)"></div>`;
}

function gcPre() {
  const p = $('#gpre'); if (!p) return;
  let h = '';
  if (GC.rep) h += `<div class="prv"><div class="rq" style="flex:1;margin:0"><b>${GC.rep.sender_id == me.id ? 'You' : esc(gcP(GC.rep.sender_id).full_name)}</b><span>${esc(gcPrev(GC.rep))}</span></div><button class="x" onclick="GC.rep=null;gcPre()">${XX}</button></div>`;
  if (GC.att) h += `<div class="prv"><img class="th2" src="${GC.attUrl}" alt=""><span class="co" style="flex:1">Photo ready to send</span><button class="x" onclick="GC.att=null;gcPre()">${XX}</button></div>`;
  p.innerHTML = h;
}

function gcPickAtt(inp) {
  const f = inp.files[0]; if (!f) return; inp.value = '';
  if (!f.type.startsWith('image/')) { toast('Please choose a photo'); return; }
  if (f.size > 20 * 1024 * 1024) { toast('Photo is too large (max 20 MB)'); return; }
  GC.att = f; GC.attUrl = URL.createObjectURL(f); gcPre();
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
    const q = m.reply_to ? GC.msgs.find(x => x.id == m.reply_to) : null, gr = {};
    (GC.reacts[m.id] || []).forEach(x => { const o = gr[x.emoji] = gr[x.emoji] || { n: 0, me: false }; o.n++; if (x.user_id == me.id) o.me = true; });
    h += `<div class="mr ${mine ? 'me' : ''}" data-id="${m.id}"><div class="mb ${mine ? 'me' : ''}">`
      + (showName ? `<b style="display:block;font-size:12px;color:var(--ac);margin-bottom:2px">${esc(p.full_name)}${tag ? ` <span style="opacity:.75;font-weight:600">· ${tag}</span>` : ''}</b>` : '')
      + (m.reply_to ? `<div class="rq" onclick="jumpTo(${m.reply_to})"><b>${q ? (q.sender_id == me.id ? 'You' : esc(gcP(q.sender_id).full_name)) : 'Message'}</b><span>${q ? esc(gcPrev(q)) : 'Original message'}</span></div>` : '')
      + (m.image_url ? `<img class="mi" src="${esc(GC.urls[m.image_url] || '')}" alt="" onclick="gcOpenImg('${esc(m.image_url)}')">` : '')
      + `${esc(m.body)}<small class="mt">${fmtT(m.created_at)}</small></div>`
      + (Object.keys(gr).length ? `<div class="rx">${Object.entries(gr).map(([e, v]) => `<span class="${v.me ? 'mine' : ''}" onclick="gcReact(${m.id},'${e}')">${e}${v.n > 1 ? ' ' + v.n : ''}</span>`).join('')}</div>` : '')
      + `</div>`;
  });
  g.innerHTML = h;
  if (force || (!keep && near)) window.scrollTo(0, document.body.scrollHeight);
}

function gcOpenImg(p) {
  const o = document.createElement('div');
  o.id = 'ov'; o.className = 'ov'; o.style.alignItems = 'center'; o.onclick = () => o.remove();
  o.innerHTML = `<img src="${esc(GC.urls[p] || '')}" alt="" style="max-width:100%;max-height:90%;border-radius:8px">`;
  document.body.appendChild(o);
}

function gcShowPick(r, id) {
  closePick();
  const m = GC.msgs.find(x => x.id == id); if (!m) return;
  const b = r.getBoundingClientRect(), el = document.createElement('div');
  el.id = 'pick'; el.className = 'pick';
  const canDel = m.sender_id == me.id || gcMod();
  el.innerHTML = `<div class="pe">${['👍', '❤️', '😂', '😮', '😢', '🙏'].map(e => `<span onclick="gcReact(${id},'${e}')">${e}</span>`).join('')}</div><div class="pa">${gcCanSend() ? `<div onclick="gcSetReply(${id});closePick()">Reply</div>` : ''}${m.body ? `<div onclick="gcCopy(${id})">Copy</div>` : ''}${canDel ? `<div onclick="gcDel(${id})">Delete</div>` : ''}</div>`;
  const bd = document.createElement('div');
  bd.id = 'pickbd'; bd.className = 'pickbd'; bd.onclick = closePick;
  document.body.appendChild(bd); document.body.appendChild(el);
  const h = el.offsetHeight, w = el.offsetWidth;
  let top = b.top - h - 8; if (top < 60) top = b.bottom + 8;
  el.style.top = top + 'px'; el.style.left = Math.max(8, Math.min(innerWidth - w - 8, b.left)) + 'px';
}

function gcCopy(id) {
  const m = GC.msgs.find(x => x.id == id); closePick();
  if (m && navigator.clipboard) navigator.clipboard.writeText(m.body).then(() => toast('Copied'));
}

function gcSetReply(id) {
  if (!gcCanSend()) return;
  GC.rep = GC.msgs.find(x => x.id == id) || null;
  gcPre();
  const i = $('#gi'); if (i) i.focus();
}

async function gcReact(id, emoji) {
  closePick();
  const list = GC.reacts[id] || [], mine = list.find(r => r.user_id == me.id), same = mine && mine.emoji == emoji;
  GC.reacts[id] = list.filter(r => r.user_id != me.id);
  if (!same) GC.reacts[id].push({ message_id: id, user_id: me.id, emoji });
  gcDraw(true);
  let err = null;
  if (mine) { const r = await sb.from('community_message_reactions').delete().eq('message_id', id).eq('user_id', me.id); err = r.error; }
  if (!err && !same) { const r = await sb.from('community_message_reactions').insert({ message_id: id, user_id: me.id, emoji }); err = r.error; }
  if (err) { toast(err.message); gcLoadReacts(true); }
}

async function gcDel(id) {
  closePick();
  const m = GC.msgs.find(x => x.id == id); if (!m) return;
  if (!confirm('Delete this message for everyone?')) return;
  const { data, error } = await sb.from('community_messages').delete().eq('id', id).select('id');
  if (error) { toast(error.message); return; }
  if (!data || !data.length) { toast('You are not allowed to delete this message'); return; }
  if (m.image_url && m.sender_id == me.id) sb.storage.from('community-chat').remove([m.image_url]).then(() => {});
  GC.msgs = GC.msgs.filter(x => x.id != id);
  if (GC.rep && GC.rep.id == id) { GC.rep = null; gcPre(); }
  gcDraw(true);
}

function gcGest() {
  const g = $('#cmsgs'); if (!g) return;
  let st = null, lp = null;
  g.onpointerdown = e => {
    const r = e.target.closest('.mr'); if (!r || e.target.closest('audio,.rx,.rq,img')) return;
    st = { r, x: e.clientX, y: e.clientY, dx: 0, sw: false };
    lp = setTimeout(() => { if (st && !st.sw) { const r2 = st.r; st = null; gcShowPick(r2, +r2.dataset.id); if (navigator.vibrate) navigator.vibrate(15); } }, 450);
  };
  g.onpointermove = e => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.sw && Math.abs(dy) > 10) { clearTimeout(lp); st = null; return; }
    if (dx > 8 && Math.abs(dy) < 12) { st.sw = true; clearTimeout(lp); st.dx = Math.min(dx, 70); const b = st.r.querySelector('.mb'); b.style.transition = 'none'; b.style.transform = 'translateX(' + st.dx + 'px)'; }
    else if (!st.sw && Math.abs(dx) > 10) { clearTimeout(lp); st = null; }
  };
  const end = () => {
    clearTimeout(lp);
    if (st) { const b = st.r.querySelector('.mb'); b.style.transition = ''; b.style.transform = ''; if (st.sw && st.dx >= 55) gcSetReply(+st.r.dataset.id); }
    st = null;
  };
  g.onpointerup = end; g.onpointercancel = end; g.onpointerleave = end;
  g.oncontextmenu = e => { const r = e.target.closest('.mr'); if (r) { e.preventDefault(); gcShowPick(r, +r.dataset.id); } };
}

async function gcSend() {
  if (GC.sending) return;
  const i = $('#gi'), t = i ? i.value.trim() : '';
  if ((!t && !GC.att) || !gcCanSend()) return;
  GC.sending = true;
  try {
    let path = null;
    if (GC.att) {
      toast('Sending photo…');
      const blob = await compress(GC.att);
      path = GC.c.id + '/' + me.id + '/' + Date.now() + '.jpg';
      const up = await sb.storage.from('community-chat').upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
    }
    const { data, error } = await sb.from('community_messages')
      .insert({ community_id: GC.c.id, sender_id: me.id, body: t, image_url: path, reply_to: GC.rep ? GC.rep.id : null })
      .select('id,sender_id,body,image_url,reply_to,created_at').single();
    if (error) throw error;
    if (i) i.value = '';
    GC.rep = null; GC.att = null; gcPre();
    await gcAdd(data);
  } catch (e) {
    toast(e.code === '42501' ? 'You are not allowed to send messages here' : 'Not sent: ' + (e.message || e));
  }
  GC.sending = false;
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
    if (tab != 'cview') { gcLeave(); closePick(); if (tab != 'user') GC.cid = null; }
    return prev.apply(this, arguments);
  };
})();
