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
        return
    }
    router.push({ path: '/waiting', query: { roomId } })
}

// 로그아웃
const handleLogout = async () => {
    await userStore.logout()
    router.push('/login')
}

onMounted(() => {
    fetchRooms()
})
</script>

<template>
<div class="lobby-wrapper">
    <div class="main-content">
        
        <!-- [좌측] 내 정보 패널 -->
        <div class="left-sidebar">
            <div class="profile-section">
                <div class="character-preview">
                    <!-- 유저 정보가 있을 때 렌더링 -->
                    <div v-if="userStore.currentUser" class="user-info">
                        <h3>Lv.{{ userStore.currentUser.level }} {{ userStore.currentUser.nickname }}</h3>
                        <p>승리: {{ userStore.currentUser.winCount }}</p>
                        <p>패배: {{ userStore.currentUser.loseCount }}</p>
                        <p>승률: {{ 
                            userStore.currentUser.winCount + userStore.currentUser.loseCount === 0 
                            ? 0 
                            : Math.round((userStore.currentUser.winCount / (userStore.currentUser.winCount + userStore.currentUser.loseCount)) * 100) 
                        }}%</p>
                    </div>
                    <div v-else>
                        로그인 정보 없음
                    </div>
                </div>
            </div>
            <div class="user-list-section">
                <div class="user-list-header">서버 접속자</div>
                <div class="user-list-box">
                    <div class="user-item" v-if="userStore.currentUser">
                        Lv.{{ userStore.currentUser.level }} {{ userStore.currentUser.nickname }} (나)
                    </div>
                </div>
            </div>
        </div>

        <!-- [우측] 방 목록 패널 -->
        <div class="right-main">
            <div class="top-buttons">
                <div class="primary-btns">
                    <button class="btn-create" @click="createRoom">방만들기</button>
                    <button class="btn-quick" @click="fetchRooms">새로고침</button>
                </div>
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
                        <div class="room-title">{{ room.title }}</div>
                        <div class="room-status">
                            <span>방장: {{ room.host }}</span>
                            <span>[{{ room.status }}]</span>
                        </div>
                    </div>
                    <div v-if="roomList.length === 0" class="empty-room">
                        생성된 방이 없습니다.
                    </div>
                </div>
            </div>

            <div class="chat-section">
                <div class="chat-display">서버 전체 채팅 준비중...</div>
            </div>
        </div>
    </div>

    <!-- 하단 메뉴 -->
    <div class="bottom-global-bar">
        <div class="menu-left">메뉴 | 상점</div>
        <div class="menu-right">
            <span v-if="userStore.currentUser" style="margin-right: 15px;">{{ userStore.currentUser.nickname }}님 접속 중</span>
            <button class="btn-logout" @click="handleLogout">로그아웃</button>
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
    background-color: #00bfff; 
    padding: 10px;
    box-sizing: border-box;
    font-family: sans-serif;
    margin: 0 auto;
}

.main-content {
    display: flex;
    flex: 1;
    gap: 10px;
    margin-bottom: 10px;
    overflow: hidden;
}

.left-sidebar {
    width: 200px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.profile-section { 
    height: 150px; 
    background: rgba(255,255,255,0.9); 
    border: 2px solid #0056b3; 
    padding: 10px;
    border-radius: 8px;
}

.user-info h3 { margin: 0 0 10px 0; color: #333; }
.user-info p { margin: 5px 0; font-size: 0.9rem; font-weight: bold; color: #555; }

.user-list-section { 
    flex: 1; 
    background: #007bff; 
    border: 2px solid #0056b3; 
    display: flex; 
    flex-direction: column; 
    border-radius: 8px;
}

.user-list-header {
    background: #0056b3;
    color: white;
    padding: 5px;
    text-align: center;
    font-weight: bold;
}

.user-list-box { flex: 1; padding: 5px; overflow-y: auto; }
.user-item { background: rgba(0,0,0,0.2); color: white; margin-bottom: 5px; padding: 8px; font-size: 13px; font-weight: bold; }

.right-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.top-buttons { 
    display: flex; justify-content: space-between; align-items: center; 
    height: 60px; background: rgba(0,0,0,0.2); padding: 0 10px; border-radius: 8px;
}

.primary-btns button { 
    padding: 10px 20px; font-size: 16px; font-weight: bold; margin-right: 10px;
    cursor: pointer; border: none; border-radius: 5px; color: white;
}
.btn-create { background-color: #f1c40f; color: #333 !important; border: 2px solid #f39c12 !important; }
.btn-quick { background-color: #2ecc71; border: 2px solid #27ae60 !important; }

.room-grid-section { 
    flex: 2; background: #007bff; border: 2px solid #0056b3; 
    display: flex; flex-direction: column; padding: 10px; border-radius: 8px;
}

.room-grid { 
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1; align-content: start;
}

.room-card { 
    background: #4dabf7; border: 2px solid #1864ab; border-radius: 8px;
    display: flex; flex-direction: column; justify-content: space-between; padding: 10px;
    height: 70px; cursor: pointer; transition: 0.1s;
}

.room-card:hover { transform: scale(1.02); background: #339af0; }
.room-title { font-weight: bold; font-size: 1.1rem; color: white; }
.room-status { display: flex; justify-content: space-between; font-size: 0.85rem; color: #e9ecef; margin-top: auto; }

.empty-room { color: white; font-weight: bold; grid-column: span 2; text-align: center; margin-top: 20px; }

.chat-section { 
    height: 120px; background: #339af0; border: 2px solid #0056b3; 
    display: flex; flex-direction: column; border-radius: 8px;
}
.chat-display { flex: 1; padding: 10px; color: white; font-weight: bold; }

.bottom-global-bar { 
    height: 40px; background: #003366; color: white; 
    display: flex; justify-content: space-between; align-items: center; 
    padding: 0 15px; font-size: 13px; font-weight: bold; border-radius: 4px;
}

.btn-logout {
    background-color: #e74c3c;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}
.btn-logout:hover { background-color: #c0392b; }
</style>