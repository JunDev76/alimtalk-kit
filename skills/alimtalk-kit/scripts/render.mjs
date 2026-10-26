#!/usr/bin/env node
// 알림톡 이미지형(800x400) 렌더러. 사용법: node render.mjs --help
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { loadImage } from '@napi-rs/canvas';
import { drawLines, fontStr, newCanvas, saveImage, textWidth } from './lib/draw.mjs';
import { prepareArt, fitContain } from './lib/art.mjs';
import { drawIcon, listIcons, resolveIcon } from './lib/icons.mjs';
import { validateImage } from './lib/validate.mjs';
import { DEFAULT_ACCENT, ICON_TYPE, LOGO, STEPS, TEXT_COLOR, TEXT_MIXED } from './lib/spec.mjs';

const HELP = `알림톡 이미지형 렌더러 (800x400, 배경 #F9F9F9, Spoqa Han Sans Bold 54px #333333)

  node render.mjs --type icon  --icon 배송완료 --text "배송완료" --out out.png
  node render.mjs --type text  --text "주문이 완료|되었습니다" [--icon 주문완료 | --art art.png [--bleed]] --out out.png
  node render.mjs --type logo  --logo logo.png [--tall] --out out.png
  node render.mjs --type steps --lines "상품이 발송되어|**택배사로 이동**합니다." --active 0 --out out.png

공통
  --out FILE        출력 경로(PNG, 500KB 초과 시 자동 압축/JPG 전환)
  --accent COLOR    아이콘 포인트 색(기본 ${DEFAULT_ACCENT}). none이면 외곽선만
  --art-scale 0.5~1   일러스트/오브젝트 크기 배율(--art, 기본 1 = 우하단 최대 영역에 맞춤). 최소 영역 230px 아래로는 줄지 않음
  --icon-scale 0.75~1.1  아이콘 글리프 크기 배율(공식 아이콘 102~144px 범위)
  --style fill|outline      아이콘 스타일(기본: 아이콘별 기본값). outline = 외곽선 + 뱃지
  --badge check|alert|none  우하단 노란 뱃지(공식 배송완료·주문체결 스타일)
  --list-icons      사용 가능한 아이콘 이름 출력

텍스트는 '|' 또는 '\\n'으로 줄을 나눕니다.
steps: --steps "발송준비,배송시작,배송중,배송완료" --icons "배송준비,배송시작,배송중,배송완료" --active 0~3`;

