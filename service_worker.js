// -------------------------------
// Ensure cleanup alarm always exists (MV3-safe)
// -------------------------------
chrome.alarms.create("cleanup-expired-blocks", {
  delayInMinutes: 1,
  periodInMinutes: 1
});

// -------------------------------
// Alarm handler: remove expired blocks
// -------------------------------
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "cleanup-expired-blocks") return;

  console.log("Cleanup alarm fired");

  const { blocks = [] } = await chrome.storage.local.get("blocks");
  const now = Date.now();

  const expired = blocks.filter(
    b => b.expiresAt !== null && b.expiresAt <= now
  );

  if (!expired.length) {
    console.log("No expired blocks");
    return;
  }

  console.log("Removing rules:", expired.map(b => b.ruleId));

  // Remove DNR rules
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: expired.map(b => b.ruleId)
  });

  // Persist remaining blocks
  const remaining = blocks.filter(
    b => !expired.includes(b)
  );
  await chrome.storage.local.set({ blocks: remaining });

  // Force re-navigation for affected tabs
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (!tab.url) continue;

    try {
      const url = new URL(tab.url);

      if (expired.some(b => url.hostname === b.domain || url.hostname.endsWith("." + b.domain))) {
        chrome.tabs.update(tab.id, { url: tab.url });
      }
    } catch {
      // Ignore invalid URLs (chrome://, about:, etc.)
    }
  }

  console.log("Expired blocks fully removed");
});

// -------------------------------
// Message handler: add block
// -------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "BLOCK_SITE") return;

  (async () => {
    const { domain, durationMinutes } = msg;

    const { blocks = [] } = await chrome.storage.local.get("blocks");

    // Prevent duplicates
    if (blocks.some(b => b.domain === domain)) {
      sendResponse({ success: false, reason: "already_blocked" });
      return;
    }

    // Generate rule ID
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleId =
      rules.length > 0
        ? Math.max(...rules.map(r => r.id)) + 1
        : 1;

    // Add blocking rule
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        id: ruleId,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: ["main_frame"]
        }
      }]
    });

    // Correct expiry math
    const expiresAt =
      durationMinutes != null
        ? Date.now() + durationMinutes * 0.2 * 1000
        : null;

    blocks.push({ domain, ruleId, expiresAt });
    await chrome.storage.local.set({ blocks });

    sendResponse({ success: true });
  })();

  return true; // REQUIRED for async
});
