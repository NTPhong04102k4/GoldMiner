import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HighScoreData, HistoryItem, HistoryState } from '../../type/history';

// Initial state
const initialState: HistoryState = {
  historyItems: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchHistory = createAsyncThunk(
  'history/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const historyData = await AsyncStorage.getItem('goldMiningHistory');
      return historyData ? (JSON.parse(historyData) as HistoryItem[]) : [];
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const saveHighScore = createAsyncThunk(
  'history/saveHighScore',
  async (data: HighScoreData, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { history: HistoryState };

      // Get highest score in history
      const highestScore =
        state.history.historyItems.length > 0
          ? Math.max(...state.history.historyItems.map(item => item.score))
          : 0;

      // Check if this is a new record
      if (data.score > highestScore || state.history.historyItems.length === 0) {
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          username: data.username,
          score: data.score,
          description: data.description,
          playedAt: new Date().toISOString(),
          isNewRecord: true,
        };

        // Get existing history
        const updatedHistory = [...state.history.historyItems, newHistoryItem];

        // Sort by score (highest first)
        updatedHistory.sort((a, b) => b.score - a.score);

        // Save to AsyncStorage
        await AsyncStorage.setItem('goldMiningHistory', JSON.stringify(updatedHistory));

        return newHistoryItem;
      }

      return null;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const checkNewRecord = createAsyncThunk(
  'history/checkNewRecord',
  async (score: number, { getState }) => {
    const state = getState() as { history: HistoryState };

    // Get highest score in history
    const highestScore =
      state.history.historyItems.length > 0
        ? Math.max(...state.history.historyItems.map(item => item.score))
        : 0;

    // Return true if this is a new record
    return score > highestScore || state.history.historyItems.length === 0;
  }
);

// Create the history slice
const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    // You can add additional synchronous reducers here if needed
  },
  extraReducers: builder => {
    builder
      // Handle fetchHistory
      .addCase(fetchHistory.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action: PayloadAction<HistoryItem[]>) => {
        state.loading = false;
        state.historyItems = action.payload;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Handle saveHighScore
      .addCase(saveHighScore.fulfilled, (state, action) => {
        if (action.payload) {
          state.historyItems.push(action.payload);
          // Sort by score (highest first)
          state.historyItems.sort((a, b) => b.score - a.score);
        }
      });
  },
});

export default historySlice.reducer;
