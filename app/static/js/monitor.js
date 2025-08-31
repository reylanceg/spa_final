const socket = io();

socket.emit("monitor_subscribe");

const soundEl = document.getElementById("notifySound");
let soundReady = false;

function ensureSoundReady() {
  if (!soundEl) {
    console.error("Sound element not found during initialization");
    return;
  }
  
  // Set audio properties for better compatibility
  soundEl.volume = 0.7; // Set a reasonable volume
  soundEl.preload = "auto";
  
  // Try preloading
  try {
    soundEl.load();
    console.log("Audio preloaded successfully");
  } catch (e) {
    console.warn("Audio preload failed:", e);
  }
  
  // Try a silent play-pause cycle to warm up; may be blocked until a gesture
  try {
    const p = soundEl.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        soundEl.pause();
        soundEl.currentTime = 0;
        soundReady = true;
        console.log("Audio warmed up successfully");
      }).catch((err) => {
        console.warn("Audio warmup blocked:", err);
        // Will be resolved after a user gesture
      });
    }
  } catch (e) {
    console.warn("Audio warmup error:", e);
  }
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
  if (!soundEl) {
    console.warn("Sound element not found");
    return;
  }
  try {
    soundEl.currentTime = 0;
    const p = soundEl.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        console.log("Notification sound played successfully");
      }).catch((err) => {
        console.warn("Sound autoplay blocked:", err);
        // Autoplay blocked; set unlock listeners
        unlockOnFirstGesture();
        // Show user-friendly message
        if (!soundReady) {
          console.warn(
            "Monitor sound blocked until user interacts with the page once."
          );
          // Create a visual notification that sound is blocked
          showSoundBlockedNotification();
        }
      });
    }
  } catch (e) {
    console.error("Error playing sound:", e);
  }
}

function showSoundBlockedNotification() {
  // Create a temporary notification to inform user about sound blocking
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #ff9800;
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 1000;
    font-size: 14px;
    max-width: 300px;
  `;
  notification.textContent = 'Click anywhere to enable notification sounds';
  document.body.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

function li(text) {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}

function div(content, className) {
  const div = document.createElement("div");
  div.innerHTML = content;
  if (className) {
    div.className = className;
  }
  return div;
}

function refreshLists() {
  fetch("/monitor_snapshot")
    .then((r) => r.json())
    .then((data) => {
      const w = document.getElementById("waiting_therapist");
      const serving = document.getElementById("serving");
      const pa = document.getElementById("payment_assigned");

      // WAITING: Shows transactions after customer confirms services (pending_therapist status)
      w.innerHTML = "";
      (data.waiting || []).forEach((t) =>
        w.appendChild(div(`${t.code || "—"}`, "waiting"))
      );

      // SERVING: Shows transactions after therapist confirms until service finished
      // This includes: therapist_confirmed and in_service statuses
      serving.innerHTML = "";
      (data.serving || []).forEach((t) => {
        if (t.status === 'therapist_confirmed') {
          serving.appendChild(div(`<p>${t.code}</p> <p>Room ${t.room_number}</p>`,"monitor-serving-container"));
        } else if (t.status === 'in_service') {
          serving.appendChild(div(`<p>${t.code}</p> <p>Room ${t.room_number}</p> <p class="in-service-flag">In Service</p>`, "room-in-service"));
        }
      });

      // COUNTER: Shows transactions after cashier confirms payment assignment (awaiting_payment status)
      pa.innerHTML = "";
      (data.payment_assigned || []).forEach((t) =>
        pa.appendChild(div(`<p>${t.code}</p> <p>Counter ${t.counter}</p>`, "counter-designation"))
      );
    });
}

// Play sound on specific events
socket.on("monitor_customer_confirmed", (data) => {
  console.log("Customer confirmed event:", data);
  playSound();
  refreshLists();
});

socket.on("monitor_therapist_confirmed", (data) => {
  console.log("Therapist confirmed event:", data);
  playSound();
  refreshLists();
});

socket.on("monitor_service_started", (data) => {
  console.log("Service started event:", data);
  playSound();
  refreshLists();
});

socket.on("monitor_service_finished", (data) => {
  console.log("Service finished event:", data);
  playSound();
  refreshLists();
});

socket.on("monitor_payment_counter", (data) => {
  console.log("Payment counter event:", data);
  playSound();
  refreshLists();
});

socket.on("monitor_payment_completed", (data) => {
  console.log("Payment completed event:", data);
  playSound();
  refreshLists();
});

// Also play sound for general monitor updates to catch any missed events
socket.on("monitor_updated", () => {
  console.log("Monitor updated event");
  playSound();
  refreshLists();
});

// Test if sound file is accessible
function testSoundFile() {
  if (!soundEl) return;
  
  soundEl.addEventListener('loadeddata', () => {
    console.log("Sound file loaded successfully");
  });
  
  soundEl.addEventListener('error', (e) => {
    console.error("Sound file failed to load:", e);
    console.error("Check if /static/notification_sound.mp3 exists and is accessible");
  });
  
  soundEl.addEventListener('canplaythrough', () => {
    console.log("Sound file ready to play");
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  testSoundFile();
  ensureSoundReady();
  unlockOnFirstGesture();
  refreshLists();
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loading') {
  // DOMContentLoaded will fire
} else {
  // DOM is already ready
  testSoundFile();
  ensureSoundReady();
  unlockOnFirstGesture();
  refreshLists();
}
