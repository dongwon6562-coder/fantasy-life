// 예언과 징조의 사건: 장터의 거짓 예언자, 내 눈으로 본 징조, 왕자들의 예언 장사, 예언 속 사람을 노리는 자들,
// 예언 속 사람을 찾아오는 이들, 허락 없는 예언자를 부르는 교단.
import { EVENTS, check, stress } from '../events/core.js';
import { gainSkill } from '../game.js';
import { J } from '../narrative/text.js';
import { L, isAdult, note, chron } from '../adventure/core.js';
import { isJailed } from '../crime.js';
import { PLACES } from '../places.js';
import { LEONIA } from '../crisis/core.js';
import { faithState } from '../faith/index.js';
import { deed } from '../repute/index.js';
import { fallSick } from '../health/life.js';
import { OS, SIGNS, PROPHECIES, clamp, mi, olog, pending } from './state.js';
import { chosenOfMine } from './life.js';

const here = (g) => L(g).place;
const free = (g) => isAdult(g) && !L(g).travel && !isJailed(g);
const town = (g) => (PLACES[here(g)]?.house ?? 0) > 0;
const nm = (g) => g.player.name;
const subj = (g) => J(nm(g), '이/가');
const whoOf = (g, c) => (c.p.id === g.player.id ? '나' : c.p.name);

// ---------- 장터의 거짓 예언자 ----------
EVENTS.push({
  id: 'omen_false_prophet', cooldown: 72, weight: 3,
  chance: (g) => 0.12 + OS(g).belief / 400,
  cond: (g) => free(g) && town(g) && (OS(g).belief >= 30 || pending(g).length > 0),
  prepare: (g, rng) => ({ doom: rng.pick(['올겨울 안에 하늘이 갈라진다', '봉인이 다음 보름에 끊어진다', '왕도가 불에 탄다', '바다가 하르펜까지 올라온다']) }),
  title: '광장의 예언자',
  text: (g, c) => `삼베 자루를 뒤집어쓴 사내가 광장 분수대에 올라 있었다. "${c.doom}! 재물을 쥐고 있는 자는 그 재물과 함께 타리라!" 발치에 놓인 바구니에 은화가 쌓인다. 사내의 손톱은 깨끗하고, 자루 밑으로 비단 소매가 보였다.`,
  choices: [
    {
      label: '바구니에 은화를 넣는다',
      run: (g, rng) => {
        if (g.player.money < 3) return '넣을 은화가 없었다. 사내는 내 빈손을 보고 다음 사람에게 고개를 돌렸다.';
        g.player.money -= 3; stress(g, -2);
        return rng.chance(0.5) ? '은화 세 닢을 넣었다. 마음이 조금 놓였다. 무엇이 놓였는지는 모르겠다.' : '은화 세 닢을 넣었다. 그날 밤 꿈에 불타는 왕도가 나왔다. 사내의 말이 맞을까 봐 무서웠고, 틀릴까 봐 아까웠다.';
      },
    },
    {
      label: '거짓을 밝힌다',
      run: (g, rng) => {
        const O = OS(g);
        if (check(rng, g.player.stats.int * 0.5 + O.lore * 0.6 + (g.player.skills.letters ?? 0) * 0.3, 45)) {
          deed(g, 'honest', 5, `${subj(g)} 광장의 거짓 예언자를 말로 이겼다고 한다.`);
          O.lore = clamp(O.lore + 2, 0, 100);
          return '사내가 읊는 예언의 글귀를 받아서 끝까지 읊었다. 사내는 첫 줄밖에 몰랐다. 원래 글에는 왕도도 불도 없다. 사람들이 바구니를 도로 가져갔다. 사내는 비단 소매를 감추며 사라졌다.';
        }
        stress(g, 4);
        return '"이 자가 바로 재물을 쥔 자다!" 사내가 나를 가리키자 사람들이 나를 보았다. 무슨 말을 해도 소용이 없었다. 겁먹은 사람들은 무서운 말을 하는 쪽을 믿는다.';
      },
    },
    {
      label: '교단에 알린다',
      run: (g) => {
        const f = faithState(g);
        f.devotion = clamp(f.devotion + 2, 0, 100);
        olog(g, '광장의 거짓 예언자를 교단에 알렸다.');
        return '신전 문지기에게 말했다. 이튿날 사내는 광장에 없었다. 이단심문소 지하에 있다는 말도, 다음 고장으로 갔다는 말도 들렸다. 어느 쪽이든 그 바구니는 교단이 가져갔을 것이다.';
      },
    },
    { label: '지나친다', run: () => '못 들은 척 지나쳤다. 등 뒤에서 은화 떨어지는 소리가 계속 났다.' },
  ],
});

