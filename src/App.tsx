
import { useEffect, useRef, useState } from "react";
import useTwitchChat, { type ChatPermissions } from "./useTwitchChat";

type Phase = "idle" | "voting" | "reveal";

const VOTING_SECONDS = 30;
const REVEAL_SECONDS = 10;

const DEFAULT_DOORS = [
  "https://c.feridinha.com/zeOHV.png",
  "https://f.feridinha.com/aDASW.png",
  "https://f.feridinha.com/vuiVx.png",
];

const DEFAULT_CHARACTER =
  "https://f.feridinha.com/mWRgw.png";

export default function App() {
  const params = new URLSearchParams(window.location.search);

  const channel = params.get("channel") || "umister";
  const isOverlay = params.get("overlay") === "true";
  const transparent = params.get("transparent") === "true";

  const votingSeconds = Math.max(
    1,
    Number(params.get("voting_seconds")) || VOTING_SECONDS
  );

  const revealSeconds = Math.max(
    1,
    Number(params.get("reveal_seconds")) || REVEAL_SECONDS
  );

  const doors = [
    params.get("door1_image") || DEFAULT_DOORS[0],
    params.get("door2_image") || DEFAULT_DOORS[1],
    params.get("door3_image") || DEFAULT_DOORS[2],
  ];

  const characterImage =
    params.get("characterImage") || DEFAULT_CHARACTER;

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [votes, setVotes] = useState([0, 0, 0]);
  const [correctDoor, setCorrectDoor] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const votesRef = useRef<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startGameRef = useRef<() => void>(() => {});

  function changePhase(nextPhase: Phase) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }

  function clearGameTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function revealResult() {
    clearGameTimer();
    changePhase("reveal");
    setTimeLeft(revealSeconds);

    let remaining = revealSeconds;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearGameTimer();
        setTimeLeft(0);
        changePhase("idle");
      }
    }, 1000);
  }

  function startGame() {
    clearGameTimer();

    votesRef.current = {};
    setVotes([0, 0, 0]);
    setCorrectDoor(Math.floor(Math.random() * 3) + 1);
    setTimeLeft(votingSeconds);
    changePhase("voting");

    let remaining = votingSeconds;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        revealResult();
      }
    }, 1000);
  }

  useEffect(() => {
    startGameRef.current = startGame;
  });

  // Recebe o comando enviado pelo painel do Pogly.
  useEffect(() => {
    function handlePoglyMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;

      if (event.data?.type === "INICIAR_JOGO") {
        startGameRef.current();
      }
    }

    window.addEventListener("message", handlePoglyMessage);

    return () => {
      window.removeEventListener("message", handlePoglyMessage);
    };
  }, []);

  // O hook correto recebe canal, callback e indicador de overlay.
  const handleChatMessage = (
    message: string,
    username: string,
    permissions: ChatPermissions
  ) => {
    const command = message.trim().toLowerCase();

    if (command === "!joguinho") {
      if (permissions.isModerator || permissions.isBroadcaster) {
        startGameRef.current();
      }
      return;
    }

    if (phaseRef.current !== "voting") return;

    const match = command.match(/^!([123])$/);
    if (!match) return;

    const user = username.toLowerCase();

    if (votesRef.current[user] !== undefined) return;

    const choice = Number(match[1]);
    votesRef.current[user] = choice;

    setVotes((current) => {
      const updated = [...current];
      updated[choice - 1] += 1;
      return updated;
    });
  };

  useTwitchChat(channel, handleChatMessage, isOverlay);

  useEffect(() => {
    return () => clearGameTimer();
  }, []);

  const totalVotes = votes.reduce((sum, count) => sum + count, 0);

  const percentages = votes.map((count) =>
    totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
  );

  const pageStyle: React.CSSProperties = {
    boxSizing: "border-box",
    width: "100%",
    height: "100vh",
    overflow: "hidden",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    fontFamily: "Arial, Helvetica, sans-serif",
    color: "#fff",
    background:
      transparent && phase === "idle"
        ? "transparent"
        : "rgba(10,10,18,0.94)",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "clamp(24px,4vw,42px)",
    fontWeight: 900,
    margin: "0 0 8px",
    textShadow: "0 3px 8px #000",
  };

  const doorsStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
    gap: 12,
    width: "100%",
    maxWidth: 900,
  };

  const cardStyle: React.CSSProperties = {
    flex: "1 1 0",
    minWidth: 0,
    maxWidth: 270,
    overflow: "hidden",
    border: "3px solid #fff",
    borderRadius: 12,
    background: "#242438",
    boxShadow: "0 4px 18px #0008",
  };

  const imageStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    aspectRatio: "3 / 4",
    objectFit: "contain",
    background: "#171725",
  };

  return (
    <main style={pageStyle}>
      {phase === "idle" && (
        <>
          <h1 style={titleStyle}>🔎 Onde está o Lian?</h1>
          <p>
            Digite <strong>!joguinho</strong> no chat para iniciar!
          </p>
        </>
      )}

      {phase === "voting" && (
        <>
          <h1 style={titleStyle}>🚪 Onde está o Lian?</h1>
          <p>
            Vote no chat: <strong>!1</strong>,{" "}
            <strong>!2</strong> ou <strong>!3</strong>
          </p>

          <div
            style={{
              fontSize: "clamp(24px,4vw,38px)",
              fontWeight: 900,
              color: "#ffe66d",
              margin: "12px 0",
            }}
          >
            ⏱️ {timeLeft}s
          </div>

          <div style={doorsStyle}>
            {doors.map((src, index) => (
              <div key={index} style={cardStyle}>
                <img src={src} alt={`Porta ${index + 1}`} style={imageStyle} />
                <div style={{ padding: 8, fontWeight: 900 }}>
                  PORTA {index + 1}
                </div>
                <div style={{ padding: 5, fontWeight: 700 }}>
                  {votes[index]} votos · {percentages[index]}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {phase === "reveal" && (
        <>
          <h1 style={titleStyle}>🎉 Resultado!</h1>
          <p>
            O Lian estava atrás da porta {correctDoor}!
          </p>

          <div style={doorsStyle}>
            {doors.map((src, index) => {
              const correct = index + 1 === correctDoor;

              return (
                <div
                  key={index}
                  style={{
                    ...cardStyle,
                    borderColor: correct ? "#55ff88" : "#777",
                    borderWidth: correct ? 5 : 3,
                    boxShadow: correct
                      ? "0 0 24px #55ff88"
                      : "0 4px 18px #0008",
                  }}
                >
                  <img src={src} alt={`Porta ${index + 1}`} style={imageStyle} />
                  <div
                    style={{
                      padding: 8,
                      fontWeight: 900,
                      background: correct ? "#176b3a" : "#292940",
                    }}
                  >
                    {correct ? "✅ " : ""}PORTA {index + 1}
                  </div>
                  <div style={{ padding: 5, fontWeight: 700 }}>
                    {votes[index]} votos · {percentages[index]}%
                  </div>

                  {correct && (
                    <img
                      src={characterImage}
                      alt="Lian"
                      style={{
                        display: "block",
                        maxWidth: "min(260px,55vw)",
                        maxHeight: "25vh",
                        objectFit: "contain",
                        margin: "12px auto",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p style={{ fontWeight: 900, fontSize: 24 }}>
            Próxima rodada em {timeLeft}s
          </p>
        </>
      )}
    </main>
  );
}
