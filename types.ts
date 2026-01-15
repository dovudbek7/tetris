
export type Shape = (number | string)[][];

export interface Tetrimino {
  pos: { x: number; y: number };
  shape: Shape;
  color: string;
}

export interface GameTheme {
  name: string;
  background: string;
  sidebarBg: string;
  pieceColors: {
    I: string;
    J: string;
    L: string;
    O: string;
    S: string;
    T: string;
    Z: string;
  };
  accent: string;
}

export interface AIQuote {
  text: string;
  author: string;
}

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LOADING = 'LOADING'
}
