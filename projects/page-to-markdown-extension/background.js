// Page to Markdown - Background Script (Three.js Journey)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    const { filename, content } = request;
    
    // Create data URL (more reliable than blob URLs for extensions)
    const base64 = btoa(unescape(encodeURIComponent(content)));
    const dataUrl = 'data:text/markdown;base64,' + base64;
    
    // Download to default downloads folder (no subfolders)
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    
    return true; // async response
  }
});
