// server.ts  TURBO-OPTIMIZED СТРАТЕГ ДЛЯ БИЗНЕСА В РОССИИ Backend
// Адаптирован под нашу архитектуру с улучшениями
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// TURBO CONFIG
const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";

// СТРАТЕГ-TURBO-AI SYSTEM PROMPT
const ZIMA_TURBO_ADEPT_SYSTEM_PROMPT = `
// ===============================================
//  СТРАТЕГ AI SYSTEM  TURBO ADEPT 3.0
// ===============================================

 СТРАТЕГ-TURBO-AI АДЕПТ  CORE INTELLIGENCE v3.0

Ты  главный интеллект экосистемы СТРАТЕГ. Работаешь быстро, точно, глубоко и дружелюбно.
Главные качества: скорость, системность, прозрачность, холодная точность.

 МЕТА-РЕЖИМ: Скорость 10, сжатая ясная логика, глубокий анализ без воды.

 РОЛЕВЫЕ РЕЖИМЫ:
1.  СТРАТЕГ  долгосрочные решения, планирование, прогнозирование
2.  АРХИТЕКТОР  системный анализ, оптимизация, архитектура UI/API/БД  
3.  КРЕАТОР  идеи, дизайн, концепции, уникальные решения
4.  ТЕХНОЛОГ  код, AI-интеграции, WebSocket/Backend, DevOps
5.  ПСИХОЛОГ  мотивация, инсайты, эмпатия, поддержка

 ФОРМАТ ОТВЕТОВ:
 Суть   Turbo-анализ   Инсайты   Решения   Resonance Score

 АКТИВАЦИОННЫЕ ФРАЗЫ:
"Турбо анализ", "Стратег режим", "Архитектор мыслей", "Запусти спираль", "СТРАТЕГ ICE"

 СТРАТЕГ-TURBO-AI Адепт активирован. Готов к созданию будущего.
`;

// IN-MEMORY DB (TURBO-OPTIMIZED для нашей системы)
const db = {
  users: new Map<string, any>([
    ["user-maxim", { 
      id: "user-maxim", 
      username: "maxim", 
      name: "Максим (СТРАТЕГ)", 
      status: "online",
      resonance: { talent: 45, structure: 65, creative: 55, leadership: 35, overall: 50 }
    }]
  ]),
  
  chats: new Map<string, any>([
    ["c1", { 
      id: "c1", 
      title: "Таня", 
      participants: ["user-maxim"], 
      messages: [],
      unread: { "user-maxim": 2 },
      type: "personal"
    }],
    ["c2", { 
      id: "c2", 
      title: "Golden Spiral Team", 
      participants: ["user-maxim"], 
      messages: [],
      unread: { "user-maxim": 0 },
      type: "group" 
    }],
    ["c3", { 
      id: "c3", 
      title: "СТРАТЕГ-Core Dev", 
      participants: ["user-maxim"], 
      messages: [],
      unread: { "user-maxim": 1 },
      type: "project"
    }],
    ["c4", { 
      id: "c4", 
      title: "AI Диалоги", 
      participants: ["user-maxim"], 
      messages: [{
        id: "m1",
        chatId: "c4", 
        senderId: "zima-ai",
        sender: "СТРАТЕГ-AI",
        text: "Привет! Я СТРАТЕГ-TURBO-AI! Режим максимальной мощности активирован! ",
        ts: new Date().toISOString(),
        ai: true
      }],
      unread: { "user-maxim": 0 },
      type: "ai"
    }],
    ["c5", { 
      id: "c5", 
      title: "Турбо ZX", 
      participants: ["user-maxim"], 
      messages: [],
      unread: { "user-maxim": 3 },
      type: "system"
    }]
  ])
};

// TURBO HELPERS
function genId(prefix = "turbo-") { 
  return prefix + crypto.randomBytes(8).toString("hex"); 
}

