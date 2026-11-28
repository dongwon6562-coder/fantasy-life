// 경비대의 삶 (49단계): 순찰과 그 길의 말썽, 성문 지키기, 사건 캐기, 뇌물과 눈감기, 상관과 동료, 계급 오르기, 경비대장의 방침.
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, check, gains, up } from '../adventure/core.js';
import { queueFight } from '../adventure/fight.js';
import { WORK, doWork } from '../jobs.js';
import { notoriety } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  W, mi, clamp, here, placeName, free, adult, pick, RANKS, NEED, TOWNS, WATCH_PLACES, townOf, unitOf, TEMPERS, TRAITS, BOSS_NAMES, MATE_NAMES, THIEF_NAMES,
  logW, isWatch, onDuty, orderOf, rankName, crooked,
} from './core.js';

const stat = (g, id) => g.player.stats[id] ?? 0;
const sk = (g, id) => g.player.skills[id] ?? 0;
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const addMerit = (g, n) => { const s = W(g); s.merit = Math.max(0, s.merit + n); return n; };
const meritUp = (n) => (n > 0 ? `공 +${n}` : null);
const nudge = (g, n, pl = here(g)) => { const s = W(g); s.order[pl] = clamp(orderOf(g, pl) + n, 0, 100); };

/* ---------- 경비병 일자리를 경비대로 넓힌다 ---------- */
const G = WORK.guard;
G.places = [...new Set([...G.places, ...WATCH_PLACES])];
G.ranks = RANKS;
G.wage = [3, 5, 7, 10];
G.fightRisk = 0.03;
G.rankOf = (g) => clamp(W(g).rank, 0, 3);
G.title = (g) => `${unitOf(L(g).job?.place ?? here(g))} ${rankName(g)}`;
G.promote = (g, rk) => `${RANKS[rk]} 품삯을 처음 받았다. 전보다 주머니가 묵직하다.`;
const req0 = G.req;
const unpaidHere = (g) => (g.crime?.record ?? []).some((r) => !r.paid && r.place === here(g));
const wanted = (g) => !!g.crime?.jailed || Object.values(g.crime?.bounty ?? {}).some((v) => (+v || 0) > 0);
G.req = (g) => req0?.(g) ?? (notoriety(g) >= 15 ? '나쁜 소문이 가라앉아야' : wanted(g) ? '현상금이 풀려야' : unpaidHere(g) ? '이 고장의 수배가 풀려야' : (W(g).firedAt && mi(g) - W(g).firedAt < 36 ? '쫓겨난 지 세 해가 지나야' : null));

function enlist(g, rng) {
  const s = W(g), pl = L(g).job.place;
  s.place = pl; s.unit = unitOf(pl); s.since = mi(g); s.rank = 0; s.merit = 0; s.promoAt = mi(g); s.promoWait = 6; s.inqBase = s.bribes + s.skimmed; s.rec0 = (g.crime?.record ?? []).length;
  const tempers = Object.keys(TEMPERS);
  const t = (townOf(pl)?.bribe ?? 0.3) > 0.4 && rng.chance(0.5) ? 'crooked' : pick(rng, tempers);
  s.boss = { name: pick(rng, BOSS_NAMES), temper: t, since: mi(g) };
  const names = MATE_NAMES.slice().sort(() => rng.next() - 0.5);
  s.mates = [0, 1].map((i) => ({ name: names[i], trait: pick(rng, TRAITS), since: mi(g), hurt: false }));
  logW(g, `${s.unit}에 들어갔다. 대장은 ${TEMPERS[t].name} ${s.boss.name}.`);
}
function discharge(g, why) {
  const s = W(g);
  if (!s.place) return;
  s.served += Math.max(0, mi(g) - (s.since ?? mi(g)));
  logW(g, why ?? `${J(s.unit, '을/를')} 떠났다.`);
  s.place = null; s.unit = null; s.rank = 0; s.merit = 0; s.boss = null; s.mates = []; s.policy = null;
  s.cases = s.cases.filter((c) => c.done);
}
export { enlist, discharge };

/* ---------- 순찰: 일하러 가기 ---------- */
const PATROL = {
  봄: (b) => `${J(b, '을/를')} 돌았다. 진창에 빠진 수레를 함께 밀어 주었다.`,
  여름: (b) => `${J(b, '을/를')} 돌았다. 그늘 아래 노름판을 흩어 놓았다.`,
  가을: (b) => `${J(b, '을/를')} 돌았다. 추수 장에 사람이 몰려 소매치기를 지켜보느라 눈이 시렸다.`,
  겨울: (b) => `${J(b, '을/를')} 돌았다. 처마 밑에 웅크린 거지에게 구빈원 길을 일러 주었다.`,
};
const SEASON = ['겨울', '겨울', '봄', '봄', '봄', '여름', '여름', '여름', '가을', '가을', '가을', '겨울'];
const NIGHT = [
  (b) => `밤 순찰. 등불을 들고 ${J(b, '을/를')} 몇 번이고 오갔다. 개 짖는 소리 말고는 조용했다.`,
  (b) => `${b}에서 문이 열린 가게를 찾아 주인을 깨웠다. 주인은 고맙다며 빵 한 덩이를 주었다.`,
  (b) => `${b} 모퉁이에서 술 취한 사내를 집까지 데려다주었다.`,
  (b) => `동료와 둘이 ${J(b, '을/를')} 돌았다. 서로 고향 이야기를 하다 보니 밤이 갔다.`,
  (b) => `${b}에서 잃어버린 염소를 찾아 주인에게 돌려주었다. 경비대가 하는 일도 가지가지다.`,
];
function patrolLine(g, rng) {
  const t = townOf(here(g)) ?? TOWNS.ern, b = pick(rng, t.beat);
  return rng.chance(0.35) ? PATROL[SEASON[g.date.month - 1]](b) : pick(rng, NIGHT)(b);
}
const TROUBLE_SCENE = { thief: 'watch_thief', pilgrim: 'watch_thief', brawl: 'watch_brawl', magic: 'watch_brawl', smuggle: 'watch_smuggle', stray: 'watch_stray', noble: 'watch_noble', heresy: 'watch_preacher' };
function incident(g, rng, gate = false) {
  const s = W(g), t = townOf(here(g)) ?? TOWNS.ern;
  // 말썽은 석 달에 한 번 남짓, 성문 밀수 짐마차는 반 년에 한 번 남짓. 같은 말썽이 잇달아 오지 않게 한다.
  if (mi(g) - s.evAt < 3 || (gate && mi(g) - (s.gateAt ?? -99) < 6) || L(g).queue.some((x) => /^watch_/.test(x.kind))) return '';
  const p = (gate ? 0.2 : 0.3) * (1.35 - orderOf(g) / 100);
  if (!rng.chance(p)) return '';
  const pool = t.trouble.filter((k) => k !== s.lastTrouble);
  const kind = gate ? 'smuggle' : pick(rng, pool.length ? pool : t.trouble);
  s.evAt = mi(g); s.lastTrouble = kind; if (gate) s.gateAt = mi(g);
  queueScene(g, TROUBLE_SCENE[kind], { magic: kind === 'magic', pilgrim: kind === 'pilgrim', who: pick(rng, THIEF_NAMES), goods: pick(rng, ['향신료 자루', '독한 술통', '마석 상자', '비단 두루마리', '소금 포대']) });
  return gate ? ' 해 질 녘 마지막 짐마차가 이상하게 무거워 보였다.' : ' 돌아오는 길에 소란이 났다.';
}
G.work = (g, rng) => {
  const line = patrolLine(g, rng);
  const out = doWork(g, rng, G, { line, skillGain: 0.9 });
  addMerit(g, 0.5); nudge(g, 0.3);
  return out + incident(g, rng);
};

