// 학자로 사는 삶: 서고에서 읽기, 필사공·사서·사서장, 고장 답사, 책 쓰기, 옛 글 옮기기, 학파, 논쟁, 강의와 제자, 검열, 대학자.
// 새 행동은 뜻 있는 형편에서만 보인다: 서고가 있는 고장, 글을 읽을 줄 아는 사람, 자료를 모은 사람.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { EVENTS, age, onRoad, money, stress, injure } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, note, chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { realmOf } from '../realms/index.js';
import { RUINS } from '../ruins/state.js';
import { bannedBooks } from '../arts/index.js';
import {
  SS, fill, clamp, mi, here, Q, LIBS, libAt, SCHOOLS, HIST, BEASTS, KIND, placeName, subjName, noteKey, needOf, slog, tally,
  bookById, myBooks, liveBooks, JOB,
} from './state.js';
import { FEED, makeBook, seed, scName, GEO_PLACES } from './world.js';
import { CIVS } from '../explore/core.js';

const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending || !!g.explore?.exp;
const grown = (g) => age(g) >= 16 && !busy(g);
const settled = (g) => grown(g) && !onRoad(g);
const sk = (g, k) => g.player.skills?.[k] ?? 0;
const st = (g, k) => g.player.stats?.[k] ?? 30;
const literate = (g) => sk(g, 'letters') >= 3 || st(g, 'int') >= 32;
const lib = (g) => (onRoad(g) ? null : libAt(here(g)));
const mine = (g, text) => { slog(g, text); note(g, text); };
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const addLore = (g, n) => { const S = SS(g); S.lore = clamp(S.lore + n * (1 - S.lore / 130), 0, 100); };
const addFame = (g, n) => { const S = SS(g); S.fame = clamp(S.fame + n, 0, 100); };
const addNote = (g, key, n = 1) => { const S = SS(g); S.notes[key] = Math.min(9, (S.notes[key] ?? 0) + n); };
const civOfRuins = (g) => { const p = g.ruins?.pieces ?? {}; const site = Object.keys(p).filter((k) => p[k] > 0).sort((a, b) => p[b] - p[a])[0]; return site ? RUINS[site]?.civ ?? null : null; };
const pen = (g) => Math.round(sk(g, 'letters') * 0.6 + st(g, 'int') * 0.3 + SS(g).lore * 0.25);

/* ---------- 서고에서 읽기 ---------- */
function noteFrom(g, rng, L0) {
  const f = rng.pick(L0.fields);
  if (f === 'h') { const s = rng.pick(Object.keys(HIST)); addNote(g, `h:${s}`); return `${HIST[s].name}에 관한 옛 문서를 베껴 적었다.`; }
  if (f === 'g') { const p = rng.pick(GEO_PLACES); addNote(g, `g:${p}`); return `${placeName(p)}의 길과 물을 적은 오래된 안내서를 찾았다.`; }
  if (f === 'n') { const b = rng.pick(Object.keys(BEASTS)); addNote(g, `n:${b}`); return `${BEASTS[b].name}의 습성을 적은 사냥꾼의 수기를 읽었다.`; }
  const c = rng.pick(Object.keys(CIVS)); addNote(g, `t:${c}`); return `${CIVS[c].name}의 글자를 풀이해 둔 낡은 사전을 펼쳤다.`;
}
// 읽다가 만나는 책 한 권: 이 서고에 있고, 이 나라에서 금하지 않은 것
function bookFor(g, rng, pl) {
  const S = SS(g), realm = LIBS[pl]?.realm;
  const pool = liveBooks(g).filter((b) => (b.where === pl || rng.chance(0.15)) && b.banned !== realm && !S.read.includes(b.id));
  if (!pool.length) return null;
  const anc = pool.find((b) => b.mine && b.pid !== g.player.id);
  return anc && rng.chance(0.6) ? anc : rng.pick(pool);
}
ACTIONS.push({
  id: 'sc_read',
  name: '서고에서 책 읽기',
  icon: 'book',
  desc: '서고에서 하루를 보낸다. 학식이 쌓이고, 쓸 책의 자료가 모이고, 옛사람이 남긴 책을 만난다.',
  available: (g) => settled(g) && !!lib(g) && literate(g),
  run(g, rng) {
    const S = fill(g), L0 = lib(g), pl = here(g);
    if (!L0) return '서고 문이 닫혀 있었다.';
    const lines = [rng.chance(0.35) ? L0.line : null, noteFrom(g, rng, L0)];
    addLore(g, 2.5 + sk(g, 'letters') / 25); gainSkill(g, 'letters', 0.4); S.me.read += 1;
    const b = rng.chance(0.55) ? bookFor(g, rng, pl) : null;
    if (b) {
      S.read.push(b.id); if (S.read.length > 60) S.read.shift();
      b.readers += 1;
      const anc = b.mine && b.pid !== g.player.id;
      lines.push(anc ? `서가에서 선대가 쓴 ${Q(b.title, '을/를')} 찾았다. 여백에 누군가 "이 대목은 믿을 만하다"고 적어 두었다.` : `${b.by}의 ${Q(b.title, '을/를')} 읽었다. ${b.y}년에 쓴 책이다.`);
      const open = b.wrong.filter((w) => !w.found && !w.me);
      if (open.length && (S.notes[noteKey(b.kind, b.subj)] ?? 0) >= needOf(b.kind, b.subj)) {
        const w = open[0]; w.me = true;
        S.spotted[b.id] = (S.spotted[b.id] ?? 0) + 1;
        lines.push(`읽다가 손이 멈췄다. 이 책은 ${w.text.replace(/적었다\.$/, '적었다.')} 내가 모은 자료와 맞지 않는다. 틀린 곳이다.`);
      } else if (b.wrong.some((w) => w.found)) lines.push(`여백에 "${b.wrong.find((w) => w.found).found.by}가 이 대목이 틀렸다고 했다"는 메모가 있다.`);
    }
    // 금서 서가는 자물쇠 너머로 보기만 한다 (arts 금서)
    if (L0.censor && S.lore >= 20 && rng.chance(0.15)) {
      const ban = bannedBooks(g)[0];
      if (ban) lines.push(`금서 서가 쇠창살 너머로 《${ban.title}》의 등이 보였다. 사서가 열쇠를 허리에 차고 있다.`);
    }
    return lines.filter(Boolean).join(' ');
  },
});

