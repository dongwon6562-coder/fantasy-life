// 작품을 짓는 삶: 구상하기 → 매달리기 → 끝내고 내놓기. 후원자 찾기, 옛 책 읽기, 금서가 될 때.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { J } from '../narrative/text.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, up, gains, check } from '../adventure/core.js';
import { isJailed, jail, addNotoriety } from '../crime.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { rulerName } from '../world.js';
import { realmOf } from '../realms/index.js';
import { liveHouses, houseName } from '../history/nobles.js';
import { companiesOf, powerOf } from '../history/index.js';
import { invented } from '../era/state.js';
import { courtState, courtAccess } from '../court/index.js';
import { faithState } from '../faith/index.js';
import { reputeState, deed } from '../repute/index.js';
import { addFame as vocFame } from '../vocation/core.js';
import { AS, mi, clamp, KINDS, KIND_IDS, THEMES, LIBRARIES, canMake, alog, addArtFame, myWorks, workById, kindName, qualityWord, esteemWord } from './state.js';

const here = (g) => L(g).place;
const free = (g) => !L(g).travel && !isJailed(g) && !g.over;
const placeName = (id) => PLACES[id]?.name ?? '먼 고장';
const Q = (t, pair) => `《${t}》${pair ? J(t, pair).slice(t.length) : ''}`;
const skillOf = (g, k) => g.player.skills?.[KINDS[k].skill] ?? 0;
const renown = (g, n) => { L(g).renown = Math.max(0, (L(g).renown ?? 0) + n); };
const placeFame = (g, n, pl = here(g)) => { const R = reputeState(g); if (PLACES[pl] && !PLACES[pl].hidden) R.fame[pl] = clamp((R.fame[pl] ?? 0) + n, 0, 100); };
// 작품마다 정해진 제 주사위 (공유 주사위 순서를 흔들지 않도록)
export const ownRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 11) ^ Math.imul(mi(g) * 31 + salt + 101, 2654435761)) | 0 });

/* ---------- 제목 ---------- */
const ADJ = {
  praise: ['영광의', '빛나는', '위대한', '황금빛'], truth: ['있는 그대로의', '숨김없는', '맨눈으로 본', '잿빛'],
  faith: ['성광의', '거룩한', '새벽 기도의', '순례자의'], love: ['봄밤의', '들꽃', '먼 데 있는 이의', '물레방아 곁의'],
  satire: ['살찐 돼지들의', '거꾸로 선', '금관 쓴 당나귀의', '배부른 자들의'], heresy: ['잊힌 신들의', '금지된', '그늘진', '이름 없는'],
};
export function makeTitle(rng, kind, theme, place) {
  const K = KINDS[kind];
  const word = rng.pick(K.words);
  if (kind === 'history' && theme === 'praise') return `${rng.pick(['레오니아', '왕가', '사자 왕관'])}의 ${rng.pick(['영광', '빛나는 날들'])}`;
  if (kind === 'travel' && rng.chance(0.4)) return `${placeName(place)}에서 ${rng.pick(['남쪽 바다까지', '북쪽 변경까지', '천룡 산맥까지'])}`;
  if ((kind === 'painting' || kind === 'sculpture') && rng.chance(0.35)) return `${placeName(place)}의 ${word}`;
  return `${rng.pick(ADJ[theme] ?? ADJ.love)} ${word}`;
}

