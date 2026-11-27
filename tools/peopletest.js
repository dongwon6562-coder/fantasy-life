import '../src/content.js';
// 48단계 도우미2: 사람 사이 글에서 찾아 고친 것이 다시 생기지 않게 (1분 안)
import { newGame, endMonth, me } from '../src/game.js';
import { EVENTS, resolveEvent } from '../src/events/core.js';
import { fixParents } from '../src/narrative/parents.js';
import { generateVillage, makePerson } from '../src/npc.js';
import { feastAt } from '../src/rumor/index.js';
import { localize } from '../src/races/local.js';
import { showScene, L } from '../src/adventure/core.js';
import { J } from '../src/narrative/text.js';
import { RACE_NAMES } from '../src/races/data.js';
import { kinState, myKids } from '../src/kin/index.js';
import { loveState } from '../src/love/index.js';
import { feudState } from '../src/feud/index.js';
import { makePerson as mkP } from '../src/npc.js';

const t0 = Date.now();
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };
const rngOf = (seed) => { let s = seed; const r = { next: () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648 }; r.int = (a, b) => a + Math.floor(r.next() * (b - a + 1)); r.chance = (p) => r.next() < p; r.pick = (a) => a[Math.floor(r.next() * a.length)]; r.weighted = (a, w) => a[0]; return r; };

// 1. 부모 잃은 아이: 살아 있는 쪽·거둔 사람으로, 남의 부모·할아버지·죽은 부모 이름은 그대로
{
  const mk = (fa, ma, fam = 'farmer', adopt) => ({ player: { id: 1, familyId: fam }, adopt, people: [{ id: 1, ageMonths: 60, fatherId: 2, motherId: 3, isPlayer: true }, { id: 2, name: '오토', alive: fa }, { id: 3, name: '리제', alive: ma }] });
  ok(fixParents(mk(false, true), '부모에게 말한다') === '어머니에게 말한다', '아버지 없음 → 어머니');
  ok(fixParents(mk(true, false), '엄마가 이야기를 해 주었다.') === '아빠가 이야기를 해 주었다.', '어머니 없음 → 아빠');
  ok(fixParents(mk(false, false, 'slum_orphan'), '부모는 놀랐다.') === '할멈은 놀랐다.', '빈민가 고아 → 할멈');
  ok(fixParents(mk(false, false, 'farmer', { guardian: { kind: 'chapel', name: '고아원 사제' } }), '아빠를 따라갔다.') === '사제를 따라갔다.', '고아원 → 사제');
  ok(fixParents(mk(false, true), '한스의 아버지가 웃었다. 할아버지도.') === '한스의 아버지가 웃었다. 할아버지도.', '남의 아버지·할아버지는 그대로');
  ok(fixParents(mk(false, true), '아버지 오토가 죽었다.') === '아버지 오토가 죽었다.', '죽은 부모 이름 글은 그대로');
  ok(fixParents(mk(false, true), '엄마랑 아빠랑 장에 갔다.') === '엄마와 장에 갔다.', `겹침 하나로 ${fixParents(mk(false, true), '엄마랑 아빠랑 장에 갔다.')}`);
  ok(fixParents(mk(true, true), '부모에게 말한다') === '부모에게 말한다', '둘 다 있으면 그대로');
  const big = mk(false, true); big.people[0].ageMonths = 30 * 12;
  ok(fixParents(big, '부모에게 말한다') === '부모에게 말한다', '어른은 그대로');
}

// 2. 한 마을에 같은 이름이 겹치지 않게
{
  let dup = 0;
  for (let s = 1; s <= 8; s++) { const ps = generateVillage(rngOf(s * 977)); const names = ps.map((p) => p.name); dup += names.length - new Set(names).size; }
  ok(dup === 0, `처음 마을 이름 겹침 ${dup}`);
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4801 });
  for (let m = 0; m < 30 * 12; m++) { endMonth(g, [{ id: 'rest' }, { id: 'rest' }]); g.pendingEvent = null; }
  const c = {}; for (const p of g.people) if (p.alive && (p.place ?? 'ern') === 'ern' && !p.isPlayer) c[p.name] = (c[p.name] ?? 0) + 1;
  const most = Math.max(...Object.values(c));
  ok(most <= 2, `서른 해 뒤 에른 같은 이름 ${most}`);
  ok(!g.people.some((p) => p.alive && p.name === '에른스트' && (p.place ?? 'ern') === 'ern'), '에른 마을에 에른스트');
}

