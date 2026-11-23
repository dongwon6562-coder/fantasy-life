// 38단계 고장 지도 (도우미스레드3): 한 고장을 위에서 내려다본 동판화풍 약도.
// 성벽과 문, 큰길과 골목, 장터와 신전과 여관, 물가와 밭과 숲, 이웃 고장으로 나가는 길. 내 집과 그 고장의 지금 형편(점령 깃발, 산채 쪽 길)도 얹는다.
// 같은 고장은 늘 같은 모양으로 그려진다(고장 id가 씨앗). 규칙은 건드리지 않고 game을 읽기만 한다.
//   townMapSvg(place, game, { neighbors }) → SVG 문자열. place: 지도 장소 { id, n, t, x, y }, neighbors: [{ id, n, x, y, days }]
// 고장마다의 모양은 TOWNS 표. 표에 없는 곳은 지도 기호(t)로 짐작한다.

const W = 800, H = 600;
const INK = '#2b1d12', PAPER = '#efe3c4', PAPER2 = '#e6d6b0', WATER = '#b9c3b4', RED = '#8c2a1a';

// size: 0 외딴 곳, 1 마을, 2 성읍, 3 큰 도시 · wall: 0 없음, 1 나무 울타리, 2 돌 성벽, 3 겹성벽 · water: sea(바다쪽 dir)·river·lake
// marks: 고장 안 이름난 곳 [kind, 이름] (kind: square well temple chapel inn smith guild castle keep tower hall market dock mill slum yard school cave mine arena tree gate ruin camp)
// out: 성 밖 [kind, 이름, 방향(0 동, 90 남, 180 서, 270 북)]
const TOWNS = {
  ern: { size: 1, wall: 0, water: 'river', fields: 3, marks: [['well', '마을 우물'], ['chapel', '성광교 예배당'], ['inn', '여관 「물레방아」'], ['mill', '방앗간'], ['smith', '대장간'], ['hall', '촌장 집']], out: [['woods', '숲', 200], ['fields', '밀밭', 30]] },
  harfen: { size: 2, wall: 2, water: 'river', fields: 2, marks: [['square', '장터 광장'], ['temple', '성광교 성당'], ['guild', '모험가 길드 지부'], ['market', '은저울 상단 본점'], ['inn', '여관 거리'], ['smith', '대장간 골목'], ['hall', '대관 관청']], out: [['cave', '회색 굴 (고블린)', 100]] },
  verden: { size: 2, wall: 2, hill: true, water: 'river', fields: 2, marks: [['castle', '백작의 성채'], ['yard', '기사단 훈련장'], ['square', '성읍 장터'], ['temple', '성당'], ['inn', '여관'], ['smith', '병기 대장간']], out: [['mine', '버려진 은광', 190]] },
  leocast: { size: 3, wall: 3, water: 'river', fields: 1, marks: [['castle', '백색 성'], ['square', '대광장'], ['temple', '대성당'], ['school', '왕립 학원'], ['tower', '궁정 마법사의 탑'], ['market', '상인 거리'], ['inn', '여관과 주점 거리'], ['hall', '왕실 세리청'], ['slum', '성 밖 빈민가 (검은 장갑)']] },
  gruental: { size: 1, wall: 0, water: 'river', fields: 3, hill: true, marks: [['keep', '언덕 위 낡은 영주관'], ['well', '개울가 빨래터'], ['chapel', '작은 사당'], ['inn', '주막'], ['mill', '물레방아']], out: [['vines', '포도밭', 20]] },
  estella: { size: 3, wall: 2, ruin: true, marks: [['castle', '무너진 왕궁 (언데드)'], ['square', '잿빛 광장'], ['temple', '목 없는 신전'], ['ruin', '불탄 거리']] },
  eisen: { size: 3, wall: 2, grid: true, water: 'river', marks: [['castle', '황궁'], ['school', '제국 마법원'], ['yard', '기사 사관학교'], ['square', '제국 광장'], ['hall', '총독부'], ['arena', '투기장'], ['inn', '군인 여관']] },
  solaris: { size: 3, wall: 2, fields: 1, marks: [['temple', '금빛 대성당'], ['hall', '이단심문소'], ['square', '순례자 광장'], ['inn', '순례자 숙소'], ['market', '성물 시장']] },
  serenia: { size: 3, wall: 1, water: 'lake', marks: [['tower', '일곱 탑'], ['school', '마법 대학'], ['square', '호숫가 광장'], ['inn', '찻집 거리'], ['market', '마도구 상점']] },
  barka: { size: 3, wall: 1, water: 'sea', sea: 0, marks: [['tower', '끝없는 탑'], ['guild', '모험가 길드 본부'], ['market', '마석 거래소'], ['dock', '부두'], ['inn', '모험가 주점'], ['square', '의회 광장']] },
  graubel: { size: 3, wall: 3, hill: true, marks: [['castle', '변경 백작의 성채'], ['yard', '연병장'], ['smith', '병기창'], ['square', '성문 광장'], ['inn', '병사 주점'], ['temple', '전사자 사당']], out: [['camp', '북부 전선 쪽 진지', 0]] },
  silverleaf: { size: 1, wall: 0, forest: true, marks: [['tree', '은빛 거목'], ['market', '교역 마당'], ['hall', '장로의 집'], ['inn', '손님 오두막']] },
  hammer: { size: 1, wall: 1, hill: true, marks: [['smith', '드워프 대장간'], ['hall', '씨족 회관'], ['mine', '갱도 입구'], ['inn', '맥주 창고']], out: [['mine', '구렁목 가는 굴', 0]] },
  fur: { size: 1, wall: 1, marks: [['market', '모피와 소금 장'], ['camp', '부족 천막'], ['well', '물가'], ['inn', '교역 오두막']] },
  klein: { size: 1, wall: 1, water: 'sea', sea: 180, marks: [['dock', '어선 부두'], ['tower', '망루'], ['market', '생선 장'], ['inn', '뱃사람 주점'], ['chapel', '바다 사당']] },
  portel: { size: 3, wall: 2, water: 'sea', sea: 90, marks: [['dock', '큰 부두'], ['market', '상관 거리'], ['square', '항구 광장'], ['hall', '상인 의회'], ['inn', '선원 여관'], ['slum', '밤의 암시장']] },
  saltmare: { size: 2, wall: 1, water: 'sea', sea: 90, marks: [['dock', '해적선 부두'], ['hall', '섬장 회관'], ['market', '무엇이든 장'], ['inn', '럼 주점']] },
  crow: { size: 1, wall: 2, water: 'sea', sea: 90, marks: [['keep', '까마귀 요새'], ['dock', '숨은 포구'], ['inn', '해적 소굴']] },
  saltrock: { size: 0, wall: 0, water: 'sea', sea: 90, marks: [['chapel', '등대 사당'], ['dock', '작은 선착장'], ['well', '빗물 저수조']] },
  gorge: { size: 2, wall: 1, hill: true, marks: [['cave', '미궁 입구'], ['guild', '탐험가 회관'], ['market', '전리품 장'], ['inn', '굴 주점'], ['smith', '드워프 대장간']] },
  fr_wolf: { size: 0, wall: 1, hill: true, marks: [['camp', '개척촌'], ['tower', '고갯마루 망대']] },
  fr_moor: { size: 0, wall: 1, marks: [['camp', '개척촌'], ['well', '깊은 우물']] },
  fr_wood: { size: 0, wall: 1, forest: true, marks: [['camp', '개척촌'], ['mill', '제재소']] },
  fr_fen: { size: 0, wall: 1, water: 'lake', marks: [['camp', '말뚝 위 개척촌'], ['dock', '거룻배 나루']] },
  fr_ash: { size: 0, wall: 1, hill: true, marks: [['camp', '개척촌'], ['mine', '잿빛 굴']] },
  fr_grass: { size: 0, wall: 1, fields: 2, marks: [['camp', '개척촌'], ['well', '우물']] },
};
const BY_T = {
  capital: { size: 3, wall: 2, marks: [['castle', '성'], ['square', '광장'], ['temple', '신전'], ['market', '시장'], ['inn', '여관']] },
  city: { size: 2, wall: 2, fields: 1, marks: [['square', '장터'], ['temple', '신전'], ['inn', '여관'], ['smith', '대장간']] },
  town: { size: 1, wall: 0, fields: 2, marks: [['well', '우물'], ['chapel', '사당'], ['inn', '주막']] },
  fort: { size: 1, wall: 2, marks: [['keep', '요새'], ['yard', '연병장']] },
  dungeon: { size: 0, wall: 0, marks: [['cave', '입구'], ['camp', '탐험가 야영지']] },
  ruin: { size: 1, wall: 2, ruin: true, marks: [['ruin', '무너진 터']] },
  site: { size: 0, wall: 0, marks: [['chapel', '옛터']] },
};
export const townSpec = (place) => TOWNS[place?.id] ?? BY_T[place?.t] ?? BY_T.town;

