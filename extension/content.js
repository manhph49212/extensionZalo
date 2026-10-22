/**
 * Zalo AI Reader & Summarizer - Content Script
 * Injected into https://chat.zalo.me/*
 * ONLY reads messages when user explicitly clicks "Đọc tin nhắn"
 */

(function () {
  // Prevent duplicate injection
  if (window.__ZALO_AI_READER_INJECTED__) return;
  window.__ZALO_AI_READER_INJECTED__ = true;

  console.log('[Zalo AI Reader] Content script loaded on chat.zalo.me');

  // State
  let capturedMessages = [];
  let currentChatName = 'Chưa chọn cuộc trò chuyện';
  let isScanning = false;
  let isProcessingAI = false;
  let userSettings = {
    aiProvider: 'gemini',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    customEndpoint: '',
    customApiKey: '',
    customModel: ''
  };

  // Load settings from storage
  chrome.storage.local.get(userSettings, (items) => {
    userSettings = { ...userSettings, ...items };
  });

  // Inject UI once DOM is ready
  function init() {
    createFloatingWidget();
    setupChatObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 1. Create Floating Widget DOM
  function createFloatingWidget() {
    const root = document.createElement('div');
    root.id = 'zar-widget-root';
    root.innerHTML = `
      <!-- Floating Button -->
      <button id="zar-launch-btn" title="Mở Trợ lý Đọc Tin Nhắn Zalo AI">
        <svg viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2.14 21.3a1 1 0 0 0 1.23 1.23l4.23-1.24A9.95 9.95 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
        </svg>
        <span>AI Đọc Tin</span>
        <span id="zar-launch-badge">Zalo</span>
      </button>

      <!-- Main Panel -->
      <div id="zar-panel" class="zar-hidden">
        <!-- Header -->
        <div class="zar-header">
          <div class="zar-header-title">
            <span>🤖 Zalo AI Reader</span>
            <span class="zar-chat-name" id="zar-current-chat" title="Tên nhóm hiện tại">Đang nhận diện...</span>
          </div>
          <div class="zar-header-actions">
            <button class="zar-icon-btn" id="zar-settings-btn" title="Cấu hình API Key AI">⚙️</button>
            <button class="zar-icon-btn" id="zar-close-btn" title="Đóng bảng">✖</button>
          </div>
        </div>

        <!-- Body -->
        <div class="zar-body">
          <!-- Step 1: Read Section -->
          <div class="zar-box">
            <div class="zar-box-label">
              <span>Bước 1: Quét tin nhắn nhóm</span>
              <span id="zar-msg-count-tag" style="font-weight:600; color:var(--zar-primary);">0 tin</span>
            </div>
            
            <div class="zar-read-options">
              <select id="zar-read-mode" class="zar-select" title="Chọn phạm vi tin nhắn">
                <option value="visible">Chỉ các tin đang hiển thị</option>
                <option value="50" selected>Cuộn đọc 50 tin gần nhất</option>
                <option value="100">Cuộn đọc 100 tin gần nhất</option>
                <option value="200">Cuộn đọc 200 tin gần nhất</option>
              </select>
            </div>

            <button id="zar-btn-read" class="zar-read-btn">
              <span id="zar-read-btn-icon">📥</span>
              <span id="zar-read-btn-text">Đọc tin nhắn nhóm này</span>
            </button>

            <div id="zar-scan-status" class="zar-scan-status">
              <span>Chưa đọc. Hãy bấm nút trên để quét tin.</span>
            </div>

            <button id="zar-toggle-preview" class="zar-preview-btn" style="display:none; margin-top:6px;">
              👁️ Xem danh sách tin đã quét (<span id="zar-preview-count">0</span>)
            </button>
            <div id="zar-preview-list" class="zar-preview-list"></div>
          </div>

          <!-- Step 2: Prompt Section -->
          <div class="zar-box">
            <div class="zar-box-label">
              <span>Bước 2: Yêu cầu của bạn (Prompt)</span>
            </div>
            <textarea id="zar-prompt-input" class="zar-prompt-textarea" rows="3" placeholder="Nhập yêu cầu của bạn (ví dụ: Tóm tắt nội dung cuộc họp, ai nhận việc gì, có deadline nào không...)">Tóm tắt ngắn gọn các nội dung chính của cuộc trò chuyện trên, liệt kê các công việc (nếu có) và ai chịu trách nhiệm.</textarea>
            
            <!-- Quick Prompt Chips -->
            <div class="zar-chips">
              <button class="zar-chip" data-prompt="Tóm tắt ngắn gọn toàn bộ nội dung cuộc trò chuyện trên theo các ý chính.">📝 Tóm tắt nội dung</button>
              <button class="zar-chip" data-prompt="Trích xuất danh sách công việc cần làm (To-Do), người phụ trách và thời hạn (deadline) nếu có.">📋 Việc cần làm</button>
              <button class="zar-chip" data-prompt="Liệt kê các quyết định, thống nhất hoặc kết luận quan trọng đã được chốt trong nhóm.">💡 Quyết định chính</button>
              <button class="zar-chip" data-prompt="Tìm và tổng hợp tất cả các số điện thoại, số tài khoản, link website hoặc địa chỉ xuất hiện trong tin nhắn.">📞 Lọc SĐT / Link / STK</button>
              <button class="zar-chip" data-prompt="Cuộc trò chuyện này có vấn đề hay khúc mắc gì cần giải quyết không? Phân tích tình hình hiện tại.">🔍 Phân tích vấn đề</button>
            </div>

            <button id="zar-btn-ai" class="zar-ai-btn">
              <span id="zar-ai-btn-icon">✨</span>
              <span id="zar-ai-btn-text">Gửi AI Xử Lý Tin Nhắn</span>
            </button>
          </div>

          <!-- Step 3: Result Box -->
          <div id="zar-result-container" class="zar-result-box" style="display: none;">
            <div class="zar-result-header">
              <div class="zar-result-title">
                <span>🤖 Kết quả phân tích AI</span>
              </div>
              <div class="zar-result-actions">
                <button id="zar-copy-btn" class="zar-btn-sm" title="Sao chép nội dung">📋 Copy</button>
                <button id="zar-download-btn" class="zar-btn-sm" title="Tải về file text">💾 Tải về</button>
              </div>
            </div>
            <div id="zar-result-content" class="zar-result-content"></div>
          </div>
        </div>

        <!-- Settings View (Overlay Drawer) -->
        <div id="zar-settings-view" class="zar-hidden">
          <div class="zar-header" style="margin: -16px -16px 12px -16px;">
            <div class="zar-header-title">
              <span>⚙️ Cấu hình API AI</span>
            </div>
            <button class="zar-icon-btn" id="zar-settings-close-btn">✖</button>
          </div>

          <div class="zar-form-group">
            <label>Nhà cung cấp AI:</label>
            <select id="zar-set-provider" class="zar-select">
              <option value="gemini">Google Gemini (Miễn phí & Khuyên dùng)</option>
              <option value="openai">OpenAI (ChatGPT)</option>
              <option value="custom">Tùy chỉnh (DeepSeek / Ollama / API khác)</option>
            </select>
          </div>

          <!-- Gemini Config -->
          <div id="zar-cfg-gemini">
            <div class="zar-form-group">
              <label>Gemini API Key:</label>
              <input type="password" id="zar-set-gemini-key" class="zar-input" placeholder="Dán mã khóa AI Studio tại đây...">
              <span class="zar-helper-text">
                Chưa có mã? Lấy miễn phí tại 
                <a href="https://aistudio.google.com/app/apikey" target="_blank" class="zar-link">Google AI Studio (100% Free)</a>.
              </span>
            </div>
            <div class="zar-form-group" style="margin-top: 8px;">
              <label>Model Gemini:</label>
              <select id="zar-set-gemini-model" class="zar-select">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Siêu nhanh & Mới nhất)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rất nhanh & Ổn định)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Phân tích chi tiết sâu)</option>
              </select>
            </div>
          </div>

          <!-- OpenAI Config -->
          <div id="zar-cfg-openai" style="display: none;">
            <div class="zar-form-group">
              <label>OpenAI API Key:</label>
              <input type="password" id="zar-set-openai-key" class="zar-input" placeholder="sk-...">
            </div>
            <div class="zar-form-group" style="margin-top: 8px;">
              <label>Model OpenAI:</label>
              <select id="zar-set-openai-model" class="zar-select">
                <option value="gpt-4o-mini">gpt-4o-mini (Nhanh & Tiết kiệm)</option>
                <option value="gpt-4o">gpt-4o (Thông minh nhất)</option>
              </select>
            </div>
          </div>

          <!-- Custom Config -->
          <div id="zar-cfg-custom" style="display: none;">
            <div class="zar-form-group">
              <label>Endpoint URL:</label>
              <input type="text" id="zar-set-custom-endpoint" class="zar-input" placeholder="https://api.deepseek.com/v1/chat/completions">
            </div>
            <div class="zar-form-group">
              <label>API Key:</label>
              <input type="password" id="zar-set-custom-key" class="zar-input" placeholder="sk-...">
            </div>
            <div class="zar-form-group">
              <label>Model Name:</label>
              <input type="text" id="zar-set-custom-model" class="zar-input" placeholder="deepseek-chat hoặc llama3">
            </div>
          </div>

          <div style="margin-top: auto; padding-top: 14px;">
            <button id="zar-btn-save-settings" class="zar-read-btn">
              💾 Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    bindEvents();
    refreshChatTitle();
  }

  // 2. Event Listeners
  function bindEvents() {
    const launchBtn = document.getElementById('zar-launch-btn');
    const panel = document.getElementById('zar-panel');
    const closeBtn = document.getElementById('zar-close-btn');
    const settingsBtn = document.getElementById('zar-settings-btn');
    const settingsCloseBtn = document.getElementById('zar-settings-close-btn');
    const settingsView = document.getElementById('zar-settings-view');
    const providerSelect = document.getElementById('zar-set-provider');
    const saveSettingsBtn = document.getElementById('zar-btn-save-settings');
    const readBtn = document.getElementById('zar-btn-read');
    const togglePreviewBtn = document.getElementById('zar-toggle-preview');
    const aiBtn = document.getElementById('zar-btn-ai');
    const copyBtn = document.getElementById('zar-copy-btn');
    const downloadBtn = document.getElementById('zar-download-btn');
    const promptInput = document.getElementById('zar-prompt-input');

    // Toggle panel
    launchBtn.addEventListener('click', () => {
      panel.classList.toggle('zar-hidden');
      if (!panel.classList.contains('zar-hidden')) {
        refreshChatTitle();
      }
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.add('zar-hidden');
    });

    // Settings toggle
    settingsBtn.addEventListener('click', () => {
      loadSettingsToInputs();
      settingsView.classList.remove('zar-hidden');
    });

    settingsCloseBtn.addEventListener('click', () => {
      settingsView.classList.add('zar-hidden');
    });

    // Provider select switch
    providerSelect.addEventListener('change', () => {
      const val = providerSelect.value;
      document.getElementById('zar-cfg-gemini').style.display = val === 'gemini' ? 'block' : 'none';
      document.getElementById('zar-cfg-openai').style.display = val === 'openai' ? 'block' : 'none';
      document.getElementById('zar-cfg-custom').style.display = val === 'custom' ? 'block' : 'none';
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', () => {
      userSettings.aiProvider = document.getElementById('zar-set-provider').value;
      userSettings.geminiApiKey = document.getElementById('zar-set-gemini-key').value.trim();
      userSettings.geminiModel = document.getElementById('zar-set-gemini-model').value;
      userSettings.openaiApiKey = document.getElementById('zar-set-openai-key').value.trim();
      userSettings.openaiModel = document.getElementById('zar-set-openai-model').value;
      userSettings.customEndpoint = document.getElementById('zar-set-custom-endpoint').value.trim();
      userSettings.customApiKey = document.getElementById('zar-set-custom-key').value.trim();
      userSettings.customModel = document.getElementById('zar-set-custom-model').value.trim();

      chrome.storage.local.set(userSettings, () => {
        showToast('✅ Đã lưu cấu hình API thành công!');
        settingsView.classList.add('zar-hidden');
      });
    });

    // Quick prompt chips click
    document.querySelectorAll('.zar-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt');
        promptInput.value = text;
        promptInput.focus();
      });
    });

    // Read Messages Button
    readBtn.addEventListener('click', async () => {
      if (isScanning) return;
      await executeMessageRead();
    });

    // Toggle Preview
    togglePreviewBtn.addEventListener('click', () => {
      const list = document.getElementById('zar-preview-list');
      list.classList.toggle('show');
    });

    // AI Button
    aiBtn.addEventListener('click', async () => {
      if (isProcessingAI) return;
      await executeAiPrompt();
    });

    // Enter shortcut in prompt (Ctrl + Enter)
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        aiBtn.click();
      }
    });

    // Copy Result
    copyBtn.addEventListener('click', () => {
      const resultEl = document.getElementById('zar-result-content');
      navigator.clipboard.writeText(resultEl.innerText).then(() => {
        showToast('📋 Đã sao chép kết quả!');
      }).catch(() => {
        showToast('Không thể sao chép tự động.');
      });
    });

    // Download Result
    downloadBtn.addEventListener('click', () => {
      const resultEl = document.getElementById('zar-result-content');
      const text = `=== BÁO CÁO TÓM TẮT TIN NHẮN ZALO ===\nNhóm/Cuộc trò chuyện: ${currentChatName}\nThời gian xuất: ${new Date().toLocaleString('vi-VN')}\n\n${resultEl.innerText}`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Zalo_Summary_${currentChatName.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}_${Date.now()}.txt`;
      a.click();
      showToast('💾 Đã tải về file tóm tắt!');
    });
  }

  // 3. Load settings into form inputs
  function loadSettingsToInputs() {
    chrome.storage.local.get(userSettings, (items) => {
      userSettings = { ...userSettings, ...items };
      document.getElementById('zar-set-provider').value = userSettings.aiProvider || 'gemini';
      document.getElementById('zar-set-gemini-key').value = userSettings.geminiApiKey || '';
      document.getElementById('zar-set-gemini-model').value = userSettings.geminiModel || 'gemini-2.5-flash';
      document.getElementById('zar-set-openai-key').value = userSettings.openaiApiKey || '';
      document.getElementById('zar-set-openai-model').value = userSettings.openaiModel || 'gpt-4o-mini';
      document.getElementById('zar-set-custom-endpoint').value = userSettings.customEndpoint || '';
      document.getElementById('zar-set-custom-key').value = userSettings.customApiKey || '';
      document.getElementById('zar-set-custom-model').value = userSettings.customModel || '';

      const p = userSettings.aiProvider || 'gemini';
      document.getElementById('zar-cfg-gemini').style.display = p === 'gemini' ? 'block' : 'none';
      document.getElementById('zar-cfg-openai').style.display = p === 'openai' ? 'block' : 'none';
      document.getElementById('zar-cfg-custom').style.display = p === 'custom' ? 'block' : 'none';
    });
  }

  // 4. Detect Current Active Chat Name in Zalo Web
  function refreshChatTitle() {
    const candidates = [
      document.querySelector('header.chat-header .header-title'),
      document.querySelector('.conv-action__title'),
      document.querySelector('div[data-id="chat-title"]'),
      document.querySelector('.chat-header-title'),
      document.querySelector('header .title'),
      document.querySelector('#chatViewContainer header div[class*="title"]'),
      document.querySelector('.chat-info-header .name')
    ];

    let foundName = null;
    for (const el of candidates) {
      if (el && el.innerText && el.innerText.trim().length > 0) {
        foundName = el.innerText.trim();
        break;
      }
    }

    if (!foundName) {
      // Fallback: search main chat header area
      const headerArea = document.querySelector('#chatViewContainer header, .chat-view__header');
      if (headerArea) {
        const titleEl = headerArea.querySelector('span, div, h2');
        if (titleEl && titleEl.innerText) {
          foundName = titleEl.innerText.trim().split('\n')[0];
        }
      }
    }

    currentChatName = foundName || 'Cuộc trò chuyện hiện tại';
    const chatTitleEl = document.getElementById('zar-current-chat');
    if (chatTitleEl) {
      chatTitleEl.innerText = currentChatName;
      chatTitleEl.title = currentChatName;
    }
    return currentChatName;
  }

  // Monitor DOM for chat switches
  function setupChatObserver() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(refreshChatTitle, 500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Also poll gently every 3s to update title if user clicks around
    setInterval(() => {
      const panel = document.getElementById('zar-panel');
      if (panel && !panel.classList.contains('zar-hidden')) {
        refreshChatTitle();
      }
    }, 3000);
  }

  // 5. Message Extraction Engine
  // "chỉ đọc tin nhắn của nhóm đấy khi người dùng vào và ấn đọc nhé"
  async function executeMessageRead() {
    refreshChatTitle();
    isScanning = true;
    updateReadButtonState(true);

    const mode = document.getElementById('zar-read-mode').value;
    const statusEl = document.getElementById('zar-scan-status');
    statusEl.className = 'zar-scan-status';
    statusEl.innerHTML = `<span>⏳ Đang tìm vùng tin nhắn của "${escapeHtml(currentChatName)}"...</span>`;

    // Locate scrollable chat container
    const scrollContainer = findChatScrollContainer();
    if (!scrollContainer) {
      isScanning = false;
      updateReadButtonState(false);
      statusEl.innerHTML = `<span style="color:var(--zar-error);">❌ Không tìm thấy vùng tin nhắn. Vui lòng mở 1 nhóm chat trước!</span>`;
      return;
    }

    // Scroll up if requested (e.g. 50, 100, 200)
    if (mode !== 'visible') {
      const targetCount = parseInt(mode, 10) || 50;
      statusEl.innerHTML = `<span>📜 Đang cuộn tải ${targetCount} tin nhắn gần nhất...</span>`;
      await scrollUpToLoadMessages(scrollContainer, targetCount);
    }

    // Parse all messages currently rendered in the container
    statusEl.innerHTML = `<span>🔍 Đang trích xuất nội dung tin nhắn...</span>`;
    const messages = parseChatMessages(scrollContainer);

    capturedMessages = messages;
    isScanning = false;
    updateReadButtonState(false);

    if (messages.length === 0) {
      statusEl.innerHTML = `<span style="color:var(--zar-warning);">⚠️ Không tìm thấy tin nhắn nào trong nhóm. Hãy chắc chắn bạn đã vào cuộc trò chuyện.</span>`;
      return;
    }

    // Success update
    statusEl.className = 'zar-scan-status success';
    const sendersCount = new Set(messages.map(m => m.sender)).size;
    statusEl.innerHTML = `<span>✅ Đã đọc <strong>${messages.length} tin</strong> từ <strong>${sendersCount} người</strong>.</span>`;
    document.getElementById('zar-msg-count-tag').innerText = `${messages.length} tin`;

    // Render Preview
    renderMessagePreview(messages);
    showToast(`Đã đọc xong ${messages.length} tin nhắn!`);
  }

  function findChatScrollContainer() {
    const selectors = [
      '#messageViewScroll',
      '.chat-message-list',
      '.message-view__scroll',
      'div[data-id="chat-message-list"]',
      '.chat-conversation',
      '#chatViewContainer [class*="scroll"]',
      '#chatViewContainer [class*="message-view"]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.scrollHeight > 100) return el;
    }

    // Fallback: find any element containing `.msg-item` or `.card--text`
    const sampleMsg = document.querySelector('.msg-item, .card--text, div[id^="msg-"]');
    if (sampleMsg) {
      let cur = sampleMsg.parentElement;
      while (cur && cur !== document.body) {
        const style = window.getComputedStyle(cur);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return cur;
        }
        cur = cur.parentElement;
      }
    }

    return null;
  }

  // Scroll up gently to fetch older messages
  async function scrollUpToLoadMessages(container, targetCount) {
    let prevHeight = 0;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
      const currentItems = container.querySelectorAll('.msg-item, .chat-item, div[id^="msg-"], .card--text');
      if (currentItems.length >= targetCount) {
        break;
      }

      // Check if reached top and height hasn't changed
      if (container.scrollTop === 0 && container.scrollHeight === prevHeight) {
        attempts++;
      } else {
        attempts = 0;
      }

      prevHeight = container.scrollHeight;
      container.scrollTop = 0; // Scroll to top to trigger loading
      await sleep(400); // Give Zalo time to render or fetch older batch
    }

    // Scroll back down to bottom so view isn't stuck at top
    container.scrollTop = container.scrollHeight;
  }

  // Extract structured message list
  function parseChatMessages(container) {
    const results = [];
    
    // Select all potential message elements
    let items = container.querySelectorAll('.msg-item, .chat-item, div[id^="msg-"], .message-view__item');
    
    if (items.length === 0) {
      // Fallback: search for elements with text content inside container
      items = container.querySelectorAll('.card--text, .content-text, .bubble-content');
    }

    let lastSender = 'Thành viên nhóm';

    items.forEach((item) => {
      // 1. Sender extraction
      let sender = '';
      const senderEl = item.querySelector('.card-sender-name, .message-sender-name, .sender-name, [class*="sender-name"]');
      if (senderEl && senderEl.innerText.trim()) {
        sender = senderEl.innerText.trim();
        lastSender = sender;
      } else {
        // Check if message belongs to "Me"
        const isMe = item.classList.contains('me') || 
                     item.classList.contains('chat-item--me') || 
                     item.closest('.me') || 
                     item.querySelector('.me');
        if (isMe) {
          sender = 'Tôi';
          lastSender = sender;
        } else {
          sender = lastSender;
        }
      }

      // 2. Time extraction
      let time = '';
      const timeEl = item.querySelector('.card-time, .time, [class*="card-time"], span[class*="time"]');
      if (timeEl && timeEl.innerText.trim()) {
        time = timeEl.innerText.trim();
      }

      // 3. Quoted / Reply content
      let quoteText = '';
      const quoteEl = item.querySelector('.quote-banner, .text-quote, [class*="quote"]');
      if (quoteEl && quoteEl.innerText.trim()) {
        const qSender = quoteEl.querySelector('[class*="sender"]')?.innerText?.trim() || '';
        const qContent = quoteEl.innerText.trim().replace(/\n+/g, ' ');
        quoteText = `(Trả lời: "${qContent}")`;
      }

      // 4. Message Text Content
      let text = '';
      const textEl = item.querySelector('.card--text, .content-text, .text, [class*="content-text"], [class*="bubble-content"]');
      if (textEl) {
        text = textEl.innerText.trim();
      } else {
        // Check for images/attachments/files
        const imgEl = item.querySelector('img:not(.avatar)');
        const fileEl = item.querySelector('[class*="file"], [class*="attachment"]');
        if (fileEl && fileEl.innerText.trim()) {
          text = `[File đính kèm: ${fileEl.innerText.trim()}]`;
        } else if (imgEl) {
          text = '[Hình ảnh]';
        } else {
          text = item.innerText ? item.innerText.trim() : '';
        }
      }

      // Cleanup
      text = text.replace(quoteText, '').trim();

      // Filter out system noises, time-only bubbles, empty items
      if (!text || text.length === 0) return;
      if (text === time) return;
      if (/^\d{1,2}:\d{2}$/.test(text)) return; // Only time
      if (/^(Hôm nay|Hôm qua|\d{1,2}\s+tháng\s+\d{1,2})/i.test(text) && text.length < 25) return; // Date separator

      // Combine quote and text
      const fullContent = quoteText ? `${quoteText} ${text}` : text;

      // Avoid immediate duplicate
      const prevMsg = results[results.length - 1];
      if (prevMsg && prevMsg.sender === sender && prevMsg.text === fullContent && prevMsg.time === time) {
        return;
      }

      results.push({
        sender: sender || 'Ẩn danh',
        time: time || '',
        text: fullContent
      });
    });

    return results;
  }

  function renderMessagePreview(messages) {
    const listEl = document.getElementById('zar-preview-list');
    const toggleBtn = document.getElementById('zar-toggle-preview');
    const countSpan = document.getElementById('zar-preview-count');

    countSpan.innerText = messages.length;
    toggleBtn.style.display = 'block';

    listEl.innerHTML = messages.map(m => `
      <div class="zar-preview-item">
        <span class="zar-preview-sender">${escapeHtml(m.sender)}</span>
        <span class="zar-preview-time">${escapeHtml(m.time)}:</span>
        <span class="zar-preview-text">${escapeHtml(m.text)}</span>
      </div>
    `).join('');
  }

  // 6. Execute AI Prompt
  async function executeAiPrompt() {
    const promptInput = document.getElementById('zar-prompt-input');
    const userPrompt = promptInput.value.trim();

    if (!userPrompt) {
      showToast('⚠️ Vui lòng nhập yêu cầu của bạn (ví dụ: Tóm tắt nội dung).');
      promptInput.focus();
      return;
    }

    if (capturedMessages.length === 0) {
      showToast('⚠️ Bạn chưa đọc tin nhắn. Đang tự động quét tin nhắn nhóm...');
      await executeMessageRead();
      if (capturedMessages.length === 0) {
        showToast('❌ Không thể quét được tin nhắn. Vui lòng thử lại.');
        return;
      }
    }

    // Check API Key
    const provider = userSettings.aiProvider || 'gemini';
    const apiKey = provider === 'gemini' 
      ? userSettings.geminiApiKey 
      : (provider === 'openai' ? userSettings.openaiApiKey : userSettings.customApiKey);

    if (!apiKey) {
      showToast('⚠️ Vui lòng cấu hình API Key trước khi sử dụng AI!');
      loadSettingsToInputs();
      document.getElementById('zar-settings-view').classList.remove('zar-hidden');
      return;
    }

    // Format messages for prompt
    const formattedMessages = capturedMessages.map(m => {
      const timeStr = m.time ? `[${m.time}] ` : '';
      return `${timeStr}${m.sender}: ${m.text}`;
    }).join('\n');

    const systemPrompt = `Bạn là trợ lý AI chuyên nghiệp phân tích tin nhắn nhóm Zalo.
Nhiệm vụ của bạn là đọc kỹ danh sách tin nhắn được cung cấp từ nhóm "${currentChatName}" và trả lời chính xác, trung thực, mạch lạc theo đúng yêu cầu của người dùng.
Quy tắc:
1. Trình bày bằng Tiếng Việt rõ ràng, dùng Markdown đẹp mắt (tiêu đề ##, gạch đầu dòng -, in đậm **tên người** hoặc **mốc thời gian**).
2. Không bịa đặt thông tin không có trong tin nhắn.
3. Nếu người dùng yêu cầu tóm tắt: Hãy chia thành (1) Mục tiêu/Nội dung chính thảo luận, (2) Việc cần làm & người phụ trách (nếu có), (3) Thống nhất/kết luận chung.`;

    isProcessingAI = true;
    updateAiButtonState(true);

    const resultBox = document.getElementById('zar-result-container');
    const resultContent = document.getElementById('zar-result-content');
    resultBox.style.display = 'flex';
    resultContent.innerHTML = `<div style="display:flex; align-items:center; gap:8px; color:var(--zar-primary); font-weight:600;"><span class="zar-spinner" style="border-top-color:var(--zar-primary);"></span> AI đang đọc ${capturedMessages.length} tin nhắn và phân tích...</div>`;

    try {
      const response = await callAiApiBackground({
        provider: provider,
        apiKey: apiKey,
        model: provider === 'gemini' ? (userSettings.geminiModel || 'gemini-2.5-flash') : userSettings.openaiModel,
        endpoint: userSettings.customEndpoint,
        systemPrompt: systemPrompt,
        userPrompt: userPrompt,
        messages: formattedMessages
      });

      if (!response.success) {
        throw new Error(response.error || 'Lỗi không xác định khi gọi AI.');
      }

      // Render Markdown safely
      resultContent.innerHTML = renderMarkdown(response.data);
      showToast('✨ AI đã phân tích xong!');

    } catch (err) {
      console.error('[Zalo AI Reader Error]', err);
      resultContent.innerHTML = `
        <div style="color:var(--zar-error); background:#fef2f2; border:1px solid #fecaca; padding:10px; border-radius:8px;">
          <strong>❌ Đã xảy ra lỗi:</strong><br>
          ${escapeHtml(err.message)}
          <br><br>
          <small>💡 Hãy kiểm tra lại API Key trong mục Cấu hình ⚙️.</small>
        </div>
      `;
    } finally {
      isProcessingAI = false;
      updateAiButtonState(false);
    }
  }

  // Communicate with background service worker to bypass CORS if needed
  function callAiApiBackground(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'callAiApi',
        payload: payload
      }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(res || { success: false, error: 'Không nhận được phản hồi từ background script.' });
        }
      });
    });
  }

  // 7. UI Helpers
  function updateReadButtonState(loading) {
    const btn = document.getElementById('zar-btn-read');
    const icon = document.getElementById('zar-read-btn-icon');
    const text = document.getElementById('zar-read-btn-text');

    if (loading) {
      btn.disabled = true;
      icon.innerHTML = '<span class="zar-spinner"></span>';
      text.innerText = 'Đang quét tin nhắn...';
    } else {
      btn.disabled = false;
      icon.innerText = '📥';
      text.innerText = 'Đọc tin nhắn nhóm này';
    }
  }

  function updateAiButtonState(loading) {
    const btn = document.getElementById('zar-btn-ai');
    const icon = document.getElementById('zar-ai-btn-icon');
    const text = document.getElementById('zar-ai-btn-text');

    if (loading) {
      btn.disabled = true;
      icon.innerHTML = '<span class="zar-spinner"></span>';
      text.innerText = 'AI đang xử lý...';
    } else {
      btn.disabled = false;
      icon.innerText = '✨';
      text.innerText = 'Gửi AI Xử Lý Tin Nhắn';
    }
  }

  function showToast(msg) {
    const existing = document.querySelector('.zar-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'zar-toast';
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Simple clean markdown parser for result presentation
  function renderMarkdown(md) {
    if (!md) return '';
    let html = escapeHtml(md);

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');

    // Paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

})();