// ---------- 내 눈으로 본 징조 ----------
EVENTS.push({
  id: 'omen_witness', cooldown: 18, weight: 5,
  chance: () => 0.35,
  cond: (g) => free(g) && pending(g).some((s) => !s.read && mi(g) - s.start <= 3),
  prepare: (g) => ({ sid: pending(g).find((s) => !s.read && mi(g) - s.start <= 3)?.id ?? 0 }),
  title: '징조',
  text: (g, c) => {
    const s = OS(g).signs.find((x) => x.id === c.sid);
    return `${s ? s.text : '이상한 일이 있었다.'} 소문으로만 듣던 것을 이번에는 내 눈으로 보았다. 이웃들이 나를 붙잡고 무슨 뜻이냐고 묻는다.`;
  },
  choices: [
    {
      label: '옛 책을 뒤져 뜻을 찾는다',
      run: (g, rng, c) => {
        const O = OS(g), s = O.signs.find((x) => x.id === c.sid);
        O.lore = clamp(O.lore + 3, 0, 100);
        gainSkill(g, 'letters', 0.5, 'int');
        if (!s || s.end) return '책을 다 찾았을 때는 이미 지나간 일이 되어 있었다.';
        s.read = true;
        const right = rng.chance(clamp(0.4 + O.lore / 120 + g.player.stats.int / 400, 0.4, 0.92));
        s.judged = right ? s.pre : !s.pre;
        return `밤을 새워 옛 책을 뒤졌다. 이런 징조는 ${SIGNS[s.kind].portent}는 뜻이라고 한다. ${s.judged ? '이번에는 참된 징조라는 생각이 떨쳐지지 않는다.' : '하지만 같은 징조가 아무 일 없이 지나간 해도 많았다. 헛것일 것이다.'}`;
      },
    },
    {
      label: '신전에 알리고 기도한다',
      run: (g) => { const f = faithState(g); f.devotion = clamp(f.devotion + 2, 0, 100); stress(g, -2); return '사제는 내 말을 끝까지 듣고, 신께서 뜻을 보이실 때까지 기다리라고 했다. 기도를 드리고 나니 마음이 가라앉았다. 징조는 그대로였다.'; },
    },
    { label: '대수롭지 않게 넘긴다', run: (g) => { stress(g, -1); return '"별일 아니오." 이웃들에게 그렇게 말했다. 사람들은 조금 안심한 얼굴로 돌아갔다. 그 말이 맞기를 바란다.'; } },
  ],
});

