import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'

class SocketService {
    constructor() { this.stompClient = null }

    // 파라미터에 onLobbyReceived 추가
    connect(roomId, onMoveReceived, onBombReceived, onChatReceived, onStartReceived, onStateReceived, onLobbyReceived, onConnected) {
        
        const socketUrl = `http://${window.location.hostname}:8085/ws-stomp`
        
        const socket = new SockJS(socketUrl)

        this.stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                this.stompClient.subscribe(`/topic/room/${roomId}/move`, (m) => onMoveReceived(JSON.parse(m.body)))
                
                // ⭐️ 수정된 부분: 폭발 범위(power)가 백엔드에서 누락되거나 이름이 다를 경우를 대비해 맵핑 및 기본값(1) 처리
                this.stompClient.subscribe(`/topic/room/${roomId}/bomb`, (m) => {
                    const data = JSON.parse(m.body)
                    onBombReceived({
                        roomId: data.roomId,
                        playerId: data.playerId,
                        x: data.x,
                        y: data.y,
                        power: data.power || data.powerLevel || 1 // 백엔드 DTO에 맞춰 유연하게 처리
                    })
                })
                
                if (onChatReceived) this.stompClient.subscribe(`/topic/room/${roomId}/chat`, (m) => onChatReceived(JSON.parse(m.body)))
                if (onStartReceived) this.stompClient.subscribe(`/topic/room/${roomId}/start`, () => onStartReceived())
                if (onStateReceived) this.stompClient.subscribe(`/topic/room/${roomId}/state`, (m) => onStateReceived(JSON.parse(m.body)))
                
                // 방장/레디 상태 채널 구독
                if (onLobbyReceived) {
                    this.stompClient.subscribe(`/topic/room/${roomId}/lobby`, (m) => onLobbyReceived(JSON.parse(m.body)))
                }

                if (onConnected) onConnected()
            }
        })
        this.stompClient.activate()
    }

    sendMove(roomId, playerId, x, y) { if (this.stompClient?.connected) this.stompClient.publish({ destination: `/app/room/${roomId}/move`, body: JSON.stringify({ roomId, playerId, x, y }) }) }
    sendBomb(roomId, playerId, x, y, power) { if (this.stompClient?.connected) this.stompClient.publish({ destination: `/app/room/${roomId}/bomb`, body: JSON.stringify({ roomId, playerId, x, y, power }) }) }
    sendChat(roomId, senderId, content) { if (this.stompClient?.connected) this.stompClient.publish({ destination: `/app/room/${roomId}/chat`, body: JSON.stringify({ roomId, senderId, content }) }) }
    sendEnter(roomId, senderId) { if (this.stompClient?.connected) this.stompClient.publish({ destination: `/app/room/${roomId}/enter`, body: JSON.stringify({ roomId, senderId, content: '' }) }) }
    sendLeave(roomId, senderId) { if (this.stompClient?.connected) this.stompClient.publish({ destination: `/app/room/${roomId}/leave`, body: JSON.stringify({ roomId, senderId, content: '' }) }) }
    sendGameStart(roomId) { if (this.stompClient?.connected) this.stompClient.publish({ destination: `/app/room/${roomId}/start`, body: 'start' }) }
    sendPlayerState(roomId, playerId, isTrapped, isDead) { if (this.stompClient?.connected) this.stompClient.publish({ destination: `/app/room/${roomId}/state`, body: JSON.stringify({ roomId, playerId, isTrapped, isDead }) }) }

    // 로비(방장/레디) 이벤트 전송 함수
    sendLobbyEvent(roomId, type, senderId, payloadObj) {
        if (this.stompClient?.connected) {
            this.stompClient.publish({
                destination: `/app/room/${roomId}/lobby`,
                body: JSON.stringify({ roomId, type, senderId, payload: JSON.stringify(payloadObj) })
            })
        }
    }

    disconnect() { if (this.stompClient) this.stompClient.deactivate() }
}
export default new SocketService()