// 현상금 사냥꾼의 삶 (50단계): 조합에 이름 올리기, 게시판에서 방 떼기, 흔적 쫓기, 숨은 자를 마주하기(산 채로·죽여서·다시 보기·사정 듣기·놓아주기·뒷돈),
// 경쟁 사냥꾼, 내가 잡은 사람의 식구. 새 행동은 조합 지부가 있는 고장에서, 또는 쫓는 방이 있을 때만 보인다.
import { ACTIONS } from '../actions.js';
import { gainSkill, gainStat } from '../game.js';
import { L, defineScene, queueScene, sceneQueued, note, tired, stress, check } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { byId } from '../events/core.js';
import { kill } from '../npc.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  B, mi, here, placeName, pick, free, grown, RANKS, HALLS, hallAt, KINDS, isMember, huntOf, openPosts, wanted, reward, blog, rivalName, STYLE, trailPush,
} from './core.js';
import { endPost, moveQuarry } from './world.js';

const stat = (g, id) => g.player.stats[id] ?? 0;
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const injure = (g, name, months) => g.player.injuries.push({ name, months });
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const M = (g) => B(g).me;
const postById = (g, id) => B(g).posts.find((p) => p.id === id) ?? null;
const sexWord = (p) => (p.sex === 'f' ? '여자' : '사내');

/* ---------- 조합에 이름 올리기 ---------- */
ACTIONS.push({
  id: 'bh_join', name: '현상금 사냥꾼 조합에 이름을 올린다', icon: 'chain',
  desc: '조합 지부에서 은화 다섯 닢을 내고 명부에 이름을 올린다. 게시판의 방을 떼어 사람을 쫓고 상금을 받는다. 쫓기는 몸이면 받아 주지 않는다.',
  available: (g) => grown(g) && free(g) && !isMember(g) && !!hallAt(here(g)) && !wanted(g) && playerPower(g) >= 12 && (M(g).quitAt == null || mi(g) - M(g).quitAt >= 24),
  run(g) {
    const me = M(g);
    if (g.player.money < 5) return '창구 서기가 손을 내밀었다. 은화 다섯 닢이 없었다. "돈이 생기면 다시 오시오."';
    pay(g, 5);
    Object.assign(me, { member: true, rank: 0, pts: 0, joinedAt: mi(g), hunt: null, clue: 0, known: false });
    blog(g, `${HALLS[here(g)]}에서 조합 명부에 이름을 올렸다.`);
    note(g, '현상금 사냥꾼 조합에 이름을 올렸다.');
    return `${HALLS[here(g)]}. 서기가 명부에 내 이름을 적고 무쇠 대신 나무로 깎은 패를 내밀었다. "${RANKS[0]}. 산 사람을 데려오면 상금을 다 주고, 죽은 사람을 데려오면 덜 준다. 엉뚱한 사람을 데려오면 한 푼도 없다." 벽에는 얼굴 그림이 빽빽했다.`;
  },
});

