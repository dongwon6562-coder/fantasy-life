// 마족과 얽히는 일: 국경을 넘는 습격, 말이 통하는 마족과의 거래·휴전·배신, 마족 피가 섞여 숨어 사는 사람,
// 얼음 해협 너머 마족 땅으로의 길, 마신교와 마왕들의 서로 다른 셈. 새 행동은 뜻 있는 형편에서만.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { EVENTS, check, injure } from '../events/core.js';
import { J } from '../narrative/text.js';
import { playerAge } from '../game.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { isJailed, addNotoriety } from '../crime.js';
import { POWER_BONUS, playerPower } from '../adventure/combat.js';
import { deed } from '../repute/index.js';
import { PLACES } from '../places.js';
import { myOrderId, addMerit } from '../order/core.js';
import { SS } from '../seal/state.js';
import {
  DM, LORDS, NORTH, PORTS, DESTS, DEST_IDS, CONTACT_NAMES, clamp, mi, here, placeName, dlog, demonRng,
} from './state.js';

export const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g) && !g.bondage?.slave && !g.over && !g.explore?.exp && !g.army?.campaign && !g.army?.captive;
const st = (g, k) => g.player.stats[k] ?? 0;
const inNorth = (g) => NORTH.includes(here(g));
const realmOf = (pl) => PLACES[pl]?.realm ?? 'leonia';
const pious = (pl) => ['holy'].includes(realmOf(pl)) || ['leocast', 'solaris', 'verden', 'harfen'].includes(pl);
const C = (g) => DM(g).contact;
const contactOk = (g) => !!C(g) && !C(g).gone;
const cname = (g) => C(g)?.name ?? '회색 망토';

/* ---------- 국경을 넘는 습격 ---------- */
EVENTS.push({
  id: 'demon_raid', cooldown: 8, weight: 5, chance: (g) => Math.min(0.6, DM(g).raid / 120),
  cond: (g) => free(g) && inNorth(g) && DM(g).raid >= 40 && !DM(g).truce,
  prepare: (g, rng) => ({ n: rng.int(6, 20), what: rng.pick(['바깥 마을 방앗간', '해협 쪽 어부 마을', '고개 아래 목장', '성벽 밖 장터']) }),
  title: '해협을 건너온 것들',
  text: (g, c) => `새벽, 경보종이 미친 듯이 울렸다. ${J(c.what, '이/가')} 불탄다. 검은 곡도를 든 마족 ${c.n}여가 사람들을 밧줄에 엮어 해협 쪽으로 끌고 간다. 앞장선 것은 이마에 쇠고리를 박은 백인장이다. 사람 말로 숫자를 세고 있다.`,
  choices: [
    { label: '칼을 들고 따라나선다', run: (g, rng, c) => {
      const D = DM(g); tired(g, 30); D.me.raids += 1;
      const pow = playerPower(g) + rng.int(-20, 20);
      if (pow >= 55 + D.raid / 3) {
        D.raid = clamp(D.raid - 6, 0, 100);
        deed(g, 'brave', 3, null, here(g)); L(g).renown = (L(g).renown ?? 0) + 3;
        if (myOrderId(g) === 'march') addMerit(g, 10);
        dlog(g, `${placeName(here(g))}: 습격대를 막았다.`);
        return `얼음 위에서 따라잡았다. 백인장은 칼을 맞고도 숫자 세기를 멈추지 않았다. 마지막 숫자를 말하고 쓰러졌다. 밧줄에 엮인 사람 열하나를 데리고 돌아왔다. 둘은 돌아오는 길에 죽었다.`;
      }
      injure(g, rng.pick(['검은 곡도에 베인 옆구리', '얼음 위에서 짓밟힌 다리', '마족 손톱에 찢긴 얼굴']), 3); stress(g, 10);
      return '따라잡았지만 그뿐이었다. 백인장이 나를 내려다보며 무언가 말했다. 웃음 같았다. 정신이 들었을 때 얼음 위에는 피와 밧줄 토막만 남아 있었다.';
    } },
    { label: '사람들을 성벽 안으로 들인다', run: (g) => { deed(g, 'kind', 2, null, here(g)); stress(g, 6); tired(g, 15); return '문을 지키며 도망쳐 오는 사람들을 들였다. 문을 닫을 때 바깥에 아직 사람이 있었다. 닫으라는 명령이 먼저였다.'; } },
    { label: '숨는다', run: (g) => { stress(g, 12); return '지하 창고에 숨었다. 머리 위로 발소리가 오갔다. 사람 발소리보다 무거웠다. 나와 보니 이웃집 하나가 비어 있었다.'; } },
  ],
});

