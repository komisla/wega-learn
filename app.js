/* ============================================================
   wega-learn — app.js
   Challenge-Runner, XP-Logik, State, Event-Handling
   ============================================================ */
'use strict';

// ----------------------------- Config -----------------------------
const XP_BASE = 100;
const HINT_PENALTY = 25;
const PERFECT_BONUS = 50;
const STORAGE_KEY = 'wega-learn-state';

const WORLD_META = {
  1: { icon: '🧭', name: 'XPath Navigator', tech: 'XPath 3.1' },
  2: { icon: '⚗️', name: 'FLWOR Forge',    tech: 'XQuery / FLWOR' },
  3: { icon: '🔧', name: 'XSLT Basics',    tech: 'XSLT 1.0' },
  4: { icon: '🏛️', name: 'WeGA Patterns',  tech: 'XSLT 1.0 + XPath' },
  5: { icon: '🗄️', name: 'eXist-db Query', tech: 'XQuery + eXist-db' }
};
const MAX_WORLD = 5;

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

const XQUERY_STARTER =
`declare namespace tei="http://www.tei-c.org/ns/1.0";

(: Dein Code hier :)
`;

const nsResolverFn = p => ({
  'tei': 'http://www.tei-c.org/ns/1.0',
  'xml': 'http://www.w3.org/XML/1998/namespace'
}[p] || null);

// ----------------------------- State -----------------------------
let state = loadState();
let current = null;
let hintsUsed = 0;
let attempts = 0;
let solved = false;

