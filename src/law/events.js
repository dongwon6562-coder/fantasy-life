// 법과 재판의 사건: 고발당하기, 억울한 일 당하기, 증인으로 불려 가기, 재판관 자리에 앉기, 옥에서 사면 청하기, 낙인이 따라오기.
import { EVENTS, check, stress } from '../events/core.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { crimeState, isJailed } from '../crime.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { courtState } from '../court/index.js';
import { atDomain } from '../domain/state.js';
import { villageState } from '../village/index.js';
import { realmOf } from '../realms/index.js';
import { byId } from '../npc.js';
import { remember } from '../relations.js';
import { LS, CHARGES, lawOf, clamp, mi, llog, openCases, townOf, placeName } from './state.js';
import { openCase, askTrial } from './trial.js';
import { localOther, addGrievance } from './life.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const nm = (g) => g.player.name;
const subj = (g) => J(nm(g), '이/가');
const busy = (g) => openCases(g).some((c) => c.place === here(g));

// ---------- 고발당하다 ----------
EVENTS.push({
  id: 'law_accused', cooldown: 72, weight: 3,
  chance: (g) => 0.2 + LS(g).stain / 300 + (L(g).notoriety ?? 0) / 400,
  cond: (g) => free(g) && townOf(here(g)) && !busy(g),
  prepare: (g, rng) => {
    const holy = realmOf(here(g)) === 'holy' && (faithState(g).suspicion ?? 0) >= 40;
    const charge = holy ? 'heresy' : rng.pick(['theft', 'slander', 'debt', 'land', 'fraud', 'contract']);
    const other = localOther(g, rng);
    const guilty = charge === 'heresy' ? (faithState(g).suspicion ?? 0) >= 60 : rng.chance(0.25);
    return { charge, other, guilty, evidence: (guilty ? 45 : 25) + rng.int(0, 25) };
  },
  title: '고발장',
  text: (g, c) => `${lawOf(here(g)).court}의 서기가 문을 두드렸다. ${J(c.other.name, '이/가')} 나를 ${J(CHARGES[c.charge].name, '으로/로')} 고발했다고 한다. ${c.guilty ? '아주 없는 말은 아니다. 그날 일이 떠올랐다.' : '무슨 소리인지 모르겠다. 아니, 짐작은 간다. 요즘 나를 곱게 보지 않던 사람이다.'} 재판 날은 다음 장날이다.`,
  choices: [
    { label: '법정에 나간다', run: (g, rng, c) => { askTrial(g, openCase(g, { role: 'accused', charge: c.charge, other: c.other, guilty: c.guilty, evidence: c.evidence })); return '고발장을 접어 품에 넣었다. 법정에서 보자.'; } },
    {
      label: '고발한 사람과 합의한다',
      run: (g, rng, c) => {
        const cost = Math.round((CHARGES[c.charge].pay || 15) * 0.8);
        if (g.player.money < cost) return `합의하려면 은화 ${cost}닢은 있어야 한다. 주머니가 그만큼 무겁지 않았다. ${(askTrial(g, openCase(g, { role: 'accused', charge: c.charge, other: c.other, guilty: c.guilty, evidence: c.evidence })), '결국 법정에 서야 한다.')}`;
        g.player.money -= cost;
        const p = c.other.id ? byId(g, c.other.id) : null;
        if (p) remember(g, p, '고발을 거두는 대신 돈을 받았다', 3);
        if (!c.guilty) stress(g, 4);
        llog(g, `${placeName(here(g))}: ${c.other.name}의 고발을 은화 ${cost}닢으로 무마했다.`);
        return `${J(c.other.name, '을/를')} 찾아가 은화 ${cost}닢을 내밀었다. 고발장은 그 자리에서 찢겼다. ${c.guilty ? '싸게 막았다.' : '죄 없이 낸 돈이라 속이 쓰렸다.'}`;
      },
    },
    {
      label: '모른 척한다',
      run: (g, rng, c) => {
        const k = openCase(g, { role: 'accused', charge: c.charge, other: c.other, guilty: c.guilty, evidence: c.evidence + 10 });
        k.at -= 6; // 다음 달 궐석 판결로 간다
        return '고발장을 아궁이에 넣었다. 법정에 안 나가면 그만이라고 생각했다. 재판관은 그렇게 생각하지 않을 것이다.';
      },
    },
  ],
});

