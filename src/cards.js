/**
 * カードマスターデータ (プロトタイプ用)
 * 企画書に基づき、王道ファンタジー（直感的な役割）のカードを定義
 */

export const CARD_TYPES = {
  MONSTER: 'monster',
  SPELL: 'spell',
  TRAP: 'trap',
  ENCHANT: 'enchant'
};

export const MASTER_CARDS = [
  // --- モンスター (低〜高コスト) ---
  {
    id: 'm_goblin',
    name: 'ゴブリン斥候',
    type: CARD_TYPES.MONSTER,
    cost: 1,
    atk: 2,
    hp: 1,
    emoji: '👺',
    desc: '低コストのアタッカー。速攻を狙える。'
  },
  {
    id: 'm_sentry',
    name: '鉄壁の歩兵',
    type: CARD_TYPES.MONSTER,
    cost: 2,
    atk: 1,
    hp: 4,
    emoji: '🛡️',
    desc: '高HPの防衛モンスター。壁役に最適。'
  },
  {
    id: 'm_mage',
    name: '雷鳴の魔導士',
    type: CARD_TYPES.MONSTER,
    cost: 3,
    atk: 3,
    hp: 2,
    emoji: '🧙',
    desc: '高い攻撃力を秘めた術師。'
  },
  {
    id: 'm_knight',
    name: '王国騎士',
    type: CARD_TYPES.MONSTER,
    cost: 3,
    atk: 2,
    hp: 4,
    emoji: '⚔️',
    desc: '攻守のバランスが取れた歴戦の騎士。'
  },
  {
    id: 'm_drake',
    name: 'フレイムドレイク',
    type: CARD_TYPES.MONSTER,
    cost: 4,
    atk: 4,
    hp: 4,
    emoji: '🐲',
    desc: '中盤を制する獰猛な小型竜。'
  },
  {
    id: 'm_golem',
    name: '古代の岩石ゴーレム',
    type: CARD_TYPES.MONSTER,
    cost: 5,
    atk: 2,
    hp: 7,
    emoji: '🗿',
    desc: '圧倒的な耐久力を誇る守護者。'
  },
  {
    id: 'm_dragon',
    name: '破滅の紅蓮竜',
    type: CARD_TYPES.MONSTER,
    cost: 7,
    atk: 7,
    hp: 6,
    emoji: '🔥',
    desc: '戦場を一撃で焦土と化す最強の竜。'
  },

  // --- スペル (即効性) ---
  {
    id: 's_fireball',
    name: '火炎球',
    type: CARD_TYPES.SPELL,
    cost: 2,
    emoji: '☄️',
    desc: '敵モンスター1体に3ダメージを与える。',
    spellType: 'damage_monster',
    value: 3
  },
  {
    id: 's_heal',
    name: '癒しの光',
    type: CARD_TYPES.SPELL,
    cost: 2,
    emoji: '✨',
    desc: '自分のプレイヤーライフを4回復する。',
    spellType: 'heal_player',
    value: 4
  },
  {
    id: 's_smite',
    name: '裁きの雷',
    type: CARD_TYPES.SPELL,
    cost: 4,
    emoji: '⚡',
    desc: '敵モンスター1体に5ダメージを与える。',
    spellType: 'damage_monster',
    value: 5
  },

  // --- トラップ (伏せカード・自動発動) ---
  {
    id: 't_mirror',
    name: '影の身代わり',
    type: CARD_TYPES.TRAP,
    cost: 2,
    emoji: '🪞',
    desc: '【自動発動】相手の直接攻撃を1度だけ無効化し、攻撃者に2ダメージ。',
    trigger: 'on_direct_attack',
    effect: 'negate_and_reflect',
    value: 2
  },
  {
    id: 't_trap_mine',
    name: '魔導地雷',
    type: CARD_TYPES.TRAP,
    cost: 2,
    emoji: '💣',
    desc: '【自動発動】相手がモンスターを召喚した時、そのモンスターに2ダメージ。',
    trigger: 'on_enemy_summon',
    effect: 'damage_summon',
    value: 2
  },

  // --- エンチャント (永続効果カード・緑色) ---
  {
    id: 'e_vitality',
    name: '生命の祭壇',
    type: CARD_TYPES.ENCHANT,
    cost: 2,
    emoji: '🌿',
    desc: '【常在型】サポート枠に永続設置。自陣を癒やす聖なる祭壇。',
    effect: 'aura_vitality',
    value: 1
  },
  {
    id: 'e_war_banner',
    name: '剛力の軍旗',
    type: CARD_TYPES.ENCHANT,
    cost: 3,
    emoji: '🚩',
    desc: '【常在型】サポート枠に永続設置。味方の士気を高める象徴。',
    effect: 'aura_strength',
    value: 1
  }
];

/**
 * 30枚の初期プロトタイプデッキを生成
 * @param {boolean} ensureTypeVariety 初手で全カードタイプ(茶/青/赤/緑)が確認できるよう末尾に各タイプを配置するか
 */
export function createStarterDeck(ensureTypeVariety = false) {
  const deck = [];
  // 各カードをバランスよく30枚になるよう配分
  const distribution = [
    { id: 'm_goblin', count: 3 },
    { id: 'm_sentry', count: 3 },
    { id: 'm_mage', count: 3 },
    { id: 'm_knight', count: 3 },
    { id: 'm_drake', count: 2 },
    { id: 'm_golem', count: 2 },
    { id: 'm_dragon', count: 2 },
    { id: 's_fireball', count: 3 },
    { id: 's_heal', count: 2 },
    { id: 't_mirror', count: 2 },
    { id: 't_trap_mine', count: 2 },
    { id: 'e_vitality', count: 2 },
    { id: 'e_war_banner', count: 1 }
  ];

  let uidCounter = 1;
  for (const item of distribution) {
    const master = MASTER_CARDS.find(c => c.id === item.id);
    for (let i = 0; i < item.count; i++) {
      deck.push({
        ...master,
        uid: `${master.id}_${uidCounter++}`,
        currentHp: master.hp ?? null,
        isRested: false,
        justSummoned: false
      });
    }
  }

  // シャッフル (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // 初手で各カードタイプ（モンスター:茶, スペル:青, トラップ:赤, エンチャント:緑）が引けるよう末尾を調整
  if (ensureTypeVariety) {
    const requiredTypes = [CARD_TYPES.MONSTER, CARD_TYPES.SPELL, CARD_TYPES.TRAP, CARD_TYPES.ENCHANT];
    const pickedCards = [];
    for (const type of requiredTypes) {
      const idx = deck.findIndex(c => c.type === type && !pickedCards.includes(c));
      if (idx !== -1) {
        pickedCards.push(deck.splice(idx, 1)[0]);
      }
    }
    // pop()で引くため末尾に追加
    deck.push(...pickedCards);
  }

  return deck;
}
