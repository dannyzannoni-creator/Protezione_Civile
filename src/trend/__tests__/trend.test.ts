import { describe, it, expect } from 'vitest';
import type { RispostaSensori, Stazione } from '../../contratti';
import campioneReale from '../../fonte-dati/fixtures/campione-reale.json';
import { calcolaTrendStazione, calcolaMappaTrend } from '../index';

describe('Modulo trend', () => {
  it('calcola correttamente il trend in cm/h e le previsioni lineari +1h e +2h etichettate "stima"', () => {
    // Da 1.20 m a 1.35 m in 1 ora -> +15.0 cm/h, +1h = 1.50 m (stima), +2h = 1.65 m (stima)
    const esito = calcolaTrendStazione(1.35, 1.20, 1);
    expect(esito.trendCmOra).toBeCloseTo(15, 2);
    expect(esito.direzione).toBe('in_aumento');
    expect(esito.previsione1h).toBeCloseTo(1.5, 2);
    expect(esito.previsione2h).toBeCloseTo(1.65, 2);
    expect(esito.testoTrend).toBe('+15.0 cm/h');
    expect(esito.testoPrevisione1h).toBe('1.50 m (stima)');
    expect(esito.testoPrevisione2h).toBe('1.65 m (stima)');
  });

  it('gestisce il trend in calo e stabile con intervalli orari diversi da 1h', () => {
    // Calo di 0.40 m in 2 ore -> -20.0 cm/h
    const inCalo = calcolaTrendStazione(2.0, 2.4, 2);
    expect(inCalo.trendCmOra).toBeCloseTo(-20, 2);
    expect(inCalo.direzione).toBe('in_calo');
    expect(inCalo.testoTrend).toBe('-20.0 cm/h');
    expect(inCalo.testoPrevisione1h).toBe('1.80 m (stima)');
    expect(inCalo.testoPrevisione2h).toBe('1.60 m (stima)');

    const stabile = calcolaTrendStazione(1.0, 1.0, 1);
    expect(stabile.trendCmOra).toBe(0);
    expect(stabile.direzione).toBe('stabile');
    expect(stabile.testoTrend).toBe('0.0 cm/h');
  });

  it('mostra "—" per trend e previsioni se manca il valore attuale o il valore precedente', () => {
    const senzaAttuale = calcolaTrendStazione(null, 1.2, 1);
    expect(senzaAttuale.trendCmOra).toBeNull();
    expect(senzaAttuale.previsione1h).toBeNull();
    expect(senzaAttuale.previsione2h).toBeNull();
    expect(senzaAttuale.testoTrend).toBe('—');
    expect(senzaAttuale.testoPrevisione1h).toBe('—');
    expect(senzaAttuale.testoPrevisione2h).toBe('—');

    const senzaPrecedente = calcolaTrendStazione(1.2, null, 1);
    expect(senzaPrecedente.testoTrend).toBe('—');
    expect(senzaPrecedente.testoPrevisione1h).toBe('—');
    expect(senzaPrecedente.testoPrevisione2h).toBe('—');
  });

  it('calcola la mappa dei trend su un intero set di stazioni reali', () => {
    const stazioni = campioneReale.slice(1) as Stazione[];
    const corrente: RispostaSensori = {
      time: 1794150000000,
      timeRichiesto: 1794150000000,
      tentativi: 1,
      stazioni,
    };

    const precedente: RispostaSensori = {
      time: 1794150000000 - 3_600_000,
      timeRichiesto: 1794150000000 - 3_600_000,
      tentativi: 1,
      stazioni: stazioni.map((s) => ({
        ...s,
        value: s.value !== null ? Number((s.value - 0.1).toFixed(2)) : null,
      })),
    };

    const mappa = calcolaMappaTrend(corrente, precedente);

    // Stazione con value null -> "—"
    expect(mappa['12668']?.testoTrend).toBe('—');
    expect(mappa['12668']?.testoPrevisione1h).toBe('—');

    // Stazione con value valido (+0.10 m in 1h -> +10.0 cm/h)
    expect(mappa['3153']?.testoTrend).toBe('+10.0 cm/h');
    expect(mappa['3153']?.testoPrevisione1h).toContain('(stima)');
    expect(mappa['3153']?.testoPrevisione2h).toContain('(stima)');
  });

  it('calcola correttamente il trend su intervallo di 15 minuti (ore = 0.25) e fallback a 1 ora', () => {
    const stazioni = campioneReale.slice(1) as Stazione[];
    const t0 = 1794150000000;
    const corrente: RispostaSensori = {
      time: t0,
      timeRichiesto: t0,
      tentativi: 1,
      stazioni: stazioni.map((s) => ({ ...s, precedente: 'N' })),
    };

    // A time - 15 minuti (0.25h), valore inferiore di 0.05 m -> +20.0 cm/h
    const precedente15m: RispostaSensori = {
      time: t0 - 15 * 60 * 1000,
      timeRichiesto: t0 - 15 * 60 * 1000,
      tentativi: 1,
      stazioni: stazioni.map((s) => ({
        ...s,
        value: s.value !== null ? Number((s.value - 0.05).toFixed(2)) : null,
      })),
    };

    const mappa = calcolaMappaTrend(corrente, precedente15m);
    expect(mappa['3153']?.trendCmOra).toBeCloseTo(20, 2);
    expect(mappa['3153']?.testoTrend).toBe('+20.0 cm/h');
    expect(mappa['3153']?.testoPrevisione1h).toContain('(stima)');
    expect(mappa['3153']?.testoPrevisione2h).toContain('(stima)');
  });
});

