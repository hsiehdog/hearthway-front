"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Loader2, SendHorizontal } from "lucide-react";

import { ChatMessageBubble } from "@/components/chat/chat-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth/client";
import {
  ChatMessage,
  fetchChatHistory,
  sendChatMessage,
} from "@/lib/api-client";

export function ChatPanel() {
  const { data } = authClient.useSession();
  const isAuthenticated = Boolean(data?.session);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const {
    data: messages = [],
    isPending,
  } = useQuery({
    queryKey: ["chat"],
    queryFn: () => fetchChatHistory(),
    enabled: isAuthenticated,
  });

  const mutation = useMutation({
    mutationFn: (payload: { text: string }) =>
      sendChatMessage(payload.text),
    onMutate: async ({ text }) => {
      await queryClient.cancelQueries({ queryKey: ["chat"] });
      const previous =
        queryClient.getQueryData<ChatMessage[]>(["chat"]) || [];

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      const assistantPlaceholder: ChatMessage = {
        id: `${userMessage.id}-assistant`,
        role: "assistant",
        content: "Thinking…",
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      queryClient.setQueryData<ChatMessage[]>(["chat"], [
        ...previous,
        userMessage,
        assistantPlaceholder,
      ]);

      setMessage("");

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chat"], context.previous);
      }
    },
    onSuccess: (assistantMessage) => {
      queryClient.setQueryData<ChatMessage[]>(["chat"], (current) => {
        const next = current?.filter(
          (entry) =>
            !(
              entry.role === "assistant" &&
              entry.isOptimistic &&
              entry.content === "Thinking…"
            ),
        );
        const hydratedResponse: ChatMessage = {
          id: crypto.randomUUID(),
          createdAt: assistantMessage.createdAt || new Date().toISOString(),
          role: assistantMessage.role || "assistant",
          content: assistantMessage.content,
        } as ChatMessage;
        return [...(next || []), hydratedResponse];
      });
    },
  });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    mutation.mutate({ text: message.trim() });
  };

  return (
    <Card id="chat" className="border-muted">
      <CardHeader>
        <CardTitle>Chat with your Hearthway guide</CardTitle>
        <CardDescription>
          Ask for balances, who owes what, or how to split a new receipt. Requests automatically reuse your Better Auth session cookie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-80 rounded-lg border bg-background">
          <div className="flex flex-col gap-3 p-4">
            {isPending && (
              <div className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!isPending &&
              messages.map((entry) => (
                <ChatMessageBubble key={entry.id} message={entry} />
              ))}
            <div ref={endOfMessagesRef} />
          </div>
        </ScrollArea>

        <form className="flex flex-col gap-3 md:flex-row" onSubmit={handleSubmit}>
          <Textarea
            placeholder="Ask for a trip balance, suggest a fair split, or draft settlement steps…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-[96px] flex-1 resize-none"
          />
          <Button
            type="submit"
            className="md:self-end"
            disabled={!message.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                Send
                <SendHorizontal className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
