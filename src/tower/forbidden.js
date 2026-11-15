// 금지 마법: 죽은 자, 피, 정신. 검은 탑(금지 마법을 지키는 비밀 모임)을 통해서만 배운다.
// 힘은 확실하다. 값도 확실하다. 몸과 마음에 얼룩(taint)이 남고, 쓸수록 들키기 쉽다.
// 들키면 마도사 협회의 집행관과 이단심문소가 함께 쫓는다. 봉인을 깎는 힘이기도 하다.
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill, gainStat } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, defineScene, queueScene, sceneQueued, note, chron, tired, stress } from '../adventure/core.js';
import { isJailed, addNotoriety } from '../crime.js';
import { byId } from '../npc.js';
import { realmOf } from '../realms/index.js';
import { TS, mi, clamp, FORBIDDEN, forbiddenLv, tlog } from './state.js';

const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const knowsAny = (g) => forbiddenLv(g) > 0;
const needMagic = (lv) => 30 + lv * 15;

// 들킬 확률: 얼룩이 짙을수록, 마탑과 성광국 땅일수록
function exposeChance(g) {
  const T = TS(g);
  const place = L(g).place;
  return T.taint / 450 + (place === 'serenia' ? 0.04 : 0) + (realmOf(place) === 'holy' ? 0.08 : 0) + (T.hunted > mi(g) ? 0.04 : 0);
}
export function maybeExpose(g, rng) {
  const T = TS(g);
  if (T.pendingExpose || !rng.chance(exposeChance(g))) return false;
  T.pendingExpose = true;
  return true;
}
// 금지 마법은 마신의 힘에 닿아 있다: 봉인을 조금 깎는다
function sealCost(g, n) {
  if (g.realm) g.realm.seal = Math.max(0, (g.realm.seal ?? 100) - n);
  if (g.seal?.me) g.seal.me.exploit += 0.5;
}

ACTIONS.push({
  id: 'forbidden_rite', name: '금지 마법', icon: 'magic',
  desc: '죽은 자, 피, 정신의 술. 검은 탑에서 배운 것을 더 깊이 익히거나 쓴다. 쓸 때마다 몸과 마음에 얼룩이 남고, 들키면 협회와 교단이 함께 쫓는다.',
  available: (g) => free(g) && g.player.manaAwakened && (TS(g).black === 2 || knowsAny(g)),
  run(g) {
    if (sceneQueued(g, 'forbidden_pick')) return '촛불을 끄고 오래 앉아 있었다. 무엇을 할지 아직 정하지 못했다.';
    queueScene(g, 'forbidden_pick');
    return '문을 걸어 잠그고 창에 천을 덮었다. 바닥에 분필로 원을 그렸다.';
  },
});

defineScene('forbidden_pick', {
  title: () => '닫힌 방',
  text: (g) => {
    const T = TS(g);
    const known = Object.entries(T.forbidden).filter(([, v]) => v > 0).map(([k, v]) => `${FORBIDDEN[k].name}(${FORBIDDEN[k].lv[v - 1]})`);
    return `분필 원 안에 앉았다. ${known.length ? `손에 익은 것: ${known.join(', ')}.` : '아직 아무것도 손에 익지 않았다. 검은 탑에서 받은 사본이 무릎 위에 있다.'} ${T.taint >= 40 ? '원을 그리는 손이 예전처럼 떨리지 않는다. 그게 더 무섭다.' : ''}`;
  },
  choices: (g) => {
    const T = TS(g);
    if (!free(g)) return [];
    const out = [];
    for (const [k, f] of Object.entries(FORBIDDEN)) {
      const lv = T.forbidden[k];
      if (lv >= 1) out.push({ label: `${f.name}을 쓴다 (${f.lv[lv - 1]})`, key: `use:${k}` });
      if (lv < 3 && (g.player.skills.magic ?? 0) >= needMagic(lv)) out.push({ label: `${f.name}을 더 깊이 익힌다 (${f.lv[lv]})`, key: `learn:${k}` });
    }
    out.push({ label: '원을 지우고 잠자리에 든다', key: 'none' });
    return out.slice(0, 8);
  },
  resolve(g, rng, s, key) {
    const T = TS(g);
    if (!key || key === 'none') { stress(g, -2); return '분필 원을 발로 문질러 지웠다. 오늘 밤은 아니다.'; }
    const [what, k] = key.split(':');
    tired(g, 15);
    let out;
    if (what === 'learn') out = learn(g, rng, k);
    else out = use(g, rng, k);
    if (maybeExpose(g, rng)) out += ' 창밖에서 무언가가 움직였다. 누군가 보았을지도 모른다.';
    return out;
  },
});