/* ---------- 말이 통하는 마족 ---------- */
EVENTS.push({
  id: 'demon_contact', cooldown: 60, weight: 3, chance: () => 0.15,
  cond: (g) => free(g) && PORTS.includes(here(g)) && !C(g) && playerAge(g) >= 18,
  prepare: (g, rng) => ({ name: rng.pick(CONTACT_NAMES) }),
  title: '회색 망토',
  text: (g, c) => `부두 끝 창고 그늘에서 회색 망토가 나를 불렀다. 두건 아래 얼굴은 잿빛이고, 이마 양쪽에 뿔을 갈아 낸 자국이 있다. 사람 말을 오래된 책처럼 또박또박 한다. "내 이름은 ${c.name}. 황혼의 땅에서 왔소. 당신들 쪽 사람 하나가 필요하오. 물건을 사고팔 사람. 값은 마석으로 치르겠소."`,
  choices: [
    { label: '이야기를 듣는다', run: (g, rng, c) => { DM(g).contact = { name: c.name, trust: 20, met: mi(g), deals: 0, gone: false }; dlog(g, `${c.name}: 황혼의 마족을 만났다.`); return `${J(c.name, '은/는')} 마석 한 알을 내 손바닥에 놓았다. 차갑다. "가르베스의 놈들과 우리를 같은 것으로 보지 마시오. 그들은 굶주렸고, 우리는 셈을 하오." 다음 달 같은 그늘에서 보자고 했다.`; } },
    { label: '경비대에 알린다', run: (g, rng, c) => { DM(g).me.reported += 1; deed(g, 'loyal', 2, null, here(g)); L(g).renown = (L(g).renown ?? 0) + 2; return `경비대가 창고를 에워쌌다. 안에는 회색 망토 하나만 걸려 있었다. 망토 안쪽에 사람 말로 쓴 쪽지가 꽂혀 있었다. "셈이 틀렸군. — ${c.name}"`; } },
    { label: '칼을 뽑는다', run: (g, rng, c) => { if (playerPower(g) + rng.int(-15, 15) >= 60) { L(g).renown = (L(g).renown ?? 0) + 3; return `${J(c.name, '은/는')} 피하지 않았다. 칼이 가슴에 박히자 내 손목을 잡고 말했다. "엘리노어님께 전하리다. 사람은 역시 셈을 못 한다고." 피는 검었고, 사람 피처럼 따뜻했다.`; } injure(g, '잿빛 손에 꺾인 손목', 2); return `칼끝이 닿기 전에 손목이 꺾였다. ${J(c.name, '은/는')} 칼을 바닥에 내려놓고 그늘 속으로 물러났다. 죽이려면 죽일 수 있었다는 듯이.`; } },
  ],
});
const tradeable = (g) => contactOk(g) && PORTS.includes(here(g)) && mi(g) - DM(g).tradeAt >= 3;
ACTIONS.push({
  id: 'demon_trade', name: '회색 망토와 거래한다', icon: 'coin',
  desc: '황혼의 마족과 몰래 물건을 바꾼다. 소금·쇠못·책을 주고 마석을 받는다. 들키면 교단이 가만두지 않는다.',
  available: (g) => free(g) && tradeable(g) && g.player.money >= 30,
  run(g, rng) {
    const D = DM(g), c = C(g);
    D.tradeAt = mi(g); g.player.money -= 30; tired(g, 10);
    c.trust = clamp(c.trust + 6, 0, 100); c.deals += 1; D.me.trades += 1;
    const gain = rng.int(55, 95);
    g.player.money += gain;
    if (rng.chance(0.12)) { addNotoriety(g, 6); stress(g, 8); return `소금 두 짐과 마석 한 줌을 바꿨다(은화 ${gain}닢어치). 돌아오는 길에 성당 서기가 나를 오래 보았다. 손에 묻은 잿빛 가루를 소매로 문질렀다.`; }
    return rng.pick([
      `쇠못 한 상자와 마석 한 줌을 바꿨다. ${J(c.name, '은/는')} 쇠못을 하나씩 세었다. 사람보다 정확했다. (은화 ${gain}닢어치)`,
      `헌책 세 권을 넘겼다. ${J(c.name, '은/는')} 그중 한 권, 아이들 글 배우는 책을 가장 오래 넘겨 보았다. (은화 ${gain}닢어치)`,
      `소금을 넘겼다. 해협 너머에는 소금이 귀하다고 했다. 바다가 붉게 병들어서. (은화 ${gain}닢어치)`,
    ]);
  },
});

