import { useEffect, useMemo, useRef, useState } from "react";
import useTwitchChat from "./useTwitchChat";
import useKickChat from "./useKickChat";
import CrosswordGrid from "./CrosswordGrid";
import { Hint, HintSection } from "./CrosswordHints";
import { useFetchWordList } from "./useFetchWordList";
import { generateCrossword } from "crossword-generator";

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const domainURL = window.location.origin + "/example/?channel=bobross";

  const CHANNEL_NAME = urlParams.get("channel");
  const IS_OVERLAY = urlParams.get("overlay") === "true";
  const TRANSPARENT = urlParams.get("transparent") === "true";
  const CONSOLE_LOG_ASNWERS = urlParams.get("log") === "true";

  if (!CHANNEL_NAME) {
    return (
      <>
        You need to put the twitch channel in the url! example: <a href={domainURL}>{domainURL}</a>!
      </>
    );
  }

  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState<boolean>(false);
  const [generationFinished, setGenerationFinished] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<Map<string, number>>(new Map());
  const [gameOver, setGameOver] = useState<boolean>(false);

  const selectedWords = useRef<any>([]);

  const [fetching, setFetching] = useState<boolean>(false);
  const { data, loading, error } = useFetchWordList(fetching, setFetching, IS_OVERLAY);

  useEffect(() => {
    if (loading || initialized || generationFinished || !data || !IS_OVERLAY) return;

    if (error) {
      setTimeout(() => {
        restart();
      }, 10000);

      return console.log("[ERROR]", error);
    }

    setInitialized(true);

    const grid = generate();

    if (grid.length < 5) {
      console.log("Regenerating because grid was too small.");
      return setInitialized(false);
    }

    if (gameOver) {
      setTimeout(() => {
        setRevealedWords(new Set());
        setLeaderboard(new Map());
        setGameOver(false);
        selectedWords.current = grid;
        setGenerationFinished(true);
      }, 10000);
    } else {
      selectedWords.current = grid;
      setGenerationFinished(true);
    }
  }, [initialized, data, loading, error]);

  useEffect(() => {
    if (!initialized) return;
    if (revealedWords.size === selectedWords.current.length) restart();
  }, [revealedWords]);

  const generate = () => {
    const shuffled = data.sort(() => Math.random() - 0.5);
    const wordArray = shuffled.map((word: any) => word[2]);

    let maxTries = 5;
    let layout = null;

    for (let i = 0; i < maxTries; i++) {
      layout = generateCrossword(wordArray, {
        maxGridSize: 12,
        maxAttempts: 50,
      });

      const gridSize = getGridSize(layout.placedWords);

      if (gridSize.width >= 10 && gridSize.height >= 10) break;
    }

    if (CONSOLE_LOG_ASNWERS)
      layout!.placedWords.map((word: any, index: any) => console.log({ word: word.word, number: index + 1 }));

    const clueMap = Object.fromEntries(shuffled.map(([, clueText, answer]: any) => [answer.toUpperCase(), clueText]));

    const merged = layout!.placedWords.map((obj: any, index: any) => ({
      ...obj,
      clue: clueMap[obj.word.toUpperCase()] || null,
      position: index + 1,
    }));

    return merged;
  };

  const getGridSize = (words: any) => {
    const rows = words.flatMap((w: any) => [w.startRow, w.endRow]);
    const cols = words.flatMap((w: any) => [w.startCol, w.endCol]);
    return {
      width: Math.max(...cols) - Math.min(...cols) + 1,
      height: Math.max(...rows) - Math.min(...rows) + 1,
    };
  };

  const revealWord = (guess: string, guesser: string) => {
    const match = selectedWords.current.find((w: any) => w.word.toLowerCase() === guess.toLowerCase());

    if (match && !revealedWords.has(match.word)) {
      setRevealedWords((prev) => new Set(prev).add(match.word));

      const hintText = document.getElementById(match.position + "_hint-text");

      if (hintText) hintText.classList.add("crossed");

      setLeaderboard((prev) => {
        const next = new Map(prev);
        const key = guesser.trim();
        next.set(key, (next.get(key) ?? 0) + 1);
        return next;
      });
    }
  };

  const restart = () => {
    setGameOver(true);
    setFetching(false);
    setInitialized(false);
    setGenerationFinished(false);
  };

  const sortedLeaderboard = useMemo(() => [...leaderboard.entries()].sort((a, b) => b[1] - a[1]), [leaderboard]);

  useTwitchChat(CHANNEL_NAME, revealWord, IS_OVERLAY);
  useKickChat(CHANNEL_NAME, revealWord, IS_OVERLAY);

  return (
    <div
      className="game-container"
      style={{
        backgroundColor: TRANSPARENT || !IS_OVERLAY ? "transparent" : "#18181b",
        boxShadow: TRANSPARENT || !IS_OVERLAY ? "none" : "0 0 15px #9147ff4d",
      }}
    >
      {IS_OVERLAY ? (
        <>
          <div>
            {generationFinished || gameOver ? (
              <CrosswordGrid data={selectedWords.current} revealedWords={revealedWords} />
            ) : (
              <span
                className="hints-heading"
                style={{
                  background: TRANSPARENT ? "#252526" : "transparent",
                  border: TRANSPARENT ? "1px solid rgba(145, 71, 255, 0.25)" : "none",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                }}
              >
                Generating board...
              </span>
            )}
          </div>
          {(generationFinished || gameOver) && (
            <div className="hints-panel">
              {!gameOver ? (
                <h1
                  className="game-title"
                  style={{
                    background: TRANSPARENT ? "#252526" : "transparent",
                    border: TRANSPARENT ? "1px solid rgba(145, 71, 255, 0.25)" : "none",
                    padding: "0.75rem 1rem",
                  }}
                >
                  Chat, solve the crossword!
                </h1>
              ) : (
                <h1
                  className="game-title"
                  style={{
                    background: TRANSPARENT ? "#252526" : "transparent",
                    border: TRANSPARENT ? "1px solid rgba(145, 71, 255, 0.25)" : "none",
                  }}
                >
                  Board solved!
                </h1>
              )}

              <div className="hints-sections">
                {!gameOver ? (
                  <>
                    <HintSection heading="Across">
                      {selectedWords.current
                        .filter((value: any) => value.direction === "horizontal")
                        .map((h: any) => (
                          <Hint key={h.position + "_across"} num={h.position}>
                            {h.clue}
                          </Hint>
                        ))}
                    </HintSection>
                    <HintSection heading="Down">
                      {selectedWords.current
                        .filter((value: any) => value.direction === "vertical")
                        .map((h: any) => (
                          <Hint key={h.position + "_down"} num={h.position}>
                            {h.clue}
                          </Hint>
                        ))}
                    </HintSection>
                  </>
                ) : (
                  <HintSection heading="Board MVPs">
                    {sortedLeaderboard.map(([user, score], index) => (
                      <Hint key={user + "_score"} num={index + 1}>
                        {user} - {score}
                      </Hint>
                    ))}
                  </HintSection>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          className="game-container"
          style={{
            backgroundColor: "#18181b",
            boxShadow: "0 0 15px #9147ff4d",
            width: "100%",
          }}
        >
          <div style={{ display: "grid" }}>
            <span className="hints-heading" style={{ display: "grid" }}>
              Crossword Widget Information{" "}
              <span className="hint-text" style={{ fontSize: "8px", color: "#e5e7eb3b" }}>
                (This is only visible in editor)
              </span>
            </span>

            <span className="hint-text">
              For performance reasons, crossword generation is disabled in the editor by default.
              <br />
              To test the widget in the editor, enable the <b>"enable_in_editor"</b> variable in the widget settings.
            </span>
            <span className="hint-text" style={{ marginTop: "10px" }}>
              The crossword layout is <b>not networked</b>, meaning each instance of the widget generates
              <br />a unique puzzle. The version shown in the editor will differ from the one seen on stream.
            </span>
            <span className="hint-text" style={{ marginTop: "10px" }}>
              Scaling the widget can be challenging due to the random puzzle sizes.
              <br />
              The default widget size is the recommended size to make sure the puzzle always fits on screen heightwise.
              <br />
              If you want to make the widget bigger, hold down <b>shift</b> to keep the aspect ration!
            </span>
            <span className="hint-text" style={{ marginTop: "30px" }}>
              To generate a new puzzle, right-click the widget and select <b>Toggles ➔ Generate</b>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
