// 대 잇기: 플레이어가 죽으면 자식 중 한 명을 골라 이어서 산다.
// 재산(돈, 집, 장비)과 인맥(아는 사람들의 호감 일부), 가문의 이름, 그리고 원수까지 물려받는다.
import { J, hasBatchim } from './narrative/text.js';
import { HOOKS, run as runHooks } from './hooks.js';
import { STATS, SKILLS, JOBS } from './data.js';
import { me, playerAge, family } from './game.js';
import { byId, ageYears, fullName, kill, bodyAgeOf } from './npc.js';
import { L, defineScene, showScene, chron, note, SCENE_ID } from './adventure/core.js';
import { PLACES } from './places.js';
import { WORK, takeJob } from './jobs.js';

/* ---------- 늙어서 죽는다 ---------- */
// 48살부터 조금씩, 60살이 넘으면 눈에 띄게. 피로와 깊은 상처도 수명을 깎는다.
HOOKS.endOfMonth.push((g, rng) => {
  if (g.over || L(g).pendingDeath) return;
  const age = bodyAgeOf(me(g)); // 몸 나이 (오래 사는 종족은 천천히 늙는다)
  if (age < 48) return;
  let risk = (age - 48) * 0.0003 + (age >= 60 ? (age - 60) * 0.001 : 0) + (age >= 72 ? (age - 72) * 0.004 : 0);
  if (g.player.fatigue > 80) risk *= 1.4;
  risk *= 1 + Math.min(3, g.player.injuries.length) * 0.1;
  if (rng.chance(risk)) L(g).pendingDeath = age >= 62 ? '노환' : rng.pick(['병', '가슴의 통증', '겨울 열병']);
});

/* ---------- 죽음과 이을 사람 고르기 ---------- */
export function heirsOf(g) {
  const meP = me(g);
  const ok = (c) => c && c.alive && !c.isPlayer && !c.away;
  const byAge = (a, b) => b.ageMonths - a.ageMonths;
  const kids = meP.childIds.map((id) => byId(g, id)).filter((c) => c && c.alive && !c.isPlayer).sort(byAge);
  if (kids.length) return kids;
  // 자식이 없으면 집안의 다른 핏줄이 잇는다: 먼저 떠난 자식의 아이(손주), 그다음 형제의 아이(조카), 그다음 형제
  const grand = meP.childIds.flatMap((id) => byId(g, id)?.childIds ?? []).map((id) => byId(g, id)).filter(ok).sort(byAge);
  if (grand.length) return grand;
  const parents = [meP.fatherId, meP.motherId].map((id) => byId(g, id)).filter(Boolean);
  const sibs = [...new Set(parents.flatMap((p) => p.childIds ?? []))].filter((id) => id !== meP.id).map((id) => byId(g, id)).filter(Boolean);
  const nephews = sibs.flatMap((s) => s.childIds ?? []).map((id) => byId(g, id)).filter(ok).sort(byAge);
  if (nephews.length) return nephews;
  return sibs.filter(ok).sort((a, b) => a.ageMonths - b.ageMonths);
}

// 이을 사람이 나에게 누구인가 (아들, 손녀, 조카, 아우...)
export function heirWord(g, c, from = me(g)) {
  const m = c.sex === 'm';
  if (from.childIds.includes(c.id)) return m ? '아들' : '딸';
  if (from.childIds.some((id) => byId(g, id)?.childIds?.includes(c.id))) return m ? '손자' : '손녀';
  if ([from.fatherId, from.motherId].some((pid) => pid != null && (c.fatherId === pid || c.motherId === pid))) return c.ageMonths < from.ageMonths ? (m ? '아우' : '누이') : (m ? '형제' : '자매');
  return m ? '조카' : '조카딸';
}

HOOKS.endOfMonth.push((g, rng) => {
  const life = L(g);
  const meP = me(g);
  // 이번 달에 죽음이 정해졌다 (치명상, 노환 등)
  // 내 인물 기록이 다른 시뮬레이션 탓에 먼저 죽어 있어도, 정해진 죽음은 그대로 온다 (안 그러면 백 살 넘게 살았다)
  // 죽음 앞에 한 달을 미루는 갈래가 있다 (임종: 마지막 말을 남길 틈). false를 돌려주면 이번 달은 넘긴다.
  if (life.pendingDeath && g.player.alive !== false && meP.alive && (HOOKS.beforeDeath ?? []).some((f) => f(g, rng, life.pendingDeath) === false)) life.pendingDeath = null;
  if (life.pendingDeath && g.player.alive !== false) {
    g.player.alive = false;
    if (meP.alive) kill(g, meP, life.pendingDeath); else meP.deathCause ??= life.pendingDeath;
    g.over = true;
  }
  // 다른 갈래가 내 인물 기록을 죽였다면(사고, 처형 등) 그것도 죽음이다: 살아 있는 척 이어지지 않게
  if (!meP.alive && g.player.alive !== false) { g.player.alive = false; g.over = true; }
  life.pendingDeath = null;
  if (!g.over || g.player.alive !== false || life.heirPending) return;
  // 이번 달에 쌓인 장면들은 새 삶에서 의미가 없다
  life.queue = [];
  life.scene = null;
  if (g.pendingEvent?.id === SCENE_ID) g.pendingEvent = null;
  const heirs = heirsOf(g);
  const age = ageYears(meP);
  const record = {
    name: g.player.name, lastName: g.player.lastName, id: meP.id,
    born: g.date.year - age, died: g.date.year, age, cause: meP.deathCause,
    summary: lifeSummary(g),
  };
  life.ancestors.push(record);
  chron(g, `${g.player.name} ${g.player.lastName}, ${age}살로 세상을 떠나다. ${meP.deathCause ?? ''}`.trim());
  if (!heirs.length) {
    chron(g, `${g.player.lastName} 가문의 대가 끊겼다.`);
    return; // game.over 그대로: 삶이 끝난다
  }
  g.over = false;
  life.heirPending = true;
  showScene(g, { kind: 'heir', heirs: heirs.slice(0, 7).map((c) => c.id), record }, { force: true });
});

