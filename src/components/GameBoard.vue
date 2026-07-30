<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router' // URL 파라미터를 읽기 위해 추가
import socketService from '../services/socket'

const route = useRoute()
// URL에서 roomId를 가져옵니다. (로비를 안 거치고 바로 /game으로 오면 'default_room' 사용)
const roomId = route.query.roomId || 'default_room'

// 20x20 맵 데이터
const mapData = ref([
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 2, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0, 2, 0, 1],
    [1, 0, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 0, 1],
    [1, 2, 2, 0, 2, 2, 2, 0, 2, 0, 2, 0, 2, 2, 2, 0, 2, 2, 2, 1],
    [1, 0, 1, 1, 1, 0, 1, 2, 1, 2, 1, 2, 1, 0, 1, 1, 1, 2, 1, 1],
    [1, 2, 2, 2, 0, 0, 2, 2, 2, 0, 2, 2, 2, 0, 0, 2, 2, 0, 2, 1],
    [1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1],
    [1, 0, 2, 2, 0, 2, 2, 0, 2, 2, 2, 2, 2, 0, 2, 2, 0, 2, 2, 1],
    [1, 0, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 0, 1],
    [1, 2, 2, 0, 2, 2, 0, 0, 2, 2, 2, 2, 2, 0, 2, 2, 0, 2, 2, 1],
    [1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1],
    [1, 2, 2, 0, 0, 2, 2, 0, 2, 0, 2, 0, 2, 0, 2, 2, 0, 2, 2, 1],
    [1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 1],
    [1, 2, 2, 0, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 0, 2, 2, 1],
    [1, 2, 1, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1],
    [1, 0, 2, 2, 0, 0, 2, 2, 0, 2, 0, 2, 2, 0, 0, 2, 2, 0, 2, 1],
    [1, 0, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 0, 1],
    [1, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 2, 2, 0, 2, 2, 2, 0, 2, 1],
    [1, 0, 0, 2, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0, 2, 2, 0, 2, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
])

const myId = ref('user_' + Math.floor(Math.random() * 10000)) 
const players = ref({
    [myId.value]: { x: 1, y: 1, power: 1, maxBombs: 1, isDead: false }
})

const bombs = ref([])       
const explosions = ref([])  
const items = ref([]) 
const chatMessages = ref([])
const chatInput = ref('')
const chatBoxRef = ref(null)

const handleRemoteMove = (data) => {
    if (data.playerId === myId.value) return 
    if (!players.value[data.playerId]) {
        players.value[data.playerId] = { x: data.x, y: data.y, power: 1, maxBombs: 1, isDead: false }
    } else {
        players.value[data.playerId].x = data.x
        players.value[data.playerId].y = data.y
    }
}

const handleRemoteBomb = (data) => {
    if (data.playerId === myId.value) return 
    const newBomb = { x: data.x, y: data.y, power: data.power, owner: data.playerId }
    bombs.value.push(newBomb)
    setTimeout(() => { explodeBomb(newBomb) }, 2000)
}

// 게임 시작 여부를 관리하는 상태
const isGameStarted = ref(false)

// 시작 신호를 받았을 때 실행할 함수
const handleRemoteStart = () => {
    isGameStarted.value = true
    chatMessages.value.push({ senderId: 'System', content: '게임이 시작되었습니다!' })
}

// 방장이(또는 누군가) 시작 버튼을 눌렀을 때
const requestGameStart = () => {
    socketService.sendGameStart(roomId)
}

const handleRemoteChat = (data) => {
    chatMessages.value.push(data)
    if (chatMessages.value.length > 50) chatMessages.value.shift()
    nextTick(() => {
        if (chatBoxRef.value) {
            chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight
        }
    })
}

const sendMyChat = () => {
    if (chatInput.value.trim() === '') return
    // 전송 시 roomId 추가
    socketService.sendChat(roomId, myId.value, chatInput.value)
    chatInput.value = ''
}

const handleKeydown = (e) => {
    if (e.target.tagName === 'INPUT') return
    // 게임이 시작되지 않았으면 조작 불가
    if (!isGameStarted.value) return

    const me = players.value[myId.value]
    if (!me || me.isDead) return

    if (e.code === 'Space') {
        plantBomb()
        e.preventDefault()
        return
    }

    let nextX = me.x
    let nextY = me.y

    if (e.key === 'ArrowUp') nextY -= 1
    else if (e.key === 'ArrowDown') nextY += 1
    else if (e.key === 'ArrowLeft') nextX -= 1
    else if (e.key === 'ArrowRight') nextX += 1
    else return

    e.preventDefault()

    if (
        nextY >= 0 && nextY < mapData.value.length &&
        nextX >= 0 && nextX < mapData.value[0].length &&
        mapData.value[nextY][nextX] === 0 &&
        !bombs.value.some(b => b.x === nextX && b.y === nextY)
    ) {
        me.x = nextX
        me.y = nextY
        // 전송 시 roomId 추가
        socketService.sendMove(roomId, myId.value, me.x, me.y)
        checkItemPickup(nextX, nextY)
    }
}

