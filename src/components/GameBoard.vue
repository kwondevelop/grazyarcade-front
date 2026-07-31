<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import socketService from '../services/socket'
import { useUserStore } from '../stores/userStore' // ⭐️ 추가: Pinia 스토어
import api from '../services/api' // ⭐️ 추가: API 통신

const route = useRoute()
const roomId = route.query.roomId || 'default_room'

const getInitialMap = () => [
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
]

const mapData = ref(getInitialMap())
const userStore = useUserStore() // ⭐️ 추가: 유저 스토어 초기화

// ⭐️ 변경: 랜덤 ID 대신 실제 가입된 닉네임 사용 (비회원은 Guest_숫자)
const myId = ref(userStore.currentUser?.nickname || 'Guest_' + Math.floor(Math.random() * 1000)) 

const players = ref({
    [myId.value]: { x: 1, y: 1, power: 1, maxBombs: 1, needles: 0, isTrapped: false, isDead: false, isReady: false }
})

const bombs = ref([])       
const explosions = ref([])  
const items = ref([]) 
const chatMessages = ref([])
const chatInput = ref('')
const chatBoxRef = ref(null)

const isGameStarted = ref(false)
const isGameOver = ref(false)
const winnerId = ref('')

let hostCheckTimer = null
const hostId = ref('')
const isHost = computed(() => hostId.value === myId.value)
const isAllReady = computed(() => {
    const playerIds = Object.keys(players.value)
    if (playerIds.length === 1) return true 
    return playerIds.every(id => {
        if (id === hostId.value) return true 
        return players.value[id].isReady
    })
})

const checkWinCondition = () => {
    if (!isHost.value || !isGameStarted.value || isGameOver.value) return

    const activePlayers = Object.keys(players.value)
    const alivePlayers = activePlayers.filter(id => !players.value[id].isDead)

    if (activePlayers.length > 1) {
        if (alivePlayers.length <= 1) {
            const winner = alivePlayers.length === 1 ? alivePlayers[0] : 'DRAW'
            const losers = activePlayers.filter(id => id !== winner)

            // ⭐️ 추가: 게임 종료 시 방장이 승/패 결과를 백엔드로 전송
            api.post('/users/result', {
                winnerNickname: winner,
                loserNicknames: losers
            }).catch(e => console.error("전적 저장 실패", e))

            socketService.sendLobbyEvent(roomId, 'GAME_OVER', myId.value, { winnerId: winner })
        }
    } else {
        if (alivePlayers.length === 0) {
            socketService.sendLobbyEvent(roomId, 'GAME_OVER', myId.value, { winnerId: 'NONE' })
        }
    }
}

const resetGame = () => {
    mapData.value = getInitialMap()
    items.value = []
    bombs.value = []
    explosions.value = []
    
    Object.keys(players.value).forEach(id => {
        players.value[id] = { ...players.value[id], x: 1, y: 1, power: 1, maxBombs: 1, needles: 0, isTrapped: false, isDead: false, isReady: false }
    })

    isGameOver.value = false
    winnerId.value = ''
    isGameStarted.value = false 
}

const handleRemoteMove = (data) => {
    if (data.playerId === myId.value) return 
    if (!players.value[data.playerId]) {
        players.value[data.playerId] = { x: data.x, y: data.y, power: 1, maxBombs: 1, needles: 0, isTrapped: false, isDead: false, isReady: false }
    } else {
        players.value[data.playerId].x = data.x
        players.value[data.playerId].y = data.y
    }
}

const handleRemoteBomb = (data) => {
    if (data.playerId === myId.value) return 
    const newBomb = { x: data.x, y: data.y, power: data.power, owner: data.playerId }
    
    newBomb.timer = setTimeout(() => { explodeBomb(newBomb) }, 2000)
    bombs.value.push(newBomb)
}

const handleRemoteStart = () => {
    isGameStarted.value = true
    chatMessages.value.push({ senderId: 'System', content: '게임이 시작되었습니다!' })
}

const handleRemoteState = (data) => {
    if (players.value[data.playerId]) {
        players.value[data.playerId].isTrapped = data.isTrapped
        players.value[data.playerId].isDead = data.isDead
        if (isHost.value) checkWinCondition()
    }
}

