// 큰 인물 곁에서 하는 일: 스승에게 배우기. 그리고 큰 인물들의 이야기가 생활 글에 묻어나게.
import { ACTIONS } from '../actions.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import * as T from '../narrative/actions-text.js';
import { LG, legend, here } from './state.js';
import { L } from '../adventure/core.js';

const masterHere = (g) => LG(g).list.find((x) => x.alive && x.role === 'master' && x.at === here(g)) ?? null;
const LESSON = {
  leon: [
    '검왕은 하루 종일 한 동작만 시켰다. 내려베기. 해가 질 무렵 그가 처음으로 입을 열었다. "이제 반쯤 칼 같군."',
    '"검기는 마력이 아니다. 마음이 칼끝까지 가는 것이다." 스승은 그렇게 말하고 내 목검을 맨손으로 쳐 냈다.',
    '스승과 나란히 서서 눈 내리는 연무장을 보았다. 아무것도 하지 않았다. 그날 배운 것이 가장 많았다.',
    '스승의 옛 상처 이야기를 들었다. 검왕도 한때는 지는 법부터 배웠다고 했다.',
  ],
};
ACTIONS.push({
  id: 'legend_lesson', name: '스승에게 배우기', icon: 'sword',
  desc: '대륙에 이름난 스승 곁에서 배운다. 스승이 지금 이곳에 있을 때만 할 수 있다.',
  available: (g) => playerAge(g) >= 12 && !L(g).travel && !!masterHere(g),
  run(g, rng) {
    const m = masterHere(g);
    if (!m) return '스승은 이미 길을 떠난 뒤였다. 남긴 쪽지에는 "혼자 해 봐라"라고만 적혀 있었다.';
    m.bond = Math.min(100, m.bond + 1);
    g.player.fatigue = Math.min(100, g.player.fatigue + 14);
    const k = gainSkill(g, 'sword', 2.2, 'agi');
    gainStat(g, 'wil', 0.3);
    const lines = LESSON[m.id] ?? ['스승 곁에서 하루를 보냈다. 말보다 몸으로 배웠다.'];
    return `${rng.pick(lines)} (검술 +${k.toFixed(1)})`;
  },
});

// 생활 글에 십강의 소문이 섞인다
const lg = (fn) => (c, g) => !!g.legends && fn(g);
const aliveL = (id) => lg((g) => !!legend(g, id)?.alive);
const deadL = (id) => lg((g) => legend(g, id)?.alive === false);
T.WANDER_NOBODY.push(
  { when: aliveL('leon'), bands: ['young', 'adult'], t: '광장 구석에서 아이들이 목검을 들고 검왕 놀이를 하고 있었다. 저마다 자기가 레온 발하르트라고 우겼다.' },
  { when: deadL('magnus'), t: '세레니아에서 온 상인이 새 협회장 이야기를 했다. 마그누스가 죽은 뒤로 탑마다 문을 닫고 서로를 의심한다고 했다.' },
  { when: deadL('leon'), t: '여관 벽에 검왕의 초상이 걸려 있었다. 검은 띠가 둘러져 있었다. 제국 사람이 아닌데도 다들 모자를 벗었다.' },
  { when: lg((g) => !!g.legends.playerRank), t: '술집에서 누가 십강 이야기를 했다. 내 이름이 나오자 옆자리 사람이 나를 힐끗 보았다. 모르는 척 잔을 비웠다.' },
);
T.REST.push(
  { when: lg((g) => g.legends.list.some((x) => x.role === 'master' && x.alive)), t: '잠들기 전 스승의 목소리를 떠올렸다. "칼은 생각보다 먼저 가야 한다." 머리로는 알겠는데 몸이 따라오지 않는다.' },
  { when: lg((g) => g.legends.list.some((x) => x.role === 'foe' && x.alive)), t: '밤중에 몇 번이나 깨어 문고리를 확인했다. 큰 이름에게 원한을 산다는 건 이런 것이다.' },
);
