import type {
  CalcoloTrend,
  DirezioneTrend,
  RispostaSensori,
  ServizioTrend,
  Stazione,
} from '../contratti';

const UN_ORA_MS = 3_600_000;
const EPSILON_STABILITA_CM_H = 0.05;

const TREND_NON_DISPONIBILE: CalcoloTrend = {
  trendCmOra: null,
  direzione: 'nd',
  previsione1h: null,
  previsione2h: null,
  testoTrend: '—',
  testoPrevisione1h: '—',
  testoPrevisione2h: '—',
};

/**
 * Calcola il trend orario in cm/h e le previsioni lineari a +1h e +2h (etichettate "stima").
 * Formula: Trend in cm/h = (value_ora - value_un_ora_fa) * 100 / ore
 * Se manca un dato (null o ore <= 0) restituisce "—" per tutti i campi testuali.
 */
export function calcolaTrendStazione(
  valoreAttuale: number | null,
  valorePrecedente: number | null,
  oreTrascorse: number = 1
): CalcoloTrend {
  if (
    valoreAttuale === null ||
    valorePrecedente === null ||
    !Number.isFinite(valoreAttuale) ||
    !Number.isFinite(valorePrecedente) ||
    !Number.isFinite(oreTrascorse) ||
    oreTrascorse <= 0
  ) {
    return { ...TREND_NON_DISPONIBILE };
  }

  // Formula esplicita: Trend in cm/h = (value_ora - value_un_ora_fa) * 100 / ore
  const trendCmOraRaw = ((valoreAttuale - valorePrecedente) * 100) / oreTrascorse;
  // Evita -0.0 in formattazione
  const trendCmOra = Math.abs(trendCmOraRaw) < 1e-9 ? 0 : Number(trendCmOraRaw.toFixed(2));
  const deltaMetriOra = trendCmOraRaw / 100;

  // Previsione +1h e +2h = estrapolazione lineare del trend, sempre etichettata "stima"
  const previsione1h = Number((valoreAttuale + deltaMetriOra * 1).toFixed(4));
  const previsione2h = Number((valoreAttuale + deltaMetriOra * 2).toFixed(4));

  let direzione: DirezioneTrend = 'stabile';
  if (trendCmOra >= EPSILON_STABILITA_CM_H) {
    direzione = 'in_aumento';
  } else if (trendCmOra <= -EPSILON_STABILITA_CM_H) {
    direzione = 'in_calo';
  }

  const segno = trendCmOra > 0 ? '+' : '';
  const testoTrend = `${segno}${trendCmOra.toFixed(1)} cm/h`;
  const testoPrevisione1h = `${previsione1h.toFixed(2)} m (stima)`;
  const testoPrevisione2h = `${previsione2h.toFixed(2)} m (stima)`;

  return {
    trendCmOra,
    direzione,
    previsione1h,
    previsione2h,
    testoTrend,
    testoPrevisione1h,
    testoPrevisione2h,
  };
}

/**
 * Calcola la mappa completa dei trend per tutte le stazioni della rilevazione corrente,
 * confrontandole con la rilevazione precedente (es. time - 15 minuti) e con eventuale
 * riferimento a time - 1 ora per le stazioni a cadenza oraria/semioraria.
 */
export function calcolaMappaTrend(
  corrente: RispostaSensori,
  precedente: RispostaSensori | null,
  precedenteUnOra: RispostaSensori | null = null
): Record<string, CalcoloTrend> {
  const risultato: Record<string, CalcoloTrend> = {};

  if (!precedente && !precedenteUnOra) {
    for (const stazione of corrente.stazioni) {
      risultato[stazione.idstazione] = { ...TREND_NON_DISPONIBILE };
    }
    return risultato;
  }

  const mappaPrecedenti = new Map<string, Stazione>();
  if (precedente) {
    for (const s of precedente.stazioni) {
      mappaPrecedenti.set(s.idstazione, s);
    }
  }

  const mappaUnOra = new Map<string, Stazione>();
  if (precedenteUnOra) {
    for (const s of precedenteUnOra.stazioni) {
      mappaUnOra.set(s.idstazione, s);
    }
  }

  const diffMsPrincipale = precedente ? corrente.time - precedente.time : 0;
  const orePrincipale = diffMsPrincipale > 0 ? diffMsPrincipale / UN_ORA_MS : 1;

  const diffMsUnOra = precedenteUnOra ? corrente.time - precedenteUnOra.time : 0;
  const oreUnOra = diffMsUnOra > 0 ? diffMsUnOra / UN_ORA_MS : 1;

  for (const stazione of corrente.stazioni) {
    const stazPrec = mappaPrecedenti.get(stazione.idstazione);
    const staz1h = mappaUnOra.get(stazione.idstazione);

    if (precedente && precedenteUnOra) {
      // Se la stazione ha un valore fresco (precedente !== 'S') e dispone del dato a -15m, usa -15m;
      // altrimenti usa il dato a -1h (per stazioni con campionamento orario/semiorario)
      if (stazPrec && stazPrec.value !== null && stazione.precedente !== 'S') {
        risultato[stazione.idstazione] = calcolaTrendStazione(
          stazione.value,
          stazPrec.value,
          orePrincipale
        );
      } else if (staz1h && staz1h.value !== null) {
        risultato[stazione.idstazione] = calcolaTrendStazione(
          stazione.value,
          staz1h.value,
          oreUnOra
        );
      } else if (stazPrec && stazPrec.value !== null) {
        risultato[stazione.idstazione] = calcolaTrendStazione(
          stazione.value,
          stazPrec.value,
          orePrincipale
        );
      } else {
        risultato[stazione.idstazione] = { ...TREND_NON_DISPONIBILE };
      }
    } else if (precedente) {
      risultato[stazione.idstazione] = calcolaTrendStazione(
        stazione.value,
        stazPrec?.value ?? null,
        orePrincipale
      );
    } else {
      risultato[stazione.idstazione] = calcolaTrendStazione(
        stazione.value,
        staz1h?.value ?? null,
        oreUnOra
      );
    }
  }

  return risultato;
}

/**
 * Crea un'istanza del servizio trend iniettabile negli altri moduli.
 */
export function creaServizioTrend(): ServizioTrend {
  return {
    calcolaTrendStazione,
    calcolaMappaTrend,
  };
}

