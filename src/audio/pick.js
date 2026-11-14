// 지금 상황에 어울리는 곡 고르기. 화면(DOM)을 모르는 순수 함수라서 node 점검에서도 돌릴 수 있다.

const PLACE_TRACK = { harfen: 'town', verden: 'castle', leocast: 'capital' };
const SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
export const seasonOf = (month) => SEASON[(month - 1) % 12];

const RE = {
  solemn: /장례|국상|유품|숨을 거두|세상을 떠|상여|무덤|전사 통지|돌아오지 않은/,
  festive: /수확제|축제|혼례|결혼식|잔치|봉인제|유랑 극단|성인식/,
  tense: /도적|습격|매복|마물|고블린|늑대|역병|폭동|징집|징발|불타는|쫓는|빚쟁이|탈영|패잔병|이단심문|폭풍|범람|태형|움직이는 뼈|사라진 아이|돌아오지 않은 아이/,
  mystic: /마력|마법|서클|마탑|수정구|주문|마석|별똥별|마신|밤의 빛|손끝의 열기|검은 로브|불씨 없는/,
};

/** 떠 있는 사건·장면의 분위기. 평범한 사건이면 null (장소 음악을 그대로 둔다) */
export function eventMood(game) {
  const e = game?.pendingEvent;
  if (!e) return null;
  const s = e.id === 'life_scene' ? game.life?.scene : null;
  if (s) {
    if (s.kind === 'fight') return s.enc?.nemesisId ? 'boss' : 'battle';
    if (s.kind === 'dungeon') return 'dungeon';
    if (s.kind === 'heir') return 'solemn';
    return null;
  }
  const title = String(e.title ?? ''); const all = `${title} ${e.text ?? ''}`;
  if (RE.solemn.test(all)) return 'solemn';
  if (RE.festive.test(title)) return 'festive';
  if (RE.tense.test(title)) return 'tense';
  if (RE.mystic.test(title)) return 'mystic';
  return null;
}

/** 사건이 없을 때의 배경 곡: 장소, 계절, 세상 형편 */
export function placeTrack(game) {
  if (!game) return 'title';
  if (game.over) return 'solemn';
  const life = game.life ?? {};
  if (life.travel) return 'road';
  if (game.world?.famine || game.world?.plague) return 'hardship';
  return PLACE_TRACK[life.place] ?? `village_${seasonOf(game.date?.month ?? 3)}`;
}

/**
 * view: { title: 처음 화면인가, overlay: 사건 창이 떠 있는가, last: 직전에 틀던 사건 곡 }
 * 사건 창에 결과만 남아 있는 동안(pendingEvent는 이미 비었음)은 그 사건의 곡을 이어 간다.
 */
export function pickTrack(game, view = {}) {
  if (view.title || !game) return 'title';
  if (game.over) return 'solemn';
  const mood = eventMood(game);
  if (mood) return mood;
  if (view.overlay && view.last) return view.last;
  return placeTrack(game);
}

/** 싸움 결과 글에 맞는 효과음 */
export function fightSfx(text) {
  const t = String(text ?? '');
  if (/싸움을 피했다|물러났다|달아났다/.test(t)) return 'flee';
  if (/패해|쓰러진 나를|정신을 잃|도랑이었다|기어서 나왔다|들쳐 업고|끌고 빠져나왔다/.test(t)) return 'defeat';
  return 'victory';
}
