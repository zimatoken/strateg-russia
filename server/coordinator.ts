// server/coordinator.ts
// WebSocket координатор для ретрансляции сообщений между клиентами STRATEG-RUSSIA
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

interface Message {
  id: string;
  from: string; // STRATEG-ID отправителя
  to: string; // STRATEG-ID получателя
  payload: Uint8Array;
  timestamp: number;
  expiresAt: number; // TTL: 24 часа
  attempts: number; // Количество попыток доставки
  lastAttempt: number; // Timestamp последней попытки
}

interface ClientConnection {
  ws: WebSocket;
  strategId: string;
  connectedAt: number;
  lastPong: number; // Timestamp последнего PONG
  pingInterval: NodeJS.Timeout | null; // Интервал для отправки PING
}

interface GroupChat {
  id: string;
  name: string;
  creatorId: string;
  members: string[];
  createdAt: number;
}

export class StrategCoordinator {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map(); // strategId -> connection
  private messages: Map<string, Message> = new Map(); // messageId -> message
  private rooms: Map<string, GroupChat> = new Map(); // roomId -> group
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  
  // Rate limiting: Map<strategId, {count, resetTime}>
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT = 30; // сообщений в минуту
  private readonly RATE_WINDOW = 60000; // 1 минута
  private readonly MAX_MESSAGE_SIZE = 10240; // 10KB
  private readonly ACK_TIMEOUT = 5000; // 5 секунд
  private readonly MAX_DELIVERY_ATTEMPTS = 3; // 3 попытки
  private readonly PING_INTERVAL = 25000; // 25 секунд
  private readonly PONG_TIMEOUT = 35000; // 35 секунд

