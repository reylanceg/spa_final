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

let currentTxn = null;
let finishTimeout = null;
let intervalId = null;

function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  // Clear timer state from sessionStorage when stopping
  sessionStorage.removeItem('service_timer_state');
}

function startTimer(tx) {
  stopTimer();
  const timerEl = document.getElementById("service_timer");
  if (!timerEl) {
    console.error(`[TIMER] Timer element not found for transaction ${tx.id}`);
    return;
  }

  // If service_start_at is provided, compute elapsed; else start now
  const startMs = tx.service_start_at
    ? Date.parse(tx.service_start_at)
    : Date.now();
  // Convert minutes to seconds: if service is 5 minutes, timer will run for 5 seconds
  const totalMs = tx.total_duration_minutes * 1000;

  console.log(`[TIMER] Starting timer for transaction ${tx.id}`);
  console.log(`[TIMER] Service started at: ${tx.service_start_at}`);
  console.log(`[TIMER] Start timestamp: ${startMs}`);
  console.log(`[TIMER] Total duration: ${tx.total_duration_minutes} seconds (converted from minutes value)`);

  function tick() {
    const now = Date.now();
    const elapsed = now - startMs;
    const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
    const formattedTime = formatSeconds(remaining);
    timerEl.textContent = formattedTime;
    
    // Log every 30 seconds to avoid spam
    if (remaining % 30 === 0) {
      console.log(`[TIMER] Running - remaining: ${remaining}s, display: ${formattedTime}`);
    }
    
    // Store timer state in sessionStorage for persistence
    sessionStorage.setItem('service_timer_state', JSON.stringify({
      transactionId: tx.id,
      startMs: startMs,
      totalMs: totalMs,
      remaining: remaining
    }));
    
    if (remaining <= 0) {
      stopTimer();
      // Clear timer state when finished
      sessionStorage.removeItem('service_timer_state');
      // Show timer finished layout
      showTimerFinishedLayout(tx);
    }
  }
  tick();
  intervalId = setInterval(tick, 1000);
  console.log(`[TIMER] Timer started with interval ID: ${intervalId}`);
}

function renderTimerLayout(tx) {
  const panel = document.getElementById("current_txn");
  const items = tx.items
    .map(
      (it) =>
        `<li>
          <div class="spa-service-item-info">
            <div class="spa-service-name">${it.service_name}</div>
            <div class="spa-service-details">${
              it.duration_minutes
            } MINUTES<br>${it.area || "FULL BACK"}</div>
          </div>
          <div class="spa-service-price">₱${it.price.toFixed(0)}</div>
        </li>`
    )
    .join("");

  panel.innerHTML = `
    <div class="card">
      <div class="spa-timer-finished">
        <div class="spa-timer-display" id="service_timer">00:00:00</div>
      </div>
      <ul id="items_list">${items}</ul>
      <div class="controls-therapist">
        <button id="btn_finish" disabled>SERVICE FINISHED</button>
      </div>
    </div>
  `;

  // Bind the finish button
  const finishBtn = document.getElementById("btn_finish");
  if (finishBtn) {
    finishBtn.onclick = () => {
      socket.emit("therapist_finish_service", { transaction_id: tx.id });
    };
  }
}

function showTimerFinishedLayout(tx) {
  const panel = document.getElementById("current_txn");
  const items = tx.items
    .map(
      (it) =>
        `<li>
          <div class="spa-service-item-info">
            <div class="spa-service-name">${it.service_name}</div>
            <div class="spa-service-details">${
              it.duration_minutes
            } MINUTES<br>${it.area || "FULL BACK"}</div>
          </div>
          <div class="spa-service-price">₱${it.price.toFixed(0)}</div>
        </li>`
    )
    .join("");

  panel.innerHTML = `
    <div class="card">
      <div class="spa-timer-finished">
        <div class="spa-timer-display">00:00:00</div>
      </div>
      <ul id="items_list">${items}</ul>
      <div class="controls">
        <button id="btn_done_service">DONE SERVICE</button>
      </div>
    </div>
  `;

  // Bind the done service button
  document.getElementById("btn_done_service").onclick = () => {
    socket.emit("therapist_finish_service", { transaction_id: tx.id });
  };
}

