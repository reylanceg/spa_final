const socket = io();

socket.emit("monitor_subscribe");

const soundEl = document.getElementById("notifySound");
let soundReady = false;

// Timer management for in-service transactions
let activeTimers = new Map(); // Map of transaction_id -> interval_id
let roomTimers = new Map(); // Map of room_number -> interval_id for room status timers

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function calculateRemainingTime(startTime, totalDurationMinutes) {
  const start = new Date(startTime);
  const now = new Date();
  const elapsedMs = now - start;
  // Match service_management logic: treat minutes as seconds
  const totalMs = totalDurationMinutes * 1000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  return Math.ceil(remainingMs / 1000); // Return remaining seconds
}

function startTimer(transactionId, startTime, totalDurationMinutes) {
  // Clear existing timer if any
  if (activeTimers.has(transactionId)) {
    clearInterval(activeTimers.get(transactionId));
  }
  
  const intervalId = setInterval(() => {
    const remainingSeconds = calculateRemainingTime(startTime, totalDurationMinutes);
    const timerElement = document.getElementById(`timer-${transactionId}`);
    if (timerElement) {
      timerElement.textContent = formatTime(remainingSeconds);
      // If timer reaches 0, could add visual indication like service_management
      if (remainingSeconds <= 0) {
        timerElement.style.color = '#ff4444'; // Red color when time is up
      }
    }
  }, 1000);
  
  activeTimers.set(transactionId, intervalId);
}

function startRoomTimer(roomNumber, transactionId, startTime, totalDurationMinutes) {
  console.log("startRoomTimer called with:", { roomNumber, transactionId, startTime, totalDurationMinutes });
  
  // Clear existing room timer if any
  if (roomTimers.has(roomNumber)) {
    clearInterval(roomTimers.get(roomNumber));
  }
  
  // Initial timer update
  const timerElement = document.getElementById(`room-timer-${roomNumber}`);
  console.log(`Initial timer check for room ${roomNumber}:`, { timerElement, elementExists: !!timerElement });
  
  if (!timerElement) {
    console.error(`Timer element not found immediately: room-timer-${roomNumber}`);
    return;
  }

  // Set initial timer display
  const initialRemainingSeconds = calculateRemainingTime(startTime, totalDurationMinutes);
  timerElement.textContent = formatTime(initialRemainingSeconds);
  console.log(`Initial timer display for room ${roomNumber}:`, formatTime(initialRemainingSeconds));

  const intervalId = setInterval(() => {
    const remainingSeconds = calculateRemainingTime(startTime, totalDurationMinutes);
    const timerElement = document.getElementById(`room-timer-${roomNumber}`);
    if (timerElement) {
      timerElement.textContent = formatTime(remainingSeconds);
      // If timer reaches 0, add visual indication
      if (remainingSeconds <= 0) {
        timerElement.style.color = '#ff4444'; // Red color when time is up
      }
    } else {
      console.error(`Timer element not found during update: room-timer-${roomNumber}`);
      clearInterval(intervalId);
      roomTimers.delete(roomNumber);
    }
  }, 1000);
  
  roomTimers.set(roomNumber, intervalId);
  console.log("Room timer started for room", roomNumber, "with interval ID", intervalId);
}

function stopTimer(transactionId) {
  if (activeTimers.has(transactionId)) {
    clearInterval(activeTimers.get(transactionId));
    activeTimers.delete(transactionId);
  }
}

