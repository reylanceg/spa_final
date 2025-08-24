const socket = io();

function saveCartToStorage() {
  localStorage.setItem("spa_cart", JSON.stringify(cart));
}

function loadCartFromStorage() {
  const stored = localStorage.getItem("spa_cart");
  if (stored) {
    try {
      cart = JSON.parse(stored);
    } catch (e) {
      cart = [];
    }
  }
}

let cart = [];
loadCartFromStorage(); // <-- Load cart from storage on page load

let txnId = null;
let pendingTransaction = null; // Store the transaction data until user confirms
let customerHasConfirmed = false; // Track if customer has confirmed their selection

// Modal elements
const confirmModal = document.getElementById("confirm_modal");
const modalCodeEl = document.getElementById("modal_txn_code");
const modalItemsEl = document.getElementById("modal_items");
const modalTotalEl = document.getElementById("modal_total");
const modalCloseBtn = document.getElementById("modal_close");
const printReceiptBtn = document.getElementById("print_receipt");

// Services modal elements
const servicesModal = document.getElementById("services_modal");
const servicesModalTitle = document.getElementById("services_modal_title");
const servicesModalList = document.getElementById("services_modal_list");
const servicesModalClose = document.getElementById("services_modal_close");
const servicesModalConfirm = document.getElementById("services_modal_confirm");

let modalSelection = new Set();
let servicesData = [];

