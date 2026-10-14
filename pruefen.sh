#!/bin/bash
# pruefen.sh: Prüfung vor jedem Ausrollen der Krause-Website (Live-Standard seit 15.10.2026).
# Exit 0 = alles gut, Exit 1 = etwas ist kaputt, NICHT ausrollen.
#
#   ./pruefen.sh         Vorschau: Entwurfsschalter (ENTWURF, noindex, robots-Sperre) sind nur Hinweise
#   ./pruefen.sh --live  vor dem echten Livegang: dieselben Punkte sind Fehler
#
# Liest nur. Prüft Pflichtseiten, Kontaktformular (inkl. Move-OS-Route, falls vorhanden), tote Links,
# verbotene Aussagen. Quelle der Seite: ~/Desktop/Move Society/krause/website-neu (dort eigenes pruefen.sh mit Bau).
set -u
cd "$(dirname "$0")" || exit 1
START=$(date +%s)
MOVEOS="$HOME/Desktop/Move Society/moveos"
ARGS=(.)
[ "${1:-}" = "--live" ] && ARGS+=(--live)
[ -d "$MOVEOS/app/api/public/krause-anfrage" ] && ARGS+=(--moveos "$MOVEOS")

echo "== Krause-Website (Vorschau-Repo): Prüfung $(date "+%d.%m.%Y %H:%M") $([ "${1:-}" = "--live" ] && echo "(Livegang)")"
python3 tests/pruef_seite.py "${ARGS[@]}"
RC=$?
echo "== Dauer: $(( $(date +%s) - START )) s"
if [ $RC -ne 0 ]; then
  echo ""
  echo "PRÜFUNG FEHLGESCHLAGEN, nicht ausrollen (Befunde oben)."
  exit 1
fi
echo "PRÜFUNG BESTANDEN: Krause-Website ist bereit zum Ausrollen$([ "${1:-}" = "--live" ] || echo ' (als Vorschau)')."
exit 0
