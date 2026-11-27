import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
export async function releaseReadiness() {
 const rows=JSON.parse(await readFile(resolve(root,'dist/content/projects.json'),'utf8'));
 const home=await readFile(resolve(root,'dist/index.html'),'utf8');
 const missing=[];
 if(!Array.isArray(rows)||rows.length!==6)missing.push('Catalog: keep exactly six bilingual project records.');
 const selected=[...home.matchAll(/class="field" data-work="([^"]+)"/g)].map(match=>match[1]);
 const expected=rows.slice(0,4).map(row=>row.id);
 if(selected.join(',')!==expected.join(','))missing.push('Selected work: keep the first four catalog projects in order.');
 for(const row of rows) {
  if(!row.en?.title?.trim()||!row.ar?.title?.trim())missing.push(row.id+': add both English and Arabic titles.');
  if(!row.en?.summary?.trim()||!row.ar?.summary?.trim())missing.push(row.id+': add both English and Arabic summaries.');
  try {await readFile(resolve(root,'dist','.'+row.cover));}
  catch {missing.push(row.id+': cover file is missing.');}
 }
 for(const row of rows.slice(0,4)) {
  if(!home.includes('src="'+row.cover+'"'))missing.push(row.id+': synchronize the selected-work cover.');
 }
 for(const shell of ['project/index.html','project/about/index.html']) {
  const source=await readFile(resolve(root,'dist',shell),'utf8');
  if(!source.includes('id="project-count">01 / '+String(rows.length).padStart(2,'0')+'<'))missing.push(shell+': synchronize the project count.');
  if(!source.includes('id="project-name">'+rows[0].en.title+'<'))missing.push(shell+': synchronize the first project name.');
 }
 return {ready:missing.length===0,missing};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
 const result=await releaseReadiness();
 console.log(result.ready?'Ready for the final source and hosting review.':'Preview ready; complete the remaining content:');
 for(const item of result.missing)console.log('- '+item);
 process.exitCode=result.ready?0:2;
}
