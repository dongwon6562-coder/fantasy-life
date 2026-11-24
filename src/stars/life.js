// 하늘을 보는 삶: 별 보기(별자리 익히기), 천문대 견습생에서 별 읽는 학자, 궁정 점성술사까지, 별점 봐 주기(정직하게 혹은 사기로),
// 뱃사람에게 별 지도 팔기. 사건: 하늘 사건이 뜬 밤, 일식 예고 걸기, 바다에서 별로 길 잡기, 달력 다툼에서 편 들기. 앞머리 st_.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { gainSkill } from '../game.js';
import { EVENTS, age, here, onRoad, money, spend, stress } from '../events/core.js';
import { L, defineScene, queueScene, sceneQueued, note, chron } from '../adventure/core.js';
import { J } from '../narrative/text.js';
import { deed } from '../repute/index.js';
import { atSea, PORTS } from '../sea/core.js';
import { SS, OBS, SKY, CONSTELLATIONS, ROLE_NAME, activeSky, obsHere, slog, clamp, mi, placeName, hasGlass } from './state.js';

const M = (g) => SS(g).me;
const busy = (g) => g.over || g.bondage?.slave || g.crime?.jailed || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const grown = (g) => age(g) >= 14 && !busy(g);
const settled = (g) => grown(g) && !onRoad(g);
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const lore = (g, n) => { const me = M(g); me.lore = clamp(me.lore + n, 0, 100); const k = Math.min(CONSTELLATIONS.length, Math.floor(me.lore / 7)); if (k > me.known) me.known = k; };
const skyNow = (g) => activeSky(g).filter((s) => !M(g).sawn.includes(s.id)).sort((a, b) => (b.kind === 'eclipse') - (a.kind === 'eclipse'))[0] ?? null;
const BIG_TOWN = (pl) => ['leocast', 'serenia', 'solaris', 'portel', 'klein', 'harfen', 'saltmare'].includes(pl);

// 매달: 학자와 궁정 점성술사는 녹봉을 받고, 걸어 둔 일식 예고가 맞았는지 가린다
export function starsAfterMonth(g) {
  if (!g.stars || g.over || !g.life) return;
  const S = SS(g), me = S.me, now = mi(g);
  if (me.role !== 'none' && me.obs && here(g) === OBS[me.obs]?.place && !onRoad(g)) {
    const pay = me.role === 'court' ? 8 : me.role === 'astronomer' ? 3 : 0;
    if (pay) g.player.money += pay;
  }
  const p = me.predicted;
  if (!p) return;
  const hit = S.sky.concat(S.past).find((s) => s.kind === 'eclipse' && s.at === p.guess);
  if (hit) {
    me.right += 1; me.predicted = null; renown(g, 8); lore(g, 4);
    if (me.obs) S.obs[me.obs].fame = clamp(S.obs[me.obs].fame + 6, 0, 100);
    deed(g, 'honest', 3, '셈해 둔 대로 일식이 왔다');
    chron(g, `${g.player.name}, 일식을 맞혀 이름을 얻다.`, 45);
    note(g, '한낮에 해가 먹혀 들어갔다. 내가 셈해 둔 바로 그달이다. 비웃던 사람들이 고개를 돌렸다.');
    slog(g, '내 일식 예고가 맞았다.');
  } else if (now > p.guess) {
    me.wrong += 1; me.predicted = null; stress(g, 6); renown(g, -3);
    if (me.obs) S.obs[me.obs].fame = clamp(S.obs[me.obs].fame - 4, 5, 100);
    note(g, '예고한 달이 지났다. 해는 멀쩡히 떴다 졌다. 장터에서 아이들이 냄비를 두드리며 나를 놀렸다.');
    slog(g, '내 일식 예고가 빗나갔다.');
  }
}
HOOKS.afterMonth.push((g) => starsAfterMonth(g));
// 대를 이으면: 부모의 별 지도와 셈 공책이 남는다
HOOKS.heir.push((g) => {
  if (!g.stars) return;
  const S = SS(g), old = S.me;
  const keep = old.lore >= 30 ? Math.round(old.lore * 0.25) : 0;
  S.me = Object.assign({}, old, { lore: 0, known: 0, role: 'none', obs: null, predicted: null, sawn: [], since: mi(g) });
  if (keep) { lore(g, keep); note(g, `${old.role !== 'none' ? `${ROLE_NAME[old.role]}이던 ` : ''}부모가 남긴 별 지도와 셈 공책을 펼쳐 보았다. 여백마다 작은 글씨가 빼곡하다.`); }
});

