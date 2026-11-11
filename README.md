# 피싱 가드 — 모바일 웹

받은 문자를 붙여 넣으면 스미싱·피싱 위험도와 대응 방법을 알려 주는 모바일 웹 프런트엔드.
React 19 + TypeScript + Vite. 라우팅은 해시(`#/result/…`)라 정적 호스팅에서도 새로고침·뒤로 가기가 된다.

- API: https://phishguard-api-n50n.onrender.com
- Swagger: https://phishguard-api-n50n.onrender.com/docs

## 디자인

KRDS(대한민국 정부 디자인 시스템)를 바탕으로 했다. 디자인 값은 [design/tokens.css](design/tokens.css), 근거는 [design/krds-redesign.md](design/krds-redesign.md)에 있다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ 에 정적 파일
```

다른 서버를 쓰려면 `.env.example`을 `.env.local`로 복사해 `VITE_API_BASE_URL`을 바꾼다.

## 화면과 API

| 화면 | 경로 | 부르는 API |
| --- | --- | --- |
| 홈 (문자 입력, 주의보 미리보기, 최근 기록) | `#/` | `GET /v1/alerts` |
| 판별 중 → 결과 | `#/checking` → `#/result/{check_id}` | `POST /v1/check`, `GET /v1/checks/{id}` (AI 설명 대기 시 다시 받기) |
| 신고하기 | `#/report/{check_id}`, `#/report` | `POST /v1/reports` |
| 주의보 목록·상세 | `#/alerts`, `#/alerts/{id}` | `GET /v1/alerts` |
| 통계 (대시보드 5개 탭) | `#/stats` | `GET /v1/trends/{police\|kisa\|regions\|infra\|topics}` |
| 물어보기 | `#/ask`, `#/ask?check={id}` | `POST /v1/ask` |
| 설정 | `#/settings` | `GET /health` |
| 관리자 (신고 검수·문서 등록·데이터·작업) | `#/admin` | `/v1/admin/*` (`X-Admin-Token` 헤더) |

## 명세 문서와 실제 서버의 차이

Swagger를 기준으로 구현했다.

- 주소 앞부분은 `/api/v1`이 아니라 `/v1`.
- 대시보드는 `/trends/types`, `/trends/urls` 대신 `/v1/trends/{name}` 하나로 묶여 있다.
- 관리자 로그인 API가 없다. 토큰을 `X-Admin-Token` 헤더로 보낸다 (탭을 닫으면 지워지는 sessionStorage에 보관).
- 문서 등록은 `/v1/admin/documents`.

## 알아 둘 점

- 통계 응답(`payload`)은 구조가 정해져 있지 않아, 숫자 배열·날짜별 행·숫자 맵을 알아보고 꺾은선·가로 막대·표로 그린다.
  구조가 확정되면 탭별 전용 차트로 바꾸는 것이 좋다.
- `POST /v1/devices`는 FCM/APNs 토큰이 필요해 웹에서는 부르지 않는다 (`api.registerDevice`만 준비). 알림 지역은 기기에만 저장한다.
- Render 무료 서버는 잠들어 있으면 첫 요청에 최대 1분 걸린다. 6초가 넘으면 화면에 안내가 뜬다.
