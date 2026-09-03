// src/core/useDialogCore.ts
// React хук для работы с единым ядром STRATEG-RUSSIA

import { useState, useEffect, useCallback } from 'react';
import { getDialogCore, Message, ConnectionState, MessageRecord } from './dialogCore';
import type { ReplyTo } from '../types/message';

export interface UseDialogCoreReturn {
  // Состояние
  connectionState: ConnectionState;
  messages: Message[];

  // Действия
  connect: () => void;
  disconnect: () => void;
  sendMessage: (to: string, text: string, files?: File[], replyTo?: ReplyTo, context?: Message['context']) => void;
  loadHistory: (chatId: string) => Promise<MessageRecord[]>;
  switchChat: (chatId: string) => void;
  onChatSwitch: (callback: (chatId: string) => void) => () => void;
  
  // Ошибки
  onError: (callback: (error: string) => void) => () => void;
}

export const useDialogCore = (): UseDialogCoreReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    currentStrategId: null,
    hasPeer: false
  });
  const [messages, setMessages] = useState<Message[]>([]);

  const core = getDialogCore();

  useEffect(() => {
    // Подписываемся на изменения состояния соединения
    const unsubscribeConnection = core.onConnectionChange((newState) => {
      setConnectionState(newState);
    });

    // Подписываемся на изменения сообщений
    const unsubscribeMessages = core.onMessagesChange((newMessages) => {
      setMessages(newMessages);
    });

    // Подключаемся при монтировании
    core.connect();

    // Отписываемся при размонтировании
    return () => {
      unsubscribeConnection();
      unsubscribeMessages();
      core.disconnect();
    };
  }, [core]);

  const connect = useCallback(() => {
    core.connect();
  }, [core]);

  const disconnect = useCallback(() => {
    core.disconnect();
  }, [core]);

  const sendMessage = useCallback((to: string, text: string, files?: File[], replyTo?: ReplyTo, context?: Message['context']) => {
    core.sendMessage(to, text, files, replyTo, context).catch(err => console.error(err));
  }, [core]);

  const onError = useCallback((callback: (error: string) => void) => {
    return core.onError(callback);
  }, [core]);

  const loadHistory = useCallback(async (chatId: string) => {
    return core.loadHistory(chatId);
  }, [core]);

  const switchChat = useCallback((chatId: string) => {
    core.switchChat(chatId);
  }, [core]);

  const onChatSwitch = useCallback((callback: (chatId: string) => void) => {
    return core.onChatSwitch(callback);
  }, [core]);

  return {
    connectionState,
    messages,
    connect,
    disconnect,
    sendMessage,
    loadHistory,
    switchChat,
    onChatSwitch,
    onError
  };
};

