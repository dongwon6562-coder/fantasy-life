// 술도가 안팎의 일: 세리, 금주령, 밀주꾼, 귀족의 주문, 주점의 납품 제안, 시어 가는 통, 옆 술도가의 뒷말, 가을 축제.
import { HOOKS } from '../hooks.js';
import { defineScene, queueScene, sceneQueued, chron, stress, check } from '../adventure/core.js';
import { L } from '../adventure/core.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import {
  BR, cellar, atCellar, banned, ageOf, isReady, isSour, caskValue, drinkName, readyCasks, logBrew, mi, clamp, here, free, stat, ownRng, isPlace, brewSkill, placeName,
  DRINKS, rivalName, tavernName, nobleName,
} from './core.js';

const EVS = ['taxman', 'ban', 'smuggler', 'noble', 'tavern', 'sour', 'rival', 'festival'];
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const fame = (g, n) => { const p = cellar(g); if (p) p.fame = clamp(p.fame + n, 0, 100); };
const grainCasks = (g) => BR(g).casks.filter((c) => DRINKS[c.d].grain && !isSour(g, c));
const fineCask = (g) => readyCasks(g).filter((c) => (c.d === 'wine' || c.d === 'mead') && c.q >= 50 && ageOf(g, c) >= (DRINKS[c.d].ready + DRINKS[c.d].peak) / 2).sort((a, b) => caskValue(g, b) - caskValue(g, a))[0] ?? null;
const turning = (g) => BR(g).casks.find((c) => { const a = ageOf(g, c), D = DRINKS[c.d]; return a >= D.spoil - 2 && a < D.spoil; }) ?? null;
const smugglable = (g) => readyCasks(g).filter((c) => c.d === 'spirit' || (DRINKS[c.d].grain && banned(g)));
const festivalCasks = (g) => readyCasks(g).filter((c) => c.d === 'ale' || c.d === 'cider');
const fixedPick = (g) => ({ pick: (a) => a[(g.date.year + g.date.month) % a.length] });

export function eligible(g) {
  const out = [];
  const p = cellar(g), at = atCellar(g);
  if (at && p.taxOwed >= 20) out.push('taxman');
  if (banned(g) && grainCasks(g).length) out.push('ban');
  if (at && smugglable(g).length) out.push('smuggler');
  if (at && p.fame >= 30 && fineCask(g)) out.push('noble');
  if (at && !p.contract && readyCasks(g).length) out.push('tavern');
  if (turning(g)) out.push('sour');
  if (at && p.fame >= 20) out.push('rival');
  if ([9, 10].includes(g.date.month) && festivalCasks(g).length && isPlace(here(g))) out.push('festival');
  return out;
}
const still = (g, ev) => free(g) && eligible(g).includes(ev);

