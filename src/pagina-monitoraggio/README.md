# Modulo `pagina-monitoraggio`

## Scopo
Il modulo `pagina-monitoraggio` renderizza la vista principale dell'applicazione, mostrando esclusivamente i gruppi e le stazioni che l'utente ha scelto di monitorare:
- **Filtri rapidi in alto**: 5 icone circolari cliccabili con contatore (`BLU` = tutte incluse `n.d.`, `VERDE` = livello 0, `GIALLO` = livello 1, `ARANCIONE` = livello 2, `ROSSO` = livello 3). Un secondo clic sul filtro attivo riporta al filtro `BLU`. I filtri nascondono le stazioni non corrispondenti e i gruppi rimasti vuoti.
- **Gruppi monitorati**: con chevron nel titolo per alternare **Vista Estesa** (default: nome, valore in m, soglie, trend cm/h, previsioni +1h/+2h etichettate `"stima"`, icona di stato e icone secondarie) e **Vista Compatta** (card bassa con solo nome a sinistra e pallino di stato a destra; valori, trend e previsioni nascosti), con preferenza salvata per ciascun gruppo.
- **Stazioni singole**: stazioni monitorate che non appartengono ad alcun gruppo monitorato.
- **Controlli**: pulsante aggiorna, etichetta `"Ultimo aggiornamento HH:MM"`, pulsante attivazione notifiche, stati di caricamento/errore con riprova e stato vuoto con link a `#/arpae`.

## API Pubblica
Esportata da `src/pagina-monitoraggio/index.ts`:
- `mount(container: HTMLElement, deps: DipendenzePaginaMonitoraggio): IstanzaPagina`
- `corrispondeAlFiltro(livello: LivelloSoglia, filtro: FiltroMonitoraggio): boolean`
- `formattaOraAggiornamento(timeMs: number | null): string`

### Esempio d'uso
```ts
import { mount } from '../pagina-monitoraggio';

const pagina = mount(elementoDom, {
  ottieniStatoDati: () => statoDatiCorrente,
  richiediAggiornamento: () => aggiornaSensori(),
  corsiAcqua,
  soglie,
  trend,
  statoUtente,
  notifiche,
});
```

## Input / Output
- **Input**: Contenitore DOM (`HTMLElement`) e dipendenze iniettate (`DipendenzePaginaMonitoraggio`).
- **Output**: Istanza `IstanzaPagina` (`{ aggiorna(), smonta() }`).

## Dipendenze
- Dipende esclusivamente da `src/contratti` e dalle interfacce iniettate.

## Configurazione
- Nessuna configurazione statica richiesta.

## Come lanciare i test del modulo
```bash
npm run test:modulo -- pagina-monitoraggio
```