// ---------- 왕자들의 예언 장사 ----------
EVENTS.push({
  id: 'omen_faction', cooldown: 30, weight: 5,
  chance: () => 0.4,
  cond: (g) => free(g) && town(g) && LEONIA.includes(here(g)) && !!g.realm && g.realm.succession !== 'settled' && !g.realm.king.alive && g.realm.rudolf.alive && g.realm.erik.alive,
  prepare: (g, rng) => ({ side: rng.pick(['rudolf', 'erik']), pay: rng.int(20, 45) }),
  title: '사자 왕관의 노래',
  text: (g, c) => `${c.side === 'rudolf' ? '수가 놓인 장갑을 낀 귀족가의 집사' : '왼쪽 귀가 반쯤 잘린 늙은 기사'}가 나를 술집 구석으로 불렀다. "사자 왕관의 예언을 아시오? 동쪽 별을 등진 쪽이 ${c.side === 'rudolf' ? '루돌프 왕자' : '에릭 왕자'}라는 것을, 장터 사람들이 알게만 해 주면 되오." 탁자 위에 은화 ${c.pay}닢이 놓였다.`,
  choices: [
    {
      label: '돈을 받고 노래를 퍼뜨린다',
      run: (g, rng, c) => {
        const r = g.realm, P = OS(g).prophecies.dynasty;
        g.player.money += c.pay;
        P.claims += 1; P.belief = clamp(P.belief + 2, 0, 100);
        r.rudolf.support = clamp(r.rudolf.support + (c.side === 'rudolf' ? 3 : -3), 0, 100);
        deed(g, 'honest', -2, `${subj(g)} 왕자의 돈을 받고 예언을 퍼뜨린다는 말이 돈다.`);
        olog(g, `사자 왕관의 예언을 ${c.side === 'rudolf' ? '루돌프' : '에릭'} 왕자 쪽으로 퍼뜨렸다.`);
        return `장터와 술집을 돌며 노래를 불렀다. 사흘째부터는 내가 부르지 않아도 사람들이 불렀다. 예언이란 게 이렇게 만들어지는구나 싶었다. 은화 ${c.pay}닢이 주머니에서 무거웠다.`;
      },
    },
    {
      label: '거절한다',
      run: (g, rng, c) => {
        if (rng.chance(0.3)) { stress(g, 3); return `"그럼 이 자리에 없었던 것으로 하시오." 그가 은화를 거둬 갔다. 그날부터 ${c.side === 'rudolf' ? '귀족가 사람들' : '기사단 사람들'}이 길에서 나를 오래 본다.`; }
        return '은화를 밀어 돌려주었다. 그는 어깨를 으쓱하고 다른 탁자로 갔다. 그 노래는 내 입이 아니어도 퍼질 것이다.';
      },
    },
    {
      label: '돈만 받고 반대로 퍼뜨린다',
      run: (g, rng, c) => {
        const r = g.realm;
        if (check(rng, g.player.stats.cha * 0.5 + g.player.stats.int * 0.3, 55)) {
          g.player.money += c.pay;
          r.rudolf.support = clamp(r.rudolf.support + (c.side === 'rudolf' ? -3 : 3), 0, 100);
          L(g).notoriety = (L(g).notoriety ?? 0) + 1;
          return '돈을 받고, 장터에서는 반대로 풀었다. 동쪽 별을 등진 쪽은 다른 왕자라고. 사람들은 그쪽 풀이를 더 좋아했다. 집사는 아직 모른다. 아직은.';
        }
        g.player.money += c.pay;
        L(g).notoriety = (L(g).notoriety ?? 0) + 3;
        stress(g, 6);
        return `반대로 퍼뜨린 것이 이레 만에 들통났다. 밤길에 사내 둘이 나를 벽에 밀어붙였다. 은화 ${c.pay}닢은 지켰지만 갈비뼈 하나는 지키지 못했다.`;
      },
    },
  ],
});