/* ---------- 구상하기 ---------- */
ACTIONS.push({
  id: 'arts_begin', name: '작품 구상하기', icon: 'scroll',
  desc: '무엇을 지을지 정한다. 역사서·마법서·여행기·시집·노래·그림·조각. 무엇을 담을지(찬양, 있는 그대로, 신앙, 사랑, 풍자, 금기)에 따라 반기는 사람과 노하는 사람이 다르다.',
  available: (g) => playerAge(g) >= 14 && free(g) && !AS(g).draft && !sceneQueued(g, 'arts_pick') && !sceneQueued(g, 'arts_theme') && KIND_IDS.some((k) => canMake(g, k)),
  run(g) {
    if (AS(g).draft) return '이미 붙든 작품이 있다.';
    tired(g, 4);
    queueScene(g, 'arts_pick', {}, { first: true });
    return '빈 종이 앞에 오래 앉아 있었다. 머릿속에 몇 가지가 떠올랐다 가라앉았다.';
  },
});
defineScene('arts_pick', {
  title: () => '무엇을 지을까',
  text: (g) => `${myWorks(g).length ? `지금까지 ${myWorks(g).length}점을 세상에 내놓았다. ` : ''}손에 익은 것도 있고, 아직 서툰 것도 있다. 무엇을 지을까.`,
  choices: (g) => [...KIND_IDS.filter((k) => canMake(g, k)).slice(0, 7).map((k) => ({ label: `${KINDS[k].name} (솜씨 ${Math.round(skillOf(g, k))})`, key: k })), { label: '아직은 아니다', key: 'none' }],
  resolve(g, rng, s, key) {
    if (key === 'none' || !KINDS[key]) return '종이를 접어 서랍에 넣었다. 언젠가는.';
    queueScene(g, 'arts_theme', { k: key }, { first: true });
    return `${J(KINDS[key].name, '을/를')} 짓기로 했다. 이제 무엇을 담을지가 남았다.`;
  },
});
defineScene('arts_theme', {
  need: (g, s) => !!KINDS[s.k] && !AS(g).draft,
  title: (g, s) => `${KINDS[s.k].name}에 무엇을 담을까`,
  text: (g, s) => {
    const P = AS(g).patron;
    return `무엇을 담느냐에 따라 반기는 사람과 노하는 사람이 다르다. ${KINDS[s.k].themes.map((t) => `${THEMES[t].name}: ${THEMES[t].desc}`).join(' ')}${P ? ` 후원자 ${J(P.name, '은/는')} ${THEMES[P.want].name} 쪽을 바란다.` : ''}`;
  },
  choices: (g, s) => KINDS[s.k].themes.map((t) => ({ label: `${THEMES[t].name}${AS(g).patron?.want === t ? ' (후원자가 바란다)' : ''}`, key: t })),
  resolve(g, rng, s, key) {
    const K = KINDS[s.k], T = THEMES[key];
    if (!K || !T) return '생각이 흩어졌다.';
    const title = makeTitle(rng, s.k, key, here(g));
    AS(g).draft = { kind: s.k, theme: key, title, prog: 0, need: K.need * 2, q: 0, n: 0, start: mi(g), place: here(g) };
    alog(g, `${K.name} ${Q(title, '을/를')} 짓기 시작했다.`);
    return `첫 장 맨 위에 이름을 적었다. ${Q(title)}. ${K.need >= 8 ? '긴 싸움이 될 것이다.' : '오래 걸리지는 않을 것이다.'}`;
  },
});

