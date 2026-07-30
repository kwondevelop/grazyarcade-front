<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const rooms = ref([])
const newRoomName = ref('')

// 1. 방 목록 불러오기 (GET 요청)
const fetchRooms = async () => {
    try {
        const response = await fetch('http://localhost:8080/api/rooms')
        if (response.ok) {
            rooms.value = await response.json()
        }
    } catch (error) {
        console.error('방 목록을 가져오는 중 에러 발생:', error)
    }
}

// 2. 방 생성하기 (POST 요청)
const createRoom = async () => {
    if (newRoomName.value.trim() === '') {
        alert('방 제목을 입력해 주세요!')
        return
    }

    try {
        const response = await fetch(`http://localhost:8080/api/rooms?name=${newRoomName.value}`, {
            method: 'POST'
        })
        
        if (response.ok) {
            const createdRoom = await response.json()
            // 방 생성에 성공하면 내가 만든 방으로 바로 입장!
            enterRoom(createdRoom.roomId)
        }
    } catch (error) {
        console.error('방 생성 중 에러 발생:', error)
    }
}

// 3. 방 입장하기 (URL 쿼리 스트링으로 roomId 전달)
const enterRoom = (room) => {
    // 입장 불가 조건 체크
    if (room.playing) {
        alert('이미 게임이 진행 중인 방입니다!')
        return
    }
    if (room.currentPlayers >= room.maxPlayers) {
        alert('방 인원이 가득 찼습니다!')
        return
    }
    router.push({ path: '/game', query: { roomId: room.roomId } })
}

// 컴포넌트가 화면에 나타날 때 방 목록을 한 번 불러옵니다.
onMounted(() => {
    fetchRooms()
})
</script>

<template>
<div class="lobby-container">
    <div class="lobby-header">
        <h1>크레이지 아케이드 로비</h1>
        <p>방을 만들거나 입장해서 친구들과 대결하세요!</p>
    </div>

    <!-- 방 만들기 영역 -->
    <div class="create-room-box">
        <input 
            type="text" 
            v-model="newRoomName" 
            placeholder="새로운 방 제목을 입력하세요" 
            @keyup.enter="createRoom"
        /> 
        <button @click="createRoom" class="btn-create">방 만들기</button>
        <button @click="fetchRooms" class="btn-refresh">새로 고침</button>
    </div>

    <!-- 방 목록 영역 -->
    <div class="room-list">
        <div v-if="rooms.length === 0" class="empty-room">
            현재 생성된 방이 없습니다. 첫 번째 방을 만들어보세요!
        </div>
        
        <div v-for="room in rooms" :key="room.roomId" class="room-card">
            <div class="room-info">
                <span class="room-name">{{ room.roomName }}</span>
                <span class="room-players">인원: {{ room.currentPlayers }} / {{ room.maxPlayers }}</span>
            </div>
            <button @click="enterRoom(room.roomId)" class="btn-enter">입장하기</button>
        </div>
    </div>
</div>
</template>

<style scoped>
.lobby-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100vw;
    height: 100vh;
    background-color: #2c3e50;
    color: white;
    padding-top: 50px;
    font-family: 'Noto Sans KR', sans-serif;
}

.lobby-header {
    text-align: center;
    margin-bottom: 30px;
}
.lobby-header h1 {
    color: #f1c40f;
    margin-bottom: 10px;
}

.create-room-box {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
    background-color: rgba(0, 0, 0, 0.3);
    padding: 20px;
    border-radius: 8px;
}
.create-room-box input {
    width: 250px;
    padding: 10px;
    border: none;
    border-radius: 4px;
    outline: none;
    font-size: 1rem;
}
button {
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
}
.btn-create { background-color: #27ae60; color: white; }
.btn-create:hover { background-color: #2ecc71; }
.btn-refresh { background-color: #34495e; color: white; }
.btn-refresh:hover { background-color: #2c3e50; }

.room-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 500px;
    max-height: 500px;
    overflow-y: auto;
}
.empty-room {
    text-align: center;
    color: #bdc3c7;
    padding: 30px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
}
.room-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #ecf0f1;
    color: #2c3e50;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.room-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
.room-name {
    font-size: 1.2rem;
    font-weight: bold;
}
.room-players {
    font-size: 0.9rem;
    color: #7f8c8d;
}
.btn-enter { background-color: #3498db; color: white; }
.btn-enter:hover { background-color: #2980b9; }
</style>