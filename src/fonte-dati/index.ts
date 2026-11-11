import type {
  DatiSensoriConStorico,
  OpzioniScaricamento,
  RispostaSensori,
  ServizioFonteDati,
  Stazione,
} from '../contratti';

export const URL_API_ARPAE_DEFAULT =
  'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-sensor-values-no-time';

export const URL_PROXY_LOCALE = '/api/sensori';

export const URL_API_SERIE_GRAFICO_DEFAULT =
  'https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-time-series/';

export const URL_PROXY_SERIE_LOCALE = '/api/serie-stazione';

export const VARIABILE_IDROMETRICA = '254,0,0/1,-,-,-/B13215';

export const QUINDICI_MINUTI_MS = 15 * 60 * 1000;

export const UN_ORA_MS = 3_600_000;

export const MAX_TENTATIVI_NULL_DEFAULT = 3;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ConfigurazioneFonteDati {
  /** URL base dell'endpoint anagrafica/sensori (default: URL_API_ARPAE_DEFAULT) */
  baseUrl?: string;
  /** URL secondario di fallback per l'anagrafica (es. /api/sensori) */
  fallbackBaseUrl?: string | null;
  /** URL base dell'endpoint serie storica del grafico (default: URL_API_SERIE_GRAFICO_DEFAULT) */
  serieGraficoBaseUrl?: string;
  /** URL secondario di fallback per la serie storica del grafico (es. /api/serie-stazione) */
  fallbackSerieGraficoBaseUrl?: string | null;
  /** Se true, aggiorna il valore di ogni stazione con l'ultimo dato del grafico (get-time-series) */
  usaSerieGrafico?: boolean;
  /** Parametro costante variabile idrometrica */
  variabile?: string;
  /** Funzione fetch iniettabile per test (default: globalThis.fetch) */
  fetchFn?: FetchFn;
  /** Funzione orologio iniettabile per test (default: () => Date.now()) */
  nowFn?: () => number;
}

/**
 * Arrotonda un timestamp in millisecondi per difetto all'ora intera.
 */
export function calcolaTimeRiferimento(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / UN_ORA_MS) * UN_ORA_MS;
}

/**
 * Arrotonda un timestamp in millisecondi per difetto al quarto d'ora (15 minuti).
 */
export function calcolaTimeRiferimento15Min(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / QUINDICI_MINUTI_MS) * QUINDICI_MINUTI_MS;
}

/**
 * Costruisce l'URL completo per l'interrogazione dell'API ARPAE.
 */
export function costruisciUrlSensori(
  baseUrl: string,
  timeMs: number,
  variabile: string = VARIABILE_IDROMETRICA
): string {
  const separatore = baseUrl.includes('?') ? '&' : '?';
  const paramVariabile = encodeURIComponent(variabile);
  const paramTime = encodeURIComponent(String(timeMs));
  return `${baseUrl}${separatore}variabile=${paramVariabile}&time=${paramTime}`;
}

function formattaDataIsoLocale(ms: number): string {
  const d = new Date(ms);
  const anno = d.getFullYear();
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${anno}-${mese}-${giorno}`;
}

/**
 * Costruisce l'URL della pagina ufficiale del grafico idrometrico ARPAE per una stazione.
 */
export function costruisciUrlGraficoStazione(
  idstazione: string,
  nowMs: number = Date.now()
): string {
  const id = encodeURIComponent(idstazione.trim());
  const dataFine = formattaDataIsoLocale(nowMs);
  const dataInizio = formattaDataIsoLocale(nowMs - 2 * 24 * 60 * 60 * 1000);
  return `https://allertameteo.regione.emilia-romagna.it/web/guest/grafico-sensori?p_p_id=AllertaGraficoPortlet&p_p_lifecycle=0&_AllertaGraficoPortlet_mvcRenderCommandName=%2Fallerta%2Fanimazione%2Fgrafico&r=${id}/254,0,0/1,-,-,-/B13215/${dataInizio}/${dataFine}&stazione=${id}&variabile=254,0,0/1,-,-,-/B13215`;
}

/**
 * Costruisce l'URL dell'API JSON che alimenta il grafico ARPAE (get-time-series) per una singola stazione.
 */
