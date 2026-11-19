// 용병단 안팎의 일: 다친 단원, 함락한 고장 약탈, 삯을 떼먹는 고용주, 적의 매수(이적), 사로잡은 귀족, 맞수 용병단, 부관의 반란, 죽은 단원의 식구, 탈영.
import { defineScene, chron, stress, tired, check } from '../adventure/core.js';
import { deed } from '../repute/index.js';
import { reportCrime } from '../crime.js';
import { J } from '../narrative/text.js';
import { S, myCo, withCo, mi, clamp, here, placeName, realmShort, free, stat, ROLES, LOOTS, logCo, honor, endCompany, addFamily, rivalById } from './core.js';
import { contractHere, fight } from './life.js';

const EVS = ['maimed', 'sack', 'unpaid', 'turn', 'ransom', 'rival', 'mutiny', 'widow', 'desert'];
const vet = (g, id) => myCo(g)?.vets.find((v) => v.id === id) ?? null;
const fam = (g, id) => S(g).families.find((f) => f.id === id) ?? null;
const pay = (g, n) => { const p = Math.max(0, Math.min(n, g.player.money)); g.player.money -= p; return p; };
const lerp = (v, n) => clamp(v + n, 0, 100);
const warOn = (g) => { const k = myCo(g)?.contract; return !!k && k.started && k.kind === 'war' && contractHere(g); };

