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

const players = ref({
    [myId.value]: { isReady: false }
})

// 낙관적 방장 설정
const hostId = ref(myId.value)
const isHost = computed(() => hostId.value === myId.value)

// 모든 유저 레디 확인
const isAllReady = computed(() => {
    const playerIds = Object.keys(players.value)
    if (playerIds.length === 1) return true 
    return playerIds.every(id => id === hostId.value || players.value[id].isReady)
})

// UI용 8개 슬롯 데이터
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

const chatMessages = ref([])
const chatInput = ref('')
const chatBoxRef = ref(null)

// 통신: 로비 이벤트 처리
const handleRemoteLobby = (data) => {
    if (data.type === 'JOIN' && data.senderId !== myId.value) {
        if (!players.value[data.senderId]) {
            players.value[data.senderId] = { isReady: false }
        }
        if (isHost.value) {
            socketService.sendLobbyEvent(roomId, 'STATE_SYNC', myId.value, { hostId: hostId.value, players: players.value })
        }
    }
    else if (data.type === 'STATE_SYNC' && data.senderId !== myId.value) {
        const payload = JSON.parse(data.payload)
        if (payload.hostId) {
            hostId.value = payload.hostId
        }
        Object.keys(payload.players).forEach(id => {
            if (!players.value[id]) {
                players.value[id] = { ...payload.players[id] }
            }
            players.value[id].isReady = payload.players[id].isReady
        })
    }
    else if (data.type === 'HOST_CLAIM') {
        const payload = JSON.parse(data.payload)
        if (payload.hostId) hostId.value = payload.hostId
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
                if (hostId.value === myId.value) {
                    socketService.sendLobbyEvent(roomId, 'HOST_CLAIM', myId.value, { hostId: myId.value })
                }
            }
        }
    }
    else if (data.type === 'START_GAME') {
        router.push({ path: '/game', query: { roomId: roomId } })
    }
}

// 통신: 채팅 처리
const handleRemoteChat = (data) => {
    chatMessages.value.push(data)
    nextTick(() => { 
        if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight 
    })
}

const sendChat = () => {
    if (chatInput.value.trim() === '') return
    socketService.sendChat(roomId, myId.value, chatInput.value)
    chatInput.value = ''
}

const toggleReady = () => {
    if (isHost.value) return
    const me = players.value[myId.value]
    me.isReady = !me.isReady
    socketService.sendLobbyEvent(roomId, me.isReady ? 'READY' : 'UNREADY', myId.value, {})
}

const startGame = () => {
    if (!isHost.value) return
    if (isAllReady.value) {
        socketService.sendLobbyEvent(roomId, 'START_GAME', myId.value, {})
        router.push({ path: '/game', query: { roomId: roomId } })
    } else {
        alert('모든 플레이어가 준비를 완료해야 시작할 수 있습니다.')
    }
}

// 방 나가기 로직
const leaveRoom = () => {
    router.push('/lobby')
}

