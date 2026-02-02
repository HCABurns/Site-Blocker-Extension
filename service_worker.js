// Ensure cleanup alarm always exists.
chrome.alarms.create("cleanup-expired-blocks", {
  delayInMinutes: 1,
  periodInMinutes: 1
});

// Alarm handler to remove expired blocks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "cleanup-expired-blocks") return;

  console.log("Cleanup alarm fired");

  const { blocks = [] } = await chrome.storage.local.get("blocks");
  const now = Date.now();

  const expired = blocks.filter(b => b.expiresAt !== null && b.expiresAt <= now);

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
  const remaining = blocks.filter(b => !expired.includes(b));
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

// Function to deal with blocking a site.
async function blockSite(msg, sendResponse) {

  console.log("Blocking Occurring!")

  const { domain, durationMinutes } = msg;

  const { blocks = [] } = await chrome.storage.local.get("blocks");

  // Prevent duplicates
  if (blocks.some(b => b.domain === domain)) {
    sendResponse({ success: false, reason: "already_blocked" });
    return;
  }

  // Generate rule ID
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleId = rules.length > 0 ? Math.max(...rules.map(r => r.id)) + 1 : 1;

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

  // Calculate expiry.
  const expiresAt = durationMinutes != null ? Date.now() + durationMinutes * 60 * 1000 : null;

  // Add to the list.
  blocks.push({ domain, ruleId, expiresAt });
  await chrome.storage.local.set({ blocks });
  // Sent message blocked site is added so update the blocked list.
  chrome.runtime.sendMessage({
    type: "BLOCKED_SITE_ADDED",
    domain,
    expiresAt
  });

  sendResponse({ success: true });
  //return true;
}

async function handleCreateGroup(msg, sendResponse) {

  const { name } = msg;
  console.log(name);

  if (!name || !name.trim()) {
    sendResponse({ success: false, reason: "invalid_name" });
    return;
  }

  console.log("1");

  const { groups = {} } = await chrome.storage.local.get("groups");
  console.log(groups)
  console.log("1.5");

  // Prevent duplicates (case-insensitive)
  const exists = Object.values(groups).some(g => g.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    sendResponse({ success: false, reason: "group_already_exists" });
    return;
  }

  console.log("2");

  // Add the group to the list.
  const id = crypto.randomUUID();
  groups[id] = {
    id,
    name: name.trim(),
    createdAt: Date.now()
  };

  console.log("3");

  // Set updates groups list.
  await chrome.storage.local.set({ groups });

  // Return successful addition.
  chrome.runtime.sendMessage({
    type: "GROUP_ADDED",
    name
  });
  sendResponse({ success: true });
  console.log("SUCCESS!")
  //return true;

}

// Message handler: Add website to block
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log(msg);

  if (!msg?.type) return;

  switch (msg.type) {
    case "BLOCK_SITE":
      blockSite(msg, sendResponse);
      return true;

    case "CREATE_GROUP":
      handleCreateGroup(msg, sendResponse);
      return true;

    default:
      console.warn("Unknown message type:", msg.type);
      return;
  }
});
