// 밑바닥의 하루: 구걸, 무료 급식과 구빈원, 날품팔이, 빈민가 사람들, 굶주림, 손 내미는 기회, 다시 일어서기.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainStat, gainSkill } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, chron, stress, tired, check, gains, up } from '../adventure/core.js';
import { crimeState } from '../crime.js';
import { GANGS } from '../underworld/gangs.js';
import { faithState, feastNow } from '../faith/index.js';
import { fallSick, outbreaksAt } from '../health/index.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { P, ownRng, mi, clamp, here, placeName, free, stat, isSlum, hasPoorhouse, crowdOf, broke, onStreet, folk, friend, logPoor } from './core.js';

const gangHere = (g) => Object.keys(GANGS).find((id) => GANGS[id].place === here(g)) ?? null;
const winter = (g) => [12, 1, 2].includes(g.date.month);

/* ---------- 구걸 ---------- */
ACTIONS.push({
  id: 'poor_beg',
  name: '구걸한다',
  icon: 'coin',
  desc: '장터나 신전 계단에 앉아 손을 내민다. 사람 많은 곳, 축일에 더 받는다. 빈민가에서는 거지 왕초에게 몫을 떼야 한다. 자존심이 깎인다.',
  available: (g) => playerAge(g) >= 6 && free(g) && broke(g) && !P(g).bond,
  run(g, rng) {
    const p = P(g), pl = here(g);
    tired(g, 6); stress(g, 4);
    // 빈민가에서 처음 구걸하면 왕초가 찾아온다
    if (isSlum(pl) && !p.boss[pl] && !sceneQueued(g, 'poor_boss')) queueScene(g, 'poor_boss', {});
    const feast = !!feastNow(g), famine = !!g.world?.famine;
    let got = rng.int(1, 2 + crowdOf(pl) * 2) + (feast ? 3 : 0) + (check(rng, stat(g, 'cha') * 0.6 + stat(g, 'wil') * 0.3, 40) ? 2 : 0);
    if (famine) got = Math.max(0, Math.floor(got / 2));
    let cut = 0;
    if (p.boss[pl] === 'paid' || p.boss[pl] === 'joined') { cut = Math.floor(got / 3); got -= cut; }
    g.player.money += got; p.begged += 1; p.beggedTotal += got;
    const ch = gainStat(g, 'cha', 0.15);
    if (p.boss[pl] === 'refused' && rng.chance(0.3)) { g.player.injuries.push({ name: '왕초 패거리에게 맞은 멍', months: 1 }); stress(g, 6); return `구걸 자리에 앉자마자 왕초 패거리가 와서 걷어찼다. 오늘 얻은 것은 은화 ${got}닢과 멍뿐이다.`; }
    const where = rng.pick(['신전 계단', '장터 어귀', '다리 위', '여관 앞']);
    return `${where}에 앉아 손을 내밀었다. ${rng.pick(['대부분은 못 본 척 지나갔다.', '아이 하나가 빵 조각을 놓고 달아났다.', '어떤 이는 침을 뱉고, 어떤 이는 동전을 던졌다.'])}${feast ? ' 축일이라 사람들 손이 후했다.' : ''}${famine ? ' 흉년이라 다들 제 입도 바쁘다.' : ''} 은화 ${got}닢.${cut ? ` 왕초 몫으로 ${cut}닢을 뗐다.` : ''}${gains([up('매력', ch)])}`;
  },
});