// ---------- 예언 속 사람을 노리는 자들 ----------
const huntable = (g) => chosenOfMine(g).find((c) => c.P.chosen.stance !== 'deny' || c.P.chosen.by === 'cult');
EVENTS.push({
  id: 'omen_hunter', cooldown: 48, weight: 4,
  chance: (g) => 0.15 + (huntable(g)?.P.belief ?? 0) / 300,
  cond: (g) => free(g) && !!huntable(g) && mi(g) - (huntable(g)?.P.chosen.at ?? 0) >= 4,
  prepare: (g, rng) => { const c = huntable(g); return { pro: c.pro, pid: c.p.id, by: c.pro === 'seal' ? (rng.chance(0.6) ? 'cult' : 'zealot') : rng.chance(0.5) ? 'zealot' : 'rival' }; },
  title: '밤의 손님',
  text: (g, c) => {
    const ch = chosenOfMine(g).find((x) => x.p.id === c.pid);
    const who = ch ? whoOf(g, ch) : '나';
    const by = { cult: '그림자가 옅은 사내 셋', zealot: '교단의 표식을 목에 건 광신도들', rival: '성광국 말씨를 쓰는 사람들' }[c.by];
    return `밤중에 개가 짖다 말았다. ${by}이 집 둘레를 돌고 있었다. ${PROPHECIES[c.pro].name} 속 사람을 찾는 것이다. ${who === '나' ? '나를' : `${J(who, '을/를')}`} 데려가려는 것인지, 없애려는 것인지는 알 수 없다.`;
  },
  choices: [
    {
      label: '칼을 들고 맞선다',
      run: (g, rng) => {
        const st = g.player.stats;
        if (check(rng, st.str * 0.4 + st.agi * 0.3 + (g.player.skills.sword ?? 0) * 0.6, 50)) {
          L(g).renown = (L(g).renown ?? 0) + 2;
          return '문을 박차고 나갔다. 어둠 속에서 몇 번 칼이 부딪쳤다. 그들은 생각보다 싸움에 서툴렀다. 하나가 피를 흘리며 달아났고 나머지가 그를 끌고 갔다. 아침에 문간에 핏자국이 남아 있었다.';
        }
        fallSick(g, 'rot', 'me', rng, 30);
        stress(g, 8);
        return '맞섰지만 셋을 당하지 못했다. 팔에 깊은 칼자국을 얻었다. 그들은 이웃이 횃불을 들고 나오자 물러갔다. 상처가 쉬이 아물 것 같지 않다.';
      },
    },
    {
      label: '식구를 데리고 밤길로 피한다',
      run: (g, rng) => {
        const lose = Math.min(g.player.money, rng.int(5, 15));
        g.player.money -= lose; stress(g, 6);
        return `짐도 제대로 못 싸고 뒷문으로 나왔다. 이웃 마을 헛간에서 사흘을 숨었다. 돌아와 보니 집은 뒤져져 있었고 은화 ${lose}닢이 없어졌다. 다음에는 더 멀리 가야 할지도 모른다.`;
      },
    },
    {
      label: '신전에 보호를 청한다',
      run: (g, rng, c) => {
        const f = faithState(g);
        if (c.by === 'zealot') { stress(g, 5); f.suspicion = clamp(f.suspicion + 4, 0, 100); return '신전에 달려갔다. 사제는 문을 열어 주었지만, 밖에 있는 자들이 교단의 표식을 걸고 있다는 말을 듣고 얼굴이 굳었다. "그들도 신의 뜻을 따른다고 믿는 사람들이오." 보호는 받았다. 교단의 눈길도 함께 받았다.'; }
        f.devotion = clamp(f.devotion + 3, 0, 100);
        return '신전 종이 울렸다. 성기사 둘이 와서 밤새 문 앞을 지켰다. 그들은 새벽에 사라졌다. 사제는 예언 속 사람은 교단의 보호 아래 있는 편이 좋다고 했다. 부탁이라기보다는 경고처럼 들렸다.';
      },
    },
  ],
});

// ---------- 예언 속 사람을 찾아오는 이들 ----------
const blessed = (g) => chosenOfMine(g).find((c) => c.P.chosen.stance === 'embrace' || c.P.chosen.stance === 'use');
EVENTS.push({
  id: 'omen_pilgrims', cooldown: 48, weight: 3,
  chance: () => 0.35,
  cond: (g) => free(g) && !!blessed(g),
  prepare: (g) => { const c = blessed(g); return { pid: c.p.id, pro: c.pro, use: c.P.chosen.stance === 'use' }; },
  title: '문 앞의 사람들',
  text: (g, c) => {
    const ch = chosenOfMine(g).find((x) => x.p.id === c.pid), who = ch ? whoOf(g, ch) : '나';
    return `새벽부터 문 앞에 사람들이 서 있었다. 열병 앓는 아이를 업은 어미, 눈 먼 노인, 빚쟁이에게 쫓기는 사내. ${who === '나' ? '나에게' : `${who}에게`} 손을 한 번 대 보려고 사흘 길을 걸어왔다고 한다. ${PROPHECIES[c.pro].name} 때문이다.`;
  },
  choices: [
    {
      label: '한 사람 한 사람 손을 잡아 준다',
      run: (g, rng, c) => {
        deed(g, 'kind', 3, `${subj(g)} 예언 속 사람을 찾아온 이들을 내치지 않았다고 한다.`);
        L(g).renown = (L(g).renown ?? 0) + 1;
        if (c.use) { const gift = rng.int(6, 18); g.player.money += gift; return `해가 질 때까지 손을 잡았다. 사람들이 은화 ${gift}닢을 두고 갔다. 받지 말까도 생각했지만 받았다. 노인이 내 손을 놓지 않고 울었다. 나는 아무것도 해 준 것이 없다.`; }
        return '해가 질 때까지 손을 잡았다. 아무것도 고쳐 주지 못했다. 그래도 사람들은 고개를 숙이고 돌아갔다. 노인이 내 손을 놓지 않고 울었다. 나는 아무것도 해 준 것이 없다.';
      },
    },
    {
      label: '돌려보낸다',
      run: (g) => {
        stress(g, -1);
        const ch = chosenOfMine(g)[0];
        if (ch) OS(g).prophecies[ch.pro].belief = clamp(OS(g).prophecies[ch.pro].belief - 1, 0, 100);
        return '"나는 아무것도 할 수 없소." 문을 닫았다. 문 너머에서 아이 우는 소리가 오래 났다. 예언 속 사람이 사람을 고칠 수 있다고 쓴 글은 어디에도 없다. 그래도 마음이 무거웠다.';
      },
    },
  ],
});