/* ---------- 서고 일: 필사공 → 사서 → 사서장 ---------- */
ACTIONS.push({
  id: 'sc_job',
  name: '서고 일자리 구하기',
  icon: 'quill',
  desc: '이 고장 서고에서 필사공으로 일한다. 품삯은 적지만 책 속에서 산다.',
  available: (g) => settled(g) && !!lib(g) && !SS(g).job && sk(g, 'letters') >= 8 && !g.player.title,
  run(g, rng) {
    const S = fill(g), L0 = lib(g);
    S.job = { lib: here(g), rank: 0, prog: 0, since: mi(g), away: 0 };
    mine(g, `${placeName(here(g))} ${L0.name}의 필사공이 되었다.`);
    return `${L0.name} 사서장이 내 글씨를 한참 들여다보더니 필사대 하나를 내주었다. "먹을 아껴 쓰게. 종이는 더 아끼고." ${rng.pick(['손가락에 먹물이 배는 날들이 시작되었다.', '창가 자리는 아니었다. 그래도 내 자리다.'])}`;
  },
});
ACTIONS.push({
  id: 'sc_copy',
  name: '필사와 서고 일',
  icon: 'quill',
  desc: '책을 베끼고, 서가를 정리하고, 찾아온 학자에게 책을 내준다. 품삯을 받는다.',
  available: (g) => settled(g) && SS(g).job?.lib === here(g),
  run(g, rng) {
    const S = fill(g), j = S.job, L0 = LIBS[j.lib];
    const pay = Math.round(3 + j.rank * 3 + sk(g, 'letters') / 12 + rng.int(0, 2));
    g.player.money += pay; j.prog += 1; S.me.copied += 1;
    addLore(g, 1); gainSkill(g, 'letters', 0.3);
    const b = liveBooks(g).filter((x) => x.where === j.lib)[rng.int(0, 9)] ?? null;
    if (b && rng.chance(0.4)) { b.copies = Math.min(40, b.copies + 1); addNote(g, noteKey(b.kind, b.subj)); }
    let up = '';
    if (j.rank === 0 && j.prog >= 12 && S.lore >= 15) { j.rank = 1; up = ` 사서장이 열쇠 꾸러미 하나를 건넸다. 이제 ${L0.name}의 사서다.`; mine(g, `${L0.name}의 사서가 되었다.`); }
    else if (j.rank === 1 && j.prog >= 36 && S.lore >= 45) { j.rank = 2; up = ` 늙은 사서장이 물러나며 나를 불렀다. 오늘부터 ${L0.name}의 사서장이다.`; mine(g, `${L0.name}의 사서장이 되었다.`); renown(g, 2); addFame(g, 4); }
    const work = b ? `${Q(b.title, '을/를')} 한 권 더 베꼈다.` : rng.pick(['서가 하나를 처음부터 다시 정리했다.', '찾아온 학생에게 책 세 권을 내주고, 두 권만 돌려받았다.', '좀먹은 책장을 한 장씩 말렸다.']);
    return `${work} 품삯 은화 ${pay}닢.${up}`;
  },
});
HOOKS.afterMonth.push((g) => {
  const S = g.scholar;
  if (!S?.job || !g.life || g.over) return;
  if (here(g) === S.job.lib && !onRoad(g)) { S.job.away = 0; return; }
  if (++S.job.away > 4) { mine(g, `오래 자리를 비워 ${LIBS[S.job.lib]?.name ?? '서고'} 일을 잃었다.`); S.job = null; }
});

