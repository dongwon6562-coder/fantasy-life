// 사냥꾼의 깊이: 덫, 가죽, 큰 짐승.
// - 덫을 놓아 두면 달마다 가죽이 걸린다. 가죽은 쟁여 두었다가 팔고, 겨울과 털가죽 시장에서 값이 오른다.
// - 일하다 보면 큰 짐승(큰 멧돼지·동굴곰·마력에 물든 곰)의 흔적을 만난다. 장면 'voc_beast'.
// - 이 일로만 가는 길: 흰 수사슴(잡거나 살려 보내거나), 잿빛 큰곰 사냥.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { WORK } from '../jobs.js';
import { PLACES } from '../places.js';
import { gainSkill, gainStat } from '../game.js';
import { FOES } from '../adventure/combat.js';
import { runFight } from '../adventure/fight.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, tired, stress, up, gains, note } from '../adventure/core.js';
import { season } from '../craft/core.js';
import { V, addFame, skillV, takePath, hasPath, pickOf, Q } from './core.js';
import { vocWork } from './jobs.js';
import { PATHS } from './paths.js';

Object.assign(FOES, {
  great_boar: { name: '엄니 긴 큰 멧돼지', pow: 24, bite: true },
  cave_bear: { name: '동굴곰', pow: 36, bite: true },
  ash_bear: { name: '잿빛 큰곰', pow: 105, bite: true },
});
export const BEASTS = {
  great_boar: { min: 20, pelt: 2, pay: [10, 18], intro: '진흙 웅덩이에 깊게 파인 발굽 자국. 나무 밑동이 엄니에 갈려 하얗게 벗겨져 있다. 덤불이 갈라지며 등이 산만 한 멧돼지가 콧김을 뿜었다.' },
  cave_bear: { min: 35, pelt: 3, pay: [18, 30], intro: '바위 틈 굴 앞에 뜯긴 사슴 뼈가 쌓여 있다. 굴 안에서 낮게 울리는 소리가 났다. 동굴곰이 몸을 일으켰다. 일어선 키가 내 두 배다.' },
  mana_bear: { min: 50, pelt: 4, pay: [30, 50], intro: '숲의 나무들이 이상하게 뒤틀려 있다. 이끼가 희미하게 빛난다. 그 한가운데, 털끝마다 마력이 일렁이는 곰이 나를 보고 있었다.' },
  ash_bear: { min: 55, pelt: 6, pay: [80, 120], legend: true, intro: '사냥꾼들이 삼대째 쫓았다는 잿빛 큰곰. 등에는 옛 화살촉이 박힌 채 살이 덮여 있다. 놈은 도망치지 않았다. 처음부터 나를 기다리고 있었다.' },
};

/* ---------- 사냥꾼의 일하러 가기 ---------- */
if (WORK.hunter) WORK.hunter.work = (g, rng) => vocWork(g, rng, 'hunter', {
  pre(g, rng) {
    const s = season(g);
    const out = { wageMul: s === '겨울' ? 0.8 : s === '가을' ? 1.2 : 1 };
    if (s === '겨울') out.line = pickOf(rng, ['눈 위의 발자국을 따라 하루를 걸었다. 겨울 숲은 소리가 없다.', '얼어붙은 개울가에서 수달 굴을 찾았다.', '눈보라를 피해 바위 밑에서 밤을 지냈다. 새벽에 늑대 울음이 가까웠다.']);
    return out;
  },
  post(g, rng) {
    const v = V(g);
    gainSkill(g, 'hunting', 0.3, 'agi');
    let t = '';
    if (rng.chance(0.3 + skillV(g, 'hunting') / 250)) { v.pelts += 1; t = '쓸 만한 가죽 한 장을 벗겼다.'; }
    if (rng.chance(0.02 * (1 - skillV(g, 'hunting') / 140))) { g.player.injuries.push({ name: pickOf(rng, ['멧돼지 엄니에 찢긴 허벅지', '비탈에서 구른 발목', '덫에 물린 손']), months: 2 }); t += ' 일을 하다 다쳤다.'; }
    if (!sceneQueued(g, 'voc_beast') && rng.chance(0.05)) {
      const pool = Object.entries(BEASTS).filter(([, b]) => !b.legend && skillV(g, 'hunting') >= b.min);
      if (pool.length) { const [id] = pickOf(rng, pool); queueScene(g, 'voc_beast', { beast: id }); t += ' 돌아오는 길에 큰 짐승의 흔적을 보았다.'; }
    }
    return t.trim();
  },
});

