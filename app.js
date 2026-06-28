/* ============================================================
   wega-learn — app.js
   Challenge-Runner, XP-Logik, State, Event-Handling
   ============================================================ */
'use strict';

// ----------------------------- Config -----------------------------
const XP_BASE = 100;
const HINT_PENALTY = 25;   // pro genutztem Hint
const PERFECT_BONUS = 50;  // kein Hint, erster Versuch korrekt
const STORAGE_KEY = 'wega-learn-state';

const WORLD_META = {
  1: { icon: '🧭', name: 'XPath Navigator', tech: 'XPath 3.1' },
  2: { icon: '⚗️', name: 'FLWOR Forge',    tech: 'XQuery / FLWOR' },
  3: { icon: '🔧', name: 'XSLT Basics',    tech: 'XSLT 1.0' },
  4: { icon: '🏛️', name: 'WeGA Patterns',  tech: 'XSLT 1.0 + XPath' }
};

const XSLT_STARTER =
`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0">

  <xsl:output method="html"/>

  <xsl:template match="/">
    <!-- Dein Code hier -->
  </xsl:template>

</xsl:stylesheet>`;

// Namespace-Resolver für FontoxPath
const nsResolver = {
  lookupNamespaceURI: prefix => ({
    'tei': 'http://www.tei-c.org/ns/1.0',
    'xml': 'http://www.w3.org/XML/1998/namespace'
  }[prefix] || null)
};
// FontoxPath akzeptiert auch eine reine Funktion als namespaceResolver:
const nsResolverFn = p => nsResolver.lookupNamespaceURI(p);

// ----------------------------- State -----------------------------
let state = loadState();
let current = null;          // { world, index } während einer Challenge
let hintsUsed = 0;
let attempts = 0;
let solved = false;          // aktuelle Challenge in dieser Sitzung gelöst?

function defaultState() {
  return { xp: 0, streak: 0, completed: [], unlockedWorlds: [1] };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    return Object.assign(defaultState(), s);
  } catch (e) { return defaultState(); }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

// ----------------------------- DOM refs -----------------------------
const $ = id => document.getElementById(id);
const els = {
  xp: $('xpValue'), streak: $('streakValue'),
  worldSelect: $('worldSelect'), worldGrid: $('worldGrid'),
  challengeScreen: $('challengeScreen'),
  cWorldName: $('cWorldName'), cProgress: $('cProgress'),
  cTitleText: $('cTitleText'), cTask: $('cTask'), cConcept: $('cConcept'),
  cFixtureName: $('cFixtureName'), xmlView: $('xmlView'),
  editor: $('editor'), editorLabel: $('editorLabel'),
  outputView: $('outputView'), expectedView: $('expectedView'),
  hintBtn: $('hintBtn'), hintCount: $('hintCount'), hintArea: $('hintArea'),
  solutionBtn: $('solutionBtn'), runBtn: $('runBtn'), nextBtn: $('nextBtn'),
  feedbackMsg: $('feedbackMsg'),
  worldDoneOverlay: $('worldDoneOverlay'), worldDoneTitle: $('worldDoneTitle'),
  worldDoneText: $('worldDoneText'), worldDoneBtn: $('worldDoneBtn'),
  xpFloatLayer: $('xpFloatLayer')
};

// ----------------------------- Data access -----------------------------
function worldChallenges(world) { return (window.CHALLENGES['world' + world]) || []; }
function challengeAt(world, index) { return worldChallenges(world)[index]; }
function isCompleted(id) { return state.completed.includes(id); }
function worldCompletedCount(world) {
  return worldChallenges(world).filter(c => isCompleted(c.id)).length;
}
function isWorldUnlocked(world) { return state.unlockedWorlds.includes(world); }
function isWorldDone(world) {
  const ch = worldChallenges(world);
  return ch.length > 0 && ch.every(c => isCompleted(c.id));
}

