# Modulo `corsi-acqua`

## Scopo
Il modulo `corsi-acqua` deriva automaticamente il corso d'acqua di appartenenza di ciascuna stazione idrometrica in base alle fasce di `ordinamento` definite in `src/corsi-acqua/fasce.config.json`, genera gli ID stabili `river:<slug-del-nome>` e ordina le stazioni da monte a valle (`ordinamento` crescente).

## API Pubblica
Esportata da `src/corsi-acqua/index.ts`:
- `DIREZIONE_ORDINAMENTO_DEFAULT`: costante `'CRESCENTE'`
- `FASCE_CORSI_ACQUA`: array delle fasce lette da `fasce.config.json`
- `generaIdCorsoAcqua(nome: string): string`
- `trovaCorsoPerOrdinamento(ordinamento: number, fasce?: readonly FasciaCorsoAcqua[]): FasciaCorsoAcqua | null`
- `ordinaStazioni(stazioni: readonly Stazione[], direzione?: DirezioneOrdinamento): Stazione[]`
- `raggruppaPerCorsoAcqua(stazioni: readonly Stazione[], fasce?: readonly FasciaCorsoAcqua[], direzione?: DirezioneOrdinamento): CorsoAcqua[]`
- `creaServizioCorsiAcqua(fascePersonalizzate?: readonly FasciaCorsoAcqua[], direzioneDefault?: DirezioneOrdinamento): ServizioCorsiAcqua`

### Esempio d'uso
```ts
import { raggruppaPerCorsoAcqua } from '../corsi-acqua';

const gruppi = raggruppaPerCorsoAcqua(stazioni);
// gruppi[0] -> { id: 'river:po', nome: 'Po', da: 1, a: 99, stazioni: [...] }
```

## Input / Output
- **Input**: Elenco di oggetti `Stazione` e opzionalmente fasce custom o direzione d'ordinamento.
- **Output**: Elenco di oggetti `CorsoAcqua` con stazioni ordinate per `ordinamento` crescente. Le stazioni fuori fascia (`0`, `9999`, ecc.) vengono escluse dai gruppi.

## Dipendenze
- Dipende esclusivamente da `src/contratti` e dal file di configurazione locale `fasce.config.json`.

## Configurazione
- `src/corsi-acqua/fasce.config.json`: array JSON di oggetti `{ "nome": string, "da": number, "a": number }`, modificabile senza toccare il codice TypeScript.
- `DIREZIONE_ORDINAMENTO_DEFAULT`: costante configurabile (`'CRESCENTE'` | `'DECRESCENTE'`).

## Come lanciare i test del modulo
```bash
npm run test:modulo -- corsi-acqua
```