/* ---------- 휴전과 배신 ---------- */
EVENTS.push({
  id: 'demon_truce', cooldown: 48, weight: 4, chance: () => 0.4,
  cond: (g) => free(g) && here(g) === 'graubel' && contactOk(g) && C(g).trust >= 40 && DM(g).raid >= 30 && !DM(g).truce,
  title: '해협의 휴전',
  text: (g) => `${J(cname(g), '이/가')} 성벽 아래 어부 오두막으로 나를 불렀다. "가르베스의 백인장 하나가 엘리노어님께 빚이 있소. 이 년 동안 그 무리가 해협을 건너지 않게 할 수 있소. 대신 당신네 변경백이 해협 섬 하나에서 봉화를 내려야 하오. 당신이 말을 전하시오. 우리 말은 성벽을 넘지 못하니."`,
  choices: [
    { label: '변경백에게 말을 전한다', run: (g, rng) => {
      const D = DM(g);
      if (check(rng, st(g, 'cha') + (L(g).renown ?? 0) / 3 + (myOrderId(g) === 'march' ? 15 : 0), 70)) {
        D.truce = { until: mi(g) + 24, by: 'me', betray: rng.chance(0.3) };
        D.raid = clamp(D.raid - 30, 0, 100); D.me.truces += 1; C(g).trust = clamp(C(g).trust + 10, 0, 100);
        if (g.realm?.north) g.realm.north.garbes = clamp(g.realm.north.garbes - 6, 0, 100);
        dlog(g, '해협의 휴전을 이었다.');
        chron(g, `${J(g.player.name, '이/가')} 마족과 말을 섞어 해협에 이 년 휴전을 이었다는 말이 돈다. 칭찬하는 사람보다 침 뱉는 사람이 많다.`, 70);
        if (realmOf(here(g)) !== 'holy') addNotoriety(g, 3);
        return '변경백은 내 말을 끝까지 듣고 오래 말이 없었다. 그리고 봉화 하나를 내리게 했다. 그날 밤 해협 너머에서도 불 하나가 꺼졌다. 성벽 위 병사들이 나를 보는 눈이 바뀌었다. 고마운 눈은 아니었다.';
      }
      deed(g, 'loyal', -1, null, here(g)); addNotoriety(g, 5);
      return '변경백은 말을 다 듣기도 전에 손을 저었다. "마족의 말을 성벽 안으로 들고 오다니." 병사 둘이 나를 성문 밖까지 끌고 나갔다.';
    } },
    { label: '거절한다', run: (g) => { C(g).trust = clamp(C(g).trust - 8, 0, 100); return `${J(cname(g), '은/는')} 어깨를 으쓱했다. "사람들은 늘 피를 셈보다 좋아하지." 오두막을 나서며 그가 덧붙였다. "겨울에 봅시다. 해협이 얼면."`; } },
  ],
});
EVENTS.push({
  id: 'demon_betrayal', cooldown: 24, weight: 8, chance: () => 0.5,
  cond: (g) => isAdult(g) && !L(g).travel && !!DM(g).truce?.betray && mi(g) >= DM(g).truce.until - 14,
  title: '휴전 깃발 아래',
  text: () => '휴전 깃발이 걸린 해협 섬 봉화대가 하룻밤 사이에 불탔다. 지키던 병사 여섯은 목이 없었다. 얼음 위에 가르베스의 붉은 깃발이 꽂혀 있었다. 백인장의 빚은 엘리노어에게 진 것이지, 가르베스에게 진 것이 아니었다.',
  choices: [
    { label: '회색 망토를 찾아가 따진다', run: (g, rng) => {
      const D = DM(g); D.truce = null; D.raid = clamp(D.raid + 25, 0, 100); D.me.betrayed += 1;
      if (!contactOk(g)) return '부두 끝 창고는 비어 있었다. 아무도 따질 사람이 없었다.';
      const c = C(g);
      if (rng.chance(0.5)) { c.trust = clamp(c.trust - 20, 0, 100); return `${J(c.name, '은/는')} 이미 알고 있었다. "백인장이 가르베스에게 목을 바쳤소. 그는 빚보다 목숨을 셈했소." 잠시 뒤 덧붙였다. "나도 셈을 했소. 당신에게 미리 말하는 쪽이 손해라는 셈을." 그 뒤로 그를 믿지 않는다.`; }
      c.gone = true; dlog(g, `${c.name}: 사라졌다.`);
      return `창고에는 회색 망토 대신 마석 한 줌과 쪽지가 있었다. "미안하오. 황혼궁에서 나를 불렀소. 돌아오지 못할 것이오." 쪽지 끝에 사람 글자로 서툴게 이름을 적었다.`;
    } },
    { label: '성벽으로 달려간다', run: (g, rng) => { const D = DM(g); D.truce = null; D.raid = clamp(D.raid + 20, 0, 100); tired(g, 20); if (playerPower(g) + rng.int(-20, 20) >= 70) { deed(g, 'brave', 2, null, here(g)); return '성벽 위에서 밤새 활을 쏘았다. 아침에 얼음 위에 마족 시체가 열 넘게 남았다. 휴전은 끝났다. 그날부터 성벽 사람들은 나를 "휴전쟁이"라 불렀다.'; } injure(g, '성벽 아래로 떨어진 어깨', 2); return '성벽에 닿았을 때는 이미 늦었다. 휴전은 끝났다. 내 이름이 휴전과 함께 묶여 불렸다.'; } },
  ],
});

