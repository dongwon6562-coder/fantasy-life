// 한탕 안팎의 일: 술집에서 입을 연 일행, 몫을 더 달라는 일행, 동료를 팔라는 경비대의 제안,
// 몫에 앙심을 품고 밀고한 옛 일행, 바짝 다가온 추적자, 문 앞에 선 추적자.
import { defineScene, chron, stress, tired, check } from '../adventure/core.js';
import { playerPower } from '../adventure/combat.js';
import { reportCrime, jail, addNotoriety } from '../crime.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { H, plan, atTarget, mi, clamp, free, stat, ROLES, logHeist, endPlan, hotWord, roleHave } from './core.js';

const EVS = ['caught', 'close', 'rat', 'blab', 'greed', 'informant'];
const mate = (g, id) => plan(g)?.crew.find((m) => m.id === id) ?? null;
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };

defineScene('heist_event', {
  need: (g, s) => free(g) && EVS.includes(s.ev)
    && (!['caught', 'close', 'rat'].includes(s.ev) || !!H(g).hunt || s.ev === 'rat')
    && (s.ev !== 'rat' || typeof s.who === 'string')
    && (!['blab', 'greed'].includes(s.ev) || (atTarget(g) && !!mate(g, s.a)))
    && (s.ev !== 'informant' || (atTarget(g) && plan(g).crew.length >= 1)),
  title: (g, s) => ({ caught: '문 앞의 발소리', close: '귀띔', rat: '입을 연 사람', blab: '술집의 큰 목소리', greed: '더 큰 몫', informant: '경비대장의 제안' }[s.ev]),
  text: (g, s) => {
    const h = H(g).hunt, p = plan(g);
    switch (s.ev) {
      case 'caught': return `새벽에 문을 두드리는 소리가 났다. 창틈으로 보니 ${J(h.by, '이/가')} 골목을 막고 있다. ${h.target} 일이다. 도망칠 틈은 뒷창문 하나뿐이다.`;
      case 'close': return `단골 술집 주인이 잔을 닦으며 낮게 말했다. "요즘 ${J(h.by, '이/가')} ${h.target} 일로 사람을 찾아다니더군. 자네 인상착의랑 비슷한 걸 묻던데."`;
      case 'rat': return `${J(s.who, '이/가')} 경비대 초소에 들어가는 걸 본 사람이 있다. 몫에 앙심을 품은 얼굴이었다고 한다.${h ? ` ${J(h.by, '이/가')} 곧 그 이야기를 들을 것이다.` : ''}`;
      case 'blab': { const m = mate(g, s.a); return `${ROLES[m.role].name} ${J(m.name, '이/가')} 술집에서 큰소리를 쳤다는 말이 돌아왔다. "곧 팔자 고칠 일이 있다"고, 그것도 ${p.owner} 사람들이 드나드는 술집에서.`; }
      case 'greed': { const m = mate(g, s.a); return `${ROLES[m.role].name} ${J(m.name, '이/가')} 밤늦게 찾아왔다. "생각해 보니 내가 제일 위험한 일을 하오. 선금을 은화 ${Math.round(m.fee * 1.5)}닢 더 주든지, 아니면 나는 빠지겠소."`; }
      case 'informant': return `경비대장이 사복 차림으로 내 옆자리에 앉았다. "${p.owner} 쪽을 노리는 패가 있다는 걸 알고 있소. 이름만 대시오. 당신 이름은 장부에서 빼 주지."`;
      default: return '';
    }
  },
  choices: (g, s) => {
    const m = g.player.money, h = H(g).hunt;
    switch (s.ev) {
      case 'caught': return [{ label: '뒷창문으로 뛰어내려 달아난다', key: 'flee' }, { label: '칼을 뽑고 맞선다', key: 'fight' }, ...(m >= 80 ? [{ label: '은화 80닢으로 눈감아 달라고 한다', key: 'bribe' }] : []), { label: '문을 열고 손을 내민다', key: 'give' }];
      case 'close': return [{ label: '고장을 떠나 멀리 간다', key: 'run' }, { label: '거짓 흔적을 흘린다', key: 'trail' }, ...(m >= 30 ? [{ label: '술집 주인에게 은화를 쥐여 입을 막는다', key: 'hush' }] : []), { label: '모른 척 지낸다', key: 'stay' }];
      case 'rat': return [{ label: '그 사람을 찾아가 따진다', key: 'face' }, ...(m >= 40 ? [{ label: '은화 40닢으로 말을 거두게 한다', key: 'buy' }] : []), { label: '그날로 짐을 싸서 뜬다', key: 'run' }];
      case 'blab': return [{ label: '불러서 겁을 준다', key: 'scare' }, { label: '일행에서 뺀다', key: 'cut' }, { label: '웃어넘긴다', key: 'laugh' }];
      case 'greed': { const mt = mate(g, s.a); return [...(m >= Math.round(mt.fee * 1.5) ? [{ label: `은화 ${Math.round(mt.fee * 1.5)}닢을 더 준다`, key: 'pay' }] : []), { label: '끝나면 몫을 더 주겠다고 약속한다', key: 'promise' }, { label: '빠지라고 한다', key: 'out' }]; }
      case 'informant': return [{ label: '일행의 이름을 판다', key: 'sell' }, { label: '거짓 이름을 댄다', key: 'lie' }, { label: '무슨 말인지 모르겠다고 한다', key: 'deny' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const st = H(g), h = st.hunt, p = plan(g);
    switch (s.ev) {
      case 'caught': {
        if (!h) return '골목은 비어 있었다.';
        if (key === 'flee') {
          if (check(rng, stat(g, 'agi') + stat(g, 'sen') * 0.3, 45 + h.pow * 0.3)) { h.clue = 55; tired(g, 15); stress(g, 8); return '뒷창문으로 뛰어내려 지붕을 넘었다. 발목이 시큰거렸지만 붙잡히지 않았다. 다시 처음부터 숨어야 한다.'; }
          return caught(g, '지붕 끝에서 발이 미끄러졌다. 아래에서 기다리던 손들이 나를 붙잡았다.');
        }
        if (key === 'fight') {
          if (check(rng, playerPower(g), h.pow + 15)) { st.hunt = null; reportCrime(g, 'resist'); addNotoriety(g, 4); deed(g, 'brave', 2, '쫓아온 추적자들을 칼로 물리쳤다더라.'); return `골목에서 칼을 맞댔다. 둘을 쓰러뜨리자 나머지가 물러났다. ${J(h.by, '이/가')} 다시 오려면 사람을 더 모아야 할 것이다.`; }
          g.player.injuries.push({ name: '추적자의 칼에 베인 어깨', months: 2 });
          return caught(g, '셋을 상대하기엔 칼이 하나였다. 어깨를 베이고 무릎을 꿇었다.');
        }
        if (key === 'bribe') { if (pay(g, 80) < 80) return caught(g, '은화가 모자랐다.'); if (rng.chance(h.pow >= 50 ? 0.4 : 0.7)) { h.clue = 30; return '우두머리가 은화 자루의 무게를 손으로 가늠했다. "이번 한 번이오." 골목에서 발소리가 멀어졌다.'; } return caught(g, '우두머리가 은화 자루를 받아 들고 웃었다. "이건 증거로 쓰지." 손목에 쇠가 감겼다.'); }
        return caught(g, '문을 열고 두 손을 내밀었다. 차라리 홀가분했다.');
      }
      case 'close': {
        if (!h) return '그 사람들은 이미 다른 데로 갔다.';
        if (key === 'run') { h.clue = clamp(h.clue - 25, 0, 100); stress(g, 4); return '그날 밤 짐을 꾸려 다른 고장으로 가는 수레에 올랐다. 돌아볼 때마다 따라오는 그림자가 없는지 보았다.'; }
        if (key === 'trail') { if (check(rng, stat(g, 'int') + stat(g, 'cha') * 0.3, 50)) { h.clue = clamp(h.clue - 30, 0, 100); return `반대쪽 고장 여관에 내 이름으로 방을 잡게 하고, 장물 한 점을 거기 장물아비에게 흘렸다. ${J(h.by, '이/가')} 그쪽으로 말을 몰았다는 소식이 들렸다.`; } h.clue = clamp(h.clue + 10, 0, 100); return '흘린 흔적이 너무 깔끔했다. 추적자는 오히려 냄새를 맡았다.'; }
        if (key === 'hush') { pay(g, 30); h.clue = clamp(h.clue - 12, 0, 100); return '술집 주인이 은화를 앞치마에 넣었다. "난 아무것도 못 봤네." 그 말이 얼마나 갈지는 모른다.'; }
        h.clue = clamp(h.clue + 5, 0, 100);
        return `아무 일 없다는 얼굴로 술잔을 비웠다. 쫓는 사람들은 ${hotWord(h.clue)}.`;
      }
      case 'rat': {
        if (key === 'face') {
          if (check(rng, stat(g, 'cha') + playerPower(g) * 0.2, 50)) { deed(g, 'brave', 1, null); return `${J(s.who, '을/를')} 골목 끝에서 붙잡았다. 그는 아직 아무 말도 안 했다고 맹세했다. 이번에는 믿기로 했다. 다음엔 없다.`; }
          if (h) h.clue = clamp(h.clue + 25, 0, 100);
          return `${J(s.who, '은/는')} 이미 고장을 떴다. 경비대 장부에는 내 인상착의가 적혔다.`;
        }
        if (key === 'buy') { pay(g, 40); const b = st.crewBook.find((x) => x.name === s.who); if (b) { b.grudge = false; b.loyal = 40; } return `은화 40닢을 건넸다. ${J(s.who, '은/는')} 경비대에 "잘못 본 것 같다"고 말을 바꿨다.`; }
        if (h) h.clue = clamp(h.clue + 10, 0, 100);
        stress(g, 6);
        return '그날로 짐을 쌌다. 입을 연 사람이 무엇을 얼마나 말했는지 모른 채 다른 고장으로 갔다.';
      }
      case 'blab': {
        const m = mate(g, s.a);
        if (!p || !m) return '그 사람은 이미 일행에 없다.';
        if (key === 'scare') { if (check(rng, playerPower(g) * 0.4 + stat(g, 'wil') * 0.3, 35)) { m.loyal = clamp(m.loyal + 5, 0, 100); p.alarm = clamp(p.alarm + 4, 0, 100); return `${J(m.name, '을/를')} 골목으로 불러 벽에 밀어붙였다. "한 번만 더 입을 열면 혀가 없을 거다." 그는 고개를 끄덕였다.`; } m.loyal = clamp(m.loyal - 15, 0, 100); p.alarm = clamp(p.alarm + 8, 0, 100); return `${J(m.name, '은/는')} 겁먹은 척 웃었다. 돌아서는 눈빛이 좋지 않았다.`; }
        if (key === 'cut') { p.crew.splice(p.crew.indexOf(m), 1); p.alarm = clamp(p.alarm + 6, 0, 100); st.crewBook.unshift({ name: m.name, role: m.role, skill: m.skill, loyal: 15, grudge: true }); if (st.crewBook.length > 10) st.crewBook.length = 10; return `${J(m.name, '을/를')} 일행에서 뺐다. 선금은 돌려받지 못했다. 그가 아는 것은 그대로 그의 머릿속에 남았다.`; }
        p.alarm = clamp(p.alarm + 12, 0, 100);
        return '술꾼 허풍을 누가 믿겠나 하고 웃어넘겼다. 그다음 주, 목표 앞 경비가 하나 늘었다.';
      }
      case 'greed': {
        const m = mate(g, s.a);
        if (!p || !m) return '그 사람은 이미 일행에 없다.';
        const more = Math.round(m.fee * 1.5);
        if (key === 'pay') { if (pay(g, more) < more) return '돈이 모자랐다.'; m.greed = clamp(m.greed - 15, 0, 100); m.loyal = clamp(m.loyal + 10, 0, 100); return `은화 ${more}닢을 더 쥐여 주었다. ${J(m.name, '은/는')} 만족스럽게 웃었다. 이런 사람은 다음에 또 온다.`; }
        if (key === 'promise') { m.greed = clamp(m.greed + 15, 0, 100); return `"끝나면 네 몫을 더 얹지." ${J(m.name, '이/가')} 그 말을 손가락으로 세며 외웠다.`; }
        p.crew.splice(p.crew.indexOf(m), 1); p.alarm = clamp(p.alarm + 8, 0, 100);
        st.crewBook.unshift({ name: m.name, role: m.role, skill: m.skill, loyal: 20, grudge: m.greed >= 60 }); if (st.crewBook.length > 10) st.crewBook.length = 10;
        return `${J(m.name, '은/는')} 문을 걷어차고 나갔다. ${ROLES[m.role].name} 자리가 비었다.`;
      }
      case 'informant': {
        if (!p) return '꾸미던 일은 이미 없다.';
        if (key === 'sell') {
          const names = p.crew.map((m) => m.name);
          for (const m of p.crew) { st.crewBook = st.crewBook.filter((b) => b.name !== m.name); st.crewBook.unshift({ name: m.name, role: m.role, skill: m.skill, loyal: 0, grudge: true }); }
          if (st.crewBook.length > 10) st.crewBook.length = 10;
          st.betrayed += 1;
          endPlan(g, '일행을 경비대에 팔았다');
          deed(g, 'loyal', -12, '같이 일을 꾸민 패거리를 경비대에 팔았다더라.');
          g.player.money += 30;
          st.grudge = { names: names.slice(0, 2), at: mi(g) + rng.int(12, 24) };
          chron(g, `${names.join(', ')}, 큰 도둑질을 꾸미다 붙잡히다.`, 40);
          return `이름들을 댔다. ${names.join(', ')}. 경비대장이 은화 30닢을 탁자에 놓고 일어섰다. 며칠 뒤 광장에서 그들이 끌려가는 걸 보았다. 하나가 군중 속의 나를 찾아냈다.`;
        }
        if (key === 'lie') { if (check(rng, stat(g, 'cha') + stat(g, 'int') * 0.3, 50)) { p.alarm = clamp(p.alarm - 10, 0, 100); return '엉뚱한 패거리의 이름을 댔다. 경비대가 그쪽을 쫓는 사이 목표 앞이 조금 한산해졌다.'; } p.alarm = clamp(p.alarm + 15, 0, 100); return '경비대장이 내 눈을 오래 보았다. "그 패는 지난달에 다 잡혔소." 그가 일어섰다.'; }
        p.alarm = clamp(p.alarm + 5, 0, 100);
        return '"무슨 말인지 모르겠소." 경비대장은 웃으며 술값을 내고 나갔다. 그가 나를 기억할 것이다.';
      }
      default: return '지나갔다.';
    }
  },
});
function caught(g, text) {
  const st = H(g), h = st.hunt;
  const months = h?.kind === 'tax' || h?.kind === 'temple' ? 14 : 9;
  st.caught += 1;
  if (st.loot) { logHeist(g, `장물 ${st.loot.value}닢 어치를 빼앗겼다.`); st.loot = null; }
  st.hunt = null;
  reportCrime(g, 'burglary', undefined, { mult: 2 });
  jail(g, months);
  logHeist(g, `${h?.target ?? '한탕'} 일로 붙잡혔다.`);
  return `${text} ${months}달 옥살이를 하게 되었다. 숨겨 둔 장물도 빼앗겼다.`;
}
export { roleHave };
