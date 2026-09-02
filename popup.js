const toggle = document.getElementById("toggle");

chrome.storage.local.get({ enabled: true }, (res) => {
  toggle.checked = res.enabled !== false;
});

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});

const version = chrome.runtime.getManifest().version;
document.getElementById("version").textContent = "Versione " + version;

const addDomain = document.getElementById("add-domain");
const domainStatus = document.getElementById("domain-status");

function domainPattern(hostname) {
  const baseHost = hostname.replace(/^www\./i, "");
  return "*://*." + baseHost + "/*";
}

function scriptId(hostname) {
  return "animeworld-" + hostname.toLowerCase().replace(/[^a-z0-9_]/g, "-");
}

function isAutomaticDomain(hostname) {
  return /^(?:[a-z0-9-]+\.)*animeworld\.[a-z0-9-]{2,24}$/i.test(hostname) ||
    /^(?:[a-z0-9-]+\.)*animeworlditalia\.com$/i.test(hostname);
}

async function currentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function updateDomainState() {
  const tab = await currentTab();
  if (!tab || !tab.url) throw new Error("Scheda corrente non disponibile.");

  const url = new URL(tab.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    addDomain.disabled = true;
    domainStatus.textContent = "Apri prima il nuovo sito AnimeWorld.";
    return;
  }

  addDomain.dataset.hostname = url.hostname;
  if (isAutomaticDomain(url.hostname)) {
    addDomain.disabled = true;
    addDomain.textContent = "Dominio riconosciuto";
    domainStatus.textContent = "Attivazione automatica: " + url.hostname;
    return;
  }

  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [scriptId(url.hostname)]
  });
  if (existing.length > 0 && !existing[0].js.includes("manual-loader.js")) {
    await chrome.scripting.updateContentScripts([{
      id: existing[0].id,
      matches: existing[0].matches,
      js: ["manual-loader.js", "content.js"],
      allFrames: true,
      matchOriginAsFallback: true,
      runAt: "document_idle",
      persistAcrossSessions: true
    }]);
  }
  addDomain.disabled = existing.length > 0;
  addDomain.textContent = existing.length > 0 ? "Dominio già aggiunto" : "Aggiungi questo dominio";
  domainStatus.textContent = "Dominio: " + url.hostname;
}

addDomain.addEventListener("click", async () => {
  const hostname = addDomain.dataset.hostname;
  if (!hostname) return;

  addDomain.disabled = true;
  domainStatus.textContent = "Richiesta autorizzazione…";

  try {
    const pattern = domainPattern(hostname);
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) {
      addDomain.disabled = false;
      domainStatus.textContent = "Autorizzazione non concessa.";
      return;
    }

    const id = scriptId(hostname);
    const registration = {
      id: id,
      matches: [pattern],
      js: ["manual-loader.js", "content.js"],
      allFrames: true,
      matchOriginAsFallback: true,
      runAt: "document_idle",
      persistAcrossSessions: true
    };
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (existing.length === 0) {
      await chrome.scripting.registerContentScripts([registration]);
    } else {
      await chrome.scripting.updateContentScripts([registration]);
    }

    const tab = await currentTab();
    if (tab && tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["manual-loader.js"]
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"]
      });
    }

    addDomain.textContent = "Dominio aggiunto";
    domainStatus.textContent = "Attivo ora e ai prossimi avvii.";
  } catch (error) {
    addDomain.disabled = false;
    domainStatus.textContent = "Errore: " + error.message;
  }
});

updateDomainState().catch((error) => {
  addDomain.disabled = true;
  domainStatus.textContent = error.message;
});
