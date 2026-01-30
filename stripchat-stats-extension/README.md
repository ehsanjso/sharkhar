# Stripchat Stats Viewer

A Chrome extension that shows model viewer count and follower count on hover, without opening the room.

## Features

- 📊 Stats button appears on hover over model thumbnails
- 👁️ Shows current viewer count
- ❤️ Shows follower count
- 📷 Shows photo and video count
- 💰 Shows private rate
- 📝 Shows room topic

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this folder (`stripchat-stats-extension`)

## Usage

1. Go to stripchat.com
2. Hover over any model thumbnail
3. Click the 📊 button that appears in the top-right corner
4. View stats in the popup

## Notes

- Stats are fetched live from the site's API
- Viewer count comes from the page's React state
- Follower count is fetched via API when you click the button
