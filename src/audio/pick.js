// 지금 상황에 어울리는 곡 고르기. 화면(DOM)을 모르는 순수 함수라서 node 점검에서도 돌릴 수 있다.
//
// 곡에는 두 가지가 있다 (다른 게임들이 쓰는 방식을 따랐다).
//  - 배경 곡(mood): 장소·계절·형편에 맞는 "곡 묶음". 그 안에서 번갈아 한 곡씩 흐르고, 곡 사이엔 환경음만 남는다.
//  - 상황 곡(cue): 싸움·결투·사건처럼 그 순간에만 흐르는 곡. 상황이 끝날 때까지 이어진다.

const SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
export const seasonOf = (month) => SEASON[(month - 1) % 12];

const RE = {
  solemn: /장례|국상|유품|숨을 거두|세상을 떠|상여|무덤|전사 통지|돌아오지 않은/,
  festive: /수확제|축제|혼례|결혼식|잔치|봉인제|유랑 극단|성인식/,
  tense: /도적|습격|매복|마물|고블린|늑대|역병|폭동|징집|징발|불타는|쫓는|빚쟁이|탈영|패잔병|이단심문|폭풍|범람|태형|움직이는 뼈|사라진 아이|돌아오지 않은 아이/,
  mystic: /마력|마법|서클|마탑|수정구|주문|마석|별똥별|마신|밤의 빛|손끝의 열기|검은 로브|불씨 없는/,
  court: /영주|작위|서임|왕궁|궁정|알현|봉신|칙서|대관/,
  underworld: /뒷골목|장물|밀수|암흑가|조직|두목|현상금/,
};
// 장면(life.scene.kind)마다의 상황 곡
const SCENE_CUE = {
  dungeon: 'dungeon', heir: 'solemn', battle: 'war',
  arrest: 'underworld', bounty_hunters: 'underworld', gang_contract: 'underworld', gang_offer: 'underworld', gang_rescue: 'underworld',
  gang_takeover: 'underworld', gang_turf: 'underworld', thugs: 'underworld', witness_blackmail: 'underworld',
  buy_title: 'court', domain_build: 'court', domain_event: 'court', domain_rank: 'court', domain_rule: 'court',
  fief_grant: 'court', nation_name: 'court', civil_side: 'court',
};

/** 떠 있는 사건·장면의 상황 곡. 평범한 사건이면 null (배경 곡을 그대로 둔다) */
export function eventMood(game) {
  const e = game?.pendingEvent;
  if (!e) return null;
  if (e.id === 'duel_round' || e.id === 'duel_start') return 'duel';
  if (/^circle_exam/.test(e.id ?? '')) return 'mystic';
  const s = e.id === 'life_scene' ? game.life?.scene : null;
  if (s) {
    if (s.kind === 'fight') return s.enc?.nemesisId ? 'boss' : 'battle';
    return SCENE_CUE[s.kind] ?? null;
  }
  const title = String(e.title ?? ''); const all = `${title} ${e.text ?? ''}`;
  if (RE.solemn.test(all)) return 'solemn';
  if (RE.festive.test(title)) return 'festive';
  if (RE.tense.test(title)) return 'tense';
  if (RE.mystic.test(title)) return 'mystic';
  if (RE.underworld.test(title)) return 'underworld';
  if (RE.court.test(title)) return 'court';
  return null;
}

const ageMonths = (game) => {
  const id = game?.player?.id;
  const p = id == null ? null : game.people?.find?.((x) => x.id === id);
  return p?.ageMonths ?? null;
};

/** 지금 있는 곳을 가리키는 낱말. 환경음도 이것으로 고른다. */
export function whereOf(game) {
  if (!game) return 'title';
  const life = game.life ?? {};
  if (life.travel) return 'road';
  const place = { harfen: 'town', verden: 'castle', leocast: 'capital' }[life.place];
  if (place) return place;
  const a = ageMonths(game);
  if (a != null && a < 36) return 'cradle';
  return `village_${seasonOf(game.date?.month ?? 3)}`;
}

/** 사건이 없을 때의 배경 곡 묶음: 장소, 계절, 세상 형편 */
export function placePool(game) {
  const where = whereOf(game);
  if (where === 'title') return ['title'];
  let pool;
  if (where === 'road') pool = ['road'];
  else if (where === 'town') pool = ['town', 'market'];
  else if (where === 'castle') pool = ['castle'];
  else if (where === 'capital') pool = ['capital'];
  else if (where === 'cradle') pool = ['cradle', `village_${seasonOf(game.date?.month ?? 3)}`];
  else {
    const s = where.slice(8);
    pool = s === 'winter' ? [where, 'ern_dusk'] : [where, 'ern_fields', 'ern_dusk'];
  }
  // 기근·역병 때는 힘겨운 곡이 섞인다 (그것만 틀면 몇 해씩 같은 곡이 된다)
  if (game.world?.famine || game.world?.plague) pool = ['hardship', pool[0]];
  return pool;
}
export const placeTrack = (game) => (game?.over ? 'solemn' : placePool(game)[0]);

/**
 * view: { title: 처음 화면인가, overlay: 사건 창이 떠 있는가, last: 직전에 틀던 상황 곡 }
 * 돌려주는 것: { pool: 곡 id들, cue: 상황 곡인가, where: 지금 있는 곳 }
 * 사건 창에 결과만 남아 있는 동안(pendingEvent는 이미 비었음)은 그 사건의 곡을 이어 간다.
 */
export function pickMusic(game, view = {}) {
  if (view.title || !game) return { pool: ['title'], cue: false, where: 'title' };
  const where = whereOf(game);
  if (game.over) return { pool: ['solemn'], cue: true, where };
  const mood = eventMood(game) ?? (view.overlay && view.last ? view.last : null);
  if (mood) return { pool: [mood], cue: true, where };
  return { pool: placePool(game), cue: false, where };
}
/** 곡 하나만 필요할 때 (묶음의 첫 곡) */
export const pickTrack = (game, view) => pickMusic(game, view).pool[0];

/** 상황 곡이 흐를 때 환경음을 어디 것으로 둘까. 싸움 중엔 끈다. */
export function ambienceWhere(m) {
  if (!m.cue) return m.pool[0] === 'hardship' ? 'hardship' : m.where;
  const c = m.pool[0];
  if (c === 'dungeon') return 'dungeon';
  if (['battle', 'boss', 'duel', 'war'].includes(c)) return 'none';
  return m.where;
}

/** 싸움 결과 글에 맞는 효과음 */
export function fightSfx(text) {
  const t = String(text ?? '');
  if (/싸움을 피했다|물러났다|달아났다|검을 내렸다/.test(t)) return 'flee';
  if (/패해|쓰러진 나를|정신을 잃|도랑이었다|기어서 나왔다|들쳐 업고|끌고 빠져나왔다|더는 검을 들 수 없었다|패주|무너졌다/.test(t)) return 'defeat';
  return 'victory';
}
