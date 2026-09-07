# 대신고 1-4반 내신 자료 공유 사이트

Next.js(App Router) + TypeScript + Tailwind CSS + Prisma(SQLite)로 만든 학급 내신 자료 공유/거래 사이트입니다.

## 핵심 기능

- `@dshs.kr` 이메일로만 가입 가능, 가입 시 축하 포인트 지급
- 자료 등록(과목/단원수/출처학원/설명/파일) → 관리자 승인 후 공개
- 승인 시 관리자가 열람 포인트(구매가)와 등록자 보상 포인트를 확정
- 구매 전에는 제목/과목/출처만 공개, 구매(포인트 차감) 후 설명·파일 열람/다운로드 가능
- 마이페이지에서 구매/등록 내역과 포인트 내역 확인
- 관리자 페이지: 통계 대시보드, 자료 승인/반려, 회원 검색·포인트 조정·권한/정지 관리

## 기술 스택 및 설계 메모

- **DB**: Prisma ORM + SQLite. Prisma 7부터 `datasource.url`을 스키마에 쓰지 않고, 런타임에는 `@prisma/adapter-better-sqlite3` 드라이버 어댑터를 `PrismaClient`에 주입합니다(`src/lib/db.ts`). CLI(migrate 등)는 `prisma7.config.ts`가 `.env`의 `DATABASE_URL`을 읽습니다.
- **인증**: 자체 구현 세션(별도 인증 라이브러리 미사용). 비밀번호는 Node 내장 `crypto.scryptSync`로 해싱, 세션은 `crypto.randomBytes` 기반 opaque 토큰을 DB에 저장하고 쿠키에는 토큰 값만 둡니다.
- **파일 업로드**: Route Handler의 `request.formData()`로 실제 multipart 업로드를 받아 `storage/uploads/`에 저장합니다. SQLite 파일과 업로드 파일을 `storage/` 한 폴더 아래 모아둔 이유는 배포 플랫폼(Render 등)에서 영구 디스크를 하나만 마운트해도 둘 다 보존되게 하기 위함입니다.
- **CSRF 완화**: 상태를 바꾸는 모든 요청은 클라이언트가 `X-Requested-With: dshs-share` 헤더를 붙여야 통과합니다(`src/lib/api-client.ts`가 자동으로 붙임).

## 로컬 개발

```bash
npm install
cp .env.example .env      # 값 확인/수정
npx prisma migrate dev    # 최초 1회, storage/data/dshs-share.db 생성
npm run dev
```

`.env`에서 반드시 확인할 값:

- `ALLOWED_EMAIL_DOMAINS` – 회원가입 허용 이메일 도메인 (기본 `dshs.kr`)
- `ADMIN_EMAILS` – 이 이메일로 가입하면 자동으로 관리자 권한 부여 (선생님 이메일 등록)
- `SIGNUP_BONUS_POINTS` – 가입 축하 포인트 (기본 300)
- `SESSION_SECRET` – 배포 시 반드시 무작위 문자열로 교체
- `DATABASE_URL` – 기본 `file:./storage/data/dshs-share.db`

기존에 가입된 계정을 나중에 관리자로 만들고 싶다면 다음 중 하나를 사용하세요.

- `ADMIN_EMAILS`에 이메일을 추가하고 서버 재시작 후 그 계정으로 **다시 가입**(신규 계정인 경우)
- 이미 가입된 계정이라면 배포 환경의 콘솔/쉘에서 `npm run make-admin -- <이메일>` 실행
- 또는 `npx prisma studio`로 해당 사용자의 `role`을 `admin`으로 직접 변경

## 배포 시 꼭 알아야 할 것 — 영구 디스크 필요

이 앱은 SQLite 파일과 업로드된 파일을 `storage/` 폴더(**로컬 디스크**)에 저장합니다. 따라서:

- **Vercel 같은 서버리스 플랫폼에는 이 구조 그대로 배포하면 안 됩니다.** 요청마다 파일시스템이 초기화되는 환경이라 DB와 업로드 파일이 계속 사라집니다.
- **Render, Railway, Fly.io, 또는 일반 VPS(Node 22+ 설치)처럼 영구 디스크(Persistent Disk/Volume)를 붙일 수 있는 플랫폼**을 사용하세요. `storage/` 폴더 전체를 영구 디스크에 마운트해야 재배포/재시작해도 데이터가 남습니다.
- 빌드: `npm install && npx prisma migrate deploy && npm run build`
- 실행: `npm run start` (기본 포트는 `PORT` 환경변수, 없으면 3000)

### Render로 배포하기 (권장, Blueprint 사용)

저장소 루트의 `render.yaml`이 서비스/영구 디스크/환경변수를 대부분 자동으로 설정합니다.

> **Render 무료(Free) 플랜은 영구 디스크를 지원하지 않습니다.** 이 앱은 SQLite 파일과 업로드 파일을 디스크에 저장하는 구조라 무료 플랜에서는 재시작할 때마다 데이터가 사라집니다. `render.yaml`은 **Starter 플랜(월 $7)** 을 사용하도록 설정되어 있으며, 결제 수단(신용/체크카드) 등록이 필요합니다.

1. [render.com](https://render.com)에 가입/로그인 (GitHub 계정으로 로그인하면 편함)
2. 대시보드에서 **New +** → **Blueprint** 선택
3. 이 프로젝트가 올라간 GitHub 저장소를 연결 (Render의 GitHub App 권한 승인 필요)
4. Render가 `render.yaml`을 읽고 서비스 구성을 미리 보여줌 → 아래 값만 채우고 **Apply**
   - `ADMIN_EMAILS` – 선생님 이메일 주소 (쉼표로 여러 개 가능)
   - `SESSION_SECRET`은 `render.yaml`에서 자동 생성되므로 따로 입력할 필요 없음
5. 첫 배포가 끝나면 Render가 준 URL(`https://xxxx.onrender.com`)로 접속해 정상 동작 확인
6. 이후 GitHub의 `main` 브랜치에 push할 때마다 자동 재배포됨

무료 플랜은 일정 시간 요청이 없으면 서버가 잠들었다가 다음 요청에서 다시 깨어나 몇십 초 지연이 생길 수 있습니다(학급 규모 트래픽에는 문제 없음).

## 남아있는 설계상의 선택 (필요시 수정 지점)

- **포인트 지급은 자동 산정이 아니라 관리자 승인 시 1회 확정**됩니다. 자동 추천값은 `src/lib/points.ts`의 `suggestedPoints()`가 계산하며, 관리자가 승인 모달에서 최종 값을 직접 입력합니다.
- 자료가 여러 번 팔려도 등록자는 승인 시 받은 보상 포인트 외에 추가 수익을 받지 않습니다. 판매마다 등록자에게 일부를 배분하고 싶다면 `src/lib/materials.ts`의 `purchaseMaterial()`을 수정하세요.
- 실제 학교 메일함 소유 인증(SMTP)은 구현하지 않았습니다. 이메일 도메인 형식만 검사합니다.
- 허용 업로드 확장자는 `src/lib/uploads.ts`, 과목 목록은 `src/lib/subjects.ts`에서 관리합니다.
