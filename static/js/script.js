document.addEventListener("DOMContentLoaded", () => {
  let intervalId = null;

  function startOperation(endpoint) {
    const username = document.getElementById("username").value;
    const password = document.getElementById("appPassword").value;
    const target = document.getElementById("targetUsername").value;
    const scanLimit = document.getElementById("scanLimit").value || 1000;
    const followLimit = document.getElementById("followLimit").value || 100;
    const turkishOnly = document.getElementById("filterTurkish").checked;

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
        document.getElementById("progressContainer").classList.remove("d-none");
        document.getElementById("followButton").disabled = true;
        document.getElementById("unfollowButton").disabled = true;
        document.getElementById("stopButton").classList.remove("d-none");
        intervalId = setInterval(checkStatus, 2000);
      })
      .catch(err => {
        console.error("Failed to start task:", err);
        alert("❌ Failed to start task. See console for details.");
      });
  }

  function checkStatus() {
    fetch("/api/task/status")
      .then(res => res.json())
      .then(data => {
        const op = data.operation_type ? data.operation_type.toUpperCase() : "PROCESSING";
        const summary = `${data.completed ? "✅ Completed" : `🔄 ${op}`} ${data.processed_count}/${data.follow_limit}`;

        document.getElementById("progressTitle").innerText = summary;
        document.getElementById("progressText").innerText = data.error ? `❌ ${data.error}` : "Running...";
        document.getElementById("progressCounter").innerText = `Scanned: ${data.current_index}`;

        let percent = Math.min((data.processed_count / data.follow_limit) * 100, 100);
        document.getElementById("progressBar").style.width = `${percent}%`;
        document.getElementById("progressBar").innerText = `${Math.floor(percent)}%`;

        if (data.completed || data.error) {
          clearInterval(intervalId);
          document.getElementById("followButton").disabled = false;
          document.getElementById("unfollowButton").disabled = false;
          document.getElementById("stopButton").classList.add("d-none");

          if (data.users?.length > 0) {
            const list = document.getElementById("userList");
            list.innerHTML = "";
            data.users.forEach(user => {
              const li = document.createElement("li");
              li.className = "list-group-item bg-dark text-white";
              li.innerText = `${user.displayName} (@${user.handle})`;
              list.appendChild(li);
            });
            document.getElementById("results").classList.remove("d-none");
          }
        }
      })
      .catch(err => {
        console.error("Status check failed:", err);
      });
  }

  function stopOperation() {
    fetch("/api/task/stop", { method: "POST" })
      .then(res => res.json())
      .then(() => {
        clearInterval(intervalId);
        alert("🛑 Process stopped");
        document.getElementById("stopButton").classList.add("d-none");
      });
  }

  document.getElementById("followButton").addEventListener("click", () => {
    startOperation("/api/task/follow");
  });

  document.getElementById("unfollowButton").addEventListener("click", () => {
    startOperation("/api/task/unfollow");
  });

  document.getElementById("stopButton").addEventListener("click", () => {
    stopOperation();
  });

  document.getElementById("stopButtonProgress").addEventListener("click", () => {
    stopOperation();
  });

  document.getElementById("newOperationButton").addEventListener("click", () => {
    window.location.reload();
  });
});
