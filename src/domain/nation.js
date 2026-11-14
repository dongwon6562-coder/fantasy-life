// 잊힌 땅에 나라 세우기. 북쪽 끝, 마신 전쟁 때 멸망한 에스텔라 왕국의 폐허.
// 원정대를 꾸려 넉 달 길을 가고, 망령 군단을 무찌르면 그 땅에 깃발을 꽂는다.
// 나라는 주군이 없다. 공물도 없지만, 지켜 줄 이도 없다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { me } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, isAdult, traveling } from '../adventure/core.js';
import { PLACES, leaveJob } from '../places.js';
import { D, NATION_KIND, grantFief } from './state.js';
import { queueBattle, BATTLE_OUTS } from '../war/battle.js';

export const NATION_PLACE = 'estella';
export const PIONEER_COST = 600;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 나라를 세운 뒤에는 누구나 그 땅으로 갈 수 있다
PLACES[NATION_PLACE].open = (g) => D(g)?.place === NATION_PLACE;

const funds = (g) => g.player.money + Math.max(0, D(g)?.treasury ?? 0);
export const canPioneer = (g) => isAdult(g) && !traveling(g) && ['verden', 'leocast'].includes(L(g).place)
  && !L(g).expedition && !D(g)?.nation && (L(g).renown >= 50 || !!D(g)) && funds(g) >= PIONEER_COST;

ACTIONS.push({
  id: 'pioneer',
  name: '잊힌 땅 원정',
  icon: 'travel',
  desc: '용병과 개척민을 모아 북쪽 끝 에스텔라 폐허로 간다. 망령을 몰아내면 그 땅에 내 나라를 세운다.',
  available: (g) => canPioneer(g) && !sceneQueued(g, 'pioneer'),
  run(g) { queueScene(g, 'pioneer'); return '북쪽 지도를 펼쳐 놓고 밤늦도록 들여다보았다.'; },
});

