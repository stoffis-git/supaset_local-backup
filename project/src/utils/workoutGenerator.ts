import { Exercise, Workout, ExerciseWithSets, WorkoutHistory } from '../types';
import { exerciseLibrary as exercises } from '../data/exerciseLibraryTest';

// Function to get a random item from an array
const getRandomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

// Get exercises not recently used in past workouts
const getNotRecentlyUsedExercises = (
  eligibleExercises: Exercise[],
  workoutHistory: WorkoutHistory,
  limit: number = 5,
): Exercise[] => {
  // Track exercise usage with recency score (lower is better - not recently used)
  const exerciseRecency: Record<string, number> = {};
  
  // Build recency scores for exercises
  const completedWorkouts = Object.values(workoutHistory).filter(w => w.completed);
  completedWorkouts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((workout, workoutIndex) => {
      workout.exercises.forEach(({ exercise }) => {
        if (!exerciseRecency[exercise.exercise_id]) {
          exerciseRecency[exercise.exercise_id] = 0;
        }
        // Recency score is higher for more recent workouts
        exerciseRecency[exercise.exercise_id] += 10 - workoutIndex;
      });
    });
  
  // Sort by recency (prefer exercises not recently used)
  return [...eligibleExercises]
    .sort((a, b) => {
      const scoreA = exerciseRecency[a.exercise_id] || 0;
      const scoreB = exerciseRecency[b.exercise_id] || 0;
      return scoreA - scoreB;
    })
    .slice(0, limit);
};

// Get the most recent performance for an exercise
const getPreviousPerformance = (
  exerciseId: string,
  workoutHistory: WorkoutHistory,
) => {
  const workouts = Object.values(workoutHistory).filter(w => w.completed);
  
  for (const workout of workouts) {
    const exercisePerformance = workout.exercises.find(
      e => e.exercise.exercise_id === exerciseId
    );
    if (exercisePerformance) {
      return {
        date: workout.date,
        sets: [...exercisePerformance.sets],
      };
    }
  }
  
  return undefined;
};

// Function to get the least recently used exercise from each category
function getLeastRecentlyUsedByCategory(
  eligibleExercises: Exercise[], // List of exercises that are eligible for selection
  workoutHistory: WorkoutHistory // History of past workouts
): Exercise[] {
  // Create a map to group exercises by their categories
  const categoryMap: Record<string, Exercise[]> = {};
  
  // Populate the category map with eligible exercises
  eligibleExercises.forEach(ex => {
    ex.categories.forEach(cat => {
      if (!categoryMap[cat]) categoryMap[cat] = []; // Initialize the category if it doesn't exist
      categoryMap[cat].push(ex); // Add the exercise to the corresponding category
    });
  });

  const result: Exercise[] = []; // Array to hold the selected exercises

  // For each category, pick the least recently used exercise
  Object.entries(categoryMap).forEach(([cat, exs]) => {
    // Sort exercises in the category by their last performance date
    const sorted = [...exs].sort((a, b) => {
      const aPerf = getPreviousPerformance(a.exercise_id, workoutHistory); // Get last performance for exercise a
      const bPerf = getPreviousPerformance(b.exercise_id, workoutHistory); // Get last performance for exercise b
      
      // Handle cases where performance data may be missing
      if (!aPerf && !bPerf) return 0; // Both have no performance data
      if (!aPerf) return -1; // a has no performance, so it is considered less recent
      if (!bPerf) return 1;  // b has no performance, so it is considered less recent
      
      // Compare the performance dates
      return new Date(aPerf.date).getTime() - new Date(bPerf.date).getTime();
    });

    console.log(`Sorted exercises for category ${cat}:`, sorted);

    // Add the least recently used exercise from this category to the result
    if (sorted.length > 0) {
      result.push(sorted[0]); // Push the first exercise from the sorted list
    }
  });

  console.log("Category Map:", categoryMap);

  return result; // Return the selected exercises
}

// Get the second-to-last performed exercise for a category
export const getSecondToLastExercise = (
  category: string, // The category to check
  workoutHistory: WorkoutHistory, // History of past workouts
  currentExerciseId: string // The ID of the current exercise
): Exercise | undefined => {
  const workouts = Object.values(workoutHistory).filter(w => w.completed); // Filter completed workouts
  
  let foundFirst = false; // Flag to track if the first occurrence of the current exercise has been found
  for (const workout of workouts) {
    for (const { exercise } of workout.exercises) {
      if (exercise.categories.includes(category)) { // Check if the exercise belongs to the specified category
        if (exercise.exercise_id === currentExerciseId) {
          foundFirst = true; // Mark that the current exercise has been found
          continue; // Move to the next exercise
        }
        if (foundFirst) {
          return exercise; // Return the second-to-last exercise found in the category
        }
      }
    }
  }
  return undefined; // Return undefined if no second-to-last exercise is found
};

// Get a random alternative exercise from the same category
export const getAlternativeExercise = (
  currentExercise: Exercise, // The current exercise to find an alternative for
  workoutHistory: WorkoutHistory // History of past workouts
): Exercise => {
  const category = currentExercise.categories[0]; // Get the category of the current exercise
  const eligibleExercises = exercises.filter(ex => 
    ex.categories.includes(category) && ex.exercise_id !== currentExercise.exercise_id // Filter out the current exercise
  );
  
  if (eligibleExercises.length === 0) {
    return currentExercise; // Return the current exercise if no alternatives are available
  }
  
  return getRandomItem(eligibleExercises); // Return a random alternative exercise
};

// Main function to generate a workout
export const generateWorkout = (
  workoutHistory: WorkoutHistory,
  activeExercises?: string[],
): Workout => {
  console.log("Active Exercises:", activeExercises);

  // Filter exercises based on active status
  const eligibleExercises = (exercises as Exercise[]).filter(ex => 
    activeExercises ? activeExercises.includes(ex.exercise_id) : true
  );
  console.log("Eligible Exercises:", eligibleExercises);

  const selectedExercises: Exercise[] = [];
  const categories = ['knee_dominant', 'hip_dominant'];

  // Loop through each category to select one least recently used exercise
  categories.forEach(category => {
    const categoryExercises = eligibleExercises.filter(ex => ex.categories.includes(category));
    const activeCategoryExercises = categoryExercises.filter(ex => 
      activeExercises ? activeExercises.includes(ex.exercise_id) : false
    );

    if (activeCategoryExercises.length > 0) {
      const selectedExercise = getLeastRecentlyUsedByCategory(activeCategoryExercises, workoutHistory);
      selectedExercises.push(selectedExercise[0]);
    }
  });

  console.log("Selected Exercises:", selectedExercises);

  const exercisesWithSets: ExerciseWithSets[] = selectedExercises.map(exercise => {
    const previousPerformance = getPreviousPerformance(exercise.exercise_id, workoutHistory);
    let sets;

    if (previousPerformance && previousPerformance.sets.length > 0) {
      sets = previousPerformance.sets.map(set => ({
        weight: set.weight,
        reps: set.reps,
        completed: false,
      }));
    } else {
      sets = Array(3).fill(null).map(() => ({
        weight: 0,
        reps: 10,
        completed: false,
      }));
    }

    return {
      exercise,
      sets,
      previousPerformance,
    };
  });

  return {
    id: `workout-${Date.now()}`,
    date: new Date().toISOString(),
    type: 'fullBody',
    exercises: exercisesWithSets,
    completed: false,
  };
};

// Function to update the database with active exercises
const updateDatabaseWithActiveExercises = (exercises: string[]) => {
    // Your logic to update the database
    // e.g., API call to save the active exercises
};