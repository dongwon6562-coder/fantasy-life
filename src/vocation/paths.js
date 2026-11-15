// 그 일로만 가는 길. 솜씨와 이름이 차면 한 번 찾아오는 갈림길(장면 'voc_path')과, 여러 달에 걸친 큰일(project).
// - 큰일은 그 갈래의 일을 할 때마다 조금씩 나아간다. 다 되면 남긴 것(works)과 연대기에 남는다.
// - 길(paths)은 V(g).paths에 해를 적는다. 거절한 길은 seen에 'path:id'로 적어 다시 묻지 않는다.
import { HOOKS } from '../hooks.js';
import { defineScene, queueScene, sceneQueued, L, stress, note, chron } from '../adventure/core.js';
import { PLACES } from '../places.js';
import { J } from '../narrative/text.js';
import { active as crisisActive, deed } from '../crisis/core.js';
import { V, vocOfJob, addFame, fameOf, skillV, takePath, hasPath, leaveWork, Q, mi, pickOf, gradeOf } from './core.js';

/* ---------- 큰일 ---------- */
export const PROJECTS = {
  ballad: { voc: 'bard', name: '긴 노래', need: 12, kind: '노래' },
  book: { voc: 'teacher', name: '책', need: 16, kind: '책' },
  elixir: { voc: 'alchemy', name: '긴 숨의 영약', need: 10, kind: '처방' },
  stone: { voc: 'alchemy', name: '현자의 돌', need: 24, kind: '대작' },
  build: { voc: 'builder', name: '큰 건축', need: 20, kind: '건물' },
};
export function startProject(g, id, name, data = {}) {
  V(g).project = { id, voc: PROJECTS[id].voc, name, prog: 0, need: PROJECTS[id].need, started: mi(g), ...data };
}
// 그 갈래 일을 한 번 할 때마다
export function advanceProject(g, rng, voc) {
  const v = V(g);
  const pj = v.project;
  if (!pj || pj.voc !== voc) return '';
  const sk = { bard: 'music', teacher: 'letters', alchemy: 'alchemy', builder: 'building' }[voc];
  pj.prog += 0.7 + skillV(g, sk) / 120 + rng.next() * 0.4;
  if (pj.id === 'stone' && rng.chance(0.04)) {
    g.player.injuries.push({ name: '현자의 돌 실험에 그을린 얼굴', months: 2 });
    pj.prog = Math.max(0, pj.prog - 3); stress(g, 10);
    return '밤의 실험이 터졌다. 석 달 치 공이 연기로 날아갔다.';
  }
  if (pj.prog < pj.need) return rng.chance(0.25) ? `(${Q(pj.name, '은/는')} ${progressWord(pj.prog / pj.need)}.)` : '';
  v.project = null;
  return finishProject(g, rng, pj);
}
export const progressWord = (r) => (r >= 0.8 ? '거의 다 되었다' : r >= 0.5 ? '반을 넘겼다' : r >= 0.25 ? '뼈대가 섰다' : '이제 막 시작했다');