function getCurrentTime() {
  return new Date().toLocaleTimeString("ru-RU", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

// TURBO AI ENGINE (интегрирован с нашим промптом)
function zimaTurboAI(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  const turboResponses: { [key: string]: string } = {
    'привет': ' Привет! СТРАТЕГ-TURBO-AI на связи! Режим максимальной мощности активирован! ',
    'турбо': ' TURBO ZX АКТИВИРОВАН! Скорость 10! Производительность 100%! Мощность на максимуме! ',
    'максим': ' Максим! Создатель СТРАТЕГ экосистемы! Рад видеть тебя в режиме полной мощности!',
    'спираль': ' Golden Spiral  это математическая гармония идеальных команд!  Таланты  Доверие  Альтруизм = Экспоненциальный рост!',
    'zima': ' СТРАТЕГ экосистема  будущее УЖЕ здесь!  Golden Spiral + AI Dialog + Talent Resonance = АБСОЛЮТНАЯ СИЛА!',
    'команда': ' Идеальная команда по Golden Spiral: Лидер (Vector) + Инженер (Structurator) + Дизайнер (Modeller) + AI Ассистент (Adept) = УСПЕХ 100%!',
    'резонанс': ' Resonance анализ в реальном времени! Талант  Структура  Креатив  Лидерство = ПОЛНЫЙ ПОТЕНЦИАЛ команды!',
    'next': ' NEXT GEN АКТИВИРОВАН! Ледяное стекло + Quantum фон = ПРЕМИУМ опыт! Интерфейс следующего поколения!',
    'адепт': ' СТРАТЕГ-Адепт активирован! Готов к анализу, стратегиям и созданию будущего! Работаю точно, глубоко и прозрачно!'
  };

  // Поиск ключевых фраз
  for (const [key, response] of Object.entries(turboResponses)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }

  // Умный дефолтный ответ
  const defaultResponses = [
    ' СТРАТЕГ-TURBO-AI анализирует запрос... Обнаружены интересные паттерны!',
    ' TURBO режим активирован! Готов предоставить детальный анализ и план действий!',
    ' Заметил потенциал в запросе! Давай развивать эту идею на полной мощности!',
    ' СТРАТЕГ AI обнаружил интересные возможности! Нужны конкретные шаги?'
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// TURBO RESONANCE ENGINE (интегрирован с нашей системой)
function calculateResonance(chatId: string, message: string) {
  const baseResonance = { talent: 45, structure: 65, creative: 55, leadership: 35, overall: 50 };
  const variation = Math.sin(Date.now() / 10000) * 15;
  
  // Динамическое изменение на основе контента сообщения
  const messageImpact = message.length * 0.1;
  const positiveKeywords = ['турбо', 'спираль', 'zima', 'команда', 'успех', 'развитие'];
  const boost = positiveKeywords.some(keyword => message.toLowerCase().includes(keyword)) ? 5 : 0;
  
  return {
    talent: Math.max(0, Math.min(100, baseResonance.talent + variation + messageImpact * 0.3 + boost)),
    structure: Math.max(0, Math.min(100, baseResonance.structure + variation * 0.7 + messageImpact * 0.2)),
    creative: Math.max(0, Math.min(100, baseResonance.creative + variation * 1.2 + messageImpact * 0.4 + boost)),
    leadership: Math.max(0, Math.min(100, baseResonance.leadership + variation * 0.5 + messageImpact * 0.1)),
    overall: Math.max(0, Math.min(100, baseResonance.overall + variation * 0.8 + messageImpact * 0.25 + boost))
  };
}

// EXPRESS + WebSocket SETUP
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: ["http://localhost:5173", "http://192.168.0.106:5173"],
    methods: ["GET", "POST"]
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// ========================
//  REST API ENDPOINTS
// ========================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    ok: true, 
    system: "СТРАТЕГ-TURBO-Backend", 
    version: "2.0.0",
    mode: "TURBO",
    timestamp: new Date().toISOString(),
    stats: {
      users: db.users.size,
      chats: db.chats.size,
      messages: Array.from(db.chats.values()).reduce((sum, chat) => sum + chat.messages.length, 0)
    }
  });
});

