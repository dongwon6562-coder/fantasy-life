// 주문으로 버는 일: 일거리 게시판 → 흥정 → 해냈는가 → 못 했으면 책임. 마법 가정교사, 마법 용병.
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat, circleOf } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, tired, stress, gains, up } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { activeAt } from '../nature/state.js';
import { J } from '../narrative/text.js';
import {
  M, mi, clamp, here, placeName, free, adult, BOARD, CITIES, TASKS, TASK_IDS, spellFor, combatSpells, canWork, logM, fameAt, addFame, successP,
} from './core.js';

export const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const earn = (g, n) => { n = Math.max(0, Math.round(n)); g.player.money += n; M(g).earned += n; return n; };
const price = (g, tid) => Math.max(1, Math.round(TASKS[tid].pay * (BOARD[here(g)] ?? 0.8) * (1 + fameAt(g) / 100) * (1 + 0.15 * (g.magic?.certified ?? 0))));
const drought = (g) => activeAt(g, here(g)).some((d) => d.kind === 'drought');

/* ---------- 게시판에 붙은 일 ---------- */
// 이 고장, 이 달에 나올 만한 일. 맞는 주문이 있는 일 + 맞는 주문은 없지만 절박한 일 하나
export function boardTasks(g) {
  const pl = here(g), s = M(g);
  const fits = TASK_IDS.filter((id) => {
    const t = TASKS[id];
    if (t.where && !t.where.includes(pl)) return false;
    if (t.months && !t.months.includes(g.date.month)) return false;
    if (t.drought && !drought(g)) return false;
    if (t.ward && (s.wards[pl] ?? 60) >= 45) return false;
    return true;
  });
  const mine = fits.filter((id) => spellFor(g, id));
  const other = fits.filter((id) => !spellFor(g, id) && TASKS[id].diff >= 2);
  // 달마다 다른 셋 (고정된 순서를 달로 돌린다)
  const k = mi(g) % Math.max(1, mine.length);
  const pick = [...mine.slice(k), ...mine.slice(0, k)].slice(0, 3);
  if (other.length) pick.push(other[mi(g) % other.length]);
  return pick;
}
ACTIONS.push({
  id: 'mj_board', name: '마법사 일거리 게시판을 본다', icon: 'scroll',
  desc: '여관 문간과 길드 벽에 붙은 마법 일거리를 본다. 서클이 낮아도 할 수 있는 일이 있다.',
  available: (g) => free(g) && adult(g) && canWork(g) && !!BOARD[here(g)] && mi(g) - M(g).boardAt >= 1 && !sceneQueued(g, 'mj_board') && !sceneQueued(g, 'mj_job') && boardTasks(g).length > 0,
  run(g) { M(g).boardAt = mi(g); queueScene(g, 'mj_board', {}, { first: true }); return '여관 문간 게시판 앞에 섰다. 못 박힌 쪽지들이 바람에 팔랑거렸다.'; },
});
defineScene('mj_board', {
  title: () => '일거리 게시판',
  text: (g) => `"마법사 구함." 쪽지마다 서툰 글씨가 적혀 있다.${drought(g) ? ' 가뭄 탓인지 비 이야기가 많다.' : ''}${fameAt(g) >= 30 ? ' 내 이름을 콕 집어 적은 쪽지도 있다.' : ''}`,
  choices: (g) => [
    ...boardTasks(g).map((id) => { const sp = spellFor(g, id); return { label: `${TASKS[id].name} (은화 ${price(g, id)}쯤${sp ? `, ${sp.name}` : ', 맞는 주문이 없다'})`, key: id }; }),
    { label: '오늘은 그냥 간다', key: 'leave' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'leave') return '쪽지 몇 장을 눈에 담고 돌아섰다.';
    queueScene(g, 'mj_job', { task: key }, { first: true });
    return `${TASKS[key].who}에 찾아가기로 했다. 쪽지를 떼어 품에 넣었다.`;
  },
});

