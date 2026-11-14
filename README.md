# 에른 마을 시험판

마신이 봉인된 지 500년 뒤의 대륙에서, 아기로 태어나 한 달씩 삶을 살아가는 판타지 인생 게임의 첫 시험판입니다.

## 실행

```
npm run build      # dist/play.html 한 파일로 묶기 (브라우저로 바로 열림)
npm start          # 개발용: http://localhost:5173 에서 index.html 실행
npm test           # 브라우저 없이 25년을 자동으로 돌려 보는 점검
```

## 구조

- `src/data.js` 집안, 이름, 직업, 성격 같은 데이터
- `src/game.js` 게임 상태, 한 달 진행, 성장 규칙
- `src/actions.js` 한 달에 고르는 행동
- `src/events.js` 사건과 선택지
- `src/npc.js` 마을 사람 생성과 한 달 시뮬레이션
- `src/save.js` 저장/불러오기 (한 번뿐인 삶, 자유 모드)
- `src/ui.js` 화면

설계 문서: 세계 설정, 게임 시스템 설계, 전투 아이디어 모음 (Claude Docs).