const { values: a } = parseArgs({
  options: {
    type: { type: 'string' }, out: { type: 'string' }, text: { type: 'string' }, icon: { type: 'string' },
    art: { type: 'string' }, logo: { type: 'string' }, bleed: { type: 'boolean' }, tall: { type: 'boolean' },
    accent: { type: 'string', default: DEFAULT_ACCENT }, lines: { type: 'string' }, steps: { type: 'string' },
    icons: { type: 'string' }, active: { type: 'string', default: '0' }, 'list-icons': { type: 'boolean' },
    style: { type: 'string' }, badge: { type: 'string' }, 'art-scale': { type: 'string' }, 'icon-scale': { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

const fail = (msg) => { console.error(`오류: ${msg}`); process.exit(2); };
const splitLines = (s) => s.replace(/\\\|/g, '|').replace(/\\n/g, '|').split('|').map((l) => l.trim()).filter(Boolean);
const chars = (s) => [...s].length;
const warnings = [];
const num = (v, name, lo, hi) => {
  if (v == null) return 1;
  const n = Number(v);
  if (!(n >= lo && n <= hi)) { console.error(`오류: --${name} 은 ${lo}~${hi} 사이여야 합니다.`); process.exit(2); }
  return n;
};
const iconOpts = { ...(a.style && { style: a.style }), ...(a.badge && { badge: a.badge }), scale: num(a['icon-scale'], 'icon-scale', 0.75, 1.1) };
const intersects = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;

if (a.help || (!a.type && !a['list-icons'])) { console.log(HELP); process.exit(0); }
if (a['list-icons']) {
  const { bundled, official } = listIcons();
  console.log('번들 아이콘(Lucide 기반):\n  ' + bundled.join(', '));
  console.log('\n공식 아이콘(import-icons.mjs 실행 후):\n  ' + (official.join(', ') || '(없음)'));
  process.exit(0);
}
if (!a.out) fail('--out 이 필요합니다.');

const { canvas, ctx } = newCanvas();

async function renderIconType() {
  if (!a.icon) fail('--icon 이 필요합니다.');
  if (!a.text) fail('--text 가 필요합니다.');
  if (/[|\\]/.test(a.text)) fail('아이콘형 텍스트는 1줄이어야 합니다.');
  const n = chars(a.text);
  if (n < ICON_TYPE.minChars || n > ICON_TYPE.maxChars) fail(`아이콘형 텍스트는 ${ICON_TYPE.minChars}~${ICON_TYPE.maxChars}자(띄어쓰기 포함)여야 합니다. 현재 ${n}자.`);
  if (n < ICON_TYPE.recommendedMinChars) warnings.push(`아이콘형 텍스트는 ${ICON_TYPE.recommendedMinChars}자 이상을 권장합니다.`);
  await drawIcon(ctx, resolveIcon(a.icon), ICON_TYPE.icon, { accent: a.accent, ...iconOpts });
  const t = ICON_TYPE.text;
  const r = drawLines(ctx, [a.text], { x: t.x, y: t.y, w: t.w, lh: t.h, align: 'center', color: TEXT_COLOR });
  warnings.push(...r.warnings);
}

async function renderTextMixed() {
  if (!a.text) fail('--text 가 필요합니다.');
  if (a.icon && a.art) fail('--icon 과 --art 는 함께 쓸 수 없습니다.');
  const lines = splitLines(a.text);
  const total = lines.reduce((s, l) => s + chars(l), 0);
  const T = TEXT_MIXED;
  if (total < T.minChars) fail(`텍스트는 최소 ${T.minChars}자여야 합니다. 현재 ${total}자.`);
  if (lines.length > T.hardMaxLines || total > T.hardMaxChars) fail(`텍스트는 최대 ${T.hardMaxLines}줄/${T.hardMaxChars}자입니다. 현재 ${lines.length}줄/${total}자.`);
  if (lines.length > T.recommendedLines || total > T.recommendedChars) warnings.push(`권장은 최대 ${T.recommendedLines}줄/${T.recommendedChars}자입니다(현재 ${lines.length}줄/${total}자). 가능하면 줄이세요.`);

  let artRect = null;
  if (a.icon) {
    const ic = T.icon;
    artRect = { x: 800 - ic.right - ic.w, y: 400 - ic.bottom - ic.h, w: ic.w, h: ic.h };
    await drawIcon(ctx, resolveIcon(a.icon), artRect, { accent: a.accent, ...iconOpts });
  } else if (a.art) {
    if (!fs.existsSync(a.art)) fail(`--art 파일이 없습니다: ${a.art}`);
    const prepared = await prepareArt(fs.readFileSync(a.art));
    const m = T.art;
    const maxBox = a.bleed
      ? { x: 800 - m.max.w, y: 400 - m.max.h, w: m.max.w, h: m.max.h }
      : { x: 800 - m.right - (m.max.w - m.right), y: 400 - m.bottom - (m.max.h - m.bottom), w: m.max.w - m.right, h: m.max.h - m.bottom };
    let fit = fitContain(prepared.width, prepared.height, maxBox);
    const k = num(a['art-scale'], 'art-scale', 0.5, 1);
    if (k < 1) {
      const floor = m.min.w / Math.max(fit.w, fit.h); // 긴 변이 최소 230px 아래로 내려가지 않게
      const kk = Math.max(k, Math.min(1, floor));
      if (kk > k) warnings.push(`소재 긴 변이 최소 ${m.min.w}px 아래로 내려가지 않도록 배율을 ${kk.toFixed(2)}로 제한했습니다.`);
      fit = { w: Math.round(fit.w * kk), h: Math.round(fit.h * kk) };
    }
    if (Math.max(fit.w, fit.h) < m.min.w) warnings.push(`소재가 최소 영역(${m.min.w}x${m.min.h})보다 작습니다.`);
    artRect = { x: maxBox.x + maxBox.w - fit.w, y: maxBox.y + maxBox.h - fit.h, w: fit.w, h: fit.h };
    const img = await loadImage(prepared.buf);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, artRect.x, artRect.y, artRect.w, artRect.h);
    if (prepared.mode === 'flood') warnings.push('소재 배경을 자동 제거했습니다. 가장자리를 눈으로 확인하세요.');
  }
  const t = T.text;
  const r = drawLines(ctx, lines, { x: t.x, y: t.y, w: t.w, lh: T.lineHeight, align: 'left', color: TEXT_COLOR });
  warnings.push(...r.warnings);
  if (artRect && r.boxes.some((b) => intersects(b, artRect))) warnings.push('텍스트가 아이콘/일러스트 영역과 겹칩니다. 줄바꿈이나 소재 크기를 조정하세요.');
}

async function renderLogo() {
  if (!a.logo || !fs.existsSync(a.logo)) fail('--logo 파일이 없습니다.');
  const prepared = await prepareArt(fs.readFileSync(a.logo));
  const area = a.tall
    ? { x: LOGO.area.x, y: LOGO.area.y - LOGO.extra, w: LOGO.area.w, h: LOGO.area.h + LOGO.extra * 2 }
    : LOGO.area;
  const fit = fitContain(prepared.width, prepared.height, area);
  if (fit.w >= fit.h * 1 && fit.h < LOGO.minHeightWide && fit.w >= area.w) warnings.push(`로고 높이 ${fit.h}px가 최소 ${LOGO.minHeightWide}px보다 작습니다. 너무 가로로 긴 로고입니다.`);
  if (fit.w < LOGO.minWidthShort && fit.h >= area.h) warnings.push(`로고 폭 ${fit.w}px가 최소 ${LOGO.minWidthShort}px보다 작습니다.`);
  if (fit.h < area.h && fit.w < LOGO.minWidthShort) warnings.push(`로고 폭 ${fit.w}px가 최소 ${LOGO.minWidthShort}px보다 작습니다.`);
  const img = await loadImage(prepared.buf);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, area.x + (area.w - fit.w) / 2, area.y + (area.h - fit.h) / 2, fit.w, fit.h);
  if (prepared.mode === 'flood') warnings.push('로고 배경을 자동 제거했습니다. 가장자리를 눈으로 확인하세요.');
}

function boldRuns(line) {
  return line.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) => (s.startsWith('**') ? { t: s.slice(2, -2), b: true } : { t: s, b: false }));
}

