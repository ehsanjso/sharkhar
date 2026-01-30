// Background service worker - fetches Google ratings

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchGoogleRating') {
    fetchRating(request.name, request.address, request.location)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function fetchRating(name, address, location) {
  // Check if name contains address in parentheses: "Pizzaiolo (13 St. Clair Ave W)"
  const addressInName = name.match(/\(([^)]*(?:St|Ave|Rd|Blvd|Dr|Street|Avenue|Road|Boulevard|Drive)[^)]*)\)/i);
  const cleanName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  
  // If we have address in the name, use it directly (most accurate)
  if (addressInName) {
    const result = await tryGoogleSearch(cleanName, addressInName[1] + ' Toronto');
    if (result) return result;
  }
  
  // Try regular search
  const searchResult = await tryGoogleSearch(cleanName, address);
  if (searchResult) return searchResult;
  
  // Try location-aware search for chains
  if (location && location.lat && location.lng) {
    const locationResult = await tryLocationAwareSearch(cleanName, location);
    if (locationResult) return locationResult;
  }
  
  return null;
}

async function tryGoogleSearch(name, address) {
  const searchQuery = `${name} ${address} restaurant`;
  
  try {
    const html = await fetchGoogle(searchQuery);
    if (!html) return null;
    return extractGoogleRating(html);
  } catch (e) {
    console.log('Search error:', e);
    return null;
  }
}

async function tryLocationAwareSearch(name, location) {
  const lat = location.lat.toFixed(3);
  const lng = location.lng.toFixed(3);
  
  try {
    // Search with coordinates to find nearby locations
    const nearbyQuery = `${name} near ${lat},${lng}`;
    const nearbyHtml = await fetchGoogle(nearbyQuery);
    
    if (nearbyHtml) {
      // Extract a specific address from the results
      const addressMatch = nearbyHtml.match(/(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Ave|Rd|Blvd|Dr|Street|Avenue|Road|Boulevard|Drive)[^,<]*)/i);
      
      if (addressMatch) {
        // Search with the specific address
        const specificQuery = `${name} ${addressMatch[1]} Toronto`;
        const specificHtml = await fetchGoogle(specificQuery);
        
        if (specificHtml) {
          const result = extractGoogleRating(specificHtml);
          if (result) {
            result.source = 'google_maps';
            return result;
          }
        }
      }
    }
    
    return null;
  } catch (e) {
    console.log('Location search error:', e);
    return null;
  }
}

async function fetchGoogle(query) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
  
  const response = await fetch(searchUrl, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) return null;
  return await response.text();
}

function extractGoogleRating(html) {
  // Only return ratings when we find "Google reviews"
  const googleReviewsIdx = html.indexOf('Google reviews');
  if (googleReviewsIdx === -1) return null;
  
  const reviewsMatch = html.match(/(\d[\d,]*)\s*Google\s*reviews/i);
  if (!reviewsMatch) return null;
  
  // Find the rating closest to "Google reviews" text
  const beforeReviews = html.substring(Math.max(0, googleReviewsIdx - 3000), googleReviewsIdx);
  const ariaMatches = beforeReviews.match(/aria-label="Rated (\d\.\d) out of 5/g);
  
  if (ariaMatches && ariaMatches.length > 0) {
    const lastMatch = ariaMatches[ariaMatches.length - 1];
    const ratingMatch = lastMatch.match(/(\d\.\d)/);
    
    if (ratingMatch) {
      return {
        rating: parseFloat(ratingMatch[1]),
        reviews: parseInt(reviewsMatch[1].replace(/,/g, '')),
        source: 'google_panel'
      };
    }
  }
  
  return null;
}
