import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/store';
import { checkNewRecord } from '../../redux/slices/historySlice';
import HighScoreModal from '../ModalHighScore';


interface GameResultHandlerProps {
  score: number | null; // null when no game is finished
  onHandled: () => void; // Called when result handling is complete
}

const GameResultHandler: React.FC<GameResultHandlerProps> = ({ score, onHandled }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [showHighScoreModal, setShowHighScoreModal] = useState(false);
  
  useEffect(() => {
    // Check if we have a new score to handle
    const handleGameResult = async () => {
      if (score !== null) {
        // Check if this is a new record
        const resultAction = await dispatch(checkNewRecord(score));
        const isNewRecord = checkNewRecord.fulfilled.match(resultAction) && resultAction.payload;
        
        if (isNewRecord) {
          // Show the high score modal
          setShowHighScoreModal(true);
        } else {
          // No new record, just complete the handling
          onHandled();
        }
      }
    };
    
    handleGameResult();
  }, [score, dispatch, onHandled]);
  
  // Close the modal and signal that handling is complete
  const handleModalClose = () => {
    setShowHighScoreModal(false);
    onHandled();
  };
  
  return (
    <>
      {score !== null && (
        <HighScoreModal
          visible={showHighScoreModal}
          score={score}
          onClose={handleModalClose}
        />
      )}
    </>
  );
};

export default GameResultHandler;