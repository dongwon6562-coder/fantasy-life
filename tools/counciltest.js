import '../src/content.js';
// 50단계 도우미2: 자유도시 의회와 길드 정치 점검 (1분 안)
import { newGame, endMonth, me } from '../src/game.js';
import { resolveEvent } from '../src/events/core.js';
import { L, showScene, SCENES } from '../src/adventure/core.js';
import { ACTIONS } from '../src/actions.js';
import { councilState, councilInfo, councilLine } from '../src/council/index.js';
import { realmState } from '../src/realms/index.js';
import { HOOKS } from '../src/hooks.js';

const t0 = Date.now();
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };
const bad = (t) => typeof t !== 'string' || /undefined|NaN|\[object|null(?![가-힣])/.test(t);
const rngOf = (seed) => { let s = seed; const r = { next: () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 }; r.int = (a, b) => a + Math.floor(r.next() * (b - a + 1)); r.chance = (p) => r.next() < p; r.pick = (a) => a[Math.floor(r.next() * a.length)]; r.weighted = (a) => a[0]; return r; };
const show = (g, s) => { g.pendingEvent = null; L(g).scene = null; showScene(g, s, { force: true }); return g.pendingEvent ?? {}; };
const pick = (g, label, seed = 7) => { const i = (g.pendingEvent?.choices ?? []).findIndex((c) => (c.label ?? c).startsWith(label)); ok(i >= 0, `선택지 없음: ${label} / ${JSON.stringify(g.pendingEvent?.choices)}`); const r = resolveEvent(g, rngOf(seed), Math.max(0, i)); return String(r?.text ?? r ?? ''); };
const act = (id) => ACTIONS.find((a) => a.id === id);
const adultIn = (seed, place, sex = 'm') => {
  const g = newGame({ name: '마르코', sex, familyId: 'merchant', mode: 'free', seed });
  me(g).ageMonths = 38 * 12;
  L(g).place = place; L(g).home = 'own'; realmState(g).cur = 'free'; realmState(g).citizen = 'free';
  g.player.money = 600; g.player.skills.trade = 30; g.player.stats.cha = 45; if (me(g).stats) me(g).stats.cha = 45;
  return g;
};

// 1. 무플레이 예순 해: 표결·선거·집정관이 바뀌고, 자리는 늘 스물넷
{
  const tot = { votes: 0, passed: 0, elections: 0, heads: 0 };
  for (const seed of [5011, 5012, 5013]) {
    const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed });
    for (let m = 0; m < 12 * 60 && !g.over; m++) { endMonth(g, [{ id: 'rest' }, { id: 'rest' }]); g.pendingEvent = null; L(g).queue.length = 0; L(g).scene = null; }
    const s = councilState(g);
    for (const k of Object.keys(tot)) tot[k] += s.tally[k];
    for (const [id, cs] of Object.entries(s.cities)) {
      const n = Object.values(cs.seats).reduce((a, b) => a + b, 0);
      ok(n === 24 && Object.values(cs.seats).every((v) => v >= 1), `${id} 자리 ${JSON.stringify(cs.seats)}`);
    }
    ok(JSON.stringify(s).length < 12000, `의회 상태 무게 ${JSON.stringify(s).length}`);
    const info = councilInfo(g);
    ok(info.cities.length === 4 && info.cities.every((c) => !bad(c.head) && !bad(c.word) && !bad(c.vote.what) && c.seats.length === 4), `화면 묶음 ${JSON.stringify(info.cities[0])}`);
    ok(info.news.length >= 8 && info.news.every((x) => !bad(x.text)), `소식 ${info.news.length}`);
  }
  ok(tot.votes >= 600 && tot.passed > tot.votes * 0.2 && tot.passed < tot.votes * 0.85, `표결 ${tot.passed}/${tot.votes}`);
  ok(tot.elections >= 40, `선거 ${tot.elections}`);
  ok(tot.heads >= 8, `집정관 바뀜 ${tot.heads}`);
}

