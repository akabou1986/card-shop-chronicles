/**
 * 戦闘フェイズの自動解決モジュール
 * 企画書ルール:
 * 1. 攻撃解決順序: 左レーン(0) → 中央レーン(1) → 右レーン(2)
 * 2. アクティブモンスターのみ攻撃（レスト状態は攻撃不可）
 * 3. 対面モンスターへ一方的攻撃（反撃なし）。対面不在時はダイレクトアタック
 * 4. 攻撃後はレスト状態に遷移
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export class CombatResolver {
  /**
   * @param {GameState} gameState
   * @param {Object} animationCallbacks - UIアニメーション用コールバック
   */
  constructor(gameState, animationCallbacks = {}) {
    this.gameState = gameState;
    this.anim = animationCallbacks;
  }

  /**
   * 戦闘フェイズを実行
   * @param {'player'|'opponent'} attackingSideName
   */
  async resolveCombatPhase(attackingSideName) {
    const gs = this.gameState;
    gs.phase = 'combat';
    const defendingSideName = gs.getOppositeSideName(attackingSideName);

    const attackingSide = gs.getSide(attackingSideName);
    const defendingSide = gs.getSide(defendingSideName);

    gs.addLog(`=== 戦闘フェイズ開始（攻撃側: ${attackingSide.name}） ===`, 'turn-header');

    if (this.anim.onCombatStart) {
      await this.anim.onCombatStart(attackingSideName);
    }

    // 左(0) → 中央(1) → 右(2) の順で解決
    for (let lane = 0; lane < 3; lane++) {
      if (gs.isGameOver) break;

      const attacker = attackingSide.monsterSlots[lane];
      // モンスターが存在し、かつアクティブ状態（レストでない）の場合のみ攻撃可能
      if (!attacker) {
        continue;
      }

      if (attacker.isRested) {
        gs.addLog(`レーン${lane + 1}の [${attacker.name}] はレスト状態のため攻撃できません。`);
        continue;
      }

      // 攻撃処理の実行
      await this.resolveSingleAttack(attackingSideName, defendingSideName, lane, attacker);
      await sleep(400); // テンポと視認性のバランス
    }

    gs.addLog(`=== 戦闘フェイズ終了 ===`, 'turn-header');

    // 勝敗チェック
    gs.checkWinCondition();

    if (this.anim.onCombatEnd) {
      await this.anim.onCombatEnd();
    }
  }

  /**
   * 単一モンスターの攻撃処理
   */
  async resolveSingleAttack(attackingSideName, defendingSideName, lane, attacker) {
    const gs = this.gameState;
    const defendingSide = gs.getSide(defendingSideName);
    const defender = defendingSide.monsterSlots[lane];

    // 企画書ルール変更:
    // 1. 攻撃後もモンスターはレストに移行せずアクティブを維持
    // (attacker.isRested = true は行わない)

    // 攻撃モーションUI通知
    if (this.anim.onAttackMotion) {
      await this.anim.onAttackMotion(attackingSideName, lane);
    }

    // 1. 対面に敵モンスターがいる場合: 反撃（相打ちシステム）
    if (defender) {
      gs.addLog(`【レーン${lane + 1}戦闘】[${attacker.name}] (ATK ${attacker.atk}) と [${defender.name}] (ATK ${defender.atk}) が激突！`, 'attack-log');

      // 相互ダメージ適用 (反撃)
      defender.currentHp -= attacker.atk;
      attacker.currentHp -= defender.atk;

      if (this.anim.onDamage) {
        this.anim.onDamage(defendingSideName, lane, attacker.atk);
        this.anim.onDamage(attackingSideName, lane, defender.atk);
      }

      gs.addLog(`[${defender.name}] に ${attacker.atk} ダメージ！(残HP: ${defender.currentHp}) ／ [${attacker.name}] は反撃により ${defender.atk} ダメージを受けた！(残HP: ${attacker.currentHp})`);

      // ダメージフライテキストが飛び出し、被弾・反撃を視認できる時間を確保
      await sleep(380);

      // 防御側モンスター破壊判定
      if (defender.currentHp <= 0) {
        gs.addLog(`[${defender.name}] は戦闘により撃破されました！`, 'attack-log');
        defendingSide.graveyard.push(defender);
        defendingSide.monsterSlots[lane] = null;
      }

      // 攻撃側モンスター破壊判定 (相打ち)
      if (attacker.currentHp <= 0) {
        gs.addLog(`[${attacker.name}] は反撃を受けて相打ちにより撃破されました！`, 'attack-log');
        const attackingSide = gs.getSide(attackingSideName);
        attackingSide.graveyard.push(attacker);
        attackingSide.monsterSlots[lane] = null;
      }
    } 
    // 2. 対面に敵モンスターがいない場合: ダイレクトアタック
    else {
      gs.addLog(`【レーン${lane + 1}ダイレクトアタック】対面不在！[${attacker.name}] (ATK ${attacker.atk}) が ${defendingSide.name} へ直接攻撃！`, 'attack-log');

      // トラップの自動発動判定 (直接攻撃時)
      const trapTriggered = await this.checkDirectAttackTrap(defendingSideName, attackingSideName, attacker, lane);
      if (trapTriggered) {
        // トラップにより攻撃が無効化された場合
        if (this.anim.onUpdateUI) {
          this.anim.onUpdateUI();
        }
        return;
      }

      // ライフ減少
      defendingSide.life -= attacker.atk;

      if (this.anim.onDirectAttackDamage) {
        this.anim.onDirectAttackDamage(defendingSideName, attacker.atk);
      }

      gs.addLog(`${defendingSide.name} は ${attacker.atk} の直接ダメージを受けた！（残りライフ: ${defendingSide.life}）`, 'attack-log');
      await sleep(380);
    }

    if (this.anim.onUpdateUI) {
      this.anim.onUpdateUI();
    }
  }

  /**
   * 直接攻撃時のトラップ自動発動チェック
   */
  async checkDirectAttackTrap(defendingSideName, attackingSideName, attacker, lane) {
    const gs = this.gameState;
    const defendingSide = gs.getSide(defendingSideName);
    const attackingSide = gs.getSide(attackingSideName);

    for (let i = 0; i < 3; i++) {
      const trap = defendingSide.supportSlots[i];
      if (trap && trap.type === 'trap' && trap.trigger === 'on_direct_attack') {
        gs.addLog(`【自動発動トラップ】${defendingSide.name}の伏せカード [${trap.name}] が自動発動！`, 'attack-log');

        // カットイン演出の再生
        if (this.anim.onTrapTrigger) {
          const actionText = trap.effect === 'negate_and_reflect'
            ? `🛡️ 攻撃無効＆反射 ${trap.value}ダメージ！`
            : `🛡️ 攻撃無効！`;
          await this.anim.onTrapTrigger({
            trap,
            ownerSideName: defendingSideName,
            slotIndex: i,
            targetSideName: attackingSideName,
            targetLane: lane,
            actionTagText: actionText
          });
        }

        defendingSide.supportSlots[i] = null;
        defendingSide.graveyard.push(trap);

        if (trap.effect === 'negate_and_reflect') {
          gs.addLog(`攻撃を無効化し、攻撃者の [${attacker.name}] に ${trap.value} の反射ダメージ！`, 'attack-log');
          attacker.currentHp -= trap.value;
          if (attacker.currentHp <= 0) {
            gs.addLog(`[${attacker.name}] は反射ダメージにより破壊されました！`, 'attack-log');
            // レーンから除去
            const attackerLane = attackingSide.monsterSlots.indexOf(attacker);
            if (attackerLane !== -1) {
              attackingSide.monsterSlots[attackerLane] = null;
            }
            attackingSide.graveyard.push(attacker);
          }
        }
        return true; // 攻撃無効化成功
      }
    }
    return false;
  }
}
