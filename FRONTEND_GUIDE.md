# 프론트엔드 연동 가이드 (배포 서버 기준)

**Base URL**
- `https://hypsometric-katabolically-kelsie.ngrok-free.dev`

**인증 방식**
- 세션 쿠키 기반 (`cheongeum.sid`)
- 로그인 성공 시 쿠키가 저장되어 이후 요청에 자동 포함
- 프론트 요청 시 `credentials: "include"` 필수

**권장 응답 포맷**
```json
{ "success": true, "data": {}, "error": null }
```

---

## 1) 로그인

**POST** `/api/auth/register`
```json
{ "email": "a@b.com", "password": "pw1234", "name": "홍길동", "phone": "01012345678" }
```

---

## 1-1) 로그인

**POST** `/api/auth/login`
```json
{ "email": "a@b.com", "password": "pw" }
```

**응답**
```json
{ "success": true, "data": { "userId": 1 }, "error": null }
```

---

## 2) 내 정보

**GET** `/api/auth/me`

---

## 3) 숏폼 퀴즈

**문제 조회**
- **GET** `/api/training/shorts`
- Query: `categoryCode?`, `limit?` (default 5, max 20)

**세션 시작**
- **POST** `/api/training/shorts/sessions`
```json
{ "totalRounds": 5 }
```

**답안 제출**
- **POST** `/api/training/shorts/attempts`
```json
{ "sessionId": 101, "roundNo": 1, "shortId": 12, "userChoice": "real", "timeMs": 8200 }
```

**세션 종료**
- **POST** `/api/training/shorts/sessions/:id/finish`

---

## 4) 롱폼(시뮬레이터 연동)

**시나리오 목록**
- **GET** `/api/training/scenarios`

**세션 시작**
- **POST** `/api/training/longs/sessions`
```json
{ "scenarioId": 1 }
```

**대화 메시지**
- **POST** `/api/training/longs/messages`
```json
{
  "sessionId": 55,
  "turnNo": 1,
  "inputMode": "text",
  "text": "무슨 소리세요?",
  "userAudioUrl": null,
  "meta": { "sttConfidence": null, "durationMs": null },
  "userProfileJson": "{\"user_profile\": {\"name\": \"김철수\", \"scenario_type\": \"loan\"}}"
}
```

**응답 (시뮬레이터 연동 기준)**
```json
{
  "success": true,
  "data": {
    "aiText": "...",
    "aiAudioUrl": null,
    "aiAudioBase64": "base64...",
    "status": "ongoing",
    "flags": [],
    "messageIds": { "user": 1, "ai": 2 }
  },
  "error": null
}
```

**통화 종료 처리**
- `status === "finished"` 인 경우 입력 종료 처리

**세션 종료**
- **POST** `/api/training/longs/sessions/:id/finish`

---

## 5) 딥페이크 체험

**목소리 딥페이크 생성**
- **POST** `/api/experience/voice-clone`
- Content-Type: `multipart/form-data`
- Form Field:
  - `voiceFile` (파일)
  - `phishingText` (텍스트)

**응답**
```json
{
  "success": true,
  "data": {
    "audioBase64": "base64...",
    "mimeType": "audio/mpeg"
  },
  "error": null
}
```

**녹음 기록 생성**
- **POST** `/api/experience/records`
```json
{ "originalUrl": "https://...", "note": "..." }
```

**클론 생성**
- **POST** `/api/experience/clones`
```json
{ "recordId": 1, "clonedUrl": "https://...", "model": "elevenlabs" }
```

**내 녹음 목록**
- **GET** `/api/experience/records`

---

## 6) 피드백/리포트

**피드백 요약**
- **GET** `/api/feedback/summary`

**주간 리포트**
- **GET** `/api/reports/weekly?mode=short|long`

---

## 7) 음성 업로드 (S3 방식)

**POST** `/api/uploads/voice`
- Content-Type: `multipart/form-data`
- Form Field: `voiceFile`

**응답**
```json
{
  "success": true,
  "data": {
    "url": "https://.../uploads/voice/2026/02/08/123-voice.mp3",
    "key": "uploads/voice/2026/02/08/123-voice.mp3",
    "bucket": "your-bucket",
    "size": 123456,
    "mimeType": "audio/mpeg"
  },
  "error": null
}
```

---

## 8) 요청 예시 (fetch)

```ts
const res = await fetch("https://cheongeum.onrender.com/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
```
