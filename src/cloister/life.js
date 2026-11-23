// 수도원의 날들: 문을 두드리기, 맡은 일, 시간 기도, 서원, 세속으로 돌아가기, 은둔처.
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat, playerAge } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, gains, up } from '../adventure/core.js';
import { leaveJob } from '../places.js';
import { deed } from '../repute/index.js';
import { faithState } from '../faith/index.js';
import { invented } from '../era/state.js';
import { AP, herbsHere } from '../apothecary/core.js';
import { J } from '../narrative/text.js';
import { me } from '../game.js';
import { byId } from '../npc.js';
import {
  C, mi, clamp, here, houseFits, placeName, free, adult, HOUSES, houseAt, ROLES, ROLE_IDS, STAGES, stageN, HERMIT_PLACES, logC, vowed, inHouse, hermitHere, houseOf, monkWord,
} from './core.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const devotion = (g) => faithState(g).devotion ?? 0;
const believe = (g, n) => { const f = faithState(g); f.devotion = clamp((f.devotion ?? 0) + n, 0, 100); };
const spouseAlive = (g) => { const id = me(g)?.spouseId; const p = id != null ? byId(g, id) : null; return !!p?.alive; };
const merit = (g, n) => { const v = C(g).vow; if (v) v.merit = clamp((v.merit ?? 0) + n, 0, 100); };

/* ---------- 문을 두드리기 ---------- */
// 뜻 있는 형편: 믿음이 깊거나, 마음이 무너졌거나, 늙었거나, 짝을 잃었거나
export const callFelt = (g) => devotion(g) >= 45 || g.player.stress >= 70 || playerAge(g) >= 50 || (!!me(g)?.spouseId && !spouseAlive(g)) || C(g).left.length > 0;
export const gateOk = (g) => free(g) && adult(g) && houseFits(g, houseAt(here(g))) && !vowed(g) && !C(g).hermit && !spouseAlive(g) && callFelt(g) && !C(g).houses[houseAt(here(g))].closed;
ACTIONS.push({
  id: 'cloister_gate', name: '수도원 문을 두드린다', icon: 'pray',
  desc: '담 안의 삶을 묻는다. 손님으로 한 달 머물 수도, 청원자로 들어갈 수도 있다. 세상 재물과 이름은 문밖에 두고 들어간다.',
  available: (g) => gateOk(g) && !sceneQueued(g, 'cloister_gate'),
  run(g) {
    queueScene(g, 'cloister_gate', { house: houseAt(here(g)) }, { first: true });
    return `${HOUSES[houseAt(here(g))].name} 쪽문 앞에 섰다. 쇠고리를 두 번 쳤다.`;
  },
});
defineScene('cloister_gate', {
  need: (g, s) => !!HOUSES[s.house] && !vowed(g),
  title: (g, s) => HOUSES[s.house].name,
  text: (g, s) => { const h = HOUSES[s.house], hs = C(g).houses[s.house], w = monkWord(g); return `문지기 ${J(w.brother, '이/가')} 작은 창을 열었다. ${h.desc} 지금 원장은 ${hs.abbot}. 담 안에 ${hs.monks}명이 산다. "무엇을 찾아 오셨소."`; },
  choices: (g) => [
    { label: '청원자로 들어간다 (가진 것은 수도원에 바친다)', key: 'enter' },
    ...(g.player.money >= 4 ? [{ label: '손님으로 한 달 머문다 (은화 넷)', key: 'retreat' }] : []),
    ...(g.player.money >= 20 ? [{ label: '시주만 하고 돌아선다 (은화 스물)', key: 'gift' }] : []),
    { label: '아직은 아니다', key: 'no' },
  ],
  resolve(g, rng, s, key) {
    const h = HOUSES[s.house], hs = C(g).houses[s.house];
    if (key === 'no') return '창이 닫혔다. 담 너머에서 낮은 노랫소리가 이어졌다.';
    if (key === 'gift') { pay(g, 20); hs.wealth = clamp(hs.wealth + 3, 0, 100); deed(g, 'generous', 2, null); return '은화 스무 닢을 내밀었다. 문지기가 이름을 묻더니 기도 명부에 적었다.'; }
    if (key === 'retreat') { pay(g, 4); stress(g, -22); believe(g, 3); tired(g, -20); return '손님방은 좁고 침대는 딱딱했다. 새벽마다 종소리에 깼다. 한 달 동안 아무도 내게 아무것도 묻지 않았다. 떠나는 날, 어깨가 가벼웠다.'; }
    const gift = Math.round(g.player.money * 0.8);
    pay(g, gift); hs.wealth = clamp(hs.wealth + Math.min(10, gift / 10), 0, 100); hs.monks += 1;
    if (L(g).job) leaveJob(g, '하던 일을 내려놓았다.');
    C(g).vow = { house: s.house, since: mi(g), stage: 'postulant', role: null, roleAt: 0, oblate: false, merit: 0, away: 0 };
    stress(g, -10); believe(g, 5);
    note(g, `${h.name}에 청원자로 들어갔다.`); logC(g, `${h.name}에 청원자로 들어갔다.`);
    return `가진 은화 ${gift}닢을 원장 앞에 내려놓았다. 세속의 옷을 벗고 거친 모직 옷을 받았다. 머리를 깎는 가위 소리가 귀 옆에서 사각거렸다. 이제 ${hs.abbot} 원장의 말이 나의 하루다.`;
  },
});

