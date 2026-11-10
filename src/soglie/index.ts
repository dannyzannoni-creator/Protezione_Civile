import type {
  ColoreSoglia,
  LivelloSoglia,
  ServizioSoglie,
  SoglieEffettive,
  SoglieStazione,
  Stazione,
  ValutazioneSoglia,
} from '../contratti';

/**
 * Converte un valore di soglia grezzo nella soglia effettiva:
 * - 0, null, undefined o NaN equivalgono a "soglia non definita" (restituisce null).
 * - Qualsiasi altro numero finito (inclusi i numeri negativi, es. -0.3) è valido.
 */
export function sogliaDefinita(valore: number | null | undefined): number | null {
  if (valore === null || valore === undefined || !Number.isFinite(valore) || valore === 0) {
    return null;
  }
  return valore;
}

/**
 * Risolve le soglie 1/2/3 effettive applicando eventuale override personalizzato.
 */
export function risolviSoglieEffettive(
  stazione: SoglieStazione,
  override?: SoglieStazione | null
): SoglieEffettive {
  if (!override) {
    return {
      soglia1: sogliaDefinita(stazione.soglia1),
      soglia2: sogliaDefinita(stazione.soglia2),
      soglia3: sogliaDefinita(stazione.soglia3),
      personalizzata: false,
    };
  }

  const s1 = override.soglia1 !== undefined ? override.soglia1 : stazione.soglia1;
  const s2 = override.soglia2 !== undefined ? override.soglia2 : stazione.soglia2;
  const s3 = override.soglia3 !== undefined ? override.soglia3 : stazione.soglia3;

  return {
    soglia1: sogliaDefinita(s1),
    soglia2: sogliaDefinita(s2),
    soglia3: sogliaDefinita(s3),
    personalizzata: true,
  };
}

/**
 * Calcola il livello di soglia per un dato valore idrometrico:
 * - value === null -> 'nd'
 * - 3 se soglia3 è definita e value >= soglia3
 * - 2 se soglia2 è definita e value >= soglia2
 * - 1 se soglia1 è definita e value >= soglia1
 * - 0 altrimenti (sotto le soglie definite, oppure nessuna soglia definita)
 */
export function calcolaLivelloSoglia(
  value: number | null,
  soglieUfficiali: SoglieStazione,
  override?: SoglieStazione | null
): LivelloSoglia {
  if (value === null || !Number.isFinite(value)) {
    return 'nd';
  }

  const { soglia1, soglia2, soglia3 } = risolviSoglieEffettive(soglieUfficiali, override);

  let livelloMax: 0 | 1 | 2 | 3 = 0;

  if (soglia1 !== null && value >= soglia1) {
    livelloMax = 1;
  }
  if (soglia2 !== null && value >= soglia2) {
    livelloMax = 2;
  }
  if (soglia3 !== null && value >= soglia3) {
    livelloMax = 3;
  }

  return livelloMax;
}

/**
 * Restituisce i metadati cromatici e testuali (per accessibilità) associati a un livello.
 */
export function descriviLivelloSoglia(livello: LivelloSoglia): {
  colore: ColoreSoglia;
  etichetta: string;
  etichettaBreve: string;
} {
  switch (livello) {
    case 0:
      return {
        colore: 'verde',
        etichetta: 'Normale (Livello 0 - Verde)',
        etichettaBreve: 'Liv. 0 · Verde',
      };
    case 1:
      return {
        colore: 'giallo',
        etichetta: 'Allerta Gialla (Livello 1 - Giallo)',
        etichettaBreve: 'Liv. 1 · Giallo',
      };
    case 2:
      return {
        colore: 'arancione',
        etichetta: 'Allerta Arancione (Livello 2 - Arancione)',
        etichettaBreve: 'Liv. 2 · Arancione',
      };
    case 3:
      return {
        colore: 'rosso',
        etichetta: 'Allerta Rossa (Livello 3 - Rosso)',
        etichettaBreve: 'Liv. 3 · Rosso',
      };
    case 'nd':
      return {
        colore: 'grigio',
        etichetta: 'Non disponibile (n.d. - Grigio)',
        etichettaBreve: 'n.d. · Grigio',
      };
  }
}

/**
 * Valuta complessivamente lo stato di una stazione rispetto alle soglie (ufficiali o personalizzate).
 */
export function valutaStazione(
  stazione: Pick<Stazione, 'value' | 'soglia1' | 'soglia2' | 'soglia3'>,
  override?: SoglieStazione | null
): ValutazioneSoglia {
  const effettive = risolviSoglieEffettive(stazione, override);
  const livello = calcolaLivelloSoglia(stazione.value, stazione, override);
  const { colore, etichetta, etichettaBreve } = descriviLivelloSoglia(livello);

  return {
    livello,
    colore,
    etichetta,
    etichettaBreve,
    soglia1Effettiva: effettive.soglia1,
    soglia2Effettiva: effettive.soglia2,
    soglia3Effettiva: effettive.soglia3,
    personalizzata: effettive.personalizzata,
  };
}

/**
 * Formatta una soglia per la visualizzazione in UI ("—" se non definita, altrimenti valore in m).
 */
export function formattaSoglia(valore: number | null | undefined): string {
  const definita = sogliaDefinita(valore);
  if (definita === null) {
    return '—';
  }
  return `${definita.toFixed(2)} m`;
}

/**
 * Crea un'istanza del servizio soglie iniettabile negli altri moduli.
 */
export function creaServizioSoglie(): ServizioSoglie {
  return {
    sogliaDefinita,
    risolviSoglieEffettive,
    calcolaLivelloSoglia,
    valutaStazione,
    formattaSoglia,
  };
}

