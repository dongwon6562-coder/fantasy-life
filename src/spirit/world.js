// 정령의 달 흐름: 플레이어가 없어도 정령의 기분이 움직인다. 마나가 짙으면 들뜨고, 사람이 정령의 자리를 건드리면 거칠어진다.
// 기분이 아주 나빠지면 정령이 깬다. 호수가 얼고, 화산이 울고, 섬에 바람이 그치고, 구렁에서 땅이 흔들린다. 드물게, 그 고장 소문으로만.
// 엘프와 드워프는 저들끼리 정령과 계약을 맺고 깬다(세상 쪽 계약 수). 따로 난수를 쓴다.
import { WORLD_TICKS } from '../world.js';
import { PLACES } from '../places.js';
import { makeRng } from '../rng.js';
import { L } from '../adventure/core.js';
import { SP, SPIRITS, SPIRIT_IDS, clamp, mi, splog, spiritName } from './state.js';

export const spiritRng = (g, salt = 0) => makeRng({ s: ((g.rngState?.s ?? 709) ^ Math.imul(mi(g) * 131 + salt + 17, 2654435761)) | 0 });
const here = (g) => (g.life ? L(g).place : 'ern');
const near = (g, pl) => { const h = here(g); return !!pl && (pl === h || !!PLACES[h]?.links?.[pl]); };

const WAKE = {
  sp_water: '달빛 호수가 한여름에 얼었다는 소식이 은잎 마을에서 왔다. 얼음 밑에 얼굴이 수백 개 비쳤다고 한다. 엘프들은 사흘 동안 호수 쪽 문을 닫았다.',
  sp_fire: '붉은 이빨 화산이 사흘 밤낮을 울었다. 쇠망치 골 대장간의 불이 한꺼번에 파랗게 변했다가 꺼졌다. 드워프 장로들이 화산으로 올라갔다.',
  sp_wind: '소금바위섬의 바람이 그쳤다. 섬이 생긴 뒤 처음이라고 한다. 그 사흘 동안 섬에서 아이 둘이 사라졌다. 바람이 다시 불자 밤에 문을 두드리는 소리가 들렸다.',
  sp_earth: '구렁목에서 땅이 흔들렸다. 성벽에 금이 가고 돌문 하나가 안쪽으로 밀렸다. 드워프 수비대는 구렁 밑의 숨이 거칠어졌다고만 말했다.',
};

export function spiritMonth(g) {
  if (!g.spirit || g.over) return [];
  const S = SP(g), news = [], tide = g.mana?.tide ?? 0;
  SPIRIT_IDS.forEach((id, i) => {
    const x = S.spirits[id], rng = spiritRng(g, i * 7 + 1);
    // 기분: 제자리로 돌아오려 하고, 마나에 따라 들뜨고, 가끔 이유 없이 출렁인다
    x.mood = clamp(x.mood * 0.97 + tide * 0.02 + rng.float(-3, 3), -100, 100);
    if (rng.chance(0.004)) x.mood = clamp(x.mood - rng.int(40, 80), -100, 100);
    // 엘프·드워프가 맺고 깨는 계약 (세상 쪽)
    if (x.pacts < 12 && rng.chance(0.01)) x.pacts += 1;
    if (x.pacts > 0 && rng.chance(0.004)) { x.pacts -= 1; x.mood = clamp(x.mood - 20, -100, 100); }
    // 깨어남: 아주 나쁠 때, 열 해에 한 번 넘게는 아니게
    if (x.mood <= -50 && mi(g) - (x.lastWake ?? 0) > 120 && rng.chance(0.15)) {
      x.lastWake = mi(g); x.mood = clamp(x.mood + 50, -100, 100);
      splog(g, `${spiritName(id)}: 깨어났다.`);
      news.push({ text: WAKE[id], big: false, pl: SPIRITS[id].from });
    }
  });
  return news;
}

WORLD_TICKS.push((g, worldRng, say) => {
  for (const n of spiritMonth(g) ?? []) if (n.big || near(g, n.pl)) say(n.text, n.big);
});
