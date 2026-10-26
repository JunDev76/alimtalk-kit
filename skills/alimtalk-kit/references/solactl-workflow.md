# solactl 작업 순서

SOLAPI CLI `solactl`로 알림톡 템플릿을 등록하고 발송한다. 프리뷰 CLI이므로 **실행 전 해당 명령의 `--help`를 확인**하고, 이 문서보다 `--help`를 우선한다. (작성 기준: solactl 0.1.8)

## 설치·계정

```bash
solactl version
curl -fsSL https://raw.githubusercontent.com/solapi/solactl/main/scripts/install.sh | bash   # 사용자가 설치를 요청했을 때만
solactl configure --profile <이름>          # 대화형. Secret을 명령행 인자로 넘기지 않는다
solactl --profile <이름> balance
```

- 자격 증명은 `~/.solactl/credentials.json`(0600). 파일 내용·Secret을 출력하지 않는다.
- 운영 작업은 `--profile`을 항상 명시한다(계정 혼동 방지).
- 알림톡은 SOLAPI에 **카카오 채널 연동**, **발신번호 등록**, **잔액**이 필요하다.

## 1. 대상 확인 (조회, 승인 불필요)

```bash
solactl --profile P kakao channel list              # pfid(채널 ID) 확인
solactl --profile P kakao template categories       # --category-code 값
solactl --profile P kakao template list             # 기존 템플릿 중복 확인
solactl --profile P senderid list
```

## 2. 이미지 업로드 (이미지형만, 승인 필요)

solactl에는 업로드 명령이 없다. 이 키트의 스크립트가 SOLAPI 스토리지(type `ATA`, 정확히 2:1)에 올린다.

```bash
node scripts/upload-image.mjs out.png --profile P --dry-run     # 검증과 요청 요약만
node scripts/upload-image.mjs out.png --profile P --name "배송완료"  # 실제 업로드 → imageId 출력
```

- 업로드 전에 `validate-image.mjs`와 같은 검사를 자동 수행하고, 실패하면 올리지 않는다.
- 응답의 `imageId`(`ST01FZ…`)를 템플릿의 `--image-id`에 넣는다. 이미지는 템플릿에 고정된다(발송 때 바꿀 수 없음).
- 자격 증명은 환경 변수 `SOLAPI_API_KEY`/`SOLAPI_API_SECRET` 우선, 없으면 solactl 프로필을 읽는다. 출력하지 않는다.

## 3. 템플릿 등록 (승인 필요)

```bash
solactl --profile P kakao template create \
  --channel-id <channelId> \
  --name "배송 완료 안내" \
  --category-code <코드> \
  --message-type BA \
  --emphasize-type IMAGE --image-id <imageId> \
  --content "$(cat content.txt)" \
  --buttons "$(cat buttons.json)"
```

- JSON 인자는 `jq -e . buttons.json`으로 먼저 검증한다. 본문은 파일에서 읽어 줄바꿈·`#{}`가 셸에서 깨지지 않게 한다(작은따옴표 또는 `$(cat …)`).
- 등록 직후 `solactl kakao template get <templateId>`로 저장된 값을 확인한다.

## 4. 검수 요청 (승인 필요)

```bash
solactl --profile P kakao template inspect <templateId> --comment "주문 완료 고객에게 발송되는 정보성 안내입니다"
solactl --profile P kakao template get <templateId>      # 상태 확인(검수 대기 → 승인/반려)
solactl --profile P kakao template cancel-inspect <templateId>
```

- 검수는 카카오가 하며 시간이 걸린다. 반려되면 사유를 `get`으로 확인하고 `references/review-rules.md`로 수정 후 `update` → 다시 `inspect`.
- 승인된 템플릿은 수정이 제한된다. 승인 후에는 문구를 바꾸려면 새 템플릿이 필요할 수 있다.

## 5. 발송 (승인 필요)

```bash
solactl --profile P kakao template sendable --channel-id <channelId>     # 승인된(발송 가능) 템플릿 확인

solactl --profile P send ata \
  --to 01012345678 --from 0212345678 \
  --pfid <채널 pfid> --template-id <템플릿 ID> \
  --variables '{"#{고객명}":"홍길동","#{주문번호}":"A-1001"}'
```

- 변수 JSON 키는 `#{이름}` 형태 그대로다. 템플릿에 있는 변수를 모두 채웠는지 확인한다.
- 본문은 템플릿과 100% 일치해야 한다. 치환 결과가 템플릿과 어긋나면 SMS 대체발송 또는 실패가 난다. `--disable-sms`로 대체발송을 끌 수 있다.
- 먼저 본인 번호 등 **소수 테스트 발송** → 결과 확인 → 본 발송.
- 결과 확인:

```bash
solactl --profile P --json send ata … | jq .      # Group ID, 상태, 건수
solactl --profile P messages list --limit 20
```

- 등록 성공이 단말 수신 성공은 아니다. 발송 내역의 상태 코드까지 본다.
- 실패 후 재실행 전에 `messages list`로 이미 접수되지 않았는지 확인한다.
- 수신 동의, 야간 발송, 광고성 표기 등 법적 요건은 CLI가 보장하지 않는다. 알림톡은 정보성이어야 한다.

## 승인 전에 사용자에게 보여줄 것

프로필, 채널(pfid), 발신번호, 수신자 수·샘플, 템플릿 본문 원문, 변수 값, 이미지 미리보기, 버튼, 예약 시각(ISO 8601, 시간대 포함), 실행할 명령 전체.