/* ---------- 마신교와 마족의 셈 ---------- */
EVENTS.push({
  id: 'demon_box', cooldown: 60, weight: 3, chance: () => 0.3,
  cond: (g) => free(g) && contactOk(g) && C(g).trust >= 60 && PORTS.includes(here(g)),
  title: '봉한 상자',
  text: (g) => `${J(cname(g), '이/가')} 손바닥만 한 쇠상자를 내밀었다. "왕도에 마신교 신도들이 모이는 집이 있소. 이걸 그 집 문간에 두고 오시오. 열지 말고." 내가 묻기도 전에 그가 말했다. "엘리노어님은 마신이 돌아오는 걸 원치 않소. 신도들은 우리를 섬긴다고 하지만, 우리에게 그들은 길을 잘못 든 먹이요. 문간에 이것이 놓이면 우리가 그 집을 안다는 뜻이 되오."`,
  choices: [
    { label: '상자를 갖다 둔다', run: (g, rng) => {
      const S = SS(g); S.cult = clamp((S.cult ?? 0) - 8, 0, 100); if ((S.spies ?? 0) > 0 && rng.chance(0.5)) S.spies -= 1;
      C(g).trust = clamp(C(g).trust + 10, 0, 100); tired(g, 15); dlog(g, '마신교 집 문간에 상자를 두었다.');
      if (rng.chance(0.25)) { addNotoriety(g, 8); return '상자를 두고 돌아서는데 골목 끝에 성당 사람이 서 있었다. 그는 나를 보았고, 상자를 보았다. 이단심문소 장부에 내 이름이 마신교와 같은 줄에 올랐을 것이다. 사흘 뒤 그 집은 비어 있었다.'; }
      return '밤에 그 집 문간에 상자를 두었다. 사흘 뒤 그 집은 비어 있었다. 신도들은 흩어졌다. 마족이 자기들을 안다는 것이 교단이 안다는 것보다 무서웠던 모양이다.';
    } },
    { label: '상자를 이단심문소에 넘긴다', run: (g) => { const D = DM(g), c = C(g); c.gone = true; D.me.reported += 1; deed(g, 'loyal', 2, null, here(g)); dlog(g, `${c.name}: 이단심문소에 넘겼다.`); return `심문관이 상자를 열었다. 안에는 마신교 신도 일곱의 이름과 그 집 지붕 그림이 있었다. 심문관은 이름들을 베껴 쓰고 나서 나를 오래 보았다. 그 뒤로 ${J(c.name, '은/는')} 다시 오지 않았다.`; } },
    { label: '열어 본다', run: (g) => { C(g).trust = clamp(C(g).trust - 25, 0, 100); stress(g, 6); return `안에는 사람 글씨로 쓴 이름 일곱과 집 지붕 그림, 그리고 마족 글로 쓴 한 줄이 있었다. 읽을 수 없었다. ${J(cname(g), '은/는')} 열린 상자를 보고 아무 말 없이 가져갔다. 셈이 하나 틀렸다는 얼굴이었다.`; } },
  ],
});

