// 봉인에 얽히는 사건: 꿈, 조사단, 그림자 없는 낯선 이, 마족의 거래, 쐐기를 노리는 밤, 봉인석 조각, 대륙 회의, 마지막 의식, 깨진 뒤.
// 막을 수도, 이용할 수도, 모른 척할 수도 있다. 어느 쪽도 정답으로 그리지 않는다.
import { EVENTS, flag, setFlag, check, stress, tire, age } from '../events/core.js';
import { gainSkill, gainStat, circleOf } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { isJailed, addNotoriety } from '../crime.js';
import { courtAccess } from '../court/index.js';
import { SS, mi, WEDGES, WEDGE_IDS, sealPower, slog, learn } from './state.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const renown = (g) => L(g).renown ?? 0;
const fame = (g, n) => { L(g).renown = Math.max(0, renown(g) + n); };
const F = (g) => g.faith;
const wedgeHere = (g) => WEDGE_IDS.find((id) => WEDGES[id].place === here(g)) ?? null;
const CITIES = ['harfen', 'leocast', 'verden', 'eisen', 'barka', 'serenia', 'solaris', 'graubel', 'portel'];

// ---------- 꿈 ----------
EVENTS.push({
  id: 'seal_dream', cooldown: 60, weight: 4,
  chance: () => 0.4,
  cond: (g) => age(g) >= 10 && SS(g).stage >= 1 && SS(g).known < 2 && !L(g).travel,
  title: '쇠사슬 꿈',
  text: (g) => `같은 꿈을 사흘째 꾸었다. 끝없이 긴 쇠사슬이 어둠 속으로 늘어져 있고, 그 끝에서 무언가가 아주 천천히 숨을 쉰다. 깨어 보니 손바닥에 손톱자국이 나 있었다.${SS(g).stage >= 3 ? ' 장터에서도 비슷한 꿈 이야기를 하는 사람이 여럿이다.' : ''}`,
  choices: [
    { label: '사제에게 꿈 이야기를 한다', run: (g) => { learn(g, 1); if (F(g)) F(g).devotion = Math.min(100, F(g).devotion + 3); return '사제는 끝까지 듣고 나서 한동안 말이 없었다. "요즘 그런 꿈을 꾸는 사람이 너 하나가 아니다. 기도를 거르지 마라." 그 목소리가 떨렸다.'; } },
    { label: '꿈을 적어 둔다', run: (g) => { learn(g, 1); gainStat(g, 'int', 0.3); return '꿈에서 본 쇠사슬 고리의 무늬를 그려 두었다. 나중에 오래된 책에서 같은 무늬를 보게 될 줄은 몰랐다.'; } },
    { label: '잊어버린다', run: (g) => { stress(g, 3); return '찬물로 얼굴을 씻었다. 꿈은 꿈이다.'; } },
  ],
});