/* ---------- 게시판 ---------- */
ACTIONS.push({
  id: 'bh_board', name: '현상금 게시판을 본다', icon: 'seal',
  desc: '조합 지부 게시판에 붙은 방을 살피고, 쫓을 사람을 하나 고른다.',
  available: (g) => isMember(g) && free(g) && !!hallAt(here(g)) && !huntOf(g) && openPosts(g, here(g)).some((p) => p.need <= M(g).rank) && !sceneQueued(g, 'bh_board'),
  run(g) { M(g).boardAt = mi(g); queueScene(g, 'bh_board', {}, { first: true }); return '게시판 앞에 섰다. 바람에 종이 귀퉁이가 들썩였다.'; },
});
const boardPosts = (g) => openPosts(g, here(g)).sort((a, b) => a.need - b.need || b.reward - a.reward).slice(0, 5);
defineScene('bh_board', {
  need: (g) => isMember(g) && !huntOf(g) && boardPosts(g).some((p) => p.need <= M(g).rank),
  title: () => '현상금 게시판',
  text: (g) => {
    const ps = boardPosts(g), ok = ps.filter((p) => p.need <= M(g).rank), locked = ps.length - ok.length;
    const lines = ok.map((p) => `${p.name}, ${KINDS[p.kind].name}. ${p.crime}. 은화 ${p.reward}닢${p.dead ? ', 생사 불문' : ', 산 채로만'}.`);
    return `${HALLS[here(g)]}. 얼굴 그림 아래 글씨가 빽빽하다. ${lines.join(' ')}${locked ? ` 상금이 큰 방 ${locked}장에는 "패를 보이시오"라고 붉게 적혀 있다.` : ''} 내 목에 걸린 패: ${RANKS[M(g).rank]}.`;
  },
  choices: (g) => [
    ...boardPosts(g).map((p) => (p.need > M(g).rank ? null : { label: `${J(p.name, '을/를')} 쫓는다 (상금 ${p.reward}닢)`, key: `p${p.id}` })).filter(Boolean),
    { label: '오늘은 그냥 둔다', key: 'none' },
  ],
  resolve(g, rng, s, key) {
    if (key === 'none') {
      const big = boardPosts(g).find((p) => p.need > M(g).rank);
      return big ? `${big.name}의 방에는 "${RANKS[big.need]} 이상"이라고 붉게 적혀 있었다. 아직 내 패로는 뗄 수 없다.` : '방을 하나하나 읽기만 하고 돌아섰다.';
    }
    const p = postById(g, +key.slice(1));
    if (!p || p.end || p.by) return '손을 뻗는 사이 다른 사냥꾼이 그 방을 먼저 뜯어 갔다.';
    const me = M(g);
    p.by = 'me'; p.takenAt = mi(g); me.hunt = p.id; me.clue = 0; me.known = false;
    trailPush(p, here(g), `${placeName(p.hall)} 게시판에서 방을 뗐다. ${KINDS[p.kind].name}, ${p.crime}.`);
    blog(g, `${J(p.name, '을/를')} 쫓는 방을 뗐다.`);
    return `방을 떼어 품에 넣었다. ${p.name}. ${sexWord(p)}. 서기가 덧붙였다. "${placeName(p.hall)}에서 멀리 가진 않았을 거요. 기한은 ${Math.max(1, p.until - mi(g))}달."`;
  },
});

/* ---------- 흔적 쫓기 ---------- */
ACTIONS.push({
  id: 'bh_track', name: '흔적을 쫓는다', icon: 'eye',
  desc: '쫓는 사람의 행방을 묻고 다닌다. 주막·마구간·나루터에서 말을 사고, 흔적이 가리키는 고장으로 간다.',
  available: (g) => { const h = huntOf(g); return isMember(g) && free(g) && !!h && (!M(g).known || h.loc === here(g)) && !sceneQueued(g, 'bh_corner'); },
  run(g, rng) {
    const h = huntOf(g), me = M(g), pl = here(g);
    tired(g, 8);
    if (me.known && h.loc === pl) {
      queueScene(g, 'bh_corner', { post: h.id }, { first: true });
      return `흔적이 ${placeName(pl)}에서 끝난다. 이제 찾기만 하면 된다.`;
    }
    const v = stat(g, 'sen') * 0.5 + stat(g, 'int') * 0.3 + me.rank * 6;
    const hit = check(rng, v, 18 + h.pow * 0.3);
    if (hit) gainStat(g, 'sen', 0.3);
    me.clue += hit ? 2 : 1;
    const ask = pick(rng, ['주막 주인에게 은화 한 닢을 쥐여 주고', '마구간 소년에게 빵을 사 주며', '나루터 뱃사공 옆에 앉아', '장터 거지에게 동전을 던져 주고', '여관 하녀에게 그림을 보여 주며']);
    if (h.loc === pl) {
      if (me.clue >= 3) { me.known = true; trailPush(h, pl, `${placeName(pl)}에서 비슷한 ${sexWord(h)}를 봤다는 사람을 찾았다.`); return `${ask} 물었다. "그 얼굴이면 저 아래 골목에서 봤소. 이름은 다르게 대던데." ${J(h.name, '이/가')} 이 고장에 있다.`; }
      return `${ask} 물었다. ${hit ? '비슷한 사람을 봤다는 말이 하나 나왔다. 조금 더 물으면 될 것 같다.' : '다들 고개를 저었다. 하지만 누군가 눈을 피했다.'}`;
    }
    if (me.clue >= 2) {
      me.known = true; me.clue = 0;
      trailPush(h, pl, `${placeName(pl)}에서 들은 말: ${placeName(h.loc)} 쪽으로 갔다.`);
      return `${ask} 물었다. "그 사람이면 ${placeName(h.loc)} 가는 짐마차를 얻어 탔소." 흔적이 ${J(placeName(h.loc), '을/를')} 가리킨다. 그리로 가야 한다.`;
    }
    return `${ask} ${J(h.name, '을/를')} 물었다. ${hit ? '길 하나를 좁혔다. 한 번만 더 물으면 갈 곳이 보일 것 같다.' : '헛걸음이었다. 엉뚱한 사람 이야기만 실컷 들었다.'}`;
  },
});

