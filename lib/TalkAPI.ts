import { messagesType } from "@/app/chat/page";

export async function OpenAIChat(messages: messagesType[]) {
  return fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
  });
}