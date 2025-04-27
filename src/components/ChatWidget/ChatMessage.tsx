import { Message } from './ChatWidget';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-start ${isUser ? 'flex-row-reverse gap-2' : 'gap-2'} mb-2`}>
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
        className={`px-3 py-2 sm:px-4 sm:py-3 max-w-[88%] sm:max-w-[75%] break-words whitespace-pre-wrap leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-lg rounded-tr-none'
            : 'bg-muted rounded-lg rounded-tl-none'
        }`}
      >
        <p className="text-sm sm:text-base">{message.content}</p>
      </div>
    </div>
  );
}
