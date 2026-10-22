console.log('[DLab-Solver] Problem solver script loaded');

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

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for element: ${selector}`));
        return;
      }
      
      setTimeout(checkElement, 200);
    };
    
    checkElement();
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
      remoteLog(`✅ Tìm thấy đề bài với selector: ${selector}`, 'success');
      return element.innerText.trim();
    }
  }
  
  remoteLog('⚠️ Không tìm thấy đề bài, sử dụng toàn bộ text trang', 'warning');
  return document.body.innerText.trim().substring(0, 5000);
}

async function uploadCodeFile(codeStr) {
  const fileInput = document.querySelector('input[type="file"]');
  
  if (!fileInput) {
    throw new Error('Không tìm thấy input file');
  }
  
  remoteLog('📄 Tìm thấy input file, đang chuẩn bị upload...', 'info');
  
  const file = new File([codeStr], 'main.c', { type: 'text/x-c' });
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  
  const changeEvent = new Event('change', { bubbles: true });
  fileInput.dispatchEvent(changeEvent);
  
  const inputEvent = new Event('input', { bubbles: true });
  fileInput.dispatchEvent(inputEvent);
  
  remoteLog('✅ Đã nạp file C vào input thành công', 'success');
}

async function clickSubmitButton() {
  // Chỉ tìm nút thực sự để submit, không phải tab "Bài nộp"
  const selectors = [
    'button.submit-btn',
    'button[type="submit"]'
  ];
  
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        remoteLog(`✅ Tìm thấy nút submit với selector: ${selector}`, 'success');
        button.click();
        return true;
      }
    } catch (e) {
      // Try next selector
    }
  }
  
  // Fallback: Tìm button có text chứa "Submit" hoặc "Nộp bài" (không phải "Bài nộp")
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const text = button.innerText.toLowerCase();
    // Chỉ match "nộp bài" hoặc "submit", không match "bài nộp"
    if ((text.includes('submit') || text === 'nộp bài' || text.includes('gửi bài')) && !button.disabled) {
      remoteLog('✅ Tìm thấy nút submit bằng text matching', 'success');
      button.click();
      return true;
    }
  }
  
  throw new Error('Không tìm thấy nút submit');
}

// ==================== MAIN SOLVE LOGIC ====================

async function solveProblem() {
  if (isProcessing) {
    remoteLog('⚠️ Đang xử lý, bỏ qua request trùng lặp', 'warning');
    return;
  }
  
  isProcessing = true;
  
  try {
    remoteLog('🚀 Bắt đầu giải bài...', 'info');
    remoteLog('⏳ Đợi trang load hoàn tất (2 giây)...', 'info');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Bước 1: Lấy đề bài
    remoteLog('📖 Đang đọc đề bài...', 'info');
    const problemText = getProblemText();
    remoteLog(`📊 Độ dài đề bài: ${problemText.length} ký tự`, 'info');
    
    chrome.runtime.sendMessage({
      type: 'updateStatus',
      status: `Đang giải bài...`
    });
    
    // Bước 2: Gọi API để sinh code
    remoteLog('🤖 Gửi đề bài đến background để gọi LLM...', 'info');
    
    const response = await chrome.runtime.sendMessage({
      action: 'SOLVE_PROBLEM',
      problemText: problemText
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get solution');
    }
    
    remoteLog(`✅ Nhận được code từ LLM (${response.code.length} ký tự)`, 'success');
    
    chrome.runtime.sendMessage({
      type: 'updateStatus',
      status: `Đang upload code...`
    });
    
    // Bước 3: Upload code vào input file
    remoteLog('📤 Đang upload code vào input file...', 'info');
    await uploadCodeFile(response.code);
    
    remoteLog('⏳ Đợi 1.5 giây trước khi submit...', 'info');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Bước 4: Click nút submit
    chrome.runtime.sendMessage({
      type: 'updateStatus',
      status: `Đang submit bài...`
    });
    
    remoteLog('🎯 Đang tìm và click nút Submit...', 'info');
    await clickSubmitButton();
    
    remoteLog('✅ Đã click nút Submit thành công!', 'success');
    
    // Bước 5: Chờ và thông báo task done
    remoteLog('⏳ Đã submit, chuẩn bị đóng tab sau 3 giây...', 'warning');
    
    chrome.runtime.sendMessage({
      type: 'updateStatus',
      status: `Hoàn thành bài`
    });
    
    // Delay 3 giây để các log kịp gửi về background trước khi tab bị kill
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    remoteLog('🔒 Gửi tín hiệu TASK_DONE về background', 'info');
    
    chrome.runtime.sendMessage({
      action: 'TASK_DONE'
    });
    
  } catch (error) {
    remoteLog(`❌ Lỗi: ${error.message}`, 'error');
    
    chrome.runtime.sendMessage({
      type: 'updateStatus',
      status: `Lỗi: ${error.message}`
    });
    
    // Vẫn delay trước khi gửi TASK_DONE để chuyển bài tiếp
    remoteLog('⚠️ Có lỗi xảy ra, chuyển sang bài tiếp theo sau 3 giây...', 'warning');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    chrome.runtime.sendMessage({
      action: 'TASK_DONE'
    });
  }
}

// ==================== AUTO-SOLVE CHECK ====================

async function checkIfAutoSolving() {
  const data = await chrome.storage.local.get(['isAutoSolving']);
  
  if (data.isAutoSolving) {
    remoteLog('✅ Chế độ auto-solving đang BẬT, bắt đầu xử lý...', 'success');
    await solveProblem();
  } else {
    remoteLog('⏸️ Chế độ auto-solving đang TẮT, chờ lệnh...', 'warning');
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

remoteLog('📟 Problem Solver đã khởi tạo xong', 'success');
