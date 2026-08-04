<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const isSignupMode = ref(false)
const username = ref('')
const password = ref('')
const nickname = ref('')
const selectedServer = ref('happy')

const handleSubmit = async () => {
    if (!username.value || !password.value) {
        alert('아이디와 비밀번호를 입력해주세요.')
        return
    }

    if (isSignupMode.value) {
        if (!nickname.value) {
            alert('닉네임을 입력해주세요.')
            return
        }
        try {
            await userStore.signup(username.value, password.value, nickname.value)
            alert('회원가입이 완료되었습니다! 로그인을 진행해주세요.')
            isSignupMode.value = false
            password.value = ''
        } catch (error) {
            alert(error.response?.data || '회원가입에 실패했습니다.')
        }
    } else {
        try {
            await userStore.login(username.value, password.value)
            alert(`환영합니다, ${userStore.currentUser.nickname}님!`)
            router.push('/lobby')
        } catch (error) {
            alert(error.response?.data || '로그인에 실패했습니다.')
        }
    }
}

const toggleMode = () => {
    isSignupMode.value = !isSignupMode.value
    username.value = ''
    password.value = ''
    nickname.value = ''
}
</script>

<template>
<div class="login-wrapper">
    
    <!-- [상단] 게임 타이틀 및 그래픽 영역 -->
    <div class="bg-graphic-area">
        <div class="logo-box">
            <h1 class="logo-text">GRAZY<br>ARCADE</h1>
            <div class="logo-shadow"></div>
        </div>
    </div>

    <!-- [하단] 로그인 UI 영역 -->
    <div class="login-ui-container">
        
        <!-- [좌측] 메인 액션 버튼 -->
        <button class="side-btn p1-btn" @click="handleSubmit">
            <span class="btn-text">{{ isSignupMode ? '가입' : '접속' }}</span>
        </button>

        <!-- [중앙] 메인 입력 폼 -->
        <div class="center-form-panel">
            
            <div class="server-select-section">
                <div class="section-title">SERVER SELECT</div>
                <div class="server-options">
                    <label class="server-label" :class="{ active: selectedServer === 'dream' }">
                        <input type="radio" value="dream" v-model="selectedServer" hidden> 
                        드림
                    </label>
                    <label class="server-label" :class="{ active: selectedServer === 'happy' }">
                        <input type="radio" value="happy" v-model="selectedServer" hidden> 
                        해피
                    </label>
                </div>
            </div>

            <div class="player-label">{{ isSignupMode ? 'NEW PLAYER' : '1 PLAYER' }}</div>

            <div class="input-section">
                <div class="input-row">
                    <span class="input-label">아이디</span>
                    <input type="text" v-model="username" @keyup.enter="handleSubmit" placeholder="ID" />
                </div>
                <div class="input-row">
                    <span class="input-label">비밀번호</span>
                    <input type="password" v-model="password" @keyup.enter="handleSubmit" placeholder="PASSWORD" />
                </div>
                <div class="input-row" v-if="isSignupMode">
                    <span class="input-label">닉네임</span>
                    <input type="text" v-model="nickname" @keyup.enter="handleSubmit" placeholder="NICKNAME" />
                </div>
            </div>
            
        </div>

        <!-- [우측] 모드 전환 버튼 -->
        <button class="side-btn p2-btn" @click="toggleMode">
            <span class="btn-text p2-text">
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
    background-color: #1e90ff; /* 크아 시그니처 블루 */
    position: relative;
    font-family: 'Black Han Sans', 'Noto Sans KR', sans-serif;
    overflow: hidden;
    border-radius: 12px;
    border: 6px solid #003366;
    margin: 0 auto;
    box-shadow: 0 15px 30px rgba(0,0,0,0.5);
    user-select: none;
}

/* 상단 그래픽 (로고) */
.bg-graphic-area {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    background: radial-gradient(circle, #4dabf7 0%, #1e90ff 70%);
    border-bottom: 6px solid #003366;
    position: relative;
    overflow: hidden;
}

/* 로고 애니메이션 및 입체 효과 */
.logo-box { position: relative; text-align: center; transform: rotate(-5deg); animation: float 3s ease-in-out infinite; }
.logo-text { font-size: 5rem; font-weight: 900; line-height: 1; color: #f1c40f; text-shadow: 4px 4px 0px #e74c3c, 8px 8px 0px #003366; margin: 0; position: relative; z-index: 2; letter-spacing: 2px; }

@keyframes float {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-15px) rotate(-3deg); }
}

