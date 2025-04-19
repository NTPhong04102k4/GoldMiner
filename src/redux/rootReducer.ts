import { combineReducers } from '@reduxjs/toolkit';
import historyReducer from './slices/historySlice';
const rootReducer = combineReducers({
  history: historyReducer,
  // Add other reducers here if needed
});

export default rootReducer;
