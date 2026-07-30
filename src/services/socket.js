import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'

class SocketService {
    constructor() { this.stompClient = null }

    // 파라미터에 onStartReceived 추가
    connect(roomId, onMoveReceived, onBombReceived, onChatReceived, onStartReceived, onConnected) {
        const socketUrl = 'http://localhost:8080/ws-stomp'
        const socket = new SockJS(socketUrl)

        this.stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                this.stompClient.subscribe(`/topic/room/${roomId}/move`, (m) => onMoveReceived(JSON.parse(m.body)))
                this.stompClient.subscribe(`/topic/room/${roomId}/bomb`, (m) => onBombReceived(JSON.parse(m.body)))
                if (onChatReceived) this.stompClient.subscribe(`/topic/room/${roomId}/chat`, (m) => onChatReceived(JSON.parse(m.body)))
                
                // 게임 시작 신호 구독
                if (onStartReceived) {
                    this.stompClient.subscribe(`/topic/room/${roomId}/start`, () => onStartReceived())
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

    // 게임 시작 서버로 전송
    sendGameStart(roomId) {
        if (this.stompClient?.connected) {
            this.stompClient.publish({ destination: `/app/room/${roomId}/start`, body: 'start' })
        }
    }

    disconnect() { if (this.stompClient) this.stompClient.deactivate() }
}
export default new SocketService()