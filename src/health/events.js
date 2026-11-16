// 병과 의술의 사건: 장터의 약장수, 병이 도는 고장의 의원, 역병 든 고장의 격리, 몸에 남은 것과 함께 사는 일.
import { EVENTS, check, stress } from '../events/core.js';
import { gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { PLACES } from '../places.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { V, addFame as vocFame } from '../vocation/core.js';
import { HS, clamp, KINDS, CHRONIC, hlog, mySick } from './state.js';
import { outbreaksIn } from './world.js';
import { fallSick, ownRng, closeKin } from './life.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const town = (g) => (PLACES[here(g)]?.house ?? 0) > 0;
const nm = (g) => g.player.name;
const subj = (g) => J(nm(g), '이/가');

// ---------- 장터의 약장수 ----------
EVENTS.push({
  id: 'health_quack', cooldown: 36, weight: 4,
  chance: () => 0.4,
  cond: (g) => free(g) && town(g) && (HS(g).sick.length > 0 || HS(g).chronic.length > 0),
  prepare: (g) => ({ chronic: HS(g).chronic[0]?.id ?? null }),
  title: '만병통치약',
  text: (g, c) => `장터 한복판에 수레를 세운 사내가 푸른 병을 높이 들었다. "용의 쓸개, 엘프 숲의 이슬, 성인의 뼛가루! 열병, 기침, 저는 다리, 흐린 눈까지 한 병이면 끝!" ${c.chronic ? '그가 내 몸을 흘끗 훑어보더니 더 크게 외쳤다.' : '앓는 식구를 둔 사람들이 수레 앞에 몰려 있다.'} 한 병에 은화 여덟 닢.`,
  choices: [
    {
      label: '한 병 산다',
      run: (g, rng) => {
        if (g.player.money < 8) return '주머니를 뒤졌지만 여덟 닢이 없었다. 사내는 벌써 다음 사람을 보고 있었다.';
        g.player.money -= 8; HS(g).quacked += 1;
        const s = HS(g).sick[0];
        if (s && rng.chance(0.3)) { s.sev = clamp(s.sev - 6, 0, 100); return '독한 술맛이 났다. 이상하게도 그날 밤은 잘 잤다. 약 때문인지, 믿음 때문인지.'; }
        if (s) { s.sev = clamp(s.sev + 8, 0, 100); return '마신 날 밤부터 속이 뒤집혔다. 병에 남은 것을 냄새 맡아 보니 수은과 싸구려 술이었다. 수레는 이미 장터를 떠난 뒤였다.'; }
        return '한 달을 아껴 마셨다. 아무것도 달라지지 않았다. 빈 병을 창틀에 올려 두었다. 속은 값으로는 비싸지 않다고 생각하기로 했다.';
      },
    },
    {
      label: '사기꾼이라고 외친다',
      run: (g, rng) => {
        if (check(rng, g.player.stats.int * 0.5 + (g.player.skills.healing ?? 0) * 0.6 + (g.player.skills.herbs ?? 0) * 0.4, 45)) {
          deed(g, 'honest', 6, `${subj(g)} 장터에서 가짜 약장수의 병을 깨뜨려 속을 보여 주었다고 한다.`);
          return '병 하나를 빼앗아 마개를 땄다. 수은 냄새가 났다. 사람들 앞에서 그 이야기를 했다. 사내는 수레를 버리고 달아났다. 누군가 남은 병들을 우물에 던지려는 것을 말렸다. 우물이 무슨 죄인가.';
        }
        stress(g, 5);
        return '사내는 웃으며 내 앞에서 한 병을 단숨에 들이켰다. "보시오, 멀쩡하지 않소!" 사람들이 나를 비웃었다. 사내는 그날 스무 병을 더 팔았다.';
      },
    },
    { label: '지나친다', run: () => '못 들은 척 지나쳤다. 등 뒤에서 늙은 아낙 하나가 마지막 은화를 꺼내는 소리가 들렸다.' },
  ],
});

// ---------- 병이 도는 고장의 의원 ----------
EVENTS.push({
  id: 'health_doctor', cooldown: 24, weight: 6,
  chance: () => 0.5,
  cond: (g) => free(g) && mySick(g).length === 0 && outbreaksIn(g, here(g)).length > 0 && (L(g).job?.id === 'physician' || (g.player.skills.healing ?? 0) >= 40),
  prepare: (g) => ({ kind: outbreaksIn(g, here(g)).sort((a, b) => b.sev - a.sev)[0].kind }),
  title: '문 앞의 줄',
  text: (g, c) => `${J(KINDS[c.kind].name, '이/가')} 돌자 새벽부터 문 앞에 줄이 섰다. 품에 아이를 안은 어미, 기침하는 늙은이, 은화 주머니를 든 상인의 하인. 약재는 다 돌아가기에 모자란다.`,
  choices: [
    {
      label: '가난한 사람부터 값없이 본다',
      run: (g, rng, c) => {
        deed(g, 'kind', 12, `${subj(g)} 돌림병이 도는 동안 가난한 병자들을 값없이 보았다고 한다.`);
        deed(g, 'generous', 6, null);
        V(g).patients = (V(g).patients ?? 0) + rng.int(10, 25); vocFame(g, 'healer', 5);
        gainSkill(g, 'healing', 2, 'int'); stress(g, 8);
        if (ownRng(g, 41).chance(0.2)) { fallSick(g, c.kind, 'me', ownRng(g, 42)); return '한 달 동안 하루 두 시간씩 잤다. 줄은 줄지 않았다. 그리고 그달 끝에 나도 누웠다. 내 문 앞에 줄을 섰던 사람들이 이번에는 죽을 들고 왔다.'; }
        return '한 달 동안 하루 두 시간씩 잤다. 살린 사람과 못 살린 사람의 얼굴이 섞여 꿈에 나왔다. 장터 아낙들이 내 이름을 부르며 지나간다.';
      },
    },
    {
      label: '값을 치르는 순서대로 본다',
      run: (g, rng) => {
        const n = rng.int(25, 60);
        g.player.money += n; deed(g, 'kind', -8, `${subj(g)} 돌림병이 도는 동안 값을 많이 치르는 사람부터 보았다고 한다.`);
        V(g).patients = (V(g).patients ?? 0) + rng.int(4, 10); vocFame(g, 'healer', 1);
        return `상인의 하인들이 줄 앞으로 나왔다. 은화 ${n}닢이 들어왔다. 줄 끝의 어미는 해 질 녘에 아이를 안고 돌아갔다. 다음 날 그 어미는 오지 않았다.`;
      },
    },
    { label: '문을 걸어 잠근다', run: (g) => { stress(g, 6); deed(g, 'brave', -6, null); return '문을 걸고 덧창을 내렸다. 밤새 문 두드리는 소리가 났다. 아침에는 조용했다. 그게 더 무서웠다.'; } },
  ],
});

// ---------- 역병 든 고장 ----------
EVENTS.push({
  id: 'health_quarantine', cooldown: 48, weight: 7,
  chance: () => 0.6,
  cond: (g) => free(g) && town(g) && outbreaksIn(g, here(g)).some((o) => o.kind === 'plague'),
  title: '닫힌 성문',
  text: (g) => `${PLACES[here(g)]?.name ?? '고장'} 성문이 닫혔다. 문지기들이 코와 입을 천으로 싸매고 창을 겨눈다. 들어오는 사람도 나가는 사람도 없다. 골목마다 문에 흰 횟가루로 엑스 자가 그어진 집이 늘어 간다. 신전 옆 창고가 병자 수용소가 되었다.`,
  choices: [
    {
      label: '수용소에서 일손을 돕는다',
      run: (g, rng) => {
        deed(g, 'kind', 10, `${subj(g)} 역병 수용소에서 병자를 돌보았다고 한다.`); deed(g, 'brave', 6, null);
        const f = faithState(g); f.devotion = clamp(f.devotion + 3, 0, 100);
        gainSkill(g, 'healing', 1.5, 'int'); stress(g, 10);
        if (ownRng(g, 51).chance(0.3)) { fallSick(g, 'plague', 'me', ownRng(g, 52)); return '보름째 되던 날, 거울 속 내 목덜미에 잿빛 반점 하나가 돋아 있었다.'; }
        return '석 달 동안 수용소에서 지냈다. 수녀 둘이 쓰러졌고 의원 하나가 달아났다. 나는 쓰러지지도 달아나지도 않았다. 왜인지는 모른다.';
      },
    },
    {
      label: '집에 틀어박혀 문틈을 막는다',
      run: (g) => {
        stress(g, 12); g.player.fatigue = Math.max(0, g.player.fatigue - 10);
        for (const k of closeKin(g)) k.health = Math.max(10, (k.health ?? 70) - 2);
        return '문틈을 젖은 천으로 막고, 식초를 끓여 김을 쐬었다. 창밖으로 시신 수레가 지나가는 소리를 세었다. 하루에 일곱 번, 열한 번, 그리고 다시 일곱 번.';
      },
    },
    {
      label: '약초와 식초를 비싸게 판다',
      run: (g, rng) => {
        const n = rng.int(15, 40) + Math.round((g.player.skills.herbs ?? 0) / 4);
        g.player.money += n; deed(g, 'generous', -10, `${subj(g)} 역병 든 고장에서 약초 값을 열 배로 받았다고 한다.`);
        return `쑥과 식초와 마른 박하를 한 줌씩 싸서 팔았다. 은화 ${n}닢. 사 가는 손들이 떨렸다. 그 손들 가운데 몇이 다음 달에도 남아 있을지는 모른다.`;
      },
    },
  ],
});

// ---------- 몸에 남은 것과 함께 사는 일 ----------
const BODY = ['lame', 'blind', 'pocked', 'hand', 'fits'];
EVENTS.push({
  id: 'health_body', cooldown: 60, weight: 4,
  chance: () => 0.35,
  cond: (g) => free(g) && HS(g).chronic.some((c) => BODY.includes(c.id)),
  prepare: (g, rng) => ({ id: rng.pick(HS(g).chronic.filter((c) => BODY.includes(c.id))).id }),
  title: '남은 것',
  text: (g, c) => ({
    lame: '장터 아이들이 내 걸음을 흉내 내며 따라왔다. 한 발 끌고, 한 발 끌고. 그 뒤에서 아이들 어미가 웃음을 참고 있었다.',
    blind: '활터 앞을 지나는데 사수 하나가 나를 불렀다. "한쪽 눈으로도 과녁이 보이시오?" 놀리는 건지 묻는 건지 알 수 없었다.',
    pocked: '처음 보는 상인이 내 얼굴을 보더니 한 걸음 물러섰다. "역병이 아직 붙어 있는 거 아니오?" 자국은 오래전에 아물었다.',
    hand: '일자리를 찾아갔더니 주인이 내 손을 오래 보았다. "펴지지 않는 손가락으로 무얼 하겠소."',
    fits: '사람들 많은 장터 한가운데서 눈앞이 하얘졌다. 깨어 보니 사람들이 둘러서 있었다. 누군가 "악령이 씌었다"고 수군거렸다.',
  })[c.id],
  choices: [
    { label: '웃어넘긴다', run: (g) => { stress(g, -2); const w = g.player.stats; w.wil = Math.min(100, w.wil + 0.6); return '웃었다. 처음에는 억지로, 나중에는 진짜로. 웃는 사람을 오래 놀리는 사람은 없다.'; } },
    {
      label: '똑바로 맞선다',
      run: (g, rng) => {
        if (check(rng, g.player.stats.wil * 0.6 + g.player.stats.cha * 0.4, 50)) { deed(g, 'brave', 4, null); return '똑바로 쳐다보며 할 말을 했다. 상대가 먼저 눈을 돌렸다. 그날 저녁 내 걸음은 조금 덜 끌렸다.'; }
        stress(g, 6); return '할 말을 했지만 목소리가 떨렸다. 상대는 어깨를 으쓱하고 가 버렸다. 남은 것은 나와 내 몸뿐이었다.';
      },
    },
    { label: '사람 많은 데를 피한다', run: (g) => { stress(g, 4); hlog(g, '사람 많은 곳을 피하게 되었다.'); return '그 뒤로 장날에는 해 뜨기 전에 나가 해 뜨자마자 돌아왔다. 편했다. 조금 쓸쓸했다.'; } },
  ],
});

void note; void chron;
