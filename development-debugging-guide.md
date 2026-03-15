# Hoppscotch 개발 디버깅 가이드

## 목적

이 문서는 로컬 개발 환경에서 Hoppscotch를 실행하고, 문제를 재현하고, 빠르게 디버깅하기 위한 가이드입니다.

특히 아래 상황을 기준으로 작성했습니다.

- 기존 `.env` 는 원격 서버를 바라보고 있음
- 로컬 테스트는 `.env.localtest` 를 별도로 만들어 수행함
- 백엔드 / 웹 / 어드민을 각각 분리 실행하며 문제를 확인해야 함

---

## 1. 로컬 개발 실행 구조

### 사용 포트

| 서비스 | 포트 | 주소 |
|---|---:|---|
| Web App | 3000 | http://localhost:3000 |
| Admin App | 3100 | http://localhost:3100 |
| Backend | 3170 | http://localhost:3170 |
| PostgreSQL | 5432 | postgresql://postgres:testpass@localhost:5432/hoppscotch |

### 핵심 포인트

- 로컬 개발은 `.env.localtest` 를 사용합니다.
- `.env.localtest` 는 최초 실행 시 자동 생성됩니다.
- 기존 `.env` 는 수정하지 않습니다.
- 백엔드 주소는 강제로 localhost 로 맞춰집니다.

---

## 2. 가장 빠른 실행 순서

### 2-1. DB 실행 + 마이그레이션

```bash
pnpm dev:local:setup
```

실행 내용:

- `hoppscotch-db` 컨테이너 실행
- DB health check 확인
- Prisma migration 적용

### 2-2. 백엔드 실행

새 터미널:

```bash
pnpm dev:local:backend
```

정상 기동 시 확인 포인트:

- `Nest application successfully started`
- `http://localhost:3170/health` 응답 가능

### 2-3. 웹 앱 실행

새 터미널:

```bash
pnpm dev:local:web
```

접속:

```text
http://localhost:3000
```

### 2-4. 어드민 실행

새 터미널:

```bash
pnpm dev:local:admin
```

접속:

```text
http://localhost:3100
```

---

## 3. 제공되는 로컬 개발 명령어

```bash
pnpm dev:local:setup
pnpm dev:local:db
pnpm dev:local:migrate
pnpm dev:local:backend
pnpm dev:local:web
pnpm dev:local:admin
pnpm dev:local:stop-db
```

### 의미

- `dev:local:setup` : DB 실행 + migration
- `dev:local:db` : DB만 실행
- `dev:local:migrate` : migration만 실행
- `dev:local:backend` : Nest 백엔드 실행
- `dev:local:web` : 메인 웹 앱 실행
- `dev:local:admin` : 어드민 앱 실행
- `dev:local:stop-db` : DB 중지

---

## 4. 로컬 환경 파일 동작 방식

### `.env.localtest`

최초 실행 시 아래 값들이 로컬용으로 강제 설정됩니다.

```env
DATABASE_URL=postgresql://postgres:testpass@localhost:5432/hoppscotch
VITE_BACKEND_GQL_URL=http://localhost:3170/graphql
VITE_BACKEND_WS_URL=ws://localhost:3170/graphql
VITE_BACKEND_API_URL=http://localhost:3170/v1
```

### 확인 명령

```bash
cat .env.localtest
```

### 주의사항

- `.env.localtest` 는 로컬 개발용입니다.
- 원격 서버 테스트가 필요하면 `.env` 또는 별도 env 파일을 사용하세요.
- 로컬 재설정이 필요하면 `.env.localtest` 를 지우고 다시 실행하면 됩니다.

```bash
rm -f .env.localtest
pnpm dev:local:setup
```

---

## 5. 상태 확인용 기본 명령

### 포트 점유 확인

```bash
lsof -iTCP -sTCP:LISTEN -n -P | rg ':(3000|3100|3170|5432)\b'
```

### 백엔드 헬스체크

```bash
curl -fsS http://localhost:3170/health
```

정상 예시:

```json
{"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}
```

### 웹 앱 응답 확인

```bash
curl -I http://localhost:3000
```

### 어드민 앱 응답 확인

```bash
curl -I http://localhost:3100
```

### DB 상태 확인

```bash
docker compose ps hoppscotch-db
```

---

## 6. 자주 만나는 문제와 해결 방법

### 6-1. `EADDRINUSE` 포트 충돌

예:

- `listen EADDRINUSE: address already in use :::3170`
- 3000, 3100, 5432 포트 충돌

확인:

```bash
lsof -iTCP -sTCP:LISTEN -n -P | rg ':(3000|3100|3170|5432)\b'
```

정리:

```bash
lsof -tiTCP:3170 -sTCP:LISTEN | xargs -r kill
lsof -tiTCP:3000 -sTCP:LISTEN | xargs -r kill
lsof -tiTCP:3100 -sTCP:LISTEN | xargs -r kill
```

