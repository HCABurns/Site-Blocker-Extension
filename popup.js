
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
    statusEl.textContent = "Blocking…";

    chrome.runtime.sendMessage(
    { type: "BLOCK_SITE", domain },
    () => {
      statusEl.textContent = "Blocked!";
      chrome.tabs.reload(tab.id);
    }
    );
  });
})();

