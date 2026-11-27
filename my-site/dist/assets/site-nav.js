// The visible bearing rail. Chapter state comes from the journey engine; the
// hash covers direct links before the first scroll frame has rendered.
const nav = document.querySelector('[data-site-nav]');
if (nav) {
  const links = [...nav.querySelectorAll('[data-bearing]')];
  const angles = { origin: 0, work: 90, journey: 180, contact: 270 };
  let frame = 0;

  function bearing() {
    const page = document.body.dataset.page || 'home';
    if (page === 'profile') return location.hash === '#connect' ? 'contact' : 'journey';
    if (page === 'fields' || page === 'transition' || page === 'device-transition') return 'work';
    if (location.hash === '#fields') return 'work';
    if (location.hash === '#profile') return 'journey';
    if (location.hash === '#connect') return 'contact';
    return 'origin';
  }

  function update() {
    frame = 0;
    const current = bearing();
    for (const link of links) {
      if (link.dataset.bearing === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    nav.style.setProperty('--bearing-angle', `${angles[current]}deg`);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  addEventListener('journey:scroll', schedule, { passive: true });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('hashchange', schedule);
  addEventListener('pageshow', schedule);
  update();
}
