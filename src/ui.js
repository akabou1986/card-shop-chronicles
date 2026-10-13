import { CARD_TYPES } from './cards.js';

export class UIManager {
  constructor(gameState, onActionCallback) {
    this.gs = gameState;
    this.onAction = onActionCallback;
    this.selectedHandCard = null;

    this.cacheElements();
    this.bindStaticEvents();
  }

  cacheElements() {
    this.turnBadge = document.getElementById('turn-badge');
    this.turnCountDisplay = document.getElementById('turn-count-display');
    this.turnOwnerDisplay = document.getElementById('turn-owner-display');
    this.btnEndTurn = document.getElementById('btn-end-turn');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnLogToggle = document.getElementById('btn-log-toggle');
    this.btnCloseLog = document.getElementById('btn-close-log');
    this.battleLogPanel = document.getElementById('battle-log-panel');
    this.logEntries = document.getElementById('log-entries');

    // プレイヤーHUD
    this.playerLifeText = document.getElementById('player-life-text');
    this.playerLifeBar = document.getElementById('player-life-bar');
    this.playerManaText = document.getElementById('player-mana');
    this.playerManaPips = document.getElementById('player-mana-pips');
    this.playerHandCount = document.getElementById('player-hand-count');
    this.playerDeckCount = document.getElementById('player-deck-count');
    this.playerHandContainer = document.getElementById('player-hand-cards');

    // 対戦相手HUD
    this.opponentLifeText = document.getElementById('opponent-life-text');
    this.opponentLifeBar = document.getElementById('opponent-life-bar');
    this.opponentManaText = document.getElementById('opponent-mana');
    this.opponentManaPips = document.getElementById('opponent-mana-pips');
    this.opponentHandCount = document.getElementById('opponent-hand-count');
    this.opponentDeckCount = document.getElementById('opponent-deck-count');

    // フェイズ通知 & ゲーム終了モーダル
    this.phaseOverlay = document.getElementById('phase-overlay');
    this.phaseText = document.getElementById('phase-text');
    this.gameEndModal = document.getElementById('game-end-modal');
    this.gameEndIcon = document.getElementById('game-end-icon');
    this.gameEndTitle = document.getElementById('game-end-title');
    this.gameEndDesc = document.getElementById('game-end-desc');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    // 手札ヒント ＆ カード詳細モーダル（モバイル対応）
    this.handHintText = document.getElementById('hand-hint-text');
    this.cardDetailModal = document.getElementById('card-detail-modal');
    this.detailCardCost = document.getElementById('detail-card-cost');
    this.detailCardName = document.getElementById('detail-card-name');
    this.detailCardType = document.getElementById('detail-card-type');
    this.detailCardArt = document.getElementById('detail-card-art');
    this.detailCardDesc = document.getElementById('detail-card-desc');
    this.detailCardStats = document.getElementById('detail-card-stats');
    this.detailCardAtk = document.getElementById('detail-card-atk');
    this.detailCardHp = document.getElementById('detail-card-hp');
    this.btnCloseDetail = document.getElementById('btn-close-detail');
  }

  bindStaticEvents() {
    // 詳細モーダル閉じる
    this.btnCloseDetail?.addEventListener('click', () => {
      this.cardDetailModal.classList.remove('open');
    });
    this.cardDetailModal?.addEventListener('click', (e) => {
      if (e.target === this.cardDetailModal) {
        this.cardDetailModal.classList.remove('open');
      }
    });

    // ログパネル開閉
    this.btnLogToggle.addEventListener('click', () => {
      this.battleLogPanel.classList.toggle('open');
    });
    this.btnCloseLog.addEventListener('click', () => {
      this.battleLogPanel.classList.remove('open');
    });

    // ターン終了ボタン
    this.btnEndTurn.addEventListener('click', () => {
      if (this.gs.activePlayer === 'player' && this.gs.phase === 'main' && !this.gs.isGameOver) {
        this.deselectCard();
        this.onAction('end-turn');
      }
    });

    // リスタート
    this.btnRestart.addEventListener('click', () => {
      if (confirm('ゲームを最初からやり直しますか？')) {
        this.onAction('restart');
      }
    });

    this.btnPlayAgain.addEventListener('click', () => {
      this.gameEndModal.classList.remove('open');
      this.onAction('restart');
    });

    // 盤面スロットのクリックイベント（召喚・サポート配置）
    for (let i = 0; i < 3; i++) {
      const pMonsterSlot = document.getElementById(`player-monster-${i}`);
      pMonsterSlot.addEventListener('click', () => this.handleSlotClick('player', 'monster', i));

      const pSupportSlot = document.getElementById(`player-support-${i}`);
      pSupportSlot.addEventListener('click', () => this.handleSlotClick('player', 'support', i));

      // 敵モンスタークリック（スペルのターゲット用）
      const oppMonsterSlot = document.getElementById(`opp-monster-${i}`);
      oppMonsterSlot.addEventListener('click', () => this.handleSlotClick('opponent', 'monster', i));
    }
  }