const checkItemPickup = (x, y) => {
    const me = players.value[myId.value]
    const itemIndex = items.value.findIndex(i => i.x === x && i.y === y)
    if (itemIndex > -1) {
        const item = items.value[itemIndex]
        if (item.type === 'potion') me.power += 1
        else if (item.type === 'balloon') me.maxBombs += 1
        items.value.splice(itemIndex, 1)
    }
}

const plantBomb = () => {
    const me = players.value[myId.value]
    const myBombs = bombs.value.filter(b => b.owner === myId.value)

    if (myBombs.length >= me.maxBombs) return
    if (bombs.value.some(b => b.x === me.x && b.y === me.y)) return

    const newBomb = { x: me.x, y: me.y, power: me.power, owner: myId.value }
    bombs.value.push(newBomb)

    // 전송 시 roomId 추가
    socketService.sendBomb(roomId, myId.value, me.x, me.y, me.power)
    setTimeout(() => { explodeBomb(newBomb) }, 2000)
}

const explodeBomb = (bomb) => {
    if (!bombs.value.includes(bomb)) return
    bombs.value = bombs.value.filter(b => b !== bomb)

    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]
    const blastTiles = [{ x: bomb.x, y: bomb.y }] 

    directions.forEach(dir => {
        for (let i = 1; i <= bomb.power; i++) {
            const bx = bomb.x + dir[0] * i
            const by = bomb.y + dir[1] * i
            
            if (by < 0 || by >= mapData.value.length || bx < 0 || bx >= mapData.value[0].length) break
            const cellType = mapData.value[by][bx]
            
            if (cellType === 1) break 

            blastTiles.push({ x: bx, y: by })

            if (cellType === 2) {
                mapData.value[by][bx] = 0
                if (Math.random() < 0.3) {
                    const itemType = Math.random() < 0.5 ? 'potion' : 'balloon'
                    items.value.push({ x: bx, y: by, type: itemType })
                }
                break 
            }
        }
    })

    explosions.value.push(...blastTiles)

    blastTiles.forEach(tile => {
        Object.values(players.value).forEach(p => {
            if (p.x === tile.x && p.y === tile.y) {
                p.isDead = true
            }
        })
        items.value = items.value.filter(i => !(i.x === tile.x && i.y === tile.y))
    })

    setTimeout(() => {
        explosions.value = explosions.value.filter(e => !blastTiles.includes(e))
    }, 300)
}

const getCellClass = (x, y) => {
    if (explosions.value.some(e => e.x === x && e.y === y)) return 'explosion'
    
    let cellClass = ''
    Object.keys(players.value).forEach(id => {
        const p = players.value[id]
        if (p.x === x && p.y === y) {
            cellClass = p.isDead ? 'player dead' : 'player'
            if (id !== myId.value) cellClass += ' other-player' 
        }
    })
    if (cellClass) return cellClass
    
    if (bombs.value.some(b => b.x === x && b.y === y)) return 'bomb'
    
    const item = items.value.find(i => i.x === x && i.y === y)
    if (item) return `item ${item.type}`

    const cellType = mapData.value[y][x]
    if (cellType === 1) return 'wall'
    if (cellType === 2) return 'block'
    return 'empty'
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    
    // 소켓 연결 요청 시, 마지막 파라미터로 연결 완료 후 실행할 함수 전달
    socketService.connect(roomId, handleRemoteMove, handleRemoteBomb, handleRemoteChat, handleRemoteStart, () => {
        // 서버와 연결이 확립되면 나의 입장 사실을 서버로 알림!
        socketService.sendEnter(roomId, myId.value)
    })
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    
    // 컴포넌트가 사라지기 전(방을 나가기 전)에 퇴장 메시지 전송
    socketService.sendLeave(roomId, myId.value)
    socketService.disconnect()
})
</script>