// ---------- 억울한 일을 당하다 ----------
const WRONGS = {
  land: (o) => `밭 경계의 표석이 한 뼘 옮겨져 있었다. 밤새 누가 옮겼는지는 뻔하다. ${o}의 밭이 그만큼 넓어졌다.`,
  debt: (o) => `${J(o, '은/는')} 봄에 빌려 간 은화를 가을이 다 가도록 갚지 않는다. 물으면 "곧"이라고만 한다.`,
  fraud: (o) => `${o}에게서 산 밀가루 자루 밑바닥에 모래가 한 되 깔려 있었다.`,
  slander: (o) => `장터에 이상한 말이 돈다. 내가 남의 물건에 손을 댄다는 말이다. 처음 그 말을 한 사람이 ${o}라고 한다.`,
  contract: (o) => `${J(o, '은/는')} 약속한 날에 물건을 넘기지 않았다. 손으로 쓴 약조가 내 품에 있다.`,
};
EVENTS.push({
  id: 'law_wrong', cooldown: 60, weight: 4,
  chance: () => 0.35,
  cond: (g) => free(g) && townOf(here(g)) && !LS(g).grievances.some((x) => x.place === here(g)),
  prepare: (g, rng) => ({ charge: rng.pick(Object.keys(WRONGS)), other: localOther(g, rng), proof: rng.int(30, 75) }),
  title: '억울한 일',
  text: (g, c) => `${WRONGS[c.charge](c.other.name)} 증거는 ${c.proof >= 55 ? '꽤 있다' : '조금 있다'}.`,
  choices: [
    {
      label: '법정에 고발하겠다고 마음먹는다',
      run: (g, rng, c) => { addGrievance(g, c.charge, c.other, c.proof); return `${placeName(here(g))}의 법정이 열리는 날을 알아 두었다. 고발하기로 했다.`; },
    },
    {
      label: '직접 따진다',
      run: (g, rng, c) => {
        const p = c.other.id ? byId(g, c.other.id) : null;
        if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.str * 0.3, 45)) {
          const back = Math.round((CHARGES[c.charge].pay || 10) * 0.6);
          if (c.charge !== 'slander') g.player.money += back;
          if (p) remember(g, p, '나에게 따지러 와서 받아 갔다', -4);
          return c.charge === 'slander' ? `${J(c.other.name, '을/를')} 장터 한가운데서 붙잡고 따졌다. 사람들 앞에서 말을 거두게 했다.` : `${J(c.other.name, '을/를')} 찾아가 따졌다. 얼굴이 붉어지더니 은화 ${back}닢을 내놓았다. 다 받지는 못했다.`;
        }
        stress(g, 5);
        if (p) remember(g, p, '나에게 따지러 왔다', -8);
        addGrievance(g, c.charge, c.other, c.proof - 10);
        return `${J(c.other.name, '은/는')} 문을 닫아 버렸다. 이웃들이 창문으로 구경했다. 남은 길은 법정뿐이다.`;
      },
    },
    { label: '참는다', run: (g) => { stress(g, 3); return '참기로 했다. 법정까지 가는 것도 일이다. 그래도 그 사람 얼굴을 볼 때마다 생각날 것이다.'; } },
  ],
});

