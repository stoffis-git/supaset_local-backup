import { AppState, Workout, WorkoutHistory } from '../types';
import { exerciseLibrary } from '../data/exerciseLibraryTest';

const STORAGE_KEY = 'supaset-data';

const defaultState: AppState = {
  workouts: {},
  exerciseLibrary,
  userSettings: {
    restTimer: 90,
    darkMode: true,
  },
};

export const loadState = (): AppState => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (!serializedState) return defaultState;
    
    const parsedState = JSON.parse(serializedState);
    return { ...defaultState, ...parsedState };
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return defaultState;
  }
};

export const saveState = (state: AppState): void => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
};

export const saveWorkout = (workout: Workout): void => {
  try {
    const state = loadState();
    const updatedWorkouts: WorkoutHistory = {
      ...state.workouts,
      [workout.id]: workout,
    };
    
    saveState({
      ...state,
      workouts: updatedWorkouts,
    });
  } catch (err) {
    console.error('Error saving workout:', err);
  }
};

export const getWorkoutHistory = (): WorkoutHistory => {
  const state = loadState();
  return state.workouts;
};

export const getSortedWorkoutHistory = (): Workout[] => {
  const workouts = Object.values(getWorkoutHistory());
  return workouts.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};