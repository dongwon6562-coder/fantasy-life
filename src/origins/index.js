// 33단계: 태어날 집안 늘리기. 사람 집안 일곱을 FAMILIES에 이어 붙인다(시작 화면의 familiesOf에 그대로 보인다).
// 상태는 g.origins 하나, 화면 연결점은 originLines(g) / originLine(g) / originInfo(g).
// - 집안마다: 시작 장소(베르덴·세레니아·하르펜·레오캐스트·포르텔·그라우벨), 집안 돈, 부모의 일, 인맥 둘(이웃·맞수·은인),
//   어린 시절 장면 셋(나이대별), 집안이 바라는 것(18살에 돌아봄)과 짐(16~24살에 한 번 닥침).
// - 유전과 재능: 마탑 혈통은 마력 핏줄이 짙고(부모 blood.mana), 성당지기 집안은 믿음이 깊게 시작한다.
//   큰 재능을 골랐으면 집안이 그것을 알아보는 장면이 나온다. 집안이 바라는 길과 맞으면 반기고, 어긋나면 부딪친다.
// - 다른 나라에서 태어나면 그 나라 사람(국적)으로 시작한다. 고아는 두 살에 부모를 잃고 키워 준 사람이 있다.
// - 대를 이으면 집안 이야기는 끝나고(past) 내력만 남는다. 다른 종족 집안과 옛 세 집안(자작농·몰락 기사·상인)은 건드리지 않는다.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { FAMILIES, JOBS, STATS, MALE_NAMES, FEMALE_NAMES } from '../data.js';
import { me, playerAge, gainStat, gainSkill } from '../game.js';
import { byId, makePerson, ageYears } from '../npc.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, check } from '../adventure/core.js';
import { rel } from '../relations.js';
import { makeRng } from '../rng.js';
import { realmState } from '../realms/index.js';
import { faithState } from '../faith/index.js';
import { ORIGINS, NEW_JOBS } from './data.js';

for (const [k, v] of Object.entries(NEW_JOBS)) JOBS[k] ??= v;
for (const o of ORIGINS) {
  if (FAMILIES.some((f) => f.id === o.id)) continue;
  const { id, name, desc, money, fatherJob, motherJob, statBias, skillBias, standing, lastNames, place } = o;
  FAMILIES.push({ id, name, desc, money, fatherJob, motherJob, statBias, skillBias, standing, lastNames, home: place, origin: true });
}

const mi = (g) => g.date.year * 12 + g.date.month;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 191) ^ Math.imul(mi(g) * 181 + salt + 43, 2654435761)) | 0 });
export const originOf = (id) => ORIGINS.find((o) => o.id === id) ?? null;
const O = (g) => originOf(g.origins?.id);