// ---------- 마탑의 조사단 ----------
EVENTS.push({
  id: 'seal_scholar', cooldown: 48, weight: 5,
  chance: () => 0.45,
  cond: (g) => free(g) && SS(g).stage >= 1 && ['serenia', 'leocast', 'verden', 'harfen', 'graubel'].includes(here(g)) && (g.player.stats.int >= 30 || (g.player.skills.magic ?? 0) >= 15 || (g.player.skills.letters ?? 0) >= 25),
  title: '북쪽으로 가는 조사단',
  text: (g) => `세레니아의 회색 로브 차림 학자가 여관 탁자에 지도를 펼쳤다. "마신의 관 둘레 봉인석을 재러 간다. 글을 읽고 손이 야무진 사람이 하나 더 필요하다. 석 달 길이고, 돌아오지 못할 수도 있다." ${SS(g).stage >= 3 ? '지도 위 북쪽 끝에 붉은 잉크로 동그라미가 여러 개 그려져 있었다.' : '학자는 별일 아니라는 듯 말했지만, 눈 밑이 검었다.'}`,
  choices: [
    {
      label: '따라간다',
      run: (g, rng) => {
        const S = SS(g);
        tire(g, 30); stress(g, 8);
        S.study = Math.min(100, S.study + 4); S.me.guard += 1; S.me.studied += 1;
        learn(g, 2);
        g.player.money += 30;
        gainSkill(g, 'letters', 0.8, 'int');
        const lines = ['북쪽 끝의 바람은 칼 같았다. 봉인석은 집채만 한 검은 돌이었고, 표면에 머리카락 같은 금이 거미줄처럼 퍼져 있었다. 학자가 금마다 길이를 재어 적었다. 나는 등불을 들었다. 품삯으로 은화 30닢.'];
        if (S.stage >= 3 && rng.chance(0.35)) { g.player.injuries.push({ name: '마물에게 물린 다리', months: 2 }); lines.push('돌아오는 길에 눈 덮인 고개에서 무언가에 습격당했다. 다리에 이빨 자국이 남았다.'); }
        if (rng.chance(0.3)) { S.me.fragments += 1; lines.push('봉인석 발치에 손톱만 한 검은 조각이 떨어져 있었다. 아무도 보지 않을 때 주머니에 넣었다. 손끝이 오래 저렸다.'); }
        note(g, '세레니아 조사단을 따라 봉인석을 보고 왔다.');
        return lines.join(' ');
      },
    },
    { label: '거절한다', run: () => '"다른 사람을 찾아보시오." 학자는 고개를 끄덕이고 지도를 말았다. 다음 날 아침 조사단은 떠났다.' },
  ],
});

// ---------- 그림자 없는 낯선 이 ----------
EVENTS.push({
  id: 'seal_spy_found', cooldown: 24, weight: 6,
  chance: (g) => Math.min(0.5, SS(g).spies * 0.1),
  cond: (g) => free(g) && SS(g).spies >= 1 && CITIES.includes(here(g)),
  title: '그림자가 늦게 따라오는 사람',
  text: () => '해 질 녘 골목에서 한 사내와 엇갈렸다. 사내가 걸음을 옮긴 뒤에야 바닥의 그림자가 반 박자 늦게 따라 움직였다. 사내는 뒤돌아보지 않았다. 그런데 내가 본 것을 안다는 듯 어깨가 굳었다.',
  choices: [
    {
      label: '경비대와 심문소에 알린다',
      run: (g, rng) => {
        const S = SS(g);
        if (check(rng, g.player.stats.sen + renown(g) / 4, 45)) {
          S.spies = Math.max(0, S.spies - 1); S.me.guard += 1; fame(g, 3); learn(g, 2);
          return '사흘 뒤 성문 밖에서 그 사내가 불탔다. 불길 속에서 들린 비명은 사람의 것이 아니었다. 심문관이 내 이름을 장부에 적어 갔다. 칭찬인지 감시인지는 모르겠다.';
        }
        stress(g, 12);
        return '경비대는 엉뚱한 사람을 끌고 갔다. 다리를 저는 늙은 행상이었다. 심문소 지하에서 그가 무엇이라고 자백했는지는 듣고 싶지 않다. 진짜 그 사내는 다시 보이지 않았다.';
      },
    },
    {
      label: '뒤를 밟는다',
      run: (g, rng) => {
        const S = SS(g);
        tire(g, 12);
        if (!check(rng, g.player.stats.agi * 0.5 + g.player.stats.sen * 0.5, 50)) { g.player.injuries.push({ name: '검게 그을린 손자국', months: 2 }); stress(g, 10); return '버려진 창고까지 따라갔다. 문을 여는 순간 차가운 손이 목을 움켜쥐었다. 정신을 차려 보니 혼자였다. 목에 검은 손자국이 남았다.'; }
        learn(g, 2);
        if (check(rng, playerPower(g), 55)) { S.spies = Math.max(0, S.spies - 1); S.me.guard += 1; fame(g, 4); chron(g, `${g.player.name}, 도시에 숨어든 마족 하나를 베다.`); return '창고 지하에서 놈이 본모습을 드러냈다. 피부 밑으로 검은 비늘이 비쳤다. 오래 싸웠다. 쓰러진 놈의 몸은 재가 되어 흩어졌다. 벽에는 왕도 대성당의 도면이 붙어 있었다.'; }
        return '창고 지하에서 놈이 본모습을 드러냈다. 칼이 비늘에 미끄러졌다. 놈은 웃으며 어둠 속으로 사라졌다. 벽에 붙어 있던 대성당 도면만 겨우 뜯어 왔다.';
      },
    },
    { label: '약점을 쥐고 흥정한다', run: (g) => { const S = SS(g); S.me.exploit += 1; g.player.money += 30; learn(g, 2); return '사내를 불러 세우고 그림자 이야기를 꺼냈다. 사내는 오래 나를 보다가 금화 주머니를 내밀었다. "입이 무거운 사람은 오래 산다." 은화 30닢 값의 금화였다. 무엇을 눈감아 준 것인지는 생각하지 않기로 했다.'; } },
    { label: '못 본 척한다', run: () => '걸음을 재촉해 큰길로 나왔다. 사람 많은 곳의 등불이 오늘따라 반가웠다.' },
  ],
});

