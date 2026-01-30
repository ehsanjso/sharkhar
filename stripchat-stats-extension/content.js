(function() {
  'use strict';

  const processedCards = new WeakSet();
  
  function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'sc-stats-popup';
    popup.innerHTML = `
      <div class="sc-stats-header">
        <span class="sc-stats-title">Model Stats</span>
        <button class="sc-stats-close">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
      <div class="sc-stats-content">
        <div class="sc-stats-loading">
          <div class="sc-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.sc-stats-close').addEventListener('click', () => {
      popup.style.display = 'none';
    });
    return popup;
  }
  
  function createFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'sc-scan-button';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 1C5 0.447715 5.44772 0 6 0H9C9.55228 0 10 0.447715 10 1V2H14C14.5523 2 15 2.44772 15 3V6C15 6.55228 14.5523 7 14 7H13V8H14C14.5523 8 15 8.44772 15 9V12C15 12.5523 14.5523 13 14 13H10V14C10 14.5523 9.55228 15 9 15H6C5.44772 15 5 14.5523 5 14V13H1C0.447715 13 0 12.5523 0 12V9C0 8.44772 0.447715 8 1 8H2V7H1C0.447715 7 0 6.55228 0 6V3C0 2.44772 0.447715 2 1 2H5V1ZM6 1V2H9V1H6ZM1 3V6H2H6V7H2H1V8V12H5H6V13V14H9V13V12H10H14V9V8H13H9V7H13H14V6V3H10H9V2H6H5V3H1ZM9 8V12H6V8H2V7H6V3H9V7H13V8H9Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
      </svg>
      <span>Scan Models</span>
    `;
    btn.title = 'Scan all visible models and sort by viewers + followers';
    btn.addEventListener('click', scanAllModels);
    document.body.appendChild(btn);
    return btn;
  }
  
  function createScanModal() {
    const modal = document.createElement('div');
    modal.id = 'sc-scan-modal';
    modal.innerHTML = `
      <div class="sc-scan-modal-content">
        <div class="sc-stats-header">
          <span class="sc-stats-title">🔍 Model Rankings (Lowest First)</span>
          <button class="sc-stats-close">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
        <div class="sc-scan-modal-body">
          <div class="sc-stats-loading">
            <div class="sc-spinner"></div>
            <span>Scanning models...</span>
          </div>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
    modal.querySelector('.sc-stats-close').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    document.body.appendChild(modal);
    return modal;
  }
  
  const popup = createPopup();
  const floatingBtn = createFloatingButton();
  const scanModal = createScanModal();
  
  function getModelDataFromCard(card) {
    return new Promise((resolve) => {
      const requestId = 'sc-' + Date.now() + '-' + Math.random();
      
      const handler = (e) => {
        if (e.detail && e.detail.requestId === requestId) {
          window.removeEventListener('sc-model-data-response', handler);
          resolve(e.detail.data);
        }
      };
      window.addEventListener('sc-model-data-response', handler);
      
      card.setAttribute('data-sc-request', requestId);
      window.dispatchEvent(new CustomEvent('sc-model-data-request', {
        detail: { requestId, cardSelector: `[data-sc-request="${requestId}"]` }
      }));
      
      setTimeout(() => {
        window.removeEventListener('sc-model-data-response', handler);
        card.removeAttribute('data-sc-request');
        const link = card.querySelector('a[href^="/"]');
        if (link) {
          const href = link.getAttribute('href');
          const match = href.match(/^\/([A-Za-z0-9_-]+)$/);
          if (match && !['girls', 'couples', 'men', 'trans', 'signup', 'login', 'top'].includes(match[1])) {
            resolve({ username: match[1], viewersCount: null });
            return;
          }
        }
        resolve(null);
      }, 500);
    });
  }
  
  async function fetchModelDetails(username) {
    try {
      const response = await fetch(`https://stripchat.com/api/front/v2/models/username/${username}/cam`);
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  }
  
  async function scanAllModels() {
    scanModal.style.display = 'flex';
    const body = scanModal.querySelector('.sc-scan-modal-body');
    body.innerHTML = '<div class="sc-stats-loading"><div class="sc-spinner"></div><span>Scanning models...</span></div>';
    
    const cards = document.querySelectorAll('.model-list-item');
    const models = [];
    let processed = 0;
    
    for (const card of cards) {
      const modelData = await getModelDataFromCard(card);
      if (!modelData || !modelData.username) continue;
      
      const details = await fetchModelDetails(modelData.username);
      if (details?.user?.user) {
        const user = details.user.user;
        models.push({
          username: modelData.username,
          viewers: modelData.viewersCount || 0,
          followers: user.favoritedCount || 0,
          combined: (modelData.viewersCount || 0) + (user.favoritedCount || 0),
          status: user.status,
          isLive: user.isLive
        });
      }
      
      processed++;
      body.innerHTML = `<div class="sc-stats-loading"><div class="sc-spinner"></div><span>Scanning... ${processed}/${cards.length}</span></div>`;
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Sort by combined (viewers + followers), least to most
    models.sort((a, b) => a.combined - b.combined);
    
    // Take top 25
    const top25 = models.slice(0, 25);
    
    if (top25.length === 0) {
      body.innerHTML = '<div class="sc-stats-error">No models found on this page</div>';
      return;
    }
    
    let html = '<div class="sc-scan-results">';
    html += `<div class="sc-scan-summary">Found ${models.length} models · Showing top 25 with lowest viewers + followers</div>`;
    html += '<div class="sc-scan-list">';
    
    top25.forEach((m, i) => {
      html += `
        <a href="/${m.username}" target="_blank" class="sc-scan-item">
          <div class="sc-scan-rank">#${i + 1}</div>
          <div class="sc-scan-info">
            <span class="sc-scan-name">${m.username}</span>
            <span class="sc-scan-status sc-status-${m.status}">${m.isLive ? '🟢' : '⚫'} ${m.status || 'unknown'}</span>
          </div>
          <div class="sc-scan-stats">
            <span>👁️ ${formatNumber(m.viewers)}</span>
            <span>❤️ ${formatNumber(m.followers)}</span>
          </div>
        </a>
      `;
    });
    
    html += '</div></div>';
    body.innerHTML = html;
  }
  
  function formatNumber(num) {
    if (num == null) return '—';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
  
  async function showStats(card, button) {
    const rect = button.getBoundingClientRect();
    popup.style.display = 'block';
    popup.style.top = `${rect.bottom + window.scrollY + 8}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    
    setTimeout(() => {
      const popupRect = popup.getBoundingClientRect();
      if (popupRect.right > window.innerWidth) {
        popup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
      }
    }, 10);
    
    const content = popup.querySelector('.sc-stats-content');
    content.innerHTML = '<div class="sc-stats-loading"><div class="sc-spinner"></div><span>Loading...</span></div>';
    
    let modelData = await getModelDataFromCard(card);
    
    if (!modelData || !modelData.username) {
      content.innerHTML = '<div class="sc-stats-error">Could not find model data</div>';
      return;
    }
    
    const details = await fetchModelDetails(modelData.username);
    
    let html = '<div class="sc-stats-grid">';
    
    // Viewers
    if (modelData.viewersCount != null) {
      html += `<div class="sc-stat-item"><div class="sc-stat-icon">👁️</div><div class="sc-stat-data"><span class="sc-stat-value">${formatNumber(modelData.viewersCount)}</span><span class="sc-stat-label">Viewers</span></div></div>`;
    }
    
    if (details?.user?.user) {
      const user = details.user.user;
      
      if (modelData.viewersCount == null) {
        html += `<div class="sc-stat-item"><div class="sc-stat-icon">${user.isLive ? '🟢' : '⚫'}</div><div class="sc-stat-data"><span class="sc-stat-value">${user.isLive ? 'Live' : 'Offline'}</span><span class="sc-stat-label">Status</span></div></div>`;
      }
      
      html += `<div class="sc-stat-item"><div class="sc-stat-icon">❤️</div><div class="sc-stat-data"><span class="sc-stat-value">${formatNumber(user.favoritedCount || 0)}</span><span class="sc-stat-label">Followers</span></div></div>`;
      html += `<div class="sc-stat-item"><div class="sc-stat-icon">📷</div><div class="sc-stat-data"><span class="sc-stat-value">${details.user.photosCount || 0}</span><span class="sc-stat-label">Photos</span></div></div>`;
      html += `<div class="sc-stat-item"><div class="sc-stat-icon">🎬</div><div class="sc-stat-data"><span class="sc-stat-value">${details.user.videosCount || 0}</span><span class="sc-stat-label">Videos</span></div></div>`;
      html += `<div class="sc-stat-item"><div class="sc-stat-icon">💎</div><div class="sc-stat-data"><span class="sc-stat-value">${user.privateRate || 0}</span><span class="sc-stat-label">Tokens/min</span></div></div>`;
      
      // Highest tipper (if available)
      const topTipper = details.cam?.topBestMembers?.[0] || details.topTipper || user.topTipper;
      if (topTipper) {
        const tipperName = topTipper.username || topTipper.name || 'Anonymous';
        const tipperAmount = topTipper.amount || topTipper.tokens || topTipper.tipped || 0;
        html += `<div class="sc-stat-item sc-stat-full"><div class="sc-stat-icon">👑</div><div class="sc-stat-data"><span class="sc-stat-value">${tipperName} (${formatNumber(tipperAmount)})</span><span class="sc-stat-label">Top Tipper</span></div></div>`;
      }
      
      html += '</div>';
      
      // Status badge
      html += `<div class="sc-status-badge sc-status-${user.status}">${user.status || 'unknown'}</div>`;
      
      if (details.cam?.topic) {
        html += `<div class="sc-topic"><p>${details.cam.topic}</p></div>`;
      }
    } else {
      html += '</div><div class="sc-stats-error">Could not load details</div>';
    }
    
    content.innerHTML = html;
  }
  
  function addStatsButton(card) {
    if (processedCards.has(card)) return;
    if (card.querySelector('.sc-stats-button')) return;
    processedCards.add(card);
    
    const button = document.createElement('button');
    button.className = 'sc-stats-button';
    button.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 1C11.7761 1 12 1.22386 12 1.5V13.5C12 13.7761 11.7761 14 11.5 14C11.2239 14 11 13.7761 11 13.5V1.5C11 1.22386 11.2239 1 11.5 1ZM9.5 3C9.77614 3 10 3.22386 10 3.5V13.5C10 13.7761 9.77614 14 9.5 14C9.22386 14 9 13.7761 9 13.5V3.5C9 3.22386 9.22386 3 9.5 3ZM13.5 3C13.7761 3 14 3.22386 14 3.5V13.5C14 13.7761 13.7761 14 13.5 14C13.2239 14 13 13.7761 13 13.5V3.5C13 3.22386 13.2239 3 13.5 3ZM5.5 4C5.77614 4 6 4.22386 6 4.5V13.5C6 13.7761 5.77614 14 5.5 14C5.22386 14 5 13.7761 5 13.5V4.5C5 4.22386 5.22386 4 5.5 4ZM1.5 5C1.77614 5 2 5.22386 2 5.5V13.5C2 13.7761 1.77614 14 1.5 14C1.22386 14 1 13.7761 1 13.5V5.5C1 5.22386 1.22386 5 1.5 5ZM7.5 5C7.77614 5 8 5.22386 8 5.5V13.5C8 13.7761 7.77614 14 7.5 14C7.22386 14 7 13.7761 7 13.5V5.5C7 5.22386 7.22386 5 7.5 5ZM3.5 7C3.77614 7 4 7.22386 4 7.5V13.5C4 13.7761 3.77614 14 3.5 14C3.22386 14 3 13.7761 3 13.5V7.5C3 7.22386 3.22386 7 3.5 7Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg>`;
    button.title = 'View Stats';
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showStats(card, button);
    });
    
    const thumbContainer = card.querySelector('.model-list-item-thumb-container');
    if (thumbContainer) {
      thumbContainer.style.position = 'relative';
      thumbContainer.appendChild(button);
    }
  }
  
  function processCards() {
    document.querySelectorAll('.model-list-item').forEach(addStatsButton);
  }
  
  setTimeout(processCards, 500);
  setTimeout(processCards, 1500);
  setTimeout(processCards, 3000);
  
  const observer = new MutationObserver(() => setTimeout(processCards, 100));
  observer.observe(document.body, { childList: true, subtree: true });
  
  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && !e.target.classList.contains('sc-stats-button')) {
      popup.style.display = 'none';
    }
  });
})();