defineScene('poor_boss', {
  need: (g) => free(g) && isSlum(here(g)) && !P(g).boss[here(g)],
  title: () => '거지 왕초',
  text: () => `${J(folk('king').name, '이/가')} 지팡이로 내 그릇을 툭 쳤다. "여긴 내 자리다. 앉으려면 셋에 하나는 내 몫이야. 아니면 다른 고장으로 가든지."`,
  choices: () => [{ label: '몫을 내기로 한다', key: 'paid' }, { label: '거절한다', key: 'refused' }, { label: '아예 왕초 밑에서 일하겠다고 한다', key: 'joined' }],
  resolve(g, rng, s, key) {
    const p = P(g), pl = here(g);
    p.boss[pl] = key;
    if (key === 'paid') return '고개를 끄덕였다. 왕초는 내 자리를 정해 주었다. 신전 계단 왼쪽 셋째 칸.';
    if (key === 'joined') {
      const c = crimeState(g); c.contacts = (c.contacts ?? 0) + 1;
      friend(g, 'king', 15);
      return '왕초가 내 어깨를 두드렸다. "눈이 살아 있군." 그날부터 구걸하며 누가 어디로 드나드는지 왕초에게 일러바쳤다. 뒷골목에 내 얼굴이 알려지기 시작했다.';
    }
    friend(g, 'king', -20); stress(g, 4);
    return '"여긴 누구 땅도 아니오." 왕초는 웃기만 했다. 그 웃음이 마음에 걸린다.';
  },
});

/* ---------- 무료 급식, 구빈원 ---------- */
ACTIONS.push({
  id: 'poor_soup',
  name: '무료 급식 줄에 선다',
  icon: 'home',
  desc: '신전 뒷마당의 무료 급식이나 구빈원에 간다. 배를 채우고, 구빈원이 있는 고장이면 하룻밤 잘 데도 얻는다. 대신 설교를 듣거나 일을 거들어야 한다.',
  available: (g) => playerAge(g) >= 6 && free(g) && broke(g),
  run(g, rng) {
    const p = P(g), pl = here(g);
    p.ateAt = mi(g); p.hunger = 0; p.soup += 1;
    tired(g, -6); stress(g, -2);
    const f = faithState(g); if (f.god !== 'none') f.devotion = clamp(f.devotion + 1, 0, 100);
    let bed = '';
    if (hasPoorhouse(g, pl) && onStreet(g)) { p.bedAt = mi(g); tired(g, 5); bed = ` 구빈원 마루에 자리를 얻었다. 대신 아침마다 마당을 쓸어야 한다.${p.built[pl] ? ' 내가 세운 구빈원이다. 아는 얼굴들이 고개를 숙였다.' : ''}`; }
    if (rng.chance(0.25) && !sceneQueued(g, 'poor_slum')) { const ev = slumPick(p, rng, ['share', 'sick']); if (ev) queueScene(g, 'poor_slum', { ev }); }
    return `${rng.pick(['멀건 보리죽 한 그릇과 딱딱한 빵 한 조각.', '사제가 감사 기도를 길게 했다. 죽이 식었다.', '줄이 길었다. 앞사람이 넘어지자 아무도 일으키지 않았다.'])}${bed}`;
  },
});

/* ---------- 날품팔이 ---------- */
const JOBS = [
  { id: 'dock', text: '부두에서 짐을 날랐다. 소금 자루가 어깨를 파고들었다.', pay: [3, 6], stat: 'str' },
  { id: 'sewer', text: '하수도를 쳤다. 냄새가 사흘은 갈 것이다.', pay: [3, 5], stat: 'wil' },
  { id: 'wall', text: '성벽 고치는 데서 돌을 날랐다. 감독관의 채찍이 등 뒤에서 울었다.', pay: [2, 5], stat: 'str' },
  { id: 'field', text: '성 밖 밭에서 하루 종일 김을 맸다.', pay: [2, 4], stat: 'str' },
];
ACTIONS.push({
  id: 'poor_labor',
  name: '날품팔이 장에 선다',
  icon: 'coin',
  desc: '새벽 인력 시장에 서서 하루 일거리를 기다린다. 부두 짐, 하수도, 성벽 돌. 품삯은 적고 몸은 상한다. 돌림병이 돌면 시체를 치우는 일도 있다.',
  available: (g) => playerAge(g) >= 12 && free(g) && here(g) !== 'ern' && g.player.money < 60 && !P(g).bond && !L(g).job && !g.army?.service,
  run(g, rng) {
    const p = P(g), pl = here(g);
    tired(g, 16); stress(g, 3); p.labored += 1;
    if (!rng.chance(0.75 + (stat(g, 'str') >= 40 ? 0.15 : 0))) return '해가 뜰 때까지 서 있었지만 나를 고르는 사람은 없었다. 힘센 사내들부터 데려갔다.';
    const plague = outbreaksAt(g, pl).length > 0;
    if (plague && rng.chance(0.5)) {
      const pay = rng.int(8, 12);
      g.player.money += pay;
      if (rng.chance(0.25)) fallSick(g, 'plague', 'me', rng);
      return `돌림병으로 죽은 사람들을 수레에 실어 성 밖 구덩이에 묻었다. 천으로 입을 가렸지만 소용이 있는지 모르겠다. 은화 ${pay}닢.`;
    }
    const j = rng.pick(JOBS), pay = rng.int(j.pay[0], j.pay[1]) + (crowdOf(pl) > 1 ? 1 : 0);
    g.player.money += pay;
    const st = gainStat(g, j.stat, 0.4);
    if (rng.chance(0.06)) { g.player.injuries.push({ name: '날품팔이하다 다친 허리', months: 2 }); return `${j.text} 해 질 녘 허리에서 뚝 소리가 났다. 은화 ${pay}닢.${gains([up(j.stat === 'str' ? '힘' : '의지', st)])}`; }
    return `${j.text} 은화 ${pay}닢.${gains([up(j.stat === 'str' ? '힘' : '의지', st)])}`;
  },
});