/* ---------- 성문 지키기 ---------- */
ACTIONS.push({
  id: 'watch_gate', name: '성문을 지킨다', icon: 'shield',
  desc: '성문이나 초소에서 드나드는 사람과 짐을 살핀다. 밀수꾼과 수배자가 걸리기도 하고, 은화를 쥐여 주는 손도 있다.',
  available: (g) => onDuty(g) && W(g).rank <= 2 && g.player.fatigue < 90,
  run(g, rng) {
    const t = townOf(here(g)) ?? TOWNS.ern;
    tired(g, 10); addMerit(g, 0.5);
    const v = gainStat(g, 'sen', 0.3);
    const line = pick(rng, [
      `${t.gate}에서 짐마차를 하나하나 세워 짐을 들추었다.`,
      `${t.gate}에서 통행세를 받고 이름을 장부에 적었다. 글 모르는 사람 이름은 들은 대로 적었다.`,
      `${t.gate} 위에서 길 끝을 내다보았다. 먼지구름이 일 때마다 창을 고쳐 쥐었다.`,
      `${t.gate}에서 수배서의 얼굴과 지나가는 얼굴을 견주었다. 닮은 사람이 셋, 그 사람은 없었다.`,
    ]);
    return `${line}${incident(g, rng, true)}${gains([up('감각', v), meritUp(0.5)])}`;
  },
});

