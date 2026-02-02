import { getTime } from "./time.js";

let countdownTimer = null;

export function initBlockingUI({
    toggleBtn,
    blockedListEl,
    blockBtn,
    statusEl,
    siteEl,
    durationSelect,
    tab
}) {
    toggleBtn.addEventListener("click", () =>
        toggleBlockedPanel(toggleBtn, blockedListEl)
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.blocks && blockedListEl.classList.contains("open")) {
            renderBlockedSites(blockedListEl);
        }
    });

    blockBtn.addEventListener("click", () =>
        handleBlockClick({
            blockBtn,
            statusEl,
            siteEl,
            durationSelect,
            blockedListEl,
            tab
        })
    );
}

/* ---------- PANEL ---------- */

function toggleBlockedPanel(toggleBtn, blockedListEl) {
    const isOpen = blockedListEl.classList.toggle("open");
    toggleBtn.classList.toggle("open", isOpen);

    if (isOpen) {
        renderBlockedSites(blockedListEl);
        updateCountdowns();
        countdownTimer = setInterval(updateCountdowns, 1000);
    } else {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

/* ---------- RENDER ---------- */

function renderBlockedSites(blockedListEl) {
    chrome.storage.local.get("blocks", ({ blocks = [] }) => {
        blockedListEl.innerHTML = "";

        if (!blocks.length) {
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

            timeSpan.textContent =
                block.expiresAt === null
                    ? "Forever"
                    : getTime(block.expiresAt - Date.now());

            li.append(domainSpan, timeSpan);
            blockedListEl.appendChild(li);
        }
    });
}

function updateCountdowns() {
    const now = Date.now();

    document.querySelectorAll(".time").forEach(span => {
        if (span.dataset.expiresAt === "null") return;
        const remaining = span.dataset.expiresAt - now;
        span.textContent = remaining <= 0 ? "Page Unblocked!" : getTime(remaining);
    });
}

/* ---------- BLOCKING ---------- */

function handleBlockClick({
    statusEl,
    durationSelect,
    siteEl,
    blockedListEl,
    tab
}) {
    const domain = siteEl.textContent;
    const val = durationSelect.value;
    const durationMinutes = val === "perm" ? null : parseInt(val, 10);

    statusEl.classList.add("visible");
    statusEl.textContent = "Blocking…";

    chrome.runtime.sendMessage(
        { type: "BLOCK_SITE", domain, durationMinutes },
        res => handleBlockResponse(res, domain, durationMinutes, statusEl, tab)
    );
}

function handleBlockResponse(res, domain, durationMinutes, statusEl, tab) {
    if (res?.success) {
        if (durationMinutes === null) {
            statusEl.textContent = "Blocked forever…";
        } else {
            chrome.storage.local.get("blocks", ({ blocks }) => {
                const block = blocks.find(b => b.domain === domain);
                startCountdown(block.expiresAt, statusEl);
            });
        }
        chrome.tabs.reload(tab.id);
    } else {
        chrome.storage.local.get("blocks", ({ blocks }) => {
            const block = blocks.find(b => b.domain === domain);
            if (!block) {
                statusEl.textContent = "Unexpected error…";
                return;
            }
            if (block.expiresAt === null) {
                statusEl.textContent = "Blocked forever…";
            } else {
                startCountdown(block.expiresAt, statusEl);
            }
        });
    }
}

function startCountdown(expiresAt, statusEl) {
    function update() {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
            statusEl.textContent = "Block expired…";
            clearInterval(timer);
        } else {
            statusEl.textContent = `Unblocks in ${getTime(remaining)}`;
        }
    }

    update();
    const timer = setInterval(update, 1000);
}
