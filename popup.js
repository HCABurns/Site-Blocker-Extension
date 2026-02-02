import { initBlockingUI } from "./blocking.js";
import { initGroupsUI } from "./groups.js";



(async () => {
  const siteEl = document.getElementById("currentSite");
  const statusEl = document.getElementById("status");
  const blockBtn = document.getElementById("blockBtn");
  const toggleBlocked = document.getElementById("toggleBlocked");
  const blockedListEl = document.getElementById("blockedList");
  const groupToggleBtn = document.getElementById("toggleGroups");
  const durationSelect = document.getElementById("duration");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.startsWith("http")) {
    siteEl.textContent = "This page can’t be blocked…";
    blockBtn.disabled = true;
    durationSelect.style.display = "none";
    return;
  }

  siteEl.textContent = new URL(tab.url).hostname;

  initBlockingUI({
    toggleBtn: toggleBlocked,
    blockedListEl,
    blockBtn,
    statusEl,
    siteEl,
    durationSelect,
    tab
  });

  initGroupsUI({ groupToggleBtn });
})();
