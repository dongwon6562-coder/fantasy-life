// 검술 세 유파와 등급. 입문 → 숙련 → 상급 → 검성 → 검왕 (검신은 살아 있는 사람이 없다).
// - 유파는 스승에게 들어가야 배운다. 에른에서는 기사 가문의 아버지(유수류)나 마을 모험가(환영류),
//   하르펜·베르덴·왕도에는 도장과 기사단이 있다.
// - 승급은 검술 실력이 차면 스승과의 대련(결투 모드)으로 인정받는다.
// - 검성부터는 검에 마력을 싣는다. 마력이 없으면 의지로 닿을 수도 있지만 훨씬 드물다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { byId, living } from '../npc.js';
import { placePerson } from '../places.js';
import { remember } from '../relations.js';
import { queueDuel, registerDuelEnd } from './registry.js';

export const SCHOOLS = {
  yusu: {
    name: '유수류', desc: '상대의 힘을 흘려보내고 받아치는 검. 레오니아 기사단과 성기사의 검이다. 막기와 받아치기가 강하다.',
    labels: { guard: '흘려보내고 받아친다 (유수류 막기)' },
  },
  ganggeom: {
    name: '강검류', desc: '선제 일격에 모든 힘을 싣는 검. 발하르트 제국군과 용병의 검이다. 강공이 무겁다.',
    labels: { heavy: '온몸을 실어 내려친다 (강검류 강공)' },
  },
  hwanyeong: {
    name: '환영류', desc: '속임수와 속도, 어떤 자세에서든 베는 실전 검. 자유도시 모험가와 암살자의 검이다. 허초가 날카롭고 버릇을 읽히지 않는다.',
    labels: { feint: '그림자처럼 속인다 (환영류 허초)' },
  },
};
export const RANKS = ['입문', '숙련', '상급', '검성', '검왕', '검신'];
// 다음 등급에 도전하려면 필요한 검술
export const RANK_NEED = [0, 30, 55, 80, 95, 101];

export function swordState(g) {
  g.sword ??= { school: null, rank: -1, master: null, tests: 0 };
  return g.sword;
}
export const schoolOf = (g) => g.sword?.school ?? null;
export const rankOf = (g) => g.sword?.rank ?? -1;
export const rankName = (g) => (rankOf(g) >= 0 ? `${SCHOOLS[schoolOf(g)].name} ${RANKS[rankOf(g)]}` : '유파 없음');
const here = (g) => g.life?.place ?? 'ern';
const sexWord = (p) => (p?.sex === 'f' ? '여자' : '남자');

// 지금 있는 곳에서 배울 수 있는 유파와 스승
export function mastersHere(g) {
  const out = [];
  const pl = here(g);
  if (pl === 'ern') {
    const f = byId(g, g.player.familyIds[0]);
    if (f && f.alive && !f.away && f.job === 'old_knight') out.push({ school: 'yusu', id: f.id, name: f.name, skill: Math.max(45, f.skill), who: '아버지' });
    const a = living(g).find((p) => p.job === 'adventurer' && (p.place ?? 'ern') === 'ern' && p.known && p.affection >= 15);
    if (a) out.push({ school: 'hwanyeong', id: a.id, name: a.name, skill: Math.max(30, a.skill * 0.7), who: '모험가' });
  }
  if (pl === 'harfen') {
    const m = placePerson(g, 'harfen', 'sword_master');
    if (m) out.push({ school: 'ganggeom', id: m.id, name: m.name, skill: m.skill, who: '도장 사범' });
    const r = placePerson(g, 'harfen', 'guildmaster');
    if (r) out.push({ school: 'hwanyeong', id: r.id, name: r.name, skill: r.skill, who: '길드장' });
  }
  if (pl === 'verden') {
    const k = placePerson(g, 'verden', 'knight_captain');
    if (k) out.push({ school: 'yusu', id: k.id, name: k.name, skill: k.skill, who: '기사단장' });
  }
  if (pl === 'leocast') {
    const k = placePerson(g, 'leocast', 'knight_captain');
    if (k) out.push({ school: 'yusu', id: k.id, name: k.name, skill: k.skill, who: '근위 기사단장' });
    const m = placePerson(g, 'leocast', 'sword_master');
    if (m) out.push({ school: 'ganggeom', id: m.id, name: m.name, skill: m.skill, who: '왕도 도장주' });
    const b = placePerson(g, 'leocast', 'gang_boss');
    if (b) out.push({ school: 'hwanyeong', id: b.id, name: b.name, skill: b.skill, who: '뒷골목의 검객' });
  }
  return out;
}
// 지금 있는 곳에서 내 유파를 가르쳐 줄 사람 (처음 스승이 아니어도 같은 유파면 된다)
const myMaster = (g) => mastersHere(g).find((m) => m.school === schoolOf(g)) ?? null;