// ---------- 증인으로 불려 가다 ----------
EVENTS.push({
  id: 'law_witness', cooldown: 60, weight: 3,
  chance: () => 0.3,
  cond: (g) => free(g) && townOf(here(g)),
  prepare: (g, rng) => {
    const a = localOther(g, rng), b = localOther(g, rng, (p) => p.id !== a.id);
    return { accused: a, accuser: b, guilty: rng.chance(0.55), offer: rng.int(10, 30), charge: rng.pick(['theft', 'assault', 'debt', 'fraud']) };
  },
  title: '증인 소환',
  text: (g, c) => `${J(c.accuser.name, '이/가')} ${J(c.accused.name, '을/를')} ${J(CHARGES[c.charge].name, '으로/로')} 고발했다. 그날 그 자리에 내가 있었다고 해서 증인으로 불려 간다. ${c.guilty ? `나는 ${J(c.accused.name, '이/가')} 한 일을 보았다.` : `내가 본 것으로는 ${J(c.accused.name, '은/는')} 아무 짓도 하지 않았다.`} 재판 전날 밤, ${c.guilty ? c.accused.name : c.accuser.name}의 사람이 은화 ${c.offer}닢을 들고 찾아왔다.`,
  choices: [
    {
      label: '본 그대로 말한다',
      run: (g, rng, c) => {
        LS(g).rec.witness += 1;
        deed(g, 'honest', 3, `${subj(g)} 법정에서 본 그대로 증언했다고 한다.`);
        const p = c.accused.id ? byId(g, c.accused.id) : null;
        if (p) remember(g, p, c.guilty ? '법정에서 나에게 불리하게 증언했다' : '법정에서 나를 살려 주었다', c.guilty ? -12 : 14);
        return c.guilty ? `본 그대로 말했다. ${J(c.accused.name, '이/가')} 고개를 떨궜다. 법정을 나서는데 ${c.accused.name}의 식구가 내 등을 오래 쳐다보았다.` : `본 그대로 말했다. ${J(c.accused.name, '은/는')} 풀려났다. 법정 밖에서 내 손을 잡고 한참 놓지 않았다.`;
      },
    },
    {
      label: '은화를 받고 말을 바꾼다',
      run: (g, rng, c) => {
        const S = LS(g);
        g.player.money += c.offer; S.rec.lies += 1;
        S.perjury.push({ at: mi(g), place: here(g), name: c.accused.name });
        deed(g, 'honest', -2, `${subj(g)} 증언이 이상했다고 수군대는 사람이 있다.`, here(g), { lie: false });
        return `은화 ${c.offer}닢을 받았다. 다음 날 법정에서 ${c.guilty ? '아무것도 못 보았다고' : '보았다고'} 말했다. 혀가 생각보다 쉽게 움직였다. ${c.guilty ? `${J(c.accused.name, '은/는')} 풀려났다.` : `${J(c.accused.name, '은/는')} 끌려갔다.`}`;
      },
    },
    {
      label: '나가지 않는다',
      run: (g) => { const fine = Math.min(g.player.money, 5); g.player.money -= fine; return `법정에 나가지 않았다. 서기가 와서 벌금으로 은화 ${fine}닢을 받아 갔다. 재판이 어떻게 됐는지는 모른다. 모르는 편이 낫다.`; },
    },
  ],
});