/* ---------- 마족 피가 섞여 숨어 사는 사람 ---------- */
const HIDDEN = ['방앗간 집 며느리 레나', '대장간 견습 토비', '약초꾼 노파 그레타', '성당 종지기 마틴', '세탁부 일제'];
EVENTS.push({
  id: 'demon_halfblood', cooldown: 120, weight: 2, chance: () => 0.12,
  cond: (g) => free(g) && playerAge(g) >= 16 && !inNorth(g),
  prepare: (g, rng) => ({ who: rng.pick(HIDDEN) }),
  title: '갈아 낸 자국',
  text: (g, c) => `밤늦게 우물가를 지나다 ${J(c.who, '을/를')} 보았다. 등불 아래서 쇠줄로 이마를 갈고 있었다. 갈아 낸 자리에서 검은 피가 한 줄 흘렀다. 눈이 마주쳤다. 손이 멈췄다. 반마족이다. 이 나라에서는 태어난 것만으로 죄다.`,
  choices: [
    { label: '못 본 것으로 한다', run: (g, rng, c) => { DM(g).me.sheltered += 1; deed(g, 'kind', 2, null, here(g)); return `고개를 돌리고 지나갔다. 이튿날 아침 문간에 갓 구운 빵 한 덩이가 놓여 있었다. ${J(c.who.split(' ').pop(), '은/는')} 그 뒤로도 내 눈을 똑바로 보지 못한다.`; } },
    { label: '이단심문소에 알린다', run: (g, rng, c) => { DM(g).me.reported += 1; deed(g, 'kind', -3, null, here(g)); stress(g, 10); return `심문관들이 새벽에 왔다. 끌려가는 ${c.who.split(' ').pop()}의 이마에서 갈다 만 뿔 끝이 드러났다. 이웃들은 문틈으로 보았다. 그 집 아이들도 데려갔다. 아이들 이마는 매끈했다.`; } },
    { label: '입을 다무는 값을 받는다', run: (g, rng, c) => { const coin = rng.int(15, 30); g.player.money += coin; DM(g).me.extorted += 1; addNotoriety(g, 3); deed(g, 'kind', -2, null, here(g)); return `은화 ${coin}닢. 손을 떨며 세어 주었다. 다음 달에도, 그다음 달에도 줄 것이다. 그게 나를 더 무섭게 했다.`; } },
  ],
});

