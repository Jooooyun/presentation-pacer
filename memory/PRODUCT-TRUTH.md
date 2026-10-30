# 공개 설명의 근거

기록일: 2026-10-30. 2026-10-11 원본과 2026-10-14 테스트용 보존본을 기반으로 작성했습니다.

## Implemented

| 내용 | 상태·시점 | 근거 |
| --- | --- | --- |
| 전체 대본 표시·현재 구절 강조·수동 보정·자동 스크롤 | wired; 10/11 코드 보존 | app.js의 render, mark, seek, consume |
| 최근 진행 속도 및 목표 시간 대비 차이 | wired; 10/14 합성 음성 관찰 | app.js의 tick; docs/images/pace-fast.png, pace-slow.png |
| 발표 시작 시각 | wired; 10/14 화면 관찰 | app.js의 begin; index.html의 startClock |
| 실시간 음성 연결 | 10/11 합성 음성 및 10/14 마이크 연결 관찰 | bridge.cjs의 connect; app.js의 connect 및 nativeEvent |
| 인식 텍스트와 대본 위치 비교 | implemented; 10/11 원본 | matcher.js의 normalize, match, plannedTime |
| 음성 파일 저장 기능을 넣지 않은 브리지 | 10/14 코드 관찰 | bridge.cjs는 이벤트 전달·정적 파일 읽기만 수행; app.js는 원격 WebRTC 트랙 전송 |
| 종료 시 마이크·연결 정리 | implemented; 10/14 보존 코드 | app.js의 cleanup, finish, pagehide; bridge.cjs의 stop |

## Not implemented / 확인하지 않은 범위

- 최신 Codex 버전·다른 설치 방식에 대한 호환성 검증.
- 사람의 장시간 발표 정확도·지연에 대한 정량 성능 평가.
- PPT 자동 페이지 넘김과 범용 대본 편집 UI.
- 공개본에서 합성 음성 실제 연결 점검용 WAV의 재배포.

## Permanently excluded

영구 제외로 확정된 기능은 없습니다.

## 이력 재구성

원본 소스 파일의 최종 수정 시각(Asia/Seoul):

- 10월 11일 스냅샷: app.js 21:35:27, index.html 21:33:00, matcher.js 21:11:30, bridge.cjs 21:15:11.
- 10월 14일 스냅샷: app.js/index.html 17:34:51, bridge.cjs/matcher.js/script-data.js 17:23:03.

원본 개인 발표 대본과 사용자별 실행 경로는 공개하지 않았습니다. 스냅샷의 커밋 작성일은 해당 코드 묶음의 마지막 수정 시각이며, 공개용 정리는 오늘 별도 커밋입니다.
