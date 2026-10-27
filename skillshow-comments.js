
/* Skillshow Facebook-Style Comments */
(function () {
  'use strict';

  const app = window.SkillshowBridge;

  if (!app) {
    console.error('Skillshow Comments: SkillshowBridge is missing.');
    return;
  }

  const { sb } = app;

  // Facebook-inspired dark comment interface.
  if (!document.getElementById('ss-facebook-comments-css')) {
    const style = document.createElement('style');
    style.id = 'ss-facebook-comments-css';
    style.textContent = `
      .ss-comment-thread {
        color: #e8edf6;
        padding: 14px 0;
        font-family: inherit;
      }

      .ss-comment-thread * { box-sizing: border-box; }

      .ss-comment-thread button {
        font: inherit;
        cursor: pointer;
        border: 0;
        -webkit-tap-highlight-color: transparent;
      }

      .ss-comment {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 16px 0;
        min-width: 0;
      }

      .ss-comment .av {
        flex: 0 0 40px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: #29364b;
        color: #fff;
        font-weight: 700;
        font-size: 15px;
      }

      .ss-comment .av img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ss-comment-content {
        flex: 1;
        min-width: 0;
      }

      .ss-comment-bubble {
        display: inline-block;
        max-width: 100%;
        min-width: 100px;
        padding: 10px 14px;
        border-radius: 20px;
        background: #1a2639;
        border: 1px solid #283750;
        overflow-wrap: anywhere;
        line-height: 1.5;
      }

      .ss-comment-bubble b {
        display: block;
        margin-bottom: 3px;
        color: #f6f8fc;
        font-size: 14px;
        font-weight: 700;
      }

      .ss-comment-body {
        color: #e5ebf5;
        font-size: 14px;
        white-space: pre-wrap;
      }

      .ss-comment-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        padding: 5px 10px 0;
        color: #a5b5d1;
        font-size: 12px;
      }

      .ss-comment-actions button {
        padding: 2px 0;
        background: transparent;
        color: #a5b5d1;
        font-size: 12px;
        font-weight: 700;
      }

      .ss-comment-actions button:hover,
      .ss-comment-actions button.ss-reacted {
        color: #62a0ff;
      }

      .ss-comment-actions .ss-share-comment {
        margin-left: auto;
      }

      .ss-comment-reaction-count {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;
        color: #a5b5d1;
      }

      .ss-comment-reaction-count:empty { display: none; }

      .ss-replies {
        margin: 10px 0 0 8px;
        padding-left: 13px;
        border-left: 2px solid #293b56;
      }

      .ss-replies > .ss-comment {
        gap: 8px;
        margin: 14px 0;
      }

      .ss-replies .av {
        flex-basis: 32px;
        width: 32px;
        height: 32px;
        font-size: 12px;
      }

      .ss-replies .ss-comment-bubble {
        border-radius: 17px;
        padding: 9px 12px;
      }

      .ss-reply-form {
        display: flex;
        gap: 8px;
        margin: 10px 0;
        align-items: center;
      }

      .ss-comment-thread .ss-input {
        min-width: 0;
        flex: 1;
        width: 100%;
        border: 1px solid #2c3b53;
        background: #17243a;
        color: #f4f7fc;
        border-radius: 24px;
        padding: 12px 15px;
        outline: none;
        font-size: 14px;
      }

      .ss-comment-thread .ss-input:focus {
        border-color: #568df0;
        box-shadow: 0 0 0 2px #568df026;
      }

      .ss-comment-thread .ss-input::placeholder {
        color: #91a2bf;
      }

      .ss-comment-thread .ss-post-btn {
        flex-shrink: 0;
        padding: 10px 14px;
        border-radius: 22px;
        color: #fff;
        background: #2878f0;
        font-size: 13px;
        font-weight: 700;
      }

      .ss-comment-thread .ss-post-btn:hover {
        background: #1768df;
      }

      .ss-comment-composer {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-top: 14px;
        margin-top: 16px;
        border-top: 1px solid #26354b;
      }

      .ss-comment-composer .av {
        flex-basis: 36px;
        width: 36px;
        height: 36px;
      }

      .ss-comment-composer .ss-input {
        flex: 1;
      }

      .ss-comment-empty {
        color: #96a6c0;
        font-size: 14px;
        padding: 12px 4px;
      }

      .ss-comment-share {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        color: #a9bad6;
        background: transparent;
      }

      .ss-comment-share:hover {
        background: #26354b;
      }

      @media (max-width: 480px) {
        .ss-comment { gap: 8px; }
        .ss-comment .av { flex-basis: 34px; width: 34px; height: 34px; }
        .ss-comment-bubble { padding: 9px 12px; }
        .ss-comment-actions { gap: 13px; }
        .ss-replies { margin-left: 2px; padding-left: 9px; }
      }
    `;
    document.head.appendChild(style);
  }

  function esc(value) {
    return app.esc(String(value ?? ''));
  }

  function notify(message) {
    app.toast(message);
  }

  function getProfile(comment) {
    return comment.profiles || {};
  }

  function getName(comment) {
    const profile = getProfile(comment);
    return profile.full_name || profile.username || 'Member';
  }

  function getAvatar(comment) {
    const profile = getProfile(comment);
    const name = getName(comment);

    if (profile.avatar_url) {
      return `<img src="${esc(profile.avatar_url)}" alt=""
        loading="lazy" referrerpolicy="no-referrer">`;
    }

    return esc(name.charAt(0).toUpperCase());
  }

  function formatTime(date) {
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    );

    if (!Number.isFinite(seconds)) return '';

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';

    return new Date(date).toLocaleDateString();
  }

  async function getComments(postId) {
    const { data, error } = await sb
      .from('comments')
      .select(`
        id,
        post_id,
        parent_comment_id,
        user_id,
        body,
        created_at,
        profiles!user_id(
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Could not load comments:', error);
      notify('Could not load comments.');
      return [];
    }

    const comments = data || [];
    const ids = comments.map(comment => comment.id);

    if (!ids.length) return comments;

    const user = app.me;

    const { data: reactions, error: reactionError } = await sb
      .from('comment_reactions')
      .select('comment_id, user_id, reaction')
      .in('comment_id', ids);

    if (reactionError) {
      console.error('Could not load comment reactions:', reactionError);
      // Comments remain usable if reactions have not been configured yet.
      return comments.map(comment => ({
        ...comment,
        reaction_count: 0,
        reacted_by_me: false
      }));
    }

    return comments.map(comment => {
      const matching = (reactions || []).filter(
        reaction => String(reaction.comment_id) === String(comment.id)
      );

      return {
        ...comment,
        reaction_count: matching.length,
        reacted_by_me: !!user && matching.some(
          reaction => reaction.user_id === user.id
        )
      };
    });
  }

  function commentHTML(comment, comments, postId, depth = 0) {
    // Limit display recursion to protect the interface from bad data.
    if (depth > 8) return '';

    const id = Number(comment.id);
    const replies = comments.filter(
      item => String(item.parent_comment_id) === String(comment.id)
    );

    const count = Number(comment.reaction_count || 0);
    const reacted = !!comment.reacted_by_me;
    const user = app.me;
    const isOwner = !!user && user.id === comment.user_id;

    return `
      <div class="ss-comment" id="ss-comment-${id}">
        <div class="av">${getAvatar(comment)}</div>

        <div class="ss-comment-content">
          <div class="ss-comment-bubble">
            <b>${esc(getName(comment))}</b>
            <div class="ss-comment-body">${esc(comment.body)}</div>
          </div>

          <div class="ss-comment-actions">
            <span>${esc(formatTime(comment.created_at))}</span>

            <button type="button"
              class="${reacted ? 'ss-reacted' : ''}"
              aria-pressed="${reacted}"
              onclick="SkillshowComments.react('${Number(postId)}','${id}')">
              ${reacted ? '♥ Liked' : 'Like'}
            </button>

            <button type="button"
              onclick="SkillshowComments.reply('${Number(postId)}','${id}')">
              Reply
            </button>

            <button type="button"
              class="ss-share-comment"
              aria-label="Share comment"
              title="Share comment"
              onclick="SkillshowComments.share('${Number(postId)}','${id}')">
              ↗ Share
            </button>

            ${count ? `
              <span class="ss-comment-reaction-count">
                <span>🔵</span> ${count}
              </span>` : ''}
          </div>

          <div id="ss-reply-form-${id}" class="ss-reply-form" hidden>
            <input class="ss-input"
              id="ss-reply-input-${id}"
              maxlength="500"
              placeholder="Write a reply..."
              aria-label="Write a reply"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();SkillshowComments.submitReply('${Number(postId)}','${id}')}">

            <button class="ss-post-btn" type="button"
              onclick="SkillshowComments.submitReply('${Number(postId)}','${id}')">
              Reply
            </button>
          </div>

          ${replies.length ? `
            <div class="ss-replies">
              ${replies.map(reply =>
                commentHTML(reply, comments, postId, depth + 1)
              ).join('')}
            </div>` : ''}
        </div>
      </div>
    `;
  }

  function renderComments(postId) {
    const comments = app.cdata[postId] || [];
    const roots = comments.filter(comment => !comment.parent_comment_id);
    const user = app.me;

    const composerAvatar = user
      ? `<div class="av">${esc(
          (user.user_metadata?.full_name ||
           user.user_metadata?.username ||
           user.email ||
           'M').charAt(0).toUpperCase()
        )}</div>`
      : '<div class="av">?</div>';

    return `
      <div class="cm ss-comment-thread">
        <div class="ss-comment-list">
          ${roots.length
            ? roots.map(comment =>
                commentHTML(comment, comments, postId)
              ).join('')
            : '<p class="ss-comment-empty">No comments yet. Start the conversation.</p>'}
        </div>

        <div class="ss-comment-composer">
          ${composerAvatar}
          <input class="ss-input"
            id="ci${esc(postId)}"
            maxlength="500"
            placeholder="Write a comment..."
            aria-label="Write a comment"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();SkillshowComments.submitComment('${Number(postId)}')}">

          <button class="ss-post-btn" type="button"
            onclick="SkillshowComments.submitComment('${Number(postId)}')">
            Post
          </button>
        </div>
      </div>
    `;
  }

  async function refresh(postId) {
    app.cdata[postId] = await getComments(postId);
    app.drawFeed();
  }

  async function submit(postId, parentId = null) {
    const input = document.getElementById(
      parentId === null
        ? 'ci' + postId
        : 'ss-reply-input-' + parentId
    );

    if (!input) return;

    const body = input.value.trim();

    if (!body) {
      notify('Write something first.');
      return;
    }

    if (body.length > 500) {
      notify('Comments are limited to 500 characters.');
      return;
    }

    if (!app.me) {
      notify('Please sign in to comment.');
      return;
    }

    const payload = {
      post_id: Number(postId),
      user_id: app.me.id,
      body
    };

    if (parentId !== null) {
      payload.parent_comment_id = Number(parentId);
    }

    const { error } = await sb.from('comments').insert(payload);

    if (error) {
      console.error('Could not post comment:', error);
      notify('Could not post comment. Please try again.');
      return;
    }

    await refresh(postId);
  }

  function reply(postId, commentId) {
    const form = document.getElementById(
      'ss-reply-form-' + commentId
    );

    if (!form) return;

    form.hidden = !form.hidden;

    if (!form.hidden) {
      document.getElementById(
        'ss-reply-input-' + commentId
      )?.focus();
    }
  }

  async function react(postId, commentId) {
    const user = app.me;

    if (!user) {
      notify('Please sign in to react.');
      return;
    }

    const { data: existing, error: findError } = await sb
      .from('comment_reactions')
      .select('comment_id')
      .eq('comment_id', Number(commentId))
      .eq('user_id', user.id)
      .maybeSingle();

    if (findError) {
      console.error('Could not check reaction:', findError);
      notify('Reactions are not ready yet. Check the database setup.');
      return;
    }

    let error;

    if (existing) {
      ({ error } = await sb
        .from('comment_reactions')
        .delete()
        .eq('comment_id', Number(commentId))
        .eq('user_id', user.id));
    } else {
      ({ error } = await sb
        .from('comment_reactions')
        .insert({
          comment_id: Number(commentId),
          user_id: user.id,
          reaction: 'like'
        }));
    }

    if (error) {
      console.error('Could not update reaction:', error);
      notify('Could not update reaction.');
      return;
    }

    await refresh(postId);
  }

  async function share(postId, commentId) {
    const comments = app.cdata[postId] || [];
    const comment = comments.find(
      item => String(item.id) === String(commentId)
    );

    if (!comment) {
      notify('Could not find this comment.');
      return;
    }

    const text = `${getName(comment)} on Skillshow: "${comment.body}"`;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Skillshow comment', text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        notify('Comment link copied.');
      } else {
        notify('Sharing is not supported on this browser.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Could not share comment:', error);
        notify('Could not share this comment.');
      }
    }
  }

  window.SkillshowComments = {
    refresh,
    reply,
    react,
    share,
    submitComment: postId => submit(postId),
    submitReply: (postId, commentId) => submit(postId, commentId)
  };

  // Keep compatibility with the existing Skillshow feed.
  window.getC = getComments;
  window.cHtml = renderComments;

  console.log('Skillshow Comments loaded.');
})();
          