export function costruisciUrlSerieGrafico(
  baseUrlSerie: string,
  idstazione: string,
  variabile: string = VARIABILE_IDROMETRICA
): string {
  const separatore = baseUrlSerie.includes('?') ? '&' : '?';
  const paramStazione = encodeURIComponent(idstazione.trim());
  const paramVariabile = encodeURIComponent(variabile);
  return `${baseUrlSerie}${separatore}stazione=${paramStazione}&variabile=${paramVariabile}`;
}

export interface PuntoSerieGrafico {
  t: number;
  v: number | null;
}

export interface SintesiSerieGrafico {
  ultimoValore: number | null;
  ultimoTime: number | null;
  valore15MinPrima: number | null;
  valoreUnOraPrima: number | null;
}

/**
 * Estrae l'ultimo valore valido del grafico ARPAE (replicando la logica di grafico.js)
 * e i valori precedenti a -15 minuti e -1 ora dalla serie storica [{ t, v }].
 */
export function estraiDatiDaSerieGrafico(raw: unknown): SintesiSerieGrafico | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const punti: PuntoSerieGrafico[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !('t' in item) || !('v' in item)) {
      continue;
    }
    const t = normalizzaNumero(item.t, NaN);
    if (!Number.isFinite(t)) continue;
    const v = normalizzaValoreIdrometrico(item.v);
    punti.push({ t, v });
  }

  if (punti.length === 0) {
    return null;
  }

  punti.sort((a, b) => a.t - b.t);

  // Stessa regola di grafico.js ARPAE: scarta eventuali null finali entro le ultime 2 ore
  const tFinale = punti[punti.length - 1].t;
  while (
    punti.length > 0 &&
    punti[punti.length - 1].v === null &&
    punti[punti.length - 1].t > tFinale - 2 * UN_ORA_MS
  ) {
    punti.pop();
  }

  const ultimo = punti[punti.length - 1];
  if (!ultimo || ultimo.v === null) {
    return {
      ultimoValore: null,
      ultimoTime: ultimo?.t ?? null,
      valore15MinPrima: null,
      valoreUnOraPrima: null,
    };
  }

  const ultimoValore = ultimo.v;
  const ultimoTime = ultimo.t;

  // Ricerca del punto valido più vicino a -15 minuti (tra -5 min e -45 min)
  const target15m = ultimoTime - QUINDICI_MINUTI_MS;
  let miglior15m: PuntoSerieGrafico | null = null;
  let minDiff15m = Infinity;

  // Ricerca del punto valido più vicino a -1 ora (tra -30 min e -2 ore)
  const target1h = ultimoTime - UN_ORA_MS;
  let miglior1h: PuntoSerieGrafico | null = null;
  let minDiff1h = Infinity;

  for (let i = punti.length - 2; i >= 0; i--) {
    const p = punti[i];
    if (p.v === null) continue;
    const dt = ultimoTime - p.t;
    if (dt <= 0) continue;

    if (dt >= 5 * 60 * 1000 && dt <= 45 * 60 * 1000) {
      const diff = Math.abs(p.t - target15m);
      if (diff < minDiff15m) {
        minDiff15m = diff;
        miglior15m = p;
      }
    }

    if (dt >= 30 * 60 * 1000 && dt <= 2 * UN_ORA_MS) {
      const diff = Math.abs(p.t - target1h);
      if (diff < minDiff1h) {
        minDiff1h = diff;
        miglior1h = p;
      }
    }

    if (dt > 2 * UN_ORA_MS) {
      break;
    }
  }

  let valore15MinPrima: number | null = null;
  if (miglior15m && miglior15m.v !== null) {
    const oreEffettive = (ultimoTime - miglior15m.t) / UN_ORA_MS;
    if (oreEffettive > 0) {
      const deltaOrario = (ultimoValore - miglior15m.v) / oreEffettive;
      valore15MinPrima = Number((ultimoValore - deltaOrario * 0.25).toFixed(4));
    }
  }

  let valoreUnOraPrima: number | null = null;
  if (miglior1h && miglior1h.v !== null) {
    const oreEffettive = (ultimoTime - miglior1h.t) / UN_ORA_MS;
    if (oreEffettive > 0) {
      const deltaOrario = (ultimoValore - miglior1h.v) / oreEffettive;
      valoreUnOraPrima = Number((ultimoValore - deltaOrario * 1).toFixed(4));
    }
  }

  return {
    ultimoValore,
    ultimoTime,
    valore15MinPrima,
    valoreUnOraPrima,
  };
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function normalizzaNumero(val: unknown, defaultVal: number = 0): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultVal;
}