/* ---------- 빈민가 사람들 ---------- */
const SLUM_EVS = ['share', 'kid', 'winter', 'gang', 'sick'];
// 같은 사람의 같은 장면은 한 삶에 두 번까지만 (30단계 헤드: 브란트의 빵 반 덩이를 한 삶에 서른 번 넘게 받았다). 겨울은 철마다 다르니 넉넉히.
HOOKS.heir.push((g) => { if (g.poor) g.poor.slumSeen = {}; }); // 새 사람에게는 새 얼굴
function slumPick(p, rng, evs) {
  const seen = (p.slumSeen ??= {});
  const ok = evs.filter((e) => (seen[e] ?? 0) < (e === 'winter' ? 6 : e === 'gang' ? 3 : 2));
  if (!ok.length) return null;
  const ev = rng.pick(ok); seen[ev] = (seen[ev] ?? 0) + 1;
  return ev;
}
defineScene('poor_slum', {
  need: (g, s) => free(g) && SLUM_EVS.includes(s.ev) && (s.ev !== 'gang' || !!gangHere(g)),
  title: (g, s) => ({ share: '다리 밑의 저녁', kid: '빠른 손', winter: '언 밤', gang: '뒷골목의 손짓', sick: '기침 소리' }[s.ev]),
  text: (g, s) => {
    if (s.ev === 'share') return `${J(folk('knight').name, '이/가')} 모닥불 옆에 자리를 내주었다. 품에서 곰팡이 핀 빵 반 덩이를 꺼냈다. "기사는 나눠 먹는 법이지." 손이 떨리고 있었다.`;
    if (s.ev === 'kid') return `${J(folk('kid').name, '이/가')} 내 옆에 앉더니 손바닥을 펴 보였다. 은 단추 세 개. "이거 어디 가서 팔면 돼요?" 멀리서 경비병이 누굴 찾고 있다.`;
    if (s.ev === 'winter') return '밤사이 눈이 왔다. 손발이 감각이 없다. 다리 밑 사람들이 하나둘 쓰레기를 모아 불을 피운다.';
    if (s.ev === 'gang') return `${GANGS[gangHere(g)].name}의 사내가 빈민가를 돌며 쓸 만한 사람을 고른다. 내 앞에서 멈췄다. "배고프지? 우리 쪽에 오면 굶지는 않는다."`;
    return `${folk('widow').name}의 기침이 밤새 그치지 않는다. 아이 둘이 엄마 옷자락만 잡고 있다.${g.player.money >= 3 ? ' 내 주머니에는 은화 몇 닢이 있다.' : ''}`;
  },
  choices: (g, s) => {
    if (s.ev === 'share') return [{ label: '같이 먹고 옛이야기를 듣는다', key: 'eat' }, { label: '사양하고 내 것을 내놓는다', key: 'give' }];
    if (s.ev === 'kid') return [{ label: '장물아비 있는 곳을 알려 준다', key: 'fence' }, { label: '돌려주라고 타이른다', key: 'scold' }, { label: '경비병에게 넘긴다', key: 'turn' }];
    if (s.ev === 'winter') return [{ label: '사람들 틈에 끼어 불을 쬔다', key: 'huddle' }, { label: '신전 문을 두드린다', key: 'temple' }, { label: '혼자 버틴다', key: 'alone' }];
    if (s.ev === 'gang') return [{ label: '따라간다', key: 'go' }, { label: '고개를 젓는다', key: 'no' }];
    return [...(g.player.money >= 3 ? [{ label: '남은 은화 3닢을 쥐여 준다', key: 'coin' }] : []), { label: '약초꾼을 데려온다', key: 'fetch' }, { label: '못 들은 척 돌아눕는다', key: 'turn' }];
  },
  resolve(g, rng, s, key) {
    const p = P(g);
    if (s.ev === 'share') { friend(g, 'knight', 12); stress(g, -4); p.ateAt = mi(g); return key === 'give' ? '내 주머니의 마른 무를 꺼내 놓았다. 브란트가 웃었다. 이가 반은 빠져 있었다. 그날 밤은 춥지 않았다.' : '브란트는 북쪽 전쟁 이야기를 했다. 반은 거짓말 같았지만 끝까지 들었다. 빵은 시었지만 맛있었다.'; }
    if (s.ev === 'kid') {
      if (key === 'fence') { friend(g, 'kid', 15); const c = crimeState(g); c.contacts = (c.contacts ?? 0) + 1; deed(g, 'honest', -2, '소매치기 아이에게 장물아비를 알려 주었다.'); return '골목 끝 전당포를 가리켰다. 다음 날 핀이 구운 소시지 하나를 들고 왔다. "나눠 먹어요."'; }
      if (key === 'scold') { friend(g, 'kid', -5); deed(g, 'kind', 1, '소매치기 아이를 타일렀다.'); return '핀은 코웃음을 쳤다. "굶어 봤어요?" 할 말이 없었다. 그래도 단추 하나는 내 손에 두고 갔다. 돌려줄 사람을 찾아보라는 듯이.'; }
      friend(g, 'kid', -40); deed(g, 'honest', 2, '소매치기 아이를 경비병에게 넘겼다.'); deed(g, 'kind', -3, '굶는 아이를 경비병에게 넘겼다.');
      return '경비병이 아이 목덜미를 잡아 끌고 갔다. 빈민가 사람들이 나를 보는 눈이 달라졌다.';
    }
    if (s.ev === 'winter') {
      if (key === 'huddle') { friend(g, 'hag', 8); stress(g, -2); return '넝마주이 할멈이 누더기 하나를 던져 주었다. 열 명이 넘는 사람이 불 하나에 붙어 밤을 났다. 아무도 말하지 않았다.'; }
      if (key === 'temple') { const f = faithState(g); if (f.god !== 'none') f.devotion = clamp(f.devotion + 3, 0, 100); p.ateAt = mi(g); return '늙은 사제가 문을 열어 주었다. 제단 앞 돌바닥에서 잤지만 바람은 없었다. 아침에 따뜻한 물 한 잔을 받았다.'; }
      stress(g, 6); tired(g, 10);
      if (rng.chance(0.5)) fallSick(g, 'lung', 'me', rng);
      return '혼자 벽에 기대 밤을 새웠다. 아침이 되자 가슴 깊은 데서 기침이 올라왔다.';
    }
    if (s.ev === 'gang') {
      if (key === 'go' && gangHere(g)) { const c = crimeState(g); c.contacts = (c.contacts ?? 0) + 2; if (!sceneQueued(g, 'gang_offer') && !c.gang) queueScene(g, 'gang_offer', { id: gangHere(g) }, { first: true }); p.ateAt = mi(g); return '사내를 따라갔다. 창고 안에 고기 굽는 냄새가 났다. 굶지 않는다는 말은 사실이었다.'; }
      return '고개를 저었다. 사내는 어깨를 으쓱하고 다음 사람에게 갔다. 그 사람은 따라갔다.';
    }
    // 아픈 과부
    if (key === 'coin') { if (g.player.money < 3) return '줄 것이 없었다.'; g.player.money -= 3; p.given += 3; friend(g, 'widow', 20); deed(g, 'kind', 3, '빈민가 과부에게 마지막 은화를 쥐여 주었다.'); return '엘레는 은화를 받고 한참 울었다. 다음 날 약초 달인 냄새가 다리 밑에 퍼졌다.'; }
    if (key === 'fetch') { friend(g, 'widow', 10); tired(g, 6); deed(g, 'kind', 2, '아픈 과부에게 약초꾼을 데려왔다.'); return check(rng, stat(g, 'cha'), 35) ? '약초꾼 노파를 졸라 데려왔다. 노파는 돈 대신 내일 장작을 패 달라고 했다.' : '약초꾼들은 빈민가라는 말에 다들 문을 닫았다. 빈손으로 돌아왔다.'; }
    stress(g, 4); friend(g, 'widow', -10);
    return '돌아누웠다. 기침 소리는 새벽까지 이어졌다. 나도 살아야 한다.';
  },
});

