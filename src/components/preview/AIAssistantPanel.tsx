import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Loader2, Image, MessageSquare, Palette, Wand2, Upload, MousePointer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TemplateSection } from "@/lib/campaignTemplates";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  currentContent: {
    sections: any[];
    dataValues: Record<string, string>;
  };
  onApplyChanges: (changes: any) => void;
  selectedSection?: string | null;
  templateSections?: TemplateSection[];
  onModeChange?: (mode: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-website-editor`;

type Mode = "chat" | "visual" | "image";

export default function AIAssistantPanel({
  isOpen,
  onClose,
  pageId,
  currentContent,
  onApplyChanges,
  selectedSection,
  templateSections = [],
  onModeChange,
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImage) || isLoading) return;

    const messageContent = selectedSection && mode === "visual"
      ? `[Editing section: ${selectedSection}] ${input.trim()}`
      : input.trim();

    const userMessage: Message = { 
      role: "user", 
      content: messageContent,
      image: uploadedImage || undefined
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUploadedImage(null);
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            image: m.image,
          })),
          pageId,
          currentContent,
          mode,
          selectedSection,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("AI credits exhausted. Please add more credits.");
        }
        throw new Error("Failed to get AI response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add initial assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return prev;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check for action commands in the response
      if (assistantContent.includes("```json") && assistantContent.includes("\"action\"")) {
        try {
          const jsonMatch = assistantContent.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const actionData = JSON.parse(jsonMatch[1]);
            if (actionData.action === "update_content") {
              onApplyChanges(actionData.changes);
            }
          }
        } catch (e) {
          console.error("Failed to parse action:", e);
        }
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts: Record<Mode, string[]> = {
    chat: [
      "Make the headline more compelling",
      "Rewrite the hero section to focus on benefits",
      "Add urgency to the call-to-action",
      "Make the content more SEO-friendly",
    ],
    visual: [
      "Change the background color",
      "Make the text larger",
      "Add more padding",
      "Change the button style",
    ],
    image: [
      "Generate a hero image for this page",
      "Create an icon set for the features",
      "Design a professional header background",
      "Generate product mockups",
    ],
  };

  const modeConfig = {
    chat: {
      icon: MessageSquare,
      label: "Chat",
      placeholder: "Describe content changes...",
    },
    visual: {
      icon: Palette,
      label: "Visual",
      placeholder: selectedSection ? `Edit ${selectedSection}...` : "Select a section first...",
    },
    image: {
      icon: Image,
      label: "Images",
      placeholder: "Describe the image you need...",
    },
  };

  const selectedSectionData = templateSections.find(s => s.id === selectedSection);

  if (!isOpen) return null;

  return (
    <div className="h-full w-[420px] bg-[#0d0d0d] border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-900/20 to-transparent flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">PSEO AI Builder</h3>
            <p className="text-xs text-white/50">Build with AI assistance</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Mode Tabs */}
      <div className="p-3 border-b border-white/10 flex-shrink-0">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
          <TabsList className="w-full bg-white/5 p-1 gap-1">
            {(Object.keys(modeConfig) as Mode[]).map((m) => {
              const Icon = modeConfig[m].icon;
              return (
                <TabsTrigger
                  key={m}
                  value={m}
                  className={cn(
                    "flex-1 gap-2 text-white/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg",
                    "transition-all duration-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{modeConfig[m].label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Visual Mode Section Selector */}
      {mode === "visual" && (
        <div className="p-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-white/70 font-medium">Click sections in preview to select</span>
          </div>
          {selectedSection ? (
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{selectedSectionData?.name || selectedSection}</p>
                  <p className="text-xs text-white/50">Type: {selectedSectionData?.type || "unknown"}</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
              <p className="text-sm text-white/50">No section selected</p>
              <p className="text-xs text-white/30 mt-1">Click on any section in the preview</p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-sm text-white/70 mb-2">
                What would you like to {mode === "chat" ? "change" : mode === "visual" ? "style" : "create"}?
              </p>
              <p className="text-xs text-white/40">
                Try one of these suggestions:
              </p>
            </div>
            <div className="space-y-2">
              {suggestedPrompts[mode].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left p-3 text-sm bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 text-white/80 hover:text-white border border-white/5 hover:border-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    message.role === "user"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-white/10 text-white/90"
                  )}
                >
                  {message.image && (
                    <img 
                      src={message.image} 
                      alt="Uploaded" 
                      className="max-w-full rounded-lg mb-2"
                    />
                  )}
                  <p className="whitespace-pre-wrap">{message.content || "..."}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    <span className="text-sm text-white/60">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-[#0a0a0a] flex-shrink-0">
        {/* Image preview */}
        {uploadedImage && (
          <div className="mb-3 relative">
            <img 
              src={uploadedImage} 
              alt="Upload preview" 
              className="max-h-24 rounded-lg border border-white/10"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setUploadedImage(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={modeConfig[mode].placeholder}
              className="min-h-[56px] max-h-[120px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl pr-12 focus:border-purple-500/50 focus:ring-purple-500/20"
              disabled={isLoading || (mode === "visual" && !selectedSection)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !uploadedImage) || isLoading || (mode === "visual" && !selectedSection)}
            size="icon"
            className="h-[56px] w-[56px] rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        <p className="text-[10px] text-white/30 text-center mt-3">
          PSEO AI Builder • Press Enter to send
        </p>
      </div>
    </div>
  );
}
