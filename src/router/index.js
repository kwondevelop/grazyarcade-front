import { createRouter, createWebHistory } from 'vue-router'
// 만들어둔 뷰 파일들을 가져옵니다.
import LoginView from '../views/LoginView.vue'
import LobbyView from '../views/LobbyView.vue'
import GameView from '../views/GameView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'login',
            component: LoginView // 처음 접속하면 로그인 화면
        },
        {
            path: '/lobby',
            name: 'lobby',
            component: LobbyView // 로비 화면
        },
        {
            path: '/game',
            name: 'game',
            component: GameView // 우리가 방금 만든 게임 화면!
        }
    ]
})

export default router