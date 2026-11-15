// 새 일자리들과 "일하러 가기". jobs.js의 doWork(품삯·솜씨·승급)를 바탕으로 갈래마다 한 가지씩 얹는다.
// - 의원: 쟁여 둔 약(craft의 remedies)을 쓰면 더 낫게 고친다. 역병이 돌면 바쁘고 위험하다.
// - 음유시인: 이름값이 벌이를 정한다. 일하는 고장 밖에서도 "떠돌며 노래하기"로 번다.
// - 선생·학자: 제자가 는다. 학자는 책을 쓴다(paths.js의 큰일).
// - 연금술사: 물약을 쟁인다. 가끔 터진다.
// - 목수·석공: 내 집은 내가 고친다(estate의 집 상태). 떨어지면 다친다.
// - 사냥꾼: 덫과 가죽, 큰 짐승은 hunt.js.
import { registerJob, WORK, doWork, jobRank } from '../jobs.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { PLACES } from '../places.js';
import { gainSkill, gainStat, circleOf } from '../game.js';
import { L, isAdult, traveling, tired, stress, up, gains, note } from '../adventure/core.js';
import { C as craftState } from '../craft/core.js';
import { V, vocOfJob, addFame, fameOf, hasPath, skillV, pickOf, mi } from './core.js';
import { maybeVocEvent } from './events.js';
import { advanceProject, maybePath } from './paths.js';

const P = (...ids) => ids;

