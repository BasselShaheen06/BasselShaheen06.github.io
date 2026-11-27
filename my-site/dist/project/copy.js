import { bindTranslations, getLanguage, onLanguageChange, setLanguage } from './language.js';

const languageButtons = [...document.querySelectorAll('[data-language-button]')];
function syncLanguageButtons(language = getLanguage()) {
  for (const button of languageButtons) button.setAttribute('aria-pressed', String(button.dataset.languageButton === language));
}
for (const button of languageButtons) button.addEventListener('click', () => setLanguage(button.dataset.languageButton));
onLanguageChange(syncLanguageButtons);
syncLanguageButtons();

bindTranslations([
  { selector: 'meta[name="description"]', attribute: 'content', en: 'Selected projects and case studies by Bassel.', ar: 'مشاريع ودراسات حالة مختارة لباسل.' },
  { selector: '.project-skip', en: 'Skip to project index', ar: 'تخطَّ إلى فهرس المشاريع' },
  { selector: '.project-navigation', attribute: 'aria-label', en: 'Project navigation', ar: 'تنقل المشاريع' },
  { selector: '.project-language', attribute: 'aria-label', en: 'Language', ar: 'اللغة' },
  { selector: '.project-tab-about span', en: 'About', ar: 'حول' },
  { selector: '.project-tab-index span', en: 'Project', ar: 'المشروع' },
  { selector: '#project-overview', attribute: 'aria-label', en: 'All work', ar: 'كل الأعمال' },
  { selector: '#project-canvas', attribute: 'aria-label', en: 'Project carousel. Use the project index or arrow buttons to select a work.', ar: 'عرض المشاريع. استخدم الفهرس أو الأسهم لاختيار مشروع.' },
  { selector: '#project-menu-toggle', attribute: 'aria-label', en: 'Choose a project', ar: 'اختر مشروعًا' },
  { selector: '#project-menu-dismiss', attribute: 'aria-label', en: 'Close project navigation', ar: 'أغلق تنقل المشاريع' },
  { selector: '#project-list', attribute: 'aria-label', en: 'All projects', ar: 'كل المشاريع' },
  { selector: '#project-list > p', en: 'Loading projects…', ar: 'جارٍ تحميل المشاريع…' },
  { selector: '[data-step="-1"]', attribute: 'aria-label', en: 'Previous project', ar: 'المشروع السابق' },
  { selector: '[data-step="1"]', attribute: 'aria-label', en: 'Next project', ar: 'المشروع التالي' },
  { selector: '#project-about', attribute: 'aria-label', en: 'About the selected project', ar: 'حول المشروع المحدد' },
]);