/* ---------- 흥정과 일 ---------- */
defineScene('mj_job', {
  need: (g, s) => !!TASKS[s.task],
  title: (g, s) => TASKS[s.task].name,
  text: (g, s) => { const t = TASKS[s.task], sp = spellFor(g, s.task); return `${t.who}. 값은 은화 ${price(g, s.task)}닢쯤이 적당하다. ${sp ? `${J(sp.name, '으로/로')} 해 볼 만하다.` : '솔직히 이 일에 맞는 주문은 모른다. 그래도 사람들은 마법사라면 다 하는 줄 안다.'}`; },
  choices: (g, s) => [
    { label: '싸게 해 준다', key: 'low' },
    { label: '제값을 부른다', key: 'fair' },
    { label: '값을 올려 부른다', key: 'high' },
    { label: '선금을 받고 시작한다', key: 'upfront' },
    ...(spellFor(g, s.task) ? [] : [{ label: '못 하는 일이라고 말하고 물러난다', key: 'decline' }]),
  ],
  resolve(g, rng, s, key) {
    const st = M(g), t = TASKS[s.task], sp = spellFor(g, s.task);
    if (key === 'decline') { deed(g, 'honest', 1, null); return '"이건 내 주문으로는 안 됩니다." 촌장은 실망했지만, 다음에 다른 일로 부르겠다고 했다.'; }
    const base = price(g, s.task);
    let want = { low: 0.7, fair: 1, high: 1.5, upfront: 1 }[key] * base;
    if (key === 'high' && fameAt(g) < 30 && rng.chance(0.5)) { addFame(g, -1); return `값을 듣더니 ${t.who.split(' ').at(-1)} 쪽에서 고개를 저었다. "그 돈이면 협회 마법사를 부르겠소." 문이 닫혔다.`; }
    tired(g, 10 + t.diff * 3); st.jobs += 1;
    const k = gainSkill(g, 'magic', 0.4 + t.diff * 0.2, 'int');
    if (key === 'low') deed(g, 'kind', 1, null);
    const ok = rng.chance(sp ? successP(g, s.task, sp) : 0.06);
    if (ok) {
      const n = earn(g, want); addFame(g, 2 + t.diff);
      if (t.ward) st.wards[here(g)] = clamp((st.wards[here(g)] ?? 60) + 40, 0, 100);
      if (s.task === 'rain' || t.diff >= 3) chron(g, `${placeName(here(g))}에서 마법사 ${J(g.player.name, '이/가')} ${t.name}에 성공했다는 말이 돌다.`, 6);
      return `${t.ok} ${key === 'upfront' ? '선금에 나머지까지' : '값으로'} 은화 ${n}닢.${!sp ? ' 솔직히 내 마법 덕인지 하늘 덕인지는 모르겠다.' : ''}${gains([up('마법', k)])}`;
    }
    st.fails += 1;
    const paid = key === 'upfront' ? earn(g, want) : 0;
    queueScene(g, 'mj_fail', { task: s.task, paid, nospell: !sp }, { first: true });
    return `${t.bad}${gains([up('마법', k)])}`;
  },
});
defineScene('mj_fail', {
  need: (g, s) => !!TASKS[s.task],
  title: () => '못 해낸 일',
  text: (g, s) => `${TASKS[s.task].who} 사람들이 모여 나를 본다.${s.paid ? ` 선금 은화 ${s.paid}닢이 내 주머니에 있다.` : ' 아직 받은 돈은 없다.'}${(g.mana?.tide ?? 0) <= -40 ? ' 요즘 마나가 썰물이라 주문이 잘 듣지 않는 것도 사실이다.' : ''}`,
  choices: (g, s) => [
    { label: s.paid ? '선금을 돌려준다' : '값은 받지 않겠다고 한다', key: 'refund' },
    { label: '사흘만 더 달라고 한다', key: 'again' },
    { label: '하늘과 마나 탓을 한다', key: 'blame' },
    ...(s.paid ? [{ label: '밤에 고장을 뜬다', key: 'flee' }] : []),
  ],
  resolve(g, rng, s, key) {
    const st = M(g), t = TASKS[s.task];
    if (key === 'refund') { pay(g, s.paid); st.refunds += 1; deed(g, 'honest', 2, null); addFame(g, s.paid ? 0 : -1); return s.paid ? `선금 은화 ${s.paid}닢을 그대로 돌려주었다. 사람들은 아쉬워했지만, 사기꾼 소리는 하지 않았다.` : '값은 받지 않겠다고 했다. 촌장이 그래도 저녁은 먹고 가라며 나를 붙잡았다.'; }
    if (key === 'again') {
      tired(g, 12); stress(g, 4);
      const sp = spellFor(g, s.task);
      if (rng.chance(sp ? successP(g, s.task, sp) * 0.8 : 0.04)) { const n = s.paid ? 0 : earn(g, price(g, s.task) * 0.8); addFame(g, 1); if (t.ward) st.wards[here(g)] = clamp((st.wards[here(g)] ?? 60) + 35, 0, 100); return `사흘 밤을 더 매달렸다. 끝내 해냈다. 몸은 녹초가 되었다.${n ? ` 은화 ${n}닢.` : ''}`; }
      if (s.paid) pay(g, s.paid);
      addFame(g, -3); return `사흘을 더 매달렸지만 안 되었다.${s.paid ? ' 선금을 돌려주었다.' : ''} 돌아오는 길에 아이들이 '헛마법사'라고 놀렸다.`;
    }
    if (key === 'blame') {
      const true_ = (g.mana?.tide ?? 0) <= -40;
      if (!true_) deed(g, 'honest', -1, null);
      addFame(g, true_ ? -1 : -3);
      return true_ ? '"마나가 말랐소. 탑의 마법사들도 요즘은 헛손질이오." 사실이었다. 반쯤은 믿어 주었다.' : '"오늘은 하늘이 막았소." 촌장은 대꾸하지 않았다. 다음 달 게시판에 내 이름 위로 줄이 그어져 있었다.';
    }
    deed(g, 'honest', -3, null); addFame(g, -15); st.refunds = st.refunds ?? 0;
    logM(g, `${placeName(here(g))}에서 선금을 들고 밤에 떴다.`);
    return '짐을 싸서 닭이 울기 전에 고장을 빠져나왔다. 선금은 주머니에 있다. 이 고장 게시판에 다시 내 이름이 붙는 일은 없을 것이다.';
  },
});