/* ---------- 맡은 일 ---------- */
ACTIONS.push({
  id: 'cloister_work', name: '수도원 일을 맡는다', icon: 'scroll',
  desc: '원장에게 맡을 일을 청한다. 필사실, 약초밭, 양조실, 종지기, 밭과 곳간. 한 번 맡으면 한 해는 바꾸지 않는다.',
  available: (g) => inHouse(g) && stageN(g) >= 1 && (!C(g).vow.role || mi(g) - C(g).vow.roleAt >= 12) && !sceneQueued(g, 'cloister_role'),
  run(g) { queueScene(g, 'cloister_role', {}, { first: true }); return `${houseOf(g).abbot} 원장의 방 앞에서 기다렸다.`; },
});
defineScene('cloister_role', {
  need: (g) => inHouse(g),
  title: () => '맡을 일',
  text: (g) => { const v = C(g).vow, h = HOUSES[v.house]; return `원장이 펜을 내려놓았다. "이 집은 ${ROLES[h.known].name} 일로 이름이 났소. 그러나 손이 모자라지 않은 곳은 없지."${v.role ? ` 지금 맡은 일은 ${ROLES[v.role].name}이다.` : ''}`; },
  choices: (g) => [...ROLE_IDS.filter((id) => id !== C(g).vow.role).map((id) => ({ label: `${ROLES[id].name}: ${ROLES[id].desc}`, key: id })), ...(C(g).vow.role ? [{ label: '하던 일을 그대로 한다', key: 'keep' }] : [])],
  resolve(g, rng, s, key) {
    const v = C(g).vow;
    if (key === 'keep') { v.roleAt = mi(g); return '원장은 고개를 끄덕였다. "손에 익은 일이 기도가 되지."'; }
    v.role = key; v.roleAt = mi(g);
    logC(g, `${ROLES[key].name} 일을 맡았다.`);
    return { scriptorium: '필사실 창가 자리를 받았다. 잉크 냄새와 양피지 가루가 코끝에 맴돈다.', herbs: '약초밭 열쇠를 받았다. 늙은 약초지기가 쑥과 세이지를 먼저 가르쳐 주었다.', brew: '양조실의 큰 솥 앞에 섰다. 보리 싹 냄새가 달큰하다.', bells: '종탑 계단 백열두 개를 오르내리게 되었다. 줄을 당기는 손바닥이 첫날부터 벗겨졌다.', fields: '곳간 열쇠 꾸러미가 허리에 매달렸다. 문 앞에 빵을 기다리는 줄이 보인다.' }[key];
  },
});
const LABOR = {
  scriptorium: (g, rng) => { C(g).copied += 1; const press = invented(g, 'press'); houseOf(g).wealth = clamp(houseOf(g).wealth + (press ? 0.3 : 1.2), 0, 100); return rng.pick([`한 달 내내 ${press ? '인쇄소 책보다 느린 손으로 ' : ''}옛 연대기 한 권을 옮겨 적었다. 머리글자 하나에 사흘이 걸렸다.`, '촛불 아래서 시편을 옮기다 졸았다. 깨어 보니 잉크 한 방울이 성인의 얼굴 위에 떨어져 있었다. 긁어내고 다시 그렸다.', '여백에 작은 고양이를 그려 넣었다. 필사실장이 보고도 모른 척했다.']); },
  herbs: (g, rng) => { C(g).herbs += 1; const hs = herbsHere(g); const a = AP(g); if (hs.length) { const id = hs[Math.floor(rng.next() * hs.length)]; a.herbs[id] = (a.herbs[id] ?? 0) + 1; } return rng.pick(['약초밭 고랑마다 잡초를 뽑고 세이지를 묶어 말렸다. 병실에서 기침 소리가 조금 줄었다.', '열병 앓는 순례자에게 버드나무 껍질 달인 물을 먹였다. 사흘 만에 열이 내렸다.', '서리 내리기 전에 약초 뿌리를 캐어 모래에 묻었다.']); },
  brew: (g, rng) => { C(g).brewed += 1; houseOf(g).wealth = clamp(houseOf(g).wealth + 1.5, 0, 100); return rng.pick(['보리를 사흘 띄우고 솥에 끓였다. 홉을 넣는 때를 늦지도 이르지도 않게 맞추었다.', '새 통을 열자 원장이 한 모금 마시고 말없이 잔을 내밀었다. 한 잔 더라는 뜻이었다.', '맥주 통 열두 개를 백작네 수레에 실어 보냈다. 곳간에 은화가 들어왔다.']); },
  bells: (g, rng) => { C(g).rung += 1; return rng.pick(['한 달 동안 한밤의 종을 한 번도 놓치지 않았다. 마을 사람들이 내 종소리로 시간을 맞춘다.', '눈보라 치는 새벽, 언 줄을 당겼다. 손바닥이 줄에 붙었다 떨어졌다.', '종을 치고 나면 산 아래 마을 개들이 따라 짖는다. 그 소리가 좋다.']); },
  fields: (g, rng) => { houseOf(g).wealth = clamp(houseOf(g).wealth + 1, 0, 100); return rng.pick(['수도원 밭을 갈았다. 흙 냄새가 기도보다 먼저 마음을 가라앉힌다.', '흉년이 든 마을 사람들이 문 앞에 줄을 섰다. 곳간 빵을 나누었다. 원장은 한 덩이도 아끼지 말라 했다.', '곳간 쥐를 잡으려고 고양이 두 마리를 들였다. 한 마리는 필사실로 가 버렸다.']); },
};
ACTIONS.push({
  id: 'cloister_labor', name: '맡은 일을 한다', icon: 'labor',
  desc: '수도원에서 맡은 일에 한 달을 바친다. 솜씨가 늘고, 원장과 형제들의 신임이 쌓인다.',
  available: (g) => inHouse(g) && !!C(g).vow.role && g.player.fatigue < 90,
  run(g, rng) {
    const v = C(g).vow, r = ROLES[v.role];
    tired(g, 10); merit(g, 1.5);
    const sv = r.skill ? gainSkill(g, r.skill, 0.9, r.stat) : 0, st = gainStat(g, r.stat, 0.25);
    houseOf(g).rep = clamp(houseOf(g).rep + 0.4, 0, 100);
    return `${LABOR[v.role](g, rng)}${gains([r.skill ? up({ letters: '글', herbs: '약초', cooking: '요리', farming: '농사' }[r.skill], sv) : null, up({ int: '지성', sen: '감각', wil: '의지', str: '힘' }[r.stat], st)])}`;
  },
});
ACTIONS.push({
  id: 'cloister_hours', name: '시간 기도를 지킨다', icon: 'candle',
  desc: '새벽 기도부터 끝 기도까지, 종이 울릴 때마다 성당에 모인다. 마음이 가라앉고 믿음이 깊어진다.',
  available: (g) => inHouse(g),
  run(g, rng) {
    stress(g, -12); believe(g, 2); merit(g, 1); tired(g, -6);
    const v = gainStat(g, 'wil', 0.3);
    return `${rng.pick(['한밤에 일어나 차가운 돌바닥에 무릎을 꿇었다. 형제들의 숨소리와 노래가 하나가 되었다.', '아침 기도와 낮 기도 사이에 침묵이 길었다. 그 침묵 속에서 오래된 일 하나를 용서했다.', '끝 기도를 마치고 회랑을 걸었다. 기둥 사이로 별이 보였다. 아무 생각도 들지 않았다.'])}${gains([up('의지', v)])}`;
  },
});

