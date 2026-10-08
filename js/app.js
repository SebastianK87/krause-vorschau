// Fahrzeugtechnik Krause · Startseite (Runde 8, 23.09.2026)
// Nur klassische Skripte: die Seite muss auch per Doppelklick (file://) laufen.

const KONFIG = {
  ENTWURF: true, // vor dem Livegang auf false
  ENDPUNKT: 'https://os.movesociety.de/api/public/krause-anfrage',
  PLANER: 'https://onlineservices.prod.rz2.prm-ag.de/V_bcC63oyMPTNPsTU2xANA/Terminplaner?IsFrame=true',
  TEL: '03329 63222',
  WHATSAPP: '', // Nummer international ohne +, z. B. '4917612345678'. Leer = Hinweis statt Link (von Ralf bestätigen lassen)
};

// Eine Quelle für alle Zeitangaben. Stand: Google-Profil (Mo bis Fr 8 bis 17). Vor dem Livegang mit Ralf abgleichen
// (die alte Seite nennt eine Mittagspause 12 bis 13 Uhr: dann zeiten: [[8, 12], [13, 17]]).
const OEFFNUNG = {
  tage: [1, 2, 3, 4, 5],
  zeiten: [[8, 17]],
  feiertage: ['2026-10-03', '2026-10-31', '2026-12-25', '2026-12-26', '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-01', '2027-05-06', '2027-05-17'],
};

const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hatGsap = !!(window.gsap && window.ScrollTrigger);
if ('IntersectionObserver' in window) document.documentElement.classList.add('js');
if (hatGsap) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); } // Adressleiste am Handy löst kein Neuberechnen aus
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sanft = (el) => el.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });

/* ---------- Hero: Film, Wortmarke, Pause ---------- */
(() => {
  const hero = $('.hero');
  const video = $('.trailer-video', hero);
  const knopf = $('.trailer-pause', hero);

  let angehalten = ruhig, sichtbar = true;
  const keinFilm = () => hero.classList.add('kein-film');
  video.addEventListener('playing', () => hero.classList.add('film-laeuft'));
  video.addEventListener('error', keinFilm, true);
  const spielen = () => {
    if (!angehalten && sichtbar && !document.hidden) {
      const p = video.play();
      if (p) p.catch(() => { if (!hero.classList.contains('film-laeuft')) { angehalten = true; setzen(); } });
    } else video.pause();
  };
  const setzen = () => {
    knopf.setAttribute('aria-pressed', String(angehalten));
    knopf.setAttribute('aria-label', angehalten ? 'Film abspielen' : 'Film anhalten');
    hero.classList.toggle('pause', angehalten);
  };
  knopf.addEventListener('click', () => { angehalten = !angehalten; setzen(); spielen(); });
  new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; spielen(); }).observe(hero);
  document.addEventListener('visibilitychange', spielen);
  setzen();
  spielen();
})();

/* ---------- Einblenden beim Scrollen ---------- */
(() => {
  if (ruhig || !('IntersectionObserver' in window)) return;
  const ziele = $$('.kopfzeile, .band-l, .ra-kern > *, .termin-kopf, .termin-kern > *, .ws-kopf, .ws-liste, .stimmen-note, .zitat-gross, .zitate-klein blockquote, .team-bild, .einblicke figure, .jobs-kern > *, .el-text');
  const io = new IntersectionObserver((eintraege) => eintraege.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('da'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  ziele.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight) return; // was schon im Bild ist, bleibt einfach stehen
    el.setAttribute('data-rein', '');
    const geschw = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    el.style.transitionDelay = `${Math.min(geschw, 2) * 60}ms`;
    io.observe(el);
  });
})();

/* ---------- 4,8 zählt hoch ---------- */
$$('[data-zaehl]').forEach((el) => {
  if (ruhig) return;
  const ziel = parseFloat(el.dataset.zaehl.replace(',', '.'));
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return; io.disconnect();
    const t0 = performance.now();
    const schritt = (t) => {
      const p = Math.min(1, (t - t0) / 1200), w = 1 - Math.pow(1 - p, 4);
      el.textContent = (ziel * w).toFixed(1).replace('.', ',');
      if (p < 1) requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  });
  io.observe(el);
});

