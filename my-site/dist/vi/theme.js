import { refreshPalette } from './palette.js';
import { onLanguageChange } from '../assets/language.js';

const STORAGE_KEY = 'bassel-portfolio-theme';
const CHOICES = ['system', 'nocturne', 'daylight', 'parchment', 'instrument'];
const root = document.documentElement;
const systemQuery = matchMedia('(prefers-color-scheme: light)');

const labels = {
  en: {
    appearance: 'Appearance',
    system: 'Auto',
    nocturne: 'Nocturne',
    daylight: 'Daylight',
    parchment: 'Parchment',
    instrument: 'Instrument',
  },
  ar: {
    appearance: 'المظهر',
    system: 'تلقائي',
    nocturne: 'ليلي',
    daylight: 'نهاري',
    parchment: 'ورقي',
    instrument: 'آلي',
  },
};

function readChoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (CHOICES.includes(saved)) return saved;
  } catch {}
  const booted = root.dataset.themeChoice;
  return CHOICES.includes(booted) ? booted : 'system';
}

function resolve(choice) {
  if (choice === 'system') return systemQuery.matches ? 'daylight' : 'nocturne';
  return choice;
}

function paintMeta(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const style = getComputedStyle(root);
  meta.setAttribute('content', style.getPropertyValue('--vi-hero-bg').trim() || (theme === 'daylight' || theme === 'parchment' ? '#f3efe4' : '#070707'));
}

export function applyTheme(choice = readChoice(), persist = false) {
  if (!CHOICES.includes(choice)) choice = 'system';
  const theme = resolve(choice);
  root.dataset.themeChoice = choice;
  root.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch {}
  }
  refreshPalette();
  paintMeta(theme);
  dispatchEvent(new CustomEvent('themechange', { detail: { choice, theme } }));
  return theme;
}

function buildControl() {
  if (document.querySelector('[data-theme-control]')) return;
  const control = document.createElement('div');
  control.className = 'theme-control';
  control.dataset.themeControl = '';
  control.innerHTML = `
    <button class="theme-toggle vi-icon-control" type="button" aria-haspopup="true" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="12" cy="12" r="5.1" fill="none" stroke="currentColor" stroke-width=".8" opacity=".55"/>
        <path d="M15.8 8.2 13.5 13.5 8.2 15.8 10.5 10.5Z" fill="currentColor"/>
        <circle cx="12" cy="12" r="1.15" fill="currentColor"/>
      </svg>
    </button>
    <div class="theme-menu" role="menu" hidden>
      <p class="theme-menu-title"></p>
      ${CHOICES.map(choice => `
        <button class="theme-option" type="button" role="menuitemradio" data-theme-choice="${choice}" aria-checked="false">
          <span class="theme-swatch" data-swatch="${choice}" aria-hidden="true"></span>
          <span class="theme-option-label" data-label="${choice}"></span>
          <span class="theme-check" aria-hidden="true">✓</span>
        </button>`).join('')}
    </div>`;
  document.body.append(control);

  const toggle = control.querySelector('.theme-toggle');
  const menu = control.querySelector('.theme-menu');
  const title = control.querySelector('.theme-menu-title');
  const options = [...control.querySelectorAll('.theme-option')];

  function close({ focus = false } = {}) {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (focus) toggle.focus({ preventScroll: true });
  }
  function open() {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    const current = options.find(option => option.getAttribute('aria-checked') === 'true') || options[0];
    current.focus({ preventScroll: true });
  }
  function sync() {
    const choice = root.dataset.themeChoice || readChoice();
    for (const option of options) option.setAttribute('aria-checked', String(option.dataset.themeChoice === choice));
  }
  function localize(language) {
    const copy = labels[language] || labels.en;
    title.textContent = copy.appearance;
    toggle.setAttribute('aria-label', copy.appearance);
    toggle.setAttribute('title', copy.appearance);
    for (const option of options) option.querySelector('[data-label]').textContent = copy[option.dataset.themeChoice];
    control.dir = language === 'ar' ? 'rtl' : 'ltr';
  }

  toggle.addEventListener('click', () => menu.hidden ? open() : close({ focus: true }));
  for (const option of options) {
    option.addEventListener('click', () => {
      applyTheme(option.dataset.themeChoice, true);
      sync();
      close({ focus: true });
    });
  }
  menu.addEventListener('keydown', event => {
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); close({ focus: true }); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); options[(index + 1 + options.length) % options.length].focus(); }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); options[(index - 1 + options.length) % options.length].focus(); }
    else if (event.key === 'Home') { event.preventDefault(); options[0].focus(); }
    else if (event.key === 'End') { event.preventDefault(); options.at(-1).focus(); }
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !control.contains(event.target)) close();
  });
  addEventListener('themechange', sync);
  onLanguageChange(localize);
  sync();
}

buildControl();
applyTheme(readChoice());

systemQuery.addEventListener('change', () => {
  if ((root.dataset.themeChoice || readChoice()) === 'system') applyTheme('system');
});