/* ---------- 손 내미는 기회 ---------- */
defineScene('poor_chance', {
  need: (g, s) => free(g) && broke(g) && ['porter', 'scribe', 'old'].includes(s.ev),
  title: () => '뜻밖의 손',
  text: (g, s) => ({
    porter: '장터에서 짐을 지던 늙은 상인이 나를 불렀다. "그 어깨면 짐꾼으로 쓰겠군. 석 달 따라다니면 품삯을 쳐 주지."',
    scribe: '신전 서기가 편지를 대신 써 줄 사람을 찾는다고 한다. 글을 아는 거지는 드물다.',
    old: '길에서 옛 얼굴을 만났다. 잘 차려입은 그는 나를 알아보고 걸음을 멈췄다.',
  }[s.ev]),
  choices: (g, s) => {
    if (s.ev === 'scribe') return [...((g.player.skills.letters ?? 0) >= 20 ? [{ label: '써 주겠다고 한다', key: 'yes' }] : []), { label: '글을 모른다고 돌아선다', key: 'no' }];
    if (s.ev === 'old') return [{ label: '사정을 털어놓고 돈을 빌린다', key: 'yes' }, { label: '모른 척 고개를 돌린다', key: 'no' }];
    return [{ label: '따라간다', key: 'yes' }, { label: '거절한다', key: 'no' }];
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return s.ev === 'old' ? '고개를 돌렸다. 그 사람도 더 묻지 않았다. 자존심 하나는 남았다.' : '고개를 저었다.';
    if (s.ev === 'porter') { g.player.money += 18; tired(g, 12); const st = gainStat(g, 'str', 0.6); logPoor(g, '늙은 상인의 짐꾼이 되었다.'); return `석 달 동안 상인의 짐을 졌다. 상인은 말이 없었지만 품삯은 꼬박꼬박 주었다. 은화 18닢을 모았다.${gains([up('힘', st)])}`; }
    if (s.ev === 'scribe') { g.player.money += 15; const k = gainSkill(g, 'letters', 0.6, 'int'); return `신전 뒷방에서 남의 편지를 썼다. 연서도, 유언도, 빚 독촉도. 은화 15닢.${gains([up('글', k)])}`; }
    const n = rng.int(10, 25); g.player.money += n; stress(g, 3);
    return `그는 아무것도 묻지 않고 은화 ${n}닢을 쥐여 주었다. "갚을 생각 말게." 고맙고, 부끄러웠다.`;
  },
});

