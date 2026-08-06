<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import socketService from '../services/socket'
import { useUserStore } from '../stores/userStore'
import api from '../services/api'

const route = useRoute()
const router = useRouter() 
const roomId = route.query.roomId || 'default_room'

// 💡 1. 맵 크기를 30x20으로 확장하고 단단한 벽(1)을 최소화한 시원한 맵 구조
const getInitialMap = () => [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 1],
    [1, 0, 2, 0, 1, 0, 0, 2, 2, 0, 1, 0, 2, 2, 0, 2, 2, 0, 1, 0, 2, 2, 0, 0, 1, 0, 2, 0, 0, 1],
    [1, 2, 0, 2, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 2, 0, 2, 0, 1],
    [1, 2, 0, 0, 2, 2, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 2, 2, 0, 0, 2, 1],
    [1, 0, 2, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 2, 0, 0, 2, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 2, 0, 1],
    [1, 0, 0, 2, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 2, 0, 0, 1],
    [1, 2, 0, 0, 0, 0, 2, 2, 0, 2, 2, 0, 2, 0, 1, 1, 0, 2, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 2, 1],
    [1, 2, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 2, 1],
    [1, 0, 2, 0, 0, 2, 0, 1, 1, 0, 2, 2, 0, 2, 0, 0, 2, 0, 2, 2, 0, 1, 1, 0, 2, 0, 0, 2, 0, 1],
    [1, 0, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 2, 2, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 2, 0, 0, 1],
    [1, 2, 0, 0, 1, 0, 2, 2, 2, 0, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 0, 2, 2, 2, 0, 1, 0, 0, 2, 1],
    [1, 2, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2, 2, 1],
    [1, 0, 0, 2, 0, 0, 2, 1, 0, 0, 2, 2, 0, 2, 2, 2, 2, 0, 2, 2, 0, 0, 1, 2, 0, 0, 2, 0, 0, 1],
    [1, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 2, 0, 1],
    [1, 2, 0, 2, 0, 1, 0, 2, 2, 0, 1, 0, 2, 2, 0, 0, 2, 2, 0, 1, 0, 2, 2, 0, 1, 0, 2, 0, 2, 1],
    [1, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 2, 2, 2, 2, 0, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]

const mapData = ref(getInitialMap())
const userStore = useUserStore() 

const myId = ref(userStore.currentUser?.nickname || 'Guest_' + Math.floor(Math.random() * 1000)) 

// 남은 색상을 겹치지 않게 할당하는 로직
const getAvailableColor = (currentPlayers) => {
    const usedColors = Object.values(currentPlayers).map(p => p.color)
    const allColors = ['red', 'blue', 'yellow', 'green']
    return allColors.find(c => !usedColors.includes(c)) || 'red'
}

const players = ref({
    [myId.value]: { 
        x: 1, 
        y: 1, 
        power: 1, 
        maxBombs: 1, 
        needles: 0, 
        isTrapped: false, 
        isDead: false, 
        isReady: false,
        color: 'red' // 호스트는 항상 빨간색
    }
})

const bombs = ref([])       
const explosions = ref([])  
const items = ref([]) 
const chatMessages = ref([])
const chatInput = ref('')
const chatBoxRef = ref(null)

const isGameStarted = ref(true)
const isGameOver = ref(false)
const winnerId = ref('')

const timeLeft = ref(600)
const displayTime = computed(() => {
    const m = Math.floor(timeLeft.value / 60)
    const s = timeLeft.value % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})
let timerInterval = null

let hostCheckTimer = null
const hostId = ref('')
const isHost = computed(() => hostId.value === myId.value)

