import type {
  CambioLivelloStazione,
  PermessoNotifiche,
  ServizioNotifiche,
  Stazione,
  ValutazioneSoglia,
} from '../contratti';

export interface NotificationOptionsLike {
  body?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface NotificationApiLike {
  readonly permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  creaNotifica(title: string, options?: NotificationOptionsLike): void;
}

export interface ConfigurazioneNotifiche {
  notificationApi?: NotificationApiLike | null;
  attivoInizialmente?: boolean;
  /** Disabilita il suono di notifica (utile nei test) */
  disabilitaSuono?: boolean;
  /** Disabilita la lettura/scrittura dei cookie (utile nei test) */
  disabilitaCookie?: boolean;
}

// --- Cookie helpers ---

function leggiCookie(nome: string): string | null {
  try {
    const prefisso = nome + '=';
    const parti = document.cookie.split(';');
    for (const parte of parti) {
      const p = parte.trim();
      if (p.startsWith(prefisso)) {
        return decodeURIComponent(p.substring(prefisso.length));
      }
    }
  } catch {
    // document.cookie non disponibile (es. jsdom/test)
  }
  return null;
}

function scriviCookie(nome: string, valore: string, giorniScadenza: number = 365): void {
  try {
    const scadenza = new Date();
    scadenza.setTime(scadenza.getTime() + giorniScadenza * 24 * 60 * 60 * 1000);
    document.cookie = `${nome}=${encodeURIComponent(valore)};expires=${scadenza.toUTCString()};path=/;SameSite=Lax`;
  } catch {
    // document.cookie non disponibile
  }
}

// --- Suono notifica tramite AudioContext ---

function riproduciSuonoNotifica(): void {
  try {
    const AudioCtx = globalThis.AudioContext ?? (globalThis as Record<string, unknown>)['webkitAudioContext'] as typeof AudioContext | undefined;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    // Beep doppio: 880Hz per 150ms, pausa 80ms, 880Hz per 150ms
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.23);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);

    oscillator.onended = () => {
      ctx.close().catch(() => {/* noop */});
    };
  } catch {
    // AudioContext non disponibile (es. jsdom)
  }
}

function creaNotificationApiBrowser(): NotificationApiLike | null {
  if (typeof globalThis.Notification === 'undefined') {
    return null;
  }
  return {
    get permission(): NotificationPermission {
      return globalThis.Notification.permission;
    },
    requestPermission(): Promise<NotificationPermission> {
      return globalThis.Notification.requestPermission();
    },
    creaNotifica(title: string, options?: NotificationOptionsLike): void {
      new globalThis.Notification(title, {
        ...options,
        requireInteraction: options?.requireInteraction ?? true,
      });
    },
  };
}

const COOKIE_NOTIFICHE_ATTIVE = 'notifiche_attive';

/**
 * Crea il servizio notifiche basato sulla Notification API del browser.
 * Invia una sola notifica per ogni aumento di livello (es. 0->1, 1->2, 2->3)
 * sulle stazioni monitorate quando le notifiche sono attive.
 *
 * Lo stato attivazione viene persistito in un cookie `notifiche_attive` per sopravvivere
 * alle sessioni; ogni notifica emette un suono tramite AudioContext.
 */
