"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { useStore } from "@/lib/store";

export function useSocketEvents() {
  const {
    addMessage,
    appendToMessage,
    endMessageStream,
    addToolCall,
    updateToolCall,
    setQueue,
    updateParticipant,
    removeParticipant,
    updateRoom,
    setConnected,
    setFileContext,
    setGitStatus,
    setTokenUsage,
    setLintResults,
    setRepoMap,
    setMode,
    setLastUndo,
    setTypingUsers,
    updateReactions,
    clearMessages,
  } = useStore();

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      const currentRoom = useStore.getState().room;
      const currentUserName = useStore.getState().userName;
      const currentApiKey = useStore.getState().apiKey;
      if (currentRoom && currentUserName.trim() && currentApiKey.trim()) {
        socket.emit(
          "room:join",
          { roomId: currentRoom.id, userName: currentUserName.trim(), apiKey: currentApiKey.trim() },
          (joinedRoom, pid, _err) => {
            if (joinedRoom && pid) {
              updateRoom(joinedRoom);
            }
          }
        );
      }
    };
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("message:new", (message) => {
      addMessage(message);
    });

    socket.on("message:stream", ({ messageId, chunk }) => {
      appendToMessage(messageId, chunk);
    });

    socket.on("message:streamEnd", ({ messageId, tokenCount, costEstimate, diff }) => {
      endMessageStream(messageId, tokenCount, costEstimate, diff);
    });

    socket.on("message:toolCall", ({ messageId, toolCall }) => {
      addToolCall(messageId, toolCall);
    });

    socket.on("message:toolCallUpdate", ({ messageId, toolCallId, input, output, status }) => {
      updateToolCall(messageId, toolCallId, { input, output, status });
    });

    socket.on("queue:update", (queue) => {
      setQueue(queue);
    });

    socket.on("participant:joined", (participant) => {
      updateParticipant(participant);
    });

    socket.on("participant:left", (participantId) => {
      removeParticipant(participantId);
    });

    socket.on("room:update", (room) => {
      updateRoom(room);
    });

    socket.on("fileContext:update", (files) => {
      setFileContext(files);
    });

    socket.on("gitStatus:update", (status) => {
      setGitStatus(status);
    });

    socket.on("tokenUsage:update", (usage) => {
      setTokenUsage(usage);
    });

    socket.on("lint:result", (results) => {
      setLintResults(results);
    });

    socket.on("repoMap:update", (entries) => {
      setRepoMap(entries);
    });

    socket.on("mode:update", (mode) => {
      setMode(mode);
    });

    socket.on("undo:result", (result) => {
      setLastUndo(result);
      setTimeout(() => setLastUndo(null), 5000);
    });

    socket.on("typing:update", (users) => {
      setTypingUsers(users);
    });

    socket.on("reaction:update", ({ messageId, reactions }) => {
      updateReactions(messageId, reactions);
    });

    socket.on("room:cleared", () => {
      clearMessages();
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new");
      socket.off("message:stream");
      socket.off("message:streamEnd");
      socket.off("message:toolCall");
      socket.off("message:toolCallUpdate");
      socket.off("queue:update");
      socket.off("participant:joined");
      socket.off("participant:left");
      socket.off("room:update");
      socket.off("fileContext:update");
      socket.off("gitStatus:update");
      socket.off("tokenUsage:update");
      socket.off("lint:result");
      socket.off("repoMap:update");
      socket.off("mode:update");
      socket.off("undo:result");
      socket.off("typing:update");
      socket.off("reaction:update");
      socket.off("room:cleared");
    };
  }, [
    addMessage, appendToMessage, endMessageStream, addToolCall, updateToolCall,
    setQueue, updateParticipant, removeParticipant, updateRoom, setConnected,
    setFileContext, setGitStatus, setTokenUsage, setLintResults, setRepoMap,
    setMode, setLastUndo, setTypingUsers, updateReactions, clearMessages,
  ]);
}
