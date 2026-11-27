import { onLanguageChange, text } from '../assets/language.js';

// Both languages and the compass projection share one live DOM.
const fields = document.querySelector('#fields');
const links = [...fields.querySelectorAll('.field,.all-work')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let active = null;
const englishCopy = [...fields.querySelectorAll('.field')].map(field => ({
  title: field.querySelector('.field-title').textContent,
  lines: [...field.querySelectorAll('.field-copy-line')].map(line => line.textContent),
}));
const arabicCopy = [
  {
    title: 'ميريديان',
    lines: ['دراسة تنقل عبر', 'المدينة.'],
  },
  {
    title: 'نبض',
    lines: ['دراسة إشارة عن', 'الإيقاع والاستجابة.'],
  },
  {
    title: 'أطلس',
    lines: ['نظام تحريري', 'للخرائط والذاكرة.'],
  },
  {
    title: 'اتجاه',
    lines: ['أداة لإيجاد', 'اتجاه.'],
  },
];

// Reuse the original title's staggered glyphs for every text element while
// preserving authored copy lines and natural word wraps.
function prepareText(element) {
  const lines = [...element.querySelectorAll('.field-copy-line')];
  const labels = lines.length ? lines.map(line => line.textContent.trim()) : [element.textContent.trim()];
  element.setAttribute('aria-label', labels.join(' '));
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  let characterIndex = 0;
  labels.forEach((label, lineIndex) => {
    const line = lines.length ? document.createElement('span') : visual;
    if (lines.length) line.className = 'field-copy-line';
    if (lineIndex) characterIndex++;
    // Arabic is revealed word by word so the letters keep their joined forms.
    // Latin and numeric copy keeps the original per-character stagger.
    const arabic = /[\u0600-\u06FF]/u.test(label);
    const parts = arabic
      ? label.split(/(\s+)/u).filter(Boolean)
      : label.split(/(\s+|[（「“《【]?[\u3400-\u9fff][，。、；：？！）」”》】]*)/u).filter(Boolean);
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        line.append(document.createTextNode(part));
        characterIndex += part.length;
        continue;
      }
      const word = document.createElement('span');
      word.className = 'work-word';
      if (arabic) {
        const glyph = document.createElement('span');
        glyph.className = 'work-glyph';
        glyph.style.setProperty('--char', characterIndex);
        characterIndex += part.length;
        for (const layer of ['base', 'accent']) {
          const letter = document.createElement('span');
          letter.className = `work-letter work-letter-${layer}`;
          letter.textContent = part;
          glyph.append(letter);
        }
        word.append(glyph);
        line.append(word);
        continue;
      }
      for (const character of part) {
        const glyph = document.createElement('span');
        glyph.className = 'work-glyph';
        glyph.style.setProperty('--char', characterIndex++);
        for (const layer of ['base', 'accent']) {
          const letter = document.createElement('span');
          letter.className = `work-letter work-letter-${layer}`;
          letter.textContent = character;
          glyph.append(letter);
        }
        word.append(glyph);
      }
      line.append(word);
    }
    if (lines.length) visual.append(line);
  });
  element.replaceChildren(visual);
  return characterIndex;
}

// Images and the arrow use that same motion primitive as a single visual unit.
// Both image layers keep exactly the same source and crop.
function prepareReel(element) {
  const base = document.createElement('span');
  base.className = 'work-letter work-letter-base';
  base.append(...element.childNodes);
  const accent = base.cloneNode(true);
  accent.className = 'work-letter work-letter-accent';
  accent.setAttribute('aria-hidden', 'true');
  element.classList.add('work-reel');
  element.replaceChildren(base, accent);
}
fields.querySelectorAll('.field-number').forEach(number => {
  number.dataset.number = number.textContent.trim();
});
const timing = getComputedStyle(fields);
const duration = parseFloat(timing.getPropertyValue('--work-duration'));
const stagger = parseFloat(timing.getPropertyValue('--work-stagger'));
fields.querySelectorAll('.field-number').forEach(prepareText);
fields.querySelectorAll('.field-image').forEach(prepareReel);
// The label needs the same local line mask as the existing word/glyph layers.
const selectedLabel = fields.querySelector('.selected-work-label');
const selectedLabelInner = document.createElement('span');
selectedLabelInner.className = 'work-label-inner';
selectedLabelInner.append(...selectedLabel.childNodes);
selectedLabel.append(selectedLabelInner);
const icon = fields.querySelector('.all-work > .vi-icon');
const arrow = document.createElement('span');
arrow.className = 'work-arrow';
arrow.setAttribute('aria-hidden', 'true');
icon.replaceWith(arrow);
arrow.append(icon);
prepareReel(arrow);

