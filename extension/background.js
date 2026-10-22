// Background Service Worker for Zalo AI Reader

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default configuration
    chrome.storage.local.set({
      aiProvider: 'gemini',
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      openaiApiKey: '',
      openaiModel: 'gpt-4o-mini',
      customEndpoint: '',
      customApiKey: '',
      customModel: '',
      maxMessagesToRead: 50,
      autoScrollToRead: true
    }, () => {
      console.log('Zalo AI Reader installed with default settings.');
    });
  }
});

// Relay messages if needed (e.g. bypass CORS if content scripts face restrictions)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'callAiApi') {
    handleAiRequest(request.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleAiRequest({ provider, apiKey, model, messages, systemPrompt, userPrompt, endpoint }) {
  if (provider === 'gemini') {
    const targetModel = model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    
    const combinedPrompt = `${systemPrompt}\n\n=== DỮ LIỆU TIN NHẮN ZALO CẦN XỬ LÝ ===\n${messages}\n\n=== YÊU CẦU CỦA NGƯỜI DÙNG ===\n${userPrompt}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: combinedPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2500
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Lỗi Gemini API (HTTP ${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Không nhận được nội dung trả về từ Gemini.');
    }
    return candidate;

  } else if (provider === 'openai' || provider === 'custom') {
    const targetEndpoint = provider === 'custom' && endpoint 
      ? endpoint 
      : 'https://api.openai.com/v1/chat/completions';
    
    const targetModel = model || (provider === 'custom' ? 'default' : 'gpt-4o-mini');

    const res = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `=== DỮ LIỆU TIN NHẮN ZALO CẦN XỬ LÝ ===\n${messages}\n\n=== YÊU CẦU CỦA NGƯỜI DÙNG ===\n${userPrompt}` }
        ],
        temperature: 0.4
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Lỗi API (HTTP ${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Không có kết quả trả về.';
  }

  throw new Error(`Provider không hợp lệ: ${provider}`);
}