/* ---------- 별 보기 ---------- */
ACTIONS.push({
  id: 'st_watch',
  name: '별 보기',
  icon: 'eye',
  desc: '밤에 지붕이나 언덕에 올라 하늘을 본다. 별자리를 익히고 행성의 길을 눈에 담는다.',
  // 아무 때나 보이지 않는다: 하늘 사건이 떴거나, 별을 좀 알거나, 글을 깊이 알거나, 천문대 고장이거나, 바다 위일 때
  available: (g) => grown(g) && M(g).lore < 100 && (activeSky(g).length > 0 || M(g).lore >= 3 || (g.player.skills.letters ?? 0) >= 25 || (!onRoad(g) && !!obsHere(here(g))) || atSea(g)),
  run(g, rng) {
    const me = M(g), s = activeSky(g)[0] ?? null;
    const before = me.known;
    lore(g, rng.float(1.2, 2.6) + (g.player.skills.letters ?? 0) / 60 + (s ? 1.5 : 0));
    gainSkill(g, 'letters', 0.1);
    stress(g, -2);
    const learned = me.known > before ? ` 오늘 밤 처음으로 ${J(CONSTELLATIONS[me.known - 1], '을/를')} 짚어 냈다.` : '';
    if (onRoad(g)) return `길가에 짐을 풀고 누워 하늘을 보았다. ${atSea(g) ? '갑판이 흔들려도 별은 제자리다.' : '모닥불이 사그라들자 별이 쏟아졌다.'}${learned}`;
    if (s) return `${J(SKY[s.kind].name, '이/가')} 떠 있는 밤이다. 동네 사람들도 다들 하늘을 보고 있었다. 나는 그 둘레 별들의 자리를 하나하나 적었다.${learned}`;
    return `${rng.pick(['지붕에 올라 누웠다. 처음엔 다 같은 별 같더니, 오래 보니 밝기도 빛깔도 다르다.', '언덕에 올라 해가 진 쪽부터 별이 하나씩 켜지는 것을 보았다.', '달이 없는 밤이다. 은하수가 강처럼 흘렀다. 떠돌이 별 하나가 지난달보다 동쪽으로 옮겨 있었다.', '서리 내린 밤, 숨이 하얗다. 쟁기 별 손잡이 끝을 따라가 북쪽 별을 찾았다.'])}${learned}`;
  },
});

