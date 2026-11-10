import { describe, it, expect } from 'vitest';
import type {
  Stazione,
  LivelloSoglia,
  GruppoPersonalizzato,
  CorsoAcqua,
  FiltroMonitoraggio,
} from '../index';

describe('Modulo contratti', () => {
  it('consente di istanziare strutture conformi ai contratti condivisi', () => {
    const stazione: Stazione = {
      idstazione: '11100',
      ordinamento: 1805,
      nomestaz: 'Morciano di Romagna',
      lon: '1264204',
      lat: '4391441',
      soglia1: 0.8,
      soglia2: 1.3,
      soglia3: 1.7,
      value: null,
      precedente: 'S',
    };

    const corso: CorsoAcqua = {
      id: 'river:conca',
      nome: 'Conca',
      da: 1800,
      a: 1899,
      stazioni: [stazione],
    };

    const gruppo: GruppoPersonalizzato = {
      id: 'custom:123',
      nome: 'Mio Gruppo',
      stazioni: ['11100'],
    };

    const livello: LivelloSoglia = 'nd';
    const filtro: FiltroMonitoraggio = 'blu';

    expect(stazione.idstazione).toBe('11100');
    expect(corso.id).toBe('river:conca');
    expect(gruppo.stazioni).toContain('11100');
    expect(livello).toBe('nd');
    expect(filtro).toBe('blu');
  });
});

