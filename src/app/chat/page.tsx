"use client";

import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import "./page.css";
import { useRouter } from "next/navigation";
import {v4 as uuidv4} from "uuid";
import { OpenAIChat } from "../../../lib/TalkAPI";

export type messagesType = {
    type: "prompt" | "response";
    text: string;
    timestamp: string;
}

type chatsType = {
    id: string;
    displayId: string;
    messages: Array<messagesType>;
}

type OpenAIContentItem = {
  type: string;
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIContentItem[];
};

type OpenAIResponseData = {
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
  };
};

export default function ChatPage() {
    const [inputValue, setInputValue] = useState<string>("");
    const [chats, setChats] = useState<Array<chatsType>>([]);
    const [activeChat, setActiveChat] = useState<string | null>(null);

    const [messages, setMessages] = useState<Array<messagesType>>(chats[0]?.messages || []);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    
    const router = useRouter();
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    
    useEffect(() => {
        const storedChats = JSON.parse(localStorage.getItem("chats") ?? "[]");

        setChats(storedChats);

        if (storedChats.length > 0) {
            setActiveChat(storedChats[0].id);
        }
    }, []);

    useEffect(() => {
        if (chats.length === 0) {
            onNewChat();
        }
    }, []);

    useEffect(() => {
        const activeChatObj = chats.find(chat => chat.id === activeChat);
        
        setMessages(activeChatObj ? activeChatObj.messages : []);
    }, [activeChat, chats]);

    useEffect(() => {
        if (activeChat) {
            const storedMessages: messagesType[] = JSON.parse(localStorage.getItem('activeChat') ?? "[]");
            setMessages(storedMessages);
        }
    }, [activeChat]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages]);

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    }

    const handleGoBack = () => {
        router.push("/");
    }

    const onNewChat = (initialMessage = "") => {
        const id = uuidv4();
        const newChat: chatsType = {
            id,
            displayId: `chat ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString()}`,
            messages: initialMessage ? [{type: "prompt", text: initialMessage, timestamp: new Date().toLocaleTimeString()}] : []
        };

        const updatedChats = [newChat, ...chats];

        setChats(updatedChats);
        localStorage.setItem("chats", JSON.stringify(updatedChats));
        localStorage.setItem(id, JSON.stringify(newChat.messages));
        setActiveChat(id);

        return id;
    }

    const sendMessage = async () => {
        const text = inputValue.trim();

        if (!text || isLoading) return;

        const newMessage: messagesType = {
            type: "prompt",
            text,
            timestamp: new Date().toLocaleTimeString()
        };

        const chatId = activeChat || onNewChat();
        const updatedMessages: messagesType[] = [...messages, newMessage];

        setMessages(updatedMessages);
        localStorage.setItem("activeChat", JSON.stringify(updatedMessages));
        setInputValue("");
        setError("");
        setIsLoading(true);

        const updatedChats: chatsType[] = chats.map(chat => chat.id === chatId ? { ...chat, messages: updatedMessages } : chat);

        setChats(updatedChats);
        localStorage.setItem("chats", JSON.stringify(updatedChats));
        setIsTyping(true);

        try {
            const response = await OpenAIChat(updatedMessages);
            const data = await response.json() as OpenAIResponseData;

            if (!response.ok) {
                throw new Error(data.error?.message || "Unable to get an AI response.");
            }
            
            const responseText = data.output
                ?.flatMap((item) => item.content || [])
                .find((item) => item.type === "output_text")
                ?.text;

            if (!responseText) throw new Error("OpenAI returned no text response.");

            const newResponse: messagesType = {
                type: "response",
                text: responseText,
                timestamp: new Date().toLocaleTimeString()
            }

            const updatedMessagesWithResponse: messagesType[] = [...updatedMessages, newResponse];
            
            const chatsWithResponse = updatedChats.map((chat) => chat.id === chatId ? { ...chat, messages: updatedMessagesWithResponse } : chat);
            
            setMessages(updatedMessagesWithResponse);
            setChats(chatsWithResponse);
            
            localStorage.setItem("activeChat", JSON.stringify(updatedMessagesWithResponse));
            localStorage.setItem("chats", JSON.stringify(chatsWithResponse));
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to get an AI response."
            );
        } finally {
            setIsLoading(false);
            setIsTyping(false);
        }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    }

    const onSelectChat = (id: string) => {
        setActiveChat(id);
    }

    const onDeleteChat = (id : string) => {
        const updatedChats = chats.filter(chat => chat.id !== id);

        setChats(updatedChats);
        localStorage.setItem('chats', JSON.stringify(updatedChats));
        localStorage.removeItem(id);

        if (id === activeChat) {
            const newActiveChat = updatedChats.length > 0 ? updatedChats[0].id : null;

            setActiveChat(newActiveChat);
        }
    }

    return (
        <div className='chat-app'>
            <div className="chat-list">
                <div className="chat-list-header">
                    <h2>Chat List</h2>

                    <i className="bx bx-edit-alt new-chat" onClick={() => onNewChat()}/>
                </div>

                {chats.map((chat) => (
                    <div
                        key={chat.id}
                        className={`chat-list-item ${chat.id === activeChat ? 'active' : ''}`}
                        onClick={() => onSelectChat(chat.id)}
                    >
                        <h4>{chat.displayId}</h4>

                        <i 
                            className="bx bx-x-circle"
                            onClick={e => {
                                e.stopPropagation();

                                onDeleteChat(chat.id);
                            }}
                        />
                    </div>
                ))}
            </div>

            <div className="chat-window">
                <div className="chat-title">
                    <h3>Chat With AI</h3>

                    <i className="bx bx-arrow-back arrow" onClick={handleGoBack}></i>
                </div>

                <div className="chat">
                    {messages.map((message, index) => (
                        <div key={index} className={message.type === "prompt" ? "prompt" : "response"}>
                            {message.text}

                            <span>{message.timestamp}</span>
                        </div>
                    ))}

                    {isTyping && <div className="typing">Typing...</div>}
                    <div ref={chatEndRef}></div>
                    {error && <div className="chat-error">{error}</div>}
                </div>

                <form className='msg-form' onSubmit={(e) => e.preventDefault()}>
                    <input 
                        type="text" 
                        className='msg-input' 
                        placeholder='Type a message'
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />

                    <i className="fa-solid fa-paper-plane" onClick={sendMessage}/>
                </form>
            </div>
        </div>
    );
}