// 3. 이미 어울리던 아이를 처음 보는 것처럼 쓰지 않는다
{
  const e = EVENTS.find((x) => x.id === 'ch_bestie_meet');
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4802 });
  const kid = g.people.find((p) => !p.isPlayer && p.alive && p.ageMonths < 12 * 9 && p.ageMonths > 12 * 3) ?? g.people.find((p) => !p.isPlayer);
  kid.known = true; kid.affection = 30;
  const known = e.text(g, { id: kid.id, known: true });
  ok(/요즘 자주 어울리던/.test(known) && !/너 저 집 애지/.test(known), `아는 아이 첫 만남 글: ${known}`);
  ok(/너 저 집 애지/.test(e.text(g, { id: kid.id, known: false })), '모르는 아이는 첫 만남');
  ok(e.choices[1].label(g, { known: true }) !== '쭈뼛거리며 바라본다', '아는 아이에게 쭈뼛');
}

// 4. 축제 끝 문장이 해마다 같지 않게
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4803 });
  g.world.famine = true; g.world.famineMonths = 99;
  const seen = new Set();
  for (let y = 0; y < 3; y++) { g.date.year = 520 + y; const f = feastAt(g, 'ern', 9); if (f) seen.add(f.text); }
  ok(seen.size >= 2, `흉년 축제 글 세 해 ${seen.size}가지`);
}

// 5. 형제 어린 시절 장면은 종류마다 한 번
{
  let worst = 0;
  for (const seed of [4811, 4812, 4813, 4814]) {
    const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed });
    const cnt = {};
    for (let m = 0; m < 16 * 12; m++) {
      endMonth(g, [{ id: 'play' }, { id: 'rest' }]);
      let k = 0;
      while (g.pendingEvent && k++ < 8) { const kind = g.pendingEvent.id === 'life_scene' ? L(g).scene?.kind : g.pendingEvent.id; if (/^sib_(blame|share|protect|rival)$/.test(kind)) cnt[kind] = (cnt[kind] ?? 0) + 1; resolveEvent(g, rngOf(m * 31 + k), 0); }
    }
    worst = Math.max(worst, ...Object.values(cnt), 0);
  }
  ok(worst <= 1, `형제 어린 시절 장면 한 종류 최대 ${worst}번`);
}

// 6. 다른 종족 땅에서 만든 사람은 그 종족 이름
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4804 });
  let elf = 0, n = 0;
  for (let i = 0; i < 12; i++) { const p = makePerson(rngOf(i + 5), { sex: i % 2 ? 'm' : 'f', ageMonths: 30 * 12 }); p.id = 90000 + i; p.place = 'silverleaf'; localize(g, p, 'silverleaf'); n++; if (p.race === 'elf' && [...RACE_NAMES.elf.m, ...RACE_NAMES.elf.f].includes(p.name)) elf++; }
  ok(elf >= 8 && elf < n, `은잎 마을 사람 ${elf}/${n} 엘프 이름`);
  const h = makePerson(rngOf(3), { ageMonths: 30 * 12 }); h.id = 90100; localize(g, h, 'ern');
  ok(!h.race, '에른 사람은 그대로');
}

// 7. 조사: 이름 뒤 '이다/다'
ok(J('아일린', '이/가') === '아일린이' && J('미나', '이다/다') === '미나다' && J('카를', '이다/다') === '카를이다', '조사 이다/다');

// 8. 감방: 두 번째부터는 '다시'
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4805 });
  const s1 = { kind: 'pr_arrive', where: '감옥', boss: '레온', old: '지몬' };
  const show = (extra) => { g.pendingEvent = null; L(g).scene = null; showScene(g, { ...s1, ...extra }, { force: true }); return g.pendingEvent ?? {}; };
  ok(show({}).title === '감방의 첫날' && show({ again: 1 }).title === '다시 감방', '감방 제목');
  ok(/또 왔냐/.test(show({ again: 1, knew: true }).text) && /다시 이 냄새/.test(show({ again: 1 }).text), '감방 다시 글');
}


