'use strict';

const state = {
  subjects: [],
  subject: null,
  data: null,
  mode: 'terms',
  quizType: 'quiz',
  chapter: 'all',
  terms: [],
  quizzes: [],
  termQuizzes: [],
  termIndex: 0,
  quizIndex: 0,
  page: 'main',
  direction: 'en-ja',
  session: {
    queue: [],
    cursor: 0,
    correct: 0,
    wrong: 0,
    answered: false,
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
  modeTerms: document.getElementById('modeTerms'),
  modeQuiz: document.getElementById('modeQuiz'),
  startQuizBtn: document.getElementById('startQuizBtn'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  progressText: document.getElementById('progressText'),
  accuracyText: document.getElementById('accuracyText'),
  historySummary: document.getElementById('historySummary'),
  historyList: document.getElementById('historyList'),
  cardView: document.getElementById('cardView'),
  quizView: document.getElementById('quizView'),
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
  sessionTitle: document.getElementById('sessionTitle'),
  sessionTag: document.getElementById('sessionTag'),
  sessionQuestion: document.getElementById('sessionQuestion'),
  sessionOptions: document.getElementById('sessionOptions'),
  sessionExplain: document.getElementById('sessionExplain'),
  sessionNextBtn: document.getElementById('sessionNextBtn'),
  sessionExitBtn: document.getElementById('sessionExitBtn'),
  sessionScore: document.getElementById('sessionScore'),
  sessionReviewBtn: document.getElementById('sessionReviewBtn'),
  sessionBackBtn: document.getElementById('sessionBackBtn'),
  reviewTag: document.getElementById('reviewTag'),
  reviewQuestion: document.getElementById('reviewQuestion'),
  reviewOptions: document.getElementById('reviewOptions'),
  reviewExplain: document.getElementById('reviewExplain'),
  reviewNextBtn: document.getElementById('reviewNextBtn'),
  reviewBackBtn: document.getElementById('reviewBackBtn'),
  netStatus: document.getElementById('netStatus'),
  directionEnJa: document.getElementById('directionEnJa'),
  directionJaEn: document.getElementById('directionJaEn'),
};

function updateNetStatus() {
  els.netStatus.textContent = navigator.onLine ? 'Online' : 'Offline Ready';
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
    els.sessionView,
    els.sessionResultView,
    els.sessionReviewView,
  ];
  views.forEach((panel) => panel.classList.add('hidden'));
  if (view === 'card') els.cardView.classList.remove('hidden');
  if (view === 'quiz') els.quizView.classList.remove('hidden');
  if (view === 'session') els.sessionView.classList.remove('hidden');
  if (view === 'result') els.sessionResultView.classList.remove('hidden');
  if (view === 'review') els.sessionReviewView.classList.remove('hidden');
}

function getFilteredTerms() {
  if (!state.data) return [];
  return state.data.terms.filter(term => state.chapter === 'all' || term.chapter === state.chapter);
}

function getFilteredQuizzes() {
  if (!state.data) return [];
  return state.data.quizzes.filter(q => state.chapter === 'all' || q.chapter === state.chapter);
}

function updateChapterOptions() {
  const chapters = new Set(['all']);
  state.data.terms.forEach(term => chapters.add(term.chapter));
  state.data.quizzes.forEach(q => chapters.add(q.chapter));
  els.chapterSelect.innerHTML = '';
  Array.from(chapters).forEach(chapter => {
    const opt = document.createElement('option');
    opt.value = chapter;
    opt.textContent = chapter === 'all' ? '全章' : chapter;
    els.chapterSelect.appendChild(opt);
  });
  els.chapterSelect.value = state.chapter;
}

function updateMetrics() {
  const total = state.mode === 'terms' ? state.terms.length : state.quizzes.length;
  const current = state.mode === 'terms' ? state.termIndex + 1 : state.quizIndex + 1;
  els.progressText.textContent = total ? `${current} / ${total}` : '0 / 0';
  if (state.stats.quizTotal) {
    const ratio = Math.round((state.stats.quizCorrect / state.stats.quizTotal) * 100);
    els.accuracyText.textContent = `${ratio}%`;
  } else {
    els.accuracyText.textContent = '-';
  }
  renderStudyLog();
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
    els.cardBody.textContent = back;
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
    li.textContent = text;
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
  els.quizExplain.textContent = '';
  els.quizExplain.classList.add('hidden');
  if (!state.quizzes.length) {
    els.quizQuestion.textContent = '問題データを追加してください。';
    els.quizOptions.innerHTML = '';
    return;
  }
  const quiz = state.quizzes[state.quizIndex];
  if (!quiz) {
    els.quizQuestion.textContent = '問題データを追加してください。';
    els.quizOptions.innerHTML = '';
    return;
  }
  els.quizQuestion.textContent = quiz.question;
  els.quizTag.textContent = quiz.chapter || '';
  els.quizOptions.innerHTML = '';
  quiz.options.forEach(option => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.textContent = `${option.key}. ${option.text}`;
    btn.addEventListener('click', () => handleQuizAnswer(option, quiz, btn));
    els.quizOptions.appendChild(btn);
  });
}

