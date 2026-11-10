# Modulo `app`

## Scopo
Il modulo `app` rappresenta la **shell applicativa**, il **router hash** (`#/monitoraggio`, `#/arpae`, `#/gruppi`) e la **composition root** dell'applicazione (l'unico punto in cui i moduli autonomi vengono istanziati e collegati tra loro). Gestisce anche il timer di aggiornamento automatico ogni 5 minuti e l'invocazione del controllo notifiche.

## API Pubblica
Esportata da `src/app/index.ts`:
- `mount(container: HTMLElement, deps?: DipendenzeApp): IstanzaPagina`
- `risolviRottaHash(hash: string): RottaApp`
- `INTERVALLO_AGGIORNAMENTO_MS`: costante `300000` (5 minuti)

### Esempio d'uso
```ts
import { mount } from './app';

const elementoRadice = document.getElementById('app')!;
mount(elementoRadice);
```

## Input / Output
- **Input**: Contenitore DOM (`HTMLElement`) e dipendenze opzionali iniettabili (`DipendenzeApp`).
- **Output**: Istanza `IstanzaPagina` con `aggiorna()` e `smonta()`.

## Dipendenze
- Collega `src/contratti`, `src/fonte-dati`, `src/corsi-acqua`, `src/soglie`, `src/trend`, `src/stato-utente`, `src/notifiche`, `src/pagina-monitoraggio`, `src/pagina-arpae`, `src/pagina-gruppi`.

## Configurazione
- `intervalloAutoRefreshMs`: intervallo di polling automatico (default: 5 minuti = `300_000` ms).

## Come lanciare i test del modulo
```bash
npm run test:modulo -- app
```

