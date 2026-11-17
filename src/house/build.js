// 짓기: 오두막 짓기, 집 짓기, 오두막을 집으로 고쳐 짓기, 판 옛 집 되사기. 공사는 달을 넘겨 이어지고, 그 사이 일이 생긴다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, gains, up } from '../adventure/core.js';
import { E } from '../estate/core.js';
import { villageState } from '../village/index.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { H, mi, clamp, here, placeName, free, stat, valueAt, hutOk, recOf, houseName, logHouse, kindWord } from './core.js';

// 공사 종류: 값은 그 고장 집값의 몇 할, 몇 달, 다 지은 집의 처음 상태
export const BUILDS = {
  hut: { name: '오두막', share: 0.4, months: 3, cond: 45 },
  house: { name: '집', share: 0.75, months: 6, cond: 85 },
  rebuild: { name: '고쳐 짓는 집', share: 0.45, months: 4, cond: 80 },
};
export const buildCost = (pl, kind) => Math.round(valueAt(pl) * BUILDS[kind].share);
export const buybackCost = (pl) => Math.round(valueAt(pl) * 1.3);
const lostHere = (g) => H(g).lost.find((x) => x.place === here(g) && !L(g).houses.includes(here(g))) ?? null;
const belongRec = (g) => villageState(g).places[here(g)] ?? null;
const canBuild = (g) => playerAge(g) >= 16 && free(g) && !H(g).build;

function options(g) {
  const pl = here(g), out = [], own = L(g).houses.includes(pl), r = recOf(g, pl);
  if (!own && hutOk(pl)) out.push('hut');
  if (!own) out.push('house');
  if (own && r?.kind === 'hut') out.push('rebuild');
  return out;
}

ACTIONS.push({
  id: 'house_build',
  name: '집을 짓는다',
  icon: 'home',
  desc: '터를 사서 오두막이나 집을 짓는다. 사는 것보다 싸지만 몇 달이 걸리고, 그 사이 일이 생긴다. 오두막은 집으로 고쳐 지을 수 있다. 판 옛 집을 되살 수도 있다.',
  available: (g) => canBuild(g) && !sceneQueued(g, 'house_build') && (options(g).length > 0 || !!lostHere(g)),
  run(g) { queueScene(g, 'house_build'); return '빈 터를 보러 다녔다.'; },
});

