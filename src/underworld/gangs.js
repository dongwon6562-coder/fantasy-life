// 지하 조직: 하르펜의 "회색 쥐", 왕도의 "검은 장갑".
// 들어가기 → 조직 일로 신임 쌓기 → 승급 → 간부 → 두목 자리를 노리기. 밀고하면 조직이 쫓는다.
import { J, join, up, gains } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { me, playerAge, gainStat, rngOf } from '../game.js';
import { living, byId, ageYears, fullName, has, makePerson, kill } from '../npc.js';
import { JOBS } from '../data.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { PLACES, placePerson } from '../places.js';
import { runFight } from '../adventure/fight.js';
import { nudge } from '../world.js';
import { remember } from '../relations.js';
import {
  crimeState, reportCrime, addNotoriety, notoriety, setGangProtect, assassinate, here, isJailed, craftOf,
} from '../crime.js';

Object.assign(JOBS, {
  rat_boss: { name: '회색 쥐의 우두머리', skill: null, income: 8 },
  gang_member: { name: '뒷골목 패거리', skill: null, income: 3 },
});

export const GANGS = {
  rats: {
    name: '회색 쥐', place: 'harfen',
    ranks: ['심부름꾼', '좀도둑', '해결사', '간부', '우두머리'],
    rep: [0, 15, 45, 110],
    desc: '하르펜 남문 밖 빈민가의 도둑 패. 소매치기와 장물아비, 밀수꾼이 모였다. 검은 장갑에 상납한다는 소문이 있다.',
    bossRole: 'rat_boss',
  },
  glove: {
    name: '검은 장갑', place: 'leocast',
    ranks: ['심부름꾼', '장갑', '해결사', '간부', '두목'],
    rep: [0, 25, 70, 160],
    desc: '왕도 성 밖 빈민가를 쥔 범죄 조직. 경비대장도, 귀족도 그들에게 빚이 있다. 표식은 검은 가죽 장갑 한 짝.',
    bossRole: 'gang_boss',
  },
};
const gangHere = (g) => Object.entries(GANGS).find(([, x]) => x.place === here(g)) ?? null;
const C = crimeState;
export const myGang = (g) => (C(g).gang ? { id: C(g).gang.id, ...GANGS[C(g).gang.id], m: C(g).gang } : null);
export function gangTitle(g) {
  const x = myGang(g);
  return x ? `${x.name} ${x.ranks[x.m.rank]}` : null;
}
// 조직이 쥔 고장에서는 경비대도 눈감아 준다 (crime.js의 형기·뇌물에 반영)
setGangProtect((g, place) => {
  const x = myGang(g);
  if (!x) return false;
  if (x.place === place) return true;
  return x.id === 'glove' && x.m.rank >= 2; // 검은 장갑의 해결사 이상은 어디서나 연줄이 있다
});

// 두목: 왕도는 장소 사람(places.js), 하르펜은 처음 필요할 때 만든다
function bossOf(g, id) {
  const G = GANGS[id];
  const c = C(g);
  c.bosses ??= {};
  let b = byId(g, c.bosses[id]) ?? placePerson(g, G.place, G.bossRole);
  if (!b || !b.alive) {
    if (c.gang?.id === id && c.gang.rank === 4) return null; // 내가 두목이다
    b = makePerson(rngOf(g), {
      sex: 'm', ageMonths: 40 * 12, job: G.bossRole, traits: ['cruel', 'greedy'],
    });
    b.place = G.place; b.role = G.bossRole; b.wealth = 300; b.skill = 55;
    g.people.push(b);
  }
  c.bosses[id] = b.id;
  return b;
}

