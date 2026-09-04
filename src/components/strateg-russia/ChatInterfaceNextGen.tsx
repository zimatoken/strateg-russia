import React, { useEffect, useRef, useState } from "react";
import MessageInput from "../MessageInput";
import { useDialogCore } from "../../core/useDialogCore";
import { getDialogCore, type FileAttachment, type Message } from "../../core/dialogCore";
import { onBroadcast, sendBroadcast } from "../../core/broadcast";
import { useToast } from "../../hooks/useToast";
import { ToastContainer } from "../ui/Toast";
import { QRShare } from "../QRShare";
import { isValidStrategId } from "../../core/deepLink";
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush, getNotificationPermission } from "../../core/pushNotifications";
import GroupList from "../GroupList";
import CreateGroupModal from "../CreateGroupModal";
import GroupChatView from "../GroupChatView";
import { createGroup, loadGroups, loadGroupMessages, sendGroupMessage, type GroupChat, type GroupMessage } from "../../core/groupChat";
import { VoiceRecorderButton } from "../VoiceRecorderButton";
import { VoiceMessagePlayer } from "../VoiceMessagePlayer";
import ContactList from "../ContactList";
import AddContactModal from "../AddContactModal";
import { Avatar } from "../Avatar";
import { getContact, getAllContacts } from "../../core/contact";
import { BottomActions } from "./BottomActions";
import ProfileModal from "../ProfileModal";
import SearchBar from "../SearchBar"; // STAGE7
import { updateBadge } from "../../utils/badge";
import MessageStatus from "../MessageStatus";
import QuotedMessage from "../QuotedMessage";
import type { ReplyTo } from "../../types/message";
// STAGE9: Mobile components
import MobileHeader from "../mobile/MobileHeader";
import MobileSidebar from "../mobile/MobileSidebar";
import MobileBottomNav from "../mobile/MobileBottomNav";
import MobileChatView from "../mobile/MobileChatView";

interface ChatInterfaceNextGenProps {
  deepLinkTargetId?: string | null;
}

