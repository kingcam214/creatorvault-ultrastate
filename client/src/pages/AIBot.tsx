import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";

type Role = "creator" | "recruiter" | "field_operator" | "ambassador";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIBot() {
  const [role, setRole] = useState<Role>("creator");
  const [message, setMessage] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

  const chatMutation = trpc.aiBot.chat.useMutation({
    onSuccess: (data) => {
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      setMessage("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: context } = trpc.aiBot.getContext.useQuery();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message to history
    const newHistory = [...conversationHistory, { role: "user" as const, content: message }];
    setConversationHistory(newHistory);

    // Send to AI
    chatMutation.mutate({
      message,
      role,
      conversationHistory: newHistory.slice(-10), // Last 10 messages for context
    });
  };

  const roleDescriptions: Record<Role, string> = {
    creator: "Get help with content monetization, viral optimization, and audience growth",
    recruiter: "Learn recruitment strategies, commission tracking, and conversion tactics",
    field_operator: "Access location-based playbooks, tourism monetization, and street-level tactics",
    ambassador: "Build community, coordinate events, and represent the CreatorVault brand",
  };

  const roleColors: Record<Role, string> = {
    creator: "bg-purple-500",
    recruiter: "bg-green-500",
    field_operator: "bg-orange-500",
    ambassador: "bg-blue-500",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bot className="h-12 w-12 text-purple-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              CreatorVault <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">AI Assistant</span>
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Your role-aware AI companion for building your creator empire
          </p>
        </div>

        {/* Role Selector */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Select Your Role
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose your role to get personalized guidance and strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(["creator", "recruiter", "field_operator", "ambassador"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    role === r
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <Badge className={`${roleColors[r]} text-white mb-2`}>
                    {r.replace("_", " ").toUpperCase()}
                  </Badge>
                  <p className="text-sm text-gray-300">{roleDescriptions[r]}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10 h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-white">Chat</CardTitle>
                <CardDescription className="text-gray-400">
                  Ask anything about {role.replace("_", " ")} strategies
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 pr-4 mb-4">
                  {conversationHistory.length === 0 ? (
                    <div className="text-center text-gray-400 mt-8">
                      <Bot className="h-16 w-16 mx-auto mb-4 text-purple-400" />
                      <p className="text-lg mb-2">Start a conversation</p>
                      <p className="text-sm">Ask me anything about your {role.replace("_", " ")} journey</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversationHistory.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex-shrink-0">
                              <Bot className="h-8 w-8 text-purple-400" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] p-4 rounded-lg ${
                              msg.role === "user"
                                ? "bg-purple-600 text-white"
                                : "bg-white/10 text-gray-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {msg.role === "user" && (
                            <div className="flex-shrink-0">
                              <User className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                      {chatMutation.isPending && (
                        <div className="flex gap-3 justify-start">
                          <Bot className="h-8 w-8 text-purple-400" />
                          <div className="bg-white/10 p-4 rounded-lg">
                            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                    disabled={chatMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!message.trim() || chatMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Quick Actions */}
          <div className="space-y-6">
            {/* Context Info */}
            {context && (
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Your Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Role:</span>
                    <Badge className={roleColors[context.role]}>{context.role}</Badge>
                  </div>
                  {context.location && (
                    <div className="flex justify-between text-gray-300">
                      <span>Location:</span>
                      <span>{context.location}</span>
                    </div>
                  )}
                  {context.language && (
                    <div className="flex justify-between text-gray-300">
                      <span>Language:</span>
                      <span>{context.language.toUpperCase()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Prompts */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm">Quick Prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => setMessage("How do I get started?")}
                >
                  How do I get started?
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => setMessage("What are my first actions?")}
                >
                  What are my first actions?
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => setMessage("How do I make money today?")}
                >
                  How do I make money today?
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left border-white/20 text-gray-300 hover:bg-white/10"
                  onClick={() => setMessage("Generate a recruitment script")}
                >
                  Generate a script
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-sm">AI Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Messages:</span>
                  <span className="font-bold text-purple-400">{conversationHistory.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <Badge className={roleColors[role]}>{role.replace("_", " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
