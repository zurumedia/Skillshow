
/* SkillShow Messages — Inbox UI v1.0 */
(function () {
  "use strict";

  const STYLE_ID = "skillshow-messages-style";
  const HOST = '[data-skillshow-messages]';

  let conversations = [];
  let filter = "all";
  let search = "";

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function initials(name) {
    return String(name || "?").trim()
      .split(/\s+/).slice(0, 2)
      .map(word => word[0] || "").join("").toUpperCase();
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .skmsg { color:#fff; font-family:inherit; width:100%; }
      .skmsg * { box-sizing:border-box; }
      .skmsg-head {
        display:flex; justify-content:space-between;
        align-items:center; gap:10px; margin-bottom:16px;
      }
      .skmsg-title { font-size:27px; font-weight:800; margin:0; }
      .skmsg-sub { color:#8A9BB3; font-size:13px; margin-top:5px; }
      .skmsg-btn {
        background:#152642; color:#fff;
        border:1px solid #30425d; border-radius:13px;
        padding:10px 13px; cursor:pointer;
      }
      .skmsg-search {
        width:100%; padding:14px;
        background:#152642; color:#fff;
        border:1px solid #30425d; border-radius:14px;
        font-size:14px; margin-bottom:15px;
      }
      .skmsg-filters {
        display:flex; gap:8px; overflow-x:auto;
        margin-bottom:12px; padding-bottom:4px;
      }
      .skmsg-filter {
        flex-shrink:0; border:1px solid #30425d;
        background:#152642; color:#8A9BB3;
        border-radius:22px; padding:9px 15px;
        cursor:pointer;
      }
      .skmsg-filter.active {
        background:#C9A86A; color:#0F203A;
        border-color:#C9A86A; font-weight:700;
      }
      .skmsg-online {
        display:flex; gap:14px; overflow-x:auto;
        padding:5px 0 17px;
      }
      .skmsg-person {
        flex:0 0 62px; text-align:center;
        background:none; color:#8A9BB3;
        border:0; font-size:11px; cursor:pointer;
      }
      .skmsg-avatar {
        position:relative; display:flex;
        align-items:center; justify-content:center;
        width:52px; height:52px; margin:0 auto 6px;
        border-radius:50%; background:#263d5c;
        border:2px solid #C9A86A; overflow:hidden;
        font-size:15px; font-weight:700; color:white;
      }
      .skmsg-avatar img { width:100%; height:100%; object-fit:cover; }
      .skmsg-dot {
        position:absolute; right:0; bottom:0;
        width:13px; height:13px; border-radius:50%;
        background:#35C982; border:2px solid #0F203A;
      }
      .skmsg-row {
        display:flex; align-items:center; gap:12px;
        width:100%; padding:14px 2px;
        border:0; border-top:1px solid #293a53;
        background:transparent; color:#fff;
        text-align:left; cursor:pointer;
      }
      .skmsg-row .skmsg-avatar {
        flex-shrink:0; margin:0; width:53px; height:53px;
      }
      .skmsg-info { flex:1; min-width:0; }
      .skmsg-top { display:flex; justify-content:space-between; gap:8px; }
      .skmsg-name {
        font-size:14px; font-weight:750;
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .skmsg-time { color:#8A9BB3; font-size:11px; white-space:nowrap; }
      .skmsg-preview {
        display:block; color:#8A9BB3; font-size:12px;
        overflow:hidden; text-overflow:ellipsis;
        white-space:nowrap; margin-top:6px;
      }
      .skmsg-unread {
        display:inline-flex; align-items:center;
        justify-content:center; min-width:20px;
        height:20px; padding:0 6px; border-radius:20px;
        background:#2584FF; color:white; font-size:11px;
      }
      .skmsg-empty {
        padding:32px 15px; text-align:center;
        border:1px dashed #30425d; border-radius:16px;
        color:#8A9BB3; line-height:1.6;
      }
      .skmsg-empty strong { display:block; color:white; margin-bottom:6px; }
    `;
    document.head.appendChild(style);
  }

  function normalize(item, index) {
    return {
      id: String(item.id ?? item.conversation_id ?? index),
      name: item.name || item.full_name || item.display_name ||
        item.username || "SkillShow member",
      avatar: item.avatar || item.avatar_url ||
        item.profile_photo || "",
      online: Boolean(item.online || item.is_online),
      message: item.lastMessage || item.last_message ||
        item.preview || "",
      time: item.lastAt || item.last_message_at ||
        item.updated_at || item.created_at || "",
      unread: Number(item.unread || item.unread_count || 0),
      group: Boolean(item.is_group || item.isGroup),
      request: Boolean(item.is_request || item.request),
      pinned: Boolean(item.is_pinned || item.pinned),
      raw: item
    };
  }

  function avatar(c) {
    const photo = c.avatar
      ? `<img src="${escapeHTML(c.avatar)}" alt="" loading="lazy">`
      : escapeHTML(initials(c.name));

    return `<span class="skmsg-avatar">${photo}${
      c.online ? '<i class="skmsg-dot"></i>' : ""
    }</span>`;
  }

  function timeLabel(value) {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";
    if (date.toDateString() === new Date().toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "numeric", minute: "2-digit"
      });
    }
    return date.toLocaleDateString([], {
      day: "numeric", month: "short"
    });
  }

  function render() {
    const host = document.querySelector(HOST);
    if (!host) return;

    const query = search.toLowerCase().trim();
    const list = conversations.filter(c => {
      if (filter === "unread" && !c.unread) return false;
      if (filter === "groups" && !c.group) return false;
      if (filter === "requests" && !c.request) return false;
      return !query ||
        (c.name + " " + c.message).toLowerCase().includes(query);
    }).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.time || 0) - new Date(a.time || 0);
    });

    const online = conversations.filter(c => c.online && !c.group);

    host.innerHTML = `
      <section class="skmsg">
        <header class="skmsg-head">
          <div>
            <h2 class="skmsg-title">Messages</h2>
            <div class="skmsg-sub">Stay connected on SkillShow</div>
          </div>
          <button class="skmsg-btn" data-action="new"
            aria-label="New message">＋</button>
        </header>

        <input class="skmsg-search" type="search"
          placeholder="⌕  Search people or messages..."
          aria-label="Search messages"
          value="${escapeHTML(search)}">

        ${online.length ? `
          <div class="skmsg-online">
            ${online.map(c => `
              <button class="skmsg-person" data-open="${escapeHTML(c.id)}">
                ${avatar(c)}
                <span>${escapeHTML(c.name)}</span>
              </button>
            `).join("")}
          </div>` : ""}

        <nav class="skmsg-filters" aria-label="Inbox filters">
          ${[
            ["all", "All"],
            ["unread", "Unread"],
            ["groups", "Groups"],
            ["requests", "Requests"]
          ].map(([key, label]) => `
            <button class="skmsg-filter ${filter === key ? "active" : ""}"
              data-filter="${key}" aria-pressed="${filter === key}">
              ${label}${key === "unread" ?
                " (" + conversations.filter(c => c.unread > 0).length + ")" : ""}
            </button>
          `).join("")}
        </nav>

        ${list.length ? list.map(c => `
          <button class="skmsg-row" data-open="${escapeHTML(c.id)}">
            ${avatar(c)}
            <span class="skmsg-info">
              <span class="skmsg-top">
                <span class="skmsg-name">${escapeHTML(c.name)}</span>
                <span class="skmsg-time">${escapeHTML(timeLabel(c.time))}</span>
              </span>
              <span class="skmsg-preview">
                ${c.group ? "Group · " : ""}${escapeHTML(c.message || "Start a conversation")}
              </span>
            </span>
            ${c.unread > 0 ? `<span class="skmsg-unread">${c.unread > 99 ? "99+" : c.unread}</span>` : ""}
          </button>
        `).join("") : `
          <div class="skmsg-empty">
            <strong>${search ? "No matching messages" :
              filter === "unread" ? "You're all caught up" :
              "Your inbox is ready"}</strong>
            ${search ? "Try another search." :
              "Your real conversations will appear here once connected."}
          </div>
        `}
      </section>
    `;
  }

  function mount() {
    const host = document.querySelector(HOST);
    if (!host) {
      console.warn("SkillShow Messages: inbox container not found.");
      return false;
    }
    addStyles();
    render();
    return true;
  }

  document.addEventListener("click", event => {
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      filter = filterButton.dataset.filter;
      render();
      return;
    }

    const openButton = event.target.closest("[data-open]");
    if (openButton) {
      const conversation = conversations.find(
        c => c.id === openButton.dataset.open
      );
      document.dispatchEvent(new CustomEvent(
        "skillshow:open-conversation",
        { detail: { conversation: conversation?.raw || { id: openButton.dataset.open } } }
      ));
      if (typeof window.onSkillShowOpenConversation === "function") {
        window.onSkillShowOpenConversation(conversation?.raw);
      }
      return;
    }

    if (event.target.closest('[data-action="new"]')) {
      document.dispatchEvent(new CustomEvent("skillshow:new-message"));
      if (typeof window.onSkillShowNewMessage === "function") {
        window.onSkillShowNewMessage();
      }
    }
  });

  document.addEventListener("input", event => {
    if (event.target.matches(".skmsg-search")) {
      search = event.target.value;
      const start = event.target.selectionStart;
      render();
      const input = document.querySelector(HOST + " .skmsg-search");
      input?.focus();
      try { input?.setSelectionRange(start, start); } catch (_) {}
    }
  });

  window.SkillShowMessages = {
    mount,
    setConversations(items) {
      conversations = (Array.isArray(items) ? items : []).map(normalize);
      render();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
        
