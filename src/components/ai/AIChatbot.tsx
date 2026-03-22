import { useState, useRef, useEffect, useCallback, forwardRef, useContext } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getSessionToken, fetchFinancialContext } from '@/services/settings.service';
import { useI18n } from '@/lib/i18n';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { TenantContext } from '@/lib/tenant';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FinancialContext {
  accounts?: any[];
  recentTransactions?: any[];
  projectsSummary?: any;
}

export const AIChatbot = forwardRef<HTMLDivElement, {}>(function AIChatbot(_props, _ref) {
  const { t } = useI18n();
  const tenantCtx = useContext(TenantContext);
  const tenantId = tenantCtx?.tenant?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<FinancialContext>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Initialize position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-chatbot-position');
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch {}
    }
    const hidden = localStorage.getItem('ai-chatbot-hidden');
    if (hidden === 'true') setIsHidden(true);
  }, []);

  // Save position
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('ai-chatbot-position', JSON.stringify(position));
    }
  }, [position]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // Initialize welcome message when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'assistant', content: t('ai.welcome') }]);
    }
  }, [isOpen, t]);

  // Fetch financial context on open
  useEffect(() => {
    if (isOpen && !context.accounts) {
      fetchContext();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchContext = async () => {
    try {
      if (!tenantId) return;
      const ctx = await fetchFinancialContext(tenantId);
      setContext(ctx);
    } catch (error) {
      console.error('Error fetching context:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const accessToken = await getSessionToken();
      if (!accessToken) {
        throw new Error(t('ai.pleaseLogin'));
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            context,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('ai.requestFailed'));
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `${t('ai.errorPrefix')}: ${error.message}` }
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleHide = () => {
    setIsHidden(true);
    setIsOpen(false);
    localStorage.setItem('ai-chatbot-hidden', 'true');
  };

  const handleShow = () => {
    setIsHidden(false);
    localStorage.setItem('ai-chatbot-hidden', 'false');
  };

  // Hidden state - show a tiny restore button at edge
  if (isHidden) {
    return (
      <button
        onClick={handleShow}
        className="fixed bottom-2 right-2 h-6 w-6 rounded-full bg-muted/80 hover:bg-primary/20 border border-border flex items-center justify-center z-50 opacity-40 hover:opacity-100 transition-opacity"
        title={t('ai.chatTitle')}
      >
        <MessageCircle className="h-3 w-3 text-muted-foreground" />
      </button>
    );
  }

  const style = {
    transform: `translate(${position.x}px, ${position.y}px)`,
  };

  if (!isOpen) {
    return (
      <div
        ref={dragRef}
        style={style}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-1"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <div className="flex gap-1">
          <button
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="h-5 w-5 rounded bg-muted/80 hover:bg-muted flex items-center justify-center cursor-grab active:cursor-grabbing"
            title="拖动"
          >
            <GripHorizontal className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={handleHide}
            className="h-5 w-5 rounded bg-muted/80 hover:bg-destructive/20 flex items-center justify-center"
            title="隐藏"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(
        "fixed bottom-6 right-6 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col transition-all duration-200",
        isMinimized ? "w-72 sm:w-80 h-14" : "w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[500px] max-h-[500px]"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5 rounded-t-xl cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">{t('ai.chatTitle')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('ai.inputPlaceholder')}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('ai.disclaimer')}
            </p>
          </div>
        </>
      )}
    </div>
  );
});