const checkWinCondition = (isTimeOut = false) => {
    if (!isHost.value || !isGameStarted.value || isGameOver.value) return

    const activePlayers = Object.keys(players.value)
    const alivePlayers = activePlayers.filter(id => !players.value[id].isDead)

    if (isTimeOut) {
        const winner = alivePlayers.length === 1 ? alivePlayers[0] : 'DRAW'
        socketService.sendLobbyEvent(roomId, 'GAME_OVER', myId.value, { winnerId: winner })
        return
    }

    if (activePlayers.length > 1) {
        if (alivePlayers.length <= 1) {
            const winner = alivePlayers.length === 1 ? alivePlayers[0] : 'DRAW'
            const losers = activePlayers.filter(id => id !== winner)

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

const handleRemoteMove = (data) => {
    if (data.playerId === myId.value) return 
    if (!players.value[data.playerId]) {
        players.value[data.playerId] = { 
            x: data.x, 
            y: data.y, 
            power: 1, 
            maxBombs: 1, 
            needles: 0, 
            isTrapped: false, 
            isDead: false, 
            isReady: false,
            color: getAvailableColor(players.value)
        }
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

const handleRemoteState = (data) => {
    if (players.value[data.playerId]) {
        players.value[data.playerId].isTrapped = data.isTrapped
        players.value[data.playerId].isDead = data.isDead
        if (isHost.value) checkWinCondition()
    }
}

const handleRemoteLobby = (data) => {
    if (data.type === 'JOIN' && data.senderId !== myId.value) {
        if (Object.keys(players.value).length >= 4) return;
        
        if (!players.value[data.senderId]) {
            players.value[data.senderId] = { 
                x: 1, 
                y: 1, 
                power: 1, 
                maxBombs: 1, 
                needles: 0, 
                isTrapped: false, 
                isDead: false, 
                isReady: false,
                color: getAvailableColor(players.value) 
            }
        }
        if (isHost.value) socketService.sendLobbyEvent(roomId, 'STATE_SYNC', myId.value, { hostId: myId.value, players: players.value })
    }
    else if (data.type === 'STATE_SYNC' && data.senderId !== myId.value) {
        const payload = JSON.parse(data.payload)
        clearTimeout(hostCheckTimer)
        hostId.value = payload.hostId
        Object.keys(payload.players).forEach(id => {
            if (!players.value[id]) players.value[id] = { ...payload.players[id] }
            players.value[id].isReady = payload.players[id].isReady
            players.value[id].color = payload.players[id].color || 'red'
        })
    }
    else if (data.type === 'HOST_CLAIM') {
        const payload = JSON.parse(data.payload)
        clearTimeout(hostCheckTimer)
        hostId.value = payload.hostId
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
        clearInterval(timerInterval) 
        
        chatMessages.value.push({ 
            senderId: 'System', 
            content: winnerId.value === 'DRAW' || winnerId.value === 'NONE' ? '무승부입니다!' : `🎉 ${winnerId.value}님 승리!` 
        })

        setTimeout(() => {
            isGameOver.value = false;
            router.push({ path: '/waiting', query: { roomId: roomId } })
        }, 5000)
    }
    else if (data.type === 'ITEM_PICKUP') {
        const payload = JSON.parse(data.payload)
        const idx = items.value.findIndex(i => i.x === payload.x && i.y === payload.y)
        if (idx !== -1) items.value.splice(idx, 1)
    }
    else if (data.type === 'POP_PLAYER') {
        const payload = JSON.parse(data.payload)
        if (payload.targetId === myId.value && players.value[myId.value].isTrapped) {
            players.value[myId.value].isTrapped = false
            players.value[myId.value].isDead = true
            socketService.sendPlayerState(roomId, myId.value, false, true)
            if (isHost.value) checkWinCondition()
        }
    }
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

    if (me.isTrapped) return;

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
        
        // 💡 플레이어가 불길로 뛰어들었을 때 피격 판정
        if (explosions.value.some(e => e.x === nextX && e.y === nextY)) {
            me.isTrapped = true
            socketService.sendPlayerState(roomId, myId.value, true, false)
            setTimeout(() => {
                if (players.value[myId.value].isTrapped) {
                    players.value[myId.value].isTrapped = false
                    players.value[myId.value].isDead = true
                    socketService.sendPlayerState(roomId, myId.value, false, true)
                    if (isHost.value) checkWinCondition() 
                }
            }, 5000)
            return
        }

        Object.keys(players.value).forEach(id => {
            if (id !== myId.value) {
                const other = players.value[id]
                if (other.x === nextX && other.y === nextY && !other.isDead && other.isTrapped) {
                    socketService.sendLobbyEvent(roomId, 'POP_PLAYER', myId.value, { targetId: id })
                }
            }
        })
    }
}

const checkItemPickup = (x, y) => {
    const me = players.value[myId.value]
    const itemIndex = items.value.findIndex(i => i.x === x && i.y === y)
    
    if (itemIndex > -1) {
        const item = items.value[itemIndex]
        
        // 최대 스탯 제한 (최대 5)
        if (item.type === 'potion') me.power = Math.min(me.power + 1, 5) 
        else if (item.type === 'balloon') me.maxBombs = Math.min(me.maxBombs + 1, 5) 
        else if (item.type === 'needle') me.needles = Math.min(me.needles + 1, 5) 
        
        items.value.splice(itemIndex, 1)
        socketService.sendLobbyEvent(roomId, 'ITEM_PICKUP', myId.value, { x, y })
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
    const bombIndex = bombs.value.findIndex(b => b.x === bomb.x && b.y === bomb.y)
    if (bombIndex === -1) return 
    
    bombs.value.splice(bombIndex, 1)
    
    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]
    const blastTiles = [{ x: bomb.x, y: bomb.y }] 
    
    // ✨ 방금 태어난 아이템을 추적할 배열
    const newlySpawnedItems = []

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
                
                // 아이템 스폰 확률 30%
                const rand = (bx * 29 + by * 13) % 100
                if (rand < 30) { 
                    let itemType = 'potion'
                    if (rand < 10) itemType = 'balloon'
                    else if (rand < 20) itemType = 'needle' 
                    
                    if (!items.value.some(i => i.x === bx && i.y === by)) {
                        const newItem = { x: bx, y: by, type: itemType }
                        items.value.push(newItem)
                        newlySpawnedItems.push(newItem) // ✨ 방금 태어난 아이템 기록
                    }
                }
                break 
            }
        }
    })
    
    const blastId = Date.now() + Math.random();
    const tilesWithId = blastTiles.map(t => ({ ...t, blastId }));
    explosions.value.push(...tilesWithId);

    blastTiles.forEach(tile => {
        // ✨ 수정됨: 방금 태어난 아이템은 폭발 범위에 있어도 보호 (삭제하지 않음)
        items.value = items.value.filter(i => {
            if (i.x === tile.x && i.y === tile.y) {
                return newlySpawnedItems.includes(i) 
            }
            return true
        })
        
        // 물줄기에 닿은 플레이어 피격 처리
        Object.entries(players.value).forEach(([id, p]) => {
            if (p.x === tile.x && p.y === tile.y && !p.isDead) {
                if (id === myId.value) {
                    if (p.isTrapped) {
                        p.isTrapped = false
                        p.isDead = true
                        socketService.sendPlayerState(roomId, myId.value, false, true)
                        if (isHost.value) checkWinCondition() 
                    } else {
                        p.isTrapped = true
                        socketService.sendPlayerState(roomId, myId.value, true, false)
                        setTimeout(() => {
                            if (players.value[myId.value].isTrapped) {
                                players.value[myId.value].isTrapped = false
                                players.value[myId.value].isDead = true
                                socketService.sendPlayerState(roomId, myId.value, false, true)
                                if (isHost.value) checkWinCondition() 
                            }
                        }, 5000)
                    }
                }
            }
        })
    })

    setTimeout(() => {
        explosions.value = explosions.value.filter(e => e.blastId !== blastId);
    }, 300)
}

