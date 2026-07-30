<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- URL 주소에 따라 LoginView, LobbyView, GameView로 바뀝니다. -->
  <RouterView />
</template>

<style>
/* 전역 스타일 설정 */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  font-family: 'Noto Sans KR', sans-serif;
}
</style>