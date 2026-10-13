import { GameState } from './gameState.js';
import { CombatResolver } from './combat.js';
import { OpponentAI } from './ai.js';
import { UIManager } from './ui.js';

let gameState;
let combatResolver;
let opponentAI;
let ui;

/**
 * ゲーム初期化
 */
function initGame() {
  gameState = new GameState();

  const animationCallbacks = {
    onCombatStart: async (attackingSide) => {
      const label = attackingSide === 'player' ? '自軍 戦闘フェイズ' : '敵軍 戦闘フェイズ';
      await ui.showPhaseBanner(label);
    },
    onAttackMotion: async (attackingSide, lane) => {
      await ui.playAttackMotion(attackingSide, lane);
    },
    onDamage: (defendingSide, lane, amount) => {
      ui.playMonsterDamage(defendingSide, lane, amount);
    },
    onDirectAttackDamage: (defendingSide, amount) => {
      ui.playDirectDamage(defendingSide, amount);
    },
    onUpdateUI: () => {
      ui.render();
    },
    onCombatEnd: async () => {
      ui.render();
    }
  };

  combatResolver = new CombatResolver(gameState, animationCallbacks);
  opponentAI = new OpponentAI(gameState, () => ui.render());
  ui = new UIManager(gameState, handleUserAction);

  ui.render();
}

/**
 * ユーザーからのアクションハンドラ
 */
async function handleUserAction(action, data) {
  if (gameState.isGameOver) return;

  switch (action) {
    case 'summon-monster': {
      const res = gameState.summonMonster('player', data.cardUid, data.slotIndex);
      if (!res.success) {
        alert(res.reason);
      }
      ui.render();
      break;
    }

    case 'deploy-support': {
      const res = gameState.deploySupport('player', data.cardUid, data.slotIndex);
      if (!res.success) {
        alert(res.reason);
      }
      ui.render();
      break;
    }

    case 'cast-spell': {
      const res = gameState.castSpell('player', data.cardUid, data.target);
      if (!res.success) {
        alert(res.reason);
      }
      ui.render();
      break;
    }

    case 'end-turn': {
      // プレイヤーターンの終了フロー
      await executePlayerTurnEndFlow();
      break;
    }

    case 'restart': {
      initGame();
      break;
    }
  }
}

/**
 * ターン終了から戦闘フェイズ、そしてNPCターンへの進行フロー
 */
async function executePlayerTurnEndFlow() {
  // 1. プレイヤーの戦闘フェイズ（自動進行）
  await combatResolver.resolveCombatPhase('player');
  ui.render();

  if (gameState.isGameOver) return;

  // 2. 相手（NPC）のターン開始
  gameState.startNewTurn('opponent');
  ui.render();

  // 3. NPCのメインフェイズ（自動思考＆行動）
  await opponentAI.playTurn();
  ui.render();

  if (gameState.isGameOver) return;

  // 4. NPCの戦闘フェイズ（自動進行）
  await combatResolver.resolveCombatPhase('opponent');
  ui.render();

  if (gameState.isGameOver) return;

  // 5. プレイヤーのターン開始へ戻る
  gameState.startNewTurn('player');
  ui.render();
}

// アプリケーション起動
window.addEventListener('DOMContentLoaded', () => {
  initGame();
});