defineScene('company_event', {
  need: (g, s) => withCo(g) && free(g) && EVS.includes(s.ev)
    && (s.ev !== 'maimed' || !!vet(g, s.a))
    && (s.ev !== 'mutiny' || !!vet(g, s.a))
    && (s.ev !== 'sack' || warOn(g))
    && (s.ev !== 'turn' || (warOn(g) && Number.isFinite(s.offer)))
    && (s.ev !== 'ransom' || warOn(g))
    && (s.ev !== 'rival' || (warOn(g) && !!rivalById(g, s.r)))
    && (s.ev !== 'widow' || !!fam(g, s.f))
    && (s.ev !== 'desert' || myCo(g).men >= 4)
    && (s.ev !== 'unpaid' || (typeof s.by === 'string' && Number.isFinite(s.owed) && (!s.mid || (contractHere(g) && myCo(g).contract.by === s.by)))),
  title: (g, s) => ({ maimed: '군의의 천막', sack: '무너진 성문', unpaid: '빈 돈자루', turn: '밤손님', ransom: '사로잡은 기사', rival: '맞은편 깃발', mutiny: '막사의 웅성거림', widow: '찾아온 식구', desert: '빈 천막' }[s.ev]),
  text: (g, s) => {
    const c = myCo(g), k = c.contract;
    switch (s.ev) {
      case 'maimed': { const v = vet(g, s.a); return `${ROLES[v.role]} ${J(v.name, '이/가')} 군의 천막에 누워 있다. 무릎 아래가 없다. 깨어나서 처음 한 말은 "이제 나는 뭘 하오?"였다.`; }
      case 'sack': return `${realmShort(k.foe)} 쪽 작은 성읍의 문이 무너졌다. 창병들이 성문 앞에 몰려 내 얼굴만 본다. 성 안에서 아이 우는 소리가 들린다. 약탈 규율은 ${LOOTS[c.loot].name}.`;
      case 'unpaid': return s.mid
        ? `${J(s.by, '이/가')} 이번 달에도 삯을 미뤘다. 밀린 돈이 은화 ${s.owed}닢이다. 창병들이 막사 앞에 모여 수군거린다.`
        : `계약이 끝났는데 ${J(s.by, '이/가')} 돈자루를 내놓지 않는다. 받을 돈은 은화 ${s.owed}닢. "전쟁 통에 금고가 비었소. 다음 철에 주겠소." 그 말을 한 사람의 손가락에 금반지가 셋이다.`;
      case 'turn': return `밤늦게 ${realmShort(k.foe)} 쪽 사람이 막사에 숨어들었다. 두툼한 돈자루를 탁자에 올려놓는다. "지금 고용주 대신 우리 편에 서시오. 달마다 은화 ${s.offer}닢. 내일 싸움에서 칼끝만 돌리면 되오."`;
      case 'ransom': return `창병들이 ${realmShort(k.foe)} 쪽 젊은 기사를 끌고 왔다. 은빛 박차를 단 걸 보니 집안이 좋다. "우리 아버지가 몸값을 낼 거요." 고용주 쪽 사람도 이 일을 들었다.`;
      case 'rival': { const r = rivalById(g, s.r); return `맞은편 언덕에 ${r.name}의 깃발이 섰다. 단장 ${J(r.captain, '이/가')} 사자를 보냈다. "내일 서로 피를 흘려 봐야 고용주들만 좋은 일이오. 할 얘기가 있소."${r.grudge >= 30 ? ' 사자 뒤의 창병들은 우리를 노려보고 있다. 지난 싸움을 잊지 않은 얼굴이다.' : ''}`; }
      case 'mutiny': { const v = vet(g, s.a); return `${ROLES[v.role]} ${J(v.name, '이/가')} 창병 여럿을 등 뒤에 세우고 막사에 들어왔다. "삯은 밀리고 몫은 단장 주머니로만 가오. 이대로는 못 가겠소." 사기는 바닥이다.`; }
      case 'widow': { const f = fam(g, s.f); return `막사 앞에 ${J(f.kin, '이/가')} 찾아왔다. ${f.dead}의 식구다.${f.maimed ? ' 다리를 잃은 사람을 데려가 먹여 살려야 한다.' : ' 남편이자 아들이자 아버지였던 사람의 몫을 물으러 왔다.'} 창병들이 내가 어떻게 하는지 보고 있다.`; }
      case 'desert': return `아침 점호에 창병 몇이 빈다. 단의 궤에서 은화도 조금 비었다. 진흙 위 발자국이 ${placeName(here(g))} 쪽 길로 나 있다.`;
      default: return '';
    }
  },
  choices: (g, s) => {
    const c = myCo(g), m = g.player.money;
    switch (s.ev) {
      case 'maimed': return [{ label: '병참을 맡겨 단에 남긴다', key: 'keep' }, ...(m >= 30 ? [{ label: '은화 30닢을 쥐여 고향으로 보낸다', key: 'lump' }] : []), { label: '단의 궤에서 달마다 연금을 준다', key: 'pension' }, { label: '쓸모없는 사람은 둘 수 없다', key: 'cast' }];
      case 'sack': return [{ label: '사흘 동안 마음대로 하게 둔다', key: 'sack' }, { label: '성읍 원로들에게 몸값을 받고 물린다', key: 'tribute' }, { label: '약탈하는 놈을 하나 목매달아 본보기로 삼는다', key: 'hang' }];
      case 'unpaid': return [
        { label: '창병을 풀어 고용주 창고에서 제 몫을 챙긴다', key: 'force' },
        { label: '고장마다 떼먹은 이름을 퍼뜨린다', key: 'shame' },
        ...(s.mid ? [{ label: '계약을 깨고 떠난다', key: 'quit' }] : [{ label: '다음 철까지 기다린다', key: 'wait' }]),
        { label: '없던 셈 친다', key: 'forgive' },
      ];
      case 'turn': return [{ label: '돈자루를 받고 편을 바꾼다', key: 'switch' }, { label: '사자를 묶어 고용주에게 넘긴다', key: 'report' }, { label: '돈만 받고 모른 척 그대로 있는다', key: 'double' }, { label: '돌려보낸다', key: 'no' }];
      case 'ransom': return [{ label: '몸값을 받고 돌려보낸다', key: 'ransom' }, { label: '고용주에게 넘긴다', key: 'hand' }, { label: '몸값 없이 풀어 준다', key: 'free' }];
      case 'rival': return [{ label: '단장끼리 겨루자고 한다', key: 'duel' }, { label: '서로 시늉만 하고 피를 아끼자고 한다', key: 'fake' }, { label: '저쪽 창병들을 은화로 빼 온다', key: 'poach' }, { label: '사자를 돌려보내고 정면으로 붙는다', key: 'fight' }];
      case 'mutiny': return [...(m >= c.men * 2 ? [{ label: `내 돈으로 밀린 삯을 치른다 (은화 ${c.men * 2}닢)`, key: 'pay' }] : []), { label: '몫을 똑같이 나누겠다고 약속한다', key: 'equal' }, { label: `${J(vet(g, s.a).name, '을/를')} 칼로 누른다`, key: 'crush' }, { label: '깃발을 내려놓고 단을 넘긴다', key: 'yield' }];
      case 'widow': return [...(m >= 15 ? [{ label: '죽은 사람 몫으로 은화 15닢을 건넨다', key: 'pay' }] : []), { label: '단의 궤에서 달마다 연금을 준다', key: 'pension' }, { label: '식구 중 하나를 단에 받아 준다', key: 'take' }, { label: '용병의 목숨값은 계약에 없다며 돌려보낸다', key: 'turn' }];
      case 'desert': return [{ label: '말 탄 사람을 보내 잡아 온다', key: 'hunt' }, { label: '갈 사람은 가라고 둔다', key: 'let' }];
      default: return [{ label: '지나간다', key: 'no' }];
    }
  },
  resolve(g, rng, s, key) {
    const c = myCo(g), st = S(g);
    if (!c) return '단은 이미 없었다.';
    const k = c.contract;
    switch (s.ev) {
      case 'maimed': {
        const v = vet(g, s.a);
        if (!v) return '그는 이미 단을 떠났다.';
        if (key === 'keep') { v.skill = Math.max(10, v.skill - 20); v.loyal = lerp(v.loyal, 20); c.morale = lerp(c.morale, 4); return `${J(v.name, '은/는')} 목발을 짚고 병참 수레를 맡았다. 창병들은 다쳐도 버려지지 않는다는 걸 보았다.`; }
        c.vets.splice(c.vets.indexOf(v), 1);
        if (key === 'lump') { pay(g, 30); addFamily(g, rng, `${ROLES[v.role]} ${v.name}`, { maimed: true }); st.families[0].helped = 'lump'; c.morale = lerp(c.morale, 2); return `은화 30닢을 쥐여 수레에 태웠다. ${J(v.name, '은/는')} 고향 쪽 길에서 한 번 손을 들었다.`; }
        if (key === 'pension') { addFamily(g, rng, `${ROLES[v.role]} ${v.name}`, { maimed: true }); const f = st.families[0]; f.helped = 'pension'; f.pension = true; c.pensions = (c.pensions ?? 0) + 2; c.morale = lerp(c.morale, 5); deed(g, 'loyal', 3, '다친 부하를 끝까지 챙기는 단장이라더라.'); return `달마다 은화 두 닢을 ${v.name}에게 보내기로 장부에 적었다.`; }
        c.morale = lerp(c.morale, -10); deed(g, 'loyal', -5, '다리 잃은 부하를 길바닥에 버렸다더라.');
        return `${J(v.name, '을/를')} 막사 밖으로 내보냈다. 그날 밤 창병들의 노래가 그쳤다.`;
      }
      case 'sack': {
        if (key === 'sack') { const amt = Math.round(rng.int(30, 60) * Math.max(0.5, c.men / 20)); g.player.money += Math.round(amt * 0.4); c.chest += Math.round(amt * 0.2); c.morale = lerp(c.morale, 12); c.drill = lerp(c.drill, -12); st.sacks += 1; deed(g, 'kind', -8, '용병단이 성읍을 사흘 동안 짓밟았다더라.'); if (st.banner) st.banner.stains += 1; chron(g, `${J(c.name, '이/가')} ${realmShort(k.foe)}의 한 성읍을 사흘 동안 약탈하다.`, 50); return `사흘 동안 성읍에서 연기가 올랐다. 내 몫으로 은화 ${Math.round(amt * 0.4)}닢. 나흘째 아침, 대열을 세우는 데 한나절이 걸렸다.`; }
        if (key === 'tribute') { const ok = check(rng, stat(g, 'cha') + c.drill * 0.3, 45); if (ok) { const amt = rng.int(25, 45); c.chest += amt; c.morale = lerp(c.morale, 2); deed(g, 'kind', 2, '항복한 성읍에서 몸값만 받고 물렀다더라.'); return `원로들이 은화 ${amt}닢을 모아 왔다. 창병들은 투덜거렸지만 성문 밖에서 기다렸다.`; } c.drill = lerp(c.drill, -6); c.morale = lerp(c.morale, -4); return '원로들이 흥정하는 사이 창병 몇이 먼저 담을 넘었다. 막을 새도 없이 반나절 동안 불이 났다.'; }
        c.drill = lerp(c.drill, 12); c.morale = lerp(c.morale, -10); deed(g, 'kind', 3, '부하를 목매달아 약탈을 막았다더라.');
        for (const v of c.vets) v.loyal = lerp(v.loyal, -4);
        return '성문 앞 나무에 창병 하나를 매달았다. 나머지는 말없이 창을 거두었다. 그날 밤 내 천막 앞에 침 자국이 있었다.';
      }
      case 'unpaid': {
        const owed = s.owed;
        const done = () => { if (s.mid && k) k.unpaid = 0; };
        if (key === 'force') {
          done();
          if (check(rng, c.men * 0.6 + c.drill * 0.3, 40)) { c.chest += owed; c.morale = lerp(c.morale, 6); reportCrime(g, 'extortion', here(g)); deed(g, 'brave', 2, '돈 떼먹은 고용주의 창고를 털었다더라.'); if (s.side) st.hunted[s.side] = mi(g) + 24; return `창병들이 고용주의 창고 문을 부쉈다. 밀가루 자루와 은그릇으로 은화 ${owed}닢 어치를 챙겼다. 이 고장 경비대가 우리 이름을 적었다.`; }
          c.men = Math.max(0, c.men - 2); c.morale = lerp(c.morale, -6); reportCrime(g, 'extortion', here(g));
          return '창고 앞에 고용주의 사병들이 먼저 와 있었다. 창병 둘을 잃고 빈손으로 물러났다.';
        }
        if (key === 'shame') { done(); c.fame = lerp(c.fame, 2); deed(g, 'honest', 2, '용병 삯을 떼먹은 고용주의 이름을 고장마다 알렸다더라.'); if (rng.chance(0.4)) { c.chest += Math.round(owed / 2); return `고장마다 ${s.by}의 이름을 성문에 붙였다. 한 달 뒤 사람이 와서 절반을 치렀다. "나머지는 소문을 거두면 주겠소."`; } return `${s.by}의 이름을 고장마다 붙였다. 돈은 오지 않았지만 다른 고용주들이 우리 계약서를 더 꼼꼼히 읽었다.`; }
        if (key === 'quit') { if (k && s.mid) { c.contract = null; if (k.side) st.hunted[k.side] = mi(g) + 12; logCo(g, `삯이 밀려 ${k.by}의 계약을 버렸다.`); } c.morale = lerp(c.morale, 4); return '계약서를 고용주 천막 앞에 꽂아 두고 떠났다. 밀린 돈은 받지 못했다.'; }
        if (key === 'wait') { if (rng.chance(0.5)) { c.chest += owed; return `다음 철에 정말로 돈자루가 왔다. 은화 ${owed}닢. 금반지는 하나 줄어 있었다.`; } c.morale = lerp(c.morale, -6); return '다음 철이 오고 또 갔다. 돈자루는 오지 않았다.'; }
        done(); c.morale = lerp(c.morale, -8); deed(g, 'generous', 2, '떼인 삯을 없던 셈 쳤다더라.');
        return '없던 셈 쳤다. 창병들은 그 돈이 제 주머니에서 나간 셈이라는 걸 알았다.';
      }
      case 'turn': {
        if (!k) return '계약은 이미 끝났다.';
        if (key === 'switch') {
          const old = k.side;
          st.hunted[old] = mi(g) + 48; st.turned += 1;
          Object.assign(k, { side: k.foe, foe: old, by: `${realmShort(k.foe)} 원정군 사령관`, pay: s.offer, temper: 'sly', rival: null });
          c.chest += s.offer; c.morale = lerp(c.morale, 4);
          deed(g, 'loyal', -10, '용병단이 싸움 한가운데서 칼끝을 돌렸다더라.');
          if (st.banner) st.banner.stains += 1;
          logCo(g, `${realmShort(old)} 편에서 ${realmShort(k.side)} 편으로 돌아섰다.`);
          chron(g, `${J(c.name, '이/가')} ${J(realmShort(old), '을/를')} 버리고 ${realmShort(k.side)} 편에 서다.`, 50);
          return `다음 날 새벽, 깃발을 뒤집어 들고 어제의 고용주 쪽으로 창끝을 돌렸다. 은화 ${s.offer}닢이 단의 궤에 들었다. ${realmShort(old)}에서는 한동안 우리를 사겠다는 사람이 없을 것이다.`;
        }
        if (key === 'report') { c.chest += Math.round(k.pay * 0.8); c.fame = lerp(c.fame, 3); deed(g, 'loyal', 5, '적의 돈자루를 고용주 앞에 내던졌다더라.'); return `사자를 묶어 ${k.by}의 천막에 던져 넣었다. 사령관이 웃으며 은화 ${Math.round(k.pay * 0.8)}닢을 얹어 주었다. "돈에 팔리지 않는 용병이라."`; }
        if (key === 'double') {
          g.player.money += Math.round(s.offer * 0.5);
          deed(g, 'honest', -4, '양쪽에서 돈을 받는 용병이라더라.');
          if (rng.chance(0.45)) { c.contract = null; c.fame = lerp(c.fame, -6); if (k.side) st.hunted[k.side] = mi(g) + 36; logCo(g, `적의 돈을 받은 것이 들켜 ${k.by}에게 쫓겨났다.`); return `돈자루 반을 챙겼다. 열흘 뒤 ${k.by}의 첩자가 그 사실을 알아냈다. 계약은 그 자리에서 끝났고, 남은 삯은 없었다.`; }
          return `돈자루 반을 챙기고 사자를 돌려보냈다. 이튿날 싸움에서는 원래 편에서 싸웠다. 은화 ${Math.round(s.offer * 0.5)}닢이 내 주머니에 남았다.`;
        }
        return '사자를 돌려보냈다. 돈자루는 그의 손에 들려 어둠 속으로 사라졌다.';
      }
      case 'ransom': {
        if (key === 'ransom') { const amt = rng.int(30, 70); g.player.money += Math.round(amt * 0.5); c.chest += Math.round(amt * 0.5); if (k && rng.chance(0.3)) { k.temper = 'stingy'; return `몸값 은화 ${amt}닢이 왔다. 고용주는 제 몫을 떼어 주지 않았다고 이를 갈았다.`; } return `한 달 뒤 기사의 집안에서 은화 ${amt}닢이 왔다. 젊은 기사는 떠나며 내 이름을 물었다.`; }
        if (key === 'hand') { if (k) k.bonus = Math.round(k.bonus * 1.4); c.fame = lerp(c.fame, 1); return '기사를 고용주에게 넘겼다. 사령관이 계약서 덤 칸의 숫자를 고쳐 적었다.'; }
        deed(g, 'kind', 4, '사로잡은 적 기사를 몸값 없이 풀어 주었다더라.'); c.morale = lerp(c.morale, -4);
        return '포승을 풀어 주었다. 창병들은 은화가 걸어 나가는 걸 지켜만 보았다. 젊은 기사는 한참 뒤를 돌아보았다.';
      }
      case 'rival': {
        const r = rivalById(g, s.r);
        if (!r) return '저쪽 깃발은 이미 내려졌다.';
        if (key === 'duel') {
          tired(g, 12);
          if (check(rng, (g.player.skills.sword ?? 0) * 0.8 + stat(g, 'str') * 0.4, 30 + r.fame * 0.4)) {
            c.fame = lerp(c.fame, 6); r.fame = clamp(r.fame - 6, 5, 95); r.grudge = clamp(r.grudge + 15, 0, 100); c.morale = lerp(c.morale, 8);
            honor(g, `${r.name}의 단장 ${J(r.captain, '을/를')} 두 진 사이에서 꺾었다`);
            deed(g, 'brave', 4, `${r.name}의 단장을 맞겨루기에서 꺾었다더라.`);
            return `두 진 사이 풀밭에서 ${J(r.captain, '과/와')} 칼을 맞댔다. 세 합째에 그의 칼이 풀밭에 떨어졌다. 저쪽 창병들이 먼저 고개를 돌렸다.`;
          }
          g.player.injuries.push({ name: '맞겨루기에서 베인 옆구리', months: 2 }); c.morale = lerp(c.morale, -8); r.fame = clamp(r.fame + 4, 5, 95);
          return `${J(r.captain, '은/는')} 소문보다 빨랐다. 옆구리를 베이고 무릎을 꿇었다. 그는 나를 죽이지 않았다. 그게 더 아팠다.`;
        }
        if (key === 'fake') {
          if (rng.chance(0.3) && k) { c.contract = null; c.fame = lerp(c.fame, -6); if (k.side) st.hunted[k.side] = mi(g) + 24; deed(g, 'honest', -4, '용병끼리 짜고 싸우는 시늉만 했다더라.'); logCo(g, `${J(r.name, '과/와')} 짠 것이 들켜 계약이 끊겼다.`); return `한나절 동안 허공에 창을 휘둘렀다. 고용주의 감찰관이 그걸 다 보고 있었다. 계약은 그날로 끝났다.`; }
          c.morale = lerp(c.morale, 5); r.grudge = clamp(r.grudge - 10, 0, 100); if (k) k.won += 1;
          return `두 단이 들판에서 요란하게 소리만 질렀다. 죽은 사람은 없었다. 저녁에 ${J(r.captain, '이/가')} 술 한 통을 보내왔다.`;
        }
        if (key === 'poach') {
          if (g.player.money >= 20 && check(rng, stat(g, 'cha') + c.fame * 0.3, 30 + r.fame * 0.3)) { const n = rng.int(4, 9); pay(g, 20); c.men += n; r.fame = clamp(r.fame - 3, 5, 95); r.grudge = clamp(r.grudge + 20, 0, 100); return `밤에 은화 20닢을 들려 사람을 보냈다. 새벽에 저쪽 창병 ${n}명이 우리 막사로 넘어왔다. ${J(r.captain, '은/는')} 이 일을 잊지 않을 것이다.`; }
          r.grudge = clamp(r.grudge + 10, 0, 100); return '보낸 사람이 얼굴에 멍이 들어 돌아왔다. 저쪽 단은 생각보다 단단했다.';
        }
        if (!k || !contractHere(g) || c.foughtAt === mi(g)) return '싸움은 이미 끝나 있었다.';
        const res = fight(g, rng, 'charge', true);
        r.grudge = clamp(r.grudge + 8, 0, 100);
        return `사자를 돌려보내고 깃발을 앞세웠다. ${res.text}`;
      }
      case 'mutiny': {
        const v = vet(g, s.a);
        if (!v) return '그는 이미 떠났다.';
        if (key === 'pay') { const p = pay(g, c.men * 2); c.owed = 0; c.morale = lerp(c.morale, 20); v.loyal = lerp(v.loyal, 15); return `내 돈 은화 ${p}닢을 탁자에 쏟았다. ${J(v.name, '은/는')} 한참 그 돈을 보다가 칼집에서 손을 뗐다.`; }
        if (key === 'equal') { c.split = 'equal'; c.morale = lerp(c.morale, 12); v.loyal = lerp(v.loyal, 18); logCo(g, '반란 끝에 몫을 똑같이 나누기로 했다.'); return '몫을 똑같이 나누겠다고 깃대 앞에서 맹세했다. 함성이 일었다. 단장이 단을 이끄는 게 아니라 단이 단장을 이끄는 날도 있다.'; }
        if (key === 'crush') {
          if (check(rng, (g.player.skills.sword ?? 0) * 0.8 + stat(g, 'str') * 0.4, v.skill + 5)) { c.vets.splice(c.vets.indexOf(v), 1); c.drill = lerp(c.drill, 8); c.morale = lerp(c.morale, -4); addFamily(g, rng, `${ROLES[v.role]} ${v.name}`, { vet: true }); logCo(g, `반란을 일으킨 ${J(v.name, '을/를')} 베었다.`); return `${J(v.name, '이/가')} 먼저 칼을 뽑았고, 먼저 쓰러졌다. 창병들은 하나씩 제 천막으로 돌아갔다.`; }
          g.player.injuries.push({ name: '부하의 칼에 베인 손', months: 2 }); stress(g, 12);
          endCompany(g, `${J(v.name, '이/가')} 반란을 일으켜 단을 빼앗았다`);
          return `${J(v.name, '이/가')} 더 빨랐다. 손을 베인 채 막사 밖으로 밀려났다. 깃발만은 내 품에 안고 나왔다.`;
        }
        endCompany(g, `${v.name}에게 단을 넘겼다`); stress(g, 6);
        return `깃발을 접어 들고, 단은 ${v.name}에게 넘겼다. 그가 이끄는 단은 다른 이름을 달 것이다.`;
      }
      case 'widow': {
        const f = fam(g, s.f);
        if (!f) return '그 식구는 이미 돌아갔다.';
        if (key === 'pay') { pay(g, 15); f.helped = 'paid'; c.morale = lerp(c.morale, 4); deed(g, 'generous', 2, '죽은 용병의 식구에게 몫을 치렀다더라.'); return `은화 15닢을 건넸다. ${J(f.kin, '이/가')} 돈을 세지도 않고 품에 넣었다. 창병들이 그걸 보았다.`; }
        if (key === 'pension') { f.helped = 'pension'; f.pension = true; c.pensions = (c.pensions ?? 0) + 1; c.morale = lerp(c.morale, 6); deed(g, 'loyal', 3, '죽은 부하의 식구를 달마다 챙긴다더라.'); return `단의 궤에서 달마다 은화 한 닢을 ${f.dead}의 식구에게 보내기로 했다. 장부에 줄이 하나 늘었다.`; }
        if (key === 'take') { f.helped = 'took'; c.men += 1; c.morale = lerp(c.morale, 3); return `${f.dead}의 식구 가운데 열여섯 살 난 아이가 창을 받았다. 제 아비가 서던 줄에 섰다.`; }
        f.helped = 'turned'; c.morale = lerp(c.morale, -8); deed(g, 'kind', -4, '죽은 용병의 식구를 빈손으로 돌려보냈다더라.');
        for (const v of c.vets) v.loyal = lerp(v.loyal, -3);
        return `${J(f.kin, '을/를')} 돌려보냈다. 그날 창병 몇이 제 몫에서 은화를 떼어 몰래 쥐여 주었다는 말을 나중에 들었다.`;
      }
      case 'desert': {
        const n = Math.max(1, Math.round(c.men * 0.1));
        c.men = Math.max(0, c.men - n); c.chest = Math.max(0, c.chest - 5);
        if (key === 'hunt') {
          tired(g, 8);
          if (check(rng, stat(g, 'agi') + c.drill * 0.3, 45)) { c.men += n; c.drill = lerp(c.drill, 6); return `이틀 만에 고개 너머 헛간에서 ${n}명을 찾아냈다. 묶어서 데려와 모두 앞에서 채찍을 쳤다. 다시 도망치는 사람은 없었다.`; }
          return `고개를 넘어 이틀을 쫓았지만 발자국은 강가에서 끊겼다. ${n}명은 그렇게 사라졌다.`;
        }
        c.morale = lerp(c.morale, 2);
        return `${n}명이 떠났다. 붙잡아 봐야 다음 싸움에서 등 뒤가 불안할 뿐이다.`;
      }
      default: return '지나갔다.';
    }
  },
});

// 연금을 받는 식구: 단의 궤에서 나간다 (wagesOf가 c.pensions를 센다). 단이 없어지면 끊긴다.
export const pensionCount = (g) => S(g).families.filter((f) => f.pension).length;
