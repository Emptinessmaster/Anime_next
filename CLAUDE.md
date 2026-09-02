# AnimeWorld Auto Next

Estensione browser **Manifest V3**, JavaScript **vanilla**. Nessun build, nessun test, nessun `npm`.
Si carica come estensione non pacchettizzata da `brave://extensions` (Modalità sviluppatore).

## File
- `content.js` — logica principale (rileva fine video, naviga al prossimo episodio, gestisce iframe player + fullscreen).
- `popup.html` / `popup.js` — interruttore attivo/disattivo, stato in `chrome.storage`.
- `manifest.json` — `matches` = domini AnimeWorld supportati; `permissions: ["storage"]`.

## Regole
- Solo API web/estensione standard, niente dipendenze o bundler.
- Nuovo dominio AnimeWorld → aggiungi `"*://*.dominio/*"` in `manifest.json` → `matches`.
- Costanti di timing (es. `FS_FALLBACK`) sono in `content.js`.

## Vincoli da ricordare (vedi README.md per i dettagli)
- Autoplay e fullscreen sono **bloccati dal browser** senza gesto utente: non aggirabile, gestito con retry al primo clic.
- Il player gira in un `<iframe>`; il cambio episodio è AJAX (senza reload). Lo script gira anche dentro l'iframe.