function normalizzaValoreIdrometrico(val: unknown): number | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

/**
 * Esegue il parsing e la validazione della risposta grezza JSON dell'endpoint ARPAE.
 */
export function parsaRispostaSensori(
  raw: unknown,
  timeRichiesto: number,
  tentativi: number = 1
): RispostaSensori {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Risposta API non valida: atteso un array JSON non vuoto.');
  }

  const primoElemento = raw[0];
  if (!isRecord(primoElemento) || !('time' in primoElemento)) {
    throw new Error('Risposta API non valida: primo elemento privo del campo "time".');
  }

  const timeReale = normalizzaNumero(primoElemento.time, timeRichiesto);
  const stazioni: Stazione[] = [];

  for (let i = 1; i < raw.length; i++) {
    const item = raw[i];
    if (!isRecord(item)) continue;
    if (typeof item.idstazione !== 'string' && typeof item.idstazione !== 'number') continue;

    const idstazione = String(item.idstazione).trim();
    if (!idstazione) continue;

    const stazione: Stazione = {
      idstazione,
      ordinamento: normalizzaNumero(item.ordinamento, 0),
      nomestaz: typeof item.nomestaz === 'string' ? item.nomestaz.trim() : idstazione,
      lon: item.lon !== undefined && item.lon !== null ? String(item.lon) : '',
      lat: item.lat !== undefined && item.lat !== null ? String(item.lat) : '',
      soglia1: normalizzaNumero(item.soglia1, 0),
      soglia2: normalizzaNumero(item.soglia2, 0),
      soglia3: normalizzaNumero(item.soglia3, 0),
      value: normalizzaValoreIdrometrico(item.value),
      precedente:
        typeof item.precedente === 'string'
          ? item.precedente
          : item.precedente !== undefined && item.precedente !== null
            ? String(item.precedente)
            : null,
    };

    stazioni.push(stazione);
  }

  return {
    time: timeReale,
    timeRichiesto,
    tentativi,
    stazioni,
  };
}

/**
 * Verifica se tutte le stazioni nella risposta hanno `value === null`.
 */
export function tuttiValoriNull(stazioni: readonly Stazione[]): boolean {
  if (stazioni.length === 0) {
    return true;
  }
  return stazioni.every((s) => s.value === null);
}

/**
 * Crea un'istanza del servizio fonte-dati con cache in memoria per gli istanti orari.
 */