// ---------- 마족의 거래 ----------
EVENTS.push({
  id: 'seal_demon_offer', cooldown: 120, weight: 5,
  chance: () => 0.3,
  cond: (g) => free(g) && SS(g).spies >= 2 && SS(g).stage >= 2 && !SS(g).me.pact && (g.player.manaAwakened || (g.player.skills.magic ?? 0) >= 20),
  title: '창가의 손님',
  text: () => '자정 무렵 창문이 저절로 열렸다. 창틀에 앉은 이는 사람의 얼굴을 하고 있었지만 눈동자가 세로로 길었다. "네 마력은 좁은 그릇에 갇혀 있다. 그릇을 넓혀 주지. 값은 작다. 가끔 우리 손님들이 묵을 곳을 일러 주면 된다."',
  choices: [
    {
      label: '받아들인다',
      run: (g) => {
        const S = SS(g);
        S.me.pact = true; S.me.exploit += 2; S.spies = Math.min(12, S.spies + 1);
        if (g.player.manaAwakened) g.player.mana = (g.player.mana ?? 0) + 4;
        gainSkill(g, 'magic', 4, 'int');
        if (F(g)) F(g).suspicion = Math.min(100, F(g).suspicion + 10);
        note(g, '마족과 거래했다.');
        return '그것이 내 이마에 손가락을 댔다. 얼음물이 핏줄을 타고 도는 것 같았다. 아침에 깨어 보니 마력의 흐름이 전보다 넓고 차가웠다. 거울 속 내 그림자가 아주 조금 늦게 움직였다.';
      },
    },
    { label: '거절한다', run: (g) => { stress(g, 6); return '"아니." 그것은 웃었다. "그릇이 깨질 때 다시 오지." 창문이 닫혔다. 방 안이 한참 동안 얼음장 같았다.'; } },
    { label: '성수를 뿌리고 심문소에 알린다', run: (g) => { const S = SS(g); S.me.guard += 1; fame(g, 2); learn(g, 2); S.spies = Math.max(0, S.spies - 1); return '성수가 닿자 그것은 쇳소리를 내며 사라졌다. 날이 밝자마자 심문소로 갔다. 그 주에 같은 거리의 셋방 두 곳이 봉쇄되었다.'; } },
  ],
});

