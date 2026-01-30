(function() {
  'use strict';

  const processedCards = new WeakSet();
  const ratingsCache = new Map();
  let storePageProcessed = false;
  
  // Extract user's location from URL
  function getLocation() {
    const url = new URL(window.location.href);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    
    if (!lat || !lng) {
      const pl = url.searchParams.get('pl');
      if (pl) {
        try {
          const decoded = JSON.parse(atob(pl));
          return { lat: decoded.latitude, lng: decoded.longitude };
        } catch (e) {}
      }
    }
    
    return lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
  }
  
  const location = getLocation();
  
  // Create popup
  function createPopup() {
    const popup = document.createElement('div');
    popup.id = 'ue-google-popup';
    popup.innerHTML = `
      <div class="ue-popup-header">
        <span class="ue-popup-title">Google Rating</span>
        <button class="ue-popup-close">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M11.78 4.03c.22-.22.22-.59 0-.81-.23-.23-.59-.23-.82 0L7.5 6.69 4.03 3.22c-.23-.23-.59-.23-.82 0-.22.22-.22.59 0 .81L6.69 7.5l-3.47 3.47c-.22.22-.22.59 0 .81.23.22.59.22.82 0L7.5 8.31l3.47 3.47c.22.22.59.22.81 0 .23-.22.23-.59 0-.81L8.31 7.5l3.47-3.47z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="ue-popup-content">
        <div class="ue-loading">
          <div class="ue-spinner"></div>
          <span>Fetching Google rating...</span>
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('.ue-popup-close').addEventListener('click', () => {
      popup.style.display = 'none';
    });
    return popup;
  }
  
  const popup = createPopup();
  
  // Find image wrapper
  function findImageWrapper(parent) {
    const picture = parent.querySelector('picture');
    if (!picture) return null;
    
    let wrapper = picture.parentElement;
    while (wrapper && wrapper !== parent) {
      if (wrapper.className && wrapper.className.includes('lazyload')) {
        wrapper = wrapper.parentElement;
        continue;
      }
      if (wrapper.tagName === 'DIV' && wrapper.offsetWidth > 100) {
        return wrapper;
      }
      wrapper = wrapper.parentElement;
    }
    return null;
  }
  
  // Extract restaurant name from card
  function extractName(container) {
    const h3 = container.querySelector('h3');
    if (h3) return h3.textContent.trim();
    return '';
  }
  
  // Fetch rating via background script
  async function fetchGoogleRating(name) {
    const cacheKey = name;
    if (ratingsCache.has(cacheKey)) {
      return ratingsCache.get(cacheKey);
    }
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          action: 'fetchGoogleRating', 
          name,
          address: 'Toronto',
          location: location
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          if (response && response.success && response.data) {
            ratingsCache.set(cacheKey, response.data);
            resolve(response.data);
          } else {
            resolve(null);
          }
        }
      );
      setTimeout(() => resolve(null), 12000);
    });
  }
  
  // Render star display
  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = '★'.repeat(full);
    if (half) stars += '½';
    stars += '☆'.repeat(5 - full - (half ? 1 : 0));
    return stars;
  }
  
  // Format review count
  function formatReviews(reviews) {
    if (reviews >= 1000) {
      return (reviews / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return reviews.toLocaleString();
  }
  
  // Show popup with rating
  async function showRating(name, button) {
    const rect = button.getBoundingClientRect();
    popup.style.display = 'block';
    popup.style.top = `${rect.bottom + 8}px`;
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`;
    
    const content = popup.querySelector('.ue-popup-content');
    content.innerHTML = '<div class="ue-loading"><div class="ue-spinner"></div><span>Fetching Google rating...</span></div>';
    
    const cleanName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(name + ' Toronto')}`;
    
    const data = await fetchGoogleRating(name);
    
    if (data && data.rating) {
      const locationNote = data.source === 'google_maps' ? ' (nearest)' : '';
      content.innerHTML = `
        <div class="ue-restaurant-name">${cleanName}${locationNote}</div>
        <div class="ue-rating-display">
          <div class="ue-rating-main">
            <span class="ue-rating-value">${data.rating.toFixed(1)}</span>
            <div class="ue-rating-stars">${renderStars(data.rating)}</div>
          </div>
          ${data.reviews ? `<span class="ue-reviews">${formatReviews(data.reviews)} reviews</span>` : ''}
        </div>
        <a href="${searchUrl}" target="_blank" class="ue-maps-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          View on Google Maps
        </a>
      `;
    } else {
      content.innerHTML = `
        <div class="ue-restaurant-name">${cleanName}</div>
        <div class="ue-no-rating">
          <p>Rating not found</p>
          <a href="${searchUrl}" target="_blank" class="ue-maps-link ue-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Search on Google Maps
          </a>
        </div>
      `;
    }
  }
  
  // Add rating button to feed page cards
  function addRatingButton(storeCard) {
    const parent = storeCard.parentElement;
    if (!parent || processedCards.has(parent)) return;
    processedCards.add(parent);
    
    const imgWrapper = findImageWrapper(parent);
    if (!imgWrapper) return;
    
    imgWrapper.classList.add('ue-card-wrapper');
    imgWrapper.style.position = 'relative';
    
    const btn = document.createElement('button');
    btn.className = 'ue-rating-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>';
    btn.title = 'View Google Rating';
    
    const name = extractName(parent);
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showRating(name, btn);
    });
    
    imgWrapper.appendChild(btn);
  }
  
  // Add button to city page cards
  function addRatingButtonCityPage(card) {
    if (processedCards.has(card)) return;
    if (!card.href || !card.href.includes('/store/')) return;
    processedCards.add(card);
    
    const imgContainer = card.querySelector('picture')?.parentElement?.parentElement;
    if (!imgContainer) return;
    
    imgContainer.classList.add('ue-card-wrapper');
    imgContainer.style.position = 'relative';
    
    const btn = document.createElement('button');
    btn.className = 'ue-rating-btn';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>';
    btn.title = 'View Google Rating';
    
    const name = card.querySelector('h3')?.textContent?.trim() || '';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showRating(name, btn);
    });
    
    imgContainer.appendChild(btn);
  }
  
  // Add Google rating button to store/restaurant page
  function addStorePageButton() {
    if (storePageProcessed) return;
    if (!window.location.pathname.includes('/store/')) return;
    
    const h1 = document.querySelector('h1');
    if (!h1) return;
    
    // Check if button already exists
    if (document.querySelector('.ue-store-rating-btn')) return;
    
    storePageProcessed = true;
    const name = h1.textContent.trim();
    
    // Create a nice badge-style button
    const btn = document.createElement('button');
    btn.className = 'ue-store-rating-btn';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      <span>Google Rating</span>
    `;
    btn.title = 'View Google Rating';
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showRating(name, btn);
    });
    
    // Insert after h1 or in the header area
    const headerContainer = h1.parentElement;
    if (headerContainer) {
      headerContainer.appendChild(btn);
    }
  }
  
  // Process all store cards
  function processCards() {
    document.querySelectorAll('a[data-testid="store-card"]').forEach(addRatingButton);
    document.querySelectorAll('a[data-test="store-link"]').forEach(addRatingButtonCityPage);
  }
  
  // Initial run
  setTimeout(processCards, 1000);
  setTimeout(processCards, 2000);
  setTimeout(processCards, 4000);
  
  // Process store page
  setTimeout(addStorePageButton, 1500);
  setTimeout(addStorePageButton, 3000);
  
  // Watch for changes
  const observer = new MutationObserver(() => {
    setTimeout(processCards, 300);
    setTimeout(addStorePageButton, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Handle navigation (SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      storePageProcessed = false;
      setTimeout(addStorePageButton, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Close popup on outside click
  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && !e.target.closest('.ue-rating-btn') && !e.target.closest('.ue-store-rating-btn')) {
      popup.style.display = 'none';
    }
  });
  
  console.log('Uber Eats Google Ratings extension loaded', location ? `at ${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : '(no location)');
})();
