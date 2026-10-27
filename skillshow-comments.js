/* Skillshow Comments and Replies */
(function () {
  'use strict';

  const app = window.SkillshowBridge;

  if (!app) {
    console.error(
      'Skillshow Comments: SkillshowBridge is missing.'
    );
    return;
  }

  const { sb } = app;

  function esc(value) {
    return app.esc(value ?? '');
  }

  function notify(message) {
    app.toast(message);
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

    return data || [];
  }

  function commentHTML(comment, comments, postId) {
    const profile = comment.profiles || {};
    const replies = comments.filter(
      item =>
        String(item.parent_comment_id) === String(comment.id)
    );

    const name = profile.full_name || profile.username || 'Member';
    const avatar = profile.avatar_url
      ? `<img src="${esc(profile.avatar_url)}" alt="">`
      : esc(name.charAt(0).toUpperCase());

    return `
      <div class="ss-comment"
           id="ss-comment-${esc(comment.id)}">

        <div class="av">${avatar}</div>

        <div style="flex:1;min-width:0">
          <div class="ss-comment-bubble">
            <b>${esc(name)}</b>
            <div>${esc(comment.body)}</div>
          </div>

          <div class="ss-comment-actions">
            <button type="button"
              onclick="SkillshowComments.reply('${esc(postId)}','${esc(comment.id)}')">
              Reply
            </button>

            ${replies.length
              ? `<span>${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</span>`
              : ''}
          </div>

          <div id="ss-reply-form-${esc(comment.id)}" hidden>
            <input class="fi"
              id="ss-reply-input-${esc(comment.id)}"
              maxlength="500"
              placeholder="Write a reply">

            <button class="lk" type="button"
              onclick="SkillshowComments.submitReply('${esc(postId)}','${esc(comment.id)}')">
              Post reply
            </button>
          </div>

          <div class="ss-replies">
            ${replies.map(reply =>
              commentHTML(reply, comments, postId)
            ).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderComments(postId) {
    const comments = app.cdata[postId] || [];
    const roots = comments.filter(
      comment => !comment.parent_comment_id
    );

    return `
      <div class="cm ss-comment-thread">
        ${roots.length
          ? roots.map(comment =>
              commentHTML(comment, comments, postId)
            ).join('')
          : '<p>No comments yet. Be the first to comment.</p>'}

        <div class="cin">
          <input class="fi"
            id="ci${esc(postId)}"
            maxlength="500"
            placeholder="Add a comment">

          <button class="lk" type="button"
            onclick="SkillshowComments.submitComment('${esc(postId)}')">
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
      notify('Write a comment first.');
      return;
    }

    if (body.length > 500) {
      notify('Comments are limited to 500 characters.');
      return;
    }

    const user = app.me;

    if (!user) {
      notify('Please sign in first.');
      return;
    }

    const comment = {
      post_id: Number(postId),
      user_id: user.id,
      body: body
    };

    if (parentId !== null) {
      comment.parent_comment_id = Number(parentId);
    }

    const { error } = await sb
      .from('comments')
      .insert(comment);

    if (error) {
      console.error('Could not post comment:', error);
      notify('Could not post comment: ' + error.message);
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

  window.SkillshowComments = {
    refresh,
    reply,
    submitComment: postId => submit(postId),
    submitReply: (postId, commentId) =>
      submit(postId, commentId)
  };

  // Connect to the existing Skillshow comment functions.
  window.getC = getComments;
  window.cHtml = renderComments;

  console.log('Skillshow Comments loaded.');
})();
