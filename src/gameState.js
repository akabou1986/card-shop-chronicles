import { createStarterDeck, CARD_TYPES } from './cards.js';

/**
 * ゲームステート管理クラス
 */
export class GameState {
  constructor() {
    this.init();
  }

  init() {
    // 企画書ルール:
    // ライフ20、先攻4枚、後攻5枚、初期マナ1、最大マナ上限10
    this.turnCount = 1;
    this.activePlayer = 'player'; // 先攻: プレイヤー
    this.phase = 'main'; // 'main' | 'combat'
    this.isGameOver = false;
    this.winner = null;

    this.player = {
      name: 'プレイヤー',
      life: 20,
      maxLife: 20,
      mana: 1,
      maxMana: 1,
      hand: [],
      deck: createStarterDeck(true),
      graveyard: [],
      monsterSlots: [null, null, null], // [左, 中, 右]
      supportSlots: [null, null, null]  // [サポート1, 2, 3]
    };

    this.opponent = {
      name: 'ショップの挑戦者 (NPC)',
      life: 20,
      maxLife: 20,
      mana: 1,
      maxMana: 1,
      hand: [],
      deck: createStarterDeck(),
      graveyard: [],
      monsterSlots: [null, null, null],
      supportSlots: [null, null, null]
    };

    this.logs = [];

    // 初期手札の配布
    // 先攻プレイヤー: 4枚 (1ターン目のドローなし)
    for (let i = 0; i < 4; i++) {
      this.drawCard('player', false);
    }
    // 後攻NPC: 5枚
    for (let i = 0; i < 5; i++) {
      this.drawCard('opponent', false);
    }

    this.addLog(`ゲーム開始！先攻：${this.player.name}、後攻：${this.opponent.name}`, 'turn-header');
    this.addLog(`【ターン ${this.turnCount}】${this.player.name}のメインフェイズ（マナ: ${this.player.mana}/${this.player.maxMana}）`, 'turn-header');
  }

  addLog(message, type = 'normal') {
    this.logs.unshift({
      id: Date.now() + Math.random(),
      text: message,
      type: type,
      time: new Date().toLocaleTimeString()
    });
  }

  getSide(sideName) {
    return sideName === 'player' ? this.player : this.opponent;
  }

  getOppositeSideName(sideName) {
    return sideName === 'player' ? 'opponent' : 'player';
  }

  /**
   * ドロー処理
   */
  drawCard(sideName, log = true) {
    const side = this.getSide(sideName);
    if (side.deck.length === 0) {
      if (log) {
        this.addLog(`${side.name}の山札が尽きました！`, 'attack-log');
      }
      this.checkDeckOutLoss(sideName);
      return null;
    }

    const card = side.deck.pop();
    if (side.hand.length >= 7) {
      // 手札上限7枚、超過時は墓地へ
      side.graveyard.push(card);
      if (log) {
        this.addLog(`${side.name}の手札が上限(7枚)を超えたため、[${card.name}]は墓地へ送られました。`);
      }
      return null;
    }

    side.hand.push(card);
    if (log && sideName === 'player') {
      this.addLog(`${side.name}は [${card.name}] をドローしました。`);
    } else if (log && sideName === 'opponent') {
      this.addLog(`${side.name}はカードを1枚ドローしました。`);
    }
    return card;
  }

  /**
   * 山札切れによる敗北判定
   */
  checkDeckOutLoss(sideName) {
    this.isGameOver = true;
    this.winner = this.getOppositeSideName(sideName);
    const loser = this.getSide(sideName);
    this.addLog(`${loser.name}は山札切れにより敗北しました！`, 'attack-log');
  }