function defaultState() {
  return {
    xp: 0,
    streak: 0,
    completed: [],
    unlockedWorlds: [1],
    seenConcepts: []   // keys like "1:Grundnavigation"
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return Object.assign(defaultState(), JSON.parse(raw));
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
  xpFloatLayer: $('xpFloatLayer'),
  conceptOverlay: $('conceptOverlay')
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
function conceptKey(world, tag) { return world + ':' + tag; }
function hasSeenConcept(world, tag) {
  return state.seenConcepts.includes(conceptKey(world, tag));
}
function markConceptSeen(world, tag) {
  const k = conceptKey(world, tag);
  if (!state.seenConcepts.includes(k)) {
    state.seenConcepts.push(k);
    saveState();
  }
}

// ============================================================
//  Screen 1: Weltauswahl
// ============================================================
function renderWorldSelect() {
  els.worldGrid.innerHTML = '';
  for (let w = 1; w <= MAX_WORLD; w++) {
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
      skip.addEventListener('click', () => unlockWorld(w));
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
  const ch = worldChallenges(world);
  let idx = ch.findIndex(c => !isCompleted(c.id));
  if (idx === -1) idx = 0;
  openChallenge(world, idx);
}

// ============================================================
//  Concept Card
// ============================================================
function needsConceptCard(world, index) {
  const ch = challengeAt(world, index);
  if (!ch || !ch.conceptTag) return false;
  const tag = ch.conceptTag;
  if (hasSeenConcept(world, tag)) return false;
  // nur zeigen wenn entweder erste Challenge der Gruppe ODER
  // vorherige Challenge hatte anderen conceptTag
  if (index === 0) return true;
  const prev = challengeAt(world, index - 1);
  return !prev || prev.conceptTag !== tag;
}

function showConceptCard(world, conceptTag, onDone) {
  const concepts = window.CONCEPTS || {};
  const key = conceptKey(world, conceptTag);
  const data = concepts[key];

  markConceptSeen(world, conceptTag);

  const overlay = els.conceptOverlay;
  overlay.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'concept-card-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'concept-card-header';
  header.innerHTML =
    '<span class="concept-card-icon">' + (data ? data.icon : '📖') + '</span>' +
    '<span class="concept-card-title">Konzept: ' + escapeHtml(conceptTag) + '</span>';
  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'concept-card-body';
  if (data && data.lines) {
    const pre = document.createElement('pre');
    pre.className = 'concept-card-pre';
    pre.textContent = data.lines.join('\n');
    body.appendChild(pre);
  } else {
    body.textContent = '(Kein Inhalt vorhanden)';
  }
  card.appendChild(body);

  // Button
  const btn = document.createElement('button');
  btn.className = 'primary-btn concept-card-btn';
  btn.textContent = 'Verstanden →';
  btn.addEventListener('click', () => {
    overlay.hidden = true;
    onDone();
  });
  card.appendChild(btn);

  overlay.appendChild(card);
  overlay.hidden = false;
  btn.focus();
}

// ============================================================
//  Screen 2: Challenge
// ============================================================
function showScreen(which) {
  els.worldSelect.classList.toggle('active', which === 'world');
  els.challengeScreen.classList.toggle('active', which === 'challenge');
}

function openChallenge(world, index) {
  // Concept card gate
  if (needsConceptCard(world, index)) {
    const ch = challengeAt(world, index);
    showScreen('challenge');
    showConceptCard(world, ch.conceptTag, () => _doOpenChallenge(world, index));
    return;
  }
  _doOpenChallenge(world, index);
}

function _doOpenChallenge(world, index) {
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
  // code-task styling for challenges where task contains code blocks (explain/write-only)
  els.cTask.classList.toggle('code-task', ch.type === 'explain' || ch.type === 'write-only');
  els.cConcept.textContent = ch.conceptTag || '';

  const fixtureName = ch.fixture || '';
  els.cFixtureName.textContent = fixtureName;

  // XML panel — show fixture if available, else code snippet in task
  const xml = fixtureName ? (window.TEI_FIXTURES[fixtureName] || '(Fixture nicht gefunden)') : '';
  if (xml) {
    els.xmlView.textContent = xml;
    els.xmlView.removeAttribute('data-highlighted');
    if (window.hljs) { els.xmlView.className = 'language-xml'; window.hljs.highlightElement(els.xmlView); }
    els.xmlView.closest('.xml-panel').hidden = false;
  } else {
    els.xmlView.textContent = '';
    // For explain/write-only, task text contains the code — hide xml panel
    els.xmlView.closest('.xml-panel').hidden = true;
  }

  // Configure UI per challenge type
  setupChallengeUI(ch);

  showScreen('challenge');
  if (ch.type !== 'explain') setTimeout(() => els.editor.focus(), 50);
}

function setupChallengeUI(ch) {
  // Reset common UI
  els.outputView.textContent = '—';
  els.outputView.className = 'io-box';
  els.expectedView.className = 'io-box';
  els.feedbackMsg.textContent = '';
  els.feedbackMsg.className = 'feedback-msg';
  els.hintArea.hidden = true;
  els.hintArea.innerHTML = '';
  els.nextBtn.hidden = true;
  els.hintBtn.disabled = false;

  // Remove any previously injected special panels
  const prev = $('mcPanel');
  if (prev) prev.remove();
  const prevWo = $('woPanel');
  if (prevWo) prevWo.remove();

  if (ch.type === 'explain') {
    setupExplainUI(ch);
  } else if (ch.type === 'write-only') {
    setupWriteOnlyUI(ch);
  } else {
    // xpath / flwor / xslt
    els.editorLabel.textContent =
      ch.type === 'xpath'  ? 'Dein XPath-Ausdruck' :
      ch.type === 'flwor'  ? 'Dein FLWOR/XQuery-Ausdruck' :
                             'Dein XSLT-Stylesheet';
    els.editor.value = ch.type === 'xslt' ? XSLT_STARTER : '';
    els.editor.hidden = false;
    els.editorLabel.hidden = false;
    els.runBtn.hidden = false;
    els.runBtn.textContent = '▶ Ausführen';

    els.expectedView.textContent = formatExpected(ch);
    updateHintCount(ch);

    // Show both io panels
    const ioRow = document.querySelector('.io-row');
    if (ioRow) ioRow.hidden = false;
    els.solutionBtn.hidden = false;
    els.hintBtn.hidden = false;
  }
}

// ---- explain (Multiple Choice) ----
function setupExplainUI(ch) {
  els.editor.hidden = true;
  els.editorLabel.hidden = true;
  els.runBtn.hidden = true;
  els.solutionBtn.hidden = true;
  els.hintBtn.hidden = false;
  updateHintCount(ch);
  const ioRow = document.querySelector('.io-row');
  if (ioRow) ioRow.hidden = true;

  const panel = document.createElement('div');
  panel.id = 'mcPanel';
  panel.className = 'mc-panel';

  const opts = ch.options || [];
  opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'mc-option';
    btn.dataset.idx = i;
    btn.innerHTML = '<span class="mc-letter">' + String.fromCharCode(65 + i) + '</span> ' + escapeHtml(opt);
    btn.addEventListener('click', () => handleMCAnswer(ch, i, panel));
    panel.appendChild(btn);
  });

  // Insert the panel after the action-bar context — before hintArea
  const workArea = document.querySelector('.work-area');
  workArea.after(panel);
}

function handleMCAnswer(ch, chosen, panel) {
  const correct = chosen === ch.correctOption;
  attempts++;
  // Lock all buttons
  panel.querySelectorAll('.mc-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === ch.correctOption) btn.classList.add('mc-correct');
    else if (i === chosen && !correct) btn.classList.add('mc-wrong');
  });

  if (correct) {
    els.feedbackMsg.textContent = '✓ Richtig!';
    els.feedbackMsg.className = 'feedback-msg ok';
    onCorrect(ch);
  } else {
    els.feedbackMsg.textContent = '✗ Nicht ganz — die korrekte Antwort ist grün markiert.';
    els.feedbackMsg.className = 'feedback-msg bad';
    // Still show explanation + next
    showExplanation(ch);
    els.nextBtn.hidden = false;
    if (navigator.vibrate) navigator.vibrate(80);
  }
}

