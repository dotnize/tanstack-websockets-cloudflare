import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export { ChatRoom } from "@/durable-objects/chat-room";

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});
