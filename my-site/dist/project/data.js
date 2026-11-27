import { getLanguage } from './language.js';
import { siteURL } from '../assets/site.js';

export const groups = [
  { id: 'code', label: 'Systems', labelAr: 'أنظمة' },
  { id: 'design', label: 'Design', labelAr: 'تصميم' },
  { id: 'practice', label: 'Practice', labelAr: 'ممارسة' },
];

let catalog;
async function json(path) {
  const response = await fetch(siteURL(path), { cache: 'no-cache' });
  if (!response.ok) throw Error('Project catalog unavailable');
  return response.json();
}

export async function loadProjects() {
  const rows = await (catalog ??= json('content/projects.json').catch(error => {
    catalog = undefined;
    throw error;
  }));
  if (!Array.isArray(rows) || !rows.length) throw Error('Project catalog unavailable');
  return rows.map(row => {
    const copy = row[getLanguage()] || row.en;
    return {
      ...row,
      name: copy.title,
      title: copy.title,
      category: copy.category,
      year: copy.year,
      summary: copy.summary,
      description: copy.description,
      facts: copy.facts,
      resources: copy.resources,
      gallery: [row.cover],
      media: { [row.cover]: { width: row.width, height: row.height, note: copy.title } },
      overviewCover: row.cover,
      overviewMonochrome: row.monochrome,
      carouselFit: row.carouselFit || 'cover',
    };
  });
}
