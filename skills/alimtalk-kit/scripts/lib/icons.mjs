import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadImage } from '@napi-rs/canvas';
import { SKILL_DIR } from './draw.mjs';
import { DEFAULT_ACCENT, ICON_STROKE } from './spec.mjs';

export const BUNDLED_DIR = path.join(SKILL_DIR, 'assets/icons');
export const CACHE_DIR = process.env.ALIMTALK_KIT_CACHE || path.join(os.homedir(), '.cache/alimtalk-kit');
export const OFFICIAL_ICON_DIR = path.join(CACHE_DIR, 'official-icons');
export const OFFICIAL_DIR = path.join(CACHE_DIR, 'official');

// 아이콘 글리프 크기(180 박스 안). 공식 샘플 아이콘이 약 115~140px.
const GLYPH = 132;
const STROKE_W = 1.1; // lucide 24 단위 기준 → 132px에서 약 6px (공식 아이콘 선 굵기 5~6px)

export function listIcons() {
  const bundled = Object.keys(JSON.parse(fs.readFileSync(path.join(BUNDLED_DIR, 'index.json'), 'utf8')));
  const official = fs.existsSync(OFFICIAL_ICON_DIR)
    ? fs.readdirSync(OFFICIAL_ICON_DIR).filter((f) => f.endsWith('.png')).map((f) => `official:${f.replace(/\.png$/, '')}`)
    : [];
  return { bundled, official };
}

/** 이름 → 아이콘 소스. 파일 경로 | official:<이름> | 번들 한글 이름 | lucide id */
export function resolveIcon(name) {
  name = name.normalize('NFC');
  if (fs.existsSync(name)) return { kind: path.extname(name).toLowerCase() === '.svg' ? 'svg' : 'png', file: name };
  if (name.startsWith('official:')) {
    const f = path.join(OFFICIAL_ICON_DIR, `${name.slice(9)}.png`);
    if (!fs.existsSync(f)) {
      throw new Error(`공식 아이콘 "${name}"이 없습니다. 먼저 scripts/fetch-official-assets.mjs, scripts/import-icons.mjs를 실행하세요.`);
    }
    const metaFile = f.replace(/\.png$/, '.json');
    const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : { dx: null, dy: null };
    return { kind: 'png', file: f, meta };
  }
  const index = JSON.parse(fs.readFileSync(path.join(BUNDLED_DIR, 'index.json'), 'utf8'));
  let file = path.join(BUNDLED_DIR, `${name}.svg`);
  if (!index[name]) {
    const key = Object.keys(index).find((k) => index[k] === name); // lucide id로도 선택 가능
    if (!key) throw new Error(`알 수 없는 아이콘 "${name}". --list-icons로 목록을 확인하세요.`);
    file = path.join(BUNDLED_DIR, `${key}.svg`);
  }
  const defaults = JSON.parse(fs.readFileSync(path.join(BUNDLED_DIR, 'defaults.json'), 'utf8'));
  const key = path.basename(file, '.svg');
  return { kind: 'svg', file, defaults: defaults[key] ?? {} };
}

/** 포인트 색 채움용: 닫힌 도형(circle/rect/ellipse/polygon, z로 닫힌 path)만 남긴다. 열린 선은 채우면 어색하다. */
function closedShapesOnly(src) {
  return src.replace(/<(path|line|polyline|circle|rect|ellipse|polygon)\b[^>]*\/>/g, (el, tag) => {
    if (/\bdata-fill-only\b/.test(el)) return el; // 채움 전용 도형(열린 선 아이콘의 면을 만들어 줌)
    if (['circle', 'rect', 'ellipse', 'polygon'].includes(tag)) return el;
    if (tag === 'path') {
      const d = /\sd="([^"]*)"/.exec(el)?.[1] ?? '';
      return /[zZ]/.test(d) ? el : '';
    }
    return '';
  });
}

function svgWith(src, { stroke, fill, strokeWidth, size }) {
  return src
    .replace(/<[a-z]+\b[^>]*\bdata-fill-only\b[^>]*\/>/g, (el) => (fill === 'none' ? '' : el))
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/fill="none"/, `fill="${fill}"`)
    .replace(/stroke="currentColor"/, `stroke="${stroke}"`)
    .replace(/stroke-width="2"/, `stroke-width="${strokeWidth}"`);
}

/**
 * 180x180 아이콘 박스(box)에 아이콘을 그린다.
 * accent: 브랜드 포인트 색(닫힌 도형 채움). 'none'이면 외곽선만.
 */
export async function drawIcon(ctx, ref, box, { accent = DEFAULT_ACCENT, stroke = ICON_STROKE, scale = 1, strokeWidth = STROKE_W, style, badge, bg = '#F9F9F9' } = {}) {
  style = style ?? ref.defaults?.style ?? 'fill';
  badge = badge ?? ref.defaults?.badge ?? null;
  if (ref.kind === 'png') {
    const img = await loadImage(ref.file);
    const w = img.width * scale;
    const h = img.height * scale;
    const dx = ref.meta?.dx ?? (box.w - w) / 2;
    const dy = ref.meta?.dy ?? (box.h - h) / 2;
    ctx.drawImage(img, box.x + dx, box.y + dy, w, h);
    return;
  }
  const src = fs.readFileSync(ref.file, 'utf8');
  const size = Math.round(GLYPH * scale);
  const x = box.x + (box.w - size) / 2;
  const y = box.y + (box.h - size) / 2;
  if (accent && accent !== 'none' && style !== 'outline') {
    const fillImg = await loadImage(Buffer.from(svgWith(closedShapesOnly(src), { stroke: 'none', fill: accent, strokeWidth: 0, size })));
    ctx.drawImage(fillImg, x, y, size, size);
  }
  const lineImg = await loadImage(Buffer.from(svgWith(src, { stroke, fill: 'none', strokeWidth, size })));
  ctx.drawImage(lineImg, x, y, size, size);
  if (badge && badge !== 'none') drawBadge(ctx, { cx: x + size * 0.79, cy: y + size * 0.79, r: size * 0.2 }, { badge, accent: accent === 'none' ? DEFAULT_ACCENT : accent, stroke, bg });
}

/** 우하단 포인트 뱃지(노란 원 + 기호). 공식 배송완료/주문체결/적립금 아이콘의 표현 방식. */
export function drawBadge(ctx, { cx, cy, r }, { badge, accent, stroke, bg }) {
  const lw = Math.max(3.5, r * 0.2);
  ctx.save();
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r + lw * 0.9, 0, Math.PI * 2); ctx.fill(); // 아이콘 선과 분리하는 여백
  ctx.fillStyle = accent; ctx.strokeStyle = stroke; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = lw * 0.95;
  ctx.beginPath();
  if (badge === 'alert') {
    ctx.moveTo(cx, cy - r * 0.45); ctx.lineTo(cx, cy + r * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.48, lw * 0.18, 0, Math.PI * 2); ctx.fillStyle = stroke; ctx.fill(); ctx.stroke();
  } else {
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02); ctx.lineTo(cx - r * 0.1, cy + r * 0.36); ctx.lineTo(cx + r * 0.46, cy - r * 0.3); ctx.stroke();
  }
  ctx.restore();
}
