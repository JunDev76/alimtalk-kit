# 템플릿 작성 규격

출처: 카카오비즈니스 [알림톡 유형 가이드](https://kakaobusiness.gitbook.io/main/ad/infotalk/content-guide), 중개사 등록 가이드. 중개사(콘솔)마다 제한이 더 엄격할 수 있으니 실제 등록 화면이 우선이다.
`scripts/validate-template.mjs`가 아래 규칙을 검사한다.

## 유형 두 축

**메시지 유형** (`--message-type`)

| 코드 | 유형 | 구성 |
|---|---|---|
| BA | 기본형 | 본문 + 버튼. 본문 최대 1,000자, `#{변수}` 가능 |
| EX | 부가정보형 | 본문 + 부가정보(최대 500자, 변수 불가, URL 가능) + 버튼. 본문+부가정보 합계 1,000자 |
| AD | 채널추가형 | 본문 + 채널추가 안내(문구 고정) + 채널추가 버튼. 비광고성 메시지 하단에 채널 추가 유도 |
| MI | 복합형 | 부가정보 + 채널추가 |

채널추가형(AD/MI)은 광고성 수신동의 확인, 개인정보 이용내역 안내, 휴면계정 전환 안내처럼 법정 필수 안내에는 쓸 수 없다.

**강조 유형** (`--emphasize-type`) — 하나만 선택

| 코드 | 유형 | 규칙 |
|---|---|---|
| NONE | 없음 | |
| TEXT | 강조표기형 | 제목(최대 50자, 안드로이드 약 23자/iOS 약 27자부터 말줄임, 변수 가능) + 보조문구(최대 18자, 변수 불가). 둘 다 등록 |
| IMAGE | 이미지형 | `--image-id` 필요. 800x400 규격 이미지(`references/image-spec.md`). 정보성만 |
| ITEM_LIST | 아이템리스트형 | 헤더(16자) + 하이라이트 + 리스트 2~10개(이름 6자·변수 불가, 설명 23자·변수 가능). 광고성·보안 템플릿 불가. 본문은 700자로 보는 중개사 있음 |

## 글자수·형식 요약

| 항목 | 제한 |
|---|---|
| 본문 | 1,000자 (한/영 구분 없음, URL·변수 포함. 치환 후 길이도 초과하면 발송 실패) |
| 부가정보 | 500자, 변수 불가, 본문과 합계 1,000자 |
| 버튼 | 최대 5개, 버튼명 14자·변수 불가, 링크 URL은 변수 가능 |
| 변수 | `#{변수명}`, 템플릿당 40개 이하. `#{내용}`처럼 포괄적인 이름은 반려되기 쉬움 |

## 템플릿 JSON (validate-template.mjs 입력)

필드 이름은 `solactl kakao template create`의 옵션과 대응한다.

```json
{
  "name": "배송 완료 안내",
  "messageType": "BA",
  "emphasizeType": "IMAGE",
  "imageId": "ST01FZ_...",
  "content": "#{고객명}님, 주문하신 상품이 배송 완료되었습니다.\n\n■ 주문번호: #{주문번호}\n■ 배송지: #{배송지}",
  "buttons": [
    { "buttonType": "WL", "buttonName": "주문 상세 보기", "linkMo": "https://example.com/orders", "linkPc": "https://example.com/orders" }
  ]
}
```

| JSON 필드 | solactl 옵션 |
|---|---|
| name | `--name` |
| content | `--content` |
| messageType | `--message-type` |
| emphasizeType / emphasizeTitle / emphasizeSubtitle | `--emphasize-type` / `--emphasize-title` / `--emphasize-subtitle` |
| imageId | `--image-id` |
| extra | `--extra` |
| ad | `--ad` |
| header / highlight / item | `--header` / `--highlight` (JSON) / `--item` (JSON) |
| buttons | `--buttons` (JSON 배열) |
| securityFlag | `--security-flag` |
| (카테고리) | `--category-code` — `solactl kakao template categories`로 조회 |

버튼 타입: `WL` 웹링크(linkMo 필수), `AL` 앱링크, `DS` 배송조회, `BK` 봇키워드, `MD` 메시지전달, `BC` 상담톡 전환, `BT` 봇 전환, `AC` 채널추가(AD/MI 전용).

## 좋은 알림톡 본문 패턴

- 첫 줄에 **누구에게(#{고객명}) + 무슨 일**을 쓴다. 예: `#{고객명}님, 주문하신 상품이 배송 완료되었습니다.`
- 상세는 `■ 항목: #{값}` 줄로 나눈다. 변수명은 구체적으로(`#{주문번호}`, `#{배송예정일}`).
- 이미지형이면 이미지 문구와 본문이 같은 내용을 가리켜야 한다(이미지 "배송완료" ↔ 본문 "배송 완료되었습니다").
- 변수는 고객마다 달라지는 값에만 쓴다. 고정 문구가 충분히 있어야 한다.
- 광고성 표현(할인·이벤트·쿠폰 유도)과 정보성 문구를 섞지 않는다.
- 안내 끝에 문의 경로나 수신 사유(`본 메시지는 고객님의 주문에 따라 발송되었습니다.`)를 두면 정보성 근거가 분명해진다.
