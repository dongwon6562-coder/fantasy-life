// 부엌 안팎의 일: 독을 타 달라는 청, 독살 의심, 쓰러진 시식관, 경쟁 요리사의 수작, 재료가 끊긴 달,
// 내 요리를 맛본 귀한 손님, 배우겠다는 아이, 상한 고기.
import { defineScene, chron, stress, tired, check } from '../adventure/core.js';
import { gainSkill } from '../game.js';
import { reportCrime } from '../crime.js';
import { deed } from '../repute/index.js';
import { courtState } from '../court/index.js';
import { activeAt, KINDS as NATURE } from '../nature/state.js';
import { J } from '../narrative/text.js';
import { CU, clamp, here, free, stat, cookSkill, atPost, cookPower, fullDish, dj, addFame, logCook, bestDish, leavePost, placeName, tasterName, postTitle } from './core.js';
import { lordOf } from './life.js';

const EVS = ['plot', 'suspect', 'taster', 'rival', 'shortage', 'guest', 'apprentice', 'spoiled'];
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const favor = (g, n) => { const p = CU(g).post; if (p) p.favor = clamp(p.favor + n, 0, 100); };
const courtUp = (g, n) => { if (CU(g).post?.kind !== 'court') return; const c = courtState(g); c.standing = clamp(c.standing + n, 0, 100); };
const learn = (g, b) => { const k = gainSkill(g, 'cooking', b, 'sen'); return k > 0.04 ? ` (요리 +${k.toFixed(1)})` : ''; };
const shortHere = (g) => activeAt(g, here(g)).find((d) => ['drought', 'flood', 'winter'].includes(d.kind)) ?? null;

