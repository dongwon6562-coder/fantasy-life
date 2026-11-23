// 산적과 엮이는 삶: 길목의 통행세, 털림, 잡혀가기와 몸값, 식구가 잡혀가는 일, 무리에 드는 일, 길목 털기, 두목 되기,
// 토벌대가 올 때, 사면 방, 산적과 마을의 거래, 의적의 곡식, 현상금 사냥. 새 행동은 뜻 있는 형편에서만 보인다.
import { HOOKS } from '../hooks.js';
import { ACTIONS } from '../actions.js';
import { gainStat, gainSkill } from '../game.js';
import { EVENTS, age, here, onRoad, money, spend, spendFamily, stress, check, injure, living, isFamily, alive, byId } from '../events/core.js';
import { L } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { J } from '../narrative/text.js';
import { addNotoriety, isJailed, jail } from '../crime.js';
import { heirsOf } from '../heir.js';
import { OS, LAIRS, liveBands, bandAt, bandById, myBand, bandOnRoad, endBand, bounty, lairName, olog, placeName, clamp, mi, chiefLine } from './state.js';
import { purge, newChief } from './world.js';

const M = (g) => OS(g).me;
const busy = (g) => g.over || g.bondage?.slave || isJailed(g) || g.army?.campaign || g.army?.captive || !!L(g).heirPending;
const grown = (g) => age(g) >= 16 && !busy(g);
const settled = (g) => grown(g) && !onRoad(g);
const st = (g, k) => g.player.stats[k] ?? 0;
const sk = (g, k) => g.player.skills[k] ?? 0;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const roadBand = (g) => { const t = L(g).travel; return t && !t.sea && !t.forced ? bandOnRoad(g, t.from, t.to) : null; };
const fightPow = (b) => 12 + b.men * 1.1;
const won = (g, rng, b, bonus = 0) => check(rng, playerPower(g) + bonus, fightPow(b));
const nearBand = (g) => bandAt(g, here(g));
const desperate = (g) => money(g) < 10 || (L(g).notoriety ?? 0) >= 20 || !!g.revolt?.hidden || (g.player.debt ?? 0) > 0;
const kinHere = (g) => [...g.player.familyIds.map((id) => byId(g, id)), ...heirsOf(g)].filter((p) => alive(p) && !p.isPlayer && (p.place ?? 'ern') === here(g));
const share = (b) => Math.max(2, Math.round(2 + b.men / 6));

// 매달: 무리에 있으면 산채의 몫. 산채를 오래 떠나 있으면 무리가 잊는다
HOOKS.afterMonth.push((g) => {
  if (!g.outlaws || g.over || !g.life) return;
  const me = M(g), b = myBand(g);
  if (me.band && !b) { me.band = null; me.role = null; return; }
  if (!b) return;
  if (!g.life.travel && g.life.place === b.lair) {
    me.awayAt = mi(g);
    const cut = me.role === 'chief' ? Math.min(12, Math.round(b.loot * 0.1)) : Math.min(3, Math.round(b.loot * 0.02));
    if (cut > 0) { g.player.money += cut; b.loot = Math.max(0, b.loot - cut); }
  } else if (mi(g) - me.awayAt > 12) {
    olog(g, `${J(b.name, '은/는')} 산채를 떠난 나를 잊었다.`);
    if (me.role === 'chief') newChief(g, b, { pick: (a) => a[(mi(g) + b.id) % a.length] }, 'gone');
    me.band = null; me.role = null; me.left += 1;
  }
});

