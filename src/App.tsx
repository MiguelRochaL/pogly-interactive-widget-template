
import { useEffect, useRef, useState } from "react";
import useTwitchChat, { type ChatPermissions } from "./useTwitchChat";

const VOTING_SECONDS = 15;
const REVEAL_SECONDS = 15;

const DOOR_IMAGE_URL = "https://f.feridinha.com/WbL3s.png";
const DEFAULT_LIAN_IMAGE_URL = "https://f.feridinha.com/mWRgw.png";

type Phase = "idle" | "voting" | "reveal";

function App() {
  const params = new URLSearchParams(window.location.search);
  const channel = params.get("channel");

  const parsedVotingSeconds = Number(params.get("voting_seconds"));
  const votingSeconds =
    Number.isFinite(parsedVotingSeconds) && parsedVotingSeconds > 0
      ? Math.max(1, Math.floor(parsedVotingSeconds))
      : VOTING_SECONDS;

  const parsedRevealSeconds = Number(params.get("reveal_seconds"));
  const revealSeconds =
    params.has("reveal_seconds") &&
    Number.isFinite(parsedRevealSeconds) &&
    parsedRevealSeconds >= 0
      ? Math.floor(parsedRevealSeconds)
      : REVEAL_SECONDS;

  const door1Image = params.get("door1_image") || DOOR_IMAGE_URL;
  const door2Image = params.get("door2_image") || DOOR_IMAGE_URL;
  const door3Image = params.get("door3_image") || DOOR_IMAGE_URL;
  const characterImage =
    params.get("characterImage") || DEFAULT_LIAN_IMAGE_URL;

  const isOverlay = params.get("overlay") === "true";
  const transparent = params.get("transparent") === "true";

  // ADIÇÃO: identifica quando o widget está no overlay real do Pogly.
  const isPoglyOverlay = params.get("pogly_overlay") === "true";

  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");

  const [seconds, setSeconds] = useState(votingSeconds);
  const [catDoor, setCatDoor] = useState(0);
  const [votes, setVotes] = useState([0, 0, 0]);

  const totalVotes = votes.reduce((total, count) => total + count, 0);
  const correctVotes = catDoor > 0 ? votes[catDoor - 1] : 0;
  const correctPercent =
    totalVotes > 0
      ? Math.round((correctVotes / totalVotes) * 100)
      : 0;

  const voters = useRef(new Set<string>());
  const active = useRef(false);

  const chatHandler = useRef<
    (
      message: string,
      username: string,
      permissions: ChatPermissions
    ) => void
  >(() => {});

  const startGame = () => {
    if (active.current) return;

    voters.current = new Set();
    setVotes([0, 0, 0]);
    setCatDoor(Math.floor(Math.random() * 3) + 1);
    setSeconds(votingSeconds);

    active.current = true;
    phaseRef.current = "voting";
    setPhase("voting");
  };

  // Mantém a função atualizada para receber o comando enviado pelo Pogly.
  const startGameRef = useRef(startGame);
  startGameRef.current = startGame;

  // Recebe a mensagem enviada pela janela pai do iframe.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (event.data?.type !== "INICIAR_JOGO") return;

      startGameRef.current();
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  chatHandler.current = (message, username, permissions) => {
    const command = message.trim().toLowerCase();

    if (command === "!joguinho") {
      if (!permissions.isModerator && !permissions.isBroadcaster) {
        return;
      }

      startGame();
      return;
    }

    if (!active.current || phaseRef.current !== "voting") return;

    const match = command.match(/^!([123])$/);
    if (!match) return;

    const voter = username.toLowerCase();

    if (voters.current.has(voter)) return;
    voters.current.add(voter);

    const door = Number(match[1]) - 1;

    setVotes((oldVotes) =>
      oldVotes.map((count, index) =>
        index === door ? count + 1 : count
      )
    );
  };

  useTwitchChat(
    channel || "",
    (
      message: string,
      username: string,
      permissions: ChatPermissions
    ) => {
      chatHandler.current(message, username, permissions);
    },
    isOverlay
  );

  useEffect(() => {
    if (!isOverlay || phase !== "voting") return;

    if (seconds > 0) {
      const timer = setTimeout(() => {
        setSeconds((current) => current - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }

    active.current = false;
    phaseRef.current = "reveal";
    setPhase("reveal");
  }, [phase, seconds, isOverlay]);

  useEffect(() => {
    if (phase !== "reveal") return;

    const timer = setTimeout(() => {
      active.current = false;
      phaseRef.current = "idle";
      setPhase("idle");
    }, revealSeconds * 1000);

    return () => clearTimeout(timer);
  }, [phase, revealSeconds]);

  if (!channel) {
    return (
      <div style={{ color: "white", padding: 20 }}>
        Configure uma URL com ?channel=SEUCANAL&overlay=true
      </div>
    );
  }

  if (!isOverlay) {
    return (
      <div style={{ color: "white", padding: 20 }}>
        Jogo das três portas — visualize no overlay da Twitch.
      </div>
    );
  }

  // ADIÇÃO: esconde o jogo na live enquanto estiver parado.
  // A prévia do editor continua funcionando normalmente.
  if (isPoglyOverlay && phase === "idle") {
    return null;
  }

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100%",
        padding: 20,
        boxSizing: "border-box",
        background:
          phase === "idle" && transparent
            ? "transparent"
            : "#17121f",
        color: "white",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        borderRadius: 16,
      }}
    >
      <h1 style={{ color: "#f5c6ff", margin: "0 0 12px" }}>
        ONDE ESTÁ O LIAN?
      </h1>

      <p style={{ fontSize: 20, margin: "12px 0" }}>
        {phase === "idle"
          ? "Prévia do jogo"
          : phase === "voting"
          ? `Votação aberta! ${seconds}s restantes`
          : `O LIAN ESTAVA NA PORTA ${catDoor}!`}
      </p>

      <section
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "clamp(8px, 2vw, 24px)",
          margin: "24px auto",
          maxWidth: 900,
        }}
      >
        {[1, 2, 3].map((door) => (
          <div
            key={door}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 240,
                margin: "0 auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "visible",
              }}
            >
              <img
                src={
                  door === 1
                    ? door1Image
                    : door === 2
                    ? door2Image
                    : door3Image
                }
                alt={`Porta ${door}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                  display: "block",
                  opacity: phase === "idle" ? 0.5 : 1,
                }}
              />

              {phase === "reveal" && door === catDoor && (
                <img
                  src={characterImage}
                  alt="Lian"
                  style={{
                    position: "absolute",
                    width: "75%",
                    height: "55%",
                    bottom: "0%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    objectFit: "contain",
                    objectPosition: "center",
                    zIndex: 2,
                  }}
                />
              )}
            </div>

            <div style={{ fontSize: 18, marginTop: 8 }}>
              {votes[door - 1]} votos
            </div>
          </div>
        ))}

        {phase === "idle" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 5,
              pointerEvents: "none",
              padding: 12,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                background: "rgba(23, 18, 31, 0.88)",
                border: "2px solid #f5c6ff",
                borderRadius: 14,
                padding: "16px 22px",
                maxWidth: 440,
                color: "white",
                fontSize: 20,
                fontWeight: "bold",
                textAlign: "center",
                lineHeight: 1.4,
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              Widget está oculto na stream, digite !joguinho para iniciar
            </div>
          </div>
        )}
      </section>

      <p style={{ fontSize: 18 }}>
        {phase === "idle"
          ? "Prévia do jogo — a votação ainda não começou."
          : phase === "voting"
          ? "Digite !1, !2 ou !3 no chat da Twitch. Cada pessoa vota uma vez!"
          : `${correctPercent}% acertaram! ${correctVotes} de ${totalVotes} votos foram na porta certa!`}
      </p>
    </main>
  );
}

export default App;