/* ---------- 고장 답사 ---------- */
const beastHere = (g) => Object.keys(BEASTS).find((k) => BEASTS[k].at.includes(here(g))) ?? null;
const surveyable = (g) => GEO_PLACES.includes(here(g)) || !!beastHere(g);
ACTIONS.push({
  id: 'sc_survey',
  name: '고장을 답사해 적어 두기',
  icon: 'compass',
  desc: '이 고장의 길과 물, 사는 짐승을 직접 보고 적는다. 지리서와 박물지의 자료가 된다.',
  available: (g) => settled(g) && surveyable(g) && (SS(g).lore >= 8 || SS(g).draft) && SS(g).surveyAt !== mi(g),
  run(g, rng) {
    const S = fill(g), pl = here(g), bst = beastHere(g), lines = [];
    S.surveyAt = mi(g); S.me.surveyed += 1;
    g.player.fatigue = Math.min(100, (g.player.fatigue ?? 0) + 10);
    if (GEO_PLACES.includes(pl)) { addNote(g, `g:${pl}`); lines.push(rng.pick([`${placeName(pl)} 둘레를 걸으며 걸음 수로 거리를 쟀다.`, `${placeName(pl)} 늙은이들에게 물길이 언제 바뀌었는지 물어 적었다.`, `${placeName(pl)} 언덕에 올라 고장의 생김새를 그렸다.`])); }
    if (bst) {
      addNote(g, `n:${bst}`, rng.chance(0.3) ? 2 : 1);
      if (rng.chance(0.12 - st(g, 'agi') / 1000)) { injure(g, `${BEASTS[bst].name}의 자취를 쫓다 다쳤다`, 1); lines.push(`${BEASTS[bst].name}의 자취를 너무 가까이 쫓았다. 팔에 상처를 입고 물러났다. 그래도 본 것은 다 적었다.`); }
      else lines.push(`멀찍이 숨어 ${BEASTS[bst].name}이 어떻게 움직이는지 지켜보고 적었다.`.replace(`${BEASTS[bst].name}이`, J(BEASTS[bst].name, '이/가')));
    }
    addLore(g, 1); gainStat(g, 'sen', 0.2);
    return lines.join(' ');
  },
});

