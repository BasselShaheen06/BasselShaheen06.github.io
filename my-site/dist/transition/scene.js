// A compass-dial iris between Selected work and Journey.
// The physical dial keeps its Latin cardinal points; the HUD and the
// destination copy are localized through /home/copy.js.
export async function createScreenTransition({ story, fields, profile, integrated = false }) {
  const root = document.documentElement;
  const stage = story.querySelector('.story-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const range = (value, start, end) => clamp((value - start) / (end - start));
  const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
  let top = 0, distance = 1, target = 0, current = -1, raf = 0, disposed = false, cleaned = false;

  function fallback() {
    if (cleaned) return;
    cleaned = true;
    disposed = true;
    cancelAnimationFrame(raf);
    root.classList.remove('is-iris');
    root.removeAttribute('data-iris-interlude');
    root.removeAttribute('data-iris-terminal');
    profile.classList.remove('transition-profile');
    profile.removeAttribute('data-active');
    profile.inert = false;
    story.hidden = true;
    dispatchEvent(new Event('journey:layout'));
  }

  if (reduced.matches) {
    disposed = true;
    return { destroy() {} };
  }

  story.hidden = false;
  root.classList.add('is-iris');
  profile.classList.add('transition-profile');

  function render() {
    raf = 0;
    if (disposed) return;
    current = target;
    const p = current;
    const close = smooth(range(p, 0, .46));
    const open = smooth(range(p, .5, .94));
    const dialOpacity = smooth(range(p, .04, .24)) * (1 - smooth(range(p, .9, 1)));
    story.style.setProperty('--iris-p', p.toFixed(4));
    story.style.setProperty('--iris-close', close.toFixed(4));
    story.style.setProperty('--iris-open', open.toFixed(4));
    story.style.setProperty('--iris-turn', `${(p * 132).toFixed(2)}deg`);
    story.style.setProperty('--iris-dial-scale', (0.72 + close * 0.82 + open * 0.28).toFixed(3));
    story.style.setProperty('--iris-dial-opacity', dialOpacity.toFixed(4));
    story.style.setProperty('--iris-hud-opacity', (smooth(range(p, .04, .2)) * (1 - smooth(range(p, .58, .74)))).toFixed(4));
    story.style.setProperty('--iris-destination-opacity', smooth(range(p, .34, .62)).toFixed(4));
    story.style.setProperty('--iris-destination-scale', (0.94 + open * 0.06).toFixed(3));
    story.dataset.progress = p.toFixed(4);
    root.toggleAttribute('data-iris-interlude', p > .001 && p < 1);
    root.toggleAttribute('data-iris-terminal', p === 1);
    story.toggleAttribute('data-start', p === 0);
    profile.toggleAttribute('data-active', p === 1);
    profile.inert = p < 1;
    if (integrated) fields.inert = p > .001;
  }

  function onScroll() {
    target = clamp((scrollY - top) / distance);
    if (target === current) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  function measure() {
    const bounds = story.getBoundingClientRect();
    // The stage starts exactly at the completed work viewport. The profile
    // begins one stage-height before the story ends, so the whole travel
    // between those two anchors belongs to the iris.
    top = bounds.top + scrollY;
    distance = Math.max(1, bounds.height - stage.offsetHeight);
    target = clamp((scrollY - top) / distance);
    current = -1;
    render();
  }

  const observer = new ResizeObserver(measure);
  observer.observe(stage);
  addEventListener('journey:scroll', onScroll);
  addEventListener('resize', measure, { passive: true });
  addEventListener('journey:layout', measure);
  const preference = () => { if (reduced.matches) fallback(); };
  reduced.addEventListener('change', preference);

  measure();
  dispatchEvent(new Event('journey:layout'));

  return {
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      removeEventListener('journey:scroll', onScroll);
      removeEventListener('resize', measure);
      removeEventListener('journey:layout', measure);
      reduced.removeEventListener('change', preference);
      fallback();
    },
    refresh: measure,
  };
}