const handleRemoteLobby = (data) => {
    if (data.type === 'JOIN' && data.senderId !== myId.value) {
        if (!players.value[data.senderId]) players.value[data.senderId] = { x: 1, y: 1, power: 1, maxBombs: 1, needles: 0, isTrapped: false, isDead: false, isReady: false }
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
        if (isHost.value) checkWinCondition() 

        if (data.senderId === hostId.value) {
            const remaining = Object.keys(players.value).sort()
            if (remaining.length > 0) {
                hostId.value = remaining[0]
                if (hostId.value === myId.value) socketService.sendLobbyEvent(roomId, 'HOST_CLAIM', myId.value, { hostId: myId.value })
            }
        }
    }
    else if (data.type === 'GAME_OVER') {
        const payload = JSON.parse(data.payload)
        winnerId.value = payload.winnerId
        isGameOver.value = true
        
        chatMessages.value.push({ 
            senderId: 'System', 
            content: winnerId.value === 'DRAW' || winnerId.value === 'NONE' ? '무승부입니다!' : `🎉 ${winnerId.value}님 승리!` 
        })

        setTimeout(() => {
            resetGame()
        }, 5000)
    }
}

const toggleReady = () => {
    const me = players.value[myId.value]
    me.isReady = !me.isReady
    socketService.sendLobbyEvent(roomId, me.isReady ? 'READY' : 'UNREADY', myId.value, {})
}

const requestGameStart = () => {
    if (isAllReady.value) socketService.sendGameStart(roomId)
}

const handleRemoteChat = (data) => {
    chatMessages.value.push(data)
    if (chatMessages.value.length > 50) chatMessages.value.shift()
    nextTick(() => { if (chatBoxRef.value) chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight })
}
const sendMyChat = () => {
    if (chatInput.value.trim() === '') return
    socketService.sendChat(roomId, myId.value, chatInput.value)
    chatInput.value = ''
}

const checkRescue = (x, y) => {
    const me = players.value[myId.value]
    Object.keys(players.value).forEach(id => {
        if (id !== myId.value) {
            const other = players.value[id]
            if (other.x === x && other.y === y && !other.isDead) {
                if (!me.isTrapped && other.isTrapped) socketService.sendPlayerState(roomId, id, false, false)
                else if (me.isTrapped && !other.isTrapped) socketService.sendPlayerState(roomId, myId.value, false, false)
            }
        }
    })
}

const handleKeydown = (e) => {
    if (e.target.tagName === 'INPUT') return
    if (!isGameStarted.value || isGameOver.value) return 
    
    const me = players.value[myId.value]
    if (!me || me.isDead) return

    if (e.key === 'Shift') {
        if (me.isTrapped && me.needles > 0) {
            me.needles -= 1
            me.isTrapped = false
            socketService.sendPlayerState(roomId, myId.value, false, false)
            chatMessages.value.push({ senderId: 'System', content: '바늘을 사용하여 탈출했습니다!' })
        }
        e.preventDefault()
        return
    }

    if (e.code === 'Space') {
        if (me.isTrapped) return 
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
        socketService.sendMove(roomId, myId.value, me.x, me.y)
        checkItemPickup(nextX, nextY)
        checkRescue(me.x, me.y)
    }
}

const checkItemPickup = (x, y) => {
    const me = players.value[myId.value]
    const itemIndex = items.value.findIndex(i => i.x === x && i.y === y)
    
    if (itemIndex > -1) {
        const item = items.value[itemIndex]
        
        if (item.type === 'potion') me.power = Math.min(me.power + 1, 7) 
        else if (item.type === 'balloon') me.maxBombs = Math.min(me.maxBombs + 1, 5) 
        else if (item.type === 'needle') me.needles += 1
        
        items.value.splice(itemIndex, 1)
    }
}

