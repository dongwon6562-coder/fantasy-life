// 종족: 설정 문서 "종족"을 따른다. 인물의 p.race 값 (없으면 human).
// 초상(src/art/portrait.js)은 p.race와 수인의 p.beast를 읽는다.

// scale: 스무 살 이후 한 해에 몸이 늙는 정도 (사람 = 1). bodyAge = 20 + (나이 - 20) × scale
// grow: 능력치가 크는 빠르기, talent: 능력치별 재능 배율, mana: 마력 잠재력을 어떻게 바꾸나
export const RACES = {
  human: {
    name: '인간', life: 70, scale: 1, grow: 1,
    desc: '수가 가장 많고, 짧은 삶 때문에 가장 빨리 변하고 발전한다. 재능의 편차가 커서 천재가 가장 자주 나온다.',
    talent: {}, spread: 1.3,
    mana: (mp) => mp,
    home: '중앙 대륙',
  },
  elf: {
    name: '엘프', life: 1000, scale: 0.06, grow: 0.8,
    desc: '마력이 타고나게 크고 감정 표현이 적다. 인간의 시간을 잠깐 스쳐 가는 것으로 느낀다. 아름다움 때문에 노예 사냥의 표적이 된다.',
    talent: { int: 1.15, sen: 1.2, cha: 1.1, str: 0.8, wil: 1.05 }, spread: 0.8,
    mana: (mp, rng) => Math.min(1, 0.3 + mp * 0.6 + rng.next() * 0.25),
    home: '대삼림 북부, 엘프 왕국',
  },
  dwarf: {
    name: '드워프', life: 300, scale: 0.22, grow: 0.9,
    desc: '대륙 최고의 대장장이이자 전사. 마법은 서투르지만 마도구를 다루는 데는 누구보다 뛰어나다.',
    talent: { str: 1.25, wil: 1.25, agi: 0.85, cha: 0.9 }, spread: 0.9,
    mana: (mp) => mp * 0.35,
    skill: { smithing: 8 },
    home: '천룡 산맥 동부, 북부 변경',
  },
  beast: {
    name: '수인', life: 60, scale: 1.15, grow: 1.1,
    desc: '부족마다 다르고, 감각과 육체가 뛰어나다. 인간 나라에서는 차별받는다.',
    talent: { str: 1.15, agi: 1.25, sen: 1.3, int: 0.85 }, spread: 1,
    mana: (mp) => mp * 0.45,
    home: '대삼림 남부, 수인 부족 연합',
  },
  half_elf: {
    name: '하프엘프', life: 220, scale: 0.32, grow: 0.95,
    desc: '인간과 엘프 사이에서 태어났다. 어느 쪽에도 온전히 속하지 못한다. 엘프의 숲은 반쪽짜리를 들이지 않고, 인간은 늙지 않는 얼굴을 꺼린다.',
    talent: { int: 1.08, sen: 1.1, cha: 1.08 }, spread: 1.1,
    mana: (mp, rng) => Math.min(1, mp * 0.7 + rng.next() * 0.3),
    home: '경계촌, 어디나',
  },
  demon: {
    name: '마족', life: 400, scale: 0.18, grow: 1,
    desc: '인간과 비슷한 모습에 뿔이 있고, 마법을 본능으로 쓴다.',
    talent: { str: 1.1, wil: 1.1 }, spread: 1,
    mana: (mp, rng) => Math.min(1, 0.25 + mp * 0.7 + rng.next() * 0.2),
    home: '마대륙',
    npcOnly: true,
  },
  half_demon: {
    name: '반마족', life: 150, scale: 0.45, grow: 1,
    desc: '작은 뿔을 감추고 산다. 태어난 것만으로 죄가 되는 나라도 있다.',
    talent: { wil: 1.1, sen: 1.1 }, spread: 1.1,
    mana: (mp, rng) => Math.min(1, mp * 0.8 + rng.next() * 0.25),
    home: '어디나',
    npcOnly: true,
  },
};
export const BEASTS = {
  wolf: { name: '늑대', talent: { sen: 1.1 } },
  cat: { name: '고양이', talent: { agi: 1.1 } },
  tiger: { name: '호랑이', talent: { str: 1.1 } },
  lion: { name: '사자', talent: { cha: 1.1 } },
  bear: { name: '곰', talent: { str: 1.15, agi: 0.9 } },
  hawk: { name: '매', talent: { sen: 1.15 } },
};

