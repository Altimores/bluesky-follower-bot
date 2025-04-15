document.addEventListener("DOMContentLoaded", () => {
  let intervalId = null;

  const followBtn = document.getElementById("followButton");
  const unfollowBtn = document.getElementById("unfollowButton");
  const stopBtn = document.getElementById("stopButton");

  function startOperation(endpoint) {
    const payload = {
      username: document.getElementById("username").value,
      password: document.getElementById("appPassword").value,
      target: document.getElementById("targetUsername").value,
      scan_limit: parseInt(document.getElementById("scanLimit").value),
      follow_limit: parseInt(document.getElementById("followLimit").value),
      turkish_only: document.getElementById("turkishOnly").checked
    };

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(() => {
        document.getElementById("status").innerText = "🟢 Started";
        followBtn.disabled = true;
        unfollowBtn.disabled = true;
        stopBtn.classList.remove("d-none");
        intervalId = setInterval(checkStatus, 2000);
      })
      .catch(err => {
        console.error(err);
        document.getElementById("status").innerText = "❌ Failed to start";
      });
  }

  function checkStatus() {
    fetch("/api/task/status")
      .then(res => res.json())
      .then(data => {
        const status = data.completed
          ? "✅ Completed"
          : data.error
          ? `❌ Error: ${data.error}`
          : `🔄 Processing ${data.processed_count}/${data.follow_limit}`;

        document.getElementById("status").innerText = status;

        if (data.completed || data.error) {
          clearInterval(intervalId);
          followBtn.disabled = false;
          unfollowBtn.disabled = false;
          stopBtn.classList.add("d-none");

          const list = document.getElementById("result-list");
          list.innerHTML = "";
          (data.users || []).forEach(user => {
            const li = document.createElement("li");
            li.classList.add("list-group-item", "bg-dark", "text-white");
            li.innerText = `${user.displayName} (@${user.handle})`;
            list.appendChild(li);
          });
        }
      });
  }

  function stopOperation() {
    fetch("/api/task/stop", { method: "POST" })
      .then(() => {
        clearInterval(intervalId);
        document.getElementById("status").innerText = "🛑 Stopped by user";
        followBtn.disabled = false;
        unfollowBtn.disabled = false;
        stopBtn.classList.add("d-none");
      });
  }

  followBtn?.addEventListener("click", () => startOperation("/api/task/follow"));
  unfollowBtn?.addEventListener("click", () => startOperation("/api/task/unfollow"));
  stopBtn?.addEventListener("click", stopOperation);
});
