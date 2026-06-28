/* ============================================================
   wega-learn — app.js
   Challenge-Runner, XP-Logik, State, Event-Handling
   Features: LLM-Lernprompt · Spaced Repetition · XSLT 2.0 (SaxonJS)
             Combo-Multiplikator · Achievements · Concept-Sandbox
   ============================================================ */
'use strict';

// ----------------------------- Config -----------------------------
const XP_BASE      = 100;
const HINT_PENALTY = 25;
const PERFECT_BONUS = 50;
const STORAGE_KEY  = 'wega-learn-state';

const WORLD_META = {
  1: { icon: '🧭', name: 'XPath Navigator',  tech: 'XPath 3.1' },
  2: { icon: '⚗️', name: 'FLWOR Forge',      tech: 'XQuery / FLWOR' },
  3: { icon: '🔧', name: 'XSLT Basics',      tech: 'XSLT 1.0' },
  4: { icon: '🏛️', name: 'WeGA Patterns',    tech: 'XSLT 1.0 + 2.0' },
  5: { icon: '🗄️', name: 'eXist-db Query',  tech: 'XQuery + eXist-db' }
};
const MAX_WORLD = 5;

const WORLD_TECH_LABEL = {
  1: 'XPath', 2: 'FLWOR', 3: 'XSLT 1.0', 4: 'XSLT 2.0', 5: 'XQuery in eXist-db'
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

const XSLT2_STARTER =
`<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:local="http://local"
  exclude-result-prefixes="tei xs local">

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

// ============================================================
//  Achievements
// ============================================================
const ACHIEVEMENTS = [
  { id: 'first_xpath',     icon: '🧭', name: 'Namespace-Jäger',     desc: 'Erste XPath-Challenge korrekt gelöst' },
  { id: 'no_hints_world1', icon: '🎓', name: 'Autodidakt',           desc: 'Welt 1 komplett ohne einen einzigen Hint' },
  { id: 'combo_5',         icon: '🔥', name: 'On Fire',              desc: '5 Challenges in Folge ohne Hint oder Fehler' },
  { id: 'llm_prompt',      icon: '🔍', name: 'Tiefgräber',           desc: 'LLM-Lernprompt 3× genutzt' },
  { id: 'first_mastered',  icon: '⭐', name: 'Meister eines Fachs',  desc: 'Erste Challenge gemeistert (3× ohne Hint)' },
  { id: 'world3_done',     icon: '🔧', name: 'Template-Schreiber',   desc: 'Welt 3 vollständig abgeschlossen' },
  { id: 'world4_done',     icon: '🏛️', name: 'WeGA-Kenner',          desc: 'Welt 4 vollständig abgeschlossen (inkl. XSLT 2.0)' },
  { id: 'all_mastered_w1', icon: '🧠', name: 'XPath-Instinkt',       desc: 'Alle Welt-1-Challenges gemeistert' }
];

// ----------------------------- State -----------------------------
let state = loadState();
let current = null;
let hintsUsed = 0;
let attempts = 0;
let solved = false;
let isReviewMode = false;
let reviewQueue = [];  // array of {world, index} for review mode

function defaultState() {
  return {
    xp: 0,
    streak: 0,
    completed: [],
    unlockedWorlds: [1],
    seenConcepts: [],
    challengeStats: {},   // 'w1c01': { attempts, hintsUsed, correctCount, lastSeen, mastered }
    achievements: [],     // array of unlocked achievement ids
    comboCount: 0,
    llmPromptCount: 0     // for 'Tiefgräber' achievement
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
  comboDisplay: $('comboDisplay'), comboText: $('comboText'),
  worldSelect: $('worldSelect'), worldGrid: $('worldGrid'),
  reviewBanner: $('reviewBanner'), reviewBannerText: $('reviewBannerText'), reviewBtn: $('reviewBtn'),
  challengeScreen: $('challengeScreen'),
  cWorldName: $('cWorldName'), cProgress: $('cProgress'),
  cTitleText: $('cTitleText'), cTask: $('cTask'), cConcept: $('cConcept'),
  cFixtureName: $('cFixtureName'), xmlView: $('xmlView'),
  editor: $('editor'), editorLabel: $('editorLabel'),
  outputView: $('outputView'), expectedView: $('expectedView'),
  hintBtn: $('hintBtn'), hintCount: $('hintCount'), hintArea: $('hintArea'),
  solutionBtn: $('solutionBtn'), runBtn: $('runBtn'), nextBtn: $('nextBtn'),
  llmPromptBtn: $('llmPromptBtn'),
  feedbackMsg: $('feedbackMsg'),
  worldDoneOverlay: $('worldDoneOverlay'), worldDoneTitle: $('worldDoneTitle'),
  worldDoneText: $('worldDoneText'), worldDoneBtn: $('worldDoneBtn'),
  xpFloatLayer: $('xpFloatLayer'),
  conceptOverlay: $('conceptOverlay'),
  achievementOverlay: $('achievementOverlay'),
  achievementUnlockIcon: $('achievementUnlockIcon'),
  achievementUnlockName: $('achievementUnlockName'),
  achievementUnlockDesc: $('achievementUnlockDesc'),
  achievementModal: $('achievementModal'),
  achievementGrid: $('achievementGrid'),
  achievementBtn: $('achievementBtn')
};

// ----------------------------- Data access -----------------------------
function worldChallenges(world) { return (window.CHALLENGES['world' + world]) || []; }
function challengeAt(world, index) { return worldChallenges(world)[index]; }
function isCompleted(id) { return state.completed.includes(id); }
function worldCompletedCount(world) {
  return worldChallenges(world).filter(c => isCompleted(c.id)).length;
}
function worldMasteredCount(world) {
  return worldChallenges(world).filter(c => isMastered(c.id)).length;
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
//  Challenge Stats + Mastery (Feature 2)
// ============================================================
function getStats(id) {
  if (!state.challengeStats[id]) {
    state.challengeStats[id] = { attempts: 0, hintsUsed: 0, correctCount: 0, lastSeen: null, mastered: false };
  }
  return state.challengeStats[id];
}

function isMastered(id) {
  return state.challengeStats[id] && state.challengeStats[id].mastered;
}

function recordChallengeResult(id, correct, usedHints) {
  const s = getStats(id);
  s.attempts++;
  s.lastSeen = new Date().toISOString().slice(0, 10);
  if (correct) {
    if (!usedHints) {
      s.correctCount++;
      if (s.correctCount >= 3 && !s.mastered) {
        s.mastered = true;
        saveState();
        checkAchievement('first_mastered');
        checkAllMasteredW1();
      }
    }
  }
  s.hintsUsed = usedHints ? (s.hintsUsed || 0) + 1 : s.hintsUsed;
  saveState();
}

// ============================================================
//  Review Mode (Feature 2)
// ============================================================
function buildReviewQueue() {
  const today = new Date().toISOString().slice(0, 10);
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const queue = [];

  for (let w = 1; w <= MAX_WORLD; w++) {
    worldChallenges(w).forEach((ch, idx) => {
      if (!isCompleted(ch.id)) return;
      if (isMastered(ch.id)) return;
      const s = state.challengeStats[ch.id];
      if (!s) return;
      // Include if: not mastered AND (has used hints at last attempt OR not seen in 2+ days)
      const notSeenRecently = !s.lastSeen || s.lastSeen <= twoDaysAgo;
      const hadHints = s.hintsUsed > 0;
      if (hadHints || notSeenRecently) {
        queue.push({ world: w, index: idx, lastSeen: s.lastSeen, hintsUsed: s.hintsUsed });
      }
    });
  }

  // Sort: challenges with hints first, then by lastSeen ascending (oldest first)
  queue.sort((a, b) => {
    if (b.hintsUsed !== a.hintsUsed) return b.hintsUsed - a.hintsUsed;
    if (a.lastSeen < b.lastSeen) return -1;
    if (a.lastSeen > b.lastSeen) return 1;
    return 0;
  });

  return queue;
}

function updateReviewBanner() {
  const queue = buildReviewQueue();
  if (queue.length > 0) {
    els.reviewBanner.hidden = false;
    els.reviewBannerText.textContent = '🔄 Review — ' + queue.length + ' offen';
  } else {
    els.reviewBanner.hidden = true;
  }
}

function startReviewMode() {
  reviewQueue = buildReviewQueue();
  if (reviewQueue.length === 0) return;
  isReviewMode = true;
  const first = reviewQueue.shift();
  openChallenge(first.world, first.index);
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
    const mastered = worldMasteredCount(w);
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
      <div class="world-prog-text">${done}/${total} ✓${mastered > 0 ? ' · ' + mastered + '⭐ gemeistert' : ''}</div>
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
  updateReviewBanner();
  updateAchievementBtn();
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

  // Feature 6: Sandbox
  if (data && data.sandbox) {
    const sb = buildConceptSandbox(data.sandbox);
    body.appendChild(sb);
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

// Feature 6: Concept Card Sandbox
function buildConceptSandbox(sbConfig) {
  const wrap = document.createElement('div');
  wrap.className = 'concept-sandbox';

  const label = document.createElement('div');
  label.className = 'concept-sandbox-label';
  label.textContent = '▶ Sandbox — einfach ausprobieren';
  wrap.appendChild(label);

  const textarea = document.createElement('textarea');
  textarea.className = 'concept-sandbox-input';
  textarea.rows = 2;
  textarea.placeholder = sbConfig.placeholder || '';
  textarea.spellcheck = false;
  wrap.appendChild(textarea);

  const actions = document.createElement('div');
  actions.className = 'concept-sandbox-actions';

  const runBtn = document.createElement('button');
  runBtn.className = 'concept-sandbox-run';
  runBtn.textContent = '▶ Ausprobieren';
  actions.appendChild(runBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'concept-sandbox-reset';
  resetBtn.textContent = '↺ Zurücksetzen';
  actions.appendChild(resetBtn);

  if (sbConfig.hint) {
    const hint = document.createElement('span');
    hint.className = 'concept-sandbox-hint-text';
    hint.textContent = sbConfig.hint;
    actions.appendChild(hint);
  }
  wrap.appendChild(actions);

  const output = document.createElement('pre');
  output.className = 'concept-sandbox-output';
  output.textContent = '(Ausgabe erscheint hier)';
  wrap.appendChild(output);

  runBtn.addEventListener('click', () => {
    const expr = textarea.value.trim();
    if (!expr) return;
    const fixtureKey = sbConfig.fixture || 'letter_001';
    const xmlStr = window.TEI_FIXTURES[fixtureKey] || '';
    try {
      const doc = new DOMParser().parseFromString(xmlStr, 'application/xml');
      const fx = window.fontoxpath;
      const isXQ = sbConfig.type === 'flwor';
      const lang = isXQ ? fx.evaluateXPath.XQUERY_3_1_LANGUAGE : fx.evaluateXPath.XPATH_3_1_LANGUAGE;
      const raw = fx.evaluateXPath(expr, doc, null, null, fx.evaluateXPath.ALL_RESULTS_TYPE, {
        namespaceResolver: nsResolverFn, language: lang
      });
      const strings = coerceToStrings(raw);
      output.textContent = strings.length === 0 ? '(kein Ergebnis)' :
        strings.length === 1 ? strings[0] : JSON.stringify(strings, null, 2);
      output.className = 'concept-sandbox-output has-result';
    } catch (err) {
      output.textContent = '✗ ' + (err.message || String(err)).slice(0, 200);
      output.className = 'concept-sandbox-output has-error';
    }
  });

  resetBtn.addEventListener('click', () => {
    textarea.value = '';
    output.textContent = '(Ausgabe erscheint hier)';
    output.className = 'concept-sandbox-output';
    textarea.focus();
  });

  // Keyboard shortcut inside sandbox
  textarea.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runBtn.click(); }
  });

  return wrap;
}

// ============================================================
//  Screen 2: Challenge
// ============================================================
function showScreen(which) {
  els.worldSelect.classList.toggle('active', which === 'world');
  els.challengeScreen.classList.toggle('active', which === 'challenge');
}

function openChallenge(world, index) {
  // Concept card gate (skip in review mode — they know the concept already)
  if (!isReviewMode && needsConceptCard(world, index)) {
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

  // Review mode: track that we've seen this challenge
  const s = getStats(ch.id);
  s.lastSeen = new Date().toISOString().slice(0, 10);
  saveState();

  els.cWorldName.textContent = (isReviewMode ? '🔄 Review — ' : '') + 'Welt ' + world + ': ' + ch.worldName;
  els.cProgress.textContent = isReviewMode
    ? (reviewQueue.length + 1) + ' verbleibend'
    : (index + 1) + ' / ' + worldChallenges(world).length;
  els.cTitleText.textContent = ch.title;
  els.cTask.textContent = ch.task;
  els.cTask.classList.toggle('code-task', ch.type === 'explain' || ch.type === 'write-only');
  els.cConcept.textContent = ch.conceptTag || '';

  const fixtureName = ch.fixture || '';
  els.cFixtureName.textContent = fixtureName;

  const xml = fixtureName ? (window.TEI_FIXTURES[fixtureName] || '(Fixture nicht gefunden)') : '';
  if (xml) {
    els.xmlView.textContent = xml;
    els.xmlView.removeAttribute('data-highlighted');
    if (window.hljs) { els.xmlView.className = 'language-xml'; window.hljs.highlightElement(els.xmlView); }
    els.xmlView.closest('.xml-panel').hidden = false;
  } else {
    els.xmlView.textContent = '';
    els.xmlView.closest('.xml-panel').hidden = true;
  }

  setupChallengeUI(ch);

  showScreen('challenge');
  if (ch.type !== 'explain') setTimeout(() => els.editor.focus(), 50);
}

function setupChallengeUI(ch) {
  els.outputView.textContent = '—';
  els.outputView.className = 'io-box';
  els.expectedView.className = 'io-box';
  els.feedbackMsg.textContent = '';
  els.feedbackMsg.className = 'feedback-msg';
  els.hintArea.hidden = true;
  els.hintArea.innerHTML = '';
  els.nextBtn.hidden = true;
  els.hintBtn.disabled = false;
  els.llmPromptBtn.hidden = true;

  // Remove previously injected special panels
  const prev = $('mcPanel');  if (prev) prev.remove();
  const prevWo = $('woPanel'); if (prevWo) prevWo.remove();
  // Remove LLM prompt feedback if present
  const prevLlm = $('llmPromptFeedback'); if (prevLlm) prevLlm.remove();

  // In review mode: hide hint button (no cheating in review)
  els.hintBtn.hidden = isReviewMode;

  if (ch.type === 'explain') {
    setupExplainUI(ch);
  } else if (ch.type === 'write-only') {
    setupWriteOnlyUI(ch);
  } else {
    const isXslt2 = ch.type === 'xslt2';
    const isXslt  = ch.type === 'xslt' || isXslt2;
    els.editorLabel.textContent =
      ch.type === 'xpath'  ? 'Dein XPath-Ausdruck' :
      ch.type === 'flwor'  ? 'Dein FLWOR/XQuery-Ausdruck' :
      isXslt2              ? 'Dein XSLT-2.0-Stylesheet (Saxon)' :
                             'Dein XSLT-Stylesheet';
    els.editor.value = isXslt2 ? XSLT2_STARTER : (isXslt ? XSLT_STARTER : '');
    els.editor.hidden = false;
    els.editorLabel.hidden = false;
    els.runBtn.hidden = false;
    els.runBtn.textContent = isXslt2 ? '▶ Saxon ausführen' : '▶ Ausführen';

    els.expectedView.textContent = formatExpected(ch);
    updateHintCount(ch);

    const ioRow = document.querySelector('.io-row');
    if (ioRow) ioRow.hidden = false;
    els.solutionBtn.hidden = false;
    els.hintBtn.hidden = isReviewMode;
  }
}

// ---- explain (Multiple Choice) ----
function setupExplainUI(ch) {
  els.editor.hidden = true;
  els.editorLabel.hidden = true;
  els.runBtn.hidden = true;
  els.solutionBtn.hidden = true;
  els.hintBtn.hidden = true;
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

  const workArea = document.querySelector('.work-area');
  workArea.after(panel);
}

function handleMCAnswer(ch, chosen, panel) {
  const correct = chosen === ch.correctOption;
  attempts++;
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
    breakCombo();
    showExplanation(ch);
    els.nextBtn.hidden = false;
    // In review mode: show LLM prompt immediately on wrong answer
    if (isReviewMode) showLLMPromptBtn(ch);
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
  els.hintBtn.hidden = true;

  const ioRow = document.querySelector('.io-row');
  if (ioRow) ioRow.hidden = true;

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
    breakCombo();
    revealSolution();
    if (isReviewMode) showLLMPromptBtn(ch);
  });
}

function updateHintCount(ch) {
  const remaining = (ch.hints || []).length - hintsUsed;
  els.hintCount.textContent = Math.max(0, remaining);
  els.hintBtn.disabled = remaining <= 0;
  // Show LLM prompt when all hints used and at least one wrong attempt
  if (remaining <= 0 && attempts > 0) showLLMPromptBtn(ch);
}

function formatExpected(ch) {
  if (ch.expectedType === 'number') return String(ch.expected);
  if (ch.expectedType === 'stringArray') return JSON.stringify(ch.expected, null, 2);
  if (ch.expectedType === 'html') return prettyHtml(ch.expected);
  return '';
}

// ============================================================
//  Feature 1: LLM-Lernprompt
// ============================================================
function showLLMPromptBtn(ch) {
  if (!els.llmPromptBtn.hidden) return; // already visible
  els.llmPromptBtn.hidden = false;

  els.llmPromptBtn.onclick = () => {
    const worldNum = current ? current.world : (ch.world || 1);
    const techLabel = WORLD_TECH_LABEL[worldNum] || 'XPath';
    const fixtureXml = ch.fixture ? (window.TEI_FIXTURES[ch.fixture] || '') : '';
    const fixtureLines = fixtureXml.split('\n').slice(0, 30).join('\n');
    const userInput = els.editor ? els.editor.value.trim() : '';

    let expectedDesc = '';
    if (ch.expectedType === 'number') expectedDesc = 'eine Zahl: ' + ch.expected;
    else if (ch.expectedType === 'stringArray') expectedDesc = 'ein Array mit ' + (ch.expected || []).length + ' Strings: ' + JSON.stringify(ch.expected || []);
    else if (ch.expectedType === 'html') expectedDesc = 'HTML-Ausgabe: ' + (ch.expected || '').slice(0, 200);
    else if (ch.expectedType === 'choice') expectedDesc = 'Option ' + (ch.correctOption !== undefined ? String.fromCharCode(65 + ch.correctOption) : '?');
    else if (ch.expectedType === 'write-only') expectedDesc = 'Selbsteinschätzung — Lösung ist im Stylesheet';
    else expectedDesc = '(kein erwarteter Wert)';

    const prompt = `Ich lerne ${techLabel} und hänge bei einer Aufgabe.

**Aufgabe:**
${ch.task}

**Das XML-Fixture (vereinfacht):**
\`\`\`xml
${fixtureLines}
\`\`\`

**Mein Versuch:**
\`\`\`
${userInput || '(noch nichts eingegeben)'}
\`\`\`

**Was erwartet wird (als Hinweis, nicht als Lösung):**
${expectedDesc}

Erkläre mir bitte:
1. Was habe ich falsch gedacht?
2. Welches Konzept habe ich missverstanden?
3. Zeige mir ein vereinfachtes analoges Beispiel das mir hilft es zu verstehen.

Zeige mir NICHT die direkte Lösung für diese Aufgabe — ich will sie selbst lösen nachdem ich das Konzept verstanden habe.`;

    navigator.clipboard.writeText(prompt).then(() => {
      // Increment llmPromptCount and check achievement
      state.llmPromptCount = (state.llmPromptCount || 0) + 1;
      saveState();
      if (state.llmPromptCount >= 3) checkAchievement('llm_prompt');

      // Feedback below the button
      let fb = $('llmPromptFeedback');
      if (!fb) {
        fb = document.createElement('div');
        fb.id = 'llmPromptFeedback';
        fb.className = 'llm-prompt-feedback';
        els.llmPromptBtn.after(fb);
      }
      fb.textContent = 'Prompt kopiert — in Claude, ChatGPT oder ein anderes LLM einfügen.';
    }).catch(() => {
      // Fallback: open in a textarea for manual copy
      const win = window.open('', '_blank', 'width=600,height=400');
      if (win) {
        win.document.write('<html><body><textarea style="width:100%;height:95%">' + escapeHtml(prompt) + '</textarea></body></html>');
      }
    });
  };
}

