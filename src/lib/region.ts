// 17개 시도를 대략의 위치에 놓은 타일 지도 (열, 행)
export const TILES: Record<string, [number, number]> = {
  인천: [0, 0], 서울: [1, 0], 경기: [2, 0], 강원: [3, 0],
  충남: [0, 1], 세종: [1, 1], 충북: [2, 1], 경북: [3, 1],
  전북: [0, 2], 대전: [1, 2], 대구: [2, 2], 울산: [3, 2],
  광주: [0, 3], 전남: [1, 3], 경남: [2, 3], 부산: [3, 3],
  제주: [0, 4],
}

const LONG_NAMES: [RegExp, string][] = [
  [/^충청북/, '충북'],
  [/^충청남/, '충남'],
  [/^전라북|^전북/, '전북'],
  [/^전라남/, '전남'],
  [/^경상북/, '경북'],
  [/^경상남/, '경남'],
]

// "서울특별시", "서울청", "경기남부" → "서울", "서울", "경기"
export function normalizeRegion(name: string): string | null {
  const n = name.trim()
  for (const [re, short] of LONG_NAMES) if (re.test(n)) return short
  const short = n.slice(0, 2)
  return short in TILES ? short : null
}

