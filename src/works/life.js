// 큰 공사에 끼는 일: 공사장에서 돌을 나르고(품삯이나 부역), 돈을 대서 멈춘 공사를 다시 살리거나 아예 내가 공사를 일으키고,
// 솜씨가 붙으면 감독이 된다. 감독에게는 석공 길드와의 실랑이, 빼돌리라는 유혹, 무너진 비계 앞의 책임이 따라온다.
// 다 지은 날에는 낙성식이 열리고, 돈을 많이 댄 사람의 이름은 머릿돌에 새겨져 대를 넘어 남는다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { gainStat, gainSkill, me } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, tired, stress, spend, canSpend, up, gains } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { deed } from '../repute/index.js';
import { WS, WORKS, WORK_IDS, PATRONS, clamp, mi, wlog, rate, pct, progressWord, fundsWord, placeName } from './state.js';
import { startWork, completeWork, worksRng } from './world.js';

const here = (g) => L(g).place;
export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const wk = (g, id) => WS(g).w[id];
const skill = (g) => g.player.skills.building ?? 0;
const st = (g, k) => g.player.stats[k] ?? 0;
const learn = (g, base) => (g.player.skills.building != null ? gainSkill(g, 'building', base, 'str') : 0);
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
// 이 고장에서 짓고 있는 공사 / 돈을 댈 수 있는 공사
const buildingHere = (g) => WORK_IDS.find((id) => WORKS[id].place === here(g) && wk(g, id).stage === 'building') ?? null;
const fundable = (g) => WORK_IDS.filter((id) => WORKS[id].place === here(g) && (['building', 'stalled'].includes(wk(g, id).stage) || (wk(g, id).stage === 'idle' && (g.realm?.era ?? 0) >= WORKS[id].era)));
const carveAt = (id) => Math.round(WORKS[id].cost * 0.08);
const commission = (id) => Math.round(WORKS[id].cost * 0.2);

/* ---------- 공사장에서 일한다 ---------- */
ACTIONS.push({
  id: 'works_labor', name: '공사장에서 일한다', icon: 'hammer',
  desc: '이 고장의 큰 공사장에서 돌을 나르고 쌓는다. 품삯 공사면 품삯을, 부역이면 밥 한 그릇을 받는다. 목공과 석공 솜씨가 붙는다. 떨어지면 다친다.',
  available: (g) => free(g) && !!buildingHere(g) && WS(g).me.overseer !== buildingHere(g),
  run(g, rng) {
    const id = buildingHere(g), w = wk(g, id), d = WORKS[id], S = WS(g);
    if (w.strike > 0) {
      deed(g, 'loyal', -2, null, here(g));
      return `석공들이 손을 놓은 공사장에 혼자 들어갔다. 길드 사람들이 멀찍이서 이름을 물었다. 일은 거의 못 했다.`;
    }
    const pay = w.labor === 'corvee' ? 1 : Math.round(3 + skill(g) / 15 + st(g, 'str') / 30);
    g.player.money += pay;
    w.progress += 0.15 + skill(g) / 400;
    w.myMonths += 1; S.me.months += 1;
    const sk = learn(g, 1.2), sg = gainStat(g, 'str', 0.6);
    tired(g, 10);
    let hurt = '';
    if (rng.chance(Math.max(0.006, 0.03 - skill(g) / 3000))) { injure(g, rng.pick(['떨어진 돌에 다친 발', '비계에서 떨어져 삔 허리', '도르래 줄에 쓸린 손']), rng.int(1, 3)); hurt = ' 저녁 무렵 발밑이 꺼졌다. 다쳤다.'; }
    if (!w.offered && w.myMonths >= 10 && skill(g) >= 30 && !S.me.overseer && !sceneQueued(g, 'works_overseer')) { w.offered = true; queueScene(g, 'works_overseer', { id }); }
    const line = rng.pick(w.labor === 'corvee'
      ? [`부역꾼들 틈에서 하루 종일 돌을 날랐다. 감독관의 채찍 소리가 해 질 녘까지 이어졌다.`, `${d.kind} 터에서 흙을 퍼 날랐다. 받은 것은 보리죽 한 그릇이다.`, `옆 고을에서 끌려온 늙은이가 돌을 놓쳤다. 대신 들어 주었다.`]
      : [`석공들 밑에서 돌을 다듬었다. 끌 자국이 조금씩 고르게 된다.`, `도르래로 돌을 끌어 올렸다. ${progressWord(pct(w, id))}.`, `비계 위에서 하루를 보냈다. 내려다보니 ${placeName(d.place)} 지붕들이 발밑에 있다.`, `석공 우두머리가 내 줄눈을 보고 고개를 끄덕였다.`]);
    return `${line}${pay > 1 ? ` 품삯 은화 ${pay}닢.` : ''}${hurt}${gains([up('목공과 석공', sk), up('힘', sg)])}`;
  },
});