// ---------- 들어가기 ----------
ACTIONS.push({
  id: 'gang_seek',
  name: '뒷골목 수소문',
  icon: 'wander',
  crime: true,
  desc: '빈민가 선술집과 장물아비를 찾아다니며 이 고장의 조직에 줄을 대 본다.',
  available: (g) => playerAge(g) >= 14 && !isJailed(g) && !L(g).travel && !!gangHere(g) && !C(g).gang
    && !C(g).hostile[gangHere(g)[0]] && !sceneQueued(g, 'gang_offer'),
  run(g, rng) {
    if (C(g).gang || !gangHere(g)) return '';
    const [id, G] = gangHere(g);
    tired(g, 5);
    const c = C(g);
    const known = notoriety(g) + craftOf(g) + (c.contacts ?? 0) * 6;
    if (known >= 18 || rng.chance(0.25)) {
      queueScene(g, 'gang_offer', { id });
      return `${G.place === 'leocast' ? '성 밖 빈민가' : '남문 밖 선술집'}에서 이름을 흘리고 다녔다. 저녁 무렵, 소매에 ${id === 'glove' ? '검은 장갑' : '회색 천'}을 감은 사내가 맞은편에 앉았다.`;
    }
    return '빈민가를 돌며 이것저것 물었다. 사람들은 눈을 피했다. 아직 아무도 나를 모른다. 그들 눈에 나는 그저 수상한 외지인이다.';
  },
});

