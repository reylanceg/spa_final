// Get auth token from sessionStorage
const authToken = sessionStorage.getItem('cashier_auth_token');

// Initialize socket.io with auth token
const socket = io({
  auth: {
    token: authToken
  },
  query: {
    auth_token: authToken
  }
});

// Add token to fetch requests
function fetchWithAuth(url, options = {}) {
  const headers = {
    ...options.headers,
    'X-Auth-Token': authToken
  };
  return fetch(url, { ...options, headers });
}

let currentTxn = null;
let myName = null;

function li(text) {
  const el = document.createElement("li");
  el.textContent = text;
  return el;
}

function renderQueues(data) {
  console.log("Cashier renderQueues data:", data); // Debug log
  const waitingEl = document.getElementById("cashier_waiting");
  const assignedEl = document.getElementById("cashier_assigned");
  if (waitingEl) {
    waitingEl.innerHTML = "";
    (data.finished || []).forEach((t) => {
      console.log("Processing transaction:", t); // Debug log
      const queueItem = document.createElement("li");
      queueItem.className = "queue-item";
      
      // Create services container to hold all services
      const servicesContainer = document.createElement("div");
      servicesContainer.className = "cashier-services-container";
      
      // Use selected_services which is the correct property name based on therapist queue
      const services = t.selected_services || t.items || t.services || [];
      console.log("Services found:", services); // Debug log
      
      // Render each service in the transaction
      if (services && services.length > 0) {
        services.forEach((service) => {
          console.log("Processing service:", service); // Debug log
          const serviceRow = document.createElement("div");
          serviceRow.className = "cashier-service-row";
          
          const serviceInfo = document.createElement("div");
          serviceInfo.className = "cashier-service-info";
          
          const serviceNameEl = document.createElement("div");
          serviceNameEl.className = "cashier-service-name";
          // Use the correct property names from therapist queue structure
          serviceNameEl.textContent = service.service_name || service.name || service.service || "UNKNOWN SERVICE";
          
          const serviceDetailsEl = document.createElement("div");
          serviceDetailsEl.className = "cashier-service-details";
          const duration = service.duration_minutes || service.duration || 0;
          const area = service.classification_name || service.body_area || service.area || service.classification || 'FULL BODY';
          serviceDetailsEl.textContent = `${duration} MINUTES • ${area.toUpperCase()}`;
          
          serviceInfo.appendChild(serviceNameEl);
          serviceInfo.appendChild(serviceDetailsEl);
          serviceRow.appendChild(serviceInfo);
          servicesContainer.appendChild(serviceRow);
        });
      } else {
        // Fallback if no services - show debug info
        const serviceRow = document.createElement("div");
        serviceRow.className = "cashier-service-row";
        
        const serviceInfo = document.createElement("div");
        serviceInfo.className = "cashier-service-info";
        
        const serviceNameEl = document.createElement("div");
        serviceNameEl.className = "cashier-service-name";
        serviceNameEl.textContent = `NO SERVICES (Debug: ${JSON.stringify(Object.keys(t))})`;
        
        serviceInfo.appendChild(serviceNameEl);
        serviceRow.appendChild(serviceInfo);
        servicesContainer.appendChild(serviceRow);
      }
      
      // Create code container
      const codeContainer = document.createElement("div");
      codeContainer.className = "cashier-service-code";
      
      const codeLabel = document.createElement("div");
      codeLabel.className = "cashier-code-label";
      codeLabel.textContent = "CODE";
      
      const codeNumber = document.createElement("div");
      codeNumber.className = "cashier-code-number";
      codeNumber.textContent = t.code.toString().padStart(4, '0');
      
      codeContainer.appendChild(codeLabel);
      codeContainer.appendChild(codeNumber);
      
      queueItem.appendChild(servicesContainer);
      queueItem.appendChild(codeContainer);
      
      waitingEl.appendChild(queueItem);
    });
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
  fetchWithAuth("/monitor_snapshot")
    .then((r) => r.json())
    .then((data) => renderQueues(data));
}

function renderPaymentHistory(payments) {
  const ul = document.getElementById("payment_history_list");
  if (!ul) return;

  if (payments.length === 0) {
    ul.innerHTML = '<li class="no-history-message">No payment history yet</li>';
    return;
  }

  ul.innerHTML = payments
    .map((payment) => {
      const servicesHTML =
        payment.services && payment.services.length > 0
          ? `
            <div class="payment-history-services">
              ${payment.services
                .map(
                  (service) => `
                  <div class="payment-history-service-item">
                    <div class="payment-history-service-name">${service.service_name.toUpperCase()}</div>
                    <div class="payment-history-service-details">
                      <span class="payment-history-service-duration">${service.duration_minutes} SECONDS</span>
                      <span class="payment-history-service-area">${service.classification_name.toUpperCase()}</span>
                      <span class="payment-history-service-price">₱${service.price.toFixed(2)}</span>
                    </div>
                  </div>
                `
                )
                .join("")}
            </div>
          `
          : "";

      const paymentDate = payment.payment_date
        ? new Date(payment.payment_date).toLocaleString()
        : "N/A";

      return `
      <li class="payment-history-item">
        <div class="payment-history-card">
          <div class="payment-history-header">
            <div class="payment-history-code-section">
              <span class="payment-history-code-label">CODE</span>
              <span class="payment-history-code-number">${payment.code}</span>
            </div>
            <div class="payment-history-info">
              ${payment.therapist_name ? `<div class="payment-therapist">Therapist: ${payment.therapist_name}</div>` : ''}
              ${payment.room_number ? `<div class="payment-room">Room: ${payment.room_number}</div>` : ''}
            </div>
          </div>
          ${servicesHTML}
          <div class="payment-history-footer">
            <div class="payment-details-grid">
              <div class="payment-detail">
                <span class="payment-detail-label">Amount Due:</span>
                <span class="payment-detail-value">₱${payment.amount_due.toFixed(2)}</span>
              </div>
              <div class="payment-detail">
                <span class="payment-detail-label">Amount Paid:</span>
                <span class="payment-detail-value">₱${payment.amount_paid.toFixed(2)}</span>
              </div>
              <div class="payment-detail">
                <span class="payment-detail-label">Change:</span>
                <span class="payment-detail-value">₱${payment.change_amount.toFixed(2)}</span>
              </div>
              <div class="payment-detail">
                <span class="payment-detail-label">Method:</span>
                <span class="payment-detail-value">${payment.payment_method.toUpperCase()}</span>
              </div>
            </div>
            <div class="payment-history-time">
              <span class="payment-history-time-label">Payment Date:</span>
              <span class="payment-history-time-value">${paymentDate}</span>
            </div>
            <button class="view-receipt-button" onclick="viewReceipt(${payment.transaction_id}, '${payment.code}', ${payment.amount_paid}, ${payment.change_amount}, ${JSON.stringify(payment.services).replace(/"/g, '&quot;')}, ${payment.amount_due})">
              View Receipt
            </button>
          </div>
        </div>
      </li>
    `;
    })
    .join("");
}

function refreshPaymentHistory() {
  fetchWithAuth("/cashier/payment-history")
    .then((r) => r.json())
    .then((data) => {
      renderPaymentHistory(data);
    })
    .catch((error) => {
      console.error("Error fetching payment history:", error);
    });
}

function viewReceipt(transactionId, code, amountPaid, changeAmount, services, amountDue) {
  const cashierName = myName || document.getElementById("cashier_name").textContent || "Cashier";
  
  // Create transaction object for receipt
  const tx = {
    id: transactionId,
    code: code,
    total_amount: amountDue,
    items: services.map(s => ({
      service_name: s.service_name,
      duration_minutes: s.duration_minutes,
      price: s.price
    }))
  };
  
  printReceipt(tx, amountPaid, changeAmount, cashierName);
}

function printReceipt(tx, amountPaid, changeAmount, cashierName) {
  // Create a new window for printing
  const printWindow = window.open("", "_blank", "width=600,height=600");

  // Create receipt HTML content
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - ${tx.code}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          margin: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .receipt-header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .business-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .transaction-info {
          margin-bottom: 20px;
        }
        .services-list {
          margin-bottom: 20px;
        }
        .service-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 5px 0;
          border-bottom: 1px dotted #ccc;
        }
        .service-name {
          flex: 1;
        }
        .service-price {
          text-align: right;
          min-width: 80px;
        }
        .payment-section {
          border-top: 2px dashed #000;
          padding-top: 10px;
          margin-top: 20px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .total-section {
          border-top: 2px dashed #000;
          padding-top: 10px;
          margin-top: 20px;
          text-align: right;
          font-weight: bold;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 10px;
          color: #666;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        <div class="business-name">SPA & WELLNESS CENTER</div>
        <div>Payment Receipt</div>
      </div>
      
      <div class="transaction-info">
        <div><strong>Transaction Code:</strong> ${tx.code}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
        <div><strong>Cashier:</strong> ${cashierName}</div>
        <div><strong>Status:</strong> PAID</div>
      </div>
      
      <div class="services-list">
        <div style="font-weight: bold; margin-bottom: 10px;">Services Rendered:</div>
        ${tx.items
          .map(
            (item) => `
          <div class="service-item">
            <span class="service-name">${item.service_name} (${
              item.duration_minutes
            }m)</span>
            <span class="service-price">₱${item.price.toFixed(2)}</span>
          </div>
        `
          )
          .join("")}
      </div>
      
      <div class="payment-section">
        <div class="payment-row">
          <span>Subtotal:</span>
          <span>₱${tx.total_amount.toFixed(2)}</span>
        </div>
        <div class="payment-row">
          <span>Amount Paid:</span>
          <span>₱${amountPaid.toFixed(2)}</span>
        </div>
        <div class="payment-row">
          <span>Change:</span>
          <span>₱${changeAmount.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="total-section">
        <div><strong>TOTAL AMOUNT: ₱${tx.total_amount.toFixed(2)}</strong></div>
      </div>
      
      <div class="footer">
        <div>Thank you for your payment!</div>
        <div>Please keep this receipt for your records</div>
        <div>Transaction completed successfully</div>
      </div>
      
      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()">Print Receipt</button>
        <button onclick="window.close()">Close</button>
      </div>
    </body>
    </html>
  `;

  // Write the receipt content to the new window
  printWindow.document.write(receiptHTML);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = function () {
    printWindow.print();
  };
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
        `<li>${it.service_name} - ₱${it.price.toFixed(2)} (${
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
      <div><strong>Total Due:</strong> ₱<span id="due">${tx.total_amount.toFixed(
        2
      )}</span></div>
      <div class="controls">
        <label>Payment Amount <input id="amount_paid" type="number" min="0" step="0.01"></label>
        <button id="btn_pay" disabled>Pay</button>
        <a id="receipt" href="/receipt/${
          tx.code
        }" target="_blank" style="display:none">Receipt</a>
      </div>
      <div id="change_line"></div>
    </div>
  `;

  const due = tx.total_amount;
  const amountInput = document.getElementById("amount_paid");
  const payBtn = document.getElementById("btn_pay");
  const changeLine = document.getElementById("change_line");
  const receiptLink = document.getElementById("receipt");

  function updateState() {
    const paid = parseFloat(amountInput.value || "0");
    if (!isNaN(paid) && paid >= due) {
      payBtn.disabled = false;
      changeLine.textContent = `Change: ₱${(paid - due).toFixed(2)}`;
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
    const amount_paid = parseFloat(amountInput.value || "0");
    const change_amount = amount_paid - due;

    // Disable pay button immediately after clicking
    payBtn.disabled = true;
    payBtn.textContent = "Processing...";

    socket.emit("cashier_pay", {
      transaction_id: tx.id,
      amount_paid,
      method: "cash", // Automatically set to cash
      cashier_name,
    });

    // Print receipt immediately after payment
    setTimeout(() => {
      printReceipt(tx, amount_paid, change_amount, cashier_name);
    }, 500); // Small delay to ensure payment is processed first
  };

  // Handle receipt click to remove the transaction
  receiptLink.addEventListener("click", () => {
    // Clear the current transaction after receipt is clicked
    setTimeout(() => {
      renderPaymentPanel(null);
      currentTxn = null;
      refreshQueues();
    }, 100); // Small delay to ensure receipt opens first
  });

  // Show receipt if already paid (e.g., re-render after pay)
  if (tx.status === "paid") {
    receiptLink.style.display = "";
  }
}

function checkActiveTransactionAndUpdateButton() {
  const pickNextBtn = document.getElementById("pick_next");
  const currentTransaction = sessionStorage.getItem('current_payment_transaction');
  
  if (currentTransaction) {
    try {
      const tx = JSON.parse(currentTransaction);
      // Disable button if there's an active transaction
      pickNextBtn.disabled = true;
      pickNextBtn.textContent = "Transaction Active";
      pickNextBtn.style.backgroundColor = "#666";
      pickNextBtn.style.cursor = "not-allowed";
      pickNextBtn.title = "Complete current transaction before claiming new one";
    } catch (e) {
      // If there's an error parsing, clear the storage and enable button
      sessionStorage.removeItem('current_payment_transaction');
      enableConfirmButton(pickNextBtn);
    }
  } else {
    // Enable button if no active transaction
    enableConfirmButton(pickNextBtn);
  }
}

function enableConfirmButton(button) {
  button.disabled = false;
  button.textContent = "CONFIRM (FIFO)";
  button.style.backgroundColor = ""; // Reset to default
  button.style.cursor = "";
  button.title = "";
}

function bindControls() {
  socket.emit("cashier_subscribe");
  
  // Check transaction status initially
  checkActiveTransactionAndUpdateButton();
  
  // Listen for storage changes from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === 'current_payment_transaction') {
      checkActiveTransactionAndUpdateButton();
    }
  });
  
  // Periodically check transaction status (in case of direct storage manipulation)
  setInterval(checkActiveTransactionAndUpdateButton, 5000);
  
  // Toggle payment history visibility
  const toggleHistoryBtn = document.getElementById("toggle_payment_history");
  const historyContainer = document.getElementById("payment_history_container");
  const historySection = document.querySelector(".cashier-history-section");
  
  if (toggleHistoryBtn && historyContainer) {
    toggleHistoryBtn.addEventListener("click", () => {
      if (historyContainer.style.display === "none") {
        historyContainer.style.display = "block";
        toggleHistoryBtn.textContent = "Hide History";
        if (historySection) {
          historySection.classList.add("expanded");
        }
        refreshPaymentHistory();
      } else {
        historyContainer.style.display = "none";
        toggleHistoryBtn.textContent = "Show History";
        if (historySection) {
          historySection.classList.remove("expanded");
        }
      }
    });
  }
  
  document.getElementById("pick_next").addEventListener("click", (e) => {
    // Prevent action if button is disabled
    if (e.target.disabled) {
      e.preventDefault();
      return false;
    }
    
    myName = document.getElementById("cashier_name").value || "Cashier 1";
    const counter_number =
      document.getElementById("counter_number").value || "1";
    
    // Claim transaction first, then redirect on success
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
    // Store transaction in sessionStorage and redirect to payment management
    sessionStorage.setItem('current_payment_transaction', JSON.stringify(res.transaction));
    // Update button status immediately before redirect
    checkActiveTransactionAndUpdateButton();
    window.location.href = "/cashier/payment-management";
  } else {
    alert(res.error || "No finished customers");
  }
});

socket.on("cashier_pay_result", (res) => {
  if (res.ok) {
    // Show receipt link and alert with change if any
    const receiptLink = document.getElementById("receipt");
    if (receiptLink) receiptLink.style.display = "";

    const tx = res.transaction;
    const changeLine = document.getElementById("change_line");
    const change = tx && tx.payment ? tx.payment.change_amount || 0 : 0;
    if (changeLine) changeLine.textContent = `Change: ₱${change.toFixed(2)}`;

    // Update pay button to show completed state
    const payBtn = document.getElementById("btn_pay");
    if (payBtn) {
      payBtn.textContent = "Payment Completed";
      payBtn.disabled = true;
    }

    const msg =
      change > 0
        ? `Payment successful. Change: ₱${change.toFixed(2)}`
        : "Payment successful.";
    alert(msg);
  } else {
    // Re-enable pay button if payment failed
    const payBtn = document.getElementById("btn_pay");
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "Pay";
    }
    alert(res.error || "Payment failed");
  }
});

bindControls();
refreshQueues();