/* ---------- 책 쓰기 ---------- */
function topics(g) {
  const S = SS(g), out = [];
  for (const [k, n] of Object.entries(S.notes)) {
    const [f, subj] = k.split(':');
    const kind = { h: 'history', g: 'geography', n: 'nature' }[f];
    if (!kind || n < 1) continue;
    out.push({ kind, subj, n, need: needOf(kind, subj) });
  }
  return out.sort((a, b) => b.n / b.need - a.n / a.need).slice(0, 4);
}
ACTIONS.push({
  id: 'sc_write',
  name: '책을 쓰기 시작한다',
  icon: 'letter',
  desc: '모은 자료로 역사서·지리서·박물지 가운데 하나를 쓴다. 자료가 모자라면 틀린 말도 그대로 책에 남는다.',
  available: (g) => settled(g) && SS(g).lore >= 15 && !SS(g).draft && topics(g).length > 0 && !sceneQueued(g, 'sc_plan'),
  run(g) {
    queueScene(g, 'sc_plan', {});
    return '깨끗한 종이 묶음을 사 왔다. 무엇을 쓸지 정해야 한다.';
  },
});
defineScene('sc_plan', {
  need: (g) => !SS(g).draft && topics(g).length > 0,
  title: () => '무엇을 쓸까',
  text: (g) => `책상 위에 모은 자료를 늘어놓았다. ${topics(g).map((t) => `${subjName(t.kind, t.subj)}(${KIND[t.kind].name}, 자료 ${t.n}/${t.need})`).join(', ')}. 자료가 모자란 것을 쓰면 빈 곳을 짐작으로 채우게 된다.`,
  choices: (g) => [...topics(g).map((t, i) => ({ label: `${subjName(t.kind, t.subj)} ${KIND[t.kind].name}를 쓴다`, key: `t${i}` })), { label: '자료를 더 모은 뒤에 쓴다', key: 'later' }],
  resolve(g, rng, s, key) {
    if (key === 'later') return '종이를 다시 묶어 두었다. 서두를 일이 아니다.';
    const t = topics(g)[+key.slice(1)];
    if (!t) return '쓰려던 것이 기억나지 않았다.';
    SS(g).draft = { kind: t.kind, subj: t.subj, prog: 0, need: 4 + Math.floor(t.need / 2), by: g.player.id };
    return `첫 장에 제목을 적었다. ${subjName(t.kind, t.subj)}. ${t.n >= t.need ? '자료는 넉넉하다.' : '자료가 조금 모자라다. 쓰면서 채워야 한다.'}`;
  },
});
ACTIONS.push({
  id: 'sc_draft',
  name: '원고 쓰기',
  icon: 'quill',
  desc: '쓰던 책을 이어 쓴다.',
  available: (g) => settled(g) && !!SS(g).draft && SS(g).draft.by === g.player.id && !sceneQueued(g, 'sc_finish'),
  run(g, rng) {
    const S = fill(g), d = S.draft;
    d.prog += 1 + sk(g, 'letters') / 40 + st(g, 'int') / 90;
    gainSkill(g, 'letters', 0.4); addLore(g, 0.8); stress(g, 1);
    if (d.prog >= d.need) { queueScene(g, 'sc_finish', {}); return '마지막 장을 썼다. 먹이 마르기를 기다리며 처음부터 다시 읽었다.'; }
    return rng.pick(['밤늦게까지 한 장을 썼다가 반을 지웠다.', '자료 묶음을 다시 뒤지며 한 대목을 채웠다.', '앞서 쓴 대목이 마음에 들지 않아 고쳐 썼다.', '촛불 두 자루를 다 태우고 한 장을 얻었다.']) + ` (${Math.min(99, Math.round(d.prog / d.need * 100))}%)`;
  },
});
// 다 쓴 책을 어디로 보낼까. 맨 끝 '서고에 바친다'가 무난한 것
const homeFor = (g) => (lib(g) ? here(g) : SCHOOLS[SS(g).school]?.home ?? 'leocast');
defineScene('sc_finish', {
  keep: true,
  need: (g) => !!SS(g).draft,
  title: () => '책을 마쳤다',
  text: (g) => { const d = SS(g).draft; return `${subjName(d.kind, d.subj)}에 관한 ${KIND[d.kind].name} 한 권을 다 썼다. 이 책을 세상에 어떻게 내보낼까.`; },
  choices: (g) => {
    const d = SS(g).draft, out = [];
    if (money(g) >= 30) out.push({ label: '은화 30닢으로 필사공을 사서 사본을 여럿 만든다', key: 'copies' });
    if (d.kind === 'history') out.push({ label: '귀족 집안에 바치고 사례를 받는다', key: 'patron' });
    out.push({ label: '이름을 숨기고 돌린다', key: 'anon' });
    out.push({ label: lib(g) ? `${lib(g).name}에 바친다` : '가까운 서고에 보낸다', key: 'library' });
    return out;
  },
  resolve(g, rng, s, key) {
    const S = fill(g), d = S.draft;
    if (!d) return '원고가 어디로 갔는지 모르겠다.';
    S.draft = null;
    const where = homeFor(g);
    const refutes = liveBooks(g).find((b) => !b.mine && b.kind === d.kind && b.subj === d.subj && b.wrong.some((w) => w.me && !w.found)) ?? null;
    const b = makeBook(g, rng, {
      kind: d.kind, subj: d.subj, by: key === 'anon' ? '이름 없는 학자' : g.player.name, pid: g.player.id, mine: true, school: S.school,
      skill: pen(g), material: S.notes[noteKey(d.kind, d.subj)] ?? 0, flatter: key === 'patron', where, copies: key === 'copies' ? rng.int(8, 12) : rng.int(1, 3),
      refutes: refutes?.id ?? null, realmAt: d.kind === 'geography' ? realmOf(d.subj) : null,
    });
    S.me.wrote += 1; addLore(g, 3);
    const lines = [];
    if (key === 'copies') { g.player.money -= 30; lines.push(`필사공 다섯이 한 달 동안 ${Q(b.title, '을/를')} 베꼈다. 사본 ${b.copies}권이 여러 고장 서고로 흩어졌다.`); }
    else if (key === 'patron') { const pay = rng.int(20, 45); g.player.money += pay; lines.push(`${Q(b.title, '을/를')} 귀족 집안에 바쳤다. 사례로 은화 ${pay}닢을 받았다. 그 집 조상 이야기는 듣기 좋게 고쳐 넣었다.`); }
    else if (key === 'anon') lines.push(`${Q(b.title, '을/를')} 이름 없이 서고 몇 곳에 흘렸다. 누가 썼는지 묻는 사람이 생길 것이다.`);
    else lines.push(`${LIBS[where]?.name ?? '서고'} 사서가 ${Q(b.title, '을/를')} 서가에 꽂았다. 언젠가 누군가 꺼내 읽을 것이다.`);
    if (key !== 'anon') addFame(g, Math.round(b.quality / 12) + (key === 'copies' ? 3 : 0));
    if (refutes) {
      const w = refutes.wrong.find((x) => x.me && !x.found);
      w.found = { by: g.player.name, y: g.date.year, me: true };
      refutes.esteem = Math.max(0, refutes.esteem - 8);
      if (key !== 'anon') addFame(g, 5);
      lines.push(`책 한 장(章)을 들여 ${refutes.by}의 ${Q(refutes.title)}에 틀린 곳이 있음을 밝혔다.`);
    }
    lines.push(b.quality >= 70 ? '스스로 읽어도 잘 쓴 책이다.' : b.quality >= 45 ? '쓸 만한 책이다.' : '서툰 데가 보인다. 그래도 내 책이다.');
    mine(g, `${Q(b.title, '을/를')} 썼다.`);
    if (b.quality >= 80 && key !== 'anon') chron(g, `${g.player.name}, ${Q(b.title, '을/를')} 짓다.`);
    // 검열관이 볼 만한 책이면 몇 달 뒤 장면
    if (key !== 'anon' && censorRisk(g, b)) S.watch = { id: b.id, at: mi(g) + rng.int(2, 4) };
    return lines.join(' ');
  },
});