registerJob('physician', {
  name: '의원', places: P('harfen', 'verden', 'leocast', 'solaris', 'graubel', 'barka', 'portel', 'serenia', 'eisen'),
  skill: 'healing', stat: 'int', stat2: 'wil', wage: [3, 5, 9, 14], npcJob: 'physician',
  ranks: ['의원 견습', '의원', '이름난 의원', '명의'],
  req: (g) => (skillV(g, 'herbs') >= 15 || skillV(g, 'healing') >= 10 || skillV(g, 'letters') >= 35 ? null : '약초 15 또는 글과 학문 35'),
  title: (g) => (hasPath(g, 'royal_physician') ? '왕실 시의' : hasPath(g, 'shadow_physician') ? `의원 (${WORK.physician.ranks[jobRank(g)]}, 밤손님이 찾는)` : `의원 (${WORK.physician.ranks[jobRank(g)]})`),
  lines: ['열이 내리지 않는 아이 곁에서 밤을 새웠다. 새벽녘에 땀이 터졌다.', '대장장이의 덴 손에 기름 먹인 천을 감았다. 그는 비명 대신 욕을 했다.', '부러진 다리를 맞췄다. 뼈가 제자리에 드는 소리가 났다.', '산모 곁을 지켰다. 아이 울음소리가 터지자 부엌에서 남편이 주저앉았다.', '곪은 이를 뽑았다. 늙은 짐꾼은 은화 대신 감자 한 자루를 놓고 갔다.', '낫에 베인 상처를 꿰맸다. 바늘이 들어갈 때마다 젊은 농부의 눈이 질끈 감겼다.'],
});
registerJob('bard', {
  name: '음유시인', places: P('harfen', 'verden', 'leocast', 'barka', 'portel', 'serenia', 'klein', 'eisen', 'silverleaf', 'saltmare', 'solaris'),
  skill: 'music', stat: 'cha', stat2: 'sen', wage: [2, 4, 7, 12], npcJob: 'bard',
  ranks: ['주점 악사', '음유시인', '이름난 시인', '노래의 명인'],
  req: (g) => (g.player.stats.cha >= 16 || skillV(g, 'music') >= 10 ? null : '매력 16'),
  title: (g) => (hasPath(g, 'court_bard') ? '궁정 시인' : `음유시인 (${WORK.bard.ranks[jobRank(g)]})`),
  lines: ['주점 구석에서 류트를 켰다. 취한 용병들이 후렴을 따라 불렀다.', '옛 전쟁의 노래를 불렀다. 맨 앞자리의 늙은 병사가 잔을 내려놓고 눈을 감았다.', '사랑 노래 세 곡에 동전이 모자 안으로 떨어졌다.', '줄 하나가 끊어졌다. 남은 줄로 끝까지 불렀다. 그게 더 낫다는 사람도 있었다.', '장터 우물가에서 새 노래를 시험했다. 아이들이 첫 소절을 흥얼거리며 흩어졌다.', '상인 조합 잔치에 불려 갔다. 노래보다 고기가 더 기억에 남았다.'],
});
registerJob('tutor', {
  name: '선생', places: P('ern', 'harfen', 'verden', 'leocast', 'gruental', 'solaris', 'klein'),
  skill: 'letters', stat: 'int', stat2: 'cha', wage: [2, 3, 5, 8], npcJob: 'tutor',
  ranks: ['훈장 보조', '선생', '이름난 선생', '스승'],
  req: (g) => (skillV(g, 'letters') >= 25 ? null : '글과 학문 25'),
  title: (g) => (hasPath(g, 'school') ? `학당의 주인 (${WORK.tutor.ranks[jobRank(g)]})` : `선생 (${WORK.tutor.ranks[jobRank(g)]})`),
  lines: ['아이들에게 글자를 가르쳤다. 맨 뒷줄 녀석은 끝내 제 이름을 거꾸로 썼다.', '상인 집 아들에게 셈을 가르쳤다. 아이보다 아버지가 더 열심히 들었다.', '석판에 왕국의 역대 왕을 적게 했다. 셋째 왕에서 다들 막혔다.', '비 오는 날 아이들이 오지 않았다. 혼자 남아 다음 달 가르칠 것을 정리했다.', '농부의 딸이 처음으로 책 한 쪽을 소리 내어 다 읽었다. 그 아이보다 내가 더 기뻤다.'],
});
registerJob('scholar', {
  name: '학자', places: P('leocast', 'serenia', 'solaris', 'eisen'),
  skill: 'letters', stat: 'int', stat2: 'wil', wage: [3, 5, 8, 13], npcJob: 'scholar',
  ranks: ['서고지기', '학자', '이름난 학자', '대학자'],
  req: (g) => (skillV(g, 'letters') >= 45 ? null : '글과 학문 45'),
  lines: ['서고에서 삼백 년 된 연대기의 빠진 쪽을 찾았다. 먼지에 재채기가 멈추지 않았다.', '옛 제국 문자로 된 비문을 옮겼다. 한 글자에 하루가 갔다.', '다른 학자와 용사력 연도를 두고 반나절을 다퉜다. 둘 다 틀렸을지도 모른다.', '귀족이 가문의 족보를 맡겼다. 조상 하나가 말 도둑이었다. 어떻게 적을지 고민했다.', '등불 아래에서 오래된 주석을 읽다 새벽을 맞았다.'],
});
registerJob('alchemist', {
  name: '연금술사', places: P('serenia', 'leocast', 'harfen', 'eisen', 'barka'),
  skill: 'alchemy', stat: 'int', stat2: 'sen', wage: [3, 5, 9, 15], npcJob: 'alchemist', risk: 0,
  ranks: ['공방 조수', '연금술사', '이름난 연금술사', '대연금술사'],
  req: (g) => (g.player.stats.int >= 28 || skillV(g, 'herbs') >= 25 || circleOf(g) >= 1 ? null : '지능 28 또는 약초 25'),
  title: (g) => (hasPath(g, 'philosopher') ? '대연금술사' : `연금술사 (${WORK.alchemist.ranks[jobRank(g)]})`),
  lines: ['증류기 앞에서 하루를 보냈다. 푸른 방울이 한 시진에 하나씩 떨어졌다.', '수은을 다루다 손이 떨렸다. 창문을 열고 한참을 서 있었다.', '해열제 쉰 병을 달였다. 남은 찌꺼기에서 이상한 빛이 났다. 적어 두었다.', '마석 가루와 소금을 섞었다. 스승의 비율은 틀렸다. 내 것도 틀렸다.', '귀족 부인이 주름을 펴는 물약을 찾았다. 그런 건 없다고 말했다. 다른 공방은 판다고 했다.'],
});
registerJob('carpenter', {
  name: '목수', places: P('ern', 'harfen', 'verden', 'gruental', 'klein', 'portel', 'saltmare', 'leocast'),
  skill: 'building', stat: 'str', stat2: 'agi', wage: [2, 4, 6, 10], npcJob: 'carpenter', risk: 0,
  ranks: ['목수 견습', '목수', '도목수', '목수의 명장'],
  lines: ['서까래를 올렸다. 지붕 위에서 본 마을은 작았다.', '방앗간 물레바퀴의 부러진 살을 갈아 끼웠다.', '신혼부부의 침상을 짰다. 신부가 몰래 머리맡에 꽃을 새겨 달라고 했다.', '먹줄을 튕기고 대패질을 했다. 결을 거스르면 나무가 운다.', '폭풍에 날아간 헛간 문을 새로 달았다.', '배 목수 일을 거들었다. 용골 하나에 마을 하나의 숲이 들어간다고 했다.'],
});
registerJob('mason', {
  name: '석공', places: P('leocast', 'graubel', 'eisen', 'solaris', 'hammer', 'harfen', 'gorge'),
  skill: 'building', stat: 'str', stat2: 'wil', wage: [3, 4, 7, 11], npcJob: 'mason', risk: 0,
  ranks: ['돌 나르는 견습', '석공', '석공 우두머리', '대석공'],
  req: (g) => (g.player.stats.str >= 22 ? null : '힘 22'),
  title: (g) => (hasPath(g, 'master_builder') ? `건축장 (${WORK.mason.ranks[jobRank(g)]})` : `석공 (${WORK.mason.ranks[jobRank(g)]})`),
  lines: ['채석장에서 쐐기를 박았다. 바위가 결을 따라 갈라졌다.', '성벽의 무너진 곳에 돌을 새로 맞췄다. 회반죽이 손톱 밑에 굳었다.', '신전 기둥에 덩굴무늬를 새겼다. 하루에 한 뼘.', '돌 하나가 밧줄에서 미끄러졌다. 아무도 다치지 않았다. 모두 한참 말이 없었다.', '무덤 비석에 이름을 새겼다. 유족이 글자 하나를 고쳐 달라고 했다. 처음부터 다시 했다.'],
});