// ---------- 행동 ----------
ACTIONS.push(
  {
    id: 'sword_school_join', name: '유파에 입문하기', icon: 'sword',
    desc: '스승을 찾아가 검의 유파에 든다. 유수류·강검류·환영류 중 이곳에서 가르치는 것을 고른다. 다른 유파로 옮기면 등급은 처음부터다.',
    available: (g) => playerAge(g) >= 8 && !g.life?.travel && mastersHere(g).some((m) => m.school !== schoolOf(g)) && !g.swordJoinQueued,
    run(g) {
      g.swordJoinQueued = true;
      return '검을 가르칠 사람을 찾아 나섰다.';
    },
  },
  {
    id: 'sword_school_train', name: '도장 수련', icon: 'sword',
    desc: '유파의 스승 밑에서 형과 대련을 익힌다. 혼자 휘두르는 것보다 훨씬 빨리 는다.',
    available: (g) => rankOf(g) >= 0 && !g.life?.travel && !!myMaster(g),
    run(g, rng) {
      const m = myMaster(g);
      g.player.fatigue = Math.min(100, g.player.fatigue + 15);
      const bonus = 1.4 + Math.min(0.8, m.skill / 100);
      const k = gainSkill(g, 'sword', bonus, schoolOf(g) === 'ganggeom' ? 'str' : schoolOf(g) === 'hwanyeong' ? 'agi' : 'wil');
      const st = gainStat(g, schoolOf(g) === 'ganggeom' ? 'str' : schoolOf(g) === 'hwanyeong' ? 'agi' : 'wil', 0.4);
      const p = byId(g, m.id); if (p) { p.known = true; p.affection += 1; }
      const line = {
        yusu: ['같은 받아치기를 백 번. 스승은 백한 번째에야 고개를 끄덕였다.', '스승의 목검이 내 힘을 흘려 내 등 뒤로 보냈다. 몇 번을 넘어져도 어떻게 된 건지 알 수 없었다.'],
        ganggeom: ['통나무를 내려치고 또 내려쳤다. 손바닥이 터졌다. "망설이면 죽는다."', '사범은 첫 일격에 모든 것을 실으라고 했다. 두 번째는 없다고.'],
        hwanyeong: ['눈을 가리고 방울 소리만으로 피하는 수련을 했다. 멍이 열두 군데 생겼다.', '"칼은 보여 주는 게 아니다. 보여 주는 척하는 거지." 스승이 웃으며 내 허리띠를 베어 떨어뜨렸다.'],
      }[schoolOf(g)];
      return `${m.who} ${m.name}에게 ${SCHOOLS[schoolOf(g)].name}를 배웠다. ${rng.pick(line)} (검술 +${k.toFixed(1)}${st > 0.04 ? `, 몸 +${st.toFixed(1)}` : ''})`;
    },
  },
  {
    id: 'sword_rank_test', name: '승급 대련 청하기', icon: 'shield',
    desc: '스승에게 다음 등급을 인정받기 위한 대련을 청한다. 목검이지만 봐주지 않는다.',
    available: (g) => {
      const r = rankOf(g);
      if (r < 0 || r >= 4 || g.duelQueued || g.life?.travel) return false;
      if (g.player.skills.sword < RANK_NEED[r + 1]) return false;
      if (r + 1 === 3 && !(g.player.manaAwakened && g.player.mana >= 40) && g.player.stats.wil < 75) return false;
      if (r + 1 === 4 && here(g) !== 'leocast') return false;
      return !!myMaster(g);
    },
    run(g, rng) {
      const m = myMaster(g);
      const r = rankOf(g) + 1;
      const foeSkill = r >= 4 ? 96 : Math.max(m.skill, RANK_NEED[r] + 8);
      queueDuel(g, {
        kind: 'rank_test', title: `${RANKS[r]} 승급 대련`,
        intro: r >= 3
          ? `${m.who} ${m.name}이(가) 진검을 내밀었다. "${RANKS[r]}은 목검으로 인정하지 않는다. 검에 마력을 실어 봐라. 실을 수 있다면."`
          : `${m.who} ${m.name}이(가) 목검을 던져 주었다. "${RANKS[r]}이라. 내 앞에서 세 번 버텨 봐라."`,
        foe: { name: m.name, skill: foeSkill, style: { yusu: 'steady', ganggeom: 'bold', hwanyeong: 'tricky' }[schoolOf(g)], id: m.id, aura: r >= 3 },
        ctx: { rank: r, masterId: m.id },
      });
      return `${m.name}에게 ${RANKS[r]} 승급 대련을 청했다.`;
    },
  },
  {
    id: 'sword_spar', name: '대련하기', icon: 'sword',
    desc: '검을 쓰는 아는 사람에게 목검 대련을 청한다. 낌새를 읽고 수를 고르는 1대1 결투다.',
    available: (g) => playerAge(g) >= 10 && !g.duelQueued && !g.life?.travel && sparPartners(g).length > 0,
    run(g, rng) {
      const p = rng.pick(sparPartners(g));
      queueDuel(g, {
        kind: 'spar', title: '목검 대련',
        intro: `${p.name}이(가) 목검 두 자루를 들고 나왔다. "봐주지 않는다."`,
        foe: { name: p.name, skill: sparSkill(p), style: styleOf(p), id: p.id },
        ctx: { id: p.id },
      });
      return `${p.name}에게 대련을 청했다.`;
    },
  },
);

