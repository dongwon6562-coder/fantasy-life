// 뒤 시대의 사건: 새 기술이 들어온 자리에서 세력이 부딪히고, 플레이어는 그 사이에 선다.
// 새 행동은 없다. 형편이 맞을 때만 사건으로 찾아온다.
import { gainStat, gainSkill } from '../game.js';
import { EVENTS, age, here, onRoad, money, spend, stress, tire, injure, check, living, like, setFlag } from '../events/core.js';
import { J } from '../narrative/text.js';
import { L } from '../adventure/core.js';
import { LE, llog, clamp } from './state.js';

const has = (g, id) => !!g.history?.inventions?.includes(id);
const at = (g, ...ps) => ps.includes(here(g)) && !onRoad(g);
const adult = (g) => age(g) >= 16 && !g.bondage?.slave && !g.over;
const st = (g, k) => g.player.stats[k] ?? 0;
const sk = (g, k) => g.player.skills[k] ?? 0;
const renown = (g, n) => { L(g).renown = (L(g).renown ?? 0) + n; };
const stranger = (g) => living(g).find((p) => !p.isPlayer && p.alive && (p.ageMonths ?? 0) >= 20 * 12 && !g.player.familyIds.includes(p.id)) ?? null;

EVENTS.push(
  // ---------- 마석 사재기 ----------
  {
    id: 'later_stone_hoard', cooldown: 120,
    cond: (g) => adult(g) && (g.later?.deplete ?? 0) >= 35 && !(g.later?.me?.hoard) && money(g) >= 30 && at(g, 'harfen', 'leocast', 'portel', 'serenia', 'barka'),
    chance: () => 0.06, weight: 40,
    title: '마석 사재기',
    text: () => '장터 마석 거간꾼 앞에 사람들이 몰려 있다. "얕은 갱은 다 비었소. 내년엔 이 값에 못 사요." 옆 사람은 벌써 자루를 두 개째 채운다. 마석 값이 지난달보다 한 푼 올랐다.',
    choices: [
      { label: '은화 서른 닢어치 사 둔다', run: (g) => { spend(g, 30); const S = LE(g); S.me.hoard = 30; S.me.hoardAt = Math.round(S.deplete); stress(g, 3); return '마석 한 자루를 사서 마루 밑에 묻었다. 밤마다 그 자리를 밟고 지나갈 때 발소리가 조금 무거웠다.'; } },
      { label: '거간꾼의 말을 믿지 않는다', run: (g) => { gainStat(g, 'int', 0.4); return '겁이 값을 올린다. 그 겁에 돈을 내지 않기로 했다. 자루를 채우는 사람들의 얼굴을 오래 보았다.'; } },
    ],
  },
  {
    id: 'later_stone_hoard_end', cooldown: 24,
    cond: (g) => adult(g) && (g.later?.me?.hoard ?? 0) > 0 && (((g.later?.deplete ?? 0) >= (g.later.me.hoardAt ?? 0) + 15) || (g.later?.deplete ?? 0) < (g.later.me.hoardAt ?? 0) - 15),
    chance: () => 0.2, weight: 45,
    title: '마루 밑의 마석',
    text: (g) => ((g.later.deplete >= g.later.me.hoardAt) ? '마석 값이 다시 뛰었다. 거간꾼들이 집집마다 돌며 묵은 마석을 찾는다. 마루 밑에 묻어 둔 자루가 생각났다.' : '새 갱과 정련 공방 덕에 마석 값이 내려앉았다. 사재기한 사람들이 장터에서 서로 눈을 피한다. 마루 밑 자루가 생각났다.'),
    choices: [
      { label: '판다', run: (g) => { const S = LE(g), up = S.deplete >= S.me.hoardAt; const got = up ? Math.round(S.me.hoard * (1.4 + (S.deplete - S.me.hoardAt) / 40)) : Math.round(S.me.hoard * 0.55); g.player.money += got; S.me.hoard = 0; llog(g, up ? '묵혀 둔 마석을 비싸게 팔았다.' : '묵혀 둔 마석을 헐값에 팔았다.'); if (up) gainSkill(g, 'trade', 1.5, 'int'); else stress(g, 4); return up ? `은화 ${got}닢을 받았다. 산 값의 곱절 가까이다. 거간꾼은 다음에도 부탁한다며 웃었다. 그 마석이 어느 공방 화로에서 탈지 생각하지 않기로 했다.` : `은화 ${got}닢. 산 값의 반이다. 남의 겁에 돈을 걸었다가 내 겁에 졌다.`; } },
      { label: '더 묵힌다', run: (g) => { const S = LE(g); S.me.hoardAt = Math.round(S.deplete); return '자루를 다시 덮었다. 값은 또 움직일 것이다. 어느 쪽으로든.'; } },
    ],
  },
  // ---------- 교단과 마도 의원 ----------
  {
    id: 'later_healer_ban', cooldown: 96,
    cond: (g) => adult(g) && (has(g, 'medicine') || has(g, 'diagnose')) && (g.later?.stance?.faith ?? 0) <= -15 && at(g, 'leocast', 'serenia', 'harfen', 'verden'),
    chance: () => 0.05, weight: 40,
    prepare: (g) => ({ id: stranger(g)?.id ?? null }),
    title: '천을 덮은 진단판',
    text: (g, c) => { const p = living(g).find((x) => x.id === c.id); return `${p ? J(p.name, '이/가') : '이웃 하나가'} 배를 움켜쥐고 쓰러졌다. 성당 사제는 기도와 성수를 권하고, 골목 끝 마도 의원은 진단판에 천을 덮은 채 문을 반만 열어 두었다. 성광교가 마도 의술을 "신의 손을 흉내 내는 짓"이라 부른 뒤로 그 문을 드나드는 사람은 뒷문을 쓴다.`; },
    choices: [
      { label: '마도 의원에게 업고 간다', run: (g, rng, c) => { const p = living(g).find((x) => x.id === c.id); like(p, 12); spend(g, Math.min(money(g), 8)); LE(g).me.healer += 1; const seen = rng.chance(0.3); if (seen) { stress(g, 5); setFlag(g, 'later_healer_seen'); } return `진단판이 배 아래쪽을 붉게 비췄다. 의원은 칼 대신 정화석 침 셋을 꽂았다. 사흘 뒤 ${p ? J(p.name, '은/는') : '이웃은'} 걸어서 돌아왔다.${seen ? ' 뒷문을 나설 때 성당 종지기와 눈이 마주쳤다.' : ''}`; } },
      { label: '성당으로 데려간다', run: (g, rng, c) => { const p = living(g).find((x) => x.id === c.id); const ok = rng.chance(0.5); like(p, ok ? 6 : 2); gainStat(g, 'wil', 0.3); return ok ? '사제의 기도와 쓴 약초물로 열이 내렸다. 사제는 의원 쪽을 보지도 않았다.' : '사흘을 앓았다. 사제는 기도를 멈추지 않았고, 이웃은 끝내 일어났지만 한쪽 다리를 절게 되었다. 의원 골목 쪽을 오래 보았다.'; } },
      { label: '의원을 성당에 고발한다', run: (g, rng, c) => { const p = living(g).find((x) => x.id === c.id); like(p, -8); g.player.money += 10; LE(g).me.reported += 1; llog(g, '마도 의원을 성당에 고발했다.'); return '사제가 은화 열 닢을 쥐여 주며 축복했다. 이튿날 골목 끝 의원의 문에 성광교의 봉인이 붙었다. 이웃은 나를 보고 고개를 돌렸다.'; } },
    ],
  },
  // ---------- 마탑의 수정구 독점 ----------
  {
    id: 'later_crystal_smuggle', cooldown: 96,
    cond: (g) => adult(g) && has(g, 'crystal') && (g.later?.stance?.tower ?? 0) >= 15 && at(g, 'harfen', 'portel', 'barka', 'leocast', 'klein'),
    chance: () => 0.05, weight: 40,
    title: '탑 문장 없는 수정구',
    text: () => '창고 뒤편에서 누가 문을 두드렸다. 상단 일꾼 하나가 천에 싼 수정구를 품에 안고 있다. 탑 문장이 갈려 나간 자리가 하얗다. "마탑 감찰관이 골목을 뒤지고 있소. 하룻밤만 맡아 주시오. 이게 있어야 우리 상단이 탑에 사용료를 안 내고 시세를 듣소."',
    choices: [
      { label: '하룻밤 숨겨 준다', run: (g, rng) => { const S = LE(g); S.me.hid += 1; if (rng.chance(0.25)) { spend(g, Math.min(money(g), 25)); stress(g, 8); llog(g, '탑 문장 없는 수정구를 숨겨 주다 걸렸다.'); return '새벽에 감찰관이 문을 열었다. 회색 로브에 탑 문장. 수정구는 그 자리에서 깨졌고, 벌금으로 은화 스물다섯 닢을 냈다. 감찰관은 내 이름을 공책에 적었다.'; } g.player.money += 12; gainStat(g, 'cha', 0.3); return '밤새 수정구가 가끔 저 혼자 웅웅 울었다. 누군가 먼 데서 말하는 소리 같았다. 새벽에 일꾼이 은화 열두 닢을 두고 수정구를 가져갔다.'; } },
      { label: '감찰관에게 알린다', run: (g) => { g.player.money += 15; LE(g).me.reported += 1; LE(g).stance.tower = clamp(LE(g).stance.tower + 1, -100, 100); return '감찰관은 고맙다는 말 대신 은화 열다섯 닢을 내밀었다. 다음 날 그 상단 창고 문에 탑의 봉인이 붙었다.'; } },
      { label: '문을 닫는다', run: () => '모르는 척 문을 닫았다. 문 너머 발소리가 멀어졌다. 탑의 귀는 이제 어디에나 있다.' },
    ],
  },
  // ---------- 총과 칼 ----------
  {
    id: 'later_gun_sword', cooldown: 120,
    cond: (g) => adult(g) && has(g, 'gun') && sk(g, 'sword') >= 15 && at(g, 'leocast', 'graubel', 'harfen', 'eisen', 'verden'),
    chance: () => 0.05, weight: 40,
    title: '쇠알과 칼날',
    text: () => '주점 앞에서 귀족 자제 하나가 은박 두른 마도 총포를 흔들며 웃는다. "이제 칼 같은 건 고물이지. 기사 나리들도 곧 밭이나 갈게 될걸." 그의 눈이 내 허리의 칼에 멈췄다. "어때, 열 걸음. 내가 먼저 쏘고, 당신이 닿으면 당신이 이긴 거로 하지."',
    choices: [
      { label: '열 걸음을 받는다', run: (g, rng) => { LE(g).me.gunDuel += 1; const win = check(rng, sk(g, 'sword') + st(g, 'agi') / 2, 55); if (win) { renown(g, 6); gainSkill(g, 'sword', 1.5, 'agi'); llog(g, '총포를 든 귀족 자제를 칼로 이겼다.'); return '총구에서 푸른 불꽃이 튀었다. 쇠알이 귓가를 스쳤다. 그가 마석을 갈아 끼우려 허둥대는 사이, 칼끝이 그의 목 앞에 멈췄다. 주점 안이 조용해졌다가 터졌다. 그 뒤로 사람들이 "칼은 아직 쓸 만하다"고 말할 때 내 이름을 댔다.'; } injure(g, '쇠알이 스친 어깨', 2); stress(g, 6); return '쇠알이 어깨를 뚫고 지나갔다. 세 걸음 남았었다. 귀족 자제는 마석을 갈아 끼우며 웃었고, 주점 사람들은 아무 말도 하지 않았다. 두 달 동안 팔을 들지 못했다.'; } },
      { label: '웃어넘긴다', run: (g) => { gainStat(g, 'wil', 0.3); return '"한 발 쏘고 나면 그다음은?" 그렇게만 말하고 지나갔다. 등 뒤에서 그가 뭐라고 했지만 듣지 않았다. 총 한 자루 값이면 칼 스무 자루를 산다.'; } },
    ],
  },
  // ---------- 비행선 시험 비행 ----------
  {
    id: 'later_airship_trial', cooldown: 120,
    cond: (g) => age(g) >= 16 && age(g) <= 50 && !g.over && (has(g, 'floatstone') && !has(g, 'skyline')) && at(g, 'leocast', 'serenia', 'harfen') && !(g.later?.me?.flew),
    chance: () => 0.05, weight: 40,
    title: '시험 비행',
    text: (g) => (has(g, 'airship') ? '비행선 조선소 문에 방이 붙었다. "새 비행선 시험 비행에 탈 사람. 은화 마흔 닢. 몸무게 가벼운 자." 지난번 시험선은 부양석 하나가 꺼져 밭에 처박혔다. 아무도 죽지는 않았다고 한다.' : '세레니아 사람들이 부양석 주머니를 매단 바구니를 띄운다고 한다. 바구니에 탈 사람을 찾는다. "은화 마흔 닢. 몸무게 가벼운 자." 지난번 바구니는 사슬이 끊겨 호수에 떨어졌다.'),
    choices: [
      { label: '탄다', run: (g, rng) => { const S = LE(g); S.me.flew += 1; if (rng.chance(0.25)) { injure(g, '추락 때 부러진 다리', 3); g.player.money += 20; stress(g, 8); llog(g, '시험 비행선에 탔다가 떨어졌다.'); return '반 시진쯤 날았다. 지붕들이 장난감 같았다. 그러다 부양석 하나가 꺼졌다. 기울어진 바구니가 보리밭에 처박혔다. 다리가 부러졌고, 품삯은 반만 받았다. 그래도 하늘을 본 사람은 그날 일곱뿐이었다.'; } g.player.money += 40; renown(g, 5); gainStat(g, 'wil', 0.6); llog(g, '시험 비행선을 타고 하늘을 날았다.'); return '바닥이 멀어졌다. 성벽, 강, 공장 굴뚝, 내가 살던 골목이 손바닥만 해졌다. 바람이 차고 귀가 먹먹했다. 내려와서도 한동안 땅이 흔들리는 것 같았다. 은화 마흔 닢보다 그 한 시진이 오래 남았다.'; } },
      { label: '구경만 한다', run: (g) => { gainStat(g, 'sen', 0.3); return '사람들 틈에서 올려다보았다. 은빛 주머니가 천천히 떠올랐다가 구름 아래서 작아졌다. 언젠가는 누구나 저걸 탈 거라고 옆 사람이 말했다. 그 언젠가가 내 생에 올지는 모르겠다.'; } },
    ],
  },
);