/* ---------- 매달리기 ---------- */
const LINES = {
  history: ['오래된 연대기 세 권을 펴 놓고 서로 어긋나는 해를 맞추었다.', '늙은 기사를 찾아가 마흔 해 전 싸움 이야기를 받아 적었다.', '왕립 서고 사서가 금고 열쇠를 빌려주었다. 먼지 냄새가 났다.'],
  grimoire: ['같은 술식을 열 번 그리고 열 번 지웠다. 한 줄이 남았다.', '마력이 도는 길을 그림으로 그려 보았다. 처음으로 남이 알아볼 만했다.', '스승에게 배운 것과 내가 찾은 것을 갈라 적었다.'],
  travel: ['지나온 고장들의 장날과 사투리를 떠올려 적었다.', '길에서 만난 사람들의 얼굴을 하나씩 글로 옮겼다.', '지도와 내 기억이 다른 곳을 표시해 두었다.'],
  poems: ['밤새 한 줄을 붙들고 있었다. 새벽에 그 줄을 지웠다.', '장터에서 들은 아낙의 한마디가 시가 되었다.', '오래전 잃은 사람을 떠올리며 썼다. 다시 읽지 않았다.'],
  song: ['류트 줄을 고르며 같은 가락을 백 번 되풀이했다.', '주점 구석에서 새 노래를 낮게 불러 보았다. 몇 사람이 발을 굴렀다.', '후렴이 마음에 들지 않아 통째로 바꾸었다.'],
  painting: ['안료를 갈아 달걀노른자에 개었다. 손톱 밑이 파랗게 물들었다.', '해 질 녘 빛이 사라지기 전에 서둘러 붓을 놀렸다.', '밑그림을 지우고 다시 그렸다. 이번에는 눈이 살아 있었다.'],
  sculpture: ['정으로 돌을 쪼았다. 하루 종일 쪼아 손가락 한 마디만큼 나아갔다.', '돌 속의 금을 잘못 보아 한 귀퉁이를 날렸다. 처음부터 다시 생각했다.', '얼굴의 선을 사포로 문질렀다. 돌이 조금 따뜻해진 것 같았다.'],
};
ACTIONS.push({
  id: 'arts_work', name: '작품에 매달리기', icon: 'book',
  desc: '붙든 작품에 공을 들인다. 솜씨가 좋을수록, 공들인 날이 많을수록 됨됨이가 좋아진다. 다 되면 세상에 내놓는다.',
  available: (g) => playerAge(g) >= 14 && free(g) && !!AS(g).draft,
  run(g, rng) {
    const A = AS(g), d = A.draft;
    if (!d || !KINDS[d.kind]) return '붙든 작품이 없다.';
    const K = KINDS[d.kind];
    tired(g, d.kind === 'sculpture' ? 14 : 10);
    const p = g.player;
    const v = clamp(skillOf(g, d.kind) * 0.7 + (p.stats[K.stat] ?? 30) * 0.3 + rng.normal(0, 9) + (p.stress >= 70 ? -8 : 0), 3, 100);
    d.q += v; d.n += 1; d.prog += 1;
    const sk = gainSkill(g, K.skill, 1.1, K.stat);
    const st = gainStat(g, K.stat, 0.15);
    if (d.kind === 'grimoire') gainSkill(g, 'letters', 0.4, 'int');
    if (d.kind === 'poems') gainSkill(g, 'music', 0.2, 'cha');
    const line = rng.pick(LINES[d.kind]);
    const gainTxt = gains([up(K.skill === 'fineart' ? '그림과 조각' : K.skill === 'magic' ? '마법' : K.skill === 'music' ? '음악' : '글과 학문', sk), up('능력', st)]);
    if (d.prog >= d.need) {
      queueScene(g, 'arts_done', {}, { first: true });
      return `${line} 마지막 ${d.kind === 'song' ? '소절' : d.kind === 'painting' ? '붓질' : d.kind === 'sculpture' ? '정질' : '장'}을 마쳤다. ${Q(d.title, '이/가')} 끝났다.${gainTxt}`;
    }
    const left = d.need - d.prog;
    return `${line} ${left <= 2 ? '거의 다 되었다.' : left <= d.need / 2 ? '반을 넘겼다.' : '아직 갈 길이 멀다.'}${gainTxt}`;
  },
});

