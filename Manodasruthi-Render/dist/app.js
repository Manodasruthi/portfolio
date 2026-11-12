const dialog = document.getElementById('projects-dialog');
let projectOpener;
document.querySelectorAll('[data-open-projects]').forEach(button => button.addEventListener('click', () => {
  projectOpener = button;
  dialog.showModal();
}));
document.getElementById('close-projects').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const box = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
});
dialog.addEventListener('close', () => projectOpener?.focus());
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelectorAll('.project').forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
}));
document.getElementById('year').textContent = new Date().getFullYear();

// Progressive enhancement: content is visible if animations or JS are unavailable.
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  const counters = new Map();
  const canAnimate = typeof Element.prototype.animate === 'function';
  const reveal = (element, delay = 0, duration = 560) => {
    if (preference.matches || !canAnimate) return;
    const animation = element.animate([
      { opacity: 0, transform: 'translateY(16px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    running.add(animation);
    animation.finished.then(() => running.delete(animation), () => running.delete(animation));
  };
  const countUp = element => {
    if (preference.matches) return;
    const text = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && /^\s*\d+/.test(node.textContent));
    if (!text) return;
    const original = text.textContent;
    const target = Number(original.match(/\d+/)[0]);
    const started = performance.now();
    // Keep a stable accessible value while the visual number changes.
    element.setAttribute('aria-label', element.textContent.trim());
    const state = { frame: 0, text, original };
    counters.set(element, state);
    const tick = now => {
      const progress = Math.min((now - started) / 850, 1);
      const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      text.textContent = original.replace(/\d+/, String(value));
      if (progress < 1 && !preference.matches) state.frame = requestAnimationFrame(tick);
      else { text.textContent = original; counters.delete(element); }
    };
    state.frame = requestAnimationFrame(tick);
  };
  const hero = document.querySelector('#main > section');
  const intro = hero?.firstElementChild?.firstElementChild;
  if (intro) [...intro.children].forEach((element, index) => reveal(element, index * 65));
  document.querySelectorAll('#main > section:first-child strong, #about strong.text-3xl').forEach(element => { element.dataset.count = ''; });
  const targets = document.querySelectorAll('#about-heading, #about .experience-item, .hero-stat, #about .cert-group, #about p.mb-6, #about p.mb-5, [data-count]');
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (entry.target.hasAttribute('data-count')) countUp(entry.target);
      else reveal(entry.target);
    }), { threshold: .12 });
    targets.forEach(element => observer.observe(element));
  }
  document.querySelectorAll('.cert-group').forEach(group => group.addEventListener('toggle', () => {
    if (group.open) {
      const list = group.querySelector('ul');
      if (list) [...list.children].forEach((item, index) => reveal(item, Math.min(index, 5) * 35, 300));
    }
  }));
  document.querySelectorAll('[data-open-projects]').forEach(button => button.addEventListener('click', () => {
    reveal(dialog, 0, 260);
    dialog.querySelectorAll('.project:not([hidden])').forEach((card, index) => reveal(card, index * 45, 360));
  }));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.project:not([hidden])').forEach((card, index) => reveal(card, index * 35, 240));
  }));
  preference.addEventListener('change', () => {
    if (!preference.matches) return;
    running.forEach(animation => animation.cancel());
    running.clear();
    counters.forEach(state => { cancelAnimationFrame(state.frame); state.text.textContent = state.original; });
    counters.clear();
    observer?.disconnect();
  });
})();

// A lightweight reading indicator; scroll work is limited to one frame.
(() => {
  const bar = document.querySelector('.reading-progress');
  if (!bar) return;
  let queued = false;
  const update = () => {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    bar.style.transform = `scaleX(${progress})`;
    queued = false;
  };
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  document.querySelectorAll('details').forEach(item => item.addEventListener('toggle', schedule));
  update();
})();

// Optional decorative effects, with a persistent off switch and reduced-motion support.
(() => {
  const button = document.getElementById('visual-effects-toggle');
  if (!button) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let enabled = !reduced.matches;
  try { const saved = localStorage.getItem('portfolio-visual-effects'); if (saved !== null) enabled = saved === 'on' && !reduced.matches; } catch {}
  const apply = () => {
    document.body.classList.toggle('effects-on', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = `Visual effects: ${enabled ? 'On' : 'Off'}`;
  };
  button.addEventListener('click', () => {
    enabled = !enabled;
    apply();
    try { localStorage.setItem('portfolio-visual-effects', enabled ? 'on' : 'off'); } catch {}
  });
  reduced.addEventListener('change', () => { if (reduced.matches) { enabled = false; apply(); } });
  document.querySelectorAll('.hero-stat, .project, #about aside').forEach(card => {
    card.classList.add('fx-card');
    let frame = 0;
    let x = 0, y = 0;
    card.addEventListener('pointermove', event => {
      if (!enabled || reduced.matches || !finePointer.matches) return;
      const box = card.getBoundingClientRect();
      x = event.clientX - box.left; y = event.clientY - box.top;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        card.style.setProperty('--light-x', `${x}px`);
        card.style.setProperty('--light-y', `${y}px`);
        frame = 0;
      });
    });
    card.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); frame = 0; });
  });
  const visibility = () => document.body.classList.toggle('page-hidden', document.hidden);
  document.addEventListener('visibilitychange', visibility);
  visibility();
  apply();
})();

// Small perspective changes on mouse devices; off on touch and reduced motion.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const resets = [];
  document.querySelectorAll('.hero-stat, .project').forEach(card => {
    card.classList.add('depth-card');
    let frame = 0, rx = 0, ry = 0;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      card.style.removeProperty('--depth-x'); card.style.removeProperty('--depth-y');
      card.removeAttribute('data-tilting');
    };
    resets.push(reset);
    card.addEventListener('pointermove', event => {
      if (reduced.matches || !pointer.matches || !document.body.classList.contains('effects-on')) return;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const clamp = value => Math.max(-1, Math.min(1, value));
      rx = -clamp((event.clientY - rect.top) / rect.height * 2 - 1) * 3;
      ry = clamp((event.clientX - rect.left) / rect.width * 2 - 1) * 4;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        card.style.setProperty('--depth-x', `${rx}deg`);
        card.style.setProperty('--depth-y', `${ry}deg`);
        card.setAttribute('data-tilting', ''); frame = 0;
      });
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
  });
  const resetAll = () => resets.forEach(reset => reset());
  reduced.addEventListener('change', resetAll);
  pointer.addEventListener('change', resetAll);
  document.getElementById('visual-effects-toggle')?.addEventListener('click', resetAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); });
})();
