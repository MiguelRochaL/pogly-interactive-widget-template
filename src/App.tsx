import "./App.css";
import { useState } from "react";
import useTwitchChat from "./useTwitchChat";
import useKickChat from "./useKickChat";

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const domainURL = window.location.origin + "/example/?channel=bobross";

  const CHANNEL_NAME = urlParams.get("channel");

  if (!CHANNEL_NAME) {
    return (
      <>
        You need to put the twitch channel in the url! example: <a href={domainURL}>{domainURL}</a>!
      </>
    );
  }

  const [message, setMessage] = useState<string>("");

  useTwitchChat(CHANNEL_NAME, setMessage);
  useKickChat(CHANNEL_NAME, setMessage);

  return <div style={{ fontSize: "100px" }}>Message: {message}</div>;
}

export default App;
