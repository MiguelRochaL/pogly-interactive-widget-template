
import * as tmi from "tmi.js";
import { useEffect, useRef } from "react";

export type ChatPermissions = {
  isModerator: boolean;
  isBroadcaster: boolean;
};

type ChatHandler = (
  message: string,
  username: string,
  permissions: ChatPermissions
) => void;

const useTwitchChat = (
  channel: string,
  revealWord: ChatHandler,
  isOverlay: boolean
) => {
  const initialized = useRef<boolean>(false);
  const handlerRef = useRef<ChatHandler>(revealWord);

  handlerRef.current = revealWord;

  const urlParams = new URLSearchParams(window.location.search);
  const IS_KICK_STREAM = urlParams.get("kick") === "true";

  useEffect(() => {
    if (
      initialized.current ||
      !channel ||
      IS_KICK_STREAM ||
      !isOverlay
    ) {
      return;
    }

    initialized.current = true;

    const twitchChannel = channel.toLowerCase();

    const twitchClient = tmi.Client({
      connection: {
        reconnect: true,
        maxReconnectAttempts: Infinity,
        maxReconnectInterval: 30000,
        reconnectDecay: 1.4,
        reconnectInterval: 5000,
        timeout: 180000,
      },
      channels: [twitchChannel],
    });

    twitchClient.connect();

    twitchClient.on("connected", () => {
      console.log("Connected to twitch chat!");
    });

    twitchClient.on(
      "message",
      (
        _channel: string,
        tags: tmi.ChatUserstate,
        message: string
      ) => {
        if (!tags.username || !message) return;

        const badges = tags.badges ?? {};

        const permissions: ChatPermissions = {
          isBroadcaster: badges.broadcaster === "1",
          isModerator:
            tags.mod === true || badges.broadcaster === "1",
        };

        handlerRef.current(
          message,
          tags.username,
          permissions
        );
      }
    );

    return () => {
      initialized.current = false;
      twitchClient.disconnect();
    };
  }, [channel, IS_KICK_STREAM, isOverlay]);
};

export default useTwitchChat;