/* ---------- Offen oder zu? Berliner Zeit, Feiertage ---------- */
(() => {
  const teile = Object.fromEntries(new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
    .formatToParts(new Date()).map((p) => [p.type, p.value]));
  const tagNr = { So: 0, Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6 }[teile.weekday.replace('.', '')] ?? new Date().getDay();
  const datum = `${teile.year}-${teile.month}-${teile.day}`;
  const std = Number(teile.hour) % 24 + Number(teile.minute) / 60;
  const namen = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const uhr = (h) => (h % 1 ? `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}` : `${h}`) + ' Uhr';
  const feiertag = OEFFNUNG.feiertage.includes(datum);
  const heute = OEFFNUNG.tage.includes(tagNr) && !feiertag;
  let text, offen = false;
  const block = heute && OEFFNUNG.zeiten.find(([a, b]) => std >= a && std < b);
  if (block) { text = `Jetzt geöffnet bis ${uhr(block[1])}`; offen = true; }
  else if (heute && std < OEFFNUNG.zeiten[0][0]) text = `Heute ab ${uhr(OEFFNUNG.zeiten[0][0])} geöffnet`;
  else if (heute && OEFFNUNG.zeiten.some(([a]) => std < a)) text = `Mittagspause, ab ${uhr(OEFFNUNG.zeiten.find(([a]) => std < a)[0])} wieder da`;
  else {
    const plus = (n) => { const x = new Date(Date.UTC(+teile.year, +teile.month - 1, +teile.day + n)); return x.toISOString().slice(0, 10); };
    let d = 1; while (!OEFFNUNG.tage.includes((tagNr + d) % 7) || OEFFNUNG.feiertage.includes(plus(d))) d++;
    text = `${feiertag ? 'Heute Feiertag. ' : ''}${d === 1 ? 'Morgen' : namen[(tagNr + d) % 7]} ab ${uhr(OEFFNUNG.zeiten[0][0])} geöffnet`;
  }
  $$('[data-status]').forEach((el) => {
    const zusatz = el.closest('.hero') ? ' · Striewitzweg 27' : '';
    $('span', el).textContent = text + zusatz;
    el.classList.toggle('offen', offen);
  });
  $(`[data-woche] tr[data-tag="${tagNr}"]`)?.setAttribute('aria-current', 'date');
  $$('[data-ausserhalb]').forEach((el) => { el.hidden = offen; });

  // Saisonhinweis nur zur Wechselzeit (Faustregel O bis O), ohne Knappheitsparolen
  const md = Number(teile.month) * 100 + Number(teile.day);
  const saison = $('[data-saison]');
  if (saison) {
    if (md >= 915 && md <= 1115) saison.hidden = false;
    else if (md >= 301 && md <= 515) {
      $('[data-saison-titel]', saison).textContent = 'Zeit für Sommerreifen.';
      $('[data-saison-text]', saison).textContent = 'Die Faustregel: ab Ostern. Buchen Sie Ihren Wechsel rechtzeitig.';
      saison.hidden = false;
    }
  }
})();

/* ---------- Terminplaner: Schublade und Abschnitt (erst nach Klick laden) ---------- */
const schublade = $('#schublade');
function planerIframe() {
  const f = document.createElement('iframe');
  f.src = KONFIG.PLANER;
  f.title = 'Online-Terminplaner Fahrzeugtechnik Krause';
  f.allow = 'clipboard-write';
  return f;
}
$$('[data-planer-oeffnen]').forEach((el) => {
  el.addEventListener('click', (e) => {
    if (!schublade.showModal) return; // alter Browser: normaler Sprung zum Abschnitt
    e.preventDefault();
    const wunsch = $('[data-wunsch-anzeige]', schublade);
    wunsch.hidden = !el.dataset.wunsch;
    wunsch.textContent = el.dataset.wunsch ? `Ihr Anliegen: ${el.dataset.wunsch}` : '';
    try { $('#menue').hidePopover(); } catch {}
    schublade.showModal();
    leisteSetzen();
  });
});
$('[data-planer-laden]', schublade).addEventListener('click', () => {
  const inhalt = $('#schublade-inhalt');
  const f = planerIframe();
  inhalt.replaceChildren(f);
  inhalt.classList.add('geladen');
  f.focus({ preventScroll: true });
});
$('[data-schublade-zu]', schublade).addEventListener('click', () => schublade.close());
schublade.addEventListener('click', (e) => { if (e.target === schublade) schublade.close(); });
schublade.addEventListener('close', () => leisteSetzen());