const SWORD_JOBS = ['guard', 'adventurer', 'old_knight', 'knight', 'knight_captain', 'sword_master', 'hunter', 'guildmaster', 'gang_boss'];
export function sparPartners(g) {
  return living(g).filter((p) => !p.isPlayer && p.known && p.affection >= 10 && SWORD_JOBS.includes(p.job)
    && (p.place ?? 'ern') === here(g) && p.ageMonths >= 15 * 12 && p.ageMonths < 60 * 12);
}
export function sparSkill(p) {
  const base = { hunter: 0.4, guard: 0.6, adventurer: 0.7, old_knight: 0.8, knight: 0.85, guildmaster: 0.9, gang_boss: 0.85, sword_master: 1, knight_captain: 1 }[p.job] ?? 0.4;
  return Math.round(8 + p.skill * base);
}
export function styleOf(p) {
  const t = p.traits ?? [];
  if (t.includes('brave') || t.includes('cruel')) return 'bold';
  if (t.includes('reserved') || t.includes('diligent')) return 'steady';
  if (t.includes('greedy') || t.includes('gossip') || t.includes('ambitious')) return 'tricky';
  return 'swift';
}

// ---------- 입문 고르기 (달 끝 사건) ----------
import { EVENTS } from '../events/core.js';
EVENTS.push({
  id: 'sword_join', once: true, noFlag: true, weight: 98,
  cond: (g) => !!g.swordJoinQueued && mastersHere(g).some((m) => m.school !== schoolOf(g)),
  title: '스승 찾기',
  text: (g) => {
    const ms = mastersHere(g).filter((m) => m.school !== schoolOf(g));
    if (!ms.length) return '이곳에는 검을 가르쳐 줄 사람이 보이지 않는다.';
    return '검을 가르쳐 줄 만한 사람들을 떠올려 본다.\n\n' + ms.map((m) => `${SCHOOLS[m.school].name}: ${m.who} ${m.name}. ${SCHOOLS[m.school].desc}`).join('\n\n') + (rankOf(g) >= 0 ? `\n\n지금은 ${rankName(g)}이다. 유파를 옮기면 등급은 처음부터다.` : '');
  },
  choices: [0, 1, 2].map((i) => ({
    label: (g) => { const m = mastersHere(g).filter((x) => x.school !== schoolOf(g))[i]; return m ? `${SCHOOLS[m.school].name} (${m.who} ${m.name})` : ''; },
    show: (g) => !!mastersHere(g).filter((m) => m.school !== schoolOf(g))[i],
    run: (g) => {
      g.swordJoinQueued = false;
      const m = mastersHere(g).filter((x) => x.school !== schoolOf(g))[i];
      if (!m) return '스승을 찾지 못했다.';
      const s = swordState(g);
      s.school = m.school; s.rank = 0; s.master = m.id;
      const p = byId(g, m.id);
      if (p) { p.known = true; p.affection += 5; remember(g, p, '검을 배우겠다며 찾아왔다', 1, { tag: 'pupil' }); }
      return `${m.who} ${m.name} 앞에 무릎을 꿇었다. 그날부터 ${SCHOOLS[m.school].name}의 문하생이다. ${{ yusu: '"먼저 베지 마라. 흘리고, 받아라."', ganggeom: '"첫 칼에 모든 걸 실어라. 두 번째는 없다."', hwanyeong: '"정직한 검은 일찍 죽는다."' }[m.school]}`;
    },
  })).concat([{ label: '그만둔다', run: (g) => { g.swordJoinQueued = false; return '아직은 때가 아니라고 생각했다.'; } }]),
});
// ---------- 결투가 끝났을 때 ----------
registerDuelEnd('rank_test', (g, rng, won, d) => {
  const s = swordState(g);
  const p = byId(g, d.ctx.masterId);
  s.tests += 1;
  if (!won) { if (p) remember(g, p, '승급 대련에서 내게 졌다', 0, { tag: 'rank_test' }); return `"아직이다." ${josa2(d.foe.name)} 목검을 거두었다. "하지만 지난번보다는 낫군."`; }
  s.rank = d.ctx.rank;
  if (p) { p.affection += 6; remember(g, p, `${RANKS[s.rank]} 승급을 인정받았다`, 1, { tag: 'rank_test' }); }
  g.chronicle.push({ y: g.date.year, m: g.date.month, text: `${g.player.name}, ${rankName(g)}에 오르다.`, rel: 100 });
  if (g.life) g.life.renown = (g.life.renown ?? 0) + [0, 2, 5, 15, 40][s.rank];
  return {
    1: `"숙련이다. 이제 칼을 쥐었다고 말해도 되겠군."`,
    2: `"상급. 이 고장에서 너를 이길 사람은 손에 꼽는다." 스승이 처음으로 술을 따라 주었다.`,
    3: `검이 울었다. 처음으로 마력이 칼날을 타고 흘렀다. 스승이 한참 말이 없다가 고개를 숙였다. "검성이다. 내가 가르칠 것은 끝났다." 이 소식은 왕도까지 퍼질 것이다.`,
    4: `대련이 끝났을 때 도장은 숨소리 하나 없었다. 검왕. 대륙에 몇 없는 이름 옆에 내 이름이 적혔다.`,
  }[s.rank];
});
registerDuelEnd('spar', (g, rng, won, d) => {
  const p = byId(g, d.ctx.id);
  if (p) { p.affection += won ? 2 : 3; remember(g, p, won ? '목검 대련에서 나를 이겼다' : '목검 대련에서 내게 졌다', 0, { tag: 'spar' }); }
  return won ? `${josa2(d.foe.name)} 웃으며 손을 내밀었다. "한 판 더 하자고 하면 거절할 거다."` : `${josa2(d.foe.name)} 목검으로 내 어깨를 툭 쳤다. "발이 늦어. 생각은 맞았는데."`;
});
const josa2 = (n) => { const ch = n.charCodeAt(n.length - 1); return n + ((ch - 0xac00) % 28 ? '이' : '가'); };

// ---------- 저장 ----------
HOOKS.newGame.push((g) => { swordState(g); });
HOOKS.migrate.push((g) => {
  const s = swordState(g);
  // 1단계 사건에서 아버지에게 유수류를 배운 경우
  if (s.school == null && g.flags?.school === 'yusu') { s.school = 'yusu'; s.rank = 0; }
});
HOOKS.heir?.push((g) => { g.sword = { school: null, rank: -1, master: null, tests: 0 }; g.duel = null; g.duelQueued = null; });
// 1단계·2단계 사건에서 유파가 정해지면 따라간다
HOOKS.endOfMonth.push((g) => {
  const s = swordState(g);
  if (s.school == null && g.flags?.school === 'yusu') { s.school = 'yusu'; s.rank = 0; s.master = g.player.familyIds[0]; }
  if (g.swordJoinQueued && !mastersHere(g).some((m) => m.school !== schoolOf(g))) g.swordJoinQueued = false;
});