defineScene('pioneer', {
  title: () => '잊힌 땅으로',
  text: (g) => {
    const d = D(g);
    return `에스텔라. 오백 년 전 마신의 군세에 무너진 북부 왕국의 수도. 지금은 어느 나라의 지도에도 주인이 없다. 무너진 왕궁에는 아직 망국의 기사왕이 언데드가 되어 버티고 있다고 한다. 용병과 개척민, 넉 달 치 식량을 모으는 데 은화 ${PIONEER_COST}닢이 든다.${d ? ` 이기면 ${J(d.name, '은/는')} 주군에게 돌려주게 된다.` : ''}`;
  },
  choices: (g) => [
    ...(funds(g) >= PIONEER_COST ? [{ label: `원정대를 꾸려 떠난다 (은화 ${PIONEER_COST}닢)`, key: 'go' }] : []),
    { label: '아직은 아니다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    if (key !== 'go' || funds(g) < PIONEER_COST) return '지도를 다시 말아 두었다.';
    const life = L(g);
    const d = D(g);
    let cost = PIONEER_COST;
    if (d) { const t = Math.min(Math.max(0, d.treasury), cost); d.treasury -= t; cost -= t; }
    g.player.money -= cost;
    const troops = 40 + Math.round(Math.min(40, life.renown / 3)) + (d ? Math.round(d.garrison / 2) : 0);
    if (d) d.garrison -= Math.round(d.garrison / 2);
    life.expedition = { troops, q: 40 + Math.round((d?.quality ?? 30) / 5), from: life.place, tries: 0 };
    if (life.job) leaveJob(g, '북쪽 원정을 떠나며 일을 그만두었다.');
    life.travel = { to: NATION_PLACE, left: 4, from: life.place };
    note(g, `원정대 ${troops}명을 이끌고 잊힌 땅 에스텔라로 떠났다.`);
    chron(g, `${g.player.name}, 원정대를 이끌고 잊힌 땅으로 떠나다.`);
    return `용병 ${troops}명과 개척민 가족들, 짐마차 스무 대. 성문을 나서는 행렬을 사람들이 오래 지켜보았다. 돌아오지 못한 원정대 이야기는 누구나 안다.`;
  },
});

// 도착하면 망령 군단과 싸운다
function queueEstella(g, rng) {
  const ex = L(g).expedition;
  queueBattle(g, {
    title: '에스텔라 왕궁 앞',
    intro: ex.tries ? '다시 무너진 성문 앞에 섰다. 망령들은 지치지 않는다.' : '눈 덮인 폐허 한가운데, 무너진 왕궁의 창마다 푸른 불이 켜졌다. 녹슨 갑옷들이 일어선다. 그 앞에 왕관을 쓴 해골 기사가 말없이 칼을 뽑았다.',
    enemy: { key: 'undead', troops: rng.int(70, 100) - ex.tries * 12 },
    context: 'estella',
    reward: { renown: 10 },
    big: true,
    extra: [{ label: '원정을 접고 돌아간다', key: 'retreat' }],
  }, { first: true });
  ex.tries += 1;
}

function endExpedition(g, text) {
  const life = L(g);
  const ex = life.expedition;
  life.expedition = null;
  life.travel = { to: ex?.from ?? 'verden', left: 4, from: life.place };
  note(g, text);
}

BATTLE_OUTS.estella = {
  win: (g) => {
    L(g).expedition.won = true;
    return '기사왕의 해골이 무너지자 왕궁의 푸른 불이 하나씩 꺼졌다. 오백 년 만에 에스텔라의 하늘에 아침이 왔다.';
  },
  lose: (g, rng) => {
    const ex = L(g).expedition;
    if (ex.troops < 20 || ex.tries >= 3) { endExpedition(g, '에스텔라 원정에 실패하고 돌아섰다.'); return '남은 병사로는 더 버틸 수 없었다. 부상자를 짐마차에 싣고 남쪽으로 돌아섰다. 잊힌 땅은 잊힌 채로 남았다.'; }
    return '성문 앞에서 물러났다. 병사들이 모닥불 곁에서 말이 없다. 다시 칠지는 다음 달에 정한다.';
  },
  draw: () => '해가 지자 망령들이 폐허로 물러났다. 우리도 진지로 돌아왔다.',
  other: (g) => { endExpedition(g, '에스텔라 원정을 접고 돌아섰다.'); return '깃발을 내리고 남쪽으로 돌아섰다. 아무도 나를 탓하지 않았다. 아무도 내 눈을 보지도 않았다.'; },
};

/* ---------- 나라 이름 짓기 ---------- */
const NAMES = (g) => {
  const ln = me(g)?.lastName;
  return ['새 에스텔라', '노르덴', '잿빛 변경', ...(ln ? [ln] : ['새벽 언덕'])];
};

defineScene('nation_name', {
  title: () => '깃발을 꽂다',
  text: () => '폐허의 광장에 개척민들이 모였다. 무너진 분수대 위에 올라섰다. 이 땅을 무엇이라 부를지, 오늘 정하는 이름이 연대기에 남는다.',
  choices: (g) => NAMES(g).map((n) => ({ label: n, key: n })),
  resolve(g, rng, s, key) {
    const life = L(g);
    const ex = life.expedition;
    const d = grantFief(g, { name: key, place: NATION_PLACE, liege: null, nation: true, pop: 110 + rng.int(0, 50) }, '잊힌 땅에 깃발을 꽂았다.');
    d.garrison = ex?.troops ?? 20; d.quality = ex?.q ?? 40; d.treasury = 60; d.morale = 65; d.order = 40;
    life.expedition = null;
    life.home = 'own';
    life.renown += 10;
    chron(g, `${g.player.name}, 잊힌 땅 에스텔라의 폐허 위에 ${J(`${key} ${NATION_KIND[0]}`, '을/를')} 세우다.`, 120);
    return `${J(key, '이/가')} 태어났다. 개척민들이 환호했고, 누군가 낡은 천에 서툴게 문장을 그려 장대에 매달았다. 주군도, 공물도, 지켜 줄 군대도 없다. 이제부터는 모두 내 몫이다.`;
  },
});

/* ---------- 매달 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const life = L(g);
  const ex = life.expedition;
  // 원정대가 폐허에 닿았다
  if (ex && !life.travel && life.place === NATION_PLACE && !sceneQueued(g, 'battle') && !sceneQueued(g, 'nation_name')) {
    if (ex.won) queueScene(g, 'nation_name', {}, { first: true });
    else queueEstella(g, rng);
    return;
  }
  // 원정대가 다른 곳에 있다면 (불러온 저장 등) 정리한다
  if (ex && !life.travel && life.place !== NATION_PLACE) life.expedition = null;
  const d = D(g);
  if (!d?.nation) return;
  // 잊힌 땅의 위협: 남은 망령, 산맥의 오크, 마물
  const present = life.place === d.place && !life.travel;
  // 소문을 듣고 개척민이 모여든다
  if (d.morale > 50 && rng.chance(0.4)) d.pop += rng.int(1, 4 + d.rank * 2);
  if (rng.chance(0.05 + (g.realm?.monsters ?? 30) / 1200) && !sceneQueued(g, 'battle')) {
    const key = rng.pick(['undead', 'orcs', 'monsters', 'monsters']);
    const troops = Math.round(rng.int(15, 35) * (1 + d.rank * 0.5));
    if (present && isAdult(g)) {
      queueBattle(g, { title: '변경의 습격', intro: key === 'undead' ? '폐허 깊은 곳에서 아직 잠들지 못한 망령들이 기어 나왔다.' : key === 'orcs' ? '북쪽 산맥에서 오크 전단이 내려왔다. 북소리가 골짜기를 울린다.' : '눈 덮인 숲에서 마력에 물든 짐승들이 떼를 지어 내려왔다.', enemy: { key, troops }, context: 'defense', reward: { renown: 3, treasury: rng.int(10, 30) } }, { first: true });
    } else {
      const ok = rng.chance(clamp(d.garrison / (troops * 2), 0.1, 0.9));
      if (ok) g.news.unshift({ text: `${d.name}에서 전갈이 왔다. 습격을 막아 냈다고 한다.`, rel: 90 });
      else { d.pop = Math.max(30, d.pop - rng.int(5, 15)); d.garrison = Math.max(0, d.garrison - rng.int(2, 6)); d.morale = clamp(d.morale - 6, 0, 100); g.news.unshift({ text: `${J(d.name, '이/가')} 습격을 받았다. 영주가 없는 사이 마을 한쪽이 불탔다.`, rel: 100 }); }
    }
  }
});