// ---------- 쐐기를 노리는 밤 ----------
EVENTS.push({
  id: 'seal_wedge_raid', cooldown: 36, weight: 6,
  chance: (g) => 0.12 + SS(g).cult / 400,
  cond: (g) => free(g) && SS(g).stage >= 2 && !!wedgeHere(g) && SS(g).wedges[wedgeHere(g)] === 'whole',
  prepare: (g) => ({ id: wedgeHere(g) }),
  title: '쐐기를 노리는 밤',
  text: (g, c) => `${WEDGES[c.id].keeper}의 경비가 술에 취해 있었다. 우연이 아니다. 검은 두건을 쓴 자들이 ${J(WEDGES[c.id].name, '이/가')} 있는 곳으로 숨어드는 것을 보았다. 나 말고는 아무도 깨어 있지 않다.`,
  choices: [
    {
      label: '막아선다',
      run: (g, rng, c) => {
        const S = SS(g);
        tire(g, 20);
        if (check(rng, playerPower(g), 45 + S.stage * 5)) {
          S.me.wedgeSaved += 1; S.me.guard += 2; fame(g, 5); learn(g, 2);
          chron(g, `${g.player.name}, ${J(WEDGES[c.id].name, '을/를')} 노린 마신교도들을 막아 내다.`);
          return `소리를 지르며 뛰어들었다. 두건 셋을 베었고 나머지는 달아났다. ${J(WEDGES[c.id].keeper, '이/가')} 횃불을 들고 몰려왔을 때 나는 피투성이로 문 앞에 앉아 있었다.`;
        }
        g.player.injuries.push({ name: '의식용 단검에 베인 상처', months: 3 });
        if (rng.chance(0.5)) { S.wedges[c.id] = 'stolen'; slog(g, `${J(WEDGES[c.id].name, '이/가')} 도둑맞았다.`); return '혼자서는 무리였다. 단검이 옆구리를 갈랐다. 쓰러진 채로 두건들이 무언가를 천에 싸서 들고 나가는 것을 보았다.'; }
        return '혼자서는 무리였다. 단검이 옆구리를 갈랐다. 그래도 내 비명에 경비들이 깨어났고, 두건들은 빈손으로 달아났다.';
      },
    },
    {
      label: '도둑들을 돕는다',
      run: (g, rng, c) => {
        const S = SS(g);
        S.wedges[c.id] = 'stolen'; S.me.exploit += 2; S.me.wedgeSold += 1; S.me.fragments += 1;
        const n = rng.int(50, 80);
        g.player.money += n; addNotoriety(g, 5);
        slog(g, `${J(WEDGES[c.id].name, '이/가')} 도둑맞았다.`);
        return `두건 하나에게 다가가 경비의 순찰 길을 일러 주었다. 일은 금방 끝났다. 우두머리가 은화 ${n}닢과 함께 검은 돌 조각 하나를 내밀었다. "쐐기에서 떨어진 것이다. 쓸 데가 많을 거다."`;
      },
    },
    { label: '문을 잠그고 숨는다', run: (g, rng, c) => { if (rng.chance(0.4)) { SS(g).wedges[c.id] = 'stolen'; slog(g, `${J(WEDGES[c.id].name, '이/가')} 도둑맞았다.`); return '새벽까지 숨을 죽였다. 아침에 거리가 소란스러웠다. 무언가가 사라졌다고 한다.'; } return '새벽까지 숨을 죽였다. 아침에 들으니 경비가 늦게나마 깨어나 도둑들을 쫓아냈다고 한다.'; } },
  ],
});

// ---------- 봉인석 조각 ----------
EVENTS.push({
  id: 'seal_fragment_buyer', cooldown: 12, weight: 6,
  chance: () => 0.5,
  cond: (g) => free(g) && SS(g).me.fragments >= 1 && ['eisen', 'barka', 'harfen', 'serenia', 'leocast', 'solaris'].includes(here(g)),
  title: '검은 돌 조각',
  text: (g) => `품속의 봉인석 조각이 오늘따라 차갑다. ${here(g) === 'eisen' ? '제국 마법원의 서기가' : here(g) === 'barka' ? '자유도시 뒷골목의 마석상이' : '어디서 들었는지 낯선 사람이'} 그 조각을 사겠다고 찾아왔다. 값을 부르는 손이 떨렸다.`,
  choices: [
    { label: '값을 제일 많이 부르는 쪽에 판다', run: (g, rng) => { const S = SS(g); S.me.fragments -= 1; S.me.exploit += 1; const n = rng.int(70, 110); g.player.money += n; return `은화 ${n}닢. 조각을 넘기자 손끝의 저림이 가셨다. 그 돌이 어디에 박힐지는 모른다.`; } },
    { label: '마탑에 넘긴다', run: (g) => { const S = SS(g); S.me.fragments -= 1; S.me.guard += 1; S.study = Math.min(100, S.study + 5); g.player.money += 25; learn(g, 2); return '세레니아의 학자가 조각을 받아 들고 숨을 삼켰다. "이것으로 금이 얼마나 빨리 벌어지는지 잴 수 있다." 사례로 은화 25닢.'; } },
    { label: '교단에 바친다', run: (g) => { const S = SS(g); S.me.fragments -= 1; S.me.guard += 1; S.cult = Math.max(0, S.cult - 3); if (F(g)) F(g).devotion = Math.min(100, F(g).devotion + 5); return '사제가 조각을 은 상자에 넣고 봉했다. "성물로 다시 묶일 것이다." 그날 밤 처음으로 꿈 없이 잤다.'; } },
    {
      label: '내 마력에 녹인다',
      show: (g) => g.player.manaAwakened,
      run: (g, rng) => {
        const S = SS(g); S.me.fragments -= 1; S.me.exploit += 1;
        g.player.mana = (g.player.mana ?? 0) + 3;
        if (rng.chance(0.35)) { g.player.injuries.push({ name: '검게 변한 핏줄', months: 3 }); return '조각을 손에 쥐고 마력을 돌렸다. 돌이 녹아 핏줄로 스며들었다. 팔의 핏줄이 검게 부풀었다가 석 달 만에 가라앉았다. 마력은 확실히 깊어졌다.'; }
        return '조각을 손에 쥐고 마력을 돌렸다. 돌이 녹아 핏줄로 스며들었다. 차갑고 깊은 힘이었다. 이 힘이 어디서 왔는지는 잊지 않기로 했다.';
      },
    },
  ],
});

