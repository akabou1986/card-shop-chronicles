import { CARD_TYPES } from './cards.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * プロトタイプ用NPC AI思考ルーチン
 */
export class OpponentAI {
  /**
   * @param {GameState} gameState
   * @param {Function} updateUICallback
   * @param {Function} onTrapTriggerCallback
   */
  constructor(gameState, updateUICallback, onTrapTriggerCallback = null) {
    this.gameState = gameState;
    this.updateUI = updateUICallback;
    this.onTrapTrigger = onTrapTriggerCallback;
  }

  /**
   * NPCのメインフェイズの自動行動を実行
   */
  async playTurn() {
    const gs = this.gameState;
    const opp = gs.opponent;

    await sleep(600); // 思考ディレイ演出

    let actionTaken = true;
    while (actionTaken && !gs.isGameOver) {
      actionTaken = false;

      // 1. スペルの発動判定（プレイヤーのモンスターがいる場合、火力スペルを打つ）
      const playableSpell = opp.hand.find(c => c.type === CARD_TYPES.SPELL && c.cost <= opp.mana);
      if (playableSpell) {
        if (playableSpell.spellType === 'damage_monster') {
          // プレイヤー陣営の最もHPの高いモンスターを狙う
          const targetIndex = this.findBestSpellTarget();
          if (targetIndex !== -1) {
            gs.castSpell('opponent', playableSpell.uid, {
              targetSide: 'player',
              slotIndex: targetIndex
            });
            this.updateUI();
            await sleep(600);
            actionTaken = true;
            continue;
          }
        } else if (playableSpell.spellType === 'heal_player') {
          // HPが減っているなら回復
          if (opp.life <= 16) {
            gs.castSpell('opponent', playableSpell.uid, null);
            this.updateUI();
            await sleep(600);
            actionTaken = true;
            continue;
          }
        }
      }

      // 2. モンスターの召喚判定
      const emptyMonsterSlots = [];
      opp.monsterSlots.forEach((slot, idx) => {
        if (slot === null) emptyMonsterSlots.push(idx);
      });

      if (emptyMonsterSlots.length > 0) {
        // 出せるモンスターを手札から探す（高コスト優先で強いモンスターを出す）
        const playableMonsters = opp.hand
          .filter(c => c.type === CARD_TYPES.MONSTER && c.cost <= opp.mana)
          .sort((a, b) => b.cost - a.cost);

        if (playableMonsters.length > 0) {
          const monsterToPlay = playableMonsters[0];
          // 相手（プレイヤー）の正面が空いている、または対抗したいレーンを選択
          const targetSlot = this.chooseBestMonsterSlot(emptyMonsterSlots);
          const res = gs.summonMonster('opponent', monsterToPlay.uid, targetSlot);
          if (res.success) {
            this.updateUI();
            if (res.trapResult && res.trapResult.triggered && this.onTrapTrigger) {
              await this.onTrapTrigger({
                trap: res.trapResult.trap,
                ownerSideName: res.trapResult.trapOwnerName,
                slotIndex: res.trapResult.trapSlotIndex,
                targetSideName: res.trapResult.summonerName,
                targetLane: res.trapResult.summonSlotIndex,
                actionTagText: `💥 召喚迎撃 ${res.trapResult.damage}ダメージ！`
              });
              this.updateUI();
            }
            await sleep(700);
            actionTaken = true;
            continue;
          }
        }
      }

      // 3. サポートカード（トラップ）の配置判定
      const emptySupportSlots = [];
      opp.supportSlots.forEach((slot, idx) => {
        if (slot === null) emptySupportSlots.push(idx);
      });

      if (emptySupportSlots.length > 0) {
        const playableTrap = opp.hand.find(c => (c.type === CARD_TYPES.TRAP || c.type === CARD_TYPES.ENCHANT) && c.cost <= opp.mana);
        if (playableTrap) {
          const targetSupportSlot = emptySupportSlots[0];
          const res = gs.deploySupport('opponent', playableTrap.uid, targetSupportSlot);
          if (res.success) {
            this.updateUI();
            await sleep(600);
            actionTaken = true;
            continue;
          }
        }
      }
    }

    await sleep(400);
  }

  /**
   * 最もダメージを与えたい敵モンスターのインデックス
   */
  findBestSpellTarget() {
    let bestIndex = -1;
    let maxAtk = -1;
    this.gameState.player.monsterSlots.forEach((monster, idx) => {
      if (monster && monster.atk > maxAtk) {
        maxAtk = monster.atk;
        bestIndex = idx;
      }
    });
    return bestIndex;
  }

  /**
   * モンスターを配置する最適レーン選択
   */
  chooseBestMonsterSlot(emptySlots) {
    const playerSlots = this.gameState.player.monsterSlots;
    // 1. プレイヤーの攻撃力が高いモンスターの正面に置いて防ぐ
    for (const slot of emptySlots) {
      if (playerSlots[slot] !== null) {
        return slot;
      }
    }
    // 2. なければ空いている先頭
    return emptySlots[0];
  }
}
