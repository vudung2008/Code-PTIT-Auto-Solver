console.log('[DLab-Content] Courses page script loaded');

chrome.runtime.sendMessage({
  type: 'updateStatus',
  status: 'Sẵn sàng trên trang danh sách'
});