const getCellClass = (x, y) => {
    if (explosions.value.some(e => e.x === x && e.y === y)) return 'explosion'
    let cellClass = ''
    Object.keys(players.value).forEach(id => {
        const p = players.value[id]
        if (p.x === x && p.y === y) {
            cellClass = `player ${p.color}`
            if (p.isDead) cellClass += ' dead'
            else if (p.isTrapped) cellClass += ' trapped'
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
    
    timerInterval = setInterval(() => {
        if (isGameStarted.value && !isGameOver.value && timeLeft.value > 0) {
            timeLeft.value--
            if (timeLeft.value === 0 && isHost.value) {
                checkWinCondition(true) 
            }
        }
    }, 1000)
    
    socketService.connect(roomId, handleRemoteMove, handleRemoteBomb, handleRemoteChat, () => {}, handleRemoteState, handleRemoteLobby, () => {
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
    clearInterval(timerInterval)
    socketService.sendLeave(roomId, myId.value)
    socketService.sendLobbyEvent(roomId, 'LEAVE', myId.value, {})
    socketService.disconnect()
})
</script>

<template>
<div class="game-client-wrapper">
    <div class="top-bar">
        <div class="top-left">🔵 14</div>
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

                <div v-for="(row, y) in mapData" :key="y" class="row">
                    <div v-for="(cell, x) in row" :key="x" class="cell" :class="getCellClass(x, y)"></div>
                </div>
            </div>
        </div>

        <div class="right-section">
            <div class="panel-box timer-box">
                <span>TIMER</span>
                <span class="timer-time">{{ displayTime }}</span>
            </div>

            <div class="panel-box stats-box">
                <div class="stat-item">
                    <span>💦 파워</span>
                    <span class="stat-val">{{ players[myId]?.power || 1 }}</span>
                </div>
                <div class="stat-item">
                    <span>💣 개수</span>
                    <span class="stat-val">{{ players[myId]?.maxBombs || 1 }}</span>
                </div>
                <div class="stat-item">
                    <span>📍 바늘</span>
                    <span class="stat-val">{{ players[myId]?.needles || 0 }}</span>
                </div>
            </div>

            <div class="panel-box player-list-box">
                <!-- 💡 4인 기준 슬롯 -->
                <div class="player-slot" :class="{ active: Object.keys(players)[i-1] }" v-for="i in 4" :key="'slot-'+i">
                    <template v-if="Object.keys(players)[i-1]">
                        <div class="player-icon" :class="players[Object.keys(players)[i-1]].color"></div>
                        <div class="player-info">
                            <span class="p-id">
                                {{ Object.keys(players)[i-1] }}
                                <span v-if="Object.keys(players)[i-1] === hostId" class="badge-host">👑</span>
                                <span v-if="players[Object.keys(players)[i-1]].isDead" class="badge-dead">💀</span>
                            </span>
                        </div>
                    </template>
                </div>
            </div>

            <div class="panel-box chat-box-wrapper">
                <div class="chat-header">CHAT</div>
                <div class="chat-box" ref="chatBoxRef">
                    <div v-for="(msg, index) in chatMessages" :key="index" class="chat-msg" :class="{ 'my-msg': msg.senderId === myId }">
                        <span class="sender">{{ msg.senderId }}:</span> {{ msg.content }}
                    </div>
                </div>
                <input type="text" class="chat-input" v-model="chatInput" @keyup.enter="sendMyChat" placeholder="채팅..." />
            </div>

            <button class="btn-exit" @click="$router.push('/lobby')">나가기</button>
        </div>
    </div>
</div>
</template>

<style scoped>
/* -------------------------------------------
   1. 래퍼 및 공통 레이아웃
------------------------------------------- */
.game-client-wrapper { 
    background-color: #0073ea; 
    padding: 10px; 
    border-radius: 8px; 
    border: 4px solid #004c99; 
    display: flex; 
    flex-direction: column; 
    gap: 8px; 
    width: fit-content; 
    margin: 0 auto; 
    font-family: 'Noto Sans KR', sans-serif; 
    user-select: none; 
}

.top-bar { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background-color: #004c99; 
    color: white; 
    padding: 3px 15px; 
    border-radius: 4px; 
    font-size: 0.8rem; 
    font-weight: bold; 
}

.main-layout { 
    display: flex; 
    gap: 12px; 
}

.left-section { 
    display: flex; 
    flex-direction: column; 
}

.game-board { 
    position: relative; 
    border: 12px solid #2f3542; 
    border-radius: 8px; 
    background-color: #2ed573; 
    box-shadow: 0 10px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3); 
    display: inline-flex; 
    flex-direction: column; 
    overflow: hidden; 
}

.row { 
    display: flex; 
}

/* -------------------------------------------
   2. 게임 보드 타일(셀) 공통 스타일
------------------------------------------- */
.cell { 
    width: 42px; 
    height: 42px; 
    box-sizing: border-box; 
    position: relative; 
    background-color: #2ed573; 
    background-image: linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05)), linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.05) 75%, rgba(0,0,0,0.05)); 
    background-size: 20px 20px; 
    background-position: 0 0, 10px 10px; 
    border: 1px solid rgba(0,0,0,0.05); 
}

