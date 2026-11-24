// 재고 그리는 일: 측량사 일자리, 측량 의뢰(경계·새 길·개척지·땅 재기), 고장 지도 그리기, 미지의 땅 지도 옮겨 그리기,
// 지도 팔기(상단·선장·낯선 손님), 지도 공방, 이름 남는 큰 지도, 경계 다툼의 증인, 군용 지도와 도둑.
import { ACTIONS } from '../actions.js';
import { gainStat, gainSkill } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, gains, up } from '../adventure/core.js';
import { registerJob, WORK, doWork } from '../jobs.js';
import { deed } from '../repute/index.js';
import { atWar } from '../world.js';
import { E as exploreState, REGIONS } from '../explore/core.js';
import { FS, SITES } from '../frontier/state.js';
import { WS, WORKS } from '../works/state.js';
import { J } from '../narrative/text.js';
import {
  S, mi, clamp, here, placeName, free, adult, SURVEY_PLACES, MAP_TOWNS, ATELIER_COST, BORDERS, KIND_NAME, qWord, logS, skill, isSV, atelierHere, gainS, unsold, addMap, mapTitle,
} from './core.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const earn = (g, n) => { n = Math.max(0, Math.round(n)); g.player.money += n; S(g).earned += n; return n; };
const letters = (g) => g.player.skills.letters ?? 0;
const quality = (g, rng, bonus = 0) => clamp(skill(g) * 0.7 + letters(g) * 0.2 + (g.player.stats.sen ?? 20) * 0.2 + rng.int(-8, 8) + bonus, 1, 100);
export const mapValue = (g, m, pl = here(g)) => Math.round(({ town: 10, region: 40, war: 30 }[m.kind] ?? 6) * (0.4 + m.q / 80) * (MAP_TOWNS[pl] ?? 0.8));
const builtHere = (g) => Object.keys(WORKS).find((id) => WORKS[id].place === here(g) && WS(g).w[id]?.stage === 'building') ?? null;
const siteNear = (g) => Object.keys(SITES).find((id) => SITES[id].near === here(g) && (FS(g).sites[id]?.stage ?? 0) >= 1) ?? null;
// 내가 아는 미지의 땅: 원정에서 절반 넘게 그린 곳, 아직 내 지도로 옮기지 않은 곳
const wildToCopy = (g) => Object.entries(exploreState(g).regions ?? {}).filter(([id, r]) => REGIONS[id] && (r.mapped ?? 0) >= 0.5 && !S(g).maps.some((m) => m.kind === 'region' && m.rid === id)).map(([id]) => id);

/* ---------- 일자리 ---------- */
const rankOf = (g) => { const v = skill(g); return v < 15 ? 0 : v < 40 ? 1 : v < 70 ? 2 : 3; };
registerJob('surveyor', {
  name: '측량사', places: SURVEY_PLACES, skill: null, stat: 'int', stat2: 'sen', wage: [3, 5, 7, 11], npcJob: 'laborer', rankOf,
  req: (g) => (letters(g) >= 15 ? null : '글과 학문 15'),
  lines: ['측량대를 세우고 사슬을 당겨 밀밭 둘레를 쟀다. 장부에 숫자가 한 줄씩 늘었다.', '언덕 꼭대기에 올라 나침반으로 교회 첨탑과 풍차의 각을 쟀다.', '세금 장부에 붙일 마을 땅 그림을 깨끗하게 옮겨 그렸다.', '비 오는 날 내내 측량 장부의 숫자를 맞추었다. 사흘 전 잰 개울 너비가 한 뼘 틀렸다.'],
  work(g, rng) { gainS(g, 1); return doWork(g, rng, WORK.surveyor); },
});