/* ---------- 천문대 ---------- */
ACTIONS.push({
  id: 'st_learn',
  name: '천문대',
  icon: 'book',
  desc: '이 고장 천문대를 찾아간다. 견습생으로 들어가 셈을 배우고, 학자가 되고, 궁정 점성술사 자리까지 노릴 수 있다.',
  available: (g) => settled(g) && !!obsHere(here(g)) && M(g).lore >= 5 && !sceneQueued(g, 'st_learn'),
  run(g) { queueScene(g, 'st_learn'); return '천문대 계단을 올랐다.'; },
});
defineScene('st_learn', {
  need: (g) => !!obsHere(here(g)) && !onRoad(g),
  title: (g) => OBS[obsHere(here(g))].name,
  text: (g) => {
    const k = obsHere(here(g)), o = SS(g).obs[k], me = M(g);
    const mine = me.obs === k && me.role !== 'none';
    return `${OBS[k].name} 꼭대기 방에는 놋쇠 고리와 별 지도, 그을린 셈 공책이 어지럽다. ${o.glass ? '창가에 긴 망원경이 받침대에 얹혀 있다. ' : ''}${J(o.head, '이/가')} ${mine ? `${ROLE_NAME[me.role]}인 나를 보고 고개를 끄덕인다.` : '낯선 얼굴을 보고 눈썹을 올린다.'}${o.found.length ? ` 벽에는 이 천문대가 찾아낸 것들이 적혀 있다: ${o.found.slice(-2).join(', ')}.` : ''}`;
  },
  choices: (g) => {
    const k = obsHere(here(g)), me = M(g), mine = me.obs === k;
    const out = [];
    if (me.role === 'none' || !mine) out.push({ label: '견습생으로 받아 달라고 청한다', key: 'join' });
    else out.push({ label: '밤새 셈을 돕고 배운다', key: 'study' });
    if (mine && me.role === 'student' && me.lore >= 40) out.push({ label: '학자로 이름을 올려 달라고 한다', key: 'rise' });
    if (mine && me.role === 'astronomer' && k === 'leocast' && me.lore >= 60) out.push({ label: '궁정 점성술사 자리에 나선다', key: 'court' });
    if (SS(g).obs[k].glass && mine) out.push({ label: '망원경을 들여다본다', key: 'glass' });
    out.push({ label: '그냥 둘러보고 나온다', key: 'none' });
    return out;
  },
  resolve(g, rng, s, key) {
    const S = SS(g), me = S.me, k = obsHere(here(g)), o = S.obs[k];
    if (!k) return '천문대 문이 잠겨 있었다.';
    if (key === 'none') { lore(g, 0.5); return '셈 공책 몇 장을 넘겨 보다 나왔다. 숫자들이 별자리처럼 늘어서 있었다.'; }
    if (key === 'join') {
      const letters = g.player.skills.letters ?? 0;
      if (letters < 8 && me.lore < 20) return `${J(o.head, '은/는')} 내게 숫자 몇 개를 셈해 보라더니 고개를 저었다. "글과 셈부터 익혀 오게. 하늘은 도망가지 않네."`;
      me.role = 'student'; me.obs = k; me.since = mi(g); lore(g, 2);
      slog(g, `${OBS[k].name} 견습생이 되었다.`);
      return `${J(o.head, '이/가')} 낡은 셈 공책 한 권을 내밀었다. "오늘부터 밤마다 별 자리를 적게. 백 밤을 빠지지 않으면 그때 이야기하지." ${OBS[k].name} 견습생이 되었다.`;
    }
    if (key === 'study') {
      lore(g, rng.float(2, 4)); gainSkill(g, 'letters', 0.3); g.player.fatigue = (g.player.fatigue ?? 0) + 8;
      if (OBS[k].by === 'sea') gainSkill(g, 'sailing', 0.15);
      return rng.pick([`밤새 행성의 자리를 적고 새벽에 셈을 맞췄다. ${J(o.head, '이/가')} 내 셈에서 틀린 자리 하나를 짚어 주었다.`, '옛 학자들의 별 목록을 베껴 적었다. 별 하나하나에 이름과 밝기가 붙어 있다. 손목이 저렸다.', '달이 별을 가리는 시각을 셈했다. 두 각이 틀렸다. 다시 셈했다. 동이 텄다.']);
    }
    if (key === 'rise') {
      if (rng.chance(0.4 + (me.lore - 40) / 60)) { me.role = 'astronomer'; renown(g, 4); slog(g, `${OBS[k].name}의 별 읽는 학자가 되었다.`); chron(g, `${g.player.name}, ${OBS[k].name} 학자가 되다.`, 25); return `${J(o.head, '이/가')} 내 셈 공책을 한참 넘기더니 학자 명부에 내 이름을 적었다. 이제 다달이 녹봉이 나온다. 작은 돈이지만 하늘을 보는 값이다.`; }
      return `${J(o.head, '은/는')} 내 셈에서 틀린 곳 셋을 짚었다. "한 해 더 보게."`;
    }
    if (key === 'court') {
      const ok = rng.chance(0.3 + (me.lore - 60) / 80 + (me.right ? 0.2 : 0));
      if (ok) { me.role = 'court'; renown(g, 8); slog(g, '궁정 점성술사가 되었다.'); chron(g, `${g.player.name}, 궁정 점성술사가 되다.`, 45); return '왕 앞에서 다음 철 하늘을 풀었다. 길한 별과 흉한 별을 섞어서. 왕은 한참 듣다가 손가락을 들었다. 궁정 점성술사 자리가 내 것이 되었다. 녹봉이 늘었고, 말 한마디가 무거워졌다.'; }
      deed(g, 'honest', -1, '궁정 점성술사 자리를 노렸다');
      return '궁정에서는 내 말보다 다른 사람의 말이 더 듣기 좋았던 모양이다. 자리는 왕비 쪽 사람에게 갔다.';
    }
    lore(g, 3); me.sawn.push(-1 - mi(g)); if (me.sawn.length > 30) me.sawn.splice(0, me.sawn.length - 30);
    return `망원경에 눈을 댔다. ${rng.pick(['달 표면에 산과 골짜기가 있다. 그림자가 길다.', '목성 곁에 작은 별 넷이 한 줄로 서 있다. 지난밤과 자리가 다르다.', '희뿌연 은하수가 작은 별들의 무더기로 갈라졌다.', '토성 양옆에 귀 같은 것이 붙어 있다.'])} 한참 눈을 떼지 못했다.`;
  },
});

