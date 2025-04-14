let intervalId = null;

function startOperation(endpoint) {
  const username = document.getElementById("username").value;
  const password = document.getElementById("app_password").value;
  const target = document.getElementById("target_username").value;
  const scanLimit = document.getElementById("scan_limit").value || 1000;
  const followLimit = document.getElementById("follow_limit").value || 100;
  const turkishOnly = document.getElementById("turkish_only").checked;

  const payload = {
    username,
    password,
    target,
    scan_limit: parseInt(scanLimit),
    follow_limit: parseInt(followLimit),
    turkish_only: turkishOnly
  };

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      document.getElementById("status").innerText = "🟢 Operation started";
      document.getElementById("start-follow").disabled = true;
      document.getElementById("start-unfollow").disabled = true;
      document.getElementById("stop-btn").disabled = false;
      intervalId = setInterval(checkStatus, 2000);
    })
    .catch(err => {
      console.error("Failed to start task:", err);
      document.getElementById("status").innerText = "❌ Failed to start task";
    });
}

function checkStatus() {
  fetch("/api/task/status")
    .then(res => res.json())
    .then(data => {
      const op = data.operation_type ? data.operation_type.toUpperCase() : "PROCESSING";
      const done = data.completed ? "✅ Completed" : `🔄 ${op}...`;
      const summary = `${done} ${data.processed_count}/${data.follow_limit} users`;

      document.getElementById("status").innerText = summary;

      if (data.completed || data.error) {
        clearInterval(intervalId);
        document.getElementById("start-follow").disabled = false;
        document.getElementById("start-unfollow").disabled = false;
        document.getElementById("stop-btn").disabled = true;

        if (data.error) {
          document.getElementById("status").innerText = `❌ Error: ${data.error}`;
        }

        // Gösterilen kullanıcıları listele
        const list = document.getElementById("result-list");
        list.innerHTML = "";
        (data.users || []).forEach(user => {
          const li = document.createElement("li");
          li.innerText = `${user.displayName} (@${user.handle})`;
          list.appendChild(li);
        });
      }
    })
    .catch(err => {
      console.error("Status check failed:", err);
      document.getElementById("status").innerText = "❌ Error checking status.";
    });
}

function stopOperation() {
  fetch("/api/task/stop", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      document.getElementById("status").innerText = "🟡 Stopping...";
      clearInterval(intervalId);
      document.getElementById("start-follow").disabled = false;
      document.getElementById("start-unfollow").disabled = false;
      document.getElementById("stop-btn").disabled = true;
    });
}

// Event listeners
document.getElementById("start-follow").addEventListener("click", () => {
  startOperation("/api/task/follow");
});

document.getElementById("start-unfollow").addEventListener("click", () => {
  startOperation("/api/task/unfollow");
});

document.getElementById("stop-btn").addEventListener("click", () => {
  stopOperation();
});
