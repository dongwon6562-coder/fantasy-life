// 약방 안팎의 일: 의원 조합의 트집, 마녀라 수군대는 사제, 떠돌이 약장수, 검은 물방울을 찾는 손님,
// 돌림병 때의 약값, 내 약을 먹고 탈이 난 손님, 희귀 약초가 있는 곳을 안다는 사람.
import { defineScene, chron, stress, tired, check } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { KINDS as SICKNESS } from '../health/state.js';
import { outbreaksIn } from '../health/world.js';
import { J } from '../narrative/text.js';
import { AP, shop, atShop, clamp, here, free, stat, herbSkill, placeName, HERBS, RECIPES, RECIPE_IDS, knowsRx, doctorName, quackName, logApo } from './core.js';

const EVS = ['doctor', 'priest', 'quack', 'poison', 'plague', 'harmed', 'rare'];
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const fame = (g, n) => { const p = shop(g); if (p) p.fame = clamp(p.fame + n, 0, 100); };
const stockTotal = (g) => (shop(g) ? RECIPE_IDS.reduce((a, id) => a + (shop(g).stock[id] ?? 0), 0) : 0);
const doc = (g, rng) => (AP(g).doctor ??= { name: doctorName(rng), grudge: 20 });

defineScene('apo_event', {
  need: (g, s) => free(g) && EVS.includes(s.ev)
    && (s.ev === 'rare' || atShop(g))
    && (s.ev !== 'plague' || (outbreaksIn(g, here(g)).length > 0 && stockTotal(g) > 0))
    && (s.ev !== 'rare' || herbSkill(g) >= 25),
  title: (g, s) => ({ doctor: '의원 조합', priest: '사제의 눈', quack: '떠돌이 약장수', poison: '검은 물방울', plague: '돌림병의 약값', harmed: '탈이 난 손님', rare: '희귀 약초' }[s.ev]),
  text: (g, s) => {
    const p = shop(g);
    switch (s.ev) {
      case 'doctor': { const d = doc(g, { pick: (a) => a[(g.date.year + g.date.month) % a.length] }); return `${J(d.name, '이/가')} 조합 인장이 찍힌 종이를 들고 왔다. "약초꾼이 처방을 내리는 건 의원의 일을 훔치는 것이오. 조합에 은화 20닢을 내고 허가를 받든지, 문을 닫든지."`; }
      case 'priest': return `신전의 젊은 사제가 사흘째 약방 앞을 지나며 안을 들여다본다. 골목에서는 ${p.name}의 주인이 밤에 풀을 끓이며 무언가를 중얼거린다는 말이 돈다. 마녀라는 말이 나오기 전에 무언가 해야 한다.`;
      case 'quack': { const q = quackName({ pick: (a) => a[(g.date.month) % a.length] }); return `광장에 ${J(q, '이/가')} 수레를 세웠다. 푸른 병 하나에 은화 한 닢, 모든 병에 듣는다고 외친다. 내 손님 절반이 그쪽으로 갔다. 병 속은 아마 독한 술에 물감을 탄 것이다.`; }
      case 'poison': return `해 질 녘, 두건 쓴 여자가 약방에 들어와 문을 닫았다. "남편이… 오래 앓고 있어요. 오래, 너무 오래. 아프지 않게 보내 줄 것이 있다고 들었어요." 그녀가 탁자에 은화 서른 닢을 늘어놓았다.`;
      case 'plague': { const o = outbreaksIn(g, here(g))[0]; return `${J(SICKNESS[o.kind].name, '이/가')} 골목마다 돈다. 새벽부터 약방 앞에 줄이 섰다. 선반의 약은 곧 바닥난다. 옆 가게 주인이 귓속말을 한다. "지금 값을 세 배로 올려도 다들 살 거요."`; }
      case 'harmed': return '어제 약을 사 간 사내가 아내를 업고 왔다. 아내의 입술이 하얗다. "당신 약을 먹고 이렇게 됐소!" 구경꾼이 모여든다.';
      case 'rare': return '장터 술집에서 늙은 사냥꾼이 술값 대신 이야기를 팔겠다고 한다. "북쪽 골짜기에 서리꽃이 한 무더기 핀 데를 알지. 은화 열 닢이면 길을 그려 주겠소."';
      default: return '';
    }
  },
  choices: (g, s) => {
    switch (s.ev) {
      case 'doctor': return [{ label: '은화 20닢을 내고 허가를 받는다', key: 'pay' }, { label: '내 약으로 나은 사람들을 증인으로 세운다', key: 'proof' }, { label: '못 들은 척한다', key: 'ignore' }];
      case 'priest': return [{ label: '신전에 약을 기부한다', key: 'give' }, { label: '사제를 불러 약 달이는 것을 보여 준다', key: 'show' }, { label: '신경 쓰지 않는다', key: 'ignore' }];
      case 'quack': return [{ label: '광장에 나가 그 약을 맛보고 정체를 밝힌다', key: 'expose' }, { label: '약값을 내려 맞선다', key: 'cheap' }, { label: '기다린다. 저런 자는 오래 못 간다', key: 'wait' }];
      case 'poison': return [{ label: '내쫓는다', key: 'refuse' }, ...(knowsRx(g, 'bane') && (AP(g).satchel.bane || shop(g)?.stock.bane) ? [{ label: '검은 물방울 한 병을 내준다', key: 'sell' }] : []), { label: '남편을 보러 가겠다고 한다', key: 'visit' }, { label: '경비대에 알린다', key: 'report' }];
      case 'plague': return [{ label: '값을 올린다', key: 'gouge' }, { label: '제값을 받는다', key: 'fair' }, { label: '가난한 집에는 그냥 준다', key: 'free' }];
      case 'harmed': return [{ label: '의원을 불러 주고 값을 치른다', key: 'pay' }, { label: '내 약 탓이 아니라고 맞선다', key: 'deny' }, { label: '내 약을 직접 먹어 보인다', key: 'taste' }];
      case 'rare': return [{ label: '은화 10닢을 낸다', key: 'buy' }, { label: '술 한 잔만 사 준다', key: 'drink' }, { label: '사양한다', key: 'no' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const st = AP(g), p = shop(g);
    switch (s.ev) {
      case 'doctor': {
        const d = doc(g, rng);
        if (key === 'pay') { const n = pay(g, 20); d.grudge = clamp(d.grudge - 15, 0, 100); return `은화 ${n}닢을 냈다. 조합 인장이 찍힌 허가장을 약방 벽에 걸었다. ${J(d.name, '은/는')} 더 오지 않았다.`; }
        if (key === 'proof') { if (check(rng, stat(g, 'cha') + (p?.fame ?? 0) * 0.3, 45)) { fame(g, 4); d.grudge = clamp(d.grudge + 10, 0, 100); return `열병에서 일어난 대장장이, 기침이 멎은 과부, 상처가 아문 사냥꾼이 약방 앞에 섰다. ${J(d.name, '은/는')} 종이를 접어 돌아갔다. 조합에는 원수가 하나 생겼다.`; } fame(g, -3); pay(g, 10); return '증인들은 조합 사람들 앞에서 말을 더듬었다. 결국 벌금 은화 10닢을 물었다.'; }
        d.grudge = clamp(d.grudge + 20, 0, 100); if (d.grudge >= 60) { fame(g, -8); return `${J(d.name, '이/가')} 영주에게 고발장을 냈다. 한 달 동안 손님들이 약방 앞에서 머뭇거렸다.`; } return '종이를 받아 서랍에 넣었다. 그는 다시 오겠다고 했다.';
      }
      case 'priest': {
        if (key === 'give') { const n = Math.min(2, stockTotal(g)); for (const id of RECIPE_IDS) { let k = n; while (k > 0 && p.stock[id]) { p.stock[id]--; k--; } } deed(g, 'generous', 2, '신전 구휼소에 약을 기부했다'); return '열내림 달임과 고약을 신전 구휼소에 보냈다. 다음 미사에서 사제가 약초꾼의 손도 신의 손이라고 했다.'; }
        if (key === 'show') { if (check(rng, stat(g, 'cha') + herbSkill(g) * 0.2, 40)) { fame(g, 3); return '사제가 약탕관 앞에 앉아 처방대로 달이는 것을 끝까지 보았다. 주문도 피도 없었다. 그는 쑥 냄새를 맡고 웃었다.'; } fame(g, -4); stress(g, 5); return '사제는 말린 검은 열매 단지를 오래 들여다보더니 아무 말 없이 나갔다. 수군거림은 더 커졌다.'; }
        fame(g, -5); deed(g, 'honest', -1, '약방 주인이 밤에 주문을 왼다는 소문'); return '신경 쓰지 않았다. 한 달 뒤, 아이를 데려오던 어머니들 몇이 발길을 끊었다.';
      }
      case 'quack': {
        if (key === 'expose') { if (check(rng, herbSkill(g) + stat(g, 'cha') * 0.3, 50)) { fame(g, 6); deed(g, 'honest', 2, '광장에서 가짜 약장수의 정체를 밝혔다'); return '푸른 병을 하나 사서 광장 한가운데서 따랐다. 냄새를 맡고 맛을 보고 말했다. "독주에 감초 물이오. 열에는 오히려 독이오." 약장수는 그날 밤 수레를 끌고 떠났다.'; } fame(g, -2); return '맛을 보고 따지려 했지만 약장수의 입이 더 빨랐다. 구경꾼들은 둘 다 장사꾼이라며 흩어졌다.'; }
        if (key === 'cheap') { p.price = 'cheap'; fame(g, 2); return '약값을 내렸다. 손님은 돌아왔지만 주머니는 가벼워졌다.'; }
        fame(g, -2); return '석 달 뒤 약장수는 사라졌다. 그 약을 먹은 아이 하나가 죽었다는 말이 남았다.';
      }
      case 'poison': {
        if (key === 'sell') {
          if (st.satchel.bane) st.satchel.bane--; else if (p?.stock.bane) p.stock.bane--;
          g.player.money += 30; st.poisons += 1;
          reportCrime(g, 'murder', here(g), { mult: 0.2 });
          deed(g, 'honest', -4, '약방에서 독을 판다는 소문'); stress(g, 10);
          chron(g, `${placeName(here(g))}에서 오래 앓던 사내가 밤사이 숨을 거두었다. 아내는 울지 않았다고 한다.`, 20);
          return '작은 병 하나를 건넸다. 그녀는 은화를 두고 뒤도 돌아보지 않고 나갔다. 사흘 뒤 장례 종이 울렸다.';
        }
        if (key === 'visit') { tired(g, 6); if (check(rng, herbSkill(g), 40)) { st.cured += 1; deed(g, 'kind', 2, '앓는 사람을 찾아가 돌보았다'); return '남편은 뼈만 남아 있었다. 썩은 이빨이 열의 뿌리였다. 이를 뽑고 버드나무 달임을 먹였다. 한 달 뒤 그녀가 다시 왔다. 이번에는 웃으며.'; } return '남편을 보았다. 내 약으로 될 병이 아니었다. 그녀에게 아무것도 주지 않고 돌아왔다. 그녀의 눈이 오래 등에 남았다.'; }
        if (key === 'report') { deed(g, 'loyal', 1, '독을 사려는 사람을 경비대에 알렸다'); return '경비대에 알렸다. 그 집 남편은 그 뒤로도 오래 앓았다. 옳은 일을 했는지는 모르겠다.'; }
        return '"여기는 사람 살리는 곳이오." 그녀는 은화를 쓸어 담고 나갔다. 다른 약방을 찾아갈 것이다.';
      }
      case 'plague': {
        const o = outbreaksIn(g, here(g))[0];
        if (key === 'gouge') { const m = Math.round(stockTotal(g) * 6); g.player.money += m; for (const id of RECIPE_IDS) delete p.stock[id]; fame(g, -10); deed(g, 'generous', -4, `${SICKNESS[o?.kind]?.name ?? '돌림병'} 때 약값을 세 배로 올렸다`); return `선반의 약이 하루 만에 다 나갔다. 은화 ${m}닢. 마지막 손님은 돈이 모자라 빈손으로 돌아갔다. 그 집 문에 이틀 뒤 흰 천이 걸렸다.`; }
        if (key === 'free') { const n = Math.min(4, stockTotal(g)); let k = n; for (const id of RECIPE_IDS) while (k > 0 && p.stock[id]) { p.stock[id]--; k--; } fame(g, 8); st.cured += n; deed(g, 'kind', 4, '돌림병 때 가난한 집에 약을 그냥 주었다'); return `가난한 집 ${n}곳에 약을 그냥 보냈다. 손해는 컸다. 돌림병이 지나간 뒤에도 그 골목 사람들은 내 약방 앞을 지날 때 모자를 벗었다.`; }
        fame(g, 3); return '값을 올리지 않았다. 줄은 길었고 약은 금방 떨어졌다. 그래도 아무도 나를 욕하지 않았다.';
      }
      case 'harmed': {
        if (key === 'pay') { pay(g, 15); fame(g, -2); st.harmed = Math.max(0, st.harmed - 1); return '의원을 불러 주고 은화 15닢을 치렀다. 아내는 사흘 만에 일어났다. 사내는 고맙다는 말 없이 갔다.'; }
        if (key === 'taste') { if (!p.cut) { fame(g, 5); return '구경꾼 앞에서 같은 약을 한 첩 털어 넣었다. 한나절이 지나도 멀쩡했다. 탈은 다른 데서 난 것이다. 사람들이 고개를 끄덕였다.'; } stress(g, 6); fame(g, -10); p.cut = false; deed(g, 'honest', -3, '분필 섞은 약을 팔다 들켰다'); return '약을 털어 넣었다. 분필 가루가 목에 걸려 기침이 터졌다. 구경꾼 하나가 손가락에 묻은 흰 가루를 보았다. 그날로 분필 단지를 버렸지만 소문은 버릴 수 없었다.'; }
        if (p.cut) { reportCrime(g, 'fraud', here(g), { mult: 0.6 }); fame(g, -12); return '내 탓이 아니라고 버텼다. 사내가 경비대를 데려왔다. 약 한 첩을 쪼개 보니 흰 가루가 나왔다. 사기로 이름이 적혔다.'; }
        fame(g, -3); return '내 약 탓이 아니라고 했다. 아무도 증명하지 못했다. 반쯤은 나를 믿고, 반쯤은 믿지 않는다.';
      }
      case 'rare': {
        if (key === 'buy') { if (pay(g, 10) < 10) return '은화가 모자랐다. 사냥꾼은 다른 손님을 찾아 고개를 돌렸다.'; st.herbs.frost = Math.min(99, (st.herbs.frost ?? 0) + 4); st.herbs.gentian = Math.min(99, (st.herbs.gentian ?? 0) + 2); tired(g, 10); logApo(g, '사냥꾼의 길을 따라 서리꽃 무더기를 찾았다.'); return `그려 준 길을 따라 이틀을 걸었다. 바위 그늘에 서리꽃이 정말로 피어 있었다. ${HERBS.frost.name} 네 줌과 ${HERBS.gentian.name} 두 줌.`; }
        if (key === 'drink') { if (rng.chance(0.4)) { st.herbs.frost = Math.min(99, (st.herbs.frost ?? 0) + 2); return '술 한 잔에 사냥꾼의 입이 풀렸다. 공짜로 들은 길치고는 쓸 만했다. 서리꽃 두 줌.'; } return '술만 사 주고 이야기는 듣지 못했다. 사냥꾼은 탁자에 엎드려 잠들었다.'; }
        return '사양했다. 술집 이야기는 대개 술값만큼의 값어치다.';
      }
      default: return '지나갔다.';
    }
  },
});
