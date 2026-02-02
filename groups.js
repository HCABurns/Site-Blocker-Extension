export function initGroupsUI({ groupToggleBtn }) {
  const groupListEl = document.getElementById("groupList");
  const groupCreateRow = document.getElementById("groupCreateRow");
  const groupsPanel = document.getElementById("groupsPanel");
  const createGroupBtn = document.getElementById("createGroupBtn");
  const groupNameInput = document.getElementById("groupNameInput");

  /* -----------------------------
   * Messaging
   * ----------------------------- */

  function sendCreateGroup(name) {
    if (!name || !name.trim()) return;

    chrome.runtime.sendMessage(
      { type: "CREATE_GROUP", name: name.trim() },
      (res) => {
        if (!res?.success) {
          console.error("Failed to create group:", res?.reason);
        }
        renderGroups();
      }
    );
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "GROUP_ADDED") return;
    if (groupsPanel.classList.contains("open")) {
      renderGroups();
    }
  });

  /* -----------------------------
   * Rendering
   * ----------------------------- */

  function renderGroups() {
    chrome.storage.local.get("groups", ({ groups = {} }) => {
      groupListEl.innerHTML = "";

      const groupArray = Object.values(groups);

      if (groupArray.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No groups...";
        li.className = "empty";
        groupListEl.appendChild(li);
        return;
      }

      for (const group of groupArray) {
        const li = document.createElement("li");
        li.className = "blocked-item";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = group.name;

        li.appendChild(nameSpan);
        groupListEl.appendChild(li);
      }
    });
  }

  /* -----------------------------
   * Panel toggle
   * ----------------------------- */

  function toggleGroupsPanel() {
    const isOpen = groupsPanel.classList.toggle("open");
    groupListEl.classList.toggle("open", isOpen);
    groupToggleBtn.classList.toggle("open", isOpen);

    if (isOpen) {
      renderGroups();
    }
  }

  /* -----------------------------
   * Event wiring
   * ----------------------------- */

  groupToggleBtn.addEventListener("click", toggleGroupsPanel);

  createGroupBtn.addEventListener("click", () => {
    sendCreateGroup(groupNameInput.value);
    groupNameInput.value = "";
  });
}