onMounted(() => {
    socketService.connect(roomId, () => {}, () => {}, handleRemoteChat, () => {}, () => {}, handleRemoteLobby, () => {
        socketService.sendEnter(roomId, myId.value)
        socketService.sendLobbyEvent(roomId, 'JOIN', myId.value, {})
        socketService.sendLobbyEvent(roomId, 'HOST_CLAIM', myId.value, { hostId: myId.value })
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
    
    <!-- [상단] 대기실 헤더 -->
    <div class="room-header">
        <div class="header-title">
            <span class="room-number">NO. {{ roomId }}</span>
            <span class="room-name">초보만 오세요~ (비밀번호: 없음)</span>
        </div>
        <button class="btn-leave" @click="leaveRoom">나가기 🚪</button>
    </div>

    <div class="main-content">
        <!-- [좌측] 플레이어 슬롯, 채팅 -->
        <div class="left-main">
            <!-- 플레이어 슬롯 (4열 2행 그리드) -->
            <div class="player-slots-grid">
                <div 
                    v-for="(slot, index) in displaySlots" 
                    :key="index"
                    class="slot"
                    :class="{ 'is-active': slot, 'is-empty': !slot, 'is-me': slot && slot.id === myId }"
                >
                    <template v-if="slot">
                        <div class="character-space">
                            <!-- 방장 왕관 -->
                            <div v-if="slot.isHost" class="crown-icon">👑</div>
                            <!-- 레디 표시 효과 -->
                            <div v-if="slot.isReady" class="ready-effect">READY!</div>
                            <div class="char-sprite"></div>
                        </div>
                        <div class="player-info">{{ slot.id }}</div>
                        <div class="ready-status" :class="{ 'status-host': slot.isHost, 'status-ready': slot.isReady }">
                            {{ slot.isHost ? '방 장' : (slot.isReady ? '준비완료' : '대 기 중') }}
                        </div>
                    </template>
                    <template v-else>
                        <div class="character-space empty-space">
                            <span class="empty-cross">➕</span>
                        </div>
                        <div class="player-info empty-info">비어있음</div>
                    </template>
                </div>
            </div>

            <!-- 대기방 채팅창 -->
            <div class="chat-section">
                <div class="chat-header">대기실 채팅</div>
                <div class="chat-display" ref="chatBoxRef">
                    <div v-for="(msg, index) in chatMessages" :key="index" class="chat-msg">
                        <span class="chat-sender" :class="{ 'my-msg': msg.senderId === myId }">{{ msg.senderId }}:</span> 
                        {{ msg.content }}
                    </div>
                </div>
                <div class="chat-input-row">
                    <select class="chat-target"><option>&lt;모두에게&gt;</option></select>
                    <input type="text" class="chat-input" v-model="chatInput" @keyup.enter="sendChat" placeholder="채팅을 입력하세요..." />
                </div>
            </div>
        </div>

        <!-- [우측] 설정 및 시작 영역 -->
        <div class="right-sidebar">
            
            <!-- 캐릭터 선택 (3x3) -->
            <div class="setting-box character-select">
                <div class="box-title">캐릭터 선택</div>
                <div class="char-grid">
                    <div class="char-item" v-for="i in 9" :key="i">
                        <div class="char-mini"></div>
                    </div>
                </div>
            </div>

            <!-- 팀 선택 섹션 삭제됨 -->

            <!-- 맵 정보 -->
            <div class="setting-box map-select">
                <div class="box-title">맵 정보</div>
                <div class="map-info-layout">
                    <div class="map-preview">
                        <span>MAP</span>
                    </div>
                    <div class="map-details">
                        <div class="map-name">패트릿 14</div>
                        <div class="map-desc">최대 인원: 8명</div>
                        <button class="btn-map-change">맵 변경</button>
                    </div>
                </div>
            </div>

            <!-- 시작/레디 버튼 -->
            <div class="start-action-box">
                <button 
                    v-if="isHost" 
                    class="btn-action btn-start" 
                    :class="{ disabled: !isAllReady }" 
                    @click="startGame"
                >
                    GAME START
                </button>
                <button 
                    v-else 
                    class="btn-action" 
                    :class="players[myId]?.isReady ? 'btn-cancel' : 'btn-ready'" 
                    @click="toggleReady"
                >
                    {{ players[myId]?.isReady ? '준비 취소' : '준 비' }}
                </button>
            </div>
            
        </div>
    </div>
</div>
</template>

<style scoped>
.waiting-wrapper {
    display: flex;
    flex-direction: column;
    width: 800px;
    height: 600px;
    background-color: #1e90ff; /* 메인 블루 */
    border: 6px solid #003366;
    border-radius: 12px;
    padding: 10px;
    box-sizing: border-box;
    font-family: 'Noto Sans KR', sans-serif;
    margin: 0 auto;
    box-shadow: 0 15px 30px rgba(0,0,0,0.5);
    user-select: none;
}

/* 상단 방 정보 헤더 */
.room-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: #0b385e; 
    padding: 8px 15px; 
    color: white;
    border-radius: 8px;
    border: 3px solid #001f3f;
    margin-bottom: 10px;
}

.header-title { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
}

.room-number { 
    font-weight: 900; 
    color: #f1c40f; 
    font-size: 1.1rem; 
}

.room-name { 
    font-weight: bold; 
    font-size: 0.95rem; 
}

.btn-leave { 
    background: #e74c3c; 
    color: white; 
    border: 3px solid #c0392b; 
    padding: 5px 15px; 
    border-radius: 6px; 
    font-weight: 900; 
    cursor: pointer; 
    transition: 0.1s;
}

.btn-leave:active { 
    transform: scale(0.95); 
}

/* 메인 레이아웃 */
.main-content {
    display: flex;
    flex: 1;
    gap: 12px;
    overflow: hidden;
}

/* 좌측 메인 (슬롯 + 채팅) */
.left-main {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 플레이어 슬롯 그리드 */
.player-slots-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: 1fr 1fr;
    gap: 8px;
}

.slot {
    background: #dfe6e9;
    border: 4px solid #34495e;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    box-shadow: 0 4px 0 rgba(0,0,0,0.2);
}

.slot.is-me { 
    border-color: #f1c40f; 
    box-shadow: 0 4px 0 #cc8800, 0 0 10px rgba(241,196,15,0.5); 
}

.slot.is-empty { 
    background: rgba(0,0,0,0.2); 
    border: 4px dashed #0056b3; 
    box-shadow: none; 
}

.character-space { 
    flex: 1; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    position: relative;
    background: radial-gradient(circle, #fff 0%, #bdc3c7 100%);
}

.empty-space { 
    background: transparent; 
}

.empty-cross { 
    font-size: 2rem; 
    opacity: 0.3; 
    filter: grayscale(1); 
}

.crown-icon { 
    position: absolute; 
    top: 5px; 
    left: 5px; 
    font-size: 1.2rem; 
    filter: drop-shadow(1px 1px 0 #000); z-index: 2; 
}

.ready-effect { 
    position: absolute; 
    top: 50%; 
    left: 50%; 
    transform: translate(-50%, -50%) rotate(-10deg); 
    color: #e74c3c; 
    font-weight: 900; 
    font-size: 1.5rem; 
    text-shadow: 2px 2px 0 #fff; z-index: 3; 
    pointer-events: none; 
}

.char-sprite { 
    width: 50px; 
    height: 50px; 
    background-color: #ff4757; 
    border-radius: 50%; 
    border: 4px solid #333; 
    z-index: 1; 
}

.player-info { 
    background: #2c3e50; 
    color: white; 
    text-align: center; 
    font-size: 0.8rem; 
    padding: 4px; 
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.empty-info { 
    background: transparent; 
    color: rgba(255,255,255,0.5); 
}

.ready-status { 
    background: #34495e; 
    color: white; 
    text-align: center; 
    padding: 6px; 
    font-weight: 900; 
    font-size: 0.85rem;
}

.status-host { 
    background: #f1c40f; 
    color: #333; 
}

.status-ready { 
    background: #2ecc71; 
    color: white; 
}

/* 채팅창 */
.chat-section { 
    height: 130px; 
    display: flex; 
    flex-direction: column; 
    background: #34495e; 
    border: 4px solid #001f3f; 
    border-radius: 8px;
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
    padding: 8px; 
    overflow-y: auto; 
    font-size: 0.85rem; 
    color: #ecf0f1; 
    font-weight: bold; 
    display: flex; 
    flex-direction: column; 
    gap: 3px; 
}

.chat-sender { 
    color: #f1c40f; 
    margin-right: 5px; 
}

.chat-sender.my-msg { 
    color: #2ecc71; 
}

.chat-input-row { 
    display: flex; 
    padding: 6px; 
    background: #001f3f; 
    gap: 5px; 
}

.chat-target { 
    background: #34495e; 
    color: white; 
    border: 1px solid #7f8c8d; 
    border-radius: 4px; 
    font-size: 0.8rem; 
    outline: none; 
}

.chat-input { 
    flex: 1; 
    padding: 4px 8px; 
    border: none; 
    border-radius: 4px; 
    outline: none; 
    font-weight: bold; 
}

/* 우측 사이드바 (설정) */
.right-sidebar {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.setting-box { 
    background: #007bff; 
    border: 4px solid #001f3f; 
    border-radius: 8px;
    padding: 10px; 
    display: flex; 
    flex-direction: column; 
}

.box-title { 
    color: #f1c40f; 
    font-size: 0.85rem; 
    font-weight: 900; 
    margin-bottom: 8px; 
    text-shadow: 1px 1px 0 #000; 
}

/* 캐릭터 선택 3x3 */
.character-select { /* 팀 색상이 빠져서 높이 비율을 조금 더 주었습니다 */
    flex: 1.3; 
}

.char-grid { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr); 
    gap: 5px; 
    flex: 1; 
}

.char-item { 
    background: #34495e; 
    border: 2px solid #2c3e50; 
    border-radius: 4px; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    cursor: pointer; 
}

.char-mini { 
    width: 20px; 
    height: 20px; 
    background: #bdc3c7; 
    border-radius: 50%; 
}

.char-item:hover { 
    border-color: #f1c40f; 
    background: #2c3e50; 
}

/* 팀 선택 부분 삭제됨 */

/* 맵 선택 */
.map-select { /* 팀 색상이 빠진 공간을 맵 정보가 조금 차지하도록 높이를 키움 */
    height: 110px; 
}

.map-info-layout { 
    display: flex; 
    gap: 10px; 
    height: 100%; 
}

.map-preview { 
    flex: 1; 
    background: #27ae60; 
    border: 3px solid #2c3e50; 
    border-radius: 4px; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    color: white; 
    font-weight: 900; 
}

.map-details { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    justify-content: space-between; 
}

.map-name { 
    font-weight: 900; 
    color: white; 
    font-size: 0.9rem; 
}

.map-desc { 
    font-size: 0.75rem; 
    color: #bdc3c7; 
    font-weight: bold; 
}

.btn-map-change { 
    background: #f1c40f; 
    color: #333; 
    border: 2px solid #cc8800; 
    border-radius: 4px; 
    font-weight: 900; 
    cursor: pointer; 
    padding: 4px; 
}

/* 시작 액션 버튼 */
.start-action-box { 
    height: 70px; 
    display: flex; 
}

.btn-action {
    flex: 1;
    border-radius: 10px;
    font-size: 1.8rem;
    font-weight: 900;
    color: white;
    text-shadow: 2px 2px 0 #000;
    cursor: pointer;
    transition: 0.1s;
    border: 5px solid #001f3f;
}

.btn-action:active:not(.disabled) { 
    transform: translateY(6px); 
    box-shadow: none !important; 
}

.btn-start { 
    background-color: #ff4757; 
    box-shadow: inset -3px -3px 0 rgba(0,0,0,0.2), inset 3px 3px 0 rgba(255,255,255,0.4), 0 8px 0 #c0392b; 
}

.btn-start.disabled { 
    background-color: #7f8c8d; 
    box-shadow: inset -3px -3px 0 rgba(0,0,0,0.2), 0 8px 0 #34495e; 
    cursor: not-allowed; 
}

.btn-ready { 
    background-color: #3498db; 
    box-shadow: inset -3px -3px 0 rgba(0,0,0,0.2), inset 3px 3px 0 rgba(255,255,255,0.4), 0 8px 0 #2980b9; 
}

.btn-cancel { 
    background-color: #e74c3c; 
    box-shadow: inset -3px -3px 0 rgba(0,0,0,0.2), inset 3px 3px 0 rgba(255,255,255,0.4), 0 8px 0 #c0392b; 
    font-size: 1.4rem;
}
</style>