/* ---------- 서원 ---------- */
defineScene('cloister_vows', {
  need: (g) => vowed(g) && ['novice', 'oblate'].includes(C(g).vow.stage),
  title: () => '서원',
  text: (g) => { const v = C(g).vow, w = monkWord(g); return v.oblate ? `어릴 적 이 문으로 들어왔다. 이제 열다섯. 원장이 물었다. "네 부모가 너를 바쳤다. 이제 네가 너를 바치겠느냐." 담 너머 세상은 한 번도 제대로 본 적이 없다.` : `수련 한 해가 지났다. 내일 제단 앞에서 가난과 순명과 정결을 서원하면 평생 ${J(w.monk, '으로/로')} 산다. 오늘 밤은 성당에서 홀로 지새운다.`; },
  choices: (g) => [{ label: '서원한다', key: 'vow' }, { label: '한 해 더 수련한다', key: 'wait' }, { label: C(g).vow.oblate ? '세상을 보러 문밖으로 나간다' : '세속으로 돌아간다', key: 'go' }],
  resolve(g, rng, s, key) {
    const v = C(g).vow, h = HOUSES[v.house], w = monkWord(g);
    if (key === 'wait') { v.since = mi(g); return '원장은 서두르지 않았다. "한 해는 길지 않소."'; }
    if (key === 'go') return leaveVows(g, 'blessing');
    v.stage = 'monk'; believe(g, 8); merit(g, 5);
    note(g, `${h.name}에서 서원했다.`); logC(g, `제단 앞에서 서원하고 ${J(w.monk, '이/가')} 되었다.`);
    return `제단 앞에 엎드렸다. 형제들이 검은 천을 내 몸 위에 덮었다. 세상에 대해 죽는다는 뜻이라 했다. 천이 걷히자 새 이름으로 불렸다. 손이 떨렸다.`;
  },
});

