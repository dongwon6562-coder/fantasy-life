// 가게에서 생기는 일: 싸움판, 소문, 이름난 손님, 단골, 일꾼, 경비대, 패거리 자릿세, 노름판, 밀수, 경쟁 가게, 세리, 밀린 빚.
import { PLACES } from '../places.js';
import { defineScene, note, chron, stress, tired, check, L } from '../adventure/core.js';
import { reportCrime, crimeState } from '../crime.js';
import { atWar } from '../world.js';
import { outbreaksAt } from '../health/index.js';
import { GANGS } from '../underworld/gangs.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { I, myInn, atInn, mi, clamp, here, placeName, free, stat, ROLES, REGULARS, workerOf, innTitle, logInn, loseInn, innWorth, crowdOf, FOOD_WORD, foodOf } from './core.js';
import { gangAt } from './month.js';

const EVS = ['arrears', 'tax', 'brawl', 'rumor', 'guest', 'newreg', 'regular', 'worker', 'poach', 'guard', 'gang', 'gamble', 'smuggle', 'rival_open', 'rival'];
const RIVAL_NAMES = ['푸른 돼지', '웃는 달', '세 마리 거위', '황금 잔', '늑대 굴', '은빛 물고기'];
const regOf = (g, s) => myInn(g)?.regulars.find((r) => r.id === s.reg) ?? null;
const badWorker = (g) => myInn(g)?.workers.slice().sort((a, b) => (a.honest - b.honest) || (a.loyal - b.loyal))[0] ?? null;
const gangName = (g) => GANGS[myInn(g)?.gang?.id ?? gangAt(myInn(g)?.place)]?.name ?? '뒷골목 패거리';
const payable = (g, n) => Math.min(n, g.player.money);
function gossip(g, rng) {
  const out = [];
  for (const pl of Object.keys(PLACES)) { if (pl === here(g) || PLACES[pl].hidden) continue; const o = outbreaksAt(g, pl)[0]; if (o) out.push(`${placeName(pl)}에 ${J(o.name, '이/가')} 돈다고 한다. 그쪽 길은 피하라고.`); }
  if (g.world?.famine) out.push('올해 밀값이 더 오른다고 한다. 곡식 창고를 가진 자들이 문을 걸어 잠갔다고.');
  if (atWar(g)) out.push('전선에서 돌아온 자가 말하길, 이번 싸움은 겨울을 넘길 거라고 한다. 징집관이 다음 달에 고장을 돈다고.');
  out.push(rng.pick([
    '북쪽 고개 너머에서 마물 떼가 내려왔다는 말이 돈다. 길드 현상금이 곧 붙을 거라고.',
    '어느 상단이 소금 값을 몰래 올리려 한다고 한다. 먼저 사 두면 남을 거라고.',
    '영주의 막내가 몰래 이 고장에 와 있다는 소문이다. 누구 집에 묵는지는 아무도 모른다.',
    '버려진 탑에서 밤마다 불빛이 보인다고 한다. 가 본 사람은 돌아와서 말이 없다.',
  ]));
  return rng.pick(out);
}