// ============================================================
//  Screen 1: Weltauswahl
// ============================================================
function renderWorldSelect() {
  els.worldGrid.innerHTML = '';
  for (let w = 1; w <= 4; w++) {
    const meta = WORLD_META[w];
    const total = worldChallenges(w).length;
    const done = worldCompletedCount(w);
    const unlocked = isWorldUnlocked(w);
    const finished = isWorldDone(w);

    const card = document.createElement('div');
    card.className = 'world-card ' + (unlocked ? 'unlocked' : 'locked');

    card.innerHTML = `
      ${finished ? '<span class="done-badge">✅</span>' : (!unlocked ? '<span class="lock-icon">🔒</span>' : '')}
      <div class="world-icon">${meta.icon}</div>
      <div class="world-name">${meta.name}</div>
      <div class="world-tech">${meta.tech}</div>
      <div class="world-count">${total} Challenges</div>
      <div class="world-progress-bar"><div class="world-progress-fill" style="width:${total ? (done/total*100) : 0}%"></div></div>
      <div class="world-prog-text">${done}/${total}</div>
      <div class="world-actions"></div>
    `;

    const actions = card.querySelector('.world-actions');
    if (unlocked) {
      const btn = document.createElement('button');
      btn.className = 'primary-btn';
      btn.textContent = done > 0 && done < total ? 'Fortsetzen' : (finished ? 'Wiederholen' : 'Starten');
      btn.addEventListener('click', () => startWorld(w));
      actions.appendChild(btn);
    } else {
      const skip = document.createElement('button');
      skip.className = 'skip-link';
      skip.textContent = 'Überspringen (freischalten)';
      skip.addEventListener('click', () => { unlockWorld(w); });
      actions.appendChild(skip);
    }
    els.worldGrid.appendChild(card);
  }
  updateStatsUI();
}

function unlockWorld(world) {
  if (!state.unlockedWorlds.includes(world)) {
    state.unlockedWorlds.push(world);
    saveState();
  }
  renderWorldSelect();
}

function startWorld(world) {
  // erste nicht gelöste Challenge, sonst erste
  const ch = worldChallenges(world);
  let idx = ch.findIndex(c => !isCompleted(c.id));
  if (idx === -1) idx = 0;
  openChallenge(world, idx);
}

// ============================================================
//  Screen 2: Challenge
// ============================================================
function showScreen(which) {
  els.worldSelect.classList.toggle('active', which === 'world');
  els.challengeScreen.classList.toggle('active', which === 'challenge');
}

function openChallenge(world, index) {
  const ch = challengeAt(world, index);
  if (!ch) return;
  current = { world, index };
  hintsUsed = 0;
  attempts = 0;
  solved = isCompleted(ch.id);

  els.cWorldName.textContent = 'Welt ' + world + ': ' + ch.worldName;
  els.cProgress.textContent = (index + 1) + ' / ' + worldChallenges(world).length;
  els.cTitleText.textContent = ch.title;
  els.cTask.textContent = ch.task;
  els.cConcept.textContent = ch.conceptTag || '';
  els.cFixtureName.textContent = ch.fixture;

  // XML-Fixture anzeigen + highlighten
  const xml = window.TEI_FIXTURES[ch.fixture] || '(Fixture nicht gefunden)';
  els.xmlView.textContent = xml;
  els.xmlView.removeAttribute('data-highlighted');
  if (window.hljs) { els.xmlView.className = 'language-xml'; window.hljs.highlightElement(els.xmlView); }

  // Editor-Label + Startercode
  if (ch.type === 'xpath')      els.editorLabel.textContent = 'Dein XPath-Ausdruck';
  else if (ch.type === 'flwor') els.editorLabel.textContent = 'Dein FLWOR/XQuery-Ausdruck';
  else                          els.editorLabel.textContent = 'Dein XSLT-Stylesheet';

  els.editor.value = ch.type === 'xslt' ? XSLT_STARTER : '';

  // Erwartet anzeigen
  els.expectedView.textContent = formatExpected(ch);

  // Reset UI
  els.outputView.textContent = '—';
  els.outputView.className = 'io-box';
  els.expectedView.className = 'io-box';
  els.feedbackMsg.textContent = '';
  els.feedbackMsg.className = 'feedback-msg';
  els.hintArea.hidden = true;
  els.hintArea.innerHTML = '';
  els.nextBtn.hidden = true;
  els.hintBtn.disabled = false;
  updateHintCount(ch);

  showScreen('challenge');
  setTimeout(() => els.editor.focus(), 50);
}

