'use strict';

const DEPRECATED_SUBJECT_IDS = new Set(['toeic-600']);

const state = {
  subjects: [],
  subject: null,
  data: null,
  mode: 'terms',
  quizType: 'quiz',
  chapter: 'all',
  terms: [],
  quizzes: [],
  materials: [],
  termQuizzes: [],
  termIndex: 0,
  quizIndex: 0,
  materialIndex: 0,
  page: 'main',
  direction: 'en-ja',
  session: {
    queue: [],
    cursor: 0,
    correct: 0,
    wrong: 0,
    answered: false,
    answeredItems: [],
    wrongItems: [],
  },
  review: {
    queue: [],
    cursor: 0,
  },
  revealed: false,
  stats: {
    quizTotal: 0,
    quizCorrect: 0,
    knownTerms: new Set(),
    wrongQuestions: new Map(),
    history: [],
  },
};

const els = {
  subjectSelect: document.getElementById('subjectSelect'),
  chapterSelect: document.getElementById('chapterSelect'),
  quizCountSelect: document.getElementById('quizCountSelect'),
  quizAvailableText: document.getElementById('quizAvailableText'),
  modeTerms: document.getElementById('modeTerms'),
  modeQuiz: document.getElementById('modeQuiz'),
  modeMaterials: document.getElementById('modeMaterials'),
  startQuizBtn: document.getElementById('startQuizBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  progressText: document.getElementById('progressText'),
  accuracyText: document.getElementById('accuracyText'),
  subjectTitle: document.getElementById('subjectTitle'),
  datasetSummary: document.getElementById('datasetSummary'),
  historySummary: document.getElementById('historySummary'),
  historyList: document.getElementById('historyList'),
  cardView: document.getElementById('cardView'),
  quizView: document.getElementById('quizView'),
  materialView: document.getElementById('materialView'),
  sessionView: document.getElementById('sessionView'),
  sessionResultView: document.getElementById('sessionResultView'),
  sessionReviewView: document.getElementById('sessionReviewView'),
  cardTitle: document.getElementById('cardTitle'),
  cardBody: document.getElementById('cardBody'),
  cardMeta: document.getElementById('cardMeta'),
  cardSynonymsBlock: document.getElementById('cardSynonymsBlock'),
  cardSynonyms: document.getElementById('cardSynonyms'),
  cardDerivativesBlock: document.getElementById('cardDerivativesBlock'),
  cardDerivatives: document.getElementById('cardDerivatives'),
  cardPhrasesBlock: document.getElementById('cardPhrasesBlock'),
  cardPhrases: document.getElementById('cardPhrases'),
  cardExamplesBlock: document.getElementById('cardExamplesBlock'),
  cardExamples: document.getElementById('cardExamples'),
  cardTag: document.getElementById('cardTag'),
  revealBtn: document.getElementById('revealBtn'),
  knownBtn: document.getElementById('knownBtn'),
  nextBtn: document.getElementById('nextBtn'),
  quizTitle: document.getElementById('quizTitle'),
  quizTag: document.getElementById('quizTag'),
  quizQuestion: document.getElementById('quizQuestion'),
  quizOptions: document.getElementById('quizOptions'),
  quizExplain: document.getElementById('quizExplain'),
  quizNextBtn: document.getElementById('quizNextBtn'),
  materialTitle: document.getElementById('materialTitle'),
  materialTag: document.getElementById('materialTag'),
  materialSummary: document.getElementById('materialSummary'),
  materialPointsBlock: document.getElementById('materialPointsBlock'),
  materialPoints: document.getElementById('materialPoints'),
  materialDetailsBlock: document.getElementById('materialDetailsBlock'),
  materialDetails: document.getElementById('materialDetails'),
  materialSource: document.getElementById('materialSource'),
  materialNextBtn: document.getElementById('materialNextBtn'),
  sessionTitle: document.getElementById('sessionTitle'),
  sessionTag: document.getElementById('sessionTag'),
  sessionProgress: document.getElementById('sessionProgress'),
  sessionQuestion: document.getElementById('sessionQuestion'),
  sessionOptions: document.getElementById('sessionOptions'),
  sessionExplain: document.getElementById('sessionExplain'),
  sessionNextBtn: document.getElementById('sessionNextBtn'),
  sessionExitBtn: document.getElementById('sessionExitBtn'),
  sessionScore: document.getElementById('sessionScore'),
  sessionReviewAllBtn: document.getElementById('sessionReviewAllBtn'),
  sessionReviewBtn: document.getElementById('sessionReviewBtn'),
  sessionBackBtn: document.getElementById('sessionBackBtn'),
  reviewTag: document.getElementById('reviewTag'),
  reviewTitle: document.getElementById('reviewTitle'),
  reviewProgress: document.getElementById('reviewProgress'),
  reviewQuestion: document.getElementById('reviewQuestion'),
  reviewOptions: document.getElementById('reviewOptions'),
  reviewExplain: document.getElementById('reviewExplain'),
  reviewNextBtn: document.getElementById('reviewNextBtn'),
  reviewBackBtn: document.getElementById('reviewBackBtn'),
  netStatus: document.getElementById('netStatus'),
  directionEnJa: document.getElementById('directionEnJa'),
  directionJaEn: document.getElementById('directionJaEn'),
  pageTitle: document.getElementById('pageTitle'),
  pageSubtitle: document.getElementById('pageSubtitle'),
};

function updateNetStatus() {
  els.netStatus.textContent = navigator.onLine ? 'Online' : 'Offline Ready';
}

function getSubjectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('subject');
}

