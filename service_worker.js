let nextRuleId = 1;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "BLOCK_SITE") return;

  (async () => {
    const domain = msg.domain;

    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const nextRuleId =
      rules.length > 0
        ? Math.max(...rules.map(r => r.id)) + 1
        : 1;

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: nextRuleId,
          priority: 1,
          action: { type: "block" },
          condition: {
            urlFilter: `||${domain}^`,
            resourceTypes: ["main_frame"]
          }
        }
      ]
    });

    sendResponse({ success: true });
  })();

  // Required to keep the message channel open
  return true;
});

