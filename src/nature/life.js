// 철마다 다른 살림: 봄 파종 일손, 여름 둑 쌓기, 가을걷이, 겨울나기 준비. 그리고 겨울을 버티는 일.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { playerAge, gainSkill, gainStat } from '../game.js';
import { L, isAdult, tired, stress, up, gains, check, note } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { NS, REGIONS, regionOf, winterOf, activeAt, nlog, cropWord } from './state.js';

const here = (g) => L(g).place;
const free = (g) => !L(g).travel && !isJailed(g) && !g.over;
const farmland = (g) => !!REGIONS[regionOf(here(g))]?.farm;
const wage = (g) => PLACES[here(g)]?.wage ?? 1;
const bread = (g) => g.realm?.bread ?? 1;
const RIVERSIDE = ['verden', 'leocast', 'klein', 'serenia', 'harfen', 'barka', 'portel'];

/* ---------- 봄: 파종 ---------- */
ACTIONS.push({
  id: 'nature_sow', name: '봄 파종 거들기', icon: 'farm',
  desc: '봄 들판에서 씨를 뿌리고 고랑을 낸다. 품삯은 적지만 농사 손이 늘고, 그해 소출이 조금 낫다.',
  available: (g) => playerAge(g) >= 10 && free(g) && farmland(g) && (g.date.month === 3 || g.date.month === 4),
  run(g, rng) {
    if (!farmland(g) || L(g).travel) return '들판을 떠나 있었다.';
    tired(g, 12);
    const N = NS(g), r = regionOf(here(g));
    if (N.sowAt !== g.date.year * 12 + g.date.month) { N.sowAt = g.date.year * 12 + g.date.month; N.crop[r] = Math.min(1.3, N.crop[r] + 0.005); }
    const n = Math.max(1, Math.round(rng.int(1, 3) * wage(g)));
    g.player.money += n;
    const f = gainSkill(g, 'farming', 1.2, 'str'), s = gainStat(g, 'str', 0.2);
    return `${rng.pick(['젖은 흙에 맨발로 들어가 하루 종일 씨를 뿌렸다. 허리가 펴지지 않는다.', '늙은 농부가 고랑 간격을 손뼘으로 재 보이며 혀를 찼다. 다시 냈다.', '종달새가 뿌린 씨를 쪼아 먹었다. 아이들을 불러 허수아비를 세웠다.'])} 품삯 은화 ${n}닢.${gains([up('농사', f), up('힘', s)])}`;
  },
});

/* ---------- 여름: 둑 쌓기 ---------- */
ACTIONS.push({
  id: 'nature_dike', name: '장마 앞 둑 쌓기', icon: 'labor',
  desc: '장마가 오기 전에 이웃들과 강둑에 흙 자루를 쌓는다. 그해 이 고장에 물이 넘쳐도 덜 무섭다.',
  available: (g) => playerAge(g) >= 12 && free(g) && RIVERSIDE.includes(here(g)) && (g.date.month === 6 || g.date.month === 7),
  run(g, rng) {
    if (!RIVERSIDE.includes(here(g)) || L(g).travel) return '강가를 떠나 있었다.';
    tired(g, 16);
    const N = NS(g);
    const first = N.dike[here(g)] !== g.date.year;
    N.dike[here(g)] = g.date.year;
    if (first) { L(g).renown = (L(g).renown ?? 0) + 1; nlog(g, `${PLACES[here(g)]?.name ?? '고장'} 강둑을 쌓았다.`); }
    const s = gainStat(g, 'str', 0.4), w = gainStat(g, 'wil', 0.2);
    return `${rng.pick(['흙 자루 이백 개를 날랐다. 둑 위에서 내려다보는 강은 아직 순하다.', '방앗간 주인이 둑 쌓는 사람들에게 보리빵을 돌렸다. 해마다 하는 일이라고 했다. 해마다 잊어버리는 일이기도 하다고.', '둑 한쪽에서 쥐구멍을 찾아 막았다. 큰 둑은 쥐구멍 하나로 무너진다고 노인들이 말했다.'])}${first ? ' 올여름 이 고장은 조금 덜 젖을 것이다.' : ''}${gains([up('힘', s), up('의지', w)])}`;
  },
});