function lifeSummary(g) {
  const life = L(g);
  const parts = [];
  const def = life.job ? WORK[life.job.id] : null;
  if (def) parts.push(def.title ? def.title(g) : def.name);
  const gd = life.fac.guild;
  if (gd?.member) parts.push(`모험가 ${['F', 'E', 'D', 'C', 'B', 'A', 'S'][gd.rank]}급`);
  if (life.houses.length) parts.push(`${life.houses.map((h) => PLACES[h].name).join(', ')}에 집`);
  if (life.stats.kills >= 20) parts.push(`쓰러뜨린 적 ${life.stats.kills}`);
  for (const [id, d] of Object.entries(life.dungeons)) if (d.cleared) parts.push(`${id === 'old_tower' ? '무너진 탑' : id === 'grey_hollow' ? '회색 굴' : id === 'old_mine' ? '버려진 은광' : '왕도 지하수로'} 정복`);
  return parts.join(', ');
}

defineScene('heir', {
  title: () => '대를 잇다',
  text: (g, s) => {
    const r = s.record;
    const kids = s.heirs.map((id) => byId(g, id)).filter(Boolean);
    const own = kids.some((c) => me(g).childIds.includes(c.id));
    const who = own ? `자식은 ${kids.length}명.` : `뒤를 이을 자식이 없다. 집안 어른들이 핏줄 가운데 ${kids.length}명을 앞에 세웠다.`;
    return `${r.name} ${r.lastName}, ${r.age}살. ${J(r.cause ?? '', '으로/로')} 숨을 거두었다.${r.summary ? ` (${r.summary})` : ''} 장례가 끝나고, 남은 것들은 누군가가 이어받아야 한다. ${who} 누가 집안을 잇는가.`;
  },
  choices: (g, s) => s.heirs.map((id) => byId(g, id)).filter((c) => c && c.alive)
    .map((c) => ({ label: `${heirWord(g, c)} ${c.name} (${ageYears(c)}살${c.job && c.job !== 'child' ? `, ${JOBS[c.job]?.name ?? ''}` : ''})`, key: c.id })),
  resolve(g, rng, s, key) {
    return becomeHeir(g, rng, byId(g, key));
  },
});