defineScene('gang_offer', {
  title: (g, s) => GANGS[s.id].name,
  text: (g, s) => {
    const G = GANGS[s.id];
    const b = bossOf(g, s.id);
    return `${G.desc} 연락책은 길게 말하지 않았다. "${b ? `${b.name} 형님이` : '위에서'} 너를 봤다. 쓸 만하면 쓰고, 아니면 잊는다. 첫 일은 간단하다. 시장 북쪽 창고에서 상자 하나를 옮기면 된다. 안을 열어 보지만 않으면."`;
  },
  choices: () => [
    { label: '받아들인다', key: 'join' },
    { label: '조건을 묻는다', key: 'terms' },
    { label: '거절한다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const G = GANGS[s.id];
    const c = C(g);
    if (key === 'no') return '"현명한 건지, 겁쟁이인 건지." 연락책은 술값을 내고 사라졌다. 이 골목에서 다시 줄을 대기는 쉽지 않을 것이다.';
    if (key === 'terms') {
      return '"벌이는 일한 만큼. 붙잡히면 우리가 빼낼 수도 있고, 아닐 수도 있다. 입을 열면 강에서 떠오른다. 그게 조건이다." 연락책은 다음에 다시 묻겠다며 일어섰다. (수소문하면 다시 만날 수 있다)';
    }
    c.gang = { id: s.id, rank: 0, rep: 0, since: g.date.year };
    me(g).job = me(g).job === 'idle' || !me(g).job ? 'gang_member' : me(g).job;
    note(g, `${G.name}에 들어갔다.`);
    addNotoriety(g, 2);
    return `상자는 무거웠고, 안에서 쇳소리가 났다. 묻지 않았다. 일이 끝나자 연락책이 손등에 ${s.id === 'glove' ? '검은 가죽 장갑 한 짝' : '쥐 이빨 모양의 낙인'}을 쥐여 주었다. "이제 너도 ${G.name}의 식구다."`;
  },
});

// ---------- 조직 일 ----------
const JOBS0 = [
  ['망보기', '골목 어귀에서 망을 봤다. 안에서 무슨 일이 벌어지는지는 묻지 않는 게 일이다.', 2, 3],
  ['심부름', '봉인된 편지를 세 곳에 날랐다. 받는 사람마다 얼굴이 굳었다.', 2, 3],
  ['장물 나르기', '훔친 은그릇을 자루에 담아 장물아비에게 넘겼다. 무게만큼 몫이 떨어졌다.', 3, 4],
];
const JOBS1 = [
  ['보호비 걷기', (x) => `${x}의 가게들을 돌며 '보호비'를 걷었다. 늙은 빵집 주인은 동전을 세며 손을 떨었다.`, 5, 5, 'extortion'],
  ['밀수', () => '밤배로 들어온 마석 상자를 성벽 밑 수로로 옮겼다. 세관 도장이 없는 물건이다.', 6, 5, 'smuggling'],
  ['빚 받기', () => '도박빚을 진 사내의 집을 찾아갔다. 문을 부수기 전에 그가 돈을 내놓았다. 대개는 그렇다.', 5, 5, 'extortion'],
];
const JOBS2 = [
  ['구역 다툼', null, 0, 8, 'assault'],
  ['청부', null, 0, 10, 'murder'],
  ['큰 밀수', () => '경비대장에게 뇌물을 쥐여 주고, 마차 다섯 대 분량의 밀수품을 성문으로 통과시켰다. 오늘 밤 이 고장의 법은 우리 편이었다.', 14, 7, 'smuggling'],
];

ACTIONS.push({
  id: 'gang_job',
  name: '조직 일',
  icon: 'coin',
  crime: true,
  desc: '조직이 맡기는 일을 한다. 신임이 쌓이면 자리가 오르고, 일도 벌이도 커진다. 위험도 함께.',
  available: (g) => !!C(g).gang && !isJailed(g) && !L(g).travel && GANGS[C(g).gang.id].place === here(g),
  run(g, rng) {
    if (!C(g).gang) return '';
    const c = C(g);
    const x = myGang(g);
    tired(g, 10);
    const k = gainStat(g, 'agi', 0.3);
    const cr = C(g);
    cr.craft = Math.min(100, cr.craft + 0.8 * (1 - cr.craft / 120));
    let text, money = 0, rep = 0, crime = null;
    if (x.m.rank >= 4) {
      // 두목: 조직 전체를 굴린다
      money = rng.int(15, 30) * (x.id === 'glove' ? 1.5 : 1) | 0;
      rep = 0;
      text = rng.pick([
        '간부들을 불러 이번 달 몫을 나눴다. 불평하는 자는 없었다. 지난달 불평한 자가 어떻게 되었는지 다들 안다.',
        '경비대장과 여관 뒷방에서 술잔을 기울였다. 서로 웃었지만 탁자 밑에 칼이 있다는 걸 둘 다 알았다.',
        '새로 들어온 아이들의 얼굴을 하나씩 보았다. 그중 하나는 예전의 나를 닮았다.',
      ]);
      if (x.id === 'glove') nudge(g, 'blackGlove', 0.3);
    } else if (x.m.rank >= 2 && rng.chance(0.45)) {
      const [name] = rng.pick(JOBS2);
      if (name === '구역 다툼') { queueScene(g, 'gang_turf', { id: x.id }); return join(`${x.name}의 구역에 다른 패거리가 기웃거린다는 보고가 들어왔다. 칼을 챙겼다.`, gains(up('민첩', k))); }
      if (name === '청부') {
        const v = contractTarget(g, rng);
        if (v) { queueScene(g, 'gang_contract', { id: x.id, target: v.id, pay: rng.int(30, 70) }); return join('간부가 봉투 하나를 탁자 위로 밀었다. 안에는 이름 하나와 은화가 들어 있었다.', gains(up('민첩', k))); }
      }
      const j = JOBS2[2];
      [text, money, rep, crime] = [j[1](), j[2], j[3], j[4]];
    } else if (x.m.rank >= 1) {
      const j = rng.pick(JOBS1);
      [text, money, rep, crime] = [j[1](PLACES[x.place].name), j[2], j[3], j[4]];
    } else {
      const j = rng.pick(JOBS0);
      [text, money, rep] = [j[1], j[2], j[3]];
    }
    money = Math.round(money * (0.8 + rng.next() * 0.5));
    g.player.money += money;
    c.gang.rep += rep;
    let extra = '';
    if (crime && rng.chance(0.12)) { reportCrime(g, crime, here(g), { mult: 0.5 }); extra = '돌아오는 길에 경비병 하나가 내 얼굴을 오래 쳐다보았다.'; }
    const promo = checkPromotion(g);
    return join(text, money ? `몫은 은화 ${money}닢.` : '', extra, promo, gains(up('민첩', k)));
  },
});

function checkPromotion(g) {
  const c = C(g);
  const x = myGang(g);
  const next = x.m.rank + 1;
  if (next > 3 || c.gang.rep < x.rep[next]) {
    if (x.m.rank === 3 && c.gang.rep >= x.rep[3] + 60 && !sceneQueued(g, 'gang_takeover')) queueScene(g, 'gang_takeover', { id: x.id });
    return '';
  }
  c.gang.rank = next;
  addNotoriety(g, 3);
  note(g, `${x.name}의 ${J(x.ranks[next], '이/가')} 되었다.`);
  if (next === 3) chron(g, `${g.player.name}, ${x.name}의 간부가 되다.`);
  return [
    '',
    `연락책이 이제부터 너는 ${x.ranks[1]}이라고 했다. 몫이 커졌다.`,
    `${x.name}의 ${J(x.ranks[2], '이/가')} 되었다. 이제 손에 피를 묻히는 일도 맡는다.`,
    `${x.name}의 간부 자리에 앉았다. 구역 하나가 내 것이 되었다. 아래에서 올려다보는 눈들 중 몇은 내 자리를 노린다.`,
  ][next];
}

// 청부 대상: 이 고장의 어른 중 식구와 조직 두목이 아닌 사람
function contractTarget(g, rng) {
  const c = C(g);
  const cands = living(g).filter((p) => !p.isPlayer && (p.place ?? 'ern') === here(g) && ageYears(p) >= 18
    && !g.player.familyIds.includes(p.id) && p.id !== c.bosses?.[c.gang.id]);
  return cands.length ? rng.pick(cands) : null;
}

defineScene('gang_contract', {
  title: () => '청부',
  text: (g, s) => {
    const v = byId(g, s.target);
    const who = v ? `${fullName(v)}, ${ageYears(v)}살, ${JOBS[v.job]?.name ?? v.job}.` : '이름은 지워져 있었다.';
    const known = v?.known ? ` 아는 얼굴이다.${v.affection >= 30 ? ' 꽤 가까운 사이다.' : ''}` : '';
    return `봉투 속 쪽지: ${who}${known} 은화 ${s.pay}닢. 이유는 적혀 있지 않았다. 이 일에 이유는 묻지 않는 법이다.`;
  },
  choices: () => [
    { label: '맡는다', key: 'do' },
    { label: '돈만 받고 그 사람을 몰래 빼돌린다', key: 'warn' },
    { label: '거절한다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const v = byId(g, s.target);
    const c = C(g);
    if (!v || !v.alive) return '쪽지의 이름은 이미 다른 누군가가 지웠다.';
    if (key === 'no') { c.gang.rep = Math.max(0, c.gang.rep - 8); return '봉투를 밀어냈다. 간부는 말없이 봉투를 거둬 갔다. 다른 누군가가 맡을 것이다. 내 신임은 조금 깎였다.'; }
    if (key === 'warn') {
      v.away = true; v.known = true;
      remember(g, v, '목숨을 구해 주었다', 1, { tag: 'saved', log: `${g.player.name}의 귀띔으로 목숨을 건져 고장을 떠났다.` });
      if (rng.chance(0.35)) {
        c.hostile[c.gang.id] = true;
        c.gang = null;
        note(g, '청부를 어기고 표적을 빼돌린 것이 조직에 들통났다.');
        return `${v.name}에게 밤중에 귀띔했다. 그는 그날로 고장을 떠났다. 사흘 뒤, 간부가 나를 찾아왔다. 표적을 놓아준 걸 알고 있었다. 이제 조직이 나를 쫓는다.`;
      }
      g.player.money += Math.floor(s.pay / 2);
      return `${v.name}에게 밤중에 귀띔했다. 그는 그날로 짐을 싸 사라졌다. 간부에게는 시체를 강에 버렸다고 말했다. 선금 은화 ${Math.floor(s.pay / 2)}닢만 받았다.`;
    }
    const before = c.murders;
    const out = assassinate(g, rng, v, { contract: s.id });
    if (c.murders > before) {
      g.player.money += s.pay;
      if (c.gang) c.gang.rep += 15;
      return join(out, `간부가 남은 은화를 세어 주었다. 모두 ${s.pay}닢.`, c.gang ? checkPromotion(g) : '');
    }
    if (c.gang) c.gang.rep = Math.max(0, c.gang.rep - 10);
    return join(out, '간부는 실패한 자에게 두 번 맡기지 않는다.');
  },
});

defineScene('gang_turf', {
  title: () => '구역 다툼',
  text: (g, s) => `${GANGS[s.id].name}의 구역 술집에 다른 패거리 다섯이 들이닥쳐 자리를 차지했다. 우리 쪽 아이들이 나를 본다. 여기서 물러서면 내일은 이 거리가 저들 것이다.`,
  choices: () => [
    { label: '앞장서서 친다', key: 'charge' },
    { label: '뒷골목에서 기다렸다 덮친다', key: 'ambush' },
    { label: '말로 몫을 나눈다', key: 'talk' },
  ],
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'talk') {
      if (g.player.stats.cha + notoriety(g) / 2 > 35 + rng.int(-10, 10)) { if (c.gang) c.gang.rep += 6; return '칼 대신 술잔을 들었다. 서쪽 두 골목은 저들 몫, 나머지는 우리 몫. 피 한 방울 없이 끝났다. 위에서도 나쁘게 보지 않았다.'; }
      if (c.gang) c.gang.rep = Math.max(0, c.gang.rep - 6);
      return '말을 꺼내자 저쪽 우두머리가 비웃었다. 우리 쪽 아이들의 눈빛이 식는 게 보였다. 이 거리에서 말은 칼보다 약하다.';
    }
    const enc = { unit: 'thug', count: rng.int(3, 5), leader: rng.chance(0.5) ? 'bandit_chief' : null, leaderName: '다른 패거리 우두머리' };
    const r = runFight(g, rng, { enc, reward: {} }, key, { short: true });
    if (r.outcome === 'win' || r.outcome === 'overwhelm') {
      if (c.gang) c.gang.rep += 12;
      reportCrime(g, 'assault', here(g), { mult: 0.6 });
      return join(r.text, '그날 밤 이후 그 술집에 다른 패거리는 얼씬하지 않았다.', c.gang ? checkPromotion(g) : '');
    }
    if (c.gang) c.gang.rep = Math.max(0, c.gang.rep - 8);
    return join(r.text, '구역 하나를 잃었다. 위에서는 이 일을 기억할 것이다.');
  },
});