export function creaServizioFonteDati(
  config: ConfigurazioneFonteDati = {}
): ServizioFonteDati {
  const baseUrl = config.baseUrl ?? URL_API_ARPAE_DEFAULT;
  const fallbackBaseUrl =
    config.fallbackBaseUrl !== undefined ? config.fallbackBaseUrl : URL_PROXY_LOCALE;
  const serieGraficoBaseUrl = config.serieGraficoBaseUrl ?? URL_API_SERIE_GRAFICO_DEFAULT;
  const fallbackSerieGraficoBaseUrl =
    config.fallbackSerieGraficoBaseUrl !== undefined
      ? config.fallbackSerieGraficoBaseUrl
      : URL_PROXY_SERIE_LOCALE;
  const variabile = config.variabile ?? VARIABILE_IDROMETRICA;
  const fetchFn: FetchFn = config.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
  const nowFn = config.nowFn ?? (() => Date.now());

  // Cache in memoria separata per timestamp richiesto (parametro URL) e per time reale restituito da ARPAE
  const cachePerTimeRichiesto = new Map<number, RispostaSensori>();
  const cachePerTimeReale = new Map<number, RispostaSensori>();

  async function eseguiRichiestaSingolaOra(
    timeMs: number,
    numeroTentativo: number,
    bypassaCache: boolean = false
  ): Promise<RispostaSensori> {
    if (!bypassaCache) {
      const inCache = cachePerTimeRichiesto.get(timeMs);
      if (inCache && !tuttiValoriNull(inCache.stazioni)) {
        return {
          ...inCache,
          tentativi: numeroTentativo,
        };
      }
    }

    const urlPrimario = costruisciUrlSensori(baseUrl, timeMs, variabile);
    const headersRichiesta = {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };
    let response: Response;

    try {
      response = await fetchFn(urlPrimario, {
        headers: headersRichiesta,
        cache: 'no-cache',
      });
      const ct = response.headers?.get?.('content-type') ?? '';
      if (!response.ok || (ct && !ct.includes('json') && !ct.includes('text/plain'))) {
        throw new Error(`Risposta non valida da endpoint primario (${response.status})`);
      }
    } catch (errPrimario) {
      if (fallbackBaseUrl && fallbackBaseUrl !== baseUrl) {
        const urlFallback = costruisciUrlSensori(fallbackBaseUrl, timeMs, variabile);
        response = await fetchFn(urlFallback, {
          headers: headersRichiesta,
          cache: 'no-cache',
        });
      } else {
        throw errPrimario;
      }
    }

    if (!response.ok) {
      throw new Error(`Errore HTTP ${response.status} durante il caricamento dei sensori.`);
    }

    const rawJson: unknown = await response.json();
    const risultato = parsaRispostaSensori(rawJson, timeMs, numeroTentativo);

    if (!tuttiValoriNull(risultato.stazioni)) {
      cachePerTimeRichiesto.set(timeMs, risultato);
      cachePerTimeReale.set(risultato.time, risultato);
    }

    return risultato;
  }

  async function scaricaStazioni(
    opzioni: OpzioniScaricamento = {}
  ): Promise<RispostaSensori> {
    const timeIniziale =
      opzioni.timeMs !== undefined
        ? calcolaTimeRiferimento15Min(opzioni.timeMs)
        : calcolaTimeRiferimento(nowFn());
    const maxRetry = opzioni.maxTentativiNull ?? MAX_TENTATIVI_NULL_DEFAULT;
    const bypassaCache = opzioni.bypassaCache ?? false;

    let ultimaRisposta: RispostaSensori | null = null;

    // Tentativo 0 (timeIniziale) + fino a maxRetry tentativi sottraendo 1 ora ciascuno
    for (let retry = 0; retry <= maxRetry; retry++) {
      const timeCorrente = timeIniziale - retry * UN_ORA_MS;
      const risposta = await eseguiRichiestaSingolaOra(timeCorrente, retry + 1, bypassaCache);
      ultimaRisposta = risposta;

      if (!tuttiValoriNull(risposta.stazioni)) {
        return risposta;
      }
    }

    if (!ultimaRisposta) {
      throw new Error('Impossibile ottenere i dati delle stazioni.');
    }
    return ultimaRisposta;
  }

  async function recuperaStoricoInCacheORete(
    timeRealeTarget: number,
    usaOffsetArpae: boolean
  ): Promise<RispostaSensori | null> {
    const inCache = cachePerTimeReale.get(timeRealeTarget);
    if (inCache && !tuttiValoriNull(inCache.stazioni)) {
      return inCache;
    }
    try {
      const timeRichiesto = usaOffsetArpae ? timeRealeTarget + UN_ORA_MS : timeRealeTarget;
      return await eseguiRichiestaSingolaOra(timeRichiesto, 1, false);
    } catch {
      return null;
    }
  }

  async function scaricaSintesiSerieStazione(
    idstazione: string
  ): Promise<SintesiSerieGrafico | null> {
    const headersRichiesta = {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };
    const urlPrimario = costruisciUrlSerieGrafico(serieGraficoBaseUrl, idstazione, variabile);
    let response: Response;

    try {
      response = await fetchFn(urlPrimario, {
        headers: headersRichiesta,
        cache: 'no-cache',
      });
      const ct = response.headers?.get?.('content-type') ?? '';
      if (!response.ok || (ct && !ct.includes('json') && !ct.includes('text/plain'))) {
        throw new Error(`Risposta serie non valida (${response.status})`);
      }
    } catch {
      if (fallbackSerieGraficoBaseUrl && fallbackSerieGraficoBaseUrl !== serieGraficoBaseUrl) {
        try {
          const urlFallback = costruisciUrlSerieGrafico(
            fallbackSerieGraficoBaseUrl,
            idstazione,
            variabile
          );
          response = await fetchFn(urlFallback, {
            headers: headersRichiesta,
            cache: 'no-cache',
          });
          if (!response.ok) return null;
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }

    try {
      const rawJson: unknown = await response.json();
      return estraiDatiDaSerieGrafico(rawJson);
    } catch {
      return null;
    }
  }

  async function arricchisciDatiConSerieGrafico(
    correnteBase: RispostaSensori,
    prec15Base: RispostaSensori | null,
    prec1hBase: RispostaSensori | null
  ): Promise<{
    corrente: RispostaSensori;
    precedente15Min: RispostaSensori | null;
    precedenteUnOra: RispostaSensori | null;
  }> {
    const stazioni = correnteBase.stazioni;
    if (stazioni.length === 0) {
      return {
        corrente: correnteBase,
        precedente15Min: prec15Base,
        precedenteUnOra: prec1hBase,
      };
    }

    const mappaSintesi = new Map<string, SintesiSerieGrafico>();
    let indice = 0;
    const concorrenza = Math.min(25, stazioni.length);

    async function worker(): Promise<void> {
      while (indice < stazioni.length) {
        const staz = stazioni[indice++];
        const sintesi = await scaricaSintesiSerieStazione(staz.idstazione);
        if (sintesi) {
          mappaSintesi.set(staz.idstazione, sintesi);
        }
      }
    }

    await Promise.all(Array.from({ length: concorrenza }, () => worker()));

    if (mappaSintesi.size === 0) {
      return {
        corrente: correnteBase,
        precedente15Min: prec15Base,
        precedenteUnOra: prec1hBase,
      };
    }

    let maxTimeGrafico = correnteBase.time;
    const stazioniCorrentiAggiornate: Stazione[] = [];
    const mappaPrec15 = new Map<string, number | null>();
    for (const s of prec15Base?.stazioni ?? []) {
      mappaPrec15.set(s.idstazione, s.value);
    }
    const mappaPrec1h = new Map<string, number | null>();
    for (const s of prec1hBase?.stazioni ?? []) {
      mappaPrec1h.set(s.idstazione, s.value);
    }

    for (const s of stazioni) {
      const sintesi = mappaSintesi.get(s.idstazione);
      if (sintesi) {
        if (sintesi.ultimoTime && sintesi.ultimoTime > maxTimeGrafico) {
          maxTimeGrafico = sintesi.ultimoTime;
        }
        stazioniCorrentiAggiornate.push({
          ...s,
          value: sintesi.ultimoValore,
          precedente: sintesi.ultimoValore !== null ? 'N' : 'S',
        });
        mappaPrec15.set(s.idstazione, sintesi.valore15MinPrima);
        mappaPrec1h.set(s.idstazione, sintesi.valoreUnOraPrima);
      } else {
        stazioniCorrentiAggiornate.push(s);
      }
    }

    const correnteAggiornata: RispostaSensori = {
      ...correnteBase,
      time: maxTimeGrafico,
      stazioni: stazioniCorrentiAggiornate,
    };

    const precedente15MinAggiornato: RispostaSensori = {
      time: maxTimeGrafico - QUINDICI_MINUTI_MS,
      timeRichiesto: maxTimeGrafico - QUINDICI_MINUTI_MS,
      tentativi: 1,
      stazioni: stazioniCorrentiAggiornate.map((s) => ({
        ...s,
        value: mappaPrec15.get(s.idstazione) ?? null,
      })),
    };

    const precedenteUnOraAggiornato: RispostaSensori = {
      time: maxTimeGrafico - UN_ORA_MS,
      timeRichiesto: maxTimeGrafico - UN_ORA_MS,
      tentativi: 1,
      stazioni: stazioniCorrentiAggiornate.map((s) => ({
        ...s,
        value: mappaPrec1h.get(s.idstazione) ?? null,
      })),
    };

    return {
      corrente: correnteAggiornata,
      precedente15Min: precedente15MinAggiornato,
      precedenteUnOra: precedenteUnOraAggiornato,
    };
  }

  async function scaricaConStorico(
    nowMs?: number,
    bypassaCache?: boolean
  ): Promise<DatiSensoriConStorico> {
    const usaOffsetArpae = nowMs === undefined;
    const deveBypassare = bypassaCache !== undefined ? bypassaCache : usaOffsetArpae;

    let corrente: RispostaSensori;

    if (!usaOffsetArpae) {
      corrente = await scaricaStazioni({
        timeMs: nowMs,
        bypassaCache: deveBypassare,
      });
    } else {
      // Monitoraggio continuo in tempo reale: interroga a passi di 15 minuti partendo dallo slot più recente
      const slotIniziale = calcolaTimeRiferimento15Min(nowFn()) + UN_ORA_MS;
      let candidataFresca: RispostaSensori | null = null;
      let primaValida: RispostaSensori | null = null;

      for (let step = 0; step < 4; step++) {
        const timeSlot = slotIniziale - step * QUINDICI_MINUTI_MS;
        try {
          const risp = await eseguiRichiestaSingolaOra(
            timeSlot,
            step + 1,
            step === 0 ? deveBypassare : false
          );
          if (!tuttiValoriNull(risp.stazioni)) {
            if (!primaValida) {
              primaValida = risp;
            }
            const haLettureFresche = risp.stazioni.some(
              (s) => s.value !== null && s.precedente === 'N'
            );
            if (haLettureFresche) {
              candidataFresca = risp;
              break;
            }
          }
        } catch {
          // Prosegue al quarto d'ora precedente
        }
      }

      if (candidataFresca) {
        corrente = candidataFresca;
      } else if (primaValida) {
        corrente = primaValida;
      } else {
        corrente = await scaricaStazioni({
          timeMs: slotIniziale,
          bypassaCache: deveBypassare,
        });
      }
    }

    // Per il valore precedente richiediamo anche time meno 15 minuti e time meno 1 ora mantenendo la cache in memoria
    const timePrecedente15m = corrente.time - QUINDICI_MINUTI_MS;
    const timePrecedente1h = corrente.time - UN_ORA_MS;

    let precedente15Min = await recuperaStoricoInCacheORete(
      timePrecedente15m,
      usaOffsetArpae
    );
    let precedenteUnOra = await recuperaStoricoInCacheORete(
      timePrecedente1h,
      usaOffsetArpae
    );

    // Se abilitato (default a runtime quando nowMs === undefined, o se forzato da config.usaSerieGrafico),
    // preleva per ogni stazione l'ultimo valore direttamente dalla serie del grafico ARPAE (get-time-series)
    const abilitaSerieGrafico =
      config.usaSerieGrafico !== undefined ? config.usaSerieGrafico : usaOffsetArpae;

    if (abilitaSerieGrafico) {
      const arricchiti = await arricchisciDatiConSerieGrafico(
        corrente,
        precedente15Min,
        precedenteUnOra
      );
      corrente = arricchiti.corrente;
      precedente15Min = arricchiti.precedente15Min;
      precedenteUnOra = arricchiti.precedenteUnOra;
    } else if (usaOffsetArpae && (precedente15Min || precedenteUnOra)) {
      const mappa15 = new Map<string, Stazione>();
      for (const s of precedente15Min?.stazioni ?? []) {
        mappa15.set(s.idstazione, s);
      }
      const mappa1h = new Map<string, Stazione>();
      for (const s of precedenteUnOra?.stazioni ?? []) {
        mappa1h.set(s.idstazione, s);
      }

      const stazioniComplete = corrente.stazioni.map((s) => {
        if (s.value !== null) return s;
        const da15 = mappa15.get(s.idstazione);
        if (da15 && da15.value !== null) {
          return { ...s, value: da15.value, precedente: 'S' };
        }
        const da1h = mappa1h.get(s.idstazione);
        if (da1h && da1h.value !== null) {
          return { ...s, value: da1h.value, precedente: 'S' };
        }
        return s;
      });

      corrente = {
        ...corrente,
        stazioni: stazioniComplete,
      };
    }

    const precedente = precedente15Min ?? precedenteUnOra;

    return {
      corrente,
      precedente,
      precedente15Min,
      precedenteUnOra,
    };
  }

  function svuotaCache(): void {
    cachePerTimeRichiesto.clear();
    cachePerTimeReale.clear();
  }

  return {
    calcolaTimeRiferimento,
    scaricaStazioni,
    scaricaConStorico,
    svuotaCache,
  };
}