const planer = $('#planer');
$('[data-planer]', planer).addEventListener('click', () => {
  const f = planerIframe();
  planer.replaceChildren(f);
  f.focus({ preventScroll: true });
});

/* ---------- Menü schließt nach Klick ---------- */
const menue = $('#menue');
$$('a', menue).forEach((a) => a.addEventListener('click', () => { try { menue.hidePopover(); } catch {} }));

/* ---------- Formular vorbelegen ---------- */
$$('[data-anliegen]').forEach((a) => a.addEventListener('click', () => { $('#f-anliegen').value = a.dataset.anliegen; }));

/* ---------- Reifenanfrage: nach Fahrzeug (HSN/TSN, FIN) oder nach Größe ---------- */
// Herstellerkennung aus den ersten drei Zeichen der FIN (WMI), rein lokal, nichts verlässt den Browser
const WMI = {
  WVW: 'Volkswagen', WV1: 'Volkswagen Nutzfahrzeuge', WV2: 'Volkswagen Nutzfahrzeuge', WAU: 'Audi', WUA: 'Audi Sport', TRU: 'Audi',
  WBA: 'BMW', WBS: 'BMW M', WBY: 'BMW i', WMW: 'Mini', WDD: 'Mercedes-Benz', WDB: 'Mercedes-Benz', W1K: 'Mercedes-Benz', W1N: 'Mercedes-Benz', WDC: 'Mercedes-Benz', W1V: 'Mercedes-Benz Transporter', WDF: 'Mercedes-Benz Transporter',
  WP0: 'Porsche', WP1: 'Porsche', W0L: 'Opel', W0V: 'Opel', WF0: 'Ford', WF1: 'Ford', TMB: 'Škoda', VSS: 'Seat', VSE: 'Seat', VR3: 'Peugeot', VF3: 'Peugeot', VF7: 'Citroën', VR7: 'Citroën',
  VF1: 'Renault', UU1: 'Dacia', ZFA: 'Fiat', ZAR: 'Alfa Romeo', JTD: 'Toyota', JTE: 'Toyota', JTN: 'Toyota', SB1: 'Toyota', VNK: 'Toyota', JN1: 'Nissan', SJN: 'Nissan', VSK: 'Nissan', JMZ: 'Mazda', JMB: 'Mitsubishi',
  KMH: 'Hyundai', TMA: 'Hyundai', NLH: 'Hyundai', KNA: 'Kia', KNE: 'Kia', U5Y: 'Kia', YV1: 'Volvo', LVY: 'Volvo', YS3: 'Saab', SAL: 'Land Rover', SAJ: 'Jaguar', JSA: 'Suzuki', TSM: 'Suzuki', JHM: 'Honda', SHH: 'Honda',
  LRW: 'Tesla', XP7: 'Tesla', '5YJ': 'Tesla', '7SA': 'Tesla', LSV: 'SAIC / MG', LBV: 'BMW (China)', WME: 'Smart', VXK: 'Opel', ZFF: 'Ferrari', WAP: 'Alpina', VF6: 'Renault Trucks', WJM: 'Iveco', ZCF: 'Iveco',
};
const JAHR = 'ABCDEFGHJKLMNPRSTVWXY123456789';
function finLesen(fin) {
  if (fin.length < 3) return null;
  const hersteller = WMI[fin.slice(0, 3)] || WMI[fin.slice(0, 2) + '0'];
  if (fin.length < 17) return { hersteller, teil: true };
  if (/[IOQ]/.test(fin) || !/^[A-HJ-NPR-Z0-9]{17}$/.test(fin)) return { falsch: true };
  const k = JAHR.indexOf(fin[9]);
  let jahr = null;
  if (k >= 0) { jahr = 1980 + k; while (jahr + 30 <= new Date().getFullYear() + 1) jahr += 30; }
  return { hersteller, jahr };
}
(() => {
  const form = $('#ra-form');
  const fehler = $('#ra-fehler', form);
  const tabs = $$('[role="tab"]', form);
  let modus = 'auto';
  const tabSetzen = (tab) => {
    tabs.forEach((t) => { const an = t === tab; t.setAttribute('aria-selected', String(an)); t.tabIndex = an ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !an; });
    modus = tab.id === 'tab-auto' ? 'auto' : 'groesse';
    fehler.hidden = true;
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => tabSetzen(t));
    t.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; tabSetzen(n); n.focus(); } });
  });

  // Fahrzeugschein-Vorschau leuchtet mit
  const schein = (n) => $(`[data-schein="${n}"]`);
  const muster = { hsn: '0603', tsn: 'BJM00012', fin: 'WVWZZZ1KZAW000000' };
  const hsn = $('#ra-hsn'), tsn = $('#ra-tsn'), fin = $('#ra-fin'), finInfo = $('#fin-info');
  [[hsn, 'hsn', /\D/g], [tsn, 'tsn', /[^A-Z0-9]/g], [fin, 'fin', /[^A-Z0-9]/g]].forEach(([f, n, weg]) => {
    f.addEventListener('focus', () => schein(n).classList.add('an'));
    f.addEventListener('blur', () => schein(n).classList.remove('an'));
    f.addEventListener('input', () => {
      f.value = f.value.toUpperCase().replace(weg, '').slice(0, f.maxLength);
      schein(n).textContent = f.value || muster[n];
      
      if (n === 'fin') {
        const info = finLesen(f.value);
        finInfo.hidden = !info || (info.teil && !info.hersteller);
        finInfo.classList.toggle('falsch', !!(info && info.falsch));
        if (info && info.falsch) finInfo.textContent = 'Diese Nummer sieht nicht richtig aus. Eine FIN hat 17 Zeichen, ohne I, O und Q.';
        else if (info && info.teil) finInfo.textContent = `Hersteller: ${info.hersteller}`;
        else if (info) finInfo.textContent = `Erkannt: ${info.hersteller || 'Hersteller unbekannt'}${info.jahr ? `, Modelljahr etwa ${info.jahr}` : ''}. Den Rest prüfen wir.`;
      }
    });
  });

  // Größe von der Flanke
  const felder = $$('#ra-groesse .ra-felder input', form);
  const teil = (name) => $(`.flanke-teil[data-teil="${name}"]`, form);
  const flanke = { breite: '205', quer: '55', zoll: '16' };
  felder.forEach((f, i) => {
    f.addEventListener('focus', () => teil(f.dataset.teil).classList.add('an'));
    f.addEventListener('blur', () => teil(f.dataset.teil).classList.remove('an'));
    f.addEventListener('input', () => {
      f.value = f.value.replace(/\D/g, '').slice(0, f.maxLength);
      const t = teil(f.dataset.teil);
      t.textContent = f.value || flanke[f.dataset.teil];
      t.classList.toggle('voll', !!f.value);
      if (f.value.length === f.maxLength && felder[i + 1]) felder[i + 1].focus();
    });
  });

  $$('[type="submit"]', form).forEach((b) => { b.disabled = false; }); // erst mit Handler (ohne JS keine Daten in der Adresszeile)
  const melde = (text, feld) => { fehler.textContent = text; fehler.hidden = false; feld?.focus(); };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ohne = !!(e.submitter && e.submitter.hasAttribute('data-ohne-groesse'));
    const art = { Winter: 'Winterreifen', Sommer: 'Sommerreifen', Ganzjahr: 'Ganzjahresreifen' }[form.elements.saison.value] || 'Reifen';
    let neu;
    if (ohne) neu = `Reifenanfrage: ${art}. Bitte über das Kennzeichen nachsehen.`;
    else if (modus === 'auto') {
      // Laut Ralf: Fahrgestellnummer ist der sichere Weg, Schlüsselnummern nur vollständig und zusätzlich
      const info = finLesen(fin.value);
      const finOk = fin.value.length === 17 && info && !info.falsch;
      if (!finOk) return melde('Bitte die 17-stellige Fahrgestellnummer eintragen (Feld E im Fahrzeugschein).', fin);
      if ((hsn.value || tsn.value) && (hsn.value.length !== 4 || tsn.value.length < 8)) return melde('Die Schlüsselnummern bitte vollständig: HSN mit 4 Ziffern, TSN komplett aus Feld 2.2 (mindestens 8 Zeichen). Oder die Felder leer lassen.', hsn.value.length !== 4 ? hsn : tsn);
      const teile = [`FIN ${fin.value}${info.hersteller ? ` (${info.hersteller})` : ''}`];
      if (hsn.value) teile.push(`HSN ${hsn.value} / TSN ${tsn.value}`);
      neu = `Reifenanfrage: ${art} für ${teile.join(', ')}. Bitte um ein Angebot.`;
    } else {
      const leer = felder.find((f) => !f.value);
      felder.forEach((f) => f.setAttribute('aria-invalid', String(!f.value)));
      if (leer) return melde('Bitte alle drei Zahlen von der Flanke eintragen.', leer);
      const [b, q, z] = felder.map((f) => f.value);
      neu = `Reifenanfrage: ${b}/${q} R${z}, ${art}. Bitte um ein Angebot.`;
    }
    fehler.hidden = true;
    const feld = $('#f-text');
    const rest = feld.value.split('\n').filter((zeile) => !zeile.startsWith('Reifenanfrage:')).join('\n').trim();
    feld.value = (rest ? `${neu}\n${rest}` : neu).slice(0, 1200);
    $('#f-anliegen').value = 'Neue Reifen oder Felgen';
    const zielFeld = $(ohne ? '#f-kz' : '#f-name');
    zielFeld.closest('.feld').scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => zielFeld.focus({ preventScroll: true }), ruhig ? 0 : 700);
  });
})();