EVENTS.push(
  // ---------- 길목의 통행세 ----------
  {
    id: 'out_toll', road: true, cooldown: 6,
    cond: (g) => { const b = roadBand(g); return grown(g) && !!b && b.toll && M(g).band !== b.id; },
    chance: () => 0.35, weight: 50,
    prepare: (g) => { const b = roadBand(g); return { id: b.id, fee: Math.round(3 + b.men / 8) }; },
    title: '통나무 걸친 길목',
    text: (g, c) => { const b = bandById(g, c.id); return `${lairName(b)} 아래 길목에 통나무가 가로질러 있다. 활 든 사내 셋이 바위에 걸터앉아 손짓한다. "${b.name} 길이다. 지나가려면 은화 ${c.fee}닢." 옆 나무에 지난달 버틴 자의 외투가 걸려 있다.${b.noble ? ' 맨발의 행상 하나는 그냥 보내 주는 걸 보았다.' : ''}`; },
    choices: [
      { label: '통행세를 낸다', run: (g, rng, c) => { spend(g, Math.min(money(g), c.fee)); M(g).tolls += 1; return '은화를 건넸다. 사내 하나가 이로 깨물어 보고 통나무를 들어 주었다. 성문 통행세보다 비싸지도 않다는 게 이상하게 서글펐다.'; } },
      { label: '밀고 지나간다', run: (g, rng, c) => { const b = bandById(g, c.id); if (b && won(g, rng, b, 15)) { gainSkill(g, 'sword', 0.5); renown(g, 1); b.fame = clamp(b.fame - 1, 0, 100); return '첫 사내의 활을 쳐내자 나머지 둘이 숲으로 물러났다. 등 뒤로 욕지거리가 날아왔다. 다음에 이 길로 올 땐 혼자 오지 말아야겠다.'; } injure(g, '화살이 스친 팔', 1); spend(g, Math.min(money(g), c.fee * 3)); stress(g, 5); return '통나무를 넘기도 전에 화살이 팔을 스쳤다. 결국 세 곱을 내고서야 지나갔다. 사내들은 웃으며 외투 걸린 나무를 가리켰다.'; } },
      { label: (g, c) => (bandById(g, c.id)?.noble ? '빈손이라고 주머니를 뒤집어 보인다' : '돌아서 다른 길로 간다'), run: (g, rng, c) => { const b = bandById(g, c.id); if (b?.noble && money(g) < 30) return '주머니를 뒤집어 보였다. 사내가 한참 보다가 통나무를 들어 주었다. "가난한 자에게선 안 받는다. 두목 말씀이다."'; if (L(g).travel) L(g).travel.left += 1; return '말머리를 돌려 산을 크게 돌았다. 하루가 더 걸렸다.'; } },
    ],
  },
  // ---------- 털림, 그리고 잡혀가기 ----------
  {
    id: 'out_ambush', road: true, cooldown: 18,
    cond: (g) => { const b = roadBand(g); return grown(g) && !!b && M(g).band !== b.id && !M(g).captive; },
    chance: (g) => 0.06 + Math.min(0.08, money(g) / 2500), weight: 45,
    prepare: (g) => ({ id: roadBand(g).id }),
    title: '여울목의 활잡이들',
    text: (g, c) => { const b = bandById(g, c.id); return `길이 여울로 내려가는 곳에서 덤불이 갈라졌다. 얼굴을 천으로 가린 자들이 ${b.men >= 20 ? '열 명 넘게' : '대여섯'} 앞뒤를 막는다. "우리는 ${b.name}. 주머니를 내놓으면 목숨은 둔다." 우두머리가 내 신발과 옷을 훑어본다. 값을 매기는 눈이다.`; },
    choices: [
      { label: '주머니를 던져 준다', run: (g) => { const lose = Math.round(money(g) * 0.4); spend(g, lose); M(g).robbed += 1; stress(g, 4); return `은화 ${lose}닢이 든 주머니를 던졌다. 놈들은 셈도 안 하고 숲으로 사라졌다. 남은 길 내내 덤불 소리가 날 때마다 몸이 굳었다.`; } },
      { label: '칼을 뽑는다', run: (g, rng, c) => { const b = bandById(g, c.id); if (b && won(g, rng, b)) { gainSkill(g, 'sword', 0.8); renown(g, 2); b.men = Math.max(0, b.men - 1); return '첫 놈이 쓰러지자 나머지가 주춤했다. 우두머리가 휘파람을 불었고, 놈들은 왔을 때처럼 소리 없이 덤불로 빠졌다. 칼에 묻은 피를 여울에 씻었다.'; } injure(g, '산적 몽둥이에 맞은 머리', 2); M(g).robbed += 1; if (money(g) >= 80 && rng.chance(0.6)) { const ransom = Math.round(Math.min(200, 25 + money(g) * 0.3)); M(g).captive = { band: c.id, ransom, at: mi(g) }; spend(g, Math.round(money(g) * 0.5)); return `머리에 불이 번쩍했다. 눈을 뜨니 손이 묶인 채 노새 등에 얹혀 있었다. "옷이 좋더라. 너희 집에서 얼마를 낼지 보자." ${lairName(b)} 쪽으로 가는 길이었다.`; } spend(g, Math.round(money(g) * 0.6)); return '몽둥이가 머리를 쳤다. 깨어 보니 주머니는 물론 신발까지 없었다.'; } },
      { label: '말을 몰아 내달린다', run: (g, rng) => { if (check(rng, st(g, 'agi') + st(g, 'sen') / 2, 40)) { stress(g, 3); return '말 옆구리를 걷어차고 여울을 가로질렀다. 화살 두 대가 물에 꽂혔다. 뒤돌아보지 않았다.'; } const lose = Math.round(money(g) * 0.5); spend(g, lose); injure(g, '말에서 떨어져 삔 발목', 1); M(g).robbed += 1; return `여울 돌에 말이 미끄러졌다. 놈들은 넘어진 나를 뒤져 은화 ${lose}닢을 챙기고 갔다.`; } },
    ],
  },
  {
    id: 'out_captive', road: true, urgent: true,
    cond: (g) => !!M(g).captive && !g.over,
    chance: () => 1, weight: 96,
    prepare: (g) => ({ ...M(g).captive }),
    title: '산채의 볼모',
    text: (g, c) => { const b = bandById(g, c.band); return `${b ? lairName(b) : '숲속'} 산채, 짐승 우리 같은 움막에 묶여 있다. ${b ? J(b.chief, '이/가') : '두목이'} 쪼그려 앉아 칼끝으로 땅에 숫자를 쓴다. "은화 ${c.ransom}닢. 너희 집에 사람을 보냈다. 보름 안에 안 오면…" 끝말은 하지 않았다.`; },
    choices: [
      { label: '집에서 몸값을 보내기를 기다린다', run: (g, rng, c) => { const me = M(g); me.captive = null; const fromFam = Math.min(g.player.familyMoney ?? 0, c.ransom); spendFamily(g, fromFam); spend(g, Math.min(money(g), c.ransom - fromFam)); me.ransom += c.ransom; const b = bandById(g, c.band); if (b) b.loot += c.ransom; stress(g, 10); olog(g, `산적에게 잡혀 몸값 ${c.ransom}닢을 치렀다.`); return fromFam >= c.ransom * 0.6 ? '열흘째 되던 날, 집안 사람이 은화 자루를 지고 산길을 올라왔다. 손목의 밧줄 자국은 한 달이 넘도록 빠지지 않았다.' : '집에 그만한 돈이 없었다. 가진 것을 다 털고, 남은 것은 빚 문서에 손도장을 찍고서야 풀려났다.'; } },
      { label: '밤에 밧줄을 풀고 달아난다', run: (g, rng, c) => { const me = M(g); me.captive = null; if (check(rng, st(g, 'agi') + st(g, 'sen'), 70)) { gainStat(g, 'agi', 0.6); renown(g, 1); return '움막 기둥에 밧줄을 문지르기 사흘. 비 오는 밤에 풀렸다. 개울을 따라 밤새 내려가 아침에 처음 보는 마을에 닿았다.'; } injure(g, '붙잡혀 맞은 등', 2); spendFamily(g, Math.min(g.player.familyMoney ?? 0, c.ransom)); me.ransom += c.ransom; stress(g, 12); return '개울가에서 개들에게 따라잡혔다. 그날 밤 내내 맞았다. 몸값은 결국 집에서 치렀다.'; } },
      { label: '두목과 말을 튼다', run: (g, rng, c) => { const me = M(g), b = bandById(g, c.band); me.captive = null; if (b && check(rng, st(g, 'cha') + st(g, 'wil') / 2, 45)) { me.band = b.id; me.role = 'man'; me.joined += 1; me.awayAt = mi(g); L(g).place = b.lair; L(g).travel = null; addNotoriety(g, 8); olog(g, `볼모로 잡혀 갔다가 ${b.name}에 들었다.`); return `사흘 밤을 모닥불 앞에서 떠들었다. 넷째 날 ${J(b.chief, '이/가')} 밧줄을 끊고 칼 한 자루를 던져 주었다. "몸값보다 네 입이 더 쓸모 있겠다."`; } spendFamily(g, Math.min(g.player.familyMoney ?? 0, c.ransom)); me.ransom += c.ransom; return '두목은 내 말을 듣다가 하품을 했다. 몸값은 집에서 치렀다.'; } },
    ],
  },
  // ---------- 식구가 잡혀가다 ----------
  {
    id: 'out_kin_taken', cooldown: 60,
    cond: (g) => { const b = nearBand(g); return settled(g) && !!b && b.men >= 10 && M(g).band !== b.id && kinHere(g).length > 0 && (money(g) + (g.player.familyMoney ?? 0)) >= 30; },
    chance: () => 0.02, weight: 40,
    prepare: (g, rng) => { const b = nearBand(g), k = rng.pick(kinHere(g)); return { id: b.id, kid: k.id, ransom: Math.round(20 + (money(g) + (g.player.familyMoney ?? 0)) * 0.15) }; },
    title: '문틈의 쪽지',
    text: (g, c) => { const b = bandById(g, c.id), k = byId(g, c.kid); return `${J(k?.name ?? '식구', '이/가')} 장에 갔다가 돌아오지 않았다. 새벽에 문틈으로 쪽지가 들어왔다. 삐뚤빼뚤한 글씨. "${J(b.name, '이/가')} 데리고 있다. 은화 ${c.ransom}닢을 ${lairName(b)} 아래 장승 밑에. 영주한테 가면 손가락부터 보낸다."`; },
    choices: [
      { label: '몸값을 장승 밑에 둔다', run: (g, rng, c) => { const k = byId(g, c.kid), fam = Math.min(g.player.familyMoney ?? 0, c.ransom); spendFamily(g, fam); spend(g, Math.min(money(g), c.ransom - fam)); M(g).ransom += c.ransom; const b = bandById(g, c.id); if (b) b.loot += c.ransom; stress(g, 8); if (k) k.history.push({ y: g.date.year, m: g.date.month, text: '산적에게 잡혀 갔다가 몸값을 치르고 돌아왔다.' }); return `이틀 뒤 저녁, ${J(k?.name ?? '식구', '이/가')} 맨발로 마을 어귀에 나타났다. 아무 말도 하지 않았다. 한동안 밤마다 불을 켜고 잤다.`; } },
      { label: '칼을 차고 직접 데리러 간다', run: (g, rng, c) => { const b = bandById(g, c.id), k = byId(g, c.kid); if (b && won(g, rng, b, 5)) { renown(g, 3); gainSkill(g, 'sword', 1); b.men = Math.max(0, b.men - 2); b.heat = clamp(b.heat + 5, 0, 100); return `장승 밑에서 돈 가지러 온 놈을 덮쳐 산채까지 길을 대게 했다. 움막 문을 부수고 ${J(k?.name ?? '식구', '을/를')} 업고 나왔다. 뒤에서 횃불이 쫓아왔지만 숲은 내가 더 잘 알았다.`; } injure(g, '산채에서 입은 칼자국', 3); const fam = Math.min(g.player.familyMoney ?? 0, c.ransom * 2); spendFamily(g, fam); stress(g, 12); return '산채 문턱도 넘지 못하고 붙잡혔다. 나까지 볼모가 되어 집에서 몸값을 두 곱으로 치렀다.'; } },
      { label: '영주에게 알린다', run: (g, rng, c) => { const b = bandById(g, c.id), k = byId(g, c.kid); M(g).informed += 1; if (b) { b.heat = clamp(b.heat + 25, 0, 100); if (b.heat >= 50 && rng.chance(0.5)) { const r = purge(g, b, rng, () => {}); if (r !== 'held') return `${LAIRS[b.lair]?.lord ?? '영주'}의 병사들이 산채를 덮쳤다. 불타는 움막에서 ${J(k?.name ?? '식구', '이/가')} 연기에 그을린 채 걸어 나왔다.`; } } if (k) k.history.push({ y: g.date.year, m: g.date.month, text: '산적에게 잡혀 있다가 다쳐서 돌아왔다.' }); stress(g, 14); return `영주관 사람은 장부에 적기만 했다. 열흘 뒤 ${J(k?.name ?? '식구', '이/가')} 길가에 버려진 채 발견되었다. 살아는 있었다. 손가락 하나가 없었다.`; } },
    ],
  },
  // ---------- 무리에 드는 일 ----------
  {
    id: 'out_join', cooldown: 36,
    cond: (g) => { const b = nearBand(g); return settled(g) && !!b && !M(g).band && desperate(g) && age(g) <= 45; },
    chance: () => 0.04, weight: 40,
    prepare: (g) => ({ id: nearBand(g).id }),
    title: '모닥불 쪽의 손짓',
    text: (g, c) => { const b = bandById(g, c.id); return `장 끝 주막에서 낯선 사내가 술을 샀다. "${chiefLine(b)}에 사람이 모자라. 굶어 죽나 목매달려 죽나 매한가지 아니겠나. 숲에선 적어도 배는 부르다."${b.noble ? ' 그 무리는 세리 수레만 턴다는 소문이었다.' : ''}`; },
    choices: [
      { label: '숲으로 따라간다', run: (g, rng, c) => { const b = bandById(g, c.id), me = M(g); me.band = b.id; me.role = 'man'; me.joined += 1; me.awayAt = mi(g); b.men += 1; addNotoriety(g, 8); stress(g, 5); olog(g, `${b.name}에 들었다.`); return `밤길을 두 시간 걸어 ${lairName(b)} 산채에 닿았다. 모닥불 둘레에 굶주린 얼굴이 스물. ${J(b.chief, '이/가')} 내 손바닥의 굳은살을 보고 고개를 끄덕였다. 그날부터 나는 이름 대신 별명으로 불렸다.`; } },
      { label: '고개를 젓는다', run: (g) => { gainStat(g, 'wil', 0.3); return '사내는 어깨를 으쓱하고 술값을 치르고 나갔다. 그 뒤로도 굶는 밤이면 그 말이 떠올랐다.'; } },
      { label: '영주관에 일러바친다', run: (g, rng, c) => { const b = bandById(g, c.id), me = M(g); me.informed += 1; if (b) b.heat = clamp(b.heat + 15, 0, 100); g.player.money += 5; if (rng.chance(0.3)) { stress(g, 8); return '영주관에서 은화 다섯 닢을 받았다. 사흘 뒤 집 문에 화살 하나가 꽂혀 있었다. 촉에 붉은 천이 감겨 있었다.'; } return '영주관 서기는 은화 다섯 닢을 내밀고 이름을 받아 적었다. 그 사내는 다시 주막에 나타나지 않았다.'; } },
    ],
  },
  // ---------- 두목 되기 ----------
  {
    id: 'out_chief', cooldown: 36,
    cond: (g) => { const b = myBand(g), me = M(g); return settled(g) && !!b && me.role === 'man' && here(g) === b.lair && mi(g) - (b.chiefSince ?? 0) > 6 && (me.rides >= 4) && (sk(g, 'sword') >= 25 || st(g, 'cha') >= 40); },
    chance: () => 0.06, weight: 45,
    prepare: (g) => ({ id: myBand(g).id }),
    title: '모닥불 앞의 수군거림',
    text: (g, c) => { const b = bandById(g, c.id); return `${J(b.chief, '이/가')} 지난 털이에서 몫을 혼자 너무 챙겼다. 모닥불 건너편에서 사내들이 나를 본다. "자네가 앞장섰으면 그렇게 안 됐을 거야." 누가 칼자루를 슬쩍 내 쪽으로 돌려놓는다.`; },
    choices: [
      { label: '두목에게 맞선다', run: (g, rng, c) => { const b = bandById(g, c.id), me = M(g); if (b && check(rng, playerPower(g) + st(g, 'cha') / 3, 30 + b.men * 0.5)) { const old = b.chief; b.chief = g.player.name; b.chiefSince = mi(g); me.role = 'chief'; addNotoriety(g, 10); renown(g, 3); olog(g, `${J(old, '을/를')} 꺾고 ${b.name}의 두목이 되었다.`); return `모닥불 앞에서 칼을 맞댔다. ${J(old, '은/는')} 생각보다 늙어 있었다. 무릎을 꿇은 그를 산채 밖으로 내쫓았다. 그날 밤부터 사내들이 나를 두목이라 불렀다.`; } injure(g, '두목의 칼에 베인 옆구리', 3); stress(g, 8); return '칼은 내가 먼저 뽑았지만 먼저 쓰러진 것도 나였다. 두목은 침을 뱉고 살려 주었다. 다음은 없다는 눈빛으로.'; } },
      { label: '두목 곁을 지킨다', run: (g, rng, c) => { const b = bandById(g, c.id); if (b) b.fame = clamp(b.fame + 1, 0, 100); gainStat(g, 'wil', 0.3); return '칼자루를 도로 돌려놓았다. 두목은 그 일을 들었는지, 다음 털이 몫을 내게 두 배로 주었다.'; } },
    ],
  },
  // ---------- 토벌대가 온다 ----------
  {
    id: 'out_purge', urgent: true,
    cond: (g) => { const b = myBand(g); return !!b && b.purgeAt != null && !busy(g) && !onRoad(g); },
    chance: () => 1, weight: 92,
    prepare: (g) => ({ id: myBand(g).id }),
    title: '토벌대',
    text: (g, c) => { const b = bandById(g, c.id), L0 = LAIRS[b.lair]; return `망보던 아이가 숨을 헐떡이며 뛰어 들어왔다. ${L0.lord}의 깃발, 창병이 ${L0.force >= 60 ? '백은 넘는다' : '쉰 남짓'}. 사냥개도 데려왔다. 산채 사람들이 모두 ${M(g).role === 'chief' ? '나를' : J(b.chief, '을/를')} 본다.`; },
    choices: [
      { label: '숲길에 매복해 맞선다', run: (g, rng, c) => { const b = bandById(g, c.id); b.purgeAt = null; const r = purge(g, b, rng, () => {}, { troops: (LAIRS[b.lair].force * 0.6 + rng.int(0, 30)) - playerPower(g) * 0.3 }); if (r === 'held') { renown(g, 4); gainSkill(g, 'sword', 1.2); return '좁은 골짜기에서 돌을 굴리고 화살을 퍼부었다. 깃발이 뒤로 넘어갔다. 그날 밤 산채에서는 처음으로 고기를 굽고 노래를 불렀다.'; } if (r === 'broken') { injure(g, '창에 찔린 허벅지', 3); return '버티지 못했다. 반이 넘게 쓰러지고, 남은 자들과 더 깊은 숲으로 기어 들어갔다.'; } injure(g, '창에 찔린 허벅지', 3); addNotoriety(g, 10); if (rng.chance(0.5)) { jail(g, 12); return '산채가 불탔다. 나는 연기 속에서 붙잡혀 사슬에 묶여 끌려 내려갔다.'; } return '산채가 불탔다. 나는 개울 속에 숨어 숨을 죽였다. 밤이 되어 기어 나오니 아무도 남아 있지 않았다.'; } },
      { label: '무리를 흩고 깊은 숲으로 물러난다', run: (g, rng, c) => { const b = bandById(g, c.id); b.purgeAt = null; b.men = Math.max(3, Math.round(b.men * 0.6)); b.heat = 30; b.toll = false; stress(g, 6); return '산채를 비우고 사흘 밤을 걸어 늪 너머 바위굴로 옮겼다. 토벌대는 빈 움막을 불태우고 돌아갔다. 떠난 사람도 많았다.'; } },
      { label: '토벌대 대장과 몰래 거래한다', run: (g, rng, c) => { const b = bandById(g, c.id), me = M(g); b.purgeAt = null; me.informed += 1; L(g).notoriety = Math.max(0, (L(g).notoriety ?? 0) - 15); olog(g, `${J(b.name, '을/를')} 토벌대에 팔고 사면받았다.`); purge(g, b, rng, () => {}, { troops: 999 }); if (!b.gone) endBand(g, b, 'betrayed'); me.band = null; me.role = null; me.left += 1; stress(g, 10); return '샛길을 그려 주는 대가로 내 이름은 명단에서 빠졌다. 산을 내려오는 길에 교수대 셋을 지났다. 고개를 들지 못했다.'; } },
    ],
  },
  // ---------- 사면 방 ----------
  {
    id: 'out_amnesty', cooldown: 48,
    cond: (g) => { const b = myBand(g); return settled(g) && !!b && (!!g.realm?.balhart?.war || mi(g) - (b.since ?? 0) > 36); },
    chance: (g) => (g.realm?.balhart?.war ? 0.06 : 0.02), weight: 40,
    prepare: (g) => ({ id: myBand(g).id, war: !!g.realm?.balhart?.war }),
    title: '장터의 사면 방',
    text: (g, c) => (c.war ? '장터 기둥에 왕실 문장이 찍힌 방이 붙었다. "산과 숲에 든 자, 무기를 들고 내려와 발하르트 전선에 서면 지난 죄를 묻지 않는다." 그 아래 누가 숯으로 "화살받이"라고 써 놓았다.' : '장터 기둥에 방이 붙었다. "칼을 버리고 내려오는 자는 매 열 대로 죄를 씻는다. 두목의 목을 가져오는 자에겐 상금을." 무리 안이 조용해졌다.'),
    choices: [
      { label: (g, c) => (c.war ? '내려가 군에 든다' : '칼을 버리고 내려간다'), run: (g, rng, c) => { const me = M(g), b = bandById(g, c.id); if (b && me.role === 'chief') newChief(g, b, rng, 'gone'); me.band = null; me.role = null; me.left += 1; L(g).notoriety = Math.max(0, (L(g).notoriety ?? 0) - 12); stress(g, 4); olog(g, '사면 방을 보고 산에서 내려왔다.'); return c.war ? '창 한 자루와 낡은 갑옷을 받았다. 죄는 장부에서 지워졌다. 대신 이름 옆에 "전선"이라는 두 글자가 적혔다.' : '매 열 대를 맞았다. 등이 터졌지만 이름은 장부에서 지워졌다. 산 쪽을 돌아보지 않으려 애썼다.'; } },
      { label: '숲에 남는다', run: (g) => { gainStat(g, 'wil', 0.2); return '방을 찢어 모닥불 불쏘시개로 썼다. 숲 밖에 돌아갈 자리가 있었다면 애초에 들어오지 않았다.'; } },
    ],
  },
  // ---------- 산적과 마을의 거래 ----------
  {
    id: 'out_village_deal', cooldown: 48,
    cond: (g) => { const b = nearBand(g); return settled(g) && !!b && !b.deal && b.men >= 10 && M(g).band !== b.id; },
    chance: () => 0.03, weight: 35,
    prepare: (g) => ({ id: nearBand(g).id }),
    title: '마을 회관의 밤 회의',
    text: (g, c) => { const b = bandById(g, c.id); return `밤에 마을 어른들이 회관에 모였다. ${b.name}에서 사람이 왔다고 한다. "철마다 곡식 몇 자루와 소금을 산채로 올려 보내면, 다른 무리도 세리도 이 마을엔 손대지 못하게 하겠다." 누군가 영주관에 알려야 한다고 했고, 누군가 영주관이 언제 우리를 지켜 준 적 있냐고 했다. 다들 나를 본다.`; },
    choices: [
      { label: '거래하자고 한다', run: (g, rng, c) => { const b = bandById(g, c.id); b.deal = true; spend(g, Math.min(money(g), 3)); olog(g, `${placeName(b.lair)} 사람들이 ${J(b.name, '과/와')} 거래를 텄다.`); return '곡식 자루가 철마다 수레에 실려 숲으로 올라갔다. 그해 겨울 세리가 마을 어귀에서 말머리를 돌렸다는 이야기가 돌았다. 아무도 이유를 묻지 않았다.'; } },
      { label: '거절하자고 한다', run: (g, rng, c) => { const b = bandById(g, c.id); if (rng.chance(0.5)) { spend(g, Math.min(money(g), 8)); stress(g, 6); return '거절한 지 보름 뒤, 마을 곳간 하나가 불탔다. 범인은 아무도 보지 못했다.'; } gainStat(g, 'wil', 0.3); return `${J(b.name, '은/는')} 다시 사람을 보내지 않았다. 마을 사람들은 밤에 대문을 두 번씩 걸었다.`; } },
      { label: '영주관에 알리자고 한다', run: (g, rng, c) => { const b = bandById(g, c.id); b.heat = clamp(b.heat + 20, 0, 100); M(g).informed += 1; return '영주관 사람이 와서 받아 적고 갔다. 마을 사람 몇은 나를 보는 눈이 달라졌다. 고마운 눈인지 두려운 눈인지 알 수 없었다.'; } },
    ],
  },
  // ---------- 의적의 곡식 ----------
  {
    id: 'out_robin_gift', cooldown: 36,
    cond: (g) => { const b = nearBand(g); return settled(g) && !!b && b.noble && !!g.world?.famine && M(g).band !== b.id; },
    chance: () => 0.08, weight: 40,
    prepare: (g) => ({ id: nearBand(g).id }),
    title: '문 앞의 곡식 자루',
    text: (g, c) => { const b = bandById(g, c.id); return `흉년 겨울 아침, 문을 여니 곡식 자루 하나가 놓여 있다. 자루에 영주관 세창고 낙인이 찍혀 있다. 이웃집 문 앞에도, 그 옆집에도. 아이들이 ${J(b.chief, '이/가')} 다녀갔다며 노래를 부른다.`; },
    choices: [
      { label: '고맙게 받는다', run: (g) => { g.player.money += 4; gainStat(g, 'cha', 0.1); return '그 겨울 우리 집은 굶지 않았다. 세리가 낙인 찍힌 자루를 찾으러 다녔지만 마을 사람 누구도 입을 열지 않았다.'; } },
      { label: '더 굶는 집에 넘긴다', run: (g) => { M(g).gave += 1; gainStat(g, 'cha', 0.4); renown(g, 1); return '자루를 지고 마을 끝 과부 집에 갔다. 과부는 자루를 보고 울었다. 누가 보냈는지는 묻지 않았다.'; } },
      { label: '영주관에 가져간다', run: (g, rng, c) => { const b = bandById(g, c.id); b.heat = clamp(b.heat + 10, 0, 100); M(g).informed += 1; g.player.money += 6; stress(g, 4); return '영주관 서기가 자루를 받고 은화 여섯 닢을 내주었다. 돌아오는 길, 아무도 내게 인사하지 않았다.'; } },
    ],
  },
);