// 두 부모에게서 나는 아이의 종족
export function childRace(a = 'human', b = 'human', rng) {
  if (a === b) return a;
  const pair = [a, b].sort().join('+');
  const MIX = {
    'elf+human': 'half_elf', 'half_elf+human': rng.chance(0.5) ? 'half_elf' : 'human', 'elf+half_elf': rng.chance(0.6) ? 'elf' : 'half_elf',
    'demon+human': 'half_demon', 'half_demon+human': rng.chance(0.5) ? 'half_demon' : 'human',
    'beast+human': rng.chance(0.5) ? 'beast' : 'human',
    'dwarf+human': rng.chance(0.5) ? 'dwarf' : 'human',
  };
  return MIX[pair] ?? (rng.chance(0.5) ? a : b);
}
// 다른 종족끼리는 아이가 잘 생기지 않는다 (엘프는 같은 종족끼리도 드물다)
export function fertility(a = 'human', b = 'human') {
  if (a === 'elf' && b === 'elf') return 0.15;
  if (a === b) return a === 'dwarf' ? 0.5 : 1;
  const s = new Set([a, b]);
  if (s.has('elf')) return 0.25;
  if (s.has('dwarf')) return 0.3;
  return 0.6;
}

// 종족마다 이름 (인간은 data.js, 다른 나라 인간은 realms/data.js)
export const RACE_NAMES = {
  elf: {
    m: ['엘라리온', '세렌딜', '아에리스', '테리안', '갈란드릴', '이실도르', '파엔', '로세릭', '실바렌', '나이에'],
    f: ['아일린', '세릴리아', '엘레스', '미리엘', '이르나', '네시아', '탈리엔', '루멜', '아리아에', '실렌'],
    last: ['은잎', '새벽이슬', '달그늘', '세계수의 가지', '바람결', '별빛샘'],
  },
  dwarf: {
    m: ['볼그림', '토린', '두르간', '브론', '그림발', '카즈닉', '도른', '할바르', '바린', '스토르'],
    f: ['헬다', '브룬', '디스', '그리다', '토라', '마르가', '힐드', '분나'],
    last: ['쇠망치', '돌수염', '붉은 모루', '깊은 갱', '청동팔', '불꽃손'],
  },
  beast: {
    m: ['가르', '루칸', '세브', '토카', '라스', '하운', '케이르', '바르그'],
    f: ['리아', '나샤', '카이라', '수나', '레이', '미르', '타라', '오엔'],
    last: { wolf: '회색 갈기', cat: '밤발톱', tiger: '줄무늬', lion: '황금 갈기', bear: '큰발', hawk: '높은 깃' },
  },
  demon: {
    m: ['베리스', '자르콘', '모르데스', '카엘'],
    f: ['릴리스', '세라핀', '모르가', '이벨'],
    last: ['검은 뿔', '잿빛 날개', '붉은 눈'],
  },
};