/* ---------- Kalender-Erinnerung (.ics, bleibt auf dem Gerät) ---------- */
$('[data-erinnerung]')?.addEventListener('click', () => {
  const jetzt = new Date();
  const kandidaten = [[jetzt.getFullYear(), 9, 1], [jetzt.getFullYear(), 2, 20], [jetzt.getFullYear() + 1, 2, 20], [jetzt.getFullYear() + 1, 9, 1]]
    .map(([j, m, t]) => new Date(j, m, t, 9, 0)).filter((d) => d > jetzt).sort((a, b) => a - b);
  const d = kandidaten[0];
  const winter = d.getMonth() >= 8;
  const f = (x) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fahrzeugtechnik Krause//Erinnerung//DE', 'BEGIN:VEVENT',
    `UID:${Date.now()}@reifenkrause.de`, `DTSTAMP:${f(jetzt)}T000000Z`, `DTSTART;VALUE=DATE:${f(d)}`,
    `SUMMARY:${winter ? 'Winterräder' : 'Sommerräder'}: Wechseltermin bei Krause buchen`,
    `DESCRIPTION:Termin online oder telefonisch unter ${KONFIG.TEL}. Fahrzeugtechnik Krause\\, Striewitzweg 27\\, 14532 Stahnsdorf.`,
    'LOCATION:Striewitzweg 27\\, 14532 Stahnsdorf', 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'krause-raederwechsel.ics';
  document.body.append(a); a.click(); a.remove();
  const info = $('[data-erinnerung-info]');
  if (info) info.textContent = `Kalendertermin für den ${d.toLocaleDateString('de-DE')} erstellt. Es werden keine Daten an uns gesendet.`;
});