/* ---------- 옛 글 옮기기 (ruins 고대어를 읽기만 한다) ---------- */
ACTIONS.push({
  id: 'sc_translate',
  name: '옛 글을 옮기기 시작한다',
  icon: 'rune',
  desc: '유적에서 모은 글 조각을 서고의 사전과 맞대어 오늘의 말로 옮긴다. 다 옮기면 책이 된다.',
  available: (g) => settled(g) && !!lib(g) && lib(g).fields.includes('t') && !SS(g).draft && (g.ruins?.tongue ?? 0) >= 40 && (g.ruins?.read ?? 0) >= 2 && !!civOfRuins(g),
  run(g) {
    const S = fill(g), civ = civOfRuins(g), t = g.ruins.tongue;
    S.notes[`t:${civ}`] = Math.max(S.notes[`t:${civ}`] ?? 0, Math.floor(t / 18));
    S.draft = { kind: 'tongue', subj: civ, prog: 0, need: 5, by: g.player.id };
    S.me.translated += 1;
    return `${CIVS[civ].name}의 글 조각을 서고 책상에 늘어놓았다. 한 줄을 옮기는 데 사전 세 권이 필요하다. 그래도 내가 아니면 읽을 사람이 없다.`;
  },
});

/* ---------- 검열 ---------- */
function censorRisk(g, b) {
  const L0 = LIBS[b.where], r = realmOf(here(g));
  const church = L0?.censor === 'church' || r === 'holy';
  if (church && (b.school === 'tower' || b.kind === 'tongue' || b.wrong.some((w) => w.bias && b.school === 'tower'))) return 'church';
  if (church && b.kind === 'history' && b.subj === 'faith' && b.school !== 'scripture') return 'church';
  if (b.kind === 'history' && !b.flatter && (b.subj === 'leo' || b.subj === 'feud') && L0?.censor === 'crown') return 'crown';
  return null;
}
HOOKS.afterMonth.push((g) => {
  const S = g.scholar;
  if (!S?.watch || !g.life || g.over || mi(g) < S.watch.at) return;
  const b = bookById(g, S.watch.id); S.watch = null;
  if (!b || b.lost || b.banned || busy(g)) return;
  const who = censorRisk(g, b);
  if (who) queueScene(g, 'sc_censor', { id: b.id, who });
});
defineScene('sc_censor', {
  need: (g, s) => !!bookById(g, s.id) && !bookById(g, s.id).banned,
  title: () => '검열관이 찾아왔다',
  text: (g, s) => { const b = bookById(g, s.id); return `${s.who === 'church' ? '성당 검열관' : '왕실 서기관'}이 내 ${Q(b.title, '을/를')} 펴 들고 왔다. 몇 대목에 붉은 줄이 그어져 있다. "${s.who === 'church' ? '성전과 어긋나는 말이오.' : '왕가를 욕보이는 말이오.'} 고치든지, 서가에서 내리든지 하시오."`; },
  choices: (g) => [
    { label: '붉은 줄 그은 곳을 고쳐 쓴다', key: 'revise' },
    { label: '사본 몇 권을 바르카 책 시장으로 빼돌린다', key: 'smuggle' },
    { label: '공개 강론에서 맞선다', key: 'defy' },
    { label: '말없이 받아들인다', key: 'accept' },
  ],
  resolve(g, rng, s, key) {
    const S = fill(g), b = bookById(g, s.id);
    if (!b) return '책이 사라지고 없었다.';
    if (key === 'revise') { const i = b.wrong.findIndex((w) => w.bias); if (i >= 0) b.wrong.splice(i, 1); b.esteem = Math.max(0, b.esteem - 6); stress(g, 3); return '밤새 붉은 줄 그은 곳을 다시 썼다. 책은 서가에 남았다. 하고 싶던 말 몇 줄은 빠졌다.'; }
    if (key === 'smuggle') {
      b.banned = realmOf(b.where); tally(g, 'banned');
      S.books.push({ ...b, id: S.seq++, where: 'barka', copies: rng.int(2, 4), banned: null, readers: 0, wrong: b.wrong.map((w) => ({ ...w })) });
      L(g).notoriety = (L(g).notoriety ?? 0) + 1;
      return `책은 금서가 되었다. 그 전에 사본 몇 권을 소금 자루에 묻어 바르카로 보냈다. ${Q(b.title, '은/는')} 거기서 계속 읽힐 것이다.`;
    }
    if (key === 'defy') {
      const ok = rng.chance(clamp(0.25 + S.fame / 200 + st(g, 'cha') / 300 + (SCHOOLS[S.school] ? (S.standing[S.school] - 50) / 200 : 0), 0.1, 0.75));
      if (ok) { addFame(g, 6); renown(g, 1); S.standing[S.school] = clamp((S.standing[S.school] ?? 50) + 3, 10, 95); return '광장 계단에서 그 대목을 소리 내어 읽고, 왜 그렇게 썼는지 풀었다. 학생들이 박수를 쳤다. 검열관은 붉은 줄 그은 종이를 접어 넣고 돌아갔다.'; }
      b.banned = realmOf(b.where); tally(g, 'banned'); stress(g, 8); addFame(g, 2); L(g).notoriety = (L(g).notoriety ?? 0) + 2;
      return '맞서 보았지만 검열관 뒤에는 병사들이 있었다. 책은 금서가 되었고, 내 이름이 서기관의 장부에 올랐다. 그래도 학생 몇은 그날 일을 오래 이야기할 것이다.';
    }
    b.banned = realmOf(b.where); tally(g, 'banned'); stress(g, 4);
    return `${Q(b.title, '이/가')} 서가에서 내려졌다. 금서 서가 쇠창살 너머에 꽂혔다. 언젠가 풀리는 날이 오기를 기다린다.`;
  },
});

