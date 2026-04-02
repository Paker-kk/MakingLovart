// Flovart Popup — Entry point actions
document.addEventListener('DOMContentLoaded', () => {
  // Open full canvas in new tab
  const openBtn = document.getElementById('openCanvas');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const canvasUrl = chrome.runtime.getURL('app/index.html');
      chrome.tabs.create({ url: canvasUrl });
      window.close();
    });
  }

  // Capture current tab screenshot → send to canvas
  const captureBtn = document.getElementById('captureTab');
  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });
        await chrome.storage.local.set({
          flovart_pending_image: {
            dataUrl,
            source: 'screenshot',
            name: `Screenshot — ${tab.title || 'Page'}`,
            timestamp: Date.now(),
          },
        });
        const canvasUrl = chrome.runtime.getURL('app/index.html');
        chrome.tabs.create({ url: canvasUrl });
        window.close();
      } catch (err) {
        console.error('[Flovart] Capture failed:', err);
        updateStatus('截图失败', false);
      }
    });
  }

  // Collect all images from current page → send to canvas
  const collectBtn = document.getElementById('collectImages');
  if (collectBtn) {
    collectBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs
              .map(img => ({ src: img.src || img.currentSrc, alt: img.alt || '', width: img.naturalWidth, height: img.naturalHeight }))
              .filter(i => i.src && i.width > 100 && i.height > 100);
          },
        });

        const images = results?.[0]?.result || [];
        if (images.length === 0) {
          updateStatus('未找到有效图片', false);
          return;
        }

        await chrome.storage.local.set({
          flovart_collected_images: {
            images,
            source: tab.url,
            timestamp: Date.now(),
          },
        });

        updateStatus(`找到 ${images.length} 张图片`, true);
        const canvasUrl = chrome.runtime.getURL('app/index.html');
        chrome.tabs.create({ url: canvasUrl });
        window.close();
      } catch (err) {
        console.error('[Flovart] Collect failed:', err);
        updateStatus('采集失败', false);
      }
    });
  }

  // --- API Key Configuration ---
  const keyIndicator = document.getElementById('keyIndicator');
  const keyStatusText = document.getElementById('keyStatusText');
  const quickKeySetup = document.getElementById('quickKeySetup');
  const toggleKeySetup = document.getElementById('toggleKeySetup');
  const toggleKeyText = document.getElementById('toggleKeyText');
  const providerSelect = document.getElementById('providerSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const keySaveStatus = document.getElementById('keySaveStatus');

  let keySetupVisible = false;

  // Load existing keys and show status
  chrome.storage.local.get('flovart_user_api_keys', (result) => {
    const keys = result.flovart_user_api_keys || [];
    if (keys.length > 0) {
      keyIndicator.classList.add('active');
      const providers = [...new Set(keys.map(k => k.provider))];
      keyStatusText.textContent = `已配置 ${keys.length} 个 Key（${providers.join(', ')}）`;
    } else {
      keyIndicator.classList.add('empty');
      keyStatusText.textContent = '未配置 API Key — 右键反推需要 Key';
    }
  });

  // Toggle key setup panel
  if (toggleKeySetup) {
    toggleKeySetup.addEventListener('click', () => {
      keySetupVisible = !keySetupVisible;
      quickKeySetup.style.display = keySetupVisible ? 'flex' : 'none';
      toggleKeyText.textContent = keySetupVisible ? '收起配置' : '配置 API Key';
    });
  }

  // Save key
  if (saveKeyBtn) {
    saveKeyBtn.addEventListener('click', async () => {
      const provider = providerSelect.value;
      const key = apiKeyInput.value.trim();
      
      if (!key) {
        showKeySaveStatus('请输入 API Key', 'error');
        return;
      }

      // Validate key format (basic check)
      if (key.length < 10) {
        showKeySaveStatus('API Key 格式不正确', 'error');
        return;
      }

      try {
        const result = await chrome.storage.local.get('flovart_user_api_keys');
        const keys = result.flovart_user_api_keys || [];
        
        // Check for duplicate
        const existing = keys.findIndex(k => k.provider === provider && k.key === key);
        if (existing >= 0) {
          showKeySaveStatus('该 Key 已存在', 'error');
          return;
        }

        // Add new key
        keys.push({
          provider,
          key,
          capabilities: getDefaultCapabilities(provider),
          models: [],
        });

        await chrome.storage.local.set({ flovart_user_api_keys: keys });
        
        // Update status
        keyIndicator.classList.remove('empty');
        keyIndicator.classList.add('active');
        const providers = [...new Set(keys.map(k => k.provider))];
        keyStatusText.textContent = `已配置 ${keys.length} 个 Key（${providers.join(', ')}）`;
        
        apiKeyInput.value = '';
        showKeySaveStatus('✅ 保存成功！画布中也可使用此 Key', 'success');
      } catch (err) {
        showKeySaveStatus('保存失败: ' + err.message, 'error');
      }
    });
  }

  function getDefaultCapabilities(provider) {
    const caps = {
      google: ['text', 'image', 'video'],
      openai: ['text'],
      deepseek: ['text'],
      anthropic: ['text'],
      minimax: ['text', 'image', 'video'],
      volcengine: ['text'],
      qwen: ['text'],
    };
    return caps[provider] || ['text'];
  }

  function showKeySaveStatus(text, type) {
    if (keySaveStatus) {
      keySaveStatus.textContent = text;
      keySaveStatus.className = 'popup-key-save-status ' + type;
      setTimeout(() => { keySaveStatus.textContent = ''; }, 3000);
    }
  }

  function updateStatus(text, success) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    if (statusDot) statusDot.style.background = success ? '#10B981' : '#EF4444';
    if (statusText) statusText.textContent = text;
  }
});
