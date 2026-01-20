# Site-Blocker-Extension

This is a lightweight Chrome extension that allows you to:

- Block sites permanently or temporarily (with custom duration)  
- Automatically unblock sites when temporary blocks expire  
- Force page reload after unblocking  
- Clear all blocked sites safely  

Works in Chrome, Brave, Opera, and other Chromium-based browsers.

---

## Features

- **Temporary Blocking:** Block a site for a fixed time (e.g., 30 minutes).  
- **Permanent Blocking:** Block a site indefinitely.  
- **Automatic Cleanup:** Expired blocks are removed automatically.  
- **Tab Refresh:** Open tabs for expired sites automatically reload.  
- **Clear All Blocks:** Reset the extension completely (all rules + storage).  

---

## Installation (Unpacked)

1. Download or clone the extension folder to your computer.  
   The folder should contain:
   popup.html
   popup.js
   service_worker.js
   manifest.json 
   /icons


2. Open Chrome (or Brave/Opera) and navigate to: chrome://extensions

3. Enable **Developer mode** (top right).  

4. Click **Load unpacked**.  

5. Select the folder where your extension files are located.  

6. The extension should now appear in your toolbar. Pin it if desired.

---

## Usage

1. Click the extension icon in the toolbar.  
2. Use the popup buttons to:
- Block the current site permanently  
- Block the current site temporarily (e.g., 30 minutes)  
3. If a temporary block expires, the site will automatically reload.  
4. Check the blocked site list (if implemented) to see remaining durations.

---

## Clearing All Blocks (Reset)

> ⚠️ **Warning:** This will remove all blocked sites and unblock them immediately. Any temporary or permanent block will be lost.  

### Using Developer Console (Advanced / Testing)

1. Open **Service Worker DevTools**:

2. Paste the following code in the console and press Enter:

```js
// WARNING: This will remove ALL blocks
chrome.declarativeNetRequest.getDynamicRules((rules) => {
  const ruleIds = rules.map(r => r.id);
  chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ruleIds }, () => {
    chrome.storage.local.clear();
    console.log("All blocked sites have been cleared!");
  });
});
```

3. All blocked sites will be immediately unblocked, and tabs will load normally.