defineScene('brew_event', {
  need: (g, s) => EVS.includes(s.ev) && still(g, s.ev),
  title: (g, s) => ({ taxman: '술 세리', ban: '금주령', smuggler: '밤손님', noble: '귀족의 주문', tavern: '주점 주인', sour: '시어 가는 통', rival: '옆 술도가', festival: '가을 축제' }[s.ev]),
  text: (g, s) => {
    const p = cellar(g);
    switch (s.ev) {
      case 'taxman': return `영주의 술 세리가 장부를 끼고 들어왔다. 밀린 술 세금이 은화 ${p.taxOwed}닢이라고 한다. 세리는 통마다 분필로 표시를 하며 셈을 다시 한다. 셈이 끝나기 전에 무언가 정해야 한다.`;
      case 'ban': return `흉년이 깊어지자 영주가 금주령을 내렸다. 곡식으로 술을 빚는 자는 벌금을 물고 통을 빼앗긴다. 광에는 곡식 술 ${grainCasks(g).length}통이 있다. 굶는 사람이 늘어난 골목에서 술 냄새는 멀리 간다.`;
      case 'smuggler': return '자정 무렵 뒷문을 두드리는 소리가 났다. 강 건너에서 왔다는 사내가 은화 주머니를 흔든다. "세리 장부에 안 오르는 술을 사고 싶소. 값은 장터보다 후하게 쳐 드리지."';
      case 'noble': { const c = fineCask(g); return `${J(nobleName(fixedPick(g)), '이/가')} 말을 타고 왔다. 주인의 혼례 잔치에 쓸 좋은 술을 찾는다고 한다. 광의 ${c.y}년 ${J(drinkName(g, c.d), '을/를')} 맛보더니 눈썹이 올라갔다. 값은 부르는 대로 주겠다고 한다.`; }
      case 'tavern': return `${J(tavernName(fixedPick(g)), '이/가')} 찾아왔다. 다달이 술을 대 줄 곳을 찾고 있다고 한다. 여섯 달 동안 달마다 한 통씩, 값은 장터보다 조금 낫게 쳐 주겠다고 한다. 대신 거르면 장사 망친다고.`;
      case 'sour': { const c = turning(g); return `${c.y}년 ${J(drinkName(g, c.d), '을/를')} 담은 통에서 시큼한 냄새가 올라온다. 이대로 두면 곧 식초가 된다.`; }
      case 'rival': return `${J(rivalName(fixedPick(g)), '이/가')} 장터에서 내 술에 물을 탄다고 떠들고 다닌다. 손님 몇이 술잔을 내려놓고 냄새를 맡아 본다.`;
      case 'festival': return `${placeName(here(g))}의 가을 축제 날이다. 광장에 천막이 서고 축제를 맡은 조합에서 술을 통째로 사겠다는 사람이 왔다. 맥주와 사과술이라면 있는 대로 사겠다고 한다.`;
      default: return '';
    }
  },
  choices: (g, s) => {
    switch (s.ev) {
      case 'taxman': return [{ label: '세금을 낸다', key: 'pay' }, { label: '세리에게 술 한 통과 은화를 조금 쥐여 준다', key: 'bribe' }, { label: '장부가 틀렸다고 우긴다', key: 'argue' }];
      case 'ban': return [{ label: '통을 열어 하수구에 쏟는다', key: 'pour' }, { label: '광 바닥 밑에 숨긴다', key: 'hide' }, { label: '밤에 몰래 판다', key: 'black' }];
      case 'smuggler': return [{ label: '판다', key: 'sell' }, { label: '돌려보낸다', key: 'refuse' }, { label: '경비대에 알린다', key: 'report' }];
      case 'noble': return [{ label: '두 배 반 값을 부른다', key: 'dear' }, { label: '제값에 넘기고 이름을 판다', key: 'fair' }, { label: '이 통은 팔지 않는다', key: 'keep' }];
      case 'tavern': return [{ label: '납품을 맡는다', key: 'take' }, { label: '거절한다', key: 'no' }];
      case 'sour': return [{ label: '꿀을 풀어 살려 본다 (은화 5닢)', key: 'save' }, { label: '지금 헐값에 판다', key: 'dump' }, { label: '그대로 둔다', key: 'leave' }];
      case 'rival': return [{ label: '광장에서 두 집 술을 나란히 맛보게 한다', key: 'contest' }, { label: '그 집 단골에게 술 한 잔씩 돌린다', key: 'treat' }, { label: '못 들은 척한다', key: 'ignore' }];
      case 'festival': return [{ label: '있는 맥주와 사과술을 모두 넘긴다', key: 'sell' }, { label: '한 통만 넘긴다', key: 'one' }, { label: '넘기지 않는다', key: 'no' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const st = BR(g), p = cellar(g);
    const remove = (c) => { st.casks = st.casks.filter((x) => x !== c); };
    const sellAt = (c, mul) => { const v = Math.round(caskValue(g, c) * mul); remove(c); g.player.money += v; st.sold += 1; st.earned += v; return v; };
    switch (s.ev) {
      case 'taxman': {
        if (key === 'pay') { const n = pay(g, p.taxOwed); p.taxOwed -= n; deed(g, 'honest', 1, '술 세금을 제때 냈다', here(g)); return `은화 ${n}닢을 세었다. 세리가 장부에 줄을 긋고 나갔다.${p.taxOwed > 0 ? ` 아직 ${p.taxOwed}닢이 남았다.` : ''}`; }
        if (key === 'bribe') {
          const c = readyCasks(g)[0];
          const n = pay(g, Math.round(p.taxOwed * 0.2));
          if (c) remove(c);
          if (rng.chance(0.25)) { reportCrime(g, 'fraud', here(g), { mult: 0.5 }); p.taxOwed = Math.round(p.taxOwed * 1.3); return `세리는 받을 것을 받고 나갔다. 사흘 뒤 다른 세리가 왔다. 앞의 세리가 윗선에 넘긴 것이다. 세금에 벌금이 붙었다. (은화 ${n}닢 잃음)`; }
          p.taxOwed = Math.round(p.taxOwed * 0.3);
          return `세리는 술통을 수레에 싣고 장부를 고쳐 적었다. 은화 ${n}닢${c ? '과 술 한 통' : ''}이 들었다. 다음 세리는 누가 올지 모른다.`;
        }
        if (check(rng, stat(g, 'int') * 0.4 + stat(g, 'cha') * 0.3, 35)) { p.taxOwed = Math.round(p.taxOwed * 0.7); return '통마다 날짜와 양을 하나하나 짚었다. 세리가 두 통을 두 번 센 것이 드러났다. 세금이 줄었다.'; }
        p.taxOwed = Math.round(p.taxOwed * 1.2); stress(g, 4);
        return '목소리만 높아졌다. 세리는 대드는 값을 장부에 얹었다.';
      }
      case 'ban': {
        const list = grainCasks(g);
        if (key === 'pour') { for (const c of list) remove(c); deed(g, 'honest', 2, '금주령에 술을 쏟았다', here(g)); stress(g, 5); return `통 ${list.length}개를 하수구에 쏟았다. 골목에 이틀 동안 맥주 냄새가 났다. 아이들이 그 물을 손으로 떠 먹으려다 혼났다.`; }
        if (key === 'hide') {
          if (rng.chance(0.3)) { for (const c of list) remove(c); reportCrime(g, 'smuggling', here(g), { mult: 0.5 }); return '이웃이 밀고했다. 경비병들이 바닥을 뜯어 통을 굴려 갔다. 벌금 이야기가 나올 것이다.'; }
          st.illicit += 1;
          return '광 바닥 판자를 들어내고 통을 눕혔다. 위에 감자 자루를 쌓았다. 흉년이 지나면 꺼낼 것이다.';
        }
        let sum = 0; for (const c of list.filter((x) => isReady(g, x))) sum += sellAt(c, 2.5);
        st.illicit += 1;
        if (rng.chance(0.4)) reportCrime(g, 'smuggling', here(g), { mult: 0.6 });
        deed(g, 'honest', -2, '금주령 때 몰래 술을 팔았다', here(g));
        return sum ? `밤마다 뒷문으로 술이 나갔다. 굶는 해에도 술 살 돈이 있는 사람은 있다. 은화 ${sum}닢.` : '팔 만큼 익은 통이 없었다. 숨길 수밖에.';
      }
      case 'smuggler': {
        const list = smugglable(g);
        if (key === 'sell') {
          let sum = 0; for (const c of list.slice(0, 3)) sum += sellAt(c, 1.6);
          st.illicit += 1;
          if (rng.chance(0.3)) reportCrime(g, 'smuggling', here(g), { mult: 0.4 });
          return `통 ${Math.min(3, list.length)}개가 강 건너로 갔다. 은화 ${sum}닢. 세리 장부에는 오르지 않는다. 그 사내가 입이 무거운지는 모른다.`;
        }
        if (key === 'report') { deed(g, 'honest', 2, '밀주꾼을 경비대에 알렸다', here(g)); return '경비대가 강가에서 그 사내를 잡았다. 며칠 뒤 다른 밀주꾼들이 내 술도가 앞을 지나가며 침을 뱉었다.'; }
        return '사내는 어깨를 으쓱하고 어둠 속으로 사라졌다.';
      }
      case 'noble': {
        const c = fineCask(g);
        if (key === 'keep') return '아직 때가 아니라고 했다. 집사는 아쉬운 얼굴로 돌아갔다. 통은 광에서 더 깊어질 것이다.';
        if (key === 'dear') {
          if (check(rng, stat(g, 'cha') * 0.5 + (p.fame ?? 0) * 0.4, 45)) { const v = sellAt(c, 2.5); fame(g, 3); return `집사가 은화 ${v}닢을 세었다. 혼례 잔치 뒤로 그 술 이름을 묻는 귀족이 늘었다.`; }
          return '집사는 코웃음을 치고 돌아갔다. 귀족은 흥정하는 술도가를 좋아하지 않는다.';
        }
        const v = sellAt(c, 1.4); fame(g, 6);
        L(g).renown = (L(g).renown ?? 0) + 2;
        chron(g, `${g.player.name}의 술이 귀족의 혼례 잔치에 오르다.`, 40);
        return `은화 ${v}닢에 넘겼다. 혼례 잔치에서 그 술이 돌았고, ${J(p.name, '이/가')} 귀족들 입에 올랐다.`;
      }
      case 'tavern': {
        if (key === 'no') return '주점 주인은 다른 술도가를 찾아갔다.';
        const d = readyCasks(g)[0]?.d ?? 'ale';
        p.contract = { name: tavernName(fixedPick(g)), d, left: 6, pay: 1.15, missed: 0 };
        logBrew(g, `주점에 ${J(DRINKS[d].name, '을/를')} 대기로 했다.`);
        return `손을 맞잡았다. 여섯 달 동안 다달이 ${DRINKS[d].name} 한 통. 통이 비지 않게 빚어 두어야 한다.`;
      }
      case 'sour': {
        const c = turning(g);
        if (!c) return '그 사이 통 형편이 달라졌다.';
        if (key === 'save') {
          pay(g, 5);
          if (check(rng, brewSkill(g), 40)) { c.at = Math.min(mi(g), c.at + 4); c.q = Math.max(5, c.q - 5); return '꿀을 풀고 통을 새로 봉했다. 냄새가 가라앉았다. 몇 달은 더 버틸 것이다.'; }
          c.at = mi(g) - DRINKS[c.d].spoil; return '꿀을 풀었지만 늦었다. 다음 날 아침 통은 완전히 식초가 되어 있었다.';
        }
        if (key === 'dump') { const v = sellAt(c, 0.5); return `시어 가는 통을 은화 ${v}닢에 넘겼다.`; }
        return '그대로 두었다. 운이 좋으면 몇 달 더 간다.';
      }
      case 'rival': {
        if (key === 'contest') {
          if (check(rng, brewSkill(g) * 0.7 + stat(g, 'cha') * 0.2, 40)) { fame(g, 6); return '광장에서 두 잔을 나란히 놓았다. 장꾼들이 번갈아 마시고 내 잔 쪽에 손을 들었다. 그 뒤로 물 탄다는 말은 들리지 않았다.'; }
          fame(g, -4); stress(g, 4); return '장꾼들은 저쪽 잔에 손을 들었다. 내 술이 나빴는지 저쪽이 장꾼을 샀는지는 모른다.';
        }
        if (key === 'treat') { const c = readyCasks(g)[0]; if (c) remove(c); fame(g, 3); deed(g, 'generous', 1, '장터 사람들에게 술을 돌렸다', here(g)); return `${c ? '술 한 통을 열어' : '주머니를 털어'} 그 집 단골들에게 한 잔씩 돌렸다. 몇은 다음 장날 내 술도가로 왔다.`; }
        fame(g, -2); return '못 들은 척했다. 말은 저절로 사그라들지 않았다.';
      }
      case 'festival': {
        const list = festivalCasks(g);
        if (key === 'no') return '광장에서 남의 술로 축제가 돌았다.';
        let sum = 0; for (const c of key === 'one' ? list.slice(0, 1) : list) sum += sellAt(c, 1.3);
        fame(g, 2);
        return key === 'one' ? `한 통을 넘겼다. 은화 ${sum}닢. 천막 한쪽에서 내 술을 찾는 사람이 있었다.` : `축제 천막에서 내 술이 동났다. 은화 ${sum}닢. 밤늦게까지 노랫소리가 났다.`;
      }
      default: return '아무 일도 없었다.';
    }
  },
});

HOOKS.afterMonth.push((g) => {
  const st = BR(g);
  if (!st.casks.length && !st.cellar) return;
  if (!free(g) || mi(g) - st.eventAt < 4 || sceneQueued(g, 'brew_event')) return;
  const rng = ownRng(g, 3);
  if (!rng.chance(0.3)) return;
  const evs = eligible(g);
  if (!evs.length) return;
  st.eventAt = mi(g);
  queueScene(g, 'brew_event', { ev: rng.pick(evs) });
});
