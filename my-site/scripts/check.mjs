import { projectIds } from '../dist/assets/site.js';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, dirname, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname,'..');
const dist = resolve(root,'dist');
const files=[];
async function walk(dir) {
 for (const item of await readdir(dir,{withFileTypes:true})) {
  const path=resolve(dir,item.name);
  if (item.isDirectory() && ['.git','node_modules','output'].includes(item.name)) continue;
  if ((await lstat(path)).isSymbolicLink()) throw Error('Symlinks are not allowed');
  if (item.isDirectory()) {
   await walk(path);
  } else files.push(path);
 }
}
await walk(root);
const sources=new Map();
const allowed=new Set(['.html','.css','.js','.mjs','.json','.svg','.png','.webp','.woff2','.bin','.md','.txt','.py','.yml','.toml','.xml']);
for (const path of files) {
 const name=relative(root,path);
 if (['.gitignore','LICENSE'].includes(name)) continue;
 if (!allowed.has(extname(path))) throw Error('Unexpected file type: '+name);
 const data=await readFile(path);
 if (extname(path)==='.webp') {
  for(let offset=12;offset+8<=data.length;) {
   const type=data.toString('ascii',offset,offset+4), size=data.readUInt32LE(offset+4);
   if (['EXIF','XMP ','ICCP'].includes(type)) throw Error('Image metadata: '+name);
   offset+=8+size+(size%2);
  }
 }
 if (extname(path)==='.png') {
  for(let offset=8;offset+12<=data.length;) {
   const size=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);
   if(['eXIf','tEXt','zTXt','iTXt','tIME'].includes(type))throw Error('PNG metadata: '+name);
   offset+=size+12;
  }
 }
 if (['.html','.js','.mjs','.css','.json','.svg','.md','.txt','.py','.yml','.toml'].includes(extname(path))) {
  const source=data.toString();
  if (/\/Users\/|[A-Z]:\\Users\\|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{30,}/.test(source)) throw Error('Potential private data: '+name);
  if (path.startsWith(dist)) sources.set(path,source);
 }
 if (['.js','.mjs'].includes(extname(path))) execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
}
const live=new Set();
function visit(path) {
 if(live.has(path))return;
 const source=sources.get(path);
 if(source===undefined)throw Error('Missing runtime file: '+relative(dist,path));
 live.add(path);
 for(const [,ref] of source.matchAll(/["']((?:\/|\.\.?\/)[^"'\s]+\.(?:js|css))(?:\?[^"']*)?["']/g)) {
  visit(ref.startsWith('/')?resolve(dist,'.'+ref):resolve(dirname(path),ref));
 }
}
for(const path of sources.keys())if(extname(path)==='.html')visit(path);
const unused=[...sources.keys()].filter(path=>['.js','.css'].includes(extname(path))&&!live.has(path));
if(unused.length)throw Error('Unused runtime files: '+unused.map(p=>relative(dist,p)).join(', '));
const rows=JSON.parse(await readFile(resolve(dist,'content/projects.json'),'utf8'));
if(rows.length!==projectIds.length)throw Error('Unexpected project count');
const keys=['id','group','cover','width','height','monochrome','carouselFit','en','ar'].sort().join(',');
const copyKeys=['title','category','year','summary','description','facts','resources'].sort().join(',');
for(const [index,row] of rows.entries()){
 if(Object.keys(row).sort().join(',')!==keys||row.id!==projectIds[index])throw Error('Unexpected catalog fields');
 if(!/^\/media\/bassel-0[1-6]\.svg$/.test(row.cover)||!['code','design','practice'].includes(row.group))throw Error('Invalid cover');
 for(const language of ['en','ar']) {
  if(!row[language]||Object.keys(row[language]).sort().join(',')!==copyKeys)throw Error('Unexpected localized copy fields');
  if(!Array.isArray(row[language].facts)||!Array.isArray(row[language].resources))throw Error('Invalid localized catalog records');
 }
 await readFile(resolve(dist,'.'+row.cover));
}
const home=await readFile(resolve(dist,'index.html'),'utf8');
for(const id of ['fields','profile'])if([...home.matchAll(new RegExp('id="'+id+'"','g'))].length!==1)throw Error('Duplicate chapter');
if(!home.includes("I'm Bassel"))throw Error('Unexpected greeting');
for(const shell of ['project/index.html','project/about/index.html']) {
 const source=await readFile(resolve(dist,shell),'utf8');
 if(!source.includes('id="project-count">01 / '+String(rows.length).padStart(2,'0')+'<')||!source.includes('id="project-name">Meridian<'))throw Error('Stale project loading shell: '+shell);
}
if(!files.some(path=>relative(root,path).replaceAll('\\','/').endsWith('LICENSES/Three-MIT.txt')))throw Error('Missing notices');
if(!files.some(path=>relative(root,path).replaceAll('\\','/').endsWith('LICENSES/Alexandria-OFL.txt')))throw Error('Missing font notice');
console.log('Passed: '+files.length+' files; '+live.size+' runtime modules; '+rows.length+' strict bilingual cover records; JS syntax and image metadata checks.');