/* ---------- 행동 ---------- */
ACTIONS.push(
  {
    id: 'out_ride', name: '길목에 나간다', icon: 'sword',
    desc: '무리와 함께 길목에 숨어 지나가는 짐마차를 턴다. 몫은 크지만 이름이 나고 목에 값이 붙는다.',
    available: (g) => { const b = myBand(g); return settled(g) && !!b && here(g) === b.lair; },
    run(g, rng) {
      const b = myBand(g), me = M(g);
      const prey = b.noble ? rng.pick(['세리 수레', '수도원 십일조 짐마차', '영주관 곡식 수레']) : rng.pick(['소금 상단', '포도주 짐마차', '양털 상인', '순례자 일행', '대장간 쇳덩이 수레']);
      me.rides += 1; b.fame = clamp(b.fame + 1, 0, 100); b.heat = clamp(b.heat + 2, 0, 100);
      addNotoriety(g, 2);
      if (check(rng, playerPower(g) + b.men * 0.6, 35)) {
        const cut = share(b) * (me.role === 'chief' ? 2 : 1);
        g.player.money += cut; b.loot += cut * 2; gainSkill(g, 'sword', 0.4);
        return `새벽 안개 속에서 ${J(prey, '을/를')} 세웠다. 호위 둘은 칼도 뽑기 전에 달아났다. 내 몫은 은화 ${cut}닢.${b.noble ? ' 나머지 반은 굶는 마을로 보냈다.' : ''} 마부의 떨던 손이 오래 눈에 남았다.`;
      }
      injure(g, '호위의 창에 긁힌 어깨', 2);
      return `${J(prey, '을/를')} 덮쳤지만 짐 속에서 석궁 든 호위들이 튀어나왔다. 한 사람을 잃고 빈손으로 숲에 돌아왔다.`;
    },
  },
  {
    id: 'out_give', name: '털어 온 것을 나눠 준다', icon: 'coin',
    desc: '산채 곳간을 열어 굶는 마을에 나눠 준다. 의적이라는 이름이 붙고 마을이 무리를 숨겨 준다.',
    available: (g) => { const b = myBand(g); return settled(g) && !!b && M(g).role === 'chief' && here(g) === b.lair && b.loot >= 20; },
    run(g) {
      const b = myBand(g), me = M(g), n = Math.round(b.loot * 0.6);
      b.loot -= n; me.gave += 1; b.heat = clamp(b.heat - 6, 0, 100); b.fame = clamp(b.fame + 4, 0, 100);
      if (!b.noble && me.gave >= 2) { b.noble = true; olog(g, `${J(b.name, '이/가')} 의적이라 불리기 시작했다.`); }
      if (g.revolt?.anger && Number.isFinite(g.revolt.anger[b.lair])) g.revolt.anger[b.lair] = clamp(g.revolt.anger[b.lair] - 3, 0, 100);
      gainStat(g, 'cha', 0.5); renown(g, 2);
      return `산채 곳간에서 은화 ${n}닢어치를 꺼내 밤새 마을 문간마다 두고 왔다. ${b.noble ? '아이들이 우리 노래를 부른다.' : '사람들은 아직 우리를 믿지 않는다. 그래도 문을 닫는 소리가 조금 덜 크다.'}`;
    },
  },
  {
    id: 'out_lie_low', name: '산채가 숨죽인다', icon: 'rest',
    desc: '한동안 길목에 나가지 않고 통행세 받던 통나무도 치운다. 영주의 눈이 식지만 떠나는 사람도 있다.',
    available: (g) => { const b = myBand(g); return settled(g) && !!b && M(g).role === 'chief' && here(g) === b.lair && b.heat >= 30; },
    run(g) {
      const b = myBand(g);
      b.heat = clamp(b.heat - 15, 0, 100); b.toll = false; b.men = Math.max(3, Math.round(b.men * 0.9));
      return '통나무를 거두고 망루 불을 껐다. 한 달 내내 사냥만 했다. 영주관 순찰이 두 번 산 밑을 지나갔다가 그냥 돌아갔다. 지루하다며 떠난 자가 둘.';
    },
  },
  {
    id: 'out_hunt', name: '현상금 걸린 두목을 쫓는다', icon: 'sword',
    desc: '장터 기둥에 붙은 방의 두목을 잡으러 숲에 든다. 이기면 상금, 지면 다친다.',
    available: (g) => { const b = nearBand(g); return settled(g) && age(g) >= 18 && !!b && b.heat >= 40 && M(g).band !== b.id && playerPower(g) >= 30 && mi(g) - M(g).huntAt >= 6; },
    run(g, rng) {
      const b = nearBand(g), me = M(g), pay = bounty(b);
      me.huntAt = mi(g);
      if (check(rng, playerPower(g), 25 + b.men * 0.8)) {
        const chief = b.chief;
        g.player.money += pay; me.hunted += 1; renown(g, 4); gainSkill(g, 'sword', 1);
        olog(g, `${J(chief, '을/를')} 잡아 현상금 ${pay}닢을 받았다.`);
        if (b.men < 15 || rng.chance(0.4)) endBand(g, b, 'hunted'); else newChief(g, b, rng, 'hunted');
        return `사흘 동안 발자국을 따라가 개울가 바위굴에서 ${J(chief, '을/를')} 찾았다. 짧은 싸움이었다. 영주관 마당에서 상금 은화 ${pay}닢을 받았다. 서기는 머릿수를 세듯 무심하게 장부에 줄을 그었다.`;
      }
      injure(g, '산적 화살이 박혔던 다리', 3); stress(g, 6);
      return `${lairName(b)}에 닿기도 전에 함정 구덩이에 빠졌다. 위에서 웃음소리가 났다. 다리에 화살 하나를 맞고서야 기어 나왔다.`;
    },
  },
);