/* ---------- 가을: 추수 ---------- */
ACTIONS.push({
  id: 'nature_harvest', name: '가을걷이', icon: 'farm',
  desc: '들판의 곡식을 거두는 일손이 된다. 풍년이면 품삯이 후하고, 흉년이면 거둘 것도 품삯도 없다.',
  available: (g) => playerAge(g) >= 8 && free(g) && farmland(g) && (g.date.month === 9 || g.date.month === 10),
  run(g, rng) {
    if (!farmland(g) || L(g).travel) return '들판을 떠나 있었다.';
    tired(g, 14);
    const c = NS(g).crop[regionOf(here(g))];
    const n = Math.max(0, Math.round(rng.int(2, 5) * wage(g) * c * c));
    g.player.money += n;
    const f = gainSkill(g, 'farming', 1.0, 'str');
    const word = cropWord(c);
    const line = c >= 1.08 ? '낫을 휘두를 때마다 이삭이 무겁게 쏟아졌다. 저녁마다 마을 어귀에서 노래가 났다.' : c >= 0.9 ? '여느 해처럼 거뒀다. 여느 해처럼 허리가 아팠다.' : c >= 0.6 ? '반쯤 빈 이삭을 거뒀다. 농부들은 말이 없었다. 품삯을 주며 미안해했다.' : '거둘 것이 거의 없었다. 들판에 선 채로 말라 버린 줄기를 베어 땔감으로 묶었다.';
    return `${line} 올해는 ${word}. 품삯 은화 ${n}닢.${gains([up('농사', f)])}`;
  },
});

/* ---------- 겨울나기 준비 ---------- */
export const winterCost = (g) => Math.max(3, Math.round((4 + (['own', 'street', 'rent'].includes(L(g).home) ? 3 : 0) + regionCold(g) * 3) * bread(g)));
const regionCold = (g) => (['north', 'mountain'].includes(regionOf(here(g))) ? 2 : ['forest', 'east', 'river'].includes(regionOf(here(g))) ? 1 : 0);
ACTIONS.push({
  id: 'nature_winterprep', name: '겨울나기 준비', icon: 'home',
  desc: '장작을 패고, 곡식과 소금에 절인 고기를 들이고, 창틈을 막는다. 준비 없이 맞는 겨울은 몸과 마음을 깎는다. 빵값이 오르면 준비도 비싸진다.',
  available: (g) => playerAge(g) >= 14 && free(g) && [9, 10, 11].includes(g.date.month) && NS(g).ready !== g.date.year,
  run(g, rng) {
    const N = NS(g);
    const year = g.date.year;
    if (N.ready === year) return '장작더미를 한 번 더 쌓아 올렸다. 이만하면 됐다.';
    const cost = winterCost(g);
    if (g.player.money < cost) {
      tired(g, 15);
      const w = gainStat(g, 'wil', 0.3);
      if (check(rng, g.player.stats.str * 0.6 + g.player.stats.wil * 0.4, 45)) { N.ready = year; return `돈이 모자라 숲에서 장작을 직접 해 왔다. 손바닥이 터졌다. 그래도 겨울은 날 수 있을 것이다.${gains([up('의지', w)])}`; }
      return `돈이 모자라 숲에서 장작을 해 왔지만 겨울을 나기엔 턱없다. 은화 ${cost}닢이 있어야 제대로 준비할 수 있다.${gains([up('의지', w)])}`;
    }
    g.player.money -= cost;
    N.ready = year;
    tired(g, 8);
    note(g, `${year}년 겨울을 날 준비를 마쳤다.`);
    return `${rng.pick(['장작을 처마 밑까지 쌓았다. 곡식 자루와 절인 고기를 지하에 들였다.', '창틈을 헝겊과 진흙으로 막았다. 문 밑의 바람구멍도 막았다. 겨울이 오면 이 집은 작은 동굴이 된다.', '늙은 이웃이 올겨울은 길 거라고 했다. 장작을 한 수레 더 샀다.'])} 은화 ${cost}닢.${bread(g) >= 1.4 ? ' 빵값이 올라 준비도 비쌌다.' : ''}`;
  },
});

// 겨울을 버틴다: 준비가 없으면 깎이고, 혹한이 들면 더 깎인다
HOOKS.afterMonth.push((g, rng) => {
  const N = g.nature;
  if (!N || g.over || !isAdult(g) || L(g).travel) return;
  const m = g.date.month;
  const cold = activeAt(g, here(g)).some((d) => d.kind === 'winter');
  if (!(m === 12 || m <= 2) && !cold) return;
  // 제 집이나 길바닥에서 겨울을 나는 사람만 장작을 걱정한다 (여관·셋방·병영·부모 집은 남이 불을 땐다). 혹한은 누구에게나 온다.
  const exposed = ['own', 'street', 'rent'].includes(L(g).home);
  if (!exposed && !cold) return;
  const ready = N.ready === winterOf(g) || L(g).home === 'family' || L(g).home === 'barracks';
  const p = g.player;
  if (ready) { p.stress = Math.max(0, p.stress - (cold ? 0 : 1)); return; }
  p.stress = Math.min(100, p.stress + (cold ? (exposed ? 4 : 2) : 2));
  p.fatigue = Math.min(100, p.fatigue + (cold ? (exposed ? 6 : 3) : 3));
  if (exposed && (cold || regionCold(g) >= 2) && makeRng({ s: ((g.rngState?.s ?? 3) ^ (g.date.year * 12 + g.date.month) * 977) | 0 }).chance(cold ? 0.12 : 0.04) && !p.injuries.some((i) => i.name === '동상 입은 발가락')) p.injuries.push({ name: '동상 입은 발가락', months: 2 });
});

void activeAt;
