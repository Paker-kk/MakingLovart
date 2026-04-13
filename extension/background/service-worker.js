// Flovart Background Service Worker — Context menus + message routing

// Register context menus on install
chrome.runtime.onInstalled.addListener(() => {
  // Right-click on images
  chrome.contextMenus.create({
    id: 'flovart-add-to-canvas',
    title: '📌 添加到 Flovart 画布',
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'flovart-reverse-prompt',
    title: '✨ AI 反推 Prompt',
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'flovart-separator',
    type: 'separator',
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'flovart-open-canvas',
    title: '🎨 打开 Flovart 画布',
    contexts: ['page', 'selection'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'flovart-open-canvas') {
    const canvasUrl = chrome.runtime.getURL('app/index.html');
    chrome.tabs.create({ url: canvasUrl });
    return;
  }

  if (info.menuItemId === 'flovart-add-to-canvas') {
    const srcUrl = info.srcUrl;
    if (!srcUrl) return;

    try {
      // Fetch the image and convert to data URL for cross-origin safety
      const dataUrl = await fetchImageAsDataUrl(srcUrl);

      await chrome.storage.local.set({
        flovart_pending_image: {
          dataUrl,
          source: 'context-menu',
          sourceUrl: info.pageUrl,
          name: `Image from ${new URL(info.pageUrl || '').hostname}`,
          timestamp: Date.now(),
        },
      });

      // Open canvas
      const canvasUrl = chrome.runtime.getURL('app/index.html');
      chrome.tabs.create({ url: canvasUrl });
    } catch (err) {
      console.error('[Flovart] Failed to fetch image:', err);
    }
    return;
  }

  if (info.menuItemId === 'flovart-reverse-prompt') {
    const srcUrl = info.srcUrl;
    if (!srcUrl || !tab?.id) return;

    try {
      // Send message to content script to show the prompt panel
      chrome.tabs.sendMessage(tab.id, {
        type: 'FLOVART_REVERSE_PROMPT',
        imageUrl: srcUrl,
      });
    } catch (err) {
      console.error('[Flovart] Failed to send reverse prompt message:', err);
    }
    return;
  }
});

// Listen for messages from content script / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FLOVART_GET_API_KEY') {
    // Content script needs an API key for reverse prompt
    chrome.storage.local.get('flovart_user_api_keys', (result) => {
      sendResponse({ keys: result.flovart_user_api_keys || [] });
    });
    return true; // async response
  }

  if (message.type === 'FLOVART_REVERSE_PROMPT_RESULT') {
    // Store the result for the canvas to pick up if needed
    chrome.storage.local.set({
      flovart_last_reverse_prompt: {
        prompt: message.prompt,
        imageUrl: message.imageUrl,
        timestamp: Date.now(),
      },
    });
  }
});

// Helper: fetch an image URL and convert to base64 data URL
async function fetchImageAsDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