function updateHintCount(ch) {
  const remaining = (ch.hints || []).length - hintsUsed;
  els.hintCount.textContent = Math.max(0, remaining);
  els.hintBtn.disabled = remaining <= 0;
}

function formatExpected(ch) {
  if (ch.expectedType === 'number') return String(ch.expected);
  if (ch.expectedType === 'stringArray') return JSON.stringify(ch.expected, null, 2);
  if (ch.expectedType === 'html') return prettyHtml(ch.expected);
  return String(ch.expected);
}

// ============================================================
//  Ausführen + Vergleich
// ============================================================
function runChallenge() {
  if (!current) return;
  const ch = challengeAt(current.world, current.index);
  attempts++;
  let result;
  try {
    if (ch.type === 'xpath')      result = runXPath(ch, false);
    else if (ch.type === 'flwor') result = runXPath(ch, true);
    else                          result = runXSLT(ch);
  } catch (err) {
    return showError(humanizeError(err));
  }
  if (result.error) return showError(result.error);

  // Output anzeigen
  els.outputView.textContent = result.display;
  els.outputView.className = 'io-box';

  if (result.correct) onCorrect(ch);
  else onWrong();
}

// ---- XPath / FLWOR via FontoxPath ----
function runXPath(ch, isXQuery) {
  const expr = els.editor.value.trim();
  if (!expr) return { error: 'Bitte gib einen Ausdruck ein.' };

  const xmlStr = window.TEI_FIXTURES[ch.fixture];
  const doc = new DOMParser().parseFromString(xmlStr, 'application/xml');
  const perr = doc.querySelector('parsererror');
  if (perr) return { error: 'Fixture-Parse-Fehler: ' + perr.textContent };

  const fx = window.fontoxpath;
  const lang = isXQuery ? fx.evaluateXPath.XQUERY_3_1_LANGUAGE : fx.evaluateXPath.XPATH_3_1_LANGUAGE;
  let raw;
  try {
    raw = fx.evaluateXPath(expr, doc, null, null, fx.evaluateXPath.ALL_RESULTS_TYPE, {
      namespaceResolver: nsResolverFn,
      language: lang
    });
  } catch (err) {
    return { error: humanizeError(err) };
  }

  if (ch.expectedType === 'number') {
    const num = typeof raw === 'number' ? raw : Number(coerceToStrings(raw)[0]);
    return {
      display: String(num),
      correct: num === ch.expected
    };
  }

  // stringArray
  const arr = coerceToStrings(raw).map(s => normWs(s));
  const expected = ch.expected.map(s => normWs(s));
  return {
    display: JSON.stringify(arr, null, 2),
    correct: arraysEqual(arr, expected)
  };
}

// FontoxPath ALL_RESULTS_TYPE liefert je nach Ausdruck Zahl, String, Node[] o.ä.
function coerceToStrings(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map(item => nodeToString(item));
  }
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'string') {
    return [String(raw)];
  }
  // einzelner Node
  return [nodeToString(raw)];
}
function nodeToString(item) {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (item.nodeType === 2) return item.value;                 // Attribut
  if (typeof item.textContent === 'string') return item.textContent; // Element/Text
  return String(item);
}

