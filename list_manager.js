console.log('[DLab-ListManager] Script loaded');

// ==================== FLOATING TERMINAL UI ====================
let terminalVisible = true;

function createFloatingTerminal() {
  if (document.getElementById('dlab-floating-terminal')) {
    return;
  }

  // Container
  const container = document.createElement('div');
  container.id = 'dlab-floating-terminal';
  container.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 30px;
    width: 350px;
    height: 250px;
    z-index: 99999;
    background: #0a0e1a;
    border: 2px solid #00d9ff;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 217, 255, 0.3);
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #00d9ff;
    cursor: move;
    user-select: none;
  `;

  const title = document.createElement('div');
  title.textContent = '📟 DLab Terminal';
  title.style.cssText = `
    color: #00d9ff;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
  `;

  const controls = document.createElement('div');
  controls.style.cssText = `
    display: flex;
    gap: 6px;
  `;

  const minimizeBtn = document.createElement('button');
  minimizeBtn.textContent = '−';
  minimizeBtn.style.cssText = `
    background: transparent;
    border: 1px solid #00d9ff;
    color: #00d9ff;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    transition: all 0.2s ease;
  `;
  minimizeBtn.onmouseenter = () => {
    minimizeBtn.style.background = '#00d9ff';
    minimizeBtn.style.color = '#0a0e1a';
  };
  minimizeBtn.onmouseleave = () => {
    minimizeBtn.style.background = 'transparent';
    minimizeBtn.style.color = '#00d9ff';
  };

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '✕';
  clearBtn.style.cssText = `
    background: transparent;
    border: 1px solid #ff4757;
    color: #ff4757;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
    transition: all 0.2s ease;
  `;
  clearBtn.onmouseenter = () => {
    clearBtn.style.background = '#ff4757';
    clearBtn.style.color = '#fff';
  };
  clearBtn.onmouseleave = () => {
    clearBtn.style.background = 'transparent';
    clearBtn.style.color = '#ff4757';
  };

  controls.appendChild(minimizeBtn);
  controls.appendChild(clearBtn);

  header.appendChild(title);
  header.appendChild(controls);

  // Terminal content
  const content = document.createElement('div');
  content.id = 'dlab-terminal-content';
  content.style.cssText = `
    flex: 1;
    padding: 10px;
    overflow-y: auto;
    background: #0a0e1a;
    color: #00ff9f;
    font-size: 11px;
    line-height: 1.5;
  `;

  // Custom scrollbar
  const style = document.createElement('style');
  style.textContent = `
    #dlab-terminal-content::-webkit-scrollbar {
      width: 8px;
    }
    #dlab-terminal-content::-webkit-scrollbar-track {
      background: #0f1923;
      border-radius: 4px;
    }
    #dlab-terminal-content::-webkit-scrollbar-thumb {
      background: #2a3f5f;
      border-radius: 4px;
    }
    #dlab-terminal-content::-webkit-scrollbar-thumb:hover {
      background: #3a5080;
    }
    .dlab-log-line {
      margin-bottom: 4px;
      word-wrap: break-word;
    }
    .dlab-log-line::before {
      content: '> ';
      color: #00d9ff;
      font-weight: bold;
    }
    .dlab-log-line.error {
      color: #ff4757;
    }
    .dlab-log-line.warning {
      color: #ffa502;
    }
    .dlab-log-line.info {
      color: #00d9ff;
    }
    .dlab-log-line.success {
      color: #00ff9f;
    }
  `;
  document.head.appendChild(style);

  container.appendChild(header);
  container.appendChild(content);
  document.body.appendChild(container);

  // Minimize/Maximize functionality
  minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    terminalVisible = !terminalVisible;
    
    if (terminalVisible) {
      container.style.height = '250px';
      content.style.display = 'block';
      minimizeBtn.textContent = '−';
    } else {
      container.style.height = '36px';
      content.style.display = 'none';
      minimizeBtn.textContent = '□';
    }
  });

  // Clear terminal
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    content.innerHTML = '';
    addTerminalLog('[Hệ thống] Terminal đã được xóa', 'info');
  });

  // Make draggable
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    initialX = e.clientX - container.offsetLeft;
    initialY = e.clientY - container.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      container.style.left = currentX + 'px';
      container.style.top = currentY + 'px';
      container.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  console.log('[DLab-ListManager] Floating terminal created');
  addTerminalLog('[Hệ thống] Đã sẵn sàng nhận log...', 'success');
}

function addTerminalLog(message, type = 'success') {
  const content = document.getElementById('dlab-terminal-content');
  if (!content) return;

  const logLine = document.createElement('div');
  logLine.className = `dlab-log-line ${type}`;

  const timestamp = new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  logLine.textContent = `[${timestamp}] ${message}`;
  content.appendChild(logLine);

  // Auto-scroll to bottom
  content.scrollTop = content.scrollHeight;

  // Limit to 100 lines
  if (content.children.length > 100) {
    content.removeChild(content.firstChild);
  }
}

// ==================== ORIGINAL FUNCTIONALITY ====================

function scanPendingProblems() {
  const rows = document.querySelectorAll('tr.ant-table-row');
  const pendingUrls = [];
  
  rows.forEach(row => {
    const isSolved = row.classList.contains('row-solved');
    const isAttempted = row.classList.contains('row-attempted');
    
    if (!isSolved && !isAttempted) {
      const link = row.querySelector('a[href^="/submit/"]');
      if (link) {
        const absoluteUrl = new URL(link.getAttribute('href'), window.location.origin).href;
        pendingUrls.push(absoluteUrl);
      }
    }
  });
  
  console.log(`[DLab-ListManager] Found ${pendingUrls.length} pending problems:`, pendingUrls);
  addTerminalLog(`Quét được ${pendingUrls.length} bài chưa làm`, 'info');
  return pendingUrls;
}

function createFloatingButton() {
  if (document.getElementById('dlab-auto-solve-btn')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'dlab-auto-solve-btn';
  button.innerHTML = '🚀 Auto Solve All';
  button.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 9999;
    padding: 16px 24px;
    background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4);
    transition: all 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-3px) scale(1.05)';
    button.style.boxShadow = '0 6px 20px rgba(255, 71, 87, 0.6)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0) scale(1)';
    button.style.boxShadow = '0 4px 15px rgba(255, 71, 87, 0.4)';
  });
  
  button.addEventListener('click', async () => {
    const pendingUrls = scanPendingProblems();
    
    if (pendingUrls.length === 0) {
      alert('Không có bài tập nào cần giải!');
      addTerminalLog('Không tìm thấy bài cần giải', 'warning');
      return;
    }
    
    button.disabled = true;
    button.innerHTML = '⏳ Đang khởi động...';
    button.style.background = '#95a5a6';
    
    try {
      await chrome.storage.local.set({
        pendingTasks: pendingUrls,
        isAutoSolving: true,
        currentTaskIndex: 0
      });
      
      console.log('[DLab-ListManager] Starting auto-solve with', pendingUrls.length, 'problems');
      addTerminalLog(`Bắt đầu giải ${pendingUrls.length} bài tập`, 'success');
      
      chrome.runtime.sendMessage({
        type: 'updateStatus',
        status: `Bắt đầu giải ${pendingUrls.length} bài`
      });
      
      addTerminalLog(`Đang mở bài đầu tiên...`, 'info');
      window.open(pendingUrls[0], '_blank');
      
      setTimeout(() => {
        button.innerHTML = '✅ Đã khởi động';
        button.style.background = '#27ae60';
        
        setTimeout(() => {
          button.disabled = false;
          button.innerHTML = '🚀 Auto Solve All';
          button.style.background = 'linear-gradient(135deg, #ff4757 0%, #ff6348 100%)';
        }, 2000);
      }, 1000);
      
    } catch (error) {
      console.error('[DLab-ListManager] Error:', error);
      addTerminalLog(`Lỗi: ${error.message}`, 'error');
      button.disabled = false;
      button.innerHTML = '❌ Lỗi';
      button.style.background = '#e74c3c';
      
      setTimeout(() => {
        button.innerHTML = '🚀 Auto Solve All';
        button.style.background = 'linear-gradient(135deg, #ff4757 0%, #ff6348 100%)';
      }, 2000);
    }
  });
  
  document.body.appendChild(button);
  console.log('[DLab-ListManager] Floating button created');
}

// ==================== MESSAGE LISTENER ====================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'LOG') {
    const message = request.message || '';
    const type = request.type || 'info';
    addTerminalLog(message, type);
  }
  sendResponse({ received: true });
});

// ==================== INITIALIZATION ====================

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        createFloatingTerminal();
        createFloatingButton();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      createFloatingTerminal();
      createFloatingButton();
    }, 1000);
  }
}

init();

chrome.runtime.sendMessage({
  type: 'updateStatus',
  status: 'Sẵn sàng trên trang danh sách'
});
