import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'

class SocketService {
    constructor() {
        this.stompClient = null
    }

    // 1. 서버와 연결 및 구독(Subscribe) 설정
    connect(onMoveReceived, onBombReceived) {
        // Spring Boot 서버 주소 (백엔드 포트가 8080이라고 가정)
        const socketUrl = 'http://localhost:8080/ws-stomp'
        const socket = new SockJS(socketUrl)

        this.stompClient = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000, // 연결이 끊어지면 5초마다 재시도
            debug: (str) => console.log('[STOMP DEBUG]', str),
            
            onConnect: () => {
                console.log('✅ Spring Boot 웹소켓 서버에 연결되었습니다!')
                
                // 이동 메시지를 들을 스피커 구독
                this.stompClient.subscribe('/topic/move', (message) => {
                    const data = JSON.parse(message.body)
                    onMoveReceived(data)
                })

                // 물풍선 설치 메시지를 들을 스피커 구독
                this.stompClient.subscribe('/topic/bomb', (message) => {
                    const data = JSON.parse(message.body)
                    onBombReceived(data)
                })
            },
            
            onStompError: (frame) => {
                console.error('❌ STOMP 에러 발생: ' + frame.headers['message'])
            }
        })

        this.stompClient.activate()
    }

    // 2. 서버로 나의 이동 정보 전송 (Publish)
    sendMove(playerId, x, y) {
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.publish({
                destination: '/app/move',
                body: JSON.stringify({ playerId, x, y })
            })
        }
    }

    // 3. 서버로 물풍선 설치 정보 전송 (Publish)
    sendBomb(playerId, x, y, power) {
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.publish({
                destination: '/app/bomb',
                body: JSON.stringify({ playerId, x, y, power })
            })
        }
    }

    // 4. 연결 종료
    disconnect() {
        if (this.stompClient) {
            this.stompClient.deactivate()
            console.log('🔌 웹소켓 연결이 해제되었습니다.')
        }
    }
}

// 싱글톤으로 사용할 수 있도록 인스턴스를 내보냄
export default new SocketService()