/* ---------- 세속으로 돌아가기 ---------- */
export function leaveVows(g, how) {
  const s = C(g), v = s.vow, h = HOUSES[v.house], solemn = ['monk', 'prior', 'abbot'].includes(v.stage);
  s.left.push({ house: v.house, y: g.date.year, how, stage: v.stage });
  s.vow = null;
  if (s.houses[v.house].monks > 1) s.houses[v.house].monks -= 1;
  if (v.stage === 'abbot') { s.houses[v.house].abbot = s.houses[v.house].rival && s.houses[v.house].rival !== g.player.name ? s.houses[v.house].rival : (HOUSES[v.house].nuns ? '마틸데' : '안셀름'); s.houses[v.house].age = 54; }
  note(g, `${J(h.name, '을/를')} 떠나 세속으로 돌아왔다.`); logC(g, `${J(h.name, '을/를')} 떠났다.`);
  if (how === 'night') { deed(g, 'loyal', -3, null); believe(g, -10); stress(g, 8); return '밤에 담을 넘었다. 수도복은 개울가 덤불에 걸어 두었다. 새벽 종이 울릴 때 이미 산 하나를 넘어 있었다. 등 뒤가 오래도록 시렸다.'; }
  believe(g, solemn ? -4 : 0);
  return solemn ? '원장은 오래 말이 없었다. 이윽고 서원을 풀어 달라는 편지를 주교에게 써 주었다. "문은 닫히지 않소. 다만 같은 사람으로 돌아오지는 못할 거요." 세속의 옷이 어색하게 몸에 맞지 않았다.' : '원장이 축복하며 보내 주었다. 문지기가 맡겨 두었던 신발을 돌려주었다. 신발이 작아져 있었다.';
}
ACTIONS.push({
  id: 'cloister_leave', name: '세속으로 돌아간다', icon: 'door',
  desc: '수도원을 떠난다. 원장의 허락을 받을 수도, 밤에 담을 넘을 수도 있다.',
  available: (g) => vowed(g) && free(g) && C(g).vow.stage !== 'oblate' && !sceneQueued(g, 'cloister_leave'),
  run(g) { queueScene(g, 'cloister_leave', {}, { first: true }); return '회랑 끝에서 담 너머를 오래 보았다.'; },
});
defineScene('cloister_leave', {
  need: (g) => vowed(g),
  title: () => '떠나는 날',
  text: (g) => { const v = C(g).vow; return `${HOUSES[v.house].name}에서 ${Math.max(1, Math.round((mi(g) - v.since) / 12))}해. ${['monk', 'prior', 'abbot'].includes(v.stage) ? '서원한 몸이 떠나려면 주교의 허락이 있어야 한다.' : '아직 서원 전이라 붙잡는 이는 없다.'} 그래도 형제들의 얼굴이 하나하나 떠오른다.`; },
  choices: (g) => [{ label: '원장에게 허락을 구한다', key: 'blessing' }, { label: '밤에 담을 넘는다', key: 'night' }, { label: '마음을 접고 남는다', key: 'stay' }],
  resolve(g, rng, s, key) {
    if (key === 'stay') { stress(g, -4); return '종이 울렸다. 발이 먼저 성당으로 향했다.'; }
    return leaveVows(g, key);
  },
});

/* ---------- 은둔처 ---------- */
export const hermitOk = (g) => free(g) && adult(g) && !!HERMIT_PLACES[here(g)] && !C(g).hermit && (!/^fr_/.test(here(g)) || (g.frontier?.sites?.[here(g)]?.stage ?? 0) >= 1)
  && ((vowed(g) && stageN(g) >= 3) || (!vowed(g) && !spouseAlive(g) && ((playerAge(g) >= 40 && devotion(g) >= 50) || (playerAge(g) >= 30 && g.player.stress >= 80))));
