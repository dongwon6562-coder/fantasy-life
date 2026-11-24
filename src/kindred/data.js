// 42단계: 다른 종족으로 태어날 집안. 엘프 셋·드워프 셋·수인 셋·하프엘프 둘·반마족 둘.
// 33단계 origins와 같은 꼴: 시작 장소·인맥 둘·어린 시절 장면 셋·집안이 바라는 것(18살)·짐(16~26살 한 번).
// 장면의 fx: { stat, skill, aff: {father|mother|인맥 역할: n}, fam(집안 돈), money, flag, stress, renown, horn(반마족 뿔이 드러날 위험 +n) }
// 짐 고르기: { label, key, fx, out } 또는 { label, key, test(g) → 수, dc, ok: {fx, out}, bad: {fx, out} }
// c(글에 쓰는 값): { n 내 이름, fa 아버지, mo 어머니, place 사는 곳, t: { 역할: 이름 } }
import { J } from '../narrative/text.js';

export const NEW_JOBS = {
  forest_elder: { name: '숲의 장로', skill: 'magic', income: 3 },
  clan_chief: { name: '씨족장', skill: 'smithing', income: 8 },
  miner: { name: '광부', skill: 'smithing', income: 4 },
  tribe_chief: { name: '부족장', skill: null, income: 3 },
  scout: { name: '정찰꾼', skill: null, income: 3 },
};

const sk = (g, k) => g.player.skills[k] ?? 0;
const st = (g, k) => g.player.stats[k] ?? 0;
const ren = (g) => g.life?.renown ?? 0;