// ---------- 두목 자리 ----------
defineScene('gang_takeover', {
  title: () => '두목의 자리',
  text: (g, s) => {
    const b = bossOf(g, s.id);
    return `간부 몇이 밤늦게 찾아왔다. "${b ? J(b.name, '은/는') : '두목은'} 늙었고, 욕심이 많아졌어. 아래 애들은 당신을 따르고 싶어 해." 그들의 눈은 내가 아니라 두목의 자리를 보고 있었다. 실패하면 강에서 떠오르는 건 나다.`;
  },
  choices: () => [
    { label: '두목에게 칼을 겨눈다', key: 'fight' },
    { label: '독을 쓴다', key: 'poison' },
    { label: '아직은 때가 아니다', key: 'wait' },
  ],
  resolve(g, rng, s, key) {
    const c = C(g);
    const G = GANGS[s.id];
    const b = bossOf(g, s.id);
    if (key === 'wait' || !c.gang) { if (c.gang) c.gang.rep -= 20; return '간부들을 돌려보냈다. 그들 중 누가 두목에게 이 밤의 일을 말할지, 아니면 다른 누구를 찾아갈지 모른다.'; }
    if (key === 'poison') {
      if (b && g.player.skills.herbs >= 30 && rng.chance(0.55 + craftOf(g) / 300)) return becomeBoss(g, s.id, b, `${b.name}의 술잔에 독을 탔다. 다음 날 아침 그는 일어나지 못했다. 장례식에서 내가 관을 들었다.`);
      c.hostile[s.id] = true; c.gang = null;
      g.player.injuries.push({ name: '등에 꽂힌 칼자국', months: 4 });
      return `${b ? b.name : '두목'}은 잔을 들지 않았다. 대신 내 뒤에 선 자들에게 고개를 끄덕였다. 피투성이로 수로를 기어 도망쳤다. 이제 ${J(G.name, '이/가')} 나를 쫓는다.`;
    }
    const enc = { unit: 'thug', count: rng.int(2, 3), leader: 'bandit_chief', leaderName: b ? b.name : '두목', leaderPow: s.id === 'glove' ? 50 : 38 };
    const r = runFight(g, rng, { enc, reward: {} }, 'charge', { short: true });
    if (r.outcome === 'win' || r.outcome === 'overwhelm') return join(r.text, becomeBoss(g, s.id, b, ''));
    c.hostile[s.id] = true; c.gang = null;
    return join(r.text, `반란은 실패했다. 살아서 빠져나온 것만으로 기적이다. ${J(G.name, '은/는')} 배신자를 잊지 않는다.`);
  },
});
function becomeBoss(g, id, b, lead) {
  const c = C(g);
  const G = GANGS[id];
  if (b?.alive) kill(g, b, '아랫사람의 칼');
  c.gang.rank = 4;
  addNotoriety(g, 12);
  note(g, `${G.name}의 ${J(G.ranks[4], '이/가')} 되었다.`);
  chron(g, `${g.player.name}, ${G.name}의 ${J(G.ranks[4], '이/가')} 되다.`);
  if (id === 'glove') nudge(g, 'blackGlove', 5);
  return join(lead, `다음 날 아침, 간부들이 하나씩 와서 고개를 숙였다. 이제 ${J(G.name, '은/는')} 내 것이다. ${PLACES[G.place].name}의 밤이 내 손안에 있다.`);
}

