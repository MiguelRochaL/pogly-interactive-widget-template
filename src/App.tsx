
import { useEffect, useRef, useState } from "react";
import { useTwitchChat } from "./useTwitchChat";

type Phase = "idle" | "voting" | "reveal";

const VOTING_SECONDS = 15;
const REVEAL_SECONDS = 15;

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

  const transparent = params.get("transparent") === "true";

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [votes, setVotes] = useState([0, 0, 0]);
  const [correctDoor, setCorrectDoor] = useState(0);
  const [round, setRound] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const startGameRef = useRef<() => void>(() => {});
  const votesRef = useRef<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const roundRef = useRef(0);

  function changePhase(nextPhase: Phase) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }

  function clearGameTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startGame() {
    clearGameTimer();

    votesRef.current = {};
    setVotes([0, 0, 0]);

    const chosenDoor = Math.floor(Math.random() * 3) + 1;
    setCorrectDoor(chosenDoor);

    roundRef.current += 1;
    setRound(roundRef.current);

    setTimeLeft(votingSeconds);
    changePhase("voting");

    let remaining = votingSeconds;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearGameTimer();
        revealResult();
      }
    }, 1000);
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
        changePhase("idle");
        setTimeLeft(0);
      }
    }, 1000);
  }

  // Mantém sempre disponível a versão atual da função.
  useEffect(() => {
    startGameRef.current = startGame;
  });

  // Recebe o comando enviado pelo painel do Pogly.
  useEffect(() => {
    function handlePoglyMessage(event: MessageEvent) {
      // Aceita mensagens da janela que contém o iframe.
      if (event.source !== window.parent) return;

      if (event.data?.type === "INICIAR_JOGO") {
        startGameRef.current();
      }
    }

    window.addEventListener("message", handlePoglyMessage);

    return () => {
      window.removeEventListener(
        "message",
        handlePoglyMessage
      );
    };
  }, []);

  // Comandos recebidos pelo chat da Twitch.
  useTwitchChat(
    (
      message: string,
      username: string,
      permissions: {
        isModerator: boolean;
        isBroadcaster: boolean;
      }
    ) => {
      const command = message.trim().toLowerCase();

      if (command === "!joguinho") {
        if (
          permissions.isModerator ||
          permissions.isBroadcaster
        ) {
          startGameRef.current();
        }
        return;
      }

      if (phaseRef.current !== "voting") return;

      const match = command.match(/^!([123])$/);
      if (!match) return;

      const user = username.toLowerCase();

      // Cada usuário pode votar apenas uma vez por rodada.
      if (votesRef.current[user] !== undefined) return;

      const choice = Number(match[1]);
      votesRef.current[user] = choice;

      setVotes((currentVotes) => {
        const updated = [...currentVotes];
        updated[choice - 1] += 1;
        return updated;
      });
    }
  );

  useEffect(() => {
    return () => clearGameTimer();
  }, []);

  const totalVotes = votes.reduce(
    (total, count) => total + count,
    0
  );

  const percentages = votes.map((count) =>
    totalVotes === 0
      ? 0
      : Math.round((count / totalVotes) * 100)
  );

  const background =
    transparent && phase === "idle"
      ? "transparent"
      : "rgba(10, 10, 18, 0.94)";

  const styles: Record<string, React.CSSProperties> = {
    page: {
      width: "100%",
      height: "100vh",
      boxSizing: "border-box",
      overflow: "hidden",
      background,
      color: "#fff",
      fontFamily: "Arial, Helvetica, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: 12,
    },
    title: {
      fontSize: "clamp(24px, 4vw, 42px)",
      fontWeight: 900,
      margin: "0 0 8px",
      textShadow: "0 3px 8px #000",
    },
    subtitle: {
      fontSize: "clamp(14px, 2vw, 21px)",
      margin: "4px 0 14px",
      fontWeight: 700,
    },
    doors: {
      display: "flex",
      justifyContent: "center",
      alignItems: "stretch",
      gap: 12,
      width: "100%",
      maxWidth: 900,
    },
    door: {
      flex: "1 1 0",
      minWidth: 0,
      maxWidth: 270,
      border: "3px solid #fff",
      borderRadius: 12,
      overflow: "hidden",
      background: "#242438",
      boxShadow: "0 4px 18px #0008",
      position: "relative",
    },
    doorImage: {
      display: "block",
      width: "100%",
      aspectRatio: "3 / 4",
      objectFit: "contain",
      background: "#171725",
    },
    number: {
      padding: "8px 4px",
      fontSize: "clamp(18px, 3vw, 28px)",
      fontWeight: 900,
      background: "#292940",
    },
    timer: {
      fontSize: "clamp(24px, 4vw, 38px)",
      fontWeight: 900,
      margin: "12px 0",
      color: "#ffe66d",
    },
    vote: {
      fontSize: "clamp(13px, 2vw, 19px)",
      fontWeight: 700,
      padding: "5px 2px",
    },
    result: {
      marginTop: 16,
      fontSize: "clamp(20px, 3vw, 30px)",
      fontWeight: 900,
    },
    character: {
      display: "block",
      maxWidth: "min(260px, 55vw)",
      maxHeight: "28vh",
      objectFit: "contain",
      margin: "12px auto 0",
    },
  };

  return (
    <main style={styles.page}>
      {phase === "idle" && (
        <div>
          <h1 style={styles.title}>🔎 Onde está o Lian?</h1>
          <p style={styles.subtitle}>
            Digite <strong>!joguinho</strong> no chat para iniciar!
          </p>
        </div>
      )}

      {phase === "voting" && (
        <>
          <h1 style={styles.title}>🚪 Onde está o Lian?</h1>

          <p style={styles.subtitle}>
            Vote no chat: <strong>!1</strong>,{" "}
            <strong>!2</strong> ou <strong>!3</strong>
          </p>

          <div style={styles.timer}>
            ⏱️ {timeLeft}s
          </div>

          <div style={styles.doors}>
            {doors.map((image, index) => (
              <div key={index} style={styles.door}>
                <img
                  src={image}
                  alt={`Porta ${index + 1}`}
                  style={styles.doorImage}
                />

                <div style={styles.number}>
                  PORTA {index + 1}
                </div>

                <div style={styles.vote}>
                  {votes[index]} votos · {percentages[index]}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {phase === "reveal" && (
        <>
          <h1 style={styles.title}>🎉 Resultado!</h1>

          <p style={styles.subtitle}>
            O Lian estava atrás da porta {correctDoor}!
          </p>

          <div style={styles.doors}>
            {doors.map((image, index) => {
              const isCorrect = index + 1 === correctDoor;

              return (
                <div
                  key={index}
                  style={{
                    ...styles.door,
                    borderColor: isCorrect ? "#55ff88" : "#777",
                    borderWidth: isCorrect ? 5 : 3,
                    boxShadow: isCorrect
                      ? "0 0 24px #55ff88"
                      : "0 4px 18px #0008",
                  }}
                >
                  <img
                    src={image}
                    alt={`Porta ${index + 1}`}
                    style={styles.doorImage}
                  />

                  <div
                    style={{
                      ...styles.number,
                      background: isCorrect ? "#176b3a" : "#292940",
                    }}
                  >
                    {isCorrect ? "✅ " : ""}
                    PORTA {index + 1}
                  </div>

                  <div style={styles.vote}>
                    {votes[index]} votos · {percentages[index]}%
                  </div>

                  {isCorrect && (
                    <img
                      src={characterImage}
                      alt="Lian"
                      style={styles.character}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p style={styles.result}>
            Próxima rodada em {timeLeft}s
          </p>
        </>
      )}
    </main>
  );
}