/* ---------- 내 핏줄 ---------- */
const B = (g) => DM(g).blood;
EVENTS.push({
  id: 'demon_blood_shows', once: false, cooldown: 12, weight: 9, chance: () => 0.5,
  cond: (g) => B(g).line === 1 && !B(g).shown && playerAge(g) >= 13 && playerAge(g) <= 22 && !L(g).travel,
  title: '이마 양쪽',
  text: () => '몇 달째 이마 양쪽이 쑤셨다. 오늘 아침 손끝에 단단한 것이 만져졌다. 손톱만 하다. 뼈보다 차갑다. 거울 속 눈동자 가장자리가 등불 아래서 붉게 번진다. 어머니가 내 이마를 보고 손에 든 그릇을 떨어뜨렸다.',
  choices: [
    { label: '쇠줄로 갈아 낸다', run: (g) => { const b = B(g); b.shown = true; b.at = mi(g); stress(g, 15); note(g, '이마에 돋는 것을 갈아 냈다. 집안의 피에 무엇이 섞였는지 알게 되었다.'); return '밤마다 쇠줄로 갈았다. 갈 때마다 검은 피가 났다. 아프지 않은 것이 더 무서웠다. 모자를 깊이 눌러쓰기 시작했다.'; } },
    { label: '어머니에게 묻는다', run: (g) => { const b = B(g); b.shown = true; b.at = mi(g); stress(g, 10); note(g, '증조할머니가 해협을 건너온 사람이었다는 것을 알았다.'); return '어머니는 오래 망설이다 말했다. 증조할머니는 해협을 건너온 사람이었다고. 집안에서 아무도 입 밖에 내지 않았다고. "네 할아버지도 열네 살에 갈았다. 평생 모자를 썼지." 어머니가 쇠줄 하나를 꺼내 주었다. 오래 쓴 것이었다.'; } },
  ],
});
EVENTS.push({
  id: 'demon_blood_seen', cooldown: 18, weight: 5, chance: () => 0.3,
  cond: (g) => B(g).shown && B(g).known < 3 && isAdult(g) && !L(g).travel && pious(here(g)),
  prepare: (g, rng) => ({ where: rng.pick(['공중 목욕탕', '성당 고해실', '이발소', '혼례 잔치']) }),
  title: '눈길',
  text: (g, c) => `${c.where}에서 누군가 내 이마를 오래 보았다. 갈아 낸 자리가 덜 아물었다. 그는 아무 말 없이 자리를 떴다. 문 쪽으로, 성당 쪽으로.`,
  choices: [
    { label: '뒤쫓아 가 입을 막는다', run: (g, rng) => { if (check(rng, st(g, 'cha') + g.player.money / 20, 60) && g.player.money >= 20) { g.player.money -= 20; return '골목에서 따라잡아 은화 스무 닢을 쥐여 주었다. 그는 돈을 받으며 내 이마에서 눈을 떼지 못했다. 다시 올 것이다.'; } B(g).known += 1; addNotoriety(g, 4); return '놓쳤다. 이튿날 이웃들이 우물가에서 말을 멈추고 나를 보았다.'; } },
    { label: '모른 척한다', run: (g) => { B(g).known += 1; stress(g, 8); return '모른 척했다. 사흘 뒤부터 성당 앞을 지날 때마다 등 뒤가 서늘하다.'; } },
  ],
});
EVENTS.push({
  id: 'demon_hunted', cooldown: 12, weight: 9, chance: () => 0.6,
  cond: (g) => B(g).shown && B(g).known >= 2 && isAdult(g) && !L(g).travel && pious(here(g)),
  title: '문을 두드리는 소리',
  text: () => '한밤에 문을 두드리는 소리가 났다. 문틈으로 보니 횃불 셋, 회색 옷 둘. 이단심문관이다. "마족의 피를 감추고 사는 자가 이 집에 있다고 들었소."',
  choices: [
    { label: '뒷문으로 달아나 북쪽으로 간다', run: (g) => { const b = B(g); b.hunted = 12; b.known = 1; L(g).place = 'graubel'; L(g).travel = null; tired(g, 30); stress(g, 15); dlog(g, '심문관을 피해 그라우벨로 달아났다.'); return '뒷문으로 빠져 밤새 걸었다. 짐수레 밑에 숨어 북쪽으로 갔다. 그라우벨 성문 병사는 내 모자 아래를 보고도 턱짓으로 들어가라 했다. 이곳은 지난 일을 묻지 않는다.'; } },
    { label: '문을 열고 맞선다', run: (g, rng) => { const b = B(g); if (check(rng, st(g, 'wil') + st(g, 'cha') / 2 + (L(g).renown ?? 0) / 4, 85)) { b.known = 1; return '문을 열고 모자를 벗었다. 갈아 낸 자리를 보여 주며 말했다. 이 마을에서 나고 자랐다고. 이웃 몇이 횃불 뒤에서 고개를 끄덕였다. 심문관은 장부를 덮었다. 오늘은.'; } addNotoriety(g, 10); injure(g, '심문소 지하에서 얻은 상처', 4); stress(g, 20); b.known = 2; return '문을 열자마자 쇠사슬이 들어왔다. 심문소 지하에서 열흘을 보냈다. 풀려난 것은 이웃 노인 하나가 목숨을 걸고 내 편을 들어서였다. 이마의 자국은 이제 모두가 안다.'; } },
  ],
});
POWER_BONUS.push((g) => (g.demons?.blood?.shown ? 4 : 0)); // 피가 드러난 몸은 본능처럼 마력을 휘두른다