// ---- write-only (Self-Assessment) ----
function setupWriteOnlyUI(ch) {
  els.editorLabel.textContent = 'Dein XQuery-Code';
  els.editorLabel.hidden = false;
  els.editor.value = XQUERY_STARTER;
  els.editor.hidden = false;
  els.runBtn.hidden = true;
  els.solutionBtn.hidden = false;
  els.hintBtn.hidden = false;
  updateHintCount(ch);

  const ioRow = document.querySelector('.io-row');
  if (ioRow) ioRow.hidden = true;

  // Self-assessment buttons
  const panel = document.createElement('div');
  panel.id = 'woPanel';
  panel.className = 'wo-panel';

  panel.innerHTML =
    '<p class="wo-instruction">eXist-db-Funktionen laufen nicht im Browser — vergleiche deinen Code selbst mit der Lösung.</p>' +
    '<div class="wo-actions">' +
    '<button class="ghost-btn" id="woSelfCorrect">✓ Hab ich richtig</button>' +
    '<button class="ghost-btn" id="woSelfWrong">✗ Noch üben</button>' +
    '</div>';

  const workArea = document.querySelector('.work-area');
  workArea.after(panel);

  $('woSelfCorrect').addEventListener('click', () => {
    attempts = 1;
    onCorrect(ch);
  });
  $('woSelfWrong').addEventListener('click', () => {
    els.feedbackMsg.textContent = 'Schau dir die Lösung an und versuche es nochmal.';
    els.feedbackMsg.className = 'feedback-msg bad';
    revealSolution();
  });
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
  return ''; // explain, write-only
}

// ============================================================
//  Ausführen + Vergleich
// ============================================================
function runChallenge() {
  if (!current) return;
  const ch = challengeAt(current.world, current.index);
  if (ch.type === 'explain' || ch.type === 'write-only') return; // handled elsewhere
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
      namespaceResolver: nsResolverFn, language: lang
    });
  } catch (err) {
    return { error: humanizeError(err) };
  }

  if (ch.expectedType === 'number') {
    const num = typeof raw === 'number' ? raw : Number(coerceToStrings(raw)[0]);
    return { display: String(num), correct: num === ch.expected };
  }
  const arr = coerceToStrings(raw).map(s => normWs(s));
  const expected = ch.expected.map(s => normWs(s));
  return { display: JSON.stringify(arr, null, 2), correct: arraysEqual(arr, expected) };
}

function coerceToStrings(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(item => nodeToString(item));
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'string') return [String(raw)];
  return [nodeToString(raw)];
}
function nodeToString(item) {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (item.nodeType === 2) return item.value;
  if (typeof item.textContent === 'string') return item.textContent;
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
  if (xsltErr) return { error: 'Dein Stylesheet ist kein gültiges XML:\n' + cleanParserError(xsltErr.textContent) };

  const proc = new XSLTProcessor();
  try { proc.importStylesheet(xsltDoc); }
  catch (err) { return { error: 'Stylesheet konnte nicht geladen werden: ' + (err.message || err) }; }

  let frag;
  try { frag = proc.transformToFragment(xmlDoc, document); }
  catch (err) { return { error: 'Transformation fehlgeschlagen: ' + (err.message || err) }; }

  if (!frag) return { error: 'Die Transformation lieferte kein Ergebnis. Passt dein xsl:template match="/"?' };

  const container = document.createElement('div');
  container.appendChild(frag.cloneNode(true));
  const actualHtml = container.innerHTML;
  return { display: prettyHtml(actualHtml), correct: compareXSLTOutput(actualHtml, ch.expected) };
}

