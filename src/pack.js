// 저장 줄이기: LZW 방식으로 글을 줄여 UTF-16 글자(한 글자에 15비트)로 담는다.
// 저장이 한 칸에 200KB를 넘게 되어, 여러 칸을 쓰면 폰의 5MB 저장 공간이 모자랄 수 있었다.
// 같은 말이 아주 많이 되풀이되는 저장(이름, 'ageMonths' 같은 키)이라 대개 4~6분의 1로 준다.
// 형식: 앞의 'Z1:' 표시 + 압축 글자들. 표시가 없으면 예전의 JSON 그대로다.

const MARK = 'Z1:';
const OFF = 32; // 15비트 값에 32를 더해 제어 문자와 서로게이트 영역(0xD800~)을 피한다

const REV8 = Uint8Array.from({ length: 256 }, (_, i) => { let r = 0; for (let b = 0; b < 8; b++) r |= ((i >> b) & 1) << (7 - b); return r; });

export function pack(str) {
  const out = [];
  let buf = 0, nbits = 0;
  // 값의 낮은 비트부터 하나씩 넣던 것을, 비트를 뒤집어 한 번에 여러 개씩 넣는다 (31단계 헤드: 저장이 열 배쯤 빨라짐, 결과는 똑같다)
  const put = (value, width) => {
    let rev = (REV8[value & 255] << 24 | REV8[(value >>> 8) & 255] << 16 | REV8[(value >>> 16) & 255] << 8 | REV8[value >>> 24]) >>> (32 - width);
    while (width > 0) {
      const k = Math.min(width, 15 - nbits);
      width -= k;
      buf = (buf << k) | ((rev >>> width) & ((1 << k) - 1));
      nbits += k;
      if (nbits === 15) { out.push(String.fromCharCode(buf + OFF)); buf = 0; nbits = 0; }
    }
  };
  // 사전 열쇠를 글이 아니라 (앞 번호, 다음 글자) 수 하나로 둔다 (31단계 헤드: 긴 글을 이어 붙이지 않아 빨라짐, 결과는 똑같다)
  const single = new Map(); // 글자 코드 → 번호
  const pairs = new Map(); // 앞 번호 * 65536 + 글자 코드 → 번호
  const fresh = new Map(); // 처음 본 글자: 아직 글자 그대로 보내지 않은 것 (번호 → 글자 코드)
  let size = 3, width = 2, enlarge = 2, w = -1;
  const tick = () => { if (--enlarge === 0) { enlarge = 1 << width; width++; } };
  const emit = (code) => {
    const c = fresh.get(code);
    if (c !== undefined) {
      if (c < 256) { put(0, width); put(c, 8); } else { put(1, width); put(c, 16); }
      tick();
      fresh.delete(code);
    } else put(code, width);
    tick();
  };
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    let cc = single.get(c);
    if (cc === undefined) { cc = size++; single.set(c, cc); fresh.set(cc, c); }
    if (w < 0) { w = cc; continue; }
    const key = w * 65536 + c;
    const hit = pairs.get(key);
    if (hit !== undefined) { w = hit; continue; }
    emit(w);
    pairs.set(key, size++);
    w = cc;
  }
  if (w >= 0) emit(w);
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