/* ---------- 측량 의뢰 ---------- */
ACTIONS.push({
  id: 'sv_commission', name: '측량 의뢰를 맡는다', icon: 'scale',
  desc: '영지 경계, 새 길, 개척지 나누기, 땅 재기. 측량사의 숫자 한 줄에 땅과 돈이 오간다.',
  available: (g) => free(g) && isSV(g) && skill(g) >= 8 && mi(g) - S(g).evAt >= 3 && !sceneQueued(g, 'sv_commission'),
  run(g, rng) {
    S(g).evAt = mi(g);
    const pool = ['border', 'estate'];
    if (builtHere(g)) pool.push('road', 'road'); else pool.push('road');
    if (siteNear(g)) pool.push('frontier', 'frontier');
    const kind = pool[Math.floor(rng.next() * pool.length)];
    const pair = BORDERS[Math.floor(rng.next() * BORDERS.length)];
    queueScene(g, 'sv_commission', { what: kind, a: pair[0], b: pair[1], site: siteNear(g), work: builtHere(g) }, { first: true });
    return '측량대와 사슬, 나침반과 장부를 챙겼다. 의뢰한 사람이 말을 보내왔다.';
  },
});
defineScene('sv_commission', {
  title: (g, s) => ({ border: '영지 경계', road: '새 길', frontier: '개척지 나누기', estate: '땅 재기' }[s.what]),
  text: (g, s) => {
    if (s.what === 'border') return `${J(s.a, '과/와')} ${s.b} 사이의 경계를 다시 긋는다. 옛 경계석 셋 중 하나가 없어졌다. 측량을 마치기 전날 밤, ${s.a} 쪽 집사가 찾아와 개울 하나만큼 경계를 저쪽으로 밀어 달라며 주머니를 내려놓았다.`;
    if (s.what === 'road') return `${s.work ? `${J(WORKS[s.work].name, '이/가')} 놓일 자리를 잰다. ` : '영주가 새 길을 낼 자리를 재 달라고 한다. '}곧게 내면 옛 마을 묘지와 과부네 보리밭을 지난다. 돌아가면 사흘 길이 늘고 다리를 둘 더 놓아야 한다.`;
    if (s.what === 'frontier') return `${SITES[s.site]?.land ?? '변경'} 개척촌의 땅을 집집마다 나눈다. 샘가의 검은 흙은 한 덩이뿐이다. 개척촌을 세운 사람이 그 자리를 자기 몫으로 그어 달라며 은화를 흔든다.`;
    return '부잣집 상인이 사들인 밭의 넓이를 잰다. 세금은 넓이로 매긴다. 상인은 장부에 적힐 숫자가 조금 작으면 좋겠다고 웃는다.';
  },
  choices: (g, s) => ({
    border: [['true', '옛 기록과 사슬이 말하는 대로 긋는다'], ['shift', '주머니를 받고 경계를 민다'], ['split', '없어진 경계석 자리를 반씩 나누자고 한다']],
    road: [['straight', '곧게 낸다'], ['around', '묘지와 밭을 돌아가게 낸다'], ['bribe', '과부에게 땅값을 쳐 주자고 영주를 설득한다']],
    frontier: [['fair', '제비뽑기로 나눈다'], ['founder', '세운 사람에게 샘가를 그어 준다'], ['poor', '식구 많은 집에 샘가를 준다']],
    estate: [['true', '잰 대로 적는다'], ['small', '숫자를 줄여 적는다'], ['big', '도리어 조금 크게 적어 상인을 골탕 먹인다']],
  }[s.what]).map(([key, label]) => ({ label, key })),
  resolve(g, rng, s, key) {
    const st = S(g); st.jobs += 1; const k = gainS(g, 1.5); gainSkill(g, 'letters', 0.3, 'int');
    const fee = (m = 1) => earn(g, (6 + skill(g) / 8) * m);
    const tail = gains([up('측량 솜씨', k)]);
    if (s.what === 'border') {
      st.borders.push({ a: s.a, b: s.b, y: g.date.year, shifted: key === 'shift' });
      if (st.borders.length > 8) st.borders.shift();
      if (key === 'shift') { const n = fee(2.2); deed(g, 'honest', -3, null); return `이튿날 경계석을 개울 건너편에 묻었다. ${s.b} 쪽 늙은 농부가 그 돌을 오래 내려다보았다. 은화 ${n}닢.${tail}`; }
      if (key === 'split') { const n = fee(1); deed(g, 'kind', 1, null); return `양쪽 집사가 한참 투덜대다 손을 잡았다. 새 경계석 위에 두 집안 문장을 반씩 새겼다. 은화 ${n}닢.${tail}`; }
      const n = fee(1); deed(g, 'honest', 2, null); return `옛 측량 장부의 숫자대로 사슬을 당겼다. 경계석이 원래 자리에 다시 섰다. 집사는 주머니를 도로 집어 들고 말없이 갔다. 은화 ${n}닢.${tail}`;
    }
    if (s.what === 'road') {
      if (key === 'straight') { const n = fee(1.3); deed(g, 'kind', -1, null); return `길은 자로 그은 듯 곧게 났다. 영주는 흡족해했다. 옛 묘지의 비석들은 길가로 옮겨졌다. 은화 ${n}닢.${tail}`; }
      if (key === 'around') { const n = fee(0.8); deed(g, 'kind', 1, null); return `길이 언덕을 돌아 굽었다. 수레꾼들은 투덜대겠지만 묘지는 그대로다. 은화 ${n}닢.${tail}`; }
      const ok = rng.chance(0.4 + (g.player.stats.cha ?? 20) / 200); const n = fee(1);
      if (ok) { deed(g, 'kind', 2, null); return `"길 값에 비하면 밭 한 뙈기는 헐하지요." 영주가 웃었다. 과부는 땅값으로 소 한 마리를 샀다. 은화 ${n}닢.${tail}`; }
      return `영주는 측량사가 땅값까지 셈하느냐며 언짢아했다. 길은 곧게 났다. 은화 ${n}닢.${tail}`;
    }
    if (s.what === 'frontier') {
      if (key === 'founder') { const n = fee(2); deed(g, 'honest', -2, null); return `샘가가 세운 사람 몫으로 그어졌다. 다른 집들은 돌밭을 받았다. 은화 ${n}닢. 그해 겨울, 떠난 집이 둘 있었다.${tail}`; }
      if (key === 'poor') { const n = fee(0.7); deed(g, 'kind', 2, null); return `아이가 여섯인 집에 샘가가 돌아갔다. 세운 사람은 내 품삯을 깎았다. 은화 ${n}닢. 아이들이 측량대를 들어 주겠다며 따라다녔다.${tail}`; }
      const n = fee(1); deed(g, 'honest', 1, null); return `막대 열두 개에 집 이름을 적어 자루에 넣었다. 샘가는 늙은 대장장이네가 뽑았다. 아무도 따지지 못했다. 은화 ${n}닢.${tail}`;
    }
    if (key === 'small') { const n = fee(2); deed(g, 'honest', -2, null); return `장부에 적힌 넓이가 열에 둘 줄었다. 상인이 은화 몇 닢을 더 얹었다. 은화 ${n}닢.${tail}`; }
    if (key === 'big') { const n = fee(0.5); deed(g, 'honest', -1, null); return `숫자를 조금 크게 적었다. 상인의 세금이 늘었다. 상인은 다시는 나를 부르지 않을 것이다. 은화 ${n}닢. 장부 담당 서기가 눈을 찡긋했다.${tail}`; }
    const n = fee(1); deed(g, 'honest', 1, null); return `잰 대로 적었다. 상인은 웃음을 거두고 값을 치렀다. 은화 ${n}닢.${tail}`;
  },
});