ACTIONS.push({
  id: 'bh_go', name: '흔적을 따라 길을 떠난다', icon: 'travel',
  desc: '흔적이 가리키는 고장으로 간다. 길에는 달이 걸리고, 그사이 숨은 자가 또 옮길 수도 있다.',
  available: (g) => { const h = huntOf(g); return isMember(g) && free(g) && !!h && M(g).known && h.loc !== here(g) && !sceneQueued(g, 'travel'); },
  run(g) { const h = huntOf(g); queueScene(g, 'travel', { to: h.loc }, { first: true }); return `흔적은 ${J(placeName(h.loc), '을/를')} 가리킨다. 짐을 꾸렸다.`; },
});

/* ---------- 숨은 자를 마주하다 ---------- */
function capture(g, rng, p, alive) {
  const me = M(g), s = B(g);
  if (p.wrong) {
    me.wrong += 1; me.pts = Math.max(0, me.pts - (alive ? 3 : 6));
    const victim = `${p.sex === 'f' ? '과부' : '떠돌이 일꾼'} ${pick(rng, p.sex === 'f' ? ['헬가', '우타', '에르나'] : ['쿠노', '알프레트', '벤노'])}`;
    s.kin.push({ name: p.kin.name, rel: p.kin.rel, of: victim, how: alive ? 'wrong' : 'killed', at: mi(g), done: false });
    p.wrong = false; moveQuarry(g, rng, p);
    blog(g, `엉뚱한 사람을 ${alive ? '잡았다' : '죽였다'}. ${victim}.`);
    if (!alive) {
      reportCrime(g, 'murder', here(g), { mult: 0.5 });
      deed(g, 'kind', -4, '현상금에 눈이 멀어 엉뚱한 사람을 베었다더라');
      return `영주관 마당에서 서기가 얼굴 그림과 시신을 번갈아 보더니 고개를 저었다. "이 사람이 아니오." ${victim}. 이름만 비슷한 사람이었다. 상금은 없었다. 내 이름이 경비대 장부에 올랐다.`;
    }
    deed(g, 'honest', -1, null); stress(g, 8);
    return `영주관 마당에서 서기가 고개를 저었다. "이 사람이 아니오. 귀에 흉터가 없잖소." 묶어 온 사람은 ${victim}였다. 밧줄을 풀어 주었지만 그 사람은 나를 끝까지 노려보았다. 진짜는 이미 다른 고장으로 떠난 뒤였다.`;
  }
  const n = reward(p, alive);
  g.player.money += n; me.earned += n; me.pts += alive ? 3 + p.need : 2 + p.need; renown(g, 2 + p.need);
  if (alive) me.caught += 1; else me.killed += 1;
  me.hunt = null; me.known = false; me.clue = 0;
  s.kin.push({ name: p.kin.name, rel: p.kin.rel, of: p.name, how: alive ? 'caught' : 'killed', at: mi(g), done: false });
  endPost(g, p, alive ? 'caught' : 'killed');
  if (!alive && p.pid != null) { const q = byId(g, p.pid); if (q?.alive) kill(g, q, '현상금 사냥꾼의 칼'); }
  if (!alive) deed(g, 'kind', -1, null);
  gainSkill(g, 'sword', 0.6);
  blog(g, `${J(p.name, '을/를')} ${alive ? '산 채로 넘겼다' : '죽여서 넘겼다'}. 은화 ${n}닢.`);
  return alive
    ? `손목을 묶어 ${placeName(here(g))} 경비대 초소로 끌고 갔다. 서기가 얼굴 그림과 맞대어 보고 장부에 줄을 그었다. 상금 은화 ${n}닢. ${J(p.name, '은/는')} 끌려가며 한 번도 나를 보지 않았다.`
    : `시신을 수레에 싣고 경비대 초소로 갔다. 서기가 코를 막고 얼굴을 확인했다. "죽은 쪽은 덜 주오." 은화 ${n}닢. 수레를 씻는 데 한나절이 걸렸다.`;
}
function lose(g, rng, p, how) {
  const me = M(g);
  injure(g, how, 2); stress(g, 8);
  moveQuarry(g, rng, p);
  trailPush(p, here(g), `${placeName(here(g))}에서 코앞까지 갔다가 놓쳤다.`);
  me.known = false; me.clue = 0;
  return `${J(p.name, '은/는')} 생각보다 빨랐다. ${how}. 정신을 차렸을 때는 이미 늦었다. 다시 흔적부터 찾아야 한다.`;
}
const HIDE_AS = {
  escapee: ['방앗간에서 이름을 바꾸고 일한다', '성당 구빈원 줄에 섞여 있다'],
  outlaw: ['주막 뒷방에서 노름판을 벌이고 있다', '말 시장에서 훔친 말을 팔고 있다'],
  pirate: ['부두 창고에서 짐꾼으로 일한다', '선술집 이층에 틀어박혀 있다'],
  debtor: ['다른 이름으로 작은 가게를 열었다', '친척 집 헛간에 숨어 지낸다'],
  killer: ['푸줏간 뒤 골목방에 산다', '대장간에서 풀무질을 한다'],
  witch: ['마을 끝 오두막에서 약초를 말린다', '숲 가장자리 움막에 산다'],
};
defineScene('bh_corner', {
  need: (g, s) => { const p = postById(g, s.post); return isMember(g) && !!p && !p.end && M(g).hunt === p.id && p.loc === here(g); },
  title: (g, s) => postById(g, s.post).name,
  text: (g, s) => {
    const p = postById(g, s.post);
    const as = HIDE_AS[p.kind][p.id % 2];
    let t = `찾았다. 얼굴 그림과 닮은 ${J(sexWord(p), '이/가')} ${as}. 아직 나를 보지 못했다.`;
    if (s.looked) t += ' 가까이서 다시 보았다. 틀림없다.';
    if (s.heard) t += ` 들은 사정은 이랬다. ${p.story}`;
    if (p.kind === 'witch' && !s.heard) t += ' 동네 아이 하나가 그 집 문간에 앉아 약초 다발을 묶고 있다.';
    return t;
  },
  choices: (g, s) => {
    const p = postById(g, s.post);
    return [
      { label: '산 채로 묶는다', key: 'alive' },
      ...(p.dead ? [{ label: '그 자리에서 벤다', key: 'kill' }] : []),
      ...(!s.looked ? [{ label: '다가가기 전에 얼굴을 다시 본다', key: 'look' }] : []),
      ...(!s.heard ? [{ label: '먼저 말을 걸어 사정을 듣는다', key: 'listen' }] : [{ label: '못 본 것으로 하고 놓아준다', key: 'free' }]),
      ...(['debtor', 'outlaw', 'pirate', 'escapee'].includes(p.kind) ? [{ label: '은화를 받고 못 본 척한다', key: 'bribe' }] : []),
    ];
  },
  resolve(g, rng, s, key) {
    const p = postById(g, s.post), me = M(g);
    const pow = playerPower(g) + me.rank * 4 + (s.looked ? 8 : 0) + (s.heard ? -4 : 0);
    if (key === 'alive') return check(rng, pow, p.pow) ? capture(g, rng, p, true) : lose(g, rng, p, pick(rng, ['밧줄을 꺼내는 순간 등잔이 날아왔다', '골목 담을 넘는 발뒤꿈치만 보았다', '숨겨 둔 칼에 팔뚝을 베였다']));
    if (key === 'kill') return check(rng, pow + 15, p.pow) ? capture(g, rng, p, false) : lose(g, rng, p, pick(rng, ['칼을 뽑는 소리에 놈이 먼저 몸을 날렸다', '빗나간 칼끝이 벽에 박혔다']));
    if (key === 'look') {
      if (check(rng, stat(g, 'sen') * 0.6 + stat(g, 'int') * 0.3, 22)) {
        if (p.wrong) { p.wrong = false; moveQuarry(g, rng, p); trailPush(p, here(g), `${placeName(here(g))}에서 찾은 사람은 닮은 얼굴일 뿐이었다.`); gainStat(g, 'sen', 0.5); return `가까이서 보니 귀에 흉터가 없다. 손도 일꾼 손이다. 닮았을 뿐 다른 사람이다. 하마터면 엉뚱한 사람을 끌고 갈 뻔했다. 진짜는 다른 데 있다.`; }
        queueScene(g, 'bh_corner', { ...s, looked: true }, { first: true });
        return '모퉁이에 서서 한참 지켜보았다. 걸음걸이, 귀의 흉터, 왼손 버릇. 그림 속 사람이 맞다.';
      }
      return lose(g, rng, p, '너무 오래 쳐다봤다. 눈이 마주치자 놈이 뒷문으로 사라졌다');
    }
    if (key === 'listen') {
      queueScene(g, 'bh_corner', { ...s, heard: true }, { first: true });
      return `"방에 뭐라고 적혀 있든," ${J(p.name, '이/가')} 낮게 말했다. "내 말도 들어 보시오."`;
    }
    if (key === 'free') {
      me.freed += 1; me.pts = Math.max(0, me.pts - 1); me.hunt = null; me.known = false; me.clue = 0;
      endPost(g, p, 'freed'); deed(g, 'kind', 2, p.kind === 'witch' ? '마녀로 쫓기던 사람을 놓아주었다더라' : null);
      blog(g, `${J(p.name, '을/를')} 놓아주었다.`);
      return `방을 접어 화롯불에 넣었다. "오늘 밤 안에 이 고장을 떠나시오." ${J(p.name, '은/는')} 대답 대신 고개를 깊이 숙였다. 조합에는 놓쳤다고 적었다. 서기는 믿는 눈치가 아니었다.`;
    }
    // bribe
    const n = Math.round(p.reward * (0.3 + rng.next() * 0.3));
    g.player.money += n; me.bribed += 1; me.pts = Math.max(0, me.pts - 1); me.hunt = null; me.known = false;
    p.by = null; moveQuarry(g, rng, p); deed(g, 'honest', -2, null);
    blog(g, `${p.name}에게서 은화 ${n}닢을 받고 놓아주었다.`);
    return `${J(p.name, '이/가')} 품에서 꾸러미를 꺼냈다. 은화 ${n}닢. 방을 다시 조합 게시판에 붙여 두면 다른 누군가가 쫓을 것이다. 그건 내 일이 아니다.`;
  },
});

