// 해적의 길과 해적 사냥: 악당의 길과 영웅의 길이 바다에서 갈린다.
// - 살트마레나 까마귀 둥지의 해적 주점에서 해적단에 든다. 졸개 → 갑판장 → 해적 선장 → 섬장.
// - 약탈: 상선, 해군 수송선, 해안 마을. 해적질은 죄로 남고(crime.js), 해군이 뒤를 쫓는다(hunted).
// - 영웅 쪽: 클라인 항과 포르텔의 해적 현상금, 소금바위섬 동굴의 심해 뱀 사냥.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill } from '../game.js';
import { PLACES } from '../places.js';
import { reportCrime, addNotoriety } from '../crime.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, stress, check } from '../adventure/core.js';
import { runFight } from '../adventure/fight.js';
import { S, atSea, sailing } from './core.js';
import { SHIPS } from './crew.js';

const fight = (g, rng, enc, tactic = 'charge') => runFight(g, rng, { enc, reward: {} }, tactic, { short: true });
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';
const tacticOf = (key) => (['charge', 'ambush', 'magic'].includes(key) ? key : 'charge');

export const PIRATE_RANKS = ['졸개', '갑판장', '해적 선장', '섬장'];
export const pirateRank = (g) => S(g).pirate?.rank ?? -1;
const denHere = (g) => ['saltmare', 'crow'].includes(L(g).place);
const boardHere = (g) => ['klein', 'portel'].includes(L(g).place);
// 내가 든 해적단 이름 (49단계 src/pirates/의 해적단 목록을 읽는다. 없으면 까마귀단)
const bandName = (g, id = S(g).pirate?.band ?? 'crow') => g.pirates?.bands?.find((b) => b.id === id && !b.fell)?.name ?? '까마귀단';
const sea_traitorBand = (g) => S(g).traitorBand ?? '까마귀단';
const DEN_LOOKS = [
  '럼주와 생선 기름 냄새. 외눈의 사내가 탁자에 칼을 꽂아 놓고 사람을 고르고 있다. 까마귀단이 새 손을 찾는다는 소문이다. 들어가면 육지의 법과는 작별이다.',
  '주점 안이 시끄럽다. 누가 노획한 앵무새가 탁자 위를 걸어 다니고, 구석에서는 주사위 소리가 난다. 외눈의 사내는 오늘도 까마귀단에 들 사람을 찾는다.',
  '비 오는 밤이라 주점이 꽉 찼다. 젖은 외투에서 소금 냄새가 난다. 벽에는 해군 현상금 쪽지가 화살로 박혀 있고, 누군가 그 위에 수염을 그려 놓았다.',
];