// ---- XSLT via Browser-XSLTProcessor ----
function runXSLT(ch) {
  let xsltStr = els.editor.value;
  if (!xsltStr.trim()) return { error: 'Bitte schreibe ein Stylesheet.' };

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(window.TEI_FIXTURES[ch.fixture], 'application/xml');
  const xmlErr = xmlDoc.querySelector('parsererror');
  if (xmlErr) return { error: 'Fixture-Parse-Fehler: ' + xmlErr.textContent };

  const xsltDoc = parser.parseFromString(xsltStr, 'application/xml');
  const xsltErr = xsltDoc.querySelector('parsererror');
  if (xsltErr) {
    return { error: 'Dein Stylesheet ist kein gültiges XML:\n' + cleanParserError(xsltErr.textContent) };
  }

  const proc = new XSLTProcessor();
  try { proc.importStylesheet(xsltDoc); }
  catch (err) { return { error: 'Stylesheet konnte nicht geladen werden: ' + (err.message || err) }; }

  let frag;
  try { frag = proc.transformToFragment(xmlDoc, document); }
  catch (err) { return { error: 'Transformation fehlgeschlagen: ' + (err.message || err) }; }

  if (!frag) return { error: 'Die Transformation lieferte kein Ergebnis. Passt dein xsl:template match=\"/\"?' };

  const container = document.createElement('div');
  container.appendChild(frag.cloneNode(true));
  const actualHtml = container.innerHTML;

  return {
    display: prettyHtml(actualHtml),
    correct: compareXSLTOutput(actualHtml, ch.expected)
  };
}

// ============================================================
//  XSLT-Vergleich: DOM-strukturell, whitespace-tolerant,
//  ignoriert xmlns-Deklarationen
// ============================================================
function compareXSLTOutput(actual, expected) {
  const a = parseFragment(actual);
  const e = parseFragment(expected);
  return nodesEqual(a, e, /*strictAttrs*/ false);
}
function parseFragment(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content;
}
// Vergleicht zwei DOM-Knotenlisten strukturell.
// expected gibt die geforderten Attribute vor; nur diese werden geprüft.
function nodesEqual(aNode, eNode) {
  const aKids = significantChildren(aNode);
  const eKids = significantChildren(eNode);
  if (aKids.length !== eKids.length) return false;
  for (let i = 0; i < eKids.length; i++) {
    if (!oneNodeEqual(aKids[i], eKids[i])) return false;
  }
  return true;
}
function significantChildren(node) {
  const out = [];
  node.childNodes.forEach(n => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = normWs(n.textContent);
      if (t !== '') out.push({ kind: 'text', text: t });
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      out.push({ kind: 'el', el: n });
    }
  });
  return out;
}
function oneNodeEqual(a, e) {
  if (a.kind !== e.kind) return false;
  if (e.kind === 'text') return a.text === e.text;
  // Element
  const ael = a.el, eel = e.el;
  if (ael.tagName.toLowerCase() !== eel.tagName.toLowerCase()) {
    // Browser fügt bei <table> automatisch <tbody> ein → toleriere.
    return false;
  }
  // Nur die in expected vorhandenen Attribute prüfen (xmlns ignorieren).
  for (const attr of Array.from(eel.attributes)) {
    if (attr.name.startsWith('xmlns')) continue;
    if (normWs(ael.getAttribute(attr.name) || '') !== normWs(attr.value)) return false;
  }
  return nodesEqual(unwrapAutoTbody(ael), unwrapAutoTbody(eel));
}
// Falls genau ein <tbody> automatisch eingefügt wurde, dessen Kinder hochziehen,
// damit Lösungen ohne explizites tbody trotzdem matchen.
function unwrapAutoTbody(el) {
  const kids = significantChildren(el);
  if (kids.length === 1 && kids[0].kind === 'el' && kids[0].el.tagName.toLowerCase() === 'tbody') {
    return kids[0].el;
  }
  return el;
}

