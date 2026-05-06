'use strict';

const DEPRECATED_SUBJECT_IDS = new Set(['toeic-600']);

async function loadHome() {
  const grid = document.getElementById('subjectGrid');
  if (!grid) return;

  const res = await fetch('./data/index.json');
  const payload = await res.json();
  const subjects = normalizeSubjects(payload.subjects);
  const homeSubjects = buildHomeSubjects(subjects);

  grid.innerHTML = '';
  homeSubjects.forEach((subject) => {
    const link = document.createElement('a');
    link.className = 'subject-card';
    link.href = `./study.html?subject=${encodeURIComponent(subject.id)}`;
    link.dataset.theme = subject.theme || 'default';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'section-kicker';
    eyebrow.textContent = subject.group || 'Subject';

    const title = document.createElement('h3');
    title.textContent = subject.title;

    const desc = document.createElement('p');
    desc.className = 'subject-description';
    desc.textContent = subject.description || '科目ページへ移動して学習を始める。';

    const footer = document.createElement('div');
    footer.className = 'subject-meta';
    footer.textContent = subject.themeLabel || subject.theme || 'default';

    link.appendChild(eyebrow);
    link.appendChild(title);
    link.appendChild(desc);
    link.appendChild(footer);
    grid.appendChild(link);
  });
}

function normalizeSubjects(subjects) {
  return (Array.isArray(subjects) ? subjects : [])
    .filter(subject => !DEPRECATED_SUBJECT_IDS.has(subject.id));
}

function buildHomeSubjects(subjects) {
  const toeicSubjects = subjects.filter(subject => subject.group === 'TOEIC');
  const otherSubjects = subjects.filter(subject => subject.group !== 'TOEIC' && subject.id !== 'template');
  if (!toeicSubjects.length) return otherSubjects;
  return [
    {
      id: 'words1-400',
      title: 'TOEIC',
      theme: 'toeic',
      themeLabel: 'Vocabulary Deck',
      group: 'TOEIC',
      description: '単語セットを選び、100語単位で区切って用語確認と小テストを進める。',
    },
    ...otherSubjects,
  ];
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js');
}

loadHome().catch((err) => {
  console.error('Home load failed', err);
});
setupServiceWorker();
