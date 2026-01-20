
(async () => {
  const siteEl = document.getElementById("currentSite");
  const statusEl = document.getElementById("status");
  const blockBtn = document.getElementById("blockBtn");

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab.url || !tab.url.startsWith("http")) {
    siteEl.textContent = "This page can’t be blocked";
    blockBtn.disabled = true;
    return;
  }

  const domain = new URL(tab.url).hostname;
  siteEl.textContent = domain;

  blockBtn.addEventListener("click", () => {
  statusEl.classList.add("visible");
  statusEl.style.display = "block";
  statusEl.textContent = "Blocking forever…";

  chrome.runtime.sendMessage(
    { type: "BLOCK_SITE", domain, durationMinutes: null },
    (res) => {
      if (res?.success) {
        statusEl.textContent = "Blocked!";
        chrome.tabs.reload(tab.id);
      } else {
        statusEl.textContent = "Already blocked";
      }
    }
  );
});

document.getElementById("block30").addEventListener("click", () => {
  statusEl.classList.add("visible");
  statusEl.style.display = "block";
  statusEl.textContent = "Blocking for 1 minute…";

  chrome.runtime.sendMessage(
    { type: "BLOCK_SITE", domain, durationMinutes: 1 },
    (res) => {
      if (res?.success) {
        statusEl.textContent = "Blocked for 1 min";
        chrome.tabs.reload(tab.id);
      } else {
        statusEl.textContent = "Already blocked";
      }
    }
  );
});

})();