function renderCurrent(tx) {
  console.log(`[RENDER] renderCurrent called with transaction:`, tx);
  const panel = document.getElementById("current_txn");

  if (!tx) {
    console.log(`[RENDER] No transaction - showing no transaction message`);
    panel.innerHTML =
      '<div class="spa-no-transaction">No current transaction. Please go back to the queue to confirm a customer.</div>';
    currentTxn = null;
    if (finishTimeout) {
      clearTimeout(finishTimeout);
      finishTimeout = null;
    }
    stopTimer();
    return;
  }
  currentTxn = tx;
  
  // Check if service is in progress and show timer layout
  const isInService = tx.status === "In Service" && tx.service_start_at;
  console.log(`[RENDER] Transaction ${tx.id} status: ${tx.status}, service_start_at: ${tx.service_start_at}, isInService: ${isInService}`);
  
  const items = tx.items
    .map(
      (it) =>
        `<li>
          <div class="spa-service-item-info">
            <div class="spa-service-name">${it.service_name}</div>
            <div class="spa-service-details">${
              it.duration_minutes
            } MINUTES<br>${it.area || "FULL BACK"}</div>
          </div>
          <div class="spa-service-price">₱${it.price.toFixed(0)}</div>
          ${!isInService ? `<button class="remove_item" data-itemid="${it.id}">REMOVE</button>` : ''}
        </li>`
    )
    .join("");

  if (isInService) {
    console.log(`[RENDER] Rendering timer layout for in-service transaction`);
    panel.innerHTML = `
      <div class="card">
        <div class="spa-timer-finished">
          <div class="spa-timer-display" id="service_timer">00:00:00</div>
        </div>
        <ul id="items_list">${items}</ul>
        <div class="controls">
          <button id="btn_finish" disabled>SERVICE FINISHED</button>
        </div>
      </div>
    `;
    
    // Verify timer element was created
    setTimeout(() => {
      const timerEl = document.getElementById("service_timer");
      if (timerEl) {
        console.log(`[RENDER] Timer element created successfully`);
      } else {
        console.error(`[RENDER] Timer element not found after creating HTML`);
      }
    }, 100);
  } else {
    console.log(`[RENDER] Rendering service selection layout for transaction`);
    panel.innerHTML = `
      <div class="card">
        <div class="spa-service-status">
          <div class="spa-service-code">Code: ${
            tx.code || ""
          } <span class="badge">${tx.status}</span></div>
          <div class="spa-service-total">Total: ₱${tx.total_amount.toFixed(
            2
          )} | Duration: ${tx.total_duration_minutes} min</div>
        </div>
        <ul id="items_list">${items}</ul>
        <div class="controls">
          <div class="spa-add-service-container">
            <select id="add_service_select"></select>
            <button id="btn_add">ADD</button>
          </div>
          <button id="btn_start">START SERVICE</button>
        </div>
      </div>
    `;
  }

  fetch("/api/services")
    .then((r) => r.json())
    .then((list) => {
      const sel = document.getElementById("add_service_select");
      sel.innerHTML = "";

      // Sort services by category first, then by name
      const sortedList = list.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });

      // Group services by category and add headers
      let currentCategory = null;
      sortedList.forEach((s) => {
        // Add category header if this is a new category
        if (s.category !== currentCategory) {
          const headerOpt = document.createElement("option");
          headerOpt.disabled = true;
          headerOpt.textContent = `── ${s.category.toUpperCase()} ──`;
          headerOpt.style.fontWeight = "bold";
          headerOpt.style.backgroundColor = "#f0f0f0";
          sel.appendChild(headerOpt);
          currentCategory = s.category;
        }

        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.name} - ${s.duration_minutes}min - ₱${s.price}`;
        sel.appendChild(opt);
      });
    });

  const startBtn = document.getElementById("btn_start");
  const addBtn = document.getElementById("btn_add");
  const finishBtn = document.getElementById("btn_finish");
  const addSelect = document.getElementById("add_service_select");

  const itemsList = document.getElementById("items_list");
  // Disable Start button if there are no selected services
  const hasServices = Array.isArray(tx.items) && tx.items.length > 0;
  if (startBtn) startBtn.disabled = !hasServices;
  function setRemoveButtonsDisabled(disabled) {
    itemsList
      .querySelectorAll(".remove_item")
      .forEach((btn) => (btn.disabled = disabled));
  }

  // Only add remove button listeners if not in service
  if (!isInService) {
    itemsList.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove_item")) {
        const id = parseInt(e.target.getAttribute("data-itemid"));
        socket.emit("therapist_remove_item", { transaction_item_id: id });
        // Prevent starting while waiting for server update
        if (startBtn) startBtn.disabled = true;
      }
    });
  }

  // If already in service, start timer immediately
  if (isInService) {
    // Check if we have stored timer state for this transaction
    const storedTimerState = sessionStorage.getItem('service_timer_state');
    if (storedTimerState) {
      try {
        const timerState = JSON.parse(storedTimerState);
        if (timerState.transactionId === tx.id) {
          console.log(`[TIMER] Resuming timer for transaction ${tx.id} from stored state`);
          console.log(`[TIMER] Stored remaining time: ${timerState.remaining} seconds`);
        }
      } catch (e) {
        console.error('[TIMER] Error parsing stored timer state:', e);
        sessionStorage.removeItem('service_timer_state');
      }
    }
    startTimer(tx);
  }

  // Bind start button only if it exists (not in service)
  if (startBtn) {
    startBtn.onclick = () => {
      console.log(`[SERVICE] Starting service for transaction ${tx.id}`);
      
      // Immediately disable any existing remove buttons
      const existingRemoveButtons = document.querySelectorAll(".remove_item");
      existingRemoveButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.5";
      });
      
      // Immediately show timer layout with current timestamp
      const updatedTx = {
        ...tx,
        status: "In Service",
        service_start_at: new Date().toISOString(),
      };
      
      console.log(`[SERVICE] Immediately showing timer layout and disabling remove buttons`);
      renderCurrent(updatedTx);
      
      // Send request to server
      socket.emit("therapist_start_service", { transaction_id: tx.id });

      // When server responds via customer_txn_update, it will update with accurate timestamp
    };
  }

  // Bind add button only if it exists (not in service)
  if (addBtn) {
    addBtn.onclick = () => {
      const sid = document.getElementById("add_service_select").value;
      socket.emit("therapist_add_service", {
        transaction_id: tx.id,
        service_id: sid,
      });
    };
  }

  // Bind finish button if it exists
  if (finishBtn) {
    finishBtn.onclick = () => {
      socket.emit("therapist_finish_service", { transaction_id: tx.id });
    };
  }
}

function bindControls() {
  socket.emit("therapist_subscribe");

  // Add token to back-to-therapist link
  const backLink = document.getElementById("back_to_therapist_link");
  if (backLink) {
    backLink.addEventListener("click", (e) => {
      // Add token as query parameter
      const token = sessionStorage.getItem("therapist_auth_token");
      if (token) {
        backLink.href = `/therapist?auth_token=${encodeURIComponent(token)}`;
      }
    });
  }
}

socket.on("customer_txn_update", (tx) => {
  console.log(`[SOCKET] Received customer_txn_update for transaction ${tx.id}`, tx);
  if (currentTxn && tx.id === currentTxn.id) {
    console.log(`[SOCKET] Updating current transaction UI`);
    renderCurrent(tx);
  } else {
    console.log(`[SOCKET] Ignoring update - current txn: ${currentTxn?.id}, received: ${tx.id}`);
  }
});

socket.on("therapist_finish_result", (res) => {
  if (res && res.ok) {
    alert("Service has been completed. Redirecting back to queue...");
    // Redirect back to therapist queue page with token
    const token = sessionStorage.getItem("therapist_auth_token");
    const redirectUrl = token 
      ? `/therapist?auth_token=${encodeURIComponent(token)}`
      : "/therapist";
    window.location.href = redirectUrl;
  }
});

socket.on("therapist_edit_done", (res) => {
  if (res.ok && res.transaction) renderCurrent(res.transaction);
});

// Check if there's a current transaction when page loads
socket.on("connect", () => {
  socket.emit("therapist_get_current_transaction");
});

socket.on("therapist_current_transaction", (tx) => {
  renderCurrent(tx);
});

bindControls();
renderCurrent(null);