/* ---------- 순찰길의 말썽 ---------- */
function caught(g, rng, name, crime, months, grudge) {
  const s = W(g);
  s.caught.push({ name, crime, place: here(g), at: mi(g), out: mi(g) + months, grudge, done: false });
  if (s.caught.length > 24) s.caught.splice(0, s.caught.length - 24);
}
defineScene('watch_thief', {
  need: (g) => onDuty(g),
  title: (g, s) => (s.pilgrim ? '순례자 틈의 손' : '소매치기'),
  text: (g, s) => (s.pilgrim
    ? `순례자 무리 틈에서 늙은 순례자의 전대가 사라졌다. 쫓아가 골목 끝에서 붙잡으니 ${J(s.who, '이었/였')}다. 품에서 순례자의 전대와 묵주 셋이 나왔다.`
    : `장터에서 "도둑이야!" 소리가 났다. 골목 셋을 쫓아가 덜미를 잡았다. ${s.who}. 손에 남의 돈주머니를 쥐고 있다. 눈치를 보며 소매 속에서 은화 몇 닢을 흘려 보인다.`),
  choices: (g, s) => [
    { label: '경비대 감방으로 끌고 간다', key: 'arrest' },
    { label: '돈주머니만 돌려주고 놓아준다', key: 'warn' },
    { label: '흘려 보인 은화를 받고 못 본 척한다', key: 'bribe' },
    ...(stat(g, 'cha') >= 25 ? [{ label: '누구 밑에서 일하는지 캐묻는다', key: 'ask' }] : []),
  ],
  resolve(g, rng, s, key) {
    const st = W(g);
    if (key === 'arrest') { caught(g, rng, s.who, '소매치기', 2, rng.chance(0.3) ? 1 : 0); const m = addMerit(g, 2); nudge(g, 1); deed(g, 'brave', 1, null); return `${J(s.who, '을/를')} 감방에 넣었다. 주인은 돈주머니를 받아 들고 몇 번이고 고개를 숙였다. 끌려가며 ${J(s.who, '이/가')} 내 얼굴을 오래 보았다.${gains([meritUp(m)])}`; }
    if (key === 'warn') { deed(g, 'kind', 1, null); return `돈주머니를 주인에게 돌려주고 ${J(s.who, '을/를')} 놓아주었다. "다음엔 감방이다." 녀석은 대답 대신 침을 뱉고 사라졌다.`; }
    if (key === 'bribe') { const n = 3 + Math.round(6 * (townOf(here(g))?.bribe ?? 0.3)); g.player.money += n; st.bribes += 1; deed(g, 'honest', -2, null); return `은화 ${n}닢이 소매에서 소매로 옮겨 갔다. 돈주머니 주인에게는 놓쳤다고 했다. 주인의 얼굴을 오래 볼 수 없었다.`; }
    const ok = check(rng, stat(g, 'cha') / 2 + stat(g, 'int') / 3, 30);
    if (ok) { const m = addMerit(g, 3); nudge(g, 2); caught(g, rng, s.who, '소매치기', 3, 1); return `한참을 버티던 ${J(s.who, '이/가')} 장물아비 이름을 댔다. 그날 밤 장물 창고 하나를 덮쳤다.${gains([meritUp(m)])}`; }
    caught(g, rng, s.who, '소매치기', 2, 0); addMerit(g, 1);
    return `${J(s.who, '은/는')} 입을 꾹 다물었다. 감방에 넣긴 했지만 그 뒤의 손은 그대로다.`;
  },
});
defineScene('watch_brawl', {
  need: (g) => onDuty(g),
  title: (g, s) => (s.magic ? '거리의 마법 다툼' : '주점 싸움'),
  text: (g, s) => (s.magic
    ? '학생 둘이 골목 한가운데서 서로에게 손을 뻗고 있다. 공기가 탁탁 튄다. 구경꾼들이 벽에 붙어 섰다. 한 번만 더 뻗으면 누가 다친다.'
    : '주점 문이 안에서부터 튕겨 열렸다. 의자가 날아다니고, 짐꾼 패와 선원 패가 엉겨 있다. 주인이 나를 보자마자 소리쳤다. "저놈들 좀!"'),
  choices: () => [
    { label: '큰소리로 말려 달랜다', key: 'talk' },
    { label: '몽둥이로 떼어 놓는다', key: 'club' },
    { label: '앞장선 놈만 끌고 간다', key: 'lead' },
    { label: '동료를 부르러 간다', key: 'call' },
    { label: '끝날 때까지 못 본 척한다', key: 'away' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'talk') {
      if (check(rng, stat(g, 'cha') * 0.6 + stat(g, 'wil') * 0.3, 32)) { const m = addMerit(g, 2); nudge(g, 1); return `${s.magic ? '"탑의 규칙을 잊었나!"' : '"다들 술값은 내고 싸워라!"'} 한마디에 웃음이 터졌다. 주먹이 내려갔다.${gains([meritUp(m), up('매력', gainStat(g, 'cha', 0.3))])}`; }
      g.player.injuries.push({ name: '날아온 술잔에 찢긴 눈썹', months: 1 });
      return '말이 끝나기도 전에 술잔이 날아왔다. 눈썹이 찢어진 채 둘을 겨우 떼어 놓았다.';
    }
    if (key === 'club') {
      if (check(rng, stat(g, 'str') * 0.5 + sk(g, 'sword') * 0.4, 34)) { const m = addMerit(g, 2); nudge(g, 1); return `몽둥이로 탁자를 내리치고 둘을 벽에 몰았다. 싸움은 금방 끝났다. 주인이 깨진 의자 값을 셈했다.${gains([meritUp(m), up('힘', gainStat(g, 'str', 0.3))])}`; }
      g.player.injuries.push({ name: '주먹에 맞아 부은 턱', months: 1 }); stress(g, 6); addMerit(g, 1);
      return '몽둥이를 휘두르다 옆구리에 주먹을 맞았다. 둘은 떼어 놓았지만 턱이 사흘 동안 부어 있었다.';
    }
    if (key === 'lead') { const name = pick(rng, THIEF_NAMES); caught(g, rng, name, '주점 싸움', 1, rng.chance(0.4) ? 1 : 0); const m = addMerit(g, 2); return `제일 크게 떠들던 ${J(name, '을/를')} 끌어냈다. 나머지는 금방 조용해졌다. ${J(name, '은/는')} 하룻밤 감방에서 내 이름을 욕했다.${gains([meritUp(m)])}`; }
    if (key === 'call') { addMerit(g, 1); return '호루라기를 불어 동료들을 불렀다. 다섯이 몰려가자 싸움은 저절로 끝났다. 대장은 잘했다고도, 못했다고도 하지 않았다.'; }
    nudge(g, -1); addMerit(g, -1); deed(g, 'brave', -1, null);
    return '모퉁이 너머에서 소리가 잦아들 때까지 기다렸다. 다음 날 주인이 경비대에 항의를 넣었다.';
  },
});
defineScene('watch_smuggle', {
  need: (g) => onDuty(g),
  title: () => '무거운 짐마차',
  text: (g, s) => `짐마차 바닥이 이중이었다. 널빤지 밑에 세금 안 낸 ${J(s.goods ?? '향신료 자루', '이/가')} 빼곡하다. 마부가 웃으며 다가와 목소리를 낮췄다. "나리, 오늘은 아무것도 못 보신 겁니다." 손바닥 안에 은화가 반짝였다.`,
  choices: (g) => [
    { label: '짐을 압수하고 마부를 넘긴다', key: 'seize' },
    { label: '은화를 받고 통과시킨다', key: 'bribe' },
    { label: '짐 절반만 압수했다고 적는다', key: 'half' },
    ...(crooked(g) ? [{ label: '대장에게 몫을 바치고 넘긴다', key: 'boss' }] : []),
  ],
  resolve(g, rng, s, key) {
    const st = W(g), cult = townOf(here(g))?.bribe ?? 0.3;
    if (key === 'seize') { caught(g, rng, '밀수꾼 마부', '밀수', 3, rng.chance(0.5) ? 1 : 0); const m = addMerit(g, 3); st.refused += 1; nudge(g, 1); deed(g, 'honest', 2, null); return `짐을 창고로 옮기고 마부를 감방에 넣었다. 압수 목록에 내 이름이 올랐다. 그날 밤 부두 쪽 주점에서 누가 내 이름을 물었다고 한다.${gains([meritUp(m)])}`; }
    if (key === 'bribe') { const n = Math.round(8 + 20 * cult); g.player.money += n; st.bribes += 1; nudge(g, -1); deed(g, 'honest', -2, null); return `은화 ${n}닢. 짐마차가 성문을 지나 어둠 속으로 사라졌다. 장부에는 "빈 수레"라고 적었다.`; }
    if (key === 'half') { const n = Math.round(4 + 10 * cult); g.player.money += n; st.bribes += 1; addMerit(g, 1); return `압수 장부에는 반만 적었다. 나머지 반은 마부가 은화 ${n}닢으로 되샀다. 양쪽 다 만족한 얼굴이었다. 나만 빼고.`; }
    const n = Math.round(4 + 10 * cult); g.player.money += n; st.bribes += 1; addMerit(g, 2);
    return `대장 몫을 먼저 떼어 바쳤다. 대장은 웃으며 내 어깨를 두드렸다. "눈치가 있군." 남은 은화 ${n}닢이 내 몫이었다.`;
  },
});
defineScene('watch_stray', {
  need: (g) => onDuty(g),
  title: () => '길 잃은 아이',
  text: () => '장터 한구석에 대여섯 살 된 아이가 울고 서 있다. 엄마를 놓쳤다고 한다. 해는 지고 장꾼들은 좌판을 걷는다.',
  choices: () => [
    { label: '목말을 태워 장터를 돈다', key: 'carry' },
    { label: '경비대 초소에 앉혀 두고 순찰을 마친다', key: 'post' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'carry') { deed(g, 'kind', 2, null); const m = addMerit(g, 1); return `아이를 어깨에 태우고 "이 아이 엄마 계시오!" 외치며 장터를 돌았다. 세 바퀴째에 얼굴이 하얗게 질린 여인이 달려왔다. 다음 날 그 집에서 달걀 한 바구니를 보내왔다.${gains([meritUp(m)])}`; }
    return '초소 화롯가에 아이를 앉히고 빵을 쥐여 주었다. 순찰을 마치고 돌아오니 아이는 없고, 엄마가 남긴 고맙다는 쪽지만 있었다.';
  },
});
defineScene('watch_noble', {
  need: (g) => onDuty(g),
  title: () => '귀족 자제',
  text: () => '말 탄 젊은 귀족이 좁은 거리를 내달리다 과일 좌판을 엎었다. 늙은 장사꾼이 바닥을 기며 사과를 줍는다. 귀족이 말 위에서 웃었다. "치워라. 아니면 경비대가 치우든가."',
  choices: (g) => [
    { label: '말고삐를 잡고 좌판 값을 물게 한다', key: 'stand' },
    { label: '정중하게 길을 비켜 달라고 청한다', key: 'polite' },
    { label: '고개를 숙이고 좌판을 함께 치운다', key: 'bow' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'stand') {
      if (check(rng, stat(g, 'wil') * 0.5 + stat(g, 'cha') * 0.3 + W(g).rank * 6, 38)) { deed(g, 'brave', 3, '귀족 자제 앞에서도 물러서지 않았다더라'); nudge(g, 2); return '고삐를 놓지 않았다. 구경꾼이 늘자 귀족은 이를 갈며 은화 몇 닢을 던졌다. 늙은 장사꾼이 내 손을 잡고 놓지 않았다. 대장은 다음 날 나를 불러 한숨을 쉬었다. "옳은 일을 했다. 그래서 골치가 아프다."'; }
      addMerit(g, -3); stress(g, 10);
      return '귀족은 채찍으로 내 손을 내리쳤다. 다음 날 그 집안에서 경비대에 편지가 왔다. 대장은 내 공을 깎았다. 장사꾼들은 그래도 나에게 인사를 했다.';
    }
    if (key === 'polite') { if (rng.chance(0.5)) return '귀족은 코웃음을 치고 말 머리를 돌렸다. 좌판 값은 끝내 받지 못했다.'; g.player.money += 2; return '귀족은 의외로 고개를 끄덕이고 은화를 던져 주었다. "장사꾼에게 줘라." 두 닢을 장사꾼에게 건넸다.'; }
    deed(g, 'brave', -1, null);
    return '말없이 사과를 주워 담았다. 귀족은 이미 저만치 가 있었다. 장사꾼이 작은 소리로 말했다. "경비대도 별수 없구먼."';
  },
});
defineScene('watch_preacher', {
  need: (g) => onDuty(g),
  title: () => '광장의 설교자',
  text: () => '광장 분수대 위에 누더기 차림의 사내가 올라섰다. "대성당의 금은 누구의 것이냐! 신은 가난한 자의 부엌에 계시다!" 사람들이 모여든다. 교단 사람 하나가 경비대 쪽을 노려본다.',
  choices: () => [
    { label: '끌어내려 교단에 넘긴다', key: 'hand' },
    { label: '광장 밖으로 쫓아만 낸다', key: 'shoo' },
    { label: '끝까지 듣고 그냥 둔다', key: 'listen' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'hand') { addMerit(g, 2); deed(g, 'kind', -1, null); return '설교자를 분수대에서 끌어내려 교단 사람에게 넘겼다. 사내는 끌려가며 나를 보고 웃었다. "너도 언젠가 듣게 될 거다." 모였던 사람들이 말없이 흩어졌다.'; }
    if (key === 'shoo') { addMerit(g, 1); return '사내를 광장 밖 골목까지 데려가 놓아주었다. "여기선 안 되오." 사내는 고개를 끄덕이고 다른 광장 쪽으로 걸어갔다.'; }
    addMerit(g, -1); stress(g, 4);
    return '창을 기대 세우고 끝까지 들었다. 틀린 말만은 아니었다. 교단 사람이 경비대장에게 무언가를 적어 보냈다.';
  },
});

