import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import sharp from 'sharp';
import { BG, CANVAS, FONT_FAMILY, FONT_SIZE, MAX_BYTES } from './spec.mjs';

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FONT_DIR = path.join(SKILL_DIR, 'assets/fonts');

let fontsReady = false;
/** 번들 Spoqa Han Sans를 등록한다. 실패하면 시스템 폰트로 조용히 대체되지 않도록 즉시 중단한다. */
export function loadFonts() {
  if (fontsReady) return;
  for (const [file, label] of [['SpoqaHanSansRegular.ttf', 'Regular'], ['SpoqaHanSansBold.ttf', 'Bold']]) {
    const p = path.join(FONT_DIR, file);
    if (!fs.existsSync(p)) throw new Error(`폰트 파일이 없습니다: ${p}`);
    if (!GlobalFonts.registerFromPath(p, FONT_FAMILY)) throw new Error(`폰트 등록 실패(${label}): ${p}`);
  }
  fontsReady = true;
}

export function fontStr(weight = 700, size = FONT_SIZE) {
  return `${weight} ${size}px "${FONT_FAMILY}"`;
}

export function newCanvas() {
  loadFonts();
  const canvas = createCanvas(CANVAS.w, CANVAS.h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CANVAS.w, CANVAS.h);
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

// 공식 PSD 샘플(배송완료, 카카오맵에서 등)의 실제 글자 잉크 좌표와 대조해 얻은 보정값(px).
// 폰트 박스 중심 정렬만으로는 잉크가 2.5~4px 아래로 내려간다.
const BASELINE_SHIFT = -3;

/** 라인 박스(높이 lh) 안에서 글자가 세로 가운데에 오도록 베이스라인 y를 계산한다. */
export function baselineFor(ctx, top, lh) {
  const m = ctx.measureText('가');
  const fa = m.fontBoundingBoxAscent;
  const fd = m.fontBoundingBoxDescent;
  return top + (lh - (fa + fd)) / 2 + fa + BASELINE_SHIFT;
}

export function textWidth(ctx, s) {
  return ctx.measureText(s).width;
}

/** 줄별로 그린다. 반환값: 줄별 잉크 영역(근사: 폭 = 측정 폭, 높이 = 라인 박스). */
export function drawLines(ctx, lines, { x, y, w, lh, align = 'left', color, weight = 700, size = FONT_SIZE }) {
  ctx.font = fontStr(weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  const boxes = [];
  const warnings = [];
  lines.forEach((line, i) => {
    const top = y + i * lh;
    const width = textWidth(ctx, line);
    const bx = align === 'center' ? x + w / 2 : x;
    ctx.fillText(line, bx, baselineFor(ctx, top, lh));
    const left = align === 'center' ? x + (w - width) / 2 : x;
    boxes.push({ x: left, y: top, w: width, h: lh });
    if (width > w + 0.5) warnings.push(`"${line}" 폭 ${Math.round(width)}px가 영역 ${w}px를 넘습니다`);
  });
  return { boxes, warnings };
}

/** 이미지를 800x400 캔버스에 PNG(≤500KB)로 저장한다. */
export async function saveImage(canvas, outPath) {
  const raw = canvas.toBuffer('image/png');
  const flat = () => sharp(raw).flatten({ background: BG });
  let buf = await flat().png({ compressionLevel: 9 }).toBuffer();
  let fmt = 'png';
  if (buf.length > MAX_BYTES) {
    buf = await flat().png({ palette: true, quality: 90, compressionLevel: 9 }).toBuffer();
  }
  if (buf.length > MAX_BYTES) {
    buf = await flat().jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
    fmt = 'jpg';
  }
  let out = outPath;
  if (fmt === 'jpg' && !/\.jpe?g$/i.test(out)) out = out.replace(/\.\w+$/, '') + '.jpg';
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, buf);
  return { path: out, bytes: buf.length, format: fmt };
}