defineScene('cuisine_event', {
  need: (g, s) => free(g) && EVS.includes(s.ev)
    && (!['plot', 'suspect', 'taster', 'shortage', 'spoiled'].includes(s.ev) || atPost(g))
    && (s.ev !== 'taster' || !!CU(g).taster)
    && (s.ev !== 'rival' || !!CU(g).rival)
    && (s.ev !== 'guest' || CU(g).dishes.length > 0),
  title: (g, s) => ({ plot: '검은 가루', suspect: '쓰러진 손님', taster: '시식관', rival: '경쟁 요리사', shortage: '빈 광', guest: '귀한 손님', apprentice: '부엌 문 앞의 아이', spoiled: '상한 고기' }[s.ev]),
  text: (g, s) => {
    const st = CU(g), lord = lordOf(g), d = bestDish(g);
    switch (s.ev) {
      case 'plot': return `장 보러 나간 길에 낯선 사내가 따라붙었다. 가문 문장을 가린 망토다. "${lord}의 다음 연회에 오는 손님 하나가 있소. 그 사람 잔에 이걸 조금만." 작은 주머니에서 쓴 냄새가 난다. "은화 200닢. 아무도 요리사를 의심하지 않소."`;
      case 'suspect': return `연회 이튿날 아침, 손님 하나가 피를 토하고 쓰러졌다는 소식이 왔다. 의원은 독이라고 했다. 경비병들이 부엌 문 앞에 섰다. 모두의 눈이 ${postTitle(st.post)}인 나에게 쏠렸다.`;
      case 'taster': return `${lord}의 저녁상. 시식관 ${J(st.taster.name, '이/가')} 포도주를 한 모금 머금더니 잔을 떨어뜨렸다. 입술이 파랗다. 그 잔은 주인의 것이었다. 부엌의 누군가가, 혹은 부엌에 드나든 누군가가 넣은 것이다.`;
      case 'rival': return `${J(st.rival.name, '이/가')} 장터에서 떠들고 다닌다. 내 요리를 먹고 배앓이를 한 사람이 셋이라고, 내 비법은 남의 것을 훔친 거라고. 단골 몇이 발길을 끊었다.`;
      case 'shortage': { const n = shortHere(g); return `${n ? `${J(NATURE[n.kind]?.name ?? '흉년', '이/가')} 들어 ` : '배가 늦게 들어와 '}광이 비었다. 고기는 두 배 값이고 밀가루는 바닥났다. 그런데 이번 주에도 ${lord}의 상은 차려야 한다.`; }
      case 'guest': return `낡은 외투를 입은 노인이 ${dj(d, '을/를')} 한 그릇 비우더니 요리사를 불렀다. 외투 안에 금실 수가 보인다. "이 요리, 어디서 배웠소? 내 집 요리사로 삼고 싶을 정도요. 아니면 비법을 파시오."`;
      case 'apprentice': return '열두어 살 된 아이가 사흘째 부엌 뒷문에 앉아 있다. 쫓아도 다시 온다. "설거지라도 할게요. 어깨너머로만 보게 해 주세요." 손가락에 데인 자국이 가득하다. 혼자 불을 다뤄 본 손이다.';
      case 'spoiled': return '오늘 아침 들어온 고기에서 냄새가 난다. 정육상은 멀쩡하다며 웃는다. 오늘 저녁 손님은 스무 명, 다른 고기를 구할 시간은 빠듯하다.';
      default: return '';
    }
  },
  choices: (g, s) => {
    const st = CU(g);
    switch (s.ev) {
      case 'plot': return [{ label: '거절하고 돌아선다', key: 'refuse' }, { label: `주머니를 받아 ${lordOf(g)}에게 그대로 들고 간다`, key: 'report' }, { label: '은화를 받고 주머니를 품에 넣는다', key: 'accept' }];
      case 'suspect': {
        const out = [];
        if (st.taster) out.push({ label: `시식관 ${J(st.taster.name, '이/가')} 같은 접시를 먹고도 멀쩡하다는 걸 보인다`, key: 'taster' });
        out.push({ label: '부엌 사람들을 하나하나 캐묻는다', key: 'probe' }, { label: '주인 앞에 나가 무릎 꿇고 결백을 말한다', key: 'plead' }, { label: '밤을 틈타 달아난다', key: 'flee' });
        return out;
      }
      case 'taster': return [{ label: '부엌을 뒤져 범인을 찾는다', key: 'find' }, { label: '은화 15닢을 들여 의원을 부른다', key: 'heal' }, { label: '그를 묻어 주고 입을 다문다', key: 'mourn' }];
      case 'rival': return [{ label: '장터 한복판에서 따진다', key: 'face' }, { label: '말 대신 요리로 갚는다', key: 'outdo' }, { label: '그의 부엌에 상한 고기를 몰래 넣는다', key: 'sabotage' }, { label: '내버려 둔다', key: 'ignore' }];
      case 'shortage': return [{ label: '있는 것으로 머리를 짜낸다', key: 'make' }, { label: '은화 20닢을 들여 비싼 재료를 산다', key: 'buy' }, { label: '죽과 빵으로 때운다', key: 'thin' }];
      case 'guest': return [{ label: '비법을 판다', key: 'sell' }, { label: '내 요리는 내 솥에서만 나온다고 말한다', key: 'proud' }, { label: '대답 대신 한 그릇 더 내온다', key: 'more' }];
      case 'apprentice': return [{ label: '데려다 가르친다', key: 'teach' }, { label: '설거지만 시킨다', key: 'work' }, { label: '쫓아 보낸다', key: 'away' }];
      case 'spoiled': return [{ label: '고기를 돌려보내고 정육상을 바꾼다', key: 'reject' }, { label: '향신료로 냄새를 덮어 쓴다', key: 'cook' }, { label: '은화 10닢을 더 주고 새 고기를 구한다', key: 'fresh' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const st = CU(g);
    switch (s.ev) {
      case 'plot': {
        if (key === 'report') { favor(g, 15); courtUp(g, 6); addFame(g, 3); deed(g, 'loyal', 3, '주인을 노린 독을 들고 가 알렸다'); logCook(g, '주인을 노린 독살을 막았다.'); return `주머니를 ${lordOf(g)}의 집사 앞에 쏟았다. 경비병들이 그날 밤 망토의 사내를 찾아 나섰다. 주인이 처음으로 부엌에 내려와 내 이름을 물었다.`; }
        if (key === 'accept') {
          g.player.money += 200;
          reportCrime(g, 'murder', here(g), { mult: 0.3 });
          deed(g, 'honest', -6, '돈을 받고 손님의 잔에 독을 탔다');
          stress(g, 15); st.poisoned = (st.poisoned ?? 0) + 1;
          chron(g, `${placeName(here(g))}의 연회에서 손님 하나가 알 수 없는 병으로 죽었다. 요리사들은 아무것도 모른다고 했다.`, 40);
          return '은화 200닢. 연회 날 그 손님의 잔에 가루를 털었다. 그는 다음 날 아침 일어나지 못했다. 아무도 부엌을 의심하지 않았다. 아직은.';
        }
        deed(g, 'honest', 1, '독을 타 달라는 청을 거절했다');
        return '"사람 잘못 봤소." 사내는 어깨를 으쓱하고 골목으로 사라졌다. 그 뒤로 한동안 부엌문을 잠그고 잤다.';
      }
      case 'suspect': {
        if (key === 'taster' && st.taster) { favor(g, 5); st.taster.loyal = clamp(st.taster.loyal + 10, 0, 100); return `${J(st.taster.name, '이/가')} 경비대장 앞에서 그날 접시를 하나하나 짚었다. "이 모두를 제가 먼저 먹었습니다. 저는 살아 있습니다." 독은 부엌을 나간 뒤에 들어간 것이다. 경비병들이 물러갔다.`; }
        if (key === 'probe') {
          if (check(rng, stat(g, 'sen') + cookSkill(g) * 0.3, 45)) { favor(g, 10); courtUp(g, 3); addFame(g, 2); return '사흘을 캐물었다. 견습 하나가 연회 전날 낯선 사람에게서 은화를 받은 게 드러났다. 그 아이는 울면서 끌려갔다. 부엌은 다시 조용해졌지만, 아무도 전처럼 웃지 않는다.'; }
          favor(g, -20); stress(g, 10);
          if (st.post && st.post.favor <= 5) { leavePost(g, '독살 의심을 벗지 못했다.'); return '아무것도 찾지 못했다. 의심은 그대로 내 앞치마에 남았다. 다음 날 집사가 와서 짐을 싸라고 했다.'; }
          return '아무것도 찾지 못했다. 경비병들은 물러갔지만 주인은 이제 내 접시를 시식관 없이 들지 않는다.';
        }
        if (key === 'plead') {
          if (check(rng, stat(g, 'cha') + (st.post?.favor ?? 0) * 0.4, 45)) { favor(g, -3); return `${J(lordOf(g), '이/가')} 오래 내 얼굴을 보더니 손을 저었다. "십 년을 내 상을 차린 사람이다. 다른 데를 찾아라." 의심은 그렇게 비켜 갔다.`; }
          leavePost(g, '독살 의심 속에 쫓겨났다.'); addFame(g, -8); deed(g, 'honest', -2, '독살 의심을 받고 쫓겨났다');
          return '주인은 끝까지 눈을 마주치지 않았다. 목은 붙어 있었지만 앞치마는 빼앗겼다. 독을 탄 요리사라는 말이 나보다 먼저 다음 고장에 닿을 것이다.';
        }
        leavePost(g, '독살 의심을 피해 밤에 달아났다.'); addFame(g, -12); deed(g, 'honest', -3, '독살 의심을 받고 달아났다');
        return '칼 두 자루와 소금 한 줌만 챙겨 뒷문으로 나왔다. 달아난 요리사는 범인이 된다. 그걸 알면서도 다리가 멈추지 않았다.';
      }
      case 'taster': {
        const t = st.taster; if (!t) return '시식관은 이미 곁에 없었다.';
        if (key === 'heal') { if (pay(g, 15) < 15) { st.taster = null; stress(g, 10); return `의원을 부를 돈이 모자랐다. ${J(t.name, '은/는')} 새벽을 넘기지 못했다.`; } t.loyal = clamp(t.loyal + 30, 0, 100); favor(g, 6); return `의원이 밤새 토하게 하고 숯가루를 먹였다. ${J(t.name, '이/가')} 살아났다. 눈을 뜨자마자 한 말은 "다음 접시는요?"였다.`; }
        st.taster = null; stress(g, 8);
        if (key === 'find') {
          if (check(rng, stat(g, 'sen') + cookSkill(g) * 0.3, 50)) { favor(g, 18); courtUp(g, 6); addFame(g, 4); deed(g, 'loyal', 2, '주인을 노린 독을 찾아냈다'); logCook(g, `시식관 ${J(t.name, '이/가')} 죽고, 독을 넣은 자를 찾아냈다.`); return `${J(t.name, '은/는')} 끝내 깨어나지 못했다. 그러나 포도주 창고 열쇠를 가진 하인의 방에서 같은 가루가 나왔다. 주인은 시식관을 가족 묘지에 묻어 주라고 했다.`; }
          favor(g, -6);
          return `${J(t.name, '은/는')} 끝내 깨어나지 못했다. 독을 넣은 자는 찾지 못했다. 부엌의 모든 사람이 서로를 본다.`;
        }
        return `${J(t.name, '을/를')} 성 밖 묘지에 묻었다. 이름 없는 돌 하나. 그가 대신 마신 잔이 아니었으면 저 자리는 주인의 것이었다.`;
      }
      case 'rival': {
        const r = st.rival; if (!r) return '떠들던 사람은 어디론가 사라졌다.';
        if (key === 'face') { if (check(rng, stat(g, 'cha'), 40)) { r.grudge = clamp(r.grudge - 20, 0, 100); addFame(g, 2); return `구경꾼들 앞에서 ${r.name}에게 물었다. "배앓이한 셋이 누구요? 이름을 대시오." 그는 대지 못했다. 웃음은 그쪽으로 갔다.`; } addFame(g, -3); r.grudge = clamp(r.grudge + 10, 0, 100); return '목소리만 커졌다. 구경꾼들은 둘 다 비웃으며 흩어졌다.'; }
        if (key === 'outdo') { tired(g, 10); const d = bestDish(g); if (d && check(rng, cookPower(g), 50)) { d.fame = clamp(d.fame + 6, 0, 100); addFame(g, 3); return `그 달 내내 ${dj(d, '을/를')} 반값에 냈다. 먹어 본 사람은 다시 왔다. 소문은 소문으로 끝났다.${learn(g, 0.8)}`; } return `요리로 갚으려 했지만 손님은 쉽게 돌아오지 않았다.${learn(g, 0.5)}`; }
        if (key === 'sabotage') { reportCrime(g, 'fraud', here(g), { mult: 0.6 }); deed(g, 'honest', -3, '경쟁 요리사의 부엌에 상한 고기를 넣었다'); st.rival = null; addFame(g, 2); return `${r.name}의 부엌에서 손님 열이 탈이 났다. 그는 고장을 떠났다. 내가 한 줄 아는 사람은 없다. 정육상 하나만 빼고.`; }
        addFame(g, -2); return '내버려 두었다. 말은 한 달쯤 돌다 잦아들었다. 떠난 단골 중 몇은 돌아오지 않았다.';
      }
      case 'shortage': {
        if (key === 'buy') { if (pay(g, 20) < 20) { favor(g, -4); return '살 돈이 모자랐다. 결국 묽은 죽을 냈다.'; } favor(g, 4); return '은화 20닢. 주인 상은 여느 때와 같았다. 내 주머니만 가벼워졌다.'; }
        if (key === 'make') { if (check(rng, cookPower(g), 45)) { favor(g, 6); addFame(g, 1); return `순무 껍질로 육수를 내고 마른 콩을 갈아 반죽에 섞었다. 주인은 아무것도 눈치채지 못했다. 이런 날 배우는 게 제일 많다.${learn(g, 1.2)}`; } favor(g, -5); return `궁리는 했는데 맛이 따라오지 않았다. 접시가 반쯤 남아서 돌아왔다.${learn(g, 0.6)}`; }
        favor(g, -3); return '죽과 빵. 주인은 말이 없었다. 흉년에는 다들 그렇게 먹는다.';
      }
      case 'guest': {
        const d = bestDish(g); if (!d) return '노인은 이미 자리를 떴다.';
        if (key === 'sell') { const m = 30 + Math.round(d.fame); g.player.money += m; d.fame = clamp(d.fame + 5, 0, 100); return `은화 ${m}닢에 비법을 적어 주었다. 내 요리가 남의 상에도 오를 것이다. 이름은 퍼지겠지만, 이제 내 것만은 아니다.`; }
        if (key === 'proud') { addFame(g, 2); return '노인은 웃었다. "그 말을 할 줄 알았소." 그 뒤로 그의 하인이 달마다 와서 한 솥씩 사 갔다.'; }
        tired(g, 4); d.fame = clamp(d.fame + 8, 0, 100); addFame(g, 2);
        return `말없이 한 그릇을 더 내왔다. 노인은 그것도 비웠다. 다음 달, 그가 가는 곳마다 ${dj(d, '을/를')} 이야기했다는 말이 들려왔다.`;
      }
      case 'apprentice': {
        if (key === 'teach') { st.pupils = (st.pupils ?? 0) + 1; deed(g, 'kind', 2, '배우겠다는 아이를 부엌에 들였다'); addFame(g, 2); tired(g, 4); return '아이를 들였다. 칼 잡는 법부터 다시 가르쳤다. 이름을 물으니 없다고 했다. 부엌 사람들이 "숯검댕"이라 부르기 시작했다.'; }
        if (key === 'work') { favor(g, 2); return '설거지를 시켰다. 아이는 한마디 불평 없이 솥 스무 개를 닦았다. 눈은 계속 불 쪽을 보고 있었다.'; }
        return '쫓아 보냈다. 다음 날은 오지 않았다. 그다음 날도.';
      }
      case 'spoiled': {
        if (key === 'reject') { favor(g, 2); return '고기를 정육상 앞에 내던졌다. 다른 정육상을 찾느라 반나절을 뛰었지만 상은 제때 나갔다.'; }
        if (key === 'fresh') { if (pay(g, 10) < 10) { favor(g, -3); return '돈이 모자라 반쯤만 새 고기로 채웠다.'; } return '은화 10닢을 더 주고 새 고기를 받았다. 손님들은 아무것도 몰랐다. 몰라야 한다.'; }
        if (check(rng, cookSkill(g), 55)) return `정향과 후추로 냄새를 덮었다. 아무도 탈이 나지 않았다. 운이 좋았다.${learn(g, 0.4)}`;
        favor(g, -15); addFame(g, -5); deed(g, 'honest', -2, '상한 고기를 손님상에 냈다');
        return '밤새 손님 셋이 배를 움켜쥐었다. 주인이 부엌에 내려와 고기 냄새를 맡았다. 아무 말도 하지 않았다. 그게 더 무서웠다.';
      }
      default: return '지나갔다.';
    }
  },
});