/* ---------- 덫 놓기 ---------- */
const MAX_TRAPS = 6;
ACTIONS.push({
  id: 'voc_traps', name: '덫 놓기', icon: 'wander',
  desc: '숲길에 덫을 놓는다. 달마다 걸린 짐승의 가죽을 거둔다. 덫은 부서지거나 도둑맞기도 한다.',
  available: (g) => isAdult(g) && !traveling(g) && L(g).job?.id === 'hunter' && WORK.hunter.places.includes(L(g).place) && V(g).traps < MAX_TRAPS,
  run(g, rng) {
    const v = V(g);
    const n = Math.min(MAX_TRAPS - v.traps, 2 + (skillV(g, 'hunting') >= 40 ? 1 : 0));
    const cost = n * 2;
    if (g.player.money < cost) return `덫을 만들 쇠줄과 미끼 살 돈(은화 ${cost}닢)이 없었다.`;
    g.player.money -= cost;
    v.traps += n; v.trapAt = L(g).place;
    tired(g, 10);
    const k = gainSkill(g, 'hunting', 0.9, 'sen');
    const st = gainStat(g, 'sen', 0.3);
    return `${pickOf(rng, ['짐승이 다니는 길목마다', '개울가 진흙 위의 발자국을 따라', '여우 굴 근처 덤불 속에'])} 덫 ${n}개를 놓았다. 지금 놓인 덫은 ${v.traps}개다.${gains([up('사냥', k), up('감각', st)])}`;
  },
});

/* ---------- 가죽 팔기 ---------- */
export function peltPrice(g) {
  const s = season(g);
  const pl = L(g).place;
  let p = 4 * (s === '겨울' ? 1.4 : s === '가을' ? 1.15 : s === '여름' ? 0.8 : 1);
  if (pl === 'fur') p *= 1.5;
  p *= PLACES[pl]?.wage ?? 1;
  p *= 0.85 + (g.player.skills.trade ?? 0) / 200 + skillV(g, 'hunting') / 300;
  return Math.max(2, Math.round(p));
}
ACTIONS.push({
  id: 'voc_pelts', name: '가죽 팔기', icon: 'coin',
  desc: '쟁여 둔 가죽을 장터에 내다 판다. 겨울과 털가죽 시장에서 값이 좋다.',
  available: (g) => isAdult(g) && !traveling(g) && V(g).pelts > 0 && (PLACES[L(g).place]?.house ?? 0) > 0,
  run(g, rng) {
    const v = V(g);
    const each = peltPrice(g);
    const n = v.pelts;
    const sum = each * n;
    v.pelts = 0;
    g.player.money += sum;
    tired(g, 4);
    const k = gainSkill(g, 'trade', 0.3, 'cha');
    return `가죽 ${n}장을 한 장에 은화 ${each}닢씩, 모두 ${sum}닢에 넘겼다.${L(g).place === 'fur' ? ' 털가죽 시장의 수인 상인들은 가죽 결을 손끝으로 쓸어 보고 값을 불렀다.' : ''}${gains([up('장사', k)])}`;
  },
});