// 사냥꾼은 원래 있던 일: 고장을 넓히고, 기술(사냥)로 오르게 한다
const H = WORK.hunter;
if (H) {
  H.skill = 'hunting';
  for (const p of ['gruental', 'graubel', 'fur', 'silverleaf', 'gorge']) if (!H.places.includes(p)) H.places.push(p);
  H.ranks = ['사냥꾼 견습', '사냥꾼', '이름난 사냥꾼', '숲의 명인'];
  H.risk = 0;
  H.title = (g) => (hasPath(g, 'beast_slayer') ? `큰 짐승 사냥꾼 (${H.ranks[jobRank(g)]})` : hasPath(g, 'stag_spared') ? `숲이 기억하는 사냥꾼 (${H.ranks[jobRank(g)]})` : `사냥꾼 (${H.ranks[jobRank(g)]})`);
}

const SK_NAME = { healing: '의술', music: '음악', letters: '글과 학문', alchemy: '연금술', building: '목공과 석공', hunting: '사냥', herbs: '약초' };

// 모든 새 일의 공통 뼈대: doWork 뒤에 이름값·큰일·사건
function vocWork(g, rng, jobId, extra) {
  const def = WORK[jobId];
  const voc = vocOfJob(jobId);
  const v = V(g);
  const pre = extra?.pre?.(g, rng) ?? {};
  let text = doWork(g, rng, def, { line: pre.line, wageMul: pre.wageMul, tire: pre.tire, skillGain: 1.5 });
  // jobs.js는 새 기술의 이름을 모른다: 'building +0.2'를 '목공과 석공 +0.2'로
  if (def.skill && SK_NAME[def.skill]) text = text.replace(`${def.skill} +`, `${SK_NAME[def.skill]} +`);
  v.done[voc] = (v.done[voc] ?? 0) + 1;
  addFame(g, voc, 0.35 + jobRank(g) * 0.15 + (pre.fame ?? 0));
  const post = extra?.post?.(g, rng, pre);
  if (post) text += ` ${post}`;
  const pj = advanceProject(g, rng, voc);
  if (pj) text += ` ${pj}`;
  maybePath(g, rng, voc) || maybeVocEvent(g, rng, voc);
  return text;
}

