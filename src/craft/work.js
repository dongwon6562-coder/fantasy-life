// 생산직의 "일하러 가기". jobs.js의 doWork(품삯·솜씨)를 바탕으로,
// 계절·재료·품질·세상 형편을 얹는다. 농사는 봄·여름에 들인 손이 가을 추수로 돌아온다.
import { J } from '../narrative/text.js';
import { HOOKS } from '../hooks.js';
import { WORK, doWork } from '../jobs.js';
import { PLACES } from '../places.js';
import { L, defineScene, queueScene, sceneQueued, note, chron } from '../adventure/core.js';
import { priceIndex } from '../world.js';
import { Q, TRADES, C, season, rollQuality, QUALITY, demand, skillOf, gradeOf, addFame, fameOf } from './core.js';

// 대장간 일도 이제 기술(대장일)로 오른다
WORK.smith.skill = 'smithing';
WORK.shop.skill = 'trade';

const pick = (rng, a) => a[Math.floor(rng.next() * a.length)];

/* ---------- 갈래마다 계절의 일 ---------- */
const LINES = {
  farming: {
    봄: ['언 땅이 풀리자 쟁기를 댔다. 소가 콧김을 뿜었다.', '씨앗 자루를 메고 고랑마다 밀을 뿌렸다.', '새벽 서리를 밟으며 보리밭의 돌을 골라냈다.'],
    여름: ['한낮 땡볕에 김을 맸다. 허리가 끊어지는 줄 알았다.', '가뭄에 개울물을 지게로 날랐다.', '밀 이삭에 붙은 깜부기를 하나하나 뽑았다.'],
    가을: ['낫을 들고 밀을 베었다. 단을 묶는 손이 바빴다.', '도리깨질로 낟알을 털었다. 먼지가 해를 가렸다.', '수레에 밀 자루를 싣고 방앗간으로 갔다.'],
    겨울: ['헛간에서 쟁기 날을 갈고 멍에를 고쳤다.', '눈 덮인 밭에 거름을 날랐다. 봄을 위한 일이다.', '곳간의 밀이 쥐에게 먹히지 않게 단속했다.'],
  },
  cooking: {
    봄: ['첫 냉이와 달래로 국을 끓였다. 단골들이 봄이 왔다고 했다.', '알을 낳기 시작한 닭 덕에 오믈렛을 내놓았다.'],
    여름: ['생선이 상하기 전에 소금에 절였다. 부엌이 찜통이었다.', '차게 식힌 맥주와 훈제 고기가 불티나게 나갔다.'],
    가을: ['추수 잔치에 쓸 돼지 한 마리를 통째로 구웠다.', '버섯과 사과를 넣은 파이를 서른 개 구웠다.'],
    겨울: ['솥 가득 고깃국을 끓였다. 얼어 든 손님들이 말없이 그릇을 비웠다.', '말린 콩과 절인 양배추로 버텨야 하는 철이다. 향신료로 맛을 살렸다.'],
  },
  smithing: {
    봄: ['쟁기 날과 낫을 고치러 온 농부들이 줄을 섰다.', '말굽 마흔 개를 쳤다. 모루 소리가 저녁까지 이어졌다.'],
    여름: ['풀무 앞은 지옥이었다. 땀이 쇠 위에 떨어져 지글거렸다.', '대문 경첩과 못을 한 자루 만들었다.'],
    가을: ['겨울나기 도끼와 쐐기를 벼렸다.', '상단 마차의 바퀴 테를 새로 둘렀다.'],
    겨울: ['추운 날 쇠는 잘 깨진다. 담금질 물의 온도를 몇 번이고 쟀다.', '칼날 하나를 오래 두드렸다. 쇠의 결이 보이기 시작했다.'],
  },
  herbs: {
    봄: ['이슬 젖은 언덕에서 쑥국화 새순을 땄다.', '숲 그늘에서 은방울버섯을 찾았다. 독버섯과 헷갈리지 않게 조심했다.'],
    여름: ['약초를 엮어 처마에 매달아 말렸다. 집 안에 쓴 냄새가 가득했다.', '벌에 쏘인 아이의 팔에 고약을 발랐다.'],
    가을: ['뿌리약초를 캐는 철이다. 손톱 밑이 까매졌다.', '겨울 기침약을 단지마다 달여 두었다.'],
    겨울: ['말려 둔 약초를 빻아 가루로 만들었다.', '눈 속을 헤치고 겨울에만 피는 서리꽃을 찾아다녔다.'],
  },
  trade: {
    봄: ['겨우내 쌓인 물건을 털어 내는 봄 장이 섰다.', '남쪽에서 온 소금 짐을 싸게 받아 두었다.'],
    여름: ['떠돌이 상단과 천 값을 놓고 반나절을 다퉜다.', '장부를 맞추다 숫자 하나가 어긋난 것을 찾았다.'],
    가을: ['추수한 농부들이 지갑을 열었다. 하루 종일 저울이 쉬지 않았다.', '겨울 땔감과 등잔 기름을 미리 사 두었다.'],
    겨울: ['눈 때문에 길이 막혔다. 남은 물건의 값을 조금씩 올렸다.', '손님이 없는 날, 내년에 들여올 물건을 궁리했다.'],
  },
};
const QLINE = {
  0: ['솜씨가 무뎠다. 값을 깎아 줘야 했다.', '오늘 것은 스스로 보기에도 부끄러웠다.'],
  1: [''],
  2: ['손님이 다시 오겠다고 했다.', '오늘은 손이 잘 풀렸다.'],
  3: ['보는 사람마다 감탄했다.', '값을 더 쳐주겠다는 손님이 있었다.'],
};
const QMUL = [0.75, 1, 1.15, 1.35, 1];

