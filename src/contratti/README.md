# Modulo `contratti`

## Scopo
Il modulo `contratti` definisce tutti i tipi e le interfacce TypeScript condivise tra i moduli dell'applicazione (`Stazione`, `CorsoAcqua`, `LivelloSoglia`, `GruppoPersonalizzato`, `ServizioFonteDati`, `ServizioSoglie`, `ServizioTrend`, `ServizioStatoUtente`, `ServizioNotifiche`, ecc.). Garantisce il disaccoppiamento totale tra i moduli secondo l'architettura plug-and-play.

## API Pubblica
Esportata da `src/contratti/index.ts`:
- `Stazione`, `RispostaSensori`, `DatiSensoriConStorico`, `OpzioniScaricamento`, `ServizioFonteDati`
- `FasciaCorsoAcqua`, `DirezioneOrdinamento`, `CorsoAcqua`, `ServizioCorsiAcqua`
- `LivelloSoglia`, `ColoreSoglia`, `SoglieStazione`, `SogliaPersonalizzata`, `ValutazioneSoglia`, `ServizioSoglie`
- `DirezioneTrend`, `CalcoloTrend`, `ServizioTrend`
- `GruppoPersonalizzato`, `VistaGruppo`, `FiltroMonitoraggio`, `StatoUtenteSnapshot`, `ServizioStatoUtente`
- `PermessoNotifiche`, `CambioLivelloStazione`, `ServizioNotifiche`
- `RottaApp`, `IstanzaPagina`

### Esempio d'uso
```ts
import type { Stazione, LivelloSoglia } from '../contratti';

const stazione: Stazione = {
  idstazione: '11100',
  ordinamento: 1805,
  nomestaz: 'Morciano di Romagna',
  lon: '1264204',
  lat: '4391441',
  soglia1: 0.8,
  soglia2: 1.3,
  soglia3: 1.7,
  value: 0.45,
  precedente: 'S',
};
const livello: LivelloSoglia = 0;
```

## Input / Output
- Non contiene logica a runtime; fornisce esclusivamente contratti statici TypeScript (`strict: true`, nessun `any`).

## Dipendenze
- Nessuna dipendenza esterna o interna.

## Configurazione
- Nessuna configurazione richiesta.

## Come lanciare i test del modulo
```bash
npm run test:modulo -- contratti
```

