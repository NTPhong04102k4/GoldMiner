import React from 'react';
import { GameStatus } from '../../../component/engine/type';
import { LevelCompleteOverlay } from "./CompleteLevel";
import { GameOverOverlay } from "./GameOverlay";
import { StartScreenOverlay } from "./StartGame";

interface GameStatusRendererProps {
  gameStatus: GameStatus;
  score: number;
  targetScore: number;
  onStart: () => void;
  onNextLevel: () => void;
  onRestart: () => void;
}

export const GameStatusRenderer: React.FC<GameStatusRendererProps> = ({ 
  gameStatus, 
  score, 
  targetScore, 
  onStart, 
  onNextLevel, 
  onRestart 
}) => {
  switch (gameStatus) {
    case 'ready':
      return <StartScreenOverlay onStart={onStart} />;
    case 'levelCompleted':
      return (
        <LevelCompleteOverlay
          score={score}
          targetScore={targetScore}
          onNext={onNextLevel}
        />
      );
    case 'gameOver':
      return (
        <GameOverOverlay
          score={score}
          targetScore={targetScore}
          onRestart={onRestart}
        />
      );
    default:
      return null;
  }
};