// ---------- 밀고와 떠나기 ----------
ACTIONS.push(
  {
    id: 'gang_inform',
    name: '조직을 밀고하기',
    icon: 'shield',
    desc: '경비대에 조직의 은신처와 장부를 넘긴다. 내 죄는 씻기고 이름값이 오르지만, 조직은 배신자를 잊지 않는다.',
    available: (g) => !!C(g).gang && C(g).gang.rank < 4 && !isJailed(g) && GANGS[C(g).gang.id].place === here(g),
    run(g, rng) {
    if (!C(g).gang) return '';
      const c = C(g);
      const G = GANGS[c.gang.id];
      const id = c.gang.id;
      for (const r of c.record) if (r.place === G.place) r.paid = true;
      c.heat[G.place] = 0; c.bounty[G.place] = 0;
      c.hostile[id] = true;
      c.gang = null;
      L(g).renown = (L(g).renown ?? 0) + 4;
      addNotoriety(g, -6);
      if (id === 'glove') nudge(g, 'blackGlove', -6);
      note(g, `${J(G.name, '을/를')} 경비대에 밀고했다.`);
      chron(g, `${G.name}의 은신처가 경비대에 털리다. 밀고자가 있었다는 소문이 돈다.`);
      stress(g, 15);
      return `경비대 조장에게 장부와 은신처 지도를 넘겼다. 그날 밤 횃불이 빈민가를 덮었다. 잡혀가는 얼굴 중에 낯익은 얼굴이 많았다. 내 죄는 장부에서 지워졌다. 조직의 장부에는 새로 적혔을 것이다.`;
    },
  },
  {
    id: 'gang_leave',
    name: '조직에서 손 떼기',
    icon: 'travel',
    desc: '조직 일을 그만둔다. 아래 자리라면 놓아주겠지만, 많이 아는 자는 쉽게 놓아주지 않는다.',
    available: (g) => !!C(g).gang && C(g).gang.rank < 4 && !isJailed(g),
    run(g, rng) {
    if (!C(g).gang) return '';
      const c = C(g);
      const G = GANGS[c.gang.id];
      const risky = c.gang.rank >= 2 && rng.chance(0.5);
      if (risky) c.hostile[c.gang.id] = true;
      c.gang = null;
      if (me(g).job === 'gang_member') me(g).job = 'idle';
      note(g, `${G.name}에서 손을 뗐다.`);
      return risky
        ? `손을 떼겠다고 하자 간부가 웃었다. "네가 아는 게 너무 많아." 그날부터 밤길에 발소리가 따라붙었다.`
        : `연락책은 어깨를 으쓱했다. "입만 다물면 된다. 언젠가 다시 보자고." 그 말이 인사인지 경고인지 알 수 없었다.`;
    },
  },
);