function getQuizPool() {
  if (state.mode === 'terms') {
    return [...state.termQuizzes];
  }
  return [...getFilteredQuizzes()];
}

function renderSessionQuestion() {
  els.sessionExplain.textContent = '';
  els.sessionExplain.classList.add('hidden');
  if (!state.session.queue.length) {
    els.sessionQuestion.textContent = '問題データを追加してください。';
    els.sessionOptions.innerHTML = '';
    return;
  }
  const quiz = state.session.queue[state.session.cursor];
  if (!quiz) {
    els.sessionQuestion.textContent = '問題データを追加してください。';
    els.sessionOptions.innerHTML = '';
    return;
  }
  els.sessionTag.textContent = quiz.chapter || '';
  els.sessionQuestion.textContent = quiz.question;
  els.sessionOptions.innerHTML = '';
  state.session.answered = false;
  quiz.options.forEach((option) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.textContent = `${option.key}. ${option.text}`;
    btn.addEventListener('click', () => handleSessionAnswer(option, quiz, btn));
    els.sessionOptions.appendChild(btn);
  });
}

function renderSessionResult() {
  const total = state.session.queue.length;
  const ratio = total ? Math.round((state.session.correct / total) * 100) : 0;
  els.sessionScore.textContent = `正答率 ${ratio}%（${state.session.correct} / ${total}）`;
  if (state.session.wrongItems.length) {
    els.sessionReviewBtn.disabled = false;
  } else {
    els.sessionReviewBtn.disabled = true;
  }
}

function renderReviewQuestion() {
  els.reviewExplain.textContent = '';
  els.reviewExplain.classList.add('hidden');
  if (!state.review.queue.length) {
    els.reviewQuestion.textContent = '復習する問題がありません。';
    els.reviewOptions.innerHTML = '';
    return;
  }
  const entry = state.review.queue[state.review.cursor];
  const quiz = entry.quiz;
  els.reviewTag.textContent = quiz.chapter || '';
  els.reviewQuestion.textContent = quiz.question;
  els.reviewOptions.innerHTML = '';
  quiz.options.forEach((option) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.textContent = `${option.key}. ${option.text}`;
    btn.disabled = true;
    if (quiz.answer_key && option.key === quiz.answer_key) {
      btn.classList.add('is-correct');
    } else if (!quiz.answer_key && option.text === quiz.answer_text) {
      btn.classList.add('is-correct');
    }
    if (entry.selectedKey && option.key === entry.selectedKey) {
      btn.classList.add('is-wrong');
    }
    els.reviewOptions.appendChild(btn);
  });
  const explainParts = [
    `解答: ${quiz.answer_text}`,
    quiz.explanation ? `解説: ${quiz.explanation}` : '',
    quiz.other_explanations ? `他選択肢: ${quiz.other_explanations}` : '',
  ].filter(Boolean);
  els.reviewExplain.textContent = explainParts.join(' ');
  els.reviewExplain.classList.remove('hidden');
}