/* ---------- 끝내고 내놓기 ---------- */
// 작품이 세상에 나온다
export function publish(g, rng, d) {
  const A = AS(g), K = KINDS[d.kind];
  const avg = d.n ? d.q / d.n : 20;
  const q = Math.round(clamp(avg + Math.min(8, d.n - d.need / 2) + rng.normal(0, 4), 3, 100));
  const w = {
    id: A.seq++, kind: d.kind, theme: d.theme, title: d.title, author: `${g.player.name} ${g.player.lastName ?? ''}`.trim(),
    mine: true, gen: L(g).gen ?? 1, year: g.date.year, place: here(g), q,
    esteem: Math.round(clamp(q * 0.55 + A.fame * 0.25 + (d.theme === 'satire' ? 8 : 0), 1, 95)),
    copies: K.book ? (invented(g, 'press') ? 12 : 3) : 1, banned: null, lost: false, ruler: rulerName(g), patron: A.patron?.name ?? null,
  };
  A.works.push(w); A.made += 1; A.draft = null;
  addArtFame(g, 3 + q / 15);
  renown(g, q >= 70 ? 3 : 1);
  placeFame(g, 2 + q / 20);
  if (L(g).job?.id === 'bard' && (d.kind === 'song' || d.kind === 'poems')) vocFame(g, 'bard', 2 + q / 20);
  note(g, `${K.name} ${Q(w.title, '을/를')} 세상에 내놓았다.`);
  alog(g, `${K.name} ${Q(w.title, '을/를')} 내놓았다 (${qualityWord(q)}).`);
  if (q >= 70) chron(g, `${w.author}, ${K.name} ${Q(w.title, '을/를')} 내놓다.`, q >= 85 ? 85 : 60);
  // 위험한 결이면 몇 달 뒤에 누군가 들여다본다
  const T = THEMES[d.theme];
  if (T.risk.church || T.risk.crown) w.watch = mi(g) + rng.int(2, 7);
  // 후원자의 뜻
  const P = A.patron;
  if (P) { P.lastWork = mi(g); P.mood = clamp(P.mood + (d.theme === P.want ? 12 + q / 10 : d.theme === 'satire' && (P.kind === 'house' || P.kind === 'crown') ? -25 : -4), 0, 100); }
  // 연구 갈래와 잇기: 마법서를 쓰면 마법 공부가, 역사서를 쓰면 학문이 깊어진다
  if (d.kind === 'grimoire' && g.research?.project) g.research.project.prog = Math.min(1, (g.research.project.prog ?? 0) + 0.04);
  return w;
}
defineScene('arts_done', {
  keep: true,
  need: (g) => !!AS(g).draft && AS(g).draft.prog >= AS(g).draft.need,
  title: (g) => `${Q(AS(g).draft.title)}`,
  text: (g) => {
    const d = AS(g).draft, K = KINDS[d.kind], P = AS(g).patron;
    const avg = d.n ? d.q / d.n : 20;
    return `${J(K.name, '이/가')} 끝났다. 스스로 보기에는 ${qualityWord(avg)}이다. ${K.book ? '필사본을 만들어 팔 수도 있고' : '사겠다는 사람을 찾을 수도 있고'}, ${P ? `후원자 ${P.name}에게 바칠 수도 있고, ` : ''}${K.book ? '서고에 들여 오래 남길 수도 있다.' : '사람들이 보는 곳에 내걸 수도 있다.'}`;
  },
  choices: (g) => {
    const d = AS(g).draft, K = KINDS[d.kind];
    const out = [{ label: K.book ? '필사본을 만들어 판다' : '사는 사람에게 판다', key: 'sell' }];
    if (AS(g).patron) out.push({ label: `후원자 ${AS(g).patron.name}에게 바친다`, key: 'patron' });
    out.push({ label: K.book ? (LIBRARIES[here(g)] ? `${LIBRARIES[here(g)]}에 들인다` : '이웃들에게 돌려 읽힌다') : '광장과 성당에 내건다', key: 'give' });
    return out;
  },
  resolve(g, rng, s, key) {
    const d = AS(g).draft;
    if (!d) return '';
    const K = KINDS[d.kind];
    const w = publish(g, rng, d);
    const press = invented(g, 'press');
    if (key === 'sell') {
      const n = Math.max(2, Math.round((w.q / 6 + AS(g).fame / 8) * (K.book ? (press ? 1.6 : 1) : d.kind === 'sculpture' ? 2.2 : d.kind === 'painting' ? 1.5 : 0.8) * (0.8 + rng.float(0, 0.4))));
      g.player.money += n; w.copies += K.book ? 2 : 0;
      return `${K.book ? `필사공들이 ${press ? '마도 인쇄기로 찍어 낸 책을' : '베낀 사본을'} 서점에 깔았다` : `${rng.pick(['하르펜 상인', '시골 지주', '늙은 기사의 미망인', '여관 주인'])}이 값을 치르고 가져갔다`}. 은화 ${n}닢. ${w.q >= 65 ? '사 간 사람이 다시 와서 다음 것은 언제냐고 물었다.' : w.q < 30 ? '사 간 사람이 고개를 갸웃거렸다.' : ''}`;
    }
    if (key === 'patron' && AS(g).patron) {
      const P = AS(g).patron;
      const gift = Math.round(P.stipend * (1.5 + w.q / 40));
      g.player.money += gift; P.mood = clamp(P.mood + 6, 0, 100);
      w.patron = P.name;
      if (P.kind === 'crown') { courtState(g).standing = clamp(courtState(g).standing + 3 + w.q / 25, 0, 100); }
      if (P.kind === 'church') { const f = faithState(g); f.devotion = clamp(f.devotion + 2, 0, 100); f.suspicion = Math.max(0, f.suspicion - 4); }
      return `${J(P.name, '은/는')} ${Q(w.title, '을/를')} ${w.q >= 60 ? '오래 들여다보더니 고개를 끄덕였다' : '받아 들고 형식적으로 고마워했다'}. 사례로 은화 ${gift}닢. ${w.theme === P.want ? '바라던 것이었다.' : '바라던 것과는 조금 달랐던 모양이다.'}`;
    }
    w.esteem = clamp(w.esteem + 6, 0, 100); w.copies += K.book ? 1 : 0;
    placeFame(g, 3); addArtFame(g, 2);
    if (w.theme === 'faith') { const f = faithState(g); f.devotion = clamp(f.devotion + 3, 0, 100); }
    deed(g, 'generous', 5, `${g.player.name}${J(g.player.name, '이/가').slice(g.player.name.length)} 지은 ${K.name}을 값없이 내놓았다고 한다.`);
    return K.book ? `${LIBRARIES[here(g)] ? `${LIBRARIES[here(g)]} 사서가 ${Q(w.title, '을/를')} 서가에 꽂았다. 언젠가 누군가 꺼내 읽을 것이다.` : '이웃들이 돌려 가며 읽었다. 책이 돌아왔을 때 모서리가 닳아 있었다.'}` : `${placeName(here(g))} ${d.kind === 'sculpture' ? '광장 한쪽에 돌을 세웠다' : '성당 회랑에 그림을 걸었다'}. 지나가던 사람들이 걸음을 멈추었다.`;
  },
});

