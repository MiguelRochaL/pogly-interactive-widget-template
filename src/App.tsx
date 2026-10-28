
import { useEffect, useRef, useState } from "react";
import { useTwitchChat } from "./useTwitchChat";

const VOTING_SECONDS = 15;
const REVEAL_SECONDS = 15;

const DEFAULT_DOOR_IMAGE = "https://f.feridinha.com/WbL3s.png";
const DEFAULT_CHARACTER_IMAGE = "https://f.feridinha.com/mWRgw.png";

type Phase = "idle" | "voting" | "reveal";
type VoteMap = Record<string, number>;

function getParam(name: string, fallback: string): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || fallback;
}

export default function App() {
  const channel = getParam("channel", "umister");

  const doorImages = [
    getParam("door1_image", DEFAULT_DOOR_IMAGE),
    getParam("door2_image", DEFAULT_DOOR_IMAGE),
    getParam("door3_image", DEFAULT_DOOR_IMAGE),
  ];

  const characterImage = getParam(
    "characterImage",
    DEFAULT_CHARACTER_IMAGE
  );

  const votingSeconds = Math.max(
    1,
    Number(getParam("voting_seconds", String(VOTING_SECONDS))) ||
      VOTING_SECONDS
  );

  const revealSeconds = Math.max(
    1,
    Number(getParam("reveal_seconds", String(REVEAL_SECONDS))) ||
      REVEAL_SECONDS
  );

  const transparent =
    getParam("transparent", "false").toLowerCase() === "true";

  const [phase, setPhase] = useState<Phase>("idle");
  const [votes, setVotes] = useState<VoteMap>({});
  const [correctDoor, setCorrectDoor] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [round, setRound] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const votesRef = useRef<VoteMap>({});
  const roundRef = useRef(0);

  function changePhase(nextPhase: Phase) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }

  function startGame() {
    // Impede iniciar outra partida enquanto uma rodada estiver ativa.
    if (phaseRef.current !== "idle") return;

    roundRef.current += 1;
    setRound(roundRef.current);

    votesRef.current = {};
    setVotes({});

    const chosenDoor = Math.floor(Math.random() * 3) + 1;
    setCorrectDoor(chosenDoor);

    setTimeLeft(votingSeconds);
    changePhase("voting");
  }

  function registerVote(username: string, door: number) {
    if (phaseRef.current !== "voting") return;
    if (door < 1 || door > 3) return;

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) return;

    if (votesRef.current[normalizedUsername] !== undefined) return;

    const nextVotes = {
      ...votesRef.current,
      [normalizedUsername]: door,
    };

    votesRef.current = nextVotes;
    setVotes(nextVotes);
  }

  // Mantém uma referência atualizada para o botão do Pogly.
  const startGameRef = useRef(startGame);

  useEffect(() => {
    startGameRef.current = startGame;
  });

  // RECEBE O COMANDO DE INICIAR ENVIADO PELO POGLY.
  useEffect(() => {
    function handlePoglyMessage(event: MessageEvent) {
      if (event.origin !== "https://jogo-porta-lian.vercel.app") {
        return;
      }

      if (event.data?.type === "INICIAR_JOGO") {
        startGameRef.current();
      }
    }

    window.addEventListener("message", handlePoglyMessage);

    return () => {
      window.removeEventListener("message", handlePoglyMessage);
    };
  }, []);

  const { messages } = useTwitchChat(channel);

  // Comando !joguinho e votação pelo chat da Twitch.
  useEffect(() => {
    if (!messages?.length) return;

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    const username =
      latestMessage.username ||
      latestMessage.user?.name ||
      latestMessage.user?.displayName ||
      "";

    const messageText = String(
      latestMessage.message || latestMessage.text || ""
    )
      .trim()
      .toLowerCase();

    const isModerator =
      latestMessage.isMod === true ||
      latestMessage.mod === true ||
      latestMessage.badges?.moderator === true ||
      latestMessage.badges?.broadcaster === true;

    if (messageText === "!joguinho") {
      if (isModerator) startGameRef.current();
      return;
    }

    if (messageText === "!1") registerVote(username, 1);
    if (messageText === "!2") registerVote(username, 2);
    if (messageText === "!3") registerVote(username, 3);
  }, [messages]);

  // Contagem regressiva da votação e da revelação.
  useEffect(() => {
    if (phase !== "voting" && phase !== "reveal") return;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current > 1) return current - 1;

        window.clearInterval(timer);

        if (phaseRef.current === "voting") {
          changePhase("reveal");
          return revealSeconds;
        }

        changePhase("idle");
        return 0;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, round, revealSeconds]);

  const voteCounts = [1, 2, 3].map((door) =>
    Object.values(votes).filter((vote) => vote === door).length
  );

  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);

  const votePercentages = voteCounts.map((count) =>
    totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)
  );

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: 12,
        color: "#fff",
        background:
          transparent && phase === "idle"
            ? "transparent"
            : "rgba(22, 10, 37, 0.94)",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 650,
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          alignItems: "end",
        }}
      >
        {[1, 2, 3].map((door) => {
          const isCorrect = correctDoor === door;
          const showCharacter = phase === "reveal" && isCorrect;
          const percentage = votePercentages[door - 1];

          return (
            <div
              key={door}
              style={{
                minWidth: 0,
                position: "relative",
                textAlign: "center",
                opacity: phase === "idle" ? 0.5 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "3 / 4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showCharacter && (
                  <img
                    src={characterImage}
                    alt="Lian"
                    style={{
                      position: "absolute",
                      width: "72%",
                      height: "72%",
                      objectFit: "contain",
                      bottom: "5%",
                      zIndex: 1,
                    }}
                  />
                )}

                <img
                  src={doorImages[door - 1]}
                  alt={`Porta ${door}`}
                  style={{
                    position: "relative",
                    zIndex: showCharacter ? 2 : 1,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />

                {phase === "voting" && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 3,
                      bottom: 8,
                      left: 0,
                      right: 0,
                      margin: "0 auto",
                      width: "fit-content",
                      minWidth: 42,
                      padding: "5px 8px",
                      borderRadius: 8,
                      background: "#7d2ca3",
                      border: "2px solid #f2c7ff",
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    {percentage}%
                  </div>
                )}

                {phase === "reveal" && isCorrect && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 4,
                      top: 4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#25a244",
                      border: "2px solid white",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 14,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    LIAN!
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: 800,
                  textShadow: "0 2px 4px #000",
                }}
              >
                {door}
              </div>

              {phase !== "idle" && (
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {voteCounts[door - 1]} voto(s)
                </div>
              )}
            </div>
          );
        })}

        {phase === "idle" && (
          <div
            style={{
              position: "absolute",
              zIndex: 5,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              padding: "10px 12px",
              boxSizing: "border-box",
              borderRadius: 10,
              background: "rgba(20, 10, 30, 0.88)",
              border: "1px solid rgba(255,255,255,0.4)",
              textAlign: "center",
              fontWeight: 800,
              fontSize: 15,
              textShadow: "0 2px 4px #000",
            }}
          >
            Widget está oculto na stream, digite !joguinho para iniciar
          </div>
        )}
      </section>

      {phase !== "idle" && (
        <div
          style={{
            marginTop: 10,
            textAlign: "center",
            fontWeight: 800,
            textShadow: "0 2px 4px #000",
          }}
        >
          <div style={{ fontSize: 20 }}>
            {phase === "voting" ? "VOTE NO CHAT!" : "ENCONTRAMOS O LIAN!"}
          </div>

          <div style={{ marginTop: 5, fontSize: 16 }}>
            {phase === "voting"
              ? `Digite !1, !2 ou !3 — ${timeLeft}s`
              : `Próxima rodada em ${timeLeft}s`}
          </div>

          <div style={{ marginTop: 4, fontSize: 13 }}>
            Total de votos: {totalVotes}
          </div>
        </div>
      )}
    </main>
  );
}
