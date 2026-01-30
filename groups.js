const groupListEl = document.getElementById("groupList");
const groupCreateRow = document.getElementById("groupCreateRow");
const groupsPanel = document.getElementById("groupsPanel");
const createGroupBtn = document.getElementById("createGroupBtn");
const groupNameInput = document.getElementById("groupNameInput");


/*
* The following code is for the dealing with groups.
*/
function createGroup(name) {
  chrome.runtime.sendMessage(
    { type: "CREATE_GROUP", name },
    (res) => {
      if (res?.success) {
        console.log("Group created");
        // todo: Update the graphic
        render()
      } else {
        // todo: Update the graphic
        console.error("Failed to create group:", res?.reason);
        render()
      }
    }
  );
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "GROUP_ADDED") {
    // Only update if panel is open
    if (groupListEl.classList.contains("open")) {
      render();
    }
  }
});

// Function to render the groups onto the 
function render() {
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


// Toggle groups panel.
async function groupsButtonToggle(groupToggleBtn) {
  const isOpen = groupListEl.classList.toggle("open");
  groupsPanel.classList.toggle("open");
  groupToggleBtn.classList.toggle("open", isOpen);
  if (isOpen) {
    render();
  } else {
  }
};

// Function to create a new group.
createGroupBtn.addEventListener("click", () => {
  createGroup(groupNameInput.value)
});