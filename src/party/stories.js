// 몇 달에 걸친 의뢰 이야기 줄기. 동료와 함께 받는 긴 의뢰는 한 달에 한 걸음씩 나아간다.
// 동료의 역할(척후·치유사·마법사…)이 고를 수 있는 길을 바꾸고, 충성이 낮은 동료는 배신하기도 한다.
// 싸움은 교전 규칙(adventure/fight.js의 runFight)을 그대로 쓴다.
import { J } from '../narrative/text.js';
import { ACTIONS } from '../actions.js';
import { HOOKS } from '../hooks.js';
import { gainSkill } from '../game.js';
import { monthIndex, nudge } from '../world.js';
import { L, defineScene, queueScene, sceneQueued, isAdult, traveling, note, chron, check, stress } from '../adventure/core.js';
import { runFight } from '../adventure/fight.js';
import { P, members, ready, leave, addLoyalty, ROLES } from './core.js';

const withRole = (g, role) => ready(g).find((p) => p.comp.role === role) ?? null;
const fight = (g, rng, enc, tactic) => runFight(g, rng, { enc, reward: {} }, tactic, { short: true });
const won = (r) => r.outcome === 'win' || r.outcome === 'overwhelm';

// 이야기 줄기. steps[id] = { title, text(g, st), choices(g, st), resolve(g, rng, ctx, key) → 글 } ; ctx.data / ctx.next(stepId, 글) / ctx.end(ok, 글)
export const STORIES = {
  caravan: {
    title: '사라진 대상', places: ['harfen', 'verden'], minParty: 1,
    pitch: '은저울 상단의 짐수레 여섯 대가 하르펜과 베르덴 사이 숲길에서 통째로 사라졌다. 상단은 짐을 찾아오면 후하게 치르겠다고 한다.',
    first: 'trail',
    steps: {
      trail: {
        title: '숲길의 바퀴 자국',
        text: () => '대상이 사라진 숲길에 닿았다. 비에 반쯤 지워진 바퀴 자국이 길을 벗어나 숲으로 꺾여 들어간다. 길가 주막 주인은 무언가 아는 눈치다.',
        choices: (g) => [
          ...(withRole(g, 'scout') ? [{ label: `척후 ${withRole(g, 'scout').name}에게 자국을 쫓게 한다`, key: 'scout' }] : []),
          { label: '주막 주인을 구슬려 본다', key: 'inn' },
          { label: '숲을 이 잡듯 뒤진다', key: 'search' },
        ],
        resolve(g, rng, st, key) {
          if (key === 'scout') { st.data.clue = 2; addLoyalty(withRole(g, 'scout'), 3); return st.next('camp', `${J(withRole(g, 'scout').name, '이/가')} 땅에 코를 박다시피 하며 자국을 쫓았다. 해 질 녘, 골짜기 아래 모닥불 연기 세 줄을 찾았다. 놈들은 우리가 온 줄 모른다.`); }
          if (key === 'inn') {
            if (check(rng, g.player.stats.cha, 45)) { st.data.clue = 1; return st.next('camp', '은화 몇 닢과 술 한 동이에 주인의 입이 풀렸다. 골짜기 아래 버려진 채석장에 낯선 사내들이 드나든다고 했다.'); }
            st.data.clue = 0; return st.next('camp', '주인은 아무것도 모른다고 잡아뗐다. 그날 밤, 누군가 주막 뒷문으로 말을 달려 나갔다. 놈들에게 우리가 온다는 말이 들어갔을 것이다.');
          }
          st.data.clue = 0;
          return st.next('camp', '사흘 동안 숲을 뒤졌다. 결국 채석장을 찾았지만, 놈들도 우리를 보았다.');
        },
      },
      camp: {
        title: '채석장의 도적들',
        text: (g, st) => `버려진 채석장에 대상의 짐수레가 줄지어 서 있다. 도적은 열 명 남짓.${st.data.clue >= 2 ? ' 놈들은 아직 우리가 온 줄 모른다.' : st.data.clue === 0 ? ' 놈들은 활을 들고 기다리고 있다.' : ''}`,
        choices: (g, st) => [
          ...(st.data.clue >= 1 ? [{ label: '밤을 틈타 기습한다', key: 'ambush' }] : []),
          { label: '정면으로 친다', key: 'charge' },
          ...(withRole(g, 'mage') ? [{ label: `${J(withRole(g, 'mage').name, '이/가')} 먼저 불을 놓는다`, key: 'magic' }] : []),
        ],
        resolve(g, rng, st, key) {
          const enc = { unit: 'bandit', count: st.data.clue >= 2 ? 4 : st.data.clue === 1 ? 5 : 6, leader: 'bandit_chief' };
          const r = fight(g, rng, enc, key === 'magic' ? 'magic' : key);
          if (won(r)) return st.next('truth', r.text);
          return st.end(false, `${r.text} 짐수레는 되찾지 못했다.`);
        },
      },
      truth: {
        title: '포로의 고백',
        text: () => '짐수레 뒤에 묶여 있던 대상 우두머리가 풀려나자마자 무릎을 꿇었다. 도적과 짜고 짐을 빼돌리려 했는데, 놈들이 몫을 나누기 싫어 자기까지 묶었다는 것이다. 상단에 말하지 말아 달라고, 은화 백 닢을 주겠다고 한다.',
        choices: () => [
          { label: '상단에 사실대로 알린다', key: 'truth' },
          { label: '은화 백 닢을 받고 입을 다문다', key: 'bribe' },
          { label: '짐만 돌려주고 우두머리는 놓아준다', key: 'mercy' },
        ],
        resolve(g, rng, st, key) {
          if (key === 'truth') { g.player.money += 70; L(g).renown += 4; return st.end(true, '상단은 짐을 되찾고 배신자를 감옥에 넣었다. 은화 70닢과 함께, 은저울 상단이 내 이름을 기억하겠다고 했다.'); }
          if (key === 'bribe') { g.player.money += 130; L(g).notoriety += 4; for (const p of members(g)) addLoyalty(p, p.traits.includes('kind') ? -8 : p.traits.includes('greedy') ? 6 : 0); return st.end(true, '은화 자루가 두 개가 되었다. 상단의 보수 30닢과 우두머리의 백 닢. 다정한 동료 하나가 오래 말이 없었다.'); }
          g.player.money += 50; L(g).renown += 2;
          return st.end(true, '짐수레를 상단에 돌려주며 우두머리는 도적들 손에 죽었다고 했다. 그는 그날로 왕국을 떠났다. 은화 50닢을 받았다.');
        },
      },
    },
  },

  children: {
    title: '회색 굴의 아이들', places: ['harfen', 'ern'], minParty: 1,
    pitch: '에른과 하르펜 사이 마을에서 아이 셋이 사라졌다. 남은 것은 회색 굴 쪽으로 난 작은 발자국과 고블린의 뼈 장식뿐이다.',
    first: 'plea',
    steps: {
      plea: {
        title: '어머니들',
        text: () => '아이를 잃은 어머니들이 마을 어귀에서 기다리고 있었다. 한 사람은 말을 잃었고, 한 사람은 내 소매를 놓지 않았다.',
        choices: (g) => [
          { label: '곧장 회색 굴로 간다', key: 'go' },
          ...(withRole(g, 'healer') ? [{ label: `${J(withRole(g, 'healer').name, '이/가')} 어머니들을 돌보며 이야기를 듣는다`, key: 'heal' }] : []),
          { label: '마을 사냥꾼들을 모아 함께 간다', key: 'hunters' },
        ],
        resolve(g, rng, st, key) {
          if (key === 'heal') { st.data.know = true; addLoyalty(withRole(g, 'healer'), 4); return st.next('cave', '치유사가 어머니들의 손을 잡아 주는 사이, 한 아이의 누이가 본 것을 털어놓았다. 고블린들 사이에 뿔 달린 지팡이를 든 놈이 있었다고. 주술사다.'); }
          if (key === 'hunters') { st.data.help = true; return st.next('cave', '사냥꾼 넷이 활을 들고 따라나섰다. 겁먹은 얼굴이지만 물러서지 않았다.'); }
          return st.next('cave', '어머니들의 눈을 뒤로하고 길을 서둘렀다.');
        },
      },
      cave: {
        title: '회색 굴 깊은 곳',
        text: (g, st) => `굴 안쪽에서 북소리가 울린다. 고블린 떼가 횃불을 들고 몰려나온다.${st.data.help ? ' 사냥꾼들이 뒤에서 활을 겨눈다.' : ''}`,
        choices: () => [{ label: '정면으로 뚫는다', key: 'charge' }, { label: '굴 벽을 타고 몰래 들어간다', key: 'ambush' }],
        resolve(g, rng, st, key) {
          const r = fight(g, rng, { unit: 'goblin', count: st.data.help ? 4 : 6, leader: 'goblin_chief' }, key);
          if (won(r)) return st.next('shaman', r.text);
          return st.end(false, `${r.text} 굴 안에서 아이 울음소리가 멀어졌다.`);
        },
      },
      shaman: {
        title: '제단',
        text: (g, st) => `가장 깊은 방, 피로 그린 원 한가운데 아이 셋이 묶여 있다. 뿔 지팡이를 든 고블린 주술사가 주문을 외기 시작했다.${st.data.know ? ' 미리 알고 왔다. 지팡이부터 부숴야 한다.' : ''}`,
        choices: (g, st) => [
          ...(withRole(g, 'mage') ? [{ label: `${J(withRole(g, 'mage').name, '이/가')} 주문을 끊는다`, key: 'mage' }] : []),
          ...(st.data.know ? [{ label: '지팡이를 노리고 몸을 날린다', key: 'staff' }] : []),
          { label: '주술사에게 돌진한다', key: 'rush' },
        ],
        resolve(g, rng, st, key) {
          if (key === 'mage') { addLoyalty(withRole(g, 'mage'), 5); return finish(g, st, 3, `${J(withRole(g, 'mage').name, '이/가')} 손을 뻗자 주술사의 불꽃이 거꾸로 타올랐다. 아이 셋을 모두 안고 나왔다.`); }
          const ok = key === 'staff' ? check(rng, g.player.stats.agi + g.player.skills.sword / 2, 45) : check(rng, g.player.stats.agi + g.player.skills.sword / 2, 60);
          if (ok) return finish(g, st, 3, '칼끝이 지팡이를 두 동강 냈다. 주술사가 비명을 지르며 무너졌다. 아이 셋 모두 살았다.');
          return finish(g, st, 2, '주술사를 베었지만 한발 늦었다. 아이 하나는 다시 눈을 뜨지 않았다.');
        },
      },
    },
  },

  cursed: {
    title: '잠들지 못하는 마을', places: ['verden', 'gruental'], minParty: 1,
    pitch: '베르덴 서쪽 골짜기 마을에서 밤마다 묻힌 자들이 무덤을 헤치고 일어난다고 한다. 마을 사제는 도망쳤다.',
    first: 'night',
    steps: {
      night: {
        title: '묘지의 밤',
        text: () => '자정이 가까워지자 묘지의 흙이 들썩였다. 녹슨 갑옷을 입은 해골들이 하나둘 일어선다. 마을 사람들은 문을 걸어 잠갔다.',
        choices: (g) => [{ label: '묘지 입구를 막고 싸운다', key: 'charge' }, ...(withRole(g, 'healer') ? [{ label: `${J(withRole(g, 'healer').name, '이/가')} 성수를 뿌리며 앞장선다`, key: 'holy' }] : [])],
        resolve(g, rng, st, key) {
          if (key === 'holy') { addLoyalty(withRole(g, 'healer'), 4); st.data.holy = true; return st.next('crypt', '성수가 닿자 해골들이 재가 되어 무너졌다. 남은 발자국이 묘지 아래 납골당으로 이어진다.'); }
          const r = fight(g, rng, { unit: 'skeleton', count: 5, leader: null }, 'charge');
          if (won(r)) return st.next('crypt', `${r.text} 쓰러진 해골들이 기어 나온 곳을 따라가니 낡은 납골당이 나왔다.`);
          return st.end(false, `${r.text} 새벽이 오자 해골들은 무덤으로 돌아갔다. 마을 사람들은 우리를 원망하는 눈으로 보았다.`);
        },
      },
      crypt: {
        title: '납골당',
        text: (g, st) => `납골당 깊은 곳, 푸른 불빛 아래 반쯤 썩은 원령이 떠 있다.${st.data.holy ? ' 성수의 기운에 놈이 움찔한다.' : ''}`,
        choices: () => [{ label: '맞선다', key: 'charge' }, { label: '마법으로 먼저 친다', key: 'magic' }],
        resolve(g, rng, st, key) {
          const r = fight(g, rng, { unit: 'skeleton', count: st.data.holy ? 2 : 4, leader: 'tower_wraith' }, key);
          if (won(r)) return st.next('cause', r.text);
          return st.end(false, `${r.text} 원령의 웃음소리가 납골당에 오래 울렸다.`);
        },
      },
      cause: {
        title: '금지된 책',
        text: () => '원령이 사라진 자리에 검게 그을린 책 한 권이 펼쳐져 있다. 마신 시대의 사령술서다. 첫 장에 이 골짜기 영주 동생의 이름이 적혀 있었다.',
        choices: () => [{ label: '책을 영주에게 넘긴다', key: 'lord' }, { label: '책을 내가 갖는다', key: 'keep' }, { label: '그 자리에서 불태운다', key: 'burn' }],
        resolve(g, rng, st, key) {
          if (key === 'lord') { g.player.money += 80; L(g).renown += 3; return st.end(true, '영주는 동생을 수도원 탑에 가두었다. 은화 80닢과 함께, 이 일은 없던 일로 하자는 눈빛을 받았다.'); }
          if (key === 'keep') { gainSkill(g, 'magic', 3, 'int'); L(g).notoriety += 5; for (const p of members(g)) addLoyalty(p, p.traits.includes('pious') || p.comp.role === 'healer' ? -12 : -2); return st.end(true, '책을 품에 넣었다. 밤마다 책장이 저절로 넘어가는 소리가 들린다. 치유사의 눈길이 차가워졌다.'); }
          L(g).renown += 4; stress(g, -5);
          return st.end(true, '책은 비명 같은 소리를 내며 탔다. 그날 밤부터 골짜기의 무덤은 조용해졌다. 마을 사람들이 우리 이름으로 초를 밝혔다.');
        },
      },
    },
  },

  courier: {
    title: '왕도의 밀서', places: ['leocast', 'verden'], minParty: 1,
    pitch: '봉인된 밀서 한 통을 베르덴 성채까지 날라 달라는 의뢰. 보낸 이의 이름은 없고, 보수는 지나치게 후하다.',
    first: 'road',
    steps: {
      road: {
        title: '어느 길로',
        text: () => '밀서를 품에 넣었다. 큰길은 빠르지만 눈이 많고, 산길은 느리지만 숨기 좋다.',
        choices: (g) => [{ label: '큰길로 서둘러 간다', key: 'main' }, { label: '산길로 돌아간다', key: 'hill' }, ...(withRole(g, 'scout') ? [{ label: `척후 ${withRole(g, 'scout').name}에게 앞길을 살피게 한다`, key: 'scout' }] : [])],
        resolve(g, rng, st, key) {
          st.data.route = key;
          return st.next('ambush', key === 'scout' ? '척후가 하루 앞서 걸으며 길을 살폈다. 사흘째, 그가 돌아와 낮게 말했다. "앞 고개에 매복이 있어."' : key === 'hill' ? '산길은 고요했다. 너무 고요했다.' : '큰길에는 사람이 많았다. 그중 몇이 우리를 너무 오래 쳐다보았다.');
        },
      },
      ambush: {
        title: '고갯길의 매복',
        text: (g, st) => `고개 마루에서 복면을 쓴 자들이 길을 막았다. 군용 장검을 든 걸 보니 그냥 도적이 아니다.${st.data.route === 'scout' ? ' 미리 알고 왔으니 놈들 뒤를 칠 수 있다.' : ''}`,
        choices: (g, st) => [...(st.data.route === 'scout' ? [{ label: '놈들 뒤로 돌아 기습한다', key: 'ambush' }] : []), { label: '맞서 싸운다', key: 'charge' }, { label: '밀서를 버리고 달아난다', key: 'flee' }],
        resolve(g, rng, st, key) {
          if (key === 'flee') return st.end(false, '밀서를 길에 던지고 달렸다. 놈들은 쫓아오지 않았다. 원하던 것은 우리 목숨이 아니었던 모양이다.');
          // 충성이 바닥인 욕심 많은 동료는 매복한 자들에게 붙는다
          const traitor = members(g).find((p) => p.comp.loyalty < 30 && p.traits.includes('greedy'));
          let pre = '';
          if (traitor) { leave(g, traitor, '돈을 받고 옛 동료를 배신했다.'); traitor.affection = -60; pre = `싸움이 시작되자 ${J(traitor.name, '이/가')} 칼끝을 우리 쪽으로 돌렸다. 처음부터 놈들과 말이 되어 있었던 것이다. `; note(g, `동료였던 ${J(traitor.name, '이/가')} 배신했다.`); }
          const r = fight(g, rng, { unit: 'deserter', count: st.data.route === 'scout' ? 3 : 4 + (traitor ? 1 : 0), leader: 'bandit_chief' }, key);
          if (won(r)) return st.next('letter', `${pre}${r.text}`);
          return st.end(false, `${pre}${r.text} 정신을 차려 보니 품 안의 밀서가 없었다.`);
        },
      },
      letter: {
        title: '밀서',
        text: () => '쓰러진 자객의 품에서 루돌프 왕자 쪽 귀족의 인장이 나왔다. 밀서는 베르덴 백작에게 보내는 경고다. 왕자파가 백작을 칠 준비를 한다는.',
        choices: () => [{ label: '그대로 백작에게 전한다', key: 'deliver' }, { label: '밀서를 왕자파에 되판다', key: 'sell' }, { label: '불태우고 잊는다', key: 'burn' }],
        resolve(g, rng, st, key) {
          if (key === 'deliver') { g.player.money += 90; L(g).renown += 5; nudge(g, 'rudolf', -3); return st.end(true, '백작은 밀서를 읽고 오래 창밖을 보았다. 은화 90닢, 그리고 "그대에게 빚을 졌다"는 한마디.'); }
          if (key === 'sell') { g.player.money += 170; L(g).notoriety += 6; nudge(g, 'rudolf', 3); for (const p of members(g)) addLoyalty(p, p.traits.includes('kind') ? -10 : 0); return st.end(true, '왕자파의 사자는 은화 170닢을 세어 주며 웃었다. 베르덴 백작이 그 뒤에 어떻게 되었는지는 알고 싶지 않았다.'); }
          return st.end(true, '밀서는 재가 되었다. 누구의 편도 들지 않는 것도 선택이다. 보수는 받지 못했다.');
        },
      },
    },
  },
};