function setLines(element, lines) {
  element.replaceChildren(...lines.map(copy => {
    const line = document.createElement('span');
    line.className = 'field-copy-line';
    line.textContent = copy;
    return line;
  }));
}
onLanguageChange(language => {
  resetFieldPreviews();
  fields.lang = language;
  const prompt = fields.querySelector('#fields-title');
  const arabic = language === 'ar';
  const promptLines = arabic ? ['الشكل يتبع', 'السؤال.'] : ['Form follows', 'the question.'];
  prompt.setAttribute('aria-label', promptLines.join(' '));
  prompt.replaceChildren(...promptLines.map(copy => {
    const line = document.createElement('span');
    line.className = 'fields-prompt-line';
    line.setAttribute('aria-hidden', 'true');
    if (arabic) {
      for (const part of copy.split(/(\s+)/u).filter(Boolean)) {
        if (/^\s+$/.test(part)) { line.append(document.createTextNode(part)); continue; }
        const mask = document.createElement('span');
        mask.className = 'fields-prompt-mask';
        const glyph = document.createElement('span');
        glyph.className = 'fields-prompt-char';
        glyph.textContent = part;
        mask.append(glyph); line.append(mask);
      }
    } else {
      for (const character of copy) {
        const mask = document.createElement('span');
        mask.className = 'fields-prompt-mask';
        const glyph = document.createElement('span');
        glyph.className = 'fields-prompt-char';
        glyph.textContent = character === ' ' ? '\u00a0' : character;
        mask.append(glyph); line.append(mask);
      }
    }
    return line;
  }));
  selectedLabelInner.textContent = text('Selected work', 'أعمال مختارة');
  fields.querySelector('.field-grid').setAttribute('aria-label', text('Selected work', 'أعمال مختارة'));
  fields.querySelectorAll('.field').forEach((field, index) => {
    const copy = (arabic ? arabicCopy : englishCopy)[index];
    const title = field.querySelector('.field-title');
    const description = field.querySelector('.field-description');
    title.textContent = copy.title;
    setLines(description, copy.lines);
    const titleLength = prepareText(title), copyLength = prepareText(description);
    description.style.setProperty('--work-tempo', Math.min(1,
      (duration + Math.max(0, titleLength - 1) * stagger) / (duration + Math.max(0, copyLength - 1) * stagger)));
    field.setAttribute('aria-label', text(`${copy.title} — View project`, `${copy.title} — عرض المشروع`));
  });
  const label = fields.querySelector('.all-work-label');
  label.textContent = text('All work', 'كل الأعمال');
  fields.querySelector('.all-work').setAttribute('aria-label', label.textContent);
  arrow.style.setProperty('--char', prepareText(label));
});

function activate(link) {
  if (fields.inert || document.querySelector('main').inert) return;
  if (active && active !== link) active.classList.remove('is-active');
  active = link;
  link.classList.add('is-active');
}
function deactivate(link) {
  link.classList.remove('is-active');
  if (active === link) active = null;
}
for (const link of links) {
  link.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') activate(link);
  });
  link.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch' && !link.matches(':focus-visible')) deactivate(link);
  });
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) activate(link);
  });
  link.addEventListener('blur', () => {
    if (!link.matches(':hover')) deactivate(link);
  });
}
export function resetFieldPreviews() {
  if (active) deactivate(active);
}
export function revealFields() { fields.classList.add('is-revealed'); }
fields.addEventListener('keydown', event => {
  if (event.key === 'Escape') resetFieldPreviews();
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#fields a')) resetFieldPreviews();
}, { passive: true });
reduced.addEventListener('change', () => { if (reduced.matches) revealFields(); });
