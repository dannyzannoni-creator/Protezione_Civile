# Modulo `trend`

## Scopo
Il modulo `trend` calcola la variazione oraria del livello idrometrico in `cm/h` e le previsioni a `+1h` e `+2h` tramite estrapolazione lineare, sempre etichettate `"stima"`, gestendo i dati mancanti con `"—"`.

## Formula di Calcolo
- `trend (cm/h) = (value_ora - value_un_ora_fa) * 100 / ore`
- `previsione +1h (m) = value_ora + (trend / 100) * 1`
- `previsione +2h (m) = value_ora + (trend / 100) * 2`
- Se `value_ora` o `value_un_ora_fa` è `null` (o `ore <= 0`), restituisce `"—"` per trend e previsioni.

## API Pubblica
Esportata da `src/trend/index.ts`:
- `calcolaTrendStazione(valoreAttuale: number | null, valorePrecedente: number | null, oreTrascorse?: number): CalcoloTrend`
- `calcolaMappaTrend(corrente: RispostaSensori, precedente: RispostaSensori | null): Record<string, CalcoloTrend>`
- `creaServizioTrend(): ServizioTrend`

### Esempio d'uso
```ts
import { calcolaTrendStazione } from '../trend';

const info = calcolaTrendStazione(1.35, 1.20, 1);
console.log(info.testoTrend); // "+15.0 cm/h"
console.log(info.testoPrevisione1h); // "1.50 m (stima)"
console.log(info.testoPrevisione2h); // "1.65 m (stima)"
```

## Input / Output
- **Input**: Livello attuale in metri (`number | null`), livello precedente in metri (`number | null`), ore trascorse (`number`, default `1`).
- **Output**: Oggetto `CalcoloTrend` con valori numerici e stringhe già formattate pronte per la UI.

## Dipendenze
- Dipende esclusivamente da `src/contratti`.

## Configurazione
- Soglia di stabilità `EPSILON_STABILITA_CM_H = 0.05` cm/h.

## Come lanciare i test del modulo
```bash
npm run test:modulo -- trend
```

