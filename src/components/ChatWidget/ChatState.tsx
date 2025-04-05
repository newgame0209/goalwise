
import { createContext, useContext, useState, ReactNode } from 'react';
import { Message } from './ChatWidget';

interface ChatStateContextProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (isMinimized: boolean) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  profileCompleted: boolean;
  setProfileCompleted: (completed: boolean) => void;
}

const ChatStateContext = createContext<ChatStateContextProps | undefined>(undefined);

export function ChatStateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profileCompleted, setProfileCompleted] = useState(false);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  return (
    <ChatStateContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isMinimized,
        setIsMinimized,
        messages,
        addMessage,
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