/* ---------- 학파 ---------- */
HOOKS.afterMonth.push((g) => {
  const S = g.scholar;
  if (!S || !g.life || g.over || S.school || S.lore < 20 || busy(g) || onRoad(g)) return;
  const L0 = libAt(here(g)); if (!L0?.lean) return;
  if (mi(g) - (S.askAt ?? -99) < 24 || sceneQueued(g, 'sc_school')) return;
  S.askAt = mi(g);
  queueScene(g, 'sc_school', { school: L0.lean });
});
defineScene('sc_school', {
  need: (g) => !SS(g).school,
  title: (g, s) => `${SCHOOLS[s.school].name}의 부름`,
  text: (g, s) => { const sc = SCHOOLS[s.school], gr = SS(g).greats.find((x) => x.alive && x.school === s.school); return `${libAt(here(g))?.name ?? '서고'}에서 자주 마주치던 학자들이 나를 저녁 자리에 불렀다. ${J(sc.name, '이다/다')}. "${sc.word}." ${sc.line} ${gr ? `지금은 ${J(gr.name, '이/가')} 이 학파의 대학자로 불린다.` : ''} ${SCHOOLS[sc.rival].name}과는 사이가 나쁘다.`.replace(`${SCHOOLS[sc.rival].name}과`, J(SCHOOLS[sc.rival].name, '과/와')); },
  choices: (g, s) => [{ label: `${SCHOOLS[s.school].name}에 든다`, key: 'join' }, { label: '어느 학파에도 매이지 않는다', key: 'no' }],
  resolve(g, rng, s, key) {
    const S = fill(g);
    if (key !== 'join') return '잔을 비우고 정중히 일어섰다. 혼자 걷는 학자도 있는 법이다.';
    S.school = s.school;
    mine(g, `${SCHOOLS[s.school].name}에 들었다.`);
    return `${SCHOOLS[s.school].name} 학자들이 잔을 들었다. 이제 내 책은 이 학파의 책으로 읽히고, ${SCHOOLS[SCHOOLS[s.school].rival].name} 사람들은 내 책을 먼저 의심하며 읽을 것이다.`;
  },
});

/* ---------- 논쟁 ---------- */
const rivalBook = (g) => { const S = SS(g), r = SCHOOLS[S.school]?.rival; return liveBooks(g).find((b) => b.school === r && b.wrong.some((w) => w.me && !w.found)) ?? null; };
EVENTS.push({
  id: 'sc_debate', cooldown: 18,
  cond: (g) => !!g.scholar && settled(g) && !!SS(g).school && SS(g).lore >= 30 && !!lib(g),
  chance: (g) => 0.06 + SS(g).fame / 1000,
  weight: 12,
  prepare: (g, rng) => {
    const S = SS(g), r = SCHOOLS[S.school].rival, gr = S.greats.find((x) => x.alive && x.school === r && !x.pid);
    const foe = gr && S.fame >= 45 ? gr.name : scName(rng);
    return { foe, great: !!(gr && foe === gr.name), rival: r, book: rivalBook(g)?.id ?? null };
  },
  title: '공개 논쟁',
  text: (g, c) => `${libAt(here(g))?.name ?? '서고'} 앞마당에 사람들이 모였다. ${SCHOOLS[c.rival].name}의 ${J(c.foe, '이/가')} ${c.great ? '대학자의 이름을 걸고' : ''} 내 학파의 주장을 하나하나 비웃는다. 그리고 나를 가리킨다. "저 사람에게 물어봅시다."`.replace('  ', ' '),
  choices: [
    { label: '모은 자료를 쌓아 놓고 하나씩 맞선다', run: (g, rng, c) => debate(g, rng, c, 'notes') },
    { label: '상대 학파 책의 틀린 곳을 짚는다', show: (g, c) => !!c.book && !!bookById(g, c.book), run: (g, rng, c) => debate(g, rng, c, 'wrong') },
    { label: '말재주로 청중을 웃긴다', run: (g, rng, c) => debate(g, rng, c, 'wit') },
    { label: '정중히 물러선다', run: (g, rng, c) => debate(g, rng, c, 'bow') },
  ],
});
function debate(g, rng, c, how) {
  const S = fill(g);
  S.me.debated += 1;
  if (how === 'bow') { stress(g, 2); return `"오늘은 들으러 왔습니다." ${J(c.foe, '이/가')} 웃었다. 청중 몇은 실망했고, 몇은 고개를 끄덕였다.`; }
  if (how === 'wrong') {
    const b = bookById(g, c.book), w = b?.wrong.find((x) => x.me && !x.found);
    if (b && w) {
      w.found = { by: g.player.name, y: g.date.year, me: true };
      b.esteem = Math.max(0, b.esteem - 10);
      S.me.won += 1; addFame(g, c.great ? 10 : 6); renown(g, 1);
      S.standing[S.school] = clamp(S.standing[S.school] + 3, 10, 95); S.standing[c.rival] = clamp(S.standing[c.rival] - 3, 10, 95);
      mine(g, `공개 논쟁에서 ${Q(b.title)}의 틀린 곳을 짚어 ${J(c.foe, '을/를')} 눌렀다.`);
      return `${Q(b.title, '을/를')} 펴 들고 그 대목을 읽었다. 그리고 내가 모은 문서를 하나씩 내려놓았다. ${J(c.foe, '은/는')} 끝까지 듣고 아무 말도 하지 못했다. 그날 밤 학생들이 그 책 여백에 내 이름을 적었다.`;
    }
  }
  const pow = how === 'notes' ? S.lore * 0.6 + Object.values(S.notes).reduce((a, b) => a + b, 0) * 1.5 : st(g, 'cha') * 0.8 + sk(g, 'letters') * 0.3;
  const foe = (c.great ? 60 : 35) + rng.int(-10, 10);
  if (rng.chance(clamp(0.5 + (pow - foe) / 60, 0.1, 0.9))) {
    S.me.won += 1; addFame(g, c.great ? 7 : 4);
    S.standing[S.school] = clamp(S.standing[S.school] + 2, 10, 95);
    return how === 'notes' ? `문서 묶음을 하나씩 풀었다. 연도와 이름과 장부가 맞물려 돌아갔다. ${J(c.foe, '이/가')} 먼저 말을 돌렸다. 청중이 내 쪽으로 기울었다.` : `상대가 한 말을 그대로 되받아 비틀었다. 앞마당이 웃음바다가 되었다. ${J(c.foe, '이/가')} 얼굴을 붉히고 자리를 떴다. 이긴 건지는 모르겠지만 이름은 났다.`;
  }
  addFame(g, -3); stress(g, 5);
  return how === 'notes' ? `자료는 많았지만 상대가 그 가운데 하나를 집어 들었다. 내가 잘못 베낀 연도였다. 청중이 웃었다. 얼굴이 뜨거웠다.` : `농담이 먹히지 않았다. ${J(c.foe, '이/가')} 차갑게 "그래서 근거는?" 하고 물었다. 할 말이 없었다.`;
}

