import { Middleware } from 'redux';
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { saveHighScore } from '../slices/historySlice';

// Create the listener middleware
export const historyListenerMiddleware = createListenerMiddleware();

// Add a listener that logs when new records are achieved
historyListenerMiddleware.startListening({
  matcher: isAnyOf(saveHighScore.fulfilled),
  effect: (action, listenerApi) => {
    if (action.payload && action.payload.isNewRecord) {
      console.log('NEW RECORD ACHIEVEMENT:', {
        username: action.payload.username,
        score: action.payload.score,
        timestamp: action.payload.playedAt,
      });

      // You could trigger other effects here, like playing sounds or showing animations
      // These would need to be implemented by your app
    }
  },
});

// Optional logging middleware
export const loggingMiddleware: Middleware = store => next => action => {
  console.group(`ACTION: ${action.type}`);
  console.log('Payload:', action.payload);
  console.log('Previous State:', store.getState());
  const result = next(action);
  console.log('New State:', store.getState());
  console.groupEnd();
  return result;
};
