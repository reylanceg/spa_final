const socket = io();

let currentTxn = null;
let finishTimeout = null;
let intervalId = null;

function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTimer(tx) {
  stopTimer();
  const timerEl = document.getElementById("service_timer");
  if (!timerEl) return;

  // If service_start_at is provided, compute elapsed; else start now
  const startMs = tx.service_start_at
    ? Date.parse(tx.service_start_at)
    : Date.now();
  const totalMs = tx.total_duration_minutes * 60 * 1000;

  function tick() {
    const now = Date.now();
    const elapsed = now - startMs;
    const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
    timerEl.textContent = formatHMS(remaining);
    if (remaining <= 0) {
      stopTimer();
      // enable finish button if present
      const finishBtn = document.getElementById("btn_finish");
      if (finishBtn) finishBtn.disabled = false;
    }
  }
  tick();
  intervalId = setInterval(tick, 1000);
}

function renderCurrent(tx) {
  const panel = document.getElementById("current_txn");

  if (!tx) {
    panel.innerHTML = "<p>No current transaction. Please go back to the queue to confirm a customer.</p>";
    currentTxn = null;
    if (finishTimeout) {
      clearTimeout(finishTimeout);
      finishTimeout = null;
    }
    stopTimer();
    return;
  }
  currentTxn = tx;
  const items = tx.items
    .map(
      (it) =>
        `<li>${it.service_name} - ₱${it.price.toFixed(2)} (${
          it.duration_minutes
        }m)
          <button class="remove_item" data-itemid="${it.id}">Remove</button>
        </li>`
    )
    .join("");
  panel.innerHTML = `
    <div class="card">
      <div><strong>Code:</strong> ${tx.code || ""} <span class="badge">${
    tx.status
  }</span></div>
      <div><strong>Room:</strong> ${tx.room_number || ""}</div>
      <div><strong>Total:</strong> ₱${tx.total_amount.toFixed(
        2
      )} | <strong>Duration:</strong> ${tx.total_duration_minutes}m</div>
      <div><strong>Timer:</strong> <span id="service_timer">--:--:--</span></div>
      <ul id="items_list">${items}</ul>
      <div class="controls">
        <button id="btn_start">Start Service</button>
        <select id="add_service_select"></select>
        <button id="btn_add">Add Service</button>
        <button id="btn_finish" disabled>Service Finished</button>
      </div>
    </div>
  `;

  fetch("/api/services")
    .then((r) => r.json())
    .then((list) => {
      const sel = document.getElementById("add_service_select");
      sel.innerHTML = "";
      list.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.name} - ₱${s.price}`;
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
  itemsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove_item")) {
      const id = parseInt(e.target.getAttribute("data-itemid"));
      socket.emit("therapist_remove_item", { transaction_item_id: id });
      // Prevent starting while waiting for server update
      if (startBtn) startBtn.disabled = true;
    }
  });

  // If already in service, start timer immediately
  if (tx.status === "in_service" && tx.service_start_at) {
    // disable edits during timer
    startBtn.disabled = true;
    addBtn.disabled = true;
    addSelect.disabled = true;
    setRemoveButtonsDisabled(true);
    startTimer(tx);
  }

  startBtn.onclick = () => {
    socket.emit("therapist_start_service", { transaction_id: tx.id });
    const disableSecs = tx.total_duration_minutes * 1000;
    startBtn.disabled = true;
    addBtn.disabled = true;
    finishBtn.disabled = true;
    setRemoveButtonsDisabled(true);
    if (addSelect) addSelect.disabled = true;

    // start local timer now
    startTimer({ ...tx, service_start_at: new Date().toISOString() });

    if (finishTimeout) clearTimeout(finishTimeout);
    finishTimeout = setTimeout(() => {
      finishBtn.disabled = false;
    }, disableSecs * 1000);
  };

  document.getElementById("btn_add").onclick = () => {
    const sid = document.getElementById("add_service_select").value;
    socket.emit("therapist_add_service", {
      transaction_id: tx.id,
      service_id: sid,
    });
  };

  finishBtn.onclick = () => {
    socket.emit("therapist_finish_service", { transaction_id: tx.id });
  };
}

function bindControls() {
  socket.emit("therapist_subscribe");
}

socket.on("customer_txn_update", (tx) => {
  if (currentTxn && tx.id === currentTxn.id) renderCurrent(tx);
});

socket.on("therapist_finish_result", (res) => {
  if (res && res.ok) {
    alert("Service has been completed. Redirecting back to queue...");
    // Redirect back to therapist queue page
    window.location.href = "/therapist";
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