ACTIONS.push({
  id: 'cloister_hermit', name: '은둔처로 들어간다', icon: 'home',
  desc: '산이나 숲 깊은 곳 움막에서 홀로 산다. 기도와 침묵. 시간이 지나면 길을 물으러, 축복을 받으러 사람들이 찾아온다.',
  available: (g) => hermitOk(g),
  run(g) {
    const s = C(g), pl = here(g);
    s.hermit = { place: pl, since: mi(g), visits: 0, fame: 0 };
    if (L(g).job) leaveJob(g, '하던 일을 내려놓았다.');
    logC(g, `${HERMIT_PLACES[pl]}에 은둔처를 틀었다.`); note(g, `${placeName(pl)} ${HERMIT_PLACES[pl]}에 은둔처를 틀었다.`);
    return `${HERMIT_PLACES[pl]}에 짐을 풀었다. 물은 샘에서, 땔감은 숲에서. 첫날 밤은 바람 소리가 사람 목소리 같았다.${vowed(g) ? ' 원장의 허락은 편지로 받았다.' : ''}`;
  },
});
ACTIONS.push({
  id: 'cloister_solitude', name: '홀로 지낸다', icon: 'meditate',
  desc: '은둔처에서 한 달을 침묵과 기도로 보낸다.',
  available: (g) => hermitHere(g),
  run(g, rng) {
    const h = C(g).hermit;
    stress(g, -15); believe(g, 3); tired(g, -10); h.fame = clamp(h.fame + 1.5, 0, 100);
    const v = gainStat(g, 'wil', 0.35), s2 = gainStat(g, 'sen', 0.2);
    return `${rng.pick(['한 달 동안 사람 말을 한마디도 하지 않았다. 대신 새들의 말을 조금 알아들을 것 같았다.', '샘물에 비친 얼굴이 낯설었다. 수염인지 머리인지 모를 것이 자라 있었다.', '눈이 움막 문을 막았다. 사흘을 불씨 하나로 버텼다. 넷째 날 아침 해가 들었다.', '바위에 앉아 해 뜨는 것과 지는 것만 보았다. 그 사이에 하루가 다 들어 있었다.'])}${gains([up('의지', v), up('감각', s2)])}`;
  },
});
ACTIONS.push({
  id: 'cloister_down', name: '은둔처에서 내려온다', icon: 'door',
  desc: '움막을 비우고 사람들 사이로 돌아간다.',
  available: (g) => hermitHere(g) && mi(g) - C(g).hermit.since >= 3,
  run(g) { return endHermit(g, 'down'); },
});
export function endHermit(g, how) {
  const s = C(g), h = s.hermit;
  if (!h) return '';
  s.hermit = null;
  s.past.push({ kind: 'hermit', place: h.place, y: g.date.year, months: mi(g) - h.since, fame: Math.round(h.fame) });
  logC(g, `${HERMIT_PLACES[h.place] ?? placeName(h.place)}의 은둔처를 비웠다.`);
  if (how === 'down') return `움막 문을 닫고 산을 내려왔다. ${h.visits ? `찾아왔던 사람 ${h.visits}명의 얼굴이 하나씩 떠올랐다. ` : ''}마을 소리가 처음엔 너무 시끄러웠다.`;
  return '';
}
const VISIT = {
  pilgrim: { title: '순례자', text: '지팡이 짚은 순례자가 움막 앞에 무릎을 꿇었다. "축복을 받으러 사흘을 걸었습니다."', choices: [['bless', '손을 얹어 축복한다'], ['bread', '빵을 나누고 돌려보낸다']] },
  sick: { title: '아픈 아이', text: '어미가 열에 들뜬 아이를 안고 산을 올라왔다. 마을 의원은 손을 놓았다고 했다.', choices: [['herbs', '약초를 달여 밤새 돌본다'], ['pray', '아이 곁에서 기도한다']] },
  lord: { title: '말 탄 손님', text: '갑옷 입은 사내가 말에서 내렸다. 이웃 영지와 싸울지 말지를 묻는다. 수행원들이 움막을 흘끔거린다.', choices: [['peace', '피를 흘리지 말라 한다'], ['silent', '대답하지 않는다'], ['war', '정의가 있다면 가라 한다']] },
  fugitive: { title: '쫓기는 사람', text: '해 질 녘 피투성이 사내가 문을 밀고 들어왔다. 멀리서 개 짖는 소리와 횃불이 다가온다.', choices: [['hide', '움막 깊이 숨겨 준다'], ['turn', '문밖으로 내보낸다']] },
  kin: { title: '집에서 온 사람', text: '집안 사람이 산을 올라왔다. 집에 일이 생겼다고, 이제 그만 내려오라고 한다.', choices: [['go', '함께 내려간다'], ['stay', '여기가 내 집이라 한다']] },
  thief: { title: '도둑', text: '밤에 누군가 움막을 뒤졌다. 아침에 보니 하나뿐인 외투가 없다. 발자국이 아래로 이어진다.', choices: [['let', '그냥 둔다'], ['follow', '발자국을 따라간다']] },
};
defineScene('cloister_visitor', {
  need: (g, s) => hermitHere(g) && !!VISIT[s.who],
  title: (g, s) => VISIT[s.who].title,
  text: (g, s) => VISIT[s.who].text,
  choices: (g, s) => VISIT[s.who].choices.filter(([k]) => k !== 'herbs' || (g.player.skills.herbs ?? 0) >= 10).map(([key, label]) => ({ label, key })),
  resolve(g, rng, s, key) {
    const h = C(g).hermit; h.visits += 1;
    const fame = (n) => { h.fame = clamp(h.fame + n, 0, 100); };
    switch (key) {
      case 'bless': fame(3); believe(g, 1); return '손을 얹자 순례자가 울었다. 내 손이 무엇을 했는지 나는 모른다. 그는 산을 내려가 내 이야기를 했다.';
      case 'bread': fame(1); deed(g, 'generous', 1, null); return '마지막 빵을 반으로 나누었다. 순례자는 축복보다 그게 낫다며 웃었다.';
      case 'herbs': if (rng.chance(0.55 + (g.player.skills.herbs ?? 0) / 200)) { fame(6); deed(g, 'kind', 3, null); return '버드나무 껍질과 쑥을 달여 밤새 먹였다. 새벽에 아이가 젖을 찾았다. 어미가 내 발에 입을 맞추려 해서 물러섰다.'; } fame(1); stress(g, 6); return '밤새 달인 약을 먹였지만 새벽녘 아이의 숨이 멎었다. 어미는 아이를 안고 말없이 산을 내려갔다.';
      case 'pray': fame(2); return rng.chance(0.35) ? '밤새 기도했다. 아침에 열이 내렸다. 내 기도 덕인지 아이의 힘인지는 모른다. 어미는 기도 덕이라 믿었다.' : '밤새 기도했다. 아이는 살지 못했다. 기도가 끝난 뒤에도 한참을 무릎을 펴지 못했다.';
      case 'peace': fame(3); deed(g, 'kind', 2, null); return '"한 사람의 피도 땅을 갚지 못하오." 사내는 오래 침묵하다 말을 돌렸다. 이웃 영지와 화친했다는 소식이 철 지나 닿았다.';
      case 'silent': fame(2); return '아무 말도 하지 않았다. 사내는 그 침묵을 저 좋을 대로 읽고 떠났다.';
      case 'war': fame(1); deed(g, 'brave', 1, null); return '"정의가 있다면 가시오." 사내는 고개를 숙이고 말에 올랐다. 그 싸움이 정의였는지는 끝내 듣지 못했다.';
      case 'hide': fame(2); deed(g, 'kind', 3, null); if (rng.chance(0.3)) { g.player.injuries.push({ name: '추격꾼에게 맞은 멍', months: 1 }); return '사내를 바위틈에 숨기고 문 앞에 앉았다. 추격꾼이 나를 밀쳐 넘어뜨리고 움막을 뒤졌다. 찾지 못했다. 새벽에 사내는 고맙다는 말도 없이 사라졌다.'; } return '사내를 바위틈에 숨겼다. 추격꾼들은 은자의 움막이라며 들어오지 않았다. 새벽에 사내는 은화 한 닢을 문지방에 두고 떠났다.';
      case 'turn': stress(g, 5); return '문밖을 가리켰다. 사내는 나를 한 번 보고 어둠 속으로 뛰어갔다. 멀리서 개 짖는 소리가 한꺼번에 높아졌다.';
      case 'go': endHermit(g, 'kin'); return '움막을 닫고 함께 내려왔다. 산길이 생각보다 짧았다.';
      case 'stay': stress(g, 4); return '"여기가 내 집이오." 그는 한참을 서 있다가 돌아섰다. 다음 해 봄, 편지 한 장이 바위 밑에 끼워져 있었다.';
      case 'let': fame(2); return '외투 없이 겨울을 났다. 봄에 산 아래 마을에서 누군가 그 외투를 입고 다닌다는 말을 들었다. 잘 맞는다고 한다.';
      case 'follow': return rng.chance(0.5) ? '발자국 끝에 굶주린 소년이 내 외투를 덮고 자고 있었다. 깨우지 않고 돌아왔다.' : '발자국은 개울에서 끊겼다. 추운 겨울이 될 것이다.';
      default: return '';
    }
  },
});

