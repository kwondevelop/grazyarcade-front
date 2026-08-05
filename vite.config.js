import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // ⭐️ 이 부분을 추가해 주세요!
  server: {
    port: 5174, // 내가 원하는 포트 번호 고정
    strictPort: true, // 5174이 사용 중이면 다른 포트로 안 넘어가고 그냥 에러를 띄움 (오류 방지)
  }
})