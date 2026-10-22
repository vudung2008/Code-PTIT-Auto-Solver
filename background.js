console.log('[DLab-Bg] Ready');

// ==================== HỆ THỐNG BROADCAST LOG ====================

function broadcastLog(message, type = 'info') {
  console.log(`[DLab-Bg] ${message}`);
  
  const logData = {
    action: 'LOG',
    message: message,
    type: type,
    timestamp: new Date().toISOString()
  };
  
  // 1. Bắn log tới Popup (nếu đang mở)
  chrome.runtime.sendMessage(logData).catch(() => {
    // Popup không mở hoặc không có receiver, bỏ qua
  });
  
  // 2. Bắn log tới tất cả các tabs (để list_manager.js nhận được)
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, logData).catch(() => {
          // Tab không có content script hoặc không lắng nghe, bỏ qua
        });
      }
    });
  });
}

// Alias sendLog để tương thích với code cũ
function sendLog(message, type = 'info') {
  broadcastLog(message, type);
}

// ==================== INITIALIZATION ====================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DLab-Bg] Extension installed');
  chrome.storage.local.set({ currentStatus: 'Đang rảnh' });
  broadcastLog('Extension đã được cài đặt và sẵn sàng', 'success');
});

// ==================== API OMNIROUTE (CHUẨN OPENAI) ====================

