#!/usr/bin/env node
// 알림톡 이미지형 템플릿용 이미지를 SOLAPI 스토리지(type=ATA)에 올리고 fileId(=imageId)를 출력한다.
// solactl에는 업로드 명령이 없어서 REST를 직접 호출한다. 외부 상태(저장소 파일)를 만드는 작업이므로 사용자 승인 후 실행한다.
//
//   node upload-image.mjs <이미지> [--profile NAME] [--name 별칭] [--dry-run]
//
// 인증: 환경 변수 SOLAPI_API_KEY/SOLAPI_API_SECRET 우선, 없으면 ~/.solactl/credentials.json 의 프로필(--profile, 기본 활성 프로필).
// 자격 증명은 출력하지 않는다.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { validateImage } from './lib/validate.mjs';

const { values: a, positionals } = parseArgs({
  allowPositionals: true,
  options: { profile: { type: 'string' }, name: { type: 'string' }, 'dry-run': { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
});
const file = positionals[0];
if (a.help || !file) { console.log('node upload-image.mjs <이미지> [--profile NAME] [--name 별칭] [--dry-run]'); process.exit(file ? 0 : 2); }
if (!fs.existsSync(file)) { console.error(`파일이 없습니다: ${file}`); process.exit(2); }

const check = await validateImage(file);
if (!check.ok) { console.error('이미지 검증 실패, 업로드하지 않습니다:\n- ' + check.errors.join('\n- ')); process.exit(1); }

function credentials() {
  if (process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET) return { key: process.env.SOLAPI_API_KEY, secret: process.env.SOLAPI_API_SECRET };
  const p = path.join(os.homedir(), '.solactl/credentials.json');
  if (!fs.existsSync(p)) return null;
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  const prof = c.profiles?.[a.profile || c.active_profile];
  return prof ? { key: prof.api_key, secret: prof.api_secret } : null;
}
const cred = credentials();
if (!a['dry-run'] && !cred) { console.error('자격 증명이 없습니다. SOLAPI_API_KEY/SOLAPI_API_SECRET를 설정하거나 solactl configure 를 실행하세요.'); process.exit(1); }

const body = { file: fs.readFileSync(file).toString('base64'), type: 'ATA', name: (a.name || path.basename(file)).slice(0, 100) };
if (a['dry-run']) {
  console.log(JSON.stringify({ dryRun: true, endpoint: 'POST https://api.solapi.com/storage/v1/files', type: body.type, name: body.name, bytes: check.info.bytes, size: `${check.info.width}x${check.info.height}`, hasCredentials: !!cred }, null, 2));
  process.exit(0);
}

const date = new Date().toISOString();
const salt = crypto.randomBytes(16).toString('hex');
const signature = crypto.createHmac('sha256', cred.secret).update(date + salt).digest('hex');
const res = await fetch('https://api.solapi.com/storage/v1/files', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `HMAC-SHA256 apiKey=${cred.key}, date=${date}, salt=${salt}, signature=${signature}` },
  body: JSON.stringify(body),
});
const json = await res.json().catch(() => ({}));
if (!res.ok) { console.error(`업로드 실패(${res.status}): ${json.errorMessage || json.message || JSON.stringify(json)}`); process.exit(1); }
console.log(JSON.stringify({ imageId: json.fileId, url: json.url, width: json.width, height: json.height, fileSize: json.fileSize }, null, 2));
