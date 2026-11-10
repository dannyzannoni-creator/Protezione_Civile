# Modulo `stato-utente`

## Scopo
Il modulo `stato-utente` gestisce tutta la persistenza locale dell'utente in `localStorage`:
- Stazioni aggiunte singolarmente (`stazioniSingole`).
- Gruppi monitorati (`river:<slug>` e `custom:<uuid>`).
- CRUD dei gruppi personalizzati (`{ id, nome, stazioni[] }`), con attivazione immediata al momento della creazione.
- Regola di **Cascade Delete** all'eliminazione di un gruppo personalizzato.
- Preferenza di visualizzazione per ciascun gruppo (`'estesa'` | `'compatta'`).
- Soglie personalizzate per stazione con ripristino alle soglie ufficiali.

## Regola di Cascade Delete
Quando si elimina un gruppo personalizzato:
1. Il gruppo viene rimosso dall'elenco dei gruppi personalizzati e dai gruppi monitorati.
2. Tutte le stazioni contenute nel gruppo eliminato vengono rimosse anche dal set delle `stazioniSingole` (anche se l'utente le aveva aggiunte singolarmente dalla pagina ARPAE).
3. Unica eccezione: se una stazione appartiene anche a un altro gruppo ancora monitorato (`river:*` o `custom:*`), essa continua ad essere monitorata tramite quell'altro gruppo.

## API Pubblica
Esportata da `src/stato-utente/index.ts`:
- `creaServizioStatoUtente(config?: ConfigurazioneStatoUtente): ServizioStatoUtenteEsteso`
- Metodi principali dell'istanza:
  - `aggiungiStazioneSingola`, `rimuoviStazioneSingola`, `impostaStazioneSingola`, `isStazioneAggiuntaSingolarmente`
  - `monitoraGruppo`, `smettiMonitoraggioGruppo`, `impostaMonitoraggioGruppo`, `isGruppoMonitorato`
  - `isStazioneMonitorata`, `ottieniStazioniMonitorate`, `ottieniStazioniSoloSingole`
  - `creaGruppoPersonalizzato`, `rinominaGruppoPersonalizzato`, `aggiornaStazioniGruppoPersonalizzato`, `calcolaImpattoEliminazioneGruppo`, `eliminaGruppoPersonalizzato`
  - `ottieniVistaGruppo`, `impostaVistaGruppo`, `alternaVistaGruppo`
  - `ottieniSogliaPersonalizzata`, `impostaSogliaPersonalizzata`, `ripristinaSogliaUfficiale`
  - `iscrivi(listener)`

### Esempio d'uso
```ts
import { creaServizioStatoUtente } from '../stato-utente';

const statoUtente = creaServizioStatoUtente();
const gruppo = statoUtente.creaGruppoPersonalizzato('Romagna Sud', ['11100', '12479']);
// Il gruppo è subito monitorato
console.log(statoUtente.isStazioneMonitorata('11100')); // true
```

## Input / Output
- **Input**: Operazioni dell'utente (ID stazioni, ID gruppi, nomi gruppi, soglie personalizzate) e opzionalmente `StorageLike` per l'iniezione nei test.
- **Output**: `StatoUtenteSnapshot` immutabile, notifiche reattive ai listener registrati e persistenza automatica su `localStorage`.

## Dipendenze
- Dipende esclusivamente da `src/contratti`.

## Configurazione
- `chiaveStorage`: chiave `localStorage` (default: `'monitoraggio_idraulico_er_stato_v1'`).
- `storage`: implementazione `StorageLike` (default: `globalThis.localStorage`).

## Come lanciare i test del modulo
```bash
npm run test:modulo -- stato-utente
```