/* ---------- 별점 ---------- */
ACTIONS.push({
  id: 'st_horoscope',
  name: '별점 봐 주기',
  icon: 'scroll',
  desc: '장터에서 별점을 봐 준다. 아는 만큼 정직하게 풀어 줄 수도, 듣고 싶은 말을 팔 수도 있다.',
  available: (g) => settled(g) && M(g).lore >= 12 && BIG_TOWN(here(g)) && !sceneQueued(g, 'st_horoscope'),
  run(g) { queueScene(g, 'st_horoscope'); return '장터 한쪽에 별 그림 천을 깔았다.'; },
});
defineScene('st_horoscope', {
  need: (g) => !onRoad(g),
  title: () => '별점',
  text: (g, s) => {
    const who = s.who ??= ['혼례를 앞둔 비단 장수 딸', '배를 띄울 날을 묻는 선주', '아들이 언제 돌아오냐는 늙은 어미', '소송에 이길지 묻는 땅 주인', '아이를 가질 수 있냐는 젊은 부부'][(mi(g) + (M(g).reads ?? 0)) % 5];
    const sky = activeSky(g)[0];
    return `${J(who, '이/가')} 은화를 쥐고 내 앞에 앉았다. 태어난 달과 시를 댄다.${sky ? ` 하늘에 ${J(SKY[sky.kind].name, '이/가')} 떠 있는 철이라 다들 별점에 귀가 얇다.` : ''} 내 별 그림 천 위에 촛불이 흔들린다.`;
  },
  choices: () => [
    { label: '아는 대로 정직하게 풀어 준다', key: 'honest' },
    { label: '듣고 싶은 말을 해 주고 값을 올린다', key: 'cheat' },
    { label: '별은 앞날을 말하지 않는다고 일러 준다', key: 'truth' },
  ],
  resolve(g, rng, s, key) {
    const me = M(g), sky = activeSky(g).length ? 1.5 : 1;
    me.reads += 1;
    if (key === 'honest') {
      const pay = Math.round(rng.int(1, 3) * sky + me.lore / 40); g.player.money += pay;
      if (rng.chance(0.4)) deed(g, 'honest', 2, '별점을 정직하게 봐 주었다');
      return `별자리 몇과 행성 자리를 짚어 주고, 모르는 건 모른다고 했다. ${J(s.who, '은/는')} 조금 서운한 얼굴로 은화 ${pay}닢을 놓고 갔다.`;
    }
    if (key === 'cheat') {
      me.cheats += 1;
      const pay = Math.round(rng.int(4, 9) * sky); g.player.money += pay;
      if (rng.chance(0.12 + me.cheats * 0.015 - me.lore / 400)) {
        me.caught += 1; const fine = Math.min(money(g), pay * 2); spend(g, fine);
        deed(g, 'honest', -5, '별점으로 사기를 치다 들통났다');
        slog(g, '별점 사기가 들통났다.');
        return `지난달 내 말을 믿고 배를 띄웠다던 선주가 사람들을 몰고 왔다. 배는 폭풍에 잃었다고 한다. 좌판이 엎어지고 은화 ${fine}닢을 물어 주었다. 장터에선 '별 파는 사기꾼'이라는 말이 돈다.`;
      }
      if (rng.chance(0.3)) deed(g, 'honest', -1, '별점에 듣기 좋은 말만 팔았다');
      return `${rng.pick(['금성이 그대의 집에 들었으니 올해 큰 복이 온다고 했다. 눈이 반짝였다.', '목성이 그대 태어난 달을 비추니 무엇이든 이룬다고 했다. 어깨가 펴졌다.', '흉한 별이 곧 지나가니 이 부적만 품으면 된다고 했다. 부적 값은 따로 받았다.', '그대 별자리는 일곱 자매 아래라 귀인을 만난다고 했다. 얼굴이 붉어졌다.'])} 값을 두 배로 불렀는데 군말 없이 냈다. 은화 ${pay}닢.`;
    }
    deed(g, 'honest', 3, '별점을 보러 온 사람에게 별은 앞날을 말하지 않는다고 일러 주었다');
    lore(g, 0.5);
    return `"별은 제 길을 갈 뿐, 그대의 앞날은 모릅니다." ${J(s.who, '은/는')} 화를 내다가, 웃다가, 결국 빈손으로 일어섰다. 옆 좌판 점쟁이가 혀를 찼다.`;
  },
});