/* ---------- 사건 캐기 ---------- */
const CASE_KINDS = {
  burglary: { name: '빈집털이', victims: ['포목점', '금은방', '약방', '상인 조합 창고'], roles: [['문지기', '열쇠를 맡고 있었다'], ['새로 온 하녀', '그날 밤 집에 있었다', 'f'], ['노름빚 진 견습생', '빚쟁이에게 쫓기고 있다'], ['떠돌이 땜장이', '그날 그 거리에 있었다']], reward: 14, months: 6 },
  assault: { name: '밤길 습격', victims: ['술 취한 상인', '늦게 돌아가던 서기', '빵집 주인'], roles: [['부두 건달', '전에도 그런 짓을 했다'], ['빚을 받으러 다니는 사내', '피해자와 다툰 적이 있다', 'm'], ['해고된 하인', '앙심을 품었다는 말이 있다']], reward: 12, months: 5 },
  arson: { name: '방화', victims: ['곡물 창고', '마구간', '경쟁 여관'], roles: [['경쟁 여관 주인', '손님을 빼앗겼다'], ['쫓겨난 마부', '주인에게 맞고 쫓겨났다'], ['불 보는 걸 좋아하는 아이', '전에도 불장난을 했다'], ['보험 든 창고 주인', '빚이 많다']], reward: 20, months: 6 },
  forgery: { name: '가짜 은화', victims: ['장터 환전상', '세금 창고', '여관 계산대'], roles: [['은세공 견습', '손재주가 좋다'], ['환전상의 동업자', '장부가 맞지 않는다'], ['떠돌이 약장수', '은화를 늘 새것으로 낸다']], reward: 18, months: 7 },
};
const CK = Object.keys(CASE_KINDS);
// 하녀·사내처럼 성별이 정해진 자리에는 맞는 이름을 붙인다
const F_NAMES = ['리나', '로테', '울리케', '한나', '엘케'], M_NAMES = ['얀', '토비아스', '마르코', '페터', '디트마르', '쿠르트', '파울'];
export function newCase(g, rng, pl = here(g)) {
  const s = W(g), k = pick(rng, CK), d = CASE_KINDS[k];
  const roles = d.roles.slice().sort(() => rng.next() - 0.5).slice(0, 3);
  const used = new Set();
  const suspects = roles.map(([role, why, sex]) => { const pool = sex === 'f' ? F_NAMES : sex === 'm' ? M_NAMES : MATE_NAMES; let n = pick(rng, pool); for (let k = 0; k < 6 && used.has(n); k++) n = pick(rng, pool); used.add(n); return { name: `${role} ${n}`, role, why }; });
  const c = { id: s.seq++, kind: k, place: pl, victim: pick(rng, d.victims), suspects, culprit: rng.chance(0.85) ? rng.int(0, 2) : -1, clue: 0, cleared: [], at: mi(g), until: mi(g) + d.months, done: false, result: null };
  s.cases.push(c);
  if (s.cases.length > 12) s.cases.splice(0, s.cases.length - 12);
  return c;
}
export const openCase = (g, pl = here(g)) => W(g).cases.find((c) => !c.done && c.place === pl) ?? null;
export const caseName = (c) => `${c.victim} ${CASE_KINDS[c.kind].name}`;
defineScene('watch_case_new', {
  need: (g) => isWatch(g),
  title: () => '맡은 사건',
  text: (g, s) => { const c = W(g).cases.find((x) => x.id === s.cid); const b = W(g).boss; return c ? `${b ? `${b.name} 대장이` : '대장이'} 나를 불러 종이 한 장을 내밀었다. ${caseName(c)}. ${c.suspects.map((x) => x.name).join(', ')}. "${CASE_KINDS[c.kind].months}달 안에 매듭지어라. 못 하면 식은 사건 장부로 간다."` : '맡을 사건이 없었다.'; },
  choices: () => [{ label: '맡는다', key: 'take' }, { label: '다른 조에 넘겨 달라고 한다', key: 'pass' }],
  resolve(g, rng, s, key) {
    const c = W(g).cases.find((x) => x.id === s.cid);
    if (!c) return '사건 종이는 이미 다른 사람 손에 있었다.';
    if (key === 'pass') { c.done = true; c.result = 'passed'; addMerit(g, -1); return '대장은 말없이 종이를 거두어 다른 조장에게 넘겼다.'; }
    logW(g, `${caseName(c)} 사건을 맡았다.`);
    return '종이를 접어 품에 넣었다. 이제 "사건을 캔다"로 사람들을 만나고 흔적을 찾을 수 있다.';
  },
});
ACTIONS.push({
  id: 'watch_case', name: '사건을 캔다', icon: 'eye',
  desc: '맡은 사건의 흔적을 찾고 사람들을 만난다. 단서가 모이면 죄 없는 사람이 하나씩 풀려나고, 범인을 지목할 수 있다.',
  available: (g) => isWatch(g) && free(g) && !!openCase(g) && !sceneQueued(g, 'watch_accuse') && g.player.fatigue < 90,
  run(g, rng) {
    const c = openCase(g), d = CASE_KINDS[c.kind];
    tired(g, 12);
    const power = stat(g, 'sen') * 0.4 + stat(g, 'int') * 0.4 + sk(g, 'letters') * 0.1 + W(g).rank * 4;
    const got = check(rng, power, 34) ? 2 : 1;
    c.clue += got;
    const lines = [
      `${c.victim} 둘레의 이웃들을 하나씩 찾아갔다. 그날 밤 개가 짖던 시각을 맞추어 보았다.`,
      `흔적이 남은 자리를 다시 보았다. 진흙에 찍힌 발자국 크기를 끈으로 재었다.`,
      `주점에서 귀를 열어 두었다. 술이 세 순배 돌자 누가 그날 밤 이야기를 꺼냈다.`,
      `용의자들이 그날 어디 있었는지 하나씩 맞추어 보았다. 한 사람의 말이 어긋났다.`,
    ];
    let t = pick(rng, lines);
    const left = c.suspects.map((_, i) => i).filter((i) => !c.cleared.includes(i));
    if (c.clue >= 2 && left.length > 1) {
      const innocents = left.filter((i) => i !== c.culprit);
      if (innocents.length && c.clue >= 2 * (c.cleared.length + 1)) { const i = pick(rng, innocents); c.cleared.push(i); t += ` ${J(c.suspects[i].name, '은/는')} 그날 밤 다른 곳에 있었다. 증인이 셋이다.`; }
    }
    if (c.clue >= 5 || c.suspects.length - c.cleared.length <= 1) { queueScene(g, 'watch_accuse', { cid: c.id }, { first: true }); t += ' 이제 이름을 댈 수 있을 것 같다.'; }
    const v = gainStat(g, 'sen', 0.4), v2 = gainStat(g, 'int', 0.2);
    return `${t}${gains([up('감각', v), up('지능', v2)])}`;
  },
});
defineScene('watch_accuse', {
  need: (g, s) => isWatch(g) && !!W(g).cases.find((x) => x.id === s.cid && !x.done),
  title: () => '범인 지목',
  text: (g, s) => { const c = W(g).cases.find((x) => x.id === s.cid); const left = c.suspects.filter((_, i) => !c.cleared.includes(i)); return `${caseName(c)}. 남은 사람: ${left.map((x) => `${x.name}(${x.why})`).join(', ')}. 대장 앞에 서서 이름을 대야 한다. 틀리면 죄 없는 사람이 감방에 간다.`; },
  choices: (g, s) => {
    const c = W(g).cases.find((x) => x.id === s.cid);
    return [
      ...c.suspects.map((x, i) => (c.cleared.includes(i) ? null : { label: `${x.name}의 이름을 댄다`, key: `p${i}` })).filter(Boolean),
      { label: '아무도 아니다. 다른 데서 났다', key: 'none' },
      { label: '단서를 더 모은다', key: 'wait' },
    ];
  },
  resolve(g, rng, s, key) {
    const st = W(g), c = st.cases.find((x) => x.id === s.cid), d = CASE_KINDS[c.kind];
    if (key === 'wait') return '대장 앞에서 입을 다물었다. 조금만 더 캐 보기로 했다.';
    const idx = key === 'none' ? -1 : +key.slice(1);
    c.done = true;
    if (idx === c.culprit) {
      st.solved += 1; c.result = 'solved';
      const reward = d.reward + st.rank * 5; g.player.money += reward;
      const m = addMerit(g, 5); nudge(g, 3);
      if (idx >= 0) caught(g, rng, c.suspects[idx].name, d.name, 6 + rng.int(0, 6), rng.chance(0.5) ? 2 : 1);
      logW(g, `${J(caseName(c), '을/를')} 풀었다.`); if (st.solved === 5) chron(g, `${g.player.name}, ${unitOf(c.place)}에서 사건 다섯을 풀다.`);
      return `${idx >= 0 ? `${J(c.suspects[idx].name, '은/는')} 처음엔 발뺌하다 증거 앞에서 고개를 떨구었다.` : '사람이 한 일이 아니었다. 낡은 굴뚝과 바람이 한 일이었다. 아무도 억울하게 끌려가지 않았다.'} 사례금 은화 ${reward}닢이 나왔다.${gains([meritUp(m)])}`;
    }
    st.wrong += 1; c.result = 'wrong'; addMerit(g, -2); stress(g, 12);
    if (idx >= 0) { caught(g, rng, c.suspects[idx].name, d.name, 6, 2); c.wronged = c.suspects[idx].name; }
    logW(g, `${caseName(c)}에서 엉뚱한 사람을 지목했다.`);
    return `${idx >= 0 ? `${J(c.suspects[idx].name, '이/가')} 끌려갔다. 끝까지 아니라고 했다.` : '아무도 잡지 않고 사건을 덮었다.'} 대장은 장부에 줄을 그었다. 그 뒤로도 그 거리에서는 비슷한 일이 또 났다. 무언가 틀렸다는 느낌이 오래 남았다.`;
  },
});

