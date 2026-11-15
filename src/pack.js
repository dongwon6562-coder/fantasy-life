// 저장 줄이기: LZW 방식으로 글을 줄여 UTF-16 글자(한 글자에 15비트)로 담는다.
// 저장이 한 칸에 200KB를 넘게 되어, 여러 칸을 쓰면 폰의 5MB 저장 공간이 모자랄 수 있었다.
// 같은 말이 아주 많이 되풀이되는 저장(이름, 'ageMonths' 같은 키)이라 대개 4~6분의 1로 준다.
// 형식: 앞의 'Z1:' 표시 + 압축 글자들. 표시가 없으면 예전의 JSON 그대로다.

const MARK = 'Z1:';
const OFF = 32; // 15비트 값에 32를 더해 제어 문자와 서로게이트 영역(0xD800~)을 피한다

export function pack(str) {
  const out = [];
  let buf = 0, nbits = 0;
  const put = (value, width) => {
    for (let i = 0; i < width; i++) {
      buf = (buf << 1) | ((value >> i) & 1);
      if (++nbits === 15) { out.push(String.fromCharCode(buf + OFF)); buf = 0; nbits = 0; }
    }
  };
  const dict = new Map();
  const fresh = new Set(); // 처음 본 글자: 아직 글자 그대로 보내지 않은 것
  let size = 3, width = 2, enlarge = 2, w = '';
  const tick = () => { if (--enlarge === 0) { enlarge = 1 << width; width++; } };
  const emit = (s) => {
    if (fresh.has(s)) {
      const c = s.charCodeAt(0);
      if (c < 256) { put(0, width); put(c, 8); } else { put(1, width); put(c, 16); }
      tick();
      fresh.delete(s);
    } else put(dict.get(s), width);
    tick();
  };
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (!dict.has(c)) { dict.set(c, size++); fresh.add(c); }
    const wc = w + c;
    if (dict.has(wc)) { w = wc; continue; }
    emit(w);
    dict.set(wc, size++);
    w = c;
  }
  if (w !== '') emit(w);
  put(2, width);
  if (nbits > 0) { buf <<= 15 - nbits; out.push(String.fromCharCode(buf + OFF)); }
  return out.join('');
}

export function unpack(data) {
  if (data === '') return '';
  let pos = 0, cur = 0, left = 0;
  const bits = (width) => {
    let v = 0;
    for (let i = 0; i < width; i++) {
      if (left === 0) { if (pos >= data.length) throw new Error('잘린 저장'); cur = data.charCodeAt(pos++) - OFF; left = 15; }
      left--;
      v |= ((cur >> left) & 1) << i;
    }
    return v;
  };
  const dict = [0, 1, 2];
  let size = 4, width = 3, enlarge = 4;
  const first = bits(2);
  if (first === 2) return '';
  let w = String.fromCharCode(bits(first === 0 ? 8 : 16));
  dict[3] = w;
  const out = [w];
  for (;;) {
    let c = bits(width);
    if (c === 2) return out.join('');
    if (c === 0 || c === 1) {
      dict[size++] = String.fromCharCode(bits(c === 0 ? 8 : 16));
      c = size - 1;
      if (--enlarge === 0) { enlarge = 1 << width; width++; }
    }
    let entry;
    if (dict[c] !== undefined && c < size && typeof dict[c] === 'string') entry = dict[c];
    else if (c === size) entry = w + w[0];
    else throw new Error('깨진 저장');
    out.push(entry);
    dict[size++] = w + entry[0];
    if (--enlarge === 0) { enlarge = 1 << width; width++; }
    w = entry;
  }
}

export const encodeSave = (game) => MARK + pack(JSON.stringify(game));
export function decodeSave(text) {
  if (text == null) return null;
  if (text.startsWith(MARK)) return JSON.parse(unpack(text.slice(MARK.length)));
  return JSON.parse(text);
}