function finishProject(g, rng, pj) {
  const life = L(g);
  if (pj.id === 'ballad') {
    leaveWork(g, 'bard', '노래', pj.name, 70);
    addFame(g, 'bard', 12); life.renown += 3;
    return `${Q(pj.name, '이/가')} 끝났다. 처음 부른 밤, 주점 사람들은 마지막 절이 끝나도 한참 동안 잔을 들지 않았다. 한 해가 지나기 전에 이 노래는 내가 가 본 적 없는 고장에서도 불렸다.`;
  }
  if (pj.id === 'book') {
    leaveWork(g, 'teacher', '책', pj.name, 70);
    addFame(g, 'teacher', 12); life.renown += 4;
    if (pj.topic === 'forbidden' && rng.chance(0.35)) { stress(g, 15); note(g, `교단이 ${Q(pj.name, '을/를')} 금서로 정했다.`); return `${Q(pj.name, '이/가')} 끝났다. 필사본 열두 권이 팔려 나갔다. 석 달 뒤 교단이 이 책을 금서로 정하고 광장에서 불태웠다. 불태우지 못한 몇 권이 어딘가에 남았다.`; }
    return `${Q(pj.name, '이/가')} 끝났다. 필사공들이 베껴 왕도와 마법도시의 서고로 보냈다. 내가 죽은 뒤에도 누군가 이 책을 펼칠 것이다.`;
  }
  if (pj.id === 'elixir') {
    const v = V(g);
    v.potions = Math.min(20, v.potions + 6);
    g.player.injuries = g.player.injuries.filter((w) => w.mortal);
    leaveWork(g, 'alchemy', '처방', pj.name, 50);
    addFame(g, 'alchemy', 8);
    return `${Q(pj.name, '이/가')} 완성되었다. 한 모금에 묵은 상처의 욱신거림이 가셨다. 여섯 병을 더 만들어 두었다.`;
  }
  if (pj.id === 'stone') {
    const p = 0.3 + Math.max(0, skillV(g, 'alchemy') - 72) / 60;
    if (rng.chance(p)) {
      g.player.money += 400; life.renown += 10; addFame(g, 'alchemy', 20);
      takePath(g, 'philosopher', `${g.player.name}, 현자의 돌을 완성하다. 연금술사들이 그 이름을 받들다.`, 0);
      leaveWork(g, 'alchemy', '대작', '현자의 돌', 90);
      return '스물네 번째 달, 플라스크 바닥에 붉은 결정이 맺혔다. 납 조각이 결정에 닿자 누렇게 물들었다. 손이 떨려 한참을 아무것도 하지 못했다. 마법도시에서 사람들이 찾아오기 시작했다. (은화 400닢)';
    }
    stress(g, 25);
    note(g, '현자의 돌을 만들려다 실패했다.');
    return '마지막 가열에서 결정이 잿빛으로 무너졌다. 두 해가 재가 되었다. 공방 바닥에 앉아 해가 질 때까지 일어나지 못했다. 다시 시작할 수는 있다. 할지는 모르겠다.';
  }
  if (pj.id === 'build') {
    g.player.money += 150; life.renown += 5; addFame(g, 'builder', 12);
    leaveWork(g, 'builder', '건물', pj.name, 80);
    if (!hasPath(g, 'master_builder')) takePath(g, 'master_builder', null, 0);
    return `${Q(pj.name, '이/가')} 섰다. 낙성식 날 사람들이 올려다보았다. 돌 하나하나에 내 손자국이 있다. 백 년 뒤에도 서 있을 것이다. (은화 150닢)`;
  }
  return '';
}

