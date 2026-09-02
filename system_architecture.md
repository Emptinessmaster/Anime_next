# Architettura AnimeWorld Auto Next 2.x

## Invarianti

- Il frame principale è l'unico responsabile del cambio episodio, delle notifiche e del fullscreen.
- Ogni frame può rilevare e controllare soltanto i video accessibili nel proprio documento.
- I frame comunicano mediante messaggi con canale versionato `AW_AUTO_NEXT_V2`.
- Il fullscreen affidabile appartiene a `#player`, perché il sito sostituisce l'iframe ma conserva quel contenitore.
- `requestFullscreen()` viene chiamato soltanto durante un gesto utente. Non usare timer per tentare di aggirare questa policy.

## Flusso

1. Un observer collega gli eventi al video più grande del documento e rimuove i vecchi listener con `AbortController`.
2. Alla fine, il frame invia `ended` al top; il top seleziona l'episodio successivo e applica un lock anti-duplicazione.
3. Dopo lo swap, il top invia `play` agli iframe per un periodo limitato; ogni frame inoltra il comando agli eventuali frame annidati.
4. Il pulsante overlay **⛶** richiede il fullscreen direttamente su `#player`. Essendo stabile, il contenitore resta fullscreen durante lo swap AJAX.
5. Il controllo fullscreen nativo dell'iframe non viene intercettato: Brave non trasferisce in modo affidabile quel gesto al documento top. Il pulsante overlay è l'unico percorso supportato.

## Vincoli

- Gli iframe su origini non presenti nei `matches` non ricevono il content script.
- Autoplay e un nuovo ingresso fullscreen possono richiedere un gesto utente secondo le policy di Brave/Chrome.