/* ---------- 해적 주점 ---------- */
ACTIONS.push({
  id: 'pirate_den',
  name: '해적 주점에 간다',
  icon: 'visit',
  desc: '돈과 칼과 소문이 오가는 곳. 해적단에 들 수도, 해적단을 떠날 수도 있다.',
  available: (g) => isAdult(g) && !traveling(g) && denHere(g) && !sceneQueued(g, 'pirate_den'),
  run(g) { queueScene(g, 'pirate_den'); return '부둣가 해적 주점의 문을 밀었다.'; },
});
defineScene('pirate_den', {
  need: (g) => denHere(g) && !traveling(g),
  title: () => '해적 주점 "익사한 쥐"',
  text: (g) => {
    const pr = S(g).pirate;
    if (pr) return `해적들이 나를 보고 잔을 들었다. 나는 ${bandName(g)}의 ${PIRATE_RANKS[pr.rank]}다. 약탈 ${pr.raids}번, 내 몫으로 챙긴 은화 ${pr.share}닢.${S(g).hunted > 20 ? ' 요즘 해군 배가 내 이름을 묻고 다닌다고 한다.' : ''}`;
    return DEN_LOOKS[((g.date?.year ?? 0) * 12 + (g.date?.month ?? 0)) % DEN_LOOKS.length];
  },
  choices: (g) => {
    const pr = S(g).pirate;
    if (pr) return [
      { label: '동료들과 술을 마시며 소문을 듣는다', key: 'drink' },
      { label: '해적단을 떠난다 (배신자로 쫓긴다)', key: 'quit' },
      { label: '그냥 나온다', key: 'none' },
    ];
    const ok = joinBlock(g);
    return [
      ok ? { label: `까마귀단에 들겠다고 한다 (조건: ${ok})`, key: 'nojoin' } : { label: '까마귀단에 들겠다고 한다', key: 'join' },
      { label: '구석에서 소문만 듣는다', key: 'drink' },
      { label: '그냥 나온다', key: 'none' },
    ];
  },
  resolve(g, rng, s, key) {
    const sea = S(g);
    if (key === 'none') return '문간에서 돌아섰다. 등 뒤로 웃음소리가 따라왔다.';
    if (key === 'nojoin') return `외눈의 사내가 나를 훑어보더니 침을 뱉었다. "물고기 밥이 되고 싶으면 그렇게 해. ${joinBlock(g) ?? ''} 그만큼은 되어야 쓸모가 있지."`;
    if (key === 'drink') {
      stress(g, -5);
      return rng.pick([
        '포르텔로 가는 향신료 배가 다음 달 호위 없이 뜬다는 이야기를 들었다.',
        '소금바위섬 북쪽 동굴에 심해 뱀이 둥지를 틀었다고 한다. 클라인 항에서는 그 머리에 큰 현상금을 걸었다고.',
        '해군 함장 하나가 까마귀단의 섬장 자리를 노리는 놈과 몰래 만난다는 소문이 돌았다.',
        '백 년 전에 가라앉은 보물선이 안개 속에서 아직도 떠다닌다고, 늙은 해적이 맹세했다.',
        '섬장 회의가 레오니아 해안의 세금을 두고 다툰다고 한다. 바다에도 정치가 있다.',
      ]);
    }
    if (key === 'join') {
      if (sea.pirate || joinBlock(g)) return '외눈의 사내는 더 이상 나를 보지 않았다.';
      sea.pirate = { rank: 0, raids: 0, share: 0, since: g.date.year };
      addNotoriety(g, 3);
      note(g, '까마귀단에 들었다.');
      chron(g, `${g.player.name}, 해적 까마귀단에 들다.`, 30);
      return '칼끝으로 손바닥을 긋고, 피를 럼주에 떨어뜨려 마셨다. "이제 넌 바다의 것이다." 까마귀단의 졸개가 되었다. 이제 "약탈하러 나간다"로 배를 털 수 있고, 까마귀 둥지로 가는 뱃길도 열렸다.';
    }
    if (key === 'quit') {
      if (!sea.pirate) return '떠날 해적단이 없었다.';
      const bn = bandName(g);
      sea.traitorBand = bn;
      sea.pirate = null;
      sea.hunted += 15;
      sea.traitor = true;
      note(g, `${J(bn, '을/를')} 떠났다.`);
      return `탁자에 해적의 표식을 내려놓고 나왔다. 아무도 막지 않았다. 그게 더 무서웠다. ${J(bn, '은/는')} 배신자를 잊지 않는다.`;
    }
    return '주점을 나왔다.';
  },
});
function joinBlock(g) {
  const p = g.player;
  if ((p.skills.sword ?? 0) >= 20 || p.stats.str >= 35 || (L(g).notoriety ?? 0) >= 20 || sailing(g) >= 30) return null;
  if (S(g).traitor) return '배신자는 받지 않는다';
  return '검술 20이나 힘 35, 뱃일 30, 악명 중 하나';
}