/* ---------- 난수 ---------- */
function rngOf(id) {
  let s = 2166136261;
  for (const ch of String(id)) s = Math.imul(s ^ ch.charCodeAt(0), 16777619);
  s >>>= 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const pt = (p) => `${f1(p[0])} ${f1(p[1])}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
const polyDist = (p, L) => { let d = 1e9; for (let i = 0; i < L.length - 1; i++) d = Math.min(d, segDist(p, L[i], L[i + 1])); return d; };
function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function smooth(p, closed = false) {
  if (p.length < 3) return 'M' + p.map(pt).join('L');
  let d = `M${pt(closed ? [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2] : p[0])}`;
  const n = p.length;
  for (let i = 1; i < (closed ? n + 1 : n - 1); i++) {
    const a = p[i % n], b = p[(i + 1) % n];
    d += `Q${pt(a)} ${pt([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])}`;
  }
  if (!closed) d += `L${pt(p[n - 1])}`;
  return d + (closed ? 'Z' : '');
}
// 꺾은선을 흔들어 손그림처럼
function wobble(line, r, amt, step = 22) {
  const out = [line[0]];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    const nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
    for (let k = 1; k <= n; k++) {
      const t = k / n, j = k === n ? 0 : (r() - 0.5) * amt;
      out.push([a[0] + (b[0] - a[0]) * t + nx * j, a[1] + (b[1] - a[1]) * t + ny * j]);
    }
  }
  return out;
}

/* ---------- 그리기 ---------- */
export function townMapSvg(place, game, opt = {}) {
  const spec = townSpec(place);
  const r = rngOf(place.id || place.n || 'x');
  const size = spec.size ?? 1;
  const out = [];
  const defs = [];
  const add = (s) => out.push(s);
  const labels = [];   // [x, y, 글, 크기, 굵게, 색]
  const blocked = [];  // 건물이 피할 자리 [x, y, 반지름]

  // 중심과 물
  let C = [W / 2 + (r() - 0.5) * 40, H / 2 + (r() - 0.5) * 30];
  const seaDir = spec.water === 'sea' ? ((spec.sea ?? 90) * Math.PI) / 180 : null;
  if (seaDir != null) C = [W / 2 - Math.cos(seaDir) * 70, H / 2 - Math.sin(seaDir) * 60];
  const R = [70, 120, 165, 205][size];

  defs.push(`<pattern id="tw-sea" width="6" height="4.2" patternUnits="userSpaceOnUse"><path d="M0 2.1H6" stroke="#3c4a4a" stroke-width=".55" opacity=".55"/></pattern>`);
  defs.push(`<pattern id="tw-hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 1.6H3.2" stroke="${INK}" stroke-width=".7"/></pattern>`);
  defs.push(`<pattern id="tw-field" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 2.5H5" stroke="#6a5634" stroke-width=".6" opacity=".7"/></pattern>`);
  defs.push(`<radialGradient id="tw-vig" cx="50%" cy="50%" r="70%"><stop offset="62%" stop-color="#7a5430" stop-opacity="0"/><stop offset="100%" stop-color="#5a3a1c" stop-opacity=".42"/></radialGradient>`);
  defs.push(`<filter id="tw-paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .16 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`);

  add(`<rect width="${W}" height="${H}" fill="${PAPER}"/>`);
  add(`<rect width="${W}" height="${H}" fill="${PAPER2}" filter="url(#tw-paper)"/>`);

  // 바다: 한쪽 가장자리를 물결진 바닷가로
  let seaPoly = null;
  if (seaDir != null) {
    const ux = Math.cos(seaDir), uy = Math.sin(seaDir), vx = -uy, vy = ux;
    const shoreD = R + 30;
    const pts = [];
    for (let k = -8; k <= 8; k++) {
      const t = k * 70, wob = (r() - 0.5) * 34 + Math.sin(k * 1.7) * 12;
      pts.push([C[0] + ux * (shoreD + wob) + vx * t, C[1] + uy * (shoreD + wob) + vy * t]);
    }
    seaPoly = [...pts, [pts[pts.length - 1][0] + ux * 900, pts[pts.length - 1][1] + uy * 900], [pts[0][0] + ux * 900, pts[0][1] + uy * 900]];
    const d = smooth(pts) + `L${pt(seaPoly[seaPoly.length - 2])}L${pt(seaPoly[seaPoly.length - 1])}Z`;
    defs.push(`<clipPath id="tw-seaclip"><path d="${d}"/></clipPath>`);
    add(`<path d="${d}" fill="${WATER}"/>`);
    add(`<rect width="${W}" height="${H}" fill="url(#tw-sea)" clip-path="url(#tw-seaclip)"/>`);
    // 바닷가에서 바깥으로 물결선 넷
    for (let q = 1; q <= 4; q++) add(`<path d="${smooth(pts.map((p) => [p[0] + ux * q * 7, p[1] + uy * q * 7]))}" fill="none" stroke="#33464a" stroke-width="${f1(0.9 - q * 0.15)}" opacity="${f1(0.75 - q * 0.15)}" clip-path="url(#tw-seaclip)"/>`);
    add(`<path d="${smooth(pts)}" fill="none" stroke="${INK}" stroke-width="1.6"/>`);
    // 모래톱 점
    for (let k = 0; k < 160; k++) { const i = Math.floor(r() * (pts.length - 1)), t = r(), a = pts[i], b = pts[i + 1]; const d0 = 3 + r() * 14; add(`<circle cx="${f1(a[0] + (b[0] - a[0]) * t - ux * d0)}" cy="${f1(a[1] + (b[1] - a[1]) * t - uy * d0)}" r=".7" fill="${INK}" opacity=".5"/>`); }
  }
  const inSea = (p) => !!seaPoly && inPoly(p, seaPoly);

  // 호수
  let lake = null, lakeSvg = '';
  if (spec.water === 'lake') {
    const lc = [C[0] + R * 0.95, C[1] + R * 0.2], lr = R * 0.55, pts = [];
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; const rr = lr * (0.8 + r() * 0.35); pts.push([lc[0] + Math.cos(a) * rr * 1.25, lc[1] + Math.sin(a) * rr]); }
    lake = pts;
    const d = smooth(pts, true);
    defs.push(`<clipPath id="tw-lakeclip"><path d="${d}"/></clipPath>`);
    lakeSvg = `<path d="${d}" fill="${WATER}"/><rect width="${W}" height="${H}" fill="url(#tw-sea)" clip-path="url(#tw-lakeclip)"/>`
      + [1, 2, 3].map((q) => `<path d="${smooth(pts.map((p) => [lc[0] + (p[0] - lc[0]) * (1 - q * 0.1), lc[1] + (p[1] - lc[1]) * (1 - q * 0.1)]), true)}" fill="none" stroke="#33464a" stroke-width=".6" opacity="${f1(0.6 - q * 0.15)}"/>`).join('')
      + `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
  }

  // 강: 지도를 가로질러 흐르고, 고장 가운데를 비껴 지난다
  let river = null;
  if (spec.water === 'river') {
    const a0 = r() * Math.PI, off = R * (0.35 + r() * 0.3) * (r() < 0.5 ? -1 : 1);
    const ux = Math.cos(a0), uy = Math.sin(a0), vx = -uy, vy = ux;
    const line = [];
    for (let k = -6; k <= 6; k++) { const t = k * 90; line.push([C[0] + ux * t + vx * (off + Math.sin(k * 1.3 + r()) * 26), C[1] + uy * t + vy * (off + Math.sin(k * 1.3 + r()) * 26)]); }
    river = line;
    const d = smooth(line);
    add(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${size >= 2 ? 30 : 22}" stroke-linecap="round"/>`);
    add(`<path d="${d}" fill="none" stroke="${WATER}" stroke-width="${size >= 2 ? 27 : 19}" stroke-linecap="round"/>`);
    for (const k of [-6, 0, 6]) add(`<path d="${d}" fill="none" stroke="#33464a" stroke-width=".55" opacity=".55" stroke-dasharray="${8 + (k & 3)} 6" transform="translate(${f1(vx * k)} ${f1(vy * k)})"/>`);
    for (let i = 0; i < line.length; i++) blocked.push([line[i][0], line[i][1], size >= 2 ? 22 : 18]);
    for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; for (let t = 0.25; t < 1; t += 0.25) blocked.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, size >= 2 ? 22 : 18]); }
  }
  const onWater = (p, pad = 0) => inSea(p) || (lake && inPoly(p, lake)) || (river && polyDist(p, river) < (size >= 2 ? 16 : 12) + pad);

  // 언덕: 고장 한쪽에 등고 빗금
  let hillAt = null;
  if (spec.hill) {
    const a = (seaDir != null ? seaDir + Math.PI : r() * Math.PI * 2);
    hillAt = [C[0] + Math.cos(a) * R * 0.5, C[1] + Math.sin(a) * R * 0.45];
    for (let q = 0; q < 4; q++) {
      const rr = R * (0.42 - q * 0.08), pts = [];
      for (let k = 0; k < 16; k++) { const an = (k / 16) * Math.PI * 2; pts.push([hillAt[0] + Math.cos(an) * rr * (1.2 + (r() - 0.5) * 0.15), hillAt[1] + Math.sin(an) * rr * (0.85 + (r() - 0.5) * 0.15)]); }
      add(`<path d="${smooth(pts, true)}" fill="none" stroke="#5a4028" stroke-width=".7" opacity=".55" stroke-dasharray="${q % 2 ? '3 2' : 'none'}"/>`);
    }
    // 남동 비탈 빗금
    for (let k = 0; k < 70; k++) {
      const an = Math.PI * (-0.15 + r() * 0.75), rr = R * (0.2 + r() * 0.3);
      const x = hillAt[0] + Math.cos(an) * rr * 1.2, y = hillAt[1] + Math.sin(an) * rr * 0.85;
      add(`<path d="M${f1(x)} ${f1(y)}l${f1(Math.cos(an) * 5)} ${f1(Math.sin(an) * 5)}" stroke="${INK}" stroke-width=".6" opacity=".45"/>`);
    }
  }

  // 이웃 고장으로 가는 길
  const nb = (opt.neighbors ?? []).slice(0, 5);
  const exits = [];
  const usedAng = [];
  for (const n of nb) {
    let a = Math.atan2(n.y - place.y, n.x - place.x);
    while (usedAng.some((u) => Math.abs(Math.atan2(Math.sin(a - u), Math.cos(a - u))) < 0.45)) a += 0.5;
    if (seaDir != null && Math.abs(Math.atan2(Math.sin(a - seaDir), Math.cos(a - seaDir))) < 0.9) a = seaDir + (a > seaDir ? 1.2 : -1.2);
    usedAng.push(a);
    exits.push({ n, a });
  }
  if (!exits.length) exits.push({ n: null, a: seaDir != null ? seaDir + Math.PI : r() * 6.28 });
  const edgePt = (a) => { const ux = Math.cos(a), uy = Math.sin(a); const t = Math.min(ux ? Math.abs((ux > 0 ? W - 14 - C[0] : C[0] - 14) / ux) : 1e9, uy ? Math.abs((uy > 0 ? H - 14 - C[1] : C[1] - 14) / uy) : 1e9); return [C[0] + ux * t, C[1] + uy * t]; };
  const roads = exits.map(({ a }) => wobble([C, [C[0] + Math.cos(a) * R * 0.6, C[1] + Math.sin(a) * R * 0.6], edgePt(a)], r, 16, 30));
  // 성 밖 이름난 곳(숲·밭·굴)으로 가는 오솔길
  const paths = (spec.out ?? []).map(([, , deg]) => { const a = deg * Math.PI / 180; return wobble([C, [C[0] + Math.cos(a) * R * 1.2, C[1] + Math.sin(a) * R * 1.0], [C[0] + Math.cos(a) * W * 0.36, C[1] + Math.sin(a) * H * 0.36]], r, 14, 26); });

  // 밭과 숲 (성 밖)
  const fieldsN = (spec.fields ?? 0) * 6 + (size === 0 ? 3 : 0);
  for (let k = 0; k < fieldsN * 2 && k < 60; k++) {
    const a = r() * Math.PI * 2, d = R * (1.15 + r() * 0.9);
    const p = [C[0] + Math.cos(a) * d, C[1] + Math.sin(a) * d * 0.8];
    if (p[0] < 30 || p[1] < 30 || p[0] > W - 30 || p[1] > H - 30 || onWater(p, 20) || roads.some((L) => polyDist(p, L) < 22)) continue;
    const w = 34 + r() * 40, h = 22 + r() * 26, rot = (r() - 0.5) * 70;
    add(`<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(rot)})"><rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" fill="#e4d3a4" stroke="#5a4028" stroke-width=".7"/><rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" fill="url(#tw-field)"/></g>`);
    blocked.push([p[0], p[1], Math.max(w, h) * 0.6]);
  }
  const tree = (x, y, s) => `<g transform="translate(${f1(x)} ${f1(y)})"><path d="M0 ${f1(s * 0.9)}V${f1(s * 0.2)}" stroke="${INK}" stroke-width=".8"/><path d="M${f1(-s * 0.7)} ${f1(s * 0.3)}c${f1(-s * 0.2)} ${f1(-s * 0.9)} ${f1(s * 0.4)} ${f1(-s * 1.5)} ${f1(s * 0.7)} ${f1(-s * 1.2)}c${f1(s * 0.5)} ${f1(-s * 0.1)} ${f1(s * 0.9)} ${f1(s * 0.6)} ${f1(s * 0.7)} ${f1(s * 1.2)}z" fill="#cfc596" stroke="${INK}" stroke-width=".8"/><path d="M${f1(s * 0.1)} ${f1(-s * 0.6)}l${f1(s * 0.4)} ${f1(s * 0.6)}M${f1(s * 0.2)} ${f1(-s * 0.2)}l${f1(s * 0.3)} ${f1(s * 0.4)}" stroke="${INK}" stroke-width=".45"/></g>`;
  const nTrees = spec.forest ? 260 : 70 + (2 - Math.min(2, size)) * 30;
  for (let k = 0; k < nTrees; k++) {
    const p = [20 + r() * (W - 40), 20 + r() * (H - 40)];
    const d = Math.hypot(p[0] - C[0], (p[1] - C[1]) / 0.8);
    if (d < R * (spec.forest ? 0.75 : 1.15) || onWater(p, 8) || roads.some((L) => polyDist(p, L) < 10) || blocked.some(([x, y, rr]) => Math.hypot(p[0] - x, p[1] - y) < rr)) continue;
    // 숲은 무리 지어
    if (!spec.forest && Math.sin(p[0] / 70 + place.x) + Math.cos(p[1] / 60 + place.y) < 0.6) continue;
    add(tree(p[0], p[1], 5 + r() * 3));
  }

  // 길 그리기 (흙길: 두 줄)
  for (const L of roads) {
    const d = smooth(L);
    add(`<path d="${d}" fill="none" stroke="#5a4028" stroke-width="${size >= 2 ? 11 : 8}" stroke-linecap="round" opacity=".9"/>`);
    add(`<path d="${d}" fill="none" stroke="#e9dbb4" stroke-width="${size >= 2 ? 9 : 6}" stroke-linecap="round"/>`);
  }
  for (const L of paths) add(`<path d="${smooth(L)}" fill="none" stroke="#6a5038" stroke-width="1.3" stroke-dasharray="4 3" stroke-linecap="round"/>`);
  // 강 위 다리
  if (river) for (const L of roads) {
    for (let i = 0; i < L.length - 1; i++) {
      const a = L[i], b = L[i + 1];
      for (let t = 0; t <= 1; t += 0.01) { const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; if (polyDist(p, river) < 3) { const an = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; add(`<g transform="translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(an)})"><rect x="-19" y="-6.5" width="38" height="13" fill="#e9dbb4" stroke="${INK}" stroke-width="1.1"/><path d="M-19 -6.5h38M-19 6.5h38" stroke="${INK}" stroke-width="1.8"/><path d="M-12 -6.5v13M-4 -6.5v13M4 -6.5v13M12 -6.5v13" stroke="${INK}" stroke-width=".4" opacity=".7"/></g>`); t = 2; i = L.length; } }
    }
  }

  // 성벽
  let wallPoly = null;
  if (spec.wall && size >= 1) {
    const n = 9 + size * 2, pts = [];
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r() * 0.2; const rr = R * (0.92 + r() * 0.16); let p = [C[0] + Math.cos(a) * rr * 1.1, C[1] + Math.sin(a) * rr * 0.86]; if (onWater(p)) p = [C[0] + (p[0] - C[0]) * 0.86, C[1] + (p[1] - C[1]) * 0.86]; pts.push(p); }
    wallPoly = pts;
  }
  const insideTown = (p) => (wallPoly ? inPoly(p, wallPoly) : Math.hypot(p[0] - C[0], (p[1] - C[1]) / 0.85) < R);

  // 골목: 고리길과 가로지르는 길
  const lanes = [];
  if (size >= 1) {
    const ring = [];
    const rr = R * 0.55;
    for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI * 2; ring.push([C[0] + Math.cos(a) * rr * 1.1, C[1] + Math.sin(a) * rr * 0.86]); }
    if (size >= 2) lanes.push(wobble(ring, r, 6, 26));
    const nCross = size === 1 ? 2 : size === 2 ? 4 : 6;
    for (let k = 0; k < nCross; k++) {
      const a = r() * Math.PI * 2, b = a + Math.PI * (0.5 + r() * 0.7);
      const p1 = [C[0] + Math.cos(a) * R * 0.85, C[1] + Math.sin(a) * R * 0.7], p2 = [C[0] + Math.cos(b) * R * 0.85, C[1] + Math.sin(b) * R * 0.7];
      const mid = [C[0] + (r() - 0.5) * R * 0.5, C[1] + (r() - 0.5) * R * 0.4];
      lanes.push(wobble(spec.grid ? [p1, [p1[0], p2[1]], p2] : [p1, mid, p2], r, 6, 24));
    }
    for (const L of lanes) add(`<path d="${smooth(L)}" fill="none" stroke="#6a5038" stroke-width="5.5" stroke-linecap="round" opacity=".55"/><path d="${smooth(L)}" fill="none" stroke="#ecdfbd" stroke-width="4" stroke-linecap="round"/>`);
  }

  if (lakeSvg) add(lakeSvg); // 호수는 길과 골목 위에 (길이 물속으로 들어가지 않게)
  // 이름난 곳 자리 잡기
  const spots = [];
  const marks = [...(spec.marks ?? [])];
  const takeSpot = (kind, i) => {
    if (kind === 'square' || kind === 'well' && size <= 1 && !marks.some((m) => m[0] === 'square')) return [C[0], C[1]];
    if ((kind === 'castle' || kind === 'keep') && hillAt) return hillAt;
    if (kind === 'dock' && seaDir != null) return [C[0] + Math.cos(seaDir) * (R + 22), C[1] + Math.sin(seaDir) * (R + 22)];
    if (kind === 'mill' && river) { let best = river[0], bd = 1e9; for (const p of river) { const d = dist2(p, C); if (d < bd && d > (R * 0.3) ** 2) { bd = d; best = p; } } return [best[0] + 16, best[1] - 16]; }
    if (kind === 'slum') return [C[0] + Math.cos(i * 2.4 + 1) * R * 1.25, C[1] + Math.sin(i * 2.4 + 1) * R * 1.1];
    if (kind === 'tower' && lake) return [lake[0][0] - 10, lake[0][1]];
    for (let tries = 0; tries < 60; tries++) {
      const a = i * 2.39996 + tries * 0.7 + r() * 0.5, d = R * (size === 0 ? 0.55 : 0.3 + ((i + tries) % 5) * 0.12 + r() * 0.08);
      const p = [C[0] + Math.cos(a) * d * 1.1, C[1] + Math.sin(a) * d * 0.86];
      const gap = tries < 40 ? (size >= 2 ? 62 : 58) : 40;
      if (onWater(p, 14) || spots.some((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) < gap) || (wallPoly && !inPoly(p, wallPoly))) continue;
      return p;
    }
    return [C[0] + (r() - 0.5) * R, C[1] + (r() - 0.5) * R];
  };
  marks.forEach(([kind, name], i) => { const p = takeSpot(kind, i); spots.push(p); blocked.push([p[0], p[1], kind === 'castle' ? 34 : kind === 'square' ? 30 : kind === 'temple' ? 22 : 16]); });

  // 집들: 길과 골목을 따라, 성 안을 채운다
  const lines = [...roads, ...lanes, ...paths];
  const houses = [];
  const tryHouse = (p, ang, w, h) => {
    if (onWater(p, 6) || blocked.some(([x, y, rr]) => Math.hypot(p[0] - x, p[1] - y) < rr)) return;
    if (lines.some((L) => polyDist(p, L) < 6)) return;
    if (wallPoly && !inPoly(p, wallPoly) && size >= 2 && r() < 0.85) return;
    if (houses.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < (Math.max(w, h) + Math.max(q[3], q[4])) * 0.48)) return;
    houses.push([p[0], p[1], ang, w, h]);
  };
  const density = [0.5, 0.75, 0.95, 1][size];
  for (const L of lines) for (let i = 0; i < L.length - 1; i++) {
    const a = L[i], b = L[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / (len || 1), uy = (b[1] - a[1]) / (len || 1);
    const ang = Math.atan2(uy, ux) * 180 / Math.PI;
    for (let t = 6; t < len; t += 12 + r() * 6) {
      const p0 = [a[0] + ux * t, a[1] + uy * t];
      const far = Math.hypot(p0[0] - C[0], (p0[1] - C[1]) / 0.85);
      if (far > R * (size === 0 ? 0.9 : 1.05) && r() > 0.25) continue;
      for (const side of [-1, 1]) {
        if (r() > density) continue;
        const w = 9 + r() * 8, h = 8 + r() * 6, off = (size >= 2 ? 6 : 4) + h / 2 + 1.5;
        tryHouse([p0[0] - uy * off * side, p0[1] + ux * off * side], ang, w, h);
      }
    }
  }
  if (size >= 2) for (let k = 0; k < 900 && houses.length < [20, 60, 170, 300][size]; k++) {
    const p = [C[0] + (r() - 0.5) * R * 2.2, C[1] + (r() - 0.5) * R * 1.8];
    if (!insideTown(p)) continue;
    let ang = 0, bd = 1e9;
    for (const L of lines) for (let i = 0; i < L.length - 1; i++) { const d = segDist(p, L[i], L[i + 1]); if (d < bd) { bd = d; ang = Math.atan2(L[i + 1][1] - L[i][1], L[i + 1][0] - L[i][0]) * 180 / Math.PI; } }
    tryHouse(p, ang, 8 + r() * 7, 7 + r() * 5);
  }
  for (const [x, y, ang, w, h] of houses) {
    add(`<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})"><rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" fill="#d9c79c" stroke="${INK}" stroke-width=".8"/><rect x="${f1(-w / 2)}" y="0" width="${f1(w)}" height="${f1(h / 2)}" fill="url(#tw-hatch)" opacity=".8"/><path d="M${f1(-w / 2)} 0H${f1(w / 2)}" stroke="${INK}" stroke-width=".55"/></g>`);
  }

  // 성벽 그리기 (집 위에): 두꺼운 벽, 탑, 성문
  if (wallPoly) {
    const d = smooth(wallPoly, true);
    if (spec.wall >= 3) add(`<path d="${smooth(wallPoly.map((p) => [C[0] + (p[0] - C[0]) * 1.1, C[1] + (p[1] - C[1]) * 1.1]), true)}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-dasharray="${spec.ruin ? '18 10' : 'none'}"/>`);
    if (spec.wall === 1) add(`<path d="${d}" fill="none" stroke="#5a4028" stroke-width="2.4" stroke-dasharray="1.6 1.8"/>`);
    else {
      add(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="7" stroke-dasharray="${spec.ruin ? '26 12 8 14' : 'none'}"/>`);
      add(`<path d="${d}" fill="none" stroke="#cbb88c" stroke-width="4.2" stroke-dasharray="${spec.ruin ? '26 12 8 14' : 'none'}"/>`);
      add(`<path d="${d}" fill="none" stroke="${INK}" stroke-width=".7" stroke-dasharray="2 2.4" opacity=".7"/>`);
      for (const p of wallPoly) add(`<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${size >= 3 ? 7 : 5.6}" fill="#cbb88c" stroke="${INK}" stroke-width="1.3"/><circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="2" fill="${INK}" opacity=".6"/>`);
    }
    // 성문: 길이 성벽을 지나는 곳
    for (const L of roads) {
      let gate = null;
      for (let i = 0; i < L.length - 1 && !gate; i++) for (let t = 0; t <= 1; t += 0.02) { const p = [L[i][0] + (L[i + 1][0] - L[i][0]) * t, L[i][1] + (L[i + 1][1] - L[i][1]) * t]; if (!inPoly(p, wallPoly)) { gate = [p, Math.atan2(L[i + 1][1] - L[i][1], L[i + 1][0] - L[i][0]) * 180 / Math.PI]; break; } }
      if (gate && spec.wall >= 2) add(`<g transform="translate(${f1(gate[0][0])} ${f1(gate[0][1])}) rotate(${f1(gate[1])})"><rect x="-6" y="-11" width="12" height="22" fill="#cbb88c" stroke="${INK}" stroke-width="1.3"/><path d="M-6 -4.5h12M-6 4.5h12" stroke="${INK}" stroke-width="1.6"/></g>`);
    }
  }

  // 이름난 곳 기호
  const sym = (kind, x, y) => {
    const T = (s) => add(`<g transform="translate(${f1(x)} ${f1(y)})">${s}</g>`);
    const box = (w, h, extra = '') => `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#cbb88c" stroke="${INK}" stroke-width="1.2"/>${extra}`;
    switch (kind) {
      case 'square': T(`<rect x="-24" y="-17" width="48" height="34" fill="#ecdfbd" stroke="${INK}" stroke-width=".9"/>${Array.from({ length: 22 }, (_, i) => `<circle cx="${-20 + (i % 6) * 8}" cy="${-13 + Math.floor(i / 6) * 8}" r=".8" fill="${INK}" opacity=".5"/>`).join('')}<circle r="4" fill="#cbb88c" stroke="${INK}"/>`); break;
      case 'well': T(`<circle r="6" fill="#cbb88c" stroke="${INK}" stroke-width="1.3"/><circle r="3" fill="${WATER}" stroke="${INK}" stroke-width=".8"/>`); break;
      case 'temple': T(`<path d="M-9 14V-6h-6v-6h6v-6h18v6h6v6h-6v20z" fill="#cbb88c" stroke="${INK}" stroke-width="1.3"/><path d="M-9 -6h18" stroke="${INK}"/><path d="M0 -22v-6M-3 -25h6" stroke="${INK}" stroke-width="1.4"/><path d="M-9 4h18V14H-9z" fill="url(#tw-hatch)"/>`); break;
      case 'chapel': T(`<path d="M-7 8V-4l7-6 7 6V8z" fill="#cbb88c" stroke="${INK}" stroke-width="1.2"/><path d="M0 -10v-6M-2.6 -13.6h5.2" stroke="${INK}" stroke-width="1.2"/>`); break;
      case 'inn': T(box(18, 13, `<path d="M9 -2h6v5h-6" fill="#cbb88c" stroke="${INK}" stroke-width=".8"/><circle cx="15" cy="6" r="2.4" fill="${INK}"/><rect x="-9" y="0" width="18" height="6.5" fill="url(#tw-hatch)"/>`)); break;
      case 'smith': T(box(16, 12, `<path d="M-4 -12c-2 -3 2 -4 0 -7M3 -11c-2 -3 2 -4 0 -7" fill="none" stroke="${INK}" stroke-width=".8"/><rect x="-8" y="0" width="16" height="6" fill="url(#tw-hatch)"/>`)); break;
      case 'guild': case 'hall': case 'market': case 'school': T(box(kind === 'school' ? 30 : 24, 16, `<path d="M${kind === 'school' ? -15 : -12} 0h${kind === 'school' ? 30 : 24}" stroke="${INK}" stroke-width=".7"/><rect x="${kind === 'school' ? -15 : -12}" y="0" width="${kind === 'school' ? 30 : 24}" height="8" fill="url(#tw-hatch)"/>${kind === 'market' ? `<path d="M-12 -8l4 -5h16l4 5" fill="#e9dbb4" stroke="${INK}" stroke-width=".9"/>` : ''}${kind === 'guild' ? `<path d="M0 -8v-10l7 3-7 3" fill="${RED}" stroke="${INK}" stroke-width=".7"/>` : ''}`)); break;
      case 'castle': case 'keep': {
        const s = kind === 'castle' ? 1 : 0.7;
        T(`<g transform="scale(${s})"><path d="M-30 -22h60v44h-60z" fill="#cbb88c" stroke="${INK}" stroke-width="2"/><path d="M-30 4h60v18h-60z" fill="url(#tw-hatch)"/>${[[-30, -22], [30, -22], [-30, 22], [30, 22]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="8" fill="#cbb88c" stroke="${INK}" stroke-width="1.8"/>`).join('')}<rect x="-11" y="-12" width="22" height="22" fill="#b9a675" stroke="${INK}" stroke-width="1.6"/><path d="M0 -12v-16l10 4-10 4" fill="${RED}" stroke="${INK}" stroke-width=".8"/></g>`);
        break;
      }
      case 'tower': T(`<circle r="9" fill="#cbb88c" stroke="${INK}" stroke-width="1.6"/><circle r="5" fill="none" stroke="${INK}" stroke-width=".8"/><path d="M0 0l6 5" stroke="${INK}" stroke-width=".7"/>${spec.id === 'serenia' || place.id === 'serenia' ? [0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${Math.cos(k * 1.05 + 0.4) * 38}" cy="${Math.sin(k * 1.05 + 0.4) * 30}" r="6" fill="#cbb88c" stroke="${INK}" stroke-width="1.3"/>`).join('') : ''}`); break;
      case 'dock': {
        const a = (seaDir ?? 0) * 180 / Math.PI;
        T(`<g transform="rotate(${a})">${[-22, -6, 10, 26].map((o) => `<rect x="-4" y="${o - 2.5}" width="34" height="5" fill="#cbb88c" stroke="${INK}" stroke-width="1"/>`).join('')}<path d="M40 -14l10 4-10 4z" fill="#cbb88c" stroke="${INK}" stroke-width=".9"/><path d="M40 -14v14" stroke="${INK}" stroke-width=".8"/></g>`);
        break;
      }
      case 'mill': T(`<rect x="-7" y="-7" width="14" height="14" fill="#cbb88c" stroke="${INK}" stroke-width="1.2"/><circle cx="-12" r="6" fill="none" stroke="${INK}" stroke-width="1"/><path d="M-18 0h12M-12 -6v12" stroke="${INK}" stroke-width=".8"/>`); break;
      case 'slum': for (let k = 0; k < 16; k++) T(`<rect x="${(k % 4) * 8 - 16 + (k & 1)}" y="${Math.floor(k / 4) * 7 - 14}" width="6" height="5" fill="#c4b088" stroke="${INK}" stroke-width=".6" transform="rotate(${(k * 37) % 30 - 15})"/>`); break;
      case 'yard': T(`<rect x="-22" y="-14" width="44" height="28" fill="#e2d2a8" stroke="${INK}" stroke-width="1" stroke-dasharray="3 2"/><path d="M-10 -6l20 12M10 -6l-20 12" stroke="${INK}" stroke-width=".9"/>`); break;
      case 'arena': T(`<ellipse rx="22" ry="16" fill="#cbb88c" stroke="${INK}" stroke-width="1.6"/><ellipse rx="13" ry="9" fill="#ecdfbd" stroke="${INK}" stroke-width=".9"/>`); break;
      case 'cave': case 'mine': T(`<path d="M-12 8a12 12 0 0 1 24 0z" fill="${INK}"/><path d="M-6 8a6 6 0 0 1 12 0z" fill="#1a120c"/>${kind === 'mine' ? `<path d="M-14 8h28M-10 8l-3 -14M10 8l3 -14M-13 -6h26" stroke="${INK}" stroke-width="1.1"/>` : ''}`); break;
      case 'tree': T(`<circle r="16" fill="#cfc596" stroke="${INK}" stroke-width="1.4"/><circle r="10" fill="none" stroke="${INK}" stroke-width=".6"/><circle r="4" fill="none" stroke="${INK}" stroke-width=".6"/>`); break;
      case 'camp': T(`<path d="M-10 6L0 -8l10 14z" fill="#d9c79c" stroke="${INK}" stroke-width="1.2"/><path d="M0 -8L-3 6h6z" fill="${INK}"/><path d="M8 4l8-11 8 13z" fill="#d9c79c" stroke="${INK}" stroke-width="1"/>`); break;
      case 'ruin': for (let k = 0; k < 8; k++) T(`<path d="M${(k % 4) * 12 - 18} ${Math.floor(k / 4) * 12 - 6}h8v6h-3v-3h-5z" fill="#cbb88c" stroke="${INK}" stroke-width=".9"/>`); break;
      default: T(`<circle r="5" fill="#cbb88c" stroke="${INK}" stroke-width="1.2"/>`);
    }
  };
  marks.forEach(([kind, name], i) => {
    const [x, y] = spots[i];
    sym(kind, x, y);
    const below = kind === 'castle' ? 40 : kind === 'square' ? 30 : kind === 'temple' ? 26 : kind === 'yard' ? 26 : kind === 'dock' ? 40 : 22;
    labels.push([x, y + below, name, 15, true, INK]);
  });

  // 성 밖: 굴·광산·진지 등을 방향대로 가장자리 가까이
  for (const [kind, name, deg] of spec.out ?? []) {
    const a = deg * Math.PI / 180, d = Math.min(W, H) * 0.42;
    const p = [Math.max(50, Math.min(W - 50, C[0] + Math.cos(a) * d * 1.3)), Math.max(50, Math.min(H - 60, C[1] + Math.sin(a) * d))];
    if (kind === 'woods') { for (let k = 0; k < 40; k++) add(tree(p[0] + (r() - 0.5) * 120, p[1] + (r() - 0.5) * 80, 6 + r() * 3)); labels.push([p[0], p[1] + 50, name, 14, false, '#4a3828']); continue; }
    if (kind === 'fields' || kind === 'vines') { for (let k = 0; k < 6; k++) { const q = [p[0] + (r() - 0.5) * 140, p[1] + (r() - 0.5) * 80]; if (onWater(q, 10)) continue; add(`<g transform="translate(${f1(q[0])} ${f1(q[1])}) rotate(${f1((r() - 0.5) * 40)})"><rect x="-24" y="-14" width="48" height="28" fill="#e4d3a4" stroke="#5a4028" stroke-width=".7"/><rect x="-24" y="-14" width="48" height="28" fill="url(#tw-field)"/>${kind === 'vines' ? Array.from({ length: 5 }, (_, j) => `<path d="M-22 ${-10 + j * 5}h44" stroke="#3a4a1c" stroke-width="1.4" stroke-dasharray="1.5 2.5"/>`).join('') : ''}</g>`); } labels.push([p[0], p[1] + 44, name, 14, false, '#4a3828']); continue; }
    sym(kind, p[0], p[1]);
    labels.push([p[0], p[1] + 24, name, 14, true, kind === 'cave' ? RED : INK]);
  }

  // 지금 형편: 점령 깃발, 산채 쪽 길, 내 집
  const occ = safe(() => game?.occ?.places?.[place.id]);
  if (occ && wallPoly) for (const p of wallPoly.filter((_, i) => i % 3 === 0)) add(`<g transform="translate(${f1(p[0])} ${f1(p[1] - 8)})"><path d="M0 0v-18" stroke="${INK}" stroke-width="1.2"/><path d="M0 -18h11v8H0z" fill="#1a1a1a" stroke="${INK}" stroke-width=".7"/></g>`);
  const band = safe(() => (game?.outlaws?.bands ?? []).find((b) => !b.gone && b.lair === place.id));
  if (band) {
    const a = (exits[exits.length - 1]?.a ?? 0) + 0.9, p = [Math.max(60, Math.min(W - 60, C[0] + Math.cos(a) * W * 0.4)), Math.max(60, Math.min(H - 60, C[1] + Math.sin(a) * H * 0.38))];
    add(`<g transform="translate(${f1(p[0])} ${f1(p[1])})"><path d="M-8 -8l16 16M8 -8l-16 16" stroke="${RED}" stroke-width="2.4" stroke-linecap="round"/><path d="M-10 4l4 4M10 4l-4 4" stroke="${RED}" stroke-width="2"/></g>`);
    labels.push([p[0], p[1] + 24, `산채 (${band.name})`, 14, true, RED]);
  }
  const mine = safe(() => (game?.life?.houses ?? []).includes(place.id)) || safe(() => game?.life?.place === place.id && game?.life?.home === 'own');
  if (mine && houses.length) {
    const h = houses[Math.floor(houses.length * 0.37)];
    add(`<g transform="translate(${f1(h[0])} ${f1(h[1])})"><circle r="15" fill="none" stroke="${RED}" stroke-width="1.8"/><circle r="19" fill="none" stroke="${RED}" stroke-width=".7" stroke-dasharray="2.4 2.4"/></g>`);
    labels.push([h[0], h[1] - 24, '내 집', 15, true, RED]);
  }
  const atInn = safe(() => game?.life?.place === place.id && game?.life?.home === 'inn');
  if (atInn) { const i = marks.findIndex((m) => m[0] === 'inn'); if (i >= 0) add(`<circle cx="${f1(spots[i][0])}" cy="${f1(spots[i][1])}" r="16" fill="none" stroke="${RED}" stroke-width="1.6"/>`); }

  // 나가는 길 이름 (가장자리)
  exits.forEach(({ n, a }) => {
    if (!n) return;
    const p = edgePt(a), ux = Math.cos(a), uy = Math.sin(a);
    const lx = Math.max(70, Math.min(W - 70, p[0] - ux * 40)), ly = Math.max(34, Math.min(H - 26, p[1] - uy * 30));
    const arrow = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? '→' : '←') : (uy > 0 ? '↓' : '↑');
    labels.push([lx, ly, `${arrow} ${n.n}${n.days ? ` · ${n.days}` : ''}`, 14, false, '#3a2a1a', true]);
  });

  // 글자 (집 위, 바탕 테두리)
  const boxes = [[20, 18, 40 + Math.max(150, (place.n ?? '').length * 22 + 50), 90], [W - 84, 20, W - 18, 90], [W - 200, H - 52, W - 40, H - 18]];
  const fitLabel = (x, y, t, s) => {
    const w = String(t).length * s * 0.98 + 6, h = s + 4;
    for (const [dx, dy] of [[0, 0], [0, 16], [0, -16], [0, 30], [w * 0.55, 0], [-w * 0.55, 0], [0, -30], [w * 0.5, 16], [-w * 0.5, 16]]) {
      const cx = Math.max(w / 2 + 16, Math.min(W - w / 2 - 16, x + dx)), cy = Math.max(h + 14, Math.min(H - 16, y + dy));
      const b = [cx - w / 2, cy - h + 3, cx + w / 2, cy + 3];
      if (!boxes.some((q) => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1])) { boxes.push(b); return [cx, cy]; }
    }
    const cx = Math.max(w / 2 + 16, Math.min(W - w / 2 - 16, x)); boxes.push([cx - w / 2, y - h + 3, cx + w / 2, y + 3]); return [cx, y];
  };
  for (const L of labels) { const [x, y] = fitLabel(L[0], L[1], L[2], L[3]); L[0] = x; L[1] = y; }
  for (const [x, y, t, s, bold, col, ital] of labels) add(`<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-family="'Gowun Batang', serif" font-size="${s}" ${bold ? 'font-weight="700"' : ''} ${ital ? 'font-style="italic"' : ''} fill="${col}" stroke="${PAPER}" stroke-width="3.6" stroke-linejoin="round" paint-order="stroke">${esc(t)}</text>`);

  // 테두리·제목 틀·나침반·축척
  add(`<rect width="${W}" height="${H}" fill="url(#tw-vig)"/>`);
  add(`<rect x="5" y="5" width="${W - 10}" height="${H - 10}" fill="none" stroke="${INK}" stroke-width="2.4"/><rect x="11" y="11" width="${W - 22}" height="${H - 22}" fill="none" stroke="${INK}" stroke-width=".8"/>`);
  const title = esc(place.n ?? ''), sub = esc(opt.kind ?? '');
  const tw = Math.max(150, title.length * 22 + 50);
  add(`<g transform="translate(26 24)"><path d="M0 0h${tw}v${sub ? 54 : 40}h-${tw}z" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/><path d="M4 4h${tw - 8}v${sub ? 46 : 32}h-${tw - 8}z" fill="none" stroke="${INK}" stroke-width=".6"/><text x="${tw / 2}" y="28" text-anchor="middle" font-family="'Gowun Batang', serif" font-weight="700" font-size="21" letter-spacing="3" fill="${INK}">${title}</text>${sub ? `<text x="${tw / 2}" y="45" text-anchor="middle" font-family="'Gowun Batang', serif" font-style="italic" font-size="12" fill="#5a4028">${sub}</text>` : ''}</g>`);
  add(`<g transform="translate(${W - 52} 58)"><circle r="22" fill="${PAPER}" fill-opacity=".6" stroke="${INK}" stroke-width=".9"/><path d="M0 -28L5 0 0 6-5 0z" fill="${RED}" stroke="${INK}" stroke-width=".6"/><path d="M0 28L5 0 0-6-5 0z" fill="${PAPER}" stroke="${INK}" stroke-width=".6"/><path d="M-22 0h44" stroke="${INK}" stroke-width=".6"/><text y="-32" text-anchor="middle" font-family="serif" font-weight="700" font-size="12" fill="${INK}">북</text></g>`);
  add(`<g transform="translate(${W - 190} ${H - 30})">${[0, 1, 2, 3].map((k) => `<rect x="${k * 36}" y="0" width="36" height="5" fill="${k % 2 ? PAPER : INK}" stroke="${INK}" stroke-width=".7"/>`).join('')}<text x="72" y="-6" text-anchor="middle" font-family="'Gowun Batang', serif" font-style="italic" font-size="11" fill="${INK}">걸어서 반 시진</text></g>`);

  return `<svg class="town-map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} 고장 지도"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
}
function safe(fn) { try { return fn(); } catch { return null; } }
