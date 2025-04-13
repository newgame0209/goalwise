import { Message } from './ChatWidget';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        {isUser ? (
          <>
            <AvatarFallback>U</AvatarFallback>
            <AvatarImage src="/user-avatar.png" alt="User" />
          </>
        ) : (
          <>
            <AvatarFallback>AI</AvatarFallback>
            <AvatarImage src="/robot.png" alt="AI Assistant" />
          </>
        )}
      </Avatar>
      
      <div
        className={`px-4 py-3 max-w-[85%] ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-lg rounded-tr-none'
            : 'bg-muted rounded-lg rounded-tl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