/* 하단 UI 컨테이너 */
.login-ui-container {
    height: 240px;
    background-color: #0b385e; /* 다크 블루 패널 */
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px; 
    padding-bottom: 20px;
    position: relative;
}

/* 좌우 왕버튼 (3D 아케이드 버튼 스타일) */
.side-btn {
    width: 120px; /* ⭐️ 기존 90px에서 120px로 넓혀서 글씨가 들어갈 공간 확보! */
    height: 140px;
    border-radius: 15px; 
    border: 5px solid #001f3f;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.1s;
    text-align: center;
    white-space: pre-wrap; /* \n(줄바꿈) 인식을 위해 유지 */
    margin-top: 15px;
}

.p1-btn {
    background-color: #ff4757;
    box-shadow: inset -4px -4px 0px rgba(0,0,0,0.2), inset 4px 4px 0px rgba(255,255,255,0.4), 0 8px 0px #c0392b, 0 12px 10px rgba(0,0,0,0.5);
}

.p2-btn {
    background-color: #2ecc71;
    box-shadow: inset -4px -4px 0px rgba(0,0,0,0.2), inset 4px 4px 0px rgba(255,255,255,0.4), 0 8px 0px #27ae60, 0 12px 10px rgba(0,0,0,0.5);
}

.side-btn:active {
    transform: translateY(8px);
    box-shadow: inset -4px -4px 0px rgba(0,0,0,0.2), inset 4px 4px 0px rgba(255,255,255,0.4), 0 0px 0px transparent, 0 4px 5px rgba(0,0,0,0.5);
}

.btn-text {
    font-size: 1.8rem;
    font-weight: 900;
    color: white;
    text-shadow: 2px 2px 0px #000;
    letter-spacing: 1px;
    word-break: keep-all; /* ⭐️ 글자 중간에 맘대로 줄바꿈 되는 것을 방지 (회원가 / 입 방지) */
    line-height: 1.2;
}

/* 우측 버튼 글자 크기는 두 줄이 들어가야 하니 살짝 줄임 */
.p2-text { 
    font-size: 1.4rem; 
}

/* 중앙 폼 패널 */
.center-form-panel {
    width: 320px;
    min-height: 160px; 
    background-color: #f1c40f; 
    border: 5px solid #cc8800;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    padding: 12px;
    box-shadow: 0 8px 15px rgba(0,0,0,0.4);
    position: relative;
    top: -10px; /* 살짝 위로 튀어나온 디자인 */
}

/* 서버 선택 */
.server-select-section {
    background-color: #0b385e;
    border: 3px solid #001f3f;
    border-radius: 8px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 8px;
}

.section-title {
    font-size: 0.8rem;
    font-weight: 900;
    color: #f1c40f;
    margin-bottom: 6px;
    letter-spacing: 1px;
}

.server-options { display: flex; gap: 15px; }

.server-label {
    font-size: 0.9rem;
    font-weight: bold;
    background: #34495e;
    color: #bdc3c7;
    padding: 4px 15px;
    border-radius: 20px;
    border: 3px solid #2c3e50;
    cursor: pointer;
    transition: 0.2s;
}

.server-label.active {
    background: #e74c3c;
    color: white;
    border-color: #c0392b;
    box-shadow: 0 0 10px rgba(231,76,60,0.5);
}

/* 플레이어 라벨 */
.player-label {
    text-align: center;
    font-size: 1rem;
    font-weight: 900;
    color: #c0392b;
    margin-bottom: 8px;
    text-shadow: 1px 1px 0px #fff;
    letter-spacing: 2px;
}

/* 입력창 섹션 */
.input-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background-color: #e67e22;
    padding: 10px;
    border-radius: 8px;
    border: 3px solid #d35400;
}

.input-row { display: flex; align-items: center; }

.input-label {
    width: 75px; 
    font-size: 0.85rem;
    font-weight: 900;
    color: white;
    text-align: center;
    background-color: #0b385e;
    padding: 6px 0;
    border: 2px solid #001f3f;
    border-radius: 4px 0 0 4px;
}

.input-row input {
    flex: 1;
    border: 2px solid #001f3f;
    border-left: none;
    border-radius: 0 4px 4px 0;
    padding: 6px 8px;
    font-size: 0.9rem;
    font-weight: bold;
    outline: none;
    background-color: #fff;
    color: #333;
}
.input-row input:focus { background-color: #fffdf0; }
</style>