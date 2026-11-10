import { describe, it, expect } from 'vitest';
import type { Stazione } from '../../contratti';
import campioneReale from '../../fonte-dati/fixtures/campione-reale.json';
import {
  DIREZIONE_ORDINAMENTO_DEFAULT,
  FASCE_CORSI_ACQUA,
  generaIdCorsoAcqua,
  ordinaStazioni,
  raggruppaPerCorsoAcqua,
  trovaCorsoPerOrdinamento,
} from '../index';

const stazioniCampione = campioneReale.slice(1) as Stazione[];

describe('Modulo corsi-acqua', () => {
  it('espone la costante DIREZIONE_ORDINAMENTO_DEFAULT impostata a CRESCENTE e tutte le 32 fasce', () => {
    expect(DIREZIONE_ORDINAMENTO_DEFAULT).toBe('CRESCENTE');
    expect(FASCE_CORSI_ACQUA).toHaveLength(32);
  });

  it('genera ID stabili nel formato river:<slug-del-nome>', () => {
    expect(generaIdCorsoAcqua('Po')).toBe('river:po');
    expect(generaIdCorsoAcqua('Navile-Savena abbandonato')).toBe('river:navile-savena-abbandonato');
    expect(generaIdCorsoAcqua('Cavo Napoleonico-Burana')).toBe('river:cavo-napoleonico-burana');
    expect(generaIdCorsoAcqua('Montone-Ronco-Bidente')).toBe('river:montone-ronco-bidente');
  });

  it('esclude le stazioni fuori fascia (0, 9999 o buchi di fascia come 1150)', () => {
    expect(trovaCorsoPerOrdinamento(0)).toBeNull();
    expect(trovaCorsoPerOrdinamento(9999)).toBeNull();
    expect(trovaCorsoPerOrdinamento(1150)).toBeNull();
    expect(trovaCorsoPerOrdinamento(50)?.nome).toBe('Po');
    expect(trovaCorsoPerOrdinamento(1805)?.nome).toBe('Conca');
  });

  it('raggruppa le stazioni e le ordina rigorosamente per ordinamento CRESCENTE (da monte a valle)', () => {
    const gruppi = raggruppaPerCorsoAcqua(stazioniCampione);

    // Le stazioni con ordinamento 9999 (Fiscaglia Monte, Invaso) non devono comparire in nessun gruppo
    const tutteStazioniRaggruppate = gruppi.flatMap((g) => g.stazioni);
    expect(tutteStazioniRaggruppate.some((s) => s.ordinamento === 9999)).toBe(false);
    expect(tutteStazioniRaggruppate.some((s) => s.ordinamento === 0)).toBe(false);

    // Verifica gruppo Po: nel JSON erano in ordine 50, 48, 46 -> devono risultare 46, 48, 50
    const gruppoPo = gruppi.find((g) => g.id === 'river:po');
    expect(gruppoPo).toBeDefined();
    expect(gruppoPo?.stazioni.map((s) => s.ordinamento)).toEqual([46, 48, 50]);

    // Verifica gruppo Secchia: nel JSON erano 861, 860, 869, 867, 866 -> devono risultare 860, 861, 866, 867, 869
    const gruppoSecchia = gruppi.find((g) => g.id === 'river:secchia');
    expect(gruppoSecchia).toBeDefined();
    expect(gruppoSecchia?.stazioni.map((s) => s.ordinamento)).toEqual([860, 861, 866, 867, 869]);

    // Verifica gruppo Reno: nel JSON erano 1019, 1017, 1016 -> devono risultare 1016, 1017, 1019
    const gruppoReno = gruppi.find((g) => g.id === 'river:reno');
    expect(gruppoReno).toBeDefined();
    expect(gruppoReno?.stazioni.map((s) => s.ordinamento)).toEqual([1016, 1017, 1019]);
  });

  it('consente di configurare l’ordinamento DECRESCENTE e fasce personalizzate senza modificare il codice', () => {
    const invertite = ordinaStazioni(
      stazioniCampione.filter((s) => s.ordinamento >= 1 && s.ordinamento <= 99),
      'DECRESCENTE'
    );
    expect(invertite.map((s) => s.ordinamento)).toEqual([50, 48, 46]);
  });
});