// ============================================================
//  Korrekt / Falsch
// ============================================================
function onCorrect(ch) {
  els.outputView.classList.add('correct');
  els.expectedView.classList.add('correct');
  els.feedbackMsg.textContent = '✓ Korrekt!';
  els.feedbackMsg.className = 'feedback-msg ok';

  const firstTimeThisSession = !solved;
  const alreadyCompleted = isCompleted(ch.id);
  solved = true;

  // XP nur beim ersten Lösen (nicht beim Wiederholen) vergeben.
  if (!alreadyCompleted) {
    let gained = XP_BASE - hintsUsed * HINT_PENALTY;
    if (hintsUsed === 0 && attempts === 1) gained += PERFECT_BONUS;
    gained = Math.max(10, gained);

    state.xp += gained;
    state.streak += 1;
    state.completed.push(ch.id);
    saveState();

    floatXP(gained);
    pulseStat(els.xp.parentElement);
    pulseStat(els.streak.parentElement);
    updateStatsUI();

    if (hintsUsed === 0 && attempts === 1) {
      els.feedbackMsg.textContent = '✓ Perfect! +' + gained + ' XP';
    } else {
      els.feedbackMsg.textContent = '✓ Korrekt! +' + gained + ' XP';
    }
  } else {
    els.feedbackMsg.textContent = '✓ Korrekt! (bereits abgeschlossen)';
  }

  // Erklärung zeigen
  showExplanation(ch);

  // Welt-Freischaltung prüfen
  maybeUnlockNext(ch.world);

  els.nextBtn.hidden = false;
  els.nextBtn.focus();
}

function onWrong() {
  els.outputView.classList.add('error');
  els.editor.classList.remove('shake');
  void els.editor.offsetWidth; // reflow → Animation neu auslösen
  els.editor.classList.add('shake');
  els.feedbackMsg.textContent = '✗ Noch nicht ganz. Vergleiche Output und Erwartet.';
  els.feedbackMsg.className = 'feedback-msg bad';

  // Streak bricht NICHT bei falschem Versuch (nur bei Skip) — sanftere UX.
  if (navigator.vibrate) navigator.vibrate(80);
}

function showError(msg) {
  els.outputView.textContent = msg;
  els.outputView.className = 'io-box error';
  els.feedbackMsg.textContent = '✗ Fehler im Ausdruck';
  els.feedbackMsg.className = 'feedback-msg bad';
  els.editor.classList.remove('shake');
  void els.editor.offsetWidth;
  els.editor.classList.add('shake');
}

function showExplanation(ch) {
  if (!ch.explanation) return;
  els.hintArea.hidden = false;
  // Erklärung als eigenes Element unten anhängen (nur einmal)
  let exp = els.hintArea.querySelector('.explanation');
  if (!exp) {
    exp = document.createElement('div');
    exp.className = 'explanation';
    els.hintArea.appendChild(exp);
  }
  exp.innerHTML = '<strong>Erklärung:</strong> ' + escapeHtml(ch.explanation);
}

function maybeUnlockNext(world) {
  if (isWorldDone(world) && world < 4 && !isWorldUnlocked(world + 1)) {
    state.unlockedWorlds.push(world + 1);
    saveState();
  }
}

// ============================================================
//  Hints / Lösung
// ============================================================
function showNextHint() {
  if (!current) return;
  const ch = challengeAt(current.world, current.index);
  const hints = ch.hints || [];
  if (hintsUsed >= hints.length) return;

  els.hintArea.hidden = false;
  const item = document.createElement('div');
  item.className = 'hint-item';
  item.innerHTML = '<span class="hint-num">Hint ' + (hintsUsed + 1) + '</span>' + escapeHtml(hints[hintsUsed]);
  // vor der Erklärung einfügen
  const exp = els.hintArea.querySelector('.explanation');
  if (exp) els.hintArea.insertBefore(item, exp); else els.hintArea.appendChild(item);

  hintsUsed++;
  updateHintCount(ch);
}

function revealSolution() {
  if (!current) return;
  const ch = challengeAt(current.world, current.index);
  // Lösung verbraucht alle Hints (XP-Strafe), aber blockiert XP nicht komplett.
  hintsUsed = Math.max(hintsUsed, (ch.hints || []).length);
  updateHintCount(ch);

  els.hintArea.hidden = false;
  let sol = els.hintArea.querySelector('.hint-item.solution');
  if (!sol) {
    sol = document.createElement('div');
    sol.className = 'hint-item solution';
    const exp = els.hintArea.querySelector('.explanation');
    if (exp) els.hintArea.insertBefore(sol, exp); else els.hintArea.appendChild(sol);
  }
  sol.innerHTML = '<span class="hint-num">Lösung</span>So sieht eine korrekte Lösung aus:<code></code>';
  sol.querySelector('code').textContent = ch.solution;

  // Lösung optional in den Editor übernehmen
  if (ch.type === 'xslt') {
    els.editor.value = wrapXsltSolution(ch.solution);
  } else {
    els.editor.value = ch.solution;
  }
}

