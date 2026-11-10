import { describe, it, expect } from 'vitest';
import {
  sogliaDefinita,
  risolviSoglieEffettive,
  calcolaLivelloSoglia,
  valutaStazione,
  formattaSoglia,
} from '../index';

describe('Modulo soglie', () => {
  it('ignora soglia = 0 (non definita) ma accetta soglie negative (es. -0.3)', () => {
    expect(sogliaDefinita(0)).toBeNull();
    expect(sogliaDefinita(null)).toBeNull();
    expect(sogliaDefinita(undefined)).toBeNull();
    expect(sogliaDefinita(-0.3)).toBe(-0.3);
    expect(sogliaDefinita(1.5)).toBe(1.5);
  });

  it('restituisce "nd" (grigio) quando value è null', () => {
    const esito = valutaStazione({
      value: null,
      soglia1: 0.8,
      soglia2: 1.3,
      soglia3: 1.7,
    });
    expect(esito.livello).toBe('nd');
    expect(esito.colore).toBe('grigio');
    expect(esito.etichetta).toContain('n.d.');
  });

  it('restituisce livello 0 (verde) quando nessuna soglia è definita (tutte a 0)', () => {
    const livello = calcolaLivelloSoglia(15.2, {
      soglia1: 0,
      soglia2: 0,
      soglia3: 0,
    });
    expect(livello).toBe(0);
  });

  it('calcola correttamente i livelli 0, 1, 2, 3 scegliendo il più alto raggiunto', () => {
    const soglie = { soglia1: 1.0, soglia2: 2.0, soglia3: 3.0 };
    expect(calcolaLivelloSoglia(0.99, soglie)).toBe(0);
    expect(calcolaLivelloSoglia(1.0, soglie)).toBe(1);
    expect(calcolaLivelloSoglia(1.5, soglie)).toBe(1);
    expect(calcolaLivelloSoglia(2.0, soglie)).toBe(2);
    expect(calcolaLivelloSoglia(2.99, soglie)).toBe(2);
    expect(calcolaLivelloSoglia(3.0, soglie)).toBe(3);
    expect(calcolaLivelloSoglia(4.5, soglie)).toBe(3);
  });

  it('gestisce correttamente soglie negative e soglie parzialmente definite', () => {
    const soglieNegative = { soglia1: -0.5, soglia2: -0.2, soglia3: 0 };
    expect(calcolaLivelloSoglia(-0.8, soglieNegative)).toBe(0);
    expect(calcolaLivelloSoglia(-0.5, soglieNegative)).toBe(1);
    expect(calcolaLivelloSoglia(-0.1, soglieNegative)).toBe(2);
    // soglia3 è 0 (non definita), quindi anche con value = 1.0 resta al livello 2
    expect(calcolaLivelloSoglia(1.0, soglieNegative)).toBe(2);
  });

  it('applica l’override delle soglie personalizzate quando presente', () => {
    const stazione = {
      value: 1.2,
      soglia1: 2.0,
      soglia2: 3.0,
      soglia3: 4.0,
    };

    // Con soglie ufficiali è livello 0
    expect(valutaStazione(stazione).livello).toBe(0);

    // Con soglie personalizzate più basse diventa livello 2 (arancione)
    const conOverride = valutaStazione(stazione, {
      soglia1: 0.8,
      soglia2: 1.1,
      soglia3: 1.5,
    });
    expect(conOverride.livello).toBe(2);
    expect(conOverride.colore).toBe('arancione');
    expect(conOverride.personalizzata).toBe(true);
    expect(risolviSoglieEffettive(stazione, { soglia1: 0, soglia2: 1.0, soglia3: 0 })).toEqual({
      soglia1: null,
      soglia2: 1.0,
      soglia3: null,
      personalizzata: true,
    });
  });

  it('formatta le soglie mostrando "—" quando non definite', () => {
    expect(formattaSoglia(0)).toBe('—');
    expect(formattaSoglia(null)).toBe('—');
    expect(formattaSoglia(1.3)).toBe('1.30 m');
    expect(formattaSoglia(-0.3)).toBe('-0.30 m');
  });
});

