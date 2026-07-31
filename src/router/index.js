import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import LobbyView from '../views/LobbyView.vue'
import WaitingRoomView from '../views/WaitingRoomView.vue'
import GameView from '../views/GameView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'login',
            component: LoginView // 로그인 화면
        },
        {
            path: '/lobby',
            name: 'lobby',
            component: LobbyView // 로비 화면
        },
        {
            path: '/waiting',
            name: 'waiting',
            component: WaitingRoomView // 대기실 화면
        },
        {
            path: '/game',
            name: 'game',
            component: GameView // 게임 화면
        }
    ]
})

export default router