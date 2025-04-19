import { HighScoreData } from './../../type/history';
import { ThunkAction } from 'redux-thunk';
import { Action } from 'redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store';
import { HistoryItem } from '../../type/history';

// Action Types
export const FETCH_HISTORY_REQUEST = 'FETCH_HISTORY_REQUEST';
export const FETCH_HISTORY_SUCCESS = 'FETCH_HISTORY_SUCCESS';
export const FETCH_HISTORY_FAILURE = 'FETCH_HISTORY_FAILURE';
export const ADD_HISTORY_ITEM = 'ADD_HISTORY_ITEM';

// Action Interfaces
interface FetchHistoryRequestAction {
  type: typeof FETCH_HISTORY_REQUEST;
}

interface FetchHistorySuccessAction {
  type: typeof FETCH_HISTORY_SUCCESS;
  payload: HistoryItem[];
}

interface FetchHistoryFailureAction {
  type: typeof FETCH_HISTORY_FAILURE;
  payload: string;
}

interface AddHistoryItemAction {
  type: typeof ADD_HISTORY_ITEM;
  payload: HistoryItem;
}

export type HistoryActionTypes =
  | FetchHistoryRequestAction
  | FetchHistorySuccessAction
  | FetchHistoryFailureAction
  | AddHistoryItemAction;

// Action Creators
export const fetchHistoryRequest = (): FetchHistoryRequestAction => ({
  type: FETCH_HISTORY_REQUEST,
});

export const fetchHistorySuccess = (historyItems: HistoryItem[]): FetchHistorySuccessAction => ({
  type: FETCH_HISTORY_SUCCESS,
  payload: historyItems,
});

export const fetchHistoryFailure = (error: string): FetchHistoryFailureAction => ({
  type: FETCH_HISTORY_FAILURE,
  payload: error,
});

export const addHistoryItem = (historyItem: HistoryItem): AddHistoryItemAction => ({
  type: ADD_HISTORY_ITEM,
  payload: historyItem,
});

// Thunk actions
export const fetchHistory = (): ThunkAction<void, RootState, unknown, Action<string>> => {
  return async dispatch => {
    dispatch(fetchHistoryRequest());

    try {
      // Fetch history from AsyncStorage
      const historyData = await AsyncStorage.getItem('goldMiningHistory');
      const parsedData: HistoryItem[] = historyData ? JSON.parse(historyData) : [];

      dispatch(fetchHistorySuccess(parsedData));
    } catch (error) {
      dispatch(fetchHistoryFailure(error instanceof Error ? error.message : 'Unknown error'));
    }
  };
};

export const saveHighScore = (
  data: HighScoreData
): ThunkAction<Promise<boolean>, RootState, unknown, Action<string>> => {
  return async (dispatch, getState) => {
    try {
      const { history } = getState();

      // Get highest score in history
      const highestScore =
        history.historyItems.length > 0
          ? Math.max(...history.historyItems.map(item => item.score))
          : 0;

      // Check if this is a new record
      if (data.score > highestScore || history.historyItems.length === 0) {
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          username: data.username,
          score: data.score,
          description: data.description,
          playedAt: new Date().toISOString(),
          isNewRecord: true,
        };

        // Get existing history
        const updatedHistory = [...history.historyItems, newHistoryItem];

        // Sort by score (highest first)
        updatedHistory.sort((a, b) => b.score - a.score);

        // Save to AsyncStorage
        await AsyncStorage.setItem('goldMiningHistory', JSON.stringify(updatedHistory));

        // Update Redux store
        dispatch(addHistoryItem(newHistoryItem));

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error saving high score:', error);
      return false;
    }
  };
};

// Check if the current score is a new record
export const checkNewRecord = (
  score: number
): ThunkAction<Promise<boolean>, RootState, unknown, Action<string>> => {
  return async (dispatch, getState) => {
    try {
      const { history } = getState();

      // Get highest score in history
      const highestScore =
        history.historyItems.length > 0
          ? Math.max(...history.historyItems.map(item => item.score))
          : 0;

      // Return true if this is a new record
      return score > highestScore || history.historyItems.length === 0;
    } catch (error) {
      console.error('Error checking record:', error);
      return false;
    }
  };
};