/* ---------- 어린 헌납 ---------- */
defineScene('cloister_oblate', {
  need: (g) => !vowed(g) && !!houseAt(here(g)),
  title: () => '수도원에 바쳐지는 아이',
  text: (g) => `저녁상 뒤 부모가 나란히 앉았다. 먹일 입이 많다고, ${HOUSES[houseAt(here(g))].name}에서 아이 하나를 받아 준다고 했다. 글을 배우고 굶지 않는다고. 어머니는 내 눈을 보지 않았다.`,
  choices: () => [{ label: '말없이 고개를 끄덕인다', key: 'go' }, { label: '어머니 치마를 붙잡고 운다', key: 'cry' }, { label: '밤에 헛간으로 숨는다', key: 'hide' }],
  resolve(g, rng, s, key) {
    const id = houseAt(here(g)), h = HOUSES[id];
    if (key === 'go' || (key === 'cry' && rng.chance(0.5))) {
      C(g).vow = { house: id, since: mi(g), stage: 'oblate', role: null, roleAt: 0, oblate: true, merit: 0, away: 0 };
      C(g).houses[id].monks += 1; note(g, `${h.name}에 바쳐졌다.`); logC(g, `어린 나이에 ${h.name}에 바쳐졌다.`);
      return key === 'go' ? '이튿날 아버지 손을 잡고 수도원 쪽문을 지났다. 아버지는 뒤돌아보지 않았다. 문지기가 내 손에 따뜻한 빵을 쥐여 주었다.' : '아무리 울어도 소용없었다. 이튿날 쪽문이 닫혔다. 그날 밤 낯선 침상에서 형제 하나가 몰래 꿀 바른 빵을 건넸다.';
    }
    stress(g, 6);
    return key === 'cry' ? '어머니가 결국 나를 끌어안았다. 아버지는 한숨을 쉬고 그 말을 다시 꺼내지 않았다.' : '헛간 짚더미 속에서 밤을 새웠다. 아침에 부모는 아무 말도 하지 않았다. 그 일은 그렇게 없던 일이 되었다.';
  },
});

