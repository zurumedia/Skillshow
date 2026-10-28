
/* SkillShow Messenger UI — Stage 2
   Inbox enhancement only.
   Does not send, delete, or modify messages.
*/
(function () {
  "use strict";

  if (window.SkillShowMessengerStage2) return;

  var STYLE_ID = "ssm-stage2-styles";
  var TOOLBAR_ID = "ssm-stage2-toolbar";
  var listObserver = null;
  var currentList = null;
  var searchText = "";
  var activeFilter = "all";
  var scheduled = false;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${TOOLBAR_ID} {
        padding: 14px 12px;
        margin-bottom: 10px;
        border-radius: 16px;
        background: #152642;
        color: #fff;
        box-sizing: border-box;
      }

      #${TOOLBAR_ID} .ssm-title {
        font-size: 21px;
        font-weight: 750;
        margin-bottom: 4px;
      }

      #${TOOLBAR_ID} .ssm-caption {
        color: #8A9BB3;
        font-size: 13px;
        margin-bottom: 12px;
      }

      #${TOOLBAR_ID} .ssm-search {
        display: block;
        width: 100%;
        min-height: 44px;
        padding: 10px 13px;
        border: 1px solid #344967;
        border-radius: 12px;
        background: #0F203A;
        color: #fff;
        box-sizing: border-box;
        font-size: 15px;
        outline: none;
      }

      #${TOOLBAR_ID} .ssm-search:focus {
        border-color: #C9A86A;
      }

      #${TOOLBAR_ID} .ssm-filters {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      #${TOOLBAR_ID} .ssm-filter {
        padding: 8px 15px;
        border: 1px solid #344967;
        border-radius: 20px;
        background: transparent;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
      }

      #${TOOLBAR_ID} .ssm-filter.active {
        background: #C9A86A;
        border-color: #C9A86A;
        color: #0F203A;
        font-weight: 700;
      }

      #clistm .lr {
        border-radius: 12px;
        transition: background-color .15s ease;
      }

      #clistm .lr:active {
        background-color: rgba(201, 168, 106, .12);
      }

      @media (prefers-reduced-motion: reduce) {
        #clistm .lr { transition: none; }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function makeToolbar() {
    var bar = document.createElement("section");
    bar.id = TOOLBAR_ID;

    var title = document.createElement("div");
    title.className = "ssm-title";
    title.textContent = "Messages";

    var caption = document.createElement("div");
    caption.className = "ssm-caption";
    caption.textContent = "Your conversations";

    var search = document.createElement("input");
    search.className = "ssm-search";
    search.type = "search";
    search.placeholder = "Search conversations";
    search.setAttribute("aria-label", "Search conversations");

    search.addEventListener("input", function () {
      searchText = search.value.trim().toLowerCase();
      applyFilters();
    });

    var filters = document.createElement("div");
    filters.className = "ssm-filters";

    ["all", "unread"].forEach(function (name) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "ssm-filter" +
        (activeFilter === name ? " active" : "");
      button.textContent = name === "all" ? "All" : "Unread";
      button.setAttribute(
        "aria-pressed",
        activeFilter === name ? "true" : "false"
      );

      button.addEventListener("click", function () {
        activeFilter = name;
        updateFilterButtons(filters);
        applyFilters();
      });

      filters.appendChild(button);
    });

    bar.appendChild(title);
    bar.appendChild(caption);
    bar.appendChild(search);
    bar.appendChild(filters);

    return bar;
  }

  function updateFilterButtons(filters) {
    Array.from(filters.querySelectorAll("button")).forEach(function (button) {
      var selected = button.textContent.toLowerCase() === activeFilter;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function isUnread(row) {
    if (row.querySelector(
      '[aria-label*="unread" i], [data-unread="true"], .unread, .unread-count'
    )) {
      return true;
    }

    return row.getAttribute("data-unread") === "true";
  }

  function applyFilters() {
    if (!currentList || !currentList.isConnected) return;

    var rows = Array.from(currentList.children).filter(function (row) {
      return row.classList.contains("lr");
    });

    var visibleCount = 0;

    rows.forEach(function (row) {
      var matchesSearch = row.textContent
        .toLowerCase()
        .includes(searchText);

      var matchesFilter =
        activeFilter === "all" || isUnread(row);

      var visible = matchesSearch && matchesFilter;
      row.style.display = visible ? "" : "none";

      if (visible) visibleCount++;
    });

    var caption = document.querySelector(
      "#" + TOOLBAR_ID + " .ssm-caption"
    );

    if (caption) {
      caption.textContent = visibleCount +
        (visibleCount === 1 ? " conversation" : " conversations");
    }
  }

  function enhanceInbox() {
    var list = document.getElementById("clistm");
    if (!list || !list.parentNode) return;

    addStyles();

    var toolbar = document.getElementById(TOOLBAR_ID);

    if (!toolbar || toolbar.nextElementSibling !== list) {
      if (toolbar) toolbar.remove();

      toolbar = makeToolbar();
      list.parentNode.insertBefore(toolbar, list);
    }

    if (currentList !== list) {
      if (listObserver) listObserver.disconnect();

      currentList = list;
      listObserver = new MutationObserver(function () {
        applyFilters();
      });

      listObserver.observe(list, {
        childList: true,
        subtree: true
      });
    }

    applyFilters();
  }

  function scheduleEnhancement() {
    if (scheduled) return;
    scheduled = true;

    setTimeout(function () {
      scheduled = false;

      var list = document.getElementById("clistm");
      var toolbar = document.getElementById(TOOLBAR_ID);

      if (
        list &&
        (
          list !== currentList ||
          !toolbar ||
          toolbar.nextElementSibling !== list
        )
      ) {
        enhanceInbox();
      }
    }, 200);
  }

  function start() {
    enhanceInbox();

    var pageObserver = new MutationObserver(scheduleEnhancement);
    pageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.SkillShowMessengerStage2 = {
      refresh: enhanceInbox,
      destroy: function () {
        pageObserver.disconnect();
        if (listObserver) listObserver.disconnect();

        var toolbar = document.getElementById(TOOLBAR_ID);
        var style = document.getElementById(STYLE_ID);

        if (toolbar) toolbar.remove();
        if (style) style.remove();

        if (currentList) {
          Array.from(currentList.children).forEach(function (row) {
            if (row.classList.contains("lr")) {
              row.style.removeProperty("display");
            }
          });
        }

        currentList = null;
        delete window.SkillShowMessengerStage2;
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
      