// ---------- 재판관 자리에 앉다 ----------
const canJudge = (g) => atDomain(g) || villageState(g).office?.place === here(g) || (courtState(g).office >= 2 && here(g) === 'leocast');
EVENTS.push({
  id: 'law_judge', cooldown: 18, weight: 6,
  chance: () => 0.45,
  cond: (g) => free(g) && canJudge(g),
  prepare: (g, rng) => {
    const a = localOther(g, rng), b = localOther(g, rng, (p) => p.id !== a.id);
    const rich = rng.chance(0.5);
    return { a, b, charge: rng.pick(['land', 'debt', 'theft', 'contract', 'assault']), right: rng.chance(0.5) ? 'a' : 'b', rich, offer: rng.int(15, 40), clue: rng.int(0, 2) };
  },
  title: '판결을 내릴 자리',
  text: (g, c) => {
    const clue = ['증인 둘이 서로 다른 말을 한다.', '장부 한 장이 찢겨 나가 있다.', '양쪽 다 울면서 말한다.'][c.clue];
    return `${J(c.a.name, '이/가')} ${J(c.b.name, '을/를')} ${J(CHARGES[c.charge].name, '으로/로')} 고발해 왔다. 판결은 내 몫이다. ${clue} ${c.rich ? `${J(c.b.name, '은/는')} 고장에서 힘 있는 집안이고, 어젯밤 그 집 사람이 은화 ${c.offer}닢을 놓고 갔다.` : `${J(c.a.name, '은/는')} 가난하고, ${J(c.b.name, '은/는')} 더 가난하다.`} 내 눈에는 ${c.right === 'a' ? c.a.name : c.b.name} 쪽 말이 조금 더 맞아 보인다.`;
  },
  choices: [
    {
      label: '증거대로 판결한다',
      run: (g, rng, c) => {
        LS(g).rec.judged += 1;
        const right = rng.chance(0.75) ? c.right : c.right === 'a' ? 'b' : 'a';
        deed(g, 'honest', 3, `${subj(g)} 판결을 공정하게 내린다고 한다.`);
        const w = right === 'a' ? c.a : c.b, l = right === 'a' ? c.b : c.a;
        const lp = l.id ? byId(g, l.id) : null; if (lp) remember(g, lp, '내 판결에 졌다', -6);
        const wp = w.id ? byId(g, w.id) : null; if (wp) remember(g, wp, '내 판결로 이겼다', 6);
        return `밤새 양쪽의 말과 장부를 다시 보았다. ${w.name}의 손을 들어 주었다. ${right === c.right ? '옳은 판결이었다고 믿는다.' : '나중에야 알았다. 내가 틀렸다. 판결은 이미 내려졌다.'}`;
      },
    },
    {
      label: '은화를 받은 쪽의 손을 들어 준다',
      run: (g, rng, c) => {
        LS(g).rec.judged += 1;
        if (!c.rich) { deed(g, 'kind', 2, `${subj(g)} 가난한 이웃끼리의 다툼을 너그럽게 풀었다고 한다.`); return '받은 것이 없으니 어느 쪽 손도 들어 줄 까닭이 없었다. 둘 다 조금씩 양보하게 했다. 둘 다 조금씩 불만이다. 그게 판결이다.'; }
        g.player.money += c.offer;
        deed(g, 'honest', -5, `${subj(g)} 판결을 돈에 판다는 말이 돈다.`);
        if (rng.chance(0.25)) L(g).notoriety = (L(g).notoriety ?? 0) + 2;
        return `${c.b.name}의 손을 들어 주었다. 은화 ${c.offer}닢은 이미 내 궤짝 안에 있다. ${J(c.a.name, '은/는')} 판결을 듣고 아무 말도 하지 않았다. 그 침묵이 오래 귀에 남았다.`;
      },
    },
    {
      label: '둘을 화해시킨다',
      run: (g, rng, c) => {
        LS(g).rec.judged += 1;
        if (check(rng, g.player.stats.cha * 0.6 + LS(g).skill * 0.3, 45)) { deed(g, 'kind', 3, `${subj(g)} 다툼을 판결 대신 화해로 풀었다고 한다.`); return '둘을 한 탁자에 앉혔다. 술 한 병이 빌 때쯤 서로의 사정을 듣기 시작했다. 판결문 대신 손을 맞잡게 했다.'; }
        stress(g, 4);
        return '둘을 한 탁자에 앉혔다가 탁자가 엎어졌다. 결국 판결을 내렸다. 양쪽 다 나를 원망한다.';
      },
    },
  ],
});

