export type WorkoutType = 'fullBody' | 'upperBody' | 'lowerBody' | 'push' | 'pull';

export type MovementType = 'compound' | 'isolation' | 'hybrid';

export type Category = 'upper_body_push' | 'upper_body_pull' | 'knee_dominant' | 'hip_dominant' | 'full_body';

export type Equipment = 
  | 'barbell' 
  | 'dumbbell' 
  | 'machine' 
  | 'bodyweight' 
  | 'cable'
  | 'kettlebell'
  | 'bench'
  | 'rack'
  | 'trap_bar'
  | 'landmine'
  | 'battle_rope'
  | 'sled'
  | 'ghr_bench'
  | 'bars';

export type Exercise = {
  exercise_id: string;
  name: string;
  movement_type: string;
  categories: string[];
  tags: string[];
  equipment: string[];
};

export type Set = {
  weight: number;
  reps: number;
  completed: boolean;
};

export type ExerciseWithSets = {
  exercise: Exercise;
  sets: Set[];
  previousPerformance?: {
    date: string;
    sets: Set[];
  };
};

export type Workout = {
  id: string;
  date: string;
  type: WorkoutType;
  exercises: ExerciseWithSets[];
  completed: boolean;
  duration?: number;
  notes?: string;
};

export type WorkoutHistory = {
  [id: string]: Workout;
};

export type AppAction =
  | { type: 'SET_WORKOUT'; payload: Workout }
  | { type: 'CLEAR_WORKOUT'; payload: string }
  | { type: 'TOGGLE_EXERCISE_ACTIVE'; payload: string };

export type AppState = {
  workouts: WorkoutHistory;
  exerciseLibrary: Exercise[];
  userSettings: {
    name?: string;
    restTimer: number;
    darkMode: boolean;
  };
  activeExercises?: string[];
};