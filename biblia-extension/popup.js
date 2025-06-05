document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["history"], (result) => {
    const historyList = document.getElementById("history-list");
    const history = result.history || [];
    history.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.url} - ${new Date(item.time).toLocaleString()}`;
      historyList.appendChild(li);
    });
  });
});
