'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/helpers';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Assistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can help you with bulk operations, status checks, and pattern suggestions. Try "approve all above 90%" or "what\'s pending?"',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: input, timestamp: new Date() }
    ];

    // Simulate assistant response
    setTimeout(() => {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'This is a placeholder response. Connect to your AI backend to enable real conversations.',
          timestamp: new Date()
        }
      ]);
    }, 500);

    setMessages(newMessages);
    setInput('');
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 bottom-4 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 z-50"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Assistant Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 shadow-xl transition-transform z-40',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">AI Assistant</h2>
          <p className="text-xs text-gray-500 mt-1">Ask me anything</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[calc(100vh-160px)]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'p-3 rounded-lg text-sm',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white ml-8'
                  : 'bg-gray-100 text-gray-900 mr-8'
              )}
            >
              {msg.content}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleSend} size="sm">
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
