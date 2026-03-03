"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import wordData from "@/data/words.json";

const WORDS_BY_LENGTH: Record<number, string[]> = {
  5: wordData["5_letter"],
  6: wordData["6_letter"],
  7: wordData["7_letter"],
  8: wordData["8_letter"],
  9: wordData["9_letter"],
  10: wordData["10_letter"],
};

function pickRandom(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)];
}

const MAX_GUESSES = 6;

const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "⌫"],
];

type LetterStatus = "correct" | "present" | "absent" | "empty" | "tbd";

interface TileData {
  letter: string;
  status: LetterStatus;
}

interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: Record<number, number>;
}

const STATS_KEY = "catholic-wordle-stats";

function loadStats(): Stats {
  if (typeof window === "undefined") return defaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultStats();
}

function defaultStats(): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  };
}

function saveStats(stats: Stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(answer.length).fill("absent");
  const answerArr = answer.split("");
  const guessArr = guess.split("");
  const used = Array(answer.length).fill(false);

  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }

  for (let i = 0; i < guessArr.length; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < answerArr.length; j++) {
      if (!used[j] && guessArr[i] === answerArr[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

const STATUS_COLORS = {
  correct: "bg-success text-success-content border-success",
  present: "bg-warning text-warning-content border-warning",
  absent: "bg-[#3a3a3c] text-white border-[#3a3a3c]",
};

function getTileClass(status: LetterStatus): string {
  switch (status) {
    case "correct":
      return STATUS_COLORS.correct;
    case "present":
      return STATUS_COLORS.present;
    case "absent":
      return STATUS_COLORS.absent;
    case "tbd":
      return "border-base-content/40 bg-base-100 text-base-content";
    case "empty":
      return "border-base-content/20 bg-base-100";
  }
}

function getKeyColor(status: LetterStatus | undefined): string {
  switch (status) {
    case "correct":
      return STATUS_COLORS.correct;
    case "present":
      return STATUS_COLORS.present;
    case "absent":
      return "bg-[#3a3a3c]/60 text-white/50 border-transparent";
    default:
      return "bg-base-300 text-base-content";
  }
}

export default function WordleGame() {
  const [wordLength, setWordLength] = useState(5);
  const [answer, setAnswer] = useState(() => pickRandom(WORDS_BY_LENGTH[5]));
  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [winRow, setWinRow] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [showStats, setShowStats] = useState(false);
  const statsRecorded = useRef(false);

  // Load stats on mount
  useEffect(() => {
    setStats(loadStats());
  }, []);

  const keyStatuses = useCallback((): Record<string, LetterStatus> => {
    const statuses: Record<string, LetterStatus> = {};
    for (const guess of guesses) {
      for (const tile of guess) {
        const prev = statuses[tile.letter];
        if (tile.status === "correct") {
          statuses[tile.letter] = "correct";
        } else if (tile.status === "present" && prev !== "correct") {
          statuses[tile.letter] = "present";
        } else if (tile.status === "absent" && !prev) {
          statuses[tile.letter] = "absent";
        }
      }
    }
    return statuses;
  }, [guesses]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const recordResult = useCallback(
    (won: boolean, guessCount: number) => {
      if (statsRecorded.current) return;
      statsRecorded.current = true;

      setStats((prev) => {
        const updated: Stats = {
          played: prev.played + 1,
          wins: won ? prev.wins + 1 : prev.wins,
          currentStreak: won ? prev.currentStreak + 1 : 0,
          maxStreak: won
            ? Math.max(prev.maxStreak, prev.currentStreak + 1)
            : prev.maxStreak,
          guessDistribution: { ...prev.guessDistribution },
        };
        if (won) {
          updated.guessDistribution[guessCount] =
            (updated.guessDistribution[guessCount] || 0) + 1;
        }
        saveStats(updated);
        return updated;
      });
    },
    []
  );

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== wordLength) {
      setShake(true);
      showToast("Not enough letters");
      setTimeout(() => setShake(false), 500);
      return;
    }

    const evaluation = evaluateGuess(currentGuess, answer);
    const tiles: TileData[] = currentGuess.split("").map((letter, i) => ({
      letter,
      status: evaluation[i],
    }));

    const newGuesses = [...guesses, tiles];
    setGuesses(newGuesses);
    setCurrentGuess("");

    if (currentGuess === answer) {
      setWinRow(newGuesses.length - 1);
      setGameState("won");
      recordResult(true, newGuesses.length);
      setTimeout(() => setShowStats(true), 1600);
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameState("lost");
      showToast(answer.toUpperCase());
      recordResult(false, newGuesses.length);
      setTimeout(() => setShowStats(true), 2000);
    }
  }, [currentGuess, wordLength, answer, guesses, recordResult]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameState !== "playing") return;

      if (key === "enter") {
        submitGuess();
      } else if (key === "⌫" || key === "backspace") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[a-z]$/.test(key) && currentGuess.length < wordLength) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [gameState, submitGuess, currentGuess.length, wordLength]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "enter" || key === "backspace" || /^[a-z]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const reset = (newLength?: number) => {
    const len = newLength ?? wordLength;
    if (newLength !== undefined) setWordLength(newLength);
    setAnswer(pickRandom(WORDS_BY_LENGTH[len]));
    setGuesses([]);
    setCurrentGuess("");
    setGameState("playing");
    setToast(null);
    setWinRow(null);
    setShowStats(false);
    statsRecorded.current = false;
  };

  // Build grid rows
  const rows: TileData[][] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) {
      rows.push(guesses[i]);
    } else if (i === guesses.length && gameState === "playing") {
      const tiles: TileData[] = [];
      for (let j = 0; j < wordLength; j++) {
        tiles.push({
          letter: currentGuess[j] || "",
          status: currentGuess[j] ? "tbd" : "empty",
        });
      }
      rows.push(tiles);
    } else {
      rows.push(
        Array(wordLength)
          .fill(null)
          .map(() => ({ letter: "", status: "empty" as LetterStatus }))
      );
    }
  }

  const kStatuses = keyStatuses();
  const maxDistribution = Math.max(1, ...Object.values(stats.guessDistribution));
  const winPct = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-base-100">
      {/* Win row bounce animation */}
      <style>{`
        @keyframes bounce-tile {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-20px); }
          60% { transform: translateY(-10px); }
        }
        .win-bounce {
          animation: bounce-tile 0.6s ease;
        }
      `}</style>

      {/* Header */}
      <div className="relative flex items-center justify-center pt-4 pb-2 px-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Image src="/icon-192.png" alt="Catholic Wordle" width={32} height={32} className="rounded-md" />
          Catholic Wordle
        </h1>
        <div className="absolute right-4 flex gap-1">
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setShowStats(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => (document.getElementById("settings_modal") as HTMLDialogElement)?.showModal()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <dialog id="settings_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Settings</h3>
          <div>
            <label className="text-sm font-semibold opacity-70 mb-3 block">Word Length: {wordLength} letters</label>
            <div className="w-full max-w-xs">
              <input
                type="range"
                min={5}
                max={10}
                value={wordLength}
                className="range range-success"
                step={1}
                onChange={(e) => reset(Number(e.target.value))}
              />
              <div className="flex justify-between px-2.5 mt-2 text-xs">
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
              </div>
              <div className="flex justify-between px-2.5 mt-2 text-xs">
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>10</span>
              </div>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Stats Modal */}
      <dialog id="stats_modal" className="modal" open={showStats}>
        {showStats && (
          <>
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4 text-center">Statistics</h3>

              {/* Stat numbers */}
              <div className="flex justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.played}</div>
                  <div className="text-xs opacity-60">Played</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{winPct}</div>
                  <div className="text-xs opacity-60">Win %</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.currentStreak}</div>
                  <div className="text-xs opacity-60">Current Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.maxStreak}</div>
                  <div className="text-xs opacity-60">Max Streak</div>
                </div>
              </div>

              {/* Guess distribution */}
              <h4 className="font-semibold text-sm mb-3 text-center">Guess Distribution</h4>
              <div className="flex flex-col gap-1.5 mb-6">
                {[1, 2, 3, 4, 5, 6].map((guess) => {
                  const count = stats.guessDistribution[guess] || 0;
                  const width = Math.max(8, (count / maxDistribution) * 100);
                  const isLastGuess = gameState === "won" && guesses.length === guess;
                  return (
                    <div key={guess} className="flex items-center gap-2">
                      <span className="text-sm font-bold w-3 text-right">{guess}</span>
                      <div
                        className={`h-6 rounded-sm flex items-center justify-end px-2 text-xs font-bold text-white transition-all ${
                          isLastGuess ? "bg-success" : "bg-[#3a3a3c]"
                        }`}
                        style={{ width: `${width}%` }}
                      >
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Play again */}
              {gameState !== "playing" && (
                <div className="flex justify-center mb-4">
                  <button className="btn btn-primary btn-wide" onClick={() => reset()}>
                    Play Again
                  </button>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => {
                    const fresh = defaultStats();
                    saveStats(fresh);
                    setStats(fresh);
                  }}
                >
                  Reset Stats
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={() => setShowStats(false)}>
              <button>close</button>
            </form>
          </>
        )}
      </dialog>

      {/* Grid area - centered */}
      <div className="flex-1 flex flex-col items-center justify-start pt-2">
        <div
          className="flex flex-col gap-[5px]"
          style={shake ? { animation: "shake 0.5s" } : undefined}
        >
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-[5px] justify-center">
              {row.map((tile, colIdx) => (
                <div
                  key={colIdx}
                  className={`flex items-center justify-center font-bold uppercase border-2 rounded-lg transition-all duration-300 ${getTileClass(tile.status)} ${
                    winRow === rowIdx ? "win-bounce" : ""
                  }`}
                  style={{
                    width: `${Math.max(32, 62 - (wordLength - 5) * 6)}px`,
                    height: `${Math.max(32, 62 - (wordLength - 5) * 6)}px`,
                    fontSize: `${Math.max(14, 28 - (wordLength - 5) * 3)}px`,
                    animationDelay: winRow === rowIdx ? `${colIdx * 100}ms` : undefined,
                    animationFillMode: winRow === rowIdx ? "both" : undefined,
                  }}
                >
                  {tile.letter}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div className="mt-4">
            <div className="bg-base-content text-base-100 px-4 py-2 rounded-lg font-bold text-sm">
              {toast}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard - pinned to bottom */}
      <div className="flex flex-col gap-[6px] w-full max-w-[500px] mx-auto px-2 pb-4 pt-2 shrink-0">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-[6px]">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className={`${
                  key === "enter" || key === "⌫"
                    ? "px-3 text-[11px] sm:text-xs min-w-[52px] sm:min-w-[65px]"
                    : "flex-1 max-w-[43px]"
                } h-[58px] rounded font-bold uppercase text-[14px] select-none active:scale-95 transition-all ${getKeyColor(
                  kStatuses[key]
                )}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