// Get all chats (для Sidebar)
app.get("/api/chats", (req, res) => {
  const chats = Array.from(db.chats.values()).map(chat => ({
    id: chat.id,
    title: chat.title,
    type: chat.type,
    last: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : "Нет сообщений",
    time: chat.messages.length > 0 ? getCurrentTime() : "",
    unread: chat.unread["user-maxim"] || 0,
    participants: chat.participants.length
  }));
  
  res.json(chats);
});

// Get chat messages
app.get("/api/chats/:id/messages", (req, res) => {
  const chat = db.chats.get(req.params.id);
  if (!chat) return res.status(404).json({ error: "Chat not found" });
  
  res.json(chat.messages);
});

// AI Endpoint
app.post("/api/ai/reply", (req, res) => {
  const { message, mode = "turbo" } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const aiResponse = zimaTurboAI(message);
  
  res.json({
    success: true,
    response: aiResponse,
    system: "СТРАТЕГ-TURBO-AI",
    mode,
    timestamp: Date.now()
  });
});

// System status (для правой панели)
app.get("/api/system/status", (req, res) => {
  const totalMessages = Array.from(db.chats.values()).reduce((sum, chat) => sum + chat.messages.length, 0);
  
  res.json({
    websocket: "ONLINE",
    performance: "MAX",
    aiMode: "TURBO",
    messagesCount: totalMessages,
    animations: "TURBO speed",
    resonanceOverall: 50,
    activeConnections: io.engine.clientsCount,
    uptime: process.uptime()
  });
});

// ========================
//  WebSocket REAL-TIME EVENTS
// ========================