const plantBomb = () => {
    const me = players.value[myId.value]
    const myBombs = bombs.value.filter(b => b.owner === myId.value)
    if (myBombs.length >= me.maxBombs) return
    if (bombs.value.some(b => b.x === me.x && b.y === me.y)) return

    const newBomb = { x: me.x, y: me.y, power: me.power, owner: myId.value }
    newBomb.timer = setTimeout(() => { explodeBomb(newBomb) }, 2000)
    bombs.value.push(newBomb)
    
    socketService.sendBomb(roomId, myId.value, me.x, me.y, me.power)
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

            const hitBomb = bombs.value.find(b => b.x === bx && b.y === by)
            if (hitBomb) {
                clearTimeout(hitBomb.timer) 
                setTimeout(() => explodeBomb(hitBomb), 50) 
            }

            if (cellType === 2) {
                mapData.value[by][bx] = 0
                if (Math.random() < 0.3) {
                    const rand = Math.random()
                    let itemType = 'potion'
                    if (rand < 0.33) itemType = 'balloon'
                    else if (rand < 0.5) itemType = 'needle' 
                    
                    items.value.push({ x: bx, y: by, type: itemType })
                }
                break 
            }
        }
    })
    
    explosions.value.push(...blastTiles)

    blastTiles.forEach(tile => {
        Object.entries(players.value).forEach(([id, p]) => {
            if (p.x === tile.x && p.y === tile.y && !p.isDead) {
                if (id === myId.value) {
                    if (p.isTrapped) {
                        p.isTrapped = false
                        p.isDead = true
                    } else {
                        p.isTrapped = true
                        setTimeout(() => {
                            if (players.value[myId.value].isTrapped) {
                                players.value[myId.value].isTrapped = false
                                players.value[myId.value].isDead = true
                                socketService.sendPlayerState(roomId, myId.value, false, true)
                                if (isHost.value) checkWinCondition() 
                            }
                        }, 5000)
                    }
                    socketService.sendPlayerState(roomId, myId.value, p.isTrapped, p.isDead)
                    if (isHost.value) checkWinCondition() 
                }
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
            if (p.isDead) cellClass = 'player dead'
            else if (p.isTrapped) cellClass = 'player trapped'
            else cellClass = 'player'
            if (id !== myId.value && !p.isDead) cellClass += ' other-player' 
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
    
    socketService.connect(roomId, handleRemoteMove, handleRemoteBomb, handleRemoteChat, handleRemoteStart, handleRemoteState, handleRemoteLobby, () => {
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
    window.removeEventListener('keydown', handleKeydown)
    socketService.sendLeave(roomId, myId.value)
    socketService.sendLobbyEvent(roomId, 'LEAVE', myId.value, {})
    socketService.disconnect()
})
</script>

<template>
<div class="game-client-wrapper">
    <div class="top-bar">
        <div class="top-left">💎 10</div>
        <div class="top-center">Room ID : {{ roomId }}</div>
        <div class="top-right">⚙️</div>
    </div>

    <div class="main-layout">
        <div class="left-section">
            <div class="game-board">
                
                <div v-if="isGameOver" class="game-over-overlay">
                    <h1 class="result-title">GAME OVER</h1>
                    <h2 class="winner-text" v-if="winnerId === 'DRAW' || winnerId === 'NONE'">무승부입니다!</h2>
                    <h2 class="winner-text" v-else>🎉 {{ winnerId }} 님 승리! 🎉</h2>
                    <p class="reset-timer">잠시 후 대기실로 이동합니다...</p>
                </div>

                <div v-if="!isGameStarted && !isGameOver" class="waiting-overlay">
                    <h2>대기실</h2>
                    <div class="lobby-info">현재 인원: {{ Object.keys(players).length }}명</div>
                    
                    <div v-if="isHost" class="action-box">
                        <button class="btn-start" @click="requestGameStart" :disabled="!isAllReady" :class="{ disabled: !isAllReady }">
                            게임 시작
                        </button>
                        <p v-if="!isAllReady" class="warning-text">모든 플레이어가 레디를 해야 시작할 수 있습니다.</p>
                    </div>
                    <div v-else class="action-box">
                        <button class="btn-ready" @click="toggleReady" :class="{ 'is-ready': players[myId]?.isReady }">
                            {{ players[myId]?.isReady ? '레디 완료 (취소하려면 클릭)' : '레디 하기' }}
                        </button>
                    </div>
                </div>

                <div v-for="(row, y) in mapData" :key="y" class="row">
                    <div v-for="(cell, x) in row" :key="x" class="cell" :class="getCellClass(x, y)"></div>
                </div>
            </div>

            <div class="bottom-item-bar">
                <div class="item-bar-title">내아이템</div>
                <div class="item-slots">
                    <div class="slot">1</div>
                    <div class="slot">2</div>
                    <div class="slot">3</div>
                    <div class="slot empty"></div>
                    <div class="slot empty"></div>
                </div>
            </div>
        </div>

        <div class="right-section">
            <div class="panel-box empty-panel"></div>
            <div class="panel-box timer-box">TIMER 03:00</div>

            <div class="panel-box player-list-box">
                <div class="player-slot active" v-for="(p, id) in players" :key="id">
                    <div class="player-icon" :class="{ red: id === myId }"></div>
                    <div class="player-info">
                        <span class="p-id">
                            {{ id }}
                            <span v-if="id === hostId" class="badge-host">👑방장</span>
                            <span v-if="p.isReady" class="badge-ready">✔️READY</span>
                            <span v-if="p.isDead" style="color:red; font-size:10px;">(💀사망)</span>
                        </span>
                        <span class="p-stats">💧{{ p.power }} 🎈{{ p.maxBombs }} 📍{{ p.needles || 0 }}</span>
                    </div>
                </div>
                <div class="player-slot" v-for="i in Math.max(0, 8 - Object.keys(players).length)" :key="'empty-'+i"></div>
            </div>

            <div class="panel-box chat-box-wrapper">
                <div class="chat-header">CHAT</div>
                <div class="chat-box" ref="chatBoxRef">
                    <div v-for="(msg, index) in chatMessages" :key="index" class="chat-msg" :class="{ 'my-msg': msg.senderId === myId }">
                        <span class="sender">{{ msg.senderId }}:</span> {{ msg.content }}
                    </div>
                </div>
                <input type="text" class="chat-input" v-model="chatInput" @keyup.enter="sendMyChat" />
            </div>

            <button class="btn-exit" @click="$router.push('/lobby')">나가기</button>
        </div>
    </div>
</div>
</template>

<style scoped>
.game-client-wrapper { 
    background-color: #1a5b8c; 
    padding: 10px; 
    border-radius: 8px; 
    border: 3px solid #0f3d61; 
    display: flex; 
    flex-direction: column; 
    gap: 10px; 
    width: fit-content; 
    margin: 0 auto; 
    font-family: 'Noto Sans KR', sans-serif; 
    user-select: none; 
}

.top-bar { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background-color: #0b385e; 
    color: white; 
    padding: 5px 15px; 
    border-radius: 4px; 
    font-size: 0.9rem; 
    font-weight: bold; 
}

.main-layout { 
    display: flex; 
    gap: 10px; 
}

.left-section { 
    display: flex; 
    flex-direction: column; 
    gap: 10px; 
}

.game-board { 
    position: relative; 
    border: 6px solid #333; 
    background-color: #88c070; 
    display: inline-flex; 
    flex-direction: column; 
}

.waiting-overlay { 
    position: absolute; 
    top: 0; 
    left: 0; 
    right: 0; 
    bottom: 0; 
    background-color: rgba(0, 0, 0, 0.7); 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    align-items: center; 
    z-index: 10; 
    color: white; 
}

.action-box { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    margin-top: 20px; 
}

.btn-start, 
.btn-ready { 
    padding: 15px 40px; 
    font-size: 1.5rem; 
    font-weight: bold; 
    border-radius: 10px; 
    cursor: pointer; 
    border: 4px solid; 
    transition: 0.2s; 
}

.btn-start { 
    background-color: #f1c40f; 
    border-color: #f39c12; 
    color: #333; 
}

.btn-start:hover:not(.disabled) { 
    background-color: #f39c12; 
}

.btn-start.disabled { 
    background-color: #7f8c8d; 
    border-color: #95a5a6; 
    cursor: not-allowed; 
    opacity: 0.8; 
}

.warning-text { 
    color: #ff6b81; 
    margin-top: 10px; 
    font-weight: bold; 
}

.btn-ready { 
    background-color: #3498db; 
    border-color: #2980b9; 
    color: white; 
}

.btn-ready:hover { 
    background-color: #2980b9; 
}

.btn-ready.is-ready { 
    background-color: #e74c3c; 
    border-color: #c0392b; 
}

.badge-host { 
    background-color: #f1c40f; 
    color: #333; 
    font-size: 0.6rem; 
    padding: 1px 4px; 
    border-radius: 4px; 
    margin-left: 5px; 
}

.badge-ready { 
    background-color: #2ecc71; 
    color: white; 
    font-size: 0.6rem; 
    padding: 1px 4px; 
    border-radius: 4px; 
    margin-left: 5px; 
}

.game-over-overlay {
    position: absolute; 
    top: 0; 
    left: 0; 
    right: 0; 
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    align-items: center;
    z-index: 20; 
    color: white;
}

.result-title { 
    font-size: 4rem; 
    color: #e74c3c; 
    margin-bottom: 20px; 
    text-shadow: 2px 2px 0 #c0392b; 
    font-weight: 900; 
}

.winner-text { 
    font-size: 2rem; 
    color: #f1c40f; 
    margin-bottom: 30px; 
}

.reset-timer { 
    font-size: 1.2rem; 
    color: #bdc3c7; 
    animation: blink 1s infinite; 
}

.row { 
    display: flex; 
}

.cell { 
    width: 35px; 
    height: 35px; 
    box-sizing: border-box; 
    border: 1px solid rgba(0, 0, 0, 0.05); 
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
    z-index: 2; 
}

.other-player { 
    background-color: #1e90ff; 
}

.player.trapped { 
    background-color: #747d8c; 
    border: 4px solid #70a1ff; 
    border-radius: 40% 40% 50% 50%; 
    opacity: 0.9; 
    animation: trappedBounce 1s infinite alternate; 
}

.player.dead { 
    display: none; 
}

.item.potion { 
    background-color: #1e90ff; 
    border-radius: 50%; 
    transform: scale(0.6); 
}

.item.balloon { 
    background-color: #ff6b81; 
    border-radius: 50%; 
    transform: scale(0.6); 
}

.item.needle {
    background-color: #ecf0f1;
    border-radius: 20%;
    transform: scale(0.6) rotate(45deg);
    border: 2px solid #bdc3c7;
}

.bomb { 
    background-color: #3742fa; 
    border-radius: 40% 40% 50% 50%; 
    transform: scale(0.7); 
}

.explosion { 
    background-color: #eccc68; 
    transform: scale(0.9); 
}

.bottom-item-bar { 
    display: flex; 
    background-color: #2e86de; 
    border: 3px solid #0f3d61; 
    border-radius: 4px; 
    height: 50px; 
    align-items: center; 
}

.item-bar-title { 
    background-color: #0b385e; 
    color: white; 
    padding: 0 15px; 
    height: 100%; 
    display: flex; 
    align-items: center; 
    font-weight: bold; 
}

.item-slots { 
    display: flex; 
    gap: 5px; 
    padding: 0 10px; 
}

.slot { 
    width: 35px; 
    height: 35px; 
    background-color: rgba(255, 255, 255, 0.2); 
    border: 1px solid rgba(255, 255, 255, 0.4); 
    color: white; 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    font-weight: bold; 
}

.slot.empty { 
    background-color: rgba(0, 0, 0, 0.1); 
    border-color: transparent; 
}

.right-section { 
    width: 230px; 
    display: flex; 
    flex-direction: column; 
    gap: 8px; 
}

.panel-box { 
    background-color: #2e86de; 
    border: 3px solid #0f3d61; 
    border-radius: 4px; 
    color: white; 
    display: flex; 
    flex-direction: column; 
}

.empty-panel { 
    height: 40px; 
}

.timer-box { 
    text-align: center; 
    font-weight: bold; 
    color: #f1c40f; 
    padding: 10px 0; 
    letter-spacing: 2px; 
}

.player-list-box { 
    flex-grow: 1; 
    padding: 5px; 
    gap: 4px; 
}

.player-slot { 
    height: 35px; 
    background-color: #0b385e; 
    border-radius: 4px; 
    display: flex; 
    align-items: center; 
    padding: 0 5px; 
}

.player-slot.active { 
    background-color: rgba(255, 255, 255, 0.1); 
    border: 1px solid rgba(255, 255, 255, 0.3); 
}

.player-icon { 
    width: 25px; 
    height: 25px; 
    border-radius: 50%; 
    margin-right: 10px; 
}

.player-icon.red { 
    background-color: #ff4757; 
}

.player-info { 
    display: flex; 
    flex-direction: column; 
    font-size: 0.75rem; 
}

.p-id { 
    font-weight: bold; 
}

.p-stats { 
    color: #f1c40f; 
}

.chat-box-wrapper { 
    height: 180px; 
}

.chat-header { 
    background-color: #0b385e; 
    font-size: 0.8rem; 
    padding: 4px 8px; 
    font-weight: bold; 
}

.chat-box { 
    flex-grow: 1; 
    background-color: #1a5b8c; 
    overflow-y: auto; 
    padding: 5px; 
    display: flex; 
    flex-direction: column; 
    gap: 3px; 
}

.chat-msg { 
    font-size: 0.75rem; 
    line-height: 1.2; 
    word-break: break-all; 
}

.chat-msg .sender { 
    font-weight: bold; 
    color: #f1c40f; 
}

.chat-msg:has(.sender:contains('System')) { 
    color: #e74c3c; 
    text-align: center; 
    font-weight: bold; 
}

.chat-input { 
    border: none; 
    padding: 6px; 
    background-color: #dfe6e9; 
    outline: none; 
    font-size: 0.8rem; 
}

.btn-exit { 
    margin-top: auto; 
    background-color: #0b385e; 
    color: white; 
    border: 3px solid #0f3d61; 
    padding: 12px; 
    font-weight: bold; 
    font-size: 1.1rem; 
    cursor: pointer; 
    border-radius: 4px; 
}

.btn-exit:hover { 
    background-color: #e74c3c; 
    border-color: #c0392b; 
}

@keyframes trappedBounce { 
    0% { transform: scale(0.8) translateY(0); } 
    100% { transform: scale(0.8) translateY(-5px); } 
}

@keyframes blink { 
    0%, 100% { opacity: 1; } 
    50% { opacity: 0.5; } 
}
</style>