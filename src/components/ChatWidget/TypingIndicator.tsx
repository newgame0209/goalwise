
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const TypingIndicator = () => {
  return (
    <div className="flex items-start gap-2">
      <Avatar className="mt-0.5 h-8 w-8">
        <AvatarFallback>AI</AvatarFallback>
        <AvatarImage src="/robot.png" alt="AI Assistant" />
      </Avatar>
      
      <div className="px-3 py-2 rounded-lg bg-muted rounded-tl-none max-w-[80%]">
        <div className="flex space-x-1 items-center h-5">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
