# Hoppscotch 배포 가이드

## 배포 프로세스

### 1. Docker 이미지 빌드 및 태그

```bash
# 빌드 시간 태그 생성
BUILD_TAG=$(date +%Y%m%d-%H%M%S)

# 이미지 빌드 (latest 및 타임스탬프 태그)
docker build -f prod.Dockerfile \
  --platform linux/amd64 \
  --target aio \
  -t cr.lfin.kr/hoppscotch:latest \
  -t cr.lfin.kr/hoppscotch:${BUILD_TAG} .
```

**옵션 설명:**
- `-f prod.Dockerfile`: 프로덕션 Dockerfile 사용
- `--platform linux/amd64`: AMD64 아키텍처 타겟
- `--target aio`: All-in-One 빌드 스테이지
- `-t cr.lfin.kr/hoppscotch:latest`: latest 태그
- `-t cr.lfin.kr/hoppscotch:${BUILD_TAG}`: 타임스탬프 태그 (예: 20250123-143022)

### 2. 이미지 푸시

```bash
# latest 태그 푸시
docker push cr.lfin.kr/hoppscotch:latest

# 타임스탬프 태그 푸시
docker push cr.lfin.kr/hoppscotch:${BUILD_TAG}

# 또는 한 번에
docker push cr.lfin.kr/hoppscotch --all-tags
```

**푸시된 태그 확인:**
```bash
echo "Pushed tags: latest, ${BUILD_TAG}"
```

### 3. 서버 배포

**서버 접속 후:**

```bash
# 이미지 pull
docker pull cr.lfin.kr/hoppscotch:latest

# Docker Compose 실행
cd ~/servers
docker-compose up -d
```

**또는 한 번에:**

```bash
docker-compose pull
docker-compose up -d
```

## 서비스 구성

### hoppscotch-aio
- **포트:** 5000
- **이미지:** cr.lfin.kr/hoppscotch:latest
- **의존성:** PostgreSQL DB
- **실행:** Prisma 마이그레이션 → 애플리케이션 시작

### hoppscotch-db
- **데이터베이스:** PostgreSQL 15
- **포트:** 5432
- **인증:**
  - User: `postgres`
  - Password: `testpass`
  - Database: `hoppscotch`
- **볼륨:** `hoppscotch-db` (데이터 영속성)

## 환경 변수 설정

서버의 `~/servers/.env` 파일에 필요한 환경 변수 설정:

```bash
# 애플리케이션 설정
# (필요한 환경 변수를 추가하세요)
```

## 유용한 명령어

### 로그 확인
```bash
docker-compose logs -f hoppscotch-aio
docker-compose logs -f hoppscotch-db
```

### 서비스 재시작
```bash
docker-compose restart hoppscotch-aio
```

### 서비스 중지
```bash
docker-compose down
```

### 데이터 포함 완전 삭제
```bash
docker-compose down -v
```

### 컨테이너 상태 확인
```bash
docker-compose ps
```

## 트러블슈팅

### DB 연결 실패
- DB 헬스체크 확인: `docker-compose ps`
- DB 로그 확인: `docker-compose logs hoppscotch-db`
- 연결 문자열 확인: `DATABASE_URL` 환경 변수

### 마이그레이션 실패
- 수동 마이그레이션 실행:
  ```bash
  docker-compose exec hoppscotch-aio pnpx prisma migrate deploy
  ```

### 포트 충돌
- 기존 프로세스 확인: `lsof -i :5000` 또는 `lsof -i :5432`
- docker-compose.yml에서 포트 변경

## 접속 정보

- **애플리케이션:** http://[서버IP]:5000
- **데이터베이스:** [서버IP]:5432 (외부 접속 필요 시)