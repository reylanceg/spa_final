const socket = io();

socket.emit("monitor_subscribe");

const soundEl = document.getElementById("notifySound");
let soundReady = false;

function ensureSoundReady() {
  if (!soundEl) return;
  // Try preloading
  try {
    soundEl.load();
  } catch (e) {}
  // Try a silent play-pause cycle to warm up; may be blocked until a gesture
  try {
    const p = soundEl.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        soundEl.pause();
        soundEl.currentTime = 0;
        soundReady = true;
      }).catch(() => {
        // Will be resolved after a user gesture
      });
    }
  } catch (e) {}
}

function unlockOnFirstGesture() {
  const handler = () => {
    if (!soundEl) return;
    soundEl
      .play()
      .then(() => {
        soundEl.pause();
        soundEl.currentTime = 0;
        soundReady = true;
      })
      .catch(() => {});
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true });
}

function playSound() {
  if (!soundEl) return;
  try {
    soundEl.currentTime = 0;
    const p = soundEl.play();
    if (p && typeof p.then === "function") {
      p.catch((err) => {
        // Autoplay blocked; set unlock listeners
        unlockOnFirstGesture();
        // Optional: log once
        if (!soundReady)
          console.warn(
            "Monitor sound blocked until user interacts with the page once."
          );
      });
    }
  } catch (e) {}
}

function li(text) {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}

function refreshLists() {
  fetch("/monitor_snapshot")
    .then((r) => r.json())
    .then((data) => {
      const w = document.getElementById("waiting_therapist");
      const c = document.getElementById("confirmed");
      const s = document.getElementById("in_service");
      const f = document.getElementById("finished");
      const p = document.getElementById("paid");
      const pa = document.getElementById("payment_assigned");

      w.innerHTML = "";
      (data.waiting || []).forEach((t) =>
        w.appendChild(
          li(
            `${t.code || "—"} (${
              t.total_duration_minutes
            }m) total $${t.total_amount.toFixed(2)}`
          )
        )
      );

      c.innerHTML = "";
      (data.confirmed || []).forEach((t) =>
        c.appendChild(
          li(`${t.code} with ${t.therapist} in room ${t.room_number}`)
        )
      );

      s.innerHTML = "";
      (data.in_service || []).forEach((t) =>
        s.appendChild(li(`${t.code} started with ${t.therapist}`))
      );

      f.innerHTML = "";
      (data.finished || []).forEach((t) =>
        f.appendChild(li(`${t.code} waiting for cashier`))
      );

      pa.innerHTML = "";
      (data.payment_assigned || []).forEach((t) =>
        pa.appendChild(li(`${t.code} go to cashier ${t.cashier}`))
      );

      p.innerHTML = "";
      (data.paid || []).forEach((t) => p.appendChild(li(`${t.code} paid`)));
    });
}

// Only play sound on specific events
socket.on("monitor_therapist_confirmed", () => {
  playSound();
  refreshLists();
});
socket.on("monitor_service_started", () => {
  playSound();
  refreshLists();
});
socket.on("monitor_service_finished", () => {
  playSound();
  refreshLists();
});
socket.on("monitor_payment_counter", () => {
  playSound();
  refreshLists();
});
socket.on("monitor_payment_completed", () => {
  playSound();
  refreshLists();
});

// Still handle general updates without sound
socket.on("monitor_updated", () => {
  refreshLists();
});

// Warm up audio on load; may be blocked until first gesture
ensureSoundReady();
unlockOnFirstGesture();
refreshLists();