function finish(g, st, saved, text) {
  g.player.money += saved === 3 ? 60 : 30;
  L(g).renown += saved === 3 ? 5 : 2;
  if (saved < 3) stress(g, 15);
  return st.end(true, `${text} 마을 사람들이 은화 ${saved === 3 ? 60 : 30}닢을 모아 주었다.`);
}

/* ---------- 긴 의뢰 받기 ---------- */
const available = (g) => Object.entries(STORIES).filter(([id, S]) => !P(g).stories[id] && S.places.includes(L(g).place) && members(g).length >= S.minParty);

ACTIONS.push({
  id: 'party_quest',
  name: '긴 의뢰 받기',
  icon: 'scroll',
  desc: '동료와 함께 몇 달에 걸친 의뢰를 맡는다.',
  available: (g) => isAdult(g) && !traveling(g) && !P(g).story && available(g).length > 0 && !sceneQueued(g, 'story_pick'),
  run(g) { queueScene(g, 'story_pick'); return '주점과 게시판에서 큰일을 찾았다.'; },
});

defineScene('story_pick', {
  title: () => '긴 의뢰',
  text: (g) => available(g).map(([, S]) => `${S.title}: ${S.pitch}`).join(' '),
  choices: (g) => [...available(g).map(([id, S]) => ({ label: `'${S.title}'${J(S.title, '을/를').slice(S.title.length)} 맡는다`, key: id })), { label: '아직은 아니다', key: 'none' }],
  resolve(g, rng, s, key) {
    const S = STORIES[key];
    if (!S) return '게시판 앞을 떠났다.';
    P(g).story = { id: key, title: S.title, step: S.first, steps: 1, due: monthIndex(g) + 1, data: {} };
    note(g, `긴 의뢰 '${S.title}'${J(S.title, '을/를').slice(S.title.length)} 맡았다.`);
    return `${S.pitch} 동료들과 눈을 맞추고 의뢰서에 이름을 적었다. 다음 달에 떠난다.`;
  },
});