/* ---------- 감독 제안 ---------- */
defineScene('works_overseer', {
  title: () => '감독 자리',
  text: (g, s) => `${workName(s.id)} 공사장의 늙은 감독이 나를 불렀다. "자네 쌓은 줄은 비가 와도 안 샌다더군. 내 눈이 예전 같지 않아. 저쪽 성벽 한 면을 맡아 보겠나?" 감독은 품삯이 많지만, 무너지면 이름이 남는다.`,
  choices: (g, s) => (free(g) && here(g) === WORKS[s.id]?.place && wk(g, s.id).stage === 'building' && !WS(g).me.overseer
    ? [{ label: '맡는다', key: 'yes' }, { label: '아직은 돌만 나르겠다', key: 'no' }] : []),
  resolve(g, rng, s, key) {
    const w = wk(g, s.id), S = WS(g);
    if (key !== 'yes') return '고개를 저었다. 늙은 감독은 아쉬운 눈치였다.';
    if (w.stage !== 'building' || S.me.overseer) return '그사이 사정이 바뀌어 감독 자리는 다른 사람에게 갔다.';
    S.me.overseer = s.id; w.overseer = true; S.me.awayM = 0;
    note(g, `${workName(s.id)} 공사의 감독이 되었다.`);
    wlog(g, `${workName(s.id)}: 내가 감독을 맡았다.`);
    return `감독의 표시인 놋쇠 자를 받았다. 이제 일꾼 쉰 명이 내 말을 듣는다. 이 고장에서 "공사를 감독한다".`;
  },
});
const workName = (id) => WORKS[id]?.name ?? '큰 공사';

/* ---------- 공사를 감독한다 ---------- */
ACTIONS.push({
  id: 'works_oversee', name: '공사를 감독한다', icon: 'hammer',
  desc: '맡은 공사장을 돌며 일꾼을 부리고 줄과 수평을 본다. 감독 품삯이 나오고, 공사가 빨라진다.',
  available: (g) => { const id = WS(g).me.overseer; return free(g) && !!id && here(g) === WORKS[id]?.place && wk(g, id).stage === 'building'; },
  run(g, rng) {
    const S = WS(g), id = S.me.overseer, w = wk(g, id);
    S.me.awayM = 0;
    if (w.strike > 0) {
      if (!sceneQueued(g, 'works_guild')) queueScene(g, 'works_guild', { id }, { first: true });
      return '석공들이 연장을 내려놓고 공사장 앞에 앉아 있다. 길드 우두머리가 나를 기다린다.';
    }
    const pay = Math.round(8 + skill(g) / 6);
    g.player.money += pay;
    w.progress += 0.4 + skill(g) / 150;
    S.me.months += 1;
    const sk = learn(g, 1.0), sw = gainStat(g, 'wil', 0.4);
    tired(g, 7); stress(g, 3);
    if (rng.chance(0.12) && !sceneQueued(g, 'works_skim')) queueScene(g, 'works_skim', { id });
    return `${rng.pick(['줄을 띄우고 수평을 봤다. 어긋난 단 하나를 헐고 다시 쌓게 했다.', '석재 수레를 세어 보고 장부와 맞춰 봤다.', '아침에 일꾼을 나누고, 저녁에 쌓은 단을 셌다.', '석공 우두머리와 아치 이맛돌 놓을 날을 정했다.'])} ${progressWord(pct(w, id))}. 감독 품삯 은화 ${pay}닢.${gains([up('목공과 석공', sk), up('의지', sw)])}`;
  },
});

