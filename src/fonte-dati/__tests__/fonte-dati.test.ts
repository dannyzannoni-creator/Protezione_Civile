import { describe, it, expect, vi } from 'vitest';
import campioneReale from '../fixtures/campione-reale.json';
import {
  calcolaTimeRiferimento,
  calcolaTimeRiferimento15Min,
  costruisciUrlSensori,
  costruisciUrlGraficoStazione,
  parsaRispostaSensori,
  tuttiValoriNull,
  creaServizioFonteDati,
  QUINDICI_MINUTI_MS,
  UN_ORA_MS,
  VARIABILE_IDROMETRICA,
} from '../index';

describe('Modulo fonte-dati', () => {
  it('arrotonda correttamente il timestamp per difetto all’ora intera e a 15 minuti', () => {
    // 2026-11-08T17:37:48.123Z -> 2026-11-08T17:00:00.000Z (ora) e 17:30:00.000Z (15m)
    const input = Date.UTC(2026, 10, 8, 17, 37, 48, 123);
    const attesoOra = Date.UTC(2026, 10, 8, 17, 0, 0, 0);
    const atteso15m = Date.UTC(2026, 10, 8, 17, 30, 0, 0);
    expect(calcolaTimeRiferimento(input)).toBe(attesoOra);
    expect(calcolaTimeRiferimento15Min(input)).toBe(atteso15m);
  });

  it('costruisce correttamente l’URL con variabile e time e l’URL del grafico stazione con idstazione', () => {
    const url = costruisciUrlSensori('https://esempio.it/api', 1775203200000);
    expect(url).toContain('https://esempio.it/api?variabile=');
    expect(url).toContain(encodeURIComponent(VARIABILE_IDROMETRICA));
    expect(url).toContain('&time=1775203200000');

    const refDate = new Date(2026, 10, 10, 12, 0, 0).getTime(); // 2026-11-10 locale
    const urlGrafico = costruisciUrlGraficoStazione('3103', refDate);
    expect(urlGrafico).toBe(
      'https://allertameteo.regione.emilia-romagna.it/web/guest/grafico-sensori?p_p_id=AllertaGraficoPortlet&p_p_lifecycle=0&_AllertaGraficoPortlet_mvcRenderCommandName=%2Fallerta%2Fanimazione%2Fgrafico&r=3103/254,0,0/1,-,-,-/B13215/2026-11-08/2026-11-10&stazione=3103&variabile=254,0,0/1,-,-,-/B13215'
    );
  });

  it('parsa il campione reale mantenendo lon/lat/precedente grezzi, value null e soglie a 0', () => {
    const risultato = parsaRispostaSensori(campioneReale, 1794153600000);

    expect(risultato.time).toBe(1794150000000);
    expect(risultato.timeRichiesto).toBe(1794153600000);
    expect(risultato.stazioni).toHaveLength(15);

    // Verifica stazione con value null e precedente = "S"
    const rubiera = risultato.stazioni.find((s) => s.idstazione === '12668');
    expect(rubiera).toBeDefined();
    expect(rubiera?.value).toBeNull();
    expect(rubiera?.precedente).toBe('S');
    expect(rubiera?.lon).toBe('1081511');
    expect(rubiera?.lat).toBe('4465863');

    // Verifica stazione con soglie = 0 e ordinamento 9999
    const fiscaglia = risultato.stazioni.find((s) => s.idstazione === '53227');
    expect(fiscaglia).toBeDefined();
    expect(fiscaglia?.ordinamento).toBe(9999);
    expect(fiscaglia?.soglia1).toBe(0);
    expect(fiscaglia?.soglia2).toBe(0);
    expect(fiscaglia?.soglia3).toBe(0);
    expect(fiscaglia?.value).toBe(1.39);
  });

  it('riprova sottraendo 1 ora fino a 3 tentativi se TUTTI i value sono null', async () => {
    const oraBase = 1794153600000;
    const rispostaTuttoNull = [
      { time: String(oraBase) },
      {
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
      },
    ];

    const chiamateTime: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      const parsed = new URL(url, 'http://localhost');
      const timeParam = parsed.searchParams.get('time') ?? '';
      chiamateTime.push(timeParam);

      // Ai primi 2 tentativi restituisce tutti null, al terzo (oraBase - 2h) restituisce il campione reale
      const payload =
        chiamateTime.length < 3 ? rispostaTuttoNull : campioneReale;

      return {
        ok: true,
        status: 200,
        json: async () => payload,
      } as Response;
    });

    const servizio = creaServizioFonteDati({
      baseUrl: 'https://test.arpae.it/sensori',
      fallbackBaseUrl: null,
      fetchFn: fetchMock,
      nowFn: () => oraBase + 120_000,
    });

    const esito = await servizio.scaricaStazioni();

    expect(chiamateTime).toEqual([
      String(oraBase),
      String(oraBase - UN_ORA_MS),
      String(oraBase - 2 * UN_ORA_MS),
    ]);
    expect(esito.tentativi).toBe(3);
    expect(tuttiValoriNull(esito.stazioni)).toBe(false);
  });

  it('si ferma dopo 3 retry (4 chiamate totali) se tutti i value restano null', async () => {
    const oraBase = 1794153600000;
    const rispostaTuttoNull = [
      { time: String(oraBase) },
      {
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
      },
    ];

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => rispostaTuttoNull,
    } as Response));

    const servizio = creaServizioFonteDati({
      baseUrl: 'https://test.arpae.it/sensori',
      fallbackBaseUrl: null,
      fetchFn: fetchMock,
      nowFn: () => oraBase,
    });

    const esito = await servizio.scaricaStazioni();
    expect(fetchMock).toHaveBeenCalledTimes(4); // T, T-1h, T-2h, T-3h
    expect(esito.tentativi).toBe(4);
    expect(tuttiValoriNull(esito.stazioni)).toBe(true);
  });

  it('scarica anche time - 15 minuti e time - 1h per il valore precedente e tiene la cache in memoria', async () => {
    const oraBase = 1794150000000;
    const meno15Minuti = oraBase - QUINDICI_MINUTI_MS;
    const menoUnOra = oraBase - UN_ORA_MS;

    const fetchMock = vi.fn(async (url: string) => {
      const parsed = new URL(url, 'http://localhost');
      const timeParam = Number(parsed.searchParams.get('time'));
      return {
        ok: true,
        status: 200,
        json: async () => [
          { time: String(timeParam) },
          ...campioneReale.slice(1),
        ],
      } as Response;
    });

    const servizio = creaServizioFonteDati({
      baseUrl: 'https://test.arpae.it/sensori',
      fallbackBaseUrl: null,
      fetchFn: fetchMock,
      nowFn: () => oraBase,
    });

    const primaChiamata = await servizio.scaricaConStorico(oraBase);
    expect(primaChiamata.corrente.time).toBe(oraBase);
    expect(primaChiamata.precedente?.time).toBe(meno15Minuti);
    expect(primaChiamata.precedente15Min?.time).toBe(meno15Minuti);
    expect(primaChiamata.precedenteUnOra?.time).toBe(menoUnOra);
    expect(fetchMock).toHaveBeenCalledTimes(3); // corrente, time - 15m, time - 1h

    // Una seconda chiamata per la stessa finestra usa la cache in memoria senza fare nuove richieste HTTP
    const secondaChiamata = await servizio.scaricaConStorico(oraBase);
    expect(secondaChiamata.corrente.time).toBe(oraBase);
    expect(secondaChiamata.precedente?.time).toBe(meno15Minuti);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Con bypassaCache = true, aggiorna la lettura corrente dalla rete ma mantiene in cache time - 15m e time - 1h
    const terzaChiamata = await servizio.scaricaConStorico(oraBase, true);
    expect(terzaChiamata.corrente.time).toBe(oraBase);
    expect(terzaChiamata.precedente?.time).toBe(meno15Minuti);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

