// Popup logic

document.addEventListener('DOMContentLoaded', () => {
  const geminiInput = document.getElementById('popup-gemini-key');
  const toggleBtn = document.getElementById('btn-toggle-key');
  const saveBtn = document.getElementById('btn-save-key');
  const saveStatus = document.getElementById('save-status');
  const openZaloBtn = document.getElementById('btn-open-zalo');
  const siteStatus = document.getElementById('site-status');

  // Load existing key
  chrome.storage.local.get(['geminiApiKey'], (res) => {
    if (res.geminiApiKey) {
      geminiInput.value = res.geminiApiKey;
    }
  });

  // Check active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      if (tabs[0].url.includes('chat.zalo.me')) {
        siteStatus.innerText = 'Đang mở trên Zalo Web (Sẵn sàng!)';
        siteStatus.style.color = '#10b981';
      }
    }
  });

  // Toggle visible password
  toggleBtn.addEventListener('click', () => {
    if (geminiInput.type === 'password') {
      geminiInput.type = 'text';
      toggleBtn.innerText = '🔒';
    } else {
      geminiInput.type = 'password';
      toggleBtn.innerText = '👁️';
    }
  });

  // Save Key
  saveBtn.addEventListener('click', () => {
    const key = geminiInput.value.trim();
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      saveStatus.className = 'save-status success';
      saveStatus.innerText = '✅ Đã lưu Gemini API Key thành công!';
      setTimeout(() => {
        saveStatus.innerText = '';
      }, 3000);
    });
  });

  // Open Zalo
  openZaloBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chat.zalo.me/' });
  });
});