/* ---------- 뒷돈: 자릿세 걷기 ---------- */
ACTIONS.push({
  id: 'watch_skim', name: '자릿세를 걷는다', icon: 'coin',
  desc: '순찰 도는 거리의 좌판과 주점에서 "보호비"를 걷는다. 주머니는 두둑해지지만 치안과 평판이 상하고, 감찰에 걸릴 수 있다.',
  available: (g) => onDuty(g) && (crooked(g) || W(g).bribes >= 2) && (townOf(here(g))?.bribe ?? 0) >= 0.2,
  run(g, rng) {
    const st = W(g), cult = townOf(here(g))?.bribe ?? 0.3;
    const n = Math.round(6 + 18 * cult + st.rank * 3 + rng.int(0, 4));
    g.player.money += n; st.skimmed += 1; nudge(g, -1.5); tired(g, 6); deed(g, 'honest', -2, rng.chance(0.4) ? '경비대 제복을 입고 장사꾼 주머니를 턴다더라' : null);
    const boss = crooked(g) ? ` 그중 ${Math.round(n / 3)}닢은 대장 몫으로 떼어 두었다.` : '';
    if (crooked(g)) g.player.money -= Math.round(n / 3);
    return `${pick(rng, [`좌판마다 들러 은화를 받았다. 사과 장수 노파가 동전을 세며 손을 떨었다.`, `주점 주인들이 미리 봉투를 내밀었다. 웃는 얼굴이었지만 눈은 웃지 않았다.`, `"이번 달도 무사하시길." 장사꾼들이 같은 말을 했다. 무엇으로부터 무사한지는 아무도 묻지 않았다.`])} 은화 ${n}닢을 걷었다.${boss}`;
  },
});

/* ---------- 동료들과 ---------- */
ACTIONS.push({
  id: 'watch_mates', name: '동료들과 한잔한다', icon: 'tankard',
  desc: '근무가 끝나고 같은 조 동료들과 술잔을 기울인다. 경비대 안의 소문과 동료 사정을 듣는다.',
  available: (g) => isWatch(g) && free(g) && W(g).mates.length > 0 && L(g).job.place === here(g) && g.player.money >= 2 && !sceneQueued(g, 'watch_mate'),
  run(g, rng) {
    const st = W(g); pay(g, 2); stress(g, -6);
    const m = pick(rng, st.mates);
    if (rng.chance(0.3) && mi(g) - (st.mateAt ?? 0) >= 6) { st.mateAt = mi(g); queueScene(g, 'watch_mate', { name: m.name, trait: m.trait, what: pick(rng, ['debt', 'bribe', 'hurt']) }); return `${m.name}의 얼굴이 어두웠다. 술이 몇 순배 돌자 할 말이 있는 눈치였다.`; }
    const lines = [
      `${m.trait} ${J(m.name, '이/가')} 대장 흉내를 냈다. 다들 술을 뿜었다.`,
      `${m.name}에게서 다른 조 이야기를 들었다. 누가 승진한다더라, 누가 뒷돈을 먹다 걸렸다더라.`,
      `${J(m.name, '과/와')} 서로 다친 자리를 보여 주며 누가 더 크게 다쳤나 겨루었다.`,
    ];
    return `${pick(rng, lines)} 은화 두 닢으로 산 술이 금방 바닥났다.`;
  },
});
defineScene('watch_mate', {
  need: (g, s) => isWatch(g) && W(g).mates.some((m) => m.name === s.name),
  title: (g, s) => s.name,
  text: (g, s) => ({
    debt: `${J(s.name, '이/가')} 잔을 내려놓았다. "노름빚이 은화 서른 닢이야. 이번 달 안에 못 갚으면 손가락을 자른대."`,
    bribe: `${J(s.name, '이/가')} 목소리를 낮췄다. "부두 놈들이 다달이 봉투를 줘. 너도 끼면 반 나눠 줄게. 대장도 안다고."`,
    hurt: `지난밤 순찰에서 ${J(s.name, '이/가')} 칼을 맞았다. 다리를 절며 말했다. "대장은 내 자리를 다른 놈으로 채운대. 이 다리로 뭘 먹고 사냐."`,
  }[s.what]),
  choices: (g, s) => ({
    debt: [{ label: '은화 서른 닢을 빌려준다', key: 'lend' }, { label: '빚쟁이를 같이 찾아간다', key: 'face' }, { label: '도울 수 없다고 한다', key: 'no' }],
    bribe: [{ label: '나도 낀다', key: 'join' }, { label: '못 들은 걸로 한다', key: 'quiet' }, { label: '대장 위로 고발한다', key: 'report' }],
    hurt: [{ label: '대장에게 사정해 초소 일이라도 맡긴다', key: 'plead' }, { label: '은화 열 닢을 쥐여 준다', key: 'give' }, { label: '어깨만 두드려 준다', key: 'pat' }],
  }[s.what]),
  resolve(g, rng, s, key) {
    const st = W(g), m = st.mates.find((x) => x.name === s.name);
    if (key === 'lend') { if (g.player.money < 30) return '주머니를 털어도 서른 닢이 안 되었다. 둘이서 말없이 술만 마셨다.'; pay(g, 30); m.owe = (m.owe ?? 0) + 30; deed(g, 'kind', 2, null); return `은화 서른 닢을 건넸다. ${J(s.name, '은/는')} 고개를 숙인 채 한참 들지 못했다.`; }
    if (key === 'face') { if (check(rng, stat(g, 'str') * 0.4 + stat(g, 'wil') * 0.4 + st.rank * 5, 34)) { deed(g, 'brave', 2, null); return '제복을 입은 채로 빚쟁이를 찾아갔다. 빚쟁이는 경비대 둘을 보더니 이자를 탕감하고 기한을 늘려 주었다.'; } g.player.injuries.push({ name: '뒷골목에서 맞은 갈비뼈', months: 2 }); return '빚쟁이 패거리는 제복을 무서워하지 않았다. 둘 다 흠씬 두들겨 맞고 돌아왔다.'; }
    if (key === 'no') { st.mates = st.mates.filter((x) => x !== m); return `${J(s.name, '은/는')} 그달을 끝으로 경비대에 나오지 않았다. 손가락이 성한지는 아무도 몰랐다.`; }
    if (key === 'join') { st.bribes += 2; g.player.money += 12; deed(g, 'honest', -3, null); return `다음 달부터 봉투가 하나 더 생겼다. 은화 열두 닢. 부두 쪽 순찰은 이제 쉬웠다. 너무 쉬웠다.`; }
    if (key === 'quiet') return '잔을 비우고 다른 이야기를 꺼냈다. 그 뒤로 둘 사이에 말이 조금 줄었다.';
    if (key === 'report') {
      st.mates = st.mates.filter((x) => x !== m);
      if (crooked(g) && rng.chance(0.6)) { addMerit(g, -4); stress(g, 15); return '고발장은 대장 책상 위로 돌아왔다. 대장이 웃으며 말했다. "누가 우리 식구를 팔았나." 그 뒤로 밤 근무만 돌아왔다.'; }
      addMerit(g, 4); deed(g, 'honest', 3, null); return `감찰관이 다녀갔다. ${J(s.name, '은/는')} 쫓겨났다. 경비대 안에서 나를 보는 눈이 둘로 갈렸다.`;
    }
    if (key === 'plead') { if (st.rank >= 1 || check(rng, stat(g, 'cha') * 0.6, 30)) { m.hurt = true; deed(g, 'kind', 2, null); return `대장을 설득해 ${J(s.name, '을/를')} 초소 장부 일에 앉혔다. 품삯은 반이지만 끼니는 이을 것이다.`; } st.mates = st.mates.filter((x) => x !== m); return '대장은 고개를 저었다. "경비대는 구빈원이 아니다." 다음 달 그 자리엔 낯선 신참이 섰다.'; }
    if (key === 'give') { pay(g, 10); st.mates = st.mates.filter((x) => x !== m); deed(g, 'kind', 1, null); return `은화 열 닢을 쥐여 주었다. ${J(s.name, '은/는')} 고향으로 돌아갔다. 몇 달 뒤 서툰 글씨로 고맙다는 편지가 왔다.`; }
    st.mates = st.mates.filter((x) => x !== m); return `어깨를 두드려 주었다. ${J(s.name, '은/는')} 웃으려다 말았다.`;
  },
});

