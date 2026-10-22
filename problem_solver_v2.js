console.log('[DLab-Solver] Problem solver script loaded (Network Resilient v2)');

// ==================== REMOTE LOGGING ====================

function remoteLog(msg, type = 'info') {
  console.log(`[DLab-Solver] ${msg}`);
  
  try {
    chrome.runtime.sendMessage({
      action: 'FORWARD_LOG',
      message: `[Tab Submit] ${msg}`,
      type: type
    });
  } catch (error) {
    console.warn('[DLab-Solver] Could not send remote log:', error);
  }
}

// ==================== HELPER FUNCTIONS ====================

let isProcessing = false;

function waitForElement(selector, maxWaitTime = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Kiểm tra ngay lập tức
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    
    // Sử dụng setInterval với tốc độ 100ms/lần
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      
      if (element) {
        clearInterval(interval);
        resolve(element);
        return;
      }
      
      // Kiểm tra timeout
      if (Date.now() - startTime > maxWaitTime) {
        clearInterval(interval);
        reject(new Error(`Timeout ${maxWaitTime}ms waiting for: ${selector}`));
      }
    }, 100); // Check mỗi 100ms
  });
}

function waitForSubmitResult(maxWaitTime = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Không log chi tiết
    
    // Các dấu hiệu thành công có thể có
    const successIndicators = [
      // Thông báo thành công
      { selector: '*', text: 'thành công', type: 'text' },
      { selector: '*', text: 'accepted', type: 'text' },
      { selector: '*', text: 'AC', type: 'text' },
      
      // Bảng kết quả
      { selector: '.result-table', type: 'element' },
      { selector: '.submission-result', type: 'element' },
      { selector: 'div[class*="result"]', type: 'element' },
      
      // Alert/Modal
      { selector: '.ant-message-success', type: 'element' },
      { selector: '.ant-notification-notice-success', type: 'element' },
      
      // URL thay đổi (redirect sau submit)
      { type: 'urlchange' }
    ];
    
    let initialUrl = window.location.href;
    
    // MutationObserver để theo dõi thay đổi DOM
    const observer = new MutationObserver((mutations) => {
      // Kiểm tra URL thay đổi
      if (window.location.href !== initialUrl) {
        observer.disconnect();
        resolve({ type: 'urlchange', url: window.location.href });
        return;
      }
      
      // Kiểm tra các indicator
      for (const indicator of successIndicators) {
        if (indicator.type === 'text') {
          const elements = document.querySelectorAll(indicator.selector);
          for (const el of elements) {
            const text = el.textContent?.toLowerCase() || '';
            if (text.includes(indicator.text)) {
              observer.disconnect();
              resolve({ type: 'text', text: el.textContent });
              return;
            }
          }
        } else if (indicator.type === 'element') {
          const el = document.querySelector(indicator.selector);
          if (el) {
            observer.disconnect();
            resolve({ type: 'element', selector: indicator.selector });
            return;
          }
        }
      }
      
      // Kiểm tra timeout
      if (Date.now() - startTime > maxWaitTime) {
        observer.disconnect();
        reject(new Error(`Timeout ${maxWaitTime}ms`));
      }
    });
    
    // Bắt đầu observe
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
    
    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout ${maxWaitTime}ms`));
    }, maxWaitTime);
    
    // Kiểm tra ngay lập tức một lần
    setTimeout(() => {
      for (const indicator of successIndicators) {
        if (indicator.type === 'element') {
          const el = document.querySelector(indicator.selector);
          if (el) {
            observer.disconnect();
            resolve({ type: 'element', selector: indicator.selector });
            return;
          }
        }
      }
    }, 500);
  });
}

function getProblemText() {
  const selectors = [
    'div.problem-description',
    'div.problem-content',
    'div.ant-card-body',
    'div[class*="problem"]',
    'div[class*="description"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim();
    }
  }
  
  return document.body.innerText.trim().substring(0, 5000);
}

function getProblemTitle() {
  // Thử lấy tên bài từ URL (VD: /submit/C01043)
  const urlMatch = window.location.pathname.match(/\/submit\/([A-Z0-9]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Thử tìm trong page title
  const titleSelectors = [
    'h1',
    'h2',
    '.problem-title',
    '.ant-page-header-heading-title'
  ];
  
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim()) {
      return element.innerText.trim().substring(0, 50);
    }
  }
  
  return 'Bài tập';
}

async function uploadCodeFile(codeStr) {
  const fileInput = document.querySelector('input[type="file"]');
  
  if (!fileInput) {
    throw new Error('Không tìm thấy input file');
  }
  
  const file = new File([codeStr], 'main.c', { type: 'text/x-c' });
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  
  const changeEvent = new Event('change', { bubbles: true });
  fileInput.dispatchEvent(changeEvent);
  
  const inputEvent = new Event('input', { bubbles: true });
  fileInput.dispatchEvent(inputEvent);
}

async function clickSubmitButton() {
  const selectors = [
    'button.submit-btn',
    'button[type="submit"]'
  ];
  
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        button.click();
        return true;
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  // Fallback: Tìm button có text chứa "Submit" hoặc "Nộp bài"
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const text = button.innerText.toLowerCase();
    if ((text.includes('submit') || text === 'nộp bài' || text.includes('gửi bài')) && !button.disabled) {
      button.click();
      return true;
    }
  }
  
  throw new Error('Không tìm thấy nút submit');
}

// ==================== MAIN SOLVE LOGIC (NETWORK RESILIENT) ====================

async function solveProblem() {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  
  try {
    // Lấy tên bài
    const problemTitle = getProblemTitle();
    remoteLog(`🚀 Bắt đầu: ${problemTitle}`, 'info');
    
    // BƯỚC 1: Đợi trang load và tìm đề bài (timeout 10s)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const problemText = getProblemText();
      
      if (!problemText || problemText.length < 10) {
        throw new Error('Đề bài không hợp lệ');
      }
      
      chrome.runtime.sendMessage({
        type: 'updateStatus',
        status: `Đang giải bài...`
      });
      
      // BƯỚC 2: Gọi API để sinh code
      const response = await chrome.runtime.sendMessage({
        action: 'SOLVE_PROBLEM',
        problemText: problemText,
        problemTitle: problemTitle
      });
      
      if (!response.success) {
        throw new Error(response.error || 'LLM không trả về code');
      }
      
      if (!response.code || response.code.length < 10) {
        throw new Error('Code không hợp lệ');
      }
      
      chrome.runtime.sendMessage({
        type: 'updateStatus',
        status: `Đang upload code...`
      });
      
      // BƯỚC 3: Upload code vào input file (timeout 5s)
      await Promise.race([
        uploadCodeFile(response.code),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout upload file')), 5000)
        )
      ]);
      
      remoteLog(`📤 ${problemTitle}: Đã upload`, 'info');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // BƯỚC 4: Click nút submit (timeout 5s)
      chrome.runtime.sendMessage({
        type: 'updateStatus',
        status: `Đang submit bài...`
      });
      
      await Promise.race([
        clickSubmitButton(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout tìm nút Submit')), 5000)
        )
      ]);
      
      remoteLog(`✅ ${problemTitle}: Đã submit`, 'success');
      
      // BƯỚC 5: Chờ kết quả từ server (timeout 30s với MutationObserver)
      try {
        const result = await waitForSubmitResult(30000);
        remoteLog(`🎉 ${problemTitle}: ${result.type}`, 'success');
      } catch (waitError) {
        // Không log warning, giả định đã submit thành công
      }
      
      chrome.runtime.sendMessage({
        type: 'updateStatus',
        status: `Hoàn thành bài`
      });
      
      // BƯỚC 6: Gửi TASK_DONE ngay lập tức
      chrome.runtime.sendMessage({
        action: 'TASK_DONE'
      });
      
    } catch (stepError) {
      throw stepError;
    }
    
  } catch (error) {
    // GLOBAL ERROR HANDLER
    const problemTitle = getProblemTitle();
    remoteLog(`❌ ${problemTitle}: ${error.message}`, 'error');
    
    chrome.runtime.sendMessage({
      type: 'updateStatus',
      status: `Lỗi: ${error.message}`
    });
    
    // Bỏ qua bài này và chuyển sang bài tiếp theo NGAY LẬP TỨC
    chrome.runtime.sendMessage({
      action: 'TASK_DONE'
    });
    
  } finally {
    isProcessing = false;
  }
}

// ==================== AUTO-SOLVE CHECK ====================

async function checkIfAutoSolving() {
  try {
    const data = await chrome.storage.local.get(['isAutoSolving']);
    
    if (data.isAutoSolving) {
      await solveProblem();
    }
  } catch (error) {
    remoteLog(`❌ Lỗi: ${error.message}`, 'error');
  }
}

// ==================== INITIALIZATION ====================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkIfAutoSolving);
} else {
  checkIfAutoSolving();
}

chrome.runtime.sendMessage({
  type: 'updateStatus',
  status: 'Trên trang làm bài'
});