// ---------- 옥에서 사면을 청하다 ----------
EVENTS.push({
  id: 'law_pardon', cooldown: 24, weight: 8,
  chance: () => 0.5,
  cond: (g) => isJailed(g) && (crimeState(g).jailed?.months ?? 0) >= 4 && !g.over,
  prepare: (g) => ({ cost: Math.round(10 + (crimeState(g).jailed?.months ?? 4) * 4) }),
  title: '사면 청원',
  text: (g, c) => `옥지기가 귀띔해 주었다. ${lawOf(crimeState(g).jailed.place).court}에 사면 청원을 올리는 길이 있다고. 서기에게 은화 ${c.cost}닢을 쥐여 주거나, 힘 있는 사람의 이름을 빌리면 된다고 한다.`,
  choices: [
    {
      label: '서기에게 은화를 쥐여 준다',
      run: (g, rng, c) => {
        if (g.player.money < c.cost) return `은화 ${c.cost}닢이 없었다. 옥지기가 어깨를 으쓱했다.`;
        g.player.money -= c.cost;
        const j = crimeState(g).jailed;
        if (rng.chance(clamp(0.45 + lawOf(j.place).bribe, 0.1, 0.85))) {
          const cut = Math.ceil(j.months / 2); j.months = Math.max(1, j.months - cut); LS(g).rec.pardons += 1;
          return `석 달 뒤 답이 왔다. 형기가 ${cut}달 줄었다. 은화가 한 일인지 청원이 한 일인지는 모른다.`;
        }
        return '은화는 사라졌고 답은 오지 않았다. 옥지기가 웃었다. "다들 그래."';
      },
    },
    {
      label: '힘 있는 사람의 이름을 빈다',
      run: (g, rng) => {
        const C = courtState(g), j = crimeState(g).jailed;
        if (C.standing >= 15 || (L(g).renown ?? 0) >= 40 || g.domain) {
          crimeState(g).jailed = null; LS(g).rec.pardons += 1;
          note(g, '힘 있는 사람의 이름을 빌려 사면을 받았다.');
          chron(g, `${g.player.name}, 사면을 받아 옥에서 나오다.`, 40);
          return `궁정에서 편지 한 통이 왔다. 다음 날 아침 옥문이 열렸다. 빚을 졌다. 언젠가 갚으라고 할 것이다.`;
        }
        j.months += 1;
        return '내 이름을 아는 힘 있는 사람은 없었다. 청원이 무례하다고 형기가 한 달 늘었다.';
      },
    },
    { label: '견딘다', run: (g) => { stress(g, -2); return '청원은 하지 않기로 했다. 내가 저지른 일의 값이다. 벽에 금을 하나 더 그었다.'; } },
  ],
});

// ---------- 낙인이 따라온다 ----------
EVENTS.push({
  id: 'law_stain', cooldown: 60, weight: 3,
  chance: (g) => LS(g).stain / 150,
  cond: (g) => free(g) && LS(g).stain >= 20 && townOf(here(g)),
  prepare: (g, rng) => ({ who: rng.pick(['혼삿말을 넣었던 집', '일자리를 주겠다던 장인', '자리를 내주던 여관 주인']) }),
  title: '옛 판결',
  text: (g, c) => `${c.who}에서 말을 거두었다. 이유는 말하지 않았다. 나중에 들으니 ${placeName(here(g))}의 법정 장부에 우리 집안 이름이 적혀 있다는 것을 누가 알려 주었다고 한다.`,
  choices: [
    { label: '찾아가 사정을 말한다', run: (g, rng) => { if (check(rng, g.player.stats.cha * 0.6 + (L(g).renown ?? 0) * 0.3, 50)) { LS(g).stain = clamp(LS(g).stain - 5, 0, 100); return '찾아가서 그날 일을 숨기지 않고 말했다. 한참 듣더니 말을 도로 넣어 주었다. 판결은 지워지지 않지만, 사람은 판결만으로 사람을 보지 않는다.'; } stress(g, 5); return '찾아갔지만 문 앞에서 돌려보내졌다. 장부의 한 줄은 생각보다 길게 따라온다.'; } },
    { label: '고개를 숙이고 지나간다', run: (g) => { stress(g, 4); return '아무 말도 하지 않았다. 판결을 받은 것은 사실이다. 사실은 바꿀 수 없다.'; } },
  ],
});
