// 동문: 같은 해 함께 붙은 사람들이 평생 얽힌다. 누구는 출세하고 누구는 몰락한다. 출세한 동문은 손을 내밀고, 몰락한 동문은 손을 벌린다.
// 맞수였던 동문, 다섯 해마다 모이는 동문회, 부모의 동문이 자식을 찾아오는 일. 들키지 않은 부정은 언젠가 드러날 수 있다.
import { HOOKS } from '../hooks.js';
import { EVENTS, check } from '../events/core.js';
import { J } from '../narrative/text.js';
import { playerAge, gainSkill } from '../game.js';
import { L, chron, stress, spend } from '../adventure/core.js';
import { byId } from '../npc.js';
import { remember } from '../relations.js';
import { deed } from '../repute/index.js';
import { courtState } from '../court/index.js';
import { FACTIONS } from '../factions.js';
import { SS, MASTER_TRADES, KIND_NAME, clamp, mi, slog, enrolled, placeName } from './state.js';
import { free, ownRng, aliveAlumni } from './exams.js';

const aff = (p, n) => { p.affection = clamp((p.affection ?? 0) + n, -100, 100); };
const clsKind = (a) => (a.cls === '서임' ? 'knight' : a.cls === '급제' ? 'official' : /조합/.test(a.cls) ? 'master' : 'academy');
const RISE = {
  knight: ['기사대장이 되었다', '왕의 근위대에 들어갔다', '변경 요새의 성주가 되었다'],
  official: ['궁내관이 되었다', '어느 공작의 집사장이 되었다', '세금 관청의 우두머리가 되었다'],
  academy: ['학원의 교수가 되었다', '큰 상단의 회계장이 되었다', '궁정 서기관이 되었다', '대성당의 문서관이 되었다'],
  master: ['조합장이 되었다', '왕실 납품 장인이 되었다', '제자를 스무 명이나 둔 공방 주인이 되었다'],
};
const FALL = {
  knight: ['전장에서 한쪽 팔을 잃고 기사단을 나왔다', '빚 때문에 갑옷을 저당 잡혔다'],
  official: ['횡령 소문에 휘말려 관직에서 쫓겨났다', '모시던 귀족이 몰락하며 같이 길에 나앉았다'],
  academy: ['노름빚에 몰려 숨어 지낸다', '집안이 망해 학원 시절 옷을 팔아 연명한다', '술에 빠져 일자리를 잃었다'],
  master: ['공방에 불이 나 모든 것을 잃었다', '큰 주문에서 속아 빚더미에 앉았다'],
};
const statusWord = (a) => (a.status === 'rose' ? a.note ?? '출세했다' : a.status === 'fell' ? a.note ?? '형편이 어렵다' : '그럭저럭 산다');
export { statusWord };

