// This script runs in the MAIN world and has access to page's JavaScript
(function() {
  'use strict';
  
  // Function to get model data from React fiber
  function getModelDataFromElement(element) {
    try {
      const reactKey = Object.keys(element).find(k => k.startsWith('__reactFiber'));
      if (!reactKey) return null;
      
      let fiber = element[reactKey];
      for (let i = 0; i < 30 && fiber; i++) {
        if (fiber.memoizedProps && fiber.memoizedProps.model) {
          const model = fiber.memoizedProps.model;
          return {
            username: model.username,
            viewersCount: model.viewersCount,
            id: model.id,
            status: model.status,
            isLive: model.isLive,
            isNew: model.isNew,
            privateRate: model.privateRate,
            country: model.country
          };
        }
        fiber = fiber.return;
      }
    } catch (e) {
      console.error('Error getting model data:', e);
    }
    return null;
  }
  
  // Listen for requests from content script
  window.addEventListener('sc-model-data-request', (e) => {
    const { requestId, cardSelector } = e.detail;
    const card = document.querySelector(cardSelector);
    
    let data = null;
    if (card) {
      data = getModelDataFromElement(card);
      card.removeAttribute('data-sc-request');
    }
    
    // Send response back
    window.dispatchEvent(new CustomEvent('sc-model-data-response', {
      detail: { requestId, data }
    }));
  });
  
  console.log('Stripchat Stats Viewer inject script loaded');
})();