.empty { 
    background-color: transparent; 
}

/* -------------------------------------------
   3. 오브젝트 레이어 (가상 요소로 덮어씌우기)
------------------------------------------- */
.wall::after,
.block::after,
.player::after,
.bomb::after,
.explosion::after,
.item::after { 
    content: ""; 
    position: absolute; 
    top: 0; 
    left: 0; 
    right: 0; 
    bottom: 0; 
}

.wall::after { 
    background-color: #95a5a6; 
    background-image: radial-gradient(circle at 15% 15%, #ecf0f1 2px, transparent 3px), radial-gradient(circle at 85% 15%, #ecf0f1 2px, transparent 3px), radial-gradient(circle at 15% 85%, #ecf0f1 2px, transparent 3px), radial-gradient(circle at 85% 85%, #ecf0f1 2px, transparent 3px), linear-gradient(135deg, #95a5a6, #7f8c8d); 
    border: 2px solid #2c3e50; 
    border-radius: 6px; 
    box-shadow: inset 2px 2px 4px rgba(255,255,255,0.7), inset -3px -3px 4px rgba(0,0,0,0.5), 2px 2px 4px rgba(0,0,0,0.4); 
    z-index: 1; 
    transform: scale(0.95); 
}

.block::after { 
    background-color: #e67e22; 
    background-image: linear-gradient(45deg, transparent 45%, #d35400 45%, #d35400 55%, transparent 55%), linear-gradient(-45deg, transparent 45%, #d35400 45%, #d35400 55%, transparent 55%), linear-gradient(to right, #e67e22, #f39c12); 
    border: 2px solid #a04000; 
    border-radius: 4px; 
    box-shadow: inset 2px 2px 2px rgba(255,255,255,0.5), inset -2px -2px 4px rgba(0,0,0,0.4), 2px 2px 3px rgba(0,0,0,0.3); 
    z-index: 1; 
    transform: scale(0.9); 
}

/* -------------------------------------------
   4. 플레이어 애니메이션 & 색상
------------------------------------------- */
.player::after { 
    border-radius: 50%; 
    transform: scale(0.75); 
    box-shadow: inset -4px -4px 8px rgba(0,0,0,0.4), 3px 6px 8px rgba(0,0,0,0.5); 
    z-index: 5; 
    animation: floatPlayer 1.5s infinite ease-in-out; 
}

.player.red::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle at 30% 30%, #ff7675, #d63031); 
}

.player.blue::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle at 30% 30%, #74b9ff, #0984e3); 
}

