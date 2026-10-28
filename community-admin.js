/* Skillshow Community - STEP 3: admin controls.
   Load AFTER community.js. Adds: appoint/remove admins, remove members,
   lock/unlock, everyone/admins-only mode, tap-a-member menu, live updates. */

GC.cs = null;

function gcBar() {
  GC.cs = gcCanSend();
  if (!GC.cs) {
    const why = GC.c.is_locked ? 'This community is locked. Only the creator and admins can send messages.' : 'Only the creator and admins can send messages here.';
    return `<div class="cbar" id="gbar"><div class="co" style="text-align:center;padding:8px 4px">${why}</div></div>`;
  }
  return `<div class="cbar" id="gbar"><div id="gpre"></div><div class="crow"><button class="x" onclick="$('#gca').click()">${IMG}</button><input class="fi" id="gi" placeholder="Message…" maxlength="2000" onkeydown="if(event.key==='Enter')gcSend()"><button class="jb ib" onclick="gcSend()">${SND}</button></div><input type="file" id="gca" accept="image/*" hidden onchange="gcPickAtt(this)"></div>`;
}

function gcBarSync() {
  const can = gcCanSend();
  if (can !== GC.cs && GC.tab == 'chat' && gcMember()) {
    const b = $('#gbar');
    if (b) { b.outerHTML = gcBar(); gcPre(); }
  }
  GC.cs = can;
  gcDraw(true);
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
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_members' }, () => gcRefresh())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'communities', filter: 'id=eq.' + id }, p => gcCommUpd(p.new))
    .subscribe();
}

function gcCommUpd(n) {
  if (!GC.c || GC.c.id != n.id) return;
  Object.assign(GC.c, { is_locked: n.is_locked, messaging_mode: n.messaging_mode, name: n.name, description: n.description });
  gcHead(); gcBarSync();
  if (GC.tab == 'members') gcBody();
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
  gcHead(); gcBarSync();
  if (GC.tab == 'members') gcBody();
}

function gcMembersView() {
  const f = $('#feed'); if (!f) return;
  const rank = { creator: 0, admin: 1, member: 2 };
  const list = [...GC.members].sort((a, b) => rank[gcRole(a.user_id)] - rank[gcRole(b.user_id)] || new Date(a.joined_at) - new Date(b.joined_at));
  const c = GC.c, owner = c.creator_id == me.id;
  let h = c.description ? `<p class="co" style="padding:4px 14px 10px">${esc(c.description)}</p>` : '';
  if (owner) h += `<div style="padding:0 14px 10px"><button class="btn o" onclick="gcSettings()">Community settings</button><small class="co" style="display:block;margin-top:6px">Messaging: ${c.messaging_mode == 'admins_only' ? 'Admins only' : 'Everyone'} · ${c.is_locked ? 'Locked' : 'Unlocked'}</small></div>`;
  h += list.map(m => {
    const p = gcP(m.user_id), r = gcRole(m.user_id);
    return `<div class="lr" onclick="gcMemberSheet('${esc(m.user_id)}')"><div class="av">${avt(p.avatar_url, p.full_name)}</div><div style="flex:1;min-width:0"><b>${esc(p.full_name)}${m.user_id == me.id ? ' (You)' : ''}</b><small>@${esc(p.username)}</small></div>${r != 'member' ? `<span class="pill ok">${r == 'creator' ? 'Creator' : 'Admin'}</span>` : ''}</div>`;
  }).join('');
  h += '<div style="padding:14px">';
  if (gcMember() && !owner) h += `<button class="btn o" onclick="toggleJoin(${c.id})">Leave community</button>`;
  if (owner) h += `<button class="lk" style="padding-left:0" onclick="delComm(${c.id})">Delete this community</button>`;
  h += '</div>';
  f.innerHTML = h;
}

function gcMemberSheet(uid) {
  if (uid == me.id) { openUser(uid); return; }
  const p = gcP(uid), r = gcRole(uid), owner = GC.c.creator_id == me.id;
  let h = `<h3>${esc(p.full_name)}</h3><p class="co" style="margin-bottom:12px">@${esc(p.username)}${r != 'member' ? ' · ' + (r == 'creator' ? 'Creator' : 'Admin') : ''}</p>`;
  h += `<button class="btn" style="margin-bottom:8px" onclick="closeNew();openChat('${esc(uid)}')">Send message</button>`;
  h += `<button class="btn o" style="margin-bottom:8px" onclick="closeNew();openUser('${esc(uid)}')">View profile</button>`;
  if (owner && r != 'creator') {
    h += r == 'admin'
      ? `<button class="btn o" style="margin-bottom:8px" onclick="gcSetRole('${esc(uid)}','member')">Remove as admin</button>`
      : `<button class="btn o" style="margin-bottom:8px" onclick="gcSetRole('${esc(uid)}','admin')">Make admin</button>`;
    h += `<button class="btn o" style="color:#ED4956" onclick="gcKick('${esc(uid)}')">Remove from community</button>`;
  }
  sheetOpen(h);
}

async function gcSetRole(uid, role) {
  const { data, error } = await sb.from('community_members').update({ role }).eq('community_id', GC.c.id).eq('user_id', uid).select('user_id');
  closeNew();
  if (error) { toast(error.message); return; }
  if (!data || !data.length) { toast('Could not change this role'); return; }
  toast(role == 'admin' ? 'Made admin' : 'Admin removed');
  gcRefresh();
}

async function gcKick(uid) {
  const p = gcP(uid);
  if (!confirm('Remove ' + p.full_name + ' from this community?')) return;
  const { data, error } = await sb.from('community_members').delete().eq('community_id', GC.c.id).eq('user_id', uid).select('user_id');
  closeNew();
  if (error) { toast(error.message); return; }
  if (!data || !data.length) { toast('Could not remove this member'); return; }
  toast('Member removed');
  gcRefresh();
}

function gcSettings() {
  const c = GC.c, ev = c.messaging_mode != 'admins_only';
  sheetOpen(`<h3>Community settings</h3>
<div class="lbl">Who can send messages</div>
<button class="btn ${ev ? '' : 'o'}" style="margin:6px 0" onclick="gcSet({messaging_mode:'everyone'})">${ev ? '✓ ' : ''}Everyone</button>
<button class="btn ${ev ? 'o' : ''}" style="margin:0 0 14px" onclick="gcSet({messaging_mode:'admins_only'})">${ev ? '' : '✓ '}Admins only</button>
<div class="lbl">Lock</div>
<p class="co" style="margin:4px 0 8px">Locking pauses the chat for everyone except you and your admins. Unlock to go back to the setting above.</p>
<button class="btn ${c.is_locked ? '' : 'o'}" onclick="gcSet({is_locked:${!c.is_locked}})">${c.is_locked ? 'Unlock community' : 'Lock community'}</button>`);
}

async function gcSet(patch) {
  const { data, error } = await sb.from('communities').update(patch).eq('id', GC.c.id).select('id,is_locked,messaging_mode');
  closeNew();
  if (error) { toast(error.message); return; }
  if (!data || !data.length) { toast('Could not update settings'); return; }
  Object.assign(GC.c, data[0]);
  gcHead(); gcBarSync();
  if (GC.tab == 'members') gcBody();
  toast('Updated');
}
