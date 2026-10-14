# -*- coding: utf-8 -*-
"""Prüfung der Krause-Website (Nachtprüfung 15.10.2026). Liest nur.

Aufruf: python3 tests/pruef_seite.py <Seitenordner> [--live] [--moveos <Pfad zu moveos>]
  ohne --live: Vorschau. Entwurfsschalter, noindex und robots-Sperre sind dann nur Hinweise.
  mit  --live: dieselben Punkte sind Fehler (Startblocker vor dem Livegang).
Exit 0 = alles gut, Exit 1 = Befund.

Geprüft: Pflichtseiten Impressum und Datenschutz (da, verlinkt, Kerndaten), Kontaktformular sendet
an die Move-OS-Route (und die erlaubt die Kundendomain), keine toten internen Links (HTML und CSS),
keine verbotenen Aussagen (Kfz-Meisterbetrieb, Anhänger-Service), Entwurfs-Schalter.
"""
import html, pathlib, re, sys, urllib.parse

argv = sys.argv[1:]
LIVE = "--live" in argv
MOVEOS = None
if "--moveos" in argv:
    MOVEOS = pathlib.Path(argv[argv.index("--moveos") + 1])
pos = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] != "--moveos")]
W = pathlib.Path(pos[0] if pos else ".").resolve()
befunde, hinweise = [], []
ok = lambda s: print("   ok   " + s)
def lies(p): return (W / p).read_text(encoding="utf-8") if (W / p).exists() else ""
def text(h): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", " ", h, flags=re.S))))

idx = lies("index.html")
if not idx:
    print(f"index.html fehlt in {W}"); sys.exit(1)
app = lies("js/app.js")

# ---------------------------------------------------------------- Pflichtseiten
for datei, muss in (("impressum.html", ["Fahrzeugtechnik Krause", "Striewitzweg", "14532 Stahnsdorf"]),
                    ("datenschutz.html", ["Verantwortlich", "Fahrzeugtechnik Krause"])):
    h = lies(datei)
    if not h:
        befunde.append(f"Pflichtseite fehlt: {datei}"); continue
    fehlt = [m for m in muss if m not in text(h)]
    if fehlt: befunde.append(f"{datei}: Angaben fehlen: {', '.join(fehlt)}")
    elif not re.search(rf'href="(\./)?{re.escape(datei)}"', idx): befunde.append(f"Startseite verlinkt {datei} nicht")
    else: ok(f"{datei} da, verlinkt, Kerndaten vorhanden")
if "Handelsregister" not in text(lies("impressum.html")) and "HRB" not in lies("impressum.html"):
    hinweise.append("Impressum ohne Handelsregister/HRB (GmbH: Registergericht und Nummer sind Pflicht, § 5 DDG)")

# ---------------------------------------------------------------- Kontaktformular
END = re.search(r"ENDPUNKT:\s*'([^']+)'", app)
if not END or "/api/public/krause-anfrage" not in END.group(1):
    befunde.append("Kontaktformular: ENDPUNKT in js/app.js zeigt nicht auf die Move-OS-Route krause-anfrage")
elif "fetch(KONFIG.ENDPUNKT" not in app:
    befunde.append("Kontaktformular: js/app.js schickt nicht per fetch an KONFIG.ENDPUNKT")
else:
    ok(f"Kontaktformular sendet an {END.group(1)}")
if re.search(r'<form[^>]*action="mailto:', idx):
    befunde.append("Ein Formular sendet per mailto, das soll über Move OS gehen")
if MOVEOS and (MOVEOS / "app/api/public/krause-anfrage/route.ts").exists():
    r = (MOVEOS / "app/api/public/krause-anfrage/route.ts").read_text(encoding="utf-8")
    erlaubt = set(re.findall(r'"([a-z0-9.-]+\.de)"', r.split("const ANLIEGEN")[0]))
    for d in ("reifenkrause.de", "www.reifenkrause.de", "fahrzeugtechnik-krause.de"):
        if d not in erlaubt: befunde.append(f"Move-OS-Route lässt Herkunft {d} nicht zu (ERLAUBT in krause-anfrage/route.ts)")
    if "KRAUSE_ABSENDER" not in r: befunde.append("Move-OS-Route nutzt keinen Kunden-Absender (KRAUSE_ABSENDER)")
    if not any("lässt Herkunft" in b for b in befunde): ok("Move-OS-Route erlaubt die Krause-Domains und sendet mit KRAUSE_ABSENDER")
