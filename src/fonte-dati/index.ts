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

export const VARIABILE_IDROMETRICA = '254,0,0/1,-,-,-/B13215';

export const QUINDICI_MINUTI_MS = 15 * 60 * 1000;

export const UN_ORA_MS = 3_600_000;

export const MAX_TENTATIVI_NULL_DEFAULT = 3;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ConfigurazioneFonteDati {
  /** URL base dell'endpoint (default: URL_API_ARPAE_DEFAULT) */
  baseUrl?: string;
  /** URL secondario di fallback (es. /api/sensori quando servito dal proxy locale) */
  fallbackBaseUrl?: string | null;
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

    const precedente15Min = await recuperaStoricoInCacheORete(
      timePrecedente15m,
      usaOffsetArpae
    );
    const precedenteUnOra = await recuperaStoricoInCacheORete(
      timePrecedente1h,
      usaOffsetArpae
    );

    // Se in tempo reale alcune stazioni (che trasmettono solo a :00 o :30) hanno value null nello slot :15/:45,
    // riportiamo il loro ultimo valore misurato valido da time - 15m o time - 1h per garantire continuità su tutte le stazioni
    if (usaOffsetArpae && (precedente15Min || precedenteUnOra)) {
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