.player.yellow::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle at 30% 30%, #ffeaa7, #fdcb6e); 
}

.player.green::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle at 30% 30%, #55efc4, #00b894); 
}

@keyframes floatPlayer { 
    0%, 100% { 
        transform: scale(0.75) translateY(0); 
    } 
    50% { 
        transform: scale(0.75) translateY(-4px); 
    } 
}

.player.trapped::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle at 30% 30%, rgba(129, 236, 236, 0.9), rgba(0, 206, 201, 0.8)); 
    border: 3px solid rgba(255,255,255,0.9); 
    border-radius: 40% 40% 50% 50%; 
    box-shadow: 0 4px 10px rgba(0,0,0,0.3), inset 0 0 10px rgba(255,255,255,0.8); 
    animation: trappedBubble 1s infinite alternate; 
    z-index: 6; 
}

@keyframes trappedBubble { 
    0% { 
        transform: scale(0.8) translateY(0); 
        border-radius: 45% 55% 45% 55%; 
    } 
    100% { 
        transform: scale(0.85) translateY(-8px); 
        border-radius: 55% 45% 55% 45%; 
    } 
}

.player.dead::after { 
    display: none; 
}

/* -------------------------------------------
   5. 💣 리얼 폭탄 및 폭발 이펙트 
------------------------------------------- */
.bomb::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle at 50% 5%, #e74c3c 1px, transparent 2px), linear-gradient(to right, #bdc3c7, #bdc3c7), linear-gradient(to right, #7f8c8d, #7f8c8d), radial-gradient(circle at 35% 45%, rgba(255,255,255,0.3) 0%, transparent 30%), radial-gradient(circle at 50% 60%, #333 0%, #111 70%); 
    background-position: 0 0, center 15%, center 22%, 0 0, 0 0; 
    background-size: 100% 100%, 2px 6px, 12px 4px, 100% 100%, 100% 100%; 
    background-repeat: no-repeat; 
    border-radius: 50%; 
    transform: scale(0.8); 
    box-shadow: 4px 6px 8px rgba(0,0,0,0.5); 
    animation: bombPulse 0.5s infinite alternate; 
    z-index: 3; 
}