/* ---------- 해협 너머 ---------- */
const canCross = (g) => contactOk(g) || myOrderId(g) === 'march' || (L(g).renown ?? 0) >= 50 || DM(g).blood.shown;
ACTIONS.push({
  id: 'demon_voyage', name: '얼음 해협을 건넌다', icon: 'ship',
  desc: '그라우벨 어부의 배를 사서 마족의 땅으로 건너간다. 몇 달을 돌아오지 못한다. 돌아오지 못할 수도 있다.',
  available: (g) => free(g) && here(g) === 'graubel' && canCross(g) && g.player.money >= 60 && !sceneQueued(g, 'demon_crossing'),
  run(g) { queueScene(g, 'demon_crossing', {}, { first: true }); return '해협 어부들 오두막을 돌며 배를 내줄 사람을 찾았다. 대부분 문을 닫았다.'; },
});
defineScene('demon_crossing', {
  title: () => '얼음 해협',
  text: (g) => `늙은 어부 하나가 은화 예순 닢에 배를 내주겠다고 했다. "어디로 가오? 돌아올 곳은 정하고 가시오." 해협 건너편 하늘이 낮게 붉다.${contactOk(g) ? ` ${J(cname(g), '이/가')} 황혼 교역소까지 가는 표식을 쥐여 주었다.` : ''}`,
  choices: (g) => {
    if (!free(g) || here(g) !== 'graubel' || g.player.money < 60) return [];
    const out = [
      { label: `${J(DESTS.post.name, '으로/로')} 간다${contactOk(g) ? '' : ' (은화 100닢 더)'}`, key: 'post' },
      { label: `${J(DESTS.bone.name, '을/를')} 보러 간다`, key: 'bone' },
      { label: `${J(DESTS.chain.name, '으로/로')} 잡혀간 사람들을 찾으러 간다`, key: 'chain' },
    ];
    if ((SS(g).known ?? 0) >= 1 || (SS(g).stage ?? 0) >= 2) out.push({ label: `${DESTS.coffin.name}까지 간다`, key: 'coffin' });
    out.push({ label: `${J(DESTS.stone.name, '을/를')} 보러 간다`, key: 'stone' });
    out.push({ label: '돌아선다', key: 'no' });
    return out.filter((x) => x.key !== 'post' || contactOk(g) || g.player.money >= 160);
  },
  resolve(g, rng, s, key) {
    if (key === 'no') return '배 밧줄을 풀다 말고 다시 묶었다. 어부는 아무것도 묻지 않고 고개를 끄덕였다. 돌아선 사람을 많이 본 얼굴이었다.';
    const D = DM(g), dest = DESTS[key];
    g.player.money -= 60; if (key === 'post' && !contactOk(g)) g.player.money -= 100;
    D.me.trips += 1; tired(g, 40);
    let text = `${dest.text} `;
    if (key === 'post') {
      const gain = rng.int(150, 300); g.player.money += gain;
      if (contactOk(g)) C(g).trust = clamp(C(g).trust + 10, 0, 100);
      text += `가져간 소금과 쇠를 모두 마석으로 바꿨다. 돌아와 셈해 보니 은화 ${gain}닢어치다. 교역소 마족 서기가 내 이름을 장부에 적었다. 사람 이름을 쓰는 칸이 따로 있었다.`;
    } else if (key === 'bone') {
      D.me.sawBone += 1; stress(g, -4);
      text += '마을 끝 우물가에서 늙은 마족 하나가 내게 물 한 바가지를 떠 주었다. 말은 통하지 않았다. 바가지를 돌려주자 고개를 한 번 숙였다. 사람에게 하듯이. 돌아오는 배에서 오래 잠들지 못했다.';
    } else if (key === 'chain') {
      const v = playerPower(g) * 0.5 + st(g, 'agi') * 0.4 + st(g, 'sen') * 0.3 + rng.int(-15, 15);
      if (g.player.money >= 120 && rng.chance(0.5)) {
        g.player.money -= 120; const n = rng.int(2, 4); D.me.freed += n; deed(g, 'generous', 3, null, 'graubel');
        text += `마족 노예상과 흥정했다. 그는 사람 값을 머리 수가 아니라 이빨 수로 셌다. 은화 120닢에 ${n}명을 샀다. 칼텐에서 끌려온 아이 둘이 끼어 있었다. 돌아오는 배에서 아무도 말하지 않았다.`;
        chron(g, `${J(g.player.name, '이/가')} 사슬 거리에서 사람 ${n}명을 사서 데려왔다.`, 70);
      } else if (v >= 60) {
        const n = rng.int(3, 7); D.me.freed += n; L(g).renown = (L(g).renown ?? 0) + 4; deed(g, 'brave', 3, null, 'graubel');
        text += `밤에 우리 자물쇠를 부쉈다. ${n}명이 얼음 위를 달렸다. 뒤에서 북소리가 쫓아왔다. 배에 오른 사람은 ${n}명 그대로였다. 해협 한가운데서 누군가 울기 시작했다.`;
        chron(g, `${J(g.player.name, '이/가')} 사슬 거리에서 사람 ${n}명을 빼내 왔다.`, 80);
      } else {
        injure(g, rng.pick(['마족 노예상의 채찍에 터진 등', '쇠사슬에 감긴 채 끌려간 다리']), 4); stress(g, 20);
        if (rng.chance(0.05)) { g.player.injuries.push({ name: '치명상 (사슬 거리에서 붙잡힘)', months: 2, mortal: true }); text += '들켰다. 우리 안에 던져졌다. 사흘째 밤에 열이 올랐다.'; }
        else { const lost = Math.min(g.player.money, 80); g.player.money -= lost; text += `들켰다. 우리 안에 던져졌다. 가진 것을 모두 빼앗기고 나서야 몸값으로 풀려났다. 같은 우리에 있던 사람들은 나를 보내며 아무것도 부탁하지 않았다.`; }
      }
    } else if (key === 'coffin') {
      D.me.coffin += 1; const S = SS(g); S.known = Math.min(3, (S.known ?? 0) + 1);
      stress(g, 15);
      if (rng.chance(0.06)) { g.player.injuries.push({ name: '치명상 (마신의 관에서 들이마신 붉은 숨)', months: 2, mortal: true }); text += '분화구 가장자리에서 붉은빛을 너무 오래 보았다. 숨을 쉴 때마다 쇠 맛이 났다.'; }
      else text += '분화구 가장자리에 엎드려 봉인석을 보았다. 머리카락 같은 금이 셋. 아니, 넷이다. 돌아오는 내내 그 숫자를 세었다.';
      chron(g, `${J(g.player.name, '이/가')} 마신의 관까지 갔다 돌아왔다는 말이 세레니아까지 돌았다.`, 85);
    } else if (key === 'stone') {
      stress(g, 10);
      text += '비석 앞에서 해가 질 때까지 서 있었다. 비석 너머로 한 걸음 내디디려다 멈췄다. 돌아서는데 등 뒤에서 누가 내 이름을 불렀다. 돌아보지 않았다. 그 목소리가 어머니 목소리였기 때문이다.';
    }
    dlog(g, `${dest.name}에 다녀왔다.`);
    L(g).travel = { to: 'graubel', left: dest.months, from: 'graubel', sea: true, forced: true, demon: key };
    return text;
  },
});