/* ---------- 갈림길 ---------- */
// { id, voc, when(g), title, text(g), choices(g) [{label,key}], resolve(g, rng, key) } — 'no' 키는 거절로 친다
export const PATHS = [
  {
    id: 'royal_physician', voc: 'healer',
    when: (g) => skillV(g, 'healing') >= 70 && fameOf(g, 'healer') >= 35,
    title: '왕궁에서 온 서신',
    text: () => '왕실 문장이 찍힌 서신이 왔다. 늙은 시의가 세상을 떠났다. 왕가의 몸을 맡을 의원을 찾는다. 왕도에 머물러야 하고, 왕가의 비밀을 무덤까지 가져가야 한다.',
    choices: () => [{ label: '왕도로 가서 시의가 된다', key: 'yes' }, { label: '내 환자들을 두고 갈 수 없다', key: 'no' }],
    resolve(g) {
      takePath(g, 'royal_physician', `${g.player.name}, 왕실 시의가 되다.`, 5);
      L(g).job.place = 'leocast';
      return `왕실 시의의 검은 띠를 받았다. 이제 일터는 왕도의 궁이다.${L(g).place === 'leocast' ? '' : ' 왕도로 가야 일을 할 수 있다.'} 달마다 궁에서 녹봉이 나온다.`;
    },
  },
  {
    id: 'plague_doctor', voc: 'healer',
    when: (g) => !!g.world?.plague && skillV(g, 'healing') >= 40,
    title: '역병 구역',
    text: (g) => `${PLACES[L(g).place]?.name ?? '이 고장'}의 성벽 밑 동네를 막았다. 안에는 잿빛 열병 환자가 수백이다. 들어갈 의원을 찾는다. 들어간 의원 셋 중 하나는 나오지 못했다.`,
    choices: () => [{ label: '새부리 가면을 쓰고 들어간다', key: 'yes' }, { label: '들어가지 않는다', key: 'no' }],
    resolve(g, rng) {
      addFame(g, 'healer', 12); L(g).renown += 3; V(g).patients += rng.int(8, 20);
      if (crisisActive(g)) deed(g, 'hero', 3);
      takePath(g, 'plague_doctor', `${g.player.name}, 역병 구역에 들어가 환자들을 돌보다.`, 2);
      if (rng.chance(0.25)) { g.player.injuries.push({ name: '역병 구역에서 옮은 열병', months: 3 }); stress(g, 18); return '두 달을 구역 안에서 보냈다. 나올 때 나는 열에 들떠 있었다. 살아남았다. 내가 돌본 사람들 가운데 반이 살아남았다. 사람들은 나를 "새부리 의원"이라 불렀다.'; }
      stress(g, 10);
      return '두 달을 구역 안에서 보냈다. 수없이 묻고, 그보다 조금 더 많이 살렸다. 나올 때 문지기가 모자를 벗었다. 사람들은 나를 "새부리 의원"이라 불렀다.';
    },
  },
  {
    id: 'court_bard', voc: 'bard',
    when: (g) => skillV(g, 'music') >= 65 && fameOf(g, 'bard') >= 40,
    title: '궁정의 부름',
    text: () => '왕비의 잔치에서 노래할 시인을 찾는다며 궁정 시종이 왔다. 마음에 들면 궁정 시인으로 남게 될 것이다. 궁정의 노래는 주점의 노래와 다르다. 비꼬는 노래는 부를 수 없다.',
    choices: () => [{ label: '궁정 시인이 된다', key: 'yes' }, { label: '주점의 노래꾼으로 남는다', key: 'no' }],
    resolve(g) {
      takePath(g, 'court_bard', `${g.player.name}, 궁정 시인이 되다.`, 4);
      L(g).job.place = 'leocast';
      return `왕비의 잔치에서 세 곡을 불렀다. 넷째 곡을 청받았다. 이제 일터는 왕도의 궁이다.${L(g).place === 'leocast' ? '' : ' 왕도로 가야 노래할 수 있다.'} 달마다 녹봉이 나온다.`;
    },
  },
  {
    id: 'ballad', voc: 'bard', repeat: true,
    when: (g) => skillV(g, 'music') >= 45 && !V(g).project && V(g).works.filter((w) => w.kind === '노래').length < 3,
    title: '긴 노래를 짓다',
    text: () => '주점의 짧은 노래로는 담을 수 없는 이야기가 있다. 몇 달을 들여 긴 노래 하나를 짓기로 마음먹었다. 무엇을 노래할까.',
    choices: (g) => [
      ...(L(g).renown >= 15 ? [{ label: '내가 걸어온 길을 노래한다', key: 'self' }] : []),
      { label: '봉인을 건 옛 용사들을 노래한다', key: 'hero' },
      { label: '잃어버린 사람을 노래한다', key: 'love' },
      { label: '전쟁에서 돌아오지 못한 이들을 노래한다', key: 'war' },
      { label: '아직은 아니다', key: 'no' },
    ],
    resolve(g, rng, key) {
      const name = { self: `${g.player.name}의 노래`, hero: pickOf(rng, ['봉인의 일곱 밤', '용사의 마지막 겨울']), love: pickOf(rng, ['돌아오지 않는 배', '느티나무 아래에서']), war: pickOf(rng, ['국경의 까마귀', '이름 없는 언덕']) }[key];
      startProject(g, 'ballad', name);
      return `${Q(name, '을/를')} 짓기 시작했다. 노래하러 갈 때마다 한 절씩 다듬을 것이다.`;
    },
  },
  {
    id: 'school', voc: 'teacher',
    when: (g) => L(g).job?.id === 'tutor' && skillV(g, 'letters') >= 55 && V(g).students >= 6 && g.player.money >= 200 && !V(g).school,
    title: '학당을 세우다',
    text: () => '빌린 방에서 가르치기엔 아이들이 너무 많아졌다. 은화 200닢이면 낡은 곡물 창고를 사서 학당으로 고칠 수 있다. 내 이름이 걸린 학당이다.',
    choices: () => [{ label: '은화 200닢을 들여 학당을 세운다', key: 'yes' }, { label: '아직은 이르다', key: 'no' }],
    resolve(g) {
      const v = V(g);
      g.player.money -= 200;
      const name = `${PLACES[L(g).place].name} ${g.player.name} 학당`;
      v.school = { place: L(g).place, name, year: g.date.year };
      takePath(g, 'school', null, 3);
      leaveWork(g, 'teacher', '학당', name, 80);
      return `${Q(name, '이/가')} 문을 열었다. 첫날 아이 스물둘이 왔다. 달마다 학비가 들어온다. 내가 없어도 학당은 남을 것이다.`;
    },
  },
  {
    id: 'book', voc: 'teacher', repeat: true,
    when: (g) => skillV(g, 'letters') >= 50 && !V(g).project && V(g).works.filter((w) => w.kind === '책').length < 3,
    title: '책을 쓰다',
    text: () => '평생 읽기만 했다. 이제 쓸 차례다. 몇 달, 어쩌면 몇 해가 걸릴 것이다. 무엇을 쓸까.',
    choices: (g) => [
      { label: '레오니아 왕국의 연대기', key: 'chron' },
      ...(skillV(g, 'herbs') >= 30 || skillV(g, 'healing') >= 30 ? [{ label: '병과 약초의 책', key: 'herb' }] : []),
      ...(skillV(g, 'magic') >= 30 ? [{ label: '서클 마법의 이치', key: 'magic' }] : []),
      ...(g.flags?.forbidden_scroll ? [{ label: '봉인된 서가에서 베낀 것들', key: 'forbidden' }] : []),
      { label: '아직은 아니다', key: 'no' },
    ],
    resolve(g, rng, key) {
      const name = { chron: pickOf(rng, ['레오니아 연대기 주해', '왕들의 그림자']), herb: pickOf(rng, ['들풀 의서', '열병과 약초에 관하여']), magic: pickOf(rng, ['서클의 이치', '마력의 물길에 관하여']), forbidden: pickOf(rng, ['봉인 아래의 글', '검은 바다의 주석']) }[key];
      startProject(g, 'book', name, { topic: key });
      return `${Q(name, '을/를')} 쓰기 시작했다. 첫 장을 쓰는 데 한 달이 걸렸다.`;
    },
  },
  {
    id: 'elixir', voc: 'alchemy', repeat: true,
    when: (g) => skillV(g, 'alchemy') >= 50 && !V(g).project && !V(g).works.some((w) => w.name === '긴 숨의 영약'),
    title: '영약의 처방',
    text: () => '스승의 낡은 장부 끝에 반쯤 지워진 처방이 있다. "긴 숨의 영약." 묵은 상처를 낫게 한다고 적혀 있다. 재료를 모으고 달이는 데 몇 달은 걸릴 것이다.',
    choices: () => [{ label: '만들어 본다', key: 'yes' }, { label: '헛된 꿈이다', key: 'no' }],
    resolve(g) { startProject(g, 'elixir', '긴 숨의 영약'); return '재료 목록을 적었다. 절반은 이름만 들어 본 것이다.'; },
  },
  {
    id: 'stone', voc: 'alchemy', repeat: true,
    when: (g) => skillV(g, 'alchemy') >= 72 && fameOf(g, 'alchemy') >= 30 && !V(g).project && !hasPath(g, 'philosopher'),
    title: '현자의 돌',
    text: () => '모든 연금술사가 꿈꾸고, 거의 모두가 거기서 무너진다. 두 해쯤 걸릴 것이다. 실험은 위험하고, 실패하면 아무것도 남지 않는다.',
    choices: () => [{ label: '시작한다', key: 'yes' }, { label: '그 꿈은 젊은 날에 두고 왔다', key: 'no' }],
    resolve(g) { startProject(g, 'stone', '현자의 돌'); return '공방 안쪽 방을 비웠다. 그 방에는 아무도 들이지 않기로 했다.'; },
  },
  {
    id: 'build', voc: 'builder', repeat: true,
    when: (g) => skillV(g, 'building') >= 60 && !V(g).project && V(g).works.filter((w) => w.kind === '건물').length < 3,
    title: '큰 공사',
    text: (g) => `${PLACES[L(g).place]?.name ?? '이 고장'}에서 큰 공사를 맡을 우두머리를 찾는다. 몇 해가 걸릴 일이다. 한 번 서면 사람의 일생보다 오래 남는다.`,
    choices: (g) => {
      const pl = L(g).place;
      const opts = [];
      if (['solaris', 'leocast', 'harfen'].includes(pl)) opts.push({ label: '신전의 종탑을 올린다', key: 'tower' });
      if (['graubel', 'eisen', 'gorge', 'verden'].includes(pl)) opts.push({ label: '성벽의 망루를 쌓는다', key: 'wall' });
      if (['klein', 'portel', 'saltmare'].includes(pl)) opts.push({ label: '부두와 큰 배를 짓는다', key: 'ship' });
      opts.push({ label: '강을 건너는 돌다리를 놓는다', key: 'bridge' });
      opts.push({ label: '마을 회관을 짓는다', key: 'hall' });
      opts.push({ label: '맡지 않는다', key: 'no' });
      return opts;
    },
    resolve(g, rng, key) {
      const pn = PLACES[L(g).place]?.name ?? '';
      const name = { tower: `${pn} 신전 종탑`, wall: `${pn} 북쪽 망루`, ship: `${pn} 새 부두`, bridge: `${pn} 돌다리`, hall: `${pn} 회관` }[key];
      startProject(g, 'build', name);
      return `${Q(name, '을/를')} 맡았다. 첫 돌을 놓는 날, 사람들이 모여 술을 나눴다.`;
    },
  },
];

