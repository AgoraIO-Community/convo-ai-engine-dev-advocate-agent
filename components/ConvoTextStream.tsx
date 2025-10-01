'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  X,
  UnfoldVertical,
  ChevronsDownUp,
  ArrowDownFromLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMessageListItem, EMessageStatus } from '@/lib/message';

interface ConvoTextStreamProps {
  messageList: IMessageListItem[];
  currentInProgressMessage?: IMessageListItem | null;
  agentUID: string | undefined;
}

export default function ConvoTextStream({
  messageList,
  currentInProgressMessage = null,
  agentUID,
}: ConvoTextStreamProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const prevMessageLengthRef = useRef(messageList.length);
  const prevMessageTextRef = useRef('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const hasSeenFirstMessageRef = useRef(false);

  // Debug log for message detection
  useEffect(() => {
    if (messageList.length > 0 || currentInProgressMessage) {
      console.log(
        'ConvoTextStream - Messages:',
        messageList.map((m) => ({
          uid: m.uid,
          text: m.text,
          status: m.status,
        })),
        'Current in progress:',
        currentInProgressMessage,
        'Agent UID:',
        agentUID
      );
    }
  }, [messageList, currentInProgressMessage, agentUID]);

  // Scroll to bottom function for direct calls
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isAtBottom);
    }
  };

  // Check if streaming content has significantly changed
  const hasContentChanged = () => {
    if (!currentInProgressMessage) return false;

    const currentText = currentInProgressMessage.text || '';
    const textLengthDiff =
      currentText.length - prevMessageTextRef.current.length;

    // Consider significant change if more than 20 new characters
    const hasSignificantChange = textLengthDiff > 20;

    // Update reference
    if (hasSignificantChange) {
      prevMessageTextRef.current = currentText;
    }

    return hasSignificantChange;
  };

  // Effect for auto-opening chat when first streaming message arrives
  useEffect(() => {
    // Check if this is the first message and chat should be opened
    const hasNewMessage = messageList.length > 0;
    const hasInProgressMessage =
      shouldShowStreamingMessage() && currentInProgressMessage !== null;

    if (
      (hasNewMessage || hasInProgressMessage) &&
      !hasSeenFirstMessageRef.current &&
      !isOpen
    ) {
      setIsOpen(true);
      hasSeenFirstMessageRef.current = true;
    }
  }, [messageList, currentInProgressMessage]);

  useEffect(() => {
    // Auto-scroll in these cases:
    // 1. New complete message arrived
    // 2. User is already at bottom
    // 3. Streaming content has changed significantly
    const hasNewMessage = messageList.length > prevMessageLengthRef.current;
    const hasStreamingChange = hasContentChanged();

    if (
      (hasNewMessage || shouldAutoScroll || hasStreamingChange) &&
      scrollRef.current
    ) {
      // Use direct scroll to bottom for more reliable scrolling
      scrollToBottom();
    }

    prevMessageLengthRef.current = messageList.length;
  }, [messageList, currentInProgressMessage?.text, shouldAutoScroll]);

  // Extra safety: ensure scroll happens after content renders during active streaming
  useEffect(() => {
    if (
      currentInProgressMessage?.status === EMessageStatus.IN_PROGRESS &&
      shouldAutoScroll
    ) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [currentInProgressMessage?.text]);

  const shouldShowStreamingMessage = () => {
    return (
      currentInProgressMessage !== null &&
      currentInProgressMessage.status === EMessageStatus.IN_PROGRESS &&
      currentInProgressMessage.text.trim().length > 0
    );
  };

  // Toggle chat open/closed
  const toggleChat = () => {
    setIsOpen(!isOpen);
    // If opening the chat, consider it as having seen the first message
    if (!isOpen) {
      hasSeenFirstMessageRef.current = true;
    }
  };

  const toggleChatExpanded = () => {
    setIsChatExpanded(!isChatExpanded);
  };

  // Helper to determine if message is from AI
  const isAIMessage = (message: IMessageListItem) => {
    // The AI should be uid=0 (agent) OR matching the agentUID if provided
    return (
      message.uid === 0 || (agentUID && message.uid.toString() === agentUID)
    );
  };

  // Combine complete messages with in-progress message for rendering
  const allMessages = [...messageList];
  if (shouldShowStreamingMessage() && currentInProgressMessage) {
    allMessages.push(currentInProgressMessage);
  }

  return (
    <div id="chatbox" className="fixed bottom-24 right-8 z-50">
      {isOpen ? (
        <div
          className={cn(
            'bg-white rounded-lg shadow-lg w-96 flex flex-col text-black chatbox',
            isChatExpanded && 'expanded'
          )}
        >
          <div className="p-2 border-b flex justify-between items-center shrink-0">
            <Button variant="ghost" size="icon" onClick={toggleChatExpanded}>
              {isChatExpanded ? (
                <ArrowDownFromLine className="h-4 w-4" />
              ) : (
                <UnfoldVertical className="h-4 w-4" />
              )}
            </Button>
            <h3 className="font-semibold">Chat</h3>
            <Button variant="ghost" size="icon" onClick={toggleChat}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div
            className="flex-1 overflow-auto"
            ref={scrollRef}
            onScroll={handleScroll}
          >
            <div className="p-4 space-y-4">
              {allMessages.map((message, index) => (
                <div
                  key={`${message.turn_id}-${message.uid}-${message.status}`}
                  ref={index === allMessages.length - 1 ? lastMessageRef : null}
                  className={cn(
                    'flex items-start gap-2 w-full',
                    isAIMessage(message) ? 'flex-row' : 'flex-row-reverse'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
                      isAIMessage(message)
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {isAIMessage(message) ? 'AI' : 'U'}
                  </div>

                  {/* Message content */}
                  <div
                    className={cn(
                      'flex',
                      isAIMessage(message)
                        ? 'flex-col items-start'
                        : 'flex-col items-end'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-[15px] px-3 py-2',
                        isAIMessage(message)
                          ? 'bg-gray-100 text-left'
                          : 'bg-blue-500 text-white text-right',
                        message.status === EMessageStatus.IN_PROGRESS &&
                          'animate-pulse'
                      )}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={toggleChat}
          className="rounded-full w-12 h-12 flex items-center justify-center bg-white hover:invert hover:border-2 hover:border-black hover:scale-150 transition-all duration-300"
        >
          <MessageCircle className="h-6 w-6 text-black" />
        </Button>
      )}
    </div>
  );
}
