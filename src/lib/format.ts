import type { Category, Channel, Verdict } from '../api/types'
import type { IconName } from '../components/Icon'

export const VERDICT_META: Record<
  Verdict,
  {
    label: string
    tone: 'good' | 'warning' | 'critical'
    banner: 'success' | 'warning' | 'danger'
    icon: IconName
    headline: string
  }
> = {
  safe: { label: '안전', tone: 'good', banner: 'success', icon: 'shieldCheck', headline: '위험 신호가 거의 없습니다' },
  suspicious: { label: '주의', tone: 'warning', banner: 'warning', icon: 'shieldAlert', headline: '의심스러운 부분이 있습니다' },
  danger: { label: '위험', tone: 'critical', banner: 'danger', icon: 'alert', headline: '피싱일 가능성이 높습니다' },
}

// /v1/categories 응답과 같은 값. 서버를 부르기 전에도 라벨을 보여 주기 위한 기본값
export const CATEGORY_LABELS: Record<Category, string> = {
  gov_impersonation: '기관 사칭',
  delivery: '택배 사칭',
  family: '가족·지인 사칭',
  loan: '대출 사기',
  investment: '투자 사기',
  payment: '결제·환불 사칭',
  subsidy: '지원금·환급 사칭',
  invitation: '청첩장·부고 사칭',
  other: '기타',
}

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'sms', label: '문자' },
  { value: 'kakao', label: '카카오톡' },
  { value: 'messenger', label: '메신저' },
  { value: 'email', label: '이메일' },
  { value: 'other', label: '기타' },
]

export const REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]

export const HOTLINES = [
  { number: '112', label: '경찰청', desc: '돈을 보냈거나 협박을 받았을 때' },
  { number: '1332', label: '금융감독원', desc: '계좌 지급정지와 피해 상담' },
  { number: '118', label: '한국인터넷진흥원(KISA)', desc: '스미싱 신고와 악성 앱 상담' },
]

const dateTimeFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function toDate(value: string): Date | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateTime(value: string): string {
  const d = toDate(value)
  return d ? dateTimeFmt.format(d) : value
}

export function formatDate(value: string): string {
  const d = toDate(value)
  return d ? dateFmt.format(d) : value
}

export function formatRelative(value: string): string {
  const d = toDate(value)
  if (!d) return value
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  return formatDate(value)
}

// "2026.11.11. 14:05 기준" (KOSIS식 기준 시점)
const basisFmt = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatBasis(value: string | Date = new Date()): string {
  const d = typeof value === 'string' ? toDate(value) : value
  if (!d) return `${value} 기준`
  const p = Object.fromEntries(basisFmt.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}.${p.month}.${p.day}. ${p.hour}:${p.minute} 기준`
}

const numberFmt = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 })
export const formatNumber = (n: number) => numberFmt.format(n)

export function formatDomainAge(days: number): string {
  if (days < 1) return '오늘 생김'
  if (days < 30) return `${days}일`
  if (days < 365) return `${Math.floor(days / 30)}개월`
  return `${(days / 365).toFixed(1)}년`
}

export function isWebUrl(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url)
}
