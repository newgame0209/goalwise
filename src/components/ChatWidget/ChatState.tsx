import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Message } from './ChatWidget';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ChatStateContextProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (isMinimized: boolean) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  resetMessages: () => void;
  profileCompleted: boolean;
  setProfileCompleted: (completed: boolean) => void;
}

const ChatStateContext = createContext<ChatStateContextProps | undefined>(undefined);

export function ChatStateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  
  // ユーザーの状況に応じた初期メッセージを生成
  const getContextAwareMessage = (pathname: string) => {
    // プロファイリングページでは初期メッセージを生成しない
    if (pathname === '/profiling') {
      return null;
    }
    
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    
    // パスに基づいてメッセージを変更
    if (pathname === '/dashboard') {
      return {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: userName 
          ? `${userName}さん、ダッシュボードへようこそ！学習プランが用意されています。「学習を始める」ボタンから最初のモジュールを開始できます。何かお手伝いが必要でしたらお気軽にどうぞ。`
          : 'ダッシュボードへようこそ！学習プランが用意されています。「学習を始める」ボタンから最初のモジュールを開始できます。何かお手伝いが必要でしたらお気軽にどうぞ。',
        timestamp: new Date(),
      };
    } else if (pathname.includes('/modules/')) {
      return {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: userName 
          ? `${userName}さん、学習モジュールへようこそ。このコンテンツで何か質問があればいつでもサポートします。`
          : '学習モジュールへようこそ。このコンテンツで何か質問があればいつでもサポートします。',
        timestamp: new Date(),
      };
    } else {
      return {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: userName 
          ? `${userName}さん、こんにちは！何かお手伝いできることはありますか？`
          : 'こんにちは！何かお手伝いできることはありますか？',
        timestamp: new Date(),
      };
    }
  };

  // 初期メッセージをセット
  useEffect(() => {
    const initialMessage = getContextAwareMessage(location.pathname);
    if (messages.length === 0 && initialMessage) {
      setMessages([initialMessage]);
    }
  }, []);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const resetMessages = () => {
    const contextMessage = getContextAwareMessage(location.pathname);
    // 状況に応じたメッセージでリセット（ただしnullの場合は空配列）
    setMessages(contextMessage ? [contextMessage] : []);
  };

  // ページ遷移時にメッセージをリセット
  useEffect(() => {
    // ページが変わったらメッセージをリセット
    resetMessages();
  }, [location.pathname]);

  return (
    <ChatStateContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isMinimized,
        setIsMinimized,
        messages,
        addMessage,
        resetMessages,
        profileCompleted,
        setProfileCompleted
      }}
    >
      {children}
    </ChatStateContext.Provider>
  );
}

export function useChatState() {
  const context = useContext(ChatStateContext);
  if (context === undefined) {
    throw new Error('useChatState must be used within a ChatStateProvider');
  }
  return context;
}