function syncSubjectUrl(subjectId) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('subject', subjectId);
  window.history.replaceState({}, '', nextUrl);
}

function applySubjectTheme(subject) {
  const theme = subject?.theme || 'default';
  document.body.dataset.theme = theme;
  if (els.pageTitle) {
    els.pageTitle.textContent = subject?.title || 'Study Forge';
  }
  if (els.pageSubtitle) {
    els.pageSubtitle.textContent = subject?.description || '用語も論点も、迷わず反復するための静かな訓練場。';
  }
}

function saveProgress() {
  if (!state.subject) return;
  const key = `study-forge-${state.subject.id}`;
  const wrongQuestions = Array.from(state.stats.wrongQuestions.values());
  const payload = {
    knownTerms: Array.from(state.stats.knownTerms),
    quizTotal: state.stats.quizTotal,
    quizCorrect: state.stats.quizCorrect,
    wrongQuestions,
    history: state.stats.history,
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

function loadProgress() {
  if (!state.subject) return;
  const key = `study-forge-${state.subject.id}`;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.stats.knownTerms = new Set(parsed.knownTerms || []);
    state.stats.quizTotal = parsed.quizTotal || 0;
    state.stats.quizCorrect = parsed.quizCorrect || 0;
    state.stats.wrongQuestions = new Map();
    (parsed.wrongQuestions || []).forEach((item) => {
      if (item && item.id) state.stats.wrongQuestions.set(item.id, item);
    });
    state.stats.history = parsed.history || [];
  } catch (err) {
    console.warn('Progress load failed', err);
  }
}

function shuffleArray(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function appendInlineContent(parent, value) {
  const text = String(value || '');
  const pattern = /(\$\$[^$]+\$\$|\$[^$]+\$|\\\([^)]+\\\)|\\\[[\s\S]+?\\\])/g;
  let lastIndex = 0;
  text.replace(pattern, (match, _part, offset) => {
    if (offset > lastIndex) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
    }
    const math = document.createElement('span');
    math.className = match.startsWith('$$') || match.startsWith('\\[')
      ? 'math-token math-token-block'
      : 'math-token';
    appendMathContent(math, match
      .replace(/^\$\$|\$\$$/g, '')
      .replace(/^\$|\$$/g, '')
      .replace(/^\\\(|\\\)$/g, '')
      .replace(/^\\\[|\\\]$/g, ''));
    parent.appendChild(math);
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function appendMathContent(parent, value) {
  const tex = String(value || '');
  if (window.katex) {
    try {
      window.katex.render(tex, parent, {
        displayMode: parent.classList.contains('math-token-block') || parent.classList.contains('math-block'),
        throwOnError: false,
        strict: 'ignore',
        trust: false
      });
      return;
    } catch (err) {
      console.warn('KaTeX render failed', err);
    }
  }
  parent.appendChild(parseMath(tex));
}

function parseMath(input, start = 0, stop = '') {
  const fragment = document.createDocumentFragment();
  let index = start;
  while (index < input.length) {
    const char = input[index];
    if (stop && char === stop) {
      return { fragment, index: index + 1 };
    }
    if (char === '\\') {
      const commandMatch = input.slice(index + 1).match(/^[A-Za-z]+/);
      if (!commandMatch) {
        fragment.appendChild(document.createTextNode(input[index + 1] || ''));
        index += 2;
        continue;
      }
      const command = commandMatch[0];
      index += command.length + 1;
      if (command === 'frac') {
        const numerator = readMathArgument(input, index);
        const denominator = readMathArgument(input, numerator.index);
        const fraction = document.createElement('span');
        fraction.className = 'math-frac';
        const top = document.createElement('span');
        top.className = 'math-frac-top';
        top.appendChild(numerator.fragment);
        const bottom = document.createElement('span');
        bottom.className = 'math-frac-bottom';
        bottom.appendChild(denominator.fragment);
        fraction.append(top, bottom);
        fragment.appendChild(fraction);
        index = denominator.index;
        continue;
      }
      if (command === 'sqrt') {
        const radicand = readMathArgument(input, index);
        const root = document.createElement('span');
        root.className = 'math-root';
        const symbol = document.createElement('span');
        symbol.className = 'math-root-symbol';
        symbol.textContent = '√';
        const body = document.createElement('span');
        body.className = 'math-root-body';
        body.appendChild(radicand.fragment);
        root.append(symbol, body);
        fragment.appendChild(root);
        index = radicand.index;
        continue;
      }
      if (command === 'bar') {
        const body = readMathArgument(input, index);
        const overline = document.createElement('span');
        overline.className = 'math-overline';
        overline.appendChild(body.fragment);
        fragment.appendChild(overline);
        index = body.index;
        continue;
      }
      fragment.appendChild(document.createTextNode(getMathCommandText(command)));
      continue;
    }
    if (char === '^' || char === '_') {
      const script = readMathArgument(input, index + 1);
      appendMathScript(fragment, char === '^' ? 'sup' : 'sub', script.fragment);
      index = script.index;
      continue;
    }
    if (char === '{') {
      const group = parseMath(input, index + 1, '}');
      fragment.appendChild(group.fragment);
      index = group.index;
      continue;
    }
    fragment.appendChild(document.createTextNode(char));
    index += 1;
  }
  return stop ? { fragment, index } : fragment;
}

function readMathArgument(input, index) {
  while (input[index] === ' ') index += 1;
  if (input[index] === '{') {
    return parseMath(input, index + 1, '}');
  }
  const fragment = document.createDocumentFragment();
  if (index < input.length) {
    if (input[index] === '\\') {
      const commandMatch = input.slice(index + 1).match(/^[A-Za-z]+/);
      if (commandMatch) {
        fragment.appendChild(document.createTextNode(getMathCommandText(commandMatch[0])));
        return { fragment, index: index + commandMatch[0].length + 1 };
      }
    }
    fragment.appendChild(document.createTextNode(input[index]));
  }
  return { fragment, index: index + 1 };
}

function appendMathScript(fragment, type, scriptFragment) {
  const previous = fragment.lastChild || document.createTextNode('');
  if (fragment.lastChild) fragment.removeChild(previous);
  const wrapper = previous.nodeType === Node.ELEMENT_NODE && previous.classList.contains('math-script')
    ? previous
    : document.createElement('span');
  if (!wrapper.classList.contains('math-script')) {
    wrapper.className = 'math-script';
    const base = document.createElement('span');
    base.className = 'math-script-base';
    base.appendChild(previous);
    wrapper.appendChild(base);
  }
  const script = document.createElement(type);
  script.appendChild(scriptFragment);
  wrapper.appendChild(script);
  fragment.appendChild(wrapper);
}

function getMathCommandText(command) {
  const symbols = {
    approx: '≈',
    cdot: '·',
    ge: '≥',
    le: '≤',
    infty: '∞',
    pm: '±',
    rho: 'ρ',
    sigma: 'σ',
    sum: 'Σ',
    times: '×'
  };
  return symbols[command] || command;
}

function renderRichContent(target, content, fallback = '') {
  target.innerHTML = '';
  const blocks = Array.isArray(content) ? content : [content || fallback];
  blocks.forEach((block) => {
    if (!block) return;
    if (typeof block === 'string') {
      block.split('\n').filter(Boolean).forEach((line) => {
        const p = document.createElement('p');
        appendInlineContent(p, line);
        target.appendChild(p);
      });
      return;
    }
    if (block.type === 'math') {
      const div = document.createElement('div');
      div.className = 'math-block';
      appendMathContent(div, block.content || '');
      target.appendChild(div);
      return;
    }
    if (block.type === 'table') {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      const table = document.createElement('table');
      table.className = 'data-table';
      if (block.caption) {
        const caption = document.createElement('caption');
        caption.textContent = block.caption;
        table.appendChild(caption);
      }
      if (Array.isArray(block.headers) && block.headers.length) {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        block.headers.forEach((header) => {
          const th = document.createElement('th');
          appendInlineContent(th, header);
          tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
      }
      const tbody = document.createElement('tbody');
      (Array.isArray(block.rows) ? block.rows : []).forEach((row) => {
        const tr = document.createElement('tr');
        (Array.isArray(row) ? row : []).forEach((cell) => {
          const td = document.createElement('td');
          appendInlineContent(td, cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrapper.appendChild(table);
      target.appendChild(wrapper);
      return;
    }
    if (block.type === 'text' || block.content) {
      const p = document.createElement('p');
      appendInlineContent(p, block.content || '');
      target.appendChild(p);
    }
  });
  if (!target.children.length) {
    target.textContent = fallback;
  }
}

function getDisplayOptions(quiz) {
  if (!Array.isArray(quiz.displayOptions)) {
    quiz.displayOptions = Array.isArray(quiz.options) ? [...quiz.options] : [];
    shuffleArray(quiz.displayOptions);
  }
  return quiz.displayOptions;
}

function setOptionButtonContent(btn, option, index) {
  btn.textContent = '';
  const prefix = document.createElement('span');
  prefix.className = 'option-prefix';
  prefix.textContent = `${String.fromCharCode(97 + index)}.`;
  const body = document.createElement('span');
  body.className = 'option-text';
  appendInlineContent(body, option.content || option.text);
  btn.append(prefix, body);
  btn.dataset.optionKey = option.key || '';
  btn.dataset.optionText = option.text;
}

function isCorrectOption(option, quiz) {
  return quiz.answer_key
    ? option.key === quiz.answer_key
    : option.text === quiz.answer_text;
}

function markCorrectOption(buttons, quiz) {
  buttons.forEach((button) => {
    if (isCorrectOption({
      key: button.dataset.optionKey,
      text: button.dataset.optionText,
    }, quiz)) {
      button.classList.add('is-correct');
    }
  });
}

function renderExplanation(target, quiz) {
  const blocks = [
    `解答: ${quiz.answer_text || ''}`,
    quiz.explanation ? `解説: ${quiz.explanation}` : '',
    quiz.other_explanations ? `他選択肢: ${quiz.other_explanations}` : '',
  ].filter(Boolean);
  renderRichContent(target, quiz.explanation_blocks || blocks);
}

function getQuizContent(quiz) {
  const blocks = [];
  if (quiz.question) blocks.push(quiz.question);
  if (Array.isArray(quiz.content)) {
    blocks.push(...quiz.content);
  } else if (quiz.content) {
    blocks.push(quiz.content);
  }
  return blocks;
}

function getQuizId(quiz) {
  return `${quiz.chapter || 'no-chapter'}::${quiz.question}`;
}

function recordWrongQuestion(quiz, selectedKey) {
  const id = getQuizId(quiz);
  const now = new Date().toISOString();
  const existing = state.stats.wrongQuestions.get(id) || {
    id,
    question: quiz.question,
    options: quiz.options,
    answer_text: quiz.answer_text,
    answer_key: quiz.answer_key,
    explanation: quiz.explanation || '',
    other_explanations: quiz.other_explanations || '',
    chapter: quiz.chapter || '',
    source: quiz.source || '',
    wrongCount: 0,
  };
  existing.wrongCount += 1;
  existing.lastWrongAt = now;
  existing.lastSelectedKey = selectedKey;
  state.stats.wrongQuestions.set(id, existing);
}

function setContentView(view) {
  const views = [
    els.cardView,
    els.quizView,
    els.materialView,
    els.sessionView,
    els.sessionResultView,
    els.sessionReviewView,
  ];
  views.forEach((panel) => panel.classList.add('hidden'));
  if (view === 'card') els.cardView.classList.remove('hidden');
  if (view === 'quiz') els.quizView.classList.remove('hidden');
  if (view === 'material') els.materialView.classList.remove('hidden');
  if (view === 'session') els.sessionView.classList.remove('hidden');
  if (view === 'result') els.sessionResultView.classList.remove('hidden');
  if (view === 'review') els.sessionReviewView.classList.remove('hidden');
}

function getFilteredTerms() {
  if (!state.data) return [];
  if (isRangeFilter(state.chapter)) {
    const range = parseRangeFilter(state.chapter);
    return state.data.terms.slice(range.start, range.end + 1);
  }
  if (state.chapter === 'all' && hasDeclaredTermRange()) {
    return state.data.terms.slice(0, getTermRangeConfig().total);
  }
  return state.data.terms.filter(term => state.chapter === 'all' || term.chapter === state.chapter);
}

function getFilteredQuizzes() {
  if (!state.data) return [];
  if (isRangeFilter(state.chapter)) return [];
  return state.data.quizzes.filter(q => state.chapter === 'all' || q.chapter === state.chapter);
}

function getFilteredMaterials() {
  if (!state.data) return [];
  if (isRangeFilter(state.chapter)) return [];
  return (state.data.materials || []).filter(item => state.chapter === 'all' || item.chapter === state.chapter);
}

function isRangeFilter(value) {
  return typeof value === 'string' && value.startsWith('range:');
}

function parseRangeFilter(value) {
  const [, start, end] = value.split(':').map(Number);
  return { start, end };
}

function shouldUseTermRanges() {
  const config = getTermRangeConfig();
  return state.subject?.theme === 'toeic' && config.total >= 100;
}

function getTermRangeConfig() {
  const match = state.subject?.id?.match(/words(\d+)-(\d+)/);
  if (!match) {
    return {
      base: 1,
      total: state.data?.terms?.length || 0,
    };
  }
  const start = Number(match[1]);
  const end = Number(match[2]);
  return {
    base: start,
    total: end - start + 1,
  };
}

function hasDeclaredTermRange() {
  return Boolean(state.subject?.id?.match(/words(\d+)-(\d+)/));
}

function updateChapterOptions() {
  els.chapterSelect.innerHTML = '';
  const options = [{ value: 'all', label: '全章' }];
  if (shouldUseTermRanges()) {
    const { base, total } = getTermRangeConfig();
    const cappedTotal = Math.min(total, state.data.terms.length);
    for (let start = 0; start < cappedTotal; start += 100) {
      const end = Math.min(start + 99, cappedTotal - 1);
      options.push({
        value: `range:${start}:${end}`,
        label: `${base + start}-${base + end}`,
      });
    }
  } else {
    const chapters = new Set();
    state.data.terms.forEach(term => chapters.add(term.chapter));
    state.data.quizzes.forEach(q => chapters.add(q.chapter));
    (state.data.materials || []).forEach(item => chapters.add(item.chapter));
    Array.from(chapters).forEach(chapter => {
      options.push({
        value: chapter,
        label: chapter,
      });
    });
  }
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    els.chapterSelect.appendChild(opt);
  });
  if (options.some(option => option.value === state.chapter)) {
    els.chapterSelect.value = state.chapter;
  } else {
    state.chapter = 'all';
    els.chapterSelect.value = state.chapter;
  }
}

function updateMetrics() {
  let total = 0;
  let current = 0;
  if (state.mode === 'terms') {
    total = state.terms.length;
    current = state.termIndex + 1;
  } else if (state.mode === 'quiz') {
    total = state.quizzes.length;
    current = state.quizIndex + 1;
  } else {
    total = state.materials.length;
    current = state.materialIndex + 1;
  }
  els.progressText.textContent = total ? `${current} / ${total}` : '0 / 0';
  if (state.stats.quizTotal) {
    const ratio = Math.round((state.stats.quizCorrect / state.stats.quizTotal) * 100);
    els.accuracyText.textContent = `${ratio}%`;
  } else {
    els.accuracyText.textContent = '-';
  }
  updateSubjectOverview();
  renderStudyLog();
}

function updateSubjectOverview() {
  els.subjectTitle.textContent = state.subject ? state.subject.title : '-';
  const termCount = state.data?.terms?.length || 0;
  const quizCount = state.data?.quizzes?.length || 0;
  const materialCount = state.data?.materials?.length || 0;
  els.datasetSummary.textContent = `用語 ${termCount} / 小テスト ${quizCount} / 資料 ${materialCount}`;
}

function renderTerm() {
  if (!state.terms.length) {
    els.cardTitle.textContent = 'データがありません';
    els.cardBody.textContent = '用語データを追加してください。';
    els.cardMeta.classList.add('hidden');
    els.cardSynonymsBlock.classList.add('hidden');
    els.cardDerivativesBlock.classList.add('hidden');
    els.cardPhrasesBlock.classList.add('hidden');
    els.cardExamplesBlock.classList.add('hidden');
    return;
  }
  const term = state.terms[state.termIndex];
  const front = state.direction === 'en-ja'
    ? (term.term || '用語が未設定です。')
    : (term.definition || '定義が未設定です。');
  const back = state.direction === 'en-ja'
    ? (term.definition || '定義が未設定です。')
    : (term.term || '用語が未設定です。');
  els.cardTitle.textContent = front;
  els.cardTag.textContent = term.chapter || '';
  if (state.revealed) {
    renderRichContent(els.cardBody, back);
    els.revealBtn.textContent = '答えを隠す';
    renderMeta(term);
  } else {
    els.cardBody.textContent = state.direction === 'en-ja'
      ? 'クリックして定義を表示'
      : 'クリックして英語を表示';
    els.revealBtn.textContent = '答えを見る';
    els.cardMeta.classList.add('hidden');
    els.cardSynonymsBlock.classList.add('hidden');
    els.cardDerivativesBlock.classList.add('hidden');
    els.cardPhrasesBlock.classList.add('hidden');
    els.cardExamplesBlock.classList.add('hidden');
  }
}

function formatMetaItem(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const pieces = [];
  if (item.term) pieces.push(item.term);
  if (item.definition) pieces.push(item.definition);
  return pieces.join(' - ');
}

function renderMetaList(blockEl, listEl, items) {
  listEl.innerHTML = '';
  const normalized = (Array.isArray(items) ? items : [])
    .map(formatMetaItem)
    .filter(Boolean);
  if (!normalized.length) {
    blockEl.classList.add('hidden');
    return false;
  }
  normalized.forEach((text) => {
    const li = document.createElement('li');
    appendInlineContent(li, text);
    listEl.appendChild(li);
  });
  blockEl.classList.remove('hidden');
  return true;
}

function renderMeta(term) {
  const examples = [];
  if (term.example) examples.push(term.example);
  if (Array.isArray(term.examples)) examples.push(...term.examples);
  const hasSynonyms = renderMetaList(els.cardSynonymsBlock, els.cardSynonyms, term.synonyms);
  const hasDerivatives = renderMetaList(els.cardDerivativesBlock, els.cardDerivatives, term.derivatives);
  const hasPhrases = renderMetaList(els.cardPhrasesBlock, els.cardPhrases, term.phrases);
  const hasExamples = renderMetaList(els.cardExamplesBlock, els.cardExamples, examples);
  if (hasSynonyms || hasDerivatives || hasPhrases || hasExamples) {
    els.cardMeta.classList.remove('hidden');
  } else {
    els.cardMeta.classList.add('hidden');
  }
}

function renderQuiz() {
  els.quizExplain.innerHTML = '';
  els.quizExplain.classList.add('hidden');
  if (!state.quizzes.length) {
    renderRichContent(els.quizQuestion, '問題データを追加してください。');
    els.quizOptions.innerHTML = '';
    return;
  }
  const quiz = state.quizzes[state.quizIndex];
  if (!quiz) {
    renderRichContent(els.quizQuestion, '問題データを追加してください。');
    els.quizOptions.innerHTML = '';
    return;
  }
  renderRichContent(els.quizQuestion, getQuizContent(quiz), '問題データを追加してください。');
  els.quizTag.textContent = quiz.chapter || '';
  els.quizOptions.innerHTML = '';
  getDisplayOptions(quiz).forEach((option, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    setOptionButtonContent(btn, option, index);
    btn.addEventListener('click', () => handleQuizAnswer(option, quiz, btn));
    els.quizOptions.appendChild(btn);
  });
}

function renderDetails(items) {
  els.materialDetails.innerHTML = '';
  const normalized = Array.isArray(items) ? items : [];
  if (!normalized.length) {
    els.materialDetailsBlock.classList.add('hidden');
    return;
  }
  normalized.forEach((item) => {
    if (!item || (!item.label && !item.content)) return;
    const wrapper = document.createElement('article');
    wrapper.className = 'detail-item';
    const label = document.createElement('p');
    label.className = 'detail-label';
    label.textContent = item.label || '補足';
    const text = document.createElement('div');
    text.className = 'detail-text rich-content';
    renderRichContent(text, item.blocks || item.content || '');
    wrapper.appendChild(label);
    wrapper.appendChild(text);
    els.materialDetails.appendChild(wrapper);
  });
  if (els.materialDetails.children.length) {
    els.materialDetailsBlock.classList.remove('hidden');
  } else {
    els.materialDetailsBlock.classList.add('hidden');
  }
}

function renderMaterial() {
  if (!state.materials.length) {
    els.materialTitle.textContent = '資料がありません';
    els.materialTag.textContent = '';
    renderRichContent(els.materialSummary, 'この科目にはまだ資料が登録されていません。materials を追加すると、要点や補足をここで読めます。');
    els.materialPoints.innerHTML = '';
    els.materialPointsBlock.classList.add('hidden');
    els.materialDetails.innerHTML = '';
    els.materialDetailsBlock.classList.add('hidden');
    els.materialSource.textContent = '';
    return;
  }
  const material = state.materials[state.materialIndex];
  if (!material) return;
  els.materialTitle.textContent = material.title || '資料';
  els.materialTag.textContent = material.chapter || '';
  renderRichContent(els.materialSummary, material.content || material.summary, '概要は未設定です。');
  renderMetaList(els.materialPointsBlock, els.materialPoints, material.points);
  renderDetails(material.details);
  els.materialSource.textContent = material.source ? `出典: ${material.source}` : '';
}

function getQuizPool() {
  if (state.mode === 'terms') {
    return [...state.termQuizzes];
  }
  const quizzes = getFilteredQuizzes();
  return quizzes.length ? [...quizzes] : [...state.termQuizzes];
}

function updateQuizCountOptions() {
  const total = getQuizPool().length;
  const previous = els.quizCountSelect.value || 'all';
  const maxSelectable = Math.min(total, 20);
  const choices = Array.from({ length: maxSelectable }, (_, index) => index + 1)
    .filter(count => count < total);
  els.quizCountSelect.innerHTML = '';
  choices.forEach((count) => {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = `${count} 問`;
    els.quizCountSelect.appendChild(option);
  });
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = `全問（${total} 問）`;
  els.quizCountSelect.appendChild(allOption);
  els.quizCountSelect.value = choices.includes(Number(previous)) ? previous : 'all';
  els.quizAvailableText.textContent = `全 ${total} 問`;
  els.quizCountSelect.disabled = !total;
}

function renderSessionQuestion() {
  els.sessionExplain.innerHTML = '';
  els.sessionExplain.classList.add('hidden');
  if (!state.session.queue.length) {
    renderRichContent(els.sessionQuestion, '問題データを追加してください。');
    els.sessionOptions.innerHTML = '';
    return;
  }
  const quiz = state.session.queue[state.session.cursor];
  if (!quiz) {
    renderRichContent(els.sessionQuestion, '問題データを追加してください。');
    els.sessionOptions.innerHTML = '';
    return;
  }
  els.sessionProgress.textContent = `${state.session.cursor + 1} / ${state.session.queue.length} 問`;
  els.sessionTag.textContent = quiz.chapter || '';
  renderRichContent(els.sessionQuestion, getQuizContent(quiz), '問題データを追加してください。');
  els.sessionOptions.innerHTML = '';
  state.session.answered = false;
  getDisplayOptions(quiz).forEach((option, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    setOptionButtonContent(btn, option, index);
    btn.addEventListener('click', () => handleSessionAnswer(option, quiz, btn));
    els.sessionOptions.appendChild(btn);
  });
}

function renderSessionResult() {
  const total = state.session.queue.length;
  const ratio = total ? Math.round((state.session.correct / total) * 100) : 0;
  els.sessionScore.textContent = `正答率 ${ratio}%（${state.session.correct} / ${total}）`;
  els.sessionReviewAllBtn.disabled = !state.session.answeredItems.length;
  if (state.session.wrongItems.length) {
    els.sessionReviewBtn.disabled = false;
  } else {
    els.sessionReviewBtn.disabled = true;
  }
}

function renderReviewQuestion() {
  els.reviewExplain.innerHTML = '';
  els.reviewExplain.classList.add('hidden');
  if (!state.review.queue.length) {
    renderRichContent(els.reviewQuestion, '復習する問題がありません。');
    els.reviewOptions.innerHTML = '';
    return;
  }
  const entry = state.review.queue[state.review.cursor];
  const quiz = entry.quiz;
  els.reviewProgress.textContent = `${state.review.cursor + 1} / ${state.review.queue.length} 問`;
  els.reviewTag.textContent = quiz.chapter || '';
  renderRichContent(els.reviewQuestion, getQuizContent(quiz), '問題データを追加してください。');
  els.reviewOptions.innerHTML = '';
  getDisplayOptions(quiz).forEach((option, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    setOptionButtonContent(btn, option, index);
    btn.disabled = true;
    if (isCorrectOption(option, quiz)) {
      btn.classList.add('is-correct');
    }
    if (entry.selectedKey && option.key === entry.selectedKey && !isCorrectOption(option, quiz)) {
      btn.classList.add('is-wrong');
    }
    els.reviewOptions.appendChild(btn);
  });
  renderExplanation(els.reviewExplain, quiz);
  els.reviewExplain.classList.remove('hidden');
}

function startSession() {
  buildTermQuizzes();
  const pool = getQuizPool();
  shuffleArray(pool);
  const requestedCount = els.quizCountSelect.value;
  const count = requestedCount === 'all' ? pool.length : Number(requestedCount);
  state.session.queue = pool.slice(0, count);
  state.session.cursor = 0;
  state.session.correct = 0;
  state.session.wrong = 0;
  state.session.answeredItems = [];
  state.session.wrongItems = [];
  state.page = 'session';
  setContentView('session');
  renderSessionQuestion();
}

function finishSession() {
  const total = state.session.queue.length;
  const correct = state.session.correct;
  const wrong = total - correct;
  state.stats.history.push({
    date: new Date().toISOString(),
    total,
    correct,
    wrong,
    quizType: state.quizType,
    chapter: state.chapter,
  });
  saveProgress();
  state.page = 'result';
  setContentView('result');
  renderSessionResult();
  renderStudyLog();
}

function startReview(items, title) {
  state.review.queue = [...items];
  state.review.cursor = 0;
  els.reviewTitle.textContent = title;
  state.page = 'review';
  setContentView('review');
  renderReviewQuestion();
}

function renderStudyLog() {
  const history = state.stats.history || [];
  const wrongCount = state.stats.wrongQuestions ? state.stats.wrongQuestions.size : 0;
  if (!history.length && !wrongCount) {
    els.historySummary.textContent = 'まだ学習記録がありません。';
    els.historyList.innerHTML = '';
    return;
  }
  if (history.length) {
    const latest = history[history.length - 1];
    const latestRatio = latest.total ? Math.round((latest.correct / latest.total) * 100) : 0;
    els.historySummary.textContent = `直近: 正答率 ${latestRatio}% / 間違い ${wrongCount} 問`;
  } else {
    els.historySummary.textContent = `間違い ${wrongCount} 問`;
  }
  const lastItems = history.slice(-5).reverse();
  els.historyList.innerHTML = '';
  lastItems.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'history-item';
    const left = document.createElement('span');
    const date = new Date(entry.date);
    left.textContent = `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    const right = document.createElement('span');
    const ratio = entry.total ? Math.round((entry.correct / entry.total) * 100) : 0;
    const chapter = entry.chapter === 'all' ? '全章' : entry.chapter;
    right.textContent = `${ratio}% (${entry.correct}/${entry.total})・${chapter}`;
    row.appendChild(left);
    row.appendChild(right);
    els.historyList.appendChild(row);
  });
}
function handleQuizAnswer(option, quiz, btn) {
  const buttons = Array.from(els.quizOptions.querySelectorAll('button'));
  buttons.forEach(button => button.disabled = true);
  state.stats.quizTotal += 1;

  const isCorrect = isCorrectOption(option, quiz);
  if (isCorrect) {
    state.stats.quizCorrect += 1;
    btn.classList.add('is-correct');
  } else {
    btn.classList.add('is-wrong');
    markCorrectOption(buttons, quiz);
  }

  renderExplanation(els.quizExplain, quiz);
  els.quizExplain.classList.remove('hidden');
  saveProgress();
  updateMetrics();
}

function handleSessionAnswer(option, quiz, btn) {
  const buttons = Array.from(els.sessionOptions.querySelectorAll('button'));
  if (state.session.answered) return;
  state.session.answered = true;
  buttons.forEach(button => button.disabled = true);
  state.stats.quizTotal += 1;
  const isCorrect = isCorrectOption(option, quiz);
  state.session.answeredItems.push({ quiz, selectedKey: option.key });
  if (isCorrect) {
    state.session.correct += 1;
    state.stats.quizCorrect += 1;
    btn.classList.add('is-correct');
  } else {
    state.session.wrong += 1;
    btn.classList.add('is-wrong');
    markCorrectOption(buttons, quiz);
    recordWrongQuestion(quiz, option.key);
    state.session.wrongItems.push({ quiz, selectedKey: option.key });
  }
  renderExplanation(els.sessionExplain, quiz);
  els.sessionExplain.classList.remove('hidden');
  saveProgress();
  updateMetrics();
}

function buildTermQuizzes() {
  state.termQuizzes = state.terms.map((term) => {
    const candidates = state.terms.filter(t => t.term !== term.term);
    shuffleArray(candidates);
    const useJa = state.direction === 'en-ja';
    const correctText = useJa
      ? (term.definition || '定義が未設定です。')
      : (term.term || '用語が未設定です。');
    const distractors = candidates.slice(0, 3).map(t => (
      useJa
        ? (t.definition || '定義が未設定です。')
        : (t.term || '用語が未設定です。')
    ));
    const options = [
      { key: 'a', text: correctText },
      { key: 'b', text: distractors[0] || '定義が未設定です。' },
      { key: 'c', text: distractors[1] || '定義が未設定です。' },
      { key: 'd', text: distractors[2] || '定義が未設定です。' },
    ];
    shuffleArray(options);
    const answer = options.find(opt => opt.text === correctText);
    return {
      question: useJa
        ? `「${term.term}」の定義として最も適切なものを選びなさい。`
        : `「${term.definition || '定義が未設定です。'}」の英語として最も適切なものを選びなさい。`,
      options,
      answer_text: answer.text,
      answer_key: answer.key,
      explanation: buildTermExplanation(term),
      other_explanations: '用語の意味は用語整理を参照して確認する。',
      chapter: term.chapter,
      source: term.source,
    };
  });
}

function buildTermExplanation(term) {
  const pieces = [];
  if (term.definition) pieces.push(term.definition);
  if (term.example) pieces.push(`例文: ${term.example}`);
  if (Array.isArray(term.examples) && term.examples.length) {
    pieces.push(`例文: ${term.examples.join(' / ')}`);
  }
  return pieces.join(' ');
}

function applyFilters() {
  state.terms = getFilteredTerms();
  state.quizzes = getFilteredQuizzes();
  state.materials = getFilteredMaterials();
  buildTermQuizzes();
  state.termIndex = 0;
  state.quizIndex = 0;
  state.materialIndex = 0;
  state.revealed = false;
  render();
}

function render() {
  if (state.page !== 'main') return;
  if (state.mode === 'terms') {
    setContentView('card');
    renderTerm();
  } else if (state.mode === 'quiz') {
    setContentView('quiz');
    if (state.quizType === 'term') {
      state.quizzes = state.termQuizzes;
    } else if (state.quizType === 'mixed') {
      state.quizzes = [...getFilteredQuizzes(), ...state.termQuizzes];
      shuffleArray(state.quizzes);
    } else {
      const quizzes = getFilteredQuizzes();
      state.quizzes = quizzes.length ? quizzes : state.termQuizzes;
    }
    renderQuiz();
  } else {
    setContentView('material');
    renderMaterial();
  }
  updateControlAvailability();
  updateQuizCountOptions();
  updateMetrics();
}

function updateModeButtons() {
  els.modeTerms.classList.toggle('is-active', state.mode === 'terms');
  els.modeQuiz.classList.toggle('is-active', state.mode === 'quiz');
  els.modeMaterials.classList.toggle('is-active', state.mode === 'materials');
}

function updateControlAvailability() {
  const isMaterials = state.mode === 'materials';
  els.directionEnJa.disabled = isMaterials;
  els.directionJaEn.disabled = isMaterials;
  els.startQuizBtn.disabled = !getQuizPool().length;
}

async function loadSubjects() {
  const res = await fetch('./data/index.json');
  const payload = await res.json();
  state.subjects = normalizeSubjects(payload.subjects);
  els.subjectSelect.innerHTML = '';
  state.subjects.forEach(subject => {
    const opt = document.createElement('option');
    opt.value = subject.id;
    opt.textContent = subject.title;
    els.subjectSelect.appendChild(opt);
  });
  if (state.subjects.length) {
    const requestedId = getSubjectIdFromUrl();
    const initialSubject = state.subjects.find(subject => subject.id === requestedId) || state.subjects[0];
    els.subjectSelect.value = initialSubject.id;
    await loadSubject(initialSubject.id);
  }
}

function normalizeSubjects(subjects) {
  return (Array.isArray(subjects) ? subjects : [])
    .filter(subject => !DEPRECATED_SUBJECT_IDS.has(subject.id));
}

async function loadSubject(id) {
  const subject = state.subjects.find(s => s.id === id);
  if (!subject) return;
  state.subject = subject;
  applySubjectTheme(subject);
  syncSubjectUrl(subject.id);
  els.subjectSelect.value = subject.id;
  const res = await fetch(subject.file);
  state.data = await res.json();
  state.data.terms = Array.isArray(state.data.terms) ? state.data.terms : [];
  state.data.quizzes = Array.isArray(state.data.quizzes) ? state.data.quizzes : [];
  state.data.materials = Array.isArray(state.data.materials) ? state.data.materials : [];
  state.chapter = 'all';
  loadProgress();
  updateChapterOptions();
  applyFilters();
}

function setupListeners() {
  window.addEventListener('online', updateNetStatus);
  window.addEventListener('offline', updateNetStatus);

  els.subjectSelect.addEventListener('change', async (event) => {
    await loadSubject(event.target.value);
  });

  els.chapterSelect.addEventListener('change', (event) => {
    state.chapter = event.target.value;
    applyFilters();
  });

  els.modeTerms.addEventListener('click', () => {
    state.mode = 'terms';
    state.page = 'main';
    updateModeButtons();
    render();
  });

  els.modeQuiz.addEventListener('click', () => {
    state.mode = 'quiz';
    state.page = 'main';
    updateModeButtons();
    render();
  });

  els.modeMaterials.addEventListener('click', () => {
    state.mode = 'materials';
    state.page = 'main';
    updateModeButtons();
    render();
  });
  els.directionEnJa.addEventListener('click', () => {
    state.direction = 'en-ja';
    els.directionEnJa.classList.add('is-active');
    els.directionJaEn.classList.remove('is-active');
    applyFilters();
  });

  els.directionJaEn.addEventListener('click', () => {
    state.direction = 'ja-en';
    els.directionJaEn.classList.add('is-active');
    els.directionEnJa.classList.remove('is-active');
    applyFilters();
  });
  els.startQuizBtn.addEventListener('click', () => {
    startSession();
  });

  els.revealBtn.addEventListener('click', () => {
    state.revealed = !state.revealed;
    renderTerm();
  });

  els.knownBtn.addEventListener('click', () => {
    const term = state.terms[state.termIndex];
    if (term) {
      state.stats.knownTerms.add(term.term);
      saveProgress();
    }
    state.termIndex = (state.termIndex + 1) % state.terms.length;
    state.revealed = false;
    render();
  });

  els.nextBtn.addEventListener('click', () => {
    state.termIndex = (state.termIndex + 1) % state.terms.length;
    state.revealed = false;
    render();
  });

  els.quizNextBtn.addEventListener('click', () => {
    state.quizIndex = (state.quizIndex + 1) % state.quizzes.length;
    renderQuiz();
    updateMetrics();
  });

  els.materialNextBtn.addEventListener('click', () => {
    if (!state.materials.length) return;
    state.materialIndex = (state.materialIndex + 1) % state.materials.length;
    renderMaterial();
    updateMetrics();
  });

  els.sessionNextBtn.addEventListener('click', () => {
    if (!state.session.answered) return;
    state.session.cursor += 1;
    if (state.session.cursor >= state.session.queue.length) {
      finishSession();
      return;
    }
    renderSessionQuestion();
  });

  els.sessionExitBtn.addEventListener('click', () => {
    state.page = 'main';
    render();
  });

  els.sessionReviewBtn.addEventListener('click', () => {
    if (!state.session.wrongItems.length) return;
    startReview(state.session.wrongItems, '間違いの復習');
  });

  els.sessionReviewAllBtn.addEventListener('click', () => {
    if (!state.session.answeredItems.length) return;
    startReview(state.session.answeredItems, '全問の復習');
  });

  els.sessionBackBtn.addEventListener('click', () => {
    state.page = 'main';
    render();
  });

  els.reviewNextBtn.addEventListener('click', () => {
    state.review.cursor += 1;
    if (state.review.cursor >= state.review.queue.length) {
      state.page = 'main';
      render();
      return;
    }
    renderReviewQuestion();
  });

  els.reviewBackBtn.addEventListener('click', () => {
    state.page = 'main';
    render();
  });

  els.shuffleBtn.addEventListener('click', () => {
    shuffleArray(state.terms);
    shuffleArray(state.quizzes);
    shuffleArray(state.materials);
    state.termIndex = 0;
    state.quizIndex = 0;
    state.materialIndex = 0;
    state.revealed = false;
    render();
  });

  els.resetBtn.addEventListener('click', () => {
    if (!state.subject) return;
    state.stats.quizTotal = 0;
    state.stats.quizCorrect = 0;
    state.stats.knownTerms = new Set();
    state.stats.wrongQuestions = new Map();
    state.stats.history = [];
    saveProgress();
    updateMetrics();
  });
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js');
}

(async function init() {
  updateNetStatus();
  setupListeners();
  await loadSubjects();
  setupServiceWorker();
})();
