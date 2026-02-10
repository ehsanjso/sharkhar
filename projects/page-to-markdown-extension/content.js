// Page to Markdown - Content Script (Three.js Journey only)

(function() {
  'use strict';

  // ONLY run on threejs-journey.com
  if (!window.location.hostname.includes('threejs-journey.com')) {
    return;
  }

  // Avoid duplicate injection
  if (document.getElementById('p2m-container')) return;

  // Create floating button container
  const container = document.createElement('div');
  container.id = 'p2m-container';
  container.innerHTML = `
    <div id="p2m-floating-btn" title="Save as Markdown">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    </div>
    <div id="p2m-save-all-btn" title="Save All (auto-next)">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="13 17 18 12 13 7"></polyline>
        <polyline points="6 17 11 12 6 7"></polyline>
      </svg>
    </div>
    <div id="p2m-stop-btn" title="Stop" style="display:none;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="6" width="12" height="12"></rect>
      </svg>
    </div>
    <div id="p2m-counter"></div>
  `;
  document.body.appendChild(container);
  
  const button = document.getElementById('p2m-floating-btn');
  const saveAllBtn = document.getElementById('p2m-save-all-btn');
  const stopBtn = document.getElementById('p2m-stop-btn');
  const counter = document.getElementById('p2m-counter');

  // Make container draggable
  let isDragging = false;
  let startX, startY, initialX = 0, initialY = 0;

  container.addEventListener('mousedown', (e) => {
    startX = e.clientX - initialX;
    startY = e.clientY - initialY;
    isDragging = true;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    initialX = e.clientX - startX;
    initialY = e.clientY - startY;
    container.style.transform = `translate(${initialX}px, ${initialY}px)`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Single save click handler
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isDragging) saveAsMarkdown();
  });

  // Save All mode
  let saveAllRunning = false;
  let savedCount = 0;
  let visitedUrls = new Set(JSON.parse(localStorage.getItem('p2m-visited') || '[]'));
  
  saveAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isDragging) startSaveAll();
  });
  
  stopBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isDragging) stopSaveAll();
  });

  function startSaveAll() {
    saveAllRunning = true;
    savedCount = 0;
    visitedUrls.clear(); // Fresh start
    localStorage.removeItem('p2m-visited');
    saveAllBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    localStorage.setItem('p2m-save-all', 'true');
    updateCounter();
    showNotification('Save All started...');
    saveAndNext();
  }

  function stopSaveAll() {
    saveAllRunning = false;
    saveAllBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    counter.style.display = 'none';
    localStorage.removeItem('p2m-save-all');
    localStorage.removeItem('p2m-saved-count');
    localStorage.removeItem('p2m-visited');
    visitedUrls.clear();
    showNotification(`Stopped. Saved ${savedCount} files.`);
  }

  function updateCounter() {
    counter.textContent = savedCount;
    counter.style.display = 'flex';
  }

  function saveAndNext() {
    if (!saveAllRunning) return;
    
    const currentUrl = window.location.href.split('?')[0]; // Ignore query params
    
    // Check if we already visited this page (loop detection)
    if (visitedUrls.has(currentUrl)) {
      showNotification(`Loop detected! Saved ${savedCount} lessons.`);
      stopSaveAll();
      return;
    }
    
    // Mark as visited
    visitedUrls.add(currentUrl);
    localStorage.setItem('p2m-visited', JSON.stringify([...visitedUrls]));
    
    saveAsMarkdown(() => {
      savedCount++;
      localStorage.setItem('p2m-saved-count', savedCount);
      updateCounter();
      
      // Find and click next link
      setTimeout(() => {
        if (!saveAllRunning) return;
        
        const nextLink = findNextLink();
        if (nextLink) {
          const nextUrl = nextLink.href.split('?')[0];
          
          // Extra check: don't go to already visited URL
          if (visitedUrls.has(nextUrl)) {
            showNotification(`Done! Saved ${savedCount} lessons.`);
            stopSaveAll();
            return;
          }
          
          showNotification('Next lesson...');
          const currentUrl = window.location.href;
          nextLink.click();
          
          // SPA detection: wait for URL to change, then continue
          waitForNavigation(currentUrl, () => {
            if (saveAllRunning) {
              waitForContent(() => saveAndNext());
            }
          });
        } else {
          showNotification(`Done! Saved ${savedCount} lessons.`);
          stopSaveAll();
        }
      }, 1000);
    });
  }

  // Wait for URL to change (SPA navigation detection)
  function waitForNavigation(oldUrl, callback, maxWait = 10000) {
    const startTime = Date.now();
    
    function check() {
      if (window.location.href !== oldUrl) {
        // URL changed - wait a bit for content to settle
        setTimeout(callback, 500);
      } else if (Date.now() - startTime < maxWait) {
        setTimeout(check, 200);
      } else {
        // Timeout - maybe it was a full page reload, which will handle itself
        console.log('P2M: Navigation timeout, might be full reload');
      }
    }
    
    check();
  }
  
  // Wait for lesson content to appear
  function waitForContent(callback, maxWait = 15000) {
    const startTime = Date.now();
    
    function check() {
      const content = getLessonContent();
      if (content && content.textContent.trim().length > 100) {
        callback();
      } else if (Date.now() - startTime < maxWait) {
        setTimeout(check, 500);
      } else {
        showNotification('Content load timeout', true);
        stopSaveAll();
      }
    }
    
    setTimeout(check, 1000); // Initial delay for page transition
  }

  function findNextLink() {
    // Three.js Journey specific: look for the "next" sibling link
    // The navigation shows previous/next lessons with .sibling-link class
    
    // Method 1: Look for explicit "is-next" class
    const nextByClass = document.querySelector('.sibling-link.is-next');
    if (nextByClass && nextByClass.href) return nextByClass;
    
    // Method 2: Find link with right-pointing arrow/chevron
    const siblingLinks = document.querySelectorAll('.sibling-link');
    for (const link of siblingLinks) {
      // Check for right arrow SVG or icon
      const svg = link.querySelector('svg');
      if (svg) {
        const path = svg.innerHTML || '';
        // Right-pointing arrows typically have larger x2 values
        if (path.includes('chevron-right') || path.includes('arrow-right')) {
          return link;
        }
      }
      
      // Check position - if link is on the right side of the viewport, it's likely "next"
      const rect = link.getBoundingClientRect();
      if (rect.left > window.innerWidth / 2 && link.href) {
        return link;
      }
    }
    
    // Method 3: Look at visual layout - rightmost sibling link is usually "next"
    if (siblingLinks.length >= 2) {
      let rightmost = null;
      let maxLeft = -1;
      siblingLinks.forEach(link => {
        const rect = link.getBoundingClientRect();
        if (rect.left > maxLeft && link.href) {
          maxLeft = rect.left;
          rightmost = link;
        }
      });
      if (rightmost) return rightmost;
    }
    
    return null;
  }

  // Get lesson content
  function getLessonContent() {
    return document.querySelector('.js-lesson-content');
  }

  // Save as markdown
  function saveAsMarkdown(callback) {
    button.classList.add('p2m-saving');

    const content = getLessonContent();
    
    if (!content || content.textContent.trim().length < 50) {
      showNotification('No lesson content found', true);
      button.classList.remove('p2m-saving');
      if (callback) callback();
      return;
    }

    const title = document.title || 'untitled';
    const url = window.location.href;
    
    // Get lesson slug from URL
    const lessonMatch = url.match(/lessons\/([^\/\?#]+)/);
    const lessonSlug = lessonMatch ? lessonMatch[1] : 'unknown';
    
    // Try to get lesson number from active item in sidebar
    let lessonNum = '';
    const activeLesson = document.querySelector('.lesson.is-active .title');
    if (activeLesson) {
      const match = activeLesson.textContent.match(/^(\d+)/);
      if (match) {
        lessonNum = match[1].padStart(2, '0') + '-';
      }
    }
    
    // Convert to markdown
    let markdown = `# ${title}\n\n`;
    markdown += `> Source: ${url}\n\n`;
    markdown += `---\n\n`;
    markdown += htmlToMarkdown(content);

    // Filename (flat - no subfolder, Chrome extension downloads can't reliably create folders)
    const filename = `threejs-${lessonNum}${lessonSlug}.md`;

    // Download via background script
    chrome.runtime.sendMessage({
      action: 'download',
      filename: filename,
      content: markdown
    }, (response) => {
      button.classList.remove('p2m-saving');
      
      if (chrome.runtime.lastError || !response?.success) {
        // Fallback: direct download
        downloadDirect(filename, markdown);
      }
      
      showNotification('Saved: ' + lessonSlug);
      if (callback) setTimeout(callback, 500);
    });
  }

  function downloadDirect(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Remove any path separators for safety
    a.download = filename.replace(/[\/\\]/g, '-');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  // HTML to Markdown converter
  function htmlToMarkdown(element) {
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const tag = node.tagName.toLowerCase();
      const children = Array.from(node.childNodes);
      let content = children.map(processNode).join('');
      
      // Skip hidden elements
      try {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return '';
      } catch(e) {}

      switch (tag) {
        case 'h1': return `\n# ${content.trim()}\n\n`;
        case 'h2': return `\n## ${content.trim()}\n\n`;
        case 'h3': return `\n### ${content.trim()}\n\n`;
        case 'h4': return `\n#### ${content.trim()}\n\n`;
        case 'h5': return `\n##### ${content.trim()}\n\n`;
        case 'h6': return `\n###### ${content.trim()}\n\n`;
        case 'p': return `\n${content.trim()}\n\n`;
        case 'br': return '\n';
        case 'strong': case 'b': return `**${content.trim()}**`;
        case 'em': case 'i': return `*${content.trim()}*`;
        case 'code':
          if (node.parentElement?.tagName.toLowerCase() === 'pre') return content;
          return `\`${content.trim()}\``;
        case 'pre':
          const codeEl = node.querySelector('code');
          const lang = codeEl?.className.match(/language-(\w+)/)?.[1] || '';
          const codeContent = codeEl ? codeEl.textContent : content;
          return `\n\`\`\`${lang}\n${codeContent.trim()}\n\`\`\`\n\n`;
        case 'a':
          const href = node.getAttribute('href') || '';
          if (href && !href.startsWith('javascript:')) {
            return `[${content.trim()}](${href})`;
          }
          return content;
        case 'img':
          const src = node.getAttribute('src') || '';
          const alt = node.getAttribute('alt') || 'image';
          return `![${alt}](${src})`;
        case 'ul': case 'ol': return `\n${content}\n`;
        case 'li':
          const parent = node.parentElement;
          const isOrdered = parent?.tagName.toLowerCase() === 'ol';
          const bullet = isOrdered ? `${Array.from(parent.children).indexOf(node) + 1}.` : '-';
          return `${bullet} ${content.trim()}\n`;
        case 'blockquote': return `\n> ${content.trim()}\n\n`;
        case 'hr': return '\n---\n\n';
        case 'script': case 'style': case 'noscript': case 'iframe': case 'svg': case 'video': case 'audio': case 'button':
          return '';
        default:
          return content;
      }
    }

    let markdown = processNode(element);
    return markdown.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  // Show notification
  function showNotification(message, isError = false) {
    // Remove existing
    document.querySelectorAll('.p2m-notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'p2m-notification' + (isError ? ' p2m-error' : '');
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('p2m-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Resume save-all if it was running (for full page reloads)
  if (localStorage.getItem('p2m-save-all') === 'true') {
    saveAllRunning = true;
    savedCount = parseInt(localStorage.getItem('p2m-saved-count') || '0');
    saveAllBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    updateCounter();
    
    showNotification('Resuming...');
    waitForContent(() => saveAndNext());
  }

})();