/* ---------- 석공 길드가 손을 놓았다 ---------- */
defineScene('works_guild', {
  title: () => '석공 길드',
  text: (g, s) => `석공 길드 우두머리가 팔짱을 끼고 섰다. "품삯을 열에 하나 더 올려 주시오. 지난달에 둘이 떨어져 죽었소. 과부들에게 줄 돈도." ${wk(g, s.id).labor === 'corvee' ? '' : `공사 돈주머니는 ${fundsWord(wk(g, s.id), s.id)}.`}`,
  choices: (g, s) => {
    const w = wk(g, s.id);
    if (!free(g) || WS(g).me.overseer !== s.id || w.stage !== 'building' || w.strike <= 0) return [];
    return [
      { label: '공사 돈에서 품삯을 올려 준다', key: 'raise' },
      ...(canSpend(g, 40) ? [{ label: '내 돈으로 과부들 몫을 낸다 (은화 40닢)', key: 'widows' }] : []),
      { label: '우두머리와 술을 마시며 달랜다', key: 'drink' },
      { label: '버틴다. 부역꾼을 대신 쓰겠다', key: 'break' },
    ];
  },
  resolve(g, rng, s, key) {
    const w = wk(g, s.id);
    if (w.stage !== 'building' || w.strike <= 0) return '그사이 석공들은 이미 일터로 돌아와 있었다.';
    if (key === 'raise') { w.funds = Math.max(0, w.funds - rate(s.id, w) * 4); w.strike = 0; return '장부에서 품삯 줄을 고쳐 적었다. 석공들이 연장을 들었다. 돈주머니는 그만큼 일찍 빌 것이다.'; }
    if (key === 'widows') { if (!spend(g, 40)) return '돈이 모자랐다.'; w.strike = 0; deed(g, 'kind', 3, `${J(g.player.name, '이/가')} 죽은 석공의 과부들에게 제 돈을 내놓았다더라`, here(g)); return '은화 주머니를 우두머리 손에 쥐여 주었다. 그는 한참 주머니를 보다가 고개를 끄덕였다. 내일부터 다시 쌓는다.'; }
    if (key === 'drink') {
      if (check(rng, st(g, 'cha') + skill(g) / 2, 55)) { w.strike = 0; return '새벽까지 마셨다. 우두머리는 젊을 때 대성당 첨탑에서 떨어질 뻔한 이야기를 세 번 했다. 아침에 석공들이 나와 있었다.'; }
      stress(g, 6); return '술값만 나갔다. 우두머리는 취해서도 품삯 이야기만 했다.';
    }
    w.strike = Math.max(0, w.strike - 1); w.progress = Math.max(0, w.progress - 2); deed(g, 'kind', -2, null, here(g));
    return '석공 대신 부역꾼을 세웠다. 줄이 삐뚤고 쌓은 단이 기운다. 석공들은 나를 오래 기억할 것이다.';
  },
});

/* ---------- 빼돌리라는 유혹 ---------- */
defineScene('works_skim', {
  title: () => '석재 장부',
  text: () => '석재 상인이 장부를 들고 와 목소리를 낮췄다. "모래를 조금 더 섞은 회반죽, 한 치 얇은 돌. 아무도 모릅니다. 차액은 반씩." 그의 소매에서 은화 소리가 났다.',
  choices: (g, s) => (free(g) && WS(g).me.overseer === s.id && wk(g, s.id).stage === 'building'
    ? [{ label: '돌려보낸다', key: 'no' }, { label: '조금만 떼어 먹는다', key: 'some' }, { label: '크게 한몫 챙긴다', key: 'much' }, { label: '상인을 고발한다', key: 'report' }] : []),
  resolve(g, rng, s, key) {
    const w = wk(g, s.id), S = WS(g);
    if (key === 'no') return '장부를 덮어 돌려주었다. 상인은 어깨를 으쓱하고 다른 공사장으로 갔다.';
    if (key === 'report') { deed(g, 'honest', 4, `${J(g.player.name, '이/가')} 석재 상인의 뒷돈을 고발했다더라`, here(g)); w.funds += rate(s.id, w) * 2; return '상인은 끌려가고 석재값이 제값으로 돌아왔다. 공사 돈이 조금 남는다. 상인의 친구들은 나를 노려본다.'; }
    const amt = key === 'much' ? rng.int(60, 120) : rng.int(15, 30);
    g.player.money += amt; w.skim += amt * 6; S.me.skimmed += amt;
    w.funds = Math.max(0, w.funds - amt);
    if (rng.chance(key === 'much' ? 0.3 : 0.08)) {
      S.me.overseer = null; w.overseer = false;
      deed(g, 'honest', -8, `${J(g.player.name, '이/가')} 공사 돈을 빼돌리다 쫓겨났다더라`, here(g));
      note(g, `${workName(s.id)} 감독 자리에서 쫓겨났다. 빼돌린 것이 들켰다.`);
      return `은화 ${amt}닢이 주머니에 들어왔다. 그리고 한 달 뒤 회계 사제가 장부를 넘기다 손을 멈췄다. 놋쇠 자를 빼앗기고 감독 자리에서 쫓겨났다.`;
    }
    return `은화 ${amt}닢이 주머니에 들어왔다. 그 대신 성벽 어딘가에 얇은 돌이 들어갔다. 언젠가는 그 자리가 먼저 갈라질 것이다.`;
  },
});

