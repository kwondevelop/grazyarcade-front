import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 방금 만든 라우터 불러오기

const app = createApp(App)

app.use(router) // 뷰 앱에 라우터 장착!
app.mount('#app')