DB 중지는:

```bash
pnpm dev:local:stop-db
```

---

### 6-2. DB 연결 실패

증상:

- 백엔드 실행 중 DB timeout
- `/health` 에서 DB status 실패
- Prisma migration 실패

확인 순서:

```bash
docker compose ps hoppscotch-db
cat .env.localtest | rg DATABASE_URL
```

복구 순서:

```bash
pnpm dev:local:stop-db
pnpm dev:local:db
pnpm dev:local:migrate
```

필요 시 완전 초기화:

```bash
docker compose down -v
pnpm dev:local:setup
```

---

### 6-3. 프론트가 여전히 원격 백엔드를 보는 것 같을 때

확인:

```bash
cat .env.localtest | rg 'VITE_BACKEND'
```

기대값:

```env
VITE_BACKEND_GQL_URL=http://localhost:3170/graphql
VITE_BACKEND_WS_URL=ws://localhost:3170/graphql
VITE_BACKEND_API_URL=http://localhost:3170/v1
```

문제가 있으면:

```bash
rm -f .env.localtest
pnpm dev:local:setup
```

---

### 6-4. 어드민 페이지가 안 열릴 때

확인 순서:

1. 백엔드 실행 여부 확인
2. 어드민 실행 여부 확인
3. `VITE_ADMIN_URL` 이 `http://localhost:3100` 인지 확인

실행:

```bash
pnpm dev:local:backend
pnpm dev:local:admin
```

접속:

```text
http://localhost:3100
```

---

### 6-5. `refresh_token not found`

이 메시지는 로컬 비로그인 상태에서 흔히 보일 수 있습니다.

- 항상 치명적인 오류는 아닙니다.
- 로그인/인증이 필요한 페이지인지 확인하세요.
- 일반적인 앱 기동 자체는 가능할 수 있습니다.

---

## 7. 추천 디버깅 순서

문제 발생 시 아래 순서로 보면 빠릅니다.

### 1단계: 프로세스/포트 확인

```bash
lsof -iTCP -sTCP:LISTEN -n -P | rg ':(3000|3100|3170|5432)\b'
```

### 2단계: DB 확인

```bash
docker compose ps hoppscotch-db
```

### 3단계: 백엔드 확인

```bash
curl -fsS http://localhost:3170/health
```

### 4단계: 프론트 확인

```bash
curl -I http://localhost:3000
curl -I http://localhost:3100
```

### 5단계: env 확인

```bash
cat .env.localtest
```

---

## 8. 추천 로그 확인 포인트

### 백엔드

중요 로그:

- `Nest application successfully started`
- DB 관련 에러
- GraphQL 요청 로그
- `EADDRINUSE`

### 웹 / 어드민

중요 로그:

- `VITE v7.x ready`
- `Local: http://localhost:3000/`
- `Local: http://localhost:3100/`
- 브라우저 콘솔 에러
- 네트워크 탭에서 `/graphql`, `/v1/*` 호출 실패 여부

### DB

```bash
docker compose logs -f hoppscotch-db
```

---

## 9. 현재 변경사항 기준 수동 테스트 체크리스트

최근 변경이 팀 컬렉션/문서 동기화 쪽이라면 아래 순서로 확인합니다.

### A. 팀 컬렉션 설명 동기화

1. 같은 팀 컬렉션을 브라우저 2개에서 엽니다.
2. 창 A 에서 컬렉션 설명을 수정합니다.
3. 창 B 에서 설명이 갱신되는지 확인합니다.

확인 포인트:

- 편집 중이 아닐 때 설명이 자동 반영되는지
- 내용이 빈 값으로 바뀌지 않는지
- 콘솔 에러가 없는지

### B. 팀 요청 수정 반영

1. 창 A 에서 팀 요청의 URL/method/body 를 수정합니다.
2. 창 B 에서 요청이 정상 반영되는지 확인합니다.

확인 포인트:

- method/url/body/auth 값이 깨지지 않는지
- 요청이 기본값으로 초기화되지 않는지

### C. 팀 요청 이동 반영

1. 요청을 다른 폴더로 이동합니다.
2. 다른 창에서 즉시 위치 변경이 보이는지 확인합니다.
3. 이동된 요청을 열었을 때 내용이 유지되는지 확인합니다.

---

## 10. 개발 종료

### 웹 / 어드민 / 백엔드

각 터미널에서:

```bash
Ctrl + C
```

### DB 중지

```bash
pnpm dev:local:stop-db
```

완전 종료:

```bash
docker compose down
```

---

## 11. 추천 시작 루틴

매번 아래 순서로 시작하면 가장 안전합니다.

```bash
pnpm dev:local:setup
pnpm dev:local:backend
pnpm dev:local:web
pnpm dev:local:admin
```

접속:

- Web: http://localhost:3000
- Admin: http://localhost:3100
- Backend Health: http://localhost:3170/health
