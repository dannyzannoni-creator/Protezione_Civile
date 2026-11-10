# Modulo `pagina-gruppi`

## Scopo
Il modulo `pagina-gruppi` fornisce l'interfaccia CRUD completa per i gruppi personalizzati dell'utente:
- Creazione di un gruppo (con nome obbligatorio e univoco) immediatamente monitorato.
- Rinomina di un gruppo esistente.
- Modifica della composizione (aggiunta/rimozione di stazioni con filtro di ricerca case-insensitive).
- Eliminazione con dialogo di conferma che avvisa chiaramente del **Cascade Delete** indicando il numero esatto di stazioni coinvolte che smetteranno di essere monitorate.
- I gruppi automatici per corso d'acqua non sono modificabili in questa pagina.

## API Pubblica
Esportata da `src/pagina-gruppi/index.ts`:
- `mount(container: HTMLElement, deps: DipendenzePaginaGruppi): IstanzaPagina`

### Esempio d'uso
```ts
import { mount } from '../pagina-gruppi';

const pagina = mount(elementoDom, {
  ottieniStazioni: () => stazioniCorrenti,
  ottieniCorsiAcqua: () => corsiAcquaCorrenti,
  statoUtente: servizioStatoUtente,
});
```

## Input / Output
- **Input**: Contenitore DOM (`HTMLElement`) e dipendenze iniettate (`DipendenzePaginaGruppi`).
- **Output**: Istanza `IstanzaPagina` (`{ aggiorna(), smonta() }`) e mutazioni inviate a `ServizioStatoUtente`.

## Dipendenze
- Dipende esclusivamente da `src/contratti` e dalle interfacce iniettate.

## Configurazione
- Nessuna configurazione statica richiesta.

## Come lanciare i test del modulo
```bash
npm run test:modulo -- pagina-gruppi
```

