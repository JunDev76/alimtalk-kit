#!/usr/bin/env node
// 공식 PSD의 icon_* 레이어를 추출해 캐시(~/.cache/alimtalk-kit/official-icons)에 저장한다.
// 저장 위치는 사용자 PC 캐시뿐이며 레포에 포함되지 않는다. 사용: --icon official:<이름>
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createCanvas } from '@napi-rs/canvas';
import { initializeCanvas, readPsd } from 'ag-psd';
import { OFFICIAL_DIR, OFFICIAL_ICON_DIR } from './lib/icons.mjs';
import { ICON_TYPE } from './lib/spec.mjs';

const { values: a } = parseArgs({ options: { psd: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
if (a.help) { console.log('node import-icons.mjs [--psd 파일경로]   (기본: fetch-official-assets.mjs가 받은 PSD)'); process.exit(0); }

const psdPath = a.psd || path.join(OFFICIAL_DIR, 'alimtalk-image-template.psd');
if (!fs.existsSync(psdPath)) {
  console.error(`PSD가 없습니다: ${psdPath}\n먼저 node fetch-official-assets.mjs 를 실행하거나 --psd 로 경로를 지정하세요.`);
  process.exit(1);
}

initializeCanvas((w, h) => createCanvas(w, h));
const psd = readPsd(fs.readFileSync(psdPath), { skipCompositeImageData: true, skipThumbnail: true });

fs.mkdirSync(OFFICIAL_ICON_DIR, { recursive: true });
const done = [];
// 아트보드(최상위 그룹)마다: 배경(#f9f9f9) 레이어의 좌상단을 원점으로, 아이콘 레이어의 박스 대비 오프셋을 기록한다.
for (const board of psd.children || []) {
  if (!board.children) continue;
  const all = [];
  const walk = (l) => l.forEach((c) => { all.push(c); if (c.children) walk(c.children); });
  walk(board.children);
  const bg = all.find((l) => /^#f9f9f9/i.test(l.name || '') && l.left != null);
  if (!bg) continue;
  for (const layer of all) {
    if (!/^icon_/.test((layer.name || '').normalize('NFC')) || !layer.canvas) continue;
    const name = layer.name.replace(/^icon_/, '').normalize('NFC');
    const dx = layer.left - bg.left - ICON_TYPE.icon.x;
    const dy = layer.top - bg.top - ICON_TYPE.icon.y;
    fs.writeFileSync(path.join(OFFICIAL_ICON_DIR, `${name}.png`), layer.canvas.toBuffer('image/png'));
    fs.writeFileSync(path.join(OFFICIAL_ICON_DIR, `${name}.json`), JSON.stringify({ dx, dy, w: layer.canvas.width, h: layer.canvas.height }));
    done.push({ icon: `official:${name}`, size: `${layer.canvas.width}x${layer.canvas.height}`, dx, dy });
  }
}
console.log(JSON.stringify({ dir: OFFICIAL_ICON_DIR, icons: done }, null, 2));
if (!done.length) { console.error('icon_* 레이어를 찾지 못했습니다.'); process.exit(1); }
