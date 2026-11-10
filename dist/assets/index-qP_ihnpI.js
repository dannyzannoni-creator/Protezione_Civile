(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const g of a.addedNodes)g.tagName==="LINK"&&g.rel==="modulepreload"&&r(g)}).observe(document,{childList:!0,subtree:!0});function o(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(s){if(s.ep)return;s.ep=!0;const a=o(s);fetch(s.href,a)}})();const Tt="https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-sensor-values-no-time",Gt="/api/sensori",It="254,0,0/1,-,-,-/B13215",Z=15*60*1e3,W=36e5,Rt=3;function ft(i=Date.now()){return Math.floor(i/W)*W}function vt(i=Date.now()){return Math.floor(i/Z)*Z}function zt(i,t,o=It){const r=i.includes("?")?"&":"?",s=encodeURIComponent(o),a=encodeURIComponent(String(t));return`${i}${r}variabile=${s}&time=${a}`}function bt(i){const t=new Date(i),o=t.getFullYear(),r=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0");return`${o}-${r}-${s}`}function lt(i,t=Date.now()){const o=encodeURIComponent(i.trim()),r=bt(t),s=bt(t-2*24*60*60*1e3);return`https://allertameteo.regione.emilia-romagna.it/web/guest/grafico-sensori?p_p_id=AllertaGraficoPortlet&p_p_lifecycle=0&_AllertaGraficoPortlet_mvcRenderCommandName=%2Fallerta%2Fanimazione%2Fgrafico&r=${o}/254,0,0/1,-,-,-/B13215/${s}/${r}&stazione=${o}&variabile=254,0,0/1,-,-,-/B13215`}function ht(i){return typeof i=="object"&&i!==null&&!Array.isArray(i)}function X(i,t=0){if(typeof i=="number"&&Number.isFinite(i))return i;if(typeof i=="string"&&i.trim()!==""){const o=Number(i);if(Number.isFinite(o))return o}return t}function Ft(i){if(i==null)return null;if(typeof i=="number"&&Number.isFinite(i))return i;if(typeof i=="string"&&i.trim()!==""){const t=Number(i);if(Number.isFinite(t))return t}return null}function Ut(i,t,o=1){if(!Array.isArray(i)||i.length===0)throw new Error("Risposta API non valida: atteso un array JSON non vuoto.");const r=i[0];if(!ht(r)||!("time"in r))throw new Error('Risposta API non valida: primo elemento privo del campo "time".');const s=X(r.time,t),a=[];for(let g=1;g<i.length;g++){const v=i[g];if(!ht(v)||typeof v.idstazione!="string"&&typeof v.idstazione!="number")continue;const h=String(v.idstazione).trim();if(!h)continue;const p={idstazione:h,ordinamento:X(v.ordinamento,0),nomestaz:typeof v.nomestaz=="string"?v.nomestaz.trim():h,lon:v.lon!==void 0&&v.lon!==null?String(v.lon):"",lat:v.lat!==void 0&&v.lat!==null?String(v.lat):"",soglia1:X(v.soglia1,0),soglia2:X(v.soglia2,0),soglia3:X(v.soglia3,0),value:Ft(v.value),precedente:typeof v.precedente=="string"?v.precedente:v.precedente!==void 0&&v.precedente!==null?String(v.precedente):null};a.push(p)}return{time:s,timeRichiesto:t,tentativi:o,stazioni:a}}function Y(i){return i.length===0?!0:i.every(t=>t.value===null)}function qt(i={}){const t=i.baseUrl??Tt,o=i.fallbackBaseUrl!==void 0?i.fallbackBaseUrl:Gt,r=i.variabile??It,s=i.fetchFn??((f,e)=>globalThis.fetch(f,e)),a=i.nowFn??(()=>Date.now()),g=new Map,v=new Map;async function h(f,e,z=!1){var T,b;if(!z){const C=g.get(f);if(C&&!Y(C.stazioni))return{...C,tentativi:e}}const $=zt(t,f,r),m={Accept:"application/json","Cache-Control":"no-cache",Pragma:"no-cache"};let l;try{l=await s($,{headers:m,cache:"no-cache"});const C=((b=(T=l.headers)==null?void 0:T.get)==null?void 0:b.call(T,"content-type"))??"";if(!l.ok||C&&!C.includes("json")&&!C.includes("text/plain"))throw new Error(`Risposta non valida da endpoint primario (${l.status})`)}catch(C){if(o&&o!==t){const L=zt(o,f,r);l=await s(L,{headers:m,cache:"no-cache"})}else throw C}if(!l.ok)throw new Error(`Errore HTTP ${l.status} durante il caricamento dei sensori.`);const P=await l.json(),w=Ut(P,f,e);return Y(w.stazioni)||(g.set(f,w),v.set(w.time,w)),w}async function p(f={}){const e=f.timeMs!==void 0?vt(f.timeMs):ft(a()),z=f.maxTentativiNull??Rt,$=f.bypassaCache??!1;let m=null;for(let l=0;l<=z;l++){const P=e-l*W,w=await h(P,l+1,$);if(m=w,!Y(w.stazioni))return w}if(!m)throw new Error("Impossibile ottenere i dati delle stazioni.");return m}async function n(f,e){const z=v.get(f);if(z&&!Y(z.stazioni))return z;try{const $=e?f+W:f;return await h($,1,!1)}catch{return null}}async function A(f,e){const z=f===void 0,$=e!==void 0?e:z;let m;if(!z)m=await p({timeMs:f,bypassaCache:$});else{const C=vt(a())+W;let L=null,q=null;for(let N=0;N<4;N++){const d=C-N*Z;try{const y=await h(d,N+1,N===0?$:!1);if(!Y(y.stazioni)&&(q||(q=y),y.stazioni.some(F=>F.value!==null&&F.precedente==="N"))){L=y;break}}catch{}}L?m=L:q?m=q:m=await p({timeMs:C,bypassaCache:$})}const l=m.time-Z,P=m.time-W,w=await n(l,z),T=await n(P,z);if(z&&(w||T)){const C=new Map;for(const N of(w==null?void 0:w.stazioni)??[])C.set(N.idstazione,N);const L=new Map;for(const N of(T==null?void 0:T.stazioni)??[])L.set(N.idstazione,N);const q=m.stazioni.map(N=>{if(N.value!==null)return N;const d=C.get(N.idstazione);if(d&&d.value!==null)return{...N,value:d.value,precedente:"S"};const y=L.get(N.idstazione);return y&&y.value!==null?{...N,value:y.value,precedente:"S"}:N});m={...m,stazioni:q}}return{corrente:m,precedente:w??T,precedente15Min:w,precedenteUnOra:T}}function G(){g.clear(),v.clear()}return{calcolaTimeRiferimento:ft,scaricaStazioni:p,scaricaConStorico:A,svuotaCache:G}}const Dt=[{nome:"Po",da:1,a:99},{nome:"Tidone",da:100,a:199},{nome:"Trebbia",da:200,a:299},{nome:"Nure",da:300,a:309},{nome:"Chero",da:310,a:329},{nome:"Arda",da:330,a:399},{nome:"Taro",da:400,a:499},{nome:"Parma",da:500,a:599},{nome:"Enza",da:600,a:699},{nome:"Crostolo",da:700,a:799},{nome:"Secchia",da:800,a:899},{nome:"Panaro",da:900,a:919},{nome:"Naviglio-Tiepido",da:920,a:999},{nome:"Reno",da:1e3,a:1019},{nome:"Samoggia",da:1020,a:1025},{nome:"Lavino",da:1026,a:1029},{nome:"Cavo Napoleonico-Burana",da:1030,a:1035},{nome:"Ravone",da:1036,a:1039},{nome:"Navile-Savena abbandonato",da:1040,a:1049},{nome:"Savena",da:1050,a:1052},{nome:"Idice",da:1053,a:1069},{nome:"Sillaro",da:1070,a:1079},{nome:"Santerno",da:1080,a:1089},{nome:"Senio",da:1090,a:1099},{nome:"Lamone",da:1100,a:1117},{nome:"Montone-Ronco-Bidente",da:1200,a:1299},{nome:"Bevano",da:1300,a:1399},{nome:"Savio",da:1400,a:1499},{nome:"Rubicone",da:1500,a:1599},{nome:"Uso",da:1600,a:1699},{nome:"Marecchia",da:1700,a:1799},{nome:"Conca",da:1800,a:1899}],pt="CRESCENTE",dt=Dt;function ct(i){return`river:${i.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}`}function Mt(i,t=dt){if(!Number.isFinite(i)||i<=0||i>=9999)return null;for(const o of t)if(i>=o.da&&i<=o.a)return o;return null}function Pt(i,t=pt){const o=t==="CRESCENTE"?1:-1;return[...i].sort((r,s)=>r.ordinamento!==s.ordinamento?(r.ordinamento-s.ordinamento)*o:r.idstazione.localeCompare(s.idstazione)*o)}function xt(i,t=dt,o=pt){const r=new Map;for(const a of i){const g=Mt(a.ordinamento,t);if(!g)continue;const v=ct(g.nome),h=r.get(v);h?h.push(a):r.set(v,[a])}const s=[];for(const a of t){const g=ct(a.nome),v=r.get(g);v&&v.length>0&&s.push({id:g,nome:a.nome,da:a.da,a:a.a,stazioni:Pt(v,o)})}return s}function Ot(i=dt,t=pt){return{ottieniFasce:()=>i,generaIdCorsoAcqua:ct,trovaCorsoPerOrdinamento:(o,r=i)=>Mt(o,r),ordinaStazioni:(o,r=t)=>Pt(o,r),raggruppaPerCorsoAcqua:(o,r=i,s=t)=>xt(o,r,s)}}function j(i){return i==null||!Number.isFinite(i)||i===0?null:i}function mt(i,t){if(!t)return{soglia1:j(i.soglia1),soglia2:j(i.soglia2),soglia3:j(i.soglia3),personalizzata:!1};const o=t.soglia1!==void 0?t.soglia1:i.soglia1,r=t.soglia2!==void 0?t.soglia2:i.soglia2,s=t.soglia3!==void 0?t.soglia3:i.soglia3;return{soglia1:j(o),soglia2:j(r),soglia3:j(s),personalizzata:!0}}function Nt(i,t,o){if(i===null||!Number.isFinite(i))return"nd";const{soglia1:r,soglia2:s,soglia3:a}=mt(t,o);let g=0;return r!==null&&i>=r&&(g=1),s!==null&&i>=s&&(g=2),a!==null&&i>=a&&(g=3),g}function _t(i){switch(i){case 0:return{colore:"verde",etichetta:"Normale (Livello 0 - Verde)",etichettaBreve:"Liv. 0 · Verde"};case 1:return{colore:"giallo",etichetta:"Allerta Gialla (Livello 1 - Giallo)",etichettaBreve:"Liv. 1 · Giallo"};case 2:return{colore:"arancione",etichetta:"Allerta Arancione (Livello 2 - Arancione)",etichettaBreve:"Liv. 2 · Arancione"};case 3:return{colore:"rosso",etichetta:"Allerta Rossa (Livello 3 - Rosso)",etichettaBreve:"Liv. 3 · Rosso"};case"nd":return{colore:"grigio",etichetta:"Non disponibile (n.d. - Grigio)",etichettaBreve:"n.d. · Grigio"}}}function kt(i,t){const o=mt(i,t),r=Nt(i.value,i,t),{colore:s,etichetta:a,etichettaBreve:g}=_t(r);return{livello:r,colore:s,etichetta:a,etichettaBreve:g,soglia1Effettiva:o.soglia1,soglia2Effettiva:o.soglia2,soglia3Effettiva:o.soglia3,personalizzata:o.personalizzata}}function Vt(i){const t=j(i);return t===null?"—":`${t.toFixed(2)} m`}function Ht(){return{sogliaDefinita:j,risolviSoglieEffettive:mt,calcolaLivelloSoglia:Nt,valutaStazione:kt,formattaSoglia:Vt}}const St=36e5,$t=.05,ut={trendCmOra:null,direzione:"nd",previsione1h:null,previsione2h:null,testoTrend:"—",testoPrevisione1h:"—",testoPrevisione2h:"—"};function J(i,t,o=1){if(i===null||t===null||!Number.isFinite(i)||!Number.isFinite(t)||!Number.isFinite(o)||o<=0)return{...ut};const r=(i-t)*100/o,s=Math.abs(r)<1e-9?0:Number(r.toFixed(2)),a=r/100,g=Number((i+a*1).toFixed(4)),v=Number((i+a*2).toFixed(4));let h="stabile";s>=$t?h="in_aumento":s<=-$t&&(h="in_calo");const n=`${s>0?"+":""}${s.toFixed(1)} cm/h`,A=`${g.toFixed(2)} m (stima)`,G=`${v.toFixed(2)} m (stima)`;return{trendCmOra:s,direzione:h,previsione1h:g,previsione2h:v,testoTrend:n,testoPrevisione1h:A,testoPrevisione2h:G}}function Bt(i,t,o=null){const r={};if(!t&&!o){for(const n of i.stazioni)r[n.idstazione]={...ut};return r}const s=new Map;if(t)for(const n of t.stazioni)s.set(n.idstazione,n);const a=new Map;if(o)for(const n of o.stazioni)a.set(n.idstazione,n);const g=t?i.time-t.time:0,v=g>0?g/St:1,h=o?i.time-o.time:0,p=h>0?h/St:1;for(const n of i.stazioni){const A=s.get(n.idstazione),G=a.get(n.idstazione);t&&o?A&&A.value!==null&&n.precedente!=="S"?r[n.idstazione]=J(n.value,A.value,v):G&&G.value!==null?r[n.idstazione]=J(n.value,G.value,p):A&&A.value!==null?r[n.idstazione]=J(n.value,A.value,v):r[n.idstazione]={...ut}:t?r[n.idstazione]=J(n.value,(A==null?void 0:A.value)??null,v):r[n.idstazione]=J(n.value,(G==null?void 0:G.value)??null,p)}return r}function jt(){return{calcolaTrendStazione:J,calcolaMappaTrend:Bt}}const Jt="monitoraggio_idraulico_er_stato_v1";function Wt(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}function et(){return{stazioniSingole:[],gruppiMonitorati:[],gruppiPersonalizzati:[],sogliePersonalizzate:{},avvisiLivello:{},visteGruppi:{}}}function At(i){return{stazioniSingole:[...i.stazioniSingole],gruppiMonitorati:[...i.gruppiMonitorati],gruppiPersonalizzati:i.gruppiPersonalizzati.map(t=>({id:t.id,nome:t.nome,stazioni:[...t.stazioni]})),sogliePersonalizzate:Object.fromEntries(Object.entries(i.sogliePersonalizzate).map(([t,o])=>[t,{...o}])),avvisiLivello:{...i.avvisiLivello??{}},visteGruppi:{...i.visteGruppi}}}function Kt(i){if(!i)return et();try{const t=JSON.parse(i);if(typeof t!="object"||t===null||Array.isArray(t))return et();const o=t,r=Array.isArray(o.stazioniSingole)?Array.from(new Set(o.stazioniSingole.filter(p=>typeof p=="string"))):[],s=Array.isArray(o.gruppiMonitorati)?Array.from(new Set(o.gruppiMonitorati.filter(p=>typeof p=="string"))):[],a=[];if(Array.isArray(o.gruppiPersonalizzati)){for(const p of o.gruppiPersonalizzati)if(typeof p=="object"&&p!==null&&!Array.isArray(p)){const n=p;typeof n.id=="string"&&typeof n.nome=="string"&&Array.isArray(n.stazioni)&&a.push({id:n.id,nome:n.nome,stazioni:Array.from(new Set(n.stazioni.filter(A=>typeof A=="string")))})}}const g={};if(typeof o.sogliePersonalizzate=="object"&&o.sogliePersonalizzate!==null){for(const[p,n]of Object.entries(o.sogliePersonalizzate))if(typeof n=="object"&&n!==null&&!Array.isArray(n)){const A=n;g[p]={idstazione:p,soglia1:typeof A.soglia1=="number"?A.soglia1:null,soglia2:typeof A.soglia2=="number"?A.soglia2:null,soglia3:typeof A.soglia3=="number"?A.soglia3:null}}}const v={};if(typeof o.visteGruppi=="object"&&o.visteGruppi!==null)for(const[p,n]of Object.entries(o.visteGruppi))(n==="estesa"||n==="compatta")&&(v[p]=n);const h={};if(typeof o.avvisiLivello=="object"&&o.avvisiLivello!==null)for(const[p,n]of Object.entries(o.avvisiLivello))typeof n=="number"&&Number.isFinite(n)&&(h[p]=n);return{stazioniSingole:r,gruppiMonitorati:s,gruppiPersonalizzati:a,sogliePersonalizzate:g,avvisiLivello:h,visteGruppi:v}}catch{return et()}}function Qt(){const i=new Map;return{getItem(t){try{if(typeof globalThis.localStorage<"u")return globalThis.localStorage.getItem(t)}catch{}return i.get(t)??null},setItem(t,o){i.set(t,o);try{typeof globalThis.localStorage<"u"&&globalThis.localStorage.setItem(t,o)}catch{}},removeItem(t){i.delete(t);try{typeof globalThis.localStorage<"u"&&globalThis.localStorage.removeItem(t)}catch{}}}}function Xt(i={}){const t=i.storage??Qt(),o=i.chiaveStorage??Jt,r=i.generaUuid??Wt;let s={...i.gruppiCorsiAcquaIniziali??{}},a=Kt(t.getItem(o));const g=new Set;function v(){try{t.setItem(o,JSON.stringify(a))}catch{}const c=At(a);for(const S of g)S(c)}function h(c){const S={...s,...c??{}};for(const I of a.gruppiPersonalizzati)S[I.id]=I.stazioni;return S}function p(c){s={...c}}function n(){return At(a)}function A(c){return g.add(c),()=>{g.delete(c)}}function G(c){const S=c.trim();!S||a.stazioniSingole.includes(S)||(a.stazioniSingole.push(S),v())}function f(c){const S=a.stazioniSingole.indexOf(c);S!==-1&&(a.stazioniSingole.splice(S,1),v())}function e(c,S){S?G(c):f(c)}function z(c){return a.stazioniSingole.includes(c)}function $(c){const S=c.trim();!S||a.gruppiMonitorati.includes(S)||(a.gruppiMonitorati.push(S),v())}function m(c){const S=a.gruppiMonitorati.indexOf(c);S!==-1&&(a.gruppiMonitorati.splice(S,1),v())}function l(c,S){S?$(c):m(c)}function P(c){return a.gruppiMonitorati.includes(c)}function w(c,S){const I=h(c),D=new Set;for(const O of a.gruppiMonitorati){if(S&&O===S)continue;const H=I[O];if(H)for(const _ of H)D.add(_)}return D}function T(c){const S=w(c);for(const I of a.stazioniSingole)S.add(I);return S}function b(c,S){return a.stazioniSingole.includes(c)?!0:w(S).has(c)}function C(c){const S=w(c);return a.stazioniSingole.filter(I=>!S.has(I))}function L(){return a.gruppiPersonalizzati.map(c=>({id:c.id,nome:c.nome,stazioni:[...c.stazioni]}))}function q(c,S){const I=c.trim();if(!I)throw new Error("Il nome del gruppo è obbligatorio.");if(a.gruppiPersonalizzati.some(O=>O.id!==S&&O.nome.toLowerCase()===I.toLowerCase()))throw new Error(`Esiste già un gruppo personalizzato chiamato "${I}".`);return I}function N(c,S=[]){const I=q(c),D=`custom:${r()}`,O=Array.from(new Set(S.map(_=>_.trim()).filter(Boolean))),H={id:D,nome:I,stazioni:O};return a.gruppiPersonalizzati.push(H),a.gruppiMonitorati.includes(D)||a.gruppiMonitorati.push(D),v(),{...H,stazioni:[...H.stazioni]}}function d(c,S){const I=a.gruppiPersonalizzati.find(O=>O.id===c);if(!I)throw new Error(`Gruppo personalizzato non trovato: ${c}`);const D=q(S,c);return I.nome=D,v(),{...I,stazioni:[...I.stazioni]}}function y(c,S){const I=a.gruppiPersonalizzati.find(D=>D.id===c);if(!I)throw new Error(`Gruppo personalizzato non trovato: ${c}`);return I.stazioni=Array.from(new Set(S.map(D=>D.trim()).filter(Boolean))),v(),{...I,stazioni:[...I.stazioni]}}function u(c,S){const I=a.gruppiPersonalizzati.find(_=>_.id===c);if(!I)throw new Error(`Gruppo personalizzato non trovato: ${c}`);const D=w(S,c),O=[],H=[];for(const _ of I.stazioni)D.has(_)?H.push(_):O.push(_);return{totaleStazioniNelGruppo:I.stazioni.length,stazioniCheSmetteranno:O,stazioniSalvateDaAltriGruppi:H}}function F(c,S){const I=a.gruppiPersonalizzati.findIndex(_=>_.id===c);if(I===-1)throw new Error(`Gruppo personalizzato non trovato: ${c}`);const D=u(c,S),[O]=a.gruppiPersonalizzati.splice(I,1);a.gruppiMonitorati=a.gruppiMonitorati.filter(_=>_!==c);const H=new Set(O.stazioni);return a.stazioniSingole=a.stazioniSingole.filter(_=>!H.has(_)),delete a.visteGruppi[c],v(),{gruppoEliminato:{...O,stazioni:[...O.stazioni]},stazioniSmesseDiMonitorare:D.stazioniCheSmetteranno,stazioniRimasteInAltriGruppi:D.stazioniSalvateDaAltriGruppi}}function E(c){return a.visteGruppi[c]??"estesa"}function V(c,S){a.visteGruppi[c]=S,v()}function U(c){const I=E(c)==="estesa"?"compatta":"estesa";return V(c,I),I}function k(c){const S=a.sogliePersonalizzate[c];return S?{...S}:null}function B(){return Object.fromEntries(Object.entries(a.sogliePersonalizzate).map(([c,S])=>[c,{...S}]))}function K(c){a.sogliePersonalizzate[c.idstazione]={idstazione:c.idstazione,soglia1:c.soglia1,soglia2:c.soglia2,soglia3:c.soglia3},v()}function tt(c){c in a.sogliePersonalizzate&&(delete a.sogliePersonalizzate[c],v())}function it(c){const I=(a.avvisiLivello??{})[c];return typeof I=="number"&&Number.isFinite(I)?I:null}function Q(){return{...a.avvisiLivello??{}}}function ot(c,S){Number.isFinite(S)&&(a.avvisiLivello||(a.avvisiLivello={}),a.avvisiLivello[c]=Number(S.toFixed(2)),v())}function at(c){!a.avvisiLivello||!(c in a.avvisiLivello)||(delete a.avvisiLivello[c],v())}return{impostaMappaGruppiEsterni:p,ottieniSnapshot:n,iscrivi:A,aggiungiStazioneSingola:G,rimuoviStazioneSingola:f,impostaStazioneSingola:e,isStazioneAggiuntaSingolarmente:z,monitoraGruppo:$,smettiMonitoraggioGruppo:m,impostaMonitoraggioGruppo:l,isGruppoMonitorato:P,isStazioneMonitorata:b,ottieniStazioniMonitorate:T,ottieniStazioniSoloSingole:C,ottieniGruppiPersonalizzati:L,creaGruppoPersonalizzato:N,rinominaGruppoPersonalizzato:d,aggiornaStazioniGruppoPersonalizzato:y,calcolaImpattoEliminazioneGruppo:u,eliminaGruppoPersonalizzato:F,ottieniVistaGruppo:E,impostaVistaGruppo:V,alternaVistaGruppo:U,ottieniSogliaPersonalizzata:k,ottieniTutteSogliePersonalizzate:B,impostaSogliaPersonalizzata:K,ripristinaSogliaUfficiale:tt,ottieniAvvisoLivello:it,ottieniTuttiAvvisiLivello:Q,impostaAvvisoLivello:ot,rimuoviAvvisoLivello:at}}function Yt(i){try{const t=i+"=",o=document.cookie.split(";");for(const r of o){const s=r.trim();if(s.startsWith(t))return decodeURIComponent(s.substring(t.length))}}catch{}return null}function yt(i,t,o=365){try{const r=new Date;r.setTime(r.getTime()+o*24*60*60*1e3),document.cookie=`${i}=${encodeURIComponent(t)};expires=${r.toUTCString()};path=/;SameSite=Lax`}catch{}}function Et(){try{const i=globalThis.AudioContext??globalThis.webkitAudioContext;if(!i)return;const t=new i,o=t.createOscillator(),r=t.createGain();o.connect(r),r.connect(t.destination),o.type="sine",o.frequency.setValueAtTime(880,t.currentTime),r.gain.setValueAtTime(.3,t.currentTime),r.gain.exponentialRampToValueAtTime(.01,t.currentTime+.15),r.gain.setValueAtTime(.3,t.currentTime+.23),r.gain.exponentialRampToValueAtTime(.01,t.currentTime+.38),o.start(t.currentTime),o.stop(t.currentTime+.4),o.onended=()=>{t.close().catch(()=>{})}}catch{}}function Zt(){return typeof globalThis.Notification>"u"?null:{get permission(){return globalThis.Notification.permission},requestPermission(){return globalThis.Notification.requestPermission()},creaNotifica(i,t){new globalThis.Notification(i,{...t,requireInteraction:(t==null?void 0:t.requireInteraction)??!0})}}}const nt="notifiche_attive";function ti(i={}){const t=i.notificationApi!==void 0?i.notificationApi:Zt(),o=!i.disabilitaCookie,r=!i.disabilitaSuono;let s;if(i.attivoInizialmente!==void 0)s=i.attivoInizialmente;else if(o){const e=Yt(nt);e==="1"?s=t!==null&&t.permission==="granted":e==="0"?s=!1:s=t!==null&&t.permission==="granted"}else s=t!==null&&t.permission==="granted";function a(){o&&(s?yt(nt,"1"):yt(nt,"0"))}const g=new Map,v=new Map;function h(){return t?t.permission:"unsupported"}function p(){return s&&h()==="granted"}async function n(){if(!t)return s=!1,a(),"unsupported";if(t.permission==="granted")return s=!0,a(),"granted";const e=await t.requestPermission();return s=e==="granted",a(),e}function A(){s=!1,a()}function G(e,z,$){const m=[];for(const l of e){if($&&l.value!==null){const b=$(l.idstazione);b!==null&&Number.isFinite(b)&&(l.value>=b?v.get(l.idstazione)!==b&&(v.set(l.idstazione,b),p()&&t&&(t.creaNotifica(`Avviso Livello Acqua: ${l.nomestaz}`,{body:`Raggiunto livello di ${l.value.toFixed(2)} m (avviso impostato a ${b.toFixed(2)} m)`,tag:`avviso-metri-${l.idstazione}-${b}`,requireInteraction:!0}),r&&Et())):v.delete(l.idstazione))}const P=z(l);if(P.livello==="nd")continue;const w=P.livello,T=g.get(l.idstazione);if(g.set(l.idstazione,w),T!==void 0&&w>T){const b={idstazione:l.idstazione,nomestaz:l.nomestaz,livelloPrecedente:T,livelloAttuale:w,valore:l.value,etichettaAttuale:P.etichetta};if(m.push(b),p()&&t){const C=l.value!==null?`${l.value.toFixed(2)} m`:"n.d.";t.creaNotifica(`Allerta Idrometrica: ${l.nomestaz}`,{body:`Livello salito da ${T} a ${w} (${P.etichettaBreve}) — Valore: ${C}`,tag:`allerta-${l.idstazione}-liv-${w}`,requireInteraction:!0}),r&&Et()}}}return m}function f(){g.clear(),v.clear()}return{ottieniPermesso:h,isAttivo:p,attivaNotifiche:n,disattivaNotifiche:A,controllaEInviaNotifiche:G,resettaStatoLivelli:f}}function R(i){return i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ii(i){if(i===null||!Number.isFinite(i))return"--:--";const t=new Date(i),o=String(t.getHours()).padStart(2,"0"),r=String(t.getMinutes()).padStart(2,"0");return`${o}:${r}`}function oi(i){return i===null||!Number.isFinite(i)?"n.d.":`${i.toFixed(2)} m`}function Ct(i,t){switch(t){case"blu":return!0;case"verde":return i===0;case"giallo":return i===1;case"arancione":return i===2;case"rosso":return i===3}}function ai(i,t){let o="blu",r=null;function s(p){const n=t.statoUtente.ottieniSogliaPersonalizzata(p.idstazione);return t.soglie.valutaStazione(p,n)}function a(p,n,A,G){var b,C;const f=lt(p.idstazione);if(G==="compatta")return`
        <article
          class="stazione-card stazione-card-compatta"
          data-stazione-id="${R(p.idstazione)}"
          data-vista="compatta"
          data-livello="${String(n.livello)}"
        >
          <span class="stazione-compatta-nome">${R(p.nomestaz)}</span>
          <div style="display:inline-flex;align-items:center;gap:8px;">
            <a
              href="${R(f)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondario btn-sm"
              data-azione="apri-grafico"
              data-idstazione="${R(p.idstazione)}"
            >
              📈 Grafico
            </a>
            <span
              class="stazione-compatta-stato stato-${n.colore}"
              aria-label="${R(n.etichetta)}"
              title="${R(n.etichetta)}"
            >
              <span class="pallino-stato pallino-${n.colore}" aria-hidden="true"></span>
              <span class="sr-only">${R(n.etichettaBreve)}</span>
            </span>
          </div>
        </article>
      `;const e=A.direzione==="in_aumento"?"↗":A.direzione==="in_calo"?"↘":A.direzione==="stabile"?"→":"·",z=t.soglie.formattaSoglia(n.soglia1Effettiva),$=t.soglie.formattaSoglia(n.soglia2Effettiva),m=t.soglie.formattaSoglia(n.soglia3Effettiva),l=((C=(b=t.statoUtente).ottieniAvvisoLivello)==null?void 0:C.call(b,p.idstazione))??null,P=l!==null&&p.value!==null&&p.value>=l,T=r===p.idstazione?`<form class="form-soglie-personalizzate" data-azione="salva-avviso-metri-mon" data-idstazione="${R(p.idstazione)}">
          <p class="sezione-sottotitolo" style="margin-bottom:6px;">
            Ricevi una notifica quando il livello dell'acqua raggiunge questa quota in metri (le soglie ARPAE restano invariate):
          </p>
          <div class="form-crea-gruppo">
            <input
              type="text"
              inputmode="decimal"
              name="quotaAvviso"
              value="${l!==null?R(String(l)):""}"
              placeholder="Livello in metri (es. 1.50)"
            />
            <button type="submit" class="btn btn-primario btn-sm">Salva</button>
            ${l!==null?`<button type="button" class="btn btn-pericolo btn-sm" data-azione="rimuovi-avviso-metri-mon" data-idstazione="${R(p.idstazione)}">Rimuovi</button>`:""}
            <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-avviso-metri-mon">Annulla</button>
          </div>
        </form>`:"";return`
      <article
        class="stazione-card stazione-card-estesa bordostato-${n.colore}"
        data-stazione-id="${R(p.idstazione)}"
        data-vista="estesa"
        data-livello="${String(n.livello)}"
      >
        <div class="stazione-estesa-header">
          <div class="stazione-estesa-titolo-wrap">
            <h4 class="stazione-estesa-nome">${R(p.nomestaz)}</h4>
            <div class="stazione-icone-secondarie">
              <span class="icona-secondaria" title="Ordinamento idraulico">🧭 #${p.ordinamento}</span>
              <span class="icona-secondaria" title="Direzione trend">${e}</span>
              ${n.personalizzata?'<span class="icona-secondaria badge-soglia-custom" title="Soglie personalizzate attive">⚙ Soglie pers.</span>':""}
              ${l!==null?`<span class="icona-secondaria ${P?"stato-rosso badge-stato":""}" data-avviso-card="${R(p.idstazione)}">🔔 Avviso: ${l.toFixed(2)} m${P?" (RAGGIUNTO!)":""}</span>`:""}
            </div>
          </div>
          <div class="stazione-estesa-stato-wrap">
            <span class="valore-principale" data-valore>${oi(p.value)}</span>
            <span
              class="badge-stato stato-${n.colore}"
              aria-label="${R(n.etichetta)}"
            >
              <span class="pallino-stato pallino-${n.colore}" aria-hidden="true"></span>
              <span>${R(n.etichettaBreve)}</span>
            </span>
          </div>
        </div>

        <div class="stazione-estesa-metriche">
          <div class="metrica-box">
            <span class="metrica-label">Trend orario</span>
            <strong class="metrica-valore" data-trend>${R(A.testoTrend)}</strong>
          </div>
          <div class="metrica-box">
            <span class="metrica-label">Prev. +1h</span>
            <strong class="metrica-valore" data-prev1h>${R(A.testoPrevisione1h)}</strong>
          </div>
          <div class="metrica-box">
            <span class="metrica-label">Prev. +2h</span>
            <strong class="metrica-valore" data-prev2h>${R(A.testoPrevisione2h)}</strong>
          </div>
        </div>

        <div class="stazione-estesa-soglie" data-soglie>
          <span>S1 (Gialla): <strong>${R(z)}</strong></span>
          <span>S2 (Arancione): <strong>${R($)}</strong></span>
          <span>S3 (Rossa): <strong>${R(m)}</strong></span>
          <a
            href="${R(f)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondario btn-sm"
            data-azione="apri-grafico"
            data-idstazione="${R(p.idstazione)}"
          >
            📈 Grafico
          </a>
          <button
            type="button"
            class="btn-link"
            data-azione="apri-avviso-metri-mon"
            data-idstazione="${R(p.idstazione)}"
          >
            ${l!==null?`🔔 Modifica avviso (${l.toFixed(2)} m)`:"🔔 Imposta avviso notifica (m)"}
          </button>
        </div>
        ${T}
      </article>
    `}function g(){const p=t.ottieniStatoDati(),n=p.stazioni,A=new Map;for(const d of n)A.set(d.idstazione,d);const G=p.corsiAcqua??t.corsiAcqua.raggruppaPerCorsoAcqua(n),f={};for(const d of G)f[d.id]=d.stazioni.map(y=>y.idstazione);const e=t.statoUtente.ottieniStazioniMonitorate(f),z={blu:0,verde:0,giallo:0,arancione:0,rosso:0};for(const d of e){const y=A.get(d);if(!y)continue;z.blu++;const u=s(y);u.livello===0?z.verde++:u.livello===1?z.giallo++:u.livello===2?z.arancione++:u.livello===3&&z.rosso++}const $=ii(p.timeRilevazione),m=p.ultimoControlloMs&&Number.isFinite(p.ultimoControlloMs)?new Date(p.ultimoControlloMs).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):null;let l="";if(t.notifiche){const d=t.notifiche.isAttivo(),y=t.notifiche.ottieniPermesso();l=`
        <button
          type="button"
          class="btn ${d?"btn-notifiche-attive":"btn-secondario"} btn-sm"
          data-azione="toggle-notifiche"
          ${y==="unsupported"?"disabled":""}
        >
          ${y==="unsupported"?"Notifiche non supportate":d?"🔔 Notifiche attive":"🔕 Attiva notifiche"}
        </button>
      `}const w=[{id:"blu",titolo:"Tutte",sottotitolo:"Blu (incl. n.d.)"},{id:"verde",titolo:"Liv. 0",sottotitolo:"Verde"},{id:"giallo",titolo:"Liv. 1",sottotitolo:"Giallo"},{id:"arancione",titolo:"Liv. 2",sottotitolo:"Arancione"},{id:"rosso",titolo:"Liv. 3",sottotitolo:"Rosso"}].map(d=>{const y=o===d.id;return`
          <button
            type="button"
            class="filtro-circolare filtro-${d.id} ${y?"filtro-attivo":""}"
            data-azione="seleziona-filtro"
            data-filtro="${d.id}"
            aria-pressed="${y}"
            aria-label="Filtro ${d.titolo} (${d.sottotitolo}): ${z[d.id]} stazioni"
          >
            <span class="filtro-cerchio">
              <span class="filtro-contatore" data-contatore-filtro="${d.id}">${z[d.id]}</span>
            </span>
            <span class="filtro-etichetta">${d.titolo}</span>
          </button>
        `}).join(""),T=[];for(const d of G)t.statoUtente.isGruppoMonitorato(d.id)&&T.push({id:d.id,nome:d.nome,tipo:"Corso d’acqua",stazioni:t.corsiAcqua.ordinaStazioni(d.stazioni)});for(const d of t.statoUtente.ottieniGruppiPersonalizzati())if(t.statoUtente.isGruppoMonitorato(d.id)){const y=d.stazioni.map(u=>A.get(u)).filter(u=>u!==void 0);T.push({id:d.id,nome:d.nome,tipo:"Gruppo personalizzato",stazioni:t.corsiAcqua.ordinaStazioni(y)})}const b=T.map(d=>{const y=t.statoUtente.ottieniVistaGruppo(d.id),u=d.stazioni.filter(U=>Ct(s(U).livello,o));if(u.length===0)return"";const F=u.map(U=>{const k=s(U),B=p.mappaTrend[U.idstazione]??t.trend.calcolaTrendStazione(U.value,null);return a(U,k,B,y)}).join(""),E=y==="estesa"?"▲":"▼",V=y==="estesa"?"Vista estesa":"Vista compatta";return`
          <section class="gruppo-monitorato-section" data-gruppo-monitorato="${R(d.id)}" data-vista-gruppo="${y}">
            <header class="gruppo-monitorato-header">
              <button
                type="button"
                class="btn-toggle-vista-gruppo"
                data-azione="toggle-vista-gruppo"
                data-gruppo-id="${R(d.id)}"
                aria-label="Alterna vista per ${R(d.nome)} (attuale: ${V})"
              >
                <span class="chevron-vista" aria-hidden="true">${E}</span>
                <span class="gruppo-monitorato-titolo">${R(d.nome)}</span>
                <span class="gruppo-monitorato-badge">${R(d.tipo)} · ${u.length}</span>
              </button>
            </header>
            <div class="gruppo-monitorato-lista lista-${y}">
              ${F}
            </div>
          </section>
        `}).filter(Boolean).join(""),L=t.statoUtente.ottieniStazioniSoloSingole(f).map(d=>A.get(d)).filter(d=>d!==void 0).filter(d=>Ct(s(d).livello,o));let q="";if(L.length>0){const d=t.statoUtente.ottieniVistaGruppo("single:stazioni"),y=L.map(u=>{const F=s(u),E=p.mappaTrend[u.idstazione]??t.trend.calcolaTrendStazione(u.value,null);return a(u,F,E,d)}).join("");q=`
        <section class="gruppo-monitorato-section sezione-stazioni-singole" data-sezione-singole data-vista-gruppo="${d}">
          <header class="gruppo-monitorato-header">
            <button
              type="button"
              class="btn-toggle-vista-gruppo"
              data-azione="toggle-vista-gruppo"
              data-gruppo-id="single:stazioni"
            >
              <span class="chevron-vista" aria-hidden="true">${d==="estesa"?"▲":"▼"}</span>
              <span class="gruppo-monitorato-titolo">Stazioni singole</span>
              <span class="gruppo-monitorato-badge">${L.length}</span>
            </button>
          </header>
          <div class="gruppo-monitorato-lista lista-${d}">
            ${y}
          </div>
        </section>
      `}let N="";p.errore?N=`
        <div class="card stato-errore-box" role="alert" data-stato-errore>
          <h3>Errore nel caricamento dei dati</h3>
          <p>${R(p.errore)}</p>
          <button type="button" class="btn btn-primario" data-azione="riprova-caricamento">
            Riprova
          </button>
        </div>
      `:p.caricamento&&n.length===0?N=`
        <div class="card stato-caricamento-box" data-stato-caricamento>
          <p>Caricamento dei livelli idrometrici in corso...</p>
        </div>
      `:e.size===0?N=`
        <div class="card stato-vuoto-box" data-stato-vuoto>
          <h3>Nessuna stazione o gruppo monitorato</h3>
          <p>Aggiungi corsi d'acqua o singole stazioni idrometriche dal catalogo ARPAE per iniziare il monitoraggio.</p>
          <a href="#/arpae" class="btn btn-primario" data-azione="vai-ad-arpae">
            Vai al catalogo ARPAE
          </a>
        </div>
      `:!b&&!q?N=`
        <div class="card stato-nessun-risultato-filtro" data-nessun-risultato-filtro>
          <p>Nessuna stazione monitorata corrisponde al filtro selezionato.</p>
        </div>
      `:N=`
        ${b}
        ${q}
      `,i.innerHTML=`
      <div class="pagina pagina-monitoraggio">
        <div class="monitoraggio-toolbar">
          <div class="toolbar-info">
            <span class="ultimo-aggiornamento" data-ultimo-aggiornamento>
              Ultimo aggiornamento ${$}${m?` · Verificato alle ${m}`:""}
            </span>
          </div>
          <div class="toolbar-azioni">
            ${l}
            <button
              type="button"
              class="btn btn-secondario btn-sm"
              data-azione="aggiorna-dati"
              title="Scarica subito i dati più recenti da ARPAE senza attendere il controllo automatico al minuto"
              ${p.caricamento?"disabled":""}
            >
              ${p.caricamento?"Aggiornamento...":"↻ Aggiorna"}
            </button>
          </div>
        </div>

        <nav class="barra-filtri-rapidi" aria-label="Filtri rapidi per livello di allerta" data-barra-filtri>
          ${w}
        </nav>

        <div class="monitoraggio-contenuto" data-monitoraggio-contenuto>
          ${N}
        </div>
      </div>
    `}function v(p){var $,m;const n=p.target;if(!n)return;const A=n.closest('[data-azione="seleziona-filtro"]');if(A){const l=A.dataset.filtro;l&&(o===l&&l!=="blu"?o="blu":o=l,g());return}const G=n.closest('[data-azione="toggle-vista-gruppo"]');if(G){const l=G.dataset.gruppoId;l&&(t.statoUtente.alternaVistaGruppo(l),g());return}if(n.closest('[data-azione="aggiorna-dati"]')||n.closest('[data-azione="riprova-caricamento"]')){t.richiediAggiornamento();return}if(n.closest('[data-azione="toggle-notifiche"]')&&t.notifiche){t.notifiche.isAttivo()?(t.notifiche.disattivaNotifiche(),g()):t.notifiche.attivaNotifiche().then(()=>{g()});return}const f=n.closest('[data-azione="apri-avviso-metri-mon"]');if(f){const l=f.dataset.idstazione??null;r=r===l?null:l,g();return}if(n.closest('[data-azione="chiudi-avviso-metri-mon"]')){r=null,g();return}const e=n.closest('[data-azione="rimuovi-avviso-metri-mon"]');if(e){const l=e.dataset.idstazione;l&&((m=($=t.statoUtente).rimuoviAvvisoLivello)==null||m.call($,l),r=null,g());return}n.closest('[data-azione="vai-ad-arpae"]')&&t.navigaA&&(p.preventDefault(),t.navigaA("#/arpae"))}function h(p){var e,z,$,m;const n=p.target;if(!(n instanceof HTMLFormElement)||n.dataset.azione!=="salva-avviso-metri-mon")return;p.preventDefault();const A=n.dataset.idstazione;if(!A)return;const G=new FormData(n),f=String(G.get("quotaAvviso")??"").trim().replace(",",".");if(!f)(z=(e=t.statoUtente).rimuoviAvvisoLivello)==null||z.call(e,A);else{const l=Number(f);Number.isFinite(l)&&((m=($=t.statoUtente).impostaAvvisoLivello)==null||m.call($,A,l))}r=null,g()}return i.addEventListener("click",v),i.addEventListener("submit",h),g(),{aggiorna:g,smonta:()=>{i.removeEventListener("click",v),i.removeEventListener("submit",h),i.innerHTML=""}}}function M(i){return i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Lt(i){return i===null||!Number.isFinite(i)?"n.d.":`${i.toFixed(2)} m`}function st(i){const t=i.trim().replace(",",".");if(!t)return null;const o=Number(t);return!Number.isFinite(o)||o===0?null:o}function ei(i,t){let o="",r="",s=null,a=null;const g=new Set;function v(f){const e={};for(const z of f)e[z.id]=z.stazioni.map($=>$.idstazione);return e}function h(){var d,y;const f=t.ottieniStazioni(),e=((d=t.ottieniCorsiAcqua)==null?void 0:d.call(t))??t.corsiAcqua.raggruppaPerCorsoAcqua(f),z=((y=t.ottieniMappaTrend)==null?void 0:y.call(t))??{},$=v(e),m=o.trim().toLowerCase(),l=m?e.filter(u=>u.nome.toLowerCase().includes(m)||u.stazioni.some(F=>F.nomestaz.toLowerCase().includes(m))):e,P=r.trim().toLowerCase(),w=P?f.filter(u=>u.nomestaz.toLowerCase().includes(P)):f,T=l.map(u=>{const F=t.statoUtente.isGruppoMonitorato(u.id),E=g.has(u.id),V=E?`<ul class="arpae-corso-stazioni" data-corso-stazioni="${M(u.id)}">
              ${u.stazioni.map(U=>{const k=t.statoUtente.ottieniSogliaPersonalizzata(U.idstazione),B=t.soglie.valutaStazione(U,k),K=lt(U.idstazione);return`<li class="arpae-corso-stazione-item" data-idstazione="${M(U.idstazione)}" data-ordinamento="${U.ordinamento}">
                    <span class="staz-ord">#${U.ordinamento}</span>
                    <span class="staz-nome">${M(U.nomestaz)}</span>
                    <span class="staz-valore">${Lt(U.value)}</span>
                    <span class="badge-stato stato-${B.colore}" aria-label="${M(B.etichetta)}">${M(B.etichettaBreve)}</span>
                    <a
                      href="${M(K)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn btn-secondario btn-sm"
                      data-azione="apri-grafico"
                      data-idstazione="${M(U.idstazione)}"
                    >📈 Grafico</a>
                  </li>`}).join("")}
            </ul>`:"";return`<article class="card arpae-corso-card ${F?"corso-monitorato":""}" data-corso-id="${M(u.id)}">
          <div class="arpae-corso-header">
            <button type="button" class="btn-espandi-corso" data-azione="toggle-espandi-corso" data-corso-id="${M(u.id)}" aria-expanded="${E}">
              <span class="chevron" aria-hidden="true">${E?"▲":"▼"}</span>
              <span class="corso-titolo">${M(u.nome)}</span>
              <span class="corso-conteggio">(${u.stazioni.length} stazioni)</span>
            </button>
            <label class="toggle-monitora-gruppo">
              <input
                type="checkbox"
                data-azione="toggle-monitora-corso"
                data-corso-id="${M(u.id)}"
                ${F?"checked":""}
              />
              <span>Monitora gruppo</span>
            </label>
          </div>
          ${V}
        </article>`}).join(""),b=w.map(u=>{var _,gt;const F=t.statoUtente.ottieniSogliaPersonalizzata(u.idstazione),E=t.soglie.valutaStazione(u,F),V=t.statoUtente.isStazioneAggiuntaSingolarmente(u.idstazione),k=t.statoUtente.isStazioneMonitorata(u.idstazione,$)&&!V,B=lt(u.idstazione),K=t.soglie.formattaSoglia(E.soglia1Effettiva),tt=t.soglie.formattaSoglia(E.soglia2Effettiva),it=t.soglie.formattaSoglia(E.soglia3Effettiva),Q=z[u.idstazione]??{testoTrend:"—",testoPrevisione1h:"—",testoPrevisione2h:"—"},ot=s===u.idstazione,at=a===u.idstazione,c=((gt=(_=t.statoUtente).ottieniAvvisoLivello)==null?void 0:gt.call(_,u.idstazione))??null,S=E.soglia1Effettiva!==null?String(E.soglia1Effettiva):"",I=E.soglia2Effettiva!==null?String(E.soglia2Effettiva):"",D=E.soglia3Effettiva!==null?String(E.soglia3Effettiva):"",O=at?`<form class="form-soglie-personalizzate" data-azione="salva-avviso-metri" data-idstazione="${M(u.idstazione)}">
              <p class="sezione-sottotitolo" style="margin-bottom:6px;">
                Imposta un livello dell'acqua (in metri) raggiunto il quale ricevere una notifica, <strong>senza modificare le soglie ufficiali ARPAE</strong>:
              </p>
              <div class="form-crea-gruppo" style="margin-bottom:8px;">
                <input
                  type="text"
                  inputmode="decimal"
                  name="quotaAvviso"
                  value="${c!==null?M(String(c)):""}"
                  placeholder="Es. 1.50 (in metri)"
                />
                <button type="submit" class="btn btn-primario btn-sm">Salva avviso</button>
                ${c!==null?`<button type="button" class="btn btn-pericolo btn-sm" data-azione="rimuovi-avviso-metri" data-idstazione="${M(u.idstazione)}">Rimuovi avviso</button>`:""}
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-avviso-metri">Annulla</button>
              </div>
            </form>`:"",H=ot?`<form class="form-soglie-personalizzate" data-azione="salva-soglie" data-idstazione="${M(u.idstazione)}">
              <div class="form-soglie-grid">
                <label>
                  <span>Soglia 1 (Gialla, m)</span>
                  <input type="text" inputmode="decimal" name="soglia1" value="${M(S)}" placeholder="—" />
                </label>
                <label>
                  <span>Soglia 2 (Arancione, m)</span>
                  <input type="text" inputmode="decimal" name="soglia2" value="${M(I)}" placeholder="—" />
                </label>
                <label>
                  <span>Soglia 3 (Rossa, m)</span>
                  <input type="text" inputmode="decimal" name="soglia3" value="${M(D)}" placeholder="—" />
                </label>
              </div>
              <div class="form-soglie-azioni">
                <button type="submit" class="btn btn-primario btn-sm">Salva soglie</button>
                ${E.personalizzata?`<button type="button" class="btn btn-secondario btn-sm" data-azione="ripristina-soglie" data-idstazione="${M(u.idstazione)}">Ripristina soglie ufficiali</button>`:""}
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-soglie">Annulla</button>
              </div>
            </form>`:"";return`<article class="card arpae-stazione-card" data-stazione-card="${M(u.idstazione)}">
          <div class="arpae-stazione-top">
            <div class="arpae-stazione-info">
              <h4 class="arpae-stazione-nome">${M(u.nomestaz)}</h4>
              <div class="arpae-stazione-valore-row">
                <span class="valore-idrometrico" data-valore-stazione="${M(u.idstazione)}">${Lt(u.value)}</span>
                <span class="badge-stato stato-${E.colore}" data-stato-stazione="${M(u.idstazione)}" aria-label="${M(E.etichetta)}">
                  <span class="pallino-stato pallino-${E.colore}" aria-hidden="true"></span>
                  <span>${M(E.etichettaBreve)}</span>
                </span>
                ${E.personalizzata?`<span class="badge-custom-soglia" data-badge-personalizzata="${M(u.idstazione)}">Soglie personalizzate</span>`:""}
              </div>
            </div>
            <div class="arpae-stazione-controlli">
              <label class="toggle-monitora-stazione">
                <input
                  type="checkbox"
                  data-azione="toggle-monitora-stazione"
                  data-idstazione="${M(u.idstazione)}"
                  ${V||k?"checked":""}
                />
                <span>Monitora${k?" (da gruppo)":""}</span>
              </label>
            </div>
          </div>

          <div class="arpae-stazione-soglie" data-soglie-stazione="${M(u.idstazione)}">
            <span>Trend: <strong>${M(Q.testoTrend)}</strong></span>
            <span>Prev. +1h: <strong>${M(Q.testoPrevisione1h)}</strong></span>
            <span>Prev. +2h: <strong>${M(Q.testoPrevisione2h)}</strong></span>
            <span>Soglia 1: <strong>${M(K)}</strong></span>
            <span>Soglia 2: <strong>${M(tt)}</strong></span>
            <span>Soglia 3: <strong>${M(it)}</strong></span>
            ${c!==null?`<span class="badge-custom-soglia" data-avviso-attivo="${M(u.idstazione)}">🔔 Avviso a <strong>${c.toFixed(2)} m</strong></span>`:""}
            <a
              href="${M(B)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondario btn-sm"
              data-azione="apri-grafico"
              data-idstazione="${M(u.idstazione)}"
            >
              📈 Grafico
            </a>
            <button
              type="button"
              class="btn-link"
              data-azione="apri-avviso-metri"
              data-idstazione="${M(u.idstazione)}"
            >
              ${c!==null?"🔔 Modifica avviso (m)":"🔔 Imposta avviso notifica (m)"}
            </button>
            <button
              type="button"
              class="btn-link"
              data-azione="apri-soglie"
              data-idstazione="${M(u.idstazione)}"
            >
              ${E.personalizzata?"Modifica/Ripristina soglie":"Personalizza soglie"}
            </button>
          </div>
          ${O}
          ${H}
        </article>`}).join(""),C=document.activeElement,L=C instanceof HTMLInputElement&&(C.dataset.azione==="ricerca-stazioni"||C.dataset.azione==="ricerca-corsi")?C.dataset.azione:null,q=L&&C instanceof HTMLInputElement?C.selectionStart:null,N=L&&C instanceof HTMLInputElement?C.selectionEnd:null;if(i.innerHTML=`
      <div class="pagina pagina-arpae">
        <section class="sezione-arpae-corsi" aria-labelledby="titolo-corsi-acqua">
          <div class="sezione-header">
            <h2 id="titolo-corsi-acqua">Gruppi per corso d'acqua (${l.length})</h2>
            <p class="sezione-sottotitolo">Stazioni ordinate da monte a valle (ordinamento crescente)</p>
            <div class="barra-ricerca">
              <label for="input-ricerca-corsi-arpae" class="sr-only">Cerca gruppo corso d'acqua</label>
              <input
                id="input-ricerca-corsi-arpae"
                type="search"
                class="input-ricerca"
                data-azione="ricerca-corsi"
                placeholder="Cerca gruppo per corso d'acqua (es. Po, Reno, Secchia) o stazione..."
                value="${M(o)}"
              />
            </div>
          </div>
          <div class="lista-corsi-acqua" data-lista-corsi>
            ${T||'<p class="stato-vuoto-testo">Nessun corso d’acqua corrisponde alla ricerca.</p>'}
          </div>
        </section>

        <section class="sezione-arpae-stazioni" aria-labelledby="titolo-elenco-stazioni">
          <div class="sezione-header">
            <h2 id="titolo-elenco-stazioni">Elenco completo stazioni (${w.length})</h2>
            <div class="barra-ricerca">
              <label for="input-ricerca-arpae" class="sr-only">Cerca stazione per nome</label>
              <input
                id="input-ricerca-arpae"
                type="search"
                class="input-ricerca"
                data-azione="ricerca-stazioni"
                placeholder="Cerca stazione per nome..."
                value="${M(r)}"
              />
            </div>
          </div>
          <div class="lista-stazioni-arpae" data-lista-stazioni>
            ${b||'<p class="stato-vuoto-testo">Nessuna stazione corrisponde alla ricerca.</p>'}
          </div>
        </section>
      </div>
    `,L){const u=i.querySelector(`input[data-azione="${L}"]`);u&&(u.focus(),q!==null&&N!==null&&u.setSelectionRange(q,N))}}function p(f){var b,C;const e=f.target;if(!e)return;const z=e.closest('[data-azione="toggle-espandi-corso"]');if(z){const L=z.dataset.corsoId;L&&(g.has(L)?g.delete(L):g.add(L),h());return}const $=e.closest('[data-azione="apri-avviso-metri"]');if($){const L=$.dataset.idstazione??null;a=a===L?null:L,s=null,h();return}if(e.closest('[data-azione="chiudi-avviso-metri"]')){a=null,h();return}const l=e.closest('[data-azione="rimuovi-avviso-metri"]');if(l){const L=l.dataset.idstazione;L&&((C=(b=t.statoUtente).rimuoviAvvisoLivello)==null||C.call(b,L),a=null,h());return}const P=e.closest('[data-azione="apri-soglie"]');if(P){const L=P.dataset.idstazione??null;s=s===L?null:L,a=null,h();return}if(e.closest('[data-azione="chiudi-soglie"]')){s=null,h();return}const T=e.closest('[data-azione="ripristina-soglie"]');if(T){const L=T.dataset.idstazione;L&&(t.statoUtente.ripristinaSogliaUfficiale(L),s=null,h());return}}function n(f){const e=f.target;if(e){if(e instanceof HTMLInputElement&&e.dataset.azione==="toggle-monitora-corso"){const z=e.dataset.corsoId;z&&(t.statoUtente.impostaMonitoraggioGruppo(z,e.checked),h());return}if(e instanceof HTMLInputElement&&e.dataset.azione==="toggle-monitora-stazione"){const z=e.dataset.idstazione;z&&(t.statoUtente.impostaStazioneSingola(z,e.checked),h());return}}}function A(f){const e=f.target;if(e instanceof HTMLInputElement){if(e.dataset.azione==="ricerca-corsi"){o=e.value,h();return}e.dataset.azione==="ricerca-stazioni"&&(r=e.value,h())}}function G(f){var w,T,b,C;const e=f.target;if(!(e instanceof HTMLFormElement))return;if(e.dataset.azione==="salva-avviso-metri"){f.preventDefault();const L=e.dataset.idstazione;if(!L)return;const q=new FormData(e),N=String(q.get("quotaAvviso")??"").trim().replace(",",".");if(!N)(T=(w=t.statoUtente).rimuoviAvvisoLivello)==null||T.call(w,L);else{const d=Number(N);Number.isFinite(d)&&((C=(b=t.statoUtente).impostaAvvisoLivello)==null||C.call(b,L,d))}a=null,h();return}if(e.dataset.azione!=="salva-soglie")return;f.preventDefault();const z=e.dataset.idstazione;if(!z)return;const $=new FormData(e),m=st(String($.get("soglia1")??"")),l=st(String($.get("soglia2")??"")),P=st(String($.get("soglia3")??""));t.statoUtente.impostaSogliaPersonalizzata({idstazione:z,soglia1:m,soglia2:l,soglia3:P}),s=null,h()}return i.addEventListener("click",p),i.addEventListener("change",n),i.addEventListener("input",A),i.addEventListener("submit",G),h(),{aggiorna:h,smonta:()=>{i.removeEventListener("click",p),i.removeEventListener("change",n),i.removeEventListener("input",A),i.removeEventListener("submit",G),i.innerHTML=""}}}function x(i){return i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ni(i,t){let o=null,r=null,s=null,a=null,g="";function v(){var z;const f=((z=t.ottieniCorsiAcqua)==null?void 0:z.call(t))??[],e={};for(const $ of f)e[$.id]=$.stazioni.map(m=>m.idstazione);return e}function h(){const f=t.statoUtente.ottieniGruppiPersonalizzati(),e=t.ottieniStazioni(),z=new Map;for(const b of e)z.set(b.idstazione,b);const $=v(),m=f.map(b=>{const C=t.statoUtente.isGruppoMonitorato(b.id),L=r===b.id,q=s===b.id,N=a===b.id,d=b.stazioni.map(E=>{var V;return((V=z.get(E))==null?void 0:V.nomestaz)??`Stazione ${E}`});let y="";L&&(y=`
            <form class="form-rinomina-gruppo" data-azione="salva-rinomina" data-gruppo-id="${x(b.id)}">
              <label class="sr-only" for="input-rinomina-${x(b.id)}">Nuovo nome gruppo</label>
              <input
                id="input-rinomina-${x(b.id)}"
                type="text"
                name="nuovoNome"
                value="${x(b.nome)}"
                required
              />
              <button type="submit" class="btn btn-primario btn-sm">Salva nome</button>
              <button type="button" class="btn btn-neutro btn-sm" data-azione="annulla-rinomina">Annulla</button>
            </form>
          `);let u="";if(N){const E=t.statoUtente.calcolaImpattoEliminazioneGruppo(b.id,$),V=E.totaleStazioniNelGruppo,U=E.stazioniCheSmetteranno.length,k=E.stazioniSalvateDaAltriGruppi.length;u=`
            <div class="box-conferma-eliminazione" role="alertdialog" aria-label="Conferma eliminazione gruppo" data-conferma-eliminazione="${x(b.id)}">
              <p class="avviso-titolo"><strong>Attenzione: eliminazione con Cascade Delete</strong></p>
              <p class="avviso-testo">
                Stai eliminando il gruppo <strong>${x(b.nome)}</strong> (${V} stazioni coinvolte).
                Eliminando questo gruppo, <strong>${U} stazioni smetteranno completamente di essere monitorate</strong>
                (anche se erano state aggiunte singolarmente dalla pagina ARPAE).
                ${k>0?`Altre ${k} stazioni resteranno monitorate poiché presenti in un altro gruppo attivo.`:""}
              </p>
              <div class="azioni-conferma">
                <button
                  type="button"
                  class="btn btn-pericolo btn-sm"
                  data-azione="conferma-elimina-gruppo"
                  data-gruppo-id="${x(b.id)}"
                >
                  Conferma eliminazione
                </button>
                <button
                  type="button"
                  class="btn btn-neutro btn-sm"
                  data-azione="annulla-elimina-gruppo"
                >
                  Annulla
                </button>
              </div>
            </div>
          `}let F="";if(q){const E=g.trim().toLowerCase(),V=E?e.filter(k=>k.nomestaz.toLowerCase().includes(E)):e,U=new Set(b.stazioni);F=`
            <div class="pannello-composizione-stazioni" data-composizione-gruppo="${x(b.id)}">
              <div class="composizione-header">
                <h4>Modifica stazioni del gruppo (${b.stazioni.length} selezionate)</h4>
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-composizione">Chiudi</button>
              </div>
              <div class="barra-ricerca">
                <input
                  type="search"
                  class="input-ricerca"
                  data-azione="ricerca-stazioni-gruppo"
                  placeholder="Cerca stazione da aggiungere o rimuovere..."
                  value="${x(g)}"
                />
              </div>
              <ul class="lista-selettore-stazioni">
                ${V.map(k=>{const B=U.has(k.idstazione);return`<li>
                      <label class="selettore-stazione-label">
                        <input
                          type="checkbox"
                          data-azione="toggle-stazione-in-gruppo"
                          data-gruppo-id="${x(b.id)}"
                          data-idstazione="${x(k.idstazione)}"
                          ${B?"checked":""}
                        />
                        <span>${x(k.nomestaz)}</span>
                      </label>
                    </li>`}).join("")}
              </ul>
            </div>
          `}return`
          <article class="card gruppo-custom-card" data-gruppo-card="${x(b.id)}">
            <div class="gruppo-custom-header">
              <div>
                <h3 class="gruppo-custom-nome" data-gruppo-nome="${x(b.id)}">${x(b.nome)}</h3>
                <span class="gruppo-custom-meta">${b.stazioni.length} stazioni · ${C?"Monitorato":"Non monitorato"}</span>
              </div>
              <div class="gruppo-custom-azioni">
                <button type="button" class="btn btn-secondario btn-sm" data-azione="apri-rinomina" data-gruppo-id="${x(b.id)}">Rinomina</button>
                <button type="button" class="btn btn-secondario btn-sm" data-azione="apri-composizione" data-gruppo-id="${x(b.id)}">Modifica stazioni</button>
                <button type="button" class="btn btn-pericolo btn-sm" data-azione="chiedi-elimina-gruppo" data-gruppo-id="${x(b.id)}">Elimina</button>
              </div>
            </div>

            ${d.length>0?`<div class="chip-stazioni-gruppo">${d.map(E=>`<span class="chip-stazione">${x(E)}</span>`).join("")}</div>`:'<p class="testo-secondario">Nessuna stazione nel gruppo. Clicca su "Modifica stazioni" per aggiungerne.</p>'}

            ${y}
            ${u}
            ${F}
          </article>
        `}).join(""),l=document.activeElement,P=l instanceof HTMLInputElement&&l.dataset.azione==="ricerca-stazioni-gruppo",w=P?l.selectionStart:null,T=P?l.selectionEnd:null;if(i.innerHTML=`
      <div class="pagina pagina-gruppi">
        <section class="card sezione-crea-gruppo" aria-labelledby="titolo-crea-gruppo">
          <h2 id="titolo-crea-gruppo">Crea nuovo gruppo personalizzato</h2>
          <p class="sezione-sottotitolo">
            Un gruppo personalizzato appena creato è subito monitorato. I gruppi automatici per corso d'acqua non sono modificabili qui (gestiscili nella scheda ARPAE).
          </p>
          ${o?`<div class="banner-errore" role="alert" data-errore-gruppi>${x(o)}</div>`:""}
          <form class="form-crea-gruppo" data-azione="crea-gruppo" novalidate>
            <label for="input-nome-nuovo-gruppo" class="sr-only">Nome del gruppo</label>
            <input
              id="input-nome-nuovo-gruppo"
              type="text"
              name="nomeGruppo"
              placeholder="Nome del nuovo gruppo (obbligatorio e univoco)..."
              required
            />
            <button type="submit" class="btn btn-primario">Crea gruppo</button>
          </form>
        </section>

        <section class="sezione-elenco-gruppi" aria-labelledby="titolo-elenco-gruppi">
          <h2 id="titolo-elenco-gruppi">I tuoi gruppi personalizzati (${f.length})</h2>
          <div class="lista-gruppi-personalizzati" data-lista-gruppi>
            ${m||'<p class="stato-vuoto-testo">Non hai ancora creato gruppi personalizzati.</p>'}
          </div>
        </section>
      </div>
    `,P){const b=i.querySelector('input[data-azione="ricerca-stazioni-gruppo"]');b&&(b.focus(),w!==null&&T!==null&&b.setSelectionRange(w,T))}}function p(f){const e=f.target;if(e instanceof HTMLFormElement){if(e.dataset.azione==="crea-gruppo"){f.preventDefault();const z=new FormData(e),$=String(z.get("nomeGruppo")??"");try{o=null,s=t.statoUtente.creaGruppoPersonalizzato($,[]).id,g="",h()}catch(m){o=m instanceof Error?m.message:"Errore nella creazione del gruppo.",h()}return}if(e.dataset.azione==="salva-rinomina"){f.preventDefault();const z=e.dataset.gruppoId;if(!z)return;const $=new FormData(e),m=String($.get("nuovoNome")??"");try{o=null,t.statoUtente.rinominaGruppoPersonalizzato(z,m),r=null,h()}catch(l){o=l instanceof Error?l.message:"Errore nella rinomina del gruppo.",h()}}}}function n(f){const e=f.target;if(!e)return;const z=e.closest('[data-azione="apri-rinomina"]');if(z){o=null,r=z.dataset.gruppoId??null,a=null,h();return}if(e.closest('[data-azione="annulla-rinomina"]')){r=null,h();return}const $=e.closest('[data-azione="apri-composizione"]');if($){const P=$.dataset.gruppoId??null;s=s===P?null:P,g="",h();return}if(e.closest('[data-azione="chiudi-composizione"]')){s=null,h();return}const m=e.closest('[data-azione="chiedi-elimina-gruppo"]');if(m){o=null,a=m.dataset.gruppoId??null,r=null,h();return}if(e.closest('[data-azione="annulla-elimina-gruppo"]')){a=null,h();return}const l=e.closest('[data-azione="conferma-elimina-gruppo"]');if(l){const P=l.dataset.gruppoId;P&&(t.statoUtente.eliminaGruppoPersonalizzato(P,v()),a=null,s===P&&(s=null),h())}}function A(f){const e=f.target;if(e instanceof HTMLInputElement&&e.dataset.azione==="toggle-stazione-in-gruppo"){const z=e.dataset.gruppoId,$=e.dataset.idstazione;if(!z||!$)return;const m=t.statoUtente.ottieniGruppiPersonalizzati().find(P=>P.id===z);if(!m)return;const l=new Set(m.stazioni);e.checked?l.add($):l.delete($),t.statoUtente.aggiornaStazioniGruppoPersonalizzato(z,Array.from(l)),h()}}function G(f){const e=f.target;e instanceof HTMLInputElement&&e.dataset.azione==="ricerca-stazioni-gruppo"&&(g=e.value,h())}return i.addEventListener("submit",p),i.addEventListener("click",n),i.addEventListener("change",A),i.addEventListener("input",G),h(),{aggiorna:h,smonta:()=>{i.removeEventListener("submit",p),i.removeEventListener("click",n),i.removeEventListener("change",A),i.removeEventListener("input",G),i.innerHTML=""}}}const si=60*1e3;function rt(i){const t=i.trim().toLowerCase();return t==="#/arpae"||t.startsWith("#/arpae?")?"#/arpae":t==="#/gruppi"||t.startsWith("#/gruppi?")?"#/gruppi":"#/monitoraggio"}function ri(i,t={}){const o=t.fonteDati??qt(),r=t.corsiAcqua??Ot(),s=t.soglie??Ht(),a=t.trend??jt(),g=t.statoUtente??Xt(),v=t.notifiche??ti(),h=t.intervalloAutoRefreshMs!==void 0?t.intervalloAutoRefreshMs:si;let p=!1,n=null,A=null,G=null,f=[],e=[],z={},$=rt(window.location.hash),m=null;i.innerHTML=`
    <div class="app-shell">
      <header class="app-header">
        <div class="app-header-inner">
          <div>
            <h1 class="app-titolo">IdroMonitor Emilia-Romagna</h1>
            <p class="app-sottotitolo">Livelli idrometrici, soglie di allerta e previsioni ARPAE</p>
          </div>
        </div>
      </header>

      <main class="app-main" id="app-contenuto-pagina" aria-live="polite"></main>

      <nav class="bottom-nav" aria-label="Navigazione principale">
        <a href="#/monitoraggio" class="bottom-nav-link" data-nav-rotta="#/monitoraggio">
          <span class="bottom-nav-icon" aria-hidden="true">🌊</span>
          <span>Monitoraggio</span>
        </a>
        <a href="#/arpae" class="bottom-nav-link" data-nav-rotta="#/arpae">
          <span class="bottom-nav-icon" aria-hidden="true">📡</span>
          <span>ARPAE</span>
        </a>
        <a href="#/gruppi" class="bottom-nav-link" data-nav-rotta="#/gruppi">
          <span class="bottom-nav-icon" aria-hidden="true">🗂️</span>
          <span>Gruppi</span>
        </a>
      </nav>
    </div>
  `;const l=i.querySelector("#app-contenuto-pagina");function P(){i.querySelectorAll("[data-nav-rotta]").forEach(y=>{const u=y.dataset.navRotta===$;y.classList.toggle("nav-attivo",u),u?y.setAttribute("aria-current","page"):y.removeAttribute("aria-current")})}function w(){const d={};for(const y of e)d[y.id]=y.stazioni.map(u=>u.idstazione);return d}function T(){if(f.length===0)return;const d=w(),y=g.ottieniStazioniMonitorate(d),u=f.filter(F=>y.has(F.idstazione));v.controllaEInviaNotifiche(u,F=>{const E=g.ottieniSogliaPersonalizzata(F.idstazione);return s.valutaStazione(F,E)},F=>{var E;return((E=g.ottieniAvvisoLivello)==null?void 0:E.call(g,F))??null})}async function b(d=!0){var y;p=!0,n=null,m==null||m.aggiorna();try{const{corrente:u,precedente:F,precedenteUnOra:E}=await o.scaricaConStorico(void 0,d);f=u.stazioni,A=u.time,G=Date.now(),e=r.raggruppaPerCorsoAcqua(f),z=a.calcolaMappaTrend(u,F,E??null),(y=g.impostaMappaGruppiEsterni)==null||y.call(g,w()),T()}catch(u){n=u instanceof Error?u.message:"Impossibile caricare i dati dall’endpoint ARPAE."}finally{p=!1,m==null||m.aggiorna()}}function C(d){m==null||m.smonta(),m=null,$=d,P(),d==="#/arpae"?m=ei(l,{ottieniStazioni:()=>f,ottieniCorsiAcqua:()=>e,ottieniMappaTrend:()=>z,corsiAcqua:r,soglie:s,statoUtente:g}):d==="#/gruppi"?m=ni(l,{ottieniStazioni:()=>f,ottieniCorsiAcqua:()=>e,statoUtente:g}):m=ai(l,{ottieniStatoDati:()=>({caricamento:p,errore:n,timeRilevazione:A,ultimoControlloMs:G,stazioni:f,corsiAcqua:e,mappaTrend:z}),richiediAggiornamento:()=>b(!0),navigaA:y=>{window.location.hash=y,C(y)},corsiAcqua:r,soglie:s,trend:a,statoUtente:g,notifiche:v})}function L(){const d=rt(window.location.hash);d!==$&&C(d)}const q=g.iscrivi(()=>{T(),m==null||m.aggiorna()});if(window.addEventListener("hashchange",L),!window.location.hash)try{window.history.replaceState(null,"","#/monitoraggio")}catch{window.location.hash="#/monitoraggio"}C(rt(window.location.hash)),b(!0);const N=h&&h>0?window.setInterval(()=>{b(!0)},h):null;return{aggiorna:()=>{m==null||m.aggiorna()},smonta:()=>{N!==null&&window.clearInterval(N),window.removeEventListener("hashchange",L),q(),m==null||m.smonta(),i.innerHTML=""}}}const wt=document.getElementById("app");wt&&ri(wt);