/* ---------- 후원자 ---------- */
const PATRON_CITIES = ['leocast', 'harfen', 'solaris', 'serenia', 'eisen', 'verden'];
export function patronOffers(g, rng) {
  const out = [];
  const hs = liveHouses(g).filter((h) => !h.fallen);
  if (hs.length) { const h = rng.pick(hs); out.push({ kind: 'house', id: h.id, name: houseName(h), stipend: Math.round(3 + (h.power ?? 40) / 20), want: 'praise' }); }
  const cs = companiesOf(g).filter((c) => !c.closed);
  if (cs.length) { const c = rng.pick(cs); out.push({ kind: 'company', id: c.id, name: c.name, stipend: Math.round(3 + (c.fortune ?? 30) / 18), want: rng.pick(['love', 'truth', 'praise']) }); }
  if (realmOf(here(g)) === 'holy' || here(g) === 'leocast' || here(g) === 'solaris' || rng.chance(0.5)) out.push({ kind: 'church', id: 'church', name: '성광교 대성당', stipend: 4, want: 'faith' });
  if (!courtAccess(g) && AS(g).fame >= 35) out.push({ kind: 'crown', id: 'crown', name: '왕실', stipend: 8, want: 'praise' });
  return out.slice(0, 3);
}
ACTIONS.push({
  id: 'arts_seek_patron', name: '후원자 찾아 나서기', icon: 'crown',
  desc: '작품을 들고 귀족 집안과 상단, 대성당의 문을 두드린다. 후원자가 생기면 다달이 녹봉이 나오지만, 그들이 바라는 것을 지어야 한다.',
  available: (g) => playerAge(g) >= 16 && free(g) && !AS(g).patron && PATRON_CITIES.includes(here(g)) && AS(g).fame >= 8 && myWorks(g).length >= 1 && !sceneQueued(g, 'arts_patron'),
  run(g, rng) {
    tired(g, 8);
    const A = AS(g);
    if (A.seekAt === mi(g)) return '오늘은 어느 집 문지기도 나를 들여보내 주지 않았다.';
    A.seekAt = mi(g);
    const offers = patronOffers(g, rng).filter(() => check(rng, A.fame + g.player.stats.cha * 0.5, 45));
    if (!offers.length) { stress(g, 3); return `${rng.pick(['집사가 원고를 받아 들고 훑어보더니 돌려주었다. "주인께서는 지금 바쁘십니다."', '상단 회계원은 내 그림보다 내 신발을 더 오래 보았다.', '대성당 서기는 "기도로 짓는 것이 먼저"라며 문을 닫았다.'])} 이름이 조금 더 나야 할 것 같다.`; }
    queueScene(g, 'arts_patron', { offers }, { first: true });
    return '몇 집에서 다시 오라는 말을 들었다. 그중 몇은 진심인 것 같았다.';
  },
});
defineScene('arts_patron', {
  need: (g, s) => !AS(g).patron && (s.offers ?? []).length > 0,
  title: () => '후원의 제안',
  text: (g, s) => `제안이 들어왔다. ${s.offers.map((o) => `${o.name}: 다달이 은화 ${o.stipend}닢, ${THEMES[o.want].name} 쪽을 바란다`).join(' / ')}. 후원을 받으면 그들의 뜻을 아주 모른 척할 수는 없다.`,
  choices: (g, s) => [...s.offers.map((o, i) => ({ label: `${o.name}의 후원을 받는다`, key: `p${i}` })), { label: '누구에게도 매이지 않는다', key: 'none' }],
  resolve(g, rng, s, key) {
    if (key === 'none') { addArtFame(g, 1); deed(g, 'brave', 3, null); return '제안을 모두 사양했다. 배는 고프겠지만 붓은 내 것이다.'; }
    const o = s.offers[Number(key.slice(1))];
    if (!o) return '';
    AS(g).patron = { ...o, mood: 60, since: mi(g), lastWork: mi(g) };
    alog(g, `${o.name}의 후원을 받기 시작했다.`);
    note(g, `${o.name}의 후원을 받게 되었다.`);
    if (o.kind === 'crown') { courtState(g).standing = clamp(courtState(g).standing + 5, 0, 100); chron(g, `${g.player.name}, 왕실이 후원하는 작가가 되다.`, 70); }
    if (o.kind === 'house') { const c = courtState(g); c.allies[o.id] = clamp((c.allies[o.id] ?? 0) + 8, 0, 100); }
    return `${o.kind === 'church' ? '대성당 부제가 축복을 내리고 녹봉 장부에 내 이름을 적었다.' : o.kind === 'crown' ? '왕실 시종장이 붉은 봉랍을 찍은 증서를 건넸다. 이제 내 작품에는 사자 문장이 붙는다.' : o.kind === 'company' ? '상단주는 손을 내밀며 웃었다. "좋은 물건은 좋은 값을 받아야지요."' : `${o.name} 가주가 나를 응접실로 불러 포도주를 따랐다. "우리 집안을 오래 남겨 주게."`} 다달이 은화 ${o.stipend}닢.`;
  },
});