/* ---------- 비계가 무너졌다 ---------- */
defineScene('works_fall', {
  title: () => '무너진 비계',
  text: (g, s) => `${workName(s.id)} 공사장 비계가 무너졌다. 일꾼 ${s.dead}명이 깔렸다. 먼지 속에서 누군가 이름을 부르며 돌을 들어낸다.${WS(g).me.overseer === s.id ? ' 감독인 나를 보는 눈들이 있다.' : ''}`,
  choices: (g, s) => (free(g) && here(g) === WORKS[s.id]?.place
    ? [{ label: '돌을 들어내고 사람을 꺼낸다', key: 'dig' }, { label: '죽은 이들 집에 돈을 보낸다 (은화 30닢)', key: 'pay', show: canSpend(g, 30) }, ...(WS(g).me.overseer === s.id ? [{ label: '감독 자리를 내놓는다', key: 'quit' }] : []), { label: '물러선다', key: 'leave' }].filter((c) => c.show !== false) : []),
  resolve(g, rng, s, key) {
    const S = WS(g), w = wk(g, s.id);
    if (key === 'dig') { tired(g, 15); const sg = gainStat(g, 'str', 0.8); deed(g, 'brave', 3, null, here(g)); if (rng.chance(0.15)) injure(g, '무너진 돌에 찧은 어깨', 2); return `해가 질 때까지 돌을 들어냈다. 둘을 산 채로 꺼냈다.${gains([up('힘', sg)])}`; }
    if (key === 'pay') { if (!spend(g, 30)) return '돈이 모자랐다.'; deed(g, 'kind', 4, `${J(g.player.name, '이/가')} 깔려 죽은 일꾼들 집에 돈을 보냈다더라`, here(g)); return '은화를 나눠 집집마다 보냈다. 한 과부가 문 앞에서 돈을 받지 않고 울기만 했다.'; }
    if (key === 'quit') { if (S.me.overseer === s.id) { S.me.overseer = null; w.overseer = false; } note(g, `${workName(s.id)} 감독 자리를 내놓았다.`); return '놋쇠 자를 탁자 위에 내려놓았다. 아무도 말리지 않았다.'; }
    return '한 발 물러섰다. 그날 밤 잠이 오지 않았다.';
  },
});

