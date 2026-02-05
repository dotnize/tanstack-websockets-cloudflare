import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/chat/$roomId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
          return new Response("Expected Upgrade: websocket", { status: 426 });
        }

        const chatRooms = env.CHAT_ROOMS;
        const id = chatRooms.idFromName(params.roomId);
        const stub = chatRooms.get(id);

        return stub.fetch(request);
      },
    },
  },
});
