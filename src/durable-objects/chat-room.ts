import { DurableObject } from "cloudflare:workers";

interface ConnectionState {
  id: string;
}

// ref: https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
export class ChatRoom extends DurableObject {
  private readonly sessions: Map<WebSocket, ConnectionState>;

  constructor(ctx: DurableObjectState<Env>, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    // Restore state for hibernated websockets
    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment() as ConnectionState | null;
      if (attachment) this.sessions.set(ws, attachment);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    if (request.method !== "GET") {
      return new Response("Expected GET", { status: 405 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const connectionState: ConnectionState = { id: crypto.randomUUID() };
    // Serialize so we can restore state if DO hibernates
    server.serializeAttachment(connectionState);

    this.ctx.acceptWebSocket(server);
    this.sessions.set(server, connectionState);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const state = ws.deserializeAttachment() as ConnectionState | undefined;
    const text =
      typeof message === "string" ? message : new TextDecoder().decode(message);

    const payload = JSON.stringify({
      type: "message",
      from: state?.id ?? "unknown",
      message: text,
      timestamp: Date.now(),
    });

    this.sessions.forEach((_, socket) => socket.send(payload));
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    console.log(`WebSocket closed: ${code} ${reason} (clean: ${wasClean})`);
    this.sessions.delete(ws);
    ws.close(code, reason);
  }
}