/* ---------- 옛 책 읽기 ---------- */
const readable = (g) => {
  const A = AS(g);
  const lib = LIBRARIES[here(g)];
  return A.works.filter((w) => KINDS[w.kind]?.book && !w.lost && w.copies > 0 && !A.read.includes(w.id) && (w.mine || (lib && !w.banned)));
};
ACTIONS.push({
  id: 'arts_read', name: '옛 책 읽기', icon: 'book',
  desc: '서고나 집안 책장에서 남이 남긴 책, 선대가 남긴 책을 읽는다. 마법서는 마법을, 역사서와 여행기는 학문과 견문을 키운다. 연구 중이면 실마리가 되기도 한다.',
  available: (g) => playerAge(g) >= 10 && free(g) && readable(g).length > 0,
  run(g, rng) {
    const list = readable(g);
    if (!list.length) return '읽을 만한 책이 남지 않았다.';
    tired(g, 5);
    const A = AS(g);
    const w = list.sort((a, b) => (b.mine - a.mine) || (b.esteem - a.esteem))[0];
    A.read.push(w.id);
    if (A.read.length > 80) A.read.splice(0, A.read.length - 80);
    const p = g.player;
    let gain;
    if (w.kind === 'grimoire') gain = p.manaAwakened ? up('마법', gainSkill(g, 'magic', 0.6 + w.q / 80, 'int')) : up('글과 학문', gainSkill(g, 'letters', 0.6, 'int'));
    else gain = up('글과 학문', gainSkill(g, 'letters', 0.6 + w.q / 90, 'int'));
    if (w.kind === 'travel') gainStat(g, 'sen', 0.2);
    if (g.research?.project && rng.chance(0.4)) g.research.project.prog = Math.min(1, (g.research.project.prog ?? 0) + 0.02);
    if (w.banned) { const f = faithState(g); f.suspicion = Math.min(100, f.suspicion + 3); }
    stress(g, -3);
    const anc = w.mine && w.gen < (L(g).gen ?? 1);
    return `${anc ? `선대 ${w.author}의 ${KINDS[w.kind].name} ${Q(w.title, '을/를')} 펼쳤다. 여백에 손때 묻은 글씨가 남아 있었다.` : `${w.year}년에 ${w.author}${J(w.author, '이/가').slice(w.author.length)} 쓴 ${Q(w.title, '을/를')} 읽었다.`} ${w.q >= 70 ? '책장을 넘기는 손이 멈추지 않았다.' : w.q >= 40 ? '몇 대목은 오래 곱씹었다.' : '절반쯤에서 하품이 났다.'} 세상에서는 ${esteemWord(w.esteem)}.${gains([gain])}`;
  },
});