defineScene('house_build', {
  need: (g) => canBuild(g),
  title: (g) => `${placeName(here(g))}에 집을 짓다`,
  text: (g) => {
    const pl = here(g), lost = lostHere(g), r = recOf(g, pl);
    const lines = [r ? `${placeName(pl)}에는 내 ${kindWord(g, pl)}, ${J(r.name, '이/가')} 있다.` : `${placeName(pl)}의 집값은 은화 ${valueAt(pl)}닢쯤이다. 터를 사서 지으면 그보다 싸지만 몇 달이 걸린다.`];
    if (!hutOk(pl) && !r) lines.push('이 고장은 터가 비싸 오두막을 지을 데가 없다.');
    if (lost) lines.push(`이 고장에는 ${lost.by}의 ${J(lost.name, '이/가')} 있었다. ${lost.year}년에 ${lost.how}. 지금 주인이 판다면 은화 ${buybackCost(pl)}닢을 달라 할 것이다.`);
    lines.push(`가진 돈은 은화 ${g.player.money}닢.`);
    return lines.join(' ');
  },
  choices: (g) => {
    const pl = here(g), out = [];
    for (const k of options(g)) { const c = buildCost(pl, k); if (g.player.money >= c) out.push({ label: `${k === 'rebuild' ? '오두막을 헐고 집으로 고쳐 짓는다' : `${J(BUILDS[k].name, '을/를')} 짓는다`} (은화 ${c}닢, ${BUILDS[k].months}달)`, key: `b:${k}` }); }
    if (lostHere(g) && g.player.money >= buybackCost(pl)) out.push({ label: `옛 집을 되산다 (은화 ${buybackCost(pl)}닢)`, key: 'buyback' });
    out.push({ label: '돌아선다', key: 'no' });
    return out;
  },
  resolve(g, rng, s, key) {
    const pl = here(g), h = H(g);
    if (key === 'no') return '빈 터에 한참 서 있다가 돌아왔다.';
    if (key === 'buyback') {
      const x = lostHere(g), c = buybackCost(pl);
      if (!x || g.player.money < c) return '그만한 돈이 없었다.';
      g.player.money -= c;
      L(g).houses.push(pl); L(g).home = 'own';
      E(g).homes[pl] = { level: 0, cond: 60, servants: 0 };
      h.homes[pl] = { kind: x.kind === 'hut' ? 'hut' : 'house', name: x.name, built: x.built, by: x.by, rooms: [...(x.rooms ?? [])], gens: (x.gens ?? 1) + 1, lived: 0, marks: [...(x.marks ?? []), '되찾음'] };
      h.lost = h.lost.filter((y) => y !== x);
      note(g, `${placeName(pl)}의 ${J(x.name, '을/를')} 되샀다.`);
      chron(g, `${g.player.name}, ${x.year}년에 잃은 집안의 ${J(x.name, '을/를')} 되찾다.`, 60);
      logHouse(g, `${placeName(pl)}의 ${J(x.name, '을/를')} 되샀다.`);
      stress(g, -8);
      return `문틀에 ${x.by} 때 새긴 칼자국이 아직 남아 있었다. 남의 손을 탄 세월만큼 낡았지만, 내 집안의 ${x.name}이다. 문을 닫고 오래 서 있었다.`;
    }
    const kind = key.slice(2);
    if (!BUILDS[kind] || !options(g).includes(kind)) return '지을 수 있는 형편이 아니었다.';
    const c = buildCost(pl, kind);
    if (g.player.money < c) return `은화 ${c}닢. 지금 가진 돈으로는 모자란다.`;
    g.player.money -= c;
    h.build = { place: pl, kind, left: BUILDS[kind].months, cost: c, cond: BUILDS[kind].cond, events: 0, started: mi(g), name: houseName(rng.int(0, 99)) };
    logHouse(g, `${placeName(pl)}에 ${J(BUILDS[kind].name, '을/를')} 짓기 시작했다.`);
    tired(g, 6);
    return kind === 'hut'
      ? '마을 끝 빈 터를 샀다. 말뚝을 박고 줄을 띄웠다. 흙벽돌을 찍을 흙부터 날라야 한다.'
      : kind === 'rebuild'
        ? '오두막 지붕을 걷어 냈다. 쓸 만한 기둥은 남기고, 돌로 주춧돌을 새로 놓는다.'
        : '목수를 불러 터를 보였다. 목수는 땅을 몇 번 밟아 보더니 여섯 달이면 된다고 했다. 다들 그렇게 말한다.';
  },
});

/* ---------- 공사: 달마다 줄고, 일이 생긴다 ---------- */
const WORK = ['help', 'cheat', 'short', 'accident'];
HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const h = H(g), b = h.build;
  if (!b) return;
  const there = here(g) === b.place && free(g);
  b.left -= there ? 1 : 0.5; // 자리를 비우면 목수 혼자라 느리다
  if (b.left <= 0) { finish(g, rng, b); return; }
  if (there && b.events < 2 && !sceneQueued(g, 'house_work') && rng.chance(0.45)) { b.events += 1; queueScene(g, 'house_work', { ev: rng.pick(WORK) }); }
});