/* ---------- 덫 거두기 (달마다) ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const v = V(g);
  if (!v.traps) return;
  // 덫을 놓은 고장을 오래 떠나 있으면 거둘 수 없다: 짐승이 덫째 끌고 가거나 남이 가져간다
  const away = L(g).place !== v.trapAt;
  let caught = 0;
  for (let i = 0; i < v.traps; i++) if (!away && rng.chance(0.12 + skillV(g, 'hunting') / 600 + (hasPath(g, 'stag_spared') ? 0.06 : 0) - (hasPath(g, 'stag_slain') ? 0.05 : 0))) caught++;
  v.pelts = Math.min(40, v.pelts + caught);
  let lost = 0;
  for (let i = 0; i < v.traps; i++) if (rng.chance(away ? 0.35 : 0.08)) lost++;
  v.traps -= lost;
  v.lastCatch = caught;
});

/* ---------- 큰 짐승 ---------- */
defineScene('voc_beast', {
  need: (g, s) => !!BEASTS[s.beast],
  title: (g, s) => (BEASTS[s.beast].legend ? '잿빛 큰곰' : '큰 짐승'),
  text: (g, s) => BEASTS[s.beast].intro,
  choices: (g, s) => [
    { label: '활을 들고 정면으로 맞선다', key: 'charge' },
    { label: '바람을 등지고 숨어서 노린다', key: 'ambush' },
    ...(BEASTS[s.beast].legend ? [] : [{ label: '물러난다. 오늘은 아니다', key: 'avoid' }]),
  ],
  resolve(g, rng, s, key) {
    const b = BEASTS[s.beast];
    const name = FOES[s.beast].name;
    if (key === 'avoid') { stress(g, 3); return `${name}에게서 눈을 떼지 않고 천천히 뒷걸음질 쳤다. 숲 가장자리까지 나와서야 숨을 쉬었다.`; }
    // 사냥꾼은 칼이 아니라 활과 짐승을 읽는 눈으로 싸운다: 싸우는 동안만 무기 값에 사냥 솜씨를 얹는다
    const bonus = Math.round(skillV(g, 'hunting') * 0.45 + (key === 'ambush' ? skillV(g, 'hunting') * 0.15 : 0));
    const gear = L(g).gear;
    const w0 = gear.weapon;
    gear.weapon = (w0 ?? 0) + bonus;
    let r;
    try { r = runFight(g, rng, { enc: { unit: s.beast, count: 1, leader: null }, reward: {} }, key, { short: true }); } finally { if (w0 == null) delete gear.weapon; else gear.weapon = w0; }
    const won = r.outcome === 'win' || r.outcome === 'overwhelm';
    if (!won) {
      if (b.legend) { stress(g, 12); return `${r.text} 잿빛 큰곰은 숲으로 사라졌다. 놈은 나를 죽이지 않았다. 다음을 기다리는 것 같았다.`; }
      return r.text;
    }
    const v = V(g);
    const pay = rng.int(b.pay[0], b.pay[1]);
    g.player.money += pay;
    v.pelts += b.pelt;
    v.trophies.push(name);
    addFame(g, 'hunter', b.legend ? 25 : 5);
    gainSkill(g, 'hunting', b.legend ? 3 : 1.5, 'sen');
    L(g).renown += b.legend ? 8 : 2;
    if (b.legend) {
      takePath(g, 'beast_slayer', `${g.player.name}, 삼대를 이어 온 잿빛 큰곰을 쓰러뜨리다.`, 0);
      note(g, '잿빛 큰곰을 쓰러뜨렸다.');
      return `${r.text} 놈이 쓰러지자 숲이 조용해졌다. 등에 박혀 있던 옛 화살촉을 뽑았다. 할아버지 세대의 사냥꾼 것이었다. 고장 사람들이 큰곰의 가죽을 보러 몰려왔다. (은화 ${pay}닢, 가죽 ${b.pelt}장)`;
    }
    note(g, `${Q(name, '을/를')} 사냥했다.`);
    return `${r.text} ${Q(name, '을/를')} 쓰러뜨렸다. 엄니와 발톱은 주점 벽에 걸렸다. (은화 ${pay}닢, 가죽 ${b.pelt}장)`;
  },
});

/* ---------- 이 일로만 가는 길 ---------- */
PATHS.push(
  {
    id: 'white_stag', voc: 'hunter',
    when: (g) => skillV(g, 'hunting') >= 40 && !hasPath(g, 'stag_spared') && !hasPath(g, 'stag_slain'),
    title: '흰 수사슴',
    text: () => '안개 낀 새벽, 시위를 당긴 채 숨을 멈췄다. 이십 걸음 앞에 눈처럼 흰 수사슴이 서 있다. 노인들은 숲의 주인이라 했다. 그 가죽 한 장이면 귀족들이 은화 수백 닢을 낸다. 사슴은 달아나지 않고 나를 보았다.',
    choices: () => [{ label: '쏜다', key: 'shoot' }, { label: '시위를 늦춘다', key: 'spare' }],
    resolve(g, rng, key) {
      if (key === 'shoot') {
        g.player.money += 180; stress(g, 12); L(g).renown += 2;
        takePath(g, 'stag_slain', `${g.player.name}, 흰 수사슴을 쏘다.`, 0);
        note(g, '흰 수사슴을 쏘았다.');
        return '화살은 빗나가지 않았다. 흰 가죽은 은화 180닢에 팔렸다. 그해 겨울, 덫에 걸리는 짐승이 눈에 띄게 줄었다. 노인들은 내 얼굴을 똑바로 보지 않았다.';
      }
      takePath(g, 'stag_spared', null, 1);
      stress(g, -10);
      note(g, '흰 수사슴을 쏘지 않고 보냈다.');
      return '시위를 늦췄다. 사슴은 고개를 한 번 숙이고 안개 속으로 걸어갔다. 그 뒤로 내 덫에는 이상하리만큼 짐승이 잘 걸렸다.';
    },
  },
  {
    id: 'beast_slayer', voc: 'hunter',
    when: (g) => skillV(g, 'hunting') >= 55 && !V(g).trophies.includes(FOES.ash_bear.name),
    title: '삼대의 곰',
    text: () => '마을 노인들이 찾아왔다. 잿빛 큰곰이 다시 내려왔다. 아이 하나가 물려 갔다. 할아버지의 할아버지 때부터 이 고장 사냥꾼들이 놈을 쫓았고, 아무도 돌아오지 못했다.',
    choices: () => [{ label: '놈을 쫓는다', key: 'hunt' }, { label: '살아 있는 사냥꾼이 낫다', key: 'no' }],
    resolve(g) {
      queueScene(g, 'voc_beast', { beast: 'ash_bear' }, { first: true });
      return '화살촉을 새로 갈고 활시위를 바꿨다. 사흘 치 마른 고기를 챙겨 산으로 들어갔다.';
    },
  },
);