/* ---------- 강의와 제자 ---------- */
const PUPIL_NAMES = ['요하나', '마르틴', '엘리자', '토비아스', '클라라', '니콜라우스', '아그네스', '파비안', '헬레나', '루카스', '이다', '펠릭스'];
ACTIONS.push({
  id: 'sc_lecture',
  name: '학생들에게 강의하기',
  icon: 'owl',
  desc: '서고나 학원 마당에서 강의한다. 수강료가 들어오고 이름이 나고, 눈에 띄는 학생이 제자가 되기도 한다.',
  available: (g) => settled(g) && SS(g).lore >= 40 && !!lib(g) && SS(g).lectAt !== mi(g),
  run(g, rng) {
    const S = fill(g);
    S.lectAt = mi(g); S.me.lectures += 1;
    const n = rng.int(4, 8 + Math.floor(S.fame / 8)), pay = Math.round(n * (0.6 + S.fame / 80));
    g.player.money += pay; addFame(g, 1); gainStat(g, 'cha', 0.2);
    const lines = [`학생 ${n}명이 모였다. ${rng.pick(['맨 앞줄 학생이 끝까지 받아 적었다.', '반쯤은 졸았다.', '질문이 그치지 않아 해가 졌다.'])} 수강료 은화 ${pay}닢.`];
    const active = S.pupils.filter((p) => !p.fate).length;
    if (active < 5 && rng.chance(0.18 + S.fame / 400)) {
      const name = rng.pick(PUPIL_NAMES.filter((x) => !S.pupils.some((p) => p.name === x))) ?? rng.pick(PUPIL_NAMES);
      S.pupils.push({ name, y: g.date.year, fate: null, of: g.player.name });
      if (S.pupils.length > 12) S.pupils.shift();
      lines.push(`강의가 끝나고 ${J(name, '이/가')} 남아 내 책을 다 읽었다고 했다. 제자로 받아 달라고 한다. 받았다.`);
    }
    return lines.join(' ');
  },
});