// ============================================================
//  XSLT-Vergleich
// ============================================================
function compareXSLTOutput(actual, expected) {
  return nodesEqual(parseFragment(actual), parseFragment(expected));
}
function parseFragment(html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html; return tpl.content;
}
function nodesEqual(aNode, eNode) {
  const aKids = significantChildren(aNode);
  const eKids = significantChildren(eNode);
  if (aKids.length !== eKids.length) return false;
  for (let i = 0; i < eKids.length; i++) if (!oneNodeEqual(aKids[i], eKids[i])) return false;
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
  const ael = a.el, eel = e.el;
  if (ael.tagName.toLowerCase() !== eel.tagName.toLowerCase()) return false;
  for (const attr of Array.from(eel.attributes)) {
    if (attr.name.startsWith('xmlns')) continue;
    if (normWs(ael.getAttribute(attr.name) || '') !== normWs(attr.value)) return false;
  }
  return nodesEqual(unwrapAutoTbody(ael), unwrapAutoTbody(eel));
}
function unwrapAutoTbody(el) {
  const kids = significantChildren(el);
  if (kids.length === 1 && kids[0].kind === 'el' && kids[0].el.tagName.toLowerCase() === 'tbody') return kids[0].el;
  return el;
}

// ============================================================
//  Korrekt / Falsch
// ============================================================
function onCorrect(ch) {
  els.outputView.classList.add('correct');
  els.expectedView.classList.add('correct');

  const alreadyCompleted = isCompleted(ch.id);
  solved = true;

  if (!alreadyCompleted) {
    // write-only and explain always give perfect XP (no auto-run possible)
    let gained = XP_BASE - hintsUsed * HINT_PENALTY;
    if ((hintsUsed === 0 && attempts === 1) || ch.type === 'explain' || ch.type === 'write-only') {
      gained += PERFECT_BONUS;
    }
    gained = Math.max(10, gained);

    state.xp += gained;
    state.streak += 1;
    state.completed.push(ch.id);
    saveState();

    floatXP(gained);
    pulseStat(els.xp.parentElement);
    pulseStat(els.streak.parentElement);
    updateStatsUI();

    const isP = (hintsUsed === 0 && attempts === 1) || ch.type === 'explain' || ch.type === 'write-only';
    els.feedbackMsg.textContent = (isP ? '✓ Perfect! +' : '✓ Korrekt! +') + gained + ' XP';
    els.feedbackMsg.className = 'feedback-msg ok';
  } else {
    els.feedbackMsg.textContent = '✓ Korrekt! (bereits abgeschlossen)';
    els.feedbackMsg.className = 'feedback-msg ok';
  }

  showExplanation(ch);
  maybeUnlockNext(ch.world);
  els.nextBtn.hidden = false;
  els.nextBtn.focus();
}

function onWrong() {
  els.outputView.classList.add('error');
  els.editor.classList.remove('shake');
  void els.editor.offsetWidth;
  els.editor.classList.add('shake');
  els.feedbackMsg.textContent = '✗ Noch nicht ganz. Vergleiche Output und Erwartet.';
  els.feedbackMsg.className = 'feedback-msg bad';
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
  let exp = els.hintArea.querySelector('.explanation');
  if (!exp) {
    exp = document.createElement('div');
    exp.className = 'explanation';
    els.hintArea.appendChild(exp);
  }
  exp.innerHTML = '<strong>Erklärung:</strong> ' + escapeHtml(ch.explanation);
}

function maybeUnlockNext(world) {
  if (isWorldDone(world) && world < MAX_WORLD && !isWorldUnlocked(world + 1)) {
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
  const exp = els.hintArea.querySelector('.explanation');
  if (exp) els.hintArea.insertBefore(item, exp); else els.hintArea.appendChild(item);
  hintsUsed++;
  updateHintCount(ch);
}

function revealSolution() {
  if (!current) return;
  const ch = challengeAt(current.world, current.index);
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

  if (ch.type === 'xslt') {
    els.editor.value = wrapXsltSolution(ch.solution);
  } else if (ch.type !== 'explain') {
    els.editor.value = ch.solution;
  }
}

function wrapXsltSolution(body) {
  if (body.includes('<xsl:stylesheet')) return body;
  const isTopLevel = /<xsl:template|<xsl:key/.test(body);
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
    if (isWorldDone(current.world)) showWorldDone(current.world);
    else openChallenge(current.world, 0);
  }
}