function learn(g, rng, k) {
  const T = TS(g);
  const lv = T.forbidden[k];
  T.forbidden[k] = lv + 1;
  T.taint = clamp(T.taint + 6 + lv * 3, 0, 100);
  gainSkill(g, 'magic', 2, 'int');
  tlog(g, `${FORBIDDEN[k].name}: ${FORBIDDEN[k].lv[lv]}을(를) 익혔다.`);
  note(g, `금지된 ${J(FORBIDDEN[k].name, '을/를')} 익혔다.`);
  const TXT = {
    necro: ['무덤가 흙을 한 줌 쥐고 술식을 읊었다. 귓가에서 누군가 아주 오래된 말로 속삭였다. 죽은 자의 목소리였다.', '오래된 뼈 무더기 위에 피 한 방울을 떨어뜨렸다. 손가락뼈 하나가 까딱 움직였다. 숨을 쉴 수 없었다.', '해골 셋이 원 밖에 무릎을 꿇었다. 내가 일어나라고 하면 일어나고, 걸으라고 하면 걷는다.'],
    blood: ['손바닥을 긋고 그 피로 술식을 그렸다. 분필로 그린 것보다 세 배는 선명하게 빛났다.', '내 피를 마력으로 바꾸는 법을 익혔다. 끝나고 나니 머리가 하얗게 비었고, 거울 속 얼굴이 해쓱했다.', '사본의 마지막 장을 읽었다. 남의 피로 하는 술식이다. 책을 덮고 한참 손을 씻었다. 그래도 이제 안다.'],
    mind: ['눈을 감고 옆방 사람의 생각을 더듬었다. 저녁 반찬 걱정이었다. 웃음이 났다. 그다음엔 웃음이 나지 않았다.', '시장에서 낯선 상인의 마음을 아주 조금 기울였다. 그는 값을 반으로 깎아 주고도 기분이 좋아 보였다.', '사람의 마음을 꺾는 법을 익혔다. 꺾인 마음은 다시 펴지지 않는다고 사본에 적혀 있었다.'],
  };
  return TXT[k][lv];
}

function use(g, rng, k) {
  const T = TS(g);
  const lv = T.forbidden[k];
  T.usedAt = mi(g);
  if (g.faith) g.faith.suspicion = Math.min(100, (g.faith.suspicion ?? 0) + 2);
  if (k === 'necro') {
    T.taint = clamp(T.taint + 3 + lv * 2, 0, 100);
    sealCost(g, 0.05 * lv);
    if (rng.chance(0.5)) {
      const n = rng.int(15, 30) * lv;
      g.player.money += n;
      return `${lv >= 2 ? '일으킨 시신을 앞세워' : '무덤가에 귀를 대고'} 죽은 상인이 숨긴 돈자루를 찾아냈다. 은화 ${n}닢. 돈에서 흙냄새가 났다.`;
    }
    if (g.seal) g.seal.known = Math.max(g.seal.known ?? 0, 2);
    return '오백 년 전에 죽은 마법사의 목소리를 불렀다. 그는 봉인을 그은 날의 이야기를 했다. 그리고 웃었다. "다시 갈라지고 있지?" 목소리는 그 말을 남기고 사라졌다.';
  }
  if (k === 'blood') {
    T.taint = clamp(T.taint + 5 + lv * 3, 0, 100);
    sealCost(g, 0.08 * lv);
    gainSkill(g, 'magic', 1.2 * lv, 'int');
    if (g.player.manaAwakened) g.player.mana += 0.8 * lv;
    if (lv >= 3 && rng.chance(0.5)) {
      addNotoriety(g, 10); stress(g, 15);
      chron(g, '도시 뒷골목에서 피가 다 빠진 시신이 발견되다. 경비대는 범인을 찾지 못했다.', 60);
      return '뒷골목의 부랑자를 원 안으로 데려왔다. 그 뒤의 일은 쓰지 않는다. 마력이 넘쳐흘렀다. 다음 날 아침 경비대가 골목을 막고 있었다.';
    }
    g.player.injuries.push({ name: '피를 뽑은 팔', months: 1 + Math.floor(lv / 2) });
    return '팔의 핏줄을 열어 술식에 피를 먹였다. 마력이 강물처럼 차올랐다가 천천히 가라앉았다. 앉은 자리에서 일어나지 못하고 새벽을 맞았다.';
  }
  // 정신
  T.taint = clamp(T.taint + 3 + lv * 2, 0, 100);
  const known = g.people.filter((p) => p.alive && p.known && !p.isPlayer && p.affection < 60 && (p.place ?? 'ern') === L(g).place);
  if (known.length && rng.chance(0.5)) {
    const p = rng.pick(known);
    p.affection = Math.min(100, p.affection + 8 + lv * 5);
    if (lv >= 3) p.traits = [...new Set([...(p.traits ?? []), 'timid'])];
    return `${p.name}의 마음을 ${lv >= 3 ? '꺾었다. 이제 그는 내 말이라면 무엇이든 한다. 눈빛이 어딘가 비어 있다.' : '조금 기울였다. 다음 날 나를 보는 얼굴이 한결 다정했다. 그 다정함이 진짜인지는 나만 안다.'}`;
  }
  const n = rng.int(20, 40) * lv;
  g.player.money += n;
  return `장터에서 부유한 상인의 마음을 기울였다. 그는 갚을 필요 없는 돈이라며 은화 ${n}닢을 내밀었다. 집에 돌아가서야 이상하다고 느낄 것이다.`;
}

// 얼룩은 몸에 남는다: 짙으면 마음이 무겁고 사람들이 멀어진다. 쓰지 않으면 아주 천천히 옅어진다.
HOOKS.afterMonth.push((g, rng) => {
  const T = g.tower;
  if (!T) return;
  if (T.taint > 0 && mi(g) - (T.usedAt ?? -99) > 6) T.taint = Math.max(0, T.taint - 0.15);
  if (T.taint >= 40) g.player.stress = Math.min(100, g.player.stress + 1);
  if (T.taint >= 70 && rng?.chance?.(0.15)) {
    const fam = g.player.familyIds.map((id) => byId(g, id)).filter((p) => p?.alive && !p.isPlayer);
    if (fam.length) rng.pick(fam).affection -= 1;
  }
  if (T.hunted > mi(g) && !T.pendingExpose && rng?.chance?.(L(g).place === 'serenia' ? 0.15 : 0.02)) T.pendingExpose = true;
});

void gainStat;
