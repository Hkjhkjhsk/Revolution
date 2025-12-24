
export enum GameStatus {
  START_SCREEN = 'START_SCREEN',
  LOADING = 'LOADING',
  IN_GAME = 'IN_GAME',
  GAME_OVER = 'GAME_OVER'
}

export interface GameScene {
  description: string;
  agentPrompt: string;
  imageUrl?: string;
  situationContext: string; // الذاكرة الداخلية للذكاء الاصطناعي
}

export interface GameState {
  status: GameStatus;
  currentScene: GameScene | null;
  history: string[];
  power: number; // القوة العسكرية (0-100)
  morale: number; // المعنويات (0-100)
}
