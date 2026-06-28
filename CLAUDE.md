# wega-learn — CLAUDE.md

Interactive browser-based learning app for XPath, FLWOR (XQuery), and XSLT — built around real TEI/WeGA data.

→ Infra, SSH, Server-Verbindungen: [WeGA-WebApp infra-ref](../WeGA-WebApp/infra-ref/README.md)

**CLAUDE.md-Größenregel:** ≤ ~120 Zeilen. Wächst ein Abschnitt → auslagern.

> **Lokales Setup:** `.claude/` ist in `.gitignore` ausgeschlossen.

---

## Projekt-Ziel

Korbinian lernt XPath 3.1, XQuery/FLWOR und XSLT 1.0 durch interaktive Challenges mit echten TEI-XML-Daten aus der WeGA (Weber-Gesamtausgabe). Ziel: Syntax-Sicherheit und Verständnis der WeGA-Konventionen, Vorbereitung auf Mitarbeit am Edirom/WeGA-WebApp-Projekt.

## App-Architektur

- **Single-Page-App** — reines HTML/CSS/JS, keine Build-Pipeline
- **FontoxPath** (CDN) — XPath 3.1 + XQuery/FLWOR im Browser
- **Browser-native XSLTProcessor** — XSLT 1.0 (identisch mit WeGA-Produktivumgebung)
- **Challenge-Daten** als JSON in `challenges/`
- **TEI-XML-Fixtures** als JS-Strings in `data/`

## Lernstruktur

| Welt | Technologie | Challenges | Ziel |
|------|-------------|------------|------|
| 1 — XPath Navigator | XPath 3.1 | 12 | Navigation, Achsen, Predicates, Funktionen |
| 2 — FLWOR Forge | XQuery/FLWOR | 12 | for/let/where/order by/return, Aggregation |
| 3 — XSLT Basics | XSLT 1.0 | 12 | value-of, for-each, if/choose, Attribute |
| 4 — WeGA Patterns | XSLT 1.0 + XPath | 12 | apply-templates, tei:*/WeGA-Konventionen |

Gesamt: **48 Challenges** in 4 Welten.

## Gamification-Regeln

- XP pro Challenge (100 Basis, Abzug pro Hint, Bonus für "Perfect")
- Streak-Zähler (sichtbar, motivierend)
- Visuelles Feedback: grüner Blitz / roter Shake + Vibration
- Hint-System: 3 Hints pro Challenge, kostet je 25 XP
- Lösungsanzeige: zeigt Code + Erklärung WARUM es so gemacht wird
- Fortschritt in localStorage persisted
- Abschluss-Badge pro Welt

## TEI-Daten

Weber-Briefe und Personen-Datensätze (Public Domain, aus WeGA-API oder Repository).
Vereinfacht aber realistisch — echte Namespaces (`xmlns:tei="http://www.tei-c.org/ns/1.0"`), echte Attribute (`@key`, `@type`, `@when`), echte Strukturen wie `tei:correspDesc`, `tei:note`, `tei:persName`.

## Wichtige Designentscheidungen

- Jede Challenge hat: Aufgabentext (DE), XML-Fixture, erwarteter Output, Hints (3), Lösung + Erklärung
- Hints sind pädagogisch: erklären WARUM, nicht nur WAS
- Lösung zeigt Pattern-Name (z.B. "push-style XSLT") + Link auf WeGA-Repo-Stelle wo es genutzt wird
- Mobile-first UI, aber Primärtarget ist Desktop (Laptop beim Lernen)
- Keyboard-Shortcut: Ctrl+Enter = ausführen, Tab = Hint, Escape = zurück

## File-Struktur

```
wega-learn/
├── index.html          # Shell + Weltauswahl
├── app.js              # Challenge-Runner, XP-Logik, State
├── style.css           # UI, Animationen
├── challenges/
│   ├── world1-xpath.json
│   ├── world2-flwor.json
│   ├── world3-xslt-basics.json
│   └── world4-wega-patterns.json
└── data/
    └── tei-fixtures.js # TEI-XML als JS-Strings (kein CORS-Problem)
```

## Fork-Workflow

Remote: `origin` = komisla/wega-learn (eigenes Repo, kein Fork)

---

## Offene Issues

Siehe GitHub Issues — https://github.com/komisla/wega-learn/issues