export default function ChatInterfaceNextGen({ deepLinkTargetId }: ChatInterfaceNextGenProps) {
  const [targetId, setTargetId] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeView, setActiveView] = useState<'personal' | 'groups'>('personal');
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [activeContact, setActiveContact] = useState<{id:string; name:string; avatar:string; color:string} | null>(null);
  const [contactRefreshKey, setContactRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chats' | 'contacts' | 'groups' | 'profile'>('chats'); // STAGE9
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const raw = window.localStorage.getItem('strateg_unread_counts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    const saved = window.localStorage.getItem('strateg_notifications_enabled');
    return saved !== 'false';
  });

  // STAGE9: Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<Record<string, GroupMessage[]>>({});
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // STAGE_B_4: Typing indicator state
  const typingTimeoutRef = useRef<number | null>(null);
  const [profileName, setProfileName] = useState(() => localStorage.getItem('strateg_profile_name') || 'Мой профиль');
  const [profileAvatarId, setProfileAvatarId] = useState(() => localStorage.getItem('strateg_profile_avatar_id') || 'avatar-robot');
  const [contactsMap, setContactsMap] = useState<Record<string, string>>({});
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousMessagesRef = useRef<Message[]>([]);
  const initialMessagesSyncRef = useRef(true);

  const { connectionState, messages, sendMessage, onError, loadHistory, switchChat, onChatSwitch } = useDialogCore();
  const { toasts, showToast, removeToast } = useToast();
  const dialogCore = getDialogCore();

  // STAGE_A_1: Use "Вы" for outgoing messages instead of profile name
  const getMessageSenderName = (message: Message): string => {
    if (message.isUser) {
      return 'Вы';
    }
    const senderId = (message.from || targetId || '').trim().toUpperCase();
    return contactsMap[senderId] || senderId || 'Собеседник';
  };

  // STAGE_A_2: Format time without seconds, show date for older messages
  const formatMessageTime = (timestamp: number): string => {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // If less than 24 hours, show only time
    if (diffHours < 24) {
      return msgDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }

    // If within current year, show day and month
    if (msgDate.getFullYear() === now.getFullYear()) {
      return msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    // Otherwise show full date
    return msgDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // STAGE_B_1: Format date for divider (today, yesterday, day name, full date)
  const formatDateDivider = (timestamp: number): string => {
    const now = new Date();
    const msgDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Сегодня';
    }

    if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    }

    // If within current week, show day name
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays > 1) {
      return days[msgDate.getDay()];
    }

    // If within current year, show day and month
    if (msgDate.getFullYear() === now.getFullYear()) {
      return msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    }

    // Otherwise show full date
    return msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const activeContactName = activeContact?.name ?? targetId;

  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const stopTyping = () => {
    clearTypingTimeout();
    setIsTyping(false);
    const trimmedTarget = targetId.trim().toUpperCase();
    if (trimmedTarget && connectionState.currentStrategId) {
      sendBroadcast('TYPING_STOP', { chatId: trimmedTarget, from: connectionState.currentStrategId });
    }
  };

  const startTyping = () => {
    const trimmedTarget = targetId.trim().toUpperCase();
    if (!trimmedTarget || !connectionState.currentStrategId) {
      return;
    }
    sendBroadcast('TYPING_START', { chatId: trimmedTarget, from: connectionState.currentStrategId });
  };

  // BUGFIX 1 & 3: Handle file attachment with preview
  const handleFileAttach = (file: File) => {
    // BUGFIX 1: Store file for preview instead of immediate send
    setAttachedFile(file);
    showToast('Файл прикреплён', 'success');
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await dialogCore.deleteMessage(messageId);
      showToast('Сообщение удалено', 'success');
    } catch (error) {
      console.error('Failed to delete message:', error);
      showToast('Не удалось удалить сообщение', 'error');
    }
  };

  const handleReplyMessage = (message: Message | null | undefined) => {
    if (!message) return;
    const replyText = message.text?.trim() || (message.files?.length ? '[Файл]' : 'Сообщение');
    setReplyingTo({
      messageId: message.id,
      senderName: getMessageSenderName(message),
      text: replyText,
    });
  };

  const handleReplyClick = (messageId?: string) => {
    if (!messageId) return;
    setHighlightedMessageId(messageId);
    const element = messageRefs.current[messageId];
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => setHighlightedMessageId((current) => (current === messageId ? null : current)), 2200);
  };

  const handleReplyCancel = () => {
    setReplyingTo(null);
  };

  const handleSendMessage = async (txt: string, files?: File[], replyTo?: ReplyTo | null) => {
    const trimmedTarget = targetId.trim();
    if (!trimmedTarget) return;
    stopTyping();

    if (files?.length) {
      setIsUploading(true);
      setUploadProgress(15);
      const progressTimer = window.setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 10 : p));
      }, 200);
      try {
        await dialogCore.sendMessage(trimmedTarget, txt, files, replyTo ?? undefined);
        setUploadProgress(100);
        setReplyingTo(null);
      } finally {
        window.clearInterval(progressTimer);
        setAttachedFile(null);
        window.setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 400);
      }
      return;
    }

    await dialogCore.sendMessage(trimmedTarget, txt, files, replyTo ?? undefined);
    setAttachedFile(null);
    setReplyingTo(null);
  };

  // STAGE6: Profile editing handlers - ensure avatar saves to localStorage
  const handleProfileSave = (name: string, avatarId: string) => {
    setProfileName(name);
    setProfileAvatarId(avatarId);
    localStorage.setItem('strateg_profile_name', name);
    localStorage.setItem('strateg_profile_avatar_id', avatarId);
    console.log('STAGE6: Profile saved - avatarId:', avatarId); // STAGE6 debug
    setShowProfileModal(false);
    showToast('Профиль сохранён', 'success');
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setProfileDropdownOpen(false);
  };

  // BUGFIX 2: Image modal handlers
  const handleImageClick = (src: string) => {
    setImageModalSrc(src);
    setImageModalOpen(true);
  };

  const handleVoiceMessage = async (blob: Blob) => {
    const trimmedTarget = targetId.trim();
    if (!trimmedTarget) {
      showToast('Please select a contact first', 'error');
      return;
    }
    stopTyping();
    await sendMessage(trimmedTarget, '', [new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })]);
  };

  const handleClearChat = async () => {
    const trimmedTarget = targetId.trim();
    if (!trimmedTarget) {
      showToast('Please select a contact first', 'error');
      return;
    }
    if (!window.confirm('Очистить все ваши сообщения в этом чате?')) return;

    try {
      // HOTFIX: clear React state, localStorage, IndexedDB, and broadcast to other tabs
      await dialogCore.clearChat(trimmedTarget);
      showToast('Чат очищен', 'success');
    } catch (error) {
      console.error('Failed to clear chat:', error);
      showToast('Не удалось очистить чат', 'error');
    }
  };

  useEffect(() => {
    void (async () => {
      const contacts = await getAllContacts();
      const map: Record<string, string> = {};
      contacts.forEach((contact) => {
        map[contact.id.toUpperCase()] = contact.name;
      });
      setContactsMap(map);
    })();
  }, [contactRefreshKey]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'strateg_profile_avatar_id' && event.newValue) {
        setProfileAvatarId(event.newValue);
      }
      if (event.key === 'strateg_profile_name' && event.newValue) {
        setProfileName(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const unsubscribe = onError((error) => {
      showToast(error, 'error');
    });
    return unsubscribe;
  }, [onError, showToast]);

  useEffect(() => {
    const unsubscribe = onChatSwitch((chatId) => {
      setTargetId(chatId);
      void (async () => {
        const contact = await getContact(chatId);
        setActiveContact(contact ? { id: contact.id, name: contact.name, avatar: contact.avatar, color: contact.color } : null);
      })();
    });
    return unsubscribe;
  }, [onChatSwitch]);

  useEffect(() => {
    const unsubscribe = onBroadcast((msg) => {
      if (msg.type !== 'TYPING_START' && msg.type !== 'TYPING_STOP') {
        return;
      }

      const chatId = String(msg.payload?.chatId || '').toUpperCase();
      const senderId = String(msg.payload?.from || '');
      const currentTarget = targetId.trim().toUpperCase();

      if (!chatId || chatId !== currentTarget || senderId === connectionState.currentStrategId) {
        return;
      }

      if (msg.type === 'TYPING_START') {
        clearTypingTimeout();
        setIsTyping(true);
        typingTimeoutRef.current = window.setTimeout(() => {
          setIsTyping(false);
          typingTimeoutRef.current = null;
        }, 3000);
      } else {
        stopTyping();
      }
    });

    return () => {
      unsubscribe();
      clearTypingTimeout();
    };
  }, [connectionState.currentStrategId, targetId]);

  useEffect(() => {
    if (deepLinkTargetId) {
      setTargetId(deepLinkTargetId);
      void (async () => {
        const contact = await getContact(deepLinkTargetId);
        setActiveContact(contact ? { id: contact.id, name: contact.name, avatar: contact.avatar, color: contact.color } : null);
      })();
      return;
    }

    const savedChat = localStorage.getItem('strateg-last-chat');
    if (savedChat && isValidStrategId(savedChat) && !targetId) {
      setTargetId(savedChat);
    }
  }, [deepLinkTargetId]);

  useEffect(() => {
    const trimmedTarget = targetId.trim().toUpperCase();
    if (trimmedTarget && isValidStrategId(trimmedTarget)) {
      setIsLoadingHistory(true);
      void (async () => {
        try {
          await loadHistory(trimmedTarget);
          switchChat(trimmedTarget);
          const contact = await getContact(trimmedTarget);
          
          // STAGE_B_3: Reset unread count when opening chat
          if (unreadCounts[trimmedTarget] > 0) {
            setUnreadCounts(prev => {
              const updated = { ...prev };
              updated[trimmedTarget] = 0;
              localStorage.setItem('strateg_unread_counts', JSON.stringify(updated));
              return updated;
            });
          }
          
          setActiveContact(contact ? { id: contact.id, name: contact.name, avatar: contact.avatar, color: contact.color } : null);
        } catch (err) {
          console.error('Failed to load history:', err);
        } finally {
          setIsLoadingHistory(false);
        }
      })();
    }
  }, [targetId, loadHistory, switchChat]);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('strateg_notifications_enabled', String(notificationsEnabled));
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    // STAGE10: keep favicon badge in sync with unread state
    const total = Object.values(unreadCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    updateBadge(total);
  }, [unreadCounts]);

  useEffect(() => {
    if (!targetId) {
      return;
    }

    const normalized = targetId.trim().toUpperCase();
    setUnreadCounts((current) => {
      if ((current[normalized] || 0) === 0) {
        return current;
      }

      const nextCounts = { ...current, [normalized]: 0 };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('strateg_unread_counts', JSON.stringify(nextCounts));
      }
      return nextCounts;
    });
  }, [targetId]);

  useEffect(() => {
    // Check push support and subscription status
    if (isPushSupported()) {
      setPushEnabled(isPushSubscribed());
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const loadedGroups = await loadGroups();
      setGroups(loadedGroups);
      if (!selectedGroupId && loadedGroups[0]) {
        setSelectedGroupId(loadedGroups[0].id);
      }
      for (const group of loadedGroups) {
        const roomMessages = await loadGroupMessages(group.id);
        setGroupMessages((current) => ({ ...current, [group.id]: roomMessages }));
      }
    })();
  }, []);

  useEffect(() => {
    if (initialMessagesSyncRef.current) {
      initialMessagesSyncRef.current = false;
      previousMessagesRef.current = messages;
      return;
    }

    const incomingMessages = messages.filter((message) => !previousMessagesRef.current.some((prev) => prev.id === message.id) && !message.isUser);
    if (incomingMessages.length > 0) {
      const activeChat = targetId.trim().toUpperCase();
      setUnreadCounts((current) => {
        const nextCounts = { ...current };
        incomingMessages.forEach((message) => {
          const chatId = (message.from || '').trim().toUpperCase();
          if (chatId && chatId !== activeChat) {
            nextCounts[chatId] = (nextCounts[chatId] || 0) + 1;
          }
        });
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('strateg_unread_counts', JSON.stringify(nextCounts));
        }
        return nextCounts;
      });
    }

    previousMessagesRef.current = messages;
  }, [messages, targetId]);

  useEffect(() => {
    const core = getDialogCore();
    const unsubscribeGroupMessages = core.onGroupMessageReceived((message) => {
      setGroupMessages((current) => ({
        ...current,
        [message.roomId]: [...(current[message.roomId] ?? []), {
          ...message,
          type: 'GROUP_MESSAGE' as const,
        }]
      }));
    });

    const unsubscribeGroupUpdates = core.onGroupUpdate(async (update) => {
      const loadedGroups = await loadGroups();
      setGroups(loadedGroups);
      if (update.roomId) {
        const roomMessages = await loadGroupMessages(update.roomId);
        setGroupMessages((current) => ({ ...current, [update.roomId]: roomMessages }));
      }
    });

    return () => {
      unsubscribeGroupMessages();
      unsubscribeGroupUpdates();
    };
  }, []);

  // STAGE6: handleCreateGroup with avatarId
  const handleCreateGroup = async (name: string, members: string[], avatarId: string) => {
    const createdGroup = await createGroup(name, members, avatarId);
    setGroups((current) => [createdGroup, ...current]);
    setSelectedGroupId(createdGroup.id);
    setActiveView('groups');
  };

  // STAGE7: Search handlers
  const handleSearchContactSelect = (contactId: string) => {
    void handleSelectContact(contactId);
  };

  const handleSearchGroupSelect = (groupId: string) => {
    void handleSelectGroup(groupId);
  };

  const handleSearchMessageSelect = (contactId: string, _messageId: string) => {
    void handleSelectContact(contactId);
    // STAGE7: TODO - scroll to message (implement if needed)
  };

  const handleSelectGroup = async (roomId: string) => {
    setSelectedGroupId(roomId);
    setActiveView('groups');
    const roomMessages = await loadGroupMessages(roomId);
    setGroupMessages((current) => ({ ...current, [roomId]: roomMessages }));
  };

  const handleSelectContact = async (id: string) => {
    const normalized = id.trim().toUpperCase();
    setTargetId(normalized);
    setUnreadCounts((current) => {
      const nextCounts = { ...current, [normalized]: 0 };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('strateg_unread_counts', JSON.stringify(nextCounts));
      }
      return nextCounts;
    });
    const contact = await getContact(normalized);
    setActiveContact(contact ? { id: contact.id, name: contact.name, avatar: contact.avatar, color: contact.color } : null);
  };

  const handleOpenAddContact = () => {
    setShowAddContactModal(true);
  };

  const handleContactSaved = async (id: string) => {
    setContactRefreshKey((value) => value + 1);
    const normalized = id.trim().toUpperCase();
    setTargetId(normalized);
    setUnreadCounts((current) => {
      const nextCounts = { ...current, [normalized]: 0 };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('strateg_unread_counts', JSON.stringify(nextCounts));
      }
      return nextCounts;
    });
    const contact = await getContact(normalized);
    setActiveContact(contact ? { id: contact.id, name: contact.name, avatar: contact.avatar, color: contact.color } : null);
  };

  const togglePushNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      if (pushEnabled) {
        const success = await unsubscribeFromPush();
        if (success) {
          setPushEnabled(false);
        }
      }
      showToast('Уведомления отключены', 'success');
      return;
    }

    const permission = getNotificationPermission();
    if (permission === 'denied') {
      showToast('Уведомления запрещены в настройках браузера', 'error');
      return;
    }

    if (permission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
      const requestResult = await Notification.requestPermission();
      if (requestResult !== 'granted') {
        showToast('Разрешите уведомления в браузере', 'error');
        return;
      }
    }

    if (isPushSupported()) {
      const success = await subscribeToPush();
      setPushEnabled(success);
      if (!success) {
        showToast('Не удалось активировать push-уведомления', 'error');
        return;
      }
    }

    setNotificationsEnabled(true);
    showToast('Уведомления включены', 'success');
  };

  const handleMobileChatBack = () => {
    setTargetId('');
    setActiveContact(null);
    setMobileTab('chats');
  };

  const handleMobileTabChange = (tab: 'chats' | 'contacts' | 'groups' | 'profile') => {
    setMobileTab(tab);
  };

  const handleMobileSelectContact = async (id: string) => {
    await handleSelectContact(id);
    setMobileTab('chats');
    setIsSidebarOpen(false);
  };

  const handleMobileSelectGroup = async (roomId: string) => {
    await handleSelectGroup(roomId);
    setMobileTab('chats');
    setIsSidebarOpen(false);
  };

  const renderMobileContent = () => {
    if (mobileTab === 'contacts') {
      return (
        <div className="mobile-tab-panel">
          <div className="mobile-panel-header">
            <div className="mobile-panel-title">Контакты</div>
            <button className="mobile-panel-action" onClick={handleOpenAddContact}>+ Добавить</button>
          </div>
          <div className="mobile-panel-card">
            <ContactList
              activeContactId={targetId || undefined}
              onSelectContact={handleMobileSelectContact}
              refreshKey={contactRefreshKey}
              unreadCounts={unreadCounts}
            />
          </div>
        </div>
      );
    }

    if (mobileTab === 'groups') {
      return (
        <div className="mobile-tab-panel">
          <div className="mobile-panel-header">
            <div className="mobile-panel-title">Группы</div>
            <button className="mobile-panel-action" onClick={() => setShowCreateGroupModal(true)}>+ Создать</button>
          </div>
          <div className="mobile-panel-card">
            <GroupList
              groups={groups}
              selectedRoomId={selectedGroupId ?? null}
              onSelectRoom={handleMobileSelectGroup}
              onCreateGroup={() => setShowCreateGroupModal(true)}
            />
          </div>
        </div>
      );
    }

    if (mobileTab === 'profile') {
      return (
        <div className="mobile-tab-panel">
          <div className="mobile-panel-title">Профиль</div>
          <div className="mobile-panel-card mobile-profile-card">
            <div className="mobile-profile-row">
              <Avatar type={profileAvatarId} size={48} color="#3b82f6" />
              <div>
                <div className="mobile-profile-name">{profileName}</div>
                <div className="mobile-profile-id">{connectionState.currentStrategId || 'Не подключено'}</div>
              </div>
            </div>
            <button className="mobile-panel-action full-width" onClick={() => setShowProfileModal(true)}>Редактировать профиль</button>
            <button className="mobile-panel-action full-width" onClick={handleOpenAddContact}>Добавить контакт</button>
            <button className="mobile-panel-action full-width" onClick={() => setShowCreateGroupModal(true)}>Создать группу</button>
          </div>
        </div>
      );
    }

    if (targetId) {
      return (
        <MobileChatView
          targetId={targetId}
          activeContact={activeContact}
          messages={messages}
          isLoadingHistory={isLoadingHistory}
          onBack={handleMobileChatBack}
          onSendMessage={handleSendMessage}
          onVoiceRecord={async (blob) => {
            await sendMessage(targetId, '', [new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })]);
          }}
          onClearChat={() => {/* TODO: implement */}}
          onSettingsClick={() => {/* TODO: implement */}}
          connectionState={{ isConnected: connectionState.connectionStatus === 'connected', currentStrategId: connectionState.currentStrategId || '' }}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          contextMenuMessageId={contextMenuMessageId}
          contextMenuPos={contextMenuPos}
          setContextMenuMessageId={setContextMenuMessageId}
          setContextMenuPos={setContextMenuPos}
          imageModalOpen={imageModalOpen}
          imageModalSrc={imageModalSrc}
          setImageModalOpen={setImageModalOpen}
          setImageModalSrc={setImageModalSrc}
          profileName={profileName}
          profileAvatarId={profileAvatarId}
          replyTo={replyingTo}
          onReplyCancel={handleReplyCancel}
          onReplyClick={handleReplyClick}
          onReplyMessage={handleReplyMessage}
          highlightedMessageId={highlightedMessageId}
        />
      );
    }

    return (
      <div className="mobile-tab-panel">
        <div className="mobile-panel-title">Чаты</div>
        <div className="mobile-panel-card mobile-empty-state">
          <div className="empty-chat-icon">💬</div>
          <div className="empty-chat-text">Выберите контакт для начала диалога</div>
          <button className="mobile-panel-action full-width" onClick={handleOpenAddContact}>Добавить контакт</button>
        </div>
      </div>
    );
  };

  return (
    <div className="strateg-russia-next-root">
      {/* STAGE9: Mobile layout */}
      {isMobile ? (
        <>
          <MobileHeader
            title={mobileTab === 'contacts' ? 'Контакты' : mobileTab === 'groups' ? 'Группы' : mobileTab === 'profile' ? 'Профиль' : (targetId ? (activeContact?.name ?? targetId) : 'STRATEG-RUSSIA')}
            subtitle={mobileTab === 'chats' && targetId ? (activeContact?.name ? targetId : undefined) : undefined}
            avatar={mobileTab === 'chats' && activeContact?.avatar ? activeContact.avatar : undefined}
            avatarColor={mobileTab === 'chats' ? activeContact?.color : undefined}
            showBackButton={mobileTab === 'chats' && !!targetId}
            onBack={handleMobileChatBack}
            onMenu={() => setIsSidebarOpen(true)}
          />

          <MobileSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            profileName={profileName}
            profileAvatarId={profileAvatarId}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenAddContact={handleOpenAddContact}
            onOpenCreateGroup={() => setShowCreateGroupModal(true)}
            onSelectContact={handleSelectContact}
            onSelectGroup={handleSelectGroup}
            groups={groups}
            contactRefreshKey={contactRefreshKey}
          />

          {renderMobileContent()}

          <MobileBottomNav
            activeTab={mobileTab}
            onTabChange={handleMobileTabChange}
          />

          {/* Modals */}
          {showAddContactModal && (
            <AddContactModal
              onClose={() => setShowAddContactModal(false)}
              onSaved={handleContactSaved}
            />
          )}

          {showCreateGroupModal && connectionState.currentStrategId && (
            <CreateGroupModal
              myId={connectionState.currentStrategId}
              contacts={[connectionState.currentStrategId, ...Object.keys(localStorage).filter((key) => key.startsWith('strateg'))]}
              onCreate={handleCreateGroup}
              onClose={() => setShowCreateGroupModal(false)}
            />
          )}

          {showShareModal && connectionState.currentStrategId && (
            <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
              <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
                <QRShare
                  strategId={connectionState.currentStrategId}
                  onClose={() => setShowShareModal(false)}
                />
              </div>
            </div>
          )}

          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            onSave={handleProfileSave}
            currentName={profileName}
            currentAvatarId={profileAvatarId}
            currentStrategId={connectionState.currentStrategId ?? ''}
          />

          {imageModalOpen && (
            <div className="modal-overlay" onClick={() => setImageModalOpen(false)}>
              <div className="modal-content image-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setImageModalOpen(false)}>×</button>
                <img src={imageModalSrc} alt="Full size" className="image-modal-img" />
              </div>
            </div>
          )}

          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </>
      ) : (
        /* STAGE9: Desktop layout (unchanged) */
        <div className="strateg-russia-card">
        <div className="strateg-russia-top">
          <button type="button" className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            ≡
          </button>
          <div className="strateg-russia-header">
            {/* BUGFIX 6: Add logo to header */}
            <img 
              src="/logo.png" 
              alt="STRATEG-RUSSIA" 
              className="strateg-russia-logo"
              onClick={() => window.location.reload()}
              style={{ cursor: 'pointer' }}
              onError={(e) => { (e.target as HTMLImageElement).src = '/icon-192.svg'; }}
            />
            <div className="strateg-russia-title">STRATEG-RUSSIA</div>
            <div className="strateg-russia-badges">
              <span className="badge">v1.0</span>
            </div>
          </div>
          <div className="ribbons">
            <button type="button" className={`ribbon ${activeView === 'personal' ? 'active' : ''}`} onClick={() => setActiveView('personal')}>
              Личные
            </button>
            <button type="button" className={`ribbon ${activeView === 'groups' ? 'active' : ''}`} onClick={() => setActiveView('groups')}>
              Группы
            </button>
          </div>
          {/* STAGE7: Global Search Bar */}
          <SearchBar
            onContactSelect={handleSearchContactSelect}
            onGroupSelect={handleSearchGroupSelect}
            onMessageSelect={handleSearchMessageSelect}
          />
          <button type="button" className="btn-add-contact" onClick={handleOpenAddContact}>
            + Добавить контакт
          </button>
        </div>

        <div className="strateg-body">
          <div className="strateg-chat chat-area">
            {activeView === 'groups' ? (
              <>
                <GroupChatView group={groups.find((group) => group.id === selectedGroupId) ?? null} messages={selectedGroupId ? (groupMessages[selectedGroupId] ?? []) : []} myId={connectionState.currentStrategId ?? ''} />
                <div className="input-bar">
                  <VoiceRecorderButton
                    disabled={!connectionState.isConnected || !selectedGroupId}
                    onRecord={async (blob, duration) => {
                      if (!selectedGroupId) return;
                      const reader = new FileReader();
                      const data = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                      });
                      const attachment: FileAttachment = {
                        name: `voice-${Date.now()}.webm`,
                        type: 'audio/webm',
                        size: blob.size,
                        data,
                        meta: { duration },
                      };
                      await sendGroupMessage(selectedGroupId, '', [new File([blob], attachment.name, { type: attachment.type })]);
                    }}
                  />
                  <MessageInput
                    disabled={!connectionState.isConnected || !selectedGroupId}
                    onSend={(txt, files) => {
                      if (!selectedGroupId) return;
                      void sendGroupMessage(selectedGroupId, txt, files);
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="chat-header">
                  {targetId ? (
                    <>
                      <div className="chat-header-avatar">
                        <Avatar type={activeContact?.avatar ?? 'avatar-robot'} size={40} color={activeContact?.color ?? '#3b82f6'} />
                      </div>
                      <div className="chat-header-info">
                        <div className="chat-header-name chat-contact-name">{activeContactName}</div>
                        <div className="chat-header-id chat-contact-id">{targetId}</div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-chat">
                      <div className="empty-chat-icon">💬</div>
                      <div className="empty-chat-text">Выберите контакт для начала диалога</div>
                    </div>
                  )}
                  {targetId && !activeContact && (
                    <button type="button" className="btn-add-contact" onClick={handleOpenAddContact}>Добавить</button>
                  )}
                </div>
                {isTyping && (
                  <div className="typing-indicator">
                    <div className="dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                    <span>Собеседник печатает...</span>
                  </div>
                )}
                <div className="messages" ref={listRef}>
                  {isLoadingHistory ? (
                    <div className="empty-chat-text">Загрузка истории...</div>
                  ) : messages.length === 0 ? (
                    <div className="empty-chat">
                      {/* STAGE_A_4: Enhanced empty chat welcome */}
                      <div className="empty-chat-icon">🤖</div>
                      {targetId ? (
                        <>
                          <div className="empty-chat-text">
                            Начните диалог с {activeContactName}
                          </div>
                          <div className="empty-chat-subtext">
                            Отправьте сообщение, файл или голосовое сообщение
                          </div>
                        </>
                      ) : (
                        <div className="empty-chat-text">Начните диалог...</div>
                      )}
                    </div>
                  ) : (
                    // STAGE_B_1: Render messages with date dividers
                    messages.map((msg, index) => {
                      const prevMsg = messages[index - 1];
                      const showDateDivider = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateDivider && (
                            <div className="date-divider">
                              <span className="date-divider-text">{formatDateDivider(msg.timestamp)}</span>
                            </div>
                          )}
                          <div
                            ref={(node) => {
                              messageRefs.current[msg.id] = node;
                            }}
                            className={`msg-bubble ${msg.isUser ? 'msg-user' : 'msg-ai'} ${highlightedMessageId === msg.id ? 'msg-highlight' : ''}`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenuMessageId(msg.id);
                              setContextMenuPos({ x: e.clientX, y: e.clientY });
                            }}
                            onDoubleClick={() => handleReplyMessage(msg)}
                          >
                        {/* STAGE 5: delete on all messages (incoming = soft delete) */}
                        <button
                          type="button"
                          className="msg-delete-btn"
                          title="Удалить"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteMessage(msg.id);
                          }}
                        >
                          🗑️
                        </button>
                        {msg.isDeleted ? (
                          <div className="msg-deleted">Сообщение удалено</div>
                        ) : (
                          <>
                        {msg.replyTo ? (
                          <QuotedMessage replyTo={msg.replyTo} onClick={() => handleReplyClick(msg.replyTo?.messageId)} />
                        ) : null}
                        {/* HOTFIX: hide garbled text when message has file attachments */}
                        {msg.text?.trim() ? <div className="msg-text">{msg.text}</div> : null}
                        {msg.files?.map((f: FileAttachment, i: number) => (
                          <div className="msg-file-attachment" key={`${f.name}-${i}`}>
                            {f.type.startsWith('image/') ? (
                              <div className="file-preview" onClick={() => handleImageClick(`data:${f.type};base64,${f.data}`)}>
                                <img 
                                  className="file-thumbnail" 
                                  src={`data:${f.type};base64,${f.data}`} 
                                  alt={f.name}
                                />
                                <div className="file-info">
                                  <span className="file-name">{f.name}</span>
                                  <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                                </div>
                              </div>
                            ) : f.type.startsWith('audio/') ? (
                              <div className="file-preview">
                                <VoiceMessagePlayer file={f} />
                                <div className="file-info">
                                  <span className="file-name">{f.name}</span>
                                  <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                                </div>
                              </div>
                            ) : (
                              <a className="file-download" href={`data:${f.type};base64,${f.data}`} download={f.name}>
                                <span className="file-icon">📎</span>
                                <div className="file-info">
                                  <span className="file-name">{f.name}</span>
                                  <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                                </div>
                              </a>
                            )}
                          </div>
                        ))}
                          </>
                        )}
                        <div className="msg-meta">
                          <span className="msg-from">{getMessageSenderName(msg)}</span>
                          <span className="msg-time">{formatMessageTime(msg.timestamp)}</span>
                          {msg.isEncrypted && <span className="message-encrypted" title="Зашифровано">🔒</span>}
                          {msg.isUser ? <MessageStatus status={msg.status ?? 'sent'} timestamp={msg.timestamp} /> : null}
                        </div>
                      </div>
                      </React.Fragment>
                      );
                    })
                  )}
                </div>

                <div className="input-bar message-input-container">
                  <VoiceRecorderButton
                    disabled={!connectionState.isConnected || !targetId.trim()}
                    onRecord={async (blob, duration) => {
                      const trimmedTarget = targetId.trim();
                      if (!trimmedTarget) return;
                      const reader = new FileReader();
                      const data = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                      });
                      const attachment: FileAttachment = {
                        name: `voice-${Date.now()}.webm`,
                        type: 'audio/webm',
                        size: blob.size,
                        data,
                        meta: { duration },
                      };
                      await sendMessage(trimmedTarget, '', [new File([blob], attachment.name, { type: attachment.type })]);
                    }}
                  />
                  <MessageInput
                    disabled={!connectionState.isConnected || !targetId.trim()}
                    attachedFile={attachedFile}
                    onFileRemoved={() => setAttachedFile(null)}
                    onImagePreview={handleImageClick}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                    replyTo={replyingTo}
                    onReplyCancel={handleReplyCancel}
                    onReplyClick={handleReplyClick}
                    onFocus={startTyping}
                    onBlur={stopTyping}
                    onSend={(txt, files, replyTo) => {
                      void handleSendMessage(txt, files, replyTo);
                    }}
                  />
                  <BottomActions
                    onFileAttach={handleFileAttach}
                    onVoiceMessage={handleVoiceMessage}
                    onClearChat={handleClearChat}
                  />
                </div>
              </>
            )}
          </div>

          {contextMenuMessageId && (
            <div 
              className="context-menu"
              style={{ left: contextMenuPos.x, top: contextMenuPos.y, position: 'fixed', zIndex: 1000 }}
              onMouseLeave={() => setContextMenuMessageId(null)}
            >
              <div className="context-menu-item" onClick={() => {
                if (contextMenuMessageId) {
                  const message = messages.find((item) => item.id === contextMenuMessageId);
                  handleReplyMessage(message);
                  setContextMenuMessageId(null);
                }
              }}>
                ↩️ Ответить
              </div>
              <div className="context-menu-item" onClick={() => {
                if (contextMenuMessageId) {
                  handleDeleteMessage(contextMenuMessageId);
                  setContextMenuMessageId(null);
                }
              }}>
                🗑️ Удалить
              </div>
            </div>
          )}

          <div className={`strateg-sidebar sidebar ${isSidebarOpen ? 'mobile-visible' : ''}`}>
            <button type="button" className="sidebar-close" onClick={() => setIsSidebarOpen(false)}>
              ×
            </button>

            <div className="my-profile" style={{ position: 'relative' }}>
              {/* BUGFIX 4: Make profile clickable to open modal */}
              <div className="my-avatar" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
                <Avatar type={profileAvatarId} size={40} color="#3b82f6" />
              </div>
              <div className="my-profile-info" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
                <div className="my-name">{profileName}</div>
                <div className="my-id">{connectionState.currentStrategId ?? '—'}</div>
              </div>
              <button type="button" className="my-profile-menu-btn" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} title="Меню">⋮</button>

              {profileDropdownOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-item" onClick={() => { setShowShareModal(true); setProfileDropdownOpen(false); }}>
                    <span>📱</span> QR-код
                  </div>
                  <div className="profile-dropdown-divider" />
                  {/* BUGFIX 4: Add profile edit option */}
                  <div className="profile-dropdown-item" onClick={handleProfileClick}>
                    <span>✏️</span> Редактировать профиль
                  </div>
                  <div className="profile-dropdown-divider" />
                  <div className="profile-dropdown-item" onClick={() => setProfileDropdownOpen(false)}>
                    <span>⚙️</span> Настройки
                  </div>
                </div>
              )}
            </div>

            <button type="button" className="btn-qr" onClick={() => setShowShareModal(true)}>
              QR-код
            </button>

            <div className="sidebar-title">
              {activeView === 'personal' ? 'Контакты' : 'Группы'}
            </div>

            <div className="contacts-list">
              {activeView === 'groups' ? (
                <GroupList groups={groups} selectedRoomId={selectedGroupId} onSelectRoom={handleSelectGroup} onCreateGroup={() => setShowCreateGroupModal(true)} />
              ) : (
                <ContactList activeContactId={targetId || null} onSelectContact={handleSelectContact} refreshKey={contactRefreshKey} unreadCounts={unreadCounts} />
              )}
            </div>

            <div className="status-bar">
              <span className={`status-dot ${connectionState.connectionStatus === 'connected' ? 'online' : 'offline'}`} />
              <div className="status-text">{connectionState.connectionStatus === 'connected' ? 'Online' : 'Offline'}</div>
              {isPushSupported() && (
                <button type="button" className="btn-qr" onClick={togglePushNotifications} style={{ opacity: notificationsEnabled ? 1 : 0.6 }}>
                  {notificationsEnabled ? '🔔 Уведомления вкл' : '🔕 Уведомления выкл.'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {showAddContactModal && (
        <AddContactModal
          onClose={() => setShowAddContactModal(false)}
          onSaved={handleContactSaved}
        />
      )}

      {showCreateGroupModal && connectionState.currentStrategId && (
        <CreateGroupModal
          myId={connectionState.currentStrategId}
          contacts={[connectionState.currentStrategId, ...Object.keys(localStorage).filter((key) => key.startsWith('strateg'))]}
          onCreate={handleCreateGroup}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}

      {showShareModal && connectionState.currentStrategId && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
            <QRShare
              strategId={connectionState.currentStrategId}
              onClose={() => setShowShareModal(false)}
            />
          </div>
        </div>
      )}

      {/* BUGFIX 4: Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleProfileSave}
        currentName={profileName}
        currentAvatarId={profileAvatarId}
        currentStrategId={connectionState.currentStrategId ?? ''}
      />

      {/* BUGFIX 2: Image Modal */}
      {imageModalOpen && (
        <div className="modal-overlay" onClick={() => setImageModalOpen(false)}>
          <div className="modal-content image-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setImageModalOpen(false)}>×</button>
            <img src={imageModalSrc} alt="Full size" className="image-modal-img" />
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
