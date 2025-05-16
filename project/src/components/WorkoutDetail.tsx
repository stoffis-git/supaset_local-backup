import React, { useState } from 'react';
import { Workout, ExerciseWithSets, Set } from '../types';
import Button from './ui/Button';
import { ArrowLeft, Save, CheckCircle, Plus, Minus, RefreshCw, RotateCcw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getSecondToLastExercise, getAlternativeExercise } from '../utils/workoutGenerator';

interface WorkoutDetailProps {
  workout: Workout;
  onBack: () => void;
  isPreview?: boolean;
}

const WorkoutDetail: React.FC<WorkoutDetailProps> = ({ workout, onBack, isPreview = false }) => {
  const { state, dispatch } = useApp();
  const [currentWorkout, setCurrentWorkout] = useState<Workout>({...workout});
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const [reproposedExercises, setReproposedExercises] = useState<Record<string, boolean>>({});
  const [inputErrors, setInputErrors] = useState<Record<string, { weight?: boolean; reps?: boolean }>>({});
  const [doneButtonErrors, setDoneButtonErrors] = useState<Record<string, boolean>>({});

  // Log the initial workout data
  console.log("Initial Workout Data:", workout);

  const handleSetCompletion = (exerciseIndex: number, setIndex: number, completed: boolean) => {
    if (isPreview) return;
    const set = currentWorkout.exercises[exerciseIndex].sets[setIndex];
    let hasError = false;
    if (completed) {
      if (set.weight === undefined || set.weight === null || isNaN(set.weight)) {
        hasError = true;
      }
      if (set.reps === undefined || set.reps === null || isNaN(set.reps)) {
        hasError = true;
      }
    }
    const key = `${exerciseIndex}-${setIndex}`;
    setDoneButtonErrors(prev => ({ ...prev, [key]: hasError }));
    if (hasError) return;
    const updatedWorkout = { ...currentWorkout };
    updatedWorkout.exercises[exerciseIndex].sets[setIndex].completed = completed;
    const allSetsCompleted = updatedWorkout.exercises.every(exercise =>
      exercise.sets.every(set => set.completed)
    );
    updatedWorkout.completed = allSetsCompleted;
    setCurrentWorkout(updatedWorkout);
  };

  const handleSwitchExercise = (exerciseIndex: number) => {
    const currentExercise = currentWorkout.exercises[exerciseIndex].exercise;
    const category = currentExercise.categories[0];
    const eligibleExercises = (state.exerciseLibrary || []).filter(
      ex => Array.isArray(ex.categories) && ex.categories.includes(category)
    );

    // Log eligible exercises for the current category
    console.log('Eligible Exercises for Switching:', eligibleExercises);

    const recencySorted = eligibleExercises.sort((a, b) => {
      const aPerf = state.workouts
        ? Object.values(state.workouts)
            .filter(w => w.exercises.some(e => e.exercise.exercise_id === a.exercise_id))
            .map(w => new Date(w.date).getTime())
        : [];
      const bPerf = state.workouts
        ? Object.values(state.workouts)
            .filter(w => w.exercises.some(e => e.exercise.exercise_id === b.exercise_id))
            .map(w => new Date(w.date).getTime())
        : [];
      const aLast = aPerf.length > 0 ? Math.max(...aPerf) : 0;
      const bLast = bPerf.length > 0 ? Math.max(...bPerf) : 0;
      return aLast - bLast;
    });

    const twoOldest = recencySorted.slice(0, 2);
    let newExercise = currentExercise;
    if (twoOldest.length === 2) {
      if (currentExercise.exercise_id === twoOldest[0].exercise_id) {
        newExercise = twoOldest[1];
      } else {
        newExercise = twoOldest[0];
      }
    }

    // Log the switching process
    console.log('Current Exercise:', currentExercise);
    console.log('Two Oldest Exercises:', twoOldest);
    console.log('Switching to Exercise:', newExercise);

    // Only update if the exercise is actually changing
    if (newExercise.exercise_id !== currentExercise.exercise_id) {
      const updatedExercises = currentWorkout.exercises.map((ex, idx) =>
        idx === exerciseIndex
          ? { ...ex, exercise: { ...newExercise } }
          : ex
      );
      setCurrentWorkout({ ...currentWorkout, exercises: updatedExercises });
    }
  };

  const handleStartSession = () => {
    dispatch({ type: 'SET_WORKOUT', payload: currentWorkout });
    window.location.href = `/workout/${currentWorkout.id}`;
  };

  const handleFinishWorkout = () => {
    // Only allow finish if all sets are marked as done
    const allDone = currentWorkout.exercises.every(ex => ex.sets.every(set => set.completed));
    console.log('Finish clicked. All done:', allDone);
    if (!allDone) {
      // Highlight all Done buttons for incomplete sets
      const newErrors: Record<string, boolean> = {};
      currentWorkout.exercises.forEach((ex, exerciseIndex) => {
        ex.sets.forEach((set, setIndex) => {
          if (!set.completed) {
            newErrors[`${exerciseIndex}-${setIndex}`] = true;
          }
        });
      });
      setDoneButtonErrors(newErrors);
      return;
    }
    dispatch({ type: 'SET_WORKOUT', payload: currentWorkout });
    onBack();
  };

  const handleSetChange = (
    exerciseIndex: number, 
    setIndex: number, 
    field: keyof Set, 
    value: number
  ) => {
    const updatedWorkout = {...currentWorkout};
    if (field === 'weight' || field === 'reps') {
      updatedWorkout.exercises[exerciseIndex].sets[setIndex][field] = value;
    }
    setCurrentWorkout(updatedWorkout);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updatedWorkout = {...currentWorkout};
    const exercise = updatedWorkout.exercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];
    
    exercise.sets.push({
      weight: lastSet.weight,
      reps: lastSet.reps,
      completed: false
    });
    
    setCurrentWorkout(updatedWorkout);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updatedWorkout = {...currentWorkout};
    updatedWorkout.exercises[exerciseIndex].sets.splice(setIndex, 1);
    setCurrentWorkout(updatedWorkout);
  };

  const handleReproposeExercise = (exerciseIndex: number) => {
    const exercise = currentWorkout.exercises[exerciseIndex].exercise;
    const category = exercise.categories[0];
    const secondToLastExercise = getSecondToLastExercise(category, state.workouts, exercise.exercise_id);
    
    if (secondToLastExercise) {
      const updatedWorkout = {...currentWorkout};
      updatedWorkout.exercises[exerciseIndex].exercise = secondToLastExercise;
      setCurrentWorkout(updatedWorkout);
      const key = exerciseIndex.toString();
      setReproposedExercises(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  // Log the current workout state before rendering
  console.log("Current Workout State:", currentWorkout);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <button 
          className="flex items-center text-primary-400 hover:text-primary-300"
          onClick={onBack}
        >
          <ArrowLeft size={18} className="mr-1" />
          Back
        </button>
        
        {!isPreview && (
          <Button 
            onClick={() => { 
              console.log('Finish button clicked'); 
              handleFinishWorkout(); 
            }}
          >
            <Save size={18} className="mr-1" />
            Finish Workout
          </Button>
        )}
      </div>
      
      <div className="bg-dark-800 rounded-lg shadow-md p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">
            {currentWorkout.type.charAt(0).toUpperCase() + currentWorkout.type.slice(1)} Workout
          </h1>
        </div>
        
        <div className="border-t border-dark-700 pt-4">
          <div className="space-y-4">
            {currentWorkout.exercises.map((exerciseData, exerciseIndex) => (
              <div key={exerciseIndex} className="border border-dark-700 rounded-lg overflow-hidden">
                <div className="p-4 bg-dark-900 flex justify-between items-center">
                  <div className="flex items-center">
                    {/* Only show the exercise name in preview mode */}
                    <h3 className="font-semibold text-white">
                      {exerciseData.exercise.name}
                    </h3>
                  </div>
                  {isPreview && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSwitchExercise(exerciseIndex)}
                      className="flex items-center"
                    >
                      <RefreshCw size={16} className="mr-1" />
                      Switch
                    </Button>
                  )}
                </div>
                
                {!isPreview && activeExerciseIndex === exerciseIndex && (
                  <div className="p-4 bg-dark-800">
                    {exerciseData.sets.map((set, setIndex) => (
                      <div key={setIndex} className="flex items-center space-x-4 mb-2">
                        <span className="text-dark-400">Set {setIndex + 1}</span>
                        <div className="flex items-center">
                          <button 
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-dark-700 rounded"
                            onClick={() => handleSetChange(
                              exerciseIndex, 
                              setIndex, 
                              'weight', 
                              Math.max(0, set.weight - 2.5)
                            )}
                          >
                            <Minus size={16} />
                          </button>
                          
                          <input 
                            type="number"
                            className={`w-20 bg-dark-900 border border-dark-700 rounded px-2 py-1 ${inputErrors[`${exerciseIndex}-${setIndex}`]?.weight ? ' border-red-500' : ''}`}
                            value={set.weight}
                            onChange={(e) => handleSetChange(
                              exerciseIndex,
                              setIndex,
                              'weight',
                              Number(e.target.value)
                            )}
                            min={0}
                            step={2.5}
                          />
                          
                          <button 
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-dark-700 rounded"
                            onClick={() => handleSetChange(
                              exerciseIndex, 
                              setIndex, 
                              'weight', 
                              set.weight + 2.5
                            )}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center">
                          <button 
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-dark-700 rounded"
                            onClick={() => handleSetChange(
                              exerciseIndex, 
                              setIndex, 
                              'reps', 
                              Math.max(1, set.reps - 1)
                            )}
                          >
                            <Minus size={16} />
                          </button>
                          
                          <input 
                            type="number"
                            className={`w-20 bg-dark-900 border border-dark-700 rounded px-2 py-1 ${inputErrors[`${exerciseIndex}-${setIndex}`]?.reps ? ' border-red-500' : ''}`}
                            value={set.reps}
                            onChange={(e) => handleSetChange(
                              exerciseIndex,
                              setIndex,
                              'reps',
                              Number(e.target.value)
                            )}
                            min={1}
                          />
                          
                          <button 
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-dark-700 rounded"
                            onClick={() => handleSetChange(
                              exerciseIndex, 
                              setIndex, 
                              'reps', 
                              set.reps + 1
                            )}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        
                        <Button
                          variant={set.completed ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleSetCompletion(exerciseIndex, setIndex, !set.completed)}
                          className={doneButtonErrors[`${exerciseIndex}-${setIndex}`] ? 'border-2 border-red-500' : ''}
                        >
                          {set.completed ? (
                            <>
                              <CheckCircle size={16} className="mr-1" />
                              Done
                            </>
                          ) : 'Mark Done'}
                        </Button>
                        
                        {exerciseData.sets.length > 1 && (
                          <button 
                            className="text-red-500 hover:text-red-400 p-1"
                            onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                          >
                            <Minus size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <div className="mt-4">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleAddSet(exerciseIndex)}
                        className="flex items-center"
                      >
                        <Plus size={16} className="mr-1" />
                        Add Set
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {isPreview ? (
        <Button
          className="w-full"
          onClick={handleStartSession}
        >
          Start Session
        </Button>
      ) : (
        <div className="flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleFinishWorkout}>
            Finish Workout
          </Button>
        </div>
      )}
    </div>
  );
};

export default WorkoutDetail;