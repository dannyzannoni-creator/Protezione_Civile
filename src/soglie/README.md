# Modulo `soglie`

## Scopo
Il modulo `soglie` calcola lo stato di allerta idrometrica (`0` verde, `1` giallo, `2` arancione, `3` rosso, `'nd'` grigio) confrontando il livello misurato (`value`) con le soglie ufficiali o personalizzate dall'utente.

## Regole di Dominio
- `value === null`: restituisce `'nd'` (colore grigio, etichetta `"n.d."`).
- `soglia === 0` (o `null`/`undefined`): considerata **non definita** e ignorata.
- Soglie negative (es. `-0.3`): valide e confrontate regolarmente.
- Vale sempre il livello più alto raggiunto tra le soglie definite (`value >= soglia3` -> `3`, `value >= soglia2` -> `2`, `value >= soglia1` -> `1`, altrimenti `0`).

## API Pubblica
Esportata da `src/soglie/index.ts`:
- `sogliaDefinita(valore: number | null | undefined): number | null`
- `risolviSoglieEffettive(stazione: SoglieStazione, override?: SoglieStazione | null): SoglieEffettive`
- `calcolaLivelloSoglia(value: number | null, soglieUfficiali: SoglieStazione, override?: SoglieStazione | null): LivelloSoglia`
- `descriviLivelloSoglia(livello: LivelloSoglia)`
- `valutaStazione(stazione, override?): ValutazioneSoglia`
- `formattaSoglia(valore: number | null | undefined): string`
- `creaServizioSoglie(): ServizioSoglie`

### Esempio d'uso
```ts
import { valutaStazione } from '../soglie';

const valutazione = valutaStazione(stazione, sogliaPersonalizzata);
console.log(valutazione.livello, valutazione.colore, valutazione.etichetta);
```

## Input / Output
- **Input**: Oggetto stazione (`value`, `soglia1`, `soglia2`, `soglia3`) ed eventuale `override` (`SogliaPersonalizzata`).
- **Output**: `ValutazioneSoglia` con livello, colore semantico, etichetta accessibile e soglie effettive.

## Dipendenze
- Dipende esclusivamente da `src/contratti`.

## Configurazione
- Nessuna configurazione statica; supporta l'override per stazione tramite argomento.

## Come lanciare i test del modulo
```bash
npm run test:modulo -- soglie
```

