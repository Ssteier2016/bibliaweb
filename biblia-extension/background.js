chrome.history.onVisited.addListener((historyItem) => {
  console.log("URL visitada:", historyItem.url, "a las", new Date(historyItem.lastVisitTime));
  // Opcional: enviar datos a Firebase o tu backend
  chrome.storage.local.get(["history"], (result) => {
    let history = result.history || [];
    history.push({ url: historyItem.url, time: historyItem.lastVisitTime });
    chrome.storage.local.set({ history });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    console.log("Pestaña actualizada:", tab.url);
  }
});
