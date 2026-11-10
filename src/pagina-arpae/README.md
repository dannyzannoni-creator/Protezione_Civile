# Modulo `pagina-arpae`

## Scopo
Il modulo `pagina-arpae` renderizza il catalogo ARPAE:
- **In alto**: l'elenco dei gruppi automatici per corso d'acqua con stazioni ordinate da monte a valle (`ordinamento` crescente) e checkbox `"Monitora gruppo"`.
- **In basso**: l'elenco completo di tutte le stazioni con barra di ricerca per nome (case-insensitive), visualizzazione di `soglia 1/2/3` (`"—"` se non definita), valore attuale e stato colorato con etichetta accessibile, checkbox `"Monitora"` e modulo inline per impostare o ripristinare le **soglie personalizzate**.

## API Pubblica
Esportata da `src/pagina-arpae/index.ts`:
- `mount(container: HTMLElement, deps: DipendenzePaginaArpae): IstanzaPagina`

### Esempio d'uso
```ts
import { mount } from '../pagina-arpae';

const pagina = mount(elementoDom, {
  ottieniStazioni: () => stazioniCorrenti,
  corsiAcqua: servizioCorsiAcqua,
  soglie: servizioSoglie,
  statoUtente: servizioStatoUtente,
});
```

## Input / Output
- **Input**: Contenitore DOM (`HTMLElement`) e dipendenze iniettate (`DipendenzePaginaArpae`).
- **Output**: Istanza `IstanzaPagina` (`{ aggiorna(), smonta() }`) e mutazioni di stato inviate a `ServizioStatoUtente`.

## Dipendenze
- Dipende esclusivamente da `src/contratti` e dalle interfacce iniettate in `mount`.

## Configurazione
- Nessuna configurazione statica richiesta.

## Come lanciare i test del modulo
```bash
npm run test:modulo -- pagina-arpae
```