  constructor(port: number = 8080) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });

    this.setupWebSocket();
    this.startCleanup();

    server.listen(port, () => {
      console.log(`🧊 STRATEG Coordinator listening on ws://localhost:${port}`);
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      if (this.isShuttingDown) {
        ws.close();
        return;
      }
      
      let clientStrategId: string | null = null;

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          // Регистрация клиента
          if (message.type === 'REGISTER' && message.strategId) {
            const strategId = message.strategId.toUpperCase();
            
            // Валидация формата STRATEG-ID
            if (!/^STRATEG-[A-Z0-9]{9}$/.test(strategId)) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Invalid STRATEG-ID format',
                timestamp: Date.now()
              }));
              return;
            }
            if (this.clients.has(strategId)) {
              // Переподключение - закрываем старое соединение
              this.clients.get(strategId)?.ws.close();
            }

            const connection: ClientConnection = {
              ws,
              strategId,
              connectedAt: Date.now(),
              lastPong: Date.now(),
              pingInterval: null
            };
            
            // Запуск PING interval
            connection.pingInterval = setInterval(() => {
              if (connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
                
                // Проверка timeout PONG
                if (Date.now() - connection.lastPong > this.PONG_TIMEOUT) {
                  logger.warn({ strategId }, 'Client PONG timeout, disconnecting');
                  connection.ws.close();
                }
              }
            }, this.PING_INTERVAL);
            
            this.clients.set(strategId, connection);
            clientStrategId = strategId;
            logger.info({ strategId }, 'Client registered');

            // Отправляем накопленные сообщения для этого клиента
            this.deliverPendingMessages(strategId);

            ws.send(JSON.stringify({
              type: 'REGISTERED',
              strategId,
              timestamp: Date.now()
            }));
            return;
          }

          // Отправка сообщения
          if (message.type === 'SEND' && clientStrategId) {
            // Rate limiting check
            if (!this.checkRateLimit(clientStrategId)) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Rate limit exceeded',
                timestamp: Date.now()
              }));
              return;
            }
            
            // Валидация target STRATEG-ID
            const targetId = message.to.toUpperCase();
            if (!/^STRATEG-[A-Z0-9]{9}$/.test(targetId)) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Invalid target STRATEG-ID',
                timestamp: Date.now()
              }));
              return;
            }
            
            // Проверка размера сообщения
            const payloadBuffer = Buffer.from(message.payload, 'base64');
            if (payloadBuffer.length > this.MAX_MESSAGE_SIZE) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                error: 'Message too large (max 10KB)',
                timestamp: Date.now()
              }));
              logger.warn({ strategId: clientStrategId, size: payloadBuffer.length }, 'Message too large');
              return;
            }
            
            const msg: Message = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              from: clientStrategId,
              to: targetId,
              payload: payloadBuffer,
              timestamp: Date.now(),
              expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 часа TTL
              attempts: 0,
              lastAttempt: 0
            };

            this.messages.set(msg.id, msg);
            logger.info({ messageId: msg.id, from: msg.from, to: msg.to }, 'Message stored');

            // Пытаемся доставить сразу, если получатель онлайн
            this.deliverMessage(msg);

            ws.send(JSON.stringify({
              type: 'SENT',
              messageId: msg.id,
              timestamp: Date.now()
            }));
            return;
          }

          if (message.type === 'GROUP_CREATE' && clientStrategId) {
            const room: GroupChat = {
              id: message.roomId,
              name: message.name,
              creatorId: message.creatorId,
              members: Array.isArray(message.members) ? message.members : [clientStrategId],
              createdAt: Date.now()
            };
            this.rooms.set(room.id, room);
            this.broadcastToRoom(room, { type: 'GROUP_CREATE', ...room });
            return;
          }

          if (message.type === 'GROUP_JOIN' && clientStrategId) {
            const room = this.rooms.get(message.roomId);
            if (room && !room.members.includes(clientStrategId)) {
              room.members.push(clientStrategId);
            }
            if (room) {
              this.broadcastToRoom(room, { type: 'GROUP_JOIN', roomId: room.id, userId: clientStrategId });
            }
            return;
          }

          if (message.type === 'GROUP_LEAVE' && clientStrategId) {
            const room = this.rooms.get(message.roomId);
            if (room) {
              room.members = room.members.filter(memberId => memberId !== clientStrategId);
              if (room.members.length === 0) {
                this.rooms.delete(room.id);
              }
              this.broadcastToRoom(room, { type: 'GROUP_LEAVE', roomId: room.id, userId: clientStrategId });
            }
            return;
          }

          if (message.type === 'GROUP_MESSAGE' && clientStrategId) {
            const room = this.rooms.get(message.roomId);
            if (!room) {
              this.rooms.set(message.roomId, {
                id: message.roomId,
                name: 'Unknown Group',
                creatorId: clientStrategId,
                members: [clientStrategId],
                createdAt: Date.now()
              });
            }
            const activeRoom = this.rooms.get(message.roomId)!;
            for (const memberId of activeRoom.members) {
              if (memberId !== clientStrategId) {
                this.forwardToClient(memberId, { type: 'GROUP_MESSAGE', ...message });
              }
            }
            return;
          }

          // Forward chunk messages transparently
          if ((message.type === 'CHUNK' || message.type === 'CHUNK_COMPLETE') && clientStrategId) {
            const targetId = (message.chatId || message.to || message.toId || '').toString().toUpperCase();
            if (!/^STRATEG-[A-Z0-9]{9}$/.test(targetId)) {
              ws.send(JSON.stringify({ type: 'ERROR', error: 'Invalid target STRATEG-ID', timestamp: Date.now() }));
              return;
            }
            const recipient = this.clients.get(targetId);
            if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
              try {
                recipient.ws.send(JSON.stringify(message));
              } catch (err) {
                logger.error({ err }, 'Failed to forward chunk');
              }
            }
            // do not store chunks on server
            return;
          }

          // PING от клиента (ответ на серверный heartbeat)
          if (message.type === 'PING') {
            if (clientStrategId) {
              const connection = this.clients.get(clientStrategId);
              if (connection) {
                connection.lastPong = Date.now();
              }
            }
            ws.send(JSON.stringify({
              type: 'PONG',
              timestamp: Date.now(),
              echo: message.timestamp
            }));
            return;
          }
          
          // PONG от клиента
          if (message.type === 'PONG' && clientStrategId) {
            const connection = this.clients.get(clientStrategId);
            if (connection) {
              connection.lastPong = Date.now();
            }
            logger.debug({ strategId: clientStrategId, timestamp: message.timestamp }, 'Received PONG from client');
            return;
          }
          
          // ACK от клиента
          if (message.type === 'ACK' && message.messageId) {
            this.handleAck(message.messageId);
            return;
          }

        } catch (error) {
          logger.error({ error, strategId: clientStrategId }, 'Error processing message');
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: 'Invalid message format',
            timestamp: Date.now()
          }));
        }
      });

      ws.on('close', () => {
        if (clientStrategId) {
          const connection = this.clients.get(clientStrategId);
          if (connection?.pingInterval) {
            clearInterval(connection.pingInterval);
          }
          this.clients.delete(clientStrategId);
          this.rateLimits.delete(clientStrategId);
          logger.info({ strategId: clientStrategId }, 'Client disconnected');
        }
      });

      ws.on('error', (error) => {
        logger.error({ error, strategId: clientStrategId }, 'WebSocket error');
      });
    });
  }

  private forwardToClient(clientId: string, message: unknown): void {
    const recipient = this.clients.get(clientId);
    if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
      try {
        recipient.ws.send(JSON.stringify(message));
      } catch (err) {
        logger.error({ err, clientId }, 'Failed to forward group message');
      }
    }
  }

  private broadcastToRoom(room: GroupChat, message: unknown): void {
    for (const memberId of room.members) {
      this.forwardToClient(memberId, message);
    }
  }

  private deliverMessage(message: Message): void {
    const recipient = this.clients.get(message.to);
    if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
      message.attempts++;
      message.lastAttempt = Date.now();
      
      recipient.ws.send(JSON.stringify({
        type: 'MESSAGE',
        id: message.id,
        from: message.from,
        payload: Buffer.from(message.payload).toString('base64'),
        timestamp: message.timestamp
      }));

      logger.info({ messageId: message.id, to: message.to, attempt: message.attempts }, 'Message delivered');
      
      // Запуск таймера для проверки ACK
      setTimeout(() => {
        this.checkAck(message.id);
      }, this.ACK_TIMEOUT);
    }
  }
  
  private handleAck(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      this.messages.delete(messageId);
      logger.info({ messageId }, 'Message ACK received, deleted from storage');
    }
  }
  
  private checkAck(messageId: string): void {
    const message = this.messages.get(messageId);
    if (!message) return; // Уже ACK или удалено
    
    if (message.attempts >= this.MAX_DELIVERY_ATTEMPTS) {
      this.messages.delete(messageId);
      logger.error({ messageId, attempts: message.attempts }, 'Message delivery failed after max attempts');
      return;
    }
    
    // Повторная попытка доставки
    logger.warn({ messageId, attempts: message.attempts }, 'Retrying message delivery');
    this.deliverMessage(message);
  }

  private deliverPendingMessages(strategId: string): void {
    const pending = Array.from(this.messages.values())
      .filter(msg => msg.to === strategId && msg.expiresAt > Date.now());

    for (const msg of pending) {
      this.deliverMessage(msg);
    }
  }

  private checkRateLimit(strategId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(strategId);
    
    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(strategId, { count: 1, resetTime: now + this.RATE_WINDOW });
      return true;
    }
    
    if (limit.count >= this.RATE_LIMIT) {
      return false;
    }
    
    limit.count++;
    return true;
  }

  private startCleanup(): void {
    // Очистка истёкших сообщений каждые 5 минут
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [id, msg] of this.messages.entries()) {
        if (msg.expiresAt <= now) {
          this.messages.delete(id);
          cleaned++;
        }
      }

      // Очистка истёкших rate limits
      for (const [id, limit] of this.rateLimits.entries()) {
        if (now > limit.resetTime) {
          this.rateLimits.delete(id);
        }
      }

      if (cleaned > 0) {
        logger.info({ cleaned }, 'Cleaned up expired messages');
      }
    }, 5 * 60 * 1000); // 5 минут
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Очистка всех ping intervals
    for (const [, connection] of this.clients.entries()) {
      if (connection.pingInterval) {
        clearInterval(connection.pingInterval);
      }
      connection.ws.close();
    }
    
    this.wss.close();
    logger.info('Coordinator stopped');
  }
  
  async gracefulShutdown(): Promise<void> {
    this.isShuttingDown = true;
    logger.info('Graceful shutdown started');
    
    // Остановить приём новых соединений
    this.wss.close(() => {
      logger.info('Stopped accepting new connections');
    });
    
    // Подождать 5 секунд для доставки активных сообщений
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Закрыть все соединения
    for (const [, connection] of this.clients.entries()) {
      if (connection.pingInterval) {
        clearInterval(connection.pingInterval);
      }
      connection.ws.close();
    }
    
    this.stop();
  }
}

// Запуск координатора
const port = parseInt(process.env.WS_PORT || '8080', 10);
const coordinator = new StrategCoordinator(port);

process.on('SIGTERM', async () => {
  await coordinator.gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await coordinator.gracefulShutdown();
  process.exit(0);
});