// ---------- 대륙 회의에서 목소리를 낸다 ----------
EVENTS.push({
  id: 'seal_council_voice', once: true, weight: 85,
  cond: (g) => free(g) && SS(g).stage >= 4 && !SS(g).council && ['solaris', 'leocast', 'serenia'].includes(here(g)) && (courtAccess(g) == null || renown(g) >= 40 || (g.player.skills.magic ?? 0) >= 50 || (F(g)?.rank ?? 0) >= 1),
  title: '대륙 회의',
  text: () => '각국의 사절과 교단의 추기경, 마탑의 주인들이 한 방에 모였다. 봉인을 두고 어떻게 할지 정하는 자리다. 교단은 이단 사냥과 용사 의식을, 마탑은 보강 술식을 내세운다. 서로의 목소리가 높아질 때 누군가 내게 발언을 청했다.',
  choices: [
    { label: '교단의 길을 편든다', run: (g) => { const S = SS(g); S.council = 'church'; slog(g, '대륙 회의가 교단의 손을 들어 주었다.'); fame(g, 4); if (F(g)) F(g).devotion = Math.min(100, F(g).devotion + 4); return '"빛이 흔들릴 때는 기도로 붙잡아야 하오." 추기경들이 고개를 끄덕였다. 마탑의 주인들은 말없이 자리를 떴다.'; } },
    { label: '마탑의 길을 편든다', run: (g) => { const S = SS(g); S.council = 'tower'; S.study = Math.min(100, S.study + 20); slog(g, '대륙 회의가 마탑의 보강 술식에 돈을 대기로 했다.'); fame(g, 4); return '"금이 가는 돌은 기도로 붙지 않소. 재고 메우고 새로 그어야 하오." 마탑의 주인들이 처음으로 웃었다. 추기경 하나가 나를 오래 노려보았다.'; } },
    {
      label: '둘이 손을 잡아야 한다고 말한다',
      run: (g, rng) => {
        const S = SS(g);
        if (check(rng, g.player.stats.cha + renown(g) / 3, 70)) { S.council = 'unite'; fame(g, 8); chron(g, `${g.player.name}, 대륙 회의에서 교단과 마탑을 한 탁자에 앉히다.`); slog(g, '대륙 회의 끝에 교단과 마탑이 손을 잡았다.'); return '긴 침묵 끝에 교황의 사절이 먼저 손을 내밀었다. 협회장의 대리인이 그 손을 잡았다. 오백 년 동안 없던 일이다.'; }
        S.council = 'split'; slog(g, '대륙 회의가 아무것도 정하지 못하고 흩어졌다.');
        return '양쪽 모두에게서 야유가 쏟아졌다. 회의는 고성 속에 흩어졌다. 나라마다 제 성벽만 높이기로 한 셈이다.';
      },
    },
    { label: '입을 다문다', run: () => '"제가 드릴 말씀은 없습니다." 회의는 나 없이 계속되었다.' },
  ],
});