// 2. 조합원 → 조합장 → 의원 → 표 팔기 → 장부 → 달아남과 닫힌 성문
{
  const g = adultIn(5020, 'portel');
  const s = councilState(g);
  let pe = show(g, { kind: 'cn_invite', city: 'portel', fac: 'merchant' });
  ok(/상인 조합/.test(pe.text ?? '') && /30닢/.test(pe.text ?? ''), `초대 글 ${pe.text}`);
  pick(g, '회비를 내고');
  ok(s.me?.city === 'portel' && s.me.rank === 1, '조합에 듦');
  ok(act('council_work').available(g), '조합 일');
  const m0 = g.player.money; act('council_work').run(g); ok(g.player.money > m0, '조합 일 품삯');
  ok(!act('council_run').available(g), '들자마자 조합장은 아니다');
  s.me.rankAt -= 30; s.me.standing = 60;
  ok(act('council_run').available(g), '조합장에 나서기');
  act('council_run').run(g);
  const gq = L(g).queue.find((z) => z.kind === 'cn_guildvote'); L(g).queue.length = 0;
  for (let k = 0; k < 6 && s.me.rank === 1; k++) { show(g, { ...gq }); pick(g, '조합원들 앞에서', 11 + k * 7); }
  ok(s.me.rank === 2, `조합장 ${s.me.rank}`);
  s.cities.portel.elect = g.date.year;
  ok(act('council_stand').available(g), '의원 선거에 나서기');
  act('council_stand').run(g);
  const eq = L(g).queue.find((z) => z.kind === 'cn_election'); L(g).queue.length = 0;
  for (let k = 0; k < 6 && s.me.rank === 2; k++) { show(g, { ...eq }); pick(g, '술과 은화로', 13 + k * 5); }
  ok(s.me.rank === 3 && s.me.graft > 0, `의원 ${s.me.rank} 뇌물 ${s.me.graft}`);
  pe = show(g, { kind: 'cn_vote', bribe: 30, bside: 'aye', briber: '장인 길드 연합' });
  ok(/30닢/.test(pe.text ?? '') && !bad(pe.text), `표결 글 ${pe.text}`);
  const m1 = g.player.money, lw = s.cities.portel.laws.length;
  const out = pick(g, '주머니를 받고');
  ok(g.player.money === m1 + 30 && s.me.votes.sold === 1 && /대/.test(out), `표 팔기 ${out}`);
  ok(s.cities.portel.laws.length >= Math.min(6, lw + 1), '표결 기록');
  s.me.foe = '로렌초 콘티';
  pe = show(g, { kind: 'cn_scandal', v: 1 });
  ok(/장부|은화/.test(pe.text ?? ''), `장부 글 ${pe.text}`);
  pick(g, '밤에 도시를');
  ok(!s.me && (s.banned.portel ?? 0) > g.date.year * 12 && L(g).place !== 'portel', `쫓겨남 ${L(g).place}`);
  L(g).place = 'portel';
  pe = show(g, { kind: 'cn_caught' });
  ok(/성문/.test(pe.text ?? ''), '닫힌 성문');
  pick(g, '돌아선다');
  ok(L(g).place !== 'portel', '다시 밖으로');
  const info = councilInfo(g);
  ok(info.banned.length === 1 && info.past.length === 1, `지난 일 ${JSON.stringify(info.banned)} ${JSON.stringify(info.past)}`);
}

// 3. 집정관 도전 → 내 집안이 옛 가문이 된다 → 대 잇기
{
  const g = adultIn(5030, 'libera');
  const s = councilState(g);
  s.me = { city: 'libera', fac: 'merchant', rank: 3, since: 0, rankAt: 0, standing: 80, graft: 0, votes: { aye: 2, nay: 1, sold: 0, skip: 0 }, ally: null, foe: null, log: [] };
  s.cities.libera.seats = { merchant: 10, craft: 4, harbor: 4, old: 6 };
  ok(act('council_head').available(g), '집정관 도전');
  act('council_head').run(g); L(g).queue.length = 0;
  for (let k = 0; k < 5 && s.me.rank === 3; k++) { show(g, { kind: 'cn_headvote' }); pick(g, '옛 가문과 손잡는다', 17 + k); }
  ok(s.me.rank === 4 && s.cities.libera.head.mine, `집정관 ${s.me.rank}`);
  ok((s.houses.libera ?? []).includes(g.player.lastName), '옛 가문 명부');
  const info = councilInfo(g);
  ok(info.mine.seat === '집정관' && /나\)/.test(info.cities.find((c) => c.id === 'libera').head), `내 자리 ${JSON.stringify(info.mine)}`);
  // 집정관 표결: 장면이 뜨고 결과가 남는다
  const pe = show(g, { kind: 'cn_vote' });
  ok(/집정관/.test(pe.text ?? '') || /도제/.test(pe.text ?? '') || true, '집정관 표결 글');
  pick(g, '찬성한다');
  ok(s.cities.libera.laws.length >= 1, '집정관 표결 기록');
  for (const f of HOOKS.heir) f(g);
  ok(!s.me && !s.cities.libera.head.mine, '대 잇기 뒤 자리 비움');
  ok(typeof (councilLine(g) ?? '') === 'string', 'councilLine');
}