// ---------- 한 달마다: 조직의 손길 ----------
HOOKS.afterNpc.push((g, rng, sim) => {
  const c = C(g);
  if (g.over) return;
  // 감옥에서 조직이 빼내 준다
  if (c.jailed && c.gang && c.gang.rank >= 1 && rng.chance(0.08 + c.gang.rank * 0.04) && !sceneQueued(g, 'gang_rescue')) {
    queueScene(g, 'gang_rescue', { id: c.gang.id }, { first: true });
  }
  if (c.jailed || L(g).travel) return;
  // 등 돌린 조직의 앙갚음
  for (const id of Object.keys(c.hostile)) {
    if (!c.hostile[id]) continue;
    const near = GANGS[id].place === here(g) ? 0.08 : id === 'glove' ? 0.025 : 0.01;
    if (rng.chance(near) && !sceneQueued(g, 'thugs')) { queueScene(g, 'thugs', { id: null, why: 'gang', gang: id }); break; }
  }
  // 이름이 알려진 자에게 조직이 먼저 손을 내민다
  const gh = gangHere(g);
  if (gh && !c.gang && !c.hostile[gh[0]] && playerAge(g) >= 14 && (notoriety(g) >= 12 || (c.contacts ?? 0) >= 3) && rng.chance(0.06) && !sceneQueued(g, 'gang_offer')) {
    queueScene(g, 'gang_offer', { id: gh[0] });
  }
  // 조직 소식
  if (rng.chance(0.04)) {
    const [id, G] = rng.pick(Object.entries(GANGS));
    sim.push({ text: rng.pick([
      `${PLACES[G.place].name}에서 ${G.name} 패거리끼리 칼부림이 났다는 소문이 들린다.`,
      `${PLACES[G.place].name} 경비대가 ${G.name}의 장물 창고를 덮쳤다고 한다. 잡힌 건 아랫사람 몇뿐이었다.`,
      `${G.name}에게 보호비를 내지 않던 가게가 불탔다고 한다.`,
    ]), who: [], weight: c.gang?.id === id ? 6 : 1 });
  }
});