// ---------- 마지막 의식 ----------
EVENTS.push({
  id: 'seal_rite_call', cooldown: 24, weight: 88,
  cond: (g) => free(g) && sealPower(g) < 22 && !SS(g).rite && !SS(g).ending && ['serenia', 'graubel'].includes(here(g)) && (circleOf(g) >= 4 || (g.player.skills.magic ?? 0) >= 70) && !flag(g, `seal_rite_${SS(g).riteCycle ?? 0}`),
  title: '북쪽으로 가는 마법사들',
  text: () => '마탑의 소집령이 내려왔다. 4서클 이상의 마법사는 모두 북쪽으로 오라는 것이다. 마신의 관 둘레에 새 봉인을 긋는다고 한다. 돌아온다는 약속은 어디에도 적혀 있지 않았다.',
  choices: [
    {
      label: '간다',
      run: (g, rng) => {
        const S = SS(g);
        setFlag(g, `seal_rite_${S.riteCycle ?? 0}`);
        S.riteHelp = (S.riteHelp ?? 0) + 2; S.me.guard += 3;
        tire(g, 40); stress(g, 20); fame(g, 10);
        g.player.injuries.push({ name: '술식에 탄 두 손', months: rng.int(3, 6) });
        if (g.player.manaAwakened) g.player.mana = Math.max(0, g.player.mana * 0.9);
        chron(g, `${g.player.name}, 봉인을 다시 긋는 의식에 몸을 보태다.`);
        return '눈보라 속에서 이레 동안 술식을 붙들었다. 옆의 마법사가 재가 되어 흩어지는 것을 보았다. 손이 타들어 갔지만 놓지 않았다. 의식이 어떻게 끝날지는 아직 모른다. 다만 내 몫은 다했다.';
      },
    },
    { label: '가지 않는다', run: (g) => { setFlag(g, `seal_rite_${SS(g).riteCycle ?? 0}`); stress(g, 6); return '소집령을 접어 서랍에 넣었다. 살아남는 것도 선택이다. 그 선택의 무게는 오래 남을 것이다.'; } },
  ],
});

// ---------- 봉인이 깨진 뒤 ----------
EVENTS.push({
  id: 'seal_after_break', cooldown: 600, weight: 86,
  cond: (g) => age(g) >= 8 && SS(g).ending === 'broken' && mi(g) - (SS(g).endedAt ?? 0) <= 8 && !flag(g, `seal_broke_${SS(g).endedAt}`),
  title: '깨진 밤 다음 날',
  text: () => '북쪽 하늘이 낮에도 어둡다. 성당 종이 쉬지 않고 울리고, 사람들은 문을 걸어 잠갔다. 장터에서는 남쪽으로 가는 배표가 금값이 되었다. 어떤 이들은 칼을 갈고, 어떤 이들은 술을 마신다.',
  choices: [
    { label: '칼을 든다', run: (g) => { setFlag(g, `seal_broke_${SS(g).endedAt}`); SS(g).me.guard += 1; gainStat(g, 'wil', 1); return '대장간 앞에 줄을 섰다. 낡은 칼을 갈아 허리에 찼다. 무엇과 싸워야 할지는 아직 모르지만.'; } },
    { label: '기도한다', run: (g) => { setFlag(g, `seal_broke_${SS(g).endedAt}`); if (F(g)) F(g).devotion = Math.min(100, F(g).devotion + 8); return '성당 바닥이 무릎 꿇은 사람들로 빈틈이 없었다. 처음으로 진심으로 빌었다.'; } },
    { label: '이 혼란에서 한몫 잡는다', run: (g, rng) => { setFlag(g, `seal_broke_${SS(g).endedAt}`); SS(g).me.exploit += 1; const n = rng.int(30, 60); g.player.money += n; return `피난민에게 수레와 식량을 비싸게 팔았다. 은화 ${n}닢. 누군가는 이런 날에도 장사를 해야 한다고 스스로를 달랬다.`; } },
  ],
});
