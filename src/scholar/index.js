// 47단계 학자의 길: 서고·필사·번역·책 쓰기·학파와 논쟁·대학자·제자·검열. 화면 연결점 scholarInfo·scholarLine.
import { HOOKS } from '../hooks.js';
import { J } from '../narrative/text.js';
import { addFact } from '../rumor/index.js';
import { KINDS as RUMOR } from '../rumor/facts.js';
import { PLACES } from '../places.js';
import { SS, fill, Q, LIBS, libAt, SCHOOLS, KIND, JOB, loreWord, rankOf, esteemWord, bookById, placeName, subjName, here } from './state.js';
import { FEED, seed } from './world.js';
import './life.js';

/* ---------- 소문으로 ---------- */
const at = (d) => (PLACES[d.pl] ? d.pl : 'leocast');
Object.assign(RUMOR, {
  sc_book: {
    at, big: false,
    truth: (d) => `학자 ${J(d.name ?? '아무개', '이/가')} 새 책 ${Q(d.title ?? '어떤 책', '을/를')} 냈다고 한다.`,
    wrong: [(d) => `${Q(d.title ?? '어떤 책', '을/를')} 읽은 학생 하나가 미쳐 버렸다는 말이 돈다.`, (d) => `${Q(d.title ?? '어떤 책', '은/는')} 사실 남의 책을 베낀 것이라는 말이 돈다.`],
  },
  sc_ban: {
    at, big: false, official: true,
    truth: (d) => `${Q(d.title ?? '어떤 책', '이/가')} 금서가 되었다고 한다.`,
    wrong: [(d) => `${Q(d.title ?? '어떤 책', '을/를')} 가진 사람은 옥에 간다는 말이 돈다.`, (d) => `${Q(d.title ?? '어떤 책', '을/를')} 쓴 학자가 몰래 처형되었다는 말이 돈다.`],
  },
  sc_fire: {
    at, big: true,
    truth: (d) => `${placeName(at(d))} 서고에 불이 나 책이 많이 탔다고 한다.`,
    wrong: [(d) => `${placeName(at(d))} 서고 불은 금서를 태우려고 일부러 낸 것이라는 말이 돈다.`, (d) => `${placeName(at(d))} 서고 불 속에서 책들이 비명을 질렀다는 말이 돈다.`],
  },
  sc_great: {
    at: () => 'scholae', big: false,
    truth: (d) => (d.dead ? `대학자 ${J(d.name ?? '아무개', '이/가')} 세상을 떠났다고 한다.` : `${J(d.name ?? '아무개', '이/가')} 새 대학자로 불린다고 한다.`),
    wrong: [(d) => `대학자 ${J(d.name ?? '아무개', '이/가')} 마탑과 성당 양쪽에서 돈을 받았다는 말이 돈다.`, (d) => `${J(d.name ?? '아무개', '은/는')} 책을 한 권도 직접 쓰지 않았다는 말이 돈다.`],
  },
});
FEED.fact = (g, k, d) => addFact(g, k, d);

/* ---------- 화면용 ---------- */
function bookRow(g, b, me) {
  const S = SS(g);
  const found = b.wrong.filter((w) => w.found), seen = me ? [] : b.wrong.filter((w) => w.me && !w.found);
  return {
    id: b.id, name: b.title, kind: KIND[b.kind]?.name ?? '책', subject: subjName(b.kind, b.subj), y: b.y, author: b.by,
    where: LIBS[b.where]?.name ?? placeName(b.where), place: b.where, copies: b.copies, lost: !!b.lost, banned: b.banned ? true : false,
    wrong: found.length + seen.length, wrongText: [...found.map((w) => `${w.text} (${w.found.by}, ${w.found.y}년)`), ...seen.map((w) => `${w.text} (내가 알아챔)`)],
    readers: b.readers, esteem: b.esteem, word: esteemWord(b.esteem), school: SCHOOLS[b.school]?.name ?? null,
    ancestor: b.mine && b.pid !== g.player.id, quality: me ? b.quality : null, spotted: S.spotted[b.id] ?? 0,
  };
}
export function scholarInfo(g) {
  if (!g.scholar) return null;
  const S = SS(g), sc = SCHOOLS[S.school], j = S.job, d = S.draft, L0 = libAt(here(g));
  const wrote = S.books.filter((b) => b.mine).sort((a, b) => b.y - a.y).slice(0, 20).map((b) => bookRow(g, b, true));
  const read = S.read.slice().reverse().map((id) => bookById(g, id)).filter((b) => b && !b.mine).slice(0, 20).map((b) => bookRow(g, b, false));
  return {
    line: scholarLine(g),
    lore: Math.round(S.lore), loreWord: loreWord(S.lore), rank: rankOf(g), fame: Math.round(S.fame),
    school: sc ? { id: S.school, name: sc.name, word: sc.word, rival: SCHOOLS[sc.rival].name, standing: Math.round(S.standing[S.school]) } : null,
    job: j ? { name: JOB[j.rank], kind: LIBS[j.lib]?.name ?? '서고', prog: j.prog, where: placeName(j.lib), rank: j.rank } : null,
    draft: d ? { kind: KIND[d.kind]?.name, subject: subjName(d.kind, d.subj), prog: Math.min(100, Math.round(d.prog / d.need * 100)) } : null,
    notes: Object.entries(S.notes).filter(([, n]) => n > 0).map(([k, n]) => { const [f, s] = k.split(':'); const kind = { h: 'history', g: 'geography', n: 'nature', t: 'tongue' }[f]; return { kind: KIND[kind]?.name ?? f, subject: kind === 'tongue' ? s : subjName(kind, s), n }; }),
    wrote, read,
    pupils: S.pupils.map((p) => ({ name: p.name, y: p.y, fate: { rise: '학자가 되었다', plain: '제 길을 갔다', turn: '스승을 반박했다' }[p.fate] ?? '배우는 중', of: p.of ?? null })),
    great: S.great ? `${S.great}년부터 대학자` : null,
    greats: S.greats.filter((x) => x.alive).map((x) => ({ name: x.name, school: SCHOOLS[x.school]?.name ?? '홀로 선 학자', me: !!x.pid })),
    standing: Object.fromEntries(Object.keys(SCHOOLS).map((k) => [SCHOOLS[k].name, Math.round(S.standing[k])])),
    here: L0 ? { name: L0.name, line: L0.line, censor: L0.censor === 'church' ? '성당이 금서를 가린다' : L0.censor === 'crown' ? '왕실이 금서를 가린다' : null } : null,
    me: { ...S.me },
    log: S.log.slice(-10).reverse().map((x) => ({ ...x })),
  };
}
export function scholarLine(g) {
  if (!g.scholar) return '';
  const S = SS(g), r = rankOf(g);
  if (!r && !S.job && !S.books.some((b) => b.mine)) return '';
  const bits = [r ?? '책 읽는 사람'];
  if (S.school) bits.push(SCHOOLS[S.school].name);
  if (S.job) bits.push(`${LIBS[S.job.lib]?.name ?? '서고'} ${JOB[S.job.rank]}`);
  const n = S.books.filter((b) => b.mine && b.pid === g.player.id).length;
  if (n) bits.push(`쓴 책 ${n}권`);
  if (S.draft) bits.push('원고 쓰는 중');
  return `학자의 길: ${bits.join(', ')}`;
}

HOOKS.migrate.push((g) => { if (g.scholar) fill(g); else if (g.life) { fill(g); seed(g); } });
export { SS as scholarState };
export { LIBS, SCHOOLS, KIND } from './state.js';