/* ---------- 매달: 동문의 앞날, 들키지 않은 부정 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.school) return;
  const S = SS(g), now = mi(g), rng = ownRng(g, 5);
  for (const a of S.alumni) {
    if (a.status || a.fate === 'plain' || now < a.fateAt) continue;
    const p = byId(g, a.id);
    if (!p || !p.alive) { a.status = 'gone'; continue; }
    const k = clsKind(a);
    a.status = a.fate === 'rise' ? 'rose' : 'fell';
    a.note = rng.pick((a.fate === 'rise' ? RISE : FALL)[k]);
    if (a.fate === 'rise') p.renown = (p.renown ?? 0) + 10;
    g.news.unshift({ text: `${a.cls} 동기 ${J(p.name, '이/가')} ${a.note}는 소식이 들려왔다.${a.rival ? ' 학창 시절의 맞수였다.' : ''}`, rel: 70 });
    slog(g, `동문 ${J(p.name, '이/가')} ${a.note}.`);
  }
  // 들키지 않은 부정은 언젠가 드러날 수 있다
  for (const h of [...S.hidden]) {
    if (now - h.at < 6 || !rng.chance(0.008)) continue;
    S.hidden = S.hidden.filter((x) => x !== h);
    g.news.unshift({ text: exposeText(g, h), rel: 100, big: true });
  }
});

export function exposeText(g, h) {
  const S = SS(g), what = h.how === 'bribe' ? '시험관에게 돈을 주고 붙었다' : '부정으로 붙었다';
  let lost = '';
  if (h.kind === 'academy' || h.kind === 'finals') {
    if (enrolled(g)) { S.acad.state = 'expelled'; lost = '학원은 나를 내보냈다.'; }
    else if (S.titles.academy) { delete S.titles.academy; lost = '학원은 내 이름을 졸업생 명부에서 지웠다.'; }
  } else if (h.kind === 'knight') {
    if (S.titles.knight) { delete S.titles.knight; lost = '기사단은 서임을 거두었다. 이제 이름 앞에 경이 붙지 않는다.'; }
    const k = L(g).fac?.knights;
    if (k && k.rank >= 2) { k.rank = 1; k.merit = Math.min(k.merit ?? 0, FACTIONS.knights.merit[2] - 1); }
    if (g.player.title === '경') g.player.title = null;
  } else if (h.kind === 'official') {
    if (S.titles.official) { delete S.titles.official; lost = '급제가 취소되었다.'; }
    const c = courtState(g);
    c.standing = clamp(c.standing - 15, 0, 100);
  } else if (h.kind === 'master' && h.trade) {
    if (S.titles.master?.[h.trade]) { delete S.titles.master[h.trade]; lost = `${MASTER_TRADES[h.trade].guild}은 내 이름을 장인 명부에서 지웠다.`.replace(`${MASTER_TRADES[h.trade].guild}은`, J(MASTER_TRADES[h.trade].guild, '은/는')); }
    if (g.craft?.fame) g.craft.fame[h.trade] = clamp((g.craft.fame[h.trade] ?? 0) - 15, 0, 100);
  }
  deed(g, 'honest', -8, `${J(g.player.name, '이/가')} ${placeName(h.place)}의 ${KIND_NAME[h.kind]}에서 ${what}더라`, h.place);
  stress(g, 12);
  chron(g, `${g.player.name}의 지난 ${KIND_NAME[h.kind]} 부정이 드러나다.`, 40);
  slog(g, `${placeName(h.place)} ${KIND_NAME[h.kind]}에서 ${what}는 것이 드러났다.`);
  return `${placeName(h.place)}에서 옛 ${KIND_NAME[h.kind]} 이야기가 다시 돈다. 누군가 ${what}고 한다. 그 누군가는 나다. ${lost}`.trim();
}

/* ---------- 출세한 동문 ---------- */
const risen = (g) => aliveAlumni(g).filter(({ a, p }) => a.status === 'rose' && !a.helped && !a.rival && (p.affection ?? 0) >= 0);
EVENTS.push({
  id: 'school_alum_help', cooldown: 36, weight: 4,
  chance: () => 0.4,
  cond: (g) => free(g) && risen(g).length > 0,
  prepare: (g, rng) => ({ id: rng.pick(risen(g)).p.id }),
  title: '출세한 동문',
  text: (g, c) => {
    const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
    return `${a?.cls ?? '학원'} 동기 ${J(p?.name ?? '옛 동기', '이/가')} 편지를 보냈다. 지금은 ${(a?.note ?? '출세했다').replace(/다$/, '')}는 사람이다. "옛정을 잊지 않았네. 무엇이든 말해 보게."`;
  },
  choices: [
    {
      label: '도움을 청한다',
      run: (g, rng, c) => {
        const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
        if (!p || !a || !p.alive) return '답장을 보냈지만, 다시 소식이 오지 않았다.';
        a.helped = true;
        aff(p, -2);
        const k = clsKind(a);
        if (k === 'knight' && L(g).fac?.knights?.member) { L(g).fac.knights.merit += 40; return `${J(p.name, '이/가')} 기사단장에게 내 이름을 넣어 주었다. 다음 원정에 내 자리가 생겼다.`; }
        if ((k === 'official' || a.place === 'leocast') && courtState(g).standing < 90) { const cs = courtState(g); cs.standing = clamp(cs.standing + 10, 0, 100); return `${J(p.name, '이/가')} 궁정의 몇몇 사람에게 내 이름을 흘려 주었다. 연회에서 나를 알아보는 얼굴이 늘었다.`; }
        if (k === 'master' && a.place) { const t = Object.keys(MASTER_TRADES).find((x) => (g.player.skills[x] ?? 0) >= 30); if (t && g.craft?.fame) { g.craft.fame[t] = clamp((g.craft.fame[t] ?? 0) + 8, 0, 100); return `${J(p.name, '이/가')} 큰 손님 몇을 내게 보내 주었다. 내 이름이 조합 밖에서도 돌기 시작했다.`; } }
        g.player.money += 25;
        return `${J(p.name, '이/가')} 은화 25닢을 보내왔다. "갚을 생각 말게. 학원 시절 자네 필기가 아니었으면 나는 지금 여기 없네."`;
      },
    },
    { label: '안부만 묻는다', run: (g, rng, c) => { const p = byId(g, c.id); if (p) { aff(p, 6); remember(g, p, '출세한 뒤에도 안부를 주고받았다', 1, { tag: 'school_letter' }); } return '부탁할 일은 없다고 적었다. 대신 학원 뒤뜰의 늙은 밤나무 이야기를 길게 썼다. 답장은 더 길게 왔다.'; } },
  ],
});