/* ---------- 의원 ---------- */
WORK.physician.work = (g, rng) => vocWork(g, rng, 'physician', {
  pre(g, rng) {
    const out = { wageMul: 1 };
    const cs = craftState(g);
    if (cs.remedies > 0 && rng.chance(0.5)) { cs.remedies -= 1; out.wageMul *= 1.3; out.used = true; }
    if (g.world?.plague) { out.wageMul *= 1.4; out.fame = 0.6; out.line = pickOf(rng, ['열병 환자들이 문 앞에 줄을 섰다. 잿빛으로 변한 손톱을 하나하나 살폈다.', '역병 구역에서 돌아와 옷을 태웠다. 손을 식초에 씻었다. 그래도 불안했다.', '하루에 셋을 묻었다. 둘은 살렸다. 셈은 하지 않기로 했다.']); }
    out.wageMul *= 1 + Math.min(0.5, fameOf(g, 'healer') / 140);
    return out;
  },
  post(g, rng, pre) {
    const v = V(g);
    if (rng.chance(0.35 + skillV(g, 'healing') / 300)) v.patients += 1;
    gainSkill(g, 'herbs', 0.25, 'sen');
    let t = pre.used ? '쟁여 둔 약 한 단지를 썼다. 낫는 것이 눈에 보였다.' : '';
    if (g.world?.plague && rng.chance(0.04 * (1 - skillV(g, 'healing') / 160))) {
      g.player.injuries.push({ name: '옮은 잿빛 열병', months: 2 });
      stress(g, 10); t += ' 사흘 뒤 내 이마가 뜨거워졌다. 열병이 옮았다.';
    }
    return t;
  },
});

/* ---------- 음유시인 ---------- */
WORK.bard.work = (g, rng) => vocWork(g, rng, 'bard', {
  pre(g, rng) {
    const f = fameOf(g, 'bard');
    // 노래 벌이는 들쭉날쭉하다
    return { wageMul: (0.6 + rng.next() * 0.9) * (1 + f / 90), tire: 10 };
  },
  post(g, rng) {
    if (rng.chance(0.08)) { const tip = rng.int(4, 12 + Math.round(fameOf(g, 'bard') / 4)); g.player.money += tip; return `노래가 끝나자 구석의 낯선 손님이 은화 ${tip}닢을 던져 주고 말없이 나갔다.`; }
    return '';
  },
});
// 떠돌며 노래하기: 일하는 고장 밖에서도, 주점이 있는 곳이면 노래한다
ACTIONS.push({
  id: 'voc_busk', name: '떠돌며 노래하기', icon: 'wander',
  desc: '이 고장 주점과 장터에서 노래한다. 벌이는 들쭉날쭉하지만 이름이 퍼진다.',
  available: (g) => isAdult(g) && !traveling(g) && L(g).job?.id === 'bard' && L(g).job.place !== L(g).place && (PLACES[L(g).place]?.house ?? 0) > 0 && !V(g).banned[L(g).place],
  run(g, rng) {
    tired(g, 10); stress(g, 2);
    const k = gainSkill(g, 'music', 0.9, 'cha');
    const st = gainStat(g, 'cha', 0.3);
    const f = fameOf(g, 'bard');
    const w = Math.max(0, Math.round((1 + jobRank(g) * 2) * (PLACES[L(g).place].wage ?? 1) * (0.3 + rng.next() * 1.1) * (1 + f / 100)));
    g.player.money += w;
    L(g).job.months += 0.15;
    addFame(g, 'bard', 0.5);
    V(g).done.bard = (V(g).done.bard ?? 0) + 1;
    const line = pickOf(rng, [
      `${PLACES[L(g).place].name}의 낯선 주점에서 노래했다. 처음엔 아무도 듣지 않았다. 세 번째 곡에서 잔 부딪는 소리가 멎었다.`,
      '장터 한복판에 모자를 내려놓고 노래했다. 지나가던 수레꾼이 말을 세웠다.',
      '여관 주인이 방값 대신 노래를 하라고 했다. 밤이 깊도록 불렀다.',
      '이 고장 사람들은 내 노래를 몰랐다. 대신 그들의 노래를 하나 배웠다.',
    ]);
    maybeVocEvent(g, rng, 'bard');
    return `${line} 은화 ${w}닢을 벌었다.${gains([up('음악', k), up('매력', st)])}`;
  },
});

/* ---------- 선생·학자 ---------- */
for (const id of ['tutor', 'scholar']) {
  WORK[id].work = (g, rng) => vocWork(g, rng, id, {
    pre: (g) => ({ wageMul: 1 + Math.min(0.3, fameOf(g, 'teacher') / 220) }),
    post(g, rng) {
      const v = V(g);
      gainSkill(g, 'letters', 0.35, 'int'); // 가르치며 배운다
      if (id === 'tutor' && rng.chance(0.12 + jobRank(g) * 0.03)) { v.students += 1; return v.students % 5 === 0 ? `내게 배운 아이가 벌써 ${v.students}명이다. 길에서 "선생님" 하고 부르는 소리가 잦아졌다.` : ''; }
      if (id === 'scholar') { if (rng.chance(0.06)) { gainStat(g, 'int', 0.6); return '오래 풀리지 않던 구절의 뜻이 문득 보였다. 하루 종일 그 생각만 했다.'; } }
      return '';
    },
  });
}

