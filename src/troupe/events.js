// 극단 안팎의 일: 검열, 길 위의 사고, 단원 다툼, 극단 안의 사랑, 귀족 연회, 돈궤 도둑.
import { me } from '../game.js';
import { L, defineScene, note, chron, stress, tired, check } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { J } from '../narrative/text.js';
import { T, myTroupe, withTroupe, mi, clamp, here, placeName, free, stat, ACTS, actSkill, tasteOf, crowdOf, nextStops, logTroupe, leaveTroupe } from './core.js';
import { travelMonths } from '../places.js';

const EVS = ['censor', 'road', 'quarrel', 'love', 'lover', 'feast', 'theft'];
const ROADS = ['axle', 'bandits', 'river', 'sick', 'mud'];
const mem = (g, id) => myTroupe(g)?.members.find((m) => m.id === id) ?? null;
const pay = (g, n) => { const p = Math.min(n, g.player.money); g.player.money -= p; return p; };
const married = (g) => me(g)?.spouseId != null;

defineScene('troupe_event', {
  need: (g, s) => free(g) && withTroupe(g) && EVS.includes(s.ev)
    && (s.ev !== 'road' || ROADS.includes(s.kind))
    && (s.ev !== 'road' || s.kind !== 'sick' || myTroupe(g).members.length > 0)
    && (s.ev !== 'quarrel' || (!!mem(g, s.a) && !!mem(g, s.b) && s.a !== s.b))
    && (s.ev !== 'love' || (!!mem(g, s.a) && !myTroupe(g).members.some((m) => m.love >= 60)))
    && (s.ev !== 'lover' || myTroupe(g).members.some((m) => m.love >= 60))
    && (s.ev !== 'feast' || crowdOf(here(g)) >= 2)
    && (s.ev !== 'theft' || myTroupe(g).own)
    && (s.ev !== 'censor' || s.pl === here(g)),
  title: (g, s) => ({ censor: '검열관', road: '길 위에서', quarrel: '천막 뒤의 다툼', love: '무대 뒤', lover: '둘만의 밤', feast: '귀족의 연회', theft: '빈 돈궤' }[s.ev]),
  text: (g, s) => {
    const t = myTroupe(g);
    switch (s.ev) {
      case 'censor': return `공연이 끝나기도 전에 ${placeName(here(g))}의 검열관이 경비병을 데리고 천막에 들어왔다. 대본을 내놓으라고 한다. "영주님을 돼지로 그린 게 누구 머리에서 나왔나."`;
      case 'road': return {
        axle: '산길 중턱에서 수레 굴대가 부러졌다. 해는 지고, 짐은 무겁다.',
        bandits: '고갯마루에서 도적 떼가 길을 막았다. 우두머리가 수레 덮개를 칼끝으로 들춰 보고 웃었다. "광대들이로군."',
        river: '불어난 강이 다리를 삼켰다. 건너편이 다음 고장이다.',
        sick: `${J(t.members[0]?.name ?? '단원 하나', '이/가')} 열에 들떠 수레 위에서 일어나지 못한다. 다음 고장까지는 아직 멀다.`,
        mud: '봄비에 길이 진창이 되었다. 수레바퀴가 무릎까지 빠졌다.',
      }[s.kind];
      case 'quarrel': { const a = mem(g, s.a), b = mem(g, s.b); return `${J(a.name, '과/와')} ${J(b.name, '이/가')} 천막 뒤에서 멱살을 잡았다. ${a.name}의 말로는 ${J(b.name, '이/가')} 무대에서 제 차례를 가로챘고, ${b.name}의 말로는 ${J(a.name, '이/가')} 술에 취해 박자를 놓쳤다고 한다.`; }
      case 'love': { const a = mem(g, s.a); return `공연이 끝나면 ${J(a.name, '이/가')} 늘 내 옆자리에 앉는다. 오늘 밤 모닥불 가에서 ${J(a.name, '이/가')} 내 손등에 손을 얹었다.${married(g) ? ' 집에 두고 온 사람이 떠오른다.' : ''}`; }
      case 'lover': { const a = myTroupe(g).members.find((m) => m.love >= 60); return `${J(a.name, '이/가')} 수레 위에서 별을 보며 말했다. "언제까지 떠돌 거야? 어딘가 눌러앉아 둘이 살면 안 될까."`; }
      case 'feast': return `${placeName(here(g))}의 귀족 집안에서 사람이 왔다. 다음 주 연회에서 놀아 달라고 한다. 은화를 넉넉히 주겠다고. 손님 중에는 이 고장 영주의 사람들도 있다고 한다.`;
      case 'theft': return '아침에 보니 돈궤가 비어 있다. 자물쇠는 멀쩡하다. 열쇠가 있는 사람은 나와 단원들뿐이다.';
      default: return '';
    }
  },
  choices: (g, s) => {
    const m = g.player.money, t = myTroupe(g);
    switch (s.ev) {
      case 'censor': return [...(m >= 20 * tasteOf(here(g)).censor ? [{ label: `벌금을 낸다 (은화 ${20 * tasteOf(here(g)).censor}닢)`, key: 'fine' }] : []), { label: '대본을 내주고 불사르게 한다', key: 'burn' }, ...(nextStops(here(g)).length ? [{ label: '밤에 수레를 몰아 고장을 뜬다', key: 'flee' }] : []), { label: '"웃자고 한 연극이오" 하고 버틴다', key: 'stand' }];
      case 'road': return {
        axle: [...(m >= 12 ? [{ label: '근처 마을 목수를 부른다 (은화 12닢)', key: 'pay' }] : []), { label: '다 같이 밤새 고친다', key: 'fix' }],
        bandits: [{ label: '통행세를 낸다', key: 'pay' }, { label: '맞서 싸운다', key: 'fight' }, { label: '도적들 앞에서 한바탕 놀아 준다', key: 'play' }],
        river: [{ label: '물이 빠질 때까지 기다린다', key: 'wait' }, { label: '얕은 데를 찾아 건넌다', key: 'cross' }],
        sick: [...(m >= 8 ? [{ label: '약초를 구해 먹인다 (은화 8닢)', key: 'pay' }] : []), { label: '수레에 눕혀 함께 간다', key: 'carry' }, ...(t.members.length ? [{ label: '마을에 두고 간다', key: 'leave' }] : [])],
        mud: [{ label: '다 같이 밀어 올린다', key: 'push' }, { label: '짐을 덜어 버린다', key: 'drop' }],
      }[s.kind];
      case 'quarrel': { const a = mem(g, s.a), b = mem(g, s.b); return [{ label: `${a.name}의 편을 든다`, key: 'a' }, { label: `${b.name}의 편을 든다`, key: 'b' }, { label: '술 한 병 놓고 둘을 앉힌다', key: 'drink' }, ...(t.own ? [{ label: '둘 다 이번 달 무대에서 뺀다', key: 'bench' }] : [])]; }
      case 'love': return [{ label: '손을 맞잡는다', key: 'yes' }, { label: '가만히 손을 뺀다', key: 'no' }];
      case 'lover': return [{ label: '함께 극단을 떠나 눌러앉는다', key: 'settle' }, { label: '"조금만 더 떠돌자"', key: 'wait' }, { label: '이제 그만 끝내자고 한다', key: 'end' }];
      case 'feast': return [{ label: '흥을 돋우는 놀음을 한다', key: 'merry' }, { label: '주인 집안을 추어올리는 연극을 한다', key: 'flatter' }, ...(actSkill(g, 'play') >= 25 ? [{ label: '손님들 앞에서 풍자극을 올린다', key: 'satire' }] : []), { label: '사양한다', key: 'no' }];
      case 'theft': return [{ label: '단원들을 모아 따진다', key: 'accuse' }, { label: '모른 척 넘긴다', key: 'let' }, { label: '내 탓이라며 새 자물쇠를 단다', key: 'lock' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const t = myTroupe(g), st = T(g);
    if (!t) return '극단은 이미 없었다.';
    switch (s.ev) {
      case 'censor': {
        const c = tasteOf(here(g)).censor;
        if (key === 'fine') { const p = pay(g, 20 * c); return `은화 ${p}닢을 세어 주었다. 검열관은 대본 한 장을 찢어 들고 나갔다. "다음엔 영주님을 사자로 그리게."`; }
        if (key === 'burn') { t.satire = false; t.fame = clamp(t.fame - 3, 0, 100); stress(g, 5); return '대본이 화로에서 오그라들었다. 각본을 쓴 단원이 등을 돌리고 울었다.'; }
        if (key === 'flee') {
          const to = nextStops(here(g))[0];
          st.banned[here(g)] = mi(g) + 24;
          L(g).travel = { to, left: travelMonths(here(g), to), from: here(g) }; t.moving = to; t.place = to; t.stay = 0;
          t.fame = clamp(t.fame + 3, 0, 100);
          logTroupe(g, `${placeName(L(g).travel.from)}에서 쫓기듯 떠났다. 두 해 동안 그 고장 무대에는 못 선다.`);
          return `천막을 걷을 새도 없이 수레를 몰았다. 성문이 닫히기 직전에 빠져나갔다. ${placeName(L(g).travel.from)}에는 당분간 발을 못 붙인다. 그 대신 그 연극 이야기가 우리보다 먼저 다음 고장에 닿았다.`;
        }
        st.banned[here(g)] = mi(g) + 24;
        deed(g, 'brave', 2, '검열관 앞에서 풍자극을 굽히지 않았다.');
        if (c >= 3 || !check(rng, stat(g, 'cha'), 50)) {
          if (t.members.length && rng.chance(0.5)) { const m = rng.pick(t.members); t.members.splice(t.members.indexOf(m), 1); logTroupe(g, `${J(m.name, '이/가')} 검열관에게 끌려갔다.`); stress(g, 10); return `경비병들이 각본을 썼다는 이유로 ${J(m.name, '을/를')} 끌고 갔다. 우리는 그 고장 무대에 두 해 동안 설 수 없게 되었다.`; }
          g.player.injuries.push({ name: '광장에서 맞은 태형 자국', months: 2 }); stress(g, 10);
          return '광장 기둥에 묶여 매를 맞았다. 구경꾼 중 몇은 고개를 돌렸고, 몇은 박수를 쳤다. 이 고장 무대에는 두 해 동안 설 수 없다.';
        }
        t.fame = clamp(t.fame + 5, 0, 100);
        return '"웃자고 한 연극이오." 검열관은 한참 노려보다 돌아섰다. 다음 날 밤 천막은 더 꽉 찼다. 다만 이 고장에서 다시 공연하라는 허가는 나오지 않을 것이다.';
      }
      case 'road': {
        if (s.kind === 'axle') { if (key === 'pay') { const p = pay(g, 12); t.wagon = clamp(t.wagon + 20, 0, 100); return `목수가 새 굴대를 깎아 끼웠다. 은화 ${p}닢.`; } tired(g, 14); t.wagon = clamp(t.wagon + 10, 0, 100); return '횃불 아래서 밤새 굴대를 묶었다. 새벽에 수레가 다시 굴렀다. 손바닥이 다 까졌다.'; }
        if (s.kind === 'bandits') {
          if (key === 'pay') { const p = pay(g, Math.max(5, Math.round(g.player.money * 0.25))); return `은화 ${p}닢을 내밀었다. 우두머리가 모자를 기울여 보였다. "좋은 공연 하쇼."`; }
          if (key === 'play') { if (check(rng, Math.max(actSkill(g, 'clown'), actSkill(g, 'music'), actSkill(g, 'play')), 45)) { t.fame = clamp(t.fame + 3, 0, 100); return '고갯마루에서 한바탕 놀았다. 도적들이 배를 잡고 웃더니 길을 터 주었다. 우두머리는 은화 두 닢을 던져 주기까지 했다.'; } const p = pay(g, Math.round(g.player.money * 0.4)); return `도적들은 하품을 했다. 은화 ${p}닢과 우리 의상 궤짝 하나를 가져갔다.`; }
          if (check(rng, stat(g, 'str') * 0.5 + stat(g, 'agi') * 0.5, 50)) { deed(g, 'brave', 2, '극단 수레를 도적에게서 지켰다.'); return '곡예사들이 장대를 휘둘렀고 나는 맨 앞에 섰다. 도적들은 생각보다 겁이 많았다.'; }
          g.player.injuries.push({ name: '도적 칼에 베인 팔', months: 2 }); const p = pay(g, Math.round(g.player.money * 0.4)); return `칼날이 팔을 그었다. 도적들은 은화 ${p}닢을 챙겨 사라졌다.`;
        }
        if (s.kind === 'river') { if (key === 'wait') { stress(g, 4); tired(g, -4); return '강가에서 닷새를 기다렸다. 단원들은 낚시를 하고 새 노래를 지었다.'; } t.wagon = clamp(t.wagon - 20, 0, 100); return rng.chance(0.5) ? '허리까지 오는 물을 건넜다. 의상 궤짝 하나가 떠내려갔다.' : '물살에 수레가 기울었지만 넘어지지는 않았다. 건너편에서 모두 주저앉아 웃었다.'; }
        if (s.kind === 'sick') {
          const m = t.members[0];
          if (!m) return '아픈 사람은 이미 없었다.';
          if (key === 'pay') { pay(g, 8); m.mood = clamp(m.mood + 15, 0, 100); return `약초 달인 물을 먹였다. 사흘 만에 ${J(m.name, '이/가')} 일어나 앉아 배고프다고 했다.`; }
          if (key === 'leave') { t.members.splice(0, 1); deed(g, 'kind', -3, '앓는 단원을 낯선 마을에 두고 떠났다.'); logTroupe(g, `앓는 ${J(m.name, '을/를')} 마을에 두고 왔다.`); return `${J(m.name, '을/를')} 마을 신전 앞에 눕혀 두고 왔다. 수레가 출발할 때 아무도 말하지 않았다.`; }
          tired(g, 8); m.mood = clamp(m.mood + 8, 0, 100); return rng.chance(0.75) ? `${J(m.name, '을/를')} 수레에 눕혀 끌었다. 다음 고장에 닿을 무렵 열이 내렸다.` : (t.members.splice(0, 1), logTroupe(g, `${J(m.name, '이/가')} 길에서 숨을 거두었다.`), `${J(m.name, '은/는')} 다음 고장에 닿지 못했다. 길가 언덕에 묻고, 무대 의상을 덮어 주었다.`);
        }
        if (key === 'push') { tired(g, 12); return '다 같이 어깨를 대고 밀었다. 진흙투성이가 된 서로를 보고 웃었다.'; }
        t.wagon = clamp(t.wagon + 5, 0, 100); t.fame = clamp(t.fame - 1, 0, 100); return '무대 장치 몇 개를 길가에 버렸다. 수레가 가벼워졌다. 다음 공연은 조금 초라할 것이다.';
      }
      case 'quarrel': {
        const a = mem(g, s.a), b = mem(g, s.b);
        if (!a || !b) return '둘 중 하나는 이미 떠났다.';
        if (key === 'a' || key === 'b') { const w = key === 'a' ? a : b, l = key === 'a' ? b : a; w.mood = clamp(w.mood + 10, 0, 100); l.mood = clamp(l.mood - 20, 0, 100); if (l.mood < 15 && t.own) { t.members.splice(t.members.indexOf(l), 1); logTroupe(g, `${J(l.name, '이/가')} 다툼 끝에 떠났다.`); return `${J(w.name, '이/가')} 옳다고 했다. ${J(l.name, '은/는')} 그날 밤 짐을 쌌다.`; } return `${J(w.name, '이/가')} 옳다고 했다. ${J(l.name, '은/는')} 며칠 동안 나와 말을 섞지 않았다.`; }
        if (key === 'bench') { a.mood = clamp(a.mood - 8, 0, 100); b.mood = clamp(b.mood - 8, 0, 100); t.fame = clamp(t.fame - 1, 0, 100); return '둘 다 무대에서 뺐다. 빈자리를 메우느라 남은 단원들이 고생했다. 둘은 같은 편이 되어 나를 욕했다.'; }
        if (check(rng, stat(g, 'cha'), 40)) { a.mood = clamp(a.mood + 8, 0, 100); b.mood = clamp(b.mood + 8, 0, 100); return '술 한 병을 사이에 두고 앉혔다. 한 시간 뒤 둘은 어깨동무를 하고 옛날 노래를 불렀다.'; }
        return '술병만 비었다. 둘은 다음 날도 서로를 보지 않았다.';
      }
      case 'love': {
        const a = mem(g, s.a);
        if (!a) return '그 단원은 이미 떠났다.';
        if (key === 'no') { a.mood = clamp(a.mood - 15, 0, 100); return `${J(a.name, '은/는')} 웃으며 손을 거두었다. 그 뒤로 옆자리에 앉지 않았다.`; }
        a.love = 70; a.mood = clamp(a.mood + 20, 0, 100);
        if (married(g)) deed(g, 'loyal', -5, '떠돌이 극단에서 다른 사람과 정을 나누었다.');
        logTroupe(g, `${J(a.name, '과/와')} 정이 들었다.`);
        return `그날 밤부터 ${J(a.name, '과/와')} 한 수레에서 잤다. 단원들은 다 알면서 모르는 척했다.${married(g) ? ' 집으로 가는 편지는 점점 짧아졌다.' : ''}`;
      }
      case 'lover': {
        const a = t.members.find((m) => m.love >= 60);
        if (!a) return '그 사람은 이미 떠났다.';
        if (key === 'settle') {
          const name = a.name;
          leaveTroupe(g, `${J(name, '과/와')} 함께 극단을 떠나 눌러앉았다`);
          note(g, `${J(name, '과/와')} 함께 ${placeName(here(g))}에 눌러앉았다.`);
          chron(g, `${g.player.name}, 떠돌이 생활을 접고 ${placeName(here(g))}에 눌러앉다.`, 30);
          stress(g, -10);
          return `극단 사람들에게 마지막 인사를 했다. ${J(name, '과/와')} 둘이 ${placeName(here(g))} 변두리에 작은 방을 얻었다. 아침에 눈을 떠도 수레가 흔들리지 않는다.`;
        }
        if (key === 'end') { a.love = 0; a.mood = clamp(a.mood - 30, 0, 100); stress(g, 6); if (a.mood < 15) { t.members.splice(t.members.indexOf(a), 1); logTroupe(g, `${J(a.name, '이/가')} 떠났다.`); return `${J(a.name, '은/는')} 다음 고장에서 수레에서 내렸다. 작별 인사도 없었다.`; } return `${J(a.name, '은/는')} 오래 말이 없었다. 다음 날부터 무대 위에서만 웃었다.`; }
        a.mood = clamp(a.mood - 5, 0, 100); return `"조금만 더." ${J(a.name, '은/는')} 고개를 끄덕였다. 몇 번째 듣는 대답인지 둘 다 세지 않았다.`;
      }
      case 'feast': {
        if (key === 'no') return '정중히 사양했다. 귀족 집 하인은 코웃음을 치고 갔다.';
        const base = 20 * crowdOf(here(g));
        st.feasts += 1;
        if (key === 'merry') { g.player.money += base; t.fame = clamp(t.fame + 3, 0, 100); return `연회장 한가운데서 밤새 놀았다. 귀족들은 술잔을 들고 박수를 쳤다. 은화 ${base}닢.`; }
        if (key === 'flatter') { g.player.money += Math.round(base * 1.5); L(g).renown = (L(g).renown ?? 0) + 2; deed(g, 'honest', -1, '연회에서 귀족 집안을 지나치게 추어올렸다.'); return `주인 집안의 조상을 용을 벤 영웅으로 꾸민 연극을 올렸다. 주인은 눈물을 글썽였다. 은화 ${Math.round(base * 1.5)}닢과 다음 해에도 와 달라는 말.`; }
        // 풍자극
        st.satires += 1;
        if (check(rng, actSkill(g, 'play'), 55)) { t.fame = clamp(t.fame + 8, 0, 100); g.player.money += base; deed(g, 'brave', 3, '귀족들 앞에서 풍자극을 올렸다.'); return `귀족들 앞에서 귀족을 비웃는 연극을 했다. 처음엔 얼어붙었던 손님들이, 미운 경쟁 집안 이야기인 줄 알아채자 배를 잡고 웃었다. 은화 ${base}닢. 하인들 사이로 이야기가 퍼졌다.`; }
        T(g).banned[here(g)] = mi(g) + 24; g.player.injuries.push({ name: '연회장 하인들에게 맞은 등', months: 1 }); stress(g, 8);
        return '세 번째 장면에서 주인이 잔을 던졌다. 하인들이 우리를 뒷문 밖으로 끌어냈다. 이 고장에서는 두 해 동안 천막을 칠 수 없다.';
      }
      case 'theft': {
        const lost = pay(g, Math.min(30, Math.round(g.player.money * 0.3)));
        if (key === 'accuse') { const m = t.members.slice().sort((x, y) => x.mood - y.mood)[0]; if (m && rng.chance(0.6)) { g.player.money += lost; t.members.splice(t.members.indexOf(m), 1); logTroupe(g, `${J(m.name, '이/가')} 돈궤를 털다 들켜 쫓겨났다.`); return `${m.name}의 짐 보따리에서 은화가 나왔다. 그날로 내보냈다. 남은 단원들은 서로를 보지 못했다.`; } for (const x of t.members) x.mood = clamp(x.mood - 10, 0, 100); return `은화 ${lost}닢이 사라졌다. 따져 물었지만 아무도 나서지 않았다. 의심받은 단원들의 얼굴이 굳었다.`; }
        if (key === 'lock') { for (const x of t.members) x.mood = clamp(x.mood + 4, 0, 100); return `은화 ${lost}닢을 잃었다. 새 자물쇠를 달고 열쇠는 내가 찼다. 단원들은 아무 말도 듣지 않은 것에 고마워했다.`; }
        stress(g, 4); return `은화 ${lost}닢을 잃었다. 아무 일 없다는 듯 공연을 했다. 마음 한구석이 계속 쓰였다.`;
      }
      default: return '';
    }
  },
});
