
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameTheme, AIQuote, Tetrimino } from './types';
import { COLS, ROWS, TETROMINOS, DEFAULT_THEME } from './constants';
import { fetchAITetrisConfig } from './services/geminiService';

// Initial board
const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [board, setBoard] = useState<(string | null)[][]>(createEmptyBoard());
  const [activePiece, setActivePiece] = useState<Tetrimino | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetrimino | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [theme, setTheme] = useState<GameTheme>(DEFAULT_THEME);
  const [quote, setQuote] = useState<AIQuote | null>(null);

  const dropTimeRef = useRef<number | null>(null);

  const getRandomPiece = useCallback((themeColors: any): Tetrimino => {
    const keys = Object.keys(TETROMINOS);
    const type = keys[Math.floor(Math.random() * keys.length)];
    const data = TETROMINOS[type];
    return {
      pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
      shape: data.shape,
      color: themeColors[type],
    };
  }, []);

  const initGame = async () => {
    setGameState(GameState.LOADING);
    const config = await fetchAITetrisConfig();
    setTheme(config.theme);
    setQuote(config.quote);
    
    setBoard(createEmptyBoard());
    setScore(0);
    setLevel(1);
    
    const first = getRandomPiece(config.theme.pieceColors);
    const second = getRandomPiece(config.theme.pieceColors);
    setActivePiece(first);
    setNextPiece(second);
    setGameState(GameState.PLAYING);
  };

  const isCollision = (piece: Tetrimino, newPos = piece.pos, newShape = piece.shape) => {
    for (let y = 0; y < newShape.length; y++) {
      for (let x = 0; x < newShape[y].length; x++) {
        if (newShape[y][x] !== 0) {
          const boardX = newPos.x + x;
          const boardY = newPos.y + y;
          if (
            boardX < 0 || 
            boardX >= COLS || 
            boardY >= ROWS ||
            (boardY >= 0 && board[boardY][boardX])
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotate = (shape: number[][]) => {
    const rotated = shape[0].map((_, index) => shape.map(col => col[index]).reverse());
    return rotated;
  };

  const clearLines = (currentBoard: (string | null)[][]) => {
    let linesCleared = 0;
    const newBoard = currentBoard.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(null));
    }

    if (linesCleared > 0) {
      const linePoints = [0, 100, 300, 500, 800];
      setScore(prev => prev + linePoints[linesCleared] * level);
      if (score > 0 && score % 1000 === 0) setLevel(prev => prev + 1);
    }
    return newBoard;
  };

  const lockPiece = useCallback(() => {
    if (!activePiece) return;
    
    setBoard(prev => {
      const newBoard = prev.map(row => [...row]);
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const boardY = activePiece.pos.y + y;
            const boardX = activePiece.pos.x + x;
            if (boardY >= 0) newBoard[boardY][boardX] = activePiece.color;
          }
        });
      });
      return clearLines(newBoard);
    });

    const next = nextPiece || getRandomPiece(theme.pieceColors);
    const futureNext = getRandomPiece(theme.pieceColors);
    
    if (isCollision(next)) {
      setGameState(GameState.GAME_OVER);
    } else {
      setActivePiece(next);
      setNextPiece(futureNext);
    }
  }, [activePiece, nextPiece, theme.pieceColors]);

  const movePiece = (dir: { x: number; y: number }) => {
    if (!activePiece || gameState !== GameState.PLAYING) return;
    const newPos = { x: activePiece.pos.x + dir.x, y: activePiece.pos.y + dir.y };
    if (!isCollision(activePiece, newPos)) {
      setActivePiece({ ...activePiece, pos: newPos });
      return true;
    }
    if (dir.y > 0) {
      lockPiece();
    }
    return false;
  };

  const dropPiece = () => {
    movePiece({ x: 0, y: 1 });
  };

  const hardDrop = () => {
    if (!activePiece || gameState !== GameState.PLAYING) return;
    let newY = activePiece.pos.y;
    while (!isCollision(activePiece, { x: activePiece.pos.x, y: newY + 1 })) {
      newY++;
    }
    setActivePiece({ ...activePiece, pos: { ...activePiece.pos, y: newY } });
    lockPiece();
  };

  const handleRotate = () => {
    if (!activePiece || gameState !== GameState.PLAYING) return;
    const rotatedShape = rotate(activePiece.shape as number[][]);
    if (!isCollision(activePiece, activePiece.pos, rotatedShape)) {
      setActivePiece({ ...activePiece, shape: rotatedShape });
    }
  };

  // Ghost Position Calculation
  const getGhostPos = () => {
    if (!activePiece) return null;
    let ghostY = activePiece.pos.y;
    while (!isCollision(activePiece, { x: activePiece.pos.x, y: ghostY + 1 })) {
      ghostY++;
    }
    return { ...activePiece.pos, y: ghostY };
  };

  // Game Loop
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      const speed = Math.max(100, 1000 - (level - 1) * 100);
      const interval = setInterval(dropPiece, speed);
      return () => clearInterval(interval);
    }
  }, [gameState, level, activePiece]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      switch (e.key) {
        case 'ArrowLeft': movePiece({ x: -1, y: 0 }); break;
        case 'ArrowRight': movePiece({ x: 1, y: 0 }); break;
        case 'ArrowDown': movePiece({ x: 0, y: 1 }); break;
        case 'ArrowUp': handleRotate(); break;
        case ' ': hardDrop(); break;
        case 'p': setGameState(prev => prev === GameState.PLAYING ? GameState.PAUSED : GameState.PLAYING); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activePiece, board]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  // Render logic
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    // Render Ghost
    const ghostPos = getGhostPos();
    if (activePiece && ghostPos) {
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const gy = ghostPos.y + y;
            const gx = ghostPos.x + x;
            if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
              if (!displayBoard[gy][gx]) displayBoard[gy][gx] = 'GHOST';
            }
          }
        });
      });
    }

    // Render Active Piece
    if (activePiece) {
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const by = activePiece.pos.y + y;
            const bx = activePiece.pos.x + x;
            if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
              displayBoard[by][bx] = activePiece.color;
            }
          }
        });
      });
    }

    return displayBoard.map((row, y) => (
      row.map((cell, x) => {
        const isGhost = cell === 'GHOST';
        const color = isGhost ? activePiece?.color : cell;
        return (
          <div 
            key={`${y}-${x}`} 
            className={`w-full h-full rounded-sm transition-colors duration-100 ${isGhost ? 'ghost-piece' : cell ? 'tetromino-glow border border-white/10' : ''}`}
            style={{ backgroundColor: cell ? (isGhost ? 'transparent' : color!) : 'transparent' }}
          />
        );
      })
    ));
  };

  return (
    <div className={`min-h-screen ${theme.background} flex items-center justify-center p-4 transition-all duration-1000`}>
      <div className="flex flex-col md:flex-row gap-8 max-w-4xl w-full">
        
        {/* Sidebar Left: Stats */}
        <div className={`hidden md:flex flex-col gap-4 w-48 p-6 rounded-3xl ${theme.sidebarBg} border border-white/10 shadow-2xl backdrop-blur-md`}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-1">High Score</p>
            <p className={`text-2xl font-black ${theme.accent} font-mono tabular-nums`}>{highScore}</p>
          </div>
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-1">Level</p>
            <p className="text-2xl font-black text-white font-mono tabular-nums">{level}</p>
          </div>
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-1">Score</p>
            <p className="text-2xl font-black text-white font-mono tabular-nums">{score}</p>
          </div>
        </div>

        {/* Main Board Container */}
        <div className="relative group">
          <div className="game-grid w-[300px] h-[600px] md:w-[320px] md:h-[640px] relative z-10 p-1">
            {renderBoard()}
          </div>
          
          {/* Overlays */}
          {gameState === GameState.START && (
            <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center text-center p-8 rounded-lg backdrop-blur-sm border border-white/5">
              <h1 className={`text-4xl font-black mb-6 tracking-tighter ${theme.accent}`}>AI TETRIS</h1>
              <div className="flex flex-col gap-4 w-full">
                <div className="text-left text-[10px] opacity-60 mb-4 bg-white/5 p-4 rounded-xl">
                  <p><span className="text-white font-bold">← →</span> MOVE</p>
                  <p><span className="text-white font-bold">↑</span> ROTATE</p>
                  <p><span className="text-white font-bold">↓</span> SOFT DROP</p>
                  <p><span className="text-white font-bold">SPACE</span> HARD DROP</p>
                </div>
                <button 
                  onClick={initGame}
                  className={`py-4 px-8 rounded-2xl font-bold bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl`}
                >
                  INITIALIZE GAME
                </button>
              </div>
            </div>
          )}

          {gameState === GameState.LOADING && (
            <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-center rounded-lg backdrop-blur-lg">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-mono tracking-widest animate-pulse">GENERATING THEME...</p>
            </div>
          )}

          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-center p-8 rounded-lg backdrop-blur-xl border border-red-500/20">
              <h2 className="text-4xl font-black text-red-500 mb-2">SYSTEM FAILURE</h2>
              <p className="text-xs mb-8 opacity-50">Score: {score}</p>
              
              {quote && (
                <div className="bg-white/5 p-6 rounded-2xl mb-8 border border-white/10 max-w-xs">
                  <p className="text-xs italic leading-relaxed text-blue-200">"{quote.text}"</p>
                  <p className="text-[10px] mt-4 opacity-30 font-mono">— {quote.author}</p>
                </div>
              )}

              <button 
                onClick={initGame}
                className="py-4 px-12 rounded-2xl font-bold bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                REBOOT SYSTEM
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Right: Next Piece & Info */}
        <div className={`flex flex-col gap-6 w-full md:w-48 p-6 rounded-3xl ${theme.sidebarBg} border border-white/10 shadow-2xl backdrop-blur-md`}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-4">Next Piece</p>
            <div className="bg-black/40 rounded-2xl h-32 flex items-center justify-center border border-white/5">
              {nextPiece && (
                <div 
                  className="grid gap-1"
                  style={{ 
                    gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 1fr)`,
                    width: nextPiece.shape[0].length * 20
                  }}
                >
                  {nextPiece.shape.map((row, y) => row.map((cell, x) => (
                    <div 
                      key={`${y}-${x}`} 
                      className={`w-4 h-4 rounded-sm ${cell ? 'border border-white/20' : 'opacity-0'}`} 
                      style={{ backgroundColor: cell ? nextPiece.color : 'transparent' }} 
                    />
                  )))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto hidden md:block">
             <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] opacity-40 uppercase tracking-widest mb-2 italic">Active Theme</p>
                <p className={`text-sm font-bold ${theme.accent}`}>{theme.name}</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