  /**
   * モンスター召喚
   */
  summonMonster(sideName, handCardUid, slotIndex) {
    const side = this.getSide(sideName);
    const cardIndex = side.hand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return { success: false, reason: '手札に存在しません' };

    const card = side.hand[cardIndex];
    if (card.type !== CARD_TYPES.MONSTER) return { success: false, reason: 'モンスターカードではありません' };
    if (side.mana < card.cost) return { success: false, reason: 'マナが不足しています' };
    if (side.monsterSlots[slotIndex] !== null) return { success: false, reason: 'そのレーンには既にモンスターがいます' };

    // マナ消費
    side.mana -= card.cost;
    side.hand.splice(cardIndex, 1);

    // 企画書ルール:
    // 「召喚時はレスト状態（横向き・そのターン攻撃不可）」
    const summonedMonster = {
      ...card,
      currentHp: card.hp,
      isRested: true, // 召喚時レスト
      justSummoned: true
    };
    side.monsterSlots[slotIndex] = summonedMonster;

    this.addLog(`${side.name}が レーン${slotIndex + 1} に [${card.name}] (ATK ${card.atk} / HP ${card.hp}) を召喚！（召喚時レスト）`, 'summon-log');

    // 相手の「魔導地雷」トラップ等の召喚時トリガーチェック
    const trapResult = this.checkTrapsOnSummon(this.getOppositeSideName(sideName), sideName, slotIndex);

    return { success: true, monster: summonedMonster, trapResult };
  }

  /**
   * サポートカード（トラップ / エンチャント）の配置
   */
  deploySupport(sideName, handCardUid, slotIndex) {
    const side = this.getSide(sideName);
    const cardIndex = side.hand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return { success: false, reason: '手札に存在しません' };

    const card = side.hand[cardIndex];
    if (card.type !== CARD_TYPES.TRAP && card.type !== CARD_TYPES.ENCHANT) {
      return { success: false, reason: 'サポートカードではありません' };
    }
    if (side.mana < card.cost) return { success: false, reason: 'マナが不足しています' };
    if (side.supportSlots[slotIndex] !== null) return { success: false, reason: 'そのサポート枠は埋まっています' };

    // マナ消費
    side.mana -= card.cost;
    side.hand.splice(cardIndex, 1);

    side.supportSlots[slotIndex] = {
      ...card,
      isRevealed: false // 伏せ状態
    };

    if (sideName === 'player') {
      const typeLabel = card.type === CARD_TYPES.ENCHANT ? 'エンチャント' : 'トラップ';
      this.addLog(`${side.name}がサポート枠${slotIndex + 1}に [${card.name}]（${typeLabel}）を配置しました。`);
    } else {
      if (card.type === CARD_TYPES.ENCHANT) {
        this.addLog(`${side.name}がサポート枠${slotIndex + 1}にエンチャント [${card.name}] を配置しました！`, 'normal');
      } else {
        this.addLog(`${side.name}がサポート枠に伏せカードをセットしました。`);
      }
    }

    return { success: true };
  }

  /**
   * スペルの発動
   */
  castSpell(sideName, handCardUid, target) {
    const side = this.getSide(sideName);
    const cardIndex = side.hand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return { success: false, reason: '手札に存在しません' };

    const card = side.hand[cardIndex];
    if (card.type !== CARD_TYPES.SPELL) return { success: false, reason: 'スペルカードではありません' };
    if (side.mana < card.cost) return { success: false, reason: 'マナが不足しています' };

    // 墓地へ
    side.mana -= card.cost;
    side.hand.splice(cardIndex, 1);
    side.graveyard.push(card);

    if (card.spellType === 'damage_monster') {
      if (!target || target.slotIndex === undefined || !target.targetSide) {
        return { success: false, reason: '対象モンスターが指定されていません' };
      }
      const targetSide = this.getSide(target.targetSide);
      const monster = targetSide.monsterSlots[target.slotIndex];
      if (!monster) return { success: false, reason: '対象モンスターが存在しません' };

      monster.currentHp -= card.value;
      this.addLog(`${side.name}が [${card.name}] を発動！ ${targetSide.name}の [${monster.name}] に ${card.value} ダメージ！`, 'attack-log');

      if (monster.currentHp <= 0) {
        this.addLog(`[${monster.name}] は破壊され墓地に送られました。`, 'attack-log');
        targetSide.graveyard.push(monster);
        targetSide.monsterSlots[target.slotIndex] = null;
      }
    } else if (card.spellType === 'heal_player') {
      const prevLife = side.life;
      side.life = Math.min(side.maxLife, side.life + card.value);
      const healed = side.life - prevLife;
      this.addLog(`${side.name}が [${card.name}] を発動！ ライフが ${healed} 回復した！（HP: ${side.life}）`);
    }

    return { success: true };
  }