/* ---------- 걸작 ---------- */
const MW = {
  farming: { names: ['황금 이삭', '왕의 밀', '첫서리 보리'], text: (n) => `올해 밭 한 귀퉁이에서 거둔 밀은 알이 유난히 굵었다. 방앗간 주인이 이런 밀은 처음 본다며 '${n}'이라 불렀다. 씨앗을 얻으러 이웃 마을에서까지 사람이 왔다.`, money: [20, 40] },
  cooking: { names: ['그륀탈식 사슴 스튜', '서리꽃 파이', '왕도의 겨울 수프', '은저울 정찬'], text: (n) => `불 앞에서 오래 궁리한 끝에 ${Q(n, '을/를')} 완성했다. 한 숟갈 뜬 손님이 말없이 눈을 감았다. 그 요리를 먹으러 먼 데서 손님이 오기 시작했다.`, money: [15, 35] },
  smithing: { names: ['새벽빛', '늑대 이빨', '회색 서약', '침묵의 칼날'], text: (n) => `사흘 밤을 모루 앞에서 보냈다. 물결 같은 무늬가 칼날 위에 떠올랐다. 이 검에 '${n}'이라는 이름을 새겼다.`, money: [80, 160], weapon: true },
  herbs: { names: ['일곱 잎 영약', '서리꽃 해열제', '은방울 해독약'], text: (n) => `수십 번 실패한 끝에 ${Q(n, '을/를')} 달여 냈다. 열에 들뜬 아이가 한나절 만에 일어나 앉았다. 성당 사제가 처방을 물으러 왔다.`, money: [30, 70] },
  trade: { names: ['남부 소금길', '은저울 계약', '겨울 밀 거래'], text: (n) => `남들이 겁내던 때에 물건을 사들였다가, 값이 뛸 때 풀었다. 장터 사람들은 그 거래를 '${n}'이라 부르며 혀를 내둘렀다.`, money: [60, 140] },
};

function masterwork(g, rng, trade) {
  const M = MW[trade];
  const c = C(g);
  const used = new Set(c.masterworks.map((m) => m.name));
  const name = M.names.find((n) => !used.has(n)) ?? `${pick(rng, M.names)} ${c.masterworks.length + 1}호`;
  c.masterworks.push({ trade, name, year: g.date.year });
  addFame(g, trade, 8);
  L(g).renown += 3;
  note(g, `걸작 ${Q(name, '을/를')} 만들었다.`);
  chron(g, `${g.player.name}, ${TRADES[trade].name}의 걸작 ${Q(name, '을/를')} 남기다.`, 70);
  let tail = '';
  if (M.weapon) {
    const gear = L(g).gear;
    const value = 12 + Math.round(skillOf(g, trade) / 20);
    if ((gear.weapon ?? 0) < value) { gear.weapon = value; gear.weaponName = `검 '${name}'`; tail = ' 팔지 않고 내 허리에 찼다.'; }
    else { const m = rng.int(M.money[0], M.money[1]); g.player.money += m; tail = ` 어느 기사가 은화 ${m}닢에 사 갔다.`; }
  } else { const m = rng.int(M.money[0], M.money[1]); g.player.money += m; tail = ` 그 덕에 은화 ${m}닢이 더 들어왔다.`; }
  return ` ${M.text(name)}${tail}`;
}