/* ---------- 연금술사 ---------- */
WORK.alchemist.work = (g, rng) => vocWork(g, rng, 'alchemist', {
  pre: (g) => ({ wageMul: 1 + Math.min(0.5, fameOf(g, 'alchemy') / 140) }),
  post(g, rng) {
    const v = V(g);
    gainSkill(g, 'herbs', 0.2, 'sen');
    if (rng.chance(0.25 + skillV(g, 'alchemy') / 250)) v.potions = Math.min(20, v.potions + 1);
    const boom = 0.03 * (1 - skillV(g, 'alchemy') / 130);
    if (rng.chance(boom)) {
      g.player.injuries.push({ name: pickOf(rng, ['증류기 파편에 찢긴 뺨', '산에 덴 손등', '연기에 상한 목']), months: rng.int(1, 2) });
      stress(g, 8);
      return '플라스크가 터졌다. 공방에 시큼한 연기가 가득 찼다. 다쳤다.';
    }
    return '';
  },
});

/* ---------- 목수·석공 ---------- */
for (const id of ['carpenter', 'mason']) {
  WORK[id].work = (g, rng) => vocWork(g, rng, id, {
    pre: (g) => ({ wageMul: 1 + Math.min(0.4, fameOf(g, 'builder') / 160) * (g.world?.rebuild ? 1.5 : 1) }),
    post(g, rng) {
      if (rng.chance(0.022 * (1 - skillV(g, 'building') / 150))) {
        g.player.injuries.push({ name: pickOf(rng, ['비계에서 떨어져 삔 허리', '돌에 찧은 발등', '끌에 베인 손바닥']), months: rng.int(1, 3) });
        stress(g, 6);
        return '발밑의 비계가 기울었다. 다쳤다.';
      }
      return '';
    },
  });
}

/* ---------- 달마다: 의원은 제 몸을 돌보고, 목수는 제 집을 고친다 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const p = g.player;
  if (skillV(g, 'healing') >= 25 && p.injuries.length) {
    const w = p.injuries.find((x) => !x.mortal && x.months > 0);
    if (w && rng.chance(0.5)) w.months = Math.max(0, w.months - 1);
  }
  // 집 손보기: estate의 집 상태가 있으면, 솜씨 있는 목수는 제 집을 덜 낡게 한다
  const life = L(g);
  const h = g.estate?.homes?.[life.place];
  if (h && life.houses?.includes(life.place) && skillV(g, 'building') >= 30) h.cond = Math.min(100, h.cond + (skillV(g, 'building') >= 60 ? 1.2 : 0.6));
  // 쫓겨난 고장 풀기
  const v = V(g);
  for (const [pl, until] of Object.entries(v.banned)) if (mi(g) >= until) delete v.banned[pl];
});

export const VOC_JOB_IDS = ['physician', 'bard', 'tutor', 'scholar', 'alchemist', 'carpenter', 'mason', 'hunter'];
export { SK_NAME, vocWork };

/* ---------- 물약: 다치면 하나 쓰고, 남으면 판다 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const v = V(g);
  if (!v.potions) return;
  const w = g.player.injuries.find((x) => !x.mortal && x.months >= 2);
  if (w) { v.potions -= 1; w.months = 0; note(g, `${w.name}에 물약을 썼다. 사흘 만에 아물었다.`); }
});
ACTIONS.push({
  id: 'voc_potions', name: '물약 팔기', icon: 'coin',
  desc: '쟁여 둔 물약을 약방과 모험가 길드에 넘긴다. 하나는 남겨 둔다.',
  available: (g) => isAdult(g) && !traveling(g) && V(g).potions >= 3 && (PLACES[L(g).place]?.house ?? 0) > 0,
  run(g) {
    const v = V(g);
    const n = v.potions - 1;
    const each = Math.max(3, Math.round(7 * (PLACES[L(g).place]?.wage ?? 1) * (1 + fameOf(g, 'alchemy') / 150)));
    v.potions = 1;
    g.player.money += n * each;
    tired(g, 3);
    return `물약 ${n}병을 한 병에 은화 ${each}닢씩 넘겼다. 모험가 길드 접수원은 병을 불빛에 비춰 보고 고개를 끄덕였다.`;
  },
});