/* ---------- 지도 그리기 ---------- */
ACTIONS.push({
  id: 'sv_draw', name: '이 고장 지도를 그린다', icon: 'compass',
  desc: '한 달 동안 골목과 길, 우물과 다리를 재어 이 고장 지도를 그린다. 그린 지도는 팔 수 있다.',
  available: (g) => free(g) && adult(g) && (isSV(g) || skill(g) >= 10 || atelierHere(g)) && !S(g).maps.some((m) => m.kind === 'town' && m.of === here(g) && g.date.year - m.y < 5) && g.player.fatigue < 85,
  run(g, rng) {
    tired(g, 12);
    const m = addMap(g, 'town', here(g), quality(g, rng, atelierHere(g) ? 10 : 0));
    const k = gainS(g, 1.2), s2 = gainStat(g, 'sen', 0.25);
    return `${rng.pick(['성문에서 시작해 골목마다 걸음 수를 셌다. 막다른 길 셋, 이름 없는 다리 하나.', '종탑에 올라 지붕들을 내려다보며 밑그림을 그렸다. 비둘기가 양피지 위를 걸어갔다.', '우물과 대장간, 여관과 신전 자리를 하나씩 찍었다. 사람들이 무엇을 하느냐고 물었다.'])} ${J(mapTitle(m), '이/가')} 나왔다. ${qWord(m.q)}.${gains([up('측량 솜씨', k), up('감각', s2)])}`;
  },
});
ACTIONS.push({
  id: 'sv_copy', name: '미지의 땅 지도를 옮겨 그린다', icon: 'quill',
  desc: '원정에서 그려 온 밑그림을 깨끗한 양피지에 옮긴다. 지도에 없던 땅의 지도는 값이 비싸다.',
  available: (g) => free(g) && adult(g) && (isSV(g) || skill(g) >= 10 || atelierHere(g)) && wildToCopy(g).length > 0,
  run(g, rng) {
    const id = wildToCopy(g)[0]; tired(g, 10);
    const m = addMap(g, 'region', REGIONS[id].name, quality(g, rng, 5), { rid: id });
    const k = gainS(g, 1.5);
    logS(g, `${J(mapTitle(m), '을/를')} 옮겨 그렸다.`);
    return `원정 때 비에 젖은 밑그림을 펴 놓고 한 달을 보냈다. 지도가 끝나던 자리에서 선이 더 뻗어 나갔다. ${J(mapTitle(m), '이/가')} 나왔다. ${qWord(m.q)}.${gains([up('측량 솜씨', k)])}`;
  },
});