  /**
   * カード詳細拡大モーダルの表示（モバイル・PC対応）
   */
  showCardDetail(card) {
    if (!card) return;
    this.detailCardCost.textContent = card.cost ?? '-';
    this.detailCardName.textContent = card.name || 'カード';
    const typeLabels = {
      monster: 'MONSTER (茶)',
      spell: 'SPELL (青)',
      trap: 'TRAP (赤)',
      enchant: 'ENCHANT (緑)'
    };
    this.detailCardType.textContent = typeLabels[card.type] || (card.type || '').toUpperCase();
    this.detailCardType.className = `detail-type-badge badge-${card.type}`;
    this.detailCardArt.textContent = card.emoji || '👾';
    this.detailCardDesc.textContent = card.desc || '効果なし';

    if (card.type === 'monster') {
      this.detailCardStats.style.display = 'flex';
      this.detailCardAtk.textContent = `⚔️ ATK: ${card.atk}`;
      this.detailCardHp.textContent = `❤️ HP: ${card.currentHp ?? card.hp} / ${card.hp}`;
    } else {
      this.detailCardStats.style.display = 'none';
    }

    this.cardDetailModal.classList.add('open');
  }

  /**
   * 長押し（400ms）検知ヘルパー
   */
  attachLongPress(el, onLongPress, onClick) {
    let timer = null;
    let isLongPress = false;

    const start = () => {
      isLongPress = false;
      timer = setTimeout(() => {
        isLongPress = true;
        if (navigator.vibrate) navigator.vibrate(30);
        onLongPress();
      }, 380);
    };

    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', (e) => {
      clear();
      if (!isLongPress && onClick) {
        onClick(e);
      }
    });
    el.addEventListener('touchcancel', clear);

    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', (e) => {
      clear();
      if (!isLongPress && onClick) {
        onClick(e);
      }
    });
    el.addEventListener('mouseleave', clear);
  }

  /**
   * 手札カード選択解除
   */
  deselectCard() {
    this.selectedHandCard = null;
    document.querySelectorAll('.hand-card-item').forEach(el => el.classList.remove('selected'));
    if (this.handHintText) {
      this.handHintText.textContent = 'カードをタップで選択（詳細表示・長押しで拡大）';
    }
  }

  /**
   * スロットクリック処理
   */
  handleSlotClick(side, type, index) {
    if (this.gs.isGameOver || this.gs.activePlayer !== 'player' || this.gs.phase !== 'main') {
      return;
    }

    // すでにモンスターやサポートがいる場合は詳細表示
    const sideObj = this.gs.getSide(side);
    const existingCard = type === 'monster' ? sideObj.monsterSlots[index] : sideObj.supportSlots[index];
    if (existingCard && !this.selectedHandCard) {
      this.showCardDetail(existingCard);
      return;
    }

    if (!this.selectedHandCard) return;

    const card = this.selectedHandCard;

    // モンスター配置
    if (side === 'player' && type === 'monster') {
      if (card.type === CARD_TYPES.MONSTER) {
        this.onAction('summon-monster', { cardUid: card.uid, slotIndex: index });
        this.deselectCard();
      }
    }

    // サポート（トラップ/エンチャント）配置
    if (side === 'player' && type === 'support') {
      if (card.type === CARD_TYPES.TRAP || card.type === CARD_TYPES.ENCHANT) {
        this.onAction('deploy-support', { cardUid: card.uid, slotIndex: index });
        this.deselectCard();
      }
    }

    // 敵モンスターをクリック（ダメージスペルの対象）
    if (side === 'opponent' && type === 'monster') {
      if (card.type === CARD_TYPES.SPELL && card.spellType === 'damage_monster') {
        this.onAction('cast-spell', {
          cardUid: card.uid,
          target: { targetSide: 'opponent', slotIndex: index }
        });
        this.deselectCard();
      }
    }
  }

  /**
   * 画面全体の再描画
   */
  render() {
    this.renderTurnInfo();
    this.renderHuds();
    this.renderBoard();
    this.renderHand();
    this.renderLogs();
    this.checkModal();
  }

  /**
   * ターン＆フェイズ表示
   */
  renderTurnInfo() {
    const isPlayer = this.gs.activePlayer === 'player';
    this.turnCountDisplay.textContent = `TURN ${this.gs.turnCount}`;
    this.turnOwnerDisplay.textContent = isPlayer 
      ? (this.gs.phase === 'main' ? 'PLAYER TURN' : 'PLAYER BATTLE') 
      : (this.gs.phase === 'main' ? 'OPPONENT TURN' : 'OPPONENT BATTLE');

    this.turnBadge.className = `turn-indicator-badge ${isPlayer ? 'player-turn' : 'opponent-turn'}`;

    // ターン終了ボタンの活性状態
    const canEndTurn = isPlayer && this.gs.phase === 'main' && !this.gs.isGameOver;
    this.btnEndTurn.disabled = !canEndTurn;
    if (isPlayer && this.gs.phase === 'main') {
      this.btnEndTurn.querySelector('.btn-text').textContent = 'ターン終了';
      const sub = this.btnEndTurn.querySelector('.btn-subtext');
      if (sub) sub.textContent = '戦闘フェイズへ';
    } else {
      this.btnEndTurn.querySelector('.btn-text').textContent = '待機中...';
      const sub = this.btnEndTurn.querySelector('.btn-subtext');
      if (sub) sub.textContent = isPlayer ? '戦闘進行中' : '相手の行動中';
    }
  }

  /**
   * プレイヤー＆NPCのステータス描画
   */
  renderHuds() {
    const p = this.gs.player;
    const opp = this.gs.opponent;

    // プレイヤー
    this.playerLifeText.textContent = `${Math.max(0, p.life)} / ${p.maxLife}`;
    const pLifePercent = Math.max(0, Math.min(100, (p.life / p.maxLife) * 100));
    this.playerLifeBar.style.width = `${pLifePercent}%`;
    this.playerManaText.textContent = `${p.mana} / ${p.maxMana}`;
    this.playerHandCount.textContent = p.hand.length;
    this.playerDeckCount.textContent = p.deck.length;
    this.renderManaPips(this.playerManaPips, p.mana, p.maxMana);

    // 相手
    this.opponentLifeText.textContent = `${Math.max(0, opp.life)} / ${opp.maxLife}`;
    const oppLifePercent = Math.max(0, Math.min(100, (opp.life / opp.maxLife) * 100));
    this.opponentLifeBar.style.width = `${oppLifePercent}%`;
    this.opponentManaText.textContent = `${opp.mana} / ${opp.maxMana}`;
    this.opponentHandCount.textContent = opp.hand.length;
    this.opponentDeckCount.textContent = opp.deck.length;
    this.renderManaPips(this.opponentManaPips, opp.mana, opp.maxMana);
  }

  renderManaPips(container, current, max) {
    container.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = `mana-pip ${i < current ? 'filled' : ''}`;
      container.appendChild(pip);
    }
  }

  /**
   * 盤面のカード描画
   */
  renderBoard() {
    // 自陣モンスター (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      this.renderSlotCard(`player-monster-${i}`, this.gs.player.monsterSlots[i], 'monster', 'player');
    }
    // 自陣サポート (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      this.renderSlotCard(`player-support-${i}`, this.gs.player.supportSlots[i], 'support', 'player');
    }

    // 敵モンスター (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      this.renderSlotCard(`opp-monster-${i}`, this.gs.opponent.monsterSlots[i], 'monster', 'opponent');
    }
    // 敵サポート (0, 1, 2)
    for (let i = 0; i < 3; i++) {
      this.renderSlotCard(`opp-support-${i}`, this.gs.opponent.supportSlots[i], 'support', 'opponent');
    }
  }

  renderSlotCard(slotId, cardData, slotType, owner) {
    const slot = document.getElementById(slotId);
    if (!slot) return;

    if (!cardData) {
      // 空スロットのプレースホルダー
      if (slotType === 'monster') {
        const laneName = slotId.endsWith('0') ? 'LEFT' : slotId.endsWith('1') ? 'CENTER' : 'RIGHT';
        slot.innerHTML = `<span class="slot-lane-indicator">${laneName}</span>`;
      } else {
        slot.innerHTML = `<span class="slot-placeholder">${owner === 'player' ? 'Trap / Support' : '伏せカード枠'}</span>`;
      }
      return;
    }

    // カードが存在する場合
    if (slotType === 'monster') {
      const isDamaged = cardData.currentHp < cardData.hp;
      const stateClass = cardData.isRested ? 'rested-state' : 'active-state';

      slot.innerHTML = `
        <div class="card-view card-type-monster ${stateClass}" title="${cardData.name} (コスト:${cardData.cost})\n${cardData.desc}">
          <div class="card-header-bar">
            <span class="card-cost-badge">${cardData.cost}</span>
            <span class="card-name-text">${cardData.name}</span>
            <span class="card-type-icon">${cardData.emoji || '👾'}</span>
          </div>
          <div class="card-stats-footer">
            <span class="card-stat-atk">⚔️${cardData.atk}</span>
            <span class="card-stat-hp ${isDamaged ? 'damaged' : ''}">❤️${cardData.currentHp}</span>
          </div>
        </div>
      `;
    } else {
      // サポート枠（トラップ/エンチャント）
      const isOpponent = owner === 'opponent';
      const cardTypeClass = cardData.type === 'enchant' ? 'card-type-enchant' : 'card-type-trap';
      slot.innerHTML = `
        <div class="card-view support-card-view ${cardTypeClass}" title="${isOpponent ? '相手の伏せカード' : `${cardData.name} (コスト:${cardData.cost})\n${cardData.desc}`}">
          <div class="card-header-bar">
            <span class="card-cost-badge">${isOpponent ? '?' : cardData.cost}</span>
            <span class="card-name-text">${isOpponent ? '伏せカード' : cardData.name}</span>
            <span class="card-type-icon">${isOpponent ? '🔒' : cardData.emoji}</span>
          </div>
        </div>
      `;
    }
  }

  /**
   * 手札カード描画
   */
  renderHand() {
    this.playerHandContainer.innerHTML = '';
    const p = this.gs.player;

    p.hand.forEach((card) => {
      const cardEl = document.createElement('div');
      const canAfford = p.mana >= card.cost;
      const isSelected = this.selectedHandCard && this.selectedHandCard.uid === card.uid;

      const typeClass = card.type === 'spell' ? 'type-spell' : card.type === 'trap' ? 'type-trap' : card.type === 'enchant' ? 'type-enchant' : 'type-monster';
      cardEl.className = `hand-card-item ${typeClass} ${isSelected ? 'selected' : ''} ${!canAfford ? 'unplayable' : ''}`;
      cardEl.setAttribute('data-uid', card.uid);
      cardEl.setAttribute('title', `${card.name} (コスト:${card.cost})\n${card.desc}`);

      let footerHtml = '';
      if (card.type === 'monster') {
        footerHtml = `
          <div class="card-stats-footer">
            <span class="card-stat-atk">⚔️${card.atk}</span>
            <span class="card-stat-hp">❤️${card.hp}</span>
          </div>
        `;
      } else if (card.type === 'spell') {
        const valText = card.spellType === 'damage_monster' ? `💥${card.value}` : `✨+${card.value}`;
        footerHtml = `
          <div class="card-stats-footer">
            <span class="card-stat-spell" style="font-size:0.6rem; color:#d8b4fe; width:100%; text-align:center;">${valText}</span>
          </div>
        `;
      } else {
        footerHtml = `
          <div class="card-stats-footer">
            <span class="card-stat-trap" style="font-size:0.58rem; color:#fde047; width:100%; text-align:center;">🔒TRAP</span>
          </div>
        `;
      }

      cardEl.innerHTML = `
        <div class="card-header-bar">
          <span class="card-cost-badge">${card.cost}</span>
          <span class="card-name-text">${card.name}</span>
          <span class="card-type-icon">${card.type === 'monster' ? '👾' : card.type === 'spell' ? '✨' : '🔒'}</span>
        </div>
        <div class="card-visual-frame">
          <span class="card-art-emoji">${card.emoji}</span>
        </div>
        ${footerHtml}
      `;

      // 長押しで拡大モーダル表示 ＆ 短いタップでカード選択
      this.attachLongPress(
        cardEl,
        // 長押し時
        () => {
          this.showCardDetail(card);
        },
        // タップ時
        () => {
          if (this.gs.activePlayer !== 'player' || this.gs.phase !== 'main') return;
          if (!canAfford) {
            // マナ不足時でもタップで説明文は読めるようにする
            if (this.handHintText) {
              this.handHintText.innerHTML = `<span style="color:#ff6b6b;">[マナ不足]</span> <strong style="color:var(--accent-gold);">【${card.name}】</strong>(コスト:${card.cost}) ${card.desc}`;
            }
            return;
          }

          // 回復スペルなど対象不要のカードは即発動確認
          if (card.type === CARD_TYPES.SPELL && card.spellType === 'heal_player') {
            if (confirm(`[${card.name}] を使用してライフを回復しますか？（コスト: ${card.cost}）`)) {
              this.onAction('cast-spell', { cardUid: card.uid, target: null });
              this.deselectCard();
              return;
            }
          }

          // 選択トグル
          if (this.selectedHandCard && this.selectedHandCard.uid === card.uid) {
            this.deselectCard();
          } else {
            this.selectedHandCard = card;
            // リアルタイム説明文の更新
            if (this.handHintText) {
              const statText = card.type === 'monster' ? ` [ATK:${card.atk} / HP:${card.hp}]` : '';
              this.handHintText.innerHTML = `<strong style="color:var(--accent-gold);">【${card.name}】</strong>(コスト:${card.cost})${statText} ${card.desc}`;
            }
          }
          this.render();
        }
      );

      this.playerHandContainer.appendChild(cardEl);
    });
  }

  /**
   * ログ描画
   */
  renderLogs() {
    this.logEntries.innerHTML = '';
    this.gs.logs.slice(0, 30).forEach(log => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${log.type}`;
      entry.textContent = `[${log.time}] ${log.text}`;
      this.logEntries.appendChild(entry);
    });
  }

  /**
   * ゲーム終了判定 & モーダル表示
   */
  checkModal() {
    if (!this.gs.isGameOver) {
      this.gameEndModal.classList.remove('open');
      return;
    }

    if (this.gs.winner === 'player') {
      this.gameEndIcon.textContent = '🏆';
      this.gameEndTitle.textContent = 'VICTORY!';
      this.gameEndDesc.textContent = '見事に相手を撃破しました！おめでとうございます！';
    } else if (this.gs.winner === 'opponent') {
      this.gameEndIcon.textContent = '💀';
      this.gameEndTitle.textContent = 'DEFEAT...';
      this.gameEndDesc.textContent = 'ライフが0になりました。次はデッキの動かし方を工夫してみましょう。';
    } else {
      this.gameEndIcon.textContent = '⚖️';
      this.gameEndTitle.textContent = 'DRAW';
      this.gameEndDesc.textContent = '引き分けとなりました！';
    }

    this.gameEndModal.classList.add('open');
  }

  /**
   * フェイズ変更通知オーバーレイ表示
   */
  async showPhaseBanner(text) {
    this.phaseText.textContent = text;
    this.phaseOverlay.classList.add('show');
    await new Promise(r => setTimeout(r, 800));
    this.phaseOverlay.classList.remove('show');
  }

  /**
   * 攻撃時の踏み込みモーション
   */
  async playAttackMotion(sideName, laneIndex) {
    const slotId = sideName === 'player' ? `player-monster-${laneIndex}` : `opp-monster-${laneIndex}`;
    const slot = document.getElementById(slotId);
    if (!slot) return;

    const animClass = sideName === 'player' ? 'attacking-up' : 'attacking-down';
    slot.classList.add(animClass);
    await new Promise(r => setTimeout(r, 350));
    slot.classList.remove(animClass);
  }

  /**
   * モンスター被ダメージ演出（シェイク＋数字フロート）
   */
  playMonsterDamage(sideName, laneIndex, amount) {
    const slotId = sideName === 'player' ? `player-monster-${laneIndex}` : `opp-monster-${laneIndex}`;
    const slot = document.getElementById(slotId);
    if (!slot) return;

    slot.classList.add('shake-effect');
    setTimeout(() => slot.classList.remove('shake-effect'), 300);

    const floatNum = document.createElement('div');
    floatNum.className = 'floating-damage';
    floatNum.textContent = `-${amount}`;
    slot.appendChild(floatNum);

    setTimeout(() => floatNum.remove(), 800);
  }

  /**
   * プレイヤー本体ダイレクトアタック被弾演出
   */
  playDirectDamage(sideName, amount) {
    const hudId = sideName === 'player' ? 'player-hud' : 'opponent-hud';
    const hud = document.getElementById(hudId);
    if (!hud) return;

    hud.classList.add('shake-effect');
    setTimeout(() => hud.classList.remove('shake-effect'), 300);

    const floatNum = document.createElement('div');
    floatNum.className = 'floating-damage';
    floatNum.textContent = `-${amount}`;
    hud.appendChild(floatNum);

    setTimeout(() => floatNum.remove(), 800);
  }
}