/* ---------- Werkstatt A bis Z: Suche ---------- */
(() => {
  const feld = $('#ws-feld'), eintraege = $$('#ws-liste li'), leer = $('#ws-leer'), fuss = $('.ws-fuss');
  const raster = $('#ws-liste');
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { raster.classList.add('da'); io.disconnect(); } }, { rootMargin: '0px 0px -10% 0px' }).observe(raster);
  const ziele = eintraege.map((li) => $('.ws-name', li));
  const namen = ziele.map((s) => s.textContent);
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const such = eintraege.map((li) => norm($('a', li).dataset.such || ''));
  feld.addEventListener('input', () => {
    const q = norm(feld.value.trim());
    let treffer = 0;
    eintraege.forEach((li, i) => {
      const n = namen[i], k = norm(n).indexOf(q);
      const passt = !q || k >= 0 || such[i].includes(q);
      li.hidden = !passt;
      if (passt) treffer++;
      ziele[i].textContent = n;
      if (q && k >= 0) { const m = document.createElement('mark'); m.textContent = n.slice(k, k + q.length); ziele[i].replaceChildren(n.slice(0, k), m, n.slice(k + q.length)); }
    });
    leer.hidden = treffer > 0;
    if (fuss) fuss.hidden = treffer === 0;
  });
})();

