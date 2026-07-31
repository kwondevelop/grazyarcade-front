<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import socketService from '../services/socket'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// URL 쿼리에서 방 번호 가져오기
const roomId = route.query.roomId || 'default_room'
const myId = ref(userStore.currentUser?.nickname || 'Guest_' + Math.floor(Math.random() * 1000))

// 플레이어 상태 관리
const players = ref({
    [myId.value]: { isReady: false }
})

let hostCheckTimer = null
const hostId = ref('')
const isHost = computed(() => hostId.value === myId.value)

// 모든 유저가 레디했는지 확인 (방장 제외)
const isAllReady = computed(() => {
    const playerIds = Object.keys(players.value)
    if (playerIds.length === 1) return true // 혼자일 땐 시작 가능
    return playerIds.every(id => id === hostId.value || players.value[id].isReady)
})

// ⭐️ UI에 렌더링할 8개의 슬롯 데이터 생성 (빈자리는 null로 채움)
const displaySlots = computed(() => {
    const slots = []
    const playerIds = Object.keys(players.value)
    for (let i = 0; i < 8; i++) {
        if (i < playerIds.length) {
            const id = playerIds[i]
            slots.push({ id, ...players.value[id], isHost: id === hostId.value })
        } else {
            slots.push(null)
        }
    }
    return slots
})

// 채팅 관련
const chatMessages = ref([])
const chatInput = ref('')
const chatBoxRef = ref(null)

// ⭐️ 통신: 로비 이벤트 처리 (입장, 레디, 방장 위임 등)
const handleRemoteLobby = (data) => {
    if (data.type === 'JOIN' && data.senderId !== myId.value) {
        if (!players.value[data.senderId]) players.value[data.senderId] = { isReady: false }
        if (isHost.value) socketService.sendLobbyEvent(roomId, 'STATE_SYNC', myId.value, { hostId: myId.value, players: players.value })
    }
    else if (data.type === 'STATE_SYNC' && data.senderId !== myId.value) {
        const payload = JSON.parse(data.payload)
        clearTimeout(hostCheckTimer)
        hostId.value = payload.hostId
        Object.keys(payload.players).forEach(id => {
            if (!players.value[id]) players.value[id] = { ...payload.players[id] }
            players.value[id].isReady = payload.players[id].isReady
        })
    }
    else if (data.type === 'HOST_CLAIM') {
        const payload = JSON.parse(data.payload)
        clearTimeout(hostCheckTimer)
        hostId.value = payload.hostId
    }
    else if (data.type === 'READY') {
        if (players.value[data.senderId]) players.value[data.senderId].isReady = true
    }
    else if (data.type === 'UNREADY') {
        if (players.value[data.senderId]) players.value[data.senderId].isReady = false
    }
    else if (data.type === 'LEAVE') {
        delete players.value[data.senderId]
        if (data.senderId === hostId.value) {
            const remaining = Object.keys(players.value).sort()
            if (remaining.length > 0) {
                hostId.value = remaining[0]
                if (hostId.value === myId.value) socketService.sendLobbyEvent(roomId, 'HOST_CLAIM', myId.value, { hostId: myId.value })
            }
        }
    }
    else if (data.type === 'START_GAME') {
        // ⭐️ 방장이 시작을 누르면 모두가 동시에 인게임으로 이동!
        router.push({ path: '/game', query: { roomId: roomId } })
    }
}

// ⭐️ 통신: 채팅 처리
const handleRemoteChat = (data) => {
    chatMessages.value.push(data)
    nextTick(() => { if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight })
}

const sendChat = () => {
    if (chatInput.value.trim() === '') return
    socketService.sendChat(roomId, myId.value, chatInput.value)
    chatInput.value = ''
}

// ⭐️ 액션: 레디 상태 토글 (일반 유저용)
const toggleReady = () => {
    if (isHost.value) return
    const me = players.value[myId.value]
    me.isReady = !me.isReady
    socketService.sendLobbyEvent(roomId, me.isReady ? 'READY' : 'UNREADY', myId.value, {})
}

// ⭐️ 액션: 게임 시작 (방장용)
const startGame = () => {
    if (!isHost.value) return
    if (isAllReady.value) {
        socketService.sendLobbyEvent(roomId, 'START_GAME', myId.value, {})
        router.push({ path: '/game', query: { roomId: roomId } })
    } else {
        alert('모든 플레이어가 준비를 완료해야 시작할 수 있습니다.')
    }
}