/* ---------- 새 플레이어로 바꾸기 ---------- */
export function becomeHeir(g, rng, child) {
  const life = L(g);
  const old = g.player;
  const oldP = byId(g, old.id);
  life.heirPending = false;
  if (!child || !child.alive) { g.over = true; return '이을 사람이 없었다.'; }
  const age = ageYears(child);
  const word = oldP ? heirWord(g, child, oldP) : (child.sex === 'm' ? '아들' : '딸');
  const direct = word === '아들' || word === '딸';

  // 능력치: 나이만큼 자랐다고 보고, 부모의 재능을 일부 닮는다
  const talents = {};
  for (const st of STATS) talents[st.id] = Math.max(0.5, Math.min(1.8, (old.talents[st.id] ?? 1) * 0.4 + rng.normal(1, 0.22) * 0.6));
  const grown = Math.min(age, 25);
  const stats = {};
  for (const st of STATS) stats[st.id] = Math.min(100, (2 + grown * 1.1) * talents[st.id] * rng.float(0.8, 1.2) + (old.stats[st.id] ?? 0) * 0.05);
  const skills = {};
  for (const sk of SKILLS) skills[sk.id] = 0;
  if (age >= 8) {
    // 부모 곁에서 자라며 보고 배운 것
    const top = SKILLS.map((x) => x.id).sort((a, b) => (old.skills[b] ?? 0) - (old.skills[a] ?? 0)).slice(0, 2);
    for (const id of top) skills[id] = Math.min(40, (old.skills[id] ?? 0) * 0.15 + (age - 7) * 0.8);
  }
  const cj = JOBS[child.job];
  if (cj?.skill && child.skill) skills[cj.skill] = Math.max(skills[cj.skill], child.skill);
  // 마력은 핏줄을 탄다. 그래도 고서클은 드물다.
  const manaPotential = Math.min(1, old.manaPotential * 0.45 + Math.pow(rng.next(), 2.2) * 0.7);
  const awakened = age >= 10 && manaPotential > 0.25 && rng.chance(0.5 + manaPotential * 0.4);

  // 물려받는 돈: 장례비와 세금을 떼고
  const estate = Math.floor(old.money * 0.85);
  const fatherId = child.fatherId, motherId = child.motherId;
  // 형제: 자식이 이으면 옛 주인의 다른 자식, 손주·조카가 이으면 그 아이의 친형제
  const sibPool = direct ? (oldP?.childIds ?? []) : [fatherId, motherId].flatMap((id) => byId(g, id)?.childIds ?? []);
  const siblings = [...new Set(sibPool)].filter((id) => id !== child.id && byId(g, id)?.alive);
  const familyIds = [fatherId, motherId, ...siblings].filter((id) => id != null);
  if (child.spouseId) familyIds.push(child.spouseId, ...child.childIds);

  const np = {
    ...old,
    id: child.id,
    name: child.name,
    lastName: child.lastName,
    sex: child.sex,
    familyIds,
    stats, skills, talents,
    manaPotential,
    manaAwakened: awakened,
    mana: awakened ? manaPotential * Math.min(age, 15) * 2 : 0,
    fatigue: 10,
    stress: 35,
    money: age >= 15 ? Math.floor(estate * 0.5) : 0,
    familyMoney: old.familyMoney + (age >= 15 ? estate - Math.floor(estate * 0.5) : estate),
    injuries: [],
    scars: [],
    alive: true,
    title: null,
    firstLoveId: null,
  };
  g.player = np;
  if (oldP) { oldP.isPlayer = false; oldP.wasPlayer = true; oldP.known = true; oldP.affection = 80; }
  child.isPlayer = true;
  child.known = true;
  if (child.job === 'child' && age >= 15) child.job = 'idle';

  // 인맥: 부모를 알던 사람들은 자식도 안다. 호감은 부모의 절반쯤.
  for (const p of g.people) {
    if (p.isPlayer || !p.alive) continue;
    if (p.known && !familyIds.includes(p.id)) p.affection = Math.round(p.affection * 0.5);
    if (familyIds.includes(p.id)) { p.known = true; p.affection = Math.max(p.affection, 45); }
    if (p.bond && p.bond !== 'enemy') p.bond = null; // 연인 관계는 이어지지 않는다 (원한은 남는다)
    if (p.romance) p.romance = 0;
  }

  // 사는 곳과 일
  life.gen += 1;
  life.job = null;
  for (const f of Object.values(life.fac)) f.member = false;
  life.renown = Math.floor(life.renown * 0.5);
  life.notoriety = Math.floor(life.notoriety * 0.5);
  life.travel = null;
  life.home = life.houses.includes(life.place) ? 'own' : life.place === 'ern' ? 'family' : life.home === 'barracks' ? 'inn' : life.home;
  if (age >= 15 && cj && WORK[child.job] && WORK[child.job].places.includes(life.place) && !WORK[child.job].faction) takeJob(g, child.job);
  for (const n of life.nemeses) if (n.alive) n.grudge += 1; // 부모의 원수는 자식도 기억한다

  // 한 사람의 삶에 묶인 표시(성인식, 세례 같은 한 번뿐인 사건)는 새로 시작한다. 세계에 묶인 표시(world_)는 남긴다.
  const flags = g.flags ?? {};
  life.prevFlags = flags;
  g.flags = Object.fromEntries(Object.entries(flags).filter(([k]) => k.startsWith('world_')));

  runHooks('heir', g, rng, old);
  const r = life.ancestors[life.ancestors.length - 1];
  note(g, `${r.name}의 뒤를 이어 ${life.gen}대째 집안의 주인이 되었다.`);
  chron(g, `${child.name} ${child.lastName}, ${life.gen}대째 ${J(family(g).name, '을/를')} 잇다.`);
  const gear = life.gear.weaponName ? ` ${J(r.name, '이/가')} 쓰던 ${J(life.gear.weaponName, '이/가')} 이제 내 것이다.` : '';
  const house = life.houses.length ? ` ${life.houses.map((h) => PLACES[h].name).join(', ')}의 집도 물려받았다.` : '';
  const young = age < 15 ? ` 아직 ${age}살. ${direct && byId(g, child.motherId === r.id ? child.fatherId : child.motherId)?.alive ? '남은 부모의 손에서' : !direct && [child.fatherId, child.motherId].some((id) => byId(g, id)?.alive) ? '제 부모의 손에서' : '친척들 손에서'} 자라게 될 것이다.` : '';
  return `${J(child.name, '이/가')} ${r.name}의 뒤를 잇는다.${young} 물려받은 은화는 ${estate}닢.${house}${gear}${direct ? '' : ` ${r.name}에게 자식이 없어, ${word}인 내가 집안의 이름을 지게 되었다.`} ${direct ? '부모를' : J(r.name, '을/를')} 알던 사람들은 이제 나를 "${r.name}의 ${word}"${hasBatchim(word) ? '이라' : '라'} 부른다.`;
}

export function lineage(g) {
  return [...L(g).ancestors, { name: g.player.name, lastName: g.player.lastName, alive: true, gen: L(g).gen }];
}
