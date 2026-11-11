(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const g of o.addedNodes)g.tagName==="LINK"&&g.rel==="modulepreload"&&r(g)}).observe(document,{childList:!0,subtree:!0});function a(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(s){if(s.ep)return;s.ep=!0;const o=a(s);fetch(s.href,o)}})();const Rt="https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-sensor-values-no-time",Ft="/api/sensori",Ut="https://allertameteo.regione.emilia-romagna.it/o/api/allerta/get-time-series/",qt="/api/serie-stazione",dt="254,0,0/1,-,-,-/B13215",W=15*60*1e3,j=36e5,Dt=3;function zt(i=Date.now()){return Math.floor(i/j)*j}function bt(i=Date.now()){return Math.floor(i/W)*W}function ht(i,t,a=dt){const r=i.includes("?")?"&":"?",s=encodeURIComponent(a),o=encodeURIComponent(String(t));return`${i}${r}variabile=${s}&time=${o}`}function St(i){const t=new Date(i),a=t.getFullYear(),r=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0");return`${a}-${r}-${s}`}function lt(i,t=Date.now()){const a=encodeURIComponent(i.trim()),r=St(t),s=St(t-2*24*60*60*1e3);return`https://allertameteo.regione.emilia-romagna.it/web/guest/grafico-sensori?p_p_id=AllertaGraficoPortlet&p_p_lifecycle=0&_AllertaGraficoPortlet_mvcRenderCommandName=%2Fallerta%2Fanimazione%2Fgrafico&r=${a}/254,0,0/1,-,-,-/B13215/${s}/${r}&stazione=${a}&variabile=254,0,0/1,-,-,-/B13215`}function $t(i,t,a=dt){const r=i.includes("?")?"&":"?",s=encodeURIComponent(t.trim()),o=encodeURIComponent(a);return`${i}${r}stazione=${s}&variabile=${o}`}function Ot(i){if(!Array.isArray(i)||i.length===0)return null;const t=[];for(const e of i){if(!ct(e)||!("t"in e)||!("v"in e))continue;const z=X(e.t,NaN);if(!Number.isFinite(z))continue;const E=It(e.v);t.push({t:z,v:E})}if(t.length===0)return null;t.sort((e,z)=>e.t-z.t);const a=t[t.length-1].t;for(;t.length>0&&t[t.length-1].v===null&&t[t.length-1].t>a-2*j;)t.pop();const r=t[t.length-1];if(!r||r.v===null)return{ultimoValore:null,ultimoTime:(r==null?void 0:r.t)??null,valore15MinPrima:null,valoreUnOraPrima:null};const s=r.v,o=r.t,g=o-W;let v=null,h=1/0;const m=o-j;let n=null,A=1/0;for(let e=t.length-2;e>=0;e--){const z=t[e];if(z.v===null)continue;const E=o-z.t;if(!(E<=0)){if(E>=5*60*1e3&&E<=45*60*1e3){const c=Math.abs(z.t-g);c<h&&(h=c,v=z)}if(E>=30*60*1e3&&E<=2*j){const c=Math.abs(z.t-m);c<A&&(A=c,n=z)}if(E>2*j)break}}let R=null;if(v&&v.v!==null){const e=(o-v.t)/j;if(e>0){const z=(s-v.v)/e;R=Number((s-z*.25).toFixed(4))}}let S=null;if(n&&n.v!==null){const e=(o-n.t)/j;if(e>0){const z=(s-n.v)/e;S=Number((s-z*1).toFixed(4))}}return{ultimoValore:s,ultimoTime:o,valore15MinPrima:R,valoreUnOraPrima:S}}function ct(i){return typeof i=="object"&&i!==null&&!Array.isArray(i)}function X(i,t=0){if(typeof i=="number"&&Number.isFinite(i))return i;if(typeof i=="string"&&i.trim()!==""){const a=Number(i);if(Number.isFinite(a))return a}return t}function It(i){if(i==null)return null;if(typeof i=="number"&&Number.isFinite(i))return i;if(typeof i=="string"&&i.trim()!==""){const t=Number(i);if(Number.isFinite(t))return t}return null}function xt(i,t,a=1){if(!Array.isArray(i)||i.length===0)throw new Error("Risposta API non valida: atteso un array JSON non vuoto.");const r=i[0];if(!ct(r)||!("time"in r))throw new Error('Risposta API non valida: primo elemento privo del campo "time".');const s=X(r.time,t),o=[];for(let g=1;g<i.length;g++){const v=i[g];if(!ct(v)||typeof v.idstazione!="string"&&typeof v.idstazione!="number")continue;const h=String(v.idstazione).trim();if(!h)continue;const m={idstazione:h,ordinamento:X(v.ordinamento,0),nomestaz:typeof v.nomestaz=="string"?v.nomestaz.trim():h,lon:v.lon!==void 0&&v.lon!==null?String(v.lon):"",lat:v.lat!==void 0&&v.lat!==null?String(v.lat):"",soglia1:X(v.soglia1,0),soglia2:X(v.soglia2,0),soglia3:X(v.soglia3,0),value:It(v.value),precedente:typeof v.precedente=="string"?v.precedente:v.precedente!==void 0&&v.precedente!==null?String(v.precedente):null};o.push(m)}return{time:s,timeRichiesto:t,tentativi:a,stazioni:o}}function Z(i){return i.length===0?!0:i.every(t=>t.value===null)}function _t(i={}){const t=i.baseUrl??Rt,a=i.fallbackBaseUrl!==void 0?i.fallbackBaseUrl:Ft,r=i.serieGraficoBaseUrl??Ut,s=i.fallbackSerieGraficoBaseUrl!==void 0?i.fallbackSerieGraficoBaseUrl:qt,o=i.variabile??dt,g=i.fetchFn??((c,l)=>globalThis.fetch(c,l)),v=i.nowFn??(()=>Date.now()),h=new Map,m=new Map;async function n(c,l,L=!1){var F,D;if(!L){const d=h.get(c);if(d&&!Z(d.stazioni))return{...d,tentativi:l}}const M=ht(t,c,o),w={Accept:"application/json","Cache-Control":"no-cache",Pragma:"no-cache"};let f;try{f=await g(M,{headers:w,cache:"no-cache"});const d=((D=(F=f.headers)==null?void 0:F.get)==null?void 0:D.call(F,"content-type"))??"";if(!f.ok||d&&!d.includes("json")&&!d.includes("text/plain"))throw new Error(`Risposta non valida da endpoint primario (${f.status})`)}catch(d){if(a&&a!==t){const $=ht(a,c,o);f=await g($,{headers:w,cache:"no-cache"})}else throw d}if(!f.ok)throw new Error(`Errore HTTP ${f.status} durante il caricamento dei sensori.`);const P=await f.json(),C=xt(P,c,l);return Z(C.stazioni)||(h.set(c,C),m.set(C.time,C)),C}async function A(c={}){const l=c.timeMs!==void 0?bt(c.timeMs):zt(v()),L=c.maxTentativiNull??Dt,M=c.bypassaCache??!1;let w=null;for(let f=0;f<=L;f++){const P=l-f*j,C=await n(P,f+1,M);if(w=C,!Z(C.stazioni))return C}if(!w)throw new Error("Impossibile ottenere i dati delle stazioni.");return w}async function R(c,l){const L=m.get(c);if(L&&!Z(L.stazioni))return L;try{const M=l?c+j:c;return await n(M,1,!1)}catch{return null}}async function S(c){var w,f;const l={Accept:"application/json","Cache-Control":"no-cache",Pragma:"no-cache"},L=$t(r,c,o);let M;try{M=await g(L,{headers:l,cache:"no-cache"});const P=((f=(w=M.headers)==null?void 0:w.get)==null?void 0:f.call(w,"content-type"))??"";if(!M.ok||P&&!P.includes("json")&&!P.includes("text/plain"))throw new Error(`Risposta serie non valida (${M.status})`)}catch{if(s&&s!==r)try{const P=$t(s,c,o);if(M=await g(P,{headers:l,cache:"no-cache"}),!M.ok)return null}catch{return null}else return null}try{const P=await M.json();return Ot(P)}catch{return null}}async function e(c,l,L){const M=c.stazioni;if(M.length===0)return{corrente:c,precedente15Min:l,precedenteUnOra:L};const w=new Map;let f=0;const P=Math.min(25,M.length);async function C(){for(;f<M.length;){const N=M[f++],I=await S(N.idstazione);I&&w.set(N.idstazione,I)}}if(await Promise.all(Array.from({length:P},()=>C())),w.size===0)return{corrente:c,precedente15Min:l,precedenteUnOra:L};let F=c.time;const D=[],d=new Map;for(const N of(l==null?void 0:l.stazioni)??[])d.set(N.idstazione,N.value);const $=new Map;for(const N of(L==null?void 0:L.stazioni)??[])$.set(N.idstazione,N.value);for(const N of M){const I=w.get(N.idstazione);I?(I.ultimoTime&&I.ultimoTime>F&&(F=I.ultimoTime),D.push({...N,value:I.ultimoValore,precedente:I.ultimoValore!==null?"N":"S"}),d.set(N.idstazione,I.valore15MinPrima),$.set(N.idstazione,I.valoreUnOraPrima)):D.push(N)}const p={...c,time:F,stazioni:D},U={time:F-W,timeRichiesto:F-W,tentativi:1,stazioni:D.map(N=>({...N,value:d.get(N.idstazione)??null}))},b={time:F-j,timeRichiesto:F-j,tentativi:1,stazioni:D.map(N=>({...N,value:$.get(N.idstazione)??null}))};return{corrente:p,precedente15Min:U,precedenteUnOra:b}}async function z(c,l){const L=c===void 0,M=l!==void 0?l:L;let w;if(!L)w=await A({timeMs:c,bypassaCache:M});else{const $=bt(v())+j;let p=null,U=null;for(let b=0;b<4;b++){const N=$-b*W;try{const I=await n(N,b+1,b===0?M:!1);if(!Z(I.stazioni)&&(U||(U=I),I.stazioni.some(H=>H.value!==null&&H.precedente==="N"))){p=I;break}}catch{}}p?w=p:U?w=U:w=await A({timeMs:$,bypassaCache:M})}const f=w.time-W,P=w.time-j;let C=await R(f,L),F=await R(P,L);if(i.usaSerieGrafico!==void 0?i.usaSerieGrafico:L){const $=await e(w,C,F);w=$.corrente,C=$.precedente15Min,F=$.precedenteUnOra}else if(L&&(C||F)){const $=new Map;for(const b of(C==null?void 0:C.stazioni)??[])$.set(b.idstazione,b);const p=new Map;for(const b of(F==null?void 0:F.stazioni)??[])p.set(b.idstazione,b);const U=w.stazioni.map(b=>{if(b.value!==null)return b;const N=$.get(b.idstazione);if(N&&N.value!==null)return{...b,value:N.value,precedente:"S"};const I=p.get(b.idstazione);return I&&I.value!==null?{...b,value:I.value,precedente:"S"}:b});w={...w,stazioni:U}}return{corrente:w,precedente:C??F,precedente15Min:C,precedenteUnOra:F}}function E(){h.clear(),m.clear()}return{calcolaTimeRiferimento:zt,scaricaStazioni:A,scaricaConStorico:z,svuotaCache:E}}const kt=[{nome:"Po",da:1,a:99},{nome:"Tidone",da:100,a:199},{nome:"Trebbia",da:200,a:299},{nome:"Nure",da:300,a:309},{nome:"Chero",da:310,a:329},{nome:"Arda",da:330,a:399},{nome:"Taro",da:400,a:499},{nome:"Parma",da:500,a:599},{nome:"Enza",da:600,a:699},{nome:"Crostolo",da:700,a:799},{nome:"Secchia",da:800,a:899},{nome:"Panaro",da:900,a:919},{nome:"Naviglio-Tiepido",da:920,a:999},{nome:"Reno",da:1e3,a:1019},{nome:"Samoggia",da:1020,a:1025},{nome:"Lavino",da:1026,a:1029},{nome:"Cavo Napoleonico-Burana",da:1030,a:1035},{nome:"Ravone",da:1036,a:1039},{nome:"Navile-Savena abbandonato",da:1040,a:1049},{nome:"Savena",da:1050,a:1052},{nome:"Idice",da:1053,a:1069},{nome:"Sillaro",da:1070,a:1079},{nome:"Santerno",da:1080,a:1089},{nome:"Senio",da:1090,a:1099},{nome:"Lamone",da:1100,a:1117},{nome:"Montone-Ronco-Bidente",da:1200,a:1299},{nome:"Bevano",da:1300,a:1399},{nome:"Savio",da:1400,a:1499},{nome:"Rubicone",da:1500,a:1599},{nome:"Uso",da:1600,a:1699},{nome:"Marecchia",da:1700,a:1799},{nome:"Conca",da:1800,a:1899}],mt="CRESCENTE",ft=kt;function ut(i){return`river:${i.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}`}function Nt(i,t=ft){if(!Number.isFinite(i)||i<=0||i>=9999)return null;for(const a of t)if(i>=a.da&&i<=a.a)return a;return null}function Tt(i,t=mt){const a=t==="CRESCENTE"?1:-1;return[...i].sort((r,s)=>r.ordinamento!==s.ordinamento?(r.ordinamento-s.ordinamento)*a:r.idstazione.localeCompare(s.idstazione)*a)}function Vt(i,t=ft,a=mt){const r=new Map;for(const o of i){const g=Nt(o.ordinamento,t);if(!g)continue;const v=ut(g.nome),h=r.get(v);h?h.push(o):r.set(v,[o])}const s=[];for(const o of t){const g=ut(o.nome),v=r.get(g);v&&v.length>0&&s.push({id:g,nome:o.nome,da:o.da,a:o.a,stazioni:Tt(v,a)})}return s}function Ht(i=ft,t=mt){return{ottieniFasce:()=>i,generaIdCorsoAcqua:ut,trovaCorsoPerOrdinamento:(a,r=i)=>Nt(a,r),ordinaStazioni:(a,r=t)=>Tt(a,r),raggruppaPerCorsoAcqua:(a,r=i,s=t)=>Vt(a,r,s)}}function J(i){return i==null||!Number.isFinite(i)||i===0?null:i}function gt(i,t){if(!t)return{soglia1:J(i.soglia1),soglia2:J(i.soglia2),soglia3:J(i.soglia3),personalizzata:!1};const a=t.soglia1!==void 0?t.soglia1:i.soglia1,r=t.soglia2!==void 0?t.soglia2:i.soglia2,s=t.soglia3!==void 0?t.soglia3:i.soglia3;return{soglia1:J(a),soglia2:J(r),soglia3:J(s),personalizzata:!0}}function Gt(i,t,a){if(i===null||!Number.isFinite(i))return"nd";const{soglia1:r,soglia2:s,soglia3:o}=gt(t,a);let g=0;return r!==null&&i>=r&&(g=1),s!==null&&i>=s&&(g=2),o!==null&&i>=o&&(g=3),g}function jt(i){switch(i){case 0:return{colore:"verde",etichetta:"Normale (Livello 0 - Verde)",etichettaBreve:"Liv. 0 · Verde"};case 1:return{colore:"giallo",etichetta:"Allerta Gialla (Livello 1 - Giallo)",etichettaBreve:"Liv. 1 · Giallo"};case 2:return{colore:"arancione",etichetta:"Allerta Arancione (Livello 2 - Arancione)",etichettaBreve:"Liv. 2 · Arancione"};case 3:return{colore:"rosso",etichetta:"Allerta Rossa (Livello 3 - Rosso)",etichettaBreve:"Liv. 3 · Rosso"};case"nd":return{colore:"grigio",etichetta:"Non disponibile (n.d. - Grigio)",etichettaBreve:"n.d. · Grigio"}}}function Bt(i,t){const a=gt(i,t),r=Gt(i.value,i,t),{colore:s,etichetta:o,etichettaBreve:g}=jt(r);return{livello:r,colore:s,etichetta:o,etichettaBreve:g,soglia1Effettiva:a.soglia1,soglia2Effettiva:a.soglia2,soglia3Effettiva:a.soglia3,personalizzata:a.personalizzata}}function Jt(i){const t=J(i);return t===null?"—":`${t.toFixed(2)} m`}function Wt(){return{sogliaDefinita:J,risolviSoglieEffettive:gt,calcolaLivelloSoglia:Gt,valutaStazione:Bt,formattaSoglia:Jt}}const At=36e5,yt=.05,pt={trendCmOra:null,direzione:"nd",previsione1h:null,previsione2h:null,testoTrend:"—",testoPrevisione1h:"—",testoPrevisione2h:"—"};function Y(i,t,a=1){if(i===null||t===null||!Number.isFinite(i)||!Number.isFinite(t)||!Number.isFinite(a)||a<=0)return{...pt};const r=(i-t)*100/a,s=Math.abs(r)<1e-9?0:Number(r.toFixed(2)),o=r/100,g=Number((i+o*1).toFixed(4)),v=Number((i+o*2).toFixed(4));let h="stabile";s>=yt?h="in_aumento":s<=-yt&&(h="in_calo");const n=`${s>0?"+":""}${s.toFixed(1)} cm/h`,A=`${g.toFixed(2)} m (stima)`,R=`${v.toFixed(2)} m (stima)`;return{trendCmOra:s,direzione:h,previsione1h:g,previsione2h:v,testoTrend:n,testoPrevisione1h:A,testoPrevisione2h:R}}function Xt(i,t,a=null){const r={};if(!t&&!a){for(const n of i.stazioni)r[n.idstazione]={...pt};return r}const s=new Map;if(t)for(const n of t.stazioni)s.set(n.idstazione,n);const o=new Map;if(a)for(const n of a.stazioni)o.set(n.idstazione,n);const g=t?i.time-t.time:0,v=g>0?g/At:1,h=a?i.time-a.time:0,m=h>0?h/At:1;for(const n of i.stazioni){const A=s.get(n.idstazione),R=o.get(n.idstazione);t&&a?A&&A.value!==null&&n.precedente!=="S"?r[n.idstazione]=Y(n.value,A.value,v):R&&R.value!==null?r[n.idstazione]=Y(n.value,R.value,m):A&&A.value!==null?r[n.idstazione]=Y(n.value,A.value,v):r[n.idstazione]={...pt}:t?r[n.idstazione]=Y(n.value,(A==null?void 0:A.value)??null,v):r[n.idstazione]=Y(n.value,(R==null?void 0:R.value)??null,m)}return r}function Yt(){return{calcolaTrendStazione:Y,calcolaMappaTrend:Xt}}const Kt="monitoraggio_idraulico_er_stato_v1";function Qt(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`}function et(){return{stazioniSingole:[],gruppiMonitorati:[],gruppiPersonalizzati:[],sogliePersonalizzate:{},avvisiLivello:{},visteGruppi:{}}}function Et(i){return{stazioniSingole:[...i.stazioniSingole],gruppiMonitorati:[...i.gruppiMonitorati],gruppiPersonalizzati:i.gruppiPersonalizzati.map(t=>({id:t.id,nome:t.nome,stazioni:[...t.stazioni]})),sogliePersonalizzate:Object.fromEntries(Object.entries(i.sogliePersonalizzate).map(([t,a])=>[t,{...a}])),avvisiLivello:{...i.avvisiLivello??{}},visteGruppi:{...i.visteGruppi}}}function Zt(i){if(!i)return et();try{const t=JSON.parse(i);if(typeof t!="object"||t===null||Array.isArray(t))return et();const a=t,r=Array.isArray(a.stazioniSingole)?Array.from(new Set(a.stazioniSingole.filter(m=>typeof m=="string"))):[],s=Array.isArray(a.gruppiMonitorati)?Array.from(new Set(a.gruppiMonitorati.filter(m=>typeof m=="string"))):[],o=[];if(Array.isArray(a.gruppiPersonalizzati)){for(const m of a.gruppiPersonalizzati)if(typeof m=="object"&&m!==null&&!Array.isArray(m)){const n=m;typeof n.id=="string"&&typeof n.nome=="string"&&Array.isArray(n.stazioni)&&o.push({id:n.id,nome:n.nome,stazioni:Array.from(new Set(n.stazioni.filter(A=>typeof A=="string")))})}}const g={};if(typeof a.sogliePersonalizzate=="object"&&a.sogliePersonalizzate!==null){for(const[m,n]of Object.entries(a.sogliePersonalizzate))if(typeof n=="object"&&n!==null&&!Array.isArray(n)){const A=n;g[m]={idstazione:m,soglia1:typeof A.soglia1=="number"?A.soglia1:null,soglia2:typeof A.soglia2=="number"?A.soglia2:null,soglia3:typeof A.soglia3=="number"?A.soglia3:null}}}const v={};if(typeof a.visteGruppi=="object"&&a.visteGruppi!==null)for(const[m,n]of Object.entries(a.visteGruppi))(n==="estesa"||n==="compatta")&&(v[m]=n);const h={};if(typeof a.avvisiLivello=="object"&&a.avvisiLivello!==null)for(const[m,n]of Object.entries(a.avvisiLivello))typeof n=="number"&&Number.isFinite(n)&&(h[m]=n);return{stazioniSingole:r,gruppiMonitorati:s,gruppiPersonalizzati:o,sogliePersonalizzate:g,avvisiLivello:h,visteGruppi:v}}catch{return et()}}function ti(){const i=new Map;return{getItem(t){try{if(typeof globalThis.localStorage<"u")return globalThis.localStorage.getItem(t)}catch{}return i.get(t)??null},setItem(t,a){i.set(t,a);try{typeof globalThis.localStorage<"u"&&globalThis.localStorage.setItem(t,a)}catch{}},removeItem(t){i.delete(t);try{typeof globalThis.localStorage<"u"&&globalThis.localStorage.removeItem(t)}catch{}}}}function ii(i={}){const t=i.storage??ti(),a=i.chiaveStorage??Kt,r=i.generaUuid??Qt;let s={...i.gruppiCorsiAcquaIniziali??{}},o=Zt(t.getItem(a));const g=new Set;function v(){try{t.setItem(a,JSON.stringify(o))}catch{}const u=Et(o);for(const y of g)y(u)}function h(u){const y={...s,...u??{}};for(const T of o.gruppiPersonalizzati)y[T.id]=T.stazioni;return y}function m(u){s={...u}}function n(){return Et(o)}function A(u){return g.add(u),()=>{g.delete(u)}}function R(u){const y=u.trim();!y||o.stazioniSingole.includes(y)||(o.stazioniSingole.push(y),v())}function S(u){const y=o.stazioniSingole.indexOf(u);y!==-1&&(o.stazioniSingole.splice(y,1),v())}function e(u,y){y?R(u):S(u)}function z(u){return o.stazioniSingole.includes(u)}function E(u){const y=u.trim();!y||o.gruppiMonitorati.includes(y)||(o.gruppiMonitorati.push(y),v())}function c(u){const y=o.gruppiMonitorati.indexOf(u);y!==-1&&(o.gruppiMonitorati.splice(y,1),v())}function l(u,y){y?E(u):c(u)}function L(u){return o.gruppiMonitorati.includes(u)}function M(u,y){const T=h(u),O=new Set;for(const k of o.gruppiMonitorati){if(y&&k===y)continue;const B=T[k];if(B)for(const V of B)O.add(V)}return O}function w(u){const y=M(u);for(const T of o.stazioniSingole)y.add(T);return y}function f(u,y){return o.stazioniSingole.includes(u)?!0:M(y).has(u)}function P(u){const y=M(u);return o.stazioniSingole.filter(T=>!y.has(T))}function C(){return o.gruppiPersonalizzati.map(u=>({id:u.id,nome:u.nome,stazioni:[...u.stazioni]}))}function F(u,y){const T=u.trim();if(!T)throw new Error("Il nome del gruppo è obbligatorio.");if(o.gruppiPersonalizzati.some(k=>k.id!==y&&k.nome.toLowerCase()===T.toLowerCase()))throw new Error(`Esiste già un gruppo personalizzato chiamato "${T}".`);return T}function D(u,y=[]){const T=F(u),O=`custom:${r()}`,k=Array.from(new Set(y.map(V=>V.trim()).filter(Boolean))),B={id:O,nome:T,stazioni:k};return o.gruppiPersonalizzati.push(B),o.gruppiMonitorati.includes(O)||o.gruppiMonitorati.push(O),v(),{...B,stazioni:[...B.stazioni]}}function d(u,y){const T=o.gruppiPersonalizzati.find(k=>k.id===u);if(!T)throw new Error(`Gruppo personalizzato non trovato: ${u}`);const O=F(y,u);return T.nome=O,v(),{...T,stazioni:[...T.stazioni]}}function $(u,y){const T=o.gruppiPersonalizzati.find(O=>O.id===u);if(!T)throw new Error(`Gruppo personalizzato non trovato: ${u}`);return T.stazioni=Array.from(new Set(y.map(O=>O.trim()).filter(Boolean))),v(),{...T,stazioni:[...T.stazioni]}}function p(u,y){const T=o.gruppiPersonalizzati.find(V=>V.id===u);if(!T)throw new Error(`Gruppo personalizzato non trovato: ${u}`);const O=M(y,u),k=[],B=[];for(const V of T.stazioni)O.has(V)?B.push(V):k.push(V);return{totaleStazioniNelGruppo:T.stazioni.length,stazioniCheSmetteranno:k,stazioniSalvateDaAltriGruppi:B}}function U(u,y){const T=o.gruppiPersonalizzati.findIndex(V=>V.id===u);if(T===-1)throw new Error(`Gruppo personalizzato non trovato: ${u}`);const O=p(u,y),[k]=o.gruppiPersonalizzati.splice(T,1);o.gruppiMonitorati=o.gruppiMonitorati.filter(V=>V!==u);const B=new Set(k.stazioni);return o.stazioniSingole=o.stazioniSingole.filter(V=>!B.has(V)),delete o.visteGruppi[u],v(),{gruppoEliminato:{...k,stazioni:[...k.stazioni]},stazioniSmesseDiMonitorare:O.stazioniCheSmetteranno,stazioniRimasteInAltriGruppi:O.stazioniSalvateDaAltriGruppi}}function b(u){return o.visteGruppi[u]??"estesa"}function N(u,y){o.visteGruppi[u]=y,v()}function I(u){const T=b(u)==="estesa"?"compatta":"estesa";return N(u,T),T}function _(u){const y=o.sogliePersonalizzate[u];return y?{...y}:null}function H(){return Object.fromEntries(Object.entries(o.sogliePersonalizzate).map(([u,y])=>[u,{...y}]))}function K(u){o.sogliePersonalizzate[u.idstazione]={idstazione:u.idstazione,soglia1:u.soglia1,soglia2:u.soglia2,soglia3:u.soglia3},v()}function tt(u){u in o.sogliePersonalizzate&&(delete o.sogliePersonalizzate[u],v())}function it(u){const T=(o.avvisiLivello??{})[u];return typeof T=="number"&&Number.isFinite(T)?T:null}function Q(){return{...o.avvisiLivello??{}}}function ot(u,y){Number.isFinite(y)&&(o.avvisiLivello||(o.avvisiLivello={}),o.avvisiLivello[u]=Number(y.toFixed(2)),v())}function at(u){!o.avvisiLivello||!(u in o.avvisiLivello)||(delete o.avvisiLivello[u],v())}return{impostaMappaGruppiEsterni:m,ottieniSnapshot:n,iscrivi:A,aggiungiStazioneSingola:R,rimuoviStazioneSingola:S,impostaStazioneSingola:e,isStazioneAggiuntaSingolarmente:z,monitoraGruppo:E,smettiMonitoraggioGruppo:c,impostaMonitoraggioGruppo:l,isGruppoMonitorato:L,isStazioneMonitorata:f,ottieniStazioniMonitorate:w,ottieniStazioniSoloSingole:P,ottieniGruppiPersonalizzati:C,creaGruppoPersonalizzato:D,rinominaGruppoPersonalizzato:d,aggiornaStazioniGruppoPersonalizzato:$,calcolaImpattoEliminazioneGruppo:p,eliminaGruppoPersonalizzato:U,ottieniVistaGruppo:b,impostaVistaGruppo:N,alternaVistaGruppo:I,ottieniSogliaPersonalizzata:_,ottieniTutteSogliePersonalizzate:H,impostaSogliaPersonalizzata:K,ripristinaSogliaUfficiale:tt,ottieniAvvisoLivello:it,ottieniTuttiAvvisiLivello:Q,impostaAvvisoLivello:ot,rimuoviAvvisoLivello:at}}function oi(i){try{const t=i+"=",a=document.cookie.split(";");for(const r of a){const s=r.trim();if(s.startsWith(t))return decodeURIComponent(s.substring(t.length))}}catch{}return null}function Ct(i,t,a=365){try{const r=new Date;r.setTime(r.getTime()+a*24*60*60*1e3),document.cookie=`${i}=${encodeURIComponent(t)};expires=${r.toUTCString()};path=/;SameSite=Lax`}catch{}}function Lt(){try{const i=globalThis.AudioContext??globalThis.webkitAudioContext;if(!i)return;const t=new i,a=t.createOscillator(),r=t.createGain();a.connect(r),r.connect(t.destination),a.type="sine",a.frequency.setValueAtTime(880,t.currentTime),r.gain.setValueAtTime(.3,t.currentTime),r.gain.exponentialRampToValueAtTime(.01,t.currentTime+.15),r.gain.setValueAtTime(.3,t.currentTime+.23),r.gain.exponentialRampToValueAtTime(.01,t.currentTime+.38),a.start(t.currentTime),a.stop(t.currentTime+.4),a.onended=()=>{t.close().catch(()=>{})}}catch{}}function ai(){return typeof globalThis.Notification>"u"?null:{get permission(){return globalThis.Notification.permission},requestPermission(){return globalThis.Notification.requestPermission()},creaNotifica(i,t){new globalThis.Notification(i,{...t,requireInteraction:(t==null?void 0:t.requireInteraction)??!0})}}}const nt="notifiche_attive";function ei(i={}){const t=i.notificationApi!==void 0?i.notificationApi:ai(),a=!i.disabilitaCookie,r=!i.disabilitaSuono;let s;if(i.attivoInizialmente!==void 0)s=i.attivoInizialmente;else if(a){const e=oi(nt);e==="1"?s=t!==null&&t.permission==="granted":e==="0"?s=!1:s=t!==null&&t.permission==="granted"}else s=t!==null&&t.permission==="granted";function o(){a&&(s?Ct(nt,"1"):Ct(nt,"0"))}const g=new Map,v=new Map;function h(){return t?t.permission:"unsupported"}function m(){return s&&h()==="granted"}async function n(){if(!t)return s=!1,o(),"unsupported";if(t.permission==="granted")return s=!0,o(),"granted";const e=await t.requestPermission();return s=e==="granted",o(),e}function A(){s=!1,o()}function R(e,z,E){const c=[];for(const l of e){if(E&&l.value!==null){const f=E(l.idstazione);f!==null&&Number.isFinite(f)&&(l.value>=f?v.get(l.idstazione)!==f&&(v.set(l.idstazione,f),m()&&t&&(t.creaNotifica(`Avviso Livello Acqua: ${l.nomestaz}`,{body:`Raggiunto livello di ${l.value.toFixed(2)} m (avviso impostato a ${f.toFixed(2)} m)`,tag:`avviso-metri-${l.idstazione}-${f}`,requireInteraction:!0}),r&&Lt())):v.delete(l.idstazione))}const L=z(l);if(L.livello==="nd")continue;const M=L.livello,w=g.get(l.idstazione);if(g.set(l.idstazione,M),w!==void 0&&M>w){const f={idstazione:l.idstazione,nomestaz:l.nomestaz,livelloPrecedente:w,livelloAttuale:M,valore:l.value,etichettaAttuale:L.etichetta};if(c.push(f),m()&&t){const P=l.value!==null?`${l.value.toFixed(2)} m`:"n.d.";t.creaNotifica(`Allerta Idrometrica: ${l.nomestaz}`,{body:`Livello salito da ${w} a ${M} (${L.etichettaBreve}) — Valore: ${P}`,tag:`allerta-${l.idstazione}-liv-${M}`,requireInteraction:!0}),r&&Lt()}}}return c}function S(){g.clear(),v.clear()}return{ottieniPermesso:h,isAttivo:m,attivaNotifiche:n,disattivaNotifiche:A,controllaEInviaNotifiche:R,resettaStatoLivelli:S}}function q(i){return i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ni(i){if(i===null||!Number.isFinite(i))return"--:--";const t=new Date(i),a=String(t.getHours()).padStart(2,"0"),r=String(t.getMinutes()).padStart(2,"0");return`${a}:${r}`}function si(i){return i===null||!Number.isFinite(i)?"n.d.":`${i.toFixed(2)} m`}function wt(i,t){switch(t){case"blu":return!0;case"verde":return i===0;case"giallo":return i===1;case"arancione":return i===2;case"rosso":return i===3}}function ri(i,t){let a="blu",r=null;function s(m){const n=t.statoUtente.ottieniSogliaPersonalizzata(m.idstazione);return t.soglie.valutaStazione(m,n)}function o(m,n,A,R){var f,P;const S=lt(m.idstazione);if(R==="compatta")return`
        <article
          class="stazione-card stazione-card-compatta"
          data-stazione-id="${q(m.idstazione)}"
          data-vista="compatta"
          data-livello="${String(n.livello)}"
        >
          <span class="stazione-compatta-nome">${q(m.nomestaz)}</span>
          <div style="display:inline-flex;align-items:center;gap:8px;">
            <a
              href="${q(S)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondario btn-sm"
              data-azione="apri-grafico"
              data-idstazione="${q(m.idstazione)}"
            >
              📈 Grafico
            </a>
            <span
              class="stazione-compatta-stato stato-${n.colore}"
              aria-label="${q(n.etichetta)}"
              title="${q(n.etichetta)}"
            >
              <span class="pallino-stato pallino-${n.colore}" aria-hidden="true"></span>
              <span class="sr-only">${q(n.etichettaBreve)}</span>
            </span>
          </div>
        </article>
      `;const e=A.direzione==="in_aumento"?"↗":A.direzione==="in_calo"?"↘":A.direzione==="stabile"?"→":"·",z=t.soglie.formattaSoglia(n.soglia1Effettiva),E=t.soglie.formattaSoglia(n.soglia2Effettiva),c=t.soglie.formattaSoglia(n.soglia3Effettiva),l=((P=(f=t.statoUtente).ottieniAvvisoLivello)==null?void 0:P.call(f,m.idstazione))??null,L=l!==null&&m.value!==null&&m.value>=l,w=r===m.idstazione?`<form class="form-soglie-personalizzate" data-azione="salva-avviso-metri-mon" data-idstazione="${q(m.idstazione)}">
          <p class="sezione-sottotitolo" style="margin-bottom:6px;">
            Ricevi una notifica quando il livello dell'acqua raggiunge questa quota in metri (le soglie ARPAE restano invariate):
          </p>
          <div class="form-crea-gruppo">
            <input
              type="text"
              inputmode="decimal"
              name="quotaAvviso"
              value="${l!==null?q(String(l)):""}"
              placeholder="Livello in metri (es. 1.50)"
            />
            <button type="submit" class="btn btn-primario btn-sm">Salva</button>
            ${l!==null?`<button type="button" class="btn btn-pericolo btn-sm" data-azione="rimuovi-avviso-metri-mon" data-idstazione="${q(m.idstazione)}">Rimuovi</button>`:""}
            <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-avviso-metri-mon">Annulla</button>
          </div>
        </form>`:"";return`
      <article
        class="stazione-card stazione-card-estesa bordostato-${n.colore}"
        data-stazione-id="${q(m.idstazione)}"
        data-vista="estesa"
        data-livello="${String(n.livello)}"
      >
        <div class="stazione-estesa-header">
          <div class="stazione-estesa-titolo-wrap">
            <h4 class="stazione-estesa-nome">${q(m.nomestaz)}</h4>
            <div class="stazione-icone-secondarie">
              <span class="icona-secondaria" title="Ordinamento idraulico">🧭 #${m.ordinamento}</span>
              <span class="icona-secondaria" title="Direzione trend">${e}</span>
              ${n.personalizzata?'<span class="icona-secondaria badge-soglia-custom" title="Soglie personalizzate attive">⚙ Soglie pers.</span>':""}
              ${l!==null?`<span class="icona-secondaria ${L?"stato-rosso badge-stato":""}" data-avviso-card="${q(m.idstazione)}">🔔 Avviso: ${l.toFixed(2)} m${L?" (RAGGIUNTO!)":""}</span>`:""}
            </div>
          </div>
          <div class="stazione-estesa-stato-wrap">
            <span class="valore-principale" data-valore>${si(m.value)}</span>
            <span
              class="badge-stato stato-${n.colore}"
              aria-label="${q(n.etichetta)}"
            >
              <span class="pallino-stato pallino-${n.colore}" aria-hidden="true"></span>
              <span>${q(n.etichettaBreve)}</span>
            </span>
          </div>
        </div>

        <div class="stazione-estesa-metriche">
          <div class="metrica-box">
            <span class="metrica-label">Trend orario</span>
            <strong class="metrica-valore" data-trend>${q(A.testoTrend)}</strong>
          </div>
          <div class="metrica-box">
            <span class="metrica-label">Prev. +1h</span>
            <strong class="metrica-valore" data-prev1h>${q(A.testoPrevisione1h)}</strong>
          </div>
          <div class="metrica-box">
            <span class="metrica-label">Prev. +2h</span>
            <strong class="metrica-valore" data-prev2h>${q(A.testoPrevisione2h)}</strong>
          </div>
        </div>

        <div class="stazione-estesa-soglie" data-soglie>
          <span>S1 (Gialla): <strong>${q(z)}</strong></span>
          <span>S2 (Arancione): <strong>${q(E)}</strong></span>
          <span>S3 (Rossa): <strong>${q(c)}</strong></span>
          <a
            href="${q(S)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondario btn-sm"
            data-azione="apri-grafico"
            data-idstazione="${q(m.idstazione)}"
          >
            📈 Grafico
          </a>
          <button
            type="button"
            class="btn-link"
            data-azione="apri-avviso-metri-mon"
            data-idstazione="${q(m.idstazione)}"
          >
            ${l!==null?`🔔 Modifica avviso (${l.toFixed(2)} m)`:"🔔 Imposta avviso notifica (m)"}
          </button>
        </div>
        ${w}
      </article>
    `}function g(){const m=t.ottieniStatoDati(),n=m.stazioni,A=new Map;for(const d of n)A.set(d.idstazione,d);const R=m.corsiAcqua??t.corsiAcqua.raggruppaPerCorsoAcqua(n),S={};for(const d of R)S[d.id]=d.stazioni.map($=>$.idstazione);const e=t.statoUtente.ottieniStazioniMonitorate(S),z={blu:0,verde:0,giallo:0,arancione:0,rosso:0};for(const d of e){const $=A.get(d);if(!$)continue;z.blu++;const p=s($);p.livello===0?z.verde++:p.livello===1?z.giallo++:p.livello===2?z.arancione++:p.livello===3&&z.rosso++}const E=ni(m.timeRilevazione),c=m.ultimoControlloMs&&Number.isFinite(m.ultimoControlloMs)?new Date(m.ultimoControlloMs).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):null;let l="";if(t.notifiche){const d=t.notifiche.isAttivo(),$=t.notifiche.ottieniPermesso();l=`
        <button
          type="button"
          class="btn ${d?"btn-notifiche-attive":"btn-secondario"} btn-sm"
          data-azione="toggle-notifiche"
          ${$==="unsupported"?"disabled":""}
        >
          ${$==="unsupported"?"Notifiche non supportate":d?"🔔 Notifiche attive":"🔕 Attiva notifiche"}
        </button>
      `}const M=[{id:"blu",titolo:"Tutte",sottotitolo:"Blu (incl. n.d.)"},{id:"verde",titolo:"Liv. 0",sottotitolo:"Verde"},{id:"giallo",titolo:"Liv. 1",sottotitolo:"Giallo"},{id:"arancione",titolo:"Liv. 2",sottotitolo:"Arancione"},{id:"rosso",titolo:"Liv. 3",sottotitolo:"Rosso"}].map(d=>{const $=a===d.id;return`
          <button
            type="button"
            class="filtro-circolare filtro-${d.id} ${$?"filtro-attivo":""}"
            data-azione="seleziona-filtro"
            data-filtro="${d.id}"
            aria-pressed="${$}"
            aria-label="Filtro ${d.titolo} (${d.sottotitolo}): ${z[d.id]} stazioni"
          >
            <span class="filtro-cerchio">
              <span class="filtro-contatore" data-contatore-filtro="${d.id}">${z[d.id]}</span>
            </span>
            <span class="filtro-etichetta">${d.titolo}</span>
          </button>
        `}).join(""),w=[];for(const d of R)t.statoUtente.isGruppoMonitorato(d.id)&&w.push({id:d.id,nome:d.nome,tipo:"Corso d’acqua",stazioni:t.corsiAcqua.ordinaStazioni(d.stazioni)});for(const d of t.statoUtente.ottieniGruppiPersonalizzati())if(t.statoUtente.isGruppoMonitorato(d.id)){const $=d.stazioni.map(p=>A.get(p)).filter(p=>p!==void 0);w.push({id:d.id,nome:d.nome,tipo:"Gruppo personalizzato",stazioni:t.corsiAcqua.ordinaStazioni($)})}const f=w.map(d=>{const $=t.statoUtente.ottieniVistaGruppo(d.id),p=d.stazioni.filter(I=>wt(s(I).livello,a));if(p.length===0)return"";const U=p.map(I=>{const _=s(I),H=m.mappaTrend[I.idstazione]??t.trend.calcolaTrendStazione(I.value,null);return o(I,_,H,$)}).join(""),b=$==="estesa"?"▲":"▼",N=$==="estesa"?"Vista estesa":"Vista compatta";return`
          <section class="gruppo-monitorato-section" data-gruppo-monitorato="${q(d.id)}" data-vista-gruppo="${$}">
            <header class="gruppo-monitorato-header">
              <button
                type="button"
                class="btn-toggle-vista-gruppo"
                data-azione="toggle-vista-gruppo"
                data-gruppo-id="${q(d.id)}"
                aria-label="Alterna vista per ${q(d.nome)} (attuale: ${N})"
              >
                <span class="chevron-vista" aria-hidden="true">${b}</span>
                <span class="gruppo-monitorato-titolo">${q(d.nome)}</span>
                <span class="gruppo-monitorato-badge">${q(d.tipo)} · ${p.length}</span>
              </button>
            </header>
            <div class="gruppo-monitorato-lista lista-${$}">
              ${U}
            </div>
          </section>
        `}).filter(Boolean).join(""),C=t.statoUtente.ottieniStazioniSoloSingole(S).map(d=>A.get(d)).filter(d=>d!==void 0).filter(d=>wt(s(d).livello,a));let F="";if(C.length>0){const d=t.statoUtente.ottieniVistaGruppo("single:stazioni"),$=C.map(p=>{const U=s(p),b=m.mappaTrend[p.idstazione]??t.trend.calcolaTrendStazione(p.value,null);return o(p,U,b,d)}).join("");F=`
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
              <span class="gruppo-monitorato-badge">${C.length}</span>
            </button>
          </header>
          <div class="gruppo-monitorato-lista lista-${d}">
            ${$}
          </div>
        </section>
      `}let D="";m.errore?D=`
        <div class="card stato-errore-box" role="alert" data-stato-errore>
          <h3>Errore nel caricamento dei dati</h3>
          <p>${q(m.errore)}</p>
          <button type="button" class="btn btn-primario" data-azione="riprova-caricamento">
            Riprova
          </button>
        </div>
      `:m.caricamento&&n.length===0?D=`
        <div class="card stato-caricamento-box" data-stato-caricamento>
          <p>Caricamento dei livelli idrometrici in corso...</p>
        </div>
      `:e.size===0?D=`
        <div class="card stato-vuoto-box" data-stato-vuoto>
          <h3>Nessuna stazione o gruppo monitorato</h3>
          <p>Aggiungi corsi d'acqua o singole stazioni idrometriche dal catalogo ARPAE per iniziare il monitoraggio.</p>
          <a href="#/arpae" class="btn btn-primario" data-azione="vai-ad-arpae">
            Vai al catalogo ARPAE
          </a>
        </div>
      `:!f&&!F?D=`
        <div class="card stato-nessun-risultato-filtro" data-nessun-risultato-filtro>
          <p>Nessuna stazione monitorata corrisponde al filtro selezionato.</p>
        </div>
      `:D=`
        ${f}
        ${F}
      `,i.innerHTML=`
      <div class="pagina pagina-monitoraggio">
        <div class="monitoraggio-toolbar">
          <div class="toolbar-info">
            <span class="ultimo-aggiornamento" data-ultimo-aggiornamento>
              Ultimo aggiornamento ${E}${c?` · Verificato alle ${c}`:""}
            </span>
          </div>
          <div class="toolbar-azioni">
            ${l}
            <button
              type="button"
              class="btn btn-secondario btn-sm"
              data-azione="aggiorna-dati"
              title="Scarica subito i dati più recenti da ARPAE senza attendere il controllo automatico al minuto"
              ${m.caricamento?"disabled":""}
            >
              ${m.caricamento?"Aggiornamento...":"↻ Aggiorna"}
            </button>
          </div>
        </div>

        <nav class="barra-filtri-rapidi" aria-label="Filtri rapidi per livello di allerta" data-barra-filtri>
          ${M}
        </nav>

        <div class="monitoraggio-contenuto" data-monitoraggio-contenuto>
          ${D}
        </div>
      </div>
    `}function v(m){var E,c;const n=m.target;if(!n)return;const A=n.closest('[data-azione="seleziona-filtro"]');if(A){const l=A.dataset.filtro;l&&(a===l&&l!=="blu"?a="blu":a=l,g());return}const R=n.closest('[data-azione="toggle-vista-gruppo"]');if(R){const l=R.dataset.gruppoId;l&&(t.statoUtente.alternaVistaGruppo(l),g());return}if(n.closest('[data-azione="aggiorna-dati"]')||n.closest('[data-azione="riprova-caricamento"]')){t.richiediAggiornamento();return}if(n.closest('[data-azione="toggle-notifiche"]')&&t.notifiche){t.notifiche.isAttivo()?(t.notifiche.disattivaNotifiche(),g()):t.notifiche.attivaNotifiche().then(()=>{g()});return}const S=n.closest('[data-azione="apri-avviso-metri-mon"]');if(S){const l=S.dataset.idstazione??null;r=r===l?null:l,g();return}if(n.closest('[data-azione="chiudi-avviso-metri-mon"]')){r=null,g();return}const e=n.closest('[data-azione="rimuovi-avviso-metri-mon"]');if(e){const l=e.dataset.idstazione;l&&((c=(E=t.statoUtente).rimuoviAvvisoLivello)==null||c.call(E,l),r=null,g());return}n.closest('[data-azione="vai-ad-arpae"]')&&t.navigaA&&(m.preventDefault(),t.navigaA("#/arpae"))}function h(m){var e,z,E,c;const n=m.target;if(!(n instanceof HTMLFormElement)||n.dataset.azione!=="salva-avviso-metri-mon")return;m.preventDefault();const A=n.dataset.idstazione;if(!A)return;const R=new FormData(n),S=String(R.get("quotaAvviso")??"").trim().replace(",",".");if(!S)(z=(e=t.statoUtente).rimuoviAvvisoLivello)==null||z.call(e,A);else{const l=Number(S);Number.isFinite(l)&&((c=(E=t.statoUtente).impostaAvvisoLivello)==null||c.call(E,A,l))}r=null,g()}return i.addEventListener("click",v),i.addEventListener("submit",h),g(),{aggiorna:g,smonta:()=>{i.removeEventListener("click",v),i.removeEventListener("submit",h),i.innerHTML=""}}}function G(i){return i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Mt(i){return i===null||!Number.isFinite(i)?"n.d.":`${i.toFixed(2)} m`}function st(i){const t=i.trim().replace(",",".");if(!t)return null;const a=Number(t);return!Number.isFinite(a)||a===0?null:a}function li(i,t){let a="",r="",s=null,o=null;const g=new Set;function v(S){const e={};for(const z of S)e[z.id]=z.stazioni.map(E=>E.idstazione);return e}function h(){var d,$;const S=t.ottieniStazioni(),e=((d=t.ottieniCorsiAcqua)==null?void 0:d.call(t))??t.corsiAcqua.raggruppaPerCorsoAcqua(S),z=(($=t.ottieniMappaTrend)==null?void 0:$.call(t))??{},E=v(e),c=a.trim().toLowerCase(),l=c?e.filter(p=>p.nome.toLowerCase().includes(c)||p.stazioni.some(U=>U.nomestaz.toLowerCase().includes(c))):e,L=r.trim().toLowerCase(),M=L?S.filter(p=>p.nomestaz.toLowerCase().includes(L)):S,w=l.map(p=>{const U=t.statoUtente.isGruppoMonitorato(p.id),b=g.has(p.id),N=b?`<ul class="arpae-corso-stazioni" data-corso-stazioni="${G(p.id)}">
              ${p.stazioni.map(I=>{const _=t.statoUtente.ottieniSogliaPersonalizzata(I.idstazione),H=t.soglie.valutaStazione(I,_),K=lt(I.idstazione);return`<li class="arpae-corso-stazione-item" data-idstazione="${G(I.idstazione)}" data-ordinamento="${I.ordinamento}">
                    <span class="staz-ord">#${I.ordinamento}</span>
                    <span class="staz-nome">${G(I.nomestaz)}</span>
                    <span class="staz-valore">${Mt(I.value)}</span>
                    <span class="badge-stato stato-${H.colore}" aria-label="${G(H.etichetta)}">${G(H.etichettaBreve)}</span>
                    <a
                      href="${G(K)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn btn-secondario btn-sm"
                      data-azione="apri-grafico"
                      data-idstazione="${G(I.idstazione)}"
                    >📈 Grafico</a>
                  </li>`}).join("")}
            </ul>`:"";return`<article class="card arpae-corso-card ${U?"corso-monitorato":""}" data-corso-id="${G(p.id)}">
          <div class="arpae-corso-header">
            <button type="button" class="btn-espandi-corso" data-azione="toggle-espandi-corso" data-corso-id="${G(p.id)}" aria-expanded="${b}">
              <span class="chevron" aria-hidden="true">${b?"▲":"▼"}</span>
              <span class="corso-titolo">${G(p.nome)}</span>
              <span class="corso-conteggio">(${p.stazioni.length} stazioni)</span>
            </button>
            <label class="toggle-monitora-gruppo">
              <input
                type="checkbox"
                data-azione="toggle-monitora-corso"
                data-corso-id="${G(p.id)}"
                ${U?"checked":""}
              />
              <span>Monitora gruppo</span>
            </label>
          </div>
          ${N}
        </article>`}).join(""),f=M.map(p=>{var V,vt;const U=t.statoUtente.ottieniSogliaPersonalizzata(p.idstazione),b=t.soglie.valutaStazione(p,U),N=t.statoUtente.isStazioneAggiuntaSingolarmente(p.idstazione),_=t.statoUtente.isStazioneMonitorata(p.idstazione,E)&&!N,H=lt(p.idstazione),K=t.soglie.formattaSoglia(b.soglia1Effettiva),tt=t.soglie.formattaSoglia(b.soglia2Effettiva),it=t.soglie.formattaSoglia(b.soglia3Effettiva),Q=z[p.idstazione]??{testoTrend:"—",testoPrevisione1h:"—",testoPrevisione2h:"—"},ot=s===p.idstazione,at=o===p.idstazione,u=((vt=(V=t.statoUtente).ottieniAvvisoLivello)==null?void 0:vt.call(V,p.idstazione))??null,y=b.soglia1Effettiva!==null?String(b.soglia1Effettiva):"",T=b.soglia2Effettiva!==null?String(b.soglia2Effettiva):"",O=b.soglia3Effettiva!==null?String(b.soglia3Effettiva):"",k=at?`<form class="form-soglie-personalizzate" data-azione="salva-avviso-metri" data-idstazione="${G(p.idstazione)}">
              <p class="sezione-sottotitolo" style="margin-bottom:6px;">
                Imposta un livello dell'acqua (in metri) raggiunto il quale ricevere una notifica, <strong>senza modificare le soglie ufficiali ARPAE</strong>:
              </p>
              <div class="form-crea-gruppo" style="margin-bottom:8px;">
                <input
                  type="text"
                  inputmode="decimal"
                  name="quotaAvviso"
                  value="${u!==null?G(String(u)):""}"
                  placeholder="Es. 1.50 (in metri)"
                />
                <button type="submit" class="btn btn-primario btn-sm">Salva avviso</button>
                ${u!==null?`<button type="button" class="btn btn-pericolo btn-sm" data-azione="rimuovi-avviso-metri" data-idstazione="${G(p.idstazione)}">Rimuovi avviso</button>`:""}
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-avviso-metri">Annulla</button>
              </div>
            </form>`:"",B=ot?`<form class="form-soglie-personalizzate" data-azione="salva-soglie" data-idstazione="${G(p.idstazione)}">
              <div class="form-soglie-grid">
                <label>
                  <span>Soglia 1 (Gialla, m)</span>
                  <input type="text" inputmode="decimal" name="soglia1" value="${G(y)}" placeholder="—" />
                </label>
                <label>
                  <span>Soglia 2 (Arancione, m)</span>
                  <input type="text" inputmode="decimal" name="soglia2" value="${G(T)}" placeholder="—" />
                </label>
                <label>
                  <span>Soglia 3 (Rossa, m)</span>
                  <input type="text" inputmode="decimal" name="soglia3" value="${G(O)}" placeholder="—" />
                </label>
              </div>
              <div class="form-soglie-azioni">
                <button type="submit" class="btn btn-primario btn-sm">Salva soglie</button>
                ${b.personalizzata?`<button type="button" class="btn btn-secondario btn-sm" data-azione="ripristina-soglie" data-idstazione="${G(p.idstazione)}">Ripristina soglie ufficiali</button>`:""}
                <button type="button" class="btn btn-neutro btn-sm" data-azione="chiudi-soglie">Annulla</button>
              </div>
            </form>`:"";return`<article class="card arpae-stazione-card" data-stazione-card="${G(p.idstazione)}">
          <div class="arpae-stazione-top">
            <div class="arpae-stazione-info">
              <h4 class="arpae-stazione-nome">${G(p.nomestaz)}</h4>
              <div class="arpae-stazione-valore-row">
                <span class="valore-idrometrico" data-valore-stazione="${G(p.idstazione)}">${Mt(p.value)}</span>
                <span class="badge-stato stato-${b.colore}" data-stato-stazione="${G(p.idstazione)}" aria-label="${G(b.etichetta)}">
                  <span class="pallino-stato pallino-${b.colore}" aria-hidden="true"></span>
                  <span>${G(b.etichettaBreve)}</span>
                </span>
                ${b.personalizzata?`<span class="badge-custom-soglia" data-badge-personalizzata="${G(p.idstazione)}">Soglie personalizzate</span>`:""}
              </div>
            </div>
            <div class="arpae-stazione-controlli">
              <label class="toggle-monitora-stazione">
                <input
                  type="checkbox"
                  data-azione="toggle-monitora-stazione"
                  data-idstazione="${G(p.idstazione)}"
                  ${N||_?"checked":""}
                />
                <span>Monitora${_?" (da gruppo)":""}</span>
              </label>
            </div>
          </div>

          <div class="arpae-stazione-soglie" data-soglie-stazione="${G(p.idstazione)}">
            <span>Trend: <strong>${G(Q.testoTrend)}</strong></span>
            <span>Prev. +1h: <strong>${G(Q.testoPrevisione1h)}</strong></span>
            <span>Prev. +2h: <strong>${G(Q.testoPrevisione2h)}</strong></span>
            <span>Soglia 1: <strong>${G(K)}</strong></span>
            <span>Soglia 2: <strong>${G(tt)}</strong></span>
            <span>Soglia 3: <strong>${G(it)}</strong></span>
            ${u!==null?`<span class="badge-custom-soglia" data-avviso-attivo="${G(p.idstazione)}">🔔 Avviso a <strong>${u.toFixed(2)} m</strong></span>`:""}
            <a
              href="${G(H)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondario btn-sm"
              data-azione="apri-grafico"
              data-idstazione="${G(p.idstazione)}"
            >
              📈 Grafico
            </a>
            <button
              type="button"
              class="btn-link"
              data-azione="apri-avviso-metri"
              data-idstazione="${G(p.idstazione)}"
            >
              ${u!==null?"🔔 Modifica avviso (m)":"🔔 Imposta avviso notifica (m)"}
            </button>
            <button
              type="button"
              class="btn-link"
              data-azione="apri-soglie"
              data-idstazione="${G(p.idstazione)}"
            >
              ${b.personalizzata?"Modifica/Ripristina soglie":"Personalizza soglie"}
            </button>
          </div>
          ${k}
          ${B}
        </article>`}).join(""),P=document.activeElement,C=P instanceof HTMLInputElement&&(P.dataset.azione==="ricerca-stazioni"||P.dataset.azione==="ricerca-corsi")?P.dataset.azione:null,F=C&&P instanceof HTMLInputElement?P.selectionStart:null,D=C&&P instanceof HTMLInputElement?P.selectionEnd:null;if(i.innerHTML=`
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
                value="${G(a)}"
              />
            </div>
          </div>
          <div class="lista-corsi-acqua" data-lista-corsi>
            ${w||'<p class="stato-vuoto-testo">Nessun corso d’acqua corrisponde alla ricerca.</p>'}
          </div>
        </section>

        <section class="sezione-arpae-stazioni" aria-labelledby="titolo-elenco-stazioni">
          <div class="sezione-header">
            <h2 id="titolo-elenco-stazioni">Elenco completo stazioni (${M.length})</h2>
            <div class="barra-ricerca">
              <label for="input-ricerca-arpae" class="sr-only">Cerca stazione per nome</label>
              <input
                id="input-ricerca-arpae"
                type="search"
                class="input-ricerca"
                data-azione="ricerca-stazioni"
                placeholder="Cerca stazione per nome..."
                value="${G(r)}"
              />
            </div>
          </div>
          <div class="lista-stazioni-arpae" data-lista-stazioni>
            ${f||'<p class="stato-vuoto-testo">Nessuna stazione corrisponde alla ricerca.</p>'}
          </div>
        </section>
      </div>
    `,C){const p=i.querySelector(`input[data-azione="${C}"]`);p&&(p.focus(),F!==null&&D!==null&&p.setSelectionRange(F,D))}}function m(S){var f,P;const e=S.target;if(!e)return;const z=e.closest('[data-azione="toggle-espandi-corso"]');if(z){const C=z.dataset.corsoId;C&&(g.has(C)?g.delete(C):g.add(C),h());return}const E=e.closest('[data-azione="apri-avviso-metri"]');if(E){const C=E.dataset.idstazione??null;o=o===C?null:C,s=null,h();return}if(e.closest('[data-azione="chiudi-avviso-metri"]')){o=null,h();return}const l=e.closest('[data-azione="rimuovi-avviso-metri"]');if(l){const C=l.dataset.idstazione;C&&((P=(f=t.statoUtente).rimuoviAvvisoLivello)==null||P.call(f,C),o=null,h());return}const L=e.closest('[data-azione="apri-soglie"]');if(L){const C=L.dataset.idstazione??null;s=s===C?null:C,o=null,h();return}if(e.closest('[data-azione="chiudi-soglie"]')){s=null,h();return}const w=e.closest('[data-azione="ripristina-soglie"]');if(w){const C=w.dataset.idstazione;C&&(t.statoUtente.ripristinaSogliaUfficiale(C),s=null,h());return}}function n(S){const e=S.target;if(e){if(e instanceof HTMLInputElement&&e.dataset.azione==="toggle-monitora-corso"){const z=e.dataset.corsoId;z&&(t.statoUtente.impostaMonitoraggioGruppo(z,e.checked),h());return}if(e instanceof HTMLInputElement&&e.dataset.azione==="toggle-monitora-stazione"){const z=e.dataset.idstazione;z&&(t.statoUtente.impostaStazioneSingola(z,e.checked),h());return}}}function A(S){const e=S.target;if(e instanceof HTMLInputElement){if(e.dataset.azione==="ricerca-corsi"){a=e.value,h();return}e.dataset.azione==="ricerca-stazioni"&&(r=e.value,h())}}function R(S){var M,w,f,P;const e=S.target;if(!(e instanceof HTMLFormElement))return;if(e.dataset.azione==="salva-avviso-metri"){S.preventDefault();const C=e.dataset.idstazione;if(!C)return;const F=new FormData(e),D=String(F.get("quotaAvviso")??"").trim().replace(",",".");if(!D)(w=(M=t.statoUtente).rimuoviAvvisoLivello)==null||w.call(M,C);else{const d=Number(D);Number.isFinite(d)&&((P=(f=t.statoUtente).impostaAvvisoLivello)==null||P.call(f,C,d))}o=null,h();return}if(e.dataset.azione!=="salva-soglie")return;S.preventDefault();const z=e.dataset.idstazione;if(!z)return;const E=new FormData(e),c=st(String(E.get("soglia1")??"")),l=st(String(E.get("soglia2")??"")),L=st(String(E.get("soglia3")??""));t.statoUtente.impostaSogliaPersonalizzata({idstazione:z,soglia1:c,soglia2:l,soglia3:L}),s=null,h()}return i.addEventListener("click",m),i.addEventListener("change",n),i.addEventListener("input",A),i.addEventListener("submit",R),h(),{aggiorna:h,smonta:()=>{i.removeEventListener("click",m),i.removeEventListener("change",n),i.removeEventListener("input",A),i.removeEventListener("submit",R),i.innerHTML=""}}}function x(i){return i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ci(i,t){let a=null,r=null,s=null,o=null,g="";function v(){var z;const S=((z=t.ottieniCorsiAcqua)==null?void 0:z.call(t))??[],e={};for(const E of S)e[E.id]=E.stazioni.map(c=>c.idstazione);return e}function h(){const S=t.statoUtente.ottieniGruppiPersonalizzati(),e=t.ottieniStazioni(),z=new Map;for(const f of e)z.set(f.idstazione,f);const E=v(),c=S.map(f=>{const P=t.statoUtente.isGruppoMonitorato(f.id),C=r===f.id,F=s===f.id,D=o===f.id,d=f.stazioni.map(b=>{var N;return((N=z.get(b))==null?void 0:N.nomestaz)??`Stazione ${b}`});let $="";C&&($=`
            <form class="form-rinomina-gruppo" data-azione="salva-rinomina" data-gruppo-id="${x(f.id)}">
              <label class="sr-only" for="input-rinomina-${x(f.id)}">Nuovo nome gruppo</label>
              <input
                id="input-rinomina-${x(f.id)}"
                type="text"
                name="nuovoNome"
                value="${x(f.nome)}"
                required
              />
              <button type="submit" class="btn btn-primario btn-sm">Salva nome</button>
              <button type="button" class="btn btn-neutro btn-sm" data-azione="annulla-rinomina">Annulla</button>
            </form>
          `);let p="";if(D){const b=t.statoUtente.calcolaImpattoEliminazioneGruppo(f.id,E),N=b.totaleStazioniNelGruppo,I=b.stazioniCheSmetteranno.length,_=b.stazioniSalvateDaAltriGruppi.length;p=`
            <div class="box-conferma-eliminazione" role="alertdialog" aria-label="Conferma eliminazione gruppo" data-conferma-eliminazione="${x(f.id)}">
              <p class="avviso-titolo"><strong>Attenzione: eliminazione con Cascade Delete</strong></p>
              <p class="avviso-testo">
                Stai eliminando il gruppo <strong>${x(f.nome)}</strong> (${N} stazioni coinvolte).
                Eliminando questo gruppo, <strong>${I} stazioni smetteranno completamente di essere monitorate</strong>
                (anche se erano state aggiunte singolarmente dalla pagina ARPAE).
                ${_>0?`Altre ${_} stazioni resteranno monitorate poiché presenti in un altro gruppo attivo.`:""}
              </p>
              <div class="azioni-conferma">
                <button
                  type="button"
                  class="btn btn-pericolo btn-sm"
                  data-azione="conferma-elimina-gruppo"
                  data-gruppo-id="${x(f.id)}"
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
          `}let U="";if(F){const b=g.trim().toLowerCase(),N=b?e.filter(_=>_.nomestaz.toLowerCase().includes(b)):e,I=new Set(f.stazioni);U=`
            <div class="pannello-composizione-stazioni" data-composizione-gruppo="${x(f.id)}">
              <div class="composizione-header">
                <h4>Modifica stazioni del gruppo (${f.stazioni.length} selezionate)</h4>
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
                ${N.map(_=>{const H=I.has(_.idstazione);return`<li>
                      <label class="selettore-stazione-label">
                        <input
                          type="checkbox"
                          data-azione="toggle-stazione-in-gruppo"
                          data-gruppo-id="${x(f.id)}"
                          data-idstazione="${x(_.idstazione)}"
                          ${H?"checked":""}
                        />
                        <span>${x(_.nomestaz)}</span>
                      </label>
                    </li>`}).join("")}
              </ul>
            </div>
          `}return`
          <article class="card gruppo-custom-card" data-gruppo-card="${x(f.id)}">
            <div class="gruppo-custom-header">
              <div>
                <h3 class="gruppo-custom-nome" data-gruppo-nome="${x(f.id)}">${x(f.nome)}</h3>
                <span class="gruppo-custom-meta">${f.stazioni.length} stazioni · ${P?"Monitorato":"Non monitorato"}</span>
              </div>
              <div class="gruppo-custom-azioni">
                <button type="button" class="btn btn-secondario btn-sm" data-azione="apri-rinomina" data-gruppo-id="${x(f.id)}">Rinomina</button>
                <button type="button" class="btn btn-secondario btn-sm" data-azione="apri-composizione" data-gruppo-id="${x(f.id)}">Modifica stazioni</button>
                <button type="button" class="btn btn-pericolo btn-sm" data-azione="chiedi-elimina-gruppo" data-gruppo-id="${x(f.id)}">Elimina</button>
              </div>
            </div>

            ${d.length>0?`<div class="chip-stazioni-gruppo">${d.map(b=>`<span class="chip-stazione">${x(b)}</span>`).join("")}</div>`:'<p class="testo-secondario">Nessuna stazione nel gruppo. Clicca su "Modifica stazioni" per aggiungerne.</p>'}

            ${$}
            ${p}
            ${U}
          </article>
        `}).join(""),l=document.activeElement,L=l instanceof HTMLInputElement&&l.dataset.azione==="ricerca-stazioni-gruppo",M=L?l.selectionStart:null,w=L?l.selectionEnd:null;if(i.innerHTML=`
      <div class="pagina pagina-gruppi">
        <section class="card sezione-crea-gruppo" aria-labelledby="titolo-crea-gruppo">
          <h2 id="titolo-crea-gruppo">Crea nuovo gruppo personalizzato</h2>
          <p class="sezione-sottotitolo">
            Un gruppo personalizzato appena creato è subito monitorato. I gruppi automatici per corso d'acqua non sono modificabili qui (gestiscili nella scheda ARPAE).
          </p>
          ${a?`<div class="banner-errore" role="alert" data-errore-gruppi>${x(a)}</div>`:""}
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
          <h2 id="titolo-elenco-gruppi">I tuoi gruppi personalizzati (${S.length})</h2>
          <div class="lista-gruppi-personalizzati" data-lista-gruppi>
            ${c||'<p class="stato-vuoto-testo">Non hai ancora creato gruppi personalizzati.</p>'}
          </div>
        </section>
      </div>
    `,L){const f=i.querySelector('input[data-azione="ricerca-stazioni-gruppo"]');f&&(f.focus(),M!==null&&w!==null&&f.setSelectionRange(M,w))}}function m(S){const e=S.target;if(e instanceof HTMLFormElement){if(e.dataset.azione==="crea-gruppo"){S.preventDefault();const z=new FormData(e),E=String(z.get("nomeGruppo")??"");try{a=null,s=t.statoUtente.creaGruppoPersonalizzato(E,[]).id,g="",h()}catch(c){a=c instanceof Error?c.message:"Errore nella creazione del gruppo.",h()}return}if(e.dataset.azione==="salva-rinomina"){S.preventDefault();const z=e.dataset.gruppoId;if(!z)return;const E=new FormData(e),c=String(E.get("nuovoNome")??"");try{a=null,t.statoUtente.rinominaGruppoPersonalizzato(z,c),r=null,h()}catch(l){a=l instanceof Error?l.message:"Errore nella rinomina del gruppo.",h()}}}}function n(S){const e=S.target;if(!e)return;const z=e.closest('[data-azione="apri-rinomina"]');if(z){a=null,r=z.dataset.gruppoId??null,o=null,h();return}if(e.closest('[data-azione="annulla-rinomina"]')){r=null,h();return}const E=e.closest('[data-azione="apri-composizione"]');if(E){const L=E.dataset.gruppoId??null;s=s===L?null:L,g="",h();return}if(e.closest('[data-azione="chiudi-composizione"]')){s=null,h();return}const c=e.closest('[data-azione="chiedi-elimina-gruppo"]');if(c){a=null,o=c.dataset.gruppoId??null,r=null,h();return}if(e.closest('[data-azione="annulla-elimina-gruppo"]')){o=null,h();return}const l=e.closest('[data-azione="conferma-elimina-gruppo"]');if(l){const L=l.dataset.gruppoId;L&&(t.statoUtente.eliminaGruppoPersonalizzato(L,v()),o=null,s===L&&(s=null),h())}}function A(S){const e=S.target;if(e instanceof HTMLInputElement&&e.dataset.azione==="toggle-stazione-in-gruppo"){const z=e.dataset.gruppoId,E=e.dataset.idstazione;if(!z||!E)return;const c=t.statoUtente.ottieniGruppiPersonalizzati().find(L=>L.id===z);if(!c)return;const l=new Set(c.stazioni);e.checked?l.add(E):l.delete(E),t.statoUtente.aggiornaStazioniGruppoPersonalizzato(z,Array.from(l)),h()}}function R(S){const e=S.target;e instanceof HTMLInputElement&&e.dataset.azione==="ricerca-stazioni-gruppo"&&(g=e.value,h())}return i.addEventListener("submit",m),i.addEventListener("click",n),i.addEventListener("change",A),i.addEventListener("input",R),h(),{aggiorna:h,smonta:()=>{i.removeEventListener("submit",m),i.removeEventListener("click",n),i.removeEventListener("change",A),i.removeEventListener("input",R),i.innerHTML=""}}}const ui=60*1e3;function rt(i){const t=i.trim().toLowerCase();return t==="#/arpae"||t.startsWith("#/arpae?")?"#/arpae":t==="#/gruppi"||t.startsWith("#/gruppi?")?"#/gruppi":"#/monitoraggio"}function pi(i,t={}){const a=t.fonteDati??_t(),r=t.corsiAcqua??Ht(),s=t.soglie??Wt(),o=t.trend??Yt(),g=t.statoUtente??ii(),v=t.notifiche??ei(),h=t.intervalloAutoRefreshMs!==void 0?t.intervalloAutoRefreshMs:ui;let m=!1,n=null,A=null,R=null,S=[],e=[],z={},E=rt(window.location.hash),c=null;i.innerHTML=`
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
  `;const l=i.querySelector("#app-contenuto-pagina");function L(){i.querySelectorAll("[data-nav-rotta]").forEach($=>{const p=$.dataset.navRotta===E;$.classList.toggle("nav-attivo",p),p?$.setAttribute("aria-current","page"):$.removeAttribute("aria-current")})}function M(){const d={};for(const $ of e)d[$.id]=$.stazioni.map(p=>p.idstazione);return d}function w(){if(S.length===0)return;const d=M(),$=g.ottieniStazioniMonitorate(d),p=S.filter(U=>$.has(U.idstazione));v.controllaEInviaNotifiche(p,U=>{const b=g.ottieniSogliaPersonalizzata(U.idstazione);return s.valutaStazione(U,b)},U=>{var b;return((b=g.ottieniAvvisoLivello)==null?void 0:b.call(g,U))??null})}async function f(d=!0){var $;m=!0,n=null,c==null||c.aggiorna();try{const{corrente:p,precedente:U,precedenteUnOra:b}=await a.scaricaConStorico(void 0,d);S=p.stazioni,A=p.time,R=Date.now(),e=r.raggruppaPerCorsoAcqua(S),z=o.calcolaMappaTrend(p,U,b??null),($=g.impostaMappaGruppiEsterni)==null||$.call(g,M()),w()}catch(p){n=p instanceof Error?p.message:"Impossibile caricare i dati dall’endpoint ARPAE."}finally{m=!1,c==null||c.aggiorna()}}function P(d){c==null||c.smonta(),c=null,E=d,L(),d==="#/arpae"?c=li(l,{ottieniStazioni:()=>S,ottieniCorsiAcqua:()=>e,ottieniMappaTrend:()=>z,corsiAcqua:r,soglie:s,statoUtente:g}):d==="#/gruppi"?c=ci(l,{ottieniStazioni:()=>S,ottieniCorsiAcqua:()=>e,statoUtente:g}):c=ri(l,{ottieniStatoDati:()=>({caricamento:m,errore:n,timeRilevazione:A,ultimoControlloMs:R,stazioni:S,corsiAcqua:e,mappaTrend:z}),richiediAggiornamento:()=>f(!0),navigaA:$=>{window.location.hash=$,P($)},corsiAcqua:r,soglie:s,trend:o,statoUtente:g,notifiche:v})}function C(){const d=rt(window.location.hash);d!==E&&P(d)}const F=g.iscrivi(()=>{w(),c==null||c.aggiorna()});if(window.addEventListener("hashchange",C),!window.location.hash)try{window.history.replaceState(null,"","#/monitoraggio")}catch{window.location.hash="#/monitoraggio"}P(rt(window.location.hash)),f(!0);const D=h&&h>0?window.setInterval(()=>{f(!0)},h):null;return{aggiorna:()=>{c==null||c.aggiorna()},smonta:()=>{D!==null&&window.clearInterval(D),window.removeEventListener("hashchange",C),F(),c==null||c.smonta(),i.innerHTML=""}}}const Pt=document.getElementById("app");Pt&&pi(Pt);
