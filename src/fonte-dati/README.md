# Modulo `fonte-dati`

## Scopo
Il modulo `fonte-dati` incapsula l'acquisizione, la validazione, la gestione dei retry automatici e il caching in memoria dei livelli idrometrici dall'endpoint ufficiale Allerta Meteo Emilia-Romagna (ARPAE).

## Scelta Architetturale su CORS e Proxy
Dall'ispezione reale dell'endpoint `https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-sensor-values-no-time`:
- Il server risponde con `Access-Control-Allow-Origin` riflettendo l'header `Origin`, ma è posto dietro una cache Varnish (`X-Varnish`, `X-Cache-TTL: 120s`) con `Vary: Accept-Encoding` e senza `Vary: Origin`.
- Per garantire il funzionamento sia aprendo direttamente `/dist/index.html` sia servendo l'app tramite HTTP senza rischi di cache poisoning CORS su Varnish, è disponibile il proxy a zero dipendenze `server/proxy.mjs` (`npm start`) che serve `/dist` e inoltra `/api/sensori` all'endpoint configurabile. Il modulo `fonte-dati` supporta `baseUrl` configurabile e fallback automatico su `/api/sensori`.

## API Pubblica
Esportata da `src/fonte-dati/index.ts`:
- `calcolaTimeRiferimento(nowMs?: number): number`
- `costruisciUrlSensori(baseUrl: string, timeMs: number, variabile?: string): string`
- `parsaRispostaSensori(raw: unknown, timeRichiesto: number, tentativi?: number): RispostaSensori`
- `tuttiValoriNull(stazioni: readonly Stazione[]): boolean`
- `creaServizioFonteDati(config?: ConfigurazioneFonteDati): ServizioFonteDati`

### Esempio d'uso
```ts
import { creaServizioFonteDati } from '../fonte-dati';

const fonteDati = creaServizioFonteDati();
const { corrente, precedente } = await fonteDati.scaricaConStorico();
console.log('Istante rilevazione:', new Date(corrente.time));
console.log('Stazioni caricate:', corrente.stazioni.length);
```

## Input / Output
- **Input**: Timestamp opzionale in ms (`nowMs`) e configurazione (`baseUrl`, `variabile`, `fetchFn`).
- **Output**: Oggetti `RispostaSensori` o `DatiSensoriConStorico` conformi a `src/contratti`, con `lon`, `lat` e `precedente` conservati grezzi e retry automatico fino a 3 volte (`-1h` per tentativo) se tutti i `value` sono `null`.

## Dipendenze
- Dipende esclusivamente da `src/contratti`.

## Configurazione
- `baseUrl`: URL dell'endpoint (default: URL ufficiale ARPAE).
- `fallbackBaseUrl`: URL di fallback (default: `/api/sensori` servito da `server/proxy.mjs`).
- `variabile`: costante `254,0,0/1,-,-,-/B13215`.

## Come lanciare i test del modulo
I test usano il campione reale salvato in `src/fonte-dati/fixtures/campione-reale.json` e non dipendono dalla rete:
```bash
npm run test:modulo -- fonte-dati
```