defineScene('inn_event', {
  need: (g, s) => free(g) && !!myInn(g) && EVS.includes(s.ev) && (s.ev === 'arrears' || atInn(g))
    && (!['regular'].includes(s.ev) || !!regOf(g, s))
    && (s.ev !== 'newreg' || (!!REGULARS[s.reg] && !regOf(g, s)))
    && (s.ev !== 'worker' || myInn(g).workers.length > 0)
    && (s.ev !== 'poach' || !!workerOf(g, 'cook'))
    && (s.ev !== 'gang' || !!gangAt(myInn(g).place))
    && (s.ev !== 'rival' || !!myInn(g).rival)
    && (s.ev !== 'rival_open' || !myInn(g).rival)
    && (s.ev !== 'tax' || myInn(g).taxOwed > 0)
    && (s.ev !== 'arrears' || myInn(g).arrears > 0),
  title: (g, s) => ({
    arrears: '밀린 빚', tax: '세리', brawl: '싸움판', rumor: '길손의 소문', guest: '이름난 손님', newreg: '새 얼굴', regular: '단골',
    worker: '일꾼의 손버릇', poach: '요리사를 빼 가려는 손', guard: '경비대', gang: '자릿세', gamble: '뒷방의 주사위', smuggle: '지하 창고', rival_open: '건너편 새 간판', rival: '경쟁 가게',
  }[s.ev]),
  text: (g, s) => {
    const inn = myInn(g);
    switch (s.ev) {
      case 'arrears': return `술도가와 고깃간에 진 외상이 은화 ${inn.arrears}닢이다. 오늘 아침 둘이 함께 찾아왔다. "이번 달 안에 정리하지 않으면 법관에게 가겠소."`;
      case 'tax': return `${placeName(inn.place)}의 세리가 장부를 끼고 들어왔다. 지난 몇 달치 장사 세금이 은화 ${inn.taxOwed}닢. 세리의 눈이 내 장부보다 뒷방 문 쪽을 더 오래 본다.`;
      case 'brawl': return `${['용병 둘이', '부두 일꾼들과 뱃사람들이', '술 취한 대장장이 형제가'][mi(g) % 3]} 탁자를 엎었다. 잔이 날고 의자 다리가 부러진다. 다른 손님들은 벽에 붙어 구경한다.`;
      case 'rumor': return '먼 길을 온 사내가 구석 자리에 앉아 혼잣말처럼 무언가를 중얼거린다. 귀를 기울이면 쓸 만한 이야기일지도 모른다.';
      case 'guest': return `${['은빛 갑옷의 기사와 그 종자들이', '이름난 모험가 일행이', '얼굴을 가린 귀부인이 시녀 둘과'][mi(g) % 3]} 문을 열고 들어왔다. 가게 안이 조용해졌다. 이 사람들이 어떤 말을 하고 나가느냐에 따라 이름이 날 것이다.`;
      case 'newreg': return `${REGULARS[s.reg].name}. ${REGULARS[s.reg].desc} 벌써 세 번째 저녁이다. 같은 자리, 같은 술.`;
      case 'regular': {
        const r = regOf(g, s), R = REGULARS[r.id];
        return {
          merc: `${J(R.name, '이/가')} 잔을 내밀었다. "이번 원정 품삯이 나오면 다 갚지. 한 달만." 외상이 벌써 은화 ${r.tab}닢이다.`,
          farmer: `${J(R.name, '이/가')} 오늘따라 말이 많다. 이 가게가 생기기 전, 이 자리에 무엇이 있었는지 이야기하고 싶어 한다.`,
          merchant: `${J(R.name, '이/가')} 수레에서 술통 하나를 내렸다. "남쪽 섬의 붉은 포도주요. 이 고장에선 아무도 못 마셔 봤지. 은화 20닢이면 넘기겠소."`,
          bard: `${J(R.name, '이/가')} 류트를 들고 왔다. "주인장, 오늘 밤 노래할 테니 술 몇 잔만."`,
          noble: `${J(R.name, '이/가')} 목소리를 낮췄다. "내일 저녁, 알 만한 분을 모시고 오겠소. 조용한 방 하나 내주시겠소?"`,
        }[r.id];
      }
      case 'worker': { const w = badWorker(g); return `술통 재고가 맞지 않는다. 돈궤에서도 은화가 조금씩 빈다. 눈길이 자꾸 ${ROLES[w.role].name} ${w.name}에게 간다.`; }
      case 'poach': { const w = workerOf(g, 'cook'); return `${J(w.name, '이/가')} 앞치마를 만지작거린다. 다른 가게에서 삯을 두 배 주겠다고 했다고 한다. 음식 맛은 이 사람 손에서 나온다.`; }
      case 'guard': return `경비대장이 부하 셋을 데리고 들어왔다. "가게 좀 둘러보겠소."${inn.backroom.gamble ? ' 뒷방에서 주사위 소리가 멎었다.' : ''}${inn.backroom.smuggle ? ' 지하 창고 문이 등 뒤에 있다.' : ''}${inn.dodged >= 30 ? ' 경비대장 옆의 서기가 세금 장부를 들고 있다.' : ''}`;
      case 'gang':
        return inn.gang?.state === 'refused'
          ? `${gangName(g)}의 사내들이 또 왔다. 이번엔 몽둥이를 들었다. "지난번엔 말로 했지."`
          : `${gangName(g)}의 사내가 탁자에 걸터앉았다. "이 골목에서 장사하려면 우리한테 열에 하나는 내야 해. 그래야 불이 안 나지."`;
      case 'gamble': return '뒷방에서 고함이 터졌다. 한 사내가 다른 사내의 소매에서 주사위 두 개를 더 꺼내 들었다. 판돈이 탁자 위에 흩어져 있다.';
      case 'smuggle': return '밀수꾼 우두머리가 무거운 궤짝 셋을 더 들이고 싶어 한다. 무엇이 들었는지는 말하지 않는다. 대신 창고 값을 세 배로 치겠다고 한다.';
      case 'rival_open': return `길 건너에 새 가게가 문을 열었다. 간판은 ${s.name ?? RIVAL_NAMES[mi(g) % RIVAL_NAMES.length]}. 첫날부터 술 한 잔 값을 내 가게 반으로 받는다.`;
      case 'rival': return `${J(inn.rival.name, '이/가')} 내 단골들을 하나씩 데려간다. 어제는 문 앞에서 내 가게 술에 물을 탄다는 말을 퍼뜨리는 아이를 보았다.`;
      default: return '';
    }
  },
  choices: (g, s) => {
    const inn = myInn(g), m = g.player.money;
    switch (s.ev) {
      case 'arrears': return [{ label: `가게를 팔아 빚을 갚는다 (은화 ${innWorth(inn)}닢쯤)`, key: 'sell' }, ...(m >= inn.arrears ? [{ label: `모은 돈으로 갚는다 (은화 ${inn.arrears}닢)`, key: 'pay' }] : []), ...(inn.held ? [] : [{ label: '한 철만 더 버틴다', key: 'hold' }])];
      case 'tax': return [...(m >= inn.taxOwed ? [{ label: `다 낸다 (은화 ${inn.taxOwed}닢)`, key: 'pay' }] : [{ label: `있는 만큼 낸다 (은화 ${m}닢)`, key: 'part' }]), { label: '장부를 꾸며 덜 낸다', key: 'cook' }, ...(m >= Math.ceil(inn.taxOwed * 0.6) ? [{ label: `세리에게 뒷돈을 쥐여 준다 (은화 ${Math.ceil(inn.taxOwed * 0.6)}닢)`, key: 'bribe' }] : [])];
      case 'brawl': return [{ label: '내가 나서서 떼어 놓는다', key: 'me' }, ...(workerOf(g, 'bouncer') ? [{ label: '문지기에게 맡긴다', key: 'bouncer' }] : []), { label: '경비대를 부른다', key: 'guards' }, { label: '내버려 둔다', key: 'let' }];
      case 'rumor': return [...(m >= 2 ? [{ label: '술 한 잔 사고 끝까지 듣는다 (은화 2닢)', key: 'listen' }] : []), { label: '흘려듣는다', key: 'no' }];
      case 'guest': return [...(m >= 10 ? [{ label: '가장 좋은 술과 음식을 낸다 (은화 10닢)', key: 'best' }] : []), { label: '여느 손님처럼 대한다', key: 'plain' }, { label: '값을 곱절로 받는다', key: 'gouge' }];
      case 'newreg': return [{ label: '첫 잔은 내가 낸다며 단골로 모신다', key: 'yes' }, { label: '그냥 손님으로 둔다', key: 'no' }];
      case 'regular': {
        const r = regOf(g, s);
        if (r.id === 'merc') return [{ label: '외상을 달아 준다', key: 'tab' }, { label: '외상값부터 내라고 한다', key: 'collect' }];
        if (r.id === 'farmer') return [{ label: '마주 앉아 끝까지 듣는다', key: 'listen' }, { label: '바쁘다며 일어선다', key: 'no' }];
        if (r.id === 'merchant') return [...(m >= 20 ? [{ label: '술통을 산다 (은화 20닢)', key: 'buy' }] : []), { label: '사양한다', key: 'no' }];
        if (r.id === 'bard') return [{ label: '노래하게 한다 (술값 은화 3닢)', key: 'yes' }, { label: '오늘은 조용히 하자고 한다', key: 'no' }];
        return [{ label: '안쪽 방을 내준다', key: 'yes' }, { label: '그런 손님은 받지 않는다', key: 'no' }];
      }
      case 'worker': return [{ label: '불러 따지고 내보낸다', key: 'fire' }, { label: '한 번은 눈감아 준다', key: 'forgive' }, { label: '몰래 지켜본다', key: 'watch' }];
      case 'poach': return [...(m >= 15 ? [{ label: '삯을 올려 붙잡는다 (은화 15닢)', key: 'keep' }] : []), { label: '보내 준다', key: 'let' }];
      case 'guard': return [...(m >= 15 ? [{ label: '경비대장에게 은화 15닢을 쥐여 준다', key: 'bribe' }] : []), { label: '순순히 보여 준다', key: 'show' }, ...(inn.backroom.gamble || inn.backroom.smuggle ? [{ label: '시간을 끌며 뒷방을 치우게 한다', key: 'hide' }] : [])];
      case 'gang':
        return inn.gang?.state === 'refused'
          ? [{ label: '이제 몫을 내겠다고 한다', key: 'pay' }, { label: '맞서 막는다', key: 'fight' }, { label: '경비대에 고발한다', key: 'report' }]
          : [{ label: '몫을 낸다', key: 'pay' }, { label: '거절한다', key: 'refuse' }, { label: '경비대에 고발한다', key: 'report' }];
      case 'gamble': return [{ label: '사기꾼을 쫓아낸다', key: 'out' }, ...(m >= 10 ? [{ label: '판돈을 물어 준다 (은화 10닢)', key: 'refund' }] : []), { label: '모른 척한다', key: 'ignore' }];
      case 'smuggle': return [{ label: '받는다', key: 'yes' }, { label: '거절한다', key: 'no' }];
      case 'rival_open': return [{ label: '값을 내려 맞선다', key: 'cheap' }, { label: '저 집 술에 물을 탄다는 소문을 낸다', key: 'slander' }, { label: '건너가 인사를 한다', key: 'greet' }, ...(inn.gang?.state === 'paid' || (crimeState(g).contacts ?? 0) >= 2 ? [{ label: '뒷골목 사람을 시켜 겁을 준다', key: 'scare' }] : [])];
      case 'rival': return [{ label: '술값 내리기로 맞선다', key: 'cheap' }, ...(m >= 120 * crowdOf(inn.place) ? [{ label: `저 가게를 사들인다 (은화 ${120 * crowdOf(inn.place)}닢)`, key: 'buy' }] : []), { label: '음식 맛으로 버틴다', key: 'hold' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const inn = myInn(g);
    if (!inn) return '가게는 이미 남의 것이었다.';
    switch (s.ev) {
      case 'arrears': {
        if (key === 'pay') { if (g.player.money < inn.arrears) return '돈이 모자랐다.'; g.player.money -= inn.arrears; inn.arrears = 0; inn.held = 0; return '외상 장부에 줄을 죽 그었다. 술도가 주인이 모자를 들어 보였다.'; }
        if (key === 'hold') { inn.held = mi(g); inn.fame = clamp(inn.fame - 8, 0, 100); for (const w of inn.workers) w.loyal = clamp(w.loyal - 15, 0, 100); stress(g, 8); return '한 철만 기다려 달라고 빌었다. 술도가가 이제 외상으로는 술을 주지 않는다. 일꾼들 얼굴이 어둡다.'; }
        const price = innWorth(inn), left = price - inn.arrears;
        g.player.money += Math.max(0, left);
        const t = innTitle(inn);
        loseInn(g, '빚에 넘어갔다', price);
        chron(g, `${g.player.name}의 ${J(t, '이/가')} 빚에 넘어가다.`, 30);
        stress(g, 12);
        return `가게를 넘기고 외상을 정리했다.${left > 0 ? ` 손에 남은 것은 은화 ${left}닢.` : ' 손에 남은 것은 없다.'} 간판을 떼는 날 단골 몇이 멀찍이 서서 지켜보았다.`;
      }
      case 'tax': {
        const owed = inn.taxOwed;
        if (key === 'pay') { if (g.player.money < owed) return '돈이 모자랐다.'; g.player.money -= owed; inn.taxOwed = 0; deed(g, 'honest', 1, '장사 세금을 제대로 냈다.'); return `은화 ${owed}닢을 세었다. 세리가 영수증에 도장을 찍었다.`; }
        if (key === 'part') { const p = payable(g, owed); g.player.money -= p; inn.taxOwed = 0; inn.arrears += owed - p; return `은화 ${p}닢을 냈다. 나머지는 빚으로 적혔다.`; }
        if (key === 'bribe') { const p = Math.ceil(owed * 0.6); if (g.player.money < p) return '돈이 모자랐다.'; g.player.money -= p; inn.taxOwed = 0; inn.heat = clamp(inn.heat + 8, 0, 100); deed(g, 'honest', -2, '세리에게 뒷돈을 주었다.'); return `은화 ${p}닢을 장부 사이에 끼워 건넸다. 세리는 장부를 덮고 일어섰다. "올해 장사가 시원찮았군."`; }
        const p = payable(g, Math.ceil(owed * 0.4)); g.player.money -= p; inn.dodged += owed - p; inn.taxOwed = 0; deed(g, 'honest', -3, '세금 장부를 꾸몄다.');
        return check(rng, stat(g, 'int'), 40) ? `밤새 장부를 고쳐 썼다. 세리는 은화 ${p}닢만 받아 갔다. 숫자 몇 개가 마음에 걸리지만.` : `장부를 고쳐 썼다. 세리는 은화 ${p}닢을 받아 가면서 한 장을 오래 들여다보았다. 무언가 적어 갔다.`;
      }
      case 'brawl': {
        if (key === 'bouncer') { const b = workerOf(g, 'bouncer'); if (!b) return '문지기가 없었다.'; b.loyal = clamp(b.loyal + 5, 0, 100); inn.fame = clamp(inn.fame + 1, 0, 100); return `${J(b.name, '이/가')} 둘의 목덜미를 잡아 길바닥에 내놓았다. 손님들이 박수를 쳤다.`; }
        if (key === 'guards') { inn.fame = clamp(inn.fame - 1, 0, 100); inn.heat = clamp(inn.heat + 4, 0, 100); return '경비병들이 와서 둘을 끌고 갔다. 손님들은 경비대가 다녀간 가게를 꺼린다.'; }
        if (key === 'let') { const loss = payable(g, rng.int(6, 14)); g.player.money -= loss; inn.clean = clamp(inn.clean - 20, 0, 100); inn.fame = clamp(inn.fame + 1, 0, 100); return `싸움은 저절로 끝났다. 의자 넷, 잔 열둘. 은화 ${loss}닢어치. 그래도 다음 날 그 싸움 이야기를 들으러 온 손님이 있었다.`; }
        tired(g, 6);
        if (check(rng, stat(g, 'str') * 0.6 + stat(g, 'wil') * 0.4, 45)) { inn.fame = clamp(inn.fame + 2, 0, 100); return '둘 사이에 들어가 하나의 팔을 꺾고 다른 하나를 문밖으로 밀어냈다. "내 가게에선 안 돼." 그날부터 그 말이 이 가게의 법이 되었다.'; }
        g.player.injuries.push({ name: '주점 싸움에 낀 멍든 눈', months: 1 });
        return '떼어 놓으려다 주먹 하나를 정통으로 맞았다. 둘은 내가 쓰러지자 머쓱해서 싸움을 멈췄다.';
      }
      case 'rumor': {
        if (key === 'no') return '못 들은 척 잔을 닦았다.';
        if (g.player.money < 2) return '술 한 잔 살 돈도 없었다.';
        g.player.money -= 2;
        const t = gossip(g, rng); note(g, `주점에서 들은 소문: ${t}`);
        return `사내는 잔을 비우고 이야기를 풀었다. ${t}`;
      }
      case 'guest': {
        if (key === 'best') { if (g.player.money < 10) return '돈이 모자랐다.'; g.player.money -= 10; const f = foodOf(g); inn.fame = clamp(inn.fame + (f >= 2 ? 7 : 3), 0, 100); logInn(g, '이름난 손님을 모셨다.'); return f >= 2 ? '손님은 접시를 깨끗이 비우고 주인을 불렀다. "이 고장에 올 때마다 들르겠네." 다음 달 손님들이 그 이야기를 하며 들어왔다.' : '가장 좋은 술을 냈다. 음식이 술을 따라가지 못했다. 손님은 술만 칭찬하고 갔다.'; }
        if (key === 'gouge') { g.player.money += 20; inn.fame = clamp(inn.fame - 5, 0, 100); deed(g, 'honest', -2, '이름난 손님에게 바가지를 씌웠다.'); return '셈을 곱절로 불렀다. 손님은 말없이 은화를 던지고 나갔다. 은화 20닢이 더 남았다. 그 손님이 가는 곳마다 이 가게 이름도 따라갈 것이다.'; }
        inn.fame = clamp(inn.fame + 1, 0, 100); return '다른 손님과 똑같이 대했다. 손님은 그게 마음에 들었는지 웃으며 잔을 들었다.';
      }
      case 'newreg': {
        if (key === 'no' || !REGULARS[s.reg] || regOf(g, s)) return '다른 손님들과 똑같이 대했다. 그 손님은 다음 달부터 보이지 않았다.';
        inn.regulars.push({ id: s.reg, mood: 55, tab: 0, since: mi(g) });
        logInn(g, `${J(REGULARS[s.reg].name, '이/가')} 단골이 되었다.`);
        return `첫 잔을 내가 냈다. ${J(REGULARS[s.reg].name, '은/는')} 잔을 들어 보이고 단숨에 비웠다. 다음 날도 그 자리에 앉아 있었다.`;
      }
      case 'regular': {
        const r = regOf(g, s);
        if (!r) return '그 단골은 오늘 오지 않았다.';
        const drop = () => { inn.regulars.splice(inn.regulars.indexOf(r), 1); };
        if (r.id === 'merc') {
          if (key === 'tab') { r.tab += 10; r.mood = clamp(r.mood + 10, 0, 100); if (r.tab >= 40 && rng.chance(0.5)) { drop(); stress(g, 4); return `외상이 은화 ${r.tab}닢이 되던 달, 가르트의 부대가 북쪽으로 떠났다. 돌아온다는 말은 없었다.`; } if (rng.chance(0.3)) { g.player.money += r.tab; r.tab = 0; return '한 달 뒤, 가르트가 피 묻은 돈주머니를 탁자에 던졌다. "외상값. 남는 건 오늘 술값." 외상은 끝났다.'; } return `외상 장부에 한 줄을 더 적었다. 은화 ${r.tab}닢.`; }
          if (r.tab > 0 && rng.chance(0.5)) { g.player.money += r.tab; r.tab = 0; r.mood = clamp(r.mood - 10, 0, 100); return '가르트는 투덜대며 주머니를 털었다. 외상은 끝났지만 그날은 일찍 일어섰다.'; }
          r.mood = clamp(r.mood - 25, 0, 100); if (r.mood <= 10) { drop(); return '가르트는 잔을 엎어 놓고 나갔다. 다시는 오지 않았다.'; } return '"돈이 없다니까." 가르트는 화를 내며 나갔다.';
        }
        if (r.id === 'farmer') { if (key === 'listen') { r.mood = clamp(r.mood + 10, 0, 100); stress(g, -4); return '이 자리에 옛날엔 우물이 있었다고 한다. 엠브로스의 할아버지가 그 우물에서 첫사랑을 만났다고. 이야기가 끝나자 그는 잔값을 두 번 냈다.'; } r.mood = clamp(r.mood - 5, 0, 100); return '엠브로스는 남은 술을 혼자 마셨다.'; }
        if (r.id === 'merchant') { if (key === 'buy') { if (g.player.money < 20) return '돈이 모자랐다.'; g.player.money -= 20; inn.fame = clamp(inn.fame + 5, 0, 100); r.mood = clamp(r.mood + 10, 0, 100); return '붉은 포도주는 한 달 만에 바닥났다. 그걸 마시러 이웃 고장에서 온 사람도 있었다.'; } return '셀마는 어깨를 으쓱하고 술통을 다시 실었다. 다음 고장에서 팔겠지.'; }
        if (r.id === 'bard') { if (key === 'yes') { const p = payable(g, 3); g.player.money -= p; inn.fame = clamp(inn.fame + 3, 0, 100); r.mood = clamp(r.mood + 10, 0, 100); return '피트가 노래를 시작하자 길 가던 사람들이 들어왔다. 마지막 곡에서는 가게 사람 모두가 후렴을 따라 불렀다.'; } r.mood = clamp(r.mood - 10, 0, 100); return '피트는 류트를 다시 쌌다. 다른 가게로 갔다.'; }
        if (key === 'yes') { L(g).renown = (L(g).renown ?? 0) + 2; inn.heat = clamp(inn.heat + 3, 0, 100); r.mood = clamp(r.mood + 10, 0, 100); return '다음 날 저녁, 아르놀트가 두건을 깊이 쓴 사람과 안쪽 방에 들었다. 문밖으로 새어 나온 말 몇 마디로 미루어 보면 영주 집안 사람이다. 나가면서 그 사람이 내 이름을 물었다.'; }
        r.mood = clamp(r.mood - 10, 0, 100); return '아르놀트는 서운한 얼굴로 고개를 끄덕였다.';
      }
      case 'worker': {
        const w = badWorker(g);
        if (!w) return '일꾼은 이미 없었다.';
        if (key === 'fire') { inn.workers.splice(inn.workers.indexOf(w), 1); if (w.honest) { deed(g, 'kind', -2, '죄 없는 일꾼을 도둑으로 몰아 내보냈다.'); logInn(g, `${J(w.name, '을/를')} 도둑으로 몰아 내보냈다.`); return `${J(w.name, '을/를')} 내보냈다. 다음 달에도 돈궤는 비었다. 범인은 따로 있었다.`; } logInn(g, `손버릇 나쁜 ${J(w.name, '을/를')} 내보냈다.`); return `${J(w.name, '은/는')} 처음엔 잡아뗐다. 소매에서 은화가 굴러떨어지자 고개를 숙였다. 그날로 내보냈다.`; }
        if (key === 'forgive') { w.loyal = clamp(w.loyal + 20, 0, 100); if (!w.honest && rng.chance(0.5)) w.honest = true; deed(g, 'kind', 2, '손버릇 나쁜 일꾼을 한 번 용서했다.'); return `${J(w.name, '을/를')} 따로 불러 아무 말 없이 은화 한 닢을 쥐여 주었다. 고개를 들지 못했다.`; }
        tired(g, 6);
        if (!w.honest) { w.honest = true; w.loyal = clamp(w.loyal - 10, 0, 100); return `밤에 숨어 지켜보았다. ${J(w.name, '이/가')} 술통 마개를 따고 있었다. 눈이 마주쳤다. 둘 다 아무 말도 하지 않았다. 그 뒤로 재고가 맞는다.`; }
        return '며칠 밤을 지켜보았지만 아무도 손대지 않았다. 쥐가 술통 밑을 갉아 놓은 것이었다.';
      }
      case 'poach': {
        const w = workerOf(g, 'cook');
        if (!w) return '요리사는 이미 떠났다.';
        if (key === 'keep') { if (g.player.money < 15) return '돈이 모자랐다.'; g.player.money -= 15; w.loyal = clamp(w.loyal + 20, 0, 100); return `${J(w.name, '은/는')} 웃돈을 받고 앞치마 끈을 다시 맸다. "주인장 밑이 편하오."`; }
        inn.workers.splice(inn.workers.indexOf(w), 1); if (inn.rival) inn.rival.power = clamp(inn.rival.power + 10, 0, 100);
        logInn(g, `요리사 ${J(w.name, '이/가')} 다른 가게로 갔다.`);
        return `${J(w.name, '은/는')} 고개를 숙이고 떠났다. 다음 날 부엌에서 나간 수프는 짰다.`;
      }
      case 'guard': {
        if (key === 'bribe') { if (g.player.money < 15) return '돈이 모자랐다.'; g.player.money -= 15; inn.heat = clamp(inn.heat - 20, 0, 100); deed(g, 'honest', -1, '경비대장에게 뒷돈을 주었다.'); return '은화 15닢이 경비대장의 장갑 속으로 사라졌다. "깨끗한 가게로군." 그들은 술 한 잔씩 하고 나갔다.'; }
        const hid = key === 'hide' && check(rng, stat(g, 'cha') * 0.5 + stat(g, 'int') * 0.5, 45);
        if (hid) { inn.heat = clamp(inn.heat - 10, 0, 100); return '경비대장에게 술을 따르며 옛 전쟁 이야기를 물었다. 그사이 뒷방은 창고가 되었다. 경비대장은 아무것도 못 찾고 나갔다.'; }
        const out = [];
        if (inn.backroom.gamble) { const f = payable(g, 20); g.player.money -= f; inn.backroom.gamble = false; out.push(`뒷방 노름판이 걸렸다. 벌금 은화 ${f}닢, 판은 닫혔다.`); }
        if (inn.backroom.smuggle) { const f = payable(g, 30); g.player.money -= f; inn.backroom.smuggle = false; reportCrime(g, 'smuggling', inn.place, { mult: 0.7 }); out.push(`지하 창고의 궤짝이 압수되었다. 벌금 은화 ${f}닢. 밀수 죄가 장부에 올랐다.`); }
        if (inn.dodged >= 30) { const f = payable(g, inn.dodged * 2); g.player.money -= f; inn.arrears += inn.dodged * 2 - f; inn.dodged = 0; reportCrime(g, 'fraud', inn.place, { mult: 0.5 }); out.push(`꾸민 세금 장부가 드러났다. 빠뜨린 세금의 곱절을 물게 되었다.`); }
        if (out.length) { inn.fame = clamp(inn.fame - 5, 0, 100); inn.heat = 0; logInn(g, '경비대에 걸렸다.'); return out.join(' '); }
        inn.heat = clamp(inn.heat - 15, 0, 100); return '경비대는 구석구석 들여다보고 아무것도 찾지 못했다. 찾을 것이 없었다.';
      }
      case 'gang': {
        const gid = gangAt(inn.place);
        if (key === 'pay') { inn.gang = { id: gid, state: 'paid', since: mi(g) }; logInn(g, `${gangName(g)}에게 자릿세를 내기로 했다.`); return '고개를 끄덕였다. 사내가 문설주에 칼끝으로 작은 표시를 새겼다. 이 가게는 건드리지 말라는 표시다.'; }
        if (key === 'refuse') { inn.gang = { id: gid, state: 'refused', since: mi(g) }; stress(g, 4); return '"이 가게는 내 것이오." 사내는 웃으며 탁자에서 내려왔다. "그럼 조심하쇼. 불은 잘 붙으니까."'; }
        if (key === 'report') { inn.gang = { id: gid, state: 'refused', since: mi(g) }; deed(g, 'brave', 2, '패거리를 경비대에 고발했다.'); inn.heat = clamp(inn.heat + 5, 0, 100); return rng.chance(0.5) ? '경비대가 골목을 한 번 훑고 갔다. 사내들은 한동안 보이지 않았다. 한동안만.' : '경비대장은 고개를 끄덕이며 듣기만 했다. 그날 밤 가게 유리창이 깨졌다. 누가 누구에게 말했는지 알 만하다.'; }
        // 맞서 막는다
        const b = workerOf(g, 'bouncer');
        if (check(rng, stat(g, 'str') * 0.5 + (b ? 30 : 0) + stat(g, 'wil') * 0.3, 50)) { inn.gang = { id: gid, state: 'stood', since: mi(g) }; deed(g, 'brave', 4, '가게를 패거리에게서 지켰다.'); inn.fame = clamp(inn.fame + 4, 0, 100); return `${b ? `${J(b.name, '과/와')} 나란히` : '혼자'} 문 앞을 막아섰다. 몽둥이가 오가고, 사내들이 물러갔다. 골목 사람들이 창 뒤에서 다 보았다.`; }
        const loss = payable(g, 20); g.player.money -= loss; inn.clean = clamp(inn.clean - 30, 0, 100); g.player.injuries.push({ name: '패거리 몽둥이에 맞은 어깨', months: 2 });
        return `막아서다 쓰러졌다. 사내들이 술통을 깨고 탁자를 부쉈다. 은화 ${loss}닢어치. 다음에도 올 것이다.`;
      }
      case 'gamble': {
        if (key === 'out') { if (check(rng, stat(g, 'str') * 0.5 + stat(g, 'cha') * 0.5, 40)) { inn.fame = clamp(inn.fame + 1, 0, 100); return '사기꾼의 멱살을 잡아 뒷문 밖으로 던졌다. 노름꾼들이 판을 다시 벌였다. 이 판은 깨끗하다는 말이 돌았다.'; } inn.clean = clamp(inn.clean - 15, 0, 100); return '사기꾼 편이 넷이었다. 뒷방이 엉망이 되고서야 그들이 나갔다.'; }
        if (key === 'refund') { if (g.player.money < 10) return '돈이 모자랐다.'; g.player.money -= 10; deed(g, 'honest', 2, '노름판에서 속은 손님의 판돈을 물어 주었다.'); return '속은 사내에게 은화 10닢을 쥐여 주었다. 사내는 그 돈으로 다시 주사위를 던졌다.'; }
        inn.heat = clamp(inn.heat + 6, 0, 100); return '못 본 척 돌아섰다. 새벽에 골목에서 누가 칼에 찔렸다는 말이 들렸다. 경비대가 이 가게 이름을 적었다.';
      }
      case 'smuggle': {
        if (key === 'yes') { g.player.money += 30; inn.heat = clamp(inn.heat + 20, 0, 100); deed(g, 'honest', -2, '밀수 궤짝을 더 받았다.'); return '궤짝 셋이 더 들어왔다. 은화 30닢. 지하에서 이상한 냄새가 난다. 묻지 않기로 했다.'; }
        return '거절했다. 우두머리는 다른 창고를 알아보겠다며 눈을 가늘게 떴다.';
      }
      case 'rival_open': {
        const name = s.name ?? RIVAL_NAMES[mi(g) % RIVAL_NAMES.length];
        inn.rival = { name, power: 45, since: mi(g) };
        logInn(g, `건너편에 ${J(name, '이/가')} 문을 열었다.`);
        if (key === 'cheap') { inn.price = 'cheap'; return '값표를 다시 썼다. 저쪽보다 한 푼이라도 싸게. 이제 버티기 싸움이다.'; }
        if (key === 'slander') { inn.rival.power -= 15; deed(g, 'honest', -3, '경쟁 가게에 대한 헛소문을 냈다.'); return '시장 아낙들에게 저 집 술통 이야기를 흘렸다. 사흘 만에 온 고장이 알았다. 저쪽 손님이 눈에 띄게 줄었다.'; }
        if (key === 'scare') { inn.rival.power -= 30; reportCrime(g, 'extortion', inn.place, { mult: 0.5 }); deed(g, 'kind', -3, '경쟁 가게에 사람을 보내 겁을 주었다.'); return '어둑한 사내 둘이 건너편 가게에서 술을 마시며 오래 앉아 있었다. 다음 날부터 그 집 문이 늦게 열린다.'; }
        inn.rival.power = 30; deed(g, 'kind', 1, '새로 연 경쟁 가게에 인사를 갔다.'); return '술 한 병을 들고 건너가 인사를 했다. 저쪽 주인은 젊은 부부였다. 손님을 나눠 갖는 것도 장사다.';
      }
      case 'rival': {
        if (!inn.rival) return '건너편 가게는 이미 없었다.';
        if (key === 'cheap') { inn.price = 'cheap'; inn.rival.power -= 10; return '한 달 내내 반값에 술을 따랐다. 남는 게 없다. 저쪽도 마찬가지일 것이다.'; }
        if (key === 'buy') { const c = 120 * crowdOf(inn.place); if (g.player.money < c) return '돈이 모자랐다.'; g.player.money -= c; const n = inn.rival.name; inn.rival = null; inn.fame = clamp(inn.fame + 5, 0, 100); logInn(g, `경쟁 가게 ${J(n, '을/를')} 사들였다.`); return `저쪽 주인에게 은화 ${c}닢을 내밀었다. 사흘 뒤 ${n}의 간판이 내려졌다. 그 집 손님이 고스란히 건너왔다.`; }
        inn.rival.power += foodOf(g) >= 2 ? -8 : 5; inn.fame = clamp(inn.fame - (foodOf(g) >= 2 ? 0 : 3), 0, 100);
        return foodOf(g) >= 2 ? '값은 그대로 두고 솥을 하나 더 걸었다. 결국 사람들은 맛있는 데로 돌아온다.' : '음식으로 버티려 했지만 이 집 부엌은 그만한 솜씨가 못 된다. 손님이 조금씩 빠졌다.';
      }
      default: return '';
    }
  },
});