export const KINDRED = [
  /* ---------------- 엘프 ---------------- */
  {
    id: 'elf_elder', race: 'elf',
    name: '은잎 숲 장로 집안',
    desc: '은잎 마을 안쪽, 세계수 뿌리가 땅 위로 드러난 곳에 사는 장로 집안. 할머니는 마신 봉인 이전을 기억한다고 한다. 아이는 백 년을 내다보는 어른들 사이에서 자란다. 서두르는 법을 배우기 전에 기다리는 법을 배운다. 사람 마을은 말로만 듣는다.',
    money: 70, fatherJob: 'forest_elder', motherJob: 'herbalist',
    statBias: { int: 3, sen: 4, wil: 3 }, skillBias: { magic: 4, herbs: 4, letters: 2 },
    standing: '장로 집안', lastNames: ['세계수의 가지', '별빛샘'], place: 'silverleaf', fit: 'magic',
    want: { name: '장로의 자리', text: '집안 어른들은 내가 언젠가 장로들의 둥근 자리에 앉기를 바란다. 백 년쯤 뒤에.' },
    burden: { name: '바깥을 금하는 말', text: '장로들은 숲 바깥, 사람의 세상에 오래 머무는 것을 좋게 보지 않는다.' },
    ties: [
      { role: 'grandmother', sex: 'f', age: [700, 900], job: 'forest_elder', race: 'elf', aff: 30, word: '아주 늙은 할머니' },
      { role: 'human', sex: 'm', age: [4, 7], job: 'child', race: 'human', aff: 15, word: '사람 아이' },
    ],
    lines: [
      (c) => `${c.t.grandmother} 할머니가 세계수 뿌리에 손을 대고 한나절을 앉아 있었다. 뭘 하냐고 물었더니 "듣는다"고만 했다.`,
      (c) => `숲 어귀까지 장사하러 오는 사람 아이 ${J(c.t.human, '이/가')} 지난봄보다 한 뼘 컸다. 나는 그대로다.`,
      () => '장로 회의는 사흘째 이어지고 있다. 안건은 하나다. 아직 아무도 말을 꺼내지 않았다.',
    ],
    scenes: [
      { id: 'ee_root', age: [5, 8], title: '세계수 뿌리',
        text: (c) => `${c.t.grandmother} 할머니가 나를 세계수 뿌리 사이로 데려갔다. 손바닥을 껍질에 대 보라고 했다. 처음엔 아무것도 없었다. 그러다 아주 느린 무언가가 손바닥 밑을 지나갔다. 심장 소리 같기도 하고 물소리 같기도 했다.`,
        choices: [
          { label: '눈을 감고 끝까지 듣는다', fx: { skill: { magic: 1.5 }, stat: { sen: 0.5 }, aff: { grandmother: 6 }, flag: 'ee_heard' }, out: () => '해가 기울 때까지 손을 떼지 않았다. 할머니가 내 이마에 입을 맞췄다. "백 년에 한 번 나오는 귀다." 무슨 뜻인지는 말해 주지 않았다.' },
          { label: '무서워서 손을 뗀다', fx: { stat: { wil: 0.3 }, aff: { grandmother: 2 } }, out: () => '손을 뗐다. 할머니는 웃었다. "다들 처음엔 그런다. 나도 그랬다. 이백 년쯤 전에."' },
          { label: '뭐가 지나갔는지 묻는다', fx: { skill: { letters: 1 }, stat: { int: 0.4 } }, out: () => '할머니는 대답 대신 옛말로 된 노래를 하나 가르쳐 주었다. 다 외우는 데 한 철이 걸렸다. 노래 끝에 답이 있었다. 아마도.' },
        ] },
      { id: 'ee_human', age: [9, 12], title: '숲 어귀의 아이',
        text: (c) => `숲 어귀에서 ${J(c.t.human, '이/가')} 나를 불렀다. 이제 나보다 머리 하나가 크다. 수염이 나기 시작했다. "너는 왜 그대로야?" 장로들은 사람 아이와 너무 가까이 지내지 말라고 했다.`,
        choices: [
          { label: '같이 숲 바깥까지 걸어간다', fx: { stat: { cha: 0.5 }, aff: { human: 10, father: -4 }, flag: 'ee_outside' }, out: (c) => `처음으로 숲 경계 너머 들판을 보았다. 해가 너무 넓게 들었다. ${J(c.t.human, '이/가')} 사람 마을 이야기를 해 주었다. 거기서는 다들 서두른다고 했다.` },
          { label: '"우리는 천천히 자라"라고 말해 준다', fx: { stat: { int: 0.3 }, aff: { human: 4 } }, out: (c) => `${J(c.t.human, '은/는')} 한참 생각하더니 "그럼 내가 할아버지가 돼도 너는 애야?" 하고 물었다. 그렇다고 했다. 그 애가 처음으로 조용해졌다.` },
          { label: '장로 말대로 돌아선다', fx: { stat: { wil: 0.4 }, aff: { father: 4, human: -6 } }, out: () => '돌아섰다. 다음 철에 그 애는 오지 않았다. 그다음 철에도. 장로들은 잘했다고 했다. 잘한 건지 모르겠다.' },
        ] },
      { id: 'ee_council', age: [13, 15], title: '둥근 자리',
        text: (c) => `장로 회의에 처음으로 들어가 뒤에 서 있게 되었다. 안건은 사람 왕국이 숲 남쪽 나무를 베게 해 달라는 청이다. ${J(c.fa, '이/가')} 나를 보며 물었다. "너라면 뭐라고 하겠느냐."`,
        choices: [
          { label: '"오래 볼 일이니 조금만 내주자"고 한다', fx: { stat: { cha: 0.4, int: 0.3 }, aff: { father: 4 }, flag: 'ee_bridge' }, out: () => '장로 몇이 고개를 끄덕였다. 몇은 눈을 감았다. 회의는 그 뒤로 두 해를 더 끌었다. 결국 내 말과 비슷하게 정해졌다.' },
          { label: '"한 그루도 안 된다"고 한다', fx: { stat: { wil: 0.5 }, aff: { grandmother: 4 } }, out: (c) => `${c.t.grandmother} 할머니만 웃었다. "삼백 년 전에 내가 한 말이구나." 그때는 어떻게 되었냐고 물었다. 할머니는 남쪽을 가리켰다. 거기엔 들판이 있다.` },
          { label: '"모르겠다"고 솔직히 말한다', fx: { stat: { sen: 0.4 }, aff: { father: 2 } }, out: () => '"그게 장로의 첫 대답이다." 아버지가 말했다. 칭찬인지 놀림인지 끝내 몰랐다.' },
        ] },
    ],
    check: (g, s) => sk(g, 'magic') >= 15 || !!s.flags.ee_bridge || ren(g) >= 10,
    burdenScene: {
      title: '장로들의 부름', text: (c) => `장로들이 나를 둥근 자리로 불렀다. 사람 마을 일에 너무 마음을 쓴다는 말이 돌았다고. 숲에 머물며 백 년을 배우든지, 아니면 나가서 돌아오지 말든지.`,
      choices: [
        { label: '숲에 남아 배운다', key: 'stay', fx: { skill: { magic: 3, herbs: 2 }, aff: { father: 8, grandmother: 6 }, stress: 4, flag: 'ee_stayed' }, out: () => '한 철이 한 해처럼, 한 해가 한 철처럼 지나갔다. 할머니가 내 손을 잡고 세계수 노래의 마지막 절을 가르쳐 주었다.' },
        { label: '바깥으로 나간다', key: 'go', fx: { aff: { father: -10, human: 6 }, stress: 8, flag: 'ee_left' }, out: () => '숲 경계에서 한 번 뒤돌아보았다. 아무도 따라오지 않았다. 엘프는 그런 일로 서두르지 않는다. 언젠가 돌아오면, 그때 말하면 된다.' },
        { label: '둘 다 하겠다고 버틴다', key: 'both', test: (g) => st(g, 'cha') + st(g, 'wil'), dc: 75, ok: { fx: { stat: { cha: 0.5 }, renown: 2, flag: 'ee_bridge' }, out: () => '긴 침묵 끝에 할머니가 먼저 웃었다. 장로들은 "숲과 바깥 사이에 사람 하나쯤 있어도 되겠지"라고 정했다.' }, bad: { fx: { stress: 12, aff: { father: -6 } }, out: () => '장로들은 대답하지 않았다. 대답하지 않는 것이 대답이었다. 숲에서 내 자리는 조금 좁아졌다.' } },
      ],
    },
  },
  {
    id: 'elf_minstrel', race: 'elf',
    name: '왕도의 엘프 악사 집안',
    desc: '왕도 레오카스트 귀족 연회장에서 하프를 타는 엘프 악사 집안. 할아버지 때부터 이 도시에 살았다. 귀족들은 엘프 악사를 장식처럼 들인다. 아이는 사람 도시의 시끄러움과 사람 귀족의 짧은 기억 속에서 자란다. 박수는 많고 친구는 적다.',
    money: 90, fatherJob: 'bard', motherJob: 'bard',
    statBias: { cha: 5, sen: 3, int: 1 }, skillBias: { letters: 4, magic: 1, trade: 1 },
    standing: '외지인', lastNames: ['바람결', '새벽이슬'], place: 'leocast', fit: 'letters',
    want: { name: '이름 있는 노래', text: '부모는 내가 사람의 왕도에 오래 남을 노래 하나를 짓기를 바란다. 사람들은 잊어도 노래는 남으니까.' },
    burden: { name: '장식이라는 자리', text: '귀족들은 엘프 악사를 손님이 아니라 연회장 꽃처럼 여긴다.' },
    ties: [
      { role: 'patron', sex: 'f', age: [40, 55], job: 'idle', race: 'human', aff: 20, word: '후원하는 귀부인' },
      { role: 'rival', sex: 'm', age: [8, 11], job: 'child', race: 'human', aff: -5, riv: 30, word: '악사 길드 집 아이' },
    ],
    lines: [
      (c) => `${c.t.patron} 부인 집 연회에서 아버지가 하프를 탔다. 박수가 컸다. 돌아오는 마차에서 아버지는 한마디도 하지 않았다.`,
      () => '할아버지가 젊을 때 연주해 준 귀족의 손자가 오늘 연회 주인이었다. 그 사람은 할아버지 이름을 몰랐다.',
      (c) => `${J(c.t.rival, '이/가')} 길드 연습실 앞에서 내 귀를 흉내 내며 손가락으로 뾰족하게 세웠다. 웃는 아이들 사이에서 그 애 혼자 진지했다.`,
    ],
    scenes: [
      { id: 'em_feast', age: [5, 8], title: '연회장 구석',
        text: (c) => `처음으로 연회장에 따라갔다. 귀족 아이 하나가 내 귀를 잡아당기며 "진짜야?" 하고 물었다. 어른들이 웃었다. ${J(c.mo, '은/는')} 연주를 멈추지 않았다.`,
        choices: [
          { label: '그 아이 귀를 똑같이 잡아당긴다', fx: { stat: { wil: 0.4 }, aff: { patron: -4 }, stress: 4, flag: 'em_tugged' }, out: () => '그 아이가 울었다. 연회장이 조용해졌다. 그날 우리 집 사례금은 반으로 줄었다. 어머니는 내 머리를 쓰다듬었다. 화내지 않았다.' },
          { label: '웃으며 "진짜야"라고 한다', fx: { stat: { cha: 0.5 }, aff: { patron: 4 } }, out: () => '귀족 아이는 신기해하며 나를 따라다녔다. 저녁이 끝날 무렵 그 애는 내 이름을 잊었다. 나는 그 애 이름을 아직 안다.' },
          { label: '하프 뒤에 숨어 연주를 듣는다', fx: { skill: { letters: 1 }, stat: { sen: 0.4 } }, out: () => '하프 줄 사이로 사람들을 보았다. 다들 웃고 마시고 금방 잊었다. 음악만 그 방에 오래 남았다.' },
        ] },
      { id: 'em_guild', age: [9, 12], title: '악사 길드의 시험',
        text: (c) => `악사 길드가 견습 시험을 열었다. 엘프는 받지 않는다는 규칙은 없다. 받은 적도 없다. ${J(c.t.rival, '이/가')} 내 앞 순서다.`,
        choices: [
          { label: '사람 노래를 사람보다 잘 부른다', fx: { skill: { letters: 2 }, stat: { cha: 0.4 }, aff: { rival: -8 }, flag: 'em_guild' }, out: () => '심사관들이 서로 눈치를 보았다. 결국 이름을 올려 주었다. 맨 아래 줄에, 작은 글씨로.' },
          { label: '엘프 옛노래를 부른다', fx: { skill: { magic: 1 }, stat: { sen: 0.5 }, flag: 'em_old' }, out: () => '아무도 가사를 몰랐다. 노래가 끝났을 때 심사관 하나가 눈가를 훔쳤다. 이름은 올라가지 않았다. 그 심사관이 나중에 따로 찾아왔다.' },
          { label: '시험을 포기하고 그 애를 응원한다', fx: { aff: { rival: 12 }, stat: { wil: 0.3 } }, out: (c) => `${J(c.t.rival, '은/는')} 붙었다. 나와 눈이 마주치자 고개를 돌렸다. 다음 날 연습실 문 앞에 사과 한 알이 놓여 있었다.` },
        ] },
      { id: 'em_song', age: [13, 15], title: '첫 노래',
        text: (c) => `${c.t.patron} 부인이 자기 생일 연회에서 내가 지은 노래를 듣고 싶다고 했다. 무엇을 노래할지는 내 마음이다. 손님 중에는 왕실 사람도 있다.`,
        choices: [
          { label: '부인을 기리는 노래를 짓는다', fx: { money: 15, aff: { patron: 10 }, stat: { cha: 0.3 } }, out: () => '부인이 울었다. 손님들이 잔을 들었다. 사례금은 넉넉했다. 그 노래는 이듬해 다른 부인의 이름으로 바뀌어 불렸다.' },
          { label: '사람보다 오래 사는 이의 노래를 짓는다', fx: { skill: { letters: 2 }, stat: { sen: 0.5 }, renown: 2, flag: 'em_song' }, out: () => '연회장이 조용해졌다. 박수는 늦게, 그리고 오래 나왔다. 왕실 사람 하나가 노래 제목을 물었다. 아직 없다고 했다.' },
          { label: '귀족을 비꼬는 노래를 짓는다', fx: { stat: { wil: 0.5 }, aff: { patron: -12 }, renown: 3, stress: 8, flag: 'em_satire' }, out: () => '귀족들은 웃었다. 자기 이야기인 줄 모르고. 부인만 알아들었다. 다음 철 초대장은 오지 않았다. 그 노래는 술집에서 먼저 유명해졌다.' },
        ] },
    ],
    check: (g, s) => !!(s.flags.em_song || s.flags.em_satire) || sk(g, 'letters') >= 18 || ren(g) >= 12,
    burdenScene: {
      title: '연회장의 청', text: (c) => `${c.t.patron} 부인의 조카가 나를 연회에 불렀다. 연주가 아니라 "엘프를 보여 주는" 자리다. 귀족 사내들이 내 귀와 얼굴을 놓고 내기를 걸었다고 한다. 거절하면 집안의 연회 자리가 끊긴다.`,
      choices: [
        { label: '가서 연주만 하고 나온다', key: 'play', test: (g) => st(g, 'cha') + sk(g, 'letters'), dc: 55, ok: { fx: { stat: { cha: 0.5 }, renown: 2 }, out: () => '구경하러 온 사람들이 연주가 끝날 즈음엔 내기를 잊고 있었다. 나오는 길에 조카가 처음으로 내 이름을 불렀다.' }, bad: { fx: { stress: 14, money: 10 }, out: () => '연주는 아무도 듣지 않았다. 웃음소리만 기억난다. 받은 은화를 길가 거지 그릇에 다 넣었다.' } },
        { label: '거절한다', key: 'no', fx: { fam: -25, aff: { patron: -8, father: 4 }, stat: { wil: 0.6 } }, out: () => '연회 자리 셋이 한꺼번에 끊겼다. 아버지는 하프를 손질하며 "할아버지도 그랬다"고만 했다. 그날 저녁은 묽은 수프였다.' },
        { label: '그 자리를 노래로 만들어 퍼뜨린다', key: 'song', fx: { renown: 3, aff: { patron: -15 }, stress: 6, flag: 'em_satire' }, out: () => '석 달 뒤 왕도 술집마다 "귀를 세는 귀족들" 노래를 불렀다. 그 조카는 한동안 연회를 열지 않았다.' },
      ],
    },
  },
  {
    id: 'elf_freed', race: 'elf',
    name: '사슬을 벗은 엘프 집안',
    desc: '살트마레 노예 시장에서 팔려 왔다가 십 년 일하고 증서를 받아 풀려난 엘프 부부. 포르텔 뒷골목에서 실을 잣고 약초를 판다. 어머니 손목에는 쇠고랑 자국이 아직 있다. 아이는 자유 증서가 든 나무 상자를 보물처럼 여기며 자란다. 낯선 사람이 오래 쳐다보면 집 문이 닫힌다.',
    money: 20, fatherJob: 'weaver', motherJob: 'herbalist',
    statBias: { sen: 4, wil: 4, agi: 2 }, skillBias: { herbs: 4, trade: 2 },
    standing: '풀려난 자', lastNames: ['달그늘', '은잎'], place: 'portel', fit: 'trade',
    want: { name: '사슬 없는 자리', text: '부모는 내가 다시는 누구의 물건도 되지 않을 만큼 단단히 자리 잡기를 바란다.' },
    burden: { name: '옛 주인의 장부', text: '부모를 팔았던 상단의 장부는 아직 어딘가 남아 있다.' },
    ties: [
      { role: 'freed', sex: 'f', age: [200, 340], job: 'weaver', race: 'elf', aff: 30, word: '같이 풀려난 엘프 아주머니' },
      { role: 'watcher', sex: 'm', age: [35, 50], job: 'sailor', race: 'human', aff: -10, word: '눈길이 끈적한 뱃사람' },
    ],
    lines: [
      (c) => `${J(c.mo, '은/는')} 밤마다 나무 상자를 열어 자유 증서가 그대로 있는지 확인한다. 증서는 늘 그대로다.`,
      (c) => `${c.t.freed} 아주머니가 엘프 옛말로 자장가를 불러 주었다. 노래 중간에 사슬 소리를 흉내 내는 대목이 있었다. 원래 노래에는 없던 대목이라고 했다.`,
      (c) => `부두에서 ${J(c.t.watcher, '이/가')} 또 나를 오래 보았다. ${J(c.fa, '이/가')} 내 손을 잡고 길을 건넜다. 손에 땀이 나 있었다.`,
    ],
    scenes: [
      { id: 'ef_box', age: [5, 8], title: '나무 상자',
        text: (c) => `${J(c.mo, '이/가')} 처음으로 나무 상자를 열어 보여 주었다. 누런 종이에 붉은 봉랍. "이게 있어서 우리는 사람이다." 아버지가 종이를 가리키며 글자를 하나씩 읽어 주었다.`,
        choices: [
          { label: '글자를 다 외운다', fx: { skill: { letters: 2 }, stat: { int: 0.3 }, aff: { mother: 4 } }, out: () => '그 밤에 증서를 다 외웠다. 지금도 외운다. 뜻을 다 알게 된 건 한참 뒤였다.' },
          { label: '"종이가 없으면?" 하고 묻는다', fx: { stat: { wil: 0.4 }, aff: { father: 2 }, flag: 'ef_asked' }, out: (c) => `${J(c.fa, '은/는')} 대답하지 않았다. 대신 다음 날부터 내게 칼 대신 쓸 수 있는 것들을 가르쳤다. 뜨개바늘, 약초 칼, 빠른 발.` },
          { label: '상자를 꼭 끌어안는다', fx: { aff: { mother: 6 }, stress: -2 }, out: () => '어머니가 나와 상자를 같이 끌어안았다. 셋이 한참 그러고 있었다. 창밖에서 뱃고동이 울렸다.' },
        ] },
      { id: 'ef_market', age: [9, 12], title: '부두 시장',
        text: (c) => `약초를 팔러 부두 시장에 나갔다. ${J(c.t.watcher, '이/가')} 다가와 동전을 흔들었다. "얼마면 따라오겠냐, 꼬마 엘프." 주변 사람들이 못 들은 척한다.`,
        choices: [
          { label: '큰 소리로 경비대를 부른다', fx: { stat: { wil: 0.5, cha: 0.3 }, aff: { watcher: -15 }, flag: 'ef_shouted' }, out: () => '경비대는 늦게 왔다. 사내는 이미 사라졌다. 그래도 시장 사람들이 그 뒤로 나를 알아보았다. 약초 값을 깎는 사람이 줄었다.' },
          { label: '사람들 사이로 빠져 달아난다', fx: { stat: { agi: 0.6 }, stress: 4 }, out: () => '골목을 세 번 꺾었다. 숨이 찼다. 집 문을 닫고서야 바구니를 놓고 왔다는 걸 알았다. 어머니는 바구니 얘기는 하지 않았다.' },
          { label: '약초 칼을 꺼내 보인다', fx: { stat: { str: 0.3, wil: 0.4 }, aff: { watcher: -8 }, stress: 6 }, out: () => '사내가 웃다가 멈췄다. 내 손이 떨리지 않는 걸 본 것이다. 사내가 물러갔다. 집에 와서야 손이 떨렸다.' },
        ] },
      { id: 'ef_ledger', age: [13, 15], title: '같은 처지',
        text: (c) => `${c.t.freed} 아주머니가 소식을 가져왔다. 살트마레에서 엘프 소녀 하나가 이번 경매에 나온다고. 몸값은 은화 백 닢. 우리 집에 그런 돈은 없다. ${J(c.fa, '은/는')} 밤새 잠들지 못했다.`,
        choices: [
          { label: '집안 모은 돈을 보태자고 한다', fx: { fam: -30, aff: { freed: 15, father: 6 }, stat: { wil: 0.4 }, flag: 'ef_helped' }, out: () => '포르텔 엘프들이 은화를 모았다. 모자랐다. 아주머니가 물레를 팔았다. 그래도 모자랐다. 결국 경매 날 값이 맞았다. 소녀는 우리 집 골목 끝 집에서 산다.' },
          { label: '경매장에 가서 지켜본다', fx: { stat: { sen: 0.5 }, stress: 10, flag: 'ef_saw' }, out: () => '단 위의 소녀와 눈이 마주쳤다. 다른 상인이 사 갔다. 그 상인의 문장을 외웠다. 왜 외웠는지는 나도 모른다.' },
          { label: '아무것도 못 한다고 받아들인다', fx: { stress: 6, aff: { father: -2 } }, out: () => '아버지는 그날 일을 나가지 않았다. 둘이 부두 끝에 앉아 살트마레 쪽 바다를 보았다. 아무 말도 하지 않았다.' },
        ] },
    ],
    check: (g, s) => (g.player.money ?? 0) + (g.player.familyMoney ?? 0) >= 150 || sk(g, 'trade') >= 15 || !!s.flags.ef_helped,
    burdenScene: {
      title: '옛 주인의 장부', text: (c) => `낯선 상단 서기가 집에 왔다. 옛 장부에 ${c.mo}의 이름이 아직 '빚 남음'으로 되어 있다고. 증서는 그 빚이 다 갚아진 뒤에 나온 것이라고 해도, 장부는 장부라고 한다. 은화 60닢을 내든가, 법정에서 가리든가.`,
      choices: [
        { label: '법정에 증서를 내민다', key: 'court', test: (g) => sk(g, 'letters') + st(g, 'int') + st(g, 'cha') / 2, dc: 60, ok: { fx: { renown: 2, aff: { mother: 10 }, flag: 'ef_won' }, out: () => '재판관이 증서의 봉랍을 한참 들여다보았다. "이 증서가 장부보다 늦다." 그 한마디로 끝났다. 어머니는 법정 계단에서 주저앉아 웃었다.' }, bad: { fx: { fam: -40, stress: 14 }, out: () => '재판관은 장부 쪽 손을 들었다. 은화 60닢 가운데 40닢은 내가 일해서 갚기로 했다. 증서는 여전히 상자 안에 있다. 이제는 조금 가벼워 보인다.' } },
        { label: '은화를 모아 갚는다', key: 'pay', fx: { fam: -45, money: -15, aff: { mother: 6 }, stress: 6 }, out: () => '모자란 돈은 골목 엘프들이 채웠다. 서기는 장부의 줄을 긋고 갔다. 어머니가 그 줄을 보고 싶다고 했지만 서기는 장부를 덮었다.' },
        { label: '식구들과 포르텔을 떠난다', key: 'leave', fx: { stress: 10, aff: { freed: -6 }, flag: 'ef_left' }, out: () => '밤배를 탔다. 어머니는 나무 상자를 품에 안고 있었다. 배가 항구를 나서자 처음으로 상자를 열지 않고 잠들었다.' },
      ],
    },
  },
  /* ---------------- 드워프 ---------------- */
  {
    id: 'dwarf_heir', race: 'dwarf',
    name: '쇠망치 골 씨족장 집안',
    desc: '쇠망치 골 가장 깊은 갱을 가진 씨족의 장손 집안. 아버지는 씨족장이고, 집안 대장간 화로는 삼백 년째 꺼진 적이 없다. 아이는 태어난 날부터 씨족의 다음 망치로 불린다. 씨족 회의, 족보, 광맥 다툼이 어린 날의 이야깃거리다.',
    money: 120, fatherJob: 'clan_chief', motherJob: 'smith',
    statBias: { str: 4, wil: 5, int: 1 }, skillBias: { smithing: 6, trade: 2 },
    standing: '씨족 장손', lastNames: ['깊은 갱', '붉은 모루'], place: 'hammer', fit: 'craft',
    want: { name: '씨족의 망치', text: '씨족은 내가 아버지의 망치를 물려받아 화로를 지키기를 바란다.' },
    burden: { name: '이웃 씨족과의 광맥 다툼', text: '이웃 씨족은 우리 갱 밑을 지나는 은맥이 자기들 것이라고 우긴다.' },
    ties: [
      { role: 'uncle', sex: 'm', age: [90, 140], job: 'miner', race: 'dwarf', aff: 25, word: '외눈 숙부' },
      { role: 'rival', sex: 'm', age: [8, 12], job: 'child', race: 'dwarf', aff: -10, riv: 40, word: '이웃 씨족 장손' },
    ],
    lines: [
      (c) => `${c.t.uncle} 숙부가 갱도 벽을 두드려 보더니 "여기 아래 물이 있다"고 했다. 사흘 뒤 정말 물이 나왔다.`,
      () => '씨족 족보 낭독이 사흘째다. 내 이름은 맨 끝에 한 번 나왔다. 그 한 번에 다들 나를 쳐다봤다.',
      (c) => `${J(c.fa, '은/는')} 화로 앞에서 말이 없다. 망치 소리로 기분을 안다. 오늘은 세 번 치고 한 번 쉰다. 좋은 날이다.`,
    ],
    scenes: [
      { id: 'dh_hammer', age: [5, 8], title: '첫 망치',
        text: (c) => `${J(c.fa, '이/가')} 내 손에 작은 망치를 쥐여 주었다. 씨족 아이들은 다섯 살에 첫 못을 친다. 화로 앞에 씨족 어른들이 모였다. 다들 숨을 죽였다.`,
        choices: [
          { label: '이를 악물고 못을 바로 친다', fx: { skill: { smithing: 2 }, stat: { str: 0.4 }, aff: { father: 6 } }, out: () => '세 번 만에 못이 섰다. 어른들이 수염을 쓸며 고개를 끄덕였다. 그 못은 아직 집 문설주에 박혀 있다.' },
          { label: '못 대신 망치를 들여다본다', fx: { stat: { int: 0.5 }, aff: { uncle: 4 }, flag: 'dh_looked' }, out: (c) => `망치 머리에 새겨진 씨족 문장을 손으로 따라 그렸다. 어른들은 혀를 찼다. ${c.t.uncle} 숙부만 웃었다. "이 녀석은 망치보다 망치 만든 손을 궁금해하는군."` },
          { label: '너무 세게 쳐서 손을 찧는다', fx: { stat: { wil: 0.5 }, stress: 4 }, out: () => '손가락이 부었다. 울지 않았다. 아버지가 내 손을 붕대로 감으며 "씨족장은 다 한 번씩 찧는다"고 했다. 그 말이 붕대보다 따뜻했다.' },
        ] },
      { id: 'dh_dark', age: [9, 12], title: '불 꺼진 갱',
        text: (c) => `${c.t.uncle} 숙부를 따라 깊은 갱에 내려갔다가 등불이 꺼졌다. 위쪽에서 돌 구르는 소리가 났다. 숙부가 내 어깨를 잡았다. "움직이지 마라. 들어라."`,
        choices: [
          { label: '숙부를 믿고 가만히 듣는다', fx: { stat: { sen: 0.6, wil: 0.4 }, aff: { uncle: 8 } }, out: () => '물방울 소리, 바람 소리, 내 숨소리. 숙부가 바람 쪽을 가리켰다. 한나절 만에 옆 갱으로 나왔다. 숙부는 그날 일을 아버지에게 말하지 않았다.' },
          { label: '손으로 벽을 짚어 길을 찾는다', fx: { stat: { agi: 0.4, int: 0.4 }, skill: { smithing: 1 } }, out: () => '벽의 결이 바뀌는 곳을 찾았다. 거기서부터는 망치 자국이 있었다. 사람이 판 길이다. 숙부가 내 머리를 헝클었다.' },
          { label: '소리쳐 사람을 부른다', fx: { stress: 6, aff: { father: -2 } }, out: () => '소리가 갱 안을 울렸다. 돌이 더 떨어졌다. 숙부가 내 입을 막았다. 한참 뒤 구조대가 왔다. 아버지는 그날 밤 아무 말도 하지 않았다.' },
        ] },
      { id: 'dh_council', age: [13, 15], title: '씨족 회의',
        text: (c) => `씨족 회의에서 이웃 씨족 장손 ${J(c.t.rival, '이/가')} 내게 시합을 걸었다. 망치질 백 번, 누가 더 고른 쇠판을 만드나. 진 쪽 씨족은 다음 해 광맥 다툼에서 먼저 말할 수 없다.`,
        choices: [
          { label: '받아들여 끝까지 친다', fx: { skill: { smithing: 3 }, stat: { str: 0.5 }, aff: { rival: -6, father: 4 }, flag: 'dh_match' }, out: () => '백 번째 망치에서 팔이 떨렸다. 쇠판 둘을 나란히 놓자 어른들이 오래 들여다보았다. 비겼다고 했다. 둘 다 그 말을 믿지 않았다.' },
          { label: '"쇠가 아니라 말로 하자"고 받아친다', fx: { stat: { cha: 0.5, int: 0.3 }, aff: { rival: 4 } }, out: () => '어른들이 웃었다. 드워프 회의에서 처음 나온 말은 아니다. 처음 통한 말이었다.' },
          { label: '숙부에게 대신 서 달라고 한다', fx: { aff: { uncle: 2, father: -6 }, stress: 4 }, out: () => '숙부는 고개를 저었다. "장손의 싸움은 장손이 한다." 결국 내가 섰다. 지고 나서 숙부가 내 쇠판을 집에 가져갔다. 아직 걸려 있다.' },
        ] },
    ],
    check: (g, s) => sk(g, 'smithing') >= 20 || !!s.flags.dh_match,
    burdenScene: {
      title: '은맥 다툼', text: (c) => `이웃 씨족이 우리 갱 바로 밑으로 새 갱을 뚫기 시작했다. ${J(c.fa, '은/는')} 씨족 회의에서 내게 말을 맡겼다. ${J(c.t.rival, '이/가')} 건너편에 앉아 있다.`,
      choices: [
        { label: '족보와 옛 지도로 따진다', key: 'record', test: (g) => sk(g, 'letters') + st(g, 'int') + st(g, 'wil') / 2, dc: 55, ok: { fx: { renown: 3, aff: { father: 10, rival: -10 }, flag: 'dh_won' }, out: () => '이백 년 전 지도에 우리 씨족 망치 자국이 찍혀 있었다. 건너편 장로들이 한참 수군거리더니 새 갱을 메우기로 했다.' }, bad: { fx: { stress: 12, fam: -30 }, out: () => '그쪽 지도가 더 오래되었다. 은맥 절반을 내주었다. 아버지는 회의장을 나서며 내 등을 한 번 두드렸다. 그게 더 무거웠다.' } },
        { label: '은맥을 나눠 같이 캐자고 한다', key: 'share', fx: { aff: { rival: 12, father: -4 }, fam: 20, stat: { cha: 0.4 } }, out: () => '두 씨족이 한 갱에서 일하게 되었다. 처음 한 해는 싸움이 잦았다. 그다음 해에는 혼담이 오갔다.' },
        { label: '씨족 장정들을 모아 갱을 막는다', key: 'block', fx: { stat: { str: 0.5 }, aff: { rival: -20 }, stress: 10, renown: 2 }, out: () => '갱 입구에서 두 씨족이 곡괭이를 들고 마주 섰다. 피는 보지 않았다. 그 뒤로 두 씨족 아이들은 같은 우물을 쓰지 않는다.' },
      ],
    },
  },
  {
    id: 'dwarf_trader', race: 'dwarf',
    name: '지상에 나온 드워프 상인 집안',
    desc: '산을 떠나 제도 아이젠베르크에 상점을 낸 드워프 상인 집안. 씨족 대장간에서 만든 칼과 자물쇠를 사람들에게 판다. 산의 씨족은 "흙을 버린 집"이라 부르고, 제도 사람들은 "산에서 온 장사꾼"이라 부른다. 아이는 두 말을 다 하며 자란다.',
    money: 140, fatherJob: 'merchant', motherJob: 'shopkeeper',
    statBias: { int: 3, cha: 3, wil: 3 }, skillBias: { trade: 6, smithing: 2 },
    standing: '외지 상인', lastNames: ['청동팔', '쇠망치'], place: 'eisen', fit: 'trade',
    want: { name: '두 세상 사이의 상단', text: '부모는 내가 산과 제도를 잇는 큰 상단을 꾸리기를 바란다.' },
    burden: { name: '흙을 버린 집', text: '산의 씨족은 우리를 반쯤만 씨족으로 친다.' },
    ties: [
      { role: 'clanuncle', sex: 'm', age: [110, 160], job: 'smith', race: 'dwarf', aff: 0, word: '산에 남은 큰아버지' },
      { role: 'clerk', sex: 'f', age: [25, 35], job: 'guild_clerk', race: 'human', aff: 20, word: '상점 사람 점원' },
    ],
    lines: [
      (c) => `${c.t.clerk} 누나가 장부를 보다가 "드워프 셈은 왜 다 여덟 단위예요?" 하고 물었다. 아버지는 손가락이 여덟 개 남은 할아버지 이야기를 했다. 농담인지는 모른다.`,
      () => '제도 귀족이 우리 가게 자물쇠를 샀다. 열쇠는 둘. 하나는 주인에게, 하나는 아무에게도. 드워프 자물쇠의 규칙이다.',
      (c) => `산에서 ${c.t.clanuncle} 큰아버지의 편지가 왔다. 편지보다 짐이 더 컸다. 쇳덩이 하나. 아버지가 그걸 두드려 보고 한숨을 쉬었다. 좋은 쇠였다.`,
    ],
    scenes: [
      { id: 'dt_shop', age: [5, 8], title: '가게 계산대',
        text: (c) => `가게에 혼자 남았을 때 사람 손님이 칼 한 자루를 들고 "이거 반값에 안 되냐"고 했다. 키가 계산대에 겨우 닿는다. ${J(c.t.clerk, '은/는')} 창고에 갔다.`,
        choices: [
          { label: '값을 그대로 부른다', fx: { skill: { trade: 1.5 }, stat: { wil: 0.4 }, aff: { father: 4 } }, out: () => '손님이 웃다가 정색했다. 결국 제값에 샀다. 아버지가 돌아와 장부를 보더니 내게 동전 한 닢을 쥐여 주었다. 첫 품삯이었다.' },
          { label: '칼이 왜 비싼지 설명한다', fx: { skill: { trade: 1, smithing: 1 }, stat: { int: 0.3 } }, out: () => '쇠를 몇 번 접었는지, 담금질이 몇 번인지. 손님은 듣다가 웃었다. "꼬마 대장장이구먼." 반값은 아니었지만 조금 깎아 주었다.' },
          { label: '반값에 판다', fx: { fam: -10, aff: { father: -4 }, stat: { cha: 0.3 } }, out: () => '손님이 신나서 갔다. 아버지는 장부를 보고 한참 말이 없더니 "반값은 반쪽 칼에만 붙인다"고 했다. 그 말을 오래 기억했다.' },
        ] },
      { id: 'dt_clan', age: [9, 12], title: '산의 잔치',
        text: (c) => `씨족 잔치에 처음 올라갔다. ${c.t.clanuncle} 큰아버지가 나를 화로 앞에 세웠다. "흙 버린 집 아이가 망치는 드는지 보자." 씨족 사람들이 둘러섰다.`,
        choices: [
          { label: '망치를 들고 씨족식으로 친다', fx: { skill: { smithing: 2 }, aff: { clanuncle: 10 }, stat: { str: 0.4 }, flag: 'dt_clan' }, out: () => '서툴렀다. 그래도 끝까지 쳤다. 큰아버지가 처음으로 내 이름을 불렀다. 잔치 내내 내 잔은 비지 않았다.' },
          { label: '제도에서 가져온 물건을 펼쳐 보인다', fx: { skill: { trade: 2 }, aff: { clanuncle: -4 }, stat: { cha: 0.3 } }, out: () => '유리 렌즈와 시계 태엽에 젊은 드워프들이 몰려들었다. 큰아버지는 혀를 찼다. 다음 날 큰아버지 대장간 창가에 그 렌즈가 놓여 있었다.' },
          { label: '"우린 흙을 버린 게 아니다"라고 말한다', fx: { stat: { wil: 0.6 }, aff: { clanuncle: -2, father: 4 } }, out: () => '잔치가 조용해졌다. 큰아버지가 한참 나를 보다가 껄껄 웃었다. "그 고집은 씨족 거구나."' },
        ] },
      { id: 'dt_deal', age: [13, 15], title: '첫 흥정',
        text: (c) => `아버지가 제도 상단과의 거래 하나를 내게 맡겼다. 씨족 칼 스무 자루. 상단 사람은 값을 깎으며 "산에서 온 물건은 흠이 많다"고 한다. 흠은 없다. 상단은 이 칼을 군대에 비싸게 넘길 것이다.`,
        choices: [
          { label: '값을 올려 부른다', fx: { skill: { trade: 3 }, stat: { cha: 0.3 }, fam: 25, flag: 'dt_deal' }, out: () => '상단 사람이 일어섰다가 다시 앉았다. 군대 납기가 급한 것이다. 처음 부른 값보다 두 할을 더 받았다. 아버지가 장부를 보고 소리 내어 웃었다.' },
          { label: '칼 하나를 쪼개 흠이 없음을 보인다', fx: { skill: { trade: 1.5, smithing: 1 }, renown: 1 }, out: () => '칼 한 자루를 바이스에 물려 꺾었다. 결이 고르게 빛났다. 상단 사람이 입을 다물었다. 남은 열아홉 자루는 제값에 나갔다.' },
          { label: '상단이 군대에 넘길 값을 알아낸다', fx: { skill: { trade: 2 }, stat: { int: 0.5 }, flag: 'dt_learned' }, out: () => '병영 서기에게 술을 샀다. 상단은 우리 값의 세 배를 받기로 되어 있었다. 이번 거래는 그대로 했다. 다음 거래부터는 상단을 거치지 않았다.' },
        ] },
    ],
    check: (g, s) => sk(g, 'trade') >= 20 || !!s.flags.dt_deal || (g.player.money ?? 0) >= 200,
    burdenScene: {
      title: '씨족의 부름', text: (c) => `산에서 전갈이 왔다. 씨족 갱이 무너져 장정이 모자란다. ${c.t.clanuncle} 큰아버지가 "흙을 버린 집도 씨족이라면" 한 사람을 보내라고 했다. 가게는 지금 대목이다.`,
      choices: [
        { label: '산으로 올라간다', key: 'go', fx: { skill: { smithing: 3 }, stat: { str: 0.5 }, aff: { clanuncle: 15, father: 4 }, fam: -20, stress: 8, flag: 'dt_clan' }, out: () => '한 철을 갱에서 보냈다. 손바닥이 갈라졌다. 돌아오는 날 큰아버지가 씨족 문장이 찍힌 쇠고리를 내 허리에 걸어 주었다.' },
        { label: '돈과 물자를 보낸다', key: 'send', fx: { fam: -35, aff: { clanuncle: 2 }, stat: { int: 0.3 } }, out: () => '나무 기둥 백 개와 등불 기름을 보냈다. 큰아버지의 답장은 한 줄이었다. "기둥은 받았다." 고맙다는 말은 없었다. 드워프식으로는 고맙다는 말이었다.' },
        { label: '가게를 지킨다', key: 'stay', fx: { fam: 30, aff: { clanuncle: -15 }, stress: 4 }, out: () => '대목을 넘겼다. 장부는 두꺼워졌다. 그해 씨족 잔치 초대장은 오지 않았다. 다음 해에도.' },
      ],
    },
  },
  {
    id: 'dwarf_outcast', race: 'dwarf',
    name: '쫓겨난 드워프 씨족',
    desc: '마물 깨운 갱을 연 죄로 쇠망치 골에서 쫓겨난 작은 씨족. 지금은 구렁목 바깥 비탈에 굴을 파고 산다. 산의 다른 씨족은 이 집안 이름을 족보에서 지웠다. 모험가들의 장비를 고쳐 주며 먹고산다. 아이는 이름 없는 씨족의 아이로 자란다.',
    money: 25, fatherJob: 'smith', motherJob: 'miner',
    statBias: { str: 4, wil: 4, sen: 2 }, skillBias: { smithing: 5, sword: 2 },
    standing: '쫓겨난 씨족', lastNames: ['불꽃손', '돌수염'], place: 'gorge', fit: 'craft',
    want: { name: '족보에 다시 오르는 이름', text: '집안은 언젠가 씨족 이름이 족보에 다시 오르기를 바란다.' },
    burden: { name: '마물 깨운 갱', text: '산의 씨족은 그 갱에서 나온 일을 아직 우리 탓으로 돌린다.' },
    ties: [
      { role: 'elder', sex: 'm', age: [180, 240], job: 'smith', race: 'dwarf', aff: 25, word: '씨족의 마지막 장로' },
      { role: 'adventurer', sex: 'f', age: [22, 30], job: 'adventurer', race: 'human', aff: 15, word: '단골 모험가' },
    ],
    lines: [
      (c) => `${c.t.elder} 장로가 그 갱 이야기를 또 했다. 우리가 연 게 아니라 이미 열려 있었다고. 들을 때마다 조금씩 이야기가 달라진다.`,
      (c) => `${J(c.t.adventurer, '이/가')} 이 빠진 칼을 맡기고 갔다. 갱 아래층에서 무엇과 싸웠는지 말해 주었다. 아버지는 듣는 내내 망치를 멈추지 않았다.`,
      () => '산 위 씨족의 행렬이 구렁목 길을 지나갔다. 아무도 우리 굴 쪽을 보지 않았다. 아버지도 보지 않았다.',
    ],
    scenes: [
      { id: 'do_name', age: [5, 8], title: '지워진 이름',
        text: (c) => `${c.t.elder} 장로가 낡은 족보 한 장을 보여 주었다. 우리 씨족 이름 위로 검은 줄이 그어져 있다. "이걸 다시 지우는 게 내 평생 일이었다. 이제 네 일이다."`,
        choices: [
          { label: '"제가 지울게요"라고 약속한다', fx: { stat: { wil: 0.6 }, aff: { elder: 8 }, flag: 'do_vow' }, out: () => '장로가 내 손을 족보 위에 얹었다. 검은 줄 위로. 손이 작아서 줄 끝까지 덮지 못했다. 장로는 "자라면 덮는다"고 했다.' },
          { label: '"왜 지워졌어요?"라고 묻는다', fx: { stat: { int: 0.4 }, skill: { letters: 1 } }, out: () => '장로가 처음부터 이야기했다. 해가 질 때까지. 이야기 속에 우리 씨족이 잘못한 대목도 있었다. 장로는 그 대목에서 목소리를 낮췄다.' },
          { label: '족보를 내려놓고 나가 논다', fx: { stress: -2, aff: { elder: -2 } }, out: () => '비탈에서 돌을 굴리며 놀았다. 굴 입구에 장로가 족보를 든 채 오래 앉아 있었다. 저녁에 돌아오니 족보는 다시 상자에 들어가 있었다.' },
        ] },
      { id: 'do_blade', age: [9, 12], title: '모험가의 칼',
        text: (c) => `${J(c.t.adventurer, '이/가')} 부러진 칼을 들고 왔다. 내일 아침 다시 갱에 내려가야 한다. 아버지는 앓아누웠다. 대장간에는 나뿐이다.`,
        choices: [
          { label: '밤새 혼자 칼을 벼린다', fx: { skill: { smithing: 3 }, stat: { str: 0.3, wil: 0.4 }, aff: { adventurer: 10 }, stress: 6, flag: 'do_blade' }, out: () => '새벽에 칼이 나왔다. 투박했다. 모험가가 휘둘러 보더니 웃었다. 사흘 뒤 그 칼로 갱에서 살아 돌아왔다고 했다.' },
          { label: '집에 있는 좋은 칼을 빌려준다', fx: { aff: { adventurer: 6, father: -4 }, fam: -10 }, out: () => '아버지가 아끼던 칼이었다. 모험가는 돌려주러 오지 못했다. 한 달 뒤 그 칼만 길드를 통해 돌아왔다. 아버지는 칼을 받아 들고 한참 서 있었다.' },
          { label: '못 한다고 돌려보낸다', fx: { stat: { wil: 0.2 }, aff: { adventurer: -6 } }, out: () => '모험가는 고개를 끄덕이고 갔다. 다른 대장간을 찾아갔다고 한다. 그 뒤로 우리 굴에는 잘 오지 않았다.' },
        ] },
      { id: 'do_deep', age: [13, 15], title: '그 갱',
        text: (c) => `구렁목 아래 버려진 우리 씨족 갱 입구를 찾았다. 쇠문에 씨족 문장이 그대로 있다. 문틈에서 차가운 바람이 나온다. ${c.t.elder} 장로는 절대 열지 말라고 했다.`,
        choices: [
          { label: '문에 귀를 대고 듣기만 한다', fx: { stat: { sen: 0.5 }, flag: 'do_heard' }, out: () => '아주 멀리서 무언가 긁는 소리가 났다. 규칙적이었다. 망치 소리 같기도 했다. 돌아와서 장로에게 말했더니 장로가 처음으로 겁먹은 얼굴을 했다.' },
          { label: '문장을 탁본해 간다', fx: { skill: { letters: 1.5 }, stat: { int: 0.4 }, aff: { elder: 4 } }, out: () => '숯으로 문장을 떠 왔다. 장로가 그걸 보고 울었다. 백 년 만에 본다고 했다. 그 종이는 장로 침상 머리맡에 붙었다.' },
          { label: '돌아서서 다시는 오지 않는다', fx: { stat: { wil: 0.4 }, stress: -2 }, out: () => '뒤돌아 걸었다. 바람이 등을 밀었다. 그 뒤로 그 길로는 다니지 않았다.' },
        ] },
    ],
    check: (g, s) => sk(g, 'smithing') >= 18 || ren(g) >= 10 || !!s.flags.do_blade,
    burdenScene: {
      title: '산의 사절', text: (c) => `쇠망치 골 씨족 회의에서 사절이 내려왔다. 구렁목 아래에서 다시 마물이 올라오고 있다. 그 갱을 아는 씨족은 우리뿐이다. 길잡이를 해 주면 족보 일을 "의논해 보겠다"고 한다.`,
      choices: [
        { label: '길잡이가 되어 갱에 내려간다', key: 'guide', test: (g) => st(g, 'str') + st(g, 'sen') + (g.player.skills.sword ?? 0), dc: 80, ok: { fx: { renown: 5, aff: { elder: 15 }, flag: 'do_restored' }, out: () => '갱 깊은 곳 쇠문을 다시 닫아 걸었다. 씨족 문장 위로 새 빗장을 박았다. 석 달 뒤 장로에게 편지가 왔다. 검은 줄 하나가 지워졌다.' }, bad: { fx: { stress: 16, injury: '갱에서 다친 다리' }, out: () => '갱 중간에서 무너짐을 만났다. 사절들과 간신히 빠져나왔다. 문은 닫지 못했다. 회의는 "다음에 의논하자"고 했다.' } },
        { label: '족보부터 고쳐 달라고 한다', key: 'first', fx: { stat: { wil: 0.5 }, aff: { elder: 6 }, stress: 6 }, out: () => '사절은 그런 권한이 없다고 했다. 한 철 뒤 다른 길잡이를 구했다는 소식이 왔다. 장로는 "그래도 잘했다"고 했다. 진심인지 모르겠다.' },
        { label: '거절한다', key: 'no', fx: { aff: { elder: -8 }, stat: { wil: 0.3 } }, out: () => '사절은 아무 말 없이 돌아갔다. 그날 밤 장로가 족보 상자를 열었다 닫았다 했다. 소리가 굴 안에 오래 울렸다.' },
      ],
    },
  },
  /* ---------------- 수인 ---------------- */
  {
    id: 'beast_wolf', race: 'beast',
    name: '회색 갈기 늑대 부족',
    desc: '털가죽 시장 북쪽 숲에 천막을 친 늑대 부족. 열댓 집이 한 무리로 사냥하고 함께 겨울을 난다. 사람 상인과 가죽을 바꾸지만 시장 바깥에서는 서로 길을 비켜 간다. 아이는 무리의 냄새와 부족장의 울음소리를 먼저 배운다.',
    money: 20, fatherJob: 'tribe_chief', motherJob: 'hunter',
    statBias: { sen: 5, agi: 3, str: 2 }, skillBias: { herbs: 3, sword: 2 },
    standing: '부족민', lastNames: ['회색 갈기'], place: 'fur', fit: 'sword',
    want: { name: '무리를 이끄는 목소리', text: '부족은 내가 언젠가 무리 맨 앞에서 울음을 올리기를 바란다.' },
    burden: { name: '사람 사냥꾼들', text: '털가죽 시장의 사람 상인 중에는 수인 가죽 값을 묻는 자도 있다.' },
    ties: [
      { role: 'elder', sex: 'f', age: [45, 55], job: 'herbalist', race: 'beast', beast: 'wolf', aff: 25, word: '무리의 늙은 약초꾼' },
      { role: 'trader', sex: 'm', age: [30, 45], job: 'merchant', race: 'human', aff: 10, word: '사람 가죽 상인' },
    ],
    lines: [
      (c) => `${J(c.fa, '이/가')} 밤에 울음을 올렸다. 숲 건너 다른 무리가 대답했다. 어른들은 그 대답의 높이로 올겨울 사냥터를 정한다.`,
      (c) => `${c.t.elder} 할머니가 바람 냄새를 맡더니 "사흘 뒤 눈"이라고 했다. 사흘 뒤 눈이 왔다.`,
      (c) => `시장에서 ${c.t.trader} 아저씨가 내게 사탕을 주었다. 아버지는 그 사람이 좋은 사람이라고 했다. 다른 사람 상인들 이야기는 하지 않았다.`,
    ],
    scenes: [
      { id: 'bw_hunt', age: [5, 8], title: '첫 사냥 따라가기',
        text: (c) => `무리가 사슴을 쫓는 날, 처음으로 맨 뒤에 붙었다. 앞에서 ${J(c.fa, '이/가')} 손짓으로 멈추라고 했다. 덤불 너머에 새끼 사슴이 혼자 있다.`,
        choices: [
          { label: '숨죽이고 무리 신호를 기다린다', fx: { stat: { sen: 0.5, wil: 0.3 }, aff: { father: 6 } }, out: () => '신호가 왔을 때 무리가 한 몸처럼 움직였다. 나는 그냥 따라 뛰었다. 저녁 고기는 맨 먼저 내 그릇에 담겼다. 첫 사냥에 나간 아이의 몫이다.' },
          { label: '혼자 먼저 뛰어든다', fx: { stat: { agi: 0.6 }, aff: { father: -4 }, stress: 4 }, out: () => '새끼 사슴이 달아났다. 어미 사슴도. 무리 사냥이 끝났다. 아버지가 내 목덜미를 물듯이 잡았다. 그날 저녁은 나 혼자 굶었다.' },
          { label: '새끼 사슴을 놓아 달라고 조른다', fx: { stat: { cha: 0.4 }, aff: { elder: 4 } }, out: (c) => `${J(c.fa, '은/는')} 한참 나를 보더니 손을 내렸다. 무리는 다른 사슴을 쫓았다. 할머니가 "새끼를 놓는 사냥꾼이 오래 사냥한다"고 했다.` },
        ] },
      { id: 'bw_market', age: [9, 12], title: '털가죽 시장',
        text: (c) => `시장에서 사람 아이들이 내 꼬리를 잡아당기며 "개!" 하고 짖었다. ${c.t.trader} 아저씨가 가게 안에서 보고 있다. 아버지는 시장 반대편에 있다.`,
        choices: [
          { label: '이를 드러내고 으르렁댄다', fx: { stat: { str: 0.3, wil: 0.4 }, stress: 4, flag: 'bw_growl' }, out: () => '아이들이 비명을 지르며 흩어졌다. 그날 시장 경비가 아버지를 불러 벌금을 물렸다. 아버지는 벌금을 내고 나와서 웃었다.' },
          { label: '못 들은 척 지나간다', fx: { stat: { wil: 0.5 }, stress: 3 }, out: () => '귀를 눕히고 걸었다. 꼬리가 다리 사이로 말렸다. 내 몸이 나보다 먼저 겁먹는 게 싫었다.' },
          { label: '아저씨 가게로 들어간다', fx: { aff: { trader: 8 }, skill: { trade: 1 } }, out: (c) => `${c.t.trader} 아저씨가 가죽 값 매기는 법을 보여 주었다. 사람 상인들이 무리를 어떻게 속이는지도. 그 뒤로 부족 가죽은 한 할씩 더 비싸게 팔렸다.` },
        ] },
      { id: 'bw_howl', age: [13, 15], title: '첫 울음',
        text: (c) => `무리의 젊은이들이 처음으로 울음을 올리는 밤. 목소리가 무리 맨 끝까지 닿으면 어른으로 친다. 내 차례다. 숲 건너편 다른 무리도 듣고 있다.`,
        choices: [
          { label: '있는 힘껏 길게 운다', fx: { stat: { cha: 0.5, wil: 0.4 }, aff: { father: 8 }, renown: 1, flag: 'bw_howl' }, out: () => '목이 찢어질 것 같았다. 숲 건너에서 대답이 왔다. 무리가 발을 굴렀다. 그날부터 나는 사냥 대열 가운데에 선다.' },
          { label: '낮고 오래 운다', fx: { stat: { sen: 0.5 }, aff: { elder: 6 } }, out: () => '크지 않았다. 대신 오래 남았다. 할머니가 "약초꾼 목소리다"라고 했다. 아버지는 아쉬운 얼굴이었다.' },
          { label: '목이 막혀 소리가 안 나온다', fx: { stress: 8, stat: { wil: 0.4 } }, out: () => '아무 소리도 나오지 않았다. 무리가 조용해졌다. 그때 아버지가 내 옆에서 같이 울었다. 둘의 목소리가 섞여 숲 끝까지 갔다.' },
        ] },
    ],
    check: (g, s) => !!s.flags.bw_howl || (g.player.skills.sword ?? 0) >= 15 || ren(g) >= 10,
    burdenScene: {
      title: '사라진 아이들', text: (c) => `부족 아이 둘이 숲 가장자리에서 사라졌다. 바퀴 자국이 남쪽으로 나 있다. ${c.t.trader} 아저씨가 몰래 귀띔했다. 살트마레로 가는 노예 상인의 마차라고. 부족 어른들이 나를 본다.`,
      choices: [
        { label: '무리를 이끌고 마차를 쫓는다', key: 'chase', test: (g) => st(g, 'agi') + st(g, 'sen') + (g.player.skills.sword ?? 0), dc: 80, ok: { fx: { renown: 5, aff: { father: 12, elder: 8 }, flag: 'bw_rescue' }, out: () => '이틀 밤을 달렸다. 강 건너는 나루에서 마차를 따라잡았다. 아이들은 겁에 질려 있었지만 다치지 않았다. 돌아오는 길에 무리가 처음으로 내 뒤를 따라 걸었다.' }, bad: { fx: { stress: 18, injury: '마차 호위의 칼에 베인 팔' }, out: () => '나루에서 칼을 든 호위들과 마주쳤다. 아이 하나만 데려왔다. 남은 하나의 이름을 무리가 겨울 내내 밤마다 불렀다.' } },
        { label: '시장 경비대에 호소한다', key: 'law', fx: { stress: 10, aff: { trader: 4 }, stat: { cha: 0.3 } }, out: () => '경비대장은 수인 아이는 법에 "사람"으로 적혀 있지 않다고 했다. 아저씨가 은화를 써서 겨우 한 아이 행방을 알아냈다. 몸값을 치르고 데려왔다.' },
        { label: '부족 어른들에게 맡긴다', key: 'elders', fx: { aff: { father: -6 }, stress: 6 }, out: () => '어른들이 사흘을 의논했다. 그사이 마차는 국경을 넘었다. 무리는 그해 겨울 사냥터를 북쪽으로 옮겼다.' },
      ],
    },
  },
  {
    id: 'beast_tiger', race: 'beast',
    name: '줄무늬 호랑이 부족',
    desc: '남쪽 숲에서 쫓겨나 자유도시 바르카에 자리 잡은 호랑이 부족. 사내도 여인도 용병과 경호원으로 이름이 났다. 무리는 작지만 한 사람 한 사람이 무리 하나만 하다고들 한다. 아이는 투기장 함성과 부족의 오래된 결투 규칙 속에서 자란다.',
    money: 50, fatherJob: 'guard', motherJob: 'hunter',
    statBias: { str: 5, agi: 3, wil: 2 }, skillBias: { sword: 5 },
    standing: '용병 부족', lastNames: ['줄무늬'], place: 'barka', fit: 'sword',
    want: { name: '부족의 이름난 발톱', text: '부족은 내가 바르카 투기장에서, 아니면 전장에서 이름을 올리기를 바란다.' },
    burden: { name: '사슬에 묶인 투사들', text: '바르카 투기장에는 돈 대신 사슬로 싸우는 수인 투사들도 있다.' },
    ties: [
      { role: 'champion', sex: 'f', age: [28, 36], job: 'guard', race: 'beast', beast: 'tiger', aff: 20, word: '부족의 투기장 우승자' },
      { role: 'master', sex: 'm', age: [45, 60], job: 'trade_master', race: 'human', aff: 0, word: '투기장 주인' },
    ],
    lines: [
      (c) => `${c.t.champion} 언니가 투기장에서 또 이겼다. 상금 절반은 부족 화로에 넣고 나머지로 우리에게 고기를 샀다.`,
      () => '부족 어른들은 싸우기 전에 상대의 눈을 오래 본다. 거기서 이미 반은 끝난다고 한다.',
      (c) => `${J(c.fa, '은/는')} 상인 호위를 나갔다가 이 빠진 칼과 금화 한 닢을 들고 돌아왔다. 어느 쪽이 더 값진지 한참 고민하는 눈치였다.`,
    ],
    scenes: [
      { id: 'bt_rule', age: [5, 8], title: '결투의 규칙',
        text: (c) => `사촌과 고기 한 점을 두고 싸웠다. 어른들이 원을 그리고 둘러섰다. ${J(c.fa, '이/가')} 말했다. "부족 싸움에는 규칙이 있다. 쓰러진 자는 물지 않는다." 사촌이 넘어졌다.`,
        choices: [
          { label: '물러서서 손을 내민다', fx: { stat: { wil: 0.5, cha: 0.3 }, aff: { father: 6 } }, out: () => '사촌이 내 손을 잡고 일어났다. 고기는 둘이 나눴다. 어른들이 원을 풀며 꼬리를 흔들었다.' },
          { label: '한 번 더 덤빈다', fx: { stat: { str: 0.5 }, aff: { father: -6 }, stress: 4 }, out: () => '아버지가 내 목덜미를 잡아 들어 올렸다. 원 밖으로 내던져졌다. 그날 고기는 둘 다 못 먹었다.' },
          { label: '고기를 사촌에게 준다', fx: { stat: { cha: 0.4 }, aff: { champion: 4 } }, out: (c) => `${c.t.champion} 언니가 웃었다. "이긴 자가 주는 고기가 제일 맛있지." 사촌은 그 뒤로 나를 형처럼 따랐다.` },
        ] },
      { id: 'bt_arena', age: [9, 12], title: '투기장 지하',
        text: (c) => `${c.t.champion} 언니를 따라 투기장 지하에 갔다. 쇠창살 안에 사슬에 묶인 수인 투사들이 있다. 곰 부족 사내 하나가 나를 보며 "도망쳐라, 꼬마"라고 중얼거렸다.`,
        choices: [
          { label: '그 사내에게 물과 빵을 몰래 준다', fx: { stat: { cha: 0.4 }, aff: { master: -6 }, flag: 'bt_fed' }, out: () => '사내가 빵을 반으로 갈라 옆 칸 투사에게 주었다. 다음 날 그는 투기장에서 졌다. 그 뒤로 언니는 나를 지하에 데려가지 않았다.' },
          { label: '언니에게 저 사람들은 누구냐고 묻는다', fx: { stat: { int: 0.4 }, aff: { champion: 6 } }, out: () => '언니가 오래 말이 없다가 대답했다. "나도 저기서 시작했다. 우승 상금으로 내 사슬을 샀지." 언니 발목에 흐린 자국이 있었다.' },
          { label: '무서워서 언니 손을 꽉 잡는다', fx: { stress: 4, aff: { champion: 3 } }, out: () => '언니가 내 손을 잡고 계단을 올라왔다. 위에서는 관중이 웃고 있었다. 아래에서 올라온 냄새가 한참 코에 남았다.' },
        ] },
      { id: 'bt_first', age: [13, 15], title: '첫 시합',
        text: (c) => `투기장 주인 ${J(c.t.master, '이/가')} 아이들 시합판을 열었다. 상금은 은화 열 닢. 상대는 덩치 큰 사람 아이다. 관중은 수인 아이가 지는 쪽에 돈을 건다.`,
        choices: [
          { label: '정면으로 붙는다', fx: { skill: { sword: 2 }, stat: { str: 0.5 }, money: 10, renown: 1, flag: 'bt_won' }, out: () => '세 합 만에 상대가 모래에 누웠다. 관중석이 조용했다가 욕설이 쏟아졌다. 돈을 잃은 사람들이다. 부족 사람들만 발을 굴렀다.' },
          { label: '빠르게 돌며 지치게 한다', fx: { skill: { sword: 1.5 }, stat: { agi: 0.6 }, money: 10 }, out: () => '상대가 헐떡이며 무릎을 꿇었다. 한 대도 맞지 않았다. 주인이 "다음 판에도 나오라"고 했다. 그 눈빛이 싫었다.' },
          { label: '일부러 진다', fx: { money: 25, aff: { master: 8, father: -10 }, stress: 8, flag: 'bt_threw' }, out: () => '주인이 몰래 은화 스물다섯 닢을 쥐여 주었다. 부족 화로에 돌아가자 아버지가 내 눈을 오래 보았다. 아무 말도 하지 않았다. 다 안다는 뜻이었다.' },
        ] },
    ],
    check: (g, s) => (g.player.skills.sword ?? 0) >= 22 || !!s.flags.bt_won || ren(g) >= 12,
    burdenScene: {
      title: '사슬 계약', text: (c) => `투기장 주인 ${J(c.t.master, '이/가')} 제안했다. 세 해 전속 계약. 이기면 상금이 크고, 지면 빚이 쌓인다. 부족 젊은이들이 이 계약으로 사슬을 찼다. ${c.t.champion} 언니는 하지 말라고 한다.`,
      choices: [
        { label: '거절하고 부족의 용병일을 한다', key: 'merc', fx: { skill: { sword: 2 }, aff: { champion: 8, father: 6 }, stat: { wil: 0.4 } }, out: () => '상인 호위로 첫 길을 나섰다. 돈은 적었다. 돌아왔을 때 내 발목은 가벼웠다.' },
        { label: '계약하되 조항을 고치게 한다', key: 'deal', test: (g) => st(g, 'int') + sk(g, 'trade') + st(g, 'cha') / 2, dc: 55, ok: { fx: { money: 40, renown: 3, flag: 'bt_contract' }, out: () => '빚 조항을 지우고 상금을 올렸다. 주인이 이를 갈며 도장을 찍었다. 세 해 동안 투기장에서 이름이 났다. 사슬은 한 번도 차지 않았다.' }, bad: { fx: { money: 20, stress: 16, flag: 'bt_chained' }, out: () => '고쳤다고 생각한 조항 밑에 작은 글씨가 더 있었다. 두 해째 빚이 상금을 넘었다. 언니가 자기 상금을 털어 나를 빼냈다.' } },
        { label: '부족 젊은이들을 모아 투기장을 거부한다', key: 'strike', fx: { renown: 2, aff: { master: -20, champion: 10 }, stress: 10 }, out: () => '한 철 동안 호랑이 부족 투사가 하나도 나가지 않았다. 관중이 줄었다. 주인은 결국 빚 조항을 없앴다. 부족 화로 앞에서 처음으로 어른들이 내게 잔을 건넸다.' },
      ],
    },
  },
  {
    id: 'beast_hawk', race: 'beast',
    name: '높은 깃 매 부족',
    desc: '클라인 항 북쪽 절벽에 둥지 같은 집을 짓고 사는 매 부족. 눈이 누구보다 밝아 배들의 정찰꾼과 등대지기로 일한다. 레오니아 사람들은 이들을 멸시하면서도 폭풍이 오면 절벽을 올려다본다. 아이는 바람과 높이 속에서 자란다.',
    money: 25, fatherJob: 'scout', motherJob: 'weaver',
    statBias: { sen: 6, agi: 3, int: 1 }, skillBias: { herbs: 2, letters: 2 },
    standing: '천민 취급', lastNames: ['높은 깃'], place: 'klein', fit: 'letters',
    want: { name: '바다 끝을 보는 눈', text: '부족은 내가 절벽의 등대를 이어받아, 바다 끝을 제일 먼저 보는 눈이 되기를 바란다.' },
    burden: { name: '항구의 멸시', text: '항구 사람들은 폭풍이 지나가면 절벽 사람들을 잊는다.' },
    ties: [
      { role: 'keeper', sex: 'm', age: [50, 60], job: 'scout', race: 'beast', beast: 'hawk', aff: 25, word: '늙은 등대지기' },
      { role: 'captain', sex: 'f', age: [35, 50], job: 'sea_captain', race: 'human', aff: 5, word: '항구의 여선장' },
    ],
    lines: [
      (c) => `${c.t.keeper} 할아버지는 수평선 끝 점 하나를 보고 배 이름을 맞혔다. 사흘 뒤 그 배가 들어왔다.`,
      () => '절벽 바람이 세게 부는 날은 아이들이 줄을 매고 바깥 바위까지 걸어간다. 떨어진 아이는 없다. 떨어질 뻔한 아이는 많다.',
      (c) => `${c.t.captain} 선장이 절벽 아래에서 손을 흔들었다. 다른 선장들은 절벽을 쳐다보지도 않는다.`,
    ],
    scenes: [
      { id: 'bh_ledge', age: [5, 8], title: '바깥 바위',
        text: (c) => `부족 아이들이 줄을 매고 바깥 바위까지 걸어갔다. 내 차례다. 아래로 파도가 하얗게 부서진다. ${J(c.fa, '이/가')} 줄을 잡고 있다.`,
        choices: [
          { label: '아래를 보지 않고 걷는다', fx: { stat: { agi: 0.5, wil: 0.4 }, aff: { father: 4 } }, out: () => '바위 끝에 섰다. 바람이 날개 없는 등을 밀었다. 처음으로 바다가 이렇게 넓은 줄 알았다.' },
          { label: '아래를 똑바로 보며 걷는다', fx: { stat: { sen: 0.6 }, aff: { keeper: 4 }, flag: 'bh_looked' }, out: () => '파도 사이에 고래 등이 보였다. 아무도 못 본 것이었다. 등대지기 할아버지가 내 머리를 쓰다듬었다.' },
          { label: '중간에 주저앉는다', fx: { stress: 4, stat: { wil: 0.3 } }, out: () => '바위에 엎드려 기어갔다. 끝까지 갔다. 다들 웃었다. 아버지는 웃지 않고 줄을 감았다. "끝까지 갔으면 된 거다."' },
        ] },
      { id: 'bh_storm', age: [9, 12], title: '폭풍의 밤',
        text: (c) => `폭풍이 온 밤, 등대 불이 꺼졌다. ${c.t.keeper} 할아버지는 다리를 다쳐 계단을 못 오른다. 바다 쪽에 배 한 척이 흔들리고 있다. ${c.t.captain} 선장의 배다.`,
        choices: [
          { label: '등대 꼭대기로 기름을 들고 오른다', fx: { stat: { agi: 0.5, wil: 0.5 }, aff: { keeper: 10, captain: 12 }, renown: 2, flag: 'bh_light' }, out: () => '바람에 세 번 넘어졌다. 불이 다시 붙었다. 배가 방향을 틀었다. 아침에 선장이 절벽을 올라와 내 손을 잡았다. 사람 선장이 절벽에 오른 건 처음이라고 했다.' },
          { label: '절벽 끝에서 등불을 흔든다', fx: { stat: { sen: 0.5 }, aff: { captain: 6 } }, out: () => '작은 등불이었다. 배가 그것을 보았는지는 모른다. 아침에 배는 항구에 있었다. 돛대 하나가 부러진 채로.' },
          { label: '할아버지 곁을 지킨다', fx: { aff: { keeper: 8 }, stress: 6 }, out: () => '할아버지가 내 손을 잡고 바다를 보았다. 배는 아침에 바위 근처에서 발견되었다. 선원 셋이 돌아오지 못했다.' },
        ] },
      { id: 'bh_port', age: [13, 15], title: '항구 상인 조합',
        text: (c) => `클라인 항 상인 조합이 절벽 정찰꾼 품삯을 반으로 깎겠다고 했다. 부족 어른들은 화가 났지만 항구 말이 서툴다. 내가 사람 말을 제일 잘한다.`,
        choices: [
          { label: '조합 회의에 가서 따진다', fx: { stat: { cha: 0.5, int: 0.3 }, skill: { letters: 1 }, flag: 'bh_spoke' }, out: () => '조합원들이 수인 아이가 따지는 걸 신기해했다. 품삯은 깎이지 않았다. 대신 회의록에 내 이름 대신 "절벽 아이"라고 적혔다.' },
          { label: '정찰을 멈추자고 부족을 설득한다', fx: { stat: { wil: 0.5 }, aff: { father: 6 }, renown: 1 }, out: () => '사흘 동안 절벽에 아무도 서지 않았다. 나흘째 안개 속에서 배 한 척이 바위에 걸렸다. 닷새째 조합이 사람을 보냈다. 품삯은 그대로였다.' },
          { label: '선장에게 도움을 청한다', fx: { aff: { captain: 8 }, skill: { trade: 1 } }, out: (c) => `${c.t.captain} 선장이 조합 회의에 나와 그 폭풍의 밤 이야기를 했다. 회의장이 조용해졌다. 품삯은 오히려 올랐다.` },
        ] },
    ],
    check: (g, s) => !!(s.flags.bh_light || s.flags.bh_spoke) || st(g, 'sen') >= 45 || ren(g) >= 10,
    burdenScene: {
      title: '절벽을 내놓으라는 말', text: (c) => `클라인 영주가 북쪽 절벽에 망루를 짓겠다고 한다. 매 부족은 절벽에서 나가 항구 빈민가로 옮기라고. 대신 망루 정찰꾼 자리 셋을 주겠다고 한다. 부족 어른들이 나를 본다.`,
      choices: [
        { label: '영주에게 탄원서를 낸다', key: 'petition', test: (g) => sk(g, 'letters') + st(g, 'cha') + ren(g), dc: 50, ok: { fx: { renown: 4, aff: { father: 10, keeper: 8 }, flag: 'bh_kept' }, out: () => '탄원서에 항구 선장들 이름이 줄줄이 붙었다. 폭풍의 밤을 기억하는 사람들이었다. 망루는 절벽 남쪽 끝에 지어졌다. 둥지들은 그대로 남았다.' }, bad: { fx: { stress: 14, fam: -15 }, out: () => '탄원서는 읽히지 않았다. 둥지 절반이 헐렸다. 남은 절반에 두 집씩 들어가 산다. 바람이 더 세게 분다.' } },
        { label: '망루 자리를 받고 협상한다', key: 'deal', fx: { aff: { father: -4 }, money: 15, skill: { trade: 1 } }, out: () => '정찰꾼 자리 셋 가운데 하나는 내 것이 되었다. 부족 절반은 빈민가로 내려갔다. 망루 꼭대기에서 옛 둥지들이 보인다.' },
        { label: '부족과 함께 절벽을 지킨다', key: 'hold', fx: { renown: 2, stress: 12, aff: { father: 8 }, flag: 'bh_held' }, out: () => '영주 병사들이 절벽 아래 왔다. 매 부족은 절벽 위에서 돌을 쌓고 버텼다. 한 달 뒤 영주가 공사를 미뤘다. 미룬 것이지 접은 것은 아니다.' },
      ],
    },
  },
  /* ---------------- 하프엘프 ---------------- */
  {
    id: 'half_elf_border', race: 'half_elf',
    name: '숲 경계 마을 집안',
    desc: '은잎 마을 바깥, 엘프 숲과 사람 땅 사이 경계에 기대 사는 집안. 엘프 사냥꾼 어머니와 사람 나무꾼 아버지. 숲 안의 엘프는 아이를 반쪽이라 부르고, 들판의 사람은 귀를 쳐다본다. 아이는 두 말과 두 노래를 다 알지만 어느 쪽 잔치에도 끝까지 앉아 있지 못한다.',
    money: 35, fatherJob: 'carpenter', motherJob: 'hunter', fatherRace: 'human', motherRace: 'elf',
    statBias: { sen: 3, cha: 3, agi: 2, int: 2 }, skillBias: { herbs: 3, letters: 2, magic: 1 },
    standing: '경계민', lastNames: ['베일', '휘트먼'], place: 'silverleaf', fit: 'magic',
    want: { name: '두 쪽이 다 부르는 이름', text: '부모는 내가 숲과 들판 양쪽에서 이름으로 불리기를 바란다.' },
    burden: { name: '반쪽이라는 말', text: '숲은 반쪽을 들이지 않고, 들판은 늙지 않는 얼굴을 꺼린다.' },
    ties: [
      { role: 'elfcousin', sex: 'f', age: [40, 60], job: 'hunter', race: 'elf', aff: 0, word: '숲 안의 엘프 사촌' },
      { role: 'humanfriend', sex: 'm', age: [5, 8], job: 'child', race: 'human', aff: 20, word: '들판의 사람 벗' },
    ],
    lines: [
      (c) => `${J(c.mo, '은/는')} 숲 쪽 창을 열고 자고, ${J(c.fa, '은/는')} 들판 쪽 창을 열고 잔다. 나는 그 사이에 눕는다.`,
      (c) => `${c.t.elfcousin} 사촌은 나이가 쉰인데 나보다 어려 보인다. 숲 안 사람들은 그 사촌을 아이라고 부른다. 그럼 나는 뭘까.`,
      (c) => `${J(c.t.humanfriend, '이/가')} 들판에서 연을 날렸다. 연줄이 끊어져 숲 쪽으로 날아갔다. 그 애는 숲 경계에서 멈췄다. 나만 넘어가서 주워 왔다.`,
    ],
    scenes: [
      { id: 'hb_feast', age: [5, 8], title: '두 잔치',
        text: (c) => `같은 날 숲 안에서는 달맞이 잔치가, 들판 마을에서는 추수 잔치가 열렸다. 어머니는 숲으로, 아버지는 들판으로 간다. "너는 어디로 갈래?"`,
        choices: [
          { label: '숲 잔치에 간다', fx: { skill: { magic: 1 }, stat: { sen: 0.4 }, aff: { mother: 6, elfcousin: 4 } }, out: (c) => `엘프들은 정중했다. 아무도 내게 잔을 건네지 않았다. ${c.t.elfcousin} 사촌만 몰래 꿀떡을 나눠 주었다.` },
          { label: '들판 잔치에 간다', fx: { stat: { cha: 0.4 }, aff: { father: 6, humanfriend: 6 } }, out: () => '사람 아이들과 춤을 추었다. 어른 하나가 내 귀를 보고 "요정 아이 아니냐"며 웃었다. 나쁜 뜻은 아니었다. 그래도 귀를 머리카락으로 덮었다.' },
          { label: '경계에서 두 잔치 소리를 다 듣는다', fx: { stat: { sen: 0.5, wil: 0.3 }, flag: 'hb_between' }, out: () => '왼쪽 귀로 엘프 노래가, 오른쪽 귀로 사람 노래가 들렸다. 두 노래의 박자가 어쩌다 한 번 맞았다. 그 한 번을 기다리며 밤을 보냈다.' },
        ] },
      { id: 'hb_grow', age: [9, 12], title: '먼저 크는 벗',
        text: (c) => `${J(c.t.humanfriend, '이/가')} 나보다 머리 하나가 커졌다. 목소리도 굵어졌다. 오늘 그 애가 들판 아이들과 놀다가 나를 보고 잠깐 머뭇거렸다.`,
        choices: [
          { label: '먼저 다가가서 끼어든다', fx: { stat: { cha: 0.5 }, aff: { humanfriend: 6 } }, out: (c) => `${J(c.t.humanfriend, '이/가')} 웃으며 자리를 내주었다. 다른 아이들도 곧 잊었다. 나는 잊지 않았다. 그 머뭇거림을.` },
          { label: '숲 쪽으로 돌아간다', fx: { stat: { wil: 0.3 }, aff: { elfcousin: 6, humanfriend: -4 } }, out: (c) => `${c.t.elfcousin} 사촌과 활을 쏘며 오후를 보냈다. 사촌은 왜 왔는지 묻지 않았다. 엘프는 그런 걸 묻지 않는다.` },
          { label: '그 애에게 솔직히 묻는다', fx: { stat: { wil: 0.4 }, aff: { humanfriend: 10 }, flag: 'hb_asked' }, out: (c) => `"내가 이상해?" ${J(c.t.humanfriend, '은/는')} 한참 생각했다. "넌 그냥 천천히 크는 거잖아." 그 말이 그해 내내 위로가 되었다.` },
        ] },
      { id: 'hb_choose', age: [13, 15], title: '숲의 시험',
        text: (c) => `엘프 숲이 해마다 하는 사냥꾼 시험에 처음으로 반쪽인 나를 받아 주겠다고 했다. ${J(c.t.elfcousin, '이/가')} 장로들을 설득했다고 한다. 같은 날 들판 마을에서 ${c.t.humanfriend}의 혼례가 있다.`,
        choices: [
          { label: '숲의 시험에 간다', fx: { skill: { magic: 1.5, herbs: 1.5 }, stat: { agi: 0.4 }, aff: { elfcousin: 10, humanfriend: -8 }, flag: 'hb_forest' }, out: () => '활 시험은 통과했다. 장로들이 처음으로 내 이름을 불렀다. 밤늦게 들판으로 가 보니 혼례 등불은 다 꺼져 있었다.' },
          { label: '벗의 혼례에 간다', fx: { stat: { cha: 0.5 }, aff: { humanfriend: 12, elfcousin: -6 } }, out: (c) => `${J(c.t.humanfriend, '은/는')} 열다섯에 장가를 갔다. 나는 그 애 옆에서 엘프 축가를 불렀다. 마을 사람들이 처음으로 조용히 들었다. 다음 해 숲의 시험은 없었다.` },
          { label: '시험을 미뤄 달라고 사촌에게 부탁한다', fx: { aff: { elfcousin: 2, humanfriend: 8 }, stat: { int: 0.3 } }, out: (c) => `${c.t.elfcousin} 사촌이 장로들에게 갔다 왔다. "엘프에게 한 해는 아무것도 아니래." 그 말이 어쩐지 서운했다. 다음 해 시험을 보았다.` },
        ] },
    ],
    check: (g, s) => !!(s.flags.hb_forest || s.flags.hb_between) || st(g, 'cha') >= 45 || sk(g, 'magic') >= 12,
    burdenScene: {
      title: '경계의 다툼', text: (c) => `들판 마을 사람들이 숲 경계 나무를 베기 시작했다. 엘프 사냥꾼들이 활을 들고 나왔다. 두 쪽 다 나를 본다. 어머니는 숲 쪽, 아버지는 들판 쪽에 서 있다.`,
      choices: [
        { label: '두 쪽 사이에 서서 말린다', key: 'between', test: (g) => st(g, 'cha') + st(g, 'wil') + sk(g, 'letters') / 2, dc: 75, ok: { fx: { renown: 4, aff: { father: 8, mother: 8 }, flag: 'hb_bridge' }, out: () => '두 말로 번갈아 소리쳤다. 활이 내려가고 도끼가 내려갔다. 그 겨울 경계에 돌을 세웠다. 돌에는 두 글자로 내 이름이 새겨졌다.' }, bad: { fx: { stress: 16, injury: '화살이 스친 어깨' }, out: () => '누가 먼저 쏘았는지 모른다. 화살이 내 어깨를 스쳤다. 그 피를 보고 두 쪽이 다 물러갔다. 다툼은 끝나지 않았다. 잠시 멈췄을 뿐이다.' } },
        { label: '숲 편에 선다', key: 'forest', fx: { aff: { mother: 8, father: -10, elfcousin: 8 }, stress: 6 }, out: () => '들판 사람들이 나를 배신자라고 불렀다. 숲은 처음으로 나를 우리 편이라고 불렀다. 둘 다 그다지 기쁘지 않았다.' },
        { label: '들판 편에 선다', key: 'field', fx: { aff: { father: 8, mother: -10, humanfriend: 8 }, stress: 6 }, out: () => '엘프들이 숲 안으로 물러갔다. 어머니는 그날 밤 숲 쪽 창을 닫고 잤다. 처음 있는 일이었다.' },
      ],
    },
  },
  {
    id: 'half_elf_noble', race: 'half_elf',
    name: '귀족 가문의 숨은 혈통',
    desc: '베르덴 기사 가문. 3대 전 할머니가 엘프였다는 이야기는 가문의 가장 깊은 비밀이었다. 그 피가 이번 아이에게서 귀 끝으로 드러났다. 어머니는 아이에게 늘 모자를 씌운다. 가문은 아이를 자랑으로 여겨야 할지 숨겨야 할지 아직 정하지 못했다.',
    money: 110, fatherJob: 'knight', motherJob: 'idle', fatherRace: 'human', motherRace: 'human',
    statBias: { cha: 4, int: 3, sen: 2 }, skillBias: { letters: 4, sword: 2, magic: 1 },
    standing: '기사 가문', lastNames: ['폰 리터', '아르덴'], place: 'verden', fit: 'sword',
    want: { name: '모자를 벗는 날', text: '어머니는 언젠가 내가 모자 없이 궁정에 서는 날이 오기를 바란다.' },
    burden: { name: '피를 캐는 사람들', text: '혼담 상대 집안들은 우리 가문의 족보를 들여다보고 싶어 한다.' },
    ties: [
      { role: 'aunt', sex: 'f', age: [50, 65], job: 'idle', race: 'human', aff: -5, word: '족보를 지키는 큰고모' },
      { role: 'tutor', sex: 'm', age: [150, 260], job: 'tutor', race: 'elf', aff: 15, word: '몰래 온 엘프 선생' },
    ],
    lines: [
      (c) => `${J(c.mo, '이/가')} 오늘도 내 모자 끈을 단단히 매 주었다. 여름인데도.`,
      (c) => `${c.t.aunt} 큰고모가 족보 서랍 열쇠를 목에 걸고 다닌다. 그 서랍 안에 무엇이 있는지 나는 안다. 큰고모도 내가 안다는 걸 안다.`,
      (c) => `${c.t.tutor} 선생이 3대 전 할머니 이야기를 해 주었다. 숲에서 기사를 따라 나왔다고. 할머니는 아직 살아 있을지도 모른다고 했다.`,
    ],
    scenes: [
      { id: 'hn_hat', age: [5, 8], title: '모자',
        text: (c) => `기사 가문 아이들 모임에서 바람이 불어 모자가 날아갔다. 아이들이 내 귀를 보고 소리쳤다. "요정이다!" 어머니가 달려오고 있다. ${c.t.aunt} 큰고모도 보고 있다.`,
        choices: [
          { label: '모자를 줍지 않고 서 있는다', fx: { stat: { wil: 0.5, cha: 0.3 }, aff: { aunt: -8 }, flag: 'hn_bare' }, out: () => '아이들이 둘러싸고 귀를 만져 보았다. 어머니는 멈춰 섰다. 큰고모는 그날 저녁 아버지와 오래 다퉜다. 나는 그 소리를 들으며 잠들었다.' },
          { label: '모자를 주워 꾹 눌러 쓴다', fx: { stat: { agi: 0.3 }, aff: { mother: 4, aunt: 4 }, stress: 4 }, out: () => '"잘못 봤어." 아이들은 반쯤 믿었다. 반쯤은 소문을 냈다. 어머니가 내 손을 꽉 잡았다. 칭찬인지 사과인지 몰랐다.' },
          { label: '"할머니가 엘프였어"라고 말한다', fx: { stat: { cha: 0.5 }, aff: { aunt: -14, tutor: 6 }, renown: 1, flag: 'hn_told' }, out: () => '아이들이 신기해했다. 어른들은 얼어붙었다. 큰고모가 나를 끌고 마차에 태웠다. 사흘 뒤 베르덴 귀족들 사이에 그 이야기가 다 돌았다.' },
        ] },
      { id: 'hn_tutor', age: [9, 12], title: '숲에서 온 선생',
        text: (c) => `밤마다 몰래 오는 ${c.t.tutor} 선생이 마력 다루는 법을 가르쳐 준다. 오늘 촛불이 내 손짓에 흔들렸다. 선생이 말했다. "이건 사람 기사에게는 없는 칼이다. 숨길지, 쓸지는 네가 정해라."`,
        choices: [
          { label: '기사의 칼과 같이 익힌다', fx: { skill: { magic: 2, sword: 1 }, stat: { int: 0.3 }, aff: { tutor: 8 } }, out: () => '낮에는 검술, 밤에는 마력. 잠이 모자랐다. 그해 겨울 검술 사범이 내 칼끝이 어딘지 모르게 빛난다고 했다.' },
          { label: '아무도 모르게 숨긴다', fx: { skill: { magic: 1.5 }, stat: { wil: 0.4 }, flag: 'hn_hidden' }, out: () => '촛불은 아무도 없을 때만 흔들었다. 선생은 고개를 끄덕였다. "엘프는 숨기는 데 익숙하다. 너도 반은 엘프다."' },
          { label: '그만 오시라고 한다', fx: { aff: { tutor: -10, aunt: 6 }, stat: { wil: 0.3 } }, out: () => '선생은 서운한 기색 없이 일어섰다. 창밖으로 나가며 말했다. "백 년 뒤에도 생각이 바뀌면 숲으로 와라." 백 년이라니.' },
        ] },
      { id: 'hn_court', age: [13, 15], title: '첫 궁정 나들이',
        text: (c) => `백작가 연회에 처음 가게 되었다. 어머니가 모자 대신 머리를 귀가 덮이게 땋아 주었다. ${c.t.aunt} 큰고모가 문 앞에서 말했다. "오늘 하루만 사람으로 있어라."`,
        choices: [
          { label: '머리를 풀고 들어간다', fx: { stat: { cha: 0.6, wil: 0.4 }, aff: { aunt: -12, mother: 6 }, renown: 2, flag: 'hn_bare' }, out: () => '연회장 사람들이 수군거렸다. 백작 부인이 다가와 내 귀를 보더니 웃었다. "옛 노래 속 얼굴이구나." 그 말 한마디로 수군거림이 바뀌었다.' },
          { label: '땋은 머리 그대로 조용히 있는다', fx: { stat: { int: 0.4 }, aff: { aunt: 6 } }, out: () => '아무 일도 없었다. 귀족 아이들과 춤을 추었다. 누구도 묻지 않았다. 돌아오는 마차에서 어머니가 내 땋은 머리를 한참 쓰다듬었다.' },
          { label: '큰고모에게 왜냐고 묻는다', fx: { stat: { wil: 0.5 }, aff: { aunt: 4 }, flag: 'hn_asked' }, out: (c) => `${c.t.aunt} 큰고모가 처음으로 족보 서랍 이야기를 했다. 3대 전 할머니 때문에 가문이 궁정에서 쫓겨났던 일. 큰고모의 약혼이 깨진 일. 그날 큰고모 손이 떨렸다.` },
        ] },
    ],
    check: (g, s) => !!(s.flags.hn_bare || s.flags.hn_told) || ren(g) >= 12 || (g.player.skills.sword ?? 0) >= 18,
    burdenScene: {
      title: '혼담과 족보', text: (c) => `큰 가문에서 혼담이 들어왔다. 조건은 하나, 족보를 보여 달라는 것. ${c.t.aunt} 큰고모는 3대 전 이름을 지운 가짜 족보를 이미 준비해 두었다.`,
      choices: [
        { label: '진짜 족보를 내민다', key: 'truth', test: (g) => st(g, 'cha') + ren(g) + st(g, 'wil') / 2, dc: 55, ok: { fx: { renown: 3, aff: { mother: 8, aunt: -6 }, flag: 'hn_proud' }, out: () => '상대 가문 어른이 족보를 오래 보더니 말했다. "엘프 피라. 우리 가문 아이들은 오래 살겠군." 혼담은 이어졌다. 큰고모는 결혼식 날 처음으로 웃었다.' }, bad: { fx: { stress: 12, aff: { aunt: -10 } }, out: () => '혼담은 정중하게 깨졌다. 다음 달 베르덴에 "아르덴 가문의 요정 피" 이야기가 돌았다. 큰고모는 방에서 나오지 않았다.' } },
        { label: '가짜 족보를 쓴다', key: 'false', fx: { aff: { aunt: 10, mother: -6 }, stress: 8, flag: 'hn_false' }, out: () => '혼담은 무사히 이어졌다. 상대는 아무것도 묻지 않았다. 그 뒤로 거울을 볼 때마다 귀 끝을 머리카락으로 덮는 버릇이 생겼다.' },
        { label: '혼담을 거절한다', key: 'refuse', fx: { stat: { wil: 0.5 }, aff: { aunt: -4, tutor: 6 } }, out: () => '혼담을 물렸다. 큰고모는 한숨을 쉬었다. 선생이 보낸 편지가 왔다. 숲 지도가 한 장 들어 있었다.' },
      ],
    },
  },
  /* ---------------- 반마족 ---------------- */
  {
    id: 'hd_hidden', race: 'half_demon',
    name: '뿔을 감추고 사는 집안',
    desc: '하르펜 장터 골목에서 빵을 굽는 평범한 집안. 어머니에게는 작은 뿔이 있다. 할아버지가 마족이었다는 사실은 이 집 밖으로 나간 적이 없다. 아이도 작은 뿔을 갖고 태어났다. 어머니는 아이의 머리를 날마다 손수 다듬고, 이마를 가리는 두건을 씌운다. 들키면 끝이다.',
    money: 40, fatherJob: 'baker', motherJob: 'baker', fatherRace: 'human', motherRace: 'half_demon',
    statBias: { wil: 4, sen: 3, int: 2 }, skillBias: { cooking: 4, magic: 1 },
    standing: '평민', lastNames: ['뮐러', '베커'], place: 'harfen', fit: 'magic', hidden: true,
    want: { name: '두건 없는 삶', text: '어머니는 내가 언젠가 두건을 벗고도 살 수 있는 곳을 찾기를 바란다.' },
    burden: { name: '이마의 비밀', text: '성광교 사제들은 마족의 피를 죄라고 가르친다. 들키면 집안 전체가 끝난다.' },
    ties: [
      { role: 'priest', sex: 'm', age: [40, 55], job: 'priest', race: 'human', aff: 10, word: '골목 성당 사제' },
      { role: 'knower', sex: 'f', age: [60, 75], job: 'herbalist', race: 'human', aff: 25, word: '비밀을 아는 약초 할머니' },
    ],
    lines: [
      (c) => `${J(c.mo, '은/는')} 새벽에 빵 반죽보다 먼저 내 머리를 다듬는다. 뿔 둘레 머리카락을 손으로 빗어 덮는다. 그 손이 늘 조금 떨린다.`,
      (c) => `${c.t.priest} 사제가 설교에서 마족의 피 이야기를 했다. 어머니가 내 손을 꼭 쥐었다. 끝나고 사제는 우리 빵을 칭찬했다.`,
      (c) => `${c.t.knower} 할머니가 뿔에 바르는 연고를 주었다. 자라는 걸 늦춰 준다고 했다. 냄새가 지독했다. 그래도 날마다 발랐다.`,
    ],
    scenes: [
      { id: 'hh_hood', age: [5, 8], title: '두건',
        text: (c) => `골목 아이들과 놀다가 한 아이가 내 두건을 잡아당겼다. 두건이 반쯤 벗겨졌다. 이마의 작은 혹 둘이 드러났다. 아이가 고개를 갸웃했다. 아직 아무도 못 봤다.`,
        choices: [
          { label: '두건을 확 뺏어 다시 쓴다', fx: { stat: { agi: 0.5 }, horn: 4, stress: 4 }, out: () => '"뭐야, 혹이야?" 그 아이가 웃었다. 다른 아이들은 못 봤다. 그날 밤 어머니에게 말했다. 어머니는 밤새 두건 끈을 새로 달았다.' },
          { label: '"넘어져서 생긴 혹이야"라고 웃는다', fx: { stat: { cha: 0.5 }, horn: 2 }, out: () => '아이가 믿었다. 내가 너무 쉽게 거짓말을 했다는 게 무서웠다. 어머니는 그 이야기를 듣고 한참 아무 말도 하지 않았다.' },
          { label: '울면서 집으로 뛰어간다', fx: { stress: 6, aff: { mother: 6 }, horn: 6 }, out: () => '어머니가 문을 잠갔다. 그날 저녁 골목에 "빵집 아이가 왜 울었냐"는 말이 잠깐 돌았다. 금방 잊혔다. 어머니는 잊지 않았다.' },
        ] },
      { id: 'hh_church', age: [9, 12], title: '성당의 축복',
        text: (c) => `성당에서 아이들 머리에 성수를 뿌리는 축복식이 열린다. 빠지면 이상하게 여긴다. ${c.t.priest} 사제는 두건을 벗기고 이마에 직접 손을 얹는다.`,
        choices: [
          { label: '머리를 높이 묶어 뿔을 감추고 간다', fx: { stat: { wil: 0.5 }, horn: 4, stress: 8 }, out: (c) => `${c.t.priest} 사제의 손이 내 이마에 닿았다. 아주 잠깐 손이 멈췄다. 사제는 아무 말 없이 다음 아이에게 갔다. 그날 밤 잠을 못 잤다.` },
          { label: '열이 난다며 빠진다', fx: { horn: 2, aff: { knower: 4 } }, out: (c) => `${c.t.knower} 할머니가 열 나는 약초를 달여 주었다. 진짜로 열이 났다. 축복식은 그렇게 지나갔다. 다음 해에도 그래야 한다.` },
          { label: '사제에게 몰래 털어놓는다', fx: { aff: { priest: 10 }, stress: 10, flag: 'hh_priest' }, out: (c) => `${J(c.t.priest, '은/는')} 오래 말이 없었다. 그러다 성수병을 내려놓고 내 두건을 다시 씌워 주었다. "주님은 이마를 보지 않으신다. 사람들이 볼 뿐이지." 그 뒤로 그 사제는 축복식에서 내 차례를 건너뛰었다.` },
        ] },
      { id: 'hh_flame', age: [13, 15], title: '손끝의 불',
        text: (c) => `화덕 앞에서 화가 났을 때 손끝에서 검붉은 불꽃이 튀었다. 반죽이 그을렸다. ${J(c.fa, '이/가')} 보았다. 반마족은 마법을 몸으로 안다고 ${c.t.knower} 할머니가 말한 적이 있다.`,
        choices: [
          { label: '아버지에게 가르쳐 달라고 매달린다', fx: { skill: { magic: 1.5 }, aff: { father: 6 }, stat: { wil: 0.3 } }, out: (c) => `${J(c.fa, '은/는')} 마법을 모른다. 대신 화를 다스리는 법을 알았다. 반죽을 백 번 치대면서 숨을 세는 법. 불꽃은 그 뒤로 덜 튀었다.` },
          { label: '혼자 몰래 불을 다뤄 본다', fx: { skill: { magic: 2.5 }, stat: { int: 0.4 }, horn: 6, flag: 'hh_flame' }, out: () => '창고에서 밤마다 손끝에 불을 올렸다 내렸다. 사흘째 불꽃이 내 말을 들었다. 닷새째 옆집 사람이 창고 불빛을 이상하게 여겼다.' },
          { label: '그 손을 다시는 쓰지 않기로 한다', fx: { stat: { wil: 0.6 }, stress: 6 }, out: () => '불꽃이 튈 것 같으면 손을 찬물에 담갔다. 겨울에도. 손등이 텄다. 어머니가 연고를 발라 주며 울었다.' },
        ] },
    ],
    check: (g, s) => !s.revealed || !!s.flags.hh_priest || sk(g, 'magic') >= 12,
    burdenScene: {
      title: '심문관이 온 골목', text: (c) => `이단심문관이 하르펜 장터에 왔다. 누군가 빵집 창고의 불빛과 아이 이마 이야기를 고발했다고 한다. 내일 아침 골목 집집마다 사람을 살핀다.`,
      choices: [
        { label: '밤에 뿔을 깎아 낸다', key: 'cut', fx: { stress: 16, horn: -20, stat: { wil: 0.8 }, injury: '깎아 낸 뿔 자리' }, out: (c) => `${c.t.knower} 할머니가 줄칼과 진통 약초를 가져왔다. 새벽까지 걸렸다. 심문관은 이마에 붕대 감은 아이를 보고 "넘어졌나" 하고 지나갔다. 뿔은 몇 해 뒤 다시 자란다.` },
        { label: '식구들과 밤에 하르펜을 떠난다', key: 'flee', fx: { stress: 12, fam: -30, horn: -10, flag: 'hd_fled' }, out: () => '화덕 불을 끄지 않고 나왔다. 아침에 빵 냄새가 나야 이상하게 여기지 않는다. 남쪽 길에서 해가 떴다. 어머니가 두건을 벗고 바람을 맞았다. 처음 보는 얼굴이었다.' },
        { label: '사제에게 도움을 청한다', key: 'priest', test: (g, s) => (s.flags.hh_priest ? 40 : 0) + st(g, 'cha') + st(g, 'wil') / 2, dc: 60, ok: { fx: { aff: { priest: 10 }, horn: -10, flag: 'hh_saved' }, out: (c) => `${c.t.priest} 사제가 심문관을 성당에서 하룻밤 붙잡아 두었다. 이튿날 심문관은 다른 골목부터 살폈다. 우리 골목에 왔을 때는 해가 지고 있었다. 등불 아래서는 누구 이마도 잘 보이지 않는다.` }, bad: { fx: { stress: 18, horn: 20 }, out: () => '사제는 문을 열어 주지 않았다. 다음 날 심문관이 우리 집 문 앞에서 오래 서 있다가 갔다. 아직 끝나지 않았다는 뜻이다.' } },
      ],
    },
  },
  {
    id: 'hd_frontier', race: 'half_demon',
    name: '마족 땅 가까운 변경 집안',
    desc: '그라우벨 성채 바깥, 마족 땅 쪽 고원을 바라보는 변경 마을의 집안. 아버지는 반마족이고, 변경 경비대에서 마족 말을 아는 통역으로 일한다. 성채 사람들은 아버지를 쓰면서도 믿지 않는다. 아이는 뿔을 감추지 않아도 되는 대신, 언제나 의심받는 눈 속에서 자란다.',
    money: 35, fatherJob: 'border_guard', motherJob: 'herbalist', fatherRace: 'half_demon', motherRace: 'human',
    statBias: { wil: 4, str: 2, sen: 3, int: 1 }, skillBias: { sword: 3, magic: 2, letters: 1 },
    standing: '의심받는 경계민', lastNames: ['그라우', '슈타인'], place: 'graubel', fit: 'sword',
    want: { name: '성채가 믿는 이름', text: '아버지는 내가 성채에서 의심받지 않는 첫 반마족이 되기를 바란다.' },
    burden: { name: '마족 땅의 부름', text: '고원 너머 마족 쪽에서는 반쪽 피도 자기들 피라고 여긴다.' },
    ties: [
      { role: 'captain', sex: 'm', age: [45, 55], job: 'knight_captain', race: 'human', aff: -5, word: '아버지를 믿지 않는 성채 대장' },
      { role: 'kin', sex: 'f', age: [80, 150], job: 'idle', race: 'demon', aff: 10, word: '고원 너머의 마족 친척' },
    ],
    lines: [
      (c) => `${J(c.fa, '이/가')} 성채에서 돌아오면 늘 먼저 손을 씻는다. 성채 대장이 악수한 손이라고. 씻는 건 아버지 쪽이다.`,
      (c) => `고원 쪽에서 붉은 봉화가 올랐다. 마을 사람들이 우리 집 쪽을 보았다. ${J(c.mo, '은/는')} 창문 덧문을 닫지 않았다.`,
      () => '성채 아이들은 내 뿔을 만져 보고 싶어 한다. 어른들은 내 뿔을 보고 길을 비킨다. 아이들이 어른이 되면 어느 쪽이 될까.',
    ],
    scenes: [
      { id: 'hf_horn', age: [5, 8], title: '뿔을 만지는 아이',
        text: (c) => `성채 장터에서 사람 아이 하나가 내 뿔을 만져 봐도 되냐고 물었다. 그 아이 어머니가 달려와 아이를 낚아챘다. "만지면 저주받아!"`,
        choices: [
          { label: '"저주 같은 거 없어"라고 말한다', fx: { stat: { cha: 0.4, wil: 0.3 } }, out: () => '그 어머니는 대답하지 않고 아이를 끌고 갔다. 아이가 뒤돌아 손을 흔들었다. 나도 흔들었다.' },
          { label: '뿔을 숙여 아이에게 내민다', fx: { stat: { cha: 0.5 }, stress: 4, flag: 'hf_offered' }, out: () => '아이가 엄마 손을 뿌리치고 와서 뿔을 만졌다. "따뜻해!" 장터가 조용해졌다. 그 어머니는 아이 손을 오래 씻겼다고 한다. 아이는 다음 장날에도 왔다.' },
          { label: '아버지 등 뒤로 숨는다', fx: { aff: { father: 4 }, stress: 4 }, out: (c) => `${J(c.fa, '은/는')} 나를 숨겨 주지 않았다. 내 앞에 쪼그려 앉아 말했다. "숨으면 저 사람들 말이 맞는 게 된다." 그날은 그 말이 미웠다.` },
        ] },
      { id: 'hf_tongue', age: [9, 12], title: '마족 말',
        text: (c) => `${J(c.fa, '이/가')} 마족 말을 가르쳐 주겠다고 했다. 성채에서 통역이 늘 모자라다고. 마을 사람들은 마족 말을 아는 아이를 좋게 보지 않는다.`,
        choices: [
          { label: '열심히 배운다', fx: { skill: { letters: 2 }, stat: { int: 0.5 }, aff: { father: 8 }, flag: 'hf_tongue' }, out: () => '마족 말은 혀를 굴리는 데가 많았다. 한 철 만에 고원에서 온 쪽지를 읽었다. "우리는 너희 아이를 안다." 아버지는 그 쪽지를 화로에 넣었다.' },
          { label: '사람 말만 쓰겠다고 한다', fx: { stat: { wil: 0.4 }, aff: { father: -4, captain: 4 } }, out: (c) => `${J(c.fa, '은/는')} 고개를 끄덕였다. 서운한 얼굴이 아니었다. 오히려 안심한 얼굴이었다. 그게 더 이상했다.` },
          { label: '몰래 혼자 익힌다', fx: { skill: { letters: 1.5, magic: 1 }, stat: { sen: 0.3 } }, out: () => '아버지가 자는 사이 그 책을 꺼내 읽었다. 마족 말로 쓰인 자장가가 있었다. 처음 듣는데 아는 노래 같았다.' },
        ] },
      { id: 'hf_kin', age: [13, 15], title: '고원에서 온 손님',
        text: (c) => `고원 너머에서 마족 여인 하나가 몰래 국경을 넘어왔다. ${c.t.kin}, 아버지의 이모라고 했다. 뿔이 크고 눈이 붉다. 나를 보더니 마족 말로 무언가 말했다. 성채 순찰이 내일 이 길을 지난다.`,
        choices: [
          { label: '하룻밤 숨겨 준다', fx: { aff: { kin: 15, father: 6 }, stress: 8, flag: 'hf_hid' }, out: (c) => `${J(c.t.kin, '은/는')} 밤새 아버지와 마족 말로 이야기했다. 새벽에 떠나며 내 뿔에 손을 대고 말했다. "너는 저쪽에서도 이쪽에서도 반쪽이겠지. 그래도 둘을 다 가진 건 너뿐이다."` },
          { label: '성채에 알린다', fx: { aff: { captain: 12, father: -15, kin: -20 }, renown: 1, stress: 10 }, out: (c) => `순찰대가 고원 쪽으로 쫓아갔다. 잡지 못했다. ${c.t.captain} 대장이 처음으로 내 어깨를 두드렸다. 아버지는 그날 성채에서 늦게 돌아왔다. 나를 보지 않았다.` },
          { label: '돌아가라고 말한다', fx: { stat: { wil: 0.4 }, aff: { kin: -4 } }, out: (c) => `${J(c.t.kin, '은/는')} 웃었다. 사람처럼 웃었다. "그 말을 할 줄 아는구나." 그리고 고원으로 돌아갔다.` },
        ] },
    ],
    check: (g, s) => !!(s.flags.hf_tongue || s.flags.hf_offered) || (g.player.skills.sword ?? 0) >= 18 || ren(g) >= 12,
    burdenScene: {
      title: '첩자라는 고발', text: (c) => `성채에서 봉화 암호가 새어 나갔다. ${c.t.captain} 대장이 아버지와 나를 불렀다. 반마족 통역 말고 누가 마족과 말을 하겠느냐고.`,
      choices: [
        { label: '진짜 첩자를 찾아낸다', key: 'find', test: (g) => st(g, 'int') + st(g, 'sen') + sk(g, 'letters') / 2, dc: 70, ok: { fx: { renown: 5, aff: { captain: 20, father: 10 }, flag: 'hf_trusted' }, out: () => '마족 말 쪽지의 필체를 대조했다. 성채 보급관의 장부 글씨와 같았다. 보급관이 끌려가던 날 대장이 아버지에게 처음으로 술을 따랐다.' }, bad: { fx: { stress: 18, fam: -20 }, out: () => '찾지 못했다. 아버지는 통역 자리에서 쫓겨났다. 의심은 증거가 없어도 남는다. 우리 집 창에 돌이 날아들었다.' } },
        { label: '결투 재판을 청한다', key: 'duel', test: (g) => (g.player.skills.sword ?? 0) + st(g, 'str') + st(g, 'wil') / 2, dc: 70, ok: { fx: { renown: 4, skill: { sword: 2 }, aff: { captain: 8 } }, out: () => '성채 마당에서 대장의 기사와 칼을 겨루었다. 기사의 칼이 먼저 떨어졌다. 법은 내 결백을 인정했다. 사람들 마음까지 인정했는지는 모른다.' }, bad: { fx: { stress: 16, injury: '결투에서 베인 옆구리' }, out: () => '졌다. 법은 아버지를 감옥에 넣지는 않았다. 대신 성채 출입을 막았다. 반마족의 결투는 사람들 눈에 다 비슷해 보이나 보다.' } },
        { label: '고원 너머로 넘어간다', key: 'cross', fx: { aff: { kin: 15, father: -8, captain: -20 }, stress: 14, flag: 'hf_crossed' }, out: () => '밤에 고원을 넘었다. 국경 돌무더기 너머에서 붉은 눈 몇 쌍이 기다리고 있었다. 마족 말로 "어서 와라, 반쪽" 하고 불렀다. 돌아갈 길은 아직 있다. 그쪽에서도 날 반쪽이라고 부르지만.' },
      ],
    },
  },
];

