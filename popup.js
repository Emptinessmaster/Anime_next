const toggle = document.getElementById("toggle");

chrome.storage.local.get({ enabled: true }, (res) => {
  toggle.checked = res.enabled !== false;
});

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});

const version = chrome.runtime.getManifest().version;
document.getElementById("version").textContent = "Versione " + version;