/* ---------- 다시 일어서기 ---------- */
defineScene('poor_rise', {
  need: (g) => free(g) && !P(g).risen,
  title: () => '다시 일어서다',
  text: (g) => { const lo = P(g).lowest; return `${lo ? `${lo.y}년 ${placeName(lo.place)}의 길바닥` : '길바닥'}에서 잠들던 때가 있었다. 지금 내 주머니에는 은화 ${g.player.money}닢이 있고, 돌아갈 잠자리가 있다. 가끔 그때 일이 꿈에 나온다.`; },
  choices: (g) => [...(g.player.money >= 20 ? [{ label: '빈민가에 빵을 돌린다 (은화 20닢)', key: 'bread' }] : []), { label: '그때 나를 도운 사람들을 찾아간다', key: 'visit' }, { label: '다시는 돌아보지 않는다', key: 'forget' }],
  resolve(g, rng, s, key) {
    const p = P(g); p.risen = true;
    chron(g, `${g.player.name}, 밑바닥에서 다시 일어서다.`, 50);
    note(g, '밑바닥에서 다시 일어섰다.');
    logPoor(g, '밑바닥에서 다시 일어섰다.');
    if (key === 'bread') { if (g.player.money < 20) return '빵 살 돈이 모자랐다.'; g.player.money -= 20; p.given += 20; deed(g, 'generous', 5, '빈민가에 빵을 돌렸다.'); return '빵 수레를 끌고 다리 밑으로 갔다. 누군가 내 이름을 불렀다. 나를 기억하는 사람이 있었다.'; }
    if (key === 'visit') { const best = Object.entries(p.friends).sort((a, b) => b[1] - a[1])[0]; deed(g, 'loyal', 3, '어려울 때 도운 사람들을 잊지 않았다.'); stress(g, -6); return best ? `${J(folk(best[0]).name, '을/를')} 찾았다. 그 자리에 그대로 있었다. 말없이 술 한 병을 건넸다.` : '다리 밑에 가 보았지만 아는 얼굴은 없었다. 다들 어디로 갔을까.'; }
    stress(g, -2);
    return '그 골목으로는 다시 가지 않았다. 길을 돌아서 다녔다.';
  },
});