/* ---------- 지도 팔기 ---------- */
ACTIONS.push({
  id: 'sv_sell', name: '지도를 판다', icon: 'coin',
  desc: '그린 지도를 사려는 사람을 찾는다. 항구와 큰 도시에서 값을 잘 받는다.',
  available: (g) => free(g) && !!MAP_TOWNS[here(g)] && unsold(g).some((m) => m.kind !== 'war') && mi(g) - S(g).sellAt >= 1 && !sceneQueued(g, 'sv_sell'),
  run(g, rng) {
    S(g).sellAt = mi(g);
    const m = unsold(g).filter((x) => x.kind !== 'war').sort((a, b) => mapValue(g, b) - mapValue(g, a))[0];
    queueScene(g, 'sv_sell', { map: m.id, buyer: m.kind === 'region' ? rng.pick(['guild', 'captain', 'stranger']) : rng.pick(['guild', 'captain']) }, { first: true });
    return `${J(mapTitle(m), '을/를')} 말아 들고 장으로 나갔다.`;
  },
});
const BUYERS = {
  guild: '상단 대리인이 지도를 펼쳐 손가락으로 길을 따라갔다. "우리 수레가 이 길로 다니게 되겠군."',
  captain: '햇볕에 그을린 선장이 지도를 등불에 비춰 보았다. "물길이 틀리면 배가 가라앉소. 확실하오?"',
  stranger: '말씨가 낯선 손님이 값을 묻지도 않고 주머니를 내밀었다. 어느 나라 사람인지 끝내 말하지 않았다.',
};
const mapById = (g, id) => S(g).maps.find((m) => m.id === id) ?? null;
defineScene('sv_sell', {
  need: (g, s) => !!mapById(g, s.map) && !mapById(g, s.map).sold,
  title: (g, s) => mapTitle(mapById(g, s.map)),
  text: (g, s) => { const m = mapById(g, s.map); return `${BUYERS[s.buyer]} 지도는 ${qWord(m.q)}. 값은 은화 ${mapValue(g, m)}닢 안팎.`; },
  choices: (g, s) => { const m = mapById(g, s.map); return [
    { label: '제값에 판다', key: 'fair' },
    ...(m.q < 50 ? [{ label: '흠은 말하지 않고 비싸게 판다', key: 'hide' }] : [{ label: '값을 올려 부른다', key: 'haggle' }]),
    ...(s.buyer === 'stranger' ? [{ label: '두 배를 받고 판다', key: 'double' }] : []),
    { label: '팔지 않는다', key: 'keep' },
  ]; },
  resolve(g, rng, s, key) {
    const st = S(g), m = mapById(g, s.map), v = mapValue(g, m);
    if (key === 'keep') return '지도를 도로 말았다. 아직은 손에 두고 싶다.';
    m.sold = true; m.to = s.buyer; st.sold += 1;
    if (key === 'fair') { const n = earn(g, v); deed(g, 'honest', 1, null); return `은화 ${n}닢을 받았다. ${m.q < 50 ? '틀린 데가 있을지 모른다고 일러 주었다. 사는 사람은 고개를 끄덕였다.' : '사는 사람이 지도를 품에 넣고 고개를 숙였다.'}`; }
    if (key === 'hide') { const n = earn(g, v * 1.4); m.lie = true; deed(g, 'honest', -2, null); return `흠은 말하지 않았다. 은화 ${n}닢. 그 지도가 언젠가 누군가를 엉뚱한 골짜기로 데려갈 것이다.`; }
    if (key === 'haggle') { const ok = rng.chance(0.45 + (g.player.stats.cha ?? 20) / 200); const n = earn(g, v * (ok ? 1.35 : 0.9)); return ok ? `한참 실랑이 끝에 은화 ${n}닢을 받았다.` : `값을 너무 불렀다. 사는 사람이 돌아서려 해서 도로 깎아 주었다. 은화 ${n}닢.`; }
    const n = earn(g, v * 2); m.foreign = true; deed(g, 'loyal', -2, null);
    if (m.kind === 'region') chron(g, `${m.of} 지도가 바다 건너 어느 나라의 손에 들어갔다는 말이 돈다.`, 6);
    return `은화 ${n}닢. 손님은 지도를 품에 넣고 인사도 없이 사라졌다. 이 나라에 아직 없는 지도가 다른 나라에 먼저 생겼다.`;
  },
});