/* ---------- 상태 ---------- */
export function originsState(g) {
  g.origins ??= {};
  const s = g.origins;
  s.id ??= null;       // 집안 id (새 일곱 가운데 하나일 때만)
  s.owner ??= null;    // 그 집안에서 태어난 사람 id
  s.flags ??= {};
  s.ties ??= {};       // 역할 → 사람 id
  s.seen ??= [];       // 본 장면 id
  s.sceneAt ??= -99;
  s.lineAt ??= -99;
  s.used ??= [];
  s.month ??= [];
  s.want ??= null;     // 'met' | 'missed'
  s.burden ??= null;   // 짐이 닥친 결과 열쇠
  s.gift ??= null;     // 재능을 알아본 장면을 봤는가: 'fit' | 'clash' | 'plain'
  s.past ??= false;    // 대를 이은 뒤
  s.log ??= [];
  return s;
}
const S = originsState;
function log(g, text) { const s = S(g); s.log.push({ y: g.date.year, m: g.date.month, text }); if (s.log.length > 20) s.log.shift(); }
const mine = (g) => { const s = g.origins; return !!s?.id && !s.past && s.owner === g.player?.id; };
const father = (g) => byId(g, me(g)?.fatherId);
const mother = (g) => byId(g, me(g)?.motherId);
const tie = (g, role) => byId(g, S(g).ties[role]);
function ctx(g) {
  const s = S(g);
  const t = {};
  for (const tt of O(g)?.ties ?? []) t[tt.role] = tie(g, tt.role)?.name ?? tt.word;
  return { n: g.player.name, fa: father(g)?.name ?? '아버지', mo: mother(g)?.name ?? '어머니', place: placeName(O(g)?.place), t, mana: g.player.manaPotential ?? 0, flags: s.flags };
}
const aff = (p, n) => { if (!p) return; rel(p); p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
function applyFx(g, fx = {}) {
  for (const [k, v] of Object.entries(fx.stat ?? {})) gainStat(g, k, v);
  for (const [k, v] of Object.entries(fx.skill ?? {})) gainSkill(g, k, v);
  for (const [who, v] of Object.entries(fx.aff ?? {})) aff(who === 'father' ? father(g) : who === 'mother' ? mother(g) : tie(g, who), v);
  if (fx.fam) g.player.familyMoney = Math.max(0, (g.player.familyMoney ?? 0) + fx.fam);
  if (fx.money) g.player.money = Math.max(0, g.player.money + fx.money);
  if (fx.flag) S(g).flags[fx.flag] = mi(g);
  if (fx.stress) stress(g, fx.stress);
  if (fx.renown) L(g).renown = (L(g).renown ?? 0) + fx.renown;
}

/* ---------- 태어날 때 ---------- */
// 사는 곳은 다른 갈래가 처음 고장을 읽기 전에 정한다(맨 앞), 나머지는 다른 갈래가 상태를 만든 뒤에(맨 뒤)
function placeAtBirth(g) {
  const s = S(g);
  const o = originOf(g.player.familyId);
  if (!o) return;
  s.id = o.id; s.owner = g.player.id;
  const life = L(g);
  life.place = o.place; life.home = 'family';
  const R = realmState(g);
  const realm = PLACES[o.place]?.realm ?? 'leonia';
  R.citizen = realm; R.cur = realm; R.last = o.place;
  for (const id of g.player.familyIds) { const p = byId(g, id); if (p) p.place = o.place; }
}
// 삶 상태(g.life)를 새로 만드는 adventure 훅 바로 뒤에 끼운다
{
  const at = HOOKS.newGame.findIndex((f) => /defaultLife\(\)/.test(String(f)));
  HOOKS.newGame.splice(at >= 0 ? at + 1 : 0, 0, (g) => { g.origins = null; placeAtBirth(g); });
}
HOOKS.newGame.push((g) => {
  const s = S(g);
  const o = originOf(s.id);
  if (!o) return;
  if (L(g).place !== o.place) placeAtBirth(g);
  s.ownerName = g.player.name;
  const rng = ownRng(g, 2);
  const fa = father(g), mo = mother(g);
  // 인맥
  for (const t of o.ties) {
    const p = makePerson(rng, { sex: t.sex, ageMonths: rng.int(t.age[0], t.age[1]) * 12 + rng.int(0, 11), job: t.job });
    const taken = [g.player.name, fa?.name, mo?.name, ...Object.values(s.ties).map((id) => byId(g, id)?.name)];
    for (let k = 0; k < 8 && taken.includes(p.name); k++) p.name = rng.pick(t.sex === 'm' ? MALE_NAMES : FEMALE_NAMES);
    p.place = o.place; p.known = true; p.affection = t.aff; if (t.riv) p.rivalry = t.riv;
    p.originRole = t.role;
    if (t.role === 'brother' && fa) { p.lastName = fa.lastName; p.fatherId = fa.id; fa.childIds.push(p.id); }
    if (t.role === 'cousin') p.lastName = g.player.lastName;
    g.people.push(p); s.ties[t.role] = p.id;
  }
  // 집안마다 다른 처음
  if (o.id === 'merchant_bastard' && fa && mo) {
    // 아버지에게는 혼인한 부인과 적자가 따로 있다. 나는 어머니 성을 쓴다.
    const wife = makePerson(rng, { sex: 'f', ageMonths: (ageYears(fa) - 2) * 12, job: 'idle' });
    wife.place = o.place; fa.lastName = rng.pick(['반 호르스트', '데 발크', '크뤼거']); wife.lastName = fa.lastName; g.people.push(wife);
    fa.spouseId = wife.id; wife.spouseId = fa.id; mo.spouseId = null; fa.wealth = 700; fa.affection = 8;
    const br = tie(g, 'brother'); if (br) { br.lastName = fa.lastName; br.motherId = wife.id; wife.childIds.push(br.id); }
  }
  if (o.id === 'count_bastard' && fa && mo) {
    fa.spouseId = null; mo.spouseId = null; fa.ageMonths += 8 * 12; fa.affection = 10; fa.wealth = 900; fa.title = '백작';
  }
  if (o.mana) {
    // 마력 핏줄: 부모의 피에 마력이 짙다. 아이도 대개 느낄 만큼은 타고난다.
    const m = rng.float(o.mana[0], o.mana[1]);
    g.player.manaPotential = Math.max(g.player.manaPotential ?? 0, m);
    if (fa) fa.blood = { t: Object.fromEntries(STATS.map((x) => [x.id, x.id === 'int' || x.id === 'wil' ? 1.15 : 1])), mana: Math.round(rng.float(0.5, 0.75) * 100) / 100 };
  }
  if (o.devotion) { const f = faithState(g); f.devotion = Math.max(f.devotion ?? 0, o.devotion); }
  if (o.orphan) {
    for (const p of [fa, mo]) if (p) { p.alive = false; p.deathCause = '열병'; p.history.push({ y: g.date.year, m: g.date.month, text: '열병으로 세상을 떠났다.' }); }
    if (fa) fa.spouseId = null; if (mo) mo.spouseId = null;
    // 형제가 있었다면 다른 집에 맡겨졌다
    for (const id of g.player.familyIds.slice(2)) { const p = byId(g, id); if (p) p.away = true; }
    const fence = tie(g, 'fence');
    if (fence) { fence.affection = 45; g.player.familyIds.push(fence.id); }
    g.news = [{ text: `레오캐스트 남쪽 빈민가, 열병이 지나간 골목에서 장물아비 할멈이 갓난아이 하나를 거두었다. 이름은 ${g.player.name}.`, rel: 100 }];
  }
  note(g, `${placeName(o.place)}에서 태어났다.`);
});

/* ---------- 어린 시절 장면 ---------- */
defineScene('origin_child', {
  title: (g, s) => O(g)?.scenes.find((x) => x.id === s.sid)?.title ?? '어린 날',
  text: (g, s) => O(g)?.scenes.find((x) => x.id === s.sid)?.text(ctx(g)) ?? '',
  choices: (g, s) => (O(g)?.scenes.find((x) => x.id === s.sid)?.choices ?? []).map((c, i) => ({ label: c.label, key: `c${i}` })),
  resolve(g, rng, s, key) {
    const sc = O(g)?.scenes.find((x) => x.id === s.sid);
    const c = sc?.choices[+String(key).slice(1)] ?? sc?.choices[0];
    if (!c) return '지나간 일이다.';
    const out = c.out(ctx(g));
    applyFx(g, c.fx);
    log(g, `${sc.title}: ${c.label}`);
    return out;
  },
});

/* ---------- 재능을 집안이 알아볼 때 ---------- */
const GIFT_WORD = { magic: '마력', sword: '칼 쓰는 손', letters: '머리', trade: '장사 눈', craft: '손재주', faith: '믿음' };
const FIT_TEXT = {
  count_bastard: (c) => `성 기사단 교관이 골목에서 막대기를 휘두르는 나를 보고 걸음을 멈췄다. 그날 밤 ${c.fa}의 서기가 어머니를 찾아왔다. "백작께서 아이 이야기를 들으셨소."`,
  merchant_bastard: (c) => `${c.t.clerk} 영감이 내가 맞춘 셈을 아버지 상단 회의에 들고 갔다고 한다. 다음 날 ${c.fa}의 봉랍이 찍힌 쪽지가 왔다. "셈이 빠르다더구나. 열다섯이 되면 상단 뒷방에 자리가 있다." 이름 대신 \'아이\'라고 적혀 있었다.`,
  tower_blood: (c) => `${J(c.t.master, '이/가')} 우리 집에 들렀다가 내가 만진 촛불을 보고 한참 말이 없었다. 돌아가며 아버지에게 낮게 말했다. "네 집안에서 백 년 만에 나올 그릇이다." 아버지는 그날 밤 혼자 술을 마셨다.`,
  sexton: (c) => `${c.t.priest} 사제가 대성당 맨 앞줄에서 기도하는 나를 오래 보았다. 다음 날 아버지를 불러 수련원 이야기를 꺼냈다. 아버지가 종을 치는 박자가 그날따라 빨랐다.`,
  capital_artisan: (c) => `길드장 ${J(c.t.guildmaster, '이/가')} 내가 깎은 은 단추를 손바닥에 올려놓고 굴려 보았다. "이걸 몇 살에 했다고?" 아버지는 대답하지 않고 웃기만 했다.`,
  slum_orphan: (c) => `${c.t.fence} 할멈이 장물 값을 매기는 걸 옆에서 거들었다. 할멈보다 먼저 가짜 은을 알아보았다. 할멈이 안경을 벗고 나를 보았다. "너는 이 골목에서 썩을 애가 아니다."`,
  port_folk: (c) => `${c.t.captain} 선장이 부두에서 생선 값을 흥정하는 나를 보고 크게 웃었다. "저 녀석, 열 살에 나를 벗겨 먹으려 드는군. 몇 해 지나면 내 배 장부를 맡겨도 되겠어."`,
  march_guard: (c) => `${J(c.t.sergeant, '이/가')} 병영 마당에서 견습들과 막대기 싸움을 하는 나를 보더니 진짜 칼을 쥐여 주었다. "아버지보다 빠르다. 아버지한텐 말하지 마라."`,
};
const CLASH_TEXT = (o, gift) => ({
  count_bastard: (c) => `${GIFT_WORD[gift]}로 이름이 나기 시작하자 어머니는 기뻐하면서도 걱정했다. 백작가 사람들은 칼 잘 쓰는 서자보다 조용한 서자를 좋아한다고.`,
  merchant_bastard: (c) => `셈보다 ${GIFT_WORD[gift]}로 이름이 났다. 어머니는 기뻐했지만 상단 사람들은 서출이 다른 데서 이름을 내는 걸 더 반기는 눈치였다. 장부에서 멀수록 좋다는 듯이.`,
  tower_blood: (c) => `마력보다 ${GIFT_WORD[gift]}가 먼저 눈에 띄었다. 아버지는 칭찬하는 사람들 앞에서 웃었지만, 집에 오면 촛불 시험을 다시 시켰다.`,
  sexton: (c) => `${GIFT_WORD[gift]}로 사람들이 나를 알아보기 시작했다. 아버지는 그것이 기도로 얻은 것이냐고 물었다. 아니라고 하자 한참 말이 없었다.`,
  capital_artisan: (c) => `공방보다 ${GIFT_WORD[gift]} 쪽으로 사람들이 나를 불렀다. 아버지는 진열창을 닦다 말고 "은은 기다려 주지 않는다"고만 했다.`,
  slum_orphan: (c) => `골목에서 ${GIFT_WORD[gift]}로 소문이 났다. 할멈은 그런 소문은 쥐 떼 귀에 먼저 들어간다며 입단속을 시켰다.`,
  port_folk: (c) => `배보다 ${GIFT_WORD[gift]}가 먼저 사람들 눈에 들었다. 아버지는 "바다는 그런 걸 안 묻는다"고 했지만, 자랑하는 목소리는 숨기지 못했다.`,
  march_guard: (c) => `칼보다 ${GIFT_WORD[gift]}가 먼저 눈에 띄었다. 아버지는 그것도 성벽에 쓸모가 있겠냐고 하사에게 물었다. 하사는 대답 대신 어깨를 으쓱했다.`,
}[o.id]);
defineScene('origin_gift', {
  title: () => '집안이 알아본 것',
  text: (g, s) => { const o = O(g); return s.fit ? FIT_TEXT[o.id](ctx(g)) : CLASH_TEXT(o, s.gift)(ctx(g)); },
  choices: (g, s) => s.fit ? [{ label: '그 기대를 받아들인다', key: 'take' }, { label: '아직은 모르겠다고 한다', key: 'wait' }] : [{ label: '집안이 바라는 길도 해 보겠다고 한다', key: 'both' }, { label: '내가 타고난 쪽으로 가겠다고 한다', key: 'mine' }],
  resolve(g, rng, s, key) {
    const st = S(g);
    st.gift = s.fit ? 'fit' : 'clash';
    if (key === 'take') { aff(father(g), 6); aff(mother(g), 4); stress(g, 3); return '그날부터 집안 사람들이 나를 보는 눈이 달라졌다. 기대라는 것은 따뜻하고, 무겁다.'; }
    if (key === 'wait') { stress(g, -2); return '모르겠다고 했다. 어른들은 웃었다. 아무도 그 말을 믿지 않는 것 같았다.'; }
    if (key === 'both') { stress(g, 6); aff(father(g), 4); return '두 길을 다 하겠다고 했다. 하루가 두 배로 길어졌다.'; }
    aff(father(g), -5); return '내 길을 가겠다고 했다. 집안 어른들 표정이 굳었다. 그래도 아무도 막지는 않았다.';
  },
});

/* ---------- 열여덟: 집안이 바란 것을 돌아본다 ---------- */
defineScene('origin_want', {
  title: () => '집안이 바란 것',
  text: (g, s) => {
    const o = O(g); const c = ctx(g);
    const who = father(g)?.alive ? c.fa : mother(g)?.alive ? c.mo : (o.orphan ? c.t.fence : '집안 어른들');
    return s.met
      ? `열여덟. ${o.want.text} ${J(who, '은/는')} 요즘 이웃에게 내 이야기를 할 때 목소리가 커진다. 집안이 바란 '${o.want.name}'에 나는 가까이 와 있다.`
      : `열여덟. ${o.want.text} 그런데 나는 다른 데 와 있다. ${J(who, '은/는')} 그 이야기를 꺼내지 않는다. 꺼내지 않는 것이 더 크게 들린다.`;
  },
  choices: (g, s) => s.met
    ? [{ label: '집안의 자랑으로 살겠다고 한다', key: 'pride' }, { label: '그래도 내 길은 따로 있다고 한다', key: 'own' }]
    : [{ label: '바란 대로 못 해 미안하다고 한다', key: 'sorry' }, { label: '내 길은 내가 정한다고 말한다', key: 'own' }],
  resolve(g, rng, s, key) {
    const st = S(g); const o = O(g);
    st.want = s.met ? 'met' : 'missed';
    log(g, `${o.want.name}: ${s.met ? '집안이 바란 대로' : '다른 길'}`);
    if (key === 'pride') { aff(father(g), 10); aff(mother(g), 8); L(g).renown = (L(g).renown ?? 0) + 2; note(g, `집안이 바란 ${J(o.want.name, '을/를')} 이루어 가고 있다.`); return '그날 저녁상은 길었다. 술잔이 몇 번 돌았는지 모른다. 집안 사람들 얼굴이 처음 보는 빛깔이었다.'; }
    if (key === 'sorry') { aff(father(g), 4); aff(mother(g), 6); stress(g, 6); return '어깨에 손 하나가 얹혔다. "살아 있으면 된다." 그 말이 위로인지 체념인지는 끝내 묻지 못했다.'; }
    aff(father(g), s.met ? -2 : -6); stress(g, -4); note(g, '집안이 바란 길 대신 내 길을 가기로 했다.');
    return s.met ? '다들 웃었다. 농담인 줄 알았던 것이다. 나는 웃지 않았다.' : '한동안 아무도 말하지 않았다. 그러다 누군가 "그 고집은 누굴 닮았는지" 하고 웃었다. 그것으로 끝이었다.';
  },
});

/* ---------- 짐: 16~24살에 한 번 닥친다 ---------- */
const BURDEN = {
  count_bastard: {
    title: '적자의 고발', text: (c) => `${J(c.t.brother, '이/가')} 백작가 은잔 하나가 사라졌다며 나를 지목했다. 성 경비병들이 셋집 문을 두드린다. 은잔은 내 짐 속에서 나올 것이다. 누가 넣었는지는 안다.`,
    choices: [
      { label: '결투로 결백을 가리겠다고 한다', key: 'duel', run: (g, rng, c) => check(rng, (g.player.skills.sword ?? 0) + g.player.stats.agi / 2, 40) ? (applyFx(g, { renown: 4, aff: { brother: -20, father: 6 } }), `성 마당에서 ${c.t.brother}의 칼이 땅에 떨어졌다. ${J(c.fa, '은/는')} 창가에서 다 보고 있었다. 은잔 이야기는 그날로 사라졌다.`) : (applyFx(g, { stress: 15, aff: { brother: -10 } }), '팔에 칼을 맞고 무릎을 꿇었다. 결백은 증명되지 않았다. 다만 그 뒤로 나를 도둑이라 부르는 사람은 드물었다. 피를 흘린 도둑은 없으니까.') },
      { label: '아버지에게 직접 호소한다', key: 'plea', run: (g, rng, c) => (father(g)?.affection ?? 0) >= 15 ? (applyFx(g, { aff: { father: 8 } }), `${J(c.fa, '은/는')} 은잔을 내 짐에서 꺼내 보더니 ${c.t.brother}에게 건넸다. "네 것이니 네가 돌려놓아라." 그게 전부였다. 그걸로 충분했다.`) : (applyFx(g, { stress: 12, fam: -20 }), '성문은 열리지 않았다. 대신 벌금 고지서가 왔다. 어머니가 모아 둔 은화가 거기 다 들어갔다.') },
      { label: '어머니를 데리고 베르덴을 떠난다', key: 'leave', run: (g) => { applyFx(g, { stress: 8, flag: 'cb_left' }); return '밤에 짐을 쌌다. 어머니는 성벽 쪽을 한 번도 돌아보지 않았다. 나는 몇 번 돌아보았다.'; } },
    ],
  },
  merchant_bastard: {
    title: '사라진 비단', text: (c) => `아버지 상단 창고에서 비단 두 필이 사라졌다. ${J(c.t.brother, '이/가')} 어머니 가게에서 그 비단 자투리를 보았다고 했다. 상단 경비들이 가게 문을 두드린다. 자투리는 지난달 어머니가 정당하게 사 온 것이다. 영수증은 어디 있는지 모른다.`,
    choices: [
      { label: '상단 장부를 뒤져 비단 출납을 밝힌다', key: 'ledger', run: (g, rng, c) => check(rng, (g.player.skills.trade ?? 0) + g.player.stats.int / 2, 38) ? (applyFx(g, { renown: 3, aff: { brother: -15, father: 8, clerk: 6 } }), `${c.t.clerk} 영감과 밤새 장부를 넘겼다. 비단 두 필은 창고에서 나간 적이 없었다. 다른 칸에 잘못 적혀 있었을 뿐이다. ${J(c.fa, '은/는')} 그 장부를 회의 탁자 한가운데 펼쳐 놓게 했다.`) : (applyFx(g, { stress: 12, fam: -20 }), '장부는 너무 두꺼웠고 시간은 모자랐다. 어머니가 비단 값을 물어냈다. 은화 스무 닢이었다. 어머니는 괜찮다고 했다. 괜찮은 얼굴이 아니었다.') },
      { label: '아버지에게 직접 편지를 쓴다', key: 'plea', run: (g, rng, c) => (father(g)?.affection ?? 0) >= 15 ? (applyFx(g, { aff: { father: 8 } }), `답장은 오지 않았다. 대신 다음 날 경비들이 돌아갔다. ${J(c.t.brother, '은/는')} 그 주 내내 부두에 나타나지 않았다.`) : (applyFx(g, { stress: 10, fam: -15 }), '편지는 부인 손에 먼저 들어간 것 같았다. 경비들은 자투리를 다 가져갔다.') },
      { label: '어머니와 포르텔을 떠난다', key: 'leave', run: (g) => { applyFx(g, { stress: 8, flag: 'mb_left' }); return '재봉틀을 수레에 실었다. 부두 쪽 길로 가지 않고 언덕길로 돌아 나갔다. 아버지 상단 깃발이 안 보이는 데까지 가서야 어머니가 처음 말을 했다. "배고프지?"'; } },
    ],
  },
  tower_blood: {
    title: '탑의 출납관', text: (c) => `탑의 출납관이 다시 왔다. 4대째 이자가 이번 해에 만기라고. 은화 80닢을 내든가, 아니면 내가 탑에서 다섯 해 무급으로 일하든가.${c.flags.tb_pledged ? ' 열다섯에 한 약속을 장부가 기억하고 있다.' : ''}`,
    choices: [
      { label: '탑에서 다섯 해 일하기로 한다', key: 'serve', run: (g) => { applyFx(g, { skill: { magic: 3, letters: 2 }, stress: 8, aff: { father: 6, master: 4 }, flag: 'tb_served' }); return '탑의 지하 서고에서 남의 주문서를 정리하는 일이었다. 무급이었지만 읽는 것은 막지 않았다. 다섯 해 동안 내가 읽은 책이 아버지가 평생 읽은 것보다 많았다.'; } },
      { label: '은화 80닢을 마련해 갚는다', key: 'pay', run: (g) => { const have = g.player.money + (g.player.familyMoney ?? 0); if (have >= 80) { const fromMe = Math.min(g.player.money, 80); g.player.money -= fromMe; g.player.familyMoney -= 80 - fromMe; applyFx(g, { aff: { father: 8, mother: 6 }, flag: 'tb_paid' }); return '출납관이 장부의 4대째 줄에 선을 그었다. 아버지가 그 줄을 한참 내려다보았다.'; } applyFx(g, { stress: 12, fam: -10 }); return '모자랐다. 출납관은 집안 책장의 책 절반을 담보로 실어 갔다. 빈 선반이 이 빠진 입처럼 보였다.'; } },
    ],
  },
  sexton: {
    title: '이단심문소의 질문', text: (c) => `이단심문관이 종탑 아래 방에 왔다. 지난 겨울 대성당 묘지에서 밤에 불빛을 본 사람이 있다고. 성당지기 집 아이라면 누가 드나드는지 알 거라고.${c.flags.sx_robbed ? ' 그 무덤 생각이 났다.' : ''}`,
    choices: [
      { label: '본 대로 말한다', key: 'truth', run: (g) => { const f = faithState(g); f.suspicion = clamp((f.suspicion ?? 0) - 5, 0, 100); applyFx(g, { aff: { priest: 6, gravedigger: -10 }, stress: 6 }); return '아는 대로 말했다. 심문관이 받아 적었다. 한 달 뒤 묘지 근처 약초꾼 하나가 끌려갔다. 내 말 때문인지는 모른다.'; } },
      { label: '아무것도 모른다고 한다', key: 'deny', run: (g) => { const f = faithState(g); f.suspicion = clamp((f.suspicion ?? 0) + 8, 0, 100); applyFx(g, { stat: { wil: 0.4 }, stress: 8 }); return '모른다고 했다. 심문관은 오래 나를 보다가 일어섰다. 문간에서 아버지 이름을 한 번 불렀다. 아무 일도 아니라는 듯이.'; } },
    ],
  },
  capital_artisan: {
    title: '공방의 빚', text: (c) => `${J(c.fa, '이/가')} 손을 떨기 시작했다. 정밀한 줄질을 못 한다. 길드 회비는 밀렸고, 건너편 공방이 우리 공방을 사겠다고 사람을 보냈다. 값은 나쁘지 않다. 문 위 문장은 내려야 한다.`,
    choices: [
      { label: '밤을 새워 아버지 몫까지 일한다', key: 'work', run: (g) => { applyFx(g, { skill: { smithing: 3 }, stress: 14, aff: { father: 10 }, flag: 'ca_kept' }); return '한 해 동안 하루 네 시간을 잤다. 회비를 다 갚은 날 아버지가 떨리는 손으로 문 위 문장을 닦았다.'; } },
      { label: '공방을 판다', key: 'sell', run: (g) => { applyFx(g, { fam: 120, aff: { father: -12, rival: 10 }, flag: 'ca_sold' }); return '문장을 내리는 날 아버지는 공방 안에 들어오지 않았다. 건너편 집 아들이 와서 내 손을 잡았다. 미안하다고 했다. 진심인 것 같아서 더 싫었다.'; } },
    ],
  },
  slum_orphan: {
    title: '쥐 떼가 받으러 왔다', text: (c) => `쥐 떼 우두머리가 사람 둘을 데리고 왔다. 어릴 때 골목이 먹여 주고 지켜 준 값을 이제 받겠다고. 일 하나만 하면 된다고 한다. 하지 않으면 ${c.t.fence} 할멈 가게에 불이 날 수도 있다고.`,
    choices: [
      { label: '일 하나를 해 준다', key: 'job', run: (g) => { applyFx(g, { money: 30, stress: 12, flag: 'so_job' }); L(g).notoriety = (L(g).notoriety ?? 0) + 3; return '창고 자물쇠 하나를 땄다. 안에 무엇이 있었는지는 보지 않았다. 다음 날 그 창고 주인이 강에서 떠올랐다는 소문이 돌았다. 받은 은화를 오래 만지작거렸다.'; } },
      { label: '골목 형과 함께 버틴다', key: 'stand', run: (g, rng, c) => check(rng, g.player.stats.str + g.player.stats.wil + (tie(g, 'street')?.affection ?? 0) / 2, 60) ? (applyFx(g, { renown: 2, aff: { street: 10, fence: 10 } }), `${J(c.t.street, '이/가')} 골목 사람들을 모아 왔다. 쥐 떼는 숫자를 세어 보고 물러갔다. 그 뒤로 이 골목은 할멈 골목이라 불린다.`) : (applyFx(g, { stress: 16, fam: -10 }), '그날 밤 할멈 가게 뒷문에 불이 붙었다. 다 타기 전에 껐다. 할멈은 그을린 장부를 털며 괜찮다고 했다. 손이 떨리고 있었다.') },
      { label: '골목을 떠난다', key: 'leave', run: (g) => { applyFx(g, { stress: 8, aff: { fence: -6 }, flag: 'so_left' }); return '새벽에 성문을 나섰다. 할멈에게는 편지를 남겼다. 할멈은 글을 못 읽는다. 그래도 남겼다.'; } },
    ],
  },
  port_folk: {
    title: '돌아오지 않는 배', text: (c) => `${c.t.captain} 선장의 배가 돌아올 날에서 한 달이 지났다. ${J(c.fa, '이/가')} 그 배에 탔다. 부두 끝에 ${c.t.widow} 아주머니가 서 있다. 이번에는 우리 집 쪽을 보고 있다.`,
    choices: [
      { label: '배를 빌려 찾으러 나간다', key: 'search', run: (g, rng, c) => { applyFx(g, { stress: 14, stat: { wil: 0.5 } }); if (rng.chance(0.45)) { applyFx(g, { aff: { father: 15 } }); return `남쪽 섬 해변에 부서진 배와 사람 다섯이 있었다. ${J(c.fa, '은/는')} 그중 하나였다. 나를 보더니 울지도 웃지도 않고 "늦었다" 했다.`; } const f = father(g); if (f?.alive) { f.alive = false; f.deathCause = '바다'; f.history.push({ y: g.date.year, m: g.date.month, text: '바다에서 돌아오지 않았다.' }); } return '보름을 찾았다. 뱃머리 조각 하나를 건져 왔다. 어머니가 그것을 집 문 위에 걸었다. 이 비탈의 다른 집들처럼.'; } },
      { label: '어머니 곁에서 기다린다', key: 'wait', run: (g, rng, c) => { applyFx(g, { aff: { mother: 10 }, stress: 10 }); if (rng.chance(0.4)) return `넉 달째 되는 날, 선장의 배가 찢어진 돛으로 들어왔다. ${J(c.fa, '은/는')} 수염이 가슴까지 자라 있었다.`; const f = father(g); if (f?.alive) { f.alive = false; f.deathCause = '바다'; f.history.push({ y: g.date.year, m: g.date.month, text: '바다에서 돌아오지 않았다.' }); } return '반년이 지나자 어머니가 아버지 옷을 빨아 개어 궤짝에 넣었다. 다시 꺼내지 않았다.'; } },
    ],
  },
  march_guard: {
    title: '성벽의 맹세', text: (c) => `성채에서 사람이 왔다. 올해 오크 전단이 셋이나 내려왔다. 경비병 집안의 장정은 성벽으로 오라고.${c.flags.mg_signed ? ' 명부에 내 이름이 있다.' : ' 명부에 내 이름은 없지만, 이 마을에서 그게 무슨 상관인지.'}`,
    choices: [
      { label: '성벽에 선다', key: 'serve', run: (g) => { applyFx(g, { skill: { sword: 4 }, stat: { str: 0.6, wil: 0.6 }, stress: 12, aff: { father: 10, sergeant: 8 }, flag: 'mg_served' }); return '첫 겨울에 오크 둘을 성벽 아래로 떨어뜨렸다. 셋째 놈의 도끼가 방패를 쪼갰다. 하사가 내 뒷덜미를 잡아 끌어내지 않았으면 그 겨울이 마지막이었다.'; } },
      { label: '은화 50닢으로 대신 갈 사람을 산다', key: 'buy', run: (g) => { const have = g.player.money + (g.player.familyMoney ?? 0); if (have < 50) { applyFx(g, { skill: { sword: 3 }, stress: 14, flag: 'mg_served' }); return '은화가 모자랐다. 결국 성벽에 섰다. 대신 갈 사람을 사려 했다는 말은 병영에 먼저 와 있었다.'; } const fromMe = Math.min(g.player.money, 50); g.player.money -= fromMe; g.player.familyMoney -= 50 - fromMe; applyFx(g, { aff: { father: -12 }, stress: 6 }); return '빚에 몰린 농부 아들 하나가 내 이름으로 성벽에 섰다. 봄에 그 집 어머니가 우리 집 앞을 지나갔다. 아무 말도 하지 않았다.'; } },
      { label: '남쪽으로 떠난다', key: 'leave', run: (g) => { applyFx(g, { aff: { father: -20, mother: -4 }, stress: 8, flag: 'mg_fled' }); return '밤에 남쪽 고갯길을 넘었다. 뒤에서 봉화가 올랐다. 나를 위한 것은 아니었다. 그래도 그렇게 느꼈다.'; } },
    ],
  },
};
defineScene('origin_burden', {
  title: (g) => BURDEN[O(g)?.id]?.title ?? '집안의 짐',
  text: (g) => BURDEN[O(g)?.id]?.text(ctx(g)) ?? '',
  choices: (g) => (BURDEN[O(g)?.id]?.choices ?? []).map((c) => ({ label: c.label, key: c.key })),
  resolve(g, rng, s, key) {
    const b = BURDEN[O(g)?.id]; if (!b) return '지나간 일이다.';
    const c = b.choices.find((x) => x.key === key) ?? b.choices[0];
    S(g).burden = c.key;
    log(g, `${b.title}: ${c.label}`);
    return c.run(g, rng, ctx(g));
  },
});

/* ---------- 매달 ---------- */
function pickLine(g, rng) {
  const s = S(g); const o = O(g);
  const opts = o.lines.map((_, i) => i).filter((i) => !s.used.includes(i));
  const i = rng.pick(opts.length ? opts : o.lines.map((_, k) => k));
  s.used.push(i); if (s.used.length > o.lines.length - 1) s.used.shift();
  return o.lines[i](ctx(g));
}
function monthTick(g) {
  const s = S(g);
  s.month = [];
  if (g.over || !mine(g)) return;
  const o = O(g); if (!o) return;
  const rng = ownRng(g, 7);
  const age = playerAge(g);
  const busy = !!L(g).travel || sceneQueued(g, 'origin_child') || sceneQueued(g, 'origin_gift') || sceneQueued(g, 'origin_want') || sceneQueued(g, 'origin_burden');
  if (!busy && mi(g) - s.sceneAt >= 6) {
    // 어린 시절 장면: 나이대에 맞는 것 중 아직 안 본 것
    const sc = o.scenes.find((x) => !s.seen.includes(x.id) && age >= x.age[0] && age <= x.age[1]);
    const late = sc && age >= sc.age[1];
    if (sc && (late || rng.chance(0.3))) { s.seen.push(sc.id); s.sceneAt = mi(g); queueScene(g, 'origin_child', { sid: sc.id }); return; }
    // 큰 재능을 집안이 알아본다
    const gift = g.heredity?.gift && g.heredity.owner === g.player.id ? g.heredity.gift : null;
    if (gift && !s.gift && age >= 7 && age <= 11 && (age >= 10 || rng.chance(0.25))) { s.gift = 'seen'; s.sceneAt = mi(g); queueScene(g, 'origin_gift', { fit: gift === o.fit, gift }); return; }
    if (!s.want && age >= 18) { s.sceneAt = mi(g); queueScene(g, 'origin_want', { met: !!o.check(g, s) }); return; }
    if (!s.burden && age >= 16 && age <= 26 && (age >= 22 || rng.chance(0.06))) { s.burden = 'due'; s.sceneAt = mi(g); queueScene(g, 'origin_burden', {}); return; }
  }
  if (s.burden === 'due' && !sceneQueued(g, 'origin_burden')) s.burden = null;
  if (age <= 15 && mi(g) - s.lineAt >= 4 && rng.chance(0.3)) { s.lineAt = mi(g); s.month.push({ kind: 'home', text: pickLine(g, rng) }); }
}
HOOKS.afterMonth.push((g) => monthTick(g));
HOOKS.migrate.push((g) => { S(g); });
HOOKS.heir.push((g) => {
  const s = S(g);
  if (!s.id || s.past) return;
  s.past = true;
  const o = O(g);
  if (o) chron(g, `${o.name}에서 난 ${s.ownerName ?? '선대'}의 핏줄이 이어지다.`, 40);
});

/* ---------- 화면 연결점 ---------- */
export function originLines(g) { return (g.origins?.month ?? []).slice(0, 1).map((x) => ({ ...x })); }
export function originLine(g) { return originLines(g)[0]?.text ?? null; }
export function originInfo(g) {
  const s = S(g); const o = O(g);
  if (!o) return null;
  const ties = o.ties.map((t) => { const p = tie(g, t.role); return { word: t.word, name: p?.name ?? null, alive: !!p?.alive }; });
  return {
    id: o.id, name: o.name, place: placeName(o.place), standing: FAMILIES.find((f) => f.id === o.id)?.standing ?? '',
    want: { name: o.want.name, text: o.want.text, state: s.want === 'met' ? '이루어 가고 있다' : s.want === 'missed' ? '다른 길로 왔다' : '아직 모른다' },
    burden: { name: o.burden.name, text: o.burden.text, state: s.burden && s.burden !== 'due' ? '한 번 닥쳤다' : '아직 오지 않았다' },
    ties, past: s.past, log: s.log.slice(-6).map((x) => ({ ...x })),
  };
}