onMounted(() => {
    // 게임 로직(Move, Bomb 등)은 대기방에서 쓰지 않으므로 빈 함수 처리
    socketService.connect(roomId, () => {}, () => {}, handleRemoteChat, () => {}, () => {}, handleRemoteLobby, () => {
        socketService.sendEnter(roomId, myId.value)
        socketService.sendLobbyEvent(roomId, 'JOIN', myId.value, {})
        
        hostCheckTimer = setTimeout(() => {
            if (!hostId.value) {
                hostId.value = myId.value
                socketService.sendLobbyEvent(roomId, 'HOST_CLAIM', myId.value, { hostId: myId.value })
            }
        }, 1000)
    })
})

onUnmounted(() => {
    socketService.sendLeave(roomId, myId.value)
    socketService.sendLobbyEvent(roomId, 'LEAVE', myId.value, {})
    socketService.disconnect()
})
</script>

<template>
<div class="waiting-wrapper">
    
    <div class="main-content">
        <!-- [좌측] 방 정보, 플레이어 슬롯, 채팅 -->
        <div class="left-main">
            <!-- 방 정보 헤더 -->
            <div class="room-header">
                <span class="room-number">[{{ roomId }}]</span>
                <span class="room-options">비밀번호 | 옵션</span>
                <button class="btn-room-edit">방정보변경</button>
            </div>

            <!-- 플레이어 슬롯 (4열 2행 그리드) -->
            <div class="player-slots-grid">
                <!-- 8개의 슬롯을 반복문으로 렌더링 -->
                <div 
                    v-for="(slot, index) in displaySlots" 
                    :key="index"
                    class="slot"
                    :class="{ active: slot, empty: !slot }"
                >
                    <template v-if="slot">
                        <!-- 사람이 있는 자리 -->
                        <div class="character-space">
                            <div class="char-sprite" :class="{ 'is-me': slot.id === myId }"></div>
                        </div>
                        <div class="player-info">{{ slot.id }}</div>
                        <div class="ready-status" :class="{ 'status-host': slot.isHost, 'status-ready': slot.isReady }">
                            {{ slot.isHost ? '방 장' : (slot.isReady ? '준비완료' : '대 기 중') }}
                        </div>
                    </template>
                    <template v-else>
                        <!-- 빈 자리 -->
                        <div class="character-space">X</div>
                        <div class="ready-status empty-status">빈 자리</div>
                    </template>
                </div>
            </div>

            <!-- 대기방 채팅창 -->
            <div class="chat-section">
                <div class="chat-display" ref="chatBoxRef">
                    <div v-for="(msg, index) in chatMessages" :key="index" class="chat-msg">
                        <span class="chat-sender" :class="{ 'my-msg': msg.senderId === myId }">{{ msg.senderId }}:</span> 
                        {{ msg.content }}
                    </div>
                </div>
                <div class="chat-input-row">
                    <select><option>&lt;모두에게&gt;</option></select>
                    <input type="text" class="chat-input" v-model="chatInput" @keyup.enter="sendChat" placeholder="채팅을 입력하세요..." />
                </div>
            </div>
        </div>

        <!-- [우측] 캐릭터/맵 선택 및 시작 영역 -->
        <div class="right-sidebar">
            
            <!-- 캐릭터 선택 (3x3 그리드) -->
            <div class="setting-box character-select">
                <div class="box-title">캐릭터선택</div>
                <div class="char-grid">
                    <div class="char-item" v-for="i in 9" :key="i">캐릭{{ i }}</div>
                </div>
            </div>

            <!-- 팀 선택 (가로 배열) -->
            <div class="setting-box team-select">
                <div class="box-title">팀선택</div>
                <div class="color-palette">
                    <div class="color-box" v-for="i in 8" :key="i"></div>
                </div>
            </div>

            <!-- 맵 정보 및 선택 -->
            <div class="setting-box map-select">
                <div class="box-title">맵</div>
                <div class="map-info-layout">
                    <div class="map-preview">맵 이미지</div>
                    <div class="map-details">
                        <div>패트릿 14</div>
                        <div>인원: 8</div>
                        <button class="btn-map-change">맵선택</button>
                    </div>
                </div>
            </div>

            <!-- 시작 버튼 영역 -->
            <div class="start-action-box">
                <!-- 방장일 때: 시작 버튼 -->
                <button 
                    v-if="isHost" 
                    class="btn-start" 
                    :class="{ disabled: !isAllReady }" 
                    @click="startGame"
                >
                    시 작
                </button>
                <!-- 일반 유저일 때: 레디 버튼 -->
                <button 
                    v-else 
                    class="btn-start" 
                    :class="{ 'is-ready': players[myId].isReady }" 
                    @click="toggleReady"
                >
                    {{ players[myId].isReady ? '준비 취소' : '준 비' }}
                </button>
                
                <button class="btn-auto-ready">자동준비</button>
            </div>
        </div>
    </div>

    <!-- 최하단 글로벌 메뉴 바 -->
    <div class="bottom-global-bar">
        <div class="menu-left">메뉴 | 상점</div>
        <div class="menu-right">이벤트 | 마이페이지 | 설정 | 종료</div>
    </div>