/* ---------- 몰락한 동문 ---------- */
const fallen = (g) => aliveAlumni(g).filter(({ a }) => a.status === 'fell' && !a.pleaded);
EVENTS.push({
  id: 'school_alum_plea', cooldown: 36, weight: 4,
  chance: () => 0.4,
  cond: (g) => free(g) && fallen(g).length > 0,
  prepare: (g, rng) => ({ id: rng.pick(fallen(g)).p.id }),
  title: '몰락한 동문',
  text: (g, c) => {
    const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
    return `문 앞에 낯익은 얼굴이 서 있었다. ${a?.cls ?? '학원'} 동기 ${p?.name ?? '옛 동기'}. ${(a?.note ?? '형편이 어려워졌다').replace(/다$/, '')}다고 한다. 헌 외투 소매가 해져 있었다. "염치없지만, 은화 스무 닢만."${a?.rival ? ' 학창 시절 나를 그렇게 깔보던 사람이다.' : ''}`;
  },
  choices: [
    {
      label: '은화 20닢을 내준다',
      run: (g, rng, c) => {
        const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
        if (a) a.pleaded = true;
        if (!spend(g, 20)) { if (p) aff(p, -3); return '주머니를 뒤집어 보였다. 나도 그만한 돈은 없었다. 둘이 같이 웃었다. 웃을 일은 아니었다.'; }
        if (p) { aff(p, a?.rival ? 30 : 20); remember(g, p, '어려울 때 은화를 내주었다', 2, { tag: 'school_help' }); if (a) a.rival = false; }
        deed(g, 'generous', 4, `${J(g.player.name, '이/가')} 몰락한 옛 동기를 도왔다더라`);
        return `${p ? J(p.name, '은/는') : '동기는'} 은화를 받아 쥐고 한참 고개를 들지 못했다. "이 빚은 꼭 갚겠네." 갚지 못해도 괜찮다고 말했다.`;
      },
    },
    {
      label: '일자리를 알아봐 준다',
      run: (g, rng, c) => {
        const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
        if (a) a.pleaded = true;
        if (!p) return '그 사이 동기는 떠나고 없었다.';
        if (check(rng, g.player.stats.cha * 0.5 + (L(g).renown ?? 0) * 0.5, 30)) { aff(p, 14); p.job = 'laborer'; if (a) a.status = null, a.fate = 'plain'; remember(g, p, '일자리를 구해 주었다', 2, { tag: 'school_help' }); return `아는 사람 몇에게 부탁해 ${p.name}의 일자리를 구했다. 돈보다 그게 나았다고, 나중에 편지가 왔다.`; }
        aff(p, 3);
        return '여기저기 물어봤지만 자리는 없었다. 동기는 고맙다며 웃었다. 그 웃음이 오래 남았다.';
      },
    },
    {
      label: '돌려보낸다',
      run: (g, rng, c) => {
        const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
        if (a) a.pleaded = true;
        if (p) { aff(p, -15); remember(g, p, '찾아갔을 때 문전박대했다', -2, { tag: 'school_help' }); }
        return `"미안하네." 문을 닫았다. 문 너머에서 발소리가 한참 머뭇거리다 멀어졌다.`;
      },
    },
  ],
});

