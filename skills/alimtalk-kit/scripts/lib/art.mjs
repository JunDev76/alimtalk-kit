import sharp from 'sharp';

function dist(r, g, b, c) {
  const dr = r - c[0], dg = g - c[1], db = b - c[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * imagegen 등으로 만든 일러스트/로고의 배경을 투명으로 만든다.
 * - 이미 가장자리가 투명하면 그대로 둔다.
 * - 아니면 가장자리 픽셀의 최빈 색을 배경으로 보고, 가장자리에서 연결된 같은 색 영역만 제거한다(flood fill).
 *   그림 안쪽의 같은 색(예: 흰 눈동자)은 지워지지 않는다.
 * 반환: 여백을 잘라낸 투명 PNG 버퍼와 크기, 배경 처리 방식.
 */
export async function prepareArt(input, { tolerance = 36 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 4;

  let borderTransparent = 0, borderTotal = 0;
  const bucket = new Map();
  const visitBorder = (x, y) => {
    const i = px(x, y);
    borderTotal++;
    if (data[i + 3] < 16) borderTransparent++;
    const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
    const e = bucket.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2];
    bucket.set(key, e);
  };
  for (let x = 0; x < W; x++) { visitBorder(x, 0); visitBorder(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { visitBorder(0, y); visitBorder(W - 1, y); }

  let mode = 'alpha';
  if (borderTransparent / borderTotal < 0.9) {
    mode = 'flood';
    const top = [...bucket.values()].sort((a, b) => b.n - a.n)[0];
    const bg = [top.r / top.n, top.g / top.n, top.b / top.n];
    const seen = new Uint8Array(W * H);
    const stack = [];
    const push = (x, y) => {
      const k = y * W + x;
      if (seen[k]) return;
      const i = k * 4;
      if (data[i + 3] >= 16 && dist(data[i], data[i + 1], data[i + 2], bg) > tolerance) return;
      seen[k] = 1; stack.push(k);
    };
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
    for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
    while (stack.length) {
      const k = stack.pop();
      const x = k % W, y = (k / W) | 0;
      if (x > 0) push(x - 1, y);
      if (x < W - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < H - 1) push(x, y + 1);
    }
    for (let k = 0; k < W * H; k++) if (seen[k]) data[k * 4 + 3] = 0;
    // 경계 1~2px 부드럽게: 배경과 닮은 인접 픽셀은 반투명 처리
    const soft = tolerance * 1.8;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const k = y * W + x;
        if (seen[k]) continue;
        if (!(seen[k - 1] || seen[k + 1] || seen[k - W] || seen[k + W])) continue;
        const i = k * 4;
        const d = dist(data[i], data[i + 1], data[i + 2], bg);
        if (d < soft) data[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (d - tolerance) / (soft - tolerance))));
      }
    }
  }

  // 투명 여백 트림
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[px(x, y) + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) throw new Error('배경 제거 후 남은 픽셀이 없습니다. 배경이 단색인지, 소재가 배경과 같은 색이 아닌지 확인하세요.');
  const buf = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png().toBuffer();
  return { buf, width: maxX - minX + 1, height: maxY - minY + 1, mode };
}

/** contain 방식으로 box 안에 꽉 차게 맞춘다(작은 소재는 키운다). */
export function fitContain(w, h, box) {
  const s = Math.min(box.w / w, box.h / h);
  return { w: Math.round(w * s), h: Math.round(h * s) };
}