/* ---------- 마법 가정교사 ---------- */
const PUPILS = {
  noble: { name: '남작 댁 막내 도련님', fee: 6, text: '남작 부인이 아들을 앞에 세웠다. 아이는 하품을 했다. "우리 애가 마력이 있다고들 하던데요." 정말인지는 가르쳐 봐야 안다.' },
  merchant: { name: '포목상의 딸', fee: 4, text: '포목상이 딸을 데려왔다. 소녀는 손끝으로 촛불을 흔들어 보였다. 마력은 진짜다. 아버지는 딸이 장부 대신 마법을 배우는 게 탐탁지 않은 눈치다.' },
  poor: { name: '빈민가의 사내아이', fee: 0, text: '맨발의 아이가 문간에 서 있었다. 개울물을 얼렸다가 동네에서 쫓겨났다고 한다. 줄 돈은 없다고 했다.' },
};
ACTIONS.push({
  id: 'mj_tutor', name: '마법 가정교사 자리를 구한다', icon: 'book',
  desc: '마력이 있다는 아이를 맡아 가르친다. 2서클이 넘어야 부모들이 믿고 맡긴다.',
  available: (g) => free(g) && adult(g) && circleOf(g) >= 2 && CITIES.includes(here(g)) && !M(g).pupil && mi(g) - M(g).pupilAt >= 6 && !sceneQueued(g, 'mj_pupil'),
  run(g, rng) { M(g).pupilAt = mi(g); queueScene(g, 'mj_pupil', { who: rng.pick(['noble', 'merchant', 'poor']), talent: rng.int(0, 100) }, { first: true }); return '여관 주인에게 가정교사 자리를 묻자 저녁에 손님이 찾아왔다.'; },
});
defineScene('mj_pupil', {
  need: (g, s) => !!PUPILS[s.who] && !M(g).pupil,
  title: (g, s) => PUPILS[s.who].name,
  text: (g, s) => PUPILS[s.who].text,
  choices: (g, s) => [{ label: s.who === 'poor' ? '거저 가르친다' : `맡는다 (달마다 은화 ${PUPILS[s.who].fee})`, key: 'take' }, { label: '사양한다', key: 'no' }],
  resolve(g, rng, s, key) {
    if (key === 'no') return '정중히 사양했다. 손님은 다른 마법사를 찾아보겠다며 돌아갔다.';
    const p = PUPILS[s.who];
    M(g).pupil = { name: p.name, kind: s.who, place: here(g), since: mi(g), fee: p.fee, prog: 0, talent: s.talent };
    if (s.who === 'poor') deed(g, 'kind', 2, null);
    logM(g, `${J(p.name, '을/를')} 제자로 받아 마법을 가르치기 시작했다.`);
    return `${p.name}의 마법 수업이 시작되었다. 첫날은 촛불 하나를 놓고 숨 쉬는 법만 가르쳤다.`;
  },
});
ACTIONS.push({
  id: 'mj_teach', name: '마법 수업을 한다', icon: 'candle',
  desc: '맡은 아이에게 마력 다루는 법을 가르친다. 여섯 번이면 그 아이가 무엇이 될지 보인다.',
  available: (g) => free(g) && !!M(g).pupil && M(g).pupil.place === here(g) && !sceneQueued(g, 'mj_pupil_end'),
  run(g, rng) {
    const p = M(g).pupil; p.prog += 1; tired(g, 6);
    const k = gainSkill(g, 'magic', 0.3, 'int'), c = gainStat(g, 'cha', 0.2);
    if (p.prog >= 6) queueScene(g, 'mj_pupil_end', {}, { first: true });
    const good = p.talent >= 50;
    return `${rng.pick(good ? [`${J(p.name, '이/가')} 처음으로 촛불을 손대지 않고 껐다. 둘 다 한참 웃었다.`, `${J(p.name, '이/가')} 마력의 흐름을 말로 설명했다. 내가 처음 배울 때보다 빨랐다.`] : [`${J(p.name, '은/는')} 오늘도 촛불만 노려보다 끝났다. 촛불은 꿈쩍도 하지 않았다.`, `${J(p.name, '이/가')} 주문 외우는 대신 창밖 새를 보았다. 나도 잠깐 같이 보았다.`])}${gains([up('마법', k), up('매력', c)])}`;
  },
});
defineScene('mj_pupil_end', {
  need: (g) => !!M(g).pupil,
  title: (g) => M(g).pupil.name,
  text: (g) => { const p = M(g).pupil; return p.talent >= 50 ? `여섯 달. ${J(p.name, '은/는')} 이제 손끝에서 작은 불을 꺼내고 넣을 줄 안다. 마탑에 보낼 만한 재목이다.` : `여섯 달. ${J(p.name, '은/는')} 촛불 하나 흔들지 못한다. 마력이 아주 없지는 않지만, 마법사가 될 아이는 아니다.${p.fee ? ' 부모는 아직 모른다. 다달이 받는 은화가 아쉽기도 하다.' : ''}`; },
  choices: (g) => { const p = M(g).pupil; return p.talent >= 50
    ? [{ label: '마탑에 추천서를 써 준다', key: 'tower' }, { label: '내 제자로 곁에 둔다', key: 'keep' }]
    : [{ label: '부모에게 솔직히 말한다', key: 'truth' }, ...(p.fee ? [{ label: '조금만 더 하면 된다고 둘러댄다', key: 'string' }] : [{ label: '글이라도 가르쳐 보낸다', key: 'letters' }])]; },
  resolve(g, rng, s, key) {
    const st = M(g), p = st.pupil;
    st.past.push({ name: p.name, y: g.date.year, how: key });
    if (key === 'string') { p.prog = 3; deed(g, 'honest', -2, null); return '"재능은 늦게 피기도 합니다." 부모는 다음 달 수업료를 미리 냈다. 아이는 창밖만 보았다.'; }
    st.pupil = null;
    if (key === 'tower') { deed(g, 'kind', 1, null); chron(g, `${J(p.name, '이/가')} 마법사 ${g.player.name}의 추천서를 들고 마탑 문을 두드리다.`, 6); return `추천서에 내 이름을 적었다. ${J(p.name, '은/는')} 봇짐 하나를 메고 마탑으로 떠났다. 몇 번이나 뒤돌아보았다.`; }
    if (key === 'keep') { logM(g, `${J(p.name, '이/가')} 내 곁에 남았다.`); return `${J(p.name, '은/는')} 내 짐을 들고 따라다니기로 했다. 언젠가 내 주문을 물려받을지도 모른다.`; }
    if (key === 'truth') { deed(g, 'honest', 2, null); return '부모에게 있는 그대로 말했다. 부인은 얼굴이 하얘졌다가, 그래도 거짓말하지 않아 고맙다고 했다. 아이는 오히려 홀가분해 보였다.'; }
    deed(g, 'kind', 1, null); return '마법 대신 글을 가르쳤다. 아이는 그건 곧잘 했다. 떠나는 날 자기 이름을 또박또박 써서 보여 주었다.';
  },
});

