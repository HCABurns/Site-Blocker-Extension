
(async () => {
  const siteEl = document.getElementById("currentSite");
  const statusEl = document.getElementById("status");
  const blockBtn = document.getElementById("blockBtn");

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  // If the website is unblockable, display.
  if (!tab.url || !tab.url.startsWith("http")) {
    siteEl.textContent = "This page can’t be blocked...";
    blockBtn.disabled = true;
    blockBtn.style.display = "none";
    document.getElementById("duration").style.display = "none";
    return;
  }

  // Get the domain and display the domain in the popup.
  const domain = new URL(tab.url).hostname;
  siteEl.textContent = domain;

  // Event listener for the button to block site.
  blockBtn.addEventListener("click", () => {
  const domain = new URL(tab.url).hostname;
  // Retrieve the amount of time to block the site.
  const val = document.getElementById("duration").value;
  const durationMinutes = val === "perm" ? null : parseInt(val, 10);
  
  // Set the extra text below to display current status.
  statusEl.classList.add("visible");
  statusEl.style.display = "block";
  statusEl.textContent = "Blocking…";

  // Send chrome block site request for duration user selected.
  chrome.runtime.sendMessage(
    { type: "BLOCK_SITE", domain, durationMinutes },
    (res) => {
      // Successful block so display correct information.
      if (res?.success) {
        if (durationMinutes === null){
          statusEl.textContent = "Blocked forever…";
        }else{
          statusEl.textContent = `Blocked for ${durationMinutes} minutes`;
        }
        // Force reload to show the page is blocked.
        chrome.tabs.reload(tab.id);
      }
      // Site already blocked so display correct message.
      else {
        // Find the data from the site.
        chrome.storage.local.get("blocks", ({ blocks = [] }) => {
        const block = blocks.find(b => b.domain === domain);
        // Not successfully block but wasn't already blocked.
        if (!block){
          statusEl.textContent = "An unexpected error occurred...";
          return;
        }
        // Set that it is blocked forever.
        if (block.expiresAt === null) {
          statusEl.textContent = "Blocked forever...";
        } else {
          // Calculate remaining minutes until it becomes unblocked.
          const remainingMs = block.expiresAt - Date.now();
          const remainingMinutes = Math.max(1,Math.ceil(remainingMs / (60 * 1000)));
          // Display remaining time until it can be used or blocked again.
          statusEl.textContent = `Unblocks in ${remainingMinutes} more minute${remainingMinutes !== 1 ? "s" : ""}`;
        }
      });
      }
    }
  );
});

})();