async function solveWithOmniroute(prompt, config) {
  const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const model = config.model || 'flash 3.8';
  
  broadcastLog(`🤖 Gọi API Omniroute với model: ${model}`, 'info');
  
  const requestBody = {
    model: model,
    messages: [
      { 
        role: "system", 
        content: "Bạn là chuyên gia lập trình C. Chỉ trả về mã nguồn C thô, không dùng markdown, không giải thích." 
      },
      { 
        role: "user", 
        content: prompt 
      }
    ],
    temperature: 0.1
  };
  
  try {
    broadcastLog(`📡 Đang gửi request đến ${baseUrl}...`, 'info');
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      broadcastLog(`❌ API Error: ${response.status} - ${errorData}`, 'error');
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    let code = data.choices?.[0]?.message?.content || '';
    
    // Làm sạch markdown nếu có
    code = code.replace(/```c\s*/g, '');
    code = code.replace(/```cpp\s*/g, '');
    code = code.replace(/```\s*/g, '');
    code = code.trim();
    
    broadcastLog(`✅ API trả về code thành công (${code.length} ký tự)`, 'success');
    return code;
    
  } catch (error) {
    broadcastLog(`❌ Lỗi khi gọi API: ${error.message}`, 'error');
    throw error;
  }
}

// ==================== FALLBACK: GEMINI API ====================

async function solveWithGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  broadcastLog('🤖 Gọi Gemini API (fallback mode)', 'info');
  
  const systemPrompt = 'Bạn là chuyên gia lập trình C. Dựa vào đề bài, hãy viết mã nguồn C chuẩn. TUYỆT ĐỐI CHỈ trả về mã nguồn thô (raw code). Không dùng thẻ markdown ```c, không giải thích.';
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\nĐề bài:\n${prompt}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
    }
  };
  
  try {
    broadcastLog('📡 Đang gửi request đến Gemini API...', 'info');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      broadcastLog(`❌ Gemini API Error: ${errorData.error?.message}`, 'error');
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    let code = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Làm sạch markdown
    code = code.replace(/```c\s*/g, '');
    code = code.replace(/```cpp\s*/g, '');
    code = code.replace(/```\s*/g, '');
    code = code.trim();
    
    broadcastLog(`✅ Gemini API trả về code thành công (${code.length} ký tự)`, 'success');
    return code;
    
  } catch (error) {
    broadcastLog(`❌ Lỗi Gemini API: ${error.message}`, 'error');
    throw error;
  }
}

// ==================== QUEUE MANAGEMENT ====================

async function processNextTask() {
  const data = await chrome.storage.local.get(['pendingTasks', 'isAutoSolving']);
  
  if (!data.isAutoSolving || !data.pendingTasks || data.pendingTasks.length === 0) {
    broadcastLog('⏸️ Không còn bài tập nào hoặc đã tắt chế độ auto-solve', 'warning');
    await chrome.storage.local.set({ 
      currentStatus: 'Đã hoàn thành tất cả',
      isAutoSolving: false 
    });
    return;
  }
  
  const nextUrl = data.pendingTasks[0];
  broadcastLog(`📋 Chuẩn bị mở bài tiếp theo (còn ${data.pendingTasks.length} bài)`, 'info');
  
  await chrome.storage.local.set({
    currentStatus: `Còn ${data.pendingTasks.length} bài`
  });
  
  setTimeout(() => {
    broadcastLog(`🔗 Đang mở tab mới: ${nextUrl}`, 'info');
    chrome.tabs.create({ url: nextUrl, active: true });
  }, 3000);
}

// ==================== MESSAGE HANDLERS ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DLab-Bg] Message received:', message);
  
  // Case 1: Forward Log (từ content script hoặc popup)
  if (message.action === 'FORWARD_LOG') {
    broadcastLog(message.message, message.type || 'info');
    sendResponse({ success: true });
    return true;
  }
  
  // Case 2: Update Status
  if (message.type === 'updateStatus') {
    chrome.storage.local.set({ currentStatus: message.status });
    sendResponse({ success: true });
  }
  
  // Case 3: Get API Key
  if (message.type === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey });
    });
    return true;
  }
  
  // Case 4: Solve Problem
  if (message.action === 'SOLVE_PROBLEM') {
    (async () => {
      try {
        broadcastLog('📥 Nhận yêu cầu giải bài từ content script', 'info');
        
        const config = await chrome.storage.local.get(['baseUrl', 'apiKey', 'modelName']);
        
        if (!config.apiKey) {
          broadcastLog('❌ Lỗi: Chưa cấu hình API Key', 'error');
          sendResponse({ success: false, error: 'API Key không tồn tại. Vui lòng cấu hình trong Popup.' });
          return;
        }
        
        broadcastLog('📖 Đang đọc đề bài...', 'info');
        await chrome.storage.local.set({ 
          currentStatus: `Đang giải bài...` 
        });
        
        let code;
        
        // Nếu có baseUrl thì dùng Omniroute, không thì dùng Gemini
        if (config.baseUrl && config.baseUrl.trim()) {
          broadcastLog(`🔧 Sử dụng Omniroute API: ${config.baseUrl}`, 'info');
          code = await solveWithOmniroute(message.problemText, {
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            model: config.modelName || 'flash 3.8'
          });
        } else {
          broadcastLog('🔧 Sử dụng Gemini API (mặc định)', 'info');
          code = await solveWithGemini(message.problemText, config.apiKey);
        }
        
        broadcastLog('🎉 Code đã được generate thành công!', 'success');
        sendResponse({ success: true, code });
        
      } catch (error) {
        broadcastLog(`❌ Lỗi khi giải bài: ${error.message}`, 'error');
        console.error('[DLab-Bg] Error solving problem:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  // Case 5: Task Done
  if (message.action === 'TASK_DONE') {
    (async () => {
      try {
        broadcastLog('✅ Bài tập đã hoàn thành! Đang xử lý bài tiếp theo...', 'success');
        
        if (sender.tab?.id) {
          await chrome.tabs.remove(sender.tab.id);
          broadcastLog('🗑️ Đã đóng tab hiện tại', 'info');
        }
        
        const { pendingTasks } = await chrome.storage.local.get(['pendingTasks']);
        
        if (pendingTasks && pendingTasks.length > 0) {
          const updatedTasks = pendingTasks.slice(1);
          await chrome.storage.local.set({ pendingTasks: updatedTasks });
          
          broadcastLog(`📊 Còn ${updatedTasks.length} bài trong hàng đợi`, 'info');
          
          await processNextTask();
        } else {
          broadcastLog('🎊 Đã hoàn thành tất cả bài tập!', 'success');
        }
        
        sendResponse({ success: true });
        
      } catch (error) {
        broadcastLog(`❌ Lỗi khi xử lý task: ${error.message}`, 'error');
        console.error('[DLab-Bg] Error processing task completion:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  // Case 6: Start Auto Solve
  if (message.action === 'START_AUTO_SOLVE') {
    broadcastLog('🚀 Nhận lệnh START_AUTO_SOLVE từ popup', 'info');
    broadcastLog('⚠️ Vui lòng mở trang /courses và click nút "Auto Solve All"', 'warning');
    sendResponse({ success: true });
    return true;
  }
  
  sendResponse({ success: true });
});
