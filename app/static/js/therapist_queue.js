// Get auth token from sessionStorage
const authToken = sessionStorage.getItem("therapist_auth_token");

// Initialize socket.io with auth token
const socket = io({
  auth: {
    token: authToken,
  },
  query: {
    auth_token: authToken,
  },
});

// Add token to fetch requests
function fetchWithAuth(url, options = {}) {
  const headers = {
    ...options.headers,
    "X-Auth-Token": authToken,
  };
  return fetch(url, { ...options, headers });
}

function renderQueue(list) {
  const ul = document.getElementById("waiting_queue");
  if (!ul) return;

  ul.innerHTML = list
    .map((t) => {
      // Build single card with all services for the same code
      const servicesHTML =
        t.selected_services && t.selected_services.length > 0
          ? `
            <div class="service-card">
              <div class="service-header">
                <div class="service-title">
                  ${t.selected_services
                    .map(
                      (service) => `
                      <div class="service-item">
                        <div class="service-name">${service.service_name.toUpperCase()}</div>
                        <div class="service-details">
                          <div class="service-duration">${
                            service.duration_minutes
                          } SECONDS</div>
                          <div class="service-area">${service.classification_name.toUpperCase()}</div>
                        </div>
                      </div>
                    `
                    )
                    .join("")}
                </div>
                <div class="service-code">
                  <div class="code-label">CODE</div>
                  <div class="code-number">${t.code}</div>
                </div>
              </div>
            </div>
          `
          : "";

      return `
      <li class="queue-item">
        <div class="queue-card-container">
          ${servicesHTML}
        </div>
      </li>
    `;
    })
    .join("");
}

{
  /* <div class="center-info">${customerNameHTML}</div>; */
}

function refreshQueue() {
  fetchWithAuth("/monitor_snapshot")
    .then((r) => r.json())
    .then((data) => {
      renderQueue(data.waiting || []);
    });
}

function checkActiveTransaction() {
  socket.emit("therapist_get_current_transaction");
}

function updateConfirmButtonState(hasActiveTransaction) {
  const confirmButton = document.getElementById("confirm_next");
  const toggleButton = document.getElementById("toggle_room_status");
  const currentStatus = toggleButton.getAttribute("data-status");
  
  if (hasActiveTransaction) {
    confirmButton.disabled = true;
    confirmButton.textContent = "Service in Progress";
    confirmButton.classList.add("disabled-state");
    
    // Disable the on-break toggle button when therapist has active transaction
    toggleButton.disabled = true;
    toggleButton.classList.add("disabled-state");
  } else {
    // Check if therapist is on break (preparing status)
    const isOnBreak = currentStatus === "preparing";
    
    if (isOnBreak) {
      confirmButton.disabled = true;
      confirmButton.textContent = "On Break - Unavailable";
      confirmButton.classList.add("disabled-state");
    } else {
      confirmButton.disabled = false;
      confirmButton.textContent = "Confirm FIFO";
      confirmButton.classList.remove("disabled-state");
    }
    
    // Re-enable the on-break toggle button when no active transaction
    toggleButton.disabled = false;
    toggleButton.classList.remove("disabled-state");
  }
}

function bindControls() {
  socket.emit("therapist_subscribe");

  // Check for active transaction on load
  checkActiveTransaction();

  document.getElementById("confirm_next").addEventListener("click", () => {
    const confirmButton = document.getElementById("confirm_next");
    if (confirmButton.disabled) return;

    const therapist_name =
      document.getElementById("therapist_name").value || "Therapist 1";
    const room_number = document.getElementById("room_number").value || "101";
    socket.emit("therapist_confirm_next", { therapist_name, room_number });
  });

  // Add toggle room status functionality
  document.getElementById("toggle_room_status").addEventListener("click", () => {
    const toggleButton = document.getElementById("toggle_room_status");
    const currentStatus = toggleButton.getAttribute("data-status");
    
    // Don't allow toggle if button is disabled due to active transaction
    if (toggleButton.disabled) {
      return;
    }
    
    // Disable button during request
    toggleButton.disabled = true;
    toggleButton.textContent = "Updating...";
    
    fetchWithAuth("/therapist/toggle-room-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update button state
        toggleButton.setAttribute("data-status", data.new_status);
        toggleButton.textContent = data.button_text;
        
        // Update button styling based on status
        if (data.new_status === "preparing") {
          toggleButton.classList.add("preparing-status");
          toggleButton.classList.remove("available-status");
        } else {
          toggleButton.classList.add("available-status");
          toggleButton.classList.remove("preparing-status");
        }
        
        // Update confirm button state based on new room status
        updateConfirmButtonState(false); // No active transaction, just check room status
      } else {
        alert("Error updating room status: " + (data.error || "Unknown error"));
        // Reset button text on error
        toggleButton.textContent = currentStatus === "available" ? "On Break" : "Available";
      }
    })
    .catch(error => {
      console.error("Error:", error);
      alert("Error updating room status");
      // Reset button text on error
      toggleButton.textContent = currentStatus === "available" ? "On Break" : "Available";
    })
    .finally(() => {
      // Only re-enable if there's no active transaction
      checkActiveTransaction();
    });
  });
}

socket.on("therapist_confirm_result", (res) => {
  if (res.ok) {
    // Redirect to service management page
    window.location.href = "/therapist/service-management";
  } else {
    alert(res.error || "No pending customers");
  }
});

socket.on("cashier_queue_updated", () => {
  refreshQueue();
});

socket.on("therapist_current_transaction", (transaction) => {
  updateConfirmButtonState(!!transaction);
});

socket.on("therapist_queue_updated", () => {
  refreshQueue();
  // Also check for active transactions when queue updates
  checkActiveTransaction();
});

bindControls();
refreshQueue();