</div>
</template>

<style scoped>
.waiting-wrapper {
    display: flex;
    flex-direction: column;
    width: 800px;
    height: 600px;
    background-color: #1e90ff;
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

.left-main {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #007bff;
    border: 2px solid #0056b3;
    padding: 10px;
}

.room-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: rgba(0,0,0,0.2); 
    padding: 5px 10px; 
    color: white;
    font-weight: bold;
}

.btn-room-edit { 
    padding: 5px 10px; 
    cursor: pointer;
}

.player-slots-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: 1fr 1fr;
    gap: 5px;
}

.slot {
    background: #4dabf7;
    border: 2px solid #1864ab;
    display: flex;
    flex-direction: column;
}

.character-space { 
    flex: 1; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    font-size: 24px; 
    color: rgba(0,0,0,0.3); 
    position: relative;
}

.char-sprite {
    width: 40px;
    height: 40px;
    background-color: #ff4757;
    border-radius: 50%;
}

.char-sprite.is-me {
    border: 3px solid #f1c40f;
}

.player-info { 
    background: #1864ab; 
    color: white; 
    text-align: center; 
    font-size: 12px; 
    padding: 4px; 
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ready-status { 
    background: #003366; 
    color: white; 
    text-align: center; 
    padding: 5px; 
    font-weight: bold; 
    font-size: 13px;
}

.status-host {
    background: #f39c12;
    color: #333;
}

.status-ready {
    background: #2ecc71;
}

.empty-status {
    background: transparent;
    color: rgba(255,255,255,0.5);
}

.slot.empty .character-space { 
    font-size: 50px; 
} 

.chat-section { 
    height: 120px; 
    display: flex; 
    flex-direction: column; 
    background: #339af0; 
    border: 2px solid #0056b3; 
}

.chat-display { 
    flex: 1; 
    padding: 8px; 
    overflow-y: auto; 
    font-size: 13px; 
    color: white;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.chat-sender {
    font-weight: bold;
    color: #f1c40f;
}

.chat-sender.my-msg {
    color: #2ecc71;
}

.chat-input-row { 
    display: flex; 
    padding: 5px; 
    background: #0056b3; 
}

.chat-input { 
    flex: 1; 
    margin-left: 5px; 
    padding: 3px 5px;
    border: none;
    outline: none;
}

.right-sidebar {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.setting-box { 
    background: #007bff; 
    border: 2px solid #0056b3; 
    padding: 10px; 
    display: flex; 
    flex-direction: column; 
}

.box-title { 
    color: white; 
    font-size: 12px; 
    margin-bottom: 5px; 
    font-weight: bold;
}

.character-select { 
    flex: 2; 
}

.char-grid { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr); 
    gap: 5px; 
    flex: 1; 
}

.char-item { 
    background: #4dabf7; 
    border: 1px solid #1864ab; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    font-size: 10px; 
    color: white;
    cursor: pointer;
}

.team-select { 
    height: 60px; 
}

.color-palette { 
    display: flex; 
    gap: 5px; 
}

.color-box { 
    flex: 1; 
    height: 20px; 
    background: #ccc; 
    border: 1px solid #333; 
    cursor: pointer;
}

.map-select { 
    flex: 1.5; 
}

.map-info-layout { 
    display: flex; 
    gap: 10px; 
    height: 100%; 
}

.map-preview { 
    flex: 1; 
    background: #f5deb3; 
    border: 1px solid #333; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    font-size: 12px; 
}

.map-details { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    justify-content: space-between; 
    font-size: 12px; 
    color: white; 
}

.btn-map-change { 
    padding: 5px; 
    background: #339af0; 
    border: 1px solid #1864ab; 
    color: white; 
    cursor: pointer; 
}

.start-action-box { 
    display: flex; 
    gap: 5px; 
    height: 60px; 
}

.btn-start { 
    flex: 3; 
    background: #ffaa00; 
    border: 3px solid #cc8800; 
    font-size: 24px; 
    font-weight: bold; 
    color: white; 
    cursor: pointer; 
    transition: 0.1s;
}

.btn-start.disabled {
    background: #7f8c8d;
    border-color: #95a5a6;
    cursor: not-allowed;
}

.btn-start.is-ready {
    background: #e74c3c;
    border-color: #c0392b;
}

.btn-start:active:not(.disabled) {
    transform: scale(0.95);
}

.btn-auto-ready { 
    flex: 1; 
    background: #339af0; 
    border: 2px solid #1864ab; 
    color: white; 
    font-size: 12px; 
    cursor: pointer; 
}

.bottom-global-bar { 
    height: 30px; 
    background: #003366; 
    color: white; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    padding: 0 10px; 
    font-size: 12px; 
}
</style>