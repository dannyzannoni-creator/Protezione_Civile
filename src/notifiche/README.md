# Modulo `notifiche`

## Scopo
Il modulo `notifiche` gestisce i permessi della Notification API del browser e l'invio di notifiche quando una stazione monitorata **sale di livello** (es. da `0` a `1`, da `1` a `2`, da `2` a `3`), garantendo **una sola notifica per ogni cambio di livello**.

## API Pubblica
Esportata da `src/notifiche/index.ts`:
- `creaServizioNotifiche(config?: ConfigurazioneNotifiche): ServizioNotifiche`
- Metodi dell'istanza:
  - `ottieniPermesso(): PermessoNotifiche`
  - `isAttivo(): boolean`
  - `attivaNotifiche(): Promise<PermessoNotifiche>`
  - `disattivaNotifiche(): void`
  - `controllaEInviaNotifiche(stazioniMonitorate, calcolaValutazione): CambioLivelloStazione[]`
  - `resettaStatoLivelli(): void`

### Esempio d'uso
```ts
import { creaServizioNotifiche } from '../notifiche';

const notifiche = creaServizioNotifiche();
await notifiche.attivaNotifiche();
notifiche.controllaEInviaNotifiche(stazioniMonitorate, (s) => soglie.valutaStazione(s));
```

## Input / Output
- **Input**: Elenco delle stazioni monitorate e funzione di valutazione soglia (che tiene conto delle soglie personalizzate).
- **Output**: Array di `CambioLivelloStazione` rilevati e invio della notifica browser tramite `Notification`.

## Dipendenze
- Dipende esclusivamente da `src/contratti`.

## Configurazione
- `notificationApi`: wrapper iniettabile per i test (default: `globalThis.Notification`).

## Come lanciare i test del modulo
```bash
npm run test:modulo -- notifiche
```

