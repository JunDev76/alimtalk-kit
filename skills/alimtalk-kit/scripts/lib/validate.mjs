import fs from 'node:fs';
import sharp from 'sharp';
import { BG, CANVAS, MAX_BYTES } from './spec.mjs';

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const BG_RGB = hex(BG);

/** 알림톡 이미지형 업로드 규격 검사. errors가 비어 있으면 ok. */
export async function validateImage(file) {
  const errors = [];
  const warnings = [];
  const bytes = fs.statSync(file).size;
  const meta = await sharp(file).metadata();
  const { width, height, format } = meta;

  if (!['png', 'jpeg'].includes(format)) errors.push(`형식이 ${format}입니다. JPG 또는 PNG만 가능합니다.`);
  if (bytes > MAX_BYTES) errors.push(`용량 ${(bytes / 1024).toFixed(0)}KB가 500KB를 넘습니다.`);
  if (width * 1 !== height * 2) errors.push(`비율이 ${width}x${height}입니다. 가로:세로 2:1이어야 합니다.`);
  else if (width <= 500 || height <= 250) errors.push(`${width}x${height}는 업로드 불가 크기입니다(가로 500·세로 250 초과 필요).`);
  else if (width !== CANVAS.w) warnings.push(`권장 크기는 800x400입니다(현재 ${width}x${height}). 좌표 규격은 800x400 기준입니다.`);

  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let transparent = 0, bgPx = 0;
  const tol = format === 'jpeg' ? 3 : 0;
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    if (data[o + 3] < 255) transparent++;
    if (Math.abs(data[o] - BG_RGB[0]) <= tol && Math.abs(data[o + 1] - BG_RGB[1]) <= tol && Math.abs(data[o + 2] - BG_RGB[2]) <= tol) bgPx++;
  }
  if (transparent > 0) errors.push(`투명 픽셀이 ${transparent}개 있습니다. 배경 #F9F9F9로 채워 불투명하게 저장하세요.`);

  // 가장자리 한 줄 전체와 네 모서리가 배경색인지 (소재가 가장자리를 덮는 큰 일러스트는 경고)
  const at = (x, y) => { const o = (y * W + x) * 4; return [data[o], data[o + 1], data[o + 2]]; };
  const isBg = (c) => c.every((v, k) => Math.abs(v - BG_RGB[k]) <= tol);
  const corners = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1)];
  const badCorners = corners.filter((c) => !isBg(c));
  if (badCorners.length) {
    const hit = badCorners.map((c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase());
    errors.push(`모서리 색이 배경 ${BG}가 아닙니다(${hit.join(', ')}). 흰색(#FFFFFF)이나 다른 배경색은 반려됩니다.`);
  }
  const ratio = bgPx / (W * H);
  if (ratio < 0.3) warnings.push(`배경색(${BG}) 픽셀이 ${(ratio * 100).toFixed(0)}%뿐입니다. 소재가 화면을 과하게 덮고 있지 않은지 확인하세요.`);

  return { ok: errors.length === 0, errors, warnings, info: { width, height, format, bytes, bgRatio: Number(ratio.toFixed(3)) } };
}