/* ---------- 약탈 ---------- */
ACTIONS.push({
  id: 'pirate_raid',
  name: '약탈하러 나간다',
  icon: 'sword',
  desc: '해적단의 배를 타고 한 달 동안 바다에 나가 상선이나 해안을 턴다. 큰돈이 들어오지만 죄가 쌓이고 해군이 쫓는다.',
  available: (g) => !!S(g).pirate && (S(g).pirate.band ?? 'crow') === 'crow' && !traveling(g) && denHere(g) && !sceneQueued(g, 'pirate_raid'),
  run(g) { queueScene(g, 'pirate_raid'); return '검은 돛을 올렸다.'; },
});
const RAIDS = {
  merchant: { label: '호위가 붙은 상선을 노린다', enc: (rng) => ({ unit: 'ship_guard', count: rng.int(3, 5), leader: null }), loot: [30, 70], heat: 1, where: 'portel', text: '상선의 짐칸에서 향신료와 은화 상자가 쏟아졌다.' },
  navy: { label: '해군 수송선을 노린다 (위험, 큰 몫)', enc: (rng) => ({ unit: 'marine', count: rng.int(3, 5), leader: 'navy_captain' }), loot: [80, 160], heat: 2, where: 'klein', text: '수송선에는 수비대 봉급 궤짝이 실려 있었다.' },
  coast: { label: '해안 마을을 턴다 (잔인함)', enc: (rng) => ({ unit: 'coast_militia', count: rng.int(2, 4), leader: null }), loot: [25, 55], heat: 1.5, where: 'klein', cruel: true, text: '불타는 지붕 아래서 사람들이 비명을 질렀다. 우리는 창고와 교회의 은그릇을 쓸어 담았다.' },
};
defineScene('pirate_raid', {
  need: (g) => !!S(g).pirate,
  title: () => '검은 돛',
  text: (g) => {
    const sh = S(g).ship;
    return `까마귀단의 배가 섬을 빠져나간다.${sh ? ` 이번에는 내 배 ${J(sh.name, '이/가')} 앞장선다.` : ''} 바다에는 먹잇감이 많다. 어디를 노릴까.`;
  },
  choices: (g) => {
    const out = Object.entries(RAIDS).map(([k, r]) => ({ label: r.label, key: k }));
    out.push({ label: '이번에는 섬에 남는다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const sea = S(g);
    const pr = sea.pirate;
    if (key === 'none' || !pr) return '이번 약탈에는 빠졌다. 동료들이 곁눈질했다.';
    const R = RAIDS[key];
    if (!R) return '바다는 텅 비어 있었다.';
    const sh = sea.ship;
    const r = fight(g, rng, R.enc(rng), sh?.kind === 'raider' ? 'ambush' : 'charge');
    if (!won(r)) {
      if (sh) sh.hull = Math.max(10, sh.hull - rng.int(10, 30));
      sea.hunted += 4;
      return `${r.text} 약탈은 실패했다. 빈손으로 섬에 돌아왔다.`;
    }
    const mul = (1 + pr.rank * 0.35) * (sh ? 1.3 : 1);
    const loot = Math.round(rng.int(R.loot[0], R.loot[1]) * mul);
    g.player.money += loot;
    pr.raids += 1; pr.share += loot;
    reportCrime(g, 'piracy', R.where, { mult: R.heat });
    sea.hunted += 6 * R.heat;
    gainSkill(g, 'sailing', 1, 'agi');
    if (R.cruel) { addNotoriety(g, 4); stress(g, 6); }
    let promo = '';
    const nextRank = pr.rank === 0 && pr.raids >= 3 ? 1 : pr.rank === 1 && pr.raids >= 8 ? 2 : pr.rank === 2 && pr.raids >= 15 && (L(g).notoriety ?? 0) >= 40 ? 3 : pr.rank;
    if (nextRank > pr.rank) {
      pr.rank = nextRank;
      promo = [
        '',
        ' 선장이 내 어깨를 쳤다. "오늘부터 갑판장이다." 졸개들이 내 눈치를 보기 시작했다.',
        ` 해적들이 나를 선장이라 불렀다.${sh ? '' : ' 섬장이 빼앗은 쾌속선 한 척을 내 배로 내주었다.'}`,
        ' 늙은 섬장이 바다에 던져졌다. 까마귀 둥지의 해적들이 칼을 들어 나를 새 섬장으로 불렀다. 이제 남해의 한 자리를 내가 다스린다.',
      ][nextRank];
      if (nextRank === 2 && !sh) sea.ship = { name: '검은 까마귀', kind: 'raider', hull: 80, speed: SHIPS.raider.speed, unpaid: 0 };
      chron(g, `${g.player.name}, 까마귀단의 ${PIRATE_RANKS[nextRank]}${nextRank === 3 ? '이 되어 까마귀 둥지를 다스리다' : '에 오르다'}.`, nextRank === 3 ? 90 : 50);
      note(g, `까마귀단의 ${PIRATE_RANKS[nextRank]} 자리에 올랐다.`);
    }
    return `${r.text} ${R.text} 내 몫은 은화 ${loot}닢.${promo}`;
  },
});

/* ---------- 해군의 추격 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  const sea = S(g);
  if (g.over || sea.hunted < 15 || g.crime?.jailed) return;
  const onWater = atSea(g) || ['saltmare', 'crow', 'klein', 'portel', 'saltrock'].includes(L(g).place);
  if (!onWater || traveling(g) && !atSea(g)) return;
  if (sceneQueued(g, 'navy_hunt') || !rng.chance(Math.min(0.35, sea.hunted / 160))) return;
  // 쫓기는 장면은 반 해에 한 번까지 (49단계: 한 해에 세 번씩 오던 것을 줄임)
  const now = g.date.year * 12 + g.date.month;
  if (now - (sea.chasedAt ?? -99) < 6) return;
  sea.chasedAt = now;
  queueScene(g, 'navy_hunt', { traitor: !sea.pirate && !!sea.traitor, ...(atSea(g) ? { at: null } : {}) });
});
defineScene('navy_hunt', {
  need: (g) => S(g).hunted >= 10,
  title: (g, s) => (s?.traitor ? (sea_traitorBand(g) === '까마귀단' ? '까마귀의 복수' : '배신자를 쫓는 배') : '해군의 추격'),
  text: (g, s) => (s?.traitor
    ? `밤중에 검은 돛배가 다가왔다. ${sea_traitorBand(g)}의 표식이다. 배신자를 데리러 왔다.`
    : `레오니아 해군의 깃발을 단 배가 내 뒤를 밟는다. 함장이 내 얼굴이 그려진 현상금 쪽지를 들고 있다.${PLACES[L(g).place]?.realm === 'sea' && !atSea(g) ? ' 섬 앞바다까지 들어온 것을 보니 단단히 벼른 모양이다.' : ''}`),
  choices: (g, s) => [
    { label: '맞서 싸운다', key: 'charge' },
    { label: '기습으로 먼저 친다', key: 'ambush' },
    ...(sailing(g) >= 30 || S(g).ship ? [{ label: '바람을 타고 따돌린다', key: 'run' }] : []),
    ...(!s?.traitor && g.player.money >= 40 ? [{ label: '뇌물을 쥐여 준다 (은화 40닢)', key: 'bribe' }] : []),
  ],
  resolve(g, rng, s, key) {
    const sea = S(g);
    if (key === 'bribe' && g.player.money >= 40) {
      g.player.money -= 40;
      sea.hunted = Math.max(0, sea.hunted - 10);
      return '함장은 주머니를 받아 들고 망원경을 다른 쪽으로 돌렸다. 바다에서도 돈은 통한다.';
    }
    if (key === 'run') {
      if (check(rng, sailing(g) + (sea.ship?.speed ?? 0), 55)) { sea.hunted = Math.max(0, sea.hunted - 5); gainSkill(g, 'sailing', 1, 'sen'); return '여울과 암초 사이로 배를 몰았다. 큰 배는 따라오지 못했다.'; }
      key = 'charge';
    }
    const enc = s?.traitor ? { unit: 'pirate', count: rng.int(3, 5), leader: 'pirate_captain' } : { unit: 'marine', count: rng.int(3, 5), leader: 'navy_captain' };
    const r = fight(g, rng, enc, tacticOf(key));
    if (won(r)) {
      sea.hunted = Math.max(0, sea.hunted - 12);
      if (s?.traitor) { sea.traitor = false; return `${r.text} ${J(sea_traitorBand(g), '은/는')} 당분간 나를 건드리지 않을 것이다.`; }
      addNotoriety(g, 2);
      return `${r.text} 해군 함장의 칼을 빼앗아 들었다. 이 일로 내 현상금은 더 오를 것이다.`;
    }
    if (sea.ship && rng.chance(0.4)) { note(g, `배 ${J(sea.ship.name, '을/를')} 빼앗겼다.`); sea.ship = null; return `${r.text} 놈들이 내 배를 끌고 갔다.`; }
    return `${r.text} 겨우 목숨만 건졌다.`;
  },
});

/* ---------- 영웅의 길: 해적 사냥과 바다 마물 ---------- */
ACTIONS.push({
  id: 'sea_bounty',
  name: '부두 게시판을 본다',
  icon: 'scroll',
  desc: '해적 현상금과 바다 마물 소문이 붙어 있다. 해적을 사냥하면 이름이 난다.',
  available: (g) => isAdult(g) && !traveling(g) && boardHere(g) && !sceneQueued(g, 'sea_bounty'),
  run(g) { queueScene(g, 'sea_bounty'); return '부두 게시판 앞에 섰다.'; },
});
defineScene('sea_bounty', {
  need: (g) => boardHere(g) && !traveling(g),
  title: (g) => `${PLACES[L(g).place].name}의 부두 게시판`,
  text: (g) => `소금기에 바랜 종이들이 못에 박혀 있다. "까마귀단 해적선 한 척당 은화 40닢." "소금바위섬 북쪽 동굴의 심해 뱀, 머리를 가져오는 자에게 은화 120닢."${S(g).lair ? ' 심해 뱀 쪽지에는 이미 붉은 줄이 그어져 있다.' : ''}${S(g).pirate ? ' 해적 현상금 쪽지 아래에 내 동료의 얼굴이 있다.' : ''}`,
  choices: (g) => [
    { label: S(g).pirate ? '동료를 팔아 해적선을 사냥한다 (배신)' : '해적선 사냥에 나선다', key: 'hunt' },
    { label: '그냥 돌아간다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    const sea = S(g);
    if (key !== 'hunt') return '쪽지들을 눈에 담고 돌아섰다.';
    const r = fight(g, rng, { unit: 'pirate', count: rng.int(3, 5), leader: rng.chance(0.6) ? 'pirate_captain' : null }, sea.ship?.kind === 'raider' ? 'ambush' : 'charge');
    if (!won(r)) return `${r.text} 해적선은 검은 돛을 펄럭이며 달아났다.`;
    g.player.money += 40;
    L(g).renown += 3;
    sea.pirateKills = (sea.pirateKills ?? 0) + 1;
    gainSkill(g, 'sailing', 0.8, 'agi');
    let extra = '';
    if (sea.pirate) { sea.traitorBand = bandName(g); sea.pirate = null; sea.traitor = true; sea.hunted += 15; extra = ' 해적단의 표식을 바다에 던졌다. 이제 나는 해적이 아니다. 그리고 놈들은 배신자를 잊지 않는다.'; }
    if (sea.pirateKills === 5) chron(g, `${g.player.name}, 해적 사냥꾼으로 이름을 떨치다.`, 60);
    return `${r.text} 해적 선장의 머리를 항구장 앞에 내려놓고 은화 40닢을 받았다.${extra}`;
  },
});

ACTIONS.push({
  id: 'serpent_lair',
  name: '북쪽 해식 동굴로 간다',
  icon: 'dungeon',
  desc: '소금바위섬 북쪽 동굴. 밤마다 우는 소리가 들린다. 심해 뱀의 둥지라는 소문이다.',
  available: (g) => isAdult(g) && !traveling(g) && L(g).place === 'saltrock' && !S(g).lair && !sceneQueued(g, 'serpent_lair'),
  run(g) { queueScene(g, 'serpent_lair'); return '썰물을 기다려 동굴 입구로 걸어 들어갔다.'; },
});
defineScene('serpent_lair', {
  need: (g) => L(g).place === 'saltrock' && !S(g).lair,
  title: () => '해식 동굴',
  text: () => '바닷물이 무릎까지 차는 동굴. 벽에 난파선의 널빤지와 사람 뼈가 박혀 있다. 안쪽 깊은 물웅덩이가 숨을 쉬듯 부풀었다 가라앉는다. 갈고리 게들이 바위 틈에서 집게를 딸깍거린다.',
  choices: (g) => [
    { label: '정면으로 들어간다', key: 'charge' },
    { label: '썰물 때 둥지를 기습한다', key: 'ambush' },
    ...(g.player.skills.magic >= 30 ? [{ label: '마법으로 물웅덩이를 친다', key: 'magic' }] : []),
    { label: '물러난다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'none') return '물웅덩이에서 거대한 눈 하나가 떠올라 나를 보았다. 뒷걸음질로 동굴을 나왔다.';
    const r = fight(g, rng, { unit: 'giant_crab', count: rng.int(2, 3), leader: 'sea_serpent' }, tacticOf(key));
    if (!won(r)) return `${r.text} 뱀의 울음이 동굴을 뒤흔들었다. 다음에는 더 강해져서 와야 한다.`;
    const sea = S(g);
    sea.lair = true; sea.monsters += 1;
    g.player.money += 120;
    L(g).renown += 8;
    chron(g, `${g.player.name}, 소금바위섬의 심해 뱀을 죽이다.`, 80);
    note(g, '소금바위섬의 심해 뱀을 죽였다.');
    return `${r.text} 뱀의 머리를 잘라 등대 아래에 내려놓았다. 어부들이 울며 내 손을 잡았다. 클라인 항에서 현상금 은화 120닢이 왔다. 이제 소금바위섬 어부들은 북쪽 바다에도 그물을 친다.`;
  },
});

// 대가 바뀌면: 해적단의 자리와 쫓김은 그 사람의 것이다. 배와 짐은 물려받는다.
HOOKS.heir.push((g) => {
  const sea = S(g);
  sea.pirate = null;
  sea.hunted = 0;
  sea.traitor = false;
});