/* ---------- 공사에 돈을 댄다 ---------- */
ACTIONS.push({
  id: 'works_fund', name: '공사에 돈을 댄다', icon: 'coin',
  desc: '이 고장의 큰 공사에 돈을 낸다. 멈춘 공사를 다시 살릴 수도, 아무도 손대지 않은 공사를 내가 일으킬 수도 있다. 많이 내면 머릿돌에 이름이 새겨진다.',
  available: (g) => free(g) && fundable(g).length > 0 && canSpend(g, 30) && !sceneQueued(g, 'works_fund'),
  run(g) { queueScene(g, 'works_fund', { place: here(g) }, { first: true }); return '공사 회계를 찾아갔다.'; },
});
defineScene('works_fund', {
  title: () => '공사 돈',
  text: (g, s) => fundable(g).map((id) => {
    const w = wk(g, id), d = WORKS[id];
    if (w.stage === 'idle') return `${d.name}: 아직 아무도 손대지 않았다.${w.progress > 0 ? ' 예전에 짓다 버린 돌무더기가 있다.' : ''} ${d.desc} 은화 ${commission(id)}닢이면 내가 공사를 일으킬 수 있다.`;
    return `${d.name}: ${w.stage === 'stalled' ? '돈이 떨어져 멈췄다' : '짓는 중이다'}. ${pct(w, id)}%, ${progressWord(pct(w, id))}. ${fundsWord(w, id)}. 돈을 대는 쪽은 ${PATRONS[w.patron ?? d.patron].name}.${w.carved ? ` 머릿돌에 ${J(w.carved, '이/가')} 새겨져 있다.` : ` 은화 ${carveAt(id)}닢 넘게 내면 머릿돌에 이름이 새겨진다.`}`;
  }).join('\n\n'),
  choices: (g, s) => {
    if (!free(g) || here(g) !== s.place) return [];
    const out = [];
    for (const id of fundable(g)) {
      const w = wk(g, id), d = WORKS[id];
      if (w.stage === 'idle') { if (canSpend(g, commission(id))) out.push({ label: `${d.name} 공사를 일으킨다 (은화 ${commission(id)}닢)`, key: `start:${id}` }); continue; }
      for (const n of [30, 150, 600, 2500]) if (canSpend(g, n)) out.push({ label: `${d.name}에 은화 ${n}닢`, key: `give:${id}:${n}` });
    }
    out.push({ label: '그만둔다', key: 'leave' });
    return out.slice(0, 10);
  },
  resolve(g, rng, s, key) {
    if (key === 'leave') return '회계에게 고개를 숙이고 나왔다.';
    const [kind, id, nStr] = key.split(':');
    const w = wk(g, id), d = WORKS[id], S = WS(g);
    if (!d) return '그 공사는 없다.';
    if (kind === 'start') {
      if (w.stage !== 'idle') return '그사이 다른 쪽이 공사를 일으켰다.';
      const n = commission(id);
      if (!spend(g, n)) return '돈이 모자랐다.';
      startWork(g, id, 'me', n, rng);
      w.myGold += n; S.me.gold += n;
      carve(g, id);
      renown(g, 6);
      deed(g, 'generous', 6, `${J(g.player.name, '이/가')} 제 돈으로 ${d.name} 공사를 일으켰다더라`, d.place);
      note(g, `내 돈으로 ${d.name} 공사를 일으켰다.`);
      return `측량꾼이 말뚝을 박고 석공들이 모였다. 이 공사의 돈줄은 나다. 내 돈이 마르면 공사도 멈춘다.${w.carved ? ' 머릿돌에 내 이름을 새기기로 했다.' : ''}`;
    }
    const n = +nStr;
    if (!['building', 'stalled'].includes(w.stage)) return '그 공사는 이제 돈이 필요 없다.';
    if (!spend(g, n)) return '돈이 모자랐다.';
    w.funds += n; w.myGold += n; S.me.gold += n;
    const was = w.stage;
    if (w.stage === 'stalled' && w.funds >= rate(id, w) * (w.patron === 'me' ? 1 : 12)) { w.stage = 'building'; wlog(g, `${d.name}: 내 돈으로 다시 시작했다.`); }
    const carvedNow = carve(g, id);
    deed(g, 'generous', n >= 600 ? 5 : n >= 150 ? 3 : 1, n >= 600 ? `${J(g.player.name, '이/가')} ${d.name}에 큰돈을 냈다더라` : null, d.place);
    if (n >= 600) renown(g, 3);
    return `${was === 'stalled' && w.stage === 'building' ? '멈춰 있던 도르래가 다시 돌기 시작했다. ' : ''}회계가 은화 ${n}닢을 장부에 적었다.${carvedNow ? ` 머릿돌에 "${w.carved}"라고 새기기로 했다.` : ''}`;
  },
});
function carve(g, id) {
  const w = wk(g, id);
  if (w.carved || w.myGold < carveAt(id)) return false;
  const fam = me(g)?.lastName || '';
  w.carved = `${fam ? `${fam} 집안의 ` : ''}${g.player.name}`;
  WS(g).me.carved += 1;
  wlog(g, `${WORKS[id].name} 머릿돌에 내 이름이 새겨진다.`);
  return true;
}

/* ---------- 낙성식 ---------- */
defineScene('works_open', {
  title: (g, s) => `${workName(s.id)} 낙성식`,
  text: (g, s) => { const w = wk(g, s.id); return `${WORKS[s.id].doneText} 광장에 사람이 모였다. 사제가 축복하고, ${PATRONS[w.patron ?? WORKS[s.id].patron].name === '나' ? '돈을 댄 나에게 사람들이 잔을 들었다' : `${J(PATRONS[w.patron ?? WORKS[s.id].patron].name, '이/가')} 보낸 사람이 연설을 한다`}. 머릿돌 옆에 공사 중 죽은 ${w.deaths}명의 이름이 작은 글씨로 새겨져 있다.`; },
  choices: (g, s) => (free(g) && here(g) === WORKS[s.id]?.place
    ? [{ label: '축제에 낀다', key: 'feast' }, ...(wk(g, s.id).carved ? [{ label: '머릿돌의 이름을 본다', key: 'stone' }] : []), ...(wk(g, s.id).myMonths > 0 ? [{ label: '같이 일한 사람들과 술을 마신다', key: 'mates' }] : []), { label: '죽은 일꾼들의 이름 앞에 선다', key: 'dead' }] : []),
  resolve(g, rng, s, key) {
    const w = wk(g, s.id), S = WS(g);
    S.me.opened += 1;
    if (key === 'stone') { stress(g, -8); note(g, `${workName(s.id)} 머릿돌에 "${w.carved}" 이름이 새겨졌다.`); return `"${w.carved}". 돌에 새긴 글자는 내 손주의 손주도 읽을 것이다.`; }
    if (key === 'mates') { stress(g, -10); return `${w.myMonths}달을 같이 돌을 나른 사람들이다. 누가 처음 비계에 오른 날 이야기를 꺼냈고, 다들 웃다가 죽은 이름 몇에서 조용해졌다.`; }
    if (key === 'dead') { stress(g, -4); deed(g, 'kind', 2, null, here(g)); return `이름 ${w.deaths}개. 나이도 고향도 없이 이름만. 몇은 아는 이름이었다.`; }
    stress(g, -7); return '밤늦게까지 광장에서 술과 고기가 돌았다. 아이들이 새 돌 위를 뛰어다녔다.';
  },
});