/* ---------- 계급 오르기 ---------- */
defineScene('watch_promote', {
  need: (g) => isWatch(g) && W(g).rank < 3,
  title: (g) => `${RANKS[W(g).rank + 1]} 자리`,
  text: (g) => { const st = W(g), b = st.boss; return `${RANKS[st.rank + 1]} 자리가 하나 비었다. ${b ? `${TEMPERS[b.temper].name} ${b.name} 대장이` : '대장이'} 나와 다른 사람 하나를 두고 고민한다는 말이 돌았다. 지금까지 쌓은 공은 ${Math.round(st.merit)}.${b?.temper === 'crooked' ? ' 동료가 귀띔했다. "대장 책상 서랍은 은화 소리를 좋아해."' : ''}`; },
  choices: (g) => {
    const st = W(g), cost = 15 + st.rank * 20;
    return [
      { label: '공으로만 겨룬다', key: 'merit' },
      ...(crooked(g) ? [{ label: `대장에게 은화 ${cost}닢을 바친다`, key: 'bribe' }] : []),
      { label: '경쟁자의 약점을 대장에게 흘린다', key: 'dirty' },
      { label: '자리를 양보한다', key: 'yield' },
    ];
  },
  resolve(g, rng, s, key) {
    const st = W(g), next = st.rank + 1, cost = 15 + st.rank * 20;
    st.promoAt = mi(g); st.promoWait = 12; // 놓치면 한 해 뒤에 다시, 양보하면 한 해 반 뒤에
    const up1 = () => { st.rank = next; logW(g, `${RANKS[next]}에 올랐다.`); note(g, `${unitOf(st.place)} ${RANKS[next]}에 올랐다.`); if (next >= 2) chron(g, `${g.player.name}, ${unitOf(st.place)} ${RANKS[next]}에 오르다.`); if (next === 3) st.boss = null; st.promoWait = 6; return next; };
    if (key === 'yield') { st.promoWait = 18; deed(g, 'kind', 1, null); return '자리를 양보했다. 경쟁자는 의아한 얼굴로 띠를 받았다. 다음 기회는 또 올 것이다.'; }
    if (key === 'bribe') { if (g.player.money < cost) return `은화 ${cost}닢이 없었다. 대장은 다른 사람의 이름을 불렀다.`; pay(g, cost); st.bribes += 1; up1(); return `서랍이 소리 없이 닫혔다. 다음 날 아침 ${RANKS[next]}의 띠가 내 것이 되었다.${next === 3 ? ' 대장은 더 높은 자리로 옮겨 갔다. 이제 이 경비대는 내 손에 있다.' : ''}`; }
    if (key === 'dirty') {
      if (check(rng, stat(g, 'int') * 0.4 + stat(g, 'cha') * 0.4, 36)) { deed(g, 'honest', -2, null); up1(); return `경쟁자가 노름판에 드나든다는 말을 흘렸다. 그는 띠를 받지 못했다. 나는 받았다. 축하주가 썼다.`; }
      addMerit(g, -4); return '흘린 말이 되돌아왔다. 대장은 "동료를 파는 놈은 쓰지 않는다"며 경쟁자에게 띠를 주었다.';
    }
    const p = clamp(0.35 + (st.merit - NEED[st.rank]) / 40 + (st.boss?.temper === 'fair' ? 0.15 : 0) - (st.boss?.temper === 'crooked' ? 0.2 : 0) + (stat(g, 'wil') - 30) / 200, 0.1, 0.9);
    if (rng.chance(p)) { up1(); return `대장이 모두 앞에서 내 이름을 불렀다. ${RANKS[next]}의 띠를 받았다. 동료들이 등을 두드렸다.${next === 3 ? ' 늙은 대장은 물러나며 열쇠 꾸러미를 넘겨주었다. 이제 이 경비대는 내 손에 있다.' : ''}`; }
    return '대장은 다른 사람의 이름을 불렀다. 공이 모자랐는지, 다른 무엇이 모자랐는지 아무도 말해 주지 않았다.';
  },
});