function stopRoomTimer(roomNumber) {
  if (roomTimers.has(roomNumber)) {
    clearInterval(roomTimers.get(roomNumber));
    roomTimers.delete(roomNumber);
  }
}

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

      // Stop all existing timers before refreshing
      activeTimers.forEach((intervalId, transactionId) => {
        clearInterval(intervalId);
      });
      activeTimers.clear();
      
      // Stop all existing room timers before refreshing
      roomTimers.forEach((intervalId, roomNumber) => {
        clearInterval(intervalId);
      });
      roomTimers.clear();

      // WAITING: Shows transactions after customer confirms services (pending_therapist status)
      w.innerHTML = "";
      (data.waiting || []).forEach((t) =>
        w.appendChild(div(`${t.code || "—"}`, "waiting"))
      );

      // SERVING: Shows transactions after therapist confirms until service finished
      // This includes: therapist_confirmed and in_service statuses
      serving.innerHTML = "";
      (data.serving || []).forEach((t) => {
        if (t.status === 'Therapist Confirmed') 
          {
          const occupiedHtml = `<p>${t.code}</p><div style="display:flex"> <p>Room ${t.room_number}</p> <p class="occupied-flag">OCCUPIED</p></div>`;
          serving.appendChild(div(occupiedHtml, "monitor-serving-container"));
        } else if (t.status === 'In Service') 
          {
          const timerHtml = `<p>${t.code}</p><div style="display: flex"> <p>Room ${t.room_number}</p> <p class="in-service-flag">IN SERVICE</p></div> <p class="service-timer" id="timer-${t.id}">00:00:00</p>`;
          serving.appendChild(div(timerHtml, "room-in-service"));
          
          // Start timer for this transaction
          if (t.service_start_at && t.total_duration_minutes) {
            startTimer(t.id, t.service_start_at, t.total_duration_minutes);
          }
        }
      });

      // COUNTER: Shows transactions after cashier confirms payment assignment (awaiting_payment status)
      pa.innerHTML = "";
      (data.payment_assigned || []).forEach((t) =>
        pa.appendChild(div(`<p>${t.code}</p> <p>Counter ${t.counter}</p>`, "counter-designation"))
      );
    });
}

function refreshRoomStatus() {
  fetch("/room_status")
    .then((r) => r.json())
    .then((data) => {
      const roomStatusContainer = document.getElementById("room_status");
      roomStatusContainer.innerHTML = "";
      
      (data.rooms || []).forEach((room) => {
        console.log("Room data:", room); // Debug log
        const statusClass = `room-${room.status.toLowerCase()}`;
        
        // Create the room info content with proper status display
        let statusDisplay = room.status;
        let showTimer = false;
        
        if (room.status === 'preparing') {
          statusDisplay = 'ON BREAK';
        } else if (room.status === 'available') {
          statusDisplay = 'AVAILABLE';
        } else if (room.status === 'occupied') {
          statusDisplay = 'OCCUPIED';
        } else if (room.status === 'on_going_service') {
          statusDisplay = 'ON GOING SERVICE';
          showTimer = true;
        }

        // Determine if we should show timer based on status and data availability
        if (room.status === 'on_going_service' && room.service_start_at && room.total_duration_minutes) {
          console.log("Room has ongoing service with timer data:", {
            room_number: room.room_number,
            service_start_at: room.service_start_at,
            total_duration_minutes: room.total_duration_minutes,
            transaction_id: room.transaction_id
          });
          showTimer = true;
        }
        
        let roomInfoContent = `
          <div class="room-number">ROOM ${room.room_number}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="room-status-text">${statusDisplay}</div>
            ${showTimer ? `<div class="room-timer" id="room-timer-${room.room_number}">00:00:00</div>` : ''}
          </div>
        `;
        
        
        // Add transaction code if available
        // if (room.transaction_code) {
        //   roomInfoContent += `<div class="room-transaction">${room.transaction_code}</div>`;
        // }
        
        // Add customer name if available
        // if (room.customer_name) {
        //   roomInfoContent += `<div class="room-customer">${room.customer_name}</div>`;
        // }
        
        // // Add timer if service is running (has service_start_at and total_duration_minutes)
        // if (room.service_start_at && room.total_duration_minutes) {
        //   console.log("Adding timer for room", room.room_number, "with data:", {
        //     service_start_at: room.service_start_at,
        //     total_duration_minutes: room.total_duration_minutes,
        //     transaction_id: room.transaction_id
        //   });
        //   roomInfoContent += `<div class="room-timer" id="room-timer-${room.room_number}">00:00:00</div>`;
        // }
        
        // Create the complete room card with status indicator
        const roomContent = `
          <div class="room-status-indicator"></div>
          <div class="room-info">
            ${roomInfoContent}
          </div>
        `;
        
        roomStatusContainer.appendChild(div(roomContent, `room-card ${statusClass}`));
        
        // Start timer for rooms with ongoing services
        if (room.status === 'on_going_service' && room.service_start_at && room.total_duration_minutes && room.transaction_id) {
          console.log("Starting timer for ongoing service in room", room.room_number);
          // Use setTimeout to ensure DOM element is created before starting timer
          setTimeout(() => {
            startRoomTimer(room.room_number, room.transaction_id, room.service_start_at, room.total_duration_minutes);
          }, 100);
        }
      });
    })
    .catch((error) => {
      console.error("Error fetching room status:", error);
    });
}

