// server/coordinator.ts
// WebSocket координатор для ретрансляции сообщений между клиентами STRATEG-RUSSIA
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
export class ZimaCoordinator {
    constructor(port = 8080) {
        this.clients = new Map(); // zimaId -> connection
        this.messages = new Map(); // messageId -> message
        this.cleanupInterval = null;
        const server = createServer();
        this.wss = new WebSocketServer({ server });
        this.setupWebSocket();
        this.startCleanup();
        server.listen(port, () => {
            console.log(`🧊 СТРАТЕГ Coordinator listening on ws://localhost:${port}`);
        });
    }
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            let clientZimaId = null;
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    // Регистрация клиента
                    if (message.type === 'REGISTER' && message.zimaId) {
                        const zimaId = message.zimaId.toUpperCase();
                        if (this.clients.has(zimaId)) {
                            // Переподключение - закрываем старое соединение
                            this.clients.get(zimaId)?.ws.close();
                        }
                        this.clients.set(zimaId, {
                            ws,
                            zimaId,
                            connectedAt: Date.now()
                        });
                        clientZimaId = zimaId;
                        console.log(`📝 Client registered: ${zimaId}`);
                        // Отправляем накопленные сообщения для этого клиента
                        this.deliverPendingMessages(zimaId);
                        ws.send(JSON.stringify({
                            type: 'REGISTERED',
                            zimaId,
                            timestamp: Date.now()
                        }));
                        return;
                    }
                    // Отправка сообщения
                    if (message.type === 'SEND' && clientZimaId) {
                        const msg = {
                            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            from: clientZimaId,
                            to: message.to.toUpperCase(),
                            payload: Buffer.from(message.payload, 'base64'),
                            timestamp: Date.now(),
                            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 часа TTL
                        };
                        this.messages.set(msg.id, msg);
                        console.log(`📨 Message ${msg.id} from ${msg.from} to ${msg.to}`);
                        // Пытаемся доставить сразу, если получатель онлайн
                        this.deliverMessage(msg);
                        ws.send(JSON.stringify({
                            type: 'SENT',
                            messageId: msg.id,
                            timestamp: Date.now()
                        }));
                        return;
                    }
                    // Запрос статуса
                    if (message.type === 'PING') {
                        ws.send(JSON.stringify({
                            type: 'PONG',
                            timestamp: Date.now()
                        }));
                        return;
                    }
                }
                catch (error) {
                    console.error('Error processing message:', error);
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        error: 'Invalid message format',
                        timestamp: Date.now()
                    }));
                }
            });
            ws.on('close', () => {
                if (clientZimaId) {
                    this.clients.delete(clientZimaId);
                    console.log(`🔌 Client disconnected: ${clientZimaId}`);
                }
            });
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
    }
    deliverMessage(message) {
        const recipient = this.clients.get(message.to);
        if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
            recipient.ws.send(JSON.stringify({
                type: 'MESSAGE',
                id: message.id,
                from: message.from,
                payload: Buffer.from(message.payload).toString('base64'),
                timestamp: message.timestamp
            }));
            // Удаляем после доставки
            this.messages.delete(message.id);
            console.log(`✅ Delivered message ${message.id} to ${message.to}`);
        }
    }
    deliverPendingMessages(zimaId) {
        const pending = Array.from(this.messages.values())
            .filter(msg => msg.to === zimaId && msg.expiresAt > Date.now());
        for (const msg of pending) {
            this.deliverMessage(msg);
        }
    }
    startCleanup() {
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
            if (cleaned > 0) {
                console.log(`🧹 Cleaned up ${cleaned} expired messages`);
            }
        }, 5 * 60 * 1000); // 5 минут
    }
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.wss.close();
    }
}
// Запуск координатора
const port = parseInt(process.env.WS_PORT || '8080', 10);
const coordinator = new ZimaCoordinator(port);
process.on('SIGTERM', () => {
    coordinator.stop();
    process.exit(0);
});
process.on('SIGINT', () => {
    coordinator.stop();
    process.exit(0);
});