function finish(g, rng, b) {
  const h = H(g), pl = b.place, life = L(g);
  h.build = null; h.built += 1;
  if (b.kind === 'rebuild') {
    const r = recOf(g, pl);
    if (r) { r.kind = 'house'; r.marks.push('고쳐 지음'); }
    const e = E(g).homes[pl]; if (e) e.cond = Math.max(e.cond, b.cond);
    note(g, `${placeName(pl)}의 오두막을 집으로 고쳐 지었다.`);
    logHouse(g, `${placeName(pl)}의 오두막을 집으로 고쳐 지었다.`);
    return;
  }
  if (!life.houses.includes(pl)) life.houses.push(pl);
  E(g).homes[pl] = { level: 0, cond: clamp(b.cond, 10, 100), servants: 0 };
  h.homes[pl] = { kind: b.kind === 'hut' ? 'hut' : 'house', name: b.name, built: g.date.year, by: g.player.name, rooms: [], gens: 1, lived: 0, marks: [] };
  if (here(g) === pl && !life.travel && life.home !== 'barracks') life.home = 'own';
  note(g, `${placeName(pl)}에 내 손으로 ${J(BUILDS[b.kind].name, '을/를')} 지었다. 이름은 ${b.name}.`);
  chron(g, `${g.player.name}, ${placeName(pl)}에 ${J(b.name, '을/를')} 짓다.`, 40);
  logHouse(g, `${placeName(pl)}에 ${J(b.name, '을/를')} 다 지었다.`);
  if (here(g) === pl && free(g)) queueScene(g, 'house_warm', {});
}

defineScene('house_work', {
  need: (g, s) => { const b = H(g).build; return !!b && b.place === here(g) && free(g) && WORK.includes(s.ev) && !!BUILDS[b.kind]; },
  title: () => '공사판',
  text: (g, s) => {
    const b = H(g).build;
    return {
      help: `${BUILDS[b.kind].name} 벽이 무릎 높이까지 올라왔다. 이웃 몇이 담 너머로 들여다보며 일손이 모자라 보인다고 했다.`,
      cheat: `목수가 장부를 내밀었다. 재목값이 처음 말한 것보다 은화 ${Math.round(b.cost * 0.15)}닢이 더 붙어 있다. 재목상 아들이 목수의 처남이라는 말을 들은 적이 있다.`,
      short: '쌓아 둔 재목이 모자란다. 강 위쪽 벌목장에 큰비가 와서 뗏목이 내려오지 않는다고 한다.',
      accident: '발판이 삐걱거렸다. 위에서 기와를 받던 일꾼이 비틀거렸다.',
    }[s.ev];
  },
  choices: (g, s) => {
    const b = H(g).build, extra = Math.round(b.cost * 0.15);
    if (s.ev === 'help') return [...(g.player.money >= 5 ? [{ label: '술과 고기를 내고 이웃 일손을 빈다 (은화 5닢)', key: 'feast' }] : []), { label: '혼자 한다', key: 'alone' }];
    if (s.ev === 'cheat') return [{ label: '장부를 들고 따진다', key: 'argue' }, ...(g.player.money >= extra ? [{ label: `그냥 준다 (은화 ${extra}닢)`, key: 'pay' }] : []), { label: '목수를 바꾼다', key: 'swap' }];
    if (s.ev === 'short') return [...(g.player.money >= 15 ? [{ label: '비싼 마른 재목을 산다 (은화 15닢)', key: 'buy' }] : []), { label: '뗏목이 올 때까지 기다린다', key: 'wait' }, { label: '헌 집 뜯은 재목을 쓴다', key: 'old' }];
    return [{ label: '뛰어가 발판을 붙잡는다', key: 'catch' }, { label: '소리쳐 내려오라고 한다', key: 'shout' }];
  },
  resolve(g, rng, s, key) {
    const b = H(g).build;
    if (!b) return '공사는 이미 끝나 있었다.';
    const vr = belongRec(g);
    if (key === 'feast') {
      if (g.player.money < 5) return '내놓을 돈이 없었다.';
      g.player.money -= 5; b.left -= 1;
      if (vr) vr.belong = clamp(vr.belong + 3, 0, 100);
      return '다음 날 아침 이웃 여섯이 연장을 들고 왔다. 하루 만에 벽이 다 올라갔다. 저녁 마당에 술독이 비었다.';
    }
    if (key === 'alone') { tired(g, 10); const st = gainStat(g, 'str', 0.4); return `혼자 흙벽돌을 날랐다. 손바닥이 다 까졌다.${gains([up('힘', st)])}`; }
    if (key === 'argue') {
      if (check(rng, stat(g, 'cha') * 0.6 + stat(g, 'int') * 0.5, 40)) return '장부 한 줄 한 줄을 짚었다. 목수가 얼굴을 붉히더니 웃돈을 거두었다.';
      b.cond -= 10; return '목수는 끝까지 우겼다. 웃돈을 안 주자 그 뒤로 일을 대충 했다. 기둥 하나가 비뚤다.';
    }
    if (key === 'pay') { const extra = Math.round(b.cost * 0.15); if (g.player.money < extra) return '줄 돈이 모자랐다.'; g.player.money -= extra; return '말없이 웃돈을 쳐 주었다. 목수는 그 뒤로 일을 꼼꼼히 했다. 그 값이었나 보다.'; }
    if (key === 'swap') { b.left += 1; return '목수를 내보내고 이웃 고장 목수를 불렀다. 처음부터 다시 재 보느라 한 달이 늦어졌다.'; }
    if (key === 'buy') { if (g.player.money < 15) return '재목 살 돈이 없었다.'; g.player.money -= 15; return '비싼 마른 재목을 샀다. 공사는 늦어지지 않았다.'; }
    if (key === 'wait') { b.left += 1; return '한 달을 기다렸다. 그 사이 빈 터에 잡초가 자랐다.'; }
    if (key === 'old') { b.cond -= 15; return '헌 집에서 뜯은 재목을 썼다. 벌레 먹은 자국이 군데군데 있다. 오래 갈지는 모르겠다.'; }
    if (key === 'catch') {
      if (check(rng, stat(g, 'str') * 0.5 + stat(g, 'agi') * 0.5, 40)) { deed(g, 'brave', 2, '공사판에서 떨어지는 일꾼을 붙잡았다.'); return '발판을 붙잡고 버텼다. 일꾼이 기와를 안고 내려왔다. 둘 다 한참 웃었다.'; }
      g.player.injuries.push({ name: '공사판에서 다친 팔', months: 2 });
      return '발판과 함께 넘어졌다. 일꾼은 무사했지만 내 팔이 부었다.';
    }
    stress(g, 3); b.left += 0.5;
    return '일꾼은 겨우 내려왔다. 발판을 다시 짜느라 며칠이 갔다.';
  },
});

