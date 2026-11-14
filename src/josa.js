// 화면에 나가기 전 글에서 "이(가)", "을(를)", "(으)로" 같은 겹조사를 앞 글자 받침에 맞게 하나로 고친다.
// 여러 모듈이 이름 뒤에 겹조사를 붙여 두었는데, 여기 한 곳에서 다 바로잡는다. (src/ui/util.js의 esc가 부른다)
const PAIRS = [
  ['이(가)', '이', '가'], ['가(이)', '이', '가'],
  ['을(를)', '을', '를'], ['를(을)', '을', '를'],
  ['은(는)', '은', '는'], ['는(은)', '은', '는'],
  ['와(과)', '과', '와'], ['과(와)', '과', '와'],
  ['아(야)', '아', '야'], ['이랑(랑)', '이랑', '랑'],
  ['이에요(예요)', '이에요', '예요'], ['이었(였)', '이었', '였'], ['이여(여)', '이여', '여'],
];
const esc = (s) => s.replace(/[()]/g, '\\$&');
const RE = new RegExp(`([가-힣0-9])(['’"」』]?)(${[...PAIRS.map((p) => esc(p[0])), esc('(으)로')].join('|')})`, 'g');
const MAP = Object.fromEntries(PAIRS.map((p) => [p[0], p]));
// 숫자는 읽는 소리의 받침으로: 0 영, 1 일, 2 이, 3 삼, 4 사, 5 오, 6 육, 7 칠, 8 팔, 9 구
const DIGIT_JONG = { 0: 21, 1: 8, 2: 0, 3: 16, 4: 0, 5: 0, 6: 1, 7: 8, 8: 8, 9: 0 };
function jong(ch) {
  if (/[0-9]/.test(ch)) return DIGIT_JONG[ch];
  return (ch.charCodeAt(0) - 0xac00) % 28;
}
export function fixJosa(text) {
  if (typeof text !== 'string' || text.indexOf('(') < 0) return text;
  return text.replace(RE, (_, ch, q, pat) => {
    const j = jong(ch);
    if (pat === '(으)로') return ch + q + (j === 0 || j === 8 ? '로' : '으로');
    const [, a, b] = MAP[pat];
    return ch + q + (j ? a : b);
  });
}
