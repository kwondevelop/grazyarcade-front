<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import api from '../services/api'

const router = useRouter()
const userStore = useUserStore()
const roomList = ref([])

// 방 목록 불러오기
const fetchRooms = async () => {
    try {
        const res = await api.get('/rooms')
        roomList.value = res.data
    } catch (error) {
        console.error('방 목록을 불러오지 못했습니다.', error)
    }
}

// 방 만들기
const createRoom = async () => {
    if (!userStore.currentUser) {
        alert('로그인이 필요합니다.')
        router.push('/login')
        return
    }
    const title = prompt('방 제목을 입력하세요:')
    if (!title) return

    try {
        const res = await api.post('/rooms', { 
            title: title, 
            host: userStore.currentUser.nickname 
        })
        const newRoomId = res.data.roomId
        // 방 생성 후 대기실로 이동
        router.push({ path: '/waiting', query: { roomId: newRoomId } })
    } catch (error) {
        alert('방 생성에 실패했습니다.')
    }
}

// 방 입장하기
const joinRoom = (roomId) => {
    if (!userStore.currentUser) {
        alert('로그인이 필요합니다.')
        router.push('/')
        return
    }
    router.push({ path: '/waiting', query: { roomId } })
}

// 로그아웃
const handleLogout = async () => {
    await userStore.logout()
    router.push('/')
}

onMounted(() => {
    fetchRooms()
})
</script>

<template>
<div class="lobby-wrapper">
    
    <!-- [상단] 로비 헤더 -->
    <div class="lobby-header">
        <div class="header-logo">GRAZY ARCADE <span>LOBBY</span></div>
        <div class="header-user" v-if="userStore.currentUser">
            <span class="user-greeting">반갑습니다, <strong>{{ userStore.currentUser.nickname }}</strong>님!</span>
            <button class="btn-logout" @click="handleLogout">로그아웃</button>
        </div>
    </div>

    <div class="main-content">
        
        <!-- [좌측] 사이드바 (내 정보 & 접속자) -->
        <div class="left-sidebar">
            
            <!-- 내 정보 카드 -->
            <div class="info-card profile-card">
                <div class="card-title">MY PROFILE</div>
                <div class="card-body" v-if="userStore.currentUser">
                    <div class="profile-header">
                        <div class="avatar-box"></div>
                        <div class="level-box">Lv.{{ userStore.currentUser.level }}</div>
                    </div>
                    <div class="stats-box">
                        <div class="stat-row">
                            <span>승리</span>
                            <span class="text-blue">{{ userStore.currentUser.winCount }}</span>
                        </div>
                        <div class="stat-row">
                            <span>패배</span>
                            <span class="text-red">{{ userStore.currentUser.loseCount }}</span>
                        </div>
                        <div class="stat-row total-rate">
                            <span>승률</span>
                            <span>{{ 
                                userStore.currentUser.winCount + userStore.currentUser.loseCount === 0 
                                ? 0 
                                : Math.round((userStore.currentUser.winCount / (userStore.currentUser.winCount + userStore.currentUser.loseCount)) * 100) 
                            }}%</span>
                        </div>
                    </div>
                </div>
                <div class="card-body empty-body" v-else>
                    로그인 정보 없음
                </div>
            </div>

            <!-- 서버 접속자 카드 -->
            <div class="info-card user-list-card">
                <div class="card-title">SERVER USERS</div>
                <div class="card-body user-list-box">
                    <div class="user-item" v-if="userStore.currentUser">
                        <span class="status-dot"></span>
                        Lv.{{ userStore.currentUser.level }} {{ userStore.currentUser.nickname }} (나)
                    </div>
                </div>
            </div>
            
        </div>

        <!-- [우측] 메인 패널 (액션 버튼 & 방 목록) -->
        <div class="right-main">
            
            <!-- 상단 액션 버튼 -->
            <div class="action-bar">
                <button class="btn-arcade btn-create" @click="createRoom">
                    <span>방 만들기</span>
                </button>
                <button class="btn-arcade btn-refresh" @click="fetchRooms">
                    <span>새로고침</span>
                </button>
            </div>

            <!-- 방 목록 그리드 -->
            <div class="room-grid-section">
                <div class="room-grid">
                    <div 
                        class="room-card" 
                        v-for="room in roomList" 
                        :key="room.roomId"
                        @click="joinRoom(room.roomId)"
                    >
                        <div class="room-id">NO. {{ room.roomId }}</div>
                        <div class="room-title">{{ room.title }}</div>
                        <div class="room-footer">
                            <span class="host-name">👑 {{ room.host }}</span>
                            <span class="status-badge" :class="{ 'playing': room.status !== 'WAITING' }">
                                {{ room.status === 'WAITING' ? '대기중' : '게임중' }}
                            </span>
                        </div>
                    </div>
                    
                    <!-- 방이 없을 때 -->
                    <div v-if="roomList.length === 0" class="empty-room">
                        <div class="empty-icon">🎮</div>
                        <div>현재 개설된 방이 없습니다.<br>직접 방을 만들어보세요!</div>
                    </div>
                </div>
            </div>

            <!-- 채팅창 -->
            <div class="chat-section">
                <div class="chat-header">SERVER CHAT</div>
                <div class="chat-display">서버 전체 채팅 준비중...</div>
            </div>
            
        </div>
    </div>
</div>
</template>

<style scoped>
.lobby-wrapper {
    display: flex;
    flex-direction: column;
    width: 800px; 
    height: 600px;
    background-color: #1e90ff; 
    border: 6px solid #003366;
    border-radius: 12px;
    box-sizing: border-box;
    font-family: 'Noto Sans KR', sans-serif;
    margin: 0 auto;
    box-shadow: 0 15px 30px rgba(0,0,0,0.5);
    user-select: none;
}

