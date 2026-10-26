#!/usr/bin/env node
// 알림톡 이미지형 업로드 전 검사: 크기/비율, 형식, 500KB, 불투명, 배경 #F9F9F9
import { validateImage } from './lib/validate.mjs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (!files.length || process.argv.includes('--help')) {
  console.log('node validate-image.mjs <이미지...>');
  process.exit(files.length ? 0 : 2);
}
let bad = 0;
const out = [];
for (const f of files) {
  const r = await validateImage(f);
  if (!r.ok) bad++;
  out.push({ file: f, ...r });
}
console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
process.exit(bad ? 1 : 0);