function wrapXsltSolution(body) {
  // Drei mögliche Formen einer XSLT-Lösung:
  //  1) vollständiges Stylesheet  -> unverändert
  //  2) eigene Top-Level-Templates (enthält <xsl:template / <xsl:key)
  //     -> als Stylesheet-Körper einsetzen (ersetzt das Starter-match="/")
  //  3) reiner Template-Körper (z. B. <p>…)  -> in match="/" einsetzen
  if (body.includes('<xsl:stylesheet')) return body;

  const isTopLevel = /<xsl:template|<xsl:key|<xsl:param\s|<xsl:variable[^>]*>\s*$/m.test(body)
    && /<xsl:template/.test(body);

  const indent = s => s.split('\n').map(l => '  ' + l).join('\n');

  if (isTopLevel) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0">

  <xsl:output method="html"/>

${indent(body)}

</xsl:stylesheet>`;
  }

  // reiner Körper -> in match="/" einsetzen
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0">

  <xsl:output method="html"/>

  <xsl:template match="/">
${body.split('\n').map(l => '    ' + l).join('\n')}
  </xsl:template>

</xsl:stylesheet>`;
}

// ============================================================
//  Navigation
// ============================================================
function goNext() {
  if (!current) return;
  const total = worldChallenges(current.world).length;
  if (current.index + 1 < total) {
    openChallenge(current.world, current.index + 1);
  } else {
    // Welt fertig?
    if (isWorldDone(current.world)) showWorldDone(current.world);
    else openChallenge(current.world, 0);
  }
}

function showWorldDone(world) {
  const next = world + 1;
  els.worldDoneTitle.textContent = WORLD_META[world].name + ' abgeschlossen!';
  let txt = 'Alle 12 Challenges gelöst. Aktueller Stand: ⚡ ' + state.xp + ' XP · 🔥 ' + state.streak + ' Streak.';
  if (next <= 4) txt += ' Welt ' + next + ' (' + WORLD_META[next].name + ') ist jetzt freigeschaltet!';
  else txt += ' Du hast alle vier Welten gemeistert. Viel Erfolg im Vorstellungsgespräch!';
  els.worldDoneText.textContent = txt;
  els.worldDoneOverlay.hidden = false;
}

// ============================================================
//  UI-Helfer
// ============================================================
function updateStatsUI() {
  els.xp.textContent = state.xp;
  els.streak.textContent = state.streak;
}
function pulseStat(el) {
  if (!el) return;
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}
function floatXP(amount) {
  const f = document.createElement('div');
  f.className = 'xp-float';
  f.textContent = '+' + amount + ' XP';
  const r = els.runBtn.getBoundingClientRect();
  f.style.left = (r.left + r.width / 2 - 30) + 'px';
  f.style.top = (r.top - 10) + 'px';
  els.xpFloatLayer.appendChild(f);
  setTimeout(() => f.remove(), 1200);
}