/* ---------- 지도 공방과 큰 지도 ---------- */
ACTIONS.push({
  id: 'sv_atelier', name: '지도 공방을 연다', icon: 'housing',
  desc: `내 이름을 건 지도 공방을 낸다. 은화 ${ATELIER_COST}. 공방에서 그리면 지도가 더 좋고, 도제를 들일 수 있다.`,
  available: (g) => free(g) && isSV(g) && skill(g) >= 35 && !S(g).atelier && g.player.money >= ATELIER_COST,
  run(g) {
    pay(g, ATELIER_COST);
    S(g).atelier = { place: here(g), since: mi(g), app: [] };
    logS(g, `${placeName(here(g))}에 지도 공방을 냈다.`); note(g, `${placeName(here(g))}에 지도 공방을 냈다.`);
    return '창이 큰 이층 방을 얻었다. 긴 탁자, 자와 컴퍼스, 물감 단지, 말아 둔 양피지. 문 위에 나침반 그림 간판을 걸었다.';
  },
});
ACTIONS.push({
  id: 'sv_master', name: '평생의 지도를 그린다', icon: 'scroll',
  desc: '그동안 잰 것과 들은 것을 모아 한 장의 큰 지도를 짓는다. 여섯 달이 넘게 걸린다. 다 그리면 이름이 남는다.',
  available: (g) => free(g) && atelierHere(g) && skill(g) >= 55 && S(g).drawn >= 6 && !S(g).masterworks.some((w) => w.mine) && g.player.fatigue < 85,
  run(g, rng) {
    const s = S(g);
    s.master ??= { start: mi(g), prog: 0 };
    s.master.prog += 1 + (s.atelier.app.length ? 0.5 : 0);
    tired(g, 14); const k = gainS(g, 0.8), i = gainStat(g, 'int', 0.3);
    if (s.master.prog < 6) return `${rng.pick(['해안선을 세 번 고쳐 그렸다. 바르카 앞바다의 모래톱이 자꾸 틀린다.', '산맥의 높이를 그늘로 칠했다. 천룡 산맥 하나에 보름이 갔다.', '선장들에게 들은 물길 이야기를 맞춰 보았다. 셋이 다 달랐다.', '귀퉁이에 바람의 얼굴 넷을 그려 넣었다. 도제가 북풍 얼굴이 나를 닮았다고 했다.'])} (${Math.floor(s.master.prog)}/6)${gains([up('측량 솜씨', k), up('지능', i)])}`;
    const name = `${g.player.name}의 대륙 지도`;
    s.master = null; s.masterworks.push({ name, y: g.date.year, by: g.player.name, mine: true });
    L(g).renown = (L(g).renown ?? 0) + 3;
    chron(g, `${J(name, '이/가')} 완성되다. 학자들과 선장들이 그 지도를 베끼러 몰려들다.`, 40);
    note(g, `${J(name, '을/를')} 완성했다.`); logS(g, `${J(name, '을/를')} 완성했다.`);
    return `마지막 선을 그었다. 탁자 위에 대륙이 누워 있다. 아는 길과 들은 길과 아무도 모르는 빈자리까지. 도제가 숨을 죽이고 들여다보았다. 이 지도는 내 이름으로 불릴 것이다.${gains([up('측량 솜씨', k)])}`;
  },
});