function showWorldDone(world) {
  const next = world + 1;
  els.worldDoneTitle.textContent = WORLD_META[world].name + ' abgeschlossen!';
  let txt = 'Alle 12 Challenges gelöst. Aktueller Stand: ⚡ ' + state.xp + ' XP · 🔥 ' + state.streak + ' Streak.';
  if (next <= MAX_WORLD) {
    txt += ' Welt ' + next + ' (' + WORLD_META[next].name + ') ist jetzt freigeschaltet!';
  } else {
    txt += ' Du hast alle fünf Welten gemeistert — viel Erfolg im Vorstellungsgespräch!';
  }
  els.worldDoneText.textContent = txt;
  els.worldDoneOverlay.hidden = false;
}

// ============================================================
//  UI-Helfer
// ============================================================
function updateStatsUI() { els.xp.textContent = state.xp; els.streak.textContent = state.streak; }
function pulseStat(el) {
  if (!el) return;
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}
function floatXP(amount) {
  const f = document.createElement('div');
  f.className = 'xp-float';
  f.textContent = '+' + amount + ' XP';
  const r = (els.runBtn.hidden ? els.nextBtn : els.runBtn).getBoundingClientRect();
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
function cleanParserError(t) { return String(t).replace(/\s+/g, ' ').trim().slice(0, 300); }
function humanizeError(err) {
  let m = (err && err.message) ? err.message : String(err);
  if (/XPST0003/.test(m)) m = 'Syntaxfehler im Ausdruck (XPST0003). ' + m;
  else if (/XPST0008|XPST0017/.test(m)) m = 'Unbekannte Variable oder Funktion. ' + m;
  else if (/XPTY0004/.test(m)) m = 'Typ-/Multiplizitätsfehler (XPTY0004): Eine Funktion bekam mehr oder weniger Werte als erlaubt. Tipp: ggf. mit (…)[1] auf einen Wert reduzieren. ' + m;
  else if (/XPDY0002/.test(m)) m = 'Kontextfehler (XPDY0002). ' + m;
  return m;
}

function prettyHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  let out = ''; let depth = 0; const IND = '  ';
  function walk(nodes) {
    nodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = normWs(n.textContent);
        if (t) out += IND.repeat(depth) + t + '\n';
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const tag = n.tagName.toLowerCase();
        const attrs = Array.from(n.attributes)
          .filter(a => !a.name.startsWith('xmlns'))
          .map(a => ' ' + a.name + '="' + a.value + '"').join('');
        const kids = Array.from(n.childNodes).filter(k =>
          k.nodeType === Node.ELEMENT_NODE || (k.nodeType === Node.TEXT_NODE && normWs(k.textContent)));
        if (!kids.length) {
          out += IND.repeat(depth) + '<' + tag + attrs + '></' + tag + '>\n';
        } else if (kids.length === 1 && kids[0].nodeType === Node.TEXT_NODE) {
          out += IND.repeat(depth) + '<' + tag + attrs + '>' + normWs(kids[0].textContent) + '</' + tag + '>\n';
        } else {
          out += IND.repeat(depth) + '<' + tag + attrs + '>\n';
          depth++; walk(Array.from(n.childNodes)); depth--;
          out += IND.repeat(depth) + '</' + tag + '>\n';
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
    if (confirm('Gesamten Fortschritt (XP, Streak, gelöste Challenges, gesehene Konzept-Karten) zurücksetzen?')) {
      state = defaultState(); saveState(); showScreen('world'); renderWorldSelect();
    }
  });

  els.editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = els.editor.selectionStart;
      els.editor.value = els.editor.value.substring(0, s) + '  ' + els.editor.value.substring(els.editor.selectionEnd);
      els.editor.selectionStart = els.editor.selectionEnd = s + 2;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runChallenge(); }
  });

  document.addEventListener('keydown', e => {
    if (!els.challengeScreen.classList.contains('active')) return;
    const inEditor = document.activeElement === els.editor;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runChallenge(); return; }
    if (!inEditor) {
      if (e.key === 'h' || e.key === 'H') { e.preventDefault(); showNextHint(); }
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

// Debug-/Test-Hook
window.wegaLearn = {
  open: openChallenge,
  openDirect: _doOpenChallenge,  // bypasses concept card gate
  run: runChallenge,
  state: () => state,
  challenges: () => window.CHALLENGES,
  wrapXslt: wrapXsltSolution
};
