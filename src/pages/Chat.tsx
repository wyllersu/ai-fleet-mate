import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Chat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "STATUS DA FROTA",
    "HISTÓRICO DO V001",
    "Custo total de manutenções este mês",
    "Quais veículos têm mais de 50.000 km?",
  ];

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-fleet", {
        body: { message: text },
      });

      if (error) throw error;

      const assistantMessage = { role: "assistant", content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Chat AI
        </h1>
        <p className="text-muted-foreground mt-1">Seu assistente inteligente de gestão de frota</p>
      </div>

      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <p className="text-muted-foreground text-center">Faça perguntas sobre sua frota ou use os comandos sugeridos:</p>
          <div className="grid grid-cols-2 gap-3 max-w-2xl">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                onClick={() => sendMessage(suggestion)}
                className="text-left justify-start h-auto py-3"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <Card className={`max-w-[80%] p-4 ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-card"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </Card>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Digite sua pergunta..."
          disabled={loading}
        />
        <Button onClick={() => sendMessage(input)} disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}