function startSession() {
  buildTermQuizzes();
  const pool = getQuizPool();
  shuffleArray(pool);
  state.session.queue = pool;
  state.session.cursor = 0;
  state.session.correct = 0;
  state.session.wrong = 0;
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

function startReview() {
  state.review.queue = [...state.session.wrongItems];
  state.review.cursor = 0;
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
  const correctKey = quiz.answer_key || null;
  const correctText = quiz.answer_text;
  const buttons = Array.from(els.quizOptions.querySelectorAll('button'));
  buttons.forEach(button => button.disabled = true);
  state.stats.quizTotal += 1;

  const isCorrect = correctKey ? option.key === correctKey : option.text === correctText;
  if (isCorrect) {
    state.stats.quizCorrect += 1;
    btn.classList.add('is-correct');
  } else {
    btn.classList.add('is-wrong');
    buttons.forEach(button => {
      if (correctKey && button.textContent.startsWith(`${correctKey}.`)) {
        button.classList.add('is-correct');
      } else if (!correctKey && button.textContent.includes(correctText)) {
        button.classList.add('is-correct');
      }
    });
  }

  const explainParts = [
    `解答: ${quiz.answer_text}`,
    quiz.explanation ? `解説: ${quiz.explanation}` : '',
    quiz.other_explanations ? `他選択肢: ${quiz.other_explanations}` : '',
  ].filter(Boolean);
  els.quizExplain.textContent = explainParts.join(' ');
  els.quizExplain.classList.remove('hidden');
  saveProgress();
  updateMetrics();
}

function handleSessionAnswer(option, quiz, btn) {
  const correctKey = quiz.answer_key || null;
  const correctText = quiz.answer_text;
  const buttons = Array.from(els.sessionOptions.querySelectorAll('button'));
  if (state.session.answered) return;
  state.session.answered = true;
  buttons.forEach(button => button.disabled = true);
  state.stats.quizTotal += 1;
  const isCorrect = correctKey ? option.key === correctKey : option.text === correctText;
  if (isCorrect) {
    state.session.correct += 1;
    state.stats.quizCorrect += 1;
    btn.classList.add('is-correct');
  } else {
    state.session.wrong += 1;
    btn.classList.add('is-wrong');
    buttons.forEach(button => {
      if (correctKey && button.textContent.startsWith(`${correctKey}.`)) {
        button.classList.add('is-correct');
      } else if (!correctKey && button.textContent.includes(correctText)) {
        button.classList.add('is-correct');
      }
    });
    recordWrongQuestion(quiz, option.key);
    state.session.wrongItems.push({ quiz, selectedKey: option.key });
  }
  const explainParts = [
    `解答: ${quiz.answer_text}`,
    quiz.explanation ? `解説: ${quiz.explanation}` : '',
    quiz.other_explanations ? `他選択肢: ${quiz.other_explanations}` : '',
  ].filter(Boolean);
  els.sessionExplain.textContent = explainParts.join(' ');
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
  buildTermQuizzes();
  state.termIndex = 0;
  state.quizIndex = 0;
  state.revealed = false;
  render();
}

function render() {
  if (state.page !== 'main') return;
  if (state.mode === 'terms') {
    setContentView('card');
    renderTerm();
  } else {
    setContentView('quiz');
    if (state.quizType === 'term') {
      state.quizzes = state.termQuizzes;
    } else if (state.quizType === 'mixed') {
      state.quizzes = [...getFilteredQuizzes(), ...state.termQuizzes];
      shuffleArray(state.quizzes);
    } else {
      state.quizzes = getFilteredQuizzes();
    }
    renderQuiz();
  }
  updateMetrics();
}

async function loadSubjects() {
  const res = await fetch('./data/index.json');
  const payload = await res.json();
  state.subjects = payload.subjects;
  els.subjectSelect.innerHTML = '';
  payload.subjects.forEach(subject => {
    const opt = document.createElement('option');
    opt.value = subject.id;
    opt.textContent = subject.title;
    els.subjectSelect.appendChild(opt);
  });
  if (payload.subjects.length) {
    await loadSubject(payload.subjects[0].id);
  }
}

async function loadSubject(id) {
  const subject = state.subjects.find(s => s.id === id);
  if (!subject) return;
  state.subject = subject;
  const res = await fetch(subject.file);
  state.data = await res.json();
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
    els.modeTerms.classList.add('is-active');
    els.modeQuiz.classList.remove('is-active');
    state.page = 'main';
    render();
  });

  els.modeQuiz.addEventListener('click', () => {
    state.mode = 'quiz';
    els.modeQuiz.classList.add('is-active');
    els.modeTerms.classList.remove('is-active');
    state.page = 'main';
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
    setContentView(state.mode === 'terms' ? 'card' : 'quiz');
    render();
  });

  els.sessionReviewBtn.addEventListener('click', () => {
    if (!state.session.wrongItems.length) return;
    startReview();
  });

  els.sessionBackBtn.addEventListener('click', () => {
    state.page = 'main';
    setContentView(state.mode === 'terms' ? 'card' : 'quiz');
    render();
  });

  els.reviewNextBtn.addEventListener('click', () => {
    state.review.cursor += 1;
    if (state.review.cursor >= state.review.queue.length) {
      state.page = 'main';
      setContentView(state.mode === 'terms' ? 'card' : 'quiz');
      render();
      return;
    }
    renderReviewQuestion();
  });

  els.reviewBackBtn.addEventListener('click', () => {
    state.page = 'main';
    setContentView(state.mode === 'terms' ? 'card' : 'quiz');
    render();
  });

  els.shuffleBtn.addEventListener('click', () => {
    shuffleArray(state.terms);
    shuffleArray(state.quizzes);
    state.termIndex = 0;
    state.quizIndex = 0;
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
