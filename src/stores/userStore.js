import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export const useUserStore = defineStore('user', () => {
    const currentUser = ref(null)

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
        } catch (error) {
            currentUser.value = null
        }
    }

    // 로그아웃 액션
    const logout = async () => {
        await api.post('/users/logout')
        currentUser.value = null
    }

    return { currentUser, login, signup, checkSession, logout }
})