/* ---------- 달마다: 국경의 기세, 휴전, 핏줄 ---------- */
export function demonsMonth(g) {
  if (!g.demons || g.over || !g.date) return;
  const D = DM(g), rng = demonRng(g, 3), n = g.realm?.north ?? {};
  const seal = g.realm?.seal ?? 100;
  const winter = [12, 1, 2].includes(g.date.month);
  // 기세가 흘러가는 곳: 가르베스의 굶주림, 봉인이 약할수록, 전쟁이면 높게
  const target = (n.garbes ?? 30) * 0.7 + (100 - seal) * 0.3 + (n.war ? 25 : 0) + (winter ? 10 : 0) - (D.truce ? 30 : 0) - (n.fallen ? -20 : 0);
  D.raid = clamp(D.raid + (target - D.raid) * 0.08 + rng.float(-2, 2), 0, 100);
  if (D.truce && mi(g) >= D.truce.until) { D.truce = null; dlog(g, '해협의 휴전이 끝났다.'); }
  // 플레이어가 없어도: 기세가 높으면 북부 바깥 마을이 불탄다
  if (!D.truce && D.raid >= 55 && mi(g) - D.lastRaid >= 4 && rng.chance((D.raid - 50) / 150)) {
    D.lastRaid = mi(g); D.raids += 1;
    const where = rng.pick(['칼텐', '늑대 고개 목장', '해협 어부 마을', '그라우벨 바깥 장터']);
    g.news?.unshift({ text: `북부 소식: 마족 습격대가 ${J(where, '을/를')} 덮쳤다. ${rng.int(8, 40)}명이 해협 너머로 끌려갔다.`, rel: inNorth(g) ? 100 : 40 });
    if (inNorth(g)) stress(g, 4);
  }
  // 쫓기는 달은 줄고, 숨은 사람의 피는 대를 넘는다
  if (D.blood.hunted > 0) D.blood.hunted -= 1;
  // 회색 망토는 오래 안 보면 믿음이 식는다
  if (contactOk(g) && mi(g) - D.tradeAt > 24 && g.date.month === 1) D.contact.trust = clamp(D.contact.trust - 5, 0, 100);
  if (contactOk(g) && D.contact.trust <= 0) { D.contact.gone = true; dlog(g, `${D.contact.name}: 더는 오지 않는다.`); }
}
HOOKS.afterMonth.push((g) => { demonsMonth(g); });

// 대를 이으면: 회색 망토와의 믿음은 사람 몫이라 처음부터, 핏줄은 반쯤의 아이에게 이어진다(드러난 것은 새 몸에서 다시)
HOOKS.heir.push((g) => {
  if (!g.demons) return;
  const D = DM(g), b = D.blood;
  if (D.contact && !D.contact.gone) D.contact.trust = Math.round(D.contact.trust * 0.4);
  if (b.line === 1 || b.shown) b.line = demonRng(g, 77).chance(0.5) ? 1 : 0;
  b.shown = false; b.known = Math.min(b.known, 1); b.hunted = 0;
});