@keyframes bombPulse { 
    0% { 
        transform: scale(0.75); 
    } 
    100% { 
        transform: scale(0.85); 
    } 
}

.explosion::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle, #f39c12, #e67e22, #d35400); 
    border-radius: 8px; 
    box-shadow: 0 0 15px #e67e22, inset 0 0 10px #fff; 
    animation: blastAnim 0.3s ease-out forwards; 
    z-index: 4; 
}

@keyframes blastAnim { 
    0% { 
        transform: scale(0.2); 
        opacity: 0.5; 
        border-radius: 50%; 
    } 
    50% { 
        transform: scale(1.1); 
        opacity: 1; 
        border-radius: 30%; 
    } 
    100% { 
        transform: scale(0.9); 
        opacity: 0.9; 
        border-radius: 10px; 
    } 
}

/* -------------------------------------------
   6. 드롭 아이템 스타일 (플라스크, 폭탄, 바늘)
------------------------------------------- */
.item::after { 
    z-index: 2; 
    animation: itemHover 1.2s infinite ease-in-out; 
    box-shadow: 0 4px 6px rgba(0,0,0,0.3); 
}

@keyframes itemHover { 
    0%, 100% { 
        transform: scale(0.65) translateY(0); 
    } 
    50% { 
        transform: scale(0.65) translateY(-6px); 
    } 
}

