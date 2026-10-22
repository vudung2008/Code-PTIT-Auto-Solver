console.log('[DLab-Content] Submit page script loaded');

chrome.runtime.sendMessage({
  type: 'updateStatus',
  status: 'Sẵn sàng trên trang làm bài'
});