/* ---------- 집들이 ---------- */
defineScene('house_warm', {
  need: (g) => free(g) && L(g).houses.includes(here(g)),
  title: (g) => `${recOf(g, here(g))?.name ?? '새 집'}의 집들이`,
  text: (g) => `${J(recOf(g, here(g)).name, '이/가')} 다 지어졌다. 문틀에서 아직 송진 냄새가 난다. 이웃들이 슬쩍슬쩍 들여다본다.`,
  choices: (g) => [...(g.player.money >= 15 ? [{ label: '마당에 상을 차려 크게 집들이를 한다 (은화 15닢)', key: 'big' }] : []), { label: '가까운 사람들만 불러 조촐히 먹는다', key: 'small' }, { label: '조용히 들어가 산다', key: 'none' }],
  resolve(g, rng, s, key) {
    const vr = belongRec(g);
    if (key === 'big') {
      if (g.player.money < 15) return '상 차릴 돈이 없었다. 조용히 들어갔다.';
      g.player.money -= 15; stress(g, -8);
      if (vr) vr.belong = clamp(vr.belong + 5, 0, 100);
      return '마당에 상이 셋 차려졌다. 이웃들이 성냥과 소금과 빵을 들고 왔다. 밤늦게 누가 피리를 불었다. 이제 이 고장 사람들이 이 집을 안다.';
    }
    if (key === 'small') { stress(g, -4); if (vr) vr.belong = clamp(vr.belong + 2, 0, 100); return '화덕에 첫 불을 지피고 가까운 사람 몇과 국을 나눠 먹었다.'; }
    return '짐을 풀고 첫날 밤을 혼자 보냈다. 낯선 나무 냄새 속에서 오래 잠들지 못했다.';
  },
});