.item.potion::after { 
    background-color: transparent; 
    background-image: radial-gradient(circle at 50% 65%, #0984e3 0%, #0652dd 60%); 
    border-radius: 50% 50% 40% 40% / 70% 70% 30% 30%; 
    border-top: 6px solid #bdc3c7; 
}

.item.balloon::after { 
    background-color: transparent; 
    background-image: linear-gradient(to right, #bdc3c7, #bdc3c7), linear-gradient(to right, #7f8c8d, #7f8c8d), radial-gradient(circle at 35% 45%, rgba(255,255,255,0.3) 0%, transparent 30%), radial-gradient(circle at 50% 60%, #333 0%, #111 70%); 
    background-position: center 10%, center 20%, 0 0, 0 0; 
    background-size: 2px 6px, 10px 4px, 100% 100%, 100% 100%; 
    background-repeat: no-repeat; 
    border-radius: 50%; 
}

.item.needle::after { 
    top: 10px; 
    bottom: 10px; 
    left: 18px; 
    right: 18px; 
    background-color: transparent; 
    background-image: linear-gradient(to bottom, #dcdde1 0%, #718093 80%, #2f3640 100%); 
    border-radius: 2px 2px 50% 50%; 
    box-shadow: 2px 4px 6px rgba(0,0,0,0.5); 
}

/* -------------------------------------------
   7. 우측 패널 공통
------------------------------------------- */
.right-section { 
    width: 220px; 
    display: flex; 
    flex-direction: column; 
    gap: 10px; 
}

.panel-box { 
    background-color: #005bb5; 
    border: 3px solid #003a7a; 
    border-radius: 8px; 
    color: white; 
    display: flex; 
    flex-direction: column; 
}

.timer-box { 
    flex-direction: row; 
    justify-content: space-between; 
    align-items: center; 
    padding: 8px 12px; 
    font-weight: 900; 
}

.timer-time { 
    color: #f1c40f; 
    font-size: 1.2rem; 
    letter-spacing: 1px; 
}

/* -------------------------------------------
   8. 스탯 및 플레이어 리스트 패널
------------------------------------------- */
.stats-box { 
    padding: 10px; 
    gap: 6px; 
}

.stat-item { 
    display: flex; 
    justify-content: space-between; 
    font-weight: bold; 
    font-size: 0.9rem; 
}

.stat-val { 
    color: #f1c40f; 
}

.player-list-box { 
    padding: 8px; 
    gap: 4px; 
}

.player-slot { 
    height: 38px; 
    background-color: #004a99; 
    border: 2px solid #003a7a; 
    border-radius: 4px; 
    display: flex; 
    align-items: center; 
    padding: 0 6px; 
}

.player-slot.active { 
    background-color: rgba(255,255,255,0.15); 
    border-color: rgba(255,255,255,0.3); 
}

.player-icon { 
    width: 22px; 
    height: 22px; 
    border-radius: 50%; 
    margin-right: 8px; 
    border: 2px solid #fff; 
}

.player-icon.red { 
    background-color: #ff4757; 
}

.player-icon.blue { 
    background-color: #1e90ff; 
}

.player-icon.yellow { 
    background-color: #f1c40f; 
}

.player-icon.green { 
    background-color: #2ed573; 
}

.player-info { 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    overflow: hidden; 
}

.p-id { 
    font-weight: 900; 
    font-size: 0.8rem; 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
}

.badge-host { 
    font-size: 0.8rem; 
    margin-left: 4px; 
}

.badge-dead { 
    font-size: 0.8rem; 
    margin-left: 4px; 
    filter: grayscale(1); 
}

/* -------------------------------------------
   9. 채팅 패널 및 버튼
------------------------------------------- */
.chat-box-wrapper { 
    flex-grow: 1; 
    min-height: 120px; 
}

.chat-header { 
    background-color: #003a7a; 
    font-size: 0.8rem; 
    padding: 4px 8px; 
    font-weight: 900; 
    color: #f1c40f; 
}

.chat-box { 
    flex-grow: 1; 
    background-color: #004a99; 
    overflow-y: auto; 
    padding: 6px; 
    display: flex; 
    flex-direction: column; 
    gap: 3px; 
}

.chat-msg { 
    font-size: 0.75rem; 
    line-height: 1.2; 
    font-weight: bold; 
}

.chat-msg .sender { 
    color: #f1c40f; 
}

.chat-msg.my-msg .sender { 
    color: #2ecc71; 
}

.chat-input { 
    border: none; 
    border-top: 2px solid #003a7a; 
    padding: 6px; 
    background-color: #dfe6e9; 
    outline: none; 
    font-size: 0.8rem; 
    font-weight: bold; 
}

.btn-exit { 
    background-image: linear-gradient(to bottom, #4dabf7, #0984e3); 
    background-color: transparent; 
    color: white; 
    border: 4px solid #003a7a; 
    padding: 12px; 
    font-weight: 900; 
    font-size: 1.4rem; 
    cursor: pointer; 
    border-radius: 8px; 
    text-shadow: 2px 2px 0 #000; 
    transition: 0.1s; 
    box-shadow: 0 4px 0 #003a7a; 
}

.btn-exit:active { 
    transform: translateY(4px); 
    box-shadow: 0 0 0 transparent; 
}

/* -------------------------------------------
   10. 게임 오버 팝업
------------------------------------------- */
.game-over-overlay { 
    position: absolute; 
    top: 0; 
    left: 0; 
    right: 0; 
    bottom: 0; 
    display: flex; 
    flex-direction: column; 
    justify-content: center; 
    align-items: center; 
    z-index: 20; 
    color: white; 
    border-radius: 8px; 
    background-color: rgba(0, 0, 0, 0.9); 
}

.result-title { 
    font-size: 5rem; 
    color: #e74c3c; 
    margin-bottom: 20px; 
    text-shadow: 4px 4px 0 #c0392b; 
    font-weight: 900; 
}

.winner-text { 
    font-size: 2.5rem; 
    color: #f1c40f; 
    margin-bottom: 30px; 
    text-shadow: 2px 2px 0 #000; 
}
</style>