/* ---------- 사건: 부역령 ---------- */
const corveeHere = (g) => WORK_IDS.find((id) => WORKS[id].place === here(g) && wk(g, id).stage === 'building' && wk(g, id).labor === 'corvee') ?? null;
EVENTS.push({
  id: 'works_corvee', cooldown: 24, weight: 5,
  chance: () => 0.4,
  cond: (g) => free(g) && !g.domain && !!corveeHere(g) && WS(g).me.overseer !== corveeHere(g),
  prepare: (g) => ({ id: corveeHere(g) }),
  title: '부역령',
  text: (g, c) => `${placeName(WORKS[c.id].place)} 관아 앞에 부역령이 붙었다. ${WORKS[c.id].name} 공사에 집마다 장정 하나씩 석 달. 빠지려면 대신 사람을 사거나 돈을 내라고 한다. 지난번 부역에서 돌아오지 못한 사람 이름이 아직 입에 오르내린다.`,
  choices: [
    { label: '은화 20닢으로 대신 사람을 산다', show: (g) => canSpend(g, 20), run: (g) => { if (!spend(g, 20)) return '돈이 모자랐다.'; return '날품팔이 하나에게 은화를 쥐여 주고 내 이름으로 보냈다. 그가 무사히 돌아오기를 바랐다.'; } },
    { label: '부역에 나간다', run: (g, rng, c) => {
      const w = wk(g, c.id); if (!w || w.stage !== 'building') return '공사가 멈춰서 부역도 흐지부지되었다.';
      WS(g).me.drafted += 1; w.myMonths += 1; w.progress += 0.5; tired(g, 25); stress(g, 8);
      const sk = learn(g, 2), sg = gainStat(g, 'str', 1);
      if (rng.chance(0.08)) injure(g, '부역장에서 다친 다리', 2);
      return `석 달 동안 돌을 날랐다. 밥은 묽었고 감독관은 모질었다. 돌아오니 손바닥이 굳어 있었다.${gains([up('목공과 석공', sk), up('힘', sg)])}`;
    } },
    { label: '숨는다', run: (g, rng) => {
      WS(g).me.dodged += 1;
      if (check(rng, st(g, 'agi') + st(g, 'sen'), 90)) return '부역꾼을 모으던 날 숲에 들어가 사흘을 버텼다. 아무도 찾으러 오지 않았다.';
      const fine = Math.min(g.player.money, 30); g.player.money -= fine; deed(g, 'brave', -2, null, here(g));
      return `헛간에 숨었다가 끌려 나왔다. 벌금으로 은화 ${fine}닢을 뜯겼다. 이웃들이 보는 앞이었다.`;
    } },
  ],
});

/* ---------- 감독 자리를 비우면 ---------- */
HOOKS.afterMonth.push((g) => {
  if (!g.works) return;
  const S = WS(g), id = S.me.overseer;
  if (!id) return;
  const w = wk(g, id);
  if (w.stage !== 'building' && w.stage !== 'stalled') { S.me.overseer = null; w.overseer = false; return; }
  if (here(g) === WORKS[id].place && !L(g).travel) { S.me.awayM = 0; return; }
  S.me.awayM += 1;
  if (S.me.awayM >= 3) { S.me.overseer = null; w.overseer = false; S.me.awayM = 0; note(g, `${workName(id)} 공사장을 너무 오래 비워 감독 자리를 잃었다.`); }
});

export { completeWork, worksRng, clamp, mi };
