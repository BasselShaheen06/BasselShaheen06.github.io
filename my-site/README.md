# Bassel — Portfolio

A static, bilingual portfolio built around a slowly rotating brass compass. The
homepage moves from the instrument to selected work, a compass-dial iris, and a
profile chapter. English and Arabic share the same layout; Arabic switches to RTL
and Alexandria typography without breaking letter joining.

## Requirements

- Node.js 22 or newer
- No package installation, database, account, or API key

## Commands

```sh
npm run dev        # build the public edition and serve http://127.0.0.1:4321/webdemo/
npm run check      # validate the file set, runtime graph, catalog, and assets
npm test           # navigation, export, security, and SEO tests
npm run build      # check, then write the deployable public edition to output/
npm run release:ready
```

`npm run dev` rebuilds on start. Use `DEMO_BASE=/` or
`node scripts/build-demo.mjs --base=/ --site-url=https://example.com/` when the
site will be hosted at a domain root.

## Structure

- `dist/` — the authored static site and its runtime modules
- `dist/home/` — compass point cloud, greeting, intro, and zoom
- `dist/fields/` — selected-work chapter
- `dist/transition/` — scroll-driven compass iris
- `dist/profile/` — journey, contact, and Cairo clock
- `dist/project/` — all-work gallery and case-study detail
- `dist/content/projects.json` — bilingual project catalog
- `dist/media/` — project covers
- `scripts/` — static checks, tests, build, and preview server
- `output/` — generated deployment copy (not authored content)

## Editing content

Project records live in `dist/content/projects.json`. Each record needs English
and Arabic copy, a cover under `/media/`, dimensions, and resource links. The
first four records are the homepage selected work; keep `dist/index.html` in
sync with those IDs and covers. The release check reports mismatches.

Appearance choices are `nocturne`, `daylight`, `parchment`, `instrument`, and
`system`. The choice is stored under `bassel-portfolio-theme`; language is stored
under `bassel-portfolio-language`. Early theme resolution is in
`dist/assets/boot.js`, so the first paint matches the saved choice.

## Current placeholders

The site is ready to preview, but the following still need real content:

- Contact email (`hello@example.com`)
- Canonical domain (`https://example.com/` in page metadata, `robots.txt`,
  `sitemap.xml`, and the build default)
- Six project names, summaries, facts, resources, and covers
- Personal role, location, education, experience, skills, and social links

Search for `example.com`, `hello@example.com`, and the placeholder project names
when replacing them.

## Accessibility and motion

The point cloud has a text alternative and a reduced-motion mode. Arabic
per-character effects are replaced with word-level or fade-based motion so
letters remain joined. The language and appearance controls are keyboard
operable and remember their choices locally.

## License

The original template code is MIT; see `LICENSE`. Portfolio artwork, project
covers, personal copy, and the compass point cloud are © 2026 Bassel. Third-party
notices are in `THIRD_PARTY_NOTICES.md`.
 