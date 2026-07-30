<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const mapData = ref([
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 2, 0, 0, 2, 0, 0, 1],
    [1, 0, 1, 2, 1, 1, 2, 1, 0, 1],
    [1, 2, 0, 0, 0, 0, 0, 0, 2, 1],
    [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    [1, 0, 2, 0, 0, 0, 0, 2, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
])

// 플레이어 스탯 및 상태 확장
const player = ref({ 
    x: 1, 
    y: 1, 
    power: 1,      // 물줄기 길이
    maxBombs: 1,   // 최대 설치 가능 물풍선
    isDead: false  // 사망 여부
})

const bombs = ref([])       
const explosions = ref([])  
const items = ref([]) // 드롭된 아이템 목록

const handleKeydown = (e) => {
    // 죽었으면 아무 행동도 못함
    if (player.value.isDead) return

    if (e.code === 'Space') {
        plantBomb()
        return
    }

    let nextX = player.value.x
    let nextY = player.value.y

    if (e.key === 'ArrowUp') nextY -= 1
    else if (e.key === 'ArrowDown') nextY += 1
    else if (e.key === 'ArrowLeft') nextX -= 1
    else if (e.key === 'ArrowRight') nextX += 1
    else return

    if (
        nextY >= 0 && nextY < mapData.value.length &&
        nextX >= 0 && nextX < mapData.value[0].length &&
        mapData.value[nextY][nextX] === 0 &&
        !bombs.value.some(b => b.x === nextX && b.y === nextY)
    ) {
        player.value.x = nextX
        player.value.y = nextY

        // 아이템 획득 처리
        checkItemPickup(nextX, nextY)
    }
}

const checkItemPickup = (x, y) => {
    const itemIndex = items.value.findIndex(i => i.x === x && i.y === y)
    if (itemIndex > -1) {
        const item = items.value[itemIndex]
        if (item.type === 'potion') player.value.power += 1
        else if (item.type === 'balloon') player.value.maxBombs += 1
        
        // 먹은 아이템 제거
        items.value.splice(itemIndex, 1)
    }
}

const plantBomb = () => {
    // 현재 설치된 내 물풍선 개수가 최대치에 도달했는지 확인
    if (bombs.value.length >= player.value.maxBombs) return
    if (bombs.value.some(b => b.x === player.value.x && b.y === player.value.y)) return

    // 물풍선 객체에 현재 플레이어의 power(물줄기 길이)를 저장해둠
    const newBomb = { x: player.value.x, y: player.value.y, power: player.value.power }
    bombs.value.push(newBomb)

    setTimeout(() => {
        explodeBomb(newBomb)
    }, 2000)
}

const explodeBomb = (bomb) => {
    // 이미 터졌거나 없어진 물풍선 예외 처리
    if (!bombs.value.includes(bomb)) return
    bombs.value = bombs.value.filter(b => b !== bomb)

    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]
    const blastTiles = [{ x: bomb.x, y: bomb.y }] // 중앙 폭발

    directions.forEach(dir => {
        // bomb.power(물줄기 길이)만큼 뻗어나감
        for (let i = 1; i <= bomb.power; i++) {
            const bx = bomb.x + dir[0] * i
            const by = bomb.y + dir[1] * i
            
            if (by < 0 || by >= mapData.value.length || bx < 0 || bx >= mapData.value[0].length) break
            
            const cellType = mapData.value[by][bx]
            
            if (cellType === 1) break // 절대 벽을 만나면 물줄기 멈춤

            blastTiles.push({ x: bx, y: by })

            if (cellType === 2) {
                // 블록 파괴 및 확률적 아이템 드롭 (30% 확률)
                mapData.value[by][bx] = 0
                if (Math.random() < 0.3) {
                    const itemType = Math.random() < 0.5 ? 'potion' : 'balloon'
                    items.value.push({ x: bx, y: by, type: itemType })
                }
                break // 블록을 부수면 물줄기는 거기서 멈춤
            }
        }
    })

    explosions.value.push(...blastTiles)

    // 플레이어 피격 판정
    blastTiles.forEach(tile => {
        if (player.value.x === tile.x && player.value.y === tile.y) {
            player.value.isDead = true
        }
        // 폭발 자리에 있던 아이템 소멸
        items.value = items.value.filter(i => !(i.x === tile.x && i.y === tile.y))
    })

    setTimeout(() => {
        explosions.value = explosions.value.filter(e => !blastTiles.includes(e))
    }, 300)
}

const getCellClass = (x, y) => {
    if (explosions.value.some(e => e.x === x && e.y === y)) return 'explosion'
    
    // 사망한 플레이어 처리
    if (player.value.x === x && player.value.y === y) {
        return player.value.isDead ? 'player dead' : 'player'
    }
    
    if (bombs.value.some(b => b.x === x && b.y === y)) return 'bomb'
    
    const item = items.value.find(i => i.x === x && i.y === y)
    if (item) return `item ${item.type}`

    const cellType = mapData.value[y][x]
    if (cellType === 1) return 'wall'
    if (cellType === 2) return 'block'
    return 'empty'
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
<div class="game-container">
    <div class="stats">
        <span>물풍선: {{ bombs.length }} / {{ player.maxBombs }}</span>
        <span>물줄기 길이: {{ player.power }}</span>
        <span v-if="player.isDead" class="game-over">게임 오버! (새로고침 하세요)</span>
    </div>

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
</div>
</template>

<style scoped>
.game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
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
    color: #ff4757;
    animation: flash 1s infinite;
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
    width: 50px;
    height: 50px;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.05);
    transition: background-color 0.1s ease;
}

.wall { background-color: #555; }
.block { background-color: #d2691e; border: 3px solid #8b4513; }
.empty { background-color: transparent; }

/* 플레이어 */
.player { 
    background-color: #ff4757; 
    border-radius: 50%;
    transform: scale(0.8);
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    transition: all 0.2s;
}

/* 죽은 플레이어 (물풍선에 갇힌 느낌) */
.player.dead {
    background-color: #747d8c;
    border: 4px solid #70a1ff;
    border-radius: 40% 40% 50% 50%;
    transform: scale(0.9);
    opacity: 0.8;
}

/* 아이템 */
.item {
    border-radius: 50%;
    transform: scale(0.6);
    box-shadow: 0 0 10px rgba(255,255,255,0.8);
    animation: bounce 1s infinite alternate;
}
.item.potion { background-color: #1e90ff; /* 파란 물약 */ }
.item.balloon { background-color: #ff6b81; /* 빨간 풍선 */ }

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

@keyframes pulse {
    0% { transform: scale(0.7); }
    50% { transform: scale(0.8); }
    100% { transform: scale(0.7); }
}

@keyframes bounce {
    0% { transform: scale(0.6) translateY(0); }
    100% { transform: scale(0.6) translateY(-5px); }
}

@keyframes flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
</style>