/* ---------- Navigation: aktiver Abschnitt ---------- */
(() => {
  const links = $$('.nav a');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const a = links.find((l) => l.getAttribute('href') === `#${e.target.id}`);
    if (a) a.classList.toggle('an', e.isIntersecting);
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const z = $(a.getAttribute('href')); if (z) io.observe(z); });
})();

/* ---------- Kontakt-Dock: nach dem Hero immer da, außer bei offener Schublade (am Handy auch nicht im Reifenfilm) ---------- */
const dock = $('.dock');
const sichtbar = new Set();
const handy = matchMedia('(max-width: 900px)');
function leisteSetzen() {
  const da = !sichtbar.has('start') && !schublade.open && !sichtbar.has('reifen');
  dock.classList.toggle('da', da);
  dock.inert = !da;
}
const merken = (opts) => new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? sichtbar.add(e.target.id) : sichtbar.delete(e.target.id))); leisteSetzen(); }, opts);
merken({ rootMargin: '0px 0px -40% 0px' }).observe($('#start'));
merken({ rootMargin: '-40% 0px -40% 0px' }).observe($('#reifen'));

/* ---------- WhatsApp: Link, sobald die Nummer feststeht ---------- */
const toast = $('#toast');
let toastZeit;
function hinweis(html) {
  toast.innerHTML = html; toast.hidden = false;
  clearTimeout(toastZeit); toastZeit = setTimeout(() => { toast.hidden = true; }, 5000);
}
$$('[data-whatsapp]').forEach((a) => {
  if (KONFIG.WHATSAPP) {
    a.href = `https://wa.me/${KONFIG.WHATSAPP}?text=${encodeURIComponent('Hallo Krause-Team, ich habe eine Frage: ')}`;
    a.target = '_blank'; a.rel = 'noopener';
  } else {
    a.addEventListener('click', (e) => { e.preventDefault(); hinweis(`WhatsApp richten wir gerade ein. Bis dahin: <a href="tel:+49332963222">03329 63222</a> oder <a href="#formular">Nachricht schreiben</a>.`); });
  }
});

/* ---------- Kapitel: Bild füllt den Schirm, tritt zurück, Karte gleitet darüber ---------- */
(() => {
  if (!hatGsap || ruhig) return;
  $$('.kapitel').forEach((k) => {
    k.classList.add('lebt');
    const bild = $('.kapitel-bild', k), dunkel = $('.kapitel-dunkel', k), wort = $('.kapitel-wort', k), karte = $('.kapitel-inhalt', k);
    // Nur transform und opacity: läuft auf der Grafikkarte, auch auf schwachen Handys flüssig
    gsap.set(karte, { yPercent: 50, autoAlpha: 0 });
    gsap.set(bild, { scale: 1.12 });
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: k, start: 'top top', end: 'bottom bottom', scrub: 1 } })
      .to(bild, { scale: 1, duration: 0.2 })
      .to(bild, { scale: 0.86, duration: 0.4, ease: 'sine.inOut' }, 0.2)
      .to(dunkel, { opacity: 0.55, duration: 0.4, ease: 'sine.inOut' }, 0.2)
      .to(wort, { yPercent: -50, autoAlpha: 0, duration: 0.25, ease: 'sine.in' }, 0.2)
      .to(karte, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: 'sine.out' }, 0.3)
      .to({}, { duration: 0.3 });
  });
})();

/* ---------- Kontakt: Karte erst nach Klick laden (OpenStreetMap) ---------- */
$('[data-karte]')?.addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=13.2233%2C52.3875%2C13.2373%2C52.3950&layer=mapnik&marker=52.39122%2C13.23030';
  f.title = 'Karte: Fahrzeugtechnik Krause, Striewitzweg 27, Stahnsdorf';
  f.loading = 'lazy';
  $('#karte').replaceChildren(f);
});