<template>
<div class="game-container">
    <div class="stats">
        <span>내 ID: {{ myId }}</span>
        <span>물풍선: {{ players[myId]?.maxBombs }}</span>
        <span>물줄기: {{ players[myId]?.power }}</span>
        
        <!-- 시작 버튼 및 대기 상태 표시 -->
        <button v-if="!isGameStarted" @click="requestGameStart" class="btn-start">게임 시작</button>
        <span v-else class="playing-badge">게임 진행 중</span>
        
        <span v-if="players[myId]?.isDead" class="game-over">게임 오버! (새로고침 하세요)</span>
    </div>

    <!-- 좌우로 배치하기 위해 래퍼(Wrapper) 추가 -->
    <div class="game-layout">
        <div class="game-board">
            <div v-for="(row, y) in mapData" :key="y" class="row">
                <div 
                    v-for="(cell, x) in row" 
                    :key="x" 
                    class="cell"
                    :class="getCellClass(x, y)"
                >
                </div>
            </div>
        </div>

        <!-- 채팅 영역 추가 -->
        <div class="chat-section">
            <div class="chat-box" ref="chatBoxRef">
                <div 
                    v-for="(msg, index) in chatMessages" 
                    :key="index" 
                    class="chat-msg"
                    :class="{ 'my-msg': msg.senderId === myId }"
                >
                    <span class="sender">{{ msg.senderId }}:</span> {{ msg.content }}
                </div>
            </div>
            <div class="chat-input-area">
                <input 
                    type="text" 
                    v-model="chatInput" 
                    @keyup.enter="sendMyChat" 
                    placeholder="채팅 입력 (Enter로 전송)"
                />
                <button @click="sendMyChat">전송</button>
            </div>
        </div>
    </div>
</div>
</template>

<style scoped>
.game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    margin-bottom: 30px;
}
.stats {
    display: flex;
    gap: 20px;
    font-weight: bold;
    color: white;
    background-color: rgba(0,0,0,0.5);
    padding: 10px 20px;
    border-radius: 8px;
}

.game-over { 
    color: #ff4757; animation: flash 1s infinite; 
}

/* 레이아웃 분리 (게임화면 왼쪽, 채팅창 오른쪽) */
.game-layout {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.game-board {
    display: inline-flex;
    flex-direction: column;
    border: 4px solid #333;
    background-color: #88c070;
    border-radius: 8px;
    overflow: hidden;
}

.row { 
    display: flex; 
}

.cell {
    width: 35px;
    height: 35px;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: background-color 0.1s ease;
}

.wall { 
    background-color: #555; 
}

.block { 
    background-color: #d2691e; 
    border: 3px solid #8b4513; 
}

.empty { 
    background-color: transparent; 
}

.player { 
    background-color: #ff4757; 
    border-radius: 50%; 
    transform: scale(0.8); 
    box-shadow: 0 4px 6px rgba(0,0,0,0.3); 
    transition: all 0.2s; 
}

.player.dead { 
    background-color: #747d8c; 
    border: 4px solid #70a1ff; 
    border-radius: 40% 40% 50% 50%; 
    transform: scale(0.9); 
    opacity: 0.8; 
}

.other-player { 
    background-color: #1e90ff; 
}

.item { 
    border-radius: 50%; 
    transform: scale(0.6); 
    box-shadow: 0 0 10px rgba(255,255,255,0.8); 
    animation: bounce 1s infinite alternate; 
}

.item.potion { 
    background-color: #1e90ff; 
}

.item.balloon { 
    background-color: #ff6b81; 
}

.bomb { 
    background-color: #3742fa; 
    border-radius: 40% 40% 50% 50%; 
    transform: scale(0.7); 
    animation: pulse 1s infinite; 
}

.explosion { 
    background-color: #eccc68; 
    border: 2px solid #ffffff; 
    transform: scale(0.9); 
}

/* 채팅 영역 스타일 */
.chat-section {
    display: flex;
    flex-direction: column;
    width: 300px;
    height: 710px; /* 게임 보드 높이와 비슷하게 조절 */
    background-color: rgba(255, 255, 255, 0.9);
    border: 4px solid #333;
    border-radius: 8px;
    overflow: hidden;
}

.chat-box {
    flex-grow: 1;
    padding: 10px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.chat-msg {
    background-color: #eee;
    padding: 8px;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #333;
}

/* 시스템 메시지 강조 */
.chat-msg:has(.sender:contains('System')) {
    color: #e74c3c;
    font-weight: bold;
    text-align: center;
    background-color: #ffeaa7;
}

.my-msg {
    background-color: #ffeaa7; /* 내가 보낸 메시지는 노란색 바탕 */
    align-self: flex-end;
}

.sender {
    font-weight: bold;
    color: #2d3436;
}

.chat-input-area {
    display: flex;
    padding: 10px;
    background-color: #dfe6e9;
    border-top: 2px solid #b2bec3;
}

.chat-input-area input {
    flex-grow: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    outline: none;
}

.chat-input-area button {
    margin-left: 5px;
    padding: 8px 12px;
    background-color: #0984e3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.chat-input-area button:hover { 
    background-color: #74b9ff; 
}

.btn-start { 
    background: #e67e22; 
    color: white; 
    border: none; 
    padding: 5px 10px; 
    border-radius: 4px; 
    cursor: pointer; 
    font-weight: bold; 
}

@keyframes pulse { 0% { transform: scale(0.7); } 50% { transform: scale(0.8); } 100% { transform: scale(0.7); } }
@keyframes bounce { 0% { transform: scale(0.6) translateY(0); } 100% { transform: scale(0.6) translateY(-5px); } }
@keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>