defineScene('voc_path', {
  need: (g, s) => { const p = PATHS.find((x) => x.id === s.path); return !!p && !!L(g).job && vocOfJob(L(g).job.id) === p.voc; },
  title: (g, s) => PATHS.find((p) => p.id === s.path).title,
  text: (g, s) => PATHS.find((p) => p.id === s.path).text(g),
  choices: (g, s) => PATHS.find((p) => p.id === s.path).choices(g),
  resolve(g, rng, s, key) {
    const p = PATHS.find((x) => x.id === s.path);
    const v = V(g);
    if (key === 'no') {
      if (!p.repeat) { v.seen.push(`path:${p.id}`); return '거절했다. 그 길은 다른 사람의 것이 될 것이다.'; }
      v.pathCool = mi(g) + 24;
      return '마음 한쪽에 접어 두었다. 때가 오면 다시 펼칠 것이다.';
    }
    return p.resolve(g, rng, key);
  },
});

// 일한 뒤에 부른다. 맞는 길이 있으면 한 번 띄운다.
export function maybePath(g, rng, voc) {
  const v = V(g);
  if (sceneQueued(g, 'voc_path') || sceneQueued(g, 'voc_event')) return false;
  if (!rng.chance(0.2)) return false;
  const pool = PATHS.filter((p) => p.voc === voc && !hasPath(g, p.id) && !v.seen.includes(`path:${p.id}`) && !(p.repeat && mi(g) < (v.pathCool ?? 0)) && p.when(g));
  if (!pool.length) return false;
  queueScene(g, 'voc_path', { path: pickOf(rng, pool).id });
  return true;
}

/* ---------- 달마다: 녹봉, 학당, 옛 제자 ---------- */
HOOKS.afterMonth.push((g, rng) => {
  if (g.over || !g.player) return;
  const v = V(g);
  const job = L(g).job?.id;
  if (hasPath(g, 'royal_physician') && job === 'physician') g.player.money += 14;
  if (hasPath(g, 'court_bard') && job === 'bard') g.player.money += 9;
  if (v.school) {
    const n = 3 + gradeOf(skillV(g, 'letters'));
    g.player.money += n;
    if (rng.chance(0.03)) v.students += 1;
  }
  if (v.gifted && !v.gifted.done && g.date.year - v.gifted.year >= 10) {
    v.gifted.done = true;
    addFame(g, 'teacher', 8);
    note(g, `내게 글을 배운 ${J(v.gifted.name, '이/가')} 왕도 학당의 학자가 되었다는 소식을 들었다.`);
    chron(g, `${v.gifted.name}, 방앗간 막내에서 왕도의 학자가 되다. 스승은 ${g.player.name}.`, 40);
  }
});