/* ---------- Reifenfilm: per Scroll gesteuert, als Blob geladen (springt auf jedem Server) ---------- */
(() => {
  const sek = $('#reifen');
  const film = $('.reifen-video', sek);
  const punkte = $$('.film-punkte li', sek);
  const schichten = $$('.schichten li', sek);
  const leistenKnoepfe = $$('.reifen-leiste button', sek);
  const nr = $('[data-nr]', sek);
  const hinweis = $('.reifen-hinweis', sek);
  const N = schichten.length;
  const A = { filmEnde: 0.22, schrittStart: 0.25, schrittEnde: 0.98 };
  const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const weich = (t) => t * t * (3 - 2 * t);
  const mitte = (i) => A.schrittStart + ((i + 0.5) / N) * (A.schrittEnde - A.schrittStart);

  // Quelle wählen und laden, sobald der Abschnitt näher kommt
  const quellen = JSON.parse(film.dataset.quellen);
  // Chromium und Firefox: WebM (das eingebaute Claude-Fenster zeigt H.264 nicht). Safari und iOS: MP4.
  const ua = navigator.userAgent, safari = /Safari\//.test(ua) && !/Chrome|Chromium|Edg|Firefox|FxiOS|CriOS/.test(ua);
  const art = !safari && film.canPlayType('video/webm; codecs="vp9"') === 'probably' ? 'webm' : 'mp4';
  const url = quellen[art][innerWidth <= 760 ? 0 : 1];
  const kamera = $('.reifen-kamera', sek);
  const ZOOM = innerWidth <= 900 ? 1.55 : 1.9;
  let geladen = false;
  // Erst normal streamen (Range, sofort sichtbar). Kann der Server keine Sprünge, einmal als Blob nachladen.
  const freigeben = () => { const p = film.play(); if (p) p.then(() => film.pause()).catch(() => {}); }; // iOS: Sprünge erst nach einem Start
  function laden() {
    if (geladen) return; geladen = true;
    film.preload = 'auto';
    film.src = url;
    film.load();
    film.addEventListener('loadedmetadata', () => {
      freigeben();
      const springbar = film.seekable.length && film.seekable.end(0) > 0;
      if (springbar || location.protocol === 'file:') return;
      fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then((b) => { const t = film.currentTime; film.src = URL.createObjectURL(b); film.addEventListener('loadedmetadata', () => { film.currentTime = t; }, { once: true }); })
        .catch(() => {});
    }, { once: true });
  }
  new IntersectionObserver(([e]) => { if (e.isIntersecting) laden(); }, { rootMargin: '250% 0px' }).observe(sek);

  let aktiv = -2;
  function aktivSetzen(i) {
    if (i === aktiv) return;
    aktiv = i;
    schichten.forEach((li, k) => li.classList.toggle('an', k === Math.max(i, 0)));
    punkte.forEach((p, k) => p.classList.toggle('an', k === i));
    leistenKnoepfe.forEach((b, k) => { b.classList.toggle('an', k === i); b.classList.toggle('vorbei', k < i); b.setAttribute('aria-pressed', String(k === i)); });
    sek.classList.toggle('erklaert', i >= 0);
    // Kamera fährt an die aktive Schicht heran (Mittelpunkt des Pins)
    const pin = punkte[i];
    if (pin && !sek.classList.contains('statisch')) {
      kamera.style.setProperty('--zx', pin.style.getPropertyValue('--x'));
      kamera.style.setProperty('--zy', pin.style.getPropertyValue('--y'));
      kamera.style.setProperty('--zoom', ZOOM);
    } else kamera.style.setProperty('--zoom', 1);
    nr.textContent = String(Math.max(i, 0) + 1).padStart(2, '0');
  }
  function fortschritt(p) {
    const dauer = film.duration || 10;
    const t = weich(klemm(p / A.filmEnde)) * (dauer - 0.05);
    if (film.readyState >= 1 && Math.abs(film.currentTime - t) > 0.02 && !film.seeking) film.currentTime = t;
    const s = (p - A.schrittStart) / (A.schrittEnde - A.schrittStart);
    aktivSetzen(s < 0 ? -1 : Math.min(N - 1, Math.floor(s * N)));
    hinweis.style.opacity = p < 0.03 ? 1 : 0;
  }
  function statisch() {
    sek.classList.add('statisch');
    schichten.forEach((li) => li.classList.add('an'));
    laden();
    const ende = () => { try { film.currentTime = Math.max(0, (film.duration || 10) - 0.05); } catch {} };
    film.readyState >= 1 ? ende() : film.addEventListener('loadedmetadata', ende, { once: true });
  }
  if (!hatGsap || ruhig) { statisch(); return; }
  sek.classList.remove('statisch'); // ohne JS bleibt die lesbare Liste

  let ziel = 0, anzeige = 0, laeuft = false, tAlt = 0;
  const gleiten = (t) => {
    const dt = tAlt ? Math.min(t - tAlt, 50) : 16.67; tAlt = t;
    anzeige += (ziel - anzeige) * (1 - Math.pow(1 - 0.22, dt / 16.67)); // unabhängig von der Bildrate
    if (Math.abs(ziel - anzeige) < 0.0004) anzeige = ziel;
    fortschritt(anzeige);
    laeuft = anzeige !== ziel;
    if (laeuft) requestAnimationFrame(gleiten); else tAlt = 0;
  };
  const setzeZiel = (p) => { ziel = p; if (!laeuft) { laeuft = true; requestAnimationFrame(gleiten); } };
  const st = ScrollTrigger.create({
    trigger: sek, start: 'top top', end: 'bottom bottom',
    onUpdate: (s) => setzeZiel(s.progress),
    onRefresh: (s) => { ziel = anzeige = s.progress; fortschritt(anzeige); },
    // Einrasten nur mit Maus: am Handy kämpft es gegen den Wisch-Schwung und ruckelt
    snap: matchMedia('(pointer: coarse)').matches ? false : {
      snapTo: (v) => {
        if (v < A.schrittStart - 0.02 || v > A.schrittEnde) return v;
        const i = klemm(Math.round(((v - A.schrittStart) / (A.schrittEnde - A.schrittStart)) * N - 0.5), 0, N - 1);
        return mitte(i);
      },
      duration: { min: 0.2, max: 0.6 }, delay: 0.15, ease: 'power2.out',
    },
  });
  film.addEventListener('loadedmetadata', () => fortschritt(anzeige));
  leistenKnoepfe.forEach((b, i) => b.addEventListener('click', () => {
    scrollTo({ top: st.start + (st.end - st.start) * mitte(i), behavior: 'smooth' });
  }));
  fortschritt(0);
})();

