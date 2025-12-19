import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from '@/shared/utils/storage.utils'

class WebSocketService {
  constructor() {
    this.client = null
    this.connected = false
    this.subscriptions = new Map()
    this.messageHandlers = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  // Kết nối WebSocket
  connect(onConnected, onError) {
    const token = getToken()
    if (!token) {
      console.error('No authentication token found')
      return
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws/chat'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        console.log('STOMP Debug:', str)
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log('WebSocket connected:', frame)
        this.connected = true
        this.reconnectAttempts = 0

        if (onConnected) {
          onConnected(frame)
        }
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame)
        this.connected = false

        if (onError) {
          onError(frame)
        }
      },
      onWebSocketClose: () => {
        console.log('WebSocket connection closed')
        this.connected = false
        this.handleReconnect()
      }
    })

    this.client.activate()
  }

  // Xử lý reconnect
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    } else {
      console.error('Max reconnect attempts reached')
    }
  }

  // Ngắt kết nối
  disconnect() {
    if (this.client) {
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe()
      })
      this.subscriptions.clear()
      this.messageHandlers.clear()

      this.client.deactivate()
      this.connected = false
      console.log('WebSocket disconnected')
    }
  }

  // Subscribe vào một topic/queue
  subscribe(destination, callback, subscriptionId) {
    if (!this.client || !this.connected) {
      console.error('WebSocket not connected')
      return null
    }

    const id = subscriptionId || destination

    // Unsubscribe nếu đã tồn tại
    if (this.subscriptions.has(id)) {
      this.subscriptions.get(id).unsubscribe()
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body)
        console.log(`Message received from ${destination}:`, data)

        if (callback) {
          callback(data)
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    })

    this.subscriptions.set(id, subscription)
    console.log(`Subscribed to ${destination}`)

    return subscription
  }

  // Unsubscribe khỏi topic/queue
  unsubscribe(subscriptionId) {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.get(subscriptionId).unsubscribe()
      this.subscriptions.delete(subscriptionId)
      console.log(`Unsubscribed from ${subscriptionId}`)
    }
  }

  // Gửi tin nhắn qua WebSocket
  send(destination, body = {}, headers = {}) {
    if (!this.client || !this.connected) {
      console.error('WebSocket not connected')
      return false
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
        headers
      })
      console.log(`Message sent to ${destination}:`, body)
      return true
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  // Subscribe vào phòng chat
  subscribeToRoom(roomId, onMessage) {
    const destination = `/topic/room.${roomId}`
    return this.subscribe(destination, onMessage, `room-${roomId}`)
  }

  // Unsubscribe khỏi phòng chat
  unsubscribeFromRoom(roomId) {
    this.unsubscribe(`room-${roomId}`)
  }

  // Subscribe vào queue cá nhân (notifications)
  subscribeToUserQueue(username, onNotification) {
    const destination = `/user/${username}/queue/notifications`
    return this.subscribe(destination, onNotification, 'user-notifications')
  }

  // Gửi tin nhắn chat
  sendChatMessage(roomId, content, messageType = 'TEXT') {
    return this.send('/app/chat.send', {
      roomId,
      content,
      messageType
    })
  }

  // Gửi typing indicator
  sendTypingIndicator(roomId, isTyping) {
    return this.send('/app/chat.typing', {
      roomId,
      isTyping
    })
  }

  // Check connection status
  isConnected() {
    return this.connected
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()
export default websocketService
