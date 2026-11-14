// 새 일: 발명이 그 고장에 들어온 뒤에야 일자리가 생긴다. 일자리 게시판(jobs.js)의 틀을 그대로 쓴다.
// 발명 전에는 places를 비워 두어 목록에 보이지 않게 한다(앞날을 미리 보여 주지 않으려고). 매달과 불러올 때 맞춘다.
import { HOOKS } from '../hooks.js';
import { registerJob, WORK } from '../jobs.js';
import { invented } from './state.js';

const ERA_JOBS = {
  lamplighter: {
    need: 'streetlamp', at: ['harfen', 'leocast'],
    def: { name: '등석 점등꾼', skill: null, stat: 'sen', stat2: 'agi', wage: [2, 3, 4, 5],
      lines: ['해 질 녘 긴 장대를 들고 광장의 등석 가로등을 하나씩 깨웠다. 푸른 불이 차례로 켜졌다.', '새벽에 꺼진 등석을 갈아 끼웠다. 다 닳은 돌은 손바닥 위에서 모래처럼 부서졌다.', '밤 장사꾼들이 내 등불을 따라 좌판을 폈다. 내가 늦으면 시장도 늦게 열린다.', '술 취한 건달이 가로등을 걷어찼다. 깨진 등석을 주우며 경비대를 불렀다.'] },
  },
  millhand: {
    need: 'manamill', at: ['harfen'], need2: { erngrind: ['ern'] },
    def: { name: '마석 방아지기', skill: 'farming', stat: 'str', wage: [2, 3, 5, 6], risk: 0.015,
      lines: ['마석 방아의 웅웅거리는 소리 속에서 하루 종일 밀 자루를 부었다. 귀가 먹먹했다.', '닳은 마석을 갈아 끼웠다. 손끝이 저릿했다.', '방아가 멈췄다. 마석 틈에 낀 쥐를 꺼냈다. 주인은 쥐가 아니라 마석 값을 걱정했다.', '맷돌로 사흘 걸릴 밀을 반나절에 빻았다. 옛 방앗간 주인이 문간에서 그걸 지켜보았다.'] },
  },
  typesetter: {
    need: 'press', at: ['leocast', 'harfen'],
    def: { name: '인쇄소 식자공', skill: 'letters', stat: 'int', wage: [3, 5, 7, 10], req: (g) => (g.player.skills.letters >= 20 ? null : '글과 학문 20'),
      lines: ['납 활자를 거꾸로 읽으며 한 줄씩 짰다. 거울 속 글자들이 손에 익어 간다.', '경전 삼백 부를 찍었다. 잉크 냄새가 옷에 배어 빠지지 않는다.', '누가 맡겼는지 모를 소책자를 찍었다. 주인은 읽지 말라고 했다. 읽었다.', '오탈자 하나 때문에 한 판을 통째로 다시 짰다.'] },
  },
  signalman: {
    need: 'signal', at: ['harfen', 'leocast'],
    def: { name: '전신탑 신호수', skill: 'letters', stat: 'int', stat2: 'sen', wage: [4, 6, 8, 11], req: (g) => (g.player.skills.letters >= 28 || g.player.skills.magic >= 15 ? null : '글과 학문 28 또는 마법 15'),
      lines: ['탑 꼭대기에서 푸른 빛의 깜빡임을 받아 적었다. 왕도의 소식이 반나절 만에 하르펜에 닿았다.', '안개 낀 날은 빛이 보이지 않는다. 하루 종일 하늘만 보았다.', '전쟁 소식이 들어오는 날은 손이 떨렸다. 받아 적은 이름들이 전사자 명단이었다.', '잘못 읽은 신호 하나로 상인 둘이 큰돈을 날렸다는 말을 들었다. 그 뒤로 두 번씩 확인한다.'] },
  },
  artificer: {
    need: 'forge', at: ['harfen', 'leocast'],
    def: { name: '마도구 수리공', skill: 'smithing', stat: 'int', wage: [4, 6, 9, 13], req: (g) => (g.player.skills.smithing >= 15 || g.player.skills.magic >= 20 ? null : '대장일 15 또는 마법 20'),
      lines: ['꺼진 등석 등잔 열두 개를 고쳤다. 대개는 마석이 아니라 금 간 틀이 문제였다.', '귀족 집 온석 화로를 뜯었다. 안에서 타 버린 술식 판을 꺼내 새로 새겼다.', '마석 방아의 굴대가 부러졌다. 밤새 쇠를 달궜다.', '고칠 수 없는 물건을 들고 온 노인에게 고칠 수 없다고 말하는 게 가장 어려웠다.'] },
  },
  carter: {
    need: 'ironcart', at: ['leocast', 'harfen'],
    def: { name: '쇠수레 몰이꾼', skill: null, stat: 'agi', stat2: 'wil', wage: [4, 5, 7, 9], risk: 0.025,
      lines: ['말 없는 쇠수레를 몰고 왕도 대로를 달렸다. 사람들이 길을 비켰다. 비키지 않는 마부도 있었다.', '마석로가 과열되어 길 한복판에 섰다. 짐을 지키며 식기를 기다렸다.', '실직한 마부가 수레에 돌을 던졌다. 그 사람의 얼굴을 오래 잊지 못했다.', '하루에 짐을 세 번 실어 날랐다. 말이었으면 한 번이었다.'] },
  },
  orderly: {
    need: 'healstone', at: ['leocast', 'harfen'],
    def: { name: '구빈원 간병인', skill: 'herbs', stat: 'wil', stat2: 'cha', wage: [2, 4, 6, 8],
      lines: ['정화석 붕대를 갈아 주었다. 곪지 않은 상처는 냄새가 다르다.', '열병 환자 셋을 밤새 지켰다. 아침에 둘이 눈을 떴다.', '정화석 가루가 떨어진 날, 예전처럼 끓인 물과 기도만으로 버텼다.', '다리를 잃은 병사가 고맙다는 말 대신 욕을 했다. 그래도 붕대는 갈았다.'] },
  },
};

for (const [id, j] of Object.entries(ERA_JOBS)) registerJob(id, { ...j.def, places: [] });

// 지금 판의 발명에 맞춰 일자리를 열고 닫는다
export function syncEraJobs(g) {
  for (const [id, j] of Object.entries(ERA_JOBS)) {
    const w = WORK[id];
    if (!w) continue;
    const open = new Set();
    if (invented(g, j.need)) j.at.forEach((p) => open.add(p));
    for (const [inv, ps] of Object.entries(j.need2 ?? {})) if (invented(g, inv)) ps.forEach((p) => open.add(p));
    w.places.length = 0;
    w.places.push(...open);
  }
}
export const eraJobIds = Object.keys(ERA_JOBS);
export const ERA_JOB_NEED = Object.fromEntries(Object.entries(ERA_JOBS).map(([id, j]) => [id, j.need]));

HOOKS.newGame.push((g) => syncEraJobs(g));
HOOKS.migrate.push((g) => syncEraJobs(g));
HOOKS.endOfMonth.push((g) => syncEraJobs(g));