/* ---------- 별 지도 ---------- */
ACTIONS.push({
  id: 'st_chart',
  name: '별 지도 팔기',
  icon: 'compass',
  desc: '철마다 별의 자리를 그린 별 지도를 만들어 포구의 뱃사람에게 판다.',
  available: (g) => settled(g) && M(g).lore >= 30 && PORTS.includes(here(g)),
  run(g, rng) {
    const me = M(g);
    me.charts += 1; me.sold += 1;
    const pay = rng.int(3, 7) + Math.round(me.lore / 12) + (hasGlass(g) ? 2 : 0);
    g.player.money += pay; gainSkill(g, 'sailing', 0.15); lore(g, 0.5);
    return `${me.charts === 1 ? '처음 그린 별 지도다. ' : ''}${rng.pick(['밤새 북쪽 별의 높이를 재어 양피지에 옮겼다. 늙은 선장이 한참 들여다보더니 값을 깎지 않았다.', '남쪽 바다에서 보이는 별까지 그려 넣었다. 먼 바다로 나가는 배의 항해사가 샀다.', '철마다 달라지는 새벽 별을 칸칸이 그렸다. 젊은 선원이 동전을 세어 건넸다.'])} 은화 ${pay}닢.`;
  },
});

/* ---------- 사건 ---------- */
EVENTS.push(
  {
    id: 'st_skynight', road: true, cooldown: 2,
    cond: (g) => grown(g) && !!skyNow(g),
    chance: (g) => (skyNow(g).kind === 'eclipse' || skyNow(g).kind === 'comet' || skyNow(g).kind === 'nova' ? 0.8 : 0.35), weight: 45,
    prepare: (g) => { const s = skyNow(g); M(g).sawn.push(s.id); if (M(g).sawn.length > 30) M(g).sawn.shift(); return { kind: s.kind, told: s.told }; },
    title: '하늘을 올려다본 밤',
    text: (g, c) => {
      const base = {
        comet: '북쪽 하늘에 꼬리 긴 별이 떴다. 다들 일손을 놓고 하늘을 본다. 이웃 노인이 내 소매를 잡는다. "자네는 글을 아니, 저게 무슨 뜻인가?"',
        eclipse: '한낮인데 해가 검게 먹혀 들어간다. 닭이 울고, 사람들이 냄비를 두드린다. 겁먹은 아이들이 내 다리에 매달린다.',
        shower: '밤새 별똥이 비처럼 쏟아진다. 아이들이 지붕에 올라가 센다. 누군가 저게 다 어디로 떨어지냐고 묻는다.',
        nova: '서쪽 하늘에 처음 보는 별이 떴다. 금성보다 밝다. 장터마다 저 별 이야기다.',
        conj: '저녁 하늘에 밝은 별 둘이 맞붙어 하나처럼 보인다. 사람들이 길에 모여 손가락질을 한다.',
        aurora: '북쪽 하늘이 초록과 붉은 빛으로 너울거린다. 소리도 없이. 개들이 짖지도 않고 숨는다.',
      }[c.kind];
      return `${base}${c.told ? ` ${OBS[c.told].name}에서 미리 말한 대로다.` : ''}`;
    },
    choices: [
      { label: '아는 대로 사람들에게 풀어 준다', run: (g, rng, c) => {
        const me = M(g);
        if (me.lore >= 30) { renown(g, 2); deed(g, 'honest', 2, '하늘 사건을 사람들에게 차분히 풀어 주었다'); lore(g, 1); return `${c.kind === 'eclipse' ? '달이 해 앞을 지나가는 것뿐이라고, 곧 빛이 돌아온다고 말했다. 정말 빛이 돌아오자 사람들이 나를 다시 보았다.' : '저것은 하늘의 길을 따라 오는 것이고, 철이 지나면 간다고 말해 주었다. 몇은 고개를 끄덕였고 몇은 성당 쪽으로 갔다.'}`; }
        stress(g, 2); return '아는 척 입을 열었지만 별 이름 둘을 섞어 말했다. 옆에서 듣던 서기가 피식 웃었다. 얼굴이 달아올랐다.';
      } },
      { label: '부적과 액막이를 판다', run: (g, rng) => { const pay = rng.int(3, 8); g.player.money += pay; M(g).cheats += 1; deed(g, 'honest', -2, '하늘 사건 날 겁먹은 사람들에게 액막이를 팔았다'); return `헝겊 쪼가리에 별 모양을 수놓아 액막이라고 팔았다. 줄이 섰다. 은화 ${pay}닢. 오늘 밤은 잘 자겠지. 그들도, 나도.`; } },
      { label: '그저 하늘을 본다', run: (g) => { lore(g, 1.5); stress(g, -4); return '아무 말 없이 하늘을 보았다. 무섭지도 기쁘지도 않았다. 다만 내가 작았다.'; } },
    ],
  },
  {
    id: 'st_predict', cooldown: 24,
    cond: (g) => { const S = SS(g), me = S.me, d = (S.next.eclipse ?? -1) - mi(g); return settled(g) && (me.role === 'astronomer' || me.role === 'court') && !me.predicted && d >= 4 && d <= 20; },
    chance: () => 0.35, weight: 40,
    title: '일식 셈',
    text: (g) => `몇 해 치 달과 해의 길을 겹쳐 셈하다 보니, 머지않아 한낮에 해가 먹힐 달이 하나 걸린다. 셈이 맞다면 내 이름이 남는다. 틀리면 장터의 웃음거리다.${SS(g).next.told ? ` ${OBS[SS(g).next.told].name}에서 이미 예고했다는 말도 들린다.` : ''}`,
    choices: [
      { label: '셈한 달을 성문에 써 붙인다', run: (g, rng) => {
        const S = SS(g), me = S.me, at = S.next.eclipse;
        const off = rng.chance(0.15 + me.lore / 150) ? 0 : rng.pick([-2, -1, 1, 2, 3]);
        me.predicted = { at: mi(g), guess: at + off };
        const left = me.predicted.guess - mi(g);
        slog(g, `일식을 ${left}달 뒤로 예고했다.`);
        return `양피지에 크게 썼다. "${left}달 뒤 한낮, 해가 먹힌다." 성문과 성당 문에 붙였다. 사람들이 모여 읽고 수군거린다. 이제 하늘이 답할 차례다.`;
      } },
      { label: '셈을 묻어 둔다', run: (g) => { lore(g, 1); return '셈 공책을 덮었다. 맞으면 아쉬울 것이고, 틀리면 다행일 것이다.'; } },
    ],
  },
  {
    id: 'st_navigate', road: true, cooldown: 4,
    cond: (g) => grown(g) && atSea(g) && M(g).lore >= 20 && (L(g).travel?.left ?? 0) >= 2,
    chance: () => 0.4, weight: 35,
    title: '구름 낀 바다',
    text: () => '사흘째 해가 구름에 가렸다. 선장은 물길을 잃었다며 이를 간다. 밤이 되자 구름이 잠깐 갈라지고 별 몇이 보인다. 갑판장이 나를 본다. "별을 좀 안다고 했지?"',
    choices: [
      { label: '별로 배 길을 잡아 준다', run: (g, rng) => {
        const me = M(g);
        if (rng.chance(0.45 + me.lore / 120)) { L(g).travel.left -= 1; me.navs += 1; gainSkill(g, 'sailing', 0.5); renown(g, 2); return '북쪽 별의 높이를 손가락 마디로 재고, 돛대 그림자를 셈했다. 키를 왼쪽으로 두 마디. 이틀 뒤 수평선에 낯익은 곶이 보였다. 선장이 처음으로 내게 술을 따랐다.'; }
        stress(g, 3); return '별 자리를 잘못 짚었다. 하루를 엉뚱한 쪽으로 갔다가 다시 구름이 걷히고서야 바로잡았다. 선원들이 나를 흘겨보았다.';
      } },
      { label: '선장에게 맡긴다', run: () => '선실로 내려와 누웠다. 배는 밤새 이리저리 흔들렸다.' },
    ],
  },
  {
    id: 'st_calendar', cooldown: 24,
    cond: (g) => { const d = SS(g).cal.dispute; return settled(g) && !!d && !d.me && (M(g).lore >= 20 || ['leocast', 'solaris', 'serenia'].includes(here(g))); },
    chance: () => 0.25, weight: 35,
    title: '달력 다툼',
    text: (g) => `부활 축일이 봄보다 ${Math.round(SS(g).cal.drift)}날 늦게 온다. 천문대는 달력을 고치자 하고 성당은 거룩한 날을 사람이 옮길 수 없다 한다. 장터에서도 술집에서도 이 이야기다. 누가 내게 묻는다. "자네는 어느 편인가?"`,
    choices: [
      { label: '달력을 고치자는 편에 선다', run: (g) => { const d = SS(g).cal.dispute, me = M(g); d.me = 'reform'; d.reform = clamp(d.reform + 3 + me.lore / 20 + (me.role === 'court' ? 8 : 0), 0, 100); if (g.faith) deed(g, 'loyal', -1, '성당에 맞서 달력을 고치자고 했다'); return me.role === 'court' ? '왕 앞에서 셈 공책을 펼쳤다. 열흘이 어디서 새는지 하나하나 짚었다. 대주교가 나를 오래 노려보았다.' : '하늘은 셈대로 돈다고, 달력이 하늘을 따라가야 한다고 말했다. 몇은 박수를 쳤고, 성당 문지기는 내 얼굴을 외워 두는 눈치였다.'; } },
      { label: '옛 달력을 지키자는 편에 선다', run: (g) => { const d = SS(g).cal.dispute, me = M(g); d.me = 'church'; d.church = clamp(d.church + 3 + (me.role === 'court' ? 8 : 0), 0, 100); deed(g, 'loyal', 2, '옛 달력을 지키자는 성당 편을 들었다'); return '할아버지 때부터 지켜 온 날을 셈 몇 줄로 옮길 수는 없다고 말했다. 늙은 사람들이 고개를 끄덕였다. 천문대 쪽 젊은이들이 혀를 찼다.'; } },
      { label: '끼어들지 않는다', run: (g) => { SS(g).cal.dispute.me = 'none'; return '열흘이 있든 없든 빵은 구워야 한다고 웃어넘겼다.'; } },
    ],
  },
);
void placeName;