// ============================================================
//  Runner: Ausführen + Vergleich
// ============================================================
function runChallenge() {
  if (!current) return;
  const ch = challengeAt(current.world, current.index);
  if (ch.type === 'explain' || ch.type === 'write-only') return;
  attempts++;
  let result;
  try {
    if (ch.type === 'xpath')       result = runXPath(ch, false);
    else if (ch.type === 'flwor')  result = runXPath(ch, true);
    else if (ch.type === 'xslt2') result = runXSLT2(ch);
    else                           result = runXSLT(ch);
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

// ---- XSLT 1.0 via Browser-XSLTProcessor ----
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

// ---- XSLT 2.0 via SaxonJS ----
function runXSLT2(ch) {
  let xsltStr = els.editor.value.trim();
  if (!xsltStr) return { error: 'Bitte schreibe ein XSLT-2.0-Stylesheet.' };

  if (!window.SaxonJS) return { error: 'SaxonJS konnte nicht geladen werden. Bitte Internetverbindung prüfen.' };

  const xmlStr = window.TEI_FIXTURES[ch.fixture];
  if (!xmlStr) return { error: 'Fixture nicht gefunden: ' + ch.fixture };

  // Wrap body-only solutions into full stylesheet
  if (!xsltStr.includes('<xsl:stylesheet')) {
    xsltStr = wrapXsltSolution(xsltStr, '2.0');
  }

  let result;
  try {
    result = window.SaxonJS.transform({
      stylesheetText: xsltStr,
      sourceText: xmlStr,
      destination: 'serialized'
    }, 'sync');
  } catch (err) {
    return { error: 'Saxon-Fehler: ' + saxonErrorMsg(err) };
  }

  if (!result || result.principalResult == null) {
    return { error: 'Saxon lieferte kein Ergebnis. Prüfe dein Stylesheet.' };
  }

  const actualHtml = String(result.principalResult);
  return { display: prettyHtml(actualHtml), correct: compareXSLTOutput(actualHtml, ch.expected) };
}

function saxonErrorMsg(err) {
  if (!err) return 'Unbekannter Fehler';
  const m = err.message || String(err);
  // Try to extract the human-readable part
  const match = m.match(/Q\{[^}]+\}[A-Z0-9]+:\s*(.+)/);
  if (match) return match[1].slice(0, 300);
  return m.slice(0, 300);
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
//  Feature 4: Combo Multiplier
// ============================================================
function calcXP(hintsUsedCount, attemptsCount, chType) {
  const mult = state.comboCount >= 4 ? 2.5 :
               state.comboCount >= 3 ? 2.0 :
               state.comboCount >= 2 ? 1.5 : 1.0;
  const isPerfect = (hintsUsedCount === 0 && attemptsCount === 1) ||
                    chType === 'explain' || chType === 'write-only';
  let base = XP_BASE - hintsUsedCount * HINT_PENALTY;
  if (isPerfect) base += PERFECT_BONUS;
  return { xp: Math.max(10, Math.round(base * mult)), mult, isPerfect };
}

function incrementCombo() {
  state.comboCount++;
  saveState();
  updateComboUI();
  if (state.comboCount >= 5) checkAchievement('combo_5');
}

function breakCombo() {
  if (state.comboCount <= 0) return;
  // Show 'combo lost' animation
  if (state.comboCount >= 2) {
    const el = document.createElement('div');
    el.className = 'combo-lost';
    el.textContent = state.comboCount + '× verloren';
    const bar = document.querySelector('.action-bar');
    if (bar) {
      bar.style.position = 'relative';
      bar.appendChild(el);
      setTimeout(() => el.remove(), 700);
    }
  }
  state.comboCount = 0;
  saveState();
  updateComboUI();
}

function updateComboUI() {
  if (state.comboCount >= 2) {
    const icon = state.comboCount >= 4 ? '🔥🔥🔥' : state.comboCount >= 3 ? '🔥🔥' : '🔥';
    const mult = state.comboCount >= 4 ? '2.5×' : state.comboCount >= 3 ? '2.0×' : '1.5×';
    els.comboText.textContent = mult + ' ' + icon;
    els.comboDisplay.hidden = false;
    els.comboDisplay.classList.remove('pulse');
    void els.comboDisplay.offsetWidth;
    els.comboDisplay.classList.add('pulse');

    if (state.comboCount >= 4) {
      const topbar = document.getElementById('topbar');
      topbar.classList.remove('on-fire');
      void topbar.offsetWidth;
      topbar.classList.add('on-fire');
      setTimeout(() => topbar.classList.remove('on-fire'), 700);
    }
  } else {
    els.comboDisplay.hidden = true;
  }
}

// ============================================================
//  Korrekt / Falsch
// ============================================================
function onCorrect(ch) {
  els.outputView.classList.add('correct');
  if (els.expectedView) els.expectedView.classList.add('correct');

  const alreadyCompleted = isCompleted(ch.id);
  solved = true;

  // Record stats
  recordChallengeResult(ch.id, true, hintsUsed > 0);

  if (!alreadyCompleted) {
    incrementCombo();
    const { xp: gained, mult, isPerfect } = calcXP(hintsUsed, attempts, ch.type);

    state.xp += gained;
    state.streak += 1;
    state.completed.push(ch.id);
    saveState();

    floatXP(gained, mult);
    pulseStat(els.xp.parentElement);
    pulseStat(els.streak.parentElement);
    updateStatsUI();

    let msg = (isPerfect ? '✓ Perfect! +' : '✓ Korrekt! +') + gained + ' XP';
    if (mult > 1) msg += ' ×' + mult + ' Combo!';
    els.feedbackMsg.textContent = msg;
    els.feedbackMsg.className = 'feedback-msg ok';

    // Achievements
    checkChallengeAchievements(ch);
  } else {
    // Review mode: correct without hints → increment correctCount
    if (isReviewMode && hintsUsed === 0) {
      const s = getStats(ch.id);
      s.correctCount++;
      if (s.correctCount >= 3 && !s.mastered) {
        s.mastered = true;
        saveState();
        checkAchievement('first_mastered');
        checkAllMasteredW1();
      } else {
        saveState();
      }
    }
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
  breakCombo();

  // Record wrong attempt
  if (current) {
    const ch = challengeAt(current.world, current.index);
    recordChallengeResult(ch.id, false, hintsUsed > 0);
    // In review mode: immediately offer LLM prompt on first wrong attempt
    if (isReviewMode) showLLMPromptBtn(ch);
  }

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

  // Hints break combo
  breakCombo();

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

  if (ch.type === 'xslt2') {
    els.editor.value = wrapXsltSolution(ch.solution, '2.0');
  } else if (ch.type === 'xslt') {
    els.editor.value = wrapXsltSolution(ch.solution, '1.0');
  } else if (ch.type !== 'explain') {
    els.editor.value = ch.solution;
  }

  // Show LLM prompt after solution revealed
  showLLMPromptBtn(ch);
}

function wrapXsltSolution(body, version) {
  version = version || '1.0';
  if (body.includes('<xsl:stylesheet')) return body;
  const isTopLevel = /<xsl:template|<xsl:key|<xsl:function/.test(body);
  const nsExtra = version === '2.0'
    ? '\n  xmlns:xs="http://www.w3.org/2001/XMLSchema"\n  xmlns:local="http://local"\n  exclude-result-prefixes="tei xs local"'
    : '';
  const indent = s => s.split('\n').map(l => '  ' + l).join('\n');
  if (isTopLevel) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="${version}"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0"${nsExtra}>

  <xsl:output method="html"/>

${indent(body)}

</xsl:stylesheet>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="${version}"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:tei="http://www.tei-c.org/ns/1.0"${nsExtra}>

  <xsl:output method="html"/>

  <xsl:template match="/">
${body.split('\n').map(l => '    ' + l).join('\n')}
  </xsl:template>

</xsl:stylesheet>`;
}

// ============================================================
//  Feature 5: Achievements
// ============================================================
function checkChallengeAchievements(ch) {
  // first_xpath: first XPath challenge correct
  if (ch.world === 1) checkAchievement('first_xpath');

  // no_hints_world1: world 1 done, count hints used across world 1
  if (ch.world === 1 && isWorldDone(1)) {
    const anyHints = worldChallenges(1).some(c => {
      const s = state.challengeStats[c.id];
      return s && s.hintsUsed > 0;
    });
    if (!anyHints) checkAchievement('no_hints_world1');
  }

  // world3_done, world4_done
  if (ch.world === 3 && isWorldDone(3)) checkAchievement('world3_done');
  if (ch.world === 4 && isWorldDone(4)) checkAchievement('world4_done');
}

function checkAllMasteredW1() {
  const allMastered = worldChallenges(1).every(c => isMastered(c.id));
  if (allMastered) checkAchievement('all_mastered_w1');
}

let achievementQueue = [];
let achievementShowing = false;

function checkAchievement(id) {
  if (state.achievements.includes(id)) return;
  state.achievements.push(id);
  saveState();
  achievementQueue.push(id);
  if (!achievementShowing) processAchievementQueue();
  updateAchievementBtn();
}

function processAchievementQueue() {
  if (achievementQueue.length === 0) { achievementShowing = false; return; }
  achievementShowing = true;
  const id = achievementQueue.shift();
  showAchievementUnlock(id);
}

function showAchievementUnlock(id) {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def) { processAchievementQueue(); return; }

  els.achievementUnlockIcon.textContent = def.icon;
  els.achievementUnlockName.textContent = def.name;
  els.achievementUnlockDesc.textContent = def.desc;
  els.achievementOverlay.hidden = false;

  // Auto-dismiss after 3s
  const timer = setTimeout(() => closeAchievementOverlay(), 3000);
  els.achievementOverlay.onclick = () => { clearTimeout(timer); closeAchievementOverlay(); };
}

function closeAchievementOverlay() {
  els.achievementOverlay.hidden = true;
  els.achievementOverlay.onclick = null;
  // Small delay before showing next
  setTimeout(processAchievementQueue, 400);
}

function updateAchievementBtn() {
  // Glow when new achievements exist (simple: always show count)
  const count = state.achievements.length;
  els.achievementBtn.title = '🏆 Achievements (' + count + '/' + ACHIEVEMENTS.length + ')';
}

function renderAchievementModal() {
  els.achievementGrid.innerHTML = '';
  ACHIEVEMENTS.forEach(def => {
    const unlocked = state.achievements.includes(def.id);
    const badge = document.createElement('div');
    badge.className = 'achievement-badge ' + (unlocked ? 'unlocked' : 'locked');
    badge.innerHTML =
      '<div class="achievement-badge-icon">' + def.icon + '</div>' +
      '<div class="achievement-badge-info">' +
        '<div class="achievement-badge-name">' + escapeHtml(def.name) + '</div>' +
        '<div class="achievement-badge-desc">' + escapeHtml(def.desc) + '</div>' +
      '</div>';
    els.achievementGrid.appendChild(badge);
  });
  els.achievementModal.hidden = false;
}

// ============================================================
//  Navigation
// ============================================================
function goNext() {
  if (!current) return;

  // Review mode: go to next in queue, or end
  if (isReviewMode) {
    if (reviewQueue.length > 0) {
      const next = reviewQueue.shift();
      openChallenge(next.world, next.index);
    } else {
      // Review done
      isReviewMode = false;
      showScreen('world');
      renderWorldSelect();
    }
    return;
  }

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
  const mastered = worldMasteredCount(world);
  const total = worldChallenges(world).length;
  let txt = 'Alle ' + total + ' Challenges gelöst. ⚡ ' + state.xp + ' XP';
  if (mastered > 0) txt += ' · ⭐ ' + mastered + '/' + total + ' gemeistert';
  txt += '.';
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
function updateStatsUI() {
  els.xp.textContent = state.xp;
  els.streak.textContent = state.streak;
  updateComboUI();
}
function pulseStat(el) {
  if (!el) return;
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}
function floatXP(amount, mult) {
  const f = document.createElement('div');
  f.className = 'xp-float';
  f.textContent = '+' + amount + ' XP';
  const refBtn = els.runBtn.hidden ? els.nextBtn : els.runBtn;
  const r = refBtn.getBoundingClientRect();
  f.style.left = (r.left + r.width / 2 - 30) + 'px';
  f.style.top = (r.top - 10) + 'px';
  els.xpFloatLayer.appendChild(f);
  setTimeout(() => f.remove(), 1200);

  // Combo float if multiplier active
  if (mult && mult > 1) {
    const cf = document.createElement('div');
    cf.className = 'combo-float';
    cf.textContent = mult + '× 🔥';
    cf.style.left = (r.left + r.width / 2 + 40) + 'px';
    cf.style.top = (r.top - 10) + 'px';
    els.xpFloatLayer.appendChild(cf);
    setTimeout(() => cf.remove(), 1200);
  }
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
  $('brandHome').addEventListener('click', () => {
    isReviewMode = false;
    showScreen('world'); renderWorldSelect();
  });
  $('backBtn').addEventListener('click', () => {
    isReviewMode = false;
    showScreen('world'); renderWorldSelect();
  });
  els.runBtn.addEventListener('click', runChallenge);
  els.hintBtn.addEventListener('click', showNextHint);
  els.solutionBtn.addEventListener('click', revealSolution);
  els.nextBtn.addEventListener('click', goNext);
  els.worldDoneBtn.addEventListener('click', () => {
    els.worldDoneOverlay.hidden = true; showScreen('world'); renderWorldSelect();
  });
  els.reviewBtn.addEventListener('click', startReviewMode);

  $('resetBtn').addEventListener('click', () => {
    if (confirm('Gesamten Fortschritt (XP, Streak, gelöste Challenges, Achievements) zurücksetzen?')) {
      state = defaultState(); saveState(); isReviewMode = false; showScreen('world'); renderWorldSelect();
    }
  });

  // Achievements
  els.achievementBtn.addEventListener('click', renderAchievementModal);
  $('achievementModalClose').addEventListener('click', () => { els.achievementModal.hidden = true; });
  els.achievementModal.addEventListener('click', e => {
    if (e.target === els.achievementModal) els.achievementModal.hidden = true;
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
      if ((e.key === 'h' || e.key === 'H') && !isReviewMode) { e.preventDefault(); showNextHint(); }
      if (e.key === 'ArrowRight' && !els.nextBtn.hidden) { e.preventDefault(); goNext(); }
    }
  });
}

// ----------------------------- Init -----------------------------
function init() {
  if (!window.fontoxpath) {
    alert('FontoxPath konnte nicht geladen werden (CDN). Bitte Internetverbindung prüfen und neu laden.');
  }
  if (!window.SaxonJS) {
    console.warn('SaxonJS nicht geladen — XSLT-2.0-Challenges werden Fehlermeldung zeigen. CDN-Verbindung prüfen.');
  }
  wireEvents();
  updateComboUI();
  renderWorldSelect();
  showScreen('world');
}
document.addEventListener('DOMContentLoaded', init);

// Debug-/Test-Hook
window.wegaLearn = {
  open: openChallenge,
  openDirect: _doOpenChallenge,
  run: runChallenge,
  state: () => state,
  challenges: () => window.CHALLENGES,
  wrapXslt: wrapXsltSolution,
  checkAchievement,
  buildReviewQueue,
  startReview: startReviewMode
};