/* ---------- 원장 선출과 땅 다툼 ---------- */
defineScene('cloister_election', {
  need: (g) => inHouse(g) && stageN(g) >= 3,
  title: () => '원장 선출',
  text: (g) => { const h = HOUSES[C(g).vow.house]; return `${h.name}의 원장이 세상을 떠났다. 종이 아흐레 동안 울렸다. 형제들이 참사회실에 모였다. 몇몇의 눈이 나를 향한다. 다른 후보는 ${C(g).houses[C(g).vow.house].rival ?? '늙은 부원장'}.`; },
  choices: () => [{ label: '원장 자리에 나선다', key: 'stand' }, { label: '다른 후보를 민다', key: 'back' }, { label: '침묵한다', key: 'abstain' }],
  resolve(g, rng, s, key) {
    const v = C(g).vow, hs = C(g).houses[v.house], h = HOUSES[v.house], w = monkWord(g);
    if (key === 'stand' && rng.chance(clamp(0.25 + (v.merit ?? 0) / 120, 0.1, 0.9))) {
      v.stage = 'abbot'; hs.abbot = g.player.name; hs.age = Math.max(30, Math.floor(playerAgeSafe(g)));
      chron(g, `${J(g.player.name, '이/가')} ${h.name}의 ${J(w.abbot, '이/가')} 되다.`, 25); note(g, `${h.name}의 ${J(w.abbot, '이/가')} 되었다.`); logC(g, `${J(w.abbot, '으로/로')} 뽑혔다.`);
      return `흰 돌과 검은 돌을 센 끝에 내 이름이 불렸다. 원장의 지팡이가 손에 들렸다. 생각보다 무거웠다. 오늘부터 이 집 ${hs.monks}명의 밥과 기도와 땅이 내 몫이다.`;
    }
    hs.abbot = hs.rival ?? '늙은 부원장'; hs.age = 55;
    if (key === 'back') { merit(g, 6); deed(g, 'loyal', 2, null); return `${J(hs.abbot, '을/를')} 밀었다. 새 원장은 나를 부원장으로 앉혔다.` + promotePrior(g); }
    if (key === 'stand') { merit(g, -4); return `돌을 세는 소리가 길었다. 내 이름은 끝내 불리지 않았다. 새 원장 ${J(hs.abbot, '은/는')} 나를 오래 지켜볼 것이다.`; }
    return `침묵 속에 ${J(hs.abbot, '이/가')} 뽑혔다. 나는 내 자리로 돌아가 하던 일을 했다.`;
  },
});
const playerAgeSafe = (g) => playerAge(g);
function promotePrior(g) { const v = C(g).vow; if (v && v.stage === 'monk') { v.stage = 'prior'; logC(g, '부원장이 되었다.'); } return ''; }
export { promotePrior };
defineScene('cloister_dispute', {
  need: (g) => inHouse(g) && stageN(g) >= 4 && !!houseOf(g).dispute,
  title: () => '수도원 땅',
  text: (g) => { const v = C(g).vow, h = HOUSES[v.house], d = houseOf(g).dispute; return `${J(h.lord, '이/가')} 수도원 숲과 방앗간이 본래 영지 것이라며 사람을 보냈다. 옛 기증 문서는 필사실 궤짝 어딘가에 있다. 걸린 땅은 수도원 땅의 ${d.stake}분의 일쯤.`; },
  choices: (g) => [{ label: '기증 문서를 찾아 법정에 선다', key: 'court' }, { label: '땅을 내주고 평화를 산다', key: 'yield' }, { label: '주교에게 편지를 쓴다', key: 'bishop' }, ...(g.player.skills.letters >= 40 ? [{ label: '오래된 문서를 새로 "찾아낸다"', key: 'forge' }] : [])],
  resolve(g, rng, s, key) {
    const v = C(g).vow, hs = houseOf(g), h = HOUSES[v.house], d = hs.dispute;
    hs.dispute = null;
    if (key === 'yield') { hs.land = clamp(hs.land - d.stake, 0, 100); deed(g, 'kind', 1, null); return `숲 절반을 내주었다. ${J(h.lord, '은/는')} 만족했다. 형제들 몇은 나를 원망했고, 몇은 잠을 잘 잤다.`; }
    if (key === 'forge') { if (rng.chance(0.7)) { hs.land = clamp(hs.land + 2, 0, 100); deed(g, 'honest', -3, null); return '잉크에 그을음을 섞고 양피지를 연기에 쬐었다. 이백 년 된 기증 문서가 "나왔다". 영주의 법관은 인장을 오래 들여다보고 물러났다.'; } hs.land = clamp(hs.land - d.stake * 1.5, 0, 100); deed(g, 'honest', -6, null); hs.rep = clamp(hs.rep - 10, 0, 100); return '법관이 잉크가 마르지 않았다고 했다. 위조가 드러나 수도원은 걸린 땅에 벌금 땅까지 잃었다.'; }
    const p = key === 'court' ? 0.45 + (g.player.skills.letters ?? 0) / 200 : 0.4 + (h.sect === 'orthodox' ? 0.2 : 0);
    if (rng.chance(p)) { hs.land = clamp(hs.land + 1, 0, 100); merit(g, 4); return key === 'court' ? '필사실 궤짝 바닥에서 납 인장 달린 문서가 나왔다. 법정에서 그것을 펼치자 영주의 사람들이 서로 얼굴을 보았다. 땅은 지켰다.' : '주교의 답장은 짧았다. "교회의 땅에 손대는 자는 파문을 각오하라." 영주의 사람들이 다시 오지 않았다.'; }
    hs.land = clamp(hs.land - d.stake, 0, 100);
    return key === 'court' ? '문서는 끝내 나오지 않았다. 법정은 영주 편을 들었다. 숲 가장자리에 새 말뚝이 박혔다.' : '주교는 영주와 사냥 친구였다. 답장이 오지 않았다. 숲 가장자리에 새 말뚝이 박혔다.';
  },
});