/* ---------- 금서 ---------- */
defineScene('arts_ban', {
  need: (g, s) => !!workById(g, s.id) && !workById(g, s.id).banned,
  title: (g, s) => (s.by === 'church' ? '이단심문소의 봉인' : '왕실의 금령'),
  text: (g, s) => {
    const w = workById(g, s.id);
    return s.by === 'church'
      ? `흰 망토를 두른 심문관이 ${Q(w.title, '을/를')} 탁자에 내려놓았다. "이 ${KINDS[w.kind].name}은 성광의 가르침을 더럽힌다. 지은 자가 스스로 거두어 불사르면 자비가 있을 것이다."`
      : `왕실 서기관이 금령을 읽었다. "${Q(w.title)}, 임금과 나라를 욕보인 글로 정한다. 사본을 모두 거두어 바치라." 서기관 뒤에 근위병 넷이 서 있었다.`;
  },
  choices: (g, s) => [
    { label: '스스로 거두어 불사른다', key: 'recant' },
    { label: '사본을 몰래 숨긴다', key: 'hide' },
    { label: '공개로 맞선다', key: 'defy' },
  ],
  resolve(g, rng, s, key) {
    const w = workById(g, s.id);
    if (!w) return '';
    const church = s.by === 'church';
    if (key === 'recant') {
      w.banned = { by: s.by, y: g.date.year }; w.copies = Math.max(0, Math.round(w.copies * 0.2)); w.esteem = clamp(w.esteem - 10, 0, 100);
      addArtFame(g, -4); stress(g, 10);
      if (church) { const f = faithState(g); f.suspicion = Math.max(0, f.suspicion - 10); }
      alog(g, `${Q(w.title, '을/를')} 스스로 불살랐다.`);
      return '광장에서 내 손으로 사본을 불에 던졌다. 종이가 오그라들며 글자가 하나씩 검게 지워졌다. 사람들은 아무 말도 하지 않았다. 그 침묵이 가장 오래 남았다.';
    }
    w.banned = { by: s.by, y: g.date.year };
    if (key === 'hide') {
      w.copies = Math.max(1, Math.round(w.copies * 0.6)); w.esteem = clamp(w.esteem + 4, 0, 100);
      if (check(rng, g.player.stats.int * 0.5 + g.player.stats.agi * 0.5, 45)) { alog(g, `${Q(w.title)}, 금서가 되었다. 사본을 숨겼다.`); return '사본 몇 권을 밀가루 자루 밑에, 우물 벽돌 뒤에 숨겼다. 거둬 간 것은 겉장만 같은 다른 책들이었다. 금서가 된 책은 이상하게도 더 많이 읽힌다.'; }
      addNotoriety(g, 6);
      if (church) { const f = faithState(g); f.suspicion = Math.min(100, f.suspicion + 15); } else courtState(g).disgrace = Math.max(courtState(g).disgrace ?? 0, mi(g) + 24);
      jail(g, 4);
      return '우물 벽돌 뒤의 사본이 들켰다. 이웃 누군가가 알렸을 것이다. 넉 달을 감옥에서 보내야 한다.';
    }
    // 공개로 맞선다
    w.esteem = clamp(w.esteem + 12, 0, 100); addArtFame(g, 6); renown(g, 3);
    deed(g, 'brave', 10, `${w.author}${J(w.author, '이/가').slice(w.author.length)} 금령에 맞서 광장에서 제 글을 낭독했다고 한다.`);
    chron(g, `${w.author}, 금서가 된 ${Q(w.title, '을/를')} 거두지 않고 맞서다.`, 70);
    if (church) { const f = faithState(g); f.suspicion = Math.min(100, f.suspicion + 25); }
    else { const c = courtState(g); c.disgrace = Math.max(c.disgrace ?? 0, mi(g) + 36); c.favor = clamp(c.favor - 15, 0, 100); }
    if (AS(g).patron && (AS(g).patron.kind === (church ? 'church' : 'crown') || (!church && AS(g).patron.kind === 'house'))) { alog(g, `${AS(g).patron.name}, 후원을 거두다.`); AS(g).patron = null; }
    if (rng.chance(church ? 0.35 : 0.3)) { addNotoriety(g, 8); jail(g, 6); return '광장에서 내 글을 소리 내어 읽었다. 사람들이 모여들었다. 셋째 장을 읽을 때 근위병이 나를 끌어내렸다. 감옥 창살 너머로 누군가 내 글귀를 외치는 소리가 들렸다.'; }
    return '광장에서 내 글을 소리 내어 읽었다. 사람들이 모여들었고, 아무도 나를 끌어내리지 못했다. 그날 밤 장터 주점마다 내 글귀가 돌았다. 금령은 그대로지만, 그 책은 이제 아무도 막을 수 없다.';
  },
});

