// 유전과 타고남: 고를 거리와 말.

// 시작 때 고를 수 있는 '큰 재능 하나'. 첫 사람만 고른다. 자식은 핏줄로 물려받는다.
// talents: 능력치 재능 배율에 곱한다(1보다 작던 것은 1로 올린 뒤). skills: 그 기술이 느는 빠르기.
export const BIRTH_GIFTS = {
  magic: {
    name: '큰 마력', icon: 'magic',
    line: '마력 그릇이 크게 태어난다. 마법사로 크다 주저앉을 일은 없다. 높은 서클은 그래도 수련과 기회가 있어야 한다.',
    talents: { int: 1.2, wil: 1.15 }, skills: { magic: 1.6 },
    seen: { who: '회색 망토의 마탑 마법사', text: '마을을 지나던 회색 망토의 마법사가 우물가에서 걸음을 멈추고 한참을 바라보았다. 이 아이를 마탑 견습으로 몇 해 맡기면, 철마다 사람을 보내 데려가고 데려다주겠다고 한다.', skill: 'magic' },
    sign: '아이가 웃으면 등잔불이 따라 흔들렸다.',
  },
  sword: {
    name: '타고난 검재', icon: 'sword',
    line: '몸이 날래고 칼을 쥐는 손이 다르다. 검술이 훨씬 빨리 는다.',
    talents: { str: 1.2, agi: 1.3 }, skills: { sword: 1.7 },
    seen: { who: '유파의 늙은 검사', text: '장터에서 막대기 칼싸움을 하던 아이들을 보던 늙은 검사가 한 아이만 따로 불러 세웠다. 자기 유파 도장에 몇 해 드나들게 하고 싶다고 한다.', skill: 'sword' },
    sign: '처음 잡은 나무칼을 놓지 않고 잠들었다.',
  },
  letters: {
    name: '비상한 머리', icon: 'book',
    line: '한 번 들은 것을 잊지 않는다. 글과 학문이 훨씬 빨리 늘고, 마법 이론도 조금 쉽다.',
    talents: { int: 1.35, wil: 1.1 }, skills: { letters: 1.7, magic: 1.1 },
    seen: { who: '학원에서 온 학자', text: '예배당 서당에 들른 학원의 학자가 아이의 글씨와 셈을 보고 눈썹을 올렸다. 학원 아래 소학당에 몇 해 다니게 하면 책값은 학원이 대겠다고 한다.', skill: 'letters' },
    sign: '세 살에 사제의 기도문을 따라 외웠다.',
  },
  trade: {
    name: '장사 눈', icon: 'coin',
    line: '값을 읽고 사람을 읽는다. 장사가 훨씬 빨리 늘고 말이 잘 먹힌다.',
    talents: { cha: 1.3, sen: 1.2 }, skills: { trade: 1.7 },
    seen: { who: '상단의 행수', text: '장날마다 행상 곁을 맴돌며 셈을 거들던 아이를 상단 행수가 눈여겨보았다. 몇 해 상단 심부름꾼으로 따라다니게 하면 장부 보는 법을 가르치겠다고 한다.', skill: 'trade' },
    sign: '다섯 살에 사탕 한 알을 두 알로 바꿔 왔다.',
  },
  craft: {
    name: '손재주', icon: 'hammer',
    line: '손끝이 야무지다. 대장일·요리·약초가 빨리 늘고 농사도 조금 낫다.',
    talents: { sen: 1.3, agi: 1.15 }, skills: { smithing: 1.6, cooking: 1.5, herbs: 1.5, farming: 1.2 },
    seen: { who: '이름난 장인', text: '고장 장인이 아이가 깎은 나무 숟가락을 손에 쥐고 이리저리 돌려 보았다. 몇 해 공방에 드나들며 어깨너머로 배우게 하자고 한다.', skill: 'smithing' },
    sign: '부서진 수레바퀴를 혼자 맞춰 놓았다.',
  },
  faith: {
    name: '깊은 믿음', icon: 'pray',
    line: '기도가 마음에 닿는다. 믿음이 깊이 뿌리내리고 성력이 쉽게 붙는다. 마음이 굳다.',
    talents: { wil: 1.3, cha: 1.1 }, skills: { letters: 1.5 },
    seen: { who: '교단의 순회 사제', text: '마을을 돌던 순회 사제가 예배당 맨 앞에 앉은 아이를 오래 지켜보았다. 몇 해 교단 수련원에 드나들며 기도와 글을 배우게 하자고 한다.', skill: 'letters' },
    sign: '아무도 시키지 않았는데 저녁 기도를 거른 적이 없다.',
  },
};
export const BIRTH_GIFT_IDS = Object.keys(BIRTH_GIFTS);

// 핏줄에서 크게 튄 아이를 알리는 말
export const LEAP_WORD = {
  str: '부모 누구보다 힘이 세다', agi: '부모 누구보다 몸이 날래다', int: '부모 누구보다 머리가 좋다',
  wil: '부모 누구보다 끈질기다', cha: '부모 누구보다 사람을 끈다', sen: '부모 누구보다 눈이 밝다', mana: '부모에게 없던 마력이 흐른다',
};
export const STAT_WORD = { str: '힘', agi: '날램', int: '머리', wil: '끈기', cha: '사람 끄는 힘', sen: '눈썰미' };