# Anliegen im Formular müssen zur Liste der Route passen, sonst lehnt der Server mit 400 ab.
if MOVEOS and (MOVEOS / "app/api/public/krause-anfrage/route.ts").exists():
    anl_route = set(re.findall(r'"([^"]+)"', re.search(r"const ANLIEGEN = new Set\(\[(.*?)\]\)", r, re.S).group(1)))
    sel = re.search(r'<select[^>]*name="anliegen".*?</select>', idx, re.S)
    anl_seite = set()
    for attr, inhalt in re.findall(r"<option([^>]*)>(.*?)</option>", sel.group(0) if sel else "", re.S):
        v = re.search(r'value="([^"]*)"', attr)
        wert = html.unescape(v.group(1) if v else inhalt.strip())
        if wert: anl_seite.add(wert)
    if not sel: befunde.append("Kontaktformular: Auswahl „anliegen“ fehlt")
    fremd = sorted(anl_seite - anl_route)
    if fremd: befunde.append(f"Formular bietet Anliegen, die die Route ablehnt: {', '.join(fremd)}")
    elif anl_seite: ok(f"{len(anl_seite)} Anliegen im Formular, alle von der Route angenommen")

# ---------------------------------------------------------------- tote interne Links
tot = {}
def pruefe(quelle, url, basis):
    u = html.unescape(url).split("#")[0].split("?")[0]
    if not u or re.match(r"^(https?:|mailto:|tel:|data:|javascript:|//|blob:)", u) or "${" in u: return
    ziel = (basis / urllib.parse.unquote(u)).resolve() if not u.startswith("/") else (W / urllib.parse.unquote(u.lstrip("/"))).resolve()
    if not (ziel.is_file() or (ziel / "index.html").is_file()): tot.setdefault(u, quelle)
for p in sorted(W.glob("*.html")):
    h = re.sub(r"<!--.*?-->", " ", p.read_text(encoding="utf-8"), flags=re.S)
    for u in re.findall(r'(?:href|src|poster|data-src)="([^"]+)"', h): pruefe(p.name, u, W)
    for u in re.findall(r'srcset="([^"]+)"', h):
        for teil in u.split(","): pruefe(p.name, teil.strip().split(" ")[0], W)
for c in sorted(W.glob("css/*.css")):
    for u in re.findall(r"url\(\s*['\"]?([^'\")]+)", c.read_text(encoding="utf-8")): pruefe(c.name, u, c.parent)
MEDIEN = re.compile(r"((?:video|bilder|schriften)/[^'\"?\s,]+\.(?:mp4|webm|jpg|jpeg|webp|png|svg|woff2))(?:\?[^'\"\s,]*)?['\"]")
for j in sorted(W.glob("js/*.js")) + sorted(W.glob("*.html")):   # auch Medienlisten in data-Attributen (JSON)
    for u in MEDIEN.findall(html.unescape(j.read_text(encoding="utf-8"))): pruefe(j.name, u, W)
if tot: befunde.append(f"{len(tot)} tote interne Verweise, z. B. " + "; ".join(f"{u} (in {q})" for u, q in list(tot.items())[:6]))
else: ok("interne Verweise: alle Ziele vorhanden (HTML, CSS, Medien in JS)")

# ---------------------------------------------------------------- Aussagen (Ralf, 05.10.2026)
alles = text(idx) + " " + app
if re.search(r"Kfz-Meisterbetrieb", alles): befunde.append("„Kfz-Meisterbetrieb“ steht auf der Seite (Ralf: nie, Meister ist Vulkaniseur-Handwerk, § 7a HwO)")
if re.search(r"Anhänger-Service", text(idx)): befunde.append("„Anhänger-Service“ steht auf der Seite (gibt es laut Ralf nicht)")
if not [b for b in befunde if "Meister" in b or "Anhänger" in b]: ok("keine verbotenen Aussagen (Kfz-Meisterbetrieb, Anhänger-Service)")

# ---------------------------------------------------------------- Livegang-Schalter
start = []
if re.search(r"ENTWURF:\s*true", app): start.append("js/app.js KONFIG.ENTWURF ist true: das Kontaktformular verschickt NICHTS")
if re.search(r'<meta name="robots" content="[^"]*noindex', idx): start.append("index.html hat <meta robots noindex>")
rob = lies("robots.txt")
if re.search(r"^Disallow:\s*/\s*$", rob, re.M): start.append("robots.txt sperrt die ganze Seite (Disallow: /)")
if "class=\"entwurf" in idx or "ENTWURF: vor dem Livegang" in idx: start.append("Entwurfs-Banner/Kommentar in index.html")
if re.search(r"WHATSAPP:\s*''", app): start.append("WhatsApp-Nummer fehlt (KONFIG.WHATSAPP leer, Knopf zeigt nur Hinweis)")
for s in start:
    (befunde if LIVE else hinweise).append(("Startblocker: " if LIVE else "vor Livegang: ") + s)
if not start: ok("Livegang-Schalter stehen auf live")

for h_ in hinweise: print("   HINWEIS " + h_)
if befunde:
    print("\nBEFUNDE:"); [print("  - " + b) for b in befunde]
    sys.exit(1)
sys.exit(0)
