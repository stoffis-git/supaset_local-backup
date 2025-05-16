import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, Workout } from '../types';
import { loadState, saveState } from '../utils/localStorage';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

type AppAction =
  | { type: 'SET_WORKOUT'; payload: Workout }
  | { type: 'CLEAR_WORKOUT'; payload: string }
  | { type: 'TOGGLE_EXERCISE_ACTIVE'; payload: string };

const initialState: AppState = (() => {
  const loaded = loadState();
  if (!loaded.activeExercises || loaded.activeExercises.length === 0) {
    // Initialize to all exercise IDs in the library
    return {
      ...loaded,
      activeExercises: loaded.exerciseLibrary.map(ex => ex.exercise_id),
    };
  }
  return loaded;
})();

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_WORKOUT':
      const updatedWorkouts = {
        ...state.workouts,
        [action.payload.id]: action.payload,
      };
      const newState = {
        ...state,
        workouts: updatedWorkouts,
      };
      saveState(newState);
      return newState;

    case 'CLEAR_WORKOUT':
      const { [action.payload]: removed, ...remainingWorkouts } = state.workouts;
      const clearedState = {
        ...state,
        workouts: remainingWorkouts,
      };
      saveState(clearedState);
      return clearedState;

    case 'TOGGLE_EXERCISE_ACTIVE':
      const currentActiveExercises = state.activeExercises || [];
      let updatedActiveExercises;
      if (currentActiveExercises.includes(action.payload)) {
        updatedActiveExercises = currentActiveExercises.filter(id => id !== action.payload);
      } else {
        updatedActiveExercises = [...currentActiveExercises, action.payload];
      }
      const updatedState = {
        ...state,
        activeExercises: updatedActiveExercises,
      };
      saveState(updatedState);
      return updatedState;

    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
} 