/* 상단 헤더 */
.lobby-header {
    height: 50px;
    background-color: #0b385e;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    border-bottom: 5px solid #001f3f;
}

.header-logo {
    font-size: 1.5rem;
    font-weight: 900;
    color: #f1c40f;
    text-shadow: 2px 2px 0px #000;
    letter-spacing: 1px;
}
.header-logo span { font-size: 1rem; color: #fff; }

.header-user { display: flex; align-items: center; gap: 15px; }
.user-greeting { color: white; font-size: 0.9rem; }
.user-greeting strong { color: #f1c40f; font-size: 1rem; }

.btn-logout {
    background-color: #e74c3c;
    color: white;
    border: 3px solid #c0392b;
    padding: 4px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 900;
    transition: 0.1s;
}
.btn-logout:active { transform: translateY(2px); }

/* 메인 레이아웃 */
.main-content {
    display: flex;
    flex: 1;
    gap: 15px;
    padding: 15px;
    overflow: hidden;
}

/* [좌측] 사이드바 */
.left-sidebar {
    width: 220px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.info-card {
    background: #007bff;
    border: 4px solid #001f3f;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
}

.card-title {
    background: #001f3f;
    color: #f1c40f;
    text-align: center;
    padding: 6px;
    font-weight: 900;
    font-size: 0.9rem;
    letter-spacing: 1px;
}

.card-body { padding: 10px; flex: 1; }
.empty-body { color: white; text-align: center; font-weight: bold; padding: 20px 0; }

/* 프로필 내부 */
.profile-card { height: auto; }
.profile-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 15px; }
.avatar-box { width: 70px; height: 70px; background-color: #ff4757; border: 4px solid #fff; border-radius: 50%; box-shadow: 0 4px 0px rgba(0,0,0,0.2); margin-bottom: -15px; z-index: 1; }
.level-box { background: #34495e; color: white; padding: 2px 15px; border-radius: 10px; border: 2px solid #2c3e50; font-weight: 900; font-size: 0.8rem; z-index: 2; }

.stats-box { background: rgba(255,255,255,0.95); border: 3px solid #001f3f; border-radius: 8px; padding: 8px; }
.stat-row { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 900; margin-bottom: 5px; color: #333; }
.text-blue { color: #0984e3; }
.text-red { color: #d63031; }
.total-rate { border-top: 2px dashed #ccc; padding-top: 5px; margin-top: 5px; color: #e67e22; }

/* 접속자 목록 */
.user-list-card { flex: 1; }
.user-list-box { overflow-y: auto; padding: 10px; }
.user-item { background: rgba(0,0,0,0.3); color: white; margin-bottom: 6px; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; display: flex; align-items: center; }
.status-dot { width: 8px; height: 8px; background: #2ecc71; border-radius: 50%; margin-right: 8px; box-shadow: 0 0 5px #2ecc71; }

/* [우측] 메인 패널 */
.right-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

/* 상단 액션 버튼 */
.action-bar {
    display: flex;
    gap: 10px;
}

.btn-arcade {
    flex: 1;
    height: 50px;
    border-radius: 10px;
    border: 4px solid #001f3f;
    cursor: pointer;
    font-weight: 900;
    font-size: 1.1rem;
    color: white;
    text-shadow: 1px 1px 0px #000;
    transition: 0.1s;
    box-shadow: inset 0 -4px 0 rgba(0,0,0,0.2);
}
.btn-arcade:active { transform: translateY(4px); box-shadow: inset 0 0px 0 rgba(0,0,0,0.2); }

.btn-create { background-color: #f1c40f; color: #333; text-shadow: none; border-color: #cc8800; box-shadow: inset 0 -4px 0 rgba(0,0,0,0.1); }
.btn-refresh { background-color: #2ecc71; border-color: #27ae60; }

/* 방 목록 그리드 */
.room-grid-section {
    flex: 1;
    background: #0b385e;
    border: 4px solid #001f3f;
    border-radius: 10px;
    padding: 15px;
    overflow-y: auto;
    box-shadow: inset 4px 4px 10px rgba(0,0,0,0.3);
}

.room-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 90px;
    gap: 12px;
}

/* 방 카드 디자인 */
.room-card {
    background: #fff;
    border: 4px solid #34495e;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;
    cursor: pointer;
    box-shadow: 0 4px 0 #34495e;
    transition: 0.1s;
}

.room-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 #34495e;
    border-color: #f1c40f;
}
.room-card:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 #34495e;
}

.room-id { font-size: 0.75rem; color: #7f8c8d; font-weight: 900; }
.room-title { font-size: 1.1rem; font-weight: 900; color: #2c3e50; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.room-footer { display: flex; justify-content: space-between; align-items: center; }
.host-name { font-size: 0.8rem; font-weight: bold; color: #2980b9; }

.status-badge {
    background: #2ecc71;
    color: white;
    font-size: 0.7rem;
    font-weight: 900;
    padding: 3px 8px;
    border-radius: 12px;
    border: 2px solid #27ae60;
}
.status-badge.playing { background: #e74c3c; border-color: #c0392b; }

.empty-room {
    grid-column: span 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: rgba(255,255,255,0.6);
    font-weight: bold;
    font-size: 1.1rem;
    text-align: center;
    margin-top: 40px;
}
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.8; }

/* 채팅창 */
.chat-section {
    height: 110px;
    background: #34495e;
    border: 4px solid #001f3f;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
}

.chat-header {
    background: #001f3f;
    color: #f1c40f;
    font-size: 0.8rem;
    font-weight: 900;
    padding: 4px 10px;
}

.chat-display {
    flex: 1;
    padding: 10px;
    color: #bdc3c7;
    font-weight: bold;
    font-size: 0.85rem;
}
</style>