const socket = io();

let cart = []; // [{id, name, price, mins}]
let txnId = null;
let txnCodeEl = document.getElementById("txn_code");
let txnStatusEl = document.getElementById("txn_status");
const confirmedItemsEl = document.getElementById("confirmed_items");
const confirmedTotalEl = document.getElementById("confirmed_total");

function renderCart() {
  const cartEl = document.getElementById("cart");
  cartEl.innerHTML = "";
  let total = 0;
  cart.forEach((item, idx) => {
    total += parseFloat(item.price);
    const li = document.createElement("li");
    li.innerHTML = `<button class="remove" data-idx="${idx}">Remove</button> ${
      item.name
    } - $${parseFloat(item.price).toFixed(2)} (${item.mins}m)`;
    cartEl.appendChild(li);
  });
  document.getElementById("total").innerText = total.toFixed(2);
  document.getElementById("confirm").disabled = cart.length === 0;
}

function renderConfirmed(tx) {
  if (!tx) return;
  confirmedItemsEl.innerHTML = "";
  let total = 0;
  tx.items.forEach((it) => {
    total += it.price;
    const li = document.createElement("li");
    li.textContent = `${it.service_name} - $${it.price.toFixed(2)} (${
      it.duration_minutes
    }m)`;
    confirmedItemsEl.appendChild(li);
  });
  confirmedTotalEl.textContent = total.toFixed(2);
}

function bindEvents() {
  document.querySelectorAll("#services .add").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: btn.dataset.price,
        mins: btn.dataset.mins,
      };
      cart.push(item);
      renderCart();
    });
  });

  document.getElementById("cart").addEventListener("click", (e) => {
    if (e.target.classList.contains("remove")) {
      const idx = parseInt(e.target.dataset.idx);
      cart.splice(idx, 1);
      renderCart();
    }
  });

  document.getElementById("confirm").addEventListener("click", () => {
    const name = document.getElementById("customer_name").value;
    const items = cart.map((i) => i.id);
    socket.emit("customer_confirm_selection", { customer_name: name, items });
  });
}

socket.on("connected", () => {
  // connected
});

socket.on("customer_selection_received", ({ transaction_id }) => {
  txnId = transaction_id;
  document.getElementById("after_confirm").classList.remove("hidden");
  txnStatusEl.innerText = "Waiting for therapist confirmation...";
  socket.emit("join_room", { room: `txn_${txnId}` });
});

socket.on("customer_txn_update", (tx) => {
  if (!txnId || tx.id !== txnId) return;
  txnCodeEl.innerText = tx.code || "";
  txnStatusEl.innerText = tx.status;
  renderConfirmed(tx);
});

bindEvents();
renderCart();
