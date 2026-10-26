---
name: alimtalk-kit
description: 카카오 알림톡(이미지형 포함) 템플릿 문구와 800x400 이미지를 카카오 제작가이드 규격(배경 #F9F9F9, Spoqa Han Sans Bold 54px, 정확한 좌표)에 맞춰 바로 만들고, SOLAPI solactl로 템플릿 등록·검수 요청·발송까지 안내한다. 알림톡 이미지/아이콘/로고/배송 단계 이미지 만들기, 알림톡 템플릿 작성·검증, 반려 방지, imagegen 일러스트 배경 보정, 알림톡 발송 요청 시 사용한다. Create Kakao Alimtalk templates and spec-compliant images, then register/send via SOLAPI.
license: Apache-2.0
compatibility: Node.js 22+ 와 pnpm 또는 npm 필요(scripts/에서 의존성 설치). 템플릿 등록·발송은 solactl(SOLAPI CLI)과 API Key/Secret 필요. 이미지 일러스트 생성은 imagegen 도구가 있을 때만.
metadata:
  version: "0.1.0"
---

# alimtalk-kit

알림톡을 **예쁘게, 규격에 맞게, 바로** 만드는 키트. 템플릿 문구 → 이미지 → 검증 → (승인 후) 등록·검수·발송.
모든 스크립트 경로는 이 스킬 폴더(`SKILL.md`가 있는 곳) 기준이다.

## 준비 (최초 1회)

```bash
cd <skill>/scripts && pnpm install      # 또는 npm install
node render.mjs --help
```

- 번들 폰트(`assets/fonts`)가 없거나 등록에 실패하면 스크립트가 즉시 중단한다. 시스템 폰트로 대체하지 않는다.
- 등록·발송을 하려면 `solactl`이 필요하다. `solactl version`으로 확인하고, 없으면 설치를 **사용자가 요청할 때만** 안내한다(`references/solactl-workflow.md`).

## 작업 흐름

1. **요구 파악**: 무슨 알림인지(배송/주문/예약/회원/결제…), 정보성인지, 변수, 버튼, 이미지 필요 여부, 브랜드 대표색 1개.
   모호하면 먼저 묻는다. 광고성 내용(할인·이벤트 유도)이면 정보성 알림톡으로 만들 수 없음을 알린다(`references/review-rules.md`).
2. **유형 선택**: 메시지 유형(BA/EX/AD/MI)과 강조 유형(NONE/TEXT/IMAGE/ITEM_LIST) 결정 → `references/template-spec.md`.
   강조표기형(TEXT)·이미지형(IMAGE)·아이템리스트형은 서로 동시에 쓸 수 없다.
3. **템플릿 JSON 작성** → `node scripts/validate-template.mjs tpl.json` 로 검증, 오류 0이 될 때까지 수정.
4. **이미지(이미지형일 때)**: 아래 "이미지 만들기" → 만든 PNG를 **반드시 열어서 눈으로 확인**하고 `validate-image.mjs`로 검증.
5. **사용자에게 최종본 제시**: 본문, 변수, 버튼, 이미지 미리보기, 실행할 명령.
6. **승인 후에만** 이미지 업로드 → 템플릿 등록 → 검수 요청 → (승인된 뒤) 발송. 순서와 명령은 `references/solactl-workflow.md`.

## 이미지 만들기

이미지는 항상 **800x400, 불투명, 배경 `#F9F9F9`, 텍스트 `#333333` Bold, Spoqa Han Sans 54px, 자간 0**이다. 이 값은 바꾸지 않는다(바꾸면 반려).
`render.mjs`가 좌표·폰트·배경을 처리하고 결과를 자동 검증한다(JSON 출력, 오류 시 종료 코드 1).

| 유형 | 언제 | 예시 |
|---|---|---|
| `icon` 아이콘형 | 상태 한 가지를 크게 (배송완료, 주문체결) | `node scripts/render.mjs --type icon --icon 배송완료 --text "배송완료" --out out.png` |
| `text` 텍스트 혼합형 | 안내 문구 + 우하단 아이콘/일러스트 | `node scripts/render.mjs --type text --text "주문하신 상품이\|배송되었습니다" --icon 배송완료 --out out.png` |
| `logo` 로고형 | 가로형 채널 로고 | `node scripts/render.mjs --type logo --logo logo.png --out out.png` |
| `steps` 단계형 | 배송 단계 (4단계 중 현재 강조) | `node scripts/render.mjs --type steps --lines "상품이 발송되어\|**택배사로 이동**합니다." --active 0 --out out.png` |

규칙 요약 (자세한 좌표는 `references/image-spec.md`):
- 아이콘형 텍스트: **1줄, 2~9자(띄어쓰기 포함)**, 4자 이상 권장. 텍스트 혼합형: **최소 4자, 2줄/20자 권장**(최대 3줄/30자), 줄바꿈은 `|`로 직접 지정해 한 줄 10자 안팎으로 끊는다.
- 아이콘/일러스트 **안에 글자를 넣지 않는다**. 글자는 텍스트 영역에만 쓴다.
- 이미지는 정보성이어야 하고 본문 내용과 연관돼야 한다. 광고·혜택 문구, 개인정보, 타인 상표·초상 금지.
- 아이콘 포인트 색은 브랜드 대표색 **1개**(`--accent "#RRGGBB"`, 기본 공식 노랑 `#FFE500`). 스타일은 `--style fill|outline`, 우하단 뱃지는 `--badge check|alert|none`. 아이콘별 기본값이 있어(배송완료=박스+체크 뱃지 등) 보통은 지정하지 않는다.
- 뱃지는 안쪽에 선이 많은 아이콘과 겹쳐 지저분해진다. 체크가 이미 있는 `일정`·`완료` 같은 아이콘엔 붙이지 않는다.
- `--out`이 500KB를 넘으면 자동 압축한다. 투명 배경 소재는 `#F9F9F9` 위에 합성되어 저장된다.
- steps는 공식 PDF 템플릿에서 측정한 **근사 좌표**다. 경고가 출력되면 눈으로 확인한다.

### 아이콘 고르기

`node scripts/render.mjs --list-icons` 로 이름을 본다. 번들 아이콘은 카카오 가이드의 아이콘 이름(배송완료, 쿠폰, 일정…)에 맞춘 오픈소스(Lucide, ISC) 기반이다.
카카오 공식 아이콘은 **레포에 없다**(카카오 소유, 알림톡 외 재배포·2차 가공 금지). 쓰려면 사용자 PC에서:

```bash
node scripts/fetch-official-assets.mjs   # 공식 가이드 페이지에서 PSD/Sketch를 ~/.cache/alimtalk-kit 에 저장
node scripts/import-icons.mjs            # PSD의 icon_* 레이어 추출 → --icon official:배송2 로 사용
```

공식 PSD에 들어 있는 아이콘은 4종뿐이다(배송2, 주문체결, 적립금, 음식점). 상세는 `references/icons.md`.

### 일러스트/오브젝트 (imagegen)

`imagegen` 도구가 있으면 텍스트 혼합형의 우하단 소재를 만들 수 있다. 배경 보정은 `render.mjs --art`가 한다.

1. 프롬프트 규칙: 단순한 플랫 일러스트, 굵은 윤곽선, 제한된 색, **단색 순백 배경에 고립**, 글자·로고·워터마크·그림자·사람 얼굴 없음, 여백 충분. 예:
   `"flat vector illustration of a delivery truck, bold dark outlines, limited palette, centered, isolated on a plain pure white background, no text, no shadow"`
2. 가능하면 `background: "transparent"`로 받는다. 안 되면 단색 배경으로 받아도 된다(가장자리에서 연결된 배경만 제거하므로 그림 안쪽 흰색은 보존된다).
3. `node scripts/render.mjs --type text --text "..." --art art.png --out out.png` → 출력에 "배경을 자동 제거했습니다" 경고가 나오면 **결과 PNG를 열어 가장자리와 잘림을 확인**한다. 이상하면 배경이 더 단순한 소재로 다시 생성한다.
4. 소재는 우하단 영역(최소 230x230 ~ 최대 400x320)에 맞춰 자동 배치된다. 아주 큰 소재가 모서리에 붙길 원하면 `--bleed`.
   "좀 작게/크게" 요청은 `--art-scale 0.5~1`(긴 변이 230px 아래로는 자동 제한)과 `--icon-scale 0.75~1.1`로 조절한다. 입력 이미지를 줄여도 영역에 맞춰 다시 키워지므로 소용없다.
5. 생성형 AI 소재는 카카오 심사에서 별도 표기·제한이 있을 수 있다. 공식 심사 가이드를 확인하도록 사용자에게 알린다(`references/review-rules.md`). 실존 인물·유명 캐릭터·타사 로고를 요청하지 않는다.

### 요청으로 조절할 수 있는 것 / 없는 것

- 가능: 소재·아이콘 크기(`--art-scale`, `--icon-scale`), 포인트 색(`--accent`), 아이콘 스타일·뱃지(`--style`, `--badge`), 문구·줄바꿈, 아이콘 종류, 로고 영역 확장(`--tall`), 큰 소재 모서리 밀착(`--bleed`).
- 불가(규격 위반이라 반려됨): 글자 크기·굵기·색·자간, 배경색, 텍스트 영역 위치, 이미지 비율, 규정된 최대/최소 크기 밖으로 키우거나 줄이기. 요청받으면 이유와 가능한 대안을 설명한다.
- 위치를 임의로 옮기는 옵션은 없다(공식 좌표 고정). 정말 필요하면 `lib/spec.mjs`의 좌표를 고치기 전에 규격 위반임을 알린다.

## 안전 원칙 (외부 상태를 바꾸는 작업)

이미지 업로드, 템플릿 생성·수정·삭제·검수 요청, 발송은 모두 **사용자 승인 후**에만 실행한다. 조회와 로컬 검증·렌더링은 승인 없이 가능.
- 실행 전에 프로필(`--profile` 명시), 채널, 수신자, 발신번호, 본문 원문, 변수, 이미지 미리보기, 예상 건수를 보여준다.
- 테스트 발송(소수) → 결과 확인 → 본 발송. 실패 후 무작정 재실행하지 않는다(중복 발송 방지: `solactl messages list`로 먼저 확인).
- API Secret을 출력·로그·커밋에 남기지 않는다.
- 카카오 검수 통과나 광고성 판정을 보장하지 않는다. 이 키트의 검증은 사전 점검이다.

## 참고 문서 (필요할 때만 읽기)

- `references/image-spec.md` — 유형별 정확한 좌표, 근거, 불확실한 항목. 좌표를 직접 다루거나 렌더 결과가 이상할 때.
- `references/template-spec.md` — 메시지/강조 유형, 글자수 제한, 템플릿 JSON 스키마와 예시. 템플릿을 쓸 때.
- `references/solactl-workflow.md` — 업로드·등록·검수·발송 명령 순서. 등록/발송 단계에서.
- `references/review-rules.md` — 반려 사유, 정보성/광고성 판단, 이미지 심사. 문구를 쓰거나 반려됐을 때.
- `references/icons.md` — 번들 아이콘 목록, 공식 아이콘 가져오기, 라이선스. 아이콘을 고를 때.

## 알려진 한계

- 공식 PSD/Sketch의 텍스트 프레임은 가이드 이미지(W520)와 20px 차이가 있다(Sketch 540). 줄바꿈 기준은 가이드의 520이다.
- 로고형 "25px 영역 추가"는 공식 이미지 한 장에만 있고 수치 근거가 약하다. `--tall`은 위·아래 25px씩 확장한 영역(높이 200)으로 해석한 것이다.
- 번들 아이콘은 카카오 공식 아이콘과 모양이 다르다(스타일만 유사).
- 폰트는 공식 가이드가 지정한 Spoqa Han Sans(구버전) TTF를 번들한다(SIL OFL 1.1).