/* ---------- 경계 다툼의 증인 ---------- */
defineScene('sv_witness', {
  need: (g) => S(g).borders.length > 0,
  title: () => '경계 다툼',
  text: (g) => { const b = S(g).borders.at(-1); return `${g.date.year - b.y < 1 ? '얼마 전' : `${g.date.year - b.y}년 전`} 내가 그은 ${J(b.a, '과/와')} ${b.b}의 경계를 두고 법정이 열렸다. 측량한 사람으로 불려 왔다. ${b.shifted ? '그때 주머니를 받고 민 경계다. ' : ''}${b.a} 쪽 사람들이 앞줄에서 나를 본다.`; },
  choices: (g) => { const b = S(g).borders.at(-1); return [
    { label: b.shifted ? '돈을 받고 경계를 밀었다고 털어놓는다' : '내 장부대로 말한다', key: 'truth' },
    { label: `${b.a} 쪽에 서서 말한다`, key: 'side' },
    { label: '장부를 잃어버렸다고 한다', key: 'dodge' },
  ]; },
  resolve(g, rng, s, key) {
    const st = S(g), b = st.borders.at(-1); st.witness += 1;
    if (key === 'truth') {
      if (b.shifted) { deed(g, 'honest', 3, null); const f = pay(g, 15); b.shifted = false; return `"그때 주머니를 받았습니다." 법정이 술렁였다. 경계는 원래 자리로 돌아갔다. 벌금 은화 ${f}닢. 그날 밤 ${b.b} 쪽 늙은 농부가 문 앞에 감자 한 자루를 두고 갔다.`; }
      deed(g, 'honest', 2, null); return '장부를 펴고 숫자를 하나씩 읽었다. 재판관이 장부를 받아 들고 고개를 끄덕였다. 경계는 그대로다.';
    }
    if (key === 'side') { deed(g, 'honest', -3, null); earn(g, 10); return `${b.a} 쪽 말이 맞다고 했다. 재판관은 내 장부를 보지 않았다. 그날 저녁 집사가 은화 열 닢을 보냈다.`; }
    stress(g, 4); return '장부가 없다고 했다. 재판관은 한숨을 쉬고 다음 증인을 불렀다. 다툼은 다음 해까지 이어졌다.';
  },
});

