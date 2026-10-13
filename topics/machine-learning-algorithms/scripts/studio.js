(function () {
  'use strict';
  const book = window.PlaygroundKnowledge;
  if (!book) return;
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function external(url, title, cls) { const a = el('a', cls, title); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.dataset.external = 'true'; return a; }
  const nav = el('nav', 'studio-nav'); nav.setAttribute('aria-label', '实验室与知识手册');
  const brand = el('span', 'studio-brand'); const mark = el('span', 'studio-mark', '∿'); mark.setAttribute('aria-hidden', 'true'); brand.append(mark, el('span', '', 'Interactive AI'));
  nav.append(brand, el('span', 'studio-topic', book.title));
  const actions = el('div', 'studio-actions');
  actions.append(external('https://github.com/sim42/Interactive-AI-Playgrounds', 'GitHub ↗', 'studio-source'));
  const opener = el('button', 'knowledge-open', '知识手册'); opener.type = 'button'; opener.setAttribute('aria-haspopup', 'dialog'); opener.setAttribute('aria-controls', 'knowledge-drawer'); actions.append(opener); nav.append(actions); document.body.prepend(nav);
  const dialog = el('dialog', 'knowledge-drawer'); dialog.id = 'knowledge-drawer'; dialog.setAttribute('aria-labelledby', 'knowledge-title');
  const layout = el('div', 'knowledge-layout'), top = el('div', 'knowledge-top'), heading = el('div', 'knowledge-heading');
  top.append(el('p', 'knowledge-eyebrow', 'THE FIELD GUIDE / 知识手册'));
  const title = el('h2', '', book.title); title.id = 'knowledge-title';
  const closer = el('button', 'knowledge-close', '×'); closer.type = 'button'; closer.setAttribute('aria-label', '关闭知识手册'); heading.append(title, closer); top.append(heading, el('p', 'knowledge-context', book.question));
  const tabs = el('div', 'knowledge-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '手册内容'); top.append(tabs);
  const content = el('div', 'knowledge-content'), panels = [], buttons = [];
  const labels = ['直觉与实验', '数学关系', '延伸阅读'];
  labels.forEach((label, i) => {
    const button = el('button', '', label); button.type = 'button'; button.id = 'knowledge-tab-' + i; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'knowledge-panel-' + i);
    const panel = el('div', 'knowledge-panel'); panel.id = 'knowledge-panel-' + i; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', button.id); panel.tabIndex = 0;
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', e => { let next = i; if(e.key === 'ArrowRight') next = (i + 1) % 3; else if(e.key === 'ArrowLeft') next = (i + 2) % 3; else if(e.key === 'Home') next = 0; else if(e.key === 'End') next = 2; else return; e.preventDefault(); select(next); buttons[next].focus(); });
    buttons.push(button); panels.push(panel); tabs.append(button); content.append(panel);
  });
  function select(i) { panels.forEach((p,j) => { p.hidden = i !== j; buttons[j].setAttribute('aria-selected', String(i === j)); buttons[j].tabIndex = i === j ? 0 : -1; }); content.scrollTop = 0; }
  book.concepts.forEach(c => { const section = el('section'); section.append(el('h3', '', c.title), el('p', '', c.text)); if(c.try) { const task = el('p', 'knowledge-try'); task.append(el('strong', '', '回到实验，试一试'), document.createTextNode(c.try)); section.append(task); } panels[0].append(section); });
  book.math.forEach(c => { const section = el('section'); section.append(el('h3', '', c.title)); const formula = el('div', 'knowledge-formula'); if(window.katex) { window.katex.render(c.tex, formula, {displayMode:true,throwOnError:false,trust:false,strict:'ignore'}); } else formula.textContent = c.tex; section.append(formula, el('p', '', c.text)); panels[1].append(section); });
  panels[2].append(el('p', 'reading-note', '以下为精选外部资料，主动点击后需联网打开。实验与本地知识说明均可离线使用。资料保留原作者署名，未复制其网页或视频。'));
  book.sources.forEach(s => { const a = external(s.url, '', 'knowledge-source'); a.append(el('span', 'source-type', s.type), el('span', 'source-title', s.title + ' ↗'), el('span', 'source-description', s.note), el('span', 'source-domain', new URL(s.url).hostname)); panels[2].append(a); });
  const footer = el('div', 'knowledge-footer', '本地手册 · 按 Esc 关闭，回到当前实验'); footer.setAttribute('role', 'status');
  layout.append(top, content, footer); dialog.append(layout); document.body.append(dialog); select(0);
  function pauseExperiment() {
    let paused = false;
    const click = id => { const button = document.getElementById(id); if (button && !button.disabled) { button.click(); paused = true; } };
    if (book.id === 'machine-learning-algorithms') { if(window.MachineLearningLab.getState().status === 'running') click('play'); }
    else if (book.id === 'mlp-playground') { const s = window.MLPLab.App.getState(); if(s.running) click(s.runMode === 'trace' ? 'play' : 'trainToggle'); }
    else if (book.id === 'universal-approximation') { const a = window.UniversalApprox.App; if(a && a.getOneState().status === 'running') click('relu-pause'); if(a && a.getState().status === 'running') click('pause'); }
    else { const button = document.getElementById('pause'); if(button && !button.disabled) click('pause'); }
    return paused;
  }
  opener.addEventListener('click', () => { const paused = pauseExperiment(); footer.textContent = paused ? '实验已暂停，状态已保留 · 关闭后可手动继续' : '本地手册 · 按 Esc 关闭，回到当前实验'; dialog.showModal(); document.body.classList.add('knowledge-is-open'); closer.focus(); });
  dialog.addEventListener('keydown', e => {
    if(e.key !== 'Tab') return;
    const items = Array.from(dialog.querySelectorAll('button, a[href], [tabindex]')).filter(n => n.tabIndex >= 0 && !n.disabled && n.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  closer.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { const rect = dialog.getBoundingClientRect(); if(e.target === dialog && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('knowledge-is-open'); opener.focus(); });
}());
