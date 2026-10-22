const baseUrlInput = document.getElementById('baseUrl');
const apiKeyInput = document.getElementById('apiKey');
const modelNameInput = document.getElementById('modelName');
const saveBtn = document.getElementById('saveBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const messageDiv = document.getElementById('message');
const terminal = document.getElementById('terminal');

let autoScrollEnabled = true;

function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
  }, 3000);
}

function addLog(message, type = 'success') {
  const logLine = document.createElement('div');
  logLine.className = `log-line ${type}`;
  
  const timestamp = new Date().toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  logLine.textContent = `[${timestamp}] ${message}`;
  terminal.appendChild(logLine);
  
  if (autoScrollEnabled) {
    terminal.scrollTop = terminal.scrollHeight;
  }
  
  if (terminal.children.length > 200) {
    terminal.removeChild(terminal.firstChild);
  }
}

function clearTerminal() {
  terminal.innerHTML = '';
  addLog('Terminal cleared', 'info');
}

function loadConfig() {
  chrome.storage.local.get(['baseUrl', 'apiKey', 'modelName'], (result) => {
    if (result.baseUrl) {
      baseUrlInput.value = result.baseUrl;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.modelName) {
      modelNameInput.value = result.modelName;
    } else {
      modelNameInput.value = 'flash 3.8';
    }
    
    addLog('Config loaded from storage', 'info');
  });
}

saveBtn.addEventListener('click', () => {
  const baseUrl = baseUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const modelName = modelNameInput.value.trim();
  
  if (!apiKey) {
    showMessage('Vui lòng nhập API key!', 'error');
    addLog('ERROR: API key is required', 'error');
    return;
  }
  
  chrome.storage.local.set({ 
    baseUrl, 
    apiKey, 
    modelName 
  }, () => {
    showMessage('Đã lưu cấu hình thành công!', 'success');
    addLog('Config saved successfully', 'success');
    addLog(`Base URL: ${baseUrl || '(default)'}`, 'info');
    addLog(`Model: ${modelName}`, 'info');
  });
});

startBtn.addEventListener('click', () => {
  chrome.storage.local.get(['apiKey'], (result) => {
    if (!result.apiKey) {
      showMessage('Vui lòng lưu API key trước!', 'error');
      addLog('ERROR: Please configure API key first', 'error');
      return;
    }
    
    chrome.runtime.sendMessage({
      action: 'START_AUTO_SOLVE'
    });
    
    addLog('START_AUTO_SOLVE signal sent to background', 'info');
    showMessage('Đã gửi lệnh bắt đầu!', 'success');
  });
});

stopBtn.addEventListener('click', () => {
  chrome.storage.local.set({ isAutoSolving: false }, () => {
    addLog('Auto-solving stopped by user', 'warning');
    showMessage('Đã dừng Auto Solve!', 'success');
    
    chrome.runtime.sendMessage({
      type: 'updateStatus',
      status: 'Đã dừng'
    });
  });
});

clearBtn.addEventListener('click', clearTerminal);

terminal.addEventListener('scroll', () => {
  const isScrolledToBottom = terminal.scrollHeight - terminal.scrollTop <= terminal.clientHeight + 10;
  autoScrollEnabled = isScrolledToBottom;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'LOG') {
    const type = message.type || 'success';
    addLog(message.message, type);
  }
  
  sendResponse({ received: true });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.currentStatus) {
      addLog(`Status: ${changes.currentStatus.newValue}`, 'info');
    }
  }
});

loadConfig();
addLog('Popup initialized', 'success');