/* ---------- 군용 지도 ---------- */
ACTIONS.push({
  id: 'sv_war', name: '군용 지도를 맡는다', icon: 'banner',
  desc: '전쟁 중인 나라의 군사령부가 전선의 지도를 맡긴다. 품삯은 크고, 그 지도는 비밀이다.',
  available: (g) => free(g) && isSV(g) && skill(g) >= 30 && atWar(g) && ['leocast', 'eisen', 'graubel'].includes(here(g)) && !S(g).maps.some((m) => m.kind === 'war' && g.date.year - m.y < 3),
  run(g, rng) {
    tired(g, 14);
    const m = addMap(g, 'war', `${placeName(here(g))} 전선`, quality(g, rng), { secret: true });
    const n = earn(g, 20 + skill(g) / 4), k = gainS(g, 1.5);
    deed(g, 'loyal', 2, null); logS(g, `${J(mapTitle(m), '을/를')} 그렸다.`);
    return `기병 둘의 호위를 받으며 전선을 따라 걸었다. 여울과 숲길, 성벽 아래 도랑 깊이까지 적었다. 원본은 사령부 궤짝에, 밑그림은 내 손에 남았다. 은화 ${n}닢. 밑그림은 태우라고 했다.${gains([up('측량 솜씨', k)])}`;
  },
});
ACTIONS.push({
  id: 'sv_burn', name: '군용 지도 밑그림을 태운다', icon: 'torch',
  desc: '손에 남은 군용 지도 밑그림을 불에 넣는다. 갖고 있으면 언젠가 누군가 찾아온다.',
  available: (g) => S(g).maps.some((m) => m.kind === 'war' && !m.sold),
  run(g) {
    const s = S(g); const left = s.maps.filter((m) => !(m.kind === 'war' && !m.sold)); s.maps = left; deed(g, 'loyal', 1, null);
    return '밑그림을 화로에 넣었다. 여울과 숲길이 한 줄씩 말려 들어가 재가 되었다.';
  },
});
defineScene('sv_theft', {
  need: (g) => S(g).maps.some((m) => m.kind === 'war' && !m.sold),
  title: () => '밤 손님',
  text: () => '공방 문을 닫으려는데 외투 깃을 세운 사내가 들어섰다. "전선 밑그림을 갖고 있다는 걸 압니다." 탁자에 금화가 놓였다. 창밖 골목에 그림자가 하나 더 있다.',
  choices: () => [{ label: '팔지 않는다고 하고 내보낸다', key: 'refuse' }, { label: '경비대를 부른다', key: 'report' }, { label: '금화를 받고 밑그림을 내준다', key: 'sell' }],
  resolve(g, rng, s, key) {
    const st = S(g), m = st.maps.find((x) => x.kind === 'war' && !x.sold);
    if (key === 'sell') { m.sold = true; m.to = 'spy'; earn(g, 60); deed(g, 'loyal', -6, null); deed(g, 'honest', -2, null); chron(g, '이웃 나라가 전선의 여울과 숲길을 다 아는 듯 움직인다는 말이 돈다.', 20); return '금화 무게만큼 밑그림이 가벼웠다. 사내는 고개만 까딱하고 사라졌다. 한 달 뒤, 전선 너머 적군이 아무도 모르는 여울로 강을 건넜다는 소식이 왔다.'; }
    if (key === 'report') { m.sold = true; m.to = 'burned'; deed(g, 'loyal', 3, null); return '호루라기를 불었다. 사내는 골목으로 달아났다. 이튿날 사령부 사람이 와서 밑그림을 가져가 내 앞에서 태웠다. 고맙다는 말은 없었다. 다만 다음 의뢰가 왔다.'; }
    if (rng.chance(0.35)) { m.sold = true; m.to = 'stolen'; st.lost += 1; return '사내를 내보냈다. 그날 밤 공방 자물쇠가 부서졌다. 밑그림만 없어졌다. 다른 것은 손도 대지 않았다.'; }
    deed(g, 'loyal', 1, null); return '"팔 것이 없소." 사내는 금화를 거두어 갔다. 그 뒤로 며칠 골목 끝에 같은 그림자가 서 있었다. 밑그림을 태워야겠다.';
  },
});