// ----------------------------- Utils -----------------------------
function normWs(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function cleanParserError(t) {
  return String(t).replace(/\s+/g, ' ').trim().slice(0, 300);
}
function humanizeError(err) {
  let m = (err && err.message) ? err.message : String(err);
  // FontoxPath-Fehlercodes lesbarer machen
  if (/XPST0003/.test(m)) m = 'Syntaxfehler im Ausdruck (XPST0003). ' + m;
  else if (/XPST0008|XPST0017/.test(m)) m = 'Unbekannte Variable oder Funktion. ' + m;
  else if (/XPTY0004/.test(m)) m = 'Typ-/Multiplizitätsfehler (XPTY0004): Eine Funktion bekam mehr oder weniger Werte als erlaubt. Tipp: ggf. mit (…)[1] auf einen Wert reduzieren. ' + m;
  else if (/XPDY0002/.test(m)) m = 'Kontextfehler (XPDY0002). ' + m;
  return m;
}

// Sehr leichtes Pretty-Printing für HTML-Output (Lesbarkeit im Output-Panel).
function prettyHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  let out = '';
  let depth = 0;
  const INDENT = '  ';
  function walk(nodes) {
    nodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = normWs(n.textContent);
        if (t) out += INDENT.repeat(depth) + t + '\n';
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const tag = n.tagName.toLowerCase();
        const attrs = Array.from(n.attributes)
          .filter(a => !a.name.startsWith('xmlns'))
          .map(a => ' ' + a.name + '="' + a.value + '"').join('');
        const kids = Array.from(n.childNodes).filter(k =>
          k.nodeType === Node.ELEMENT_NODE ||
          (k.nodeType === Node.TEXT_NODE && normWs(k.textContent)));
        if (kids.length === 0) {
          out += INDENT.repeat(depth) + '<' + tag + attrs + '></' + tag + '>\n';
        } else if (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE) {
          out += INDENT.repeat(depth) + '<' + tag + attrs + '>' + normWs(kids[0].textContent) + '</' + tag + '>\n';
        } else {
          out += INDENT.repeat(depth) + '<' + tag + attrs + '>\n';
          depth++; walk(Array.from(n.childNodes)); depth--;
          out += INDENT.repeat(depth) + '</' + tag + '>\n';
        }
      }
    });
  }
  walk(Array.from(tpl.content.childNodes));
  return out.trim() || '(leere Ausgabe)';
}

// ============================================================
//  Events
// ============================================================
function wireEvents() {
  $('brandHome').addEventListener('click', () => { showScreen('world'); renderWorldSelect(); });
  $('backBtn').addEventListener('click', () => { showScreen('world'); renderWorldSelect(); });
  els.runBtn.addEventListener('click', runChallenge);
  els.hintBtn.addEventListener('click', showNextHint);
  els.solutionBtn.addEventListener('click', revealSolution);
  els.nextBtn.addEventListener('click', goNext);
  els.worldDoneBtn.addEventListener('click', () => {
    els.worldDoneOverlay.hidden = true; showScreen('world'); renderWorldSelect();
  });
  $('resetBtn').addEventListener('click', () => {
    if (confirm('Gesamten Fortschritt (XP, Streak, gelöste Challenges) zurücksetzen?')) {
      state = defaultState(); saveState(); showScreen('world'); renderWorldSelect();
    }
  });

  // Tab-Handling im Editor (2 Spaces)
  els.editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = els.editor.selectionStart;
      els.editor.value = els.editor.value.substring(0, s) + '  ' + els.editor.value.substring(els.editor.selectionEnd);
      els.editor.selectionStart = els.editor.selectionEnd = s + 2;
    }
    // Ctrl+Enter führt aus
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault(); runChallenge();
    }
  });

  // Globale Shortcuts
  document.addEventListener('keydown', e => {
    if (!els.challengeScreen.classList.contains('active')) return;
    const inEditor = document.activeElement === els.editor;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runChallenge(); return; }
    if (!inEditor) {
      if ((e.key === 'h' || e.key === 'H')) { e.preventDefault(); showNextHint(); }
      if (e.key === 'ArrowRight' && !els.nextBtn.hidden) { e.preventDefault(); goNext(); }
    }
  });
}

// ----------------------------- Init -----------------------------
function init() {
  if (!window.fontoxpath) {
    alert('FontoxPath konnte nicht geladen werden (CDN). Bitte Internetverbindung prüfen und neu laden.');
  }
  wireEvents();
  renderWorldSelect();
  showScreen('world');
}
document.addEventListener('DOMContentLoaded', init);

// Debug-/Test-Hook (harmlos): erlaubt direktes Öffnen einer Challenge,
// z. B. window.wegaLearn.open(1, 0). Nützlich für automatisierte Tests.
window.wegaLearn = {
  open: openChallenge,
  run: runChallenge,
  state: () => state,
  challenges: () => window.CHALLENGES,
  wrapXslt: wrapXsltSolution
};
