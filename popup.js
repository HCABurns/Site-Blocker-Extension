/**
 * Converts a remaining time duration (in milliseconds) into a
 * human-readable string suitable for UI display.
 *
 * The output format automatically adapts based on the size of the duration:
 * - Days + hours (e.g. "2 days and 3 hours")
 * - Hours + minutes
 * - Minutes + seconds
 * - Seconds only
 *
 * Pluralization is handled automatically.
 *
 * @param {number} remainingMs
 *   The remaining time in milliseconds.
 *   Values <= 0 will be treated as 0.
 *
 * @returns {string}
 *   A formatted, human-readable duration string.
 */
function getTime(remainingMs) {
  // Convert milliseconds to seconds.
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  // Break total seconds into time units.
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Return largest and second largest units from the countdown.
  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} and ` + `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  else if (minutes > 60) {
    return `${hours} hour${hours !== 1 ? "s" : ""} and ` + `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} and ` + `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  else if (seconds > 0) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  else {
    return `Page Unblocked!`;
  }
}


(async () => {
  // Get elements from the popup.
  const siteEl = document.getElementById("currentSite");
  const statusEl = document.getElementById("status");
  const blockBtn = document.getElementById("blockBtn");
  const toggleBtn = document.getElementById("toggleBlocked");
  const blockedListEl = document.getElementById("blockedList");

  // Toggle blocked pages panel.
  toggleBtn.addEventListener("click", () => {
    const isOpen = blockedListEl.classList.toggle("open");
    toggleBtn.classList.toggle("open", isOpen);
    if (isOpen) {
      renderBlockedSites();
      updateCountdowns();
      countdownTimer = setInterval(updateCountdowns, 1000);
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  });

  // Render function (only called on open or storage changes)
  function renderBlockedSites() {
    chrome.storage.local.get("blocks", ({ blocks = [] }) => {
      blockedListEl.innerHTML = "";

      if (blocks.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No blocked sites...";
        li.className = "empty";
        blockedListEl.appendChild(li);
        return;
      }

      for (const block of blocks) {
        const li = document.createElement("li");
        li.className = "blocked-item";

        const domainSpan = document.createElement("span");
        domainSpan.textContent = block.domain;

        const timeSpan = document.createElement("span");
        timeSpan.className = "time";
        timeSpan.dataset.expiresAt = block.expiresAt;

        if (block.expiresAt === null) {
          timeSpan.textContent = "Forever";
        } else {
          timeSpan.textContent = getTime(block.expiresAt - Date.now());
        }

        li.appendChild(domainSpan);
        li.appendChild(timeSpan);
        blockedListEl.appendChild(li);
      }
    });
  }

  // Update only timers
  function updateCountdowns() {
    const now = Date.now();

    document.querySelectorAll(".time").forEach(span => {
      const expiresAt = span.dataset.expiresAt;

      if (expiresAt === "null") return;

      const remaining = expiresAt - now;
      span.textContent = remaining <= 0 ? "Site unblocked!" : getTime(remaining);
    });
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!blockedListEl.classList.contains("open")) return;
    if (changes.blocks) renderBlockedSites();
  });


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

    function startCountdown(expiresAt) {
      function update() {
        const remainingMs = expiresAt - Date.now();

        if (remainingMs <= 0) {
          statusEl.textContent = "Block expired...";
          clearInterval(timer);
          return;
        }
        statusEl.textContent = `Unblocks in ` + getTime(remainingMs);
      }

      update(); // run immediately
      const timer = setInterval(update, 1000);
    }

    // Update the list of blocked sites if another site is blocked and it's open.
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "BLOCKED_SITE_ADDED") {
        // Only update if panel is open
        if (blockedListEl.classList.contains("open")) {
          renderBlockedSites();
        }
      }
    });


    // Send chrome block site request for duration user selected.
    chrome.runtime.sendMessage(
      { type: "BLOCK_SITE", domain, durationMinutes },
      (res) => {
        // Successful block so display correct information.
        if (res?.success) {
          if (durationMinutes === null) {
            statusEl.textContent = "Blocked forever…";
          } else {
            statusEl.textContent = `Blocked for ` + getTime(durationMinutes * 60 * 1000);
            chrome.storage.local.get("blocks", ({ blocks = [] }) => {
              const block = blocks.find(b => b.domain === domain);
              startCountdown(block.expiresAt);
            });
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
            if (!block) {
              statusEl.textContent = "An unexpected error occurred...";
              return;
            }
            // Set that it is blocked forever.
            if (block.expiresAt === null) {
              statusEl.textContent = "Blocked forever...";
            } else {
              // Calculate remaining minutes until it becomes unblocked.
              const remainingMs = block.expiresAt - Date.now();
              const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
              // Display remaining time until it can be used or blocked again.
              //statusEl.textContent = `Unblocks in ${remainingMinutes} more minute${remainingMinutes !== 1 ? "s" : ""}`;
              startCountdown(block.expiresAt)
            }
          });
        }
      }
    );
  });

})();