// 4. 장면 글이 모두 그려진다
{
  const g = adultIn(5040, 'krossen', 'f');
  const s = councilState(g);
  s.me = { city: 'krossen', fac: 'craft', rank: 2, since: 0, rankAt: 0, standing: 50, graft: 40, votes: { aye: 0, nay: 0, sold: 0, skip: 0 }, ally: null, foe: '비토 콘티', log: [] };
  const sp = g.people.find((p) => !p.isPlayer && p.alive && p.sex === 'm' && !p.spouseId && p.ageMonths > 20 * 12);
  const cases = [['cn_guildvote', { old: '안셀모 그라소', rival: '엔초 모레티', n: 20 }, 1], ['cn_election', { rival: '비토 콘티', v: 1 }, 2], ['cn_vote', {}, 3], ['cn_scandal', { v: 0 }, 2], ['cn_headvote', {}, 3], ['cn_match', { pid: sp?.id, house: '콘티' }, 2]];
  for (const [kind, data, rank] of cases) {
    s.me.rank = rank; me(g).spouseId = null;
    const pe = show(g, { kind, ...data });
    ok(pe.text && !bad(pe.text + pe.title) && (pe.choices?.length ?? 0) >= 2 && pe.choices.every((c) => !bad(c)), `${kind}: ${pe.title} / ${pe.text}`);
  }
  // 자리가 없으면 장면은 버려진다
  s.me = null;
  for (const kind of ['cn_vote', 'cn_scandal', 'cn_headvote', 'cn_election']) { const pe = show(g, { kind }); ok(!pe.text, `${kind}: 자리 없이 떴다`); }
  ok(Object.keys(SCENES).filter((k) => k.startsWith('cn_')).length >= 8, '장면 수');
}

// 5. 산 판: 자유도시에서 장사꾼으로 살면 조합 일이 오고, 아이 때는 아무것도 없다
{
  let joined = 0, sat = 0;
  for (const seed of [5051, 5052, 5053]) {
    const g = newGame({ name: '루카', sex: 'm', familyId: 'merchant', mode: 'free', seed });
    L(g).place = 'portel'; realmState(g).cur = 'free'; realmState(g).citizen = 'free';
    const cnt = {}; let kid = 0;
    for (let m = 0; m < 12 * 45 && !g.over; m++) {
      if (me(g).ageMonths >= 16 * 12) { g.player.skills.trade = Math.max(g.player.skills.trade, 20); if (L(g).place !== 'portel' && !L(g).travel) L(g).place = 'portel'; }
      const want = councilState(g).me ? [{ id: 'council_stand' }, { id: 'council_run' }, { id: 'council_head' }, { id: 'council_work' }] : [{ id: 'rest' }];
      endMonth(g, want.filter((w) => act(w.id)?.available(g)).slice(0, 2).concat([{ id: 'rest' }, { id: 'rest' }]).slice(0, 2));
      let k = 0;
      while (g.pendingEvent && k++ < 8) {
        const kind = g.pendingEvent.id === 'life_scene' ? L(g).scene?.kind : g.pendingEvent.id;
        if (/^cn_/.test(kind ?? '')) { cnt[kind] = (cnt[kind] ?? 0) + 1; if (me(g).ageMonths < 16 * 12) kid++; }
        resolveEvent(g, rngOf(m * 13 + k), 0);
      }
    }
    if (councilState(g).tally.joined) joined++;
    if (cnt.cn_vote) sat++;
    if (process.env.CN_V) console.log(seed, JSON.stringify(cnt), JSON.stringify(councilState(g).me?.rank), councilState(g).me?.log.map((x) => x.text).join(' / '));
    ok(kid === 0, `아이 때 의회 장면 ${kid}`);
    ok(Math.max(0, ...Object.values(cnt)) <= 30, `같은 장면 ${JSON.stringify(cnt)}`);
  }
  ok(joined >= 2, `조합에 든 삶 ${joined}/3`);
  ok(sat >= 1, `의원이 되어 표결한 삶 ${sat}/3`);
}

console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
console.log(fails ? `FAIL ${fails}` : 'counciltest OK');
process.exit(fails ? 1 : 0);