// ---------- 허락 없는 예언자를 부르는 교단 ----------
EVENTS.push({
  id: 'omen_church', cooldown: 36, weight: 6,
  chance: () => 0.5,
  cond: (g) => free(g) && town(g) && !OS(g).me.approved && OS(g).me.preached >= 2 && OS(g).me.banned <= mi(g),
  prepare: () => ({}),
  title: '이단심문소의 부름',
  text: (g) => {
    const M = OS(g).me;
    return `회색 옷의 심문관이 나를 불렀다. "${M.right > M.wrong ? '그대의 예언이 맞았다는 말을 들었소. 그래서 더 문제요.' : '그대의 예언이 빗나갔다는 말을 들었소.'} 신의 뜻을 전하는 것은 교단의 일이오. 허락 없이 미래를 외치는 자를 우리는 무엇이라 부르는지 아시오?"`;
  },
  choices: [
    {
      label: '예언을 그만두겠다고 맹세한다',
      run: (g) => { const O = OS(g); O.me.banned = mi(g) + 36; faithState(g).suspicion = clamp(faithState(g).suspicion - 6, 0, 100); stress(g, 3); return '맹세했다. 삼 년 동안 장터에서 미래를 입에 올리지 않기로. 심문관은 고개를 끄덕이고 장부의 내 이름 옆에 무언가를 적었다.'; },
    },
    {
      label: '교단의 이름으로 예언하겠다고 청한다',
      run: (g, rng) => {
        const O = OS(g), f = faithState(g);
        if (f.devotion >= 50 && check(rng, f.devotion * 0.5 + O.lore * 0.4 + O.me.right * 8, 55)) {
          O.me.approved = true; f.devotion = clamp(f.devotion + 4, 0, 100); f.suspicion = clamp(f.suspicion - 10, 0, 100);
          chron(g, `${subj(g)} 교단이 인정한 예언자가 되다.`, 50);
          note(g, '교단이 인정한 예언자가 되었다.');
          return '심문관은 한참 나를 보더니 대성당에 편지를 보냈다. 석 달 뒤 답이 왔다. 앞으로 내 예언은 교단의 예언이다. 맞으면 신의 뜻이고, 틀리면 내 탓이다.';
        }
        f.suspicion = clamp(f.suspicion + 6, 0, 100);
        O.me.banned = mi(g) + 24;
        return '"믿음이 얕은 자가 신의 입을 자처하는구려." 청은 받아들여지지 않았다. 대신 이 년 동안 예언을 금한다는 명이 떨어졌다.';
      },
    },
    {
      label: '나는 본 것을 말할 뿐이라고 맞선다',
      run: (g) => {
        const f = faithState(g);
        f.suspicion = clamp(f.suspicion + 12, 0, 100);
        deed(g, 'brave', 3, `${subj(g)} 이단심문소 앞에서도 제 예언을 굽히지 않았다고 한다.`);
        stress(g, 6);
        return '"나는 본 것을 말할 뿐이오." 심문관은 대답하지 않고 장부를 덮었다. 그날부터 회색 옷이 장터에서 자주 보인다. 내 예언을 들으러 오는 사람은 오히려 늘었다.';
      },
    },
  ],
});