/* ---------- 경쟁 사냥꾼 ---------- */
defineScene('bh_rival', {
  need: (g, s) => { const p = postById(g, s.post); return isMember(g) && !!p && !p.end && M(g).hunt === p.id && !!B(g).rivals.find((r) => r.id === s.rival && !r.gone); },
  title: (g, s) => rivalName(B(g).rivals.find((r) => r.id === s.rival)),
  text: (g, s) => {
    const r = B(g).rivals.find((x) => x.id === s.rival), p = postById(g, s.post);
    return `주막에서 ${STYLE[r.style].name} 사냥꾼 ${J(rivalName(r), '이/가')} 내 맞은편에 앉았다. ${RANKS[r.rank]}. 그도 ${J(p.name, '을/를')} 쫓는다. "${p.loc === here(g) || M(g).known ? '너도 냄새를 맡았군.' : '어디 있는지 알지?'} 둘이 같은 고기를 뜯으면 둘 다 배고파."`;
  },
  choices: () => [
    { label: '상금을 반씩 나누자고 한다', key: 'share' },
    { label: '그보다 먼저 길을 나선다', key: 'race' },
    { label: '이 방에서 손을 떼라고 을러댄다', key: 'threat' },
    { label: '방을 넘겨준다', key: 'yield' },
  ],
  resolve(g, rng, s, key) {
    const r = B(g).rivals.find((x) => x.id === s.rival), p = postById(g, s.post), me = M(g);
    if (key === 'share') {
      p.reward = Math.round(p.reward / 2); me.known = true;
      trailPush(p, here(g), `${J(rivalName(r), '과/와')} 손잡았다. 숨은 곳은 ${placeName(p.loc)}.`);
      return `${J(rivalName(r), '은/는')} 잔을 비우고 고개를 끄덕였다. "${placeName(p.loc)}. 내가 아는 건 그게 다야." 상금은 반으로 줄었지만 길은 짧아졌다.`;
    }
    if (key === 'race') {
      if (check(rng, stat(g, 'agi') * 0.6 + stat(g, 'sen') * 0.4 + me.rank * 4, 26 + r.rank * 5)) { me.known = true; trailPush(p, here(g), `${rivalName(r)}보다 먼저 길을 나섰다. 숨은 곳은 ${placeName(p.loc)}.`); return `새벽 닭이 울기 전에 말을 달렸다. 그가 일어났을 때 나는 이미 ${placeName(p.loc)} 길 위였다.`; }
      me.hunt = null; me.known = false; endPost(g, p, 'rival'); r.caught += 1;
      blog(g, `${J(rivalName(r), '이/가')} ${J(p.name, '을/를')} 먼저 잡았다.`);
      return `한발 늦었다. 사흘 뒤 ${J(rivalName(r), '이/가')} ${J(p.name, '을/를')} 끌고 지나가며 모자를 살짝 들어 보였다.`;
    }
    if (key === 'threat') {
      if (check(rng, playerPower(g) + me.rank * 4, 28 + r.rank * 8)) { me.pts += 1; return `탁자에 칼을 꽂았다. ${J(rivalName(r), '은/는')} 한참 칼자루를 보다가 웃으며 일어섰다. "이번 건 네 거다. 다음엔 모르지."`; }
      injure(g, '경쟁 사냥꾼에게 맞은 턱', 1); me.hunt = null; me.known = false; endPost(g, p, 'rival'); r.caught += 1;
      return `칼을 꽂기도 전에 주먹이 날아왔다. 바닥에서 일어났을 때 그는 내 품의 방까지 가져간 뒤였다.`;
    }
    me.hunt = null; me.known = false; p.by = r.id; me.pts = Math.max(0, me.pts - 1);
    return `방을 탁자 위로 밀어 주었다. ${J(rivalName(r), '은/는')} 놀란 얼굴로 그것을 집었다. "빚 하나 진 걸로 하지."`;
  },
});