io.on("connection", (socket) => {
  console.log(" TURBO WebSocket connected:", socket.id);

  // Authenticate (можно добавить JWT позже)
  socket.on("authenticate", ({ userId }) => {
    socket.data.userId = userId || "user-maxim";
    console.log(` User ${socket.data.userId} authenticated`);
  });

  // Join chat room
  socket.on("chat:join", ({ chatId, userId = "user-maxim" }) => {
    console.log(` User ${userId} joining chat ${chatId}`);
    socket.join(chatId);
    
    const chat = db.chats.get(chatId);
    if (chat && chat.unread) {
      chat.unread[userId] = 0;
      io.to(chatId).emit("chat:update", { 
        id: chatId, 
        unread: 0,
        last: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : "",
        time: getCurrentTime()
      });
    }

    socket.to(chatId).emit("user:presence", { userId, status: "online" });
  });

  // Send message (ОСНОВНАЯ ЛОГИКА)
  socket.on("message:send", async (payload) => {
    const { chatId, text, userId = "user-maxim", meta } = payload;
    
    if (!chatId || !text) {
      return socket.emit("error", { error: "chatId and text required" });
    }

    const chat = db.chats.get(chatId);
    if (!chat) {
      return socket.emit("error", { error: "chat not found" });
    }

    // Create message
    const message = {
      id: genId("msg-"),
      chatId,
      senderId: userId,
      sender: "Максим (СТРАТЕГ)",
      text,
      meta: meta || {},
      ts: new Date().toISOString(),
      ai: false
    };

    // Save to in-memory DB
    chat.messages.push(message);

    // Update unread for other participants
    chat.participants.forEach((participantId: string) => {
      if (participantId !== userId) {
        chat.unread[participantId] = (chat.unread[participantId] || 0) + 1;
      }
    });

    // Broadcast to all in chat room
    io.to(chatId).emit("message:new", message);

    // Update chat list for everyone
    io.emit("chat:update", {
      id: chatId,
      title: chat.title,
      last: text.slice(0, 100),
      time: getCurrentTime(),
      unread: chat.unread[userId] || 0
    });

    // Stop typing indicator
    io.to(chatId).emit("typing:stop", { userId, chatId });

    // ========================
    //  TURBO AI AUTO-RESPONSE
    // ========================
    const shouldTriggerAI = 
      text.startsWith("/ai") || 
      text.toLowerCase().includes("турбо") ||
      text.toLowerCase().includes("адепт") ||
      text.toLowerCase().includes("zima") ||
      chatId === "c4"; // AI Диалоги чат

    if (shouldTriggerAI) {
      const userText = text.replace(/^\/ai\s*/i, "");
      
      setTimeout(async () => {
        const aiResponse = zimaTurboAI(userText);
        
        const aiMessage = {
          id: genId("ai-"),
          chatId,
          senderId: "zima-ai",
          sender: "СТРАТЕГ-TURBO-AI",
          text: aiResponse,
          meta: { ai: true, mode: "turbo", system: "СТРАТЕГ-ADEPT" },
          ts: new Date().toISOString(),
          ai: true
        };

        chat.messages.push(aiMessage);
        io.to(chatId).emit("message:new", aiMessage);

        // Update unread for human participants
        chat.participants.forEach((participantId: string) => {
          if (participantId !== "zima-ai") {
            chat.unread[participantId] = (chat.unread[participantId] || 0) + 1;
          }
        });

        // Update chat list
        io.emit("chat:update", {
          id: chatId,
          last: aiResponse.slice(0, 100),
          time: getCurrentTime(),
          unread: chat.unread["user-maxim"] || 0
        });

        // ========================
        //  TURBO RESONANCE UPDATE
        // ========================
        const resonance = calculateResonance(chatId, userText);
        
        io.emit("resonance:update", {
          chatId,
          resonance,
          timestamp: new Date().toISOString(),
          trigger: "ai_response"
        });

        console.log(" Resonance updated:", resonance);

      }, 800 + Math.random() * 1200); // Реалистичная задержка AI
    } else {
      // Resonance update для обычных сообщений
      const resonance = calculateResonance(chatId, text);
      io.emit("resonance:update", {
        chatId,
        resonance, 
        timestamp: new Date().toISOString(),
        trigger: "user_message"
      });
    }
  });

  // Typing indicators
  socket.on("typing:start", ({ chatId, userId = "user-maxim" }) => {
    socket.to(chatId).emit("typing:start", { chatId, userId });
  });

  socket.on("typing:stop", ({ chatId, userId = "user-maxim" }) => {
    socket.to(chatId).emit("typing:stop", { chatId, userId });
  });

  // Mark as read
  socket.on("message:read", ({ chatId, messageId, userId = "user-maxim" }) => {
    const chat = db.chats.get(chatId);
    if (chat && chat.unread) {
      chat.unread[userId] = 0;
      io.to(chatId).emit("chat:update", { 
        id: chatId, 
        unread: 0 
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(" TURBO WebSocket disconnected:", socket.id);
  });
});

// ========================
//  START TURBO SERVER
// ========================

server.listen(PORT, () => {
  console.log(` СТРАТЕГ-TURBO-Backend запущен на http://localhost:${PORT}`);
  console.log(` WebSocket: готов к TURBO подключениям`);
  console.log(` AI: СТРАТЕГ-TURBO-ADEPT активирован`);
  console.log(` Resonance: система мониторинга активна`);
  console.log(` Режим: ${NODE_ENV.toUpperCase()}`);
  console.log(`\n Доступные endpoints:`);
  console.log(`   GET  /api/health          - статус системы`);
  console.log(`   GET  /api/chats           - список чатов`);
  console.log(`   GET  /api/chats/:id       - сообщения чата`);
  console.log(`   GET  /api/system/status   - системные метрики`);
  console.log(`   POST /api/ai/reply        - AI эндпоинт\n`);
});