/* ---------- 경비대장: 방침 ---------- */
export const POLICY = {
  strict: { name: '엄하게', order: 8, text: '작은 죄도 감방에 넣는다' },
  fair: { name: '공정하게', order: 4, text: '잡을 놈만 잡는다' },
  lenient: { name: '너그럽게', order: -2, text: '훈계로 끝낼 일은 훈계로 끝낸다' },
  crooked: { name: '뒷돈으로', order: -8, text: '봉투가 오가면 눈을 감는다' },
};
ACTIONS.push({
  id: 'watch_command', name: '경비대 방침을 정한다', icon: 'banner',
  desc: '경비대장으로서 대원들에게 이 고장을 어떻게 지킬지 일러둔다. 치안과 사람들의 평, 내 주머니가 달라진다.',
  available: (g) => isWatch(g) && W(g).rank >= 3 && free(g) && L(g).job.place === here(g) && !sceneQueued(g, 'watch_policy'),
  run(g) { queueScene(g, 'watch_policy', {}, { first: true }); return '대원들을 마당에 세우고 앞에 섰다.'; },
});
defineScene('watch_policy', {
  need: (g) => isWatch(g) && W(g).rank >= 3,
  title: (g) => `${unitOf(W(g).place)}의 방침`,
  text: (g) => { const p = W(g).policy; return `지금 이 고장은 ${Math.round(orderOf(g))}. 대원 마흔이 내 말을 기다린다.${p ? ` 지금 방침은 "${POLICY[p].name}"이다.` : ''}`; },
  choices: () => Object.entries(POLICY).map(([k, v]) => ({ label: `${v.name}: ${v.text}`, key: k })),
  resolve(g, rng, s, key) {
    const st = W(g); st.policy = key;
    logW(g, `경비대 방침을 "${POLICY[key].name}"으로 정했다.`);
    if (key === 'crooked') deed(g, 'honest', -4, '경비대장이 봉투를 받는다더라');
    if (key === 'strict') deed(g, 'kind', -1, null);
    if (key === 'fair') deed(g, 'honest', 2, null);
    return { strict: '"오늘부터 소매치기 하나도 그냥 넘기지 마라." 감방이 금방 찰 것이다.', fair: '"잡을 놈은 잡고, 억울한 사람은 만들지 마라." 대원들이 고개를 끄덕였다.', lenient: '"주먹보다 말을 먼저 써라." 늙은 대원 몇이 피식 웃었다.', crooked: '"봉투는 내 방으로 가져와라. 나눠 줄 것이다." 대원들의 얼굴이 밝아졌다. 거리는 어두워질 것이다.' }[key];
  },
});

/* ---------- 상관의 부탁 ---------- */
defineScene('watch_boss', {
  need: (g) => isWatch(g) && !!W(g).boss,
  title: (g) => `${W(g).boss.name} 대장`,
  text: (g, s) => {
    const b = W(g).boss;
    return {
      crooked: `${b.name} 대장이 나를 방으로 불렀다. "${s.house} 뒷문은 오늘 밤 순찰에서 빼라. 이유는 묻지 말고." 책상 위에 은화 한 줌이 놓여 있다.`,
      strict: `${b.name} 대장이 근무표를 내밀었다. "이번 달 밤 근무는 다 네 몫이다. 지난번 보고서에 글자가 틀렸더군."`,
      lazy: `${b.name} 대장은 하품을 하며 말했다. "윗선에서 감찰이 온다는데, 장부 좀 맞춰 놔라. 비는 칸은 대충 채우고."`,
      fair: `${b.name} 대장이 차를 따라 주었다. "다음 달에 신참 둘이 온다. 네가 데리고 다니며 가르쳐라. 못 미더우면 말하고."`,
    }[b.temper];
  },
  choices: (g) => ({
    crooked: [{ label: '은화를 받고 순찰에서 뺀다', key: 'take' }, { label: '못 들은 척 그 집 앞을 돈다', key: 'defy' }, { label: '감찰관에게 알린다', key: 'report' }],
    strict: [{ label: '군말 없이 밤 근무를 선다', key: 'obey' }, { label: '부당하다고 따진다', key: 'argue' }],
    lazy: [{ label: '장부를 그럴듯하게 채운다', key: 'fake' }, { label: '빈칸은 빈칸대로 둔다', key: 'honest' }],
    fair: [{ label: '신참을 맡는다', key: 'teach' }, { label: '아직은 자신이 없다고 한다', key: 'decline' }],
  }[W(g).boss.temper]),
  resolve(g, rng, s, key) {
    const st = W(g);
    if (key === 'take') { g.player.money += 15; st.bribes += 1; addMerit(g, 2); deed(g, 'honest', -2, null); return `은화 열다섯 닢. 그날 밤 ${s.house} 뒷문으로 수레 몇 대가 드나들었다는 말을 나중에 들었다.`; }
    if (key === 'defy') { addMerit(g, -2); stress(g, 8); return `그 집 앞을 세 번이나 돌았다. 아무 일도 없었다. 다음 날부터 대장은 나에게 말을 걸지 않았다.`; }
    if (key === 'report') { if (rng.chance(0.5)) { st.boss = { name: pick(rng, BOSS_NAMES), temper: 'fair', since: mi(g) }; addMerit(g, 5); deed(g, 'honest', 3, '경비대장의 뒷돈을 고발했다더라'); logW(g, '뒷돈 받는 대장을 고발했다.'); return `감찰관이 대장의 서랍을 열었다. 대장은 그 주에 끌려갔고, 새 대장 ${J(st.boss.name, '이/가')} 왔다. 대원 몇은 나를 영웅이라 했고, 몇은 배신자라 했다.`; } addMerit(g, -5); stress(g, 15); return '감찰관은 대장과 같은 술자리에 앉는 사람이었다. 고발장은 대장 책상으로 돌아왔다. 그 뒤로 내 근무는 모두 성문 밖 초소였다.'; }
    if (key === 'obey') { tired(g, 15); addMerit(g, 2); return '한 달 내내 밤을 섰다. 대장은 끝에 가서 한마디 했다. "글자는 틀려도 근무는 안 틀리는군."'; }
    if (key === 'argue') { if (check(rng, stat(g, 'cha') * 0.5 + stat(g, 'wil') * 0.4, 38)) return '대장은 한참 노려보더니 근무표를 반으로 찢었다. "반만 서라."'; addMerit(g, -2); return '대장은 근무표에 밤 근무를 한 줄 더 적었다.'; }
    if (key === 'fake') { addMerit(g, 1); deed(g, 'honest', -1, null); return '빈칸을 그럴듯한 숫자로 채웠다. 감찰관은 장부를 넘겨보고 고개를 끄덕였다. 아무도 몰랐다. 나만 알았다.'; }
    if (key === 'honest') { if (rng.chance(0.5)) { addMerit(g, 2); return '빈칸 그대로 장부를 냈다. 감찰관은 그 빈칸 덕에 대장보다 나를 기억했다.'; } addMerit(g, -1); return '빈칸 그대로 냈다. 대장이 꾸지람을 들었고, 그 꾸지람은 고스란히 나에게 내려왔다.'; }
    if (key === 'teach') { addMerit(g, 2); gainStat(g, 'cha', 0.4); st.mates.push({ name: pick(rng, MATE_NAMES), trait: pick(rng, TRAITS), since: mi(g), hurt: false, rookie: true }); return '신참 둘을 데리고 순찰을 돌았다. 하나는 겁이 많았고 하나는 너무 겁이 없었다. 석 달 뒤 둘 다 제 몫을 했다.'; }
    return '대장은 고개를 끄덕였다. "때가 되면 말해라."';
  },
});