/* ---------- Kontaktformular ---------- */
(() => {
  const form = $('#formular'), fehler = $('#f-fehler'), fertig = $('#f-fertig');
  function pruefen() {
    const p = [], m = (el, schlecht) => el.setAttribute('aria-invalid', String(schlecht));
    const { name, telefon, email, anliegen, einwilligung } = form.elements;
    m(name, !name.value.trim()); if (!name.value.trim()) p.push('Name');
    const telOk = telefon.value.replace(/\D/g, '').length >= 6; m(telefon, !telOk); if (!telOk) p.push('Telefonnummer');
    const mailOk = !email.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()); m(email, !mailOk); if (!mailOk) p.push('gültige E-Mail');
    m(anliegen, !anliegen.value); if (!anliegen.value) p.push('Anliegen');
    if (!einwilligung.checked) p.push('Einverständnis');
    return p;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const p = pruefen();
    if (p.length) { fehler.textContent = `Bitte ergänzen: ${p.join(', ')}.`; $('[aria-invalid="true"]', form)?.focus(); return; }
    fehler.textContent = '';
    if (form.elements.website.value) return; // Honigtopf
    if (KONFIG.ENTWURF) { fehler.textContent = 'Entwurf: Der Versand ist noch nicht angeschlossen. Ihre Eingaben bleiben stehen.'; return; }
    const knopf = $('[type="submit"]', form);
    knopf.disabled = true;
    try {
      const r = await fetch(KONFIG.ENDPUNKT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      if (!r.ok) throw new Error(r.status);
      const antwort = await r.json().catch(() => ({}));
      form.hidden = true; fertig.hidden = false; fertig.focus();
      if (antwort.bestaetigt && form.elements.email.value.trim()) $('[data-fertig-text]').innerHTML = `Eine Bestätigung ist an ${form.elements.email.value.trim().replace(/[<>&]/g, '')} unterwegs. Wir rufen Sie unter der angegebenen Nummer zurück. Wenn es eilt: <a href="tel:+49332963222">03329 63222</a>.`;
    } catch {
      fehler.textContent = `Das hat nicht geklappt. Ihre Eingaben sind noch da. Bitte versuchen Sie es noch einmal oder rufen Sie an: ${KONFIG.TEL}.`;
    } finally { knopf.disabled = false; }
  });
  $('[type="submit"]', form).disabled = false; // erst freigeben, wenn der Handler steht
  form.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false'); });
})();

addEventListener('load', () => { if (hatGsap) ScrollTrigger.refresh(); });