/* ---------- 매달: 굶주림, 길바닥의 날수, 구빈원 잠자리, 기회와 빈민가의 일 ---------- */
HOOKS.afterMonth.push((g) => {
  if (g.over || !g.player) return;
  const p = P(g), now = mi(g), rng = ownRng(g, 1);
  if (onStreet(g) && !L(g).travel) {
    p.streetMonths += 1; p.lowMonths += 1;
    if (!p.lowest) p.lowest = { y: g.date.year, place: here(g) };
    // 구빈원에서 잔 달은 길바닥 벌을 덜어 준다
    if (p.bedAt === now - 1 || p.bedAt === now) { tired(g, -8); stress(g, -6); }
    if (p.ateAt < now - 1 && g.player.money < 2) p.hunger += 1; else p.hunger = Math.max(0, p.hunger - 1);
    if (p.hunger >= 2) { stress(g, 4); tired(g, 6); }
    if (p.hunger >= 3 && rng.chance(0.25)) { g.player.injuries.push({ name: '굶주려 여윈 몸', months: 2 }); p.hunger = 1; note(g, '며칠을 굶었다. 거울 속 얼굴이 낯설다.'); }
    if (free(g) && now - p.slumAt >= 3 && rng.chance(isSlum(here(g)) ? 0.3 : 0.15) && !sceneQueued(g, 'poor_slum')) {
      p.slumAt = now;
      const evs = ['share', 'kid', 'sick', ...(winter(g) ? ['winter', 'winter'] : []), ...(gangHere(g) ? ['gang'] : [])];
      const ev = slumPick(p, rng, evs);
      if (ev) queueScene(g, 'poor_slum', { ev });
    }
  } else p.hunger = 0;
  if (broke(g) && free(g) && now - p.chanceAt >= 8 && p.lowMonths >= 2 && rng.chance(0.08) && !sceneQueued(g, 'poor_chance')) {
    p.chanceAt = now;
    queueScene(g, 'poor_chance', { ev: rng.pick(['porter', 'scribe', 'old']) });
  }
  // 다시 일어섬: 넉 달 넘게 바닥에 있었는데 이제 돈과 잠자리가 있다
  if (!p.risen && p.lowMonths >= 4 && g.player.money >= 120 && !onStreet(g) && free(g) && !sceneQueued(g, 'poor_rise')) queueScene(g, 'poor_rise', {});
});