/* ---------- 내가 잡은 사람의 원한 ---------- */
defineScene('watch_grudge', {
  need: (g, s) => !!W(g).caught.find((x) => x.at === s.when && x.name === s.name && !x.done),
  title: (g, s) => s.name,
  text: (g, s) => `${s.crime} 일로 내가 잡아넣었던 ${J(s.name, '이/가')} 골목 어귀에 서 있다. 감방에서 나온 지 얼마 안 된 얼굴이다. 뒤에 둘이 더 있다. "경비대 나리, 오랜만이오. 그동안 많이 생각했소. 나리 생각을."`,
  choices: (g) => [
    { label: '칼을 뽑는다', key: 'fight' },
    { label: '"이제 새로 살아라." 말로 푼다', key: 'talk' },
    { label: '은화를 쥐여 주고 보낸다', key: 'pay' },
    { label: '뒤돌아 뛴다', key: 'run' },
  ],
  resolve(g, rng, s, key) {
    const x = W(g).caught.find((y) => y.at === s.when && y.name === s.name);
    if (x) x.done = true;
    if (key === 'fight') {
      queueFight(g, rng, { title: '골목의 원한', terrain: 'alley', intro: `${J(s.name, '이/가')} 소매에서 칼을 뽑았다. 뒤의 둘이 양옆으로 벌어졌다.`, enc: { unit: 'thug', count: 2, leader: rng.chance(0.4) ? 'bandit_chief' : null }, reward: { money: 2, renown: 1 }, avoidLabel: '호루라기를 분다', avoidText: '호루라기 소리에 놈들이 흩어졌다. 다음엔 어디서 기다릴지 모른다.' });
      return '제복 깃을 여미고 칼자루를 잡았다.';
    }
    if (key === 'talk') { if (check(rng, stat(g, 'cha') * 0.6 + stat(g, 'wil') * 0.3, 36)) { deed(g, 'kind', 2, null); return `한참 말이 오갔다. ${J(s.name, '은/는')} 끝내 칼을 거두었다. "다음에 또 잡히면 그땐 나리 손에 잡히고 싶소." 무슨 뜻인지는 알 것 같았다.`; } g.player.injuries.push({ name: '골목에서 찔린 옆구리', months: 2 }); stress(g, 10); return '말이 끝나기 전에 칼이 들어왔다. 옆구리를 움켜쥐고 겨우 큰길까지 기어 나왔다.'; }
    if (key === 'pay') { const n = pay(g, 15); return `은화 ${n}닢을 내밀었다. ${J(s.name, '은/는')} 돈을 세어 보고 웃었다. "다음 달에도 여기 있겠소." 끝난 게 아니었다.`; }
    if (check(rng, stat(g, 'agi') * 0.6, 30)) { deed(g, 'brave', -1, null); return '큰길까지 뛰었다. 등 뒤에서 웃음소리가 따라왔다.'; }
    g.player.injuries.push({ name: '몽둥이에 맞은 등', months: 1 }); return '몇 걸음 못 가 등에 몽둥이가 떨어졌다. 놈들은 지갑만 털어 가고 사라졌다.';
  },
});

/* ---------- 치안이 무너질 때 ---------- */
defineScene('watch_riot', {
  need: (g) => isWatch(g),
  title: () => '광장의 군중',
  text: (g) => `빵값이 또 올랐다. 광장에 사람들이 모여 곡물 창고 쪽을 보고 있다. 누가 돌을 들었다. ${W(g).rank >= 2 ? '대원들이 내 명령을 기다린다.' : '대장이 창을 겨누라고 소리쳤다.'}`,
  choices: (g) => [
    { label: '앞장서 창고 문을 막는다', key: 'hold' },
    { label: '창을 내리고 군중과 이야기한다', key: 'talk' },
    { label: '창고 문을 열어 주자고 한다', key: 'open' },
    { label: '제복을 벗고 군중 속으로 사라진다', key: 'desert' },
  ],
  resolve(g, rng, s, key) {
    const st = W(g);
    if (key === 'hold') { if (check(rng, stat(g, 'str') * 0.4 + sk(g, 'sword') * 0.3 + st.rank * 5, 40)) { const m = addMerit(g, 4); nudge(g, 4); deed(g, 'kind', -2, null); return `창고 문 앞에 방패를 세웠다. 돌이 몇 개 날아오다 멎었다. 해가 지자 군중은 흩어졌다. 창고는 지켰다. 그 빵을 누가 먹을지는 내 일이 아니었다.${gains([meritUp(m)])}`; } g.player.injuries.push({ name: '돌에 맞아 찢어진 이마', months: 2 }); nudge(g, -4); return '돌이 비처럼 쏟아졌다. 이마가 찢어진 채 물러섰다. 창고 문이 부서지는 소리가 등 뒤에서 들렸다.'; }
    if (key === 'talk') { if (check(rng, stat(g, 'cha') * 0.6 + st.rank * 5, 38)) { nudge(g, 3); deed(g, 'kind', 2, '폭동 날 창 대신 말로 군중을 달랬다더라'); addMerit(g, 2); return '창을 땅에 꽂고 앞으로 나갔다. 이야기를 들었다. 영주에게 전하겠다고 약속했다. 사람들이 하나둘 돌을 내려놓았다.'; } nudge(g, -3); return '말은 함성에 묻혔다. 대원들이 나를 끌어당겨 뒤로 물렸다.'; }
    if (key === 'open') { if (st.rank >= 3) { nudge(g, 2); deed(g, 'kind', 4, '경비대장이 곡물 창고를 열었다더라'); addMerit(g, -3); return '창고 문을 열라고 명령했다. 사람들이 자루를 하나씩 지고 갔다. 영주의 편지가 사흘 뒤에 닿았다. 내용은 짐작이 갔다.'; } addMerit(g, -3); return '대장은 내 말을 듣고 얼굴을 붉혔다. "네가 영주냐?" 창고는 닫힌 채였다. 그날 밤 문이 부서졌다.'; }
    deed(g, 'brave', -2, null);
    const t = '제복을 벗어 수레 밑에 던지고 군중 속으로 들어갔다. 다음 날 경비대 명부에서 내 이름이 지워졌다.';
    L(g).job = null; discharge(g, '폭동 날 제복을 벗었다.');
    return t;
  },
});

/* ---------- 감찰 ---------- */
defineScene('watch_inquiry', {
  need: (g) => isWatch(g),
  title: () => '감찰관',
  text: (g) => `윗선에서 감찰관이 내려왔다. 장부를 넘기던 손이 내 이름 앞에서 멈추었다. "장사꾼들 말로는, 자네가 걷는 '보호비'가 꽤 된다던데." 그동안 받은 봉투가 ${W(g).bribes + W(g).skimmed}번쯤이다.`,
  choices: (g) => [
    { label: '다 털어놓고 토해 낸다', key: 'confess' },
    { label: '모함이라고 버틴다', key: 'deny' },
    ...(g.player.money >= 30 ? [{ label: '감찰관에게도 봉투를 내민다', key: 'bribe' }] : []),
  ],
  resolve(g, rng, s, key) {
    const st = W(g);
    st.inqAt = mi(g); st.inqBase = st.bribes + st.skimmed; // 넘어가도 두 해 안엔 다시 안 오고, 그 뒤로 새로 받은 봉투만 센다
    if (key === 'confess') { const n = pay(g, 10 + st.skimmed * 4); st.bribes = 0; st.skimmed = 0; st.inqBase = 0; st.rank = Math.max(0, st.rank - 1); st.merit = Math.min(st.merit, NEED[st.rank] ?? st.merit); deed(g, 'honest', 2, null); return `받은 것을 털어놓았다. 은화 ${n}닢을 물어내고 계급이 하나 내려갔다. 그래도 제복은 남았다.`; }
    if (key === 'bribe') { pay(g, 30); if (rng.chance(0.65)) return '감찰관은 봉투를 품에 넣고 장부를 덮었다. "깨끗하군." 깨끗한 사람은 아무도 없었다.'; }
    if (key === 'deny' && check(rng, stat(g, 'cha') * 0.5 + stat(g, 'int') * 0.3, 40 + st.skimmed * 2)) { stress(g, 10); return '끝까지 버텼다. 증인으로 불려 온 장사꾼들이 고개를 숙이고 말을 아꼈다. 감찰관은 혀를 차고 돌아갔다.'; }
    const name = unitOf(st.place);
    L(g).job = null; st.firedAt = mi(g); discharge(g, `감찰에 걸려 ${name}에서 쫓겨났다.`);
    deed(g, 'honest', -3, '경비대에서 뒷돈을 먹다 쫓겨났다더라');
    return `${key === 'bribe' ? '감찰관은 봉투까지 증거 목록에 올렸다. ' : ''}제복과 띠를 반납했다. ${name} 명부에서 내 이름에 붉은 줄이 그어졌다.`;
  },
});

/* ---------- 경비대에 들어가는 길 (경비병 자리가 없는 고장에서도 보인다) ---------- */
export const watchHere = (g) => !!townOf(here(g));
export { adult, free, CASE_KINDS };