// 집안: 종족마다 하나씩 (에른 마을 근처에 사는 다른 종족 집안)
export const RACE_FAMILIES = [
  {
    id: 'elf_exile',
    race: 'elf',
    name: '숲을 떠난 엘프 집안',
    desc: '세계수의 숲을 떠나 에른 마을 숲가에 약초밭을 일군 엘프 부부. 이유는 말하지 않는다. 마을 사람들은 공손하지만 거리를 둔다. 아이는 마력을 타고나고, 인간 친구들이 늙어 가는 것을 보며 자란다.',
    money: 60,
    fatherJob: 'hedge_mage', motherJob: 'herbalist',
    statBias: { int: 3, sen: 4, cha: 2 },
    skillBias: { herbs: 6, magic: 2 },
    standing: '외지인',
    lastNames: ['은잎', '달그늘', '바람결'],
  },
  {
    id: 'dwarf_smith',
    race: 'dwarf',
    name: '드워프 대장장이 집안',
    desc: '산을 떠나 에른 마을 어귀에 대장간을 연 드워프 집안. 망치 소리가 새벽부터 울린다. 고집이 세고 손이 정직하다. 아이는 튼튼하게 자라고, 불과 쇠를 일찍 배운다. 마법에는 소질이 없다.',
    money: 80,
    fatherJob: 'smith', motherJob: 'smith',
    statBias: { str: 4, wil: 4, sen: 1 },
    skillBias: { smithing: 6, trade: 2 },
    standing: '외지인',
    lastNames: ['쇠망치', '돌수염', '붉은 모루'],
  },
  {
    id: 'beast_hunter',
    race: 'beast',
    name: '수인 사냥꾼 집안',
    desc: '노예 사냥꾼을 피해 남쪽 숲에서 올라온 수인 가족. 숲 깊은 곳 오두막에서 사냥으로 산다. 마을 사람 몇은 아직도 개 짖는 소리를 흉내 내며 지나간다. 아이는 누구보다 빠르고 눈이 밝다.',
    money: 15,
    fatherJob: 'hunter', motherJob: 'weaver',
    statBias: { agi: 4, sen: 4, str: 2 },
    skillBias: { herbs: 2 },
    standing: '천민 취급',
    lastNames: ['회색 갈기', '밤발톱', '줄무늬'],
  },
  {
    id: 'half_elf',
    race: 'half_elf',
    name: '엘프 어머니를 둔 집안',
    desc: '에른의 약초꾼 아버지와, 숲에서 다친 채 발견된 엘프 어머니. 둘의 혼인은 마을의 오랜 이야깃거리다. 아이는 반쯤 엘프의 얼굴로 태어나 사람보다 오래 산다. 어느 쪽에도 온전히 속하지 못한다.',
    money: 35,
    fatherJob: 'herbalist', motherJob: 'herbalist',
    statBias: { int: 2, sen: 3, cha: 3 },
    skillBias: { herbs: 4, letters: 2 },
    standing: '평민',
    lastNames: ['베일', '오어', '휘트먼'],
    motherRace: 'elf', fatherRace: 'human',
  },
];

// 나라마다 다른 종족을 어떻게 대하나: welcome 반김, normal 보통, wary 꺼림, scorn 멸시, banned 들일 수 없음
export const TREATMENT = {
  leonia: { elf: 'wary', dwarf: 'normal', beast: 'scorn', half_elf: 'wary', demon: 'banned', half_demon: 'scorn' },
  valhart: { elf: 'normal', dwarf: 'welcome', beast: 'scorn', half_elf: 'normal', demon: 'banned', half_demon: 'wary' },
  holy: { elf: 'banned', dwarf: 'banned', beast: 'banned', half_elf: 'banned', demon: 'banned', half_demon: 'banned' },
  serenia: { elf: 'welcome', dwarf: 'normal', beast: 'normal', half_elf: 'normal', demon: 'wary', half_demon: 'normal' },
  free: { elf: 'normal', dwarf: 'normal', beast: 'normal', half_elf: 'normal', demon: 'wary', half_demon: 'normal' },
  march: { elf: 'normal', dwarf: 'welcome', beast: 'normal', half_elf: 'normal', demon: 'banned', half_demon: 'scorn' },
};
export const TREAT_WORD = { welcome: '반긴다', normal: '가리지 않는다', wary: '꺼린다', scorn: '멸시한다', banned: '들이지 않는다' };
// 관계에 주는 영향 (호감이 오르는 폭에 더한다)
export const TREAT_SHIFT = { welcome: 1, normal: 0, wary: -1, scorn: -3, banned: -4 };