export function creaServizioNotifiche(
  config: ConfigurazioneNotifiche = {}
): ServizioNotifiche {
  const api =
    config.notificationApi !== undefined
      ? config.notificationApi
      : creaNotificationApiBrowser();

  const usaCookie = !config.disabilitaCookie;
  const usaSuono = !config.disabilitaSuono;

  // Priorità stato iniziale:
  // 1. config.attivoInizialmente (se esplicitamente passato)
  // 2. cookie notifiche_attive (persistenza sessione precedente)
  // 3. fallback: se il permesso è già granted
  let notificheAttive: boolean;
  if (config.attivoInizialmente !== undefined) {
    notificheAttive = config.attivoInizialmente;
  } else if (usaCookie) {
    const cookieVal = leggiCookie(COOKIE_NOTIFICHE_ATTIVE);
    if (cookieVal === '1') {
      notificheAttive = api !== null && api.permission === 'granted';
    } else if (cookieVal === '0') {
      notificheAttive = false;
    } else {
      notificheAttive = api !== null && api.permission === 'granted';
    }
  } else {
    notificheAttive = api !== null && api.permission === 'granted';
  }

  function salvaCookieStato(): void {
    if (!usaCookie) return;
    if (notificheAttive) {
      scriviCookie(COOKIE_NOTIFICHE_ATTIVE, '1');
    } else {
      scriviCookie(COOKIE_NOTIFICHE_ATTIVE, '0');
    }
  }

  // Mappa da idstazione all'ultimo livello numerico osservato (0 | 1 | 2 | 3)
  const ultimoLivelloPerStazione = new Map<string, 0 | 1 | 2 | 3>();
  // Traccia le stazioni per cui è già stata inviata la notifica di superamento quota avviso in metri
  const avvisoMetriGiaNotificato = new Map<string, number>();

  function ottieniPermesso(): PermessoNotifiche {
    if (!api) {
      return 'unsupported';
    }
    return api.permission;
  }

  function isAttivo(): boolean {
    return notificheAttive && ottieniPermesso() === 'granted';
  }

  async function attivaNotifiche(): Promise<PermessoNotifiche> {
    if (!api) {
      notificheAttive = false;
      salvaCookieStato();
      return 'unsupported';
    }
    if (api.permission === 'granted') {
      notificheAttive = true;
      salvaCookieStato();
      return 'granted';
    }
    const esito = await api.requestPermission();
    notificheAttive = esito === 'granted';
    salvaCookieStato();
    return esito;
  }

  function disattivaNotifiche(): void {
    notificheAttive = false;
    salvaCookieStato();
  }

  function controllaEInviaNotifiche(
    stazioniMonitorate: readonly Stazione[],
    calcolaValutazione: (stazione: Stazione) => ValutazioneSoglia,
    ottieniAvvisoLivelloMetri?: (idstazione: string) => number | null
  ): CambioLivelloStazione[] {
    const cambiInAumento: CambioLivelloStazione[] = [];

    for (const stazione of stazioniMonitorate) {
      // 1. Controllo avviso livello acqua personalizzato in metri (senza toccare le soglie ARPAE)
      if (ottieniAvvisoLivelloMetri && stazione.value !== null) {
        const quotaAvviso = ottieniAvvisoLivelloMetri(stazione.idstazione);
        if (quotaAvviso !== null && Number.isFinite(quotaAvviso)) {
          if (stazione.value >= quotaAvviso) {
            const quotaNotificata = avvisoMetriGiaNotificato.get(stazione.idstazione);
            if (quotaNotificata !== quotaAvviso) {
              avvisoMetriGiaNotificato.set(stazione.idstazione, quotaAvviso);
              if (isAttivo() && api) {
                api.creaNotifica(`Avviso Livello Acqua: ${stazione.nomestaz}`, {
                  body: `Raggiunto livello di ${stazione.value.toFixed(2)} m (avviso impostato a ${quotaAvviso.toFixed(2)} m)`,
                  tag: `avviso-metri-${stazione.idstazione}-${quotaAvviso}`,
                  requireInteraction: true,
                });
                if (usaSuono) riproduciSuonoNotifica();
              }
            }
          } else {
            // Sotto quota: riabilita la notifica per un eventuale futuro superamento
            avvisoMetriGiaNotificato.delete(stazione.idstazione);
          }
        }
      }

      // 2. Controllo cambio livello di allerta (0 -> 1 -> 2 -> 3)
      const valutazione = calcolaValutazione(stazione);
      if (valutazione.livello === 'nd') {
        continue;
      }

      const livelloAttuale = valutazione.livello;
      const livelloPrecedente = ultimoLivelloPerStazione.get(stazione.idstazione);

      // Aggiorna sempre il livello osservato per garantire una sola notifica per cambio di livello
      ultimoLivelloPerStazione.set(stazione.idstazione, livelloAttuale);

      if (livelloPrecedente === undefined) {
        // Prima osservazione della stazione: registra la baseline senza inviare notifica
        continue;
      }

      if (livelloAttuale > livelloPrecedente) {
        const cambio: CambioLivelloStazione = {
          idstazione: stazione.idstazione,
          nomestaz: stazione.nomestaz,
          livelloPrecedente,
          livelloAttuale,
          valore: stazione.value,
          etichettaAttuale: valutazione.etichetta,
        };
        cambiInAumento.push(cambio);

        if (isAttivo() && api) {
          const valoreTesto =
            stazione.value !== null ? `${stazione.value.toFixed(2)} m` : 'n.d.';
          api.creaNotifica(`Allerta Idrometrica: ${stazione.nomestaz}`, {
            body: `Livello salito da ${livelloPrecedente} a ${livelloAttuale} (${valutazione.etichettaBreve}) — Valore: ${valoreTesto}`,
            tag: `allerta-${stazione.idstazione}-liv-${livelloAttuale}`,
            requireInteraction: true,
          });
          if (usaSuono) riproduciSuonoNotifica();
        }
      }
    }

    return cambiInAumento;
  }

  function resettaStatoLivelli(): void {
    ultimoLivelloPerStazione.clear();
    avvisoMetriGiaNotificato.clear();
  }

  return {
    ottieniPermesso,
    isAttivo,
    attivaNotifiche,
    disattivaNotifiche,
    controllaEInviaNotifiche,
    resettaStatoLivelli,
  };
}