/* ---------- 오래 사는 종족: 사람 벗이 먼저 늙는 글 (스무 살 이후) ---------- */
// c: { n, f(벗 이름), fa, age(벗 나이) }
export const SLOW = [
  (c) => `${J(c.f, '이/가')} 마흔이 넘었다. 같이 개울에서 가재를 잡던 날이 어제 같다. 그 애 머리에 흰 줄이 섞였다. 거울 속 나는 그대로다.`,
  (c) => `${c.f}의 아이가 나를 "${c.call}"라고 불러야 할지 몰라 머뭇거렸다. ${J(c.f, '이/가')} 웃으며 "옛날 친구"라고 했다.`,
  (c) => `${J(c.f, '과/와')} 술을 마셨다. 그 애가 무릎이 쑤신다고 했다. 나는 아직 무릎이 어디 붙어 있는지도 모른다. 그 말을 하지 않았다.`,
  (c) => `${J(c.f, '이/가')} 옛날 이야기를 하다가 이름 하나를 잊었다. 내가 대신 말해 주었다. 그 애가 "넌 왜 아직도 다 기억하냐"고 했다.`,
  () => '오래 사는 피는 시간을 다르게 센다. 한 철이 짧고, 한 사람의 일생이 짧다. 그 짧은 것들이 자꾸 마음에 걸린다.',
];
/* ---------- 반마족: 뿔과 사는 글 ---------- */
export const HORN = [
  () => '두건 속 뿔이 가렵다. 자라는 철이다. 남들 앞에서는 긁지 않는다.',
  () => '거울 앞에서 머리카락으로 뿔을 덮는 데 드는 시간이 해마다 조금씩 길어진다.',
  () => '성광교 행렬이 지나갈 때 나도 모르게 이마에 손이 간다. 행렬은 나를 보지 않는다. 그래도 손이 간다.',
  () => '꿈에서 뿔이 다 자라 있었다. 아무도 놀라지 않았다. 깨고 나서 한참 그 꿈속 거리를 생각했다.',
];
