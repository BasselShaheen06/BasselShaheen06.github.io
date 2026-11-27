import { bindTranslations, onLanguageChange, text } from '../assets/language.js';
bindTranslations([
  {selector: 'title', en: 'Bassel — Portfolio', ar: 'باسل — أعمال'},
  {selector: '.journey-skip', en: 'Skip to selected work', ar: 'تخطَّ إلى الأعمال المختارة'},
  {selector: '.site-nav', attribute: 'aria-label', en: 'Portfolio sections', ar: 'أقسام الموقع'},
  {selector: '.site-nav [data-bearing="origin"]', attribute: 'aria-label', en: 'Origin — home', ar: 'البداية — الرئيسية'},
  {selector: '.site-nav [data-bearing="work"]', attribute: 'aria-label', en: 'Work — selected work', ar: 'الأعمال — أعمال مختارة'},
  {selector: '.site-nav [data-bearing="journey"]', attribute: 'aria-label', en: 'Journey — about Bassel', ar: 'الرحلة — عن باسل'},
  {selector: '.site-nav [data-bearing="contact"]', attribute: 'aria-label', en: 'Contact — get in touch', ar: 'التواصل — تواصل معي'},
  {selector: '.site-nav [data-bearing="origin"] .site-nav__label', en: 'Origin', ar: 'البداية'},
  {selector: '.site-nav [data-bearing="work"] .site-nav__label', en: 'Work', ar: 'الأعمال'},
  {selector: '.site-nav [data-bearing="journey"] .site-nav__label', en: 'Journey', ar: 'الرحلة'},
  {selector: '.site-nav [data-bearing="contact"] .site-nav__label', en: 'Contact', ar: 'التواصل'},
  {selector: '.homepage', attribute: 'aria-label', en: 'Bassel portfolio', ar: 'أعمال باسل'},
  {selector: '.languages', attribute: 'aria-label', en: 'Language', ar: 'اللغة'},
  {selector: '#device-story', attribute: 'aria-label', en: 'Journey to About', ar: 'من العمل إلى السيرة'},
  {selector: '#home-loader', attribute: 'aria-label', en: 'Loading homepage', ar: 'جارٍ تحميل الصفحة'},
  {selector: '.loader-error p', en: 'Unable to finish loading. Please try again.', ar: 'تعذّر إكمال التحميل. حاول مرة أخرى.'},
  {selector: '.loader-error button', en: 'Retry', ar: 'إعادة المحاولة'},
  {selector: 'meta[name="description"]', attribute: 'content', en: 'The portfolio of Bassel: selected work, experiments and notes at the meeting point of engineering and design.', ar: 'أعمال باسل المختارة وتجاربه وملاحظاته عند نقطة التقاء الهندسة والتصميم.'},
  {selector: '.iris-hud-label', en: 'JOURNEY', ar: 'الرحلة'},
  {selector: '.iris-kicker', en: 'BEARING', ar: 'الاتجاه'},
  {selector: '.iris-title', en: 'Journey', ar: 'الرحلة'},
  {selector: '.iris-caption', en: 'A short record of where I have been, what I am learning, and where I am going next.', ar: 'سجل قصير عن أين كنت، وماذا أتعلم، وإلى أين أتجه بعد ذلك.'},
]);

// Preserve the current loading/error state when the language changes.
onLanguageChange(() => {
  const status = document.querySelector('#status');
  const messages = [
    ['Loading…', 'جارٍ التحميل…'],
    ['The graphics context was interrupted. Please refresh the page.', 'انقطع سياق الرسوميات. يرجى تحديث الصفحة.'],
    ['The compass could not be loaded. Please refresh to try again.', 'تعذّر تحميل البوصلة. يرجى التحديث للمحاولة مرة أخرى.'],
    ['The point cloud could not be loaded. Please refresh to try again.', 'تعذّر تحميل سحابة النقاط. حدّث الصفحة للمحاولة مرة أخرى.'],
  ];
  const message = messages.find(pair => pair.includes(status?.textContent));
  if (message) status.textContent = text(...message);
});