async function loadServices() {
  try {
    const res = await fetch("/api/services", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Failed to load services");
    servicesData = await res.json();
  } catch (err) {
    console.error("Error loading services:", err);
    servicesData = [];
  }
}

// Utility functions to work with category data
function getCategoryDescription(categoryName) {
  // const service = servicesData.find((svc) => svc.category === categoryName);
  const service = servicesData.find((svc) => svc.services.name === categoryName)
  return service ? service.category_description : null;
}

function getServicesByCategory(categoryName) {
  return servicesData.filter((svc) => svc.category === categoryName);
}

function getAllCategories() {
  const categories = [...new Set(servicesData.map((svc) => svc.category))];
  return categories.map((cat) => ({
    name: cat,
    description: getCategoryDescription(cat),
    serviceCount: getServicesByCategory(cat).length,
  }));
}

// Utility functions to work with classification data
function getServicesByClassification(classification) {
  return servicesData.filter((svc) => svc.classification === classification);
}

function getAllClassifications() {
  const classifications = [
    ...new Set(
      servicesData
        .map((svc) => svc.classification)
        .filter((c) => c && c !== "Not specified")
    ),
  ];
  return classifications.map((cls) => ({
    name: cls,
    serviceCount: getServicesByClassification(cls).length,
    services: getServicesByClassification(cls),
  }));
}

function getServicesByCategoryAndClassification(categoryName, classification) {
  return servicesData.filter(
    (svc) =>
      svc.category === categoryName && svc.classification === classification
  );
}

// Function to populate service cards with category descriptions
function populateServiceCards() {
  const serviceCards = document.querySelectorAll(".services-card");

  serviceCards.forEach((card) => {
    const title = card.dataset.title;
    if (title && title !== "All Services") {
      const description = getCategoryDescription(title);
      if (description) {
        const descElement = card.querySelector("p");
        if (descElement) {
          descElement.textContent = description;
        }
      }
    }
  });
}

function renderCart() {
  const cartEl = document.getElementById("cart");
  cartEl.innerHTML = "";
  let total = 0;
  cart.forEach((item, idx) => {
    total += parseFloat(item.price);

    // Find the full service data to get the category
    const svc = servicesData.find((s) => String(s.id) === String(item.id));
    const category = svc ? svc.category : "Unknown";

    // <button class="remove" data-idx="${idx}">Remove</button>
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="display:flex; justify-content: space-between" class="cart-items-container">
        <div>
          <span class="cart-category" style="font-weight:bold">${category}</span>
          <div style="font-size:0.95em;">
            <span style="font-size: 0.8em">${item.name}</span>
            <div><span class="cart-duration" style="font-size: 0.8em">${
              item.mins
            } Minutes,</span>
            ${
              item.classification
                ? `<span class="cart-classification" style="font-size: 0.8em">${item.classification}</span>`
                : ""
            }</div>
          </div>
        </div>
        <div>
          <span>₱${parseFloat(item.price).toFixed(2)}</span>
        </div>
      </div>
    `;
    cartEl.appendChild(li);
  });
  document.getElementById("total").innerText = total.toFixed(2);
  document.getElementById("confirm").disabled = cart.length === 0;
  saveCartToStorage();
}

function syncModalSelectionButtons() {
  if (!servicesModalList) return;
  servicesModalList.querySelectorAll(".add-from-modal").forEach((b) => {
    const selected = cart.some((i) => i.id == b.dataset.id);
    b.classList.toggle("selected", selected);
    b.textContent = selected ? "Added" : "Add";
  });
}

// All confirmation details are shown only in the modal

function showModal(tx) {
  if (!confirmModal || !tx) return;
  // populate modal
  modalCodeEl.textContent = tx.code || "";
  modalItemsEl.innerHTML = "";
  let total = 0;
  tx.items.forEach((it) => {
    total += it.price;
    const li = document.createElement("li");
    li.textContent = `${it.service_name} - ₱${it.price.toFixed(2)} (${
      it.duration_minutes
    }m)`;
    modalItemsEl.appendChild(li);
  });
  modalTotalEl.textContent = total.toFixed(2);
  confirmModal.classList.remove("hidden");
}

// Function para maggenerate ng receipt
function printReceipt(tx) {
  // Create a new window for printing
  const printWindow = window.open("", "_blank", "width=600,height=600");

  // Create receipt HTML content
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${tx.code}</title>
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
        <div>Receipt</div>
      </div>
      
      <div class="transaction-info">
        <div><strong>Transaction Code:</strong> ${tx.code}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        <div><strong>Time:</strong> ${new Date().toLocaleTimeString()}</div>
      </div>
      
      <div class="services-list">
        <div style="font-weight: bold; margin-bottom: 10px;">Selected Services:</div>
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
      
      <div class="total-section">
        <div><strong>TOTAL AMOUNT: ₱${tx.items
          .reduce((sum, item) => sum + item.price, 0)
          .toFixed(2)}</strong></div>
      </div>
      
      <div class="footer">
        <div>Thank you for choosing our services!</div>
        <div>Please present this receipt to the therapist</div>
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

function openServicesModal(title) {
  if (!servicesModal || !servicesModalList) return;
  servicesModalTitle.textContent = title || "Services";

  // Start with items already in the cart highlighted
  modalSelection = new Set(cart.map((i) => String(i.id)));
  updateModalConfirmState(); // Add this line

  servicesModalList.innerHTML = "";
  const filterTitle = title && title !== "All Services" ? title : null;

  servicesData
    // .filter((svc) => !filterTitle || svc.category === filterTitle)
    .filter((svc) => !filterTitle || svc.name === filterTitle)
    .forEach((svc) => {
      const id = String(svc.id);
      const isSelected = modalSelection.has(id);

      const modalLi = document.createElement("li");
      modalLi.className = `modal-service-item${isSelected ? " selected" : ""}`;
      modalLi.innerHTML = `
        <div style="display:flex;justify-content:space-between;width:100%;gap:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span class="modal-service-name modal-service-price">₱${parseFloat(
                svc.price
              ).toLocaleString()}</span>
              
            </div>
            <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;" class="modal-service-name">
              <div style="margin-block:2px;" class="service-classification">${
                svc.duration_minutes
              } Minutes</div>
            ${
              svc.classification && svc.classification !== "Not specified"
                ? `<div class="service-classification" style="font-size: 0.85em;font-style: italic;">${svc.classification}</div>`
                : ""
            }</div>
          <button class="indicator-btn ${isSelected ? "active" : ""}"
            aria-pressed="${isSelected ? "true" : "false"}"
            data-id="${svc.id}"
            data-name="${svc.name}"
            data-price="${svc.price}"
            data-duration_minutes="${svc.duration_minutes}"
            data-classification="${svc.classification || ""}">
          </button>
        </div>
      `;
      servicesModalList.appendChild(modalLi);
    });
  servicesModal.classList.remove("hidden");
}

// ${
//               svc.category_description
//                 ? `<div class="category-description" style="font-size: 0.9em; color: #666; margin-top: 4px;">${svc.category_description}</div>`
//                 : ""
//             }
{
  /* <span class="card-modal-service-name">${svc.name}</span> */
}

function bindEvents() {
  // Remove old direct-add binding from hidden/removed list

  document.getElementById("cart").addEventListener("click", (e) => {
    if (e.target.classList.contains("remove")) {
      const idx = parseInt(e.target.dataset.idx);
      cart.splice(idx, 1);
      renderCart(); // This will also save to storage
    }
  });

  // Nagttrigger para malaman na nagconfirm na ng services si customer
  document.getElementById("confirm").addEventListener("click", () => {
    // const name = document.getElementById("customer_name").value;
    const items = cart.map((i) => i.id);
    customerHasConfirmed = true; // Mark that customer has confirmed
    // socket.emit("customer_confirm_selection", { customer_name: name, items });
    socket.emit("customer_confirm_selection", { items })
    localStorage.removeItem("spa_cart"); // <-- Clear cart after confirmation
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      confirmModal.classList.add("hidden");
    });
  }

  if (printReceiptBtn) {
    printReceiptBtn.addEventListener("click", () => {
      if (pendingTransaction) {
        printReceipt(pendingTransaction);
      }
    });
  }

  // backdrop closes modal
  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal_backdrop")) {
        confirmModal.classList.add("hidden");
      }
    });
  }

  // Clickable service cards -> open services list modal
  document.querySelectorAll(".services-card").forEach((card) => {
    card.addEventListener("click", () => {
      const title =
        card.dataset.title ||
        (card.querySelector("h3")
          ? card.querySelector("h3").textContent
          : "Services");
      openServicesModal(title);
    });
  });

  // Services modal close & backdrop
  if (servicesModalClose) {
    servicesModalClose.addEventListener("click", () => {
      servicesModal.classList.add("hidden");
    });
  }
  if (servicesModal) {
    servicesModal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal_backdrop")) {
        servicesModal.classList.add("hidden");
      }
    });
  }

  // Toggle indicator in modal (buffered selection)
  if (servicesModalList) {
    servicesModalList.addEventListener("click", (e) => {
      const indicator = e.target.closest(".indicator-btn");
      if (!indicator) return;

      const id = String(indicator.dataset.id);
      const isActive = indicator.classList.toggle("active");
      indicator.setAttribute("aria-pressed", isActive ? "true" : "false");

      if (isActive) modalSelection.add(id);
      else modalSelection.delete(id);

      const row = indicator.closest(".modal-service-item");
      if (row) row.classList.toggle("selected", isActive);

      updateModalConfirmState(); // <-- Add this
    });
  }

  // Confirm buffered selections => add missing items to cart
  if (servicesModalConfirm) {
    servicesModalConfirm.addEventListener("click", () => {
      const existingIds = new Set(cart.map((i) => String(i.id)));
      servicesModalList
        .querySelectorAll(".indicator-btn.active")
        .forEach((b) => {
          const id = String(b.dataset.id);
          if (existingIds.has(id)) return;
          cart.push({
            id,
            name: b.dataset.name,
            price: b.dataset.price,
            mins: b.dataset.duration_minutes,
            classification: b.dataset.classification, // <-- add this
          });
        });
      renderCart(); // This will also save to storage
      servicesModal.classList.add("hidden");
    });
  }
}

function updateModalConfirmState() {
  servicesModalConfirm.disabled = modalSelection.size === 0;
}

// When opening the modal and initializing selection:
modalSelection = new Set(cart.map((i) => String(i.id)));
updateModalConfirmState();

socket.on("connected", () => {
  // connected
});

socket.on("customer_selection_received", ({ transaction_id, transaction }) => {
  txnId = transaction_id;
  if (transaction) {
    // Store the transaction data
    pendingTransaction = transaction;
    // Reset selected services and disable confirm until new selections are made
    cart = [];
    renderCart();

    // Only show modal if customer has confirmed their selection
    if (customerHasConfirmed) {
      showModal(pendingTransaction);
      customerHasConfirmed = false; // Reset the flag
    }
  }
  socket.emit("join_room", { room: `txn_${txnId}` });
});

socket.on("customer_txn_update", (tx) => {
  if (!txnId || tx.id !== txnId) return;
  // Update the pending transaction data
  pendingTransaction = tx;
  // Don't show modal on therapist updates - only show if customer explicitly confirmed
  // Modal will only show when customer_selection_received is triggered after customer confirmation
});

// Initialize
loadServices().then(() => {
  bindEvents();
  renderCart();
  //populateServiceCards(); // Call this function after servicesData is loaded
});

// test cart
const cartContainer = document.querySelector(".cart-container");
const toggle = document.querySelector(".toggle");
toggle.addEventListener("click", () => {
  cartContainer.classList.toggle("close");
});

document.querySelectorAll(".site-link").forEach((link) => {
  // const site = link.href + "/";
  if (link.href === window.location.href) {
    link.setAttribute("aria-current", "page");
  }
});