/* ---------- 내가 잡은 사람의 식구 ---------- */
const kinOf = (g, s) => B(g).kin.find((k) => k.name === s.kin && k.of === s.of && k.at === s.when && !k.done);
defineScene('bh_kin', {
  need: (g, s) => !!kinOf(g, s),
  title: (g, s) => `${s.of}의 ${kinOf(g, s).rel}`,
  text: (g, s) => {
    const k = kinOf(g, s);
    const what = k.how === 'killed' ? '내가 벤' : k.how === 'wrong' ? '내가 엉뚱하게 묶어 갔던' : '내가 잡아 넘긴';
    return `${what} ${s.of}의 ${k.rel} ${J(k.name, '이/가')} 물어물어 나를 찾아왔다. ${k.how === 'killed' ? '눈이 붉다. 소매 안에서 무언가를 쥐고 있다.' : k.how === 'wrong' ? '"내 사람이 무슨 죄였소? 동네에선 아직도 손가락질을 하오."' : '"그 사람이 없으니 우리 집은 굶소. 당신은 은화를 받았겠지."'}`;
  },
  choices: (g, s) => {
    const k = kinOf(g, s);
    return [
      { label: '은화 열 닢을 쥐여 준다', key: 'pay' },
      { label: '고개를 숙이고 말없이 듣는다', key: 'bow' },
      { label: '"할 일을 했을 뿐이오."', key: 'cold' },
      ...(k.how === 'killed' ? [{ label: '소매 속 손목을 먼저 붙든다', key: 'grab' }] : []),
    ];
  },
  resolve(g, rng, s, key) {
    const k = kinOf(g, s); k.done = true;
    if (key === 'pay') { const n = pay(g, 10); deed(g, 'generous', 1, null); return n >= 10 ? `은화를 쥐여 주었다. ${J(k.name, '은/는')} 그것을 한참 내려다보다 받았다. 고맙다는 말은 없었다. 바라지도 않았다.` : `주머니를 털어도 은화 ${n}닢뿐이었다. ${J(k.name, '은/는')} 그것을 바닥에 내던지고 갔다.`; }
    if (key === 'bow') { stress(g, 6); deed(g, 'kind', 1, null); return `${J(k.name, '은/는')} 오래 울고 오래 욕했다. 끝까지 들었다. 돌아서는 등이 조금은 가벼워 보였다.`; }
    if (key === 'grab') {
      if (check(rng, stat(g, 'agi') + stat(g, 'sen') * 0.5, 30)) return `손목을 잡자 부엌칼이 떨어졌다. ${J(k.name, '은/는')} 주저앉아 울었다. 경비대를 부르지 않았다.`;
      injure(g, '옆구리의 칼자국', 2); return `한발 늦었다. 옆구리가 뜨거웠다. ${J(k.name, '은/는')} 칼을 떨어뜨리고 달아났다. 쫓지 않았다.`;
    }
    if (k.how === 'killed' && rng.chance(0.5)) { injure(g, '옆구리의 칼자국', 2); return `"할 일?" 소매에서 부엌칼이 나왔다. 피했지만 옆구리가 베였다. ${J(k.name, '은/는')} 군중 속으로 사라졌다.`; }
    deed(g, 'kind', -1, null);
    return `${J(k.name, '은/는')} 침을 뱉고 돌아섰다. 조합 사람들은 그게 이 일의 값이라고 했다.`;
  },
});

export { postById };
