// 카카오 알림톡 이미지형 제작가이드 규격 상수 (캔버스 800x400 기준, 단위 px)
// 출처: https://kakaobusiness.gitbook.io/sandbox2025/ad/bizmessage/notice-friend/content-guide/image
//       + 공식 Sketch 템플릿의 프레임 좌표(교차 검증). 상세는 references/image-spec.md.

export const CANVAS = { w: 800, h: 400 };
export const BG = '#F9F9F9'; // 배경색은 이 값만 허용
export const TEXT_COLOR = '#333333'; // 텍스트는 이 색 + Bold만 허용
export const FONT_FAMILY = 'Spoqa Han Sans';
export const FONT_SIZE = 54; // 고정
export const MAX_BYTES = 500 * 1024;

// 카카오 대표색(아이콘 포인트 색 기본값). 채널의 브랜드 대표색 1개로 바꾸는 것이 권장됨.
export const DEFAULT_ACCENT = '#FFE500'; // 공식 PSD 아이콘에서 샘플링한 값
export const ICON_STROKE = '#111111'; // 공식 PSD 아이콘에서 샘플링한 값

export const LOGO = {
  area: { x: 100, y: 125, w: 600, h: 150 },
  minHeightWide: 50, // 가로로 긴 로고는 높이 50 이상
  minWidthShort: 260, // 짧은 로고는 폭 260 이상
  extra: 25, // 가이드 영역을 벗어나는 형태는 위/아래에 25 영역 추가 (문서 근거는 이미지 한 장뿐)
};

export const TEXT_MIXED = {
  text: { x: 36, y: 42, w: 520, h: 240 }, // 좌측 정렬
  lineHeight: 74,
  letterSpacing: 0,
  minChars: 4,
  recommendedLines: 2,
  recommendedChars: 20,
  hardMaxLines: 3,
  hardMaxChars: 30,
  icon: { w: 180, h: 180, right: 20, bottom: 16 }, // 우하단
  art: {
    min: { w: 230, h: 230 },
    max: { w: 400, h: 320 }, // 최대 영역은 우하단 모서리 기준
    right: 20,
    bottom: 16,
  },
};

export const ICON_TYPE = {
  icon: { x: 310, y: 76, w: 180, h: 180 }, // 상단 여백 76, 가로 가운데
  text: { x: 170, y: 256, w: 460, h: 68 }, // 하단 여백 76, 가운데 정렬
  minChars: 2,
  recommendedMinChars: 4,
  maxChars: 9, // 띄어쓰기 포함
};

// 배송 상태(단계) 안내형: 공식 PDF "카카오톡_알림톡 이미지 제작 템플릿 v2.1"에서 측정한 근사값.
// 공식 제작가이드 페이지에는 수치가 없으므로 근사치임 (references/image-spec.md 참고).
export const STEPS = {
  centers: [116, 305, 494, 683], // 단계 아이콘 중심 x (간격 189)
  iconBox: { w: 110, h: 108, cy: 245 },
  circleR: 54,
  headline: { cy1: 70, cy2: 130, size: 40 },
  label: { cy: 336, size: 31 },
  colors: { active: '#FEE500', inactive: '#EDEDED', activeText: '#191919', inactiveText: '#9B9B9B', dash: '#D0D0D0' },
};
