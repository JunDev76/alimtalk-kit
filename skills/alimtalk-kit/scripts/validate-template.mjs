#!/usr/bin/env node
// 알림톡 템플릿 JSON 사전 검증(글자수·변수·버튼·유형 조합). 검수 통과를 보장하지 않는다.
// 사용: node validate-template.mjs template.json   (또는 '-' 로 stdin)
// 입력 필드는 solactl kakao template create 옵션과 같은 이름(camelCase)을 쓴다. references/template-spec.md 참고.
import fs from 'node:fs';

const arg = process.argv[2];
if (!arg || arg === '--help') {
  console.log('node validate-template.mjs <template.json | ->');
  process.exit(arg ? 0 : 2);
}
const tpl = JSON.parse(fs.readFileSync(arg === '-' ? 0 : arg, 'utf8'));

const errors = [];
const warnings = [];
const len = (s) => [...(s ?? '')].length;
const vars = (s) => [...(s ?? '').matchAll(/#\{([^}]*)\}/g)].map((m) => m[1]);
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const { name, content = '', extra = '', messageType = 'BA', emphasizeType = 'NONE', emphasizeTitle, emphasizeSubtitle,
  buttons = [], header, highlight, item, imageId, ad } = tpl;

if (!name) err('name(템플릿 이름)이 필요합니다.');
if (!content) err('content(본문)가 필요합니다.');

// 메시지 유형 BA 기본형 / EX 부가정보형 / AD 채널추가형 / MI 복합형
if (!['BA', 'EX', 'AD', 'MI'].includes(messageType)) err(`messageType은 BA|EX|AD|MI 입니다(현재 ${messageType}).`);
if (['EX', 'MI'].includes(messageType) && !extra) err(`${messageType}(부가정보 포함 유형)은 extra(부가정보)가 필요합니다.`);
if (['BA', 'AD'].includes(messageType) && extra) err(`${messageType}에서는 extra를 쓸 수 없습니다. 부가정보가 있으면 EX 또는 MI를 쓰세요.`);

// 본문
const bodyMax = emphasizeType === 'ITEM_LIST' ? 700 : 1000;
if (len(content) > bodyMax) err(`본문 ${len(content)}자가 최대 ${bodyMax}자를 넘습니다.${emphasizeType === 'ITEM_LIST' ? ' (아이템리스트형 700자는 중개사 기준일 수 있어 실제 등록 화면 확인 필요)' : ''}`);
if (extra) {
  if (len(extra) > 500) err(`부가정보 ${len(extra)}자가 최대 500자를 넘습니다.`);
  if (vars(extra).length) err('부가정보에는 변수(#{...})를 쓸 수 없습니다.');
  if (len(content) + len(extra) > 1000) err(`본문+부가정보 ${len(content) + len(extra)}자가 합계 1,000자를 넘습니다.`);
}

// 변수
const names = vars(content);
if (new Set(names).size > 40) err('변수가 40개를 넘습니다.');
for (const v of new Set(names)) {
  if (!v.trim()) err('빈 변수 #{}가 있습니다.');
  if (['내용', '문구', '메시지', '텍스트', '본문', '정보'].includes(v.trim())) warn(`변수 #{${v}}는 너무 포괄적이어서 검수에서 반려되기 쉽습니다. 예: #{주문번호}, #{배송예정일}`);
}
if (names.length && len(content.replace(/#\{[^}]*\}/g, '')) < 10) warn('변수를 빼면 고정 문구가 거의 없습니다. 고정 문구 중심으로 작성하세요.');
if (/(?:^|\n)\s*#\{[^}]+\}\s*(?:\n|$)/.test(content) && names.length === 1 && len(content) < 20) err('본문이 변수 하나뿐입니다. 변수만으로 된 템플릿은 반려될 가능성이 큽니다.');

// 강조 유형
if (!['NONE', 'TEXT', 'IMAGE', 'ITEM_LIST'].includes(emphasizeType)) err('emphasizeType은 NONE|TEXT|IMAGE|ITEM_LIST 입니다.');
if (emphasizeType === 'TEXT') {
  if (!emphasizeTitle || !emphasizeSubtitle) err('강조표기형(TEXT)은 emphasizeTitle과 emphasizeSubtitle을 함께 등록해야 합니다.');
  if (len(emphasizeTitle) > 50) err(`강조 제목 ${len(emphasizeTitle)}자가 최대 50자를 넘습니다.`);
  else if (len(emphasizeTitle) > 23) warn(`강조 제목 ${len(emphasizeTitle)}자: 안드로이드 약 23자, iOS 약 27자부터 말줄임됩니다. 중개사 콘솔은 23자로 막는 경우도 있습니다.`);
  if (len(emphasizeSubtitle) > 18) err(`강조 보조문구 ${len(emphasizeSubtitle)}자가 최대 18자를 넘습니다.`);
  if (vars(emphasizeSubtitle).length) err('강조 보조문구에는 변수를 쓸 수 없습니다.');
} else if (emphasizeTitle || emphasizeSubtitle) {
  err('emphasizeTitle/Subtitle은 emphasizeType이 TEXT일 때만 씁니다.');
}
if (emphasizeType === 'IMAGE' && !imageId) err('이미지형(IMAGE)은 imageId가 필요합니다(이미지 업로드 후 발급).');
if (emphasizeType !== 'IMAGE' && imageId) err('imageId는 emphasizeType이 IMAGE일 때만 씁니다.');
if (emphasizeType === 'ITEM_LIST') {
  if (tpl.securityFlag) err('아이템리스트형은 보안 템플릿으로 설정할 수 없습니다.');
  if (!header) err('아이템리스트형은 header가 필요합니다.');
  else if (len(header) > 16) err(`아이템리스트 헤더 ${len(header)}자가 최대 16자를 넘습니다.`);
  const list = item?.list ?? [];
  if (list.length < 2 || list.length > 10) err(`아이템리스트는 2~10개여야 합니다(현재 ${list.length}개).`);
  list.forEach((it, i) => {
    if (len(it.title) > 6) err(`아이템 ${i + 1} 이름 "${it.title}"이 6자를 넘습니다.`);
    if (vars(it.title).length) err(`아이템 ${i + 1} 이름에는 변수를 쓸 수 없습니다.`);
    if (len(it.description) > 23) err(`아이템 ${i + 1} 설명이 23자를 넘습니다.`);
  });
  if (highlight && len(highlight.title) > 30) err('하이라이트 타이틀이 30자를 넘습니다(썸네일이 있으면 21자).');
}
if (emphasizeType !== 'ITEM_LIST' && (header || item || highlight)) warn('header/item/highlight는 ITEM_LIST일 때만 의미가 있습니다.');

// 버튼
const BTN = ['WL', 'AL', 'DS', 'BK', 'MD', 'BC', 'BT', 'AC'];
if (buttons.length > 5) err(`버튼은 최대 5개입니다(현재 ${buttons.length}개).`);
buttons.forEach((b, i) => {
  const t = `버튼 ${i + 1}(${b.buttonName ?? '?'})`;
  if (!BTN.includes(b.buttonType)) err(`${t}: buttonType이 ${BTN.join('|')} 중 하나여야 합니다.`);
  if (!b.buttonName) err(`${t}: buttonName이 필요합니다.`);
  else {
    if (len(b.buttonName) > 14) err(`${t}: 버튼명이 14자를 넘습니다.`);
    if (vars(b.buttonName).length) err(`${t}: 버튼명에는 변수를 쓸 수 없습니다.`);
  }
  if (b.buttonType === 'WL') {
    if (!b.linkMo) err(`${t}: 웹링크(WL)는 linkMo(모바일 URL)가 필요합니다.`);
    for (const k of ['linkMo', 'linkPc']) if (b[k] && !/^https?:\/\//.test(b[k])) err(`${t}: ${k}는 http(s)://로 시작해야 합니다.`);
  }
  if (b.buttonType === 'AL' && !(b.linkMo || b.linkAnd || b.linkIos)) err(`${t}: 앱링크(AL)는 linkMo/linkAnd/linkIos 중 하나가 필요합니다.`);
  if (b.buttonType === 'AC' && !['AD', 'MI'].includes(messageType)) err(`${t}: 채널추가 버튼(AC)은 채널추가형(AD)/복합형(MI)에서만 씁니다.`);
});
if (['AD', 'MI'].includes(messageType) && /광고성 정보 수신동의|개인정보 이용내역|휴면계정/.test(content)) err('채널추가형은 광고성 수신동의 확인, 개인정보 이용내역, 휴면계정 전환 안내 같은 법정 필수 안내에는 쓸 수 없습니다.');

// 광고성 위험(정보성 알림톡은 광고성 문구 불가)
const promo = ['이벤트', '할인', '특가', '쿠폰', '혜택', '무료', '프로모션', '세일', '신상', '구매하세요', '지금 바로', '선착순', '적립 혜택'];
const hits = promo.filter((w) => `${content}${extra}${emphasizeTitle ?? ''}`.includes(w));
if (hits.length) warn(`광고성으로 보일 수 있는 표현: ${hits.join(', ')}. 정보성 알림톡에서는 반려될 수 있습니다(수신 동의 고객 대상 광고는 별도 유형 필요).`);
if (ad && !['AD', 'MI'].includes(messageType)) warn('ad(광고 문구)는 채널추가형/복합형과 함께 쓰는 값입니다.');

console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings, stats: { contentChars: len(content), extraChars: len(extra), variables: [...new Set(names)], buttons: buttons.length } }, null, 2));
process.exit(errors.length ? 1 : 0);