/* ---------- 일하기 ---------- */
export function craftWork(g, rng, trade) {
  const def = WORK[TRADES[trade].job];
  const c = C(g);
  const s = season(g);
  const q = rollQuality(g, rng, trade);
  const d = demand(g, trade);
  let mul = d.v * QMUL[q] * (1 + fameOf(g, trade) / 250);
  if (L(g).job?.own) mul *= 1.25; // 내 가게: 주인 몫이 크다
  let extra = '';
  if (trade === 'farming') {
    // 봄·여름엔 품삯이 적은 대신 밭에 손이 쌓인다. 추수 때 돌아온다.
    if (c.field.year !== g.date.year) { c.field.year = g.date.year; c.field.care = 0; }
    if (s === '봄' || s === '여름') { c.field.care += 1 + (q >= 2 ? 0.5 : 0); mul *= 0.55; }
    else if (s === '겨울') mul *= 0.6;
    else mul /= Math.min(1.8, priceIndex(g)); // 가을 품삯은 추수(따로)로 받는다
  }
  if (trade === 'herbs' && s !== '겨울' && q >= 2) { c.remedies = Math.min(20, c.remedies + 1); }
  if (trade === 'herbs' && g.world?.plague && c.remedies > 0) {
    const n = Math.min(c.remedies, 3);
    c.remedies -= n;
    const m = Math.round(n * 3 * PLACES[L(g).place].wage);
    g.player.money += m;
    extra += ` 쟁여 둔 약 ${n}단지가 역병 덕에 은화 ${m}닢에 팔렸다.`;
  }
  c.made[trade] = (c.made[trade] ?? 0) + 1;
  if (q >= 2) addFame(g, trade, q === 3 ? 0.15 : 0.05);
  else if (q === 0) addFame(g, trade, -0.3);
  // 맡은 납품 의뢰가 있으면 이번 일이 그쪽으로 간다
  const o = c.orders.find((x) => x.trade === trade && x.done < x.need);
  if (o) {
    if (q >= o.minQ) { o.done += 1; extra += ` (${o.title}: ${o.done}/${o.need})`; }
    else extra += ` (${o.title}에 넣기엔 품질이 모자랐다)`;
    mul *= 0.5; // 의뢰 몫은 끝날 때 한꺼번에 받는다
  }
  const line = `${pick(rng, LINES[trade][s])}${QLINE[q] ? ` ${pick(rng, QLINE[q])}`.trimEnd() : ''}`;
  let out = doWork(g, rng, def, { wageMul: mul, line, skillGain: 0.9 });
  if (q === 4) out += masterwork(g, rng, trade);
  return out + extra;
}

for (const t of Object.keys(TRADES)) {
  const job = WORK[TRADES[t].job];
  if (job) job.work = (g, rng) => craftWork(g, rng, t);
}

/* ---------- 가을 추수 ---------- */
defineScene('harvest', {
  title: () => '추수',
  text: (g, s) => `봄부터 들인 손이 밀 ${s.sacks}자루로 돌아왔다. ${s.weather} 지금 밀값은 평년의 ${priceIndex(g).toFixed(1)}배, 한 자루에 은화 ${s.price}닢쯤 받는다. 곳간에는 지난해 밀이 ${C(g).granary}자루 있다.`,
  choices: () => [
    { label: '장에 다 내다 판다', key: 'sell' },
    { label: '절반은 곳간에 두고 값이 오를 때 판다', key: 'half' },
    { label: '모두 곳간에 넣는다', key: 'keep' },
  ],
  resolve(g, rng, s, key) {
    const c = C(g);
    const sell = key === 'sell' ? s.sacks : key === 'half' ? Math.ceil(s.sacks / 2) : 0;
    c.granary = Math.min(200, c.granary + s.sacks - sell);
    let money = sell * s.price;
    let fam = '';
    if (L(g).home === 'family' && money >= 4) { const give = Math.floor(money / 3); money -= give; g.player.familyMoney += give; fam = ` ${give}닢은 집안 살림에 보탰다.`; }
    g.player.money += money;
    addFame(g, 'farming', s.sacks >= 30 ? 2 : 0.5);
    if (s.sacks >= 40) note(g, `밀 ${s.sacks}자루를 거두었다. 마을에서 손꼽히는 수확이었다.`);
    return sell ? `밀 ${sell}자루를 팔아 은화 ${sell * s.price}닢을 받았다.${fam}${c.granary ? ` 곳간에는 ${c.granary}자루가 남았다.` : ''}` : `밀을 모두 곳간에 넣었다. 곳간이 ${c.granary}자루로 그득하다.`;
  },
});

