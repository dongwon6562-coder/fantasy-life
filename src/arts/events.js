// 글과 예술의 사건: 비평가, 내 책에 삶이 바뀐 사람, 위작, 후원자를 두고 다투는 경쟁자,
// 뒷방의 금서 장수, 광장의 분서(焚書). 한 번 고른 것이 소문과 신앙과 궁정으로 번진다.
import { EVENTS, check, stress } from '../events/core.js';
import { gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { isJailed, jail, addNotoriety } from '../crime.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { powerOf } from '../history/index.js';
import { AS, mi, clamp, KINDS, LIBRARIES, addArtFame, myWorks, alog } from './state.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const Q = (t, pair) => `《${t}》${pair ? J(t, pair).slice(t.length) : ''}`;
const recent = (g, months) => myWorks(g).filter((w) => !w.lost && mi(g) - w.year * 12 <= months + 12);
const pickW = (g, f) => myWorks(g).filter((w) => !w.lost && f(w)).sort((a, b) => b.esteem - a.esteem)[0] ?? null;

// ---------- 비평가 ----------
EVENTS.push({
  id: 'arts_critic', cooldown: 36, weight: 5,
  chance: () => 0.35,
  cond: (g) => free(g) && recent(g, 18).length > 0 && AS(g).fame >= 6,
  prepare: (g) => ({ w: recent(g, 18).sort((a, b) => b.year - a.year)[0].id }),
  title: '서점에 붙은 비평문',
  text: (g, c) => {
    const w = AS(g).works.find((x) => x.id === c.w);
    return `서점 문에 누군가 긴 글을 붙여 놓았다. "${Q(w.title)}: 종이가 아깝다." 글쓴이는 왕도에서 이름난 비평가 브루노 할렌이었다. 그는 ${w.q >= 60 ? '트집 잡을 곳을 찾느라 애쓴 티가 났다' : '아픈 데를 정확히 찔렀다'}. 사람들이 그 앞에 모여 웃고 있었다.`;
  },
  choices: [
    {
      label: '글로 맞받는다',
      run: (g, rng, c) => {
        const w = AS(g).works.find((x) => x.id === c.w);
        if (!w) return '';
        if (check(rng, (g.player.skills.letters ?? 0) * 0.6 + g.player.stats.int * 0.4, 50)) { w.esteem = clamp(w.esteem + 6, 0, 100); addArtFame(g, 4); gainSkill(g, 'letters', 1, 'int'); return '사흘 밤을 새워 답글을 썼다. 할렌의 글 바로 옆에 붙였다. 이번에는 사람들이 할렌을 보고 웃었다. 그는 한동안 서점 거리에 나타나지 않았다.'; }
        w.esteem = clamp(w.esteem - 4, 0, 100); stress(g, 8);
        return '답글을 붙였다. 다음 날 할렌이 내 답글에 다시 답글을 붙였다. 내 글의 맞춤법 틀린 곳 일곱 군데에 붉은 동그라미가 쳐져 있었다.';
      },
    },
    { label: '내버려 둔다', run: (g) => { stress(g, 4); return '못 본 척했다. 밤에 잠이 오지 않았다. 그래도 한 달이 지나자 비평문은 비에 젖어 떨어졌고, 사람들은 다른 이야기를 했다.'; } },
    {
      label: '은화를 쥐여 주고 좋은 평을 산다',
      run: (g, rng, c) => {
        const w = AS(g).works.find((x) => x.id === c.w);
        if (!w || g.player.money < 12) { stress(g, 5); return '주머니가 가벼웠다. 할렌은 내 손에 든 동전을 보더니 웃었다.'; }
        g.player.money -= 12; w.esteem = clamp(w.esteem + 5, 0, 100);
        if (rng.chance(0.35)) { deed(g, 'honest', -10, `${g.player.name}${J(g.player.name, '이/가').slice(g.player.name.length)} 비평가에게 돈을 먹여 제 작품을 칭찬하게 했다고 한다.`); addArtFame(g, -5); return '할렌은 돈을 받고 칭찬하는 글을 썼다. 그리고 술자리에서 그 이야기를 했다. 이제 온 왕도가 안다.'; }
        return '할렌은 은화 12닢을 받고 "다시 읽어 보니 깊은 데가 있다"는 글을 썼다. 사람들은 고개를 끄덕였다. 기분이 썩 좋지는 않았다.';
      },
    },
  ],
});

// ---------- 내 책에 삶이 바뀐 사람 ----------
EVENTS.push({
  id: 'arts_reader', cooldown: 48, weight: 4,
  chance: () => 0.4,
  cond: (g) => free(g) && !!pickW(g, (w) => w.esteem >= 45),
  prepare: (g) => ({ w: pickW(g, (w) => w.esteem >= 45).id }),
  title: '낯선 손님',
  text: (g, c) => {
    const w = AS(g).works.find((x) => x.id === c.w);
    return `해진 망토를 입은 젊은이가 문 앞에 서 있었다. 품에서 닳고 닳은 ${KINDS[w.kind].book ? '책' : '스케치 한 장'}을 꺼냈다. ${Q(w.title)}. "이것 때문에 고향을 떠났습니다. ${w.kind === 'travel' ? '세상이 이렇게 넓은 줄 몰랐거든요.' : w.kind === 'grimoire' ? '마력이 도는 길을 처음으로 알아보았습니다.' : '그날 밤 처음으로 울었습니다.'} 한 번 뵙고 싶었습니다."`;
  },
  choices: [
    { label: '집에 들여 밤새 이야기한다', run: (g) => { stress(g, -10); addArtFame(g, 2); note(g, '내 작품을 읽고 찾아온 젊은이와 밤새 이야기했다.'); return '젊은이는 새벽까지 묻고 또 물었다. 나는 대답하다가 내가 그 글을 왜 썼는지 다시 떠올렸다. 그는 동이 틀 무렵 떠났다. 이름을 묻는 것을 잊었다.'; } },
    { label: '책에 이름을 적어 준다', run: (g) => { stress(g, -5); return '책 첫 장에 이름을 적어 주었다. 젊은이는 그 장을 손바닥으로 덮고 오래 서 있었다.'; } },
    { label: '바쁘다며 돌려보낸다', run: (g) => { stress(g, 2); return '문을 닫았다. 창밖으로 젊은이가 골목 끝까지 걸어가는 것이 보였다. 한 번도 돌아보지 않았다.'; } },
  ],
});

// ---------- 위작 ----------
EVENTS.push({
  id: 'arts_forger', cooldown: 60, weight: 4,
  chance: () => 0.35,
  cond: (g) => free(g) && AS(g).fame >= 25 && !!pickW(g, (w) => ['painting', 'sculpture', 'poems', 'song'].includes(w.kind) && w.esteem >= 35),
  prepare: (g) => ({ w: pickW(g, (w) => ['painting', 'sculpture', 'poems', 'song'].includes(w.kind) && w.esteem >= 35).id }),
  title: '내 이름이 붙은 가짜',
  text: (g, c) => {
    const w = AS(g).works.find((x) => x.id === c.w);
    return `장터 좌판에 내 이름이 붙은 ${KINDS[w.kind].name}이 여럿 놓여 있었다. ${Q(w.title)}을 흉내 낸 것들이다. 어설프지만 값은 싸다. 좌판 주인은 나를 알아보지 못하고 "진품이오, 진품"이라고 외쳤다.`;
  },
  choices: [
    { label: '경비대를 불러 드러낸다', run: (g, rng) => { deed(g, 'honest', 6, null); addArtFame(g, 2); return '경비대가 좌판을 엎었다. 위작꾼은 달아나다 붙잡혔다. 사람들이 진짜와 가짜를 어떻게 가리느냐고 물었다. 나는 붓 자국을 보여 주었다.'; } },
    { label: '몫을 받고 눈감는다', run: (g, rng) => { const n = rng.int(8, 18); g.player.money += n; deed(g, 'honest', -6, null); AS(g).fame = clamp(AS(g).fame - 2, 0, 100); return `위작꾼은 은화 ${n}닢을 내밀었다. "선생 이름이 팔리는 거요. 서로 좋은 일 아니오?" 받았다. 내 이름이 싸게 팔리는 소리가 장터 끝까지 들렸다.`; } },
    { label: '내버려 둔다', run: (g) => { AS(g).fame = clamp(AS(g).fame + 1, 0, 100); return '가짜가 돈다는 것은 진짜가 이름났다는 뜻이다. 그렇게 생각하기로 했다.'; } },
  ],
});

// ---------- 후원자를 두고 다투는 경쟁자 ----------
EVENTS.push({
  id: 'arts_rival', cooldown: 48, weight: 4,
  chance: () => 0.35,
  cond: (g) => free(g) && !!AS(g).patron && mi(g) - AS(g).patron.since >= 6,
  title: '후원자의 응접실에서',
  text: (g) => `${AS(g).patron.name}의 응접실에 낯선 작가가 앉아 있었다. 비단 옷에 반지를 낀 사내였다. 그는 내 작품을 두고 "시골 냄새가 난다"고 했다. 후원자는 웃기만 했다. 다음 달 녹봉 장부에 누구 이름이 오를지는 아직 모른다.`,
  choices: [
    {
      label: '그 자리에서 솜씨를 겨룬다',
      run: (g, rng) => {
        const P = AS(g).patron;
        const v = Math.max(...['letters', 'music', 'fineart'].map((k) => g.player.skills[k] ?? 0)) + g.player.stats.cha * 0.3;
        if (check(rng, v, 55)) { P.mood = clamp(P.mood + 15, 0, 100); addArtFame(g, 3); return '즉석에서 시를 지었다. 사내도 지었다. 후원자는 내 시를 한 번 더 읊어 보라고 했다. 사내는 그날 이후 응접실에 오지 않았다.'; }
        P.mood = clamp(P.mood - 15, 0, 100); stress(g, 8); return '사내의 솜씨는 말뿐이 아니었다. 후원자가 그에게 잔을 따랐다. 나는 빈손으로 계단을 내려왔다.';
      },
    },
    { label: '사내와 술을 나누며 사귄다', run: (g) => { const P = AS(g).patron; P.mood = clamp(P.mood - 5, 0, 100); stress(g, -4); addArtFame(g, 1); return '응접실을 나와 사내와 주점에 갔다. 그는 술이 들어가자 고향 이야기를 했다. 그도 시골에서 왔다. 둘 다 같은 후원자의 눈치를 보는 신세였다.'; } },
    {
      label: '사내에 대한 나쁜 소문을 흘린다',
      run: (g, rng) => {
        const P = AS(g).patron;
        if (rng.chance(0.6)) { P.mood = clamp(P.mood + 8, 0, 100); deed(g, 'honest', -4, null); return '사내가 남의 시를 베꼈다는 말을 흘렸다. 반쯤은 사실이었다. 한 달 뒤 사내는 왕도를 떠났다.'; }
        P.mood = clamp(P.mood - 20, 0, 100); deed(g, 'honest', -10, `${g.player.name}${J(g.player.name, '이/가').slice(g.player.name.length)} 경쟁자를 헐뜯는 거짓말을 퍼뜨렸다고 한다.`);
        return '소문의 출처가 나라는 것이 금세 드러났다. 후원자는 나를 한참 바라보다가 말했다. "작가는 작품으로 싸우는 줄 알았네."';
      },
    },
  ],
});

// ---------- 뒷방의 금서 장수 ----------
const bannedOut = (g) => AS(g).works.filter((w) => w.banned && !w.mine && !w.lost && w.copies > 0 && !AS(g).read.includes(w.id));
EVENTS.push({
  id: 'arts_forbidden_find', cooldown: 60, weight: 4,
  chance: () => 0.4,
  cond: (g) => free(g) && (!!LIBRARIES[here(g)] || ['barka', 'portel', 'klein'].includes(here(g))) && bannedOut(g).length > 0 && ((g.player.skills.letters ?? 0) >= 10 || g.player.stats.int >= 35),
  prepare: (g) => ({ w: bannedOut(g)[0].id }),
  title: '서점 뒷방',
  text: (g, c) => {
    const w = AS(g).works.find((x) => x.id === c.w);
    return `늙은 서점 주인이 주위를 살피더니 나를 뒷방으로 불렀다. 기름 먹인 천에 싼 책 한 권. ${w.author}의 ${Q(w.title)}. ${w.banned.by === 'church' ? '교단이 금서로 정한 책이다.' : '왕실이 금한 책이다.'} "은화 열 닢. 읽고 나면 불태우시든지, 다음 사람에게 넘기시든지."`;
  },
  choices: [
    {
      label: '사서 읽는다',
      run: (g, rng, c) => {
        const w = AS(g).works.find((x) => x.id === c.w);
        if (!w) return '';
        if (g.player.money < 10) return '주머니를 뒤졌지만 열 닢이 없었다. 주인은 말없이 천을 다시 쌌다.';
        g.player.money -= 10; AS(g).read.push(w.id);
        const sk = w.kind === 'grimoire' && g.player.manaAwakened ? 'magic' : 'letters';
        gainSkill(g, sk, 1.2 + w.q / 60, 'int');
        if (w.banned.by === 'church') { const f = faithState(g); f.suspicion = Math.min(100, f.suspicion + 8); }
        alog(g, `금서 ${Q(w.title, '을/를')} 몰래 읽었다.`);
        return `등잔불을 낮추고 밤새 읽었다. ${w.q >= 60 ? '왜 금했는지 알 것 같았다. 그리고 왜 이 책이 아직 살아남았는지도.' : '생각보다 별것 없었다. 금서라는 이름이 책보다 무거웠다.'}`;
      },
    },
    {
      label: '심문소에 알린다',
      run: (g, rng, c) => {
        const w = AS(g).works.find((x) => x.id === c.w);
        if (w) w.copies = Math.max(0, w.copies - 2);
        const f = faithState(g); f.suspicion = Math.max(0, f.suspicion - 8); f.devotion = clamp(f.devotion + 3, 0, 100);
        deed(g, 'loyal', -5, null);
        return '사흘 뒤 서점 문에 흰 봉인이 붙었다. 늙은 주인은 보이지 않았다. 심문관이 내게 고맙다고 했다. 서점 거리 사람들은 나와 눈을 맞추지 않았다.';
      },
    },
    { label: '못 본 걸로 한다', run: () => '고개를 젓고 나왔다. 등 뒤에서 주인이 천을 다시 싸는 소리가 났다.' },
  ],
});

// ---------- 광장의 분서 ----------
EVENTS.push({
  id: 'arts_burning', cooldown: 72, weight: 4,
  chance: () => 0.35,
  cond: (g) => free(g) && ['leocast', 'solaris', 'harfen', 'verden'].includes(here(g)) && powerOf(g, 'church') >= 50 && AS(g).works.some((w) => w.banned?.by === 'church' && !w.lost && w.copies > 0),
  prepare: (g) => ({ w: AS(g).works.filter((w) => w.banned?.by === 'church' && !w.lost && w.copies > 0).sort((a, b) => b.mine - a.mine)[0].id }),
  title: '광장의 불',
  text: (g, c) => {
    const w = AS(g).works.find((x) => x.id === c.w);
    return `광장 한가운데 장작이 쌓였다. 흰 망토의 심문관들이 수레에서 책을 내려 불 속에 던진다. 그 가운데 ${w.mine ? '내가 쓴' : `${w.author}의`} ${Q(w.title, '이/가')} 보였다. 사람들이 둘러서서 말없이 보고 있다.`;
  },
  choices: [
    { label: '지켜본다', run: (g) => { stress(g, 6); return '불은 해가 질 때까지 탔다. 종이 타는 냄새가 옷에 배어 사흘 동안 빠지지 않았다.'; } },
    {
      label: '불 속에서 한 권을 낚아챈다',
      run: (g, rng, c) => {
        const w = AS(g).works.find((x) => x.id === c.w);
        if (check(rng, g.player.stats.agi * 0.6 + g.player.stats.sen * 0.4, 50)) {
          if (w) { w.copies += 1; w.esteem = clamp(w.esteem + 3, 0, 100); }
          deed(g, 'brave', 6, null);
          return '심문관이 돌아서는 틈에 손을 뻗었다. 소매가 그을렸다. 품 안의 책은 뜨거웠다. 모퉁이를 돌 때까지 숨을 쉬지 않았다.';
        }
        const f = faithState(g); f.suspicion = Math.min(100, f.suspicion + 20); addNotoriety(g, 4);
        if (rng.chance(0.4)) { jail(g, 3); return '손이 책에 닿기도 전에 누군가 내 팔을 비틀었다. 심문소 지하에서 석 달을 보냈다.'; }
        return '손이 책에 닿기도 전에 누군가 내 팔을 붙잡았다. 겨우 뿌리치고 달아났다. 심문관 하나가 내 얼굴을 오래 보았다.';
      },
    },
    {
      label: '불 앞에 서서 그 책의 한 대목을 외친다',
      run: (g, rng, c) => {
        const w = AS(g).works.find((x) => x.id === c.w);
        if (w) w.esteem = clamp(w.esteem + 6, 0, 100);
        addArtFame(g, 4); deed(g, 'brave', 10, `${g.player.name}${J(g.player.name, '이/가').slice(g.player.name.length)} 분서의 불 앞에서 금서를 외쳤다고 한다.`);
        const f = faithState(g); f.suspicion = Math.min(100, f.suspicion + 25);
        chron(g, `${g.player.name}, 분서의 불 앞에서 ${Q(w?.title ?? '금서', '을/를')} 외치다.`, 60);
        return '목소리가 떨렸지만 끝까지 외웠다. 몇 사람이 따라 외쳤다. 심문관들이 우리를 향해 걸어왔고, 사람들은 흩어졌다. 그 대목은 그날 밤 왕도의 벽마다 숯으로 적혀 있었다.';
      },
    },
  ],
});
