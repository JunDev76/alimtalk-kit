#!/usr/bin/env node
// 카카오 공식 이미지형 제작가이드 페이지에서 PSD/Sketch/폰트 다운로드 링크를 찾아 사용자 PC 캐시에 내려받는다.
// 카카오 에셋은 레포에 포함하지 않는다(알림톡 외 재배포·2차 가공 금지). 캐시에만 저장한다.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { OFFICIAL_DIR } from './lib/icons.mjs';

const GUIDE_PAGES = [
  'https://kakaobusiness.gitbook.io/sandbox2025/ad/bizmessage/notice-friend/content-guide/image',
  'https://kakaobusiness.gitbook.io/main/ad/infotalk/content-guide/image',
];

const { values: a } = parseArgs({ options: { force: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } });
if (a.help) {
  console.log(`공식 PSD/Sketch 내려받기 → ${OFFICIAL_DIR}\n  node fetch-official-assets.mjs [--force]\n\n안내 페이지: ${GUIDE_PAGES[0]}\n카카오 안내: 알림톡용 아이콘 이미지의 모든 권리는 카카오에 있으며 알림톡 메시지 외 사용·2차 가공을 금지합니다.`);
  process.exit(0);
}

async function findLinks() {
  for (const url of GUIDE_PAGES) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'alimtalk-kit' } });
      if (!res.ok) continue;
      const html = (await res.text()).replace(/&amp;/g, '&');
      const urls = [...new Set(html.match(/https:\/\/[^"'\\\s]*files\.gitbook\.io[^"'\\\s]*\.(?:psd|sketch)\?alt=media&token=[a-f0-9-]+/g) || [])];
      if (urls.length) return { page: url, urls };
    } catch { /* 다음 페이지 시도 */ }
  }
  return null;
}

const found = await findLinks();
if (!found) {
  console.error(`공식 페이지에서 다운로드 링크를 찾지 못했습니다. 브라우저로 직접 받아 ${OFFICIAL_DIR} 에 넣어주세요:\n  ${GUIDE_PAGES[0]}\n  (섹션: 파일제공 Font, PSD, Sketch)`);
  process.exit(1);
}

fs.mkdirSync(OFFICIAL_DIR, { recursive: true });
const saved = [];
for (const u of found.urls) {
  const ext = /\.psd\?/.test(u) ? 'psd' : 'sketch';
  const dest = path.join(OFFICIAL_DIR, `alimtalk-image-template.${ext}`);
  if (fs.existsSync(dest) && !a.force) { saved.push({ file: dest, cached: true }); continue; }
  const res = await fetch(u);
  if (!res.ok) { console.error(`다운로드 실패(${res.status}): ${ext}`); continue; }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  saved.push({ file: dest, cached: false, bytes: fs.statSync(dest).size });
}
console.log(JSON.stringify({ page: found.page, dir: OFFICIAL_DIR, saved }, null, 2));
if (!saved.length) process.exit(1);