// 곳간의 밀을 판다 (값이 오른 때를 노린다)
defineScene('granary', {
  title: () => '곳간의 밀',
  text: (g) => `곳간에 밀 ${C(g).granary}자루가 있다. 지금 밀값은 평년의 ${priceIndex(g).toFixed(1)}배다.`,
  choices: () => [{ label: '모두 판다', key: 'all' }, { label: '열 자루만 판다', key: 'ten' }, { label: '더 기다린다', key: 'wait' }],
  resolve(g, rng, s, key) {
    const c = C(g);
    if (key === 'wait') return '곳간 문을 다시 걸어 잠갔다.';
    const n = key === 'all' ? c.granary : Math.min(10, c.granary);
    const price = sackPrice(g);
    c.granary -= n;
    g.player.money += n * price;
    return `밀 ${n}자루를 한 자루에 은화 ${price}닢씩 넘겼다.${priceIndex(g) > 1.3 ? ' 굶주린 이웃들의 눈길이 따가웠다.' : ''}`;
  },
});

export const sackPrice = (g) => Math.max(1, Math.round(1.1 * priceIndex(g) * (PLACES[L(g).place]?.wage ?? 1) * 10) / 10);

HOOKS.afterMonth.push((g, rng) => {
  if (g.over) return;
  const life = L(g);
  const c = C(g);
  // 가을(10월)에 추수: 농부로 일하고 있고, 올해 밭에 손을 들였으면
  if (g.date.month === 10 && life.job?.id === 'farmer' && c.field.year === g.date.year && c.field.care > 0 && !life.travel) {
    const skill = skillOf(g, 'farming');
    const bad = g.world?.famine || rng.chance(0.15);
    const good = !bad && rng.chance(0.25);
    const weather = bad ? '여름 가뭄에 이삭이 반쯤 여물다 말았다.' : good ? '비와 볕이 고르게 든 해였다. 이삭이 고개를 푹 숙였다.' : '그럭저럭 무난한 해였다.';
    const sacks = Math.max(1, Math.round((6 + c.field.care * 2.2) * (0.7 + skill / 160) * (bad ? 0.55 : good ? 1.3 : 1) * rng.float(0.9, 1.1)));
    const price = Math.max(1, Math.round(sackPrice(g)));
    c.field.care = 0;
    queueScene(g, 'harvest', { sacks, price, weather }, { first: true });
  }
  // 곳간에 밀이 있고 밀값이 오르면 팔 기회
  if (c.granary >= 5 && priceIndex(g) >= 1.25 && !sceneQueued(g, 'granary') && !life.travel && rng.chance(0.3)) queueScene(g, 'granary');
  // 곳간의 밀은 해마다 조금씩 쥐와 습기에 상한다
  if (g.date.month === 3 && c.granary > 0) c.granary = Math.floor(c.granary * 0.9);
  // 이름값은 손을 놓으면 조금씩 잊힌다
  for (const t of Object.keys(c.fame)) c.fame[t] = Math.max(0, c.fame[t] - (life.job?.id === TRADES[t].job ? 0.25 : 0.4));
  // 이름난 장인
  for (const t of Object.keys(TRADES)) {
    if (!c.famed[t] && gradeOf(skillOf(g, t)) >= 3 && fameOf(g, t) >= 60) {
      c.famed[t] = g.date.year;
      life.renown += 8;
      chron(g, `${g.player.name}, 이름난 ${TRADES[t].maker}로 왕국에 알려지다.`, 80);
      g.news.unshift({ text: `먼 고장에서도 ${J(TRADES[t].maker, '을/를')} 찾을 때 내 이름을 댄다고 한다.`, rel: 100 });
    }
  }
});