  /**
   * トラップ自動発動チェック: 召喚時
   */
  checkTrapsOnSummon(trapOwnerName, summonerName, slotIndex) {
    const trapSide = this.getSide(trapOwnerName);
    const summonerSide = this.getSide(summonerName);
    const summonedMonster = summonerSide.monsterSlots[slotIndex];
    if (!summonedMonster) return null;

    for (let i = 0; i < 3; i++) {
      const trap = trapSide.supportSlots[i];
      if (trap && trap.type === CARD_TYPES.TRAP && trap.trigger === 'on_enemy_summon') {
        // トラップ発動！
        this.addLog(`【自動発動トラップ】${trapSide.name}の [${trap.name}] が作動！`, 'attack-log');
        trapSide.supportSlots[i] = null;
        trapSide.graveyard.push(trap);

        summonedMonster.currentHp -= trap.value;
        this.addLog(`召喚された [${summonedMonster.name}] に ${trap.value} ダメージ！`, 'attack-log');
        const isDestroyed = summonedMonster.currentHp <= 0;
        if (isDestroyed) {
          this.addLog(`[${summonedMonster.name}] は召喚直後に破壊されました！`, 'attack-log');
          summonerSide.graveyard.push(summonedMonster);
          summonerSide.monsterSlots[slotIndex] = null;
        }

        return {
          triggered: true,
          trap,
          trapSlotIndex: i,
          trapOwnerName,
          summonerName,
          summonSlotIndex: slotIndex,
          damage: trap.value,
          isDestroyed
        };
      }
    }
    return null;
  }

  /**
   * ターン開始時処理（マナ回復、アクティブ化、ドロー）
   */
  startNewTurn(newActivePlayer) {
    this.activePlayer = newActivePlayer;
    this.phase = 'main';

    if (newActivePlayer === 'player') {
      this.turnCount++;
    }

    const side = this.getSide(newActivePlayer);

    // 1. マナ成長と全快（毎ターン最大+1、上限10）
    if (side.maxMana < 10) {
      side.maxMana += 1;
    }
    side.mana = side.maxMana;

    // 2. 企画書ルール: 「自陣モンスターのアクティブ化（レスト状態の解除）」
    side.monsterSlots.forEach((monster, idx) => {
      if (monster) {
        monster.isRested = false;
        monster.justSummoned = false;
      }
    });

    this.addLog(`――――――――――――――――――――――――`, 'turn-header');
    this.addLog(`【ターン ${this.turnCount}】${side.name}のターン開始！ (マナ: ${side.mana}/${side.maxMana})`, 'turn-header');

    // 3. ドロー処理 (先攻プレイヤーの1ターン目のみドローなし)
    if (!(this.turnCount === 1 && newActivePlayer === 'player')) {
      this.drawCard(newActivePlayer, true);
    }
  }

  /**
   * 勝敗判定の更新
   */
  checkWinCondition() {
    if (this.player.life <= 0 && this.opponent.life <= 0) {
      this.isGameOver = true;
      this.winner = 'draw';
      this.addLog('両者のライフが0になり、引き分けとなりました！', 'attack-log');
      return true;
    }
    if (this.player.life <= 0) {
      this.isGameOver = true;
      this.winner = 'opponent';
      this.addLog(`${this.opponent.name}の勝利！`, 'attack-log');
      return true;
    }
    if (this.opponent.life <= 0) {
      this.isGameOver = true;
      this.winner = 'player';
      this.addLog(`${this.player.name}の勝利！`, 'attack-log');
      return true;
    }
    return false;
  }
}
