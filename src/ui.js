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

    // トラップ発動カットイン演出用
    this.trapOverlay = document.getElementById('trap-cutin-overlay');
    this.trapBadgeText = document.getElementById('trap-cutin-badge-text');
    this.trapArt = document.getElementById('trap-cutin-art');
    this.trapOwner = document.getElementById('trap-cutin-owner');
    this.trapName = document.getElementById('trap-cutin-name');
    this.trapDesc = document.getElementById('trap-cutin-desc');
    this.trapActionTag = document.getElementById('trap-cutin-action-tag');
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

    // 盤面スロットのイベント登録（自軍/敵軍のモンスター枠・サポート枠すべて）
    const setupSlotEvents = (slotId, side, type, index) => {
      const slotEl = document.getElementById(slotId);
      if (!slotEl) return;
      this.attachLongPress(
        slotEl,
        // 長押し時: 盤面カードの詳細モーダル表示
        () => {
          this.handleSlotLongPress(side, type, index);
        },
        // クリック/タップ時: アクションまたは詳細表示
        () => {
          this.handleSlotClick(side, type, index);
        }
      );
    };

    for (let i = 0; i < 3; i++) {
      setupSlotEvents(`player-monster-${i}`, 'player', 'monster', i);
      setupSlotEvents(`player-support-${i}`, 'player', 'support', i);
      setupSlotEvents(`opp-monster-${i}`, 'opponent', 'monster', i);
      setupSlotEvents(`opp-support-${i}`, 'opponent', 'support', i);
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
   * スロット長押し処理（詳細モーダル表示）
   */
  handleSlotLongPress(side, type, index) {
    const sideObj = this.gs.getSide(side);
    const existingCard = type === 'monster' ? sideObj.monsterSlots[index] : sideObj.supportSlots[index];
    if (!existingCard) return;

    // 相手のトラップは伏せカードなので非公開
    if (side === 'opponent' && type === 'support' && existingCard.type === 'trap') {
      if (this.handHintText) {
        this.handHintText.textContent = '相手の伏せカード（トラップ）です（内容は非公開です）';
      }
      return;
    }

    // 味方カード全般、敵モンスター、および敵エンチャントは詳細モーダルを表示！
    this.showCardDetail(existingCard);
  }

  /**
   * スロットクリック処理（配置・対象選択・詳細表示）
   */
  handleSlotClick(side, type, index) {
    const sideObj = this.gs.getSide(side);
    const existingCard = type === 'monster' ? sideObj.monsterSlots[index] : sideObj.supportSlots[index];

    // 手札のダメージスペルが敵モンスターを狙っているか
    const isSpellTargetingMonster =
      this.selectedHandCard &&
      this.selectedHandCard.type === CARD_TYPES.SPELL &&
      this.selectedHandCard.spellType === 'damage_monster' &&
      side === 'opponent' &&
      type === 'monster';

    // 盤面カードが存在し、かつスペル攻撃の対象でない場合は詳細表示
    if (existingCard && !isSpellTargetingMonster) {
      if (side === 'opponent' && type === 'support' && existingCard.type === 'trap') {
        if (this.handHintText) {
          this.handHintText.textContent = '相手の伏せカード（トラップ）です（内容は非公開です）';
        }
        return;
      }
      // 味方カード、敵モンスター、および敵エンチャントは詳細モーダルを表示！
      this.showCardDetail(existingCard);
      return;
    }

    // プレイヤーのメインフェイズ以外は配置・詠唱アクションを行わない
    if (this.gs.isGameOver || this.gs.activePlayer !== 'player' || this.gs.phase !== 'main') {
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
    if (this.playerLifeBar) {
      const pLifePercent = Math.max(0, Math.min(100, (p.life / p.maxLife) * 100));
      this.playerLifeBar.style.width = `${pLifePercent}%`;
    }
    this.playerManaText.textContent = `${p.mana} / ${p.maxMana}`;
    this.playerHandCount.textContent = p.hand.length;
    this.playerDeckCount.textContent = p.deck.length;
    this.renderManaPips(this.playerManaPips, p.mana, p.maxMana);

    // 相手
    this.opponentLifeText.textContent = `${Math.max(0, opp.life)} / ${opp.maxLife}`;
    if (this.opponentLifeBar) {
      const oppLifePercent = Math.max(0, Math.min(100, (opp.life / opp.maxLife) * 100));
      this.opponentLifeBar.style.width = `${oppLifePercent}%`;
    }
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

    // 現在アニメーション中のフライテキスト（ダメージ数字等）を退避
    const activeFloatings = Array.from(slot.querySelectorAll('.floating-damage'));

    if (!cardData) {
      // 空スロットのプレースホルダー
      if (slotType === 'monster') {
        const laneName = slotId.endsWith('0') ? 'LEFT' : slotId.endsWith('1') ? 'CENTER' : 'RIGHT';
        slot.innerHTML = `<span class="slot-lane-indicator">${laneName}</span>`;
      } else {
        slot.innerHTML = `<span class="slot-placeholder">${owner === 'player' ? 'Trap / Support' : '伏せカード枠'}</span>`;
      }
      activeFloatings.forEach(f => slot.appendChild(f));
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
      // 企画書ルール: エンチャントは相手側でも公開情報、トラップのみが伏せカード
      const isOpponent = owner === 'opponent';
      const isSecretTrap = isOpponent && cardData.type === 'trap';
      const isEnchant = cardData.type === 'enchant';
      const cardTypeClass = isEnchant ? 'card-type-enchant' : 'card-type-trap';

      const costText = isSecretTrap ? '?' : cardData.cost;
      const nameText = isSecretTrap ? '伏せカード' : cardData.name;
      const iconText = isSecretTrap ? '🔒' : (cardData.emoji || (isEnchant ? '🌿' : '🔒'));
      const titleText = isSecretTrap
        ? '相手の伏せカード（トラップ）'
        : `${cardData.name} (コスト:${cardData.cost}) [${isEnchant ? 'エンチャント' : 'トラップ'}]\n${cardData.desc}\n※タップまたは長押しで拡大詳細`;

      slot.innerHTML = `
        <div class="card-view support-card-view ${cardTypeClass}" title="${titleText}">
          <div class="card-header-bar">
            <span class="card-cost-badge">${costText}</span>
            <span class="card-name-text">${nameText}</span>
            <span class="card-type-icon">${iconText}</span>
          </div>
          <div class="card-visual-frame" style="display:flex; justify-content:center; align-items:center; flex:1;">
            <span class="card-art-emoji" style="font-size: 1.15rem;">${iconText}</span>
          </div>
          <div class="card-stats-footer">
            <span style="font-size: 0.55rem; color: ${isEnchant ? '#06d6a0' : '#ef233c'}; width: 100%; text-align: center; font-weight: 800;">
              ${isSecretTrap ? '🔒TRAP' : isEnchant ? '🌿ENCHANT' : '🔒TRAP'}
            </span>
          </div>
        </div>
      `;
    }

    // 退避したフライテキストをDOMに戻す
    activeFloatings.forEach(f => slot.appendChild(f));
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

  /**
   * トラップ発動カットイン演出の再生
   * @param {Object} data { trap, ownerSideName, slotIndex, targetSideName, targetLane, actionTagText }
   */
  async playTrapCutin({ trap, ownerSideName, slotIndex, targetSideName, targetLane, actionTagText }) {
    if (!trap) return;

    const isPlayerTrap = ownerSideName === 'player';
    const ownerLabel = isPlayerTrap ? '👑 プレイヤーの伏せカードが発動！' : '💀 相手の伏せカードが作動！';

    this.trapOwner.textContent = ownerLabel;
    this.trapOwner.style.color = isPlayerTrap ? '#00d2ff' : '#ff758f';
    this.trapBadgeText.textContent = isPlayerTrap ? 'YOUR TRAP ACTIVATED!' : 'ENEMY TRAP TRIGGERED!';
    this.trapArt.textContent = trap.emoji || '🔒';
    this.trapName.textContent = trap.name;
    this.trapDesc.textContent = trap.desc;
    this.trapActionTag.textContent = actionTagText || '🛡️ トラップ効果発動！';

    // 発動したスロット（サポート枠）を激しく赤色発光させる
    const slotId = ownerSideName === 'player' ? `player-support-${slotIndex}` : `opp-support-${slotIndex}`;
    const supportSlotEl = document.getElementById(slotId);
    if (supportSlotEl) {
      supportSlotEl.classList.add('trap-activating');
    }

    // オーバーレイ表示
    this.trapOverlay.classList.add('active');

    // 1.3秒間プレイヤーにしっかり提示
    await new Promise(r => setTimeout(r, 1300));

    // オーバーレイ非表示
    this.trapOverlay.classList.remove('active');
    if (supportSlotEl) {
      supportSlotEl.classList.remove('trap-activating');
    }

    // 対象モンスター枠にリアクション表示
    if (targetSideName && targetLane !== undefined && targetLane !== null) {
      const targetSlotId = targetSideName === 'player' ? `player-monster-${targetLane}` : `opp-monster-${targetLane}`;
      const targetSlotEl = document.getElementById(targetSlotId);
      if (targetSlotEl) {
        targetSlotEl.classList.add('shake-effect');
        setTimeout(() => targetSlotEl.classList.remove('shake-effect'), 400);

        // ガード / 反射ダメージフロート
        const floatTag = document.createElement('div');
        floatTag.className = 'floating-damage';
        floatTag.style.color = '#ffb703';
        floatTag.style.fontSize = '0.82rem';
        floatTag.style.whiteSpace = 'nowrap';
        floatTag.textContent = actionTagText || '💥 TRAP HIT!';
        targetSlotEl.appendChild(floatTag);
        setTimeout(() => floatTag.remove(), 900);
      }
    }

    await new Promise(r => setTimeout(r, 300));
  }
}
