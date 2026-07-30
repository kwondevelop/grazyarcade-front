<script setup>
import GameBoard from '../components/GameBoard.vue'
</script>

<template>
  <div class="game-view">
    <header class="game-header">
      <h1>🚀 크레이지 아케이드 (로컬 테스트)</h1>
      <div class="status">
        <!-- 나중에 여기에 남은 시간, 점수 등을 넣을 수 있습니다. -->
        <span>Player 1</span>
      </div>
    </header>

    <!-- 게임 보드 컴포넌트를 여기에 쏙 집어넣습니다. -->
    <main class="game-main">
      <GameBoard />
    </main>
  </div>
</template>

<style scoped>
.game-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background-color: #2c3e50; /* 전체 배경을 어둡게 */
  color: white;
  padding-top: 50px;
}

.game-header {
  text-align: center;
  margin-bottom: 20px;
}

.game-header h1 {
  margin: 0 0 10px 0;
  color: #f1c40f;
}

.status {
  font-size: 1.2rem;
  font-weight: bold;
}

.game-main {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>