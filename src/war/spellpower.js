// 익힌 주문을 싸움(교전·전쟁 지휘)에 잇는다. 주문 표는 도우미스레드3의 magic/spells.js.
// magic 모듈이 다 올라온 뒤에 불려야 행동 순서가 흐트러지지 않아서 content.js 맨 끝에 둔다.
import { spellById } from '../magic/spells.js';
import { registerSpellLookup } from '../adventure/combat.js';

registerSpellLookup(spellById);
