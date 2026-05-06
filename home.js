'use strict';

async function loadHome() {
  const grid = document.getElementById('subjectGrid');
  if (!grid) return;

  const res = await fetch('./data/index.json');
  const payload = await res.json();
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];

  grid.innerHTML = '';
  subjects.forEach((subject) => {
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

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js');
}

loadHome().catch((err) => {
  console.error('Home load failed', err);
});
setupServiceWorker();
