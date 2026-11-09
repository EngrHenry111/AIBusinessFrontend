/*!
 * BizlyAI embeddable chat widget.
 * Usage: <script src="https://bislyai.com/widget.js" data-company="your-store-slug"></script>
 * Self-contained — no external dependencies, safe to drop on any website.
 */
(function () {
  var script = document.currentScript;
  var slug = script && script.getAttribute('data-company');
  if (!slug) return;

  var API = 'https://businessai-backend-6g8l.onrender.com/api/v1';

  var sessionId = localStorage.getItem('bai_session_' + slug);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('bai_session_' + slug, sessionId);
  }

  // Config values come from the business's own settings, not from this
  // widget's visitor — still HTML-escaped before going into innerHTML below
  // so a maliciously-edited company name/greeting can't inject markup.
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  fetch(API + '/widget/' + encodeURIComponent(slug) + '/config')
    .then(function (r) { return r.json(); })
    .then(function (config) {
      if (!config.success) return;
      var c = config.data;
      var isLeft = c.position === 'bottom-left';
      var side = isLeft ? 'left' : 'right';

      var widget = document.createElement('div');
      widget.id = 'bizlyai-widget';
      widget.innerHTML =
        '<style>' +
          '#bizlyai-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }' +
          '#bai-btn { position: fixed; bottom: 24px; ' + side + ': 24px; width: 56px; height: 56px; border-radius: 50%;' +
            'background: ' + esc(c.primaryColor) + '; color: white; border: none; cursor: pointer;' +
            'box-shadow: 0 4px 20px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;' +
            'z-index: 2147483000; transition: transform 0.2s;}' +
          '#bai-btn:hover { transform: scale(1.1); }' +
          '#bai-window { position: fixed; bottom: 90px; ' + side + ': 24px; width: 350px; max-width: calc(100vw - 32px);' +
            'height: 500px; max-height: calc(100vh - 140px); background: white; border-radius: 16px;' +
            'box-shadow: 0 8px 40px rgba(0,0,0,0.2); display: none; flex-direction: column;' +
            'z-index: 2147482999; overflow: hidden;}' +
          '#bai-window.open { display: flex; }' +
          '#bai-header { background: ' + esc(c.primaryColor) + '; color: white; padding: 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }' +
          '#bai-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; overflow: hidden; }' +
          '#bai-avatar img { width: 100%; height: 100%; object-fit: cover; }' +
          '#bai-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }' +
          '.bai-msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }' +
          '.bai-msg.user { background: ' + esc(c.primaryColor) + '; color: white; align-self: flex-end; border-bottom-right-radius: 4px; }' +
          '.bai-msg.bot { background: #f1f5f9; color: #1e293b; align-self: flex-start; border-bottom-left-radius: 4px; }' +
          '.bai-agent { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px; }' +
          '.bai-notice { align-self: center; max-width: 90%; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 4px 10px; }' +
          '.bai-typing { background: #f1f5f9; padding: 10px 14px; border-radius: 16px; align-self: flex-start; font-size: 14px; color: #64748b; }' +
          '#bai-input-area { padding: 12px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; flex-shrink: 0; }' +
          '#bai-input { flex: 1; padding: 8px 12px; border-radius: 20px; border: 1px solid #e2e8f0; outline: none; font-size: 14px; min-width: 0; }' +
          '#bai-send { width: 36px; height: 36px; border-radius: 50%; background: ' + esc(c.primaryColor) + '; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }' +
          '#bai-send:disabled { opacity: 0.5; cursor: default; }' +
          '#bai-footer { text-align: center; padding: 6px; font-size: 11px; color: #94a3b8; flex-shrink: 0; }' +
          '#bai-footer a { color: ' + esc(c.primaryColor) + '; text-decoration: none; }' +
          '#bai-badge { position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: none; align-items: center; justify-content: center; }' +
          '@media (max-width: 420px) { #bai-window { width: calc(100vw - 24px); right: 12px; left: 12px; bottom: 82px; } }' +
        '</style>' +
        '<button id="bai-btn" aria-label="Open chat">' +
          '<span id="bai-badge">1</span>' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>' +
        '</button>' +
        '<div id="bai-window">' +
          '<div id="bai-header">' +
            '<div id="bai-avatar">' + (c.avatar ? '<img src="' + esc(c.avatar) + '" alt="">' : esc((c.companyName || 'B')[0])) + '</div>' +
            '<div style="min-width:0">' +
              '<div style="font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.companyName) + '</div>' +
              '<div id="bai-status" style="font-size:12px;opacity:0.8">● Online — replies instantly</div>' +
            '</div>' +
            '<button id="bai-close" aria-label="Close chat" style="margin-left:auto;background:none;border:none;color:white;cursor:pointer;font-size:18px;flex-shrink:0">✕</button>' +
          '</div>' +
          '<div id="bai-messages"><div class="bai-msg bot">' + esc(c.greeting) + '</div></div>' +
          '<div id="bai-input-area">' +
            '<input id="bai-input" placeholder="' + esc(c.placeholder) + '"/>' +
            '<button id="bai-send" aria-label="Send message">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
            '</button>' +
          '</div>' +
          '<div id="bai-footer">Powered by <a href="https://bislyai.com" target="_blank" rel="noopener noreferrer">BizlyAI</a></div>' +
        '</div>';

      document.body.appendChild(widget);

      var btn = document.getElementById('bai-btn');
      var win = document.getElementById('bai-window');
      var badge = document.getElementById('bai-badge');
      var messagesEl = document.getElementById('bai-messages');
      var input = document.getElementById('bai-input');
      var sendBtn = document.getElementById('bai-send');

      function toggle() {
        win.classList.toggle('open');
        badge.style.display = 'none';
        if (win.classList.contains('open')) input.focus();
      }
      btn.addEventListener('click', toggle);
      document.getElementById('bai-close').addEventListener('click', toggle);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
      sendBtn.addEventListener('click', send);

      // The server is the source of truth: history comes back with message
      // ids, so the widget re-renders from it after every send and on a poll.
      // That is how a team member's reply (they answer from the BizlyAI
      // Inbox) reaches the visitor without a page reload.
      var HISTORY_URL = API + '/widget/' + encodeURIComponent(slug) + '/history/' + encodeURIComponent(sessionId);
      var lastKey = '';
      var hasConversation = false;
      var sending = false;
      var chatStatus = 'ai';
      var statusEl = document.getElementById('bai-status');

      function bubble(m) {
        var el = document.createElement('div');
        if (m.from === 'notice') {
          el.className = 'bai-notice';
          el.textContent = m.content;
          return el;
        }
        el.className = 'bai-msg ' + (m.role === 'user' ? 'user' : 'bot');
        if (m.from === 'team' && m.agentName) {
          var who = document.createElement('span');
          who.className = 'bai-agent';
          who.textContent = m.agentName;
          el.appendChild(who);
        }
        el.appendChild(document.createTextNode(m.content));
        return el;
      }

      function render(msgs, status) {
        var last = msgs[msgs.length - 1];
        var key = msgs.length + ':' + (last ? last.id : '') + ':' + status;
        if (key === lastKey) return false;
        lastKey = key;
        messagesEl.innerHTML = '';
        msgs.forEach(function (m) { messagesEl.appendChild(bubble(m)); });
        if (status === 'human' && last && last.role === 'user') {
          messagesEl.appendChild(bubble({ from: 'notice', content: 'Our team will reply here shortly.' }));
        }
        statusEl.textContent = status === 'human' ? '● Chatting with our team' : '● Online — replies instantly';
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return true;
      }

      function sync() {
        return fetch(HISTORY_URL)
          .then(function (r) { return r.json(); })
          .then(function (h) {
            var msgs = h && h.data && h.data.messages;
            if (!msgs || !msgs.length || sending) return;
            hasConversation = true;
            chatStatus = h.data.status || 'ai';
            var changed = render(msgs, h.data.status);
            if (changed && !win.classList.contains('open')) badge.style.display = 'flex';
          })
          .catch(function () { /* offline — try again on the next poll */ });
      }

      // Returning visitor within the 24h session window — replay history
      // instead of just showing the greeting again.
      sync();

      // Poll only once there is a conversation, never in a background tab:
      // every 5s while a team member is chatting, every 15s while the AI is
      // (its replies already come back with each send), every 30s when closed.
      var ticks = 0;
      setInterval(function () {
        ticks += 1;
        if (!hasConversation || sending || document.hidden) return;
        var every = !win.classList.contains('open') ? 6 : chatStatus === 'human' ? 1 : 3;
        if (ticks % every === 0) sync();
      }, 5000);

      setTimeout(function () {
        if (!win.classList.contains('open') && !hasConversation) badge.style.display = 'flex';
      }, 3000);

      function addLocal(el) {
        messagesEl.appendChild(el);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function send() {
        var message = input.value.trim();
        if (!message || sending) return;

        input.value = '';
        sendBtn.disabled = true;
        sending = true;
        addLocal(bubble({ role: 'user', content: message }));

        var typing = document.createElement('div');
        typing.className = 'bai-typing';
        typing.textContent = 'Typing...';
        addLocal(typing);

        fetch(API + '/widget/' + encodeURIComponent(slug) + '/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message, sessionId: sessionId }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            typing.remove();
            if (!data.success) {
              addLocal(bubble({ from: 'bot', content: data.message || 'Sorry, something went wrong. Please try again.' }));
              return;
            }
            hasConversation = true;
            sending = false;
            lastKey = '';
            return sync().then(function () {
              // History unavailable for some reason — still show the reply.
              if (lastKey === '' && data.data && data.data.reply) addLocal(bubble({ from: 'ai', content: data.data.reply }));
            });
          })
          .catch(function () {
            typing.remove();
            addLocal(bubble({ from: 'bot', content: 'Connection error. Please try again.' }));
          })
          .finally(function () { sending = false; sendBtn.disabled = false; });
      }
    })
    .catch(function () { /* config failed (widget disabled, plan limit, etc.) — stay silent, no widget renders */ });
})();