/* ---------- 마법 용병 ---------- */
const MERC = {
  caravan: { title: '상단 호위', text: '고개 너머로 가는 상단이 마법사를 찾는다. 지난달 산적에게 짐수레 둘을 잃었다고 한다.', pay: 18, risk: 0.3 },
  nest: { title: '마물 둥지', text: '마을 뒤 동굴에 마물이 둥지를 틀었다. 촌장회가 모은 돈을 탁자에 쏟았다. 검사 둘이 함께 간다.', pay: 24, risk: 0.4 },
  feud: { title: '영주의 싸움', text: '이웃 영주와 물방앗간을 두고 싸우는 기사가 마법사를 산다. 사람을 상대로 주문을 쓰는 일이다.', pay: 30, risk: 0.35 },
};
ACTIONS.push({
  id: 'mj_merc', name: '마법 용병 일을 찾는다', icon: 'sword',
  desc: '싸움에 쓰는 주문을 파는 일. 품삯이 크고, 다칠 수 있다.',
  available: (g) => free(g) && adult(g) && circleOf(g) >= 2 && combatSpells(g).length > 0 && !!BOARD[here(g)] && mi(g) - M(g).mercAt >= 4 && !sceneQueued(g, 'mj_merc'),
  run(g, rng) { M(g).mercAt = mi(g); queueScene(g, 'mj_merc', { who: rng.pick(['caravan', 'nest', 'feud']) }, { first: true }); return '용병 길드 구석 자리에 앉아 지팡이를 탁자에 기대 두었다. 금방 사람이 왔다.'; },
});
defineScene('mj_merc', {
  need: (g, s) => !!MERC[s.who] && combatSpells(g).length > 0,
  title: (g, s) => MERC[s.who].title,
  text: (g, s) => `${MERC[s.who].text} 내가 쓸 수 있는 가장 센 주문은 ${combatSpells(g).sort((a, b) => b.circle - a.circle)[0].name}.`,
  choices: (g, s) => [{ label: '맡는다', key: 'take' }, { label: '값을 더 부른다', key: 'more' }, ...(s.who === 'feud' ? [{ label: '사람을 상대로는 주문을 쓰지 않는다', key: 'refuse' }] : [{ label: '사양한다', key: 'refuse' }])],
  resolve(g, rng, s, key) {
    const st = M(g), m = MERC[s.who];
    if (key === 'refuse') { if (s.who === 'feud') deed(g, 'kind', 1, null); return s.who === 'feud' ? '"내 불은 사람을 태우려고 배운 게 아니오." 기사는 코웃음을 치고 다른 마법사를 찾으러 갔다.' : '사양했다. 길드 주인이 다음에 또 오라고 했다.'; }
    const best = combatSpells(g).sort((a, b) => b.circle - a.circle)[0];
    const mul = key === 'more' ? (rng.chance(0.6) ? 1.4 : 0) : 1;
    if (!mul) return '값을 올려 부르자 상대가 웃으며 다른 탁자로 갔다. 그 자리는 3서클짜리가 가져갔다.';
    tired(g, 18); st.merc += 1;
    const k = gainSkill(g, 'magic', 0.8, 'int');
    if (s.who === 'feud') deed(g, 'kind', -1, null);
    if (rng.chance(m.risk - best.circle * 0.05)) { g.player.injuries.push({ name: s.who === 'nest' ? '마물 발톱에 긁힌 옆구리' : '화살에 스친 팔', months: 2 }); const n = earn(g, m.pay * mul * 0.6); return `${s.who === 'nest' ? `${J(best.name, '을/를')} 동굴 안에 쏟아붓고 나서야 둥지가 조용해졌다. 그사이 나도 다쳤다.` : `${J(best.name, '으로/로')} 길을 열었지만 나도 다쳤다.`} 반값만 받았다. 은화 ${n}닢.${gains([up('마법', k)])}`; }
    const n = earn(g, m.pay * mul); addFame(g, 3); deed(g, 'brave', 1, null);
    return `${{ caravan: '고개 마루에서 산적들이 튀어나왔다. 첫 주문에 맨 앞의 말이 놀라 날뛰었고, 나머지는 흩어졌다.', nest: '동굴 입구에서 주문을 세 번 쏟았다. 검사들이 들어가 남은 것을 정리했다.', feud: '방앗간 앞에서 주문 한 번에 상대 기사들의 말이 흩어졌다. 피는 많이 흐르지 않았다.' }[s.who]} 은화 ${n}닢.${gains([up('마법', k)])}`;
  },
});
