# AnimeWorld Auto Next

Estensione per Brave (e Chrome) che, quando l'episodio in riproduzione finisce,
passa automaticamente all'episodio successivo su AnimeWorld.

## Come funziona

- Rileva la fine del video (evento `ended`, con fallback quando mancano meno di
  ~0,6 secondi alla fine, utile per i player HLS). Funziona **anche a schermo
  intero**.
- Trova il link dell'episodio successivo nella lista (`.episodes a`) e ci
  naviga. Se non lo trova, clicca il pulsante **Successivo** del sito.
- Sulla nuova pagina **avvia in automatico** la riproduzione del nuovo episodio.
- Aggiunge sul player il pulsante **⛶** dell'estensione. Questo mette a schermo
  intero il contenitore stabile `#player`, che resta attivo anche quando il sito
  sostituisce l'iframe durante il cambio episodio.
- Se sei all'ultimo episodio, non fa nulla (te lo segnala con un avviso).

## Come avviene il cambio episodio

AnimeWorld cambia episodio **senza ricaricare la pagina** (AJAX) e carica il
player dentro un `<iframe>`. L'estensione quindi:

- gira anche dentro l'iframe del player (per rilevare la fine e avviare il nuovo
  video lì dentro);
- fa cliccare al sito il link dell'episodio successivo (cambio "sul posto");
- chiede al nuovo iframe di avviare la riproduzione;
- mantiene il fullscreen sul contenitore `#player`, senza richieste periodiche
  che il browser bloccherebbe in assenza di un gesto utente.

## Nota importante su autoplay e schermo intero

I browser (Brave/Chrome inclusi) **bloccano per policy** l'avvio automatico e
soprattutto l'ingresso a schermo intero se non c'è un'interazione dell'utente.
Il passaggio all'episodio successivo scatta alla *fine* del video, che non conta
come "gesto utente". Per questo l'estensione usa il seguente flusso:

- **Avvio del video**: nella maggior parte dei casi parte da solo. Se il browser
  lo blocca, basta un clic qualsiasi sulla pagina e parte subito.
- **Schermo intero**: usa il pulsante **⛶** aggiunto nell'angolo inferiore
  destro del player. Il gesto mette direttamente in fullscreen `#player`, non
  l'iframe destinato a essere rimosso. Il fullscreen sopravvive quindi allo swap
  AJAX. La richiesta parte sempre dal clic diretto sul pulsante **⛶**, così
  Brave la riconosce correttamente come gesto dell'utente.
- **Player cross-origin**: il browser non permette allo script interno di
  trasferire il gesto al documento principale. Il pulsante **⛶** in overlay è
  il percorso affidabile anche in questo caso.

Se il fullscreen era stato avviato dal controllo nativo di un player
cross-origin, la rimozione dell'iframe lo chiude. L'avviso chiede allora di
premere **⛶**: questa singola interazione è obbligatoria per policy del browser.

## Se il nuovo video non parte da solo

Può succedere se l'iframe del player è su un dominio non incluso nell'estensione
(così lo script non può avviarlo da dentro). Per verificarlo: tasto destro sul
player → «Questo frame» / «Visualizza sorgente frame», guarda il dominio nella
barra. Poi aggiungi quel dominio all'elenco `matches` in `manifest.json`
(es. `"*://*.NOMEDOMINIO/*"`) e ricarica l'estensione. Scrivimelo e lo aggiungo.

## Installazione su Brave

1. Apri `brave://extensions` (scrivilo nella barra degli indirizzi).
2. In alto a destra attiva **Modalità sviluppatore**.
3. Clicca **Carica estensione non pacchettizzata**.
4. Seleziona questa cartella (quella che contiene `manifest.json`).
5. Apri una pagina di riproduzione di AnimeWorld: l'estensione è attiva.

Puoi attivarla/disattivarla dall'icona dell'estensione nella barra degli
strumenti (popup con l'interruttore). Se AnimeWorld cambia dominio, apri il
nuovo sito con un nome differente, premi l'icona e scegli **Aggiungi questo
dominio**. Il dominio viene mantenuto attivo ai prossimi avvii.
I domini nel formato `animeworld.NUOVA_ESTENSIONE` (per esempio `.com` o `.it`)
vengono invece riconosciuti e attivati automaticamente, senza usare il pulsante.

Per poter riconoscere anche estensioni di dominio non ancora note, Brave indica
che l'estensione può leggere le pagine visitate. Lo script si arresta subito su
ogni hostname che non corrisponde ad AnimeWorld o a un dominio aggiunto a mano.

## Domini supportati

Sono già inclusi i domini AnimeWorld più comuni (`.ac`, `.cc`, `.tv`, `.so`,
`.biz`, `.io`, `.me`). I domini aggiunti dal popup vengono registrati
localmente nel browser e non richiedono modifiche a `manifest.json`.

## Note

- Nessuna icona personalizzata inclusa (non serve per il caricamento manuale):
  Brave userà un'icona generica.
- L'estensione non raccoglie né invia alcun dato; salva solo lo stato
  attivo/disattivo in locale.