defineScene('story_step', {
  title: (g) => { const st = P(g).story; if (!st) return '긴 의뢰'; return `${st.title}: ${STORIES[st.id].steps[st.step].title}`; },
  text: (g) => { const st = P(g).story; if (!st) return '맡았던 의뢰는 이미 끝났다.'; return STORIES[st.id].steps[st.step].text(g, st); },
  choices: (g) => { const st = P(g).story; return st ? STORIES[st.id].steps[st.step].choices(g, st) : [{ label: '알겠다', key: 'none' }]; },
  resolve(g, rng, s, key) {
    const st = P(g).story;
    if (!st) return '의뢰서를 접어 넣었다.';
    const S = STORIES[st.id];
    // 다음 걸음과 끝맺음 도우미. 저장되는 이야기 상태(st)에는 함수를 붙이지 않고, 따로 만든 ctx로 넘긴다.
    const ctx = {
      data: st.data,
      next: (step, text) => { st.step = step; st.steps += 1; st.due = monthIndex(g) + 1; return text; },
      end: (ok, text) => {
        P(g).stories[st.id] = ok ? 'done' : 'failed';
        P(g).story = null;
        for (const p of members(g)) addLoyalty(p, ok ? 6 : -5);
        if (ok) { chron(g, `${g.player.name}, 동료들과 '${S.title}' 의뢰를 해내다.`, 60); note(g, `'${S.title}' 의뢰를 마쳤다.`); }
        else note(g, `'${S.title}' 의뢰에 실패했다.`);
        return text;
      },
    };
    const out = S.steps[st.step].resolve(g, rng, ctx, key);
    return out;
  },
});

HOOKS.afterMonth.push((g) => {
  if (g.over) return;
  const st = P(g).story;
  if (!st || traveling(g) || sceneQueued(g, 'story_step')) return;
  // 동료가 모두 떠나면 의뢰도 흐지부지된다
  if (!members(g).length) { P(g).stories[st.id] = 'failed'; P(g).story = null; g.news.unshift({ text: `동료들이 모두 떠나 '${st.title}' 의뢰를 접었다.`, rel: 90 }); return; }
  if (monthIndex(g) >= (st.due ?? 0)) queueScene(g, 'story_step', {}, { first: true });
});

export { ROLES };
