const socket = io();

let currentTxn = null;
let myName = null;

function li(text) {
  const el = document.createElement("li");
  el.textContent = text;
  return el;
}

function renderQueues(data) {
  const waitingEl = document.getElementById("cashier_waiting");
  const assignedEl = document.getElementById("cashier_assigned");
  if (waitingEl) {
    waitingEl.innerHTML = "";
    (data.finished || []).forEach((t) =>
      waitingEl.appendChild(li(`${t.code} - $${t.total_amount.toFixed(2)}`))
    );
  }
  if (assignedEl && myName) {
    assignedEl.innerHTML = "";
    (data.payment_assigned || [])
      .filter((t) => t.cashier === myName)
      .forEach((t) => {
        assignedEl.appendChild(li(`${t.code} (counter ${t.counter})`));
      });
  }
}

function refreshQueues() {
  fetch("/monitor_snapshot")
    .then((r) => r.json())
    .then((data) => renderQueues(data));
}

function renderPaymentPanel(tx) {
  const panel = document.getElementById("payment_panel");
  if (!tx) {
    panel.innerHTML = "<p>No claimed transaction.</p>";
    return;
  }
  currentTxn = tx;
  const items = tx.items
    .map(
      (it) =>
        `<li>${it.service_name} - $${it.price.toFixed(2)} (${
          it.duration_minutes
        }m)</li>`
    )
    .join("");
  panel.innerHTML = `
    <div class="card">
      <div><strong>Code:</strong> ${tx.code} <span class="badge">${
    tx.status
  }</span></div>
      <ul>${items}</ul>
      <div><strong>Total Due:</strong> $<span id="due">${tx.total_amount.toFixed(
        2
      )}</span></div>
      <div class="controls">
        <label>Payment Amount <input id="amount_paid" type="number" min="0" step="0.01"></label>
        <label>Method
          <select id="method">
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </label>
        <button id="btn_pay" disabled>Pay</button>
        <a id="receipt" href="/receipt/${tx.code}" target="_blank">Receipt</a>
      </div>
      <div id="change_line"></div>
    </div>
  `;

  const due = tx.total_amount;
  const amountInput = document.getElementById("amount_paid");
  const payBtn = document.getElementById("btn_pay");
  const changeLine = document.getElementById("change_line");

  function updateState() {
    const paid = parseFloat(amountInput.value || "0");
    if (!isNaN(paid) && paid >= due) {
      payBtn.disabled = false;
      changeLine.textContent = `Change: $${(paid - due).toFixed(2)}`;
    } else {
      payBtn.disabled = true;
      changeLine.textContent = "";
    }
  }
  amountInput.addEventListener("input", updateState);
  updateState();

  payBtn.onclick = () => {
    const cashier_name =
      myName || document.getElementById("cashier_name").value || "Cashier 1";
    const method = document.getElementById("method").value || "cash";
    const amount_paid = parseFloat(amountInput.value || "0");
    socket.emit("cashier_pay", {
      transaction_id: tx.id,
      amount_paid,
      method,
      cashier_name,
    });
  };
}

function bindControls() {
  socket.emit("cashier_subscribe");
  document.getElementById("pick_next").addEventListener("click", () => {
    myName = document.getElementById("cashier_name").value || "Cashier 1";
    const counter_number =
      document.getElementById("counter_number").value || "1";
    socket.emit("cashier_claim_next", { cashier_name: myName, counter_number });
  });
}

socket.on("cashier_queue_updated", () => {
  refreshQueues();
});

socket.on("monitor_updated", () => {
  // also refresh; therapist finish triggers monitor update
  refreshQueues();
});

socket.on("cashier_claim_result", (res) => {
  if (res.ok) {
    renderPaymentPanel(res.transaction);
    refreshQueues();
  } else {
    alert(res.error || "No finished customers");
  }
});

socket.on("cashier_pay_result", (res) => {
  if (res.ok) {
    alert("Payment successful.");
    renderPaymentPanel(null);
    refreshQueues();
  } else {
    alert(res.error || "Payment failed");
  }
});

bindControls();
refreshQueues();
