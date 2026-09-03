export type ID = string;

export interface User {
  id: ID;
  name: string;
  status?: "online" | "offline" | "away";
}

export interface ChatSummary {
  id: ID;
  title: string;
  last: string;
  time: string;
  unread: number;
  pinned?: boolean;
  isGroup?: boolean;
}

export interface Message {
  id: ID;
  chatId: ID;
  senderId?: ID;
  sender?: "user" | "ai" | "system";
  text: string;
  ts: string;
  meta?: Record<string, any>;
  acknowledged?: boolean;
  readBy?: ID[];
}

export interface Resonance {
  talent: number;
  structure: number;
  creative: number;
  leadership: number;
  overall: number;
}

export interface SystemState {
  websocket: "ONLINE" | "OFFLINE" | "RECONNECTING";
  performance: "MAX" | "HIGH" | "NORMAL";
  aiMode: "TURBO" | "NORMAL";
  messagesCount: number;
  animations: string;
  resonanceOverall: number;
}

export interface AppState {
  user: User;
  system: SystemState;
  chats: ChatSummary[];
  activeChatId: ID;
  activeChat: {
    id: ID;
    messages: Message[];
  };
  resonance: Resonance;
}
