import * as tmi from "tmi.js";
import { useEffect, useRef } from "react";
import { cleanTwitchMessage } from "./utility";

const useTwitchChat = (channel: string, setMessage: Function) => {
  const initialized = useRef<boolean>(false);

  const urlParams = new URLSearchParams(window.location.search);
  const IS_KICK_STREAM = urlParams.get("kick");

  useEffect(() => {
    if (initialized.current || !channel || IS_KICK_STREAM) return;
    initialized.current = true;

    const twitchChannel: string = channel.toLowerCase();
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

    twitchClient.on("message", (_channel: string, tags: tmi.ChatUserstate, msg: string) => {
      if (!tags.username || !msg) return;
      const message = cleanTwitchMessage(msg);

      setMessage(message);
    });
  }, []);
};

export default useTwitchChat;
