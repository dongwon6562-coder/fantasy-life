// 사건 묶음 목록. 새 묶음을 만들면 여기에 import 한 줄을 더한다.
import './base.js';      // 1단계 사건 (첫걸음, 성인식 등)
import './childhood.js'; // 아기~열넷
import './family.js';    // 집안별
import './seasons.js';   // 계절과 축일
import './realm.js';     // 왕국 정세·전쟁·물가·기술과 맞물린 사건
import './adult.js';     // 열다섯 이후
import './chains.js';    // 몇 달에 걸쳐 이어지는 사건 줄기

import { EVENTS } from './core.js';
// 에른 마을에서만 일어나는 사건 (마을 광장, 밀밭, 예배당, 울타리, 마을 사람들이 나오는 일)
const VILLAGE = [
  'harvest_festival', 'harsh_winter', 'wolves', 'goblins', 'farm_storm', 'tower_dare', 'bully', 'baptism', 'coming_of_age',
  'infant_fever', 'toddler_lost', 'mana_test', 'stray_dog', 'river_rescue', 'mage_window', 'refugee_orphan', 'apprentice_offer',
  'farm_first_plow', 'farm_blight', 'farm_boundary', 'farm_bailiff', 'knight_first_form', 'knight_old_comrade', 'knight_debt', 'merch_haggling',
  'seal_festival', 'night_of_dead', 'spring_flood', 'sowing_day', 'traveling_troupe', 'lord_hunt', 'tax_day', 'first_snow', 'era_lamp_festival',
  'war_refugees', 'war_levy_horse', 'civil_banner', 'civil_looters', 'bread_riot', 'famine_neighbor', 'monster_raid', 'era2_mill',
  'inquisitor_visit', 'hero_rite_scouts', 'plague_quarantine',
  'chain_illness_start', 'chain_conscript', 'chain_darkmage_start', 'chain_missing_start', 'chain_stone_find', 'chain_friend_leaving', 'chain_swordsman_start',
];
// 세계에 한 번뿐인 사건 (대를 이어도 다시 나오지 않는다)
const WORLD = ['king_mourning', 'coronation', 'era1_firestone', 'era2_mill', 'era3_iron_wagon'];
for (const e of EVENTS) {
  if (VILLAGE.includes(e.id)) e.village = true;
  if (WORLD.includes(e.id)) e.world = true;
}