/* ---------- 맞수였던 동문 ---------- */
const rivals = (g) => aliveAlumni(g).filter(({ a }) => a.rival);
EVENTS.push({
  id: 'school_alum_rival', cooldown: 60, weight: 3,
  chance: () => 0.35,
  cond: (g) => free(g) && rivals(g).length > 0,
  prepare: (g, rng) => ({ id: rng.pick(rivals(g)).p.id }),
  title: '옛 맞수',
  text: (g, c) => {
    const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
    return `${a?.cls ?? '학원'} 시절의 맞수 ${J(p?.name ?? '옛 맞수', '이/가')} 같은 자리에 나타났다.${a?.status === 'rose' ? ` ${(a.note ?? '출세했다').replace(/다$/, '')}는 사람답게 어깨에 힘이 들어가 있었다.` : ''} "아직도 그 모양인가?" 그 목소리는 하나도 변하지 않았다.`;
  },
  choices: [
    {
      label: '맞선다',
      run: (g, rng, c) => {
        const p = byId(g, c.id);
        if (check(rng, g.player.stats.cha * 0.4 + g.player.stats.int * 0.3 + (L(g).renown ?? 0) * 0.3, 36)) { L(g).renown = (L(g).renown ?? 0) + 1; if (p) aff(p, -4); return '"그 모양으로도 그대보다는 낫소." 둘러선 사람들이 웃었다. 이번에는 내가 이겼다. 몇 해 만인지 모른다.'; }
        stress(g, 8);
        if (p) aff(p, -2);
        return '말이 엉켰다. 맞수는 어깨를 으쓱하고 가 버렸다. 학원 시절과 똑같았다. 그게 더 분했다.';
      },
    },
    {
      label: '화해의 손을 내민다',
      run: (g, rng, c) => {
        const p = byId(g, c.id), a = SS(g).alumni.find((x) => x.id === c.id);
        if (p && check(rng, g.player.stats.cha + (p.affection ?? 0) * 0.3, 40)) { if (a) a.rival = false; aff(p, 20); remember(g, p, '오랜 맞수였다가 화해했다', 2, { tag: 'school' }); return `손을 내밀었다. ${J(p.name, '은/는')} 한참 보더니 잡았다. "그때 자네가 미웠던 건, 자네가 나보다 잘해서였네." 술은 그가 샀다.`; }
        return '내민 손이 허공에 머물렀다. 맞수는 코웃음을 치고 돌아섰다.';
      },
    },
    { label: '못 본 척한다', run: (g) => { stress(g, 3); return '고개를 돌렸다. 늙어서까지 다툴 일은 아니다. 그래도 그날 밤 잠이 늦게 왔다.'; } },
  ],
});