/* ---------- 원장의 일 ---------- */
ACTIONS.push({
  id: 'cloister_rule', name: '수도원 살림을 정한다', icon: 'crown',
  desc: '원장으로서 수도원 곳간과 문을 어떻게 쓸지 정한다. 반년에 한 번.',
  available: (g) => inHouse(g) && C(g).vow.stage === 'abbot' && mi(g) - (C(g).vow.ruleAt ?? -99) >= 6 && !sceneQueued(g, 'cloister_rule'),
  run(g) { C(g).vow.ruleAt = mi(g); queueScene(g, 'cloister_rule', {}, { first: true }); return '참사회실 긴 탁자 끝에 앉았다. 곳간지기가 장부를 펼쳤다.'; },
});
defineScene('cloister_rule', {
  need: (g) => inHouse(g) && C(g).vow?.stage === 'abbot',
  title: () => '원장의 탁자',
  text: (g) => { const hs = houseOf(g); return `형제 ${hs.monks}명, 곳간 ${hs.wealth >= 60 ? '넉넉함' : hs.wealth >= 30 ? '그럭저럭' : '바닥이 보임'}, 땅 ${hs.land >= 50 ? '넓음' : hs.land >= 25 ? '보통' : '좁음'}. 곳간지기가 묻는다. "이번 반년은 어디에 쓰시겠습니까."`; },
  choices: (g) => { const hs = houseOf(g); return [
    ...(hs.wealth >= 8 ? [{ label: '문을 열어 가난한 이들을 먹인다', key: 'alms' }] : []),
    ...(hs.wealth >= 15 ? [{ label: '병실과 손님방을 새로 짓는다', key: 'build' }] : []),
    { label: '맥주와 책을 내다 팔아 곳간을 채운다', key: 'sell' },
    ...(hs.wealth >= 10 ? [{ label: `${J(HOUSES[C(g).vow.house].lord, '을/를')} 불러 잔치를 연다`, key: 'feast' }] : []),
    { label: '아무것도 바꾸지 않는다', key: 'keep' },
  ]; },
  resolve(g, rng, s, key) {
    const hs = houseOf(g);
    switch (key) {
      case 'alms': hs.wealth = clamp(hs.wealth - 8, 0, 100); hs.rep = clamp(hs.rep + 6, 0, 100); deed(g, 'generous', 3, null); return '쪽문 앞에 솥을 걸었다. 겨울 내내 죽 냄새가 골목까지 번졌다. 곳간은 가벼워지고 문 앞 줄은 길어졌다.';
      case 'build': hs.wealth = clamp(hs.wealth - 15, 0, 100); hs.rep = clamp(hs.rep + 4, 0, 100); hs.monks += 2; return '석공들이 들어와 회랑 옆에 새 병실을 올렸다. 창이 남쪽으로 났다. 앓는 형제가 볕을 받으며 누웠다.';
      case 'sell': { const n = 4 + Math.floor(rng.next() * 6); hs.wealth = clamp(hs.wealth + n, 0, 100); hs.rep = clamp(hs.rep - 2, 0, 100); return '맥주 통과 필사본을 수레에 실어 장으로 보냈다. 곳간이 찼다. 늙은 형제 하나가 "수도원이 장터가 되었다"고 중얼거렸다.'; }
      case 'feast': hs.wealth = clamp(hs.wealth - 10, 0, 100); if (hs.dispute && rng.chance(0.5)) { hs.dispute = null; return '영주가 수도원 맥주에 얼굴이 붉어졌다. 이튿날 땅을 두고 보냈던 사람을 거두어 갔다.'; } return '영주와 그 기사들이 사흘을 먹고 마셨다. 떠나면서 수도원 숲에서 사냥해도 되느냐고 물었다.';
      default: return '장부를 덮었다. 지난 반년처럼 종이 울리고 밥이 지어질 것이다.';
    }
  },
});