/* ---------- 서고의 일들 ---------- */
EVENTS.push({
  id: 'sc_secretcopy', cooldown: 24,
  cond: (g) => !!g.scholar && settled(g) && SS(g).job?.lib === here(g) && !!libAt(here(g))?.censor && liveBooks(g).some((b) => b.banned === libAt(here(g)).realm),
  chance: () => 0.07,
  weight: 10,
  prepare: (g) => ({ id: liveBooks(g).find((b) => b.banned === libAt(here(g)).realm)?.id }),
  title: '금서를 베껴 달라는 사람',
  text: (g, c) => `서고 문을 닫을 무렵, 두건을 쓴 사람이 은화 주머니를 필사대에 올려놓았다. 금서 서가의 ${Q(bookById(g, c.id)?.title ?? '어떤 책', '을/를')} 한 부만 베껴 달라고 한다. 열쇠는 내 허리에 있다.`,
  choices: [
    { label: '밤에 몰래 베껴 준다', run: (g, rng, c) => {
      const S = SS(g), b = bookById(g, c.id);
      if (rng.chance(0.25)) { S.job = null; L(g).notoriety = (L(g).notoriety ?? 0) + 2; stress(g, 8); return '셋째 밤, 촛불이 새어 나가는 것을 순찰하던 수도사가 보았다. 그날로 서고에서 쫓겨났다.'; }
      const pay = 25 + (b?.esteem ?? 30) / 3 | 0; g.player.money += pay; if (b) b.copies += 1;
      return `닷새 밤을 새워 다 베꼈다. 은화 ${pay}닢. 두건 쓴 사람은 고맙다는 말도 없이 책을 품에 안고 사라졌다. 금서가 한 권 더 세상에 돌게 되었다.`;
    } },
    { label: '사서장에게 알린다', run: (g) => { const S = SS(g); S.job.prog += 3; return '사서장이 고개를 끄덕였다. 다음 날 금서 서가 자물쇠가 새것으로 바뀌었다. 나를 보는 사서장 눈빛이 조금 달라졌다.'; } },
    { label: '못 들은 척 돌려보낸다', run: () => '"그런 책은 여기 없습니다." 두건 쓴 사람은 주머니를 거두어 갔다. 문밖에서 한숨 소리가 들렸다.' },
  ],
});
EVENTS.push({
  id: 'sc_elder', cooldown: 30,
  cond: (g) => !!g.scholar && settled(g) && SS(g).lore >= 10 && age(g) >= 18 && !libAt(here(g)),
  chance: () => 0.025,
  weight: 6,
  prepare: (g, rng) => ({ subj: rng.pick(Object.keys(HIST)) }),
  title: '노인의 옛이야기',
  text: (g, c) => `마을 노인 하나가 내가 책을 읽는 사람이라는 걸 알고 말을 걸었다. 자기 할아버지의 할아버지가 겪었다는 ${HIST[c.subj].name} 이야기를 해 주겠다고 한다. 길고, 반은 지어낸 것 같다.`,
  choices: [
    { label: '끝까지 듣고 받아 적는다', run: (g, rng, c) => { addNote(g, `h:${c.subj}`); addLore(g, 1); return '해 질 녘까지 들었다. 지어낸 데를 빼도 문서에 없는 이야기가 두어 가지 남았다. 자료 묶음에 넣었다.'; } },
    { label: '고맙다고 하고 일어선다', run: () => '노인은 서운한 얼굴로 손을 저었다. 이야기는 노인과 함께 늙어 갈 것이다.' },
  ],
});

/* ---------- 내 책의 소식: 틀린 곳이 짚이고, 금서가 되고, 잃어버리고, 제자가 고친다 ---------- */
FEED.mine = (g, b, w, who, what) => {
  if (!g.life || g.over) return;
  const mineNow = b.pid === g.player.id, title = Q(b.title);
  if (what === 'banned') { slog(g, `${title}이 ${LIBS[b.where]?.name ?? '서고'}에서 금서가 되었다.`.replace(`${title}이`, Q(b.title, '이/가'))); if (mineNow) note(g, `${Q(b.title, '이/가')} 금서가 되었다.`); return; }
  if (what === 'lost') { slog(g, `${title}의 마지막 사본이 사라졌다.`); return; }
  if (what === 'pupil') { const t = `제자였던 ${J(who, '이/가')} 스승의 ${title}에 틀린 곳이 있다고 책을 냈다. ${w.text}`; slog(g, t); if (mineNow) { note(g, t); addFame(g, -2); stress(g, 4); } return; }
  const t = `${J(who, '이/가')} ${b.mine && !mineNow ? '선대의 책 ' : '내 책 '}${title}의 틀린 곳을 짚었다. ${w.text}`;
  slog(g, t);
  if (mineNow) { note(g, t); addFame(g, -3); }
};

/* ---------- 대학자 ---------- */
HOOKS.afterMonth.push((g) => {
  const S = g.scholar;
  if (!S || S.great || !g.life || g.over || S.lore < 75 || S.fame < 55) return;
  if (myBooks(g).filter((b) => b.pid === g.player.id && b.esteem >= 50 && !b.lost).length < 2) return;
  S.great = g.date.year;
  S.greats.push({ name: g.player.name, school: S.school, field: null, born: g.date.year - age(g), dies: null, alive: true, pid: g.player.id });
  renown(g, 5);
  chron(g, `${g.player.name}, 대학자로 불리다.`);
  mine(g, '사람들이 나를 대학자라 부르기 시작했다.');
});

// 대를 이으면: 학식과 이름, 학파, 일자리, 원고는 사람 몫이라 새로. 책·제자·세상의 학자들은 남는다
HOOKS.heir.push((g, rng, old) => {
  const S = g.scholar; if (!S) return;
  const was = S.lore;
  for (const gr of S.greats) if (gr.pid && gr.pid !== g.player.id) gr.alive = false;
  S.lore = Math.min(12, Math.round(was * 0.15)); S.fame = 0; S.school = null; S.job = null; S.draft = null; S.watch = null;
  S.notes = {}; S.spotted = {}; S.read = []; S.great = null; S.askAt = -99;
  for (const k of Object.keys(S.me)) S.me[k] = 0;
  void old;
});
HOOKS.newGame.push((g) => { fill(g); seed(g); });

export { topics, censorRisk, rivalBook, beastHere, civOfRuins, pen };