// 위험한 결의 작품을 누군가 들여다본다. 후원자는 녹봉을 주고, 소식이 없으면 마음이 식는다.
export function banOdds(g, w) {
  const T = THEMES[w.theme], realm = realmOf(w.place ?? here(g));
  const seen = 0.6 + Math.min(0.6, w.copies / 15) + w.esteem / 200;
  const church = (T.risk.church ?? 0) * (powerOf(g, 'church') / 55) * (realm === 'holy' ? 1.5 : realm === 'leonia' || realm === 'march' ? 1 : 0.5) * seen;
  const crown = (T.risk.crown ?? 0) * (realm === 'leonia' || realm === 'march' ? 1 : 0.6) * (w.patron && AS(g).patron?.kind === 'crown' ? 0.4 : 1) * seen;
  return { church: clamp(church, 0, 0.85), crown: clamp(crown, 0, 0.85) };
}
HOOKS.afterMonth.push((g) => {
  const A = g.arts;
  if (!A || g.over || !g.player) return;
  const rng = ownRng(g, 7);
  const now = mi(g);
  for (const w of A.works) {
    if (!w.mine || !w.watch || w.watch > now) continue;
    w.watch = null;
    if (w.banned || w.lost) continue;
    const o = banOdds(g, w);
    const by = rng.chance(o.church) ? 'church' : rng.chance(o.crown) ? 'crown' : null;
    if (by && !sceneQueued(g, 'arts_ban')) queueScene(g, 'arts_ban', { id: w.id, by });
  }
  const P = A.patron;
  if (P && !L(g).travel) {
    g.player.money += P.stipend;
    if (now - (P.lastWork ?? P.since) > 12) P.mood = clamp(P.mood - 2.5, 0, 100);
    if (P.mood <= 0) {
      A.patron = null;
      alog(g, `${P.name}, 후원을 거두다.`);
      note(g, `${P.name}의 후원이 끊겼다.`);
      g.news?.unshift({ text: `${P.name}에서 편지가 왔다. 더는 녹봉을 보낼 수 없다는 짧은 글이었다.`, rel: 100 });
    }
  }
});
