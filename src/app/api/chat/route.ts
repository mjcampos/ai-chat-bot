import { NextResponse } from "next/server";

type Message = {
  type: "prompt" | "response";
  text: string;
};

export async function POST(request: Request) {
  try {
    const { messages }: { messages: Message[] } =
      await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: { message: "OPENAI_API_KEY is not configured." } },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL,
          input: messages.map((message) => ({
            role:
              message.type === "prompt"
                ? "user"
                : "assistant",
            content: message.text,
          })),
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { error: { message: "Unable to process the request." } },
      { status: 500 }
    );
  }
}