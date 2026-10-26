# 아이콘

## 번들 아이콘 (73종)

`assets/icons/<이름>.svg` — [Lucide](https://lucide.dev) 아이콘(ISC 라이선스, `assets/icons/LICENSE-lucide.txt`)을 카카오 알림톡 가이드의 아이콘 이름에 맞춰 매핑한 것이다.
`--icon <한글 이름>` 또는 `--icon <lucide id>`로 고른다.

카카오 공식 아이콘이 아니다. 굵기(약 6px)와 색(검정 `#111111`, 노랑 `#FFE500`)은 공식 PSD 아이콘에서 샘플링해 맞췄지만 모양은 다르다.

## 스타일

| 스타일 | 모양 | 옵션 |
|---|---|---|
| `fill` | 검정 외곽선 + 닫힌 도형을 포인트 색으로 채움 | `--style fill` |
| `outline` | 검정 외곽선만 (+ 우하단 뱃지) — 공식 배송완료·주문체결·적립금 소멸안내 스타일 | `--style outline --badge check` |

- `--badge check|alert|none`: 우하단 노란 원 뱃지(체크 또는 느낌표). 아이콘 안에 이미 체크가 있는 아이콘(`일정`, `완료`)에는 뱃지를 붙이지 않는다.
- `--accent "#RRGGBB"`: 포인트 색(채움과 뱃지). 브랜드 대표색 1개만 쓴다. 기본은 공식 노랑 `#FFE500`.
- 아이콘별 기본 스타일은 `assets/icons/defaults.json`에 있다(아래 표의 "기본").
- 안쪽에 선이 많은 아이콘(`예약`의 시계 등)에 뱃지를 붙이면 겹쳐 보이니 `일정`처럼 뱃지가 필요 없는 아이콘을 고른다.

| 이름 | Lucide id | 기본 |
|---|---|---|
| 대화 | `message-circle` | fill |
| 공지사항 | `megaphone` | fill |
| 이미지 | `image` | fill |
| 고객센터 | `headset` | fill |
| 기념일 | `calendar-heart` | fill |
| 전송 | `send` | fill |
| 알림 | `bell` | fill |
| 잠금 | `lock` | fill |
| 청구서 | `file-text` | fill |
| 주문 | `clipboard-list` | fill |
| 주문완료 | `file-text` | outline + check 뱃지 |
| 결제 | `credit-card` | fill |
| 메뉴 | `utensils` | fill |
| 현금영수증 | `receipt` | fill |
| 병원 | `hospital` | fill |
| 보험 | `shield-plus` | fill |
| 유효기간만료 | `hourglass` | fill |
| 일정 | `calendar-check` | fill |
| 예약 | `calendar-clock` | fill |
| 검색 | `search` | fill |
| 디저트 | `cake-slice` | fill |
| 생일 | `cake` | fill |
| 쿠폰확인 | `ticket-percent` | outline + check 뱃지 |
| 배송준비 | `store` | fill |
| 배송시작 | `package` | fill |
| 배송중 | `truck` | fill |
| 배송완료 | `package` | outline + check 뱃지 |
| 배달 | `bike` | fill |
| 적립금할인 | `badge-percent` | fill |
| 항공 | `plane` | fill |
| 리워드 | `gem` | fill |
| 경고 | `triangle-alert` | fill |
| 긴급 | `siren` | fill |
| 적립금 | `coins` | fill |
| 쿠폰 | `ticket-percent` | fill |
| 이용권 | `ticket` | fill |
| 스탬프 | `stamp` | fill |
| 할인 | `badge-percent` | fill |
| QR코드 | `qr-code` | fill |
| 카드 | `credit-card` | fill |
| 지갑 | `wallet` | fill |
| 현금 | `banknote` | fill |
| 바코드 | `barcode` | fill |
| 지도 | `map-pin` | fill |
| 나침반 | `compass` | fill |
| 발표 | `presentation` | fill |
| 그래프 | `chart-pie` | fill |
| 성장 | `chart-column` | fill |
| 파일 | `folder` | fill |
| 고정 | `pin` | fill |
| 스포츠 | `trophy` | fill |
| 영화 | `clapperboard` | fill |
| 음악 | `music` | fill |
| 인물승인 | `user-check` | fill |
| 음료 | `cup-soda` | fill |
| 웨이팅 | `users` | fill |
| 시계 | `clock` | fill |
| 완료 | `circle-check` | fill |
| 안내 | `info` | fill |
| 위치 | `map` | fill |
| 선물 | `gift` | fill |
| 메일 | `mail` | fill |
| 전화 | `phone` | fill |
| 수강 | `graduation-cap` | fill |
| 등원 | `school` | fill |
| 출석 | `badge-check` | fill |
| 비밀번호 | `key-round` | fill |
| 본인인증 | `shield-check` | fill |
| 환불 | `undo-2` | fill |
| 취소 | `circle-x` | fill |
| 반품 | `package-x` | fill |
| 적립금소멸 | `coins` | outline + alert 뱃지 |
| 환불완료 | `undo-2` | outline + check 뱃지 |

새 아이콘을 추가하려면 24x24 viewBox, `stroke="currentColor"`, `fill="none"` 형식의 SVG를 `assets/icons/`에 넣고 `index.json`에 `"이름": "id"`를 추가한다. 열린 선으로만 된 아이콘에 채움이 필요하면 `data-fill-only="1"` 속성을 가진 닫힌 도형을 SVG 앞쪽에 하나 넣는다(채움 단계에서만 그려진다).
직접 만든 PNG/SVG는 `--icon ./경로.png` 로 바로 쓸 수 있다(PNG는 180x180 박스 가운데에 원본 크기로 그려진다).

## 공식 아이콘 (카카오 제공)

카카오 알림톡 가이드의 아이콘 리소스는 **카카오가 모든 권리를 가지며, 알림톡 메시지 외 사용·2차 가공·재배포가 금지**돼 있다.
그래서 이 레포에는 포함하지 않고, 사용자가 자기 PC에서 공식 페이지의 파일을 받아 쓰게 한다.

```bash
node scripts/fetch-official-assets.mjs   # 공식 가이드 페이지의 링크를 읽어 ~/.cache/alimtalk-kit/official/ 에 PSD·Sketch 저장
node scripts/import-icons.mjs            # PSD의 icon_* 레이어 → ~/.cache/alimtalk-kit/official-icons/*.png (+ 박스 대비 오프셋 .json)
node scripts/render.mjs --list-icons     # official:이름 확인
node scripts/render.mjs --type icon --icon official:배송2 --text "배송완료" --out out.png
```

- 캐시 위치는 `ALIMTALK_KIT_CACHE` 환경 변수로 바꿀 수 있다.
- 공식 PSD에 들어 있는 아이콘 레이어는 4종(배송2, 주문체결, 적립금, 음식점)뿐이다. 가이드 페이지에 보이는 54종은 스크린샷으로만 제공된다.
- 공식 아이콘은 PSD 샘플과 같은 위치(오프셋 포함)에 그려지고 색은 카카오 노랑 그대로다(`--accent`, `--style`, `--badge` 무시).
- 다운로드 링크는 공식 페이지 HTML에서 찾으며 토큰이 바뀔 수 있다. 실패하면 스크립트가 안내하는 페이지에서 브라우저로 받아 캐시 폴더에 `alimtalk-image-template.psd`로 저장한다.
- 공식 가이드: https://kakaobusiness.gitbook.io/sandbox2025/ad/bizmessage/notice-friend/content-guide/image