function refreshCashierCounters() {
  fetch("/cashier_status")
    .then((r) => r.json())
    .then((data) => {
      const cashierContainer = document.getElementById("cashier_counters");
      cashierContainer.innerHTML = "";
      
      (data.cashiers || []).forEach((cashier) => {
        const hasTransactions = cashier.transaction_count > 0;
        const statusClass = hasTransactions ? 'has-transactions' : '';
        
        // Get the transaction codes for this cashier
        let displayText = '';
        if (cashier.transactions && cashier.transactions.length > 0) {
          // Show the first transaction code, or multiple if they fit
          const codes = cashier.transactions.map(tx => tx.code);
          if (codes.length === 1) {
            displayText = codes[0];
          } else {
            // For multiple transactions, show the first one with a count indicator
            displayText = `${codes[0]} +${codes.length - 1}`;
          }
        }
        
        const cashierContent = `
          <div class="cashier-name">CASHIER ${cashier.counter_number}</div>
          <div class="cashier-counter">${displayText}</div>
        `;
        
        cashierContainer.appendChild(div(cashierContent, `cashier-card ${statusClass}`));
      });
    })
    .catch((error) => {
      console.error("Error fetching cashier status:", error);
    });
}

// Play sound on specific events
socket.on("monitor_customer_confirmed", (data) => {
  console.log("Customer confirmed event:", data);
  playSound();
  refreshLists();
  refreshRoomStatus();
  refreshCashierCounters();
});

socket.on("monitor_therapist_confirmed", (data) => {
  console.log("Therapist confirmed event:", data);
  playSound();
  refreshLists();
  refreshRoomStatus();
  refreshCashierCounters();
});

socket.on("monitor_service_started", (data) => {
  console.log("Service started event:", data);
  playSound();
  refreshLists();
  refreshRoomStatus();
  refreshCashierCounters();
});

socket.on("monitor_service_finished", (data) => {
  console.log("Service finished event:", data);
  playSound();
  refreshLists();
  refreshRoomStatus();
  refreshCashierCounters();
});

socket.on("monitor_payment_counter", (data) => {
  console.log("Payment counter event:", data);
  playSound();
  refreshLists();
  refreshRoomStatus();
  refreshCashierCounters();
});

socket.on("monitor_payment_completed", (data) => {
  console.log("Payment completed event:", data);
  playSound();
  refreshLists();
  refreshRoomStatus();
  refreshCashierCounters();
});

// Also play sound for general monitor updates to catch any missed events
socket.on("monitor_updated", () => {
  console.log("Monitor updated event");
  playSound();
  refreshLists();
  refreshRoomStatus();
  refreshCashierCounters();
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
  refreshRoomStatus();
  refreshCashierCounters();
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
  refreshRoomStatus();
  refreshCashierCounters();
}
