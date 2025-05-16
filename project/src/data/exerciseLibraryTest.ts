import { Exercise } from '../types'; // Ensure this path is correct based on your project structure

export const exerciseLibrary: Exercise[] = [
  // Knee-Dominant (5 exercises)
  {
    exercise_id: 'squat',
    name: 'Squat',
    movement_type: 'compound',
    categories: ['knee_dominant'],
    tags: ['compound', 'knee_dominant', 'lower_body', 'push', 'squat'],
    equipment: ['barbell', 'rack'],
  },
  {
    exercise_id: 'lunges',
    name: 'Lunges',
    movement_type: 'compound',
    categories: ['knee_dominant'],
    tags: ['compound', 'knee_dominant', 'lower_body', 'lunge', 'push'],
    equipment: ['bodyweight_or_load'],
  },
  {
    exercise_id: 'stepups',
    name: 'Step-Ups',
    movement_type: 'compound',
    categories: ['knee_dominant'],
    tags: ['compound', 'knee_dominant', 'lower_body', 'lunge', 'push'],
    equipment: ['bodyweight_or_load', 'bench'],
  },
  {
    exercise_id: 'legpress',
    name: 'Leg Press',
    movement_type: 'compound',
    categories: ['knee_dominant'],
    tags: ['compound', 'knee_dominant', 'lower_body', 'machine', 'push', 'squat'],
    equipment: ['machine'],
  },
  {
    exercise_id: 'bulgariansplitsquat',
    name: 'Bulgarian Split Squat',
    movement_type: 'compound',
    categories: ['knee_dominant'],
    tags: ['compound', 'knee_dominant', 'lower_body', 'lunge', 'push'],
    equipment: ['bodyweight_or_load', 'bench'],
  },

  // Hip-Dominant (2 exercises)
  {
    exercise_id: 'deadlift',
    name: 'Deadlift',
    movement_type: 'compound',
    categories: ['hip_dominant'],
    tags: ['compound', 'hip_dominant', 'lower_body', 'pull', 'hinge'],
    equipment: ['barbell'],
  },
  {
    exercise_id: 'hipthrust',
    name: 'Hip Thrust',
    movement_type: 'compound',
    categories: ['hip_dominant'],
    tags: ['compound', 'hip_dominant', 'lower_body', 'pull', 'hinge'],
    equipment: ['barbell', 'bench'],
  }
];

// Define eligibleExercises based on your application's logic
const eligibleExercises: Exercise[] = exerciseLibrary; // Example: all exercises are eligible

const categoryMap: Record<string, Exercise[]> = {};

// Populate the category map with eligible exercises
eligibleExercises.forEach((ex: Exercise) => {
  ex.categories.forEach((cat: string) => {
    if (!categoryMap[cat]) categoryMap[cat] = []; // Initialize the category if it doesn't exist
    categoryMap[cat].push(ex); // Add the exercise to the corresponding category
  });
});

console.log("Category Map:", categoryMap); 