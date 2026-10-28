
/* SkillShow Messages — Inbox Enhancement
   Works alongside the existing index.html messaging system.
   Does not write to Supabase or replace chat functionality.
*/
(function () {
  "use strict";

  const STYLE_ID = "ss-messages-enhancement";
  const TOOLBAR_ID = "ss-messages-toolbar";

  let query = "";
  let filter = "all";
  let listObserver = null;
  let currentList = null;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${TOOLBAR_ID} {
        padding: 10px 14px 14px;
        background: var(--bg);
      }

      #${TOOLBAR_ID} .ssm-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 12px;
      }

      #${TOOLBAR_ID} .ssm-heading strong {
        font-size: 17px;
        color: var(--tx);
      }

      #${TOOLBAR_ID} .ssm-count {
        font-size: 12px;
        color: var(--mu);
      }

      #${TOOLBAR_ID} .ssm-search {
        width: 100%;
        padding: 13px 15px;
        border-radius: 14px;
        border: 1px solid var(--ln);
        background: var(--so);
        color: var(--tx);
        font: inherit;
        outline: none;
        margin-bottom: 12px;
      }

      #${TOOLBAR_ID} .ssm-search:focus {
        border-color: var(--ac);
      }

      #${TOOLBAR_ID} .ssm-filters {
        display: flex;
        gap: 9px;
      }

      #${TOOLBAR_ID} .ssm-filter {
        border: 1px solid var(--ln);
        background: var(--so);
        color: var(--mu);
        padding: 9px 17px;
        border-radius: 22px;
        font-size: 13px;
        font-weight: 650;
      }

      #${TOOLBAR_ID} .ssm-filter.active {
        background: var(--bn);
        color: var(--bt, #fff);
        border-color: var(--bn);
      }

      #clistm .lr {
        padding: 15px 14px;
        gap: 11px;
        transition: background .15s ease;
      }

      #clistm .lr:active {
        background: var(--so);
      }

      #clistm .lr .av {
        width: 48px;
        height: 48px;
        font-size: 17px;
      }

      #clistm .lr b {
        font-size: 14px;
      }

      #clistm .lr small {
        display: block;
        margin-top: 5px;
        line-height: 1.4;
      }

      @media (prefers-reduced-motion: reduce) {
        #clistm .lr { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function makeToolbar() {
    const bar = document.createElement("section");
    bar.id = TOOLBAR_ID;

    bar.innerHTML = `
      <div class="ssm-heading">
        <strong>Your conversations</strong>
        <span class="ssm-count" id="ssm-count">Chats</span>
      </div>

      <input
        class="ssm-search"
        id="ssm-search"
        type="search"
        placeholder="⌕  Search your conversations"
        aria-label="Search conversations"
      >

      <div class="ssm-filters" aria-label="Conversation filters">
        <button class="ssm-filter active"
          type="button" data-ssm-filter="all"
          aria-pressed="true">All</button>

        <button class="ssm-filter"
          type="button" data-ssm-filter="unread"
          aria-pressed="false">Unread</button>
      </div>
    `;

    bar.addEventListener("input", function (event) {
      if (event.target.id === "ssm-search") {
        query = event.target.value.toLowerCase().trim();
        applyFilters();
      }
    });

    bar.addEventListener("click", function (event) {
      const button = event.target.closest("[data-ssm-filter]");
      if (!button) return;

      filter = button.dataset.ssmFilter;

      bar.querySelectorAll("[data-ssm-filter]").forEach(function (item) {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });

      applyFilters();
    });

    return bar;
  }

  function isUnread(row) {
    const preview = row.querySelector("small");
    return !!preview &&
      preview.style.fontWeight === "700";
  }

  function applyFilters() {
    const list = document.getElementById("clistm");
    if (!list) return;

    const rows = Array.from(list.querySelectorAll(":scope > .lr"));
    let shown = 0;
    let unread = 0;

    rows.forEach(function (row) {
      const text = row.textContent.toLowerCase();
      const unreadRow = isUnread(row);

      if (unreadRow) unread++;

      const matchesSearch = !query || text.includes(query);
      const matchesFilter = filter === "all" || unreadRow;
      const visible = matchesSearch && matchesFilter;

      row.style.display = visible ? "" : "none";
      if (visible) shown++;
    });

    const count = document.getElementById("ssm-count");
    if (count) {
      count.textContent = filter === "unread"
        ? unread + " unread"
        : shown + (shown === 1 ? " chat" : " chats");
    }
  }

  function enhanceInbox() {
    const list = document.getElementById("clistm");
    if (!list) return;

    addStyles();

    let toolbar = document.getElementById(TOOLBAR_ID);

    if (!toolbar || toolbar.nextElementSibling !== list) {
      if (toolbar) toolbar.remove();

      toolbar = makeToolbar();
      list.parentNode.insertBefore(toolbar, list);
    }

    if (currentList !== list) {
      if (listObserver) listObserver.disconnect();

      currentList = list;
      listObserver = new MutationObserver(applyFilters);

      listObserver.observe(list, {
        childList: true,
        subtree: true
      });
    }

    applyFilters();
  }

  function start() {
    enhanceInbox();

    // The existing app redraws screens dynamically.
    // Watch for the Messages screen to appear again.
    const pageObserver = new MutationObserver(enhanceInbox);

    pageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Expose a small manual refresh hook.
    window.SkillShowMessages = {
      refresh: enhanceInbox
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})();