// 9. 어른·노년 (둘째): 유품·늙음·거둔 아이·유언·떠난 자식·사별 뒤·화해
{
  const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4821 });
  const meP = me(g);
  meP.ageMonths = 40 * 12;
  // 거둔 아이: 갓난아기 이야기를 하지 않는다
  const kid = mkP(rngOf(11), { sex: 'm', ageMonths: 10 * 12, lastName: g.player.lastName, motherId: meP.id }); kid.id = 95001; kid.adopted = true; kid.alive = true;
  g.people.push(kid); meP.childIds.push(kid.id);
  kinState(g).kids[kid.id] = { temper: 'gentle', gift: 'str', giftKnown: false, path: null, bond: 50, learned: 0, rebelled: 0, left: null, disowned: false, adopted: true, grudge: {}, jobSet: false, born: 9 * 12, parent: g.player.id, adoptedAt: 0 };
  const show = (s) => { g.pendingEvent = null; L(g).scene = null; showScene(g, s, { force: true }); return g.pendingEvent ?? {}; };
  const kp = show({ kind: 'kin_path', id: kid.id });
  ok(kp.text && !/울음소리|안기면/.test(kp.text) && /거두어 온/.test(kp.text), `거둔 아이 가르칠 길: ${kp.text}`);
  // 유언: 똑같이 나누면 이름을 붙이지 않는다
  const kid2 = mkP(rngOf(12), { sex: 'f', ageMonths: 12 * 12, lastName: g.player.lastName, motherId: meP.id }); kid2.id = 95002; g.people.push(kid2); meP.childIds.push(kid2.id);
  kinState(g).will = { mode: 'equal', heirId: kid.id };
  const wl = show({ kind: 'kin_will' });
  ok(/"자식들에게 똑같이 나눈다"/.test(wl.text ?? ''), `유언 표시: ${wl.text}`);
  // 떠난 자식은 떠난 고장에 산다
  kinState(g).kids[kid.id].left = 'harfen';
  endMonth(g, [{ id: 'rest' }, { id: 'rest' }]); g.pendingEvent = null;
  ok(kid.place === 'harfen', `떠난 자식 사는 곳 ${kid.place}`);
  // 배우자는 내가 집을 두고 사는 고장에 같이 산다
  const sp = mkP(rngOf(13), { sex: 'm', ageMonths: 42 * 12 }); sp.id = 95003; sp.alive = true; sp.place = 'solaris'; g.people.push(sp); meP.spouseId = sp.id; sp.spouseId = meP.id;
  L(g).home = 'own'; L(g).place = 'ern';
  endMonth(g, [{ id: 'rest' }, { id: 'rest' }]); g.pendingEvent = null;
  ok((sp.place ?? 'ern') === 'ern', `배우자 사는 곳 ${sp.place}`);
  // 사별 뒤 '다시 봄': 아직은 아니라고 하면 해가 지나기 전엔 다시 묻지 않고, 햇수도 맞다
  meP.spouseId = null; sp.spouseId = null;
  const v = loveState(g); v.widowed = { id: 1, name: '레온', at: (g.date.year * 12 + g.date.month) - 5 * 12, vow: false };
  const la = show({ kind: 'love_after', seed: 1 });
  ok(/떠난 지 5해/.test(la.text ?? ''), `다시 봄 햇수: ${la.text}`);
  resolveEvent(g, rngOf(3), 1);
  ok(/떠난 지 5해/.test(show({ kind: 'love_after', seed: 2 }).text ?? ''), '아직은 아니다 뒤에도 햇수 그대로');
  ok(v.widowed.askAt != null, '다시 봄 물은 때 기록');
  // 몸 나이로 늙는다: 쉰 넘은 글은 예순·일흔에 다르다
  const ev = EVENTS.find((x) => x.id === 'adult_body_aging');
  meP.ageMonths = 72 * 12; const t70 = ev.text(g, {}); meP.ageMonths = 52 * 12; const t50 = ev.text(g, {});
  ok(t70 !== t50 && /지팡이/.test(t70), '늙음 글이 나이에 따라');
  // 유품: 대를 이은 앞 주인은 빼고, 집안마다 남는 것이 다르다
  const inh = EVENTS.find((x) => x.id === 'adult_inheritance');
  const t = inh.text(g, { id: meP.motherId ?? kid.id });
  ok(!/손때 묻은 연장/.test(t) || g.player.familyId !== 'farmer', `농부 유품: ${t}`);
}
// 10. 화해: 받아들여졌는지에 따라 무릎 꿇은 글이 다르다
{
  const outs = new Set();
  for (const heat of [20, 50, 90]) {
    const g = newGame({ name: '하린', sex: 'f', familyId: 'farmer', mode: 'free', seed: 4830 + heat });
    me(g).ageMonths = 30 * 12;
    const p = g.people.find((x) => !x.isPlayer && x.alive && x.ageMonths > 20 * 12);
    feudState(g).grudges[p.id] = { heat, gen: 0, why: ['나에 대한 헛소문을 퍼뜨렸다'], since: 0 };
    g.pendingEvent = null; L(g).scene = null; showScene(g, { kind: 'feud_peace', id: p.id }, { force: true });
    const ks = g.pendingEvent?.choices?.findIndex((c) => (c.label ?? c) === '무릎을 꿇는다');
    if (ks >= 0) { const r = resolveEvent(g, rngOf(5), ks); outs.add(String(r?.text ?? r ?? g.lastResults?.at?.(-1)?.text ?? JSON.stringify(g.log?.[0] ?? ''))); }
  }
  if (process.env.PT_SHOW) console.log([...outs]);
  ok(outs.size >= 2, `무릎 글 ${outs.size}가지`);
}

console.log(`${((Date.now() - t0) / 1000).toFixed(1)}초`);
console.log(fails ? `FAIL ${fails}` : 'peopletest OK');
process.exit(fails ? 1 : 0);