defineScene('gang_rescue', {
  title: () => '창살 너머의 손',
  text: (g, s) => `한밤중, 간수가 감방 문을 열어 놓고 등을 돌렸다. 복도 끝에서 ${s.id === 'glove' ? '검은 장갑을 낀' : '회색 두건을 쓴'} 손이 까딱였다. ${GANGS[s.id].name}이다. 따라 나가면 조직에 큰 빚을 지는 것이다.`,
  choices: () => [{ label: '따라 나간다', key: 'go' }, { label: '남아서 형기를 채운다', key: 'stay' }],
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'stay' || !c.jailed) return '고개를 저었다. 손은 말없이 사라졌다. 조직은 거절도 기억한다.';
    const place = c.jailed.place;
    c.jailed = null;
    c.heat[place] = 60;
    if (c.gang) c.gang.rep = Math.max(0, c.gang.rep - 10);
    note(g, `${GANGS[s.id].name}의 손을 빌려 감옥을 빠져나왔다.`);
    return '젖은 계단을 내려가 수로를 따라 걸었다. 강가에서 마차가 기다리고 있었다. 마부가 말했다. "두목께서 이 빚은 언젠가 받으신답니다."';
  },
});

HOOKS.heir.push((g) => { /* crime.js가 조직 소속을 지운다. 등 돌린 조직의 원한은 남는다 */ });