async function renderSteps() {
  warnings.push('steps 유형은 공식 PDF 템플릿에서 측정한 근사 좌표입니다(공식 제작가이드 본문에 수치 없음). 검수 전 눈으로 확인하세요.');
  const labels = (a.steps || '발송준비,배송시작,배송중,배송완료').split(',').map((s) => s.trim());
  const icons = (a.icons || '배송준비,배송시작,배송중,배송완료').split(',').map((s) => s.trim());
  if (labels.length !== 4 || icons.length !== 4) fail('steps/icons는 4개씩 필요합니다.');
  const active = Number(a.active);
  if (!(active >= 0 && active < 4)) fail('--active 는 0~3 이어야 합니다.');
  if (!a.lines) fail('--lines 가 필요합니다(2줄, 굵게는 **...**).');
  const lines = splitLines(a.lines);
  if (lines.length !== 2) fail('--lines 는 2줄이어야 합니다.');
  const C = STEPS.colors;

  // 안내문 (가운데 정렬, 굵은 구간만 Bold)
  lines.forEach((line, i) => {
    const runs = boldRuns(line);
    const size = STEPS.headline.size;
    const widths = runs.map((r) => { ctx.font = fontStr(r.b ? 700 : 400, size); return ctx.measureText(r.t).width; });
    let x = (800 - widths.reduce((s, w) => s + w, 0)) / 2;
    const cy = i === 0 ? STEPS.headline.cy1 : STEPS.headline.cy2;
    runs.forEach((r, k) => {
      ctx.font = fontStr(r.b ? 700 : 400, size);
      ctx.fillStyle = C.activeText;
      ctx.textAlign = 'left';
      const m = ctx.measureText('가');
      ctx.fillText(r.t, x, cy + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2);
      x += widths[k];
    });
  });

  // 연결 점선
  ctx.strokeStyle = C.dash; ctx.lineWidth = 3; ctx.setLineDash([16, 12]);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(STEPS.centers[i] + STEPS.circleR + 14, STEPS.iconBox.cy);
    ctx.lineTo(STEPS.centers[i + 1] - STEPS.circleR - 14, STEPS.iconBox.cy);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (let i = 0; i < 4; i++) {
    const on = i === active;
    const cx = STEPS.centers[i], cy = STEPS.iconBox.cy;
    ctx.fillStyle = on ? C.active : C.inactive;
    ctx.beginPath(); ctx.arc(cx, cy, STEPS.circleR, 0, Math.PI * 2); ctx.fill();
    const box = { x: cx - 90, y: cy - 90, w: 180, h: 180 };
    await drawIcon(ctx, resolveIcon(icons[i]), box, { accent: on ? DEFAULT_ACCENT : '#DADADA', style: 'outline', stroke: on ? '#111111' : '#B5B5B5', scale: 0.64, strokeWidth: 1.5, bg: on ? C.active : C.inactive });
    ctx.font = fontStr(400, STEPS.label.size);
    ctx.fillStyle = on ? C.activeText : C.inactiveText;
    ctx.textAlign = 'center';
    const m = ctx.measureText('가');
    ctx.fillText(labels[i], cx, STEPS.label.cy + (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2);
  }
}

const types = { icon: renderIconType, text: renderTextMixed, logo: renderLogo, steps: renderSteps };
if (!types[a.type]) fail(`--type 은 ${Object.keys(types).join('|')} 중 하나여야 합니다.`);
await types[a.type]();

const saved = await saveImage(canvas, a.out);
const check = await validateImage(saved.path);
const result = { ...saved, type: a.type, validation: { ok: check.ok, errors: check.errors, warnings: [...warnings, ...check.warnings] } };
console.log(JSON.stringify(result, null, 2));
process.exit(check.ok ? 0 : 1);
