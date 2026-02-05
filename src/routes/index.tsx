import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

type ChatMessage = {
  id: string;
  from: string;
  message: string;
  timestamp: number;
};

function RouteComponent() {
  const [roomId, setRoomId] = useState("demo");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}/api/chat/${encodeURIComponent(roomId)}`;
  }, [roomId]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const makeId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  function connect() {
    if (!wsUrl || wsRef.current) return;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Omit<ChatMessage, "id">;
        setMessages((prev) => [{ ...data, id: makeId() }, ...prev]);
      } catch {
        setMessages((prev) => [
          {
            id: makeId(),
            from: "server",
            message: String(event.data),
            timestamp: Date.now(),
          },
          ...prev,
        ]);
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }

  function disconnect() {
    wsRef.current?.close();
    setStatus("disconnected");
    wsRef.current = null;
  }

  function sendMessage() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!message.trim()) return;
    wsRef.current.send(message.trim());
    setMessage("");
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Chat WebSocket Tester</h1>
        <p className="text-black/60 text-sm">
          Connect to a room and exchange messages via Durable Objects.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Room ID</label>
          <input
            className="mt-2 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            placeholder="room-123"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            className="bg-green-500 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
            disabled={status === "connected" || status === "connecting"}
            onClick={connect}
            type="button"
          >
            Connect
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50 hover:bg-red-400 hover:text-white disabled:pointer-events-none"
            disabled={status !== "connected"}
            onClick={disconnect}
            type="button"
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3 text-sm font-medium">Status</div>
        <div className="text-sm font-mono">{status}</div>
        <div className="mt-4 text-sm font-medium">Send message</div>
        <div className="mt-2 flex gap-2">
          <input
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button
            className="bg-green-500 text-white rounded-md px-3 py-2 text-sm disabled:opacity-50"
            disabled={status !== "connected" || !message.trim()}
            onClick={sendMessage}
            type="button"
          >
            Send
          </button>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="mb-3 text-sm font-medium">Messages</div>
        <div className="flex max-h-80 flex-col gap-2 overflow-auto text-sm">
          {messages.length === 0 ? (
            <div className="text-black/60">No messages yet.</div>
          ) : (
            messages.map((item) => (
              <div key={item.id} className="rounded-md border p-2">
                <div className="text-black/60 text-xs">
                  {new Date(item.timestamp).toLocaleTimeString()} • {item.from}
                </div>
                <div>{item.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
