import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useUserStore = defineStore('user', () => {
    // ⭐️ 2번 해결: 앱 실행/새로고침 시 localStorage에 저장된 유저 정보가 있는지 먼저 확인합니다.
    const currentUser = ref(JSON.parse(localStorage.getItem('currentUser')) || null)

    // 로그인 액션
    const login = async (username, password) => {
        const response = await api.post('/users/login', { username, password })
        // 성공 시 세션 유지를 위해 me API를 한 번 더 호출해 정확한 유저 정보를 세팅합니다.
        await checkSession()
        return response.data
    }

    // 회원가입 액션
    const signup = async (username, password, nickname) => {
        const response = await api.post('/users/signup', { username, password, nickname })
        return response.data
    }

    // 세션(로그인 상태) 확인 액션
    const checkSession = async () => {
        try {
            const response = await api.get('/users/me')
            currentUser.value = response.data
            // ⭐️ 로그인/세션 확인 성공 시 유저 정보를 브라우저 저장소(localStorage)에 기록합니다.
            localStorage.setItem('currentUser', JSON.stringify(response.data))
        } catch (error) {
            currentUser.value = null
            // ⭐️ 세션이 만료되거나 에러가 나면 저장소에서도 확실히 지워줍니다.
            localStorage.removeItem('currentUser')
        }
    }

    // 로그아웃 액션
    const logout = async () => {
        try {
            // 서버에 로그아웃 요청을 시도합니다.
            await api.post('/users/logout')
        } catch (error) {
            console.error('서버 로그아웃 통신 실패 (하지만 강제로 로그아웃 처리합니다)', error)
        } finally {
            // ⭐️ 핵심: 서버 통신이 실패하든 성공하든 내 컴퓨터의 정보는 무조건 지웁니다!
            currentUser.value = null
            localStorage.removeItem('currentUser')
        }
    }

    return { currentUser, login, signup, checkSession, logout }
})