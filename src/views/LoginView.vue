<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const isSignupMode = ref(false) // 로그인/회원가입 모드 전환용 상태
const username = ref('')
const password = ref('')
const nickname = ref('') // 회원가입 시 필요
const selectedServer = ref('happy') // UI용 임시 서버 선택

// 로그인 또는 회원가입 처리 함수
const handleSubmit = async () => {
    if (!username.value || !password.value) {
        alert('아이디와 비밀번호를 입력해주세요.')
        return
    }

    if (isSignupMode.value) {
        // [회원가입 모드]
        if (!nickname.value) {
            alert('닉네임을 입력해주세요.')
            return
        }
        try {
            await userStore.signup(username.value, password.value, nickname.value)
            alert('회원가입이 완료되었습니다! 로그인을 진행해주세요.')
            isSignupMode.value = false // 회원가입 성공 시 로그인 모드로 전환
            password.value = '' // 비밀번호 입력창 초기화
        } catch (error) {
            alert(error.response?.data || '회원가입에 실패했습니다.')
        }
    } else {
        // [로그인 모드]
        try {
            await userStore.login(username.value, password.value)
            alert(`환영합니다, ${userStore.currentUser.nickname}님!`)
            router.push('/lobby') // 로그인 성공 시 로비로 이동
        } catch (error) {
            alert(error.response?.data || '로그인에 실패했습니다.')
        }
    }
}

// 모드 전환 함수
const toggleMode = () => {
    isSignupMode.value = !isSignupMode.value
    username.value = ''
    password.value = ''
    nickname.value = ''
}
</script>

<template>
<div class="login-wrapper">
    
    <div class="bg-graphic-area">
        <div class="logo-placeholder">Crazy Arcade</div>
    </div>

    <div class="login-ui-container">
        
        <!-- [좌측] 메인 액션 버튼 (로그인/회원가입) -->
        <button class="side-btn p1-btn" @click="handleSubmit">
            <span class="btn-text">{{ isSignupMode ? '가입' : '접속' }}</span>
        </button>

        <!-- [중앙] 메인 입력 폼 -->
        <div class="center-form-panel">
            
            <div class="server-select-section">
                <div class="section-title">서버 선택</div>
                <div class="server-options">
                    <label class="server-label">
                        <input type="radio" value="dream" v-model="selectedServer"> 드림
                    </label>
                    <label class="server-label">
                        <input type="radio" value="happy" v-model="selectedServer"> 해피
                    </label>
                </div>
            </div>

            <div class="player-label">{{ isSignupMode ? '새 계정 만들기' : '1PLAYER' }}</div>

            <div class="input-section">
                <div class="input-row">
                    <span class="input-label">아이디</span>
                    <input type="text" v-model="username" @keyup.enter="handleSubmit" />
                </div>
                <div class="input-row">
                    <span class="input-label">비밀번호</span>
                    <input type="password" v-model="password" @keyup.enter="handleSubmit" />
                </div>
                <!-- 회원가입 모드일 때만 나타나는 닉네임 입력칸 -->
                <div class="input-row" v-if="isSignupMode">
                    <span class="input-label">닉네임</span>
                    <input type="text" v-model="nickname" @keyup.enter="handleSubmit" />
                </div>
            </div>
            
        </div>

        <!-- [우측] 모드 전환 버튼 -->
        <button class="side-btn p2-btn" @click="toggleMode">
            <span class="btn-text" style="font-size: 1.1rem;">
                {{ isSignupMode ? '로그인\n돌아가기' : '회원가입' }}
            </span>
        </button>

    </div>
</div>
</template>

<style scoped>
.login-wrapper {
    display: flex;
    flex-direction: column;
    width: 800px;
    height: 600px;
    background-color: #0984e3; 
    position: relative;
    font-family: sans-serif;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
    margin: 0 auto;
}

.bg-graphic-area {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    border-bottom: 2px dashed rgba(255,255,255,0.3);
}

.logo-placeholder {
    font-size: 3rem;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 3px 3px 6px rgba(0,0,0,0.6);
}

.login-ui-container {
    height: 220px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px; 
    padding-bottom: 30px;
}

.side-btn {
    width: 80px;
    height: 120px;
    border-radius: 20px; 
    border: 4px solid #34495e;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: inset 0 0 10px rgba(255,255,255,0.5), 0 5px 10px rgba(0,0,0,0.4);
    transition: transform 0.1s;
    text-align: center;
    white-space: pre-wrap; /* 줄바꿈 허용 */
}

.side-btn:active {
    transform: scale(0.95);
}

.btn-text {
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

.p1-btn {
    background-color: #3498db;
}

.p2-btn {
    background-color: #2ecc71;
}

.center-form-panel {
    width: 300px;
    /* 회원가입 폼이 생기면 세로로 조금 길어지도록 유동적 높이 설정 */
    min-height: 140px; 
    background-color: #f39c12; 
    border: 4px solid #d35400;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    padding: 8px;
    box-shadow: inset 0 0 10px rgba(255,255,255,0.3), 0 5px 10px rgba(0,0,0,0.4);
}

.server-select-section {
    background-color: #f1c40f;
    border: 2px solid #e67e22;
    border-radius: 8px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 5px;
}

.section-title {
    font-size: 0.7rem;
    font-weight: bold;
    color: #d35400;
    margin-bottom: 2px;
}

.server-options {
    display: flex;
    gap: 10px;
}

.server-label {
    font-size: 0.8rem;
    font-weight: bold;
    background: #3498db;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #2980b9;
    cursor: pointer;
}

.player-label {
    text-align: center;
    font-size: 0.8rem;
    font-weight: bold;
    color: #c0392b;
    margin-bottom: 5px;
}

.input-section {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background-color: #e67e22;
    padding: 8px;
    border-radius: 8px;
    border: 2px solid #d35400;
}

.input-row {
    display: flex;
    align-items: center;
}

.input-label {
    width: 70px; /* 닉네임 글자를 위해 넓이 조정 */
    font-size: 0.8rem;
    font-weight: bold;
    color: white;
    text-align: center;
    background-color: #2980b9;
    padding: 4px 0;
    border: 1px solid #1c5980;
    margin-right: 5px;
}

.input-row input {
    flex: 1;
    border: 2px solid #333;
    padding: 3px 5px;
    outline: none;
}
</style>