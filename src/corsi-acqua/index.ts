import type {
  CorsoAcqua,
  DirezioneOrdinamento,
  FasciaCorsoAcqua,
  ServizioCorsiAcqua,
  Stazione,
} from '../contratti';
import fasceDefaultJson from './fasce.config.json';

/**
 * Costante configurabile che stabilisce la direzione di ordinamento delle stazioni
 * all'interno di ciascun corso d'acqua (default: CRESCENTE, da monte a valle).
 */
export const DIREZIONE_ORDINAMENTO_DEFAULT: DirezioneOrdinamento = 'CRESCENTE';

/**
 * Elenco delle fasce di ordinamento lette da fasce.config.json.
 */
export const FASCE_CORSI_ACQUA: readonly FasciaCorsoAcqua[] = fasceDefaultJson;

/**
 * Genera uno slug stabile a partire dal nome del corso d'acqua
 * e restituisce l'ID stabile nel formato `river:<slug-del-nome>`.
 */
export function generaIdCorsoAcqua(nome: string): string {
  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `river:${slug}`;
}

/**
 * Restituisce la fascia di corso d'acqua corrispondente all'ordinamento dato,
 * oppure `null` se la stazione è fuori fascia (es. 0, 9999, 1150).
 */
export function trovaCorsoPerOrdinamento(
  ordinamento: number,
  fasce: readonly FasciaCorsoAcqua[] = FASCE_CORSI_ACQUA
): FasciaCorsoAcqua | null {
  if (!Number.isFinite(ordinamento) || ordinamento <= 0 || ordinamento >= 9999) {
    return null;
  }
  for (const fascia of fasce) {
    if (ordinamento >= fascia.da && ordinamento <= fascia.a) {
      return fascia;
    }
  }
  return null;
}

/**
 * Ordina un elenco di stazioni secondo il campo `ordinamento` (e in caso di parità per `idstazione`).
 */
export function ordinaStazioni(
  stazioni: readonly Stazione[],
  direzione: DirezioneOrdinamento = DIREZIONE_ORDINAMENTO_DEFAULT
): Stazione[] {
  const fattore = direzione === 'CRESCENTE' ? 1 : -1;
  return [...stazioni].sort((a, b) => {
    if (a.ordinamento !== b.ordinamento) {
      return (a.ordinamento - b.ordinamento) * fattore;
    }
    return a.idstazione.localeCompare(b.idstazione) * fattore;
  });
}

/**
 * Raggruppa le stazioni nei rispettivi corsi d'acqua secondo le fasce configurate.
 * Le stazioni fuori fascia (es. 0, 9999) non formano gruppo.
 * Vengono restituiti i corsi d'acqua che contengono almeno una stazione,
 * con le stazioni rigorosamente ordinate secondo `direzione` (default: CRESCENTE).
 */
export function raggruppaPerCorsoAcqua(
  stazioni: readonly Stazione[],
  fasce: readonly FasciaCorsoAcqua[] = FASCE_CORSI_ACQUA,
  direzione: DirezioneOrdinamento = DIREZIONE_ORDINAMENTO_DEFAULT
): CorsoAcqua[] {
  const mappaStazioniPerFascia = new Map<string, Stazione[]>();

  for (const stazione of stazioni) {
    const fascia = trovaCorsoPerOrdinamento(stazione.ordinamento, fasce);
    if (!fascia) {
      continue;
    }
    const idGruppo = generaIdCorsoAcqua(fascia.nome);
    const lista = mappaStazioniPerFascia.get(idGruppo);
    if (lista) {
      lista.push(stazione);
    } else {
      mappaStazioniPerFascia.set(idGruppo, [stazione]);
    }
  }

  const gruppi: CorsoAcqua[] = [];
  for (const fascia of fasce) {
    const id = generaIdCorsoAcqua(fascia.nome);
    const stazioniDelCorso = mappaStazioniPerFascia.get(id);
    if (stazioniDelCorso && stazioniDelCorso.length > 0) {
      gruppi.push({
        id,
        nome: fascia.nome,
        da: fascia.da,
        a: fascia.a,
        stazioni: ordinaStazioni(stazioniDelCorso, direzione),
      });
    }
  }

  return gruppi;
}

/**
 * Crea un'istanza del servizio corsi d'acqua iniettabile negli altri moduli.
 */
export function creaServizioCorsiAcqua(
  fascePersonalizzate: readonly FasciaCorsoAcqua[] = FASCE_CORSI_ACQUA,
  direzioneDefault: DirezioneOrdinamento = DIREZIONE_ORDINAMENTO_DEFAULT
): ServizioCorsiAcqua {
  return {
    ottieniFasce: () => fascePersonalizzate,
    generaIdCorsoAcqua,
    trovaCorsoPerOrdinamento: (ordinamento, fasce = fascePersonalizzate) =>
      trovaCorsoPerOrdinamento(ordinamento, fasce),
    ordinaStazioni: (stazioni, direzione = direzioneDefault) =>
      ordinaStazioni(stazioni, direzione),
    raggruppaPerCorsoAcqua: (
      stazioni,
      fasce = fascePersonalizzate,
      direzione = direzioneDefault
    ) => raggruppaPerCorsoAcqua(stazioni, fasce, direzione),
  };
}

