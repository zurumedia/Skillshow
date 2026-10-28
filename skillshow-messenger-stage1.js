/* SkillShow Messenger Stage 1
   Inbox enhancement only.
   Preserves existing messaging logic and Supabase data.
*/
(function () {
  "use strict";

  if (window.__ssMessengerStage1) return;
  window.__ssMessengerStage1 = true;

  const LIST_ID = "clistm";
  const BAR_ID = "ssm-stage1-toolbar";
  const STYLE_ID = "ssm-stage1-style";
  const STORAGE_KEY = "ssm-stage1-pinned";

  let pinned = new Set();
  let searchText = "";
  let filter = "all";
  let list = null;
  let listObserver = null;
  let pageObserver = null;
  let scheduled = false;

  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    if (Array.isArray(saved)) pinned = new Set(saved);
  } catch (_) {}

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BAR_ID} {
        padding: 18px 14px 14px;
        color: #fff;
        background: #0F203A;
        font-family: inherit;
      }
      #${BAR_ID} * { box-sizing: border-box; }
      #${BAR_ID} .ss-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      #${BAR_ID} h2 {
        margin: 0;
        color: #fff;
        font-size: 25px;
        font-weight: 800;
      }
      #${BAR_ID} .ss-count {
        color: #C9A86A;
        background: #152642;
        padding: 6px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
      }
      #${BAR_ID} .ss-sub {
        margin: 7px 0 15px;
        color: #8A9BB3;
        font-size: 13px;
      }
      #${BAR_ID} .ss-search {
        width: 100%;
        min-height: 46px;
        padding: 12px 14px;
        border: 1px solid #30415B;
        border-radius: 14px;
        outline: none;
        background: #152642;
        color: #fff;
        font: inherit;
        font-size: 14px;
      }
      #${BAR_ID} .ss-search:focus {
        border-color: #C9A86A;
      }
      #${BAR_ID} .ss-label {
        margin: 15px 0 9px;
        color: #8A9BB3;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1px;
      }
      #${BAR_ID} .ss-filters {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }
      #${BAR_ID} .ss-filter {
        flex-shrink: 0;
        padding: 9px 15px;
        border: 1px solid #30415B;
        border-radius: 24px;
        background: #152642;
        color: #8A9BB3;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
      }
      #${BAR_ID} .ss-filter.active {
        border-color: #C9A86A;
        background: #C9A86A;
        color: #0F203A;
      }
      #${LIST_ID} > .lr.ssm-pinned {
        background: #152642;
      }
      #${LIST_ID} > .lr .ss-pin {
        flex: 0 0 auto;
        margin-left: auto;
        padding: 7px;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: #C9A86A;
        font-size: 18px;
      }
      #ss-stage1-empty {
        display: none;
        padding: 25px 16px;
        text-align: center;
        color: #fff;
        background: #0F203A;
      }
      #ss-stage1-empty p {
        margin: 7px 0 0;
        color: #8A9BB3;
        font-size: 13px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }
    function getRows() {
    if (!list) return [];
    return Array.from(list.children).filter(
      row => row.classList.contains("lr")
    );
  }

  function getKey(row, index) {
    return String(
      row.dataset.conversationId ||
      row.dataset.chatId ||
      row.id ||
      (
        (row.querySelector("b")?.textContent || "").trim() +
        "|" +
        (row.querySelector("img")?.getAttribute("src") || "") +
        "|" +
        index
      )
    );
  }

  function unread(row) {
    return row.dataset.unread === "true" ||
      row.classList.contains("unread") ||
      row.classList.contains("is-unread");
  }

  function makeToolbar() {
    let bar = document.getElementById(BAR_ID);
    if (bar) return bar;

    bar = document.createElement("section");
    bar.id = BAR_ID;
    bar.innerHTML = `
      <div class="ss-head">
        <h2>Messages</h2>
        <span class="ss-count" id="ss-stage1-count">0 chats</span>
      </div>
      <p class="ss-sub">
        Your conversations, all in one place.
      </p>
      <input
        class="ss-search"
        id="ss-stage1-search"
        type="search"
        placeholder="Search conversations..."
        aria-label="Search conversations"
      >
      <p class="ss-label">INBOX</p>
      <div class="ss-filters">
        <button class="ss-filter active" data-filter="all"
          aria-pressed="true" type="button">All</button>
        <button class="ss-filter" data-filter="unread"
          aria-pressed="false" type="button">Unread</button>
        <button class="ss-filter" data-filter="pinned"
          aria-pressed="false" type="button">Pinned</button>
      </div>
    `;

    bar.querySelector("#ss-stage1-search").addEventListener(
      "input",
      event => {
        searchText = event.target.value.toLowerCase().trim();
        applyFilters();
      }
    );

    bar.querySelector(".ss-filters").addEventListener(
      "click",
      event => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;

        filter = button.dataset.filter;

        bar.querySelectorAll("[data-filter]").forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });

        applyFilters();
      }
    );

    return bar;
  }

  function applyFilters() {
    if (!list || !list.isConnected) return;

    const rows = getRows();
    let visible = 0;

    rows.forEach((row, index) => {
      const key = getKey(row, index);
      const isPinned = pinned.has(key);
      const isUnread = unread(row);

      row.classList.toggle("ssm-pinned", isPinned);

      let pin = row.querySelector(".ss-pin");

      if (!pin) {
        pin = document.createElement("button");
        pin.type = "button";
        pin.className = "ss-pin";
        pin.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();

          const currentRows = getRows();
          const currentIndex = currentRows.indexOf(row);
          const currentKey = getKey(row, currentIndex);

          if (pinned.has(currentKey)) {
            pinned.delete(currentKey);
          } else {
            pinned.add(currentKey);
          }

          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(Array.from(pinned))
            );
          } catch (_) {}

          applyFilters();
        });

        row.appendChild(pin);
      }

      pin.textContent = isPinned ? "★" : "☆";
      pin.title = isPinned ? "Unpin conversation" : "Pin conversation";
      pin.setAttribute("aria-label", pin.title);
      pin.setAttribute("aria-pressed", String(isPinned));

      const text = (row.textContent || "").toLowerCase();
      const matchesSearch = !searchText || text.includes(searchText);

      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && isUnread) ||
        (filter === "pinned" && isPinned);

      const show = matchesSearch && matchesFilter;
      row.style.display = show ? "" : "none";

      if (show) visible++;
    });

    const count = document.getElementById("ss-stage1-count");
    if (count) {
      count.textContent = filter === "unread"
        ? visible + " unread"
        : filter === "pinned"
          ? visible + " pinned"
          : rows.length + (rows.length === 1 ? " chat" : " chats");
    }

    let empty = document.getElementById("ss-stage1-empty");

    if (!empty) {
      empty = document.createElement("div");
      empty.id = "ss-stage1-empty";
      empty.innerHTML = "<strong></strong><p></p>";
      list.insertAdjacentElement("afterend", empty);
    }

    if (visible === 0) {
      empty.querySelector("strong").textContent =
        rows.length === 0 ? "Your inbox is ready" : "No conversations found";

      empty.querySelector("p").textContent =
        rows.length === 0
          ? "Your existing conversations will appear here."
          : "Try another search or inbox filter.";

      empty.style.display = "block";
    } else {
      empty.style.display = "none";
    }
  }

  function enhance() {
    const found = document.getElementById(LIST_ID);
    if (!found || !found.parentNode) return;

    addStyles();

    if (found !== list) {
      if (listObserver) listObserver.disconnect();
      list = found;

      listObserver = new MutationObserver(() => {
        applyFilters();
      });

      listObserver.observe(list, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class", "data-unread"]
      });
    }

    const toolbar = makeToolbar();

    if (
      toolbar.parentNode !== found.parentNode ||
      toolbar.nextElementSibling !== found
    ) {
      found.parentNode.insertBefore(toolbar, found);
    }

    applyFilters();
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;

    Promise.resolve().then(() => {
      scheduled = false;

      const found = document.getElementById(LIST_ID);

      if (
        found !== list ||
        (found && !document.getElementById(BAR_ID))
      ) {
        enhance();
      }
    });
  }

  function start() {
    enhance();

    if (document.body) {
      pageObserver = new MutationObserver(scheduleEnhance);
      pageObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    window.SkillShowMessengerStage1 = {
      refresh: enhance
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