/* ---------- 동문회 ---------- */
EVENTS.push({
  id: 'school_reunion', cooldown: 48, weight: 3,
  chance: () => 0.5,
  cond: (g) => free(g) && aliveAlumni(g).length >= 2 && mi(g) - SS(g).reunionAt >= 48 && SS(g).alumni.some((a) => g.date.year - a.year >= 4),
  title: '동문회',
  text: (g) => {
    const list = aliveAlumni(g).slice(0, 4).map(({ a, p }) => `${p.name}(${statusWord(a)})`);
    return `동문회 소식이 왔다. 올해는 ${placeName(SS(g).alumni[SS(g).alumni.length - 1]?.place)}의 여관에서 모인다고 한다. 올 사람들: ${list.join(', ')}.`;
  },
  choices: [
    {
      label: '간다',
      run: (g, rng) => {
        SS(g).reunionAt = mi(g);
        if (g.player.money >= 4) g.player.money -= 4;
        stress(g, -8);
        const ms = aliveAlumni(g);
        for (const { p } of ms) aff(p, 4);
        const r = ms.find(({ a }) => a.status === 'rose'), f = ms.find(({ a }) => a.status === 'fell');
        return `술잔이 몇 번 돌자 다들 학원 시절 얼굴로 돌아갔다.${r ? ` ${J(r.p.name, '은/는')} 출세한 티를 내지 않으려 애썼다.` : ''}${f ? ` ${J(f.p.name, '은/는')} 구석에서 조용히 잔만 비웠다.` : ''} 누군가 옛 교수 흉내를 냈고, 다 같이 웃었다.`;
      },
    },
    { label: '이번에는 빠진다', run: (g) => { SS(g).reunionAt = mi(g); return '바쁘다는 답장을 보냈다. 다음 모임에는 꼭 가겠다고 적었다. 그 말을 몇 번째 하는지 모르겠다.'; } },
  ],
});

/* ---------- 부모의 동문 ---------- */
const parentAlum = (g) => SS(g).parentAlumni.filter((x) => !x.used && byId(g, x.id)?.alive);
EVENTS.push({
  id: 'school_parent_alum', cooldown: 60, weight: 4,
  chance: () => 0.45,
  cond: (g) => free(g) && playerAge(g) <= 35 && parentAlum(g).length > 0,
  prepare: (g, rng) => { const x = rng.pick(parentAlum(g)); return { id: x.id, parent: x.parent, cls: x.cls }; },
  title: '부모의 동문',
  text: (g, c) => {
    const p = byId(g, c.id);
    return `백발이 성성한 ${J(p?.name ?? '노인', '이/가')} 나를 찾아왔다. "${c.parent || '자네 부모'}와 ${c.cls}을 함께 했네." 노인은 내 얼굴에서 누군가를 찾는 눈치였다. "자네 부모에게 진 빚이 있어. 내가 갚을 길은 이제 자네뿐이네."`.replace(`${c.cls}을`, J(c.cls, '을/를'));
  },
  choices: [
    {
      label: '도움을 받는다',
      run: (g, rng, c) => {
        const x = SS(g).parentAlumni.find((y) => y.id === c.id);
        if (x) x.used = true;
        const p = byId(g, c.id);
        if (p) { aff(p, 10); p.known = true; remember(g, p, '옛 동기의 자식을 도왔다', 2, { tag: 'school_parent' }); }
        if ((g.player.skills.letters ?? 0) < 40) { gainSkill(g, 'letters', 3, 'int'); g.player.money += 10; return '노인은 한 달 동안 내게 글과 셈을 가르쳤고, 떠날 때 은화 10닢을 쥐여 주었다. "자네 부모는 나보다 늘 한 수 위였네."'; }
        g.player.money += 30;
        return '노인은 은화 30닢이 든 주머니를 내밀었다. "빌린 지 서른 해가 넘었네. 이자는 따지지 말게."';
      },
    },
    {
      label: '부모 이야기만 듣는다',
      run: (g, rng, c) => {
        const x = SS(g).parentAlumni.find((y) => y.id === c.id);
        if (x) x.used = true;
        const p = byId(g, c.id);
        if (p) { aff(p, 15); p.known = true; }
        stress(g, -6);
        return `도움은 사양했다. 대신 해가 질 때까지 ${c.parent || '부모'}의 젊은 날 이야기를 들었다. 내가 모르던 사람이었다. 그리고 많이 닮은 사람이었다.`;
      },
    },
  ],
});

