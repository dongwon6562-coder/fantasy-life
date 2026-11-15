// 자식 기르기에 쓰는 표: 기질, 재능, 가르칠 길.

// 기질: 태어날 때 정해진다. 반항·집 떠나기·형제 다툼이 잘 일어나는 정도가 다르다.
export const TEMPERS = {
  gentle: { name: '순한', rebel: 0.4, leave: 0.5, quarrel: 0.5, line: '울음소리도 작았고, 한번 안기면 오래 잠들었다.' },
  stubborn: { name: '고집 센', rebel: 1.8, leave: 1, quarrel: 1.6, line: '싫은 것은 숟가락으로 입을 벌려도 뱉어 냈다.' },
  bold: { name: '겁 없는', rebel: 1.3, leave: 1.8, quarrel: 1.2, line: '걸음마를 떼자마자 개울로 걸어 들어갔다.' },
  bright: { name: '눈치 빠른', rebel: 0.9, leave: 1, quarrel: 0.8, line: '어른들 얼굴을 먼저 살피고 나서야 웃었다.' },
  dreamy: { name: '꿈 많은', rebel: 0.8, leave: 1.6, quarrel: 0.6, line: '창밖을 보며 혼잣말을 하는 아이였다.' },
  quiet: { name: '말수 적은', rebel: 0.7, leave: 0.8, quarrel: 0.7, line: '아파도 울지 않고 이불 속에 숨었다.' },
};

// 재능: 자라면서 드러난다. 길과 맞으면 빨리 배우고, 대를 이으면 타고난 재주가 된다.
export const GIFTS = {
  str: { name: '장사 같은 힘', stat: 'str', paths: ['sword', 'home', 'craft'], sign: '여섯 살에 물동이 두 개를 들고 언덕을 올랐다.' },
  agi: { name: '날랜 몸', stat: 'agi', paths: ['sword'], sign: '닭장에서 달아난 닭을 맨손으로 잡아 왔다.' },
  int: { name: '영리한 머리', stat: 'int', paths: ['school', 'magic'], sign: '사제가 한 번 읽어 준 기도문을 끝까지 외웠다.' },
  cha: { name: '말솜씨', stat: 'cha', paths: ['school', 'craft'], sign: '장날에 행상인과 흥정해서 사탕을 하나 더 받아 왔다.' },
  sen: { name: '눈썰미', stat: 'sen', paths: ['craft', 'home'], sign: '어른들이 못 찾은 송아지를 숲 가장자리에서 찾아냈다.' },
  wil: { name: '끈기', stat: 'wil', paths: ['school', 'sword', 'craft'], sign: '매듭 하나를 풀겠다고 해가 질 때까지 앉아 있었다.' },
  magic: { name: '마력의 기미', stat: 'int', paths: ['magic'], sign: '아이가 우는 밤이면 등잔불이 저절로 흔들렸다.' },
};

// 가르칠 길: 일곱 살 무렵 정한다. 열다섯이 되면 그 길에 맞는 일을 잡는다.
export const PATHS = {
  school: { name: '서당', skill: 'letters', stat: 'int', fee: 1, jobs: ['scholar', 'priest', 'guild_clerk'], leaveTo: 'leocast', line: '예배당 서당에 보냈다. 한 달에 은화 한 닢.' },
  craft: { name: '내 일 배우기', skill: null, stat: 'sen', fee: 0, jobs: [], leaveTo: 'harfen', line: '내 곁에 두고 내 일을 가르치기로 했다.' },
  sword: { name: '검', skill: 'sword', stat: 'str', fee: 0, jobs: ['guard', 'adventurer'], leaveTo: 'harfen', line: '목검을 깎아 쥐여 주었다.' },
  magic: { name: '마법', skill: 'magic', stat: 'int', fee: 2, jobs: ['hedge_mage'], leaveTo: 'verden', line: '마법을 가르치기로 했다. 책값과 촛값이 든다.' },
  home: { name: '집안일', skill: 'farming', stat: 'str', fee: 0, jobs: ['farmer'], leaveTo: 'harfen', line: '집안일과 밭일을 거들게 했다. 손이 하나 늘었다.' },
  free: { name: '하고 싶은 대로', skill: null, stat: null, fee: 0, jobs: [], leaveTo: 'harfen', line: '하고 싶은 것을 하게 두었다.' },
};
// 내 일을 가르칠 때 고르는 기술 (내가 가장 잘하는 것)
export const CRAFT_SKILLS = ['farming', 'cooking', 'trade', 'herbs', 'smithing', 'sword', 'letters', 'magic'];
export const SKILL_JOB = { farming: 'farmer', cooking: 'cook', trade: 'merchant', herbs: 'herbalist', smithing: 'smith', sword: 'guard', letters: 'scholar', magic: 'hedge_mage' };
export const SKILL_NAME = { sword: '검술', magic: '마법', letters: '글', farming: '농사', cooking: '요리', trade: '장사', herbs: '약초', smithing: '대장일' };

// 유언
export const WILLS = {
  eldest: '맏이에게 몰아준다',
  equal: '자식들에게 똑같이 나눈다',
  chosen: '한 자식을 골라 잇게 한다',
};

// 집을 떠난 자식이 가는 곳
export const LEAVE_PLACES = { leocast: '왕도 레오카스트', harfen: '하르펜', verden: '베르덴' };
