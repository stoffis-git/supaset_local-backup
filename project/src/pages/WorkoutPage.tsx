import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardBody, Button } from '../components/ui';
import AppLayout from '../layouts/AppLayout';
import { useApp } from '../contexts/AppContext';
import { Workout, ExerciseWithSets } from '../types';
import { saveWorkout } from '../utils/localStorage';
import { Trash2, Plus } from 'lucide-react';

function isNaturalNumber(value: string) {
  return /^([1-9][0-9]*)?$/.test(value);
}

function hasAnySetCompleted(workout: Workout | null) {
  if (!workout) return false;
  return workout.exercises.some(ex => ex.sets.some(set => set.completed));
}

// Helper for swipeable set row
function SwipeableSetRow({
  children,
  onDelete,
  disabled,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const currentX = useRef<number>(0);
  const threshold = 60; // px to trigger delete
  const [showDelete, setShowDelete] = React.useState(false);

  // Only the handle area triggers swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    e.stopPropagation();
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) {
      currentX.current = dx;
      if (rowRef.current) {
        rowRef.current.style.transform = `translateX(${dx}px)`;
      }
      setShowDelete(Math.abs(dx) > 10);
    }
    e.stopPropagation();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return;
    if (currentX.current < -threshold) {
      if (rowRef.current) {
        rowRef.current.style.transition = '';
        rowRef.current.style.transform = 'translateX(0)';
      }
      setShowDelete(false);
      onDelete();
    } else {
      if (rowRef.current) {
        rowRef.current.style.transition = 'transform 0.2s';
        rowRef.current.style.transform = 'translateX(0)';
        setTimeout(() => {
          if (rowRef.current) rowRef.current.style.transition = '';
        }, 200);
      }
      setShowDelete(false);
    }
    startX.current = null;
    currentX.current = 0;
    e.stopPropagation();
  };
  // Mouse events for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    e.stopPropagation();
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (disabled || startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (dx < 0) {
      currentX.current = dx;
      if (rowRef.current) {
        rowRef.current.style.transform = `translateX(${dx}px)`;
      }
      setShowDelete(Math.abs(dx) > 10);
    }
  };
  const handleMouseUp = (e?: MouseEvent) => {
    if (disabled) return;
    if (currentX.current < -threshold) {
      if (rowRef.current) {
        rowRef.current.style.transition = '';
        rowRef.current.style.transform = 'translateX(0)';
      }
      setShowDelete(false);
      onDelete();
    } else {
      if (rowRef.current) {
        rowRef.current.style.transition = 'transform 0.2s';
        rowRef.current.style.transform = 'translateX(0)';
        setTimeout(() => {
          if (rowRef.current) rowRef.current.style.transition = '';
        }, 200);
      }
      setShowDelete(false);
    }
    startX.current = null;
    currentX.current = 0;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    if (e) e.stopPropagation();
  };

  return (
    <div className="relative overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
      {/* Delete background, only visible when swiping */}
      <div className={`absolute inset-0 right-0 flex items-center justify-end pr-4 transition-opacity duration-150 ${showDelete ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-red-500">
          <Trash2 size={20} />
        </span>
      </div>
      {/* Foreground row - direct wrapper div for swipe logic */}
      <div
        ref={rowRef}
        style={{ zIndex: 10, display: 'flex', alignItems: 'center' }}
      >
        {/* Swipe handle (left margin, 24px wide, can be invisible) */}
        <div
          className="h-full flex items-center justify-center"
          style={{ width: 24, minWidth: 24, cursor: disabled ? 'default' : 'grab', touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          {/* Optionally, a drag icon can go here */}
        </div>
        {/* Actual set row content, fully interactive */}
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useApp();
  const [workout, setWorkout] = useState<Workout | null>(null);
  // Store user input for weights as strings to allow both ',' and '.'
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [repsInputs, setRepsInputs] = useState<Record<string, string>>({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [editMode, setEditMode] = useState<{ [exerciseIndex: number]: boolean }>({});
  const [doneButtonErrors, setDoneButtonErrors] = useState<Record<string, boolean>>({});
  const [inputErrors, setInputErrors] = useState<Record<string, { weight?: boolean; reps?: boolean }>>({});

  useEffect(() => {
    // Try to get workout from state, else from navigation state
    let loadedWorkout = id && state.workouts[id];
    if (!loadedWorkout && location.state && location.state.workout) {
      loadedWorkout = location.state.workout;
    }
    if (loadedWorkout) {
      setWorkout(loadedWorkout);
      // Initialize input fields
      const wInputs: Record<string, string> = {};
      const rInputs: Record<string, string> = {};
      loadedWorkout.exercises.forEach((ex, exIdx) => {
        ex.sets.forEach((set, setIdx) => {
          wInputs[`${exIdx}-${setIdx}`] = set.weight ? String(set.weight).replace('.', ',') : '';
          rInputs[`${exIdx}-${setIdx}`] = set.reps > 0 ? String(set.reps) : '';
        });
      });
      setWeightInputs(wInputs);
      setRepsInputs(rInputs);
    } else {
      navigate('/');
    }
  }, [id, state.workouts, location.state, navigate]);

  const handleWeightChange = (exerciseIndex: number, setIndex: number, value: string) => {
    // Allow only numbers, ',' and '.'
    if (!/^\d*[.,]?\d*$/.test(value)) return;
    setWeightInputs(inputs => ({ ...inputs, [`${exerciseIndex}-${setIndex}`]: value }));
    setWorkout(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      const ex = updated.exercises[exerciseIndex];
      const set = { ...ex.sets[setIndex] };
      // Don't update set.weight until completion
      ex.sets[setIndex] = set;
      return updated;
    });
  };

  const handleWeightBlur = (exerciseIndex: number, setIndex: number) => {
    const key = `${exerciseIndex}-${setIndex}`;
    let value = weightInputs[key] || '';
    if (value) {
      value = value.replace(',', '.');
      const num = parseFloat(value);
      setWorkout(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        const ex = updated.exercises[exerciseIndex];
        const set = { ...ex.sets[setIndex], weight: isNaN(num) ? 0 : num };
        ex.sets[setIndex] = set;
        return updated;
      });
      setWeightInputs(inputs => ({ ...inputs, [key]: value.replace('.', ',') }));
    }
  };

  const handleRepsChange = (exerciseIndex: number, setIndex: number, value: string) => {
    if (!isNaturalNumber(value)) return;
    setRepsInputs(inputs => ({ ...inputs, [`${exerciseIndex}-${setIndex}`]: value }));
    setWorkout(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      const ex = updated.exercises[exerciseIndex];
      const set = { ...ex.sets[setIndex] };
      // Don't update set.reps until completion
      ex.sets[setIndex] = set;
      return updated;
    });
  };

  const handleRepsBlur = (exerciseIndex: number, setIndex: number) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const value = repsInputs[key] || '';
    if (value) {
      const num = parseInt(value, 10);
      setWorkout(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        const ex = updated.exercises[exerciseIndex];
        const set = { ...ex.sets[setIndex], reps: isNaN(num) ? 0 : num };
        ex.sets[setIndex] = set;
        return updated;
      });
    }
  };

  const handleToggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    setWorkout(prev => {
      if (!prev) return prev;
      // Deep copy exercises and sets
      const updatedExercises = prev.exercises.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.map((set, sIdx) => {
            if (sIdx !== setIndex) return set;
            // If marking as completed, update weight and reps from input fields
            const key = `${exerciseIndex}-${setIndex}`;
            if (!set.completed) {
              let weight = weightInputs[key] || '';
              weight = weight.replace(',', '.');
              const reps = repsInputs[key] || '';
              const weightValid = weight !== '' && !isNaN(parseFloat(weight));
              const repsValid = reps !== '' && !isNaN(parseInt(reps, 10));
              if (!weightValid || !repsValid) {
                setInputErrors(errors => ({
                  ...errors,
                  [key]: {
                    weight: !weightValid,
                    reps: !repsValid,
                  },
                }));
                setTimeout(() => setInputErrors(errors => ({ ...errors, [key]: {} })), 500);
                return set;
              }
              return {
                ...set,
                weight: parseFloat(weight),
                reps: parseInt(reps, 10),
                completed: true,
              };
            } else {
              // If unlocking, just mark as not completed
              return { ...set, completed: false };
            }
          })
        };
      });
      return { ...prev, exercises: updatedExercises };
    });
  };

  const handleFinishWorkout = () => {
    if (!workout) return;
    // Only allow finish if all sets are marked as done
    const allDone = workout.exercises.every(ex => ex.sets.every(set => set.completed));
    if (!allDone) {
      // Highlight all Done buttons for incomplete sets for 0.5s
      const newErrors: Record<string, boolean> = {};
      workout.exercises.forEach((ex, exerciseIndex) => {
        ex.sets.forEach((set, setIndex) => {
          if (!set.completed) {
            newErrors[`${exerciseIndex}-${setIndex}`] = true;
          }
        });
      });
      setDoneButtonErrors(newErrors);
      setTimeout(() => setDoneButtonErrors({}), 500);
      return;
    }
    // On finish, update all sets with the latest input values
    const updatedWorkout = { ...workout };
    updatedWorkout.exercises.forEach((ex, exIdx) => {
      ex.sets.forEach((set, setIdx) => {
        // Update weight
        let w = weightInputs[`${exIdx}-${setIdx}`] || '';
        w = w.replace(',', '.');
        set.weight = w ? parseFloat(w) : 0;
        // Update reps
        const r = repsInputs[`${exIdx}-${setIdx}`] || '';
        set.reps = r ? parseInt(r, 10) : 0;
      });
    });
    const completedWorkout = {
      ...updatedWorkout,
      completed: true,
      duration: Math.floor((Date.now() - new Date(workout.date).getTime()) / 1000 / 60),
    };
    dispatch({ type: 'SET_WORKOUT', payload: completedWorkout });
    saveWorkout(completedWorkout);
    navigate('/');
  };

  const handleCancelWorkout = () => {
    if (hasAnySetCompleted(workout)) {
      setShowCancelModal(true);
    } else {
      navigate('/');
    }
  };

  const handleHomeClick = handleCancelWorkout;

  const handleModalResume = () => setShowCancelModal(false);
  const handleModalDiscard = () => navigate('/');

  const handleAddSet = (exerciseIndex: number) => {
    setWorkout(prev => {
      if (!prev) return prev;
      const updatedExercises = prev.exercises.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: [
            ...ex.sets,
            { weight: 0, reps: 10, completed: false },
          ],
        };
      });
      return { ...prev, exercises: updatedExercises };
    });
  };

  const handleDeleteSet = (exerciseIndex: number, setIndex: number) => {
    setWorkout(prev => {
      if (!prev) return prev;
      const updatedExercises = prev.exercises.map((ex, exIdx) => {
        if (exIdx !== exerciseIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.filter((_, sIdx) => sIdx !== setIndex),
        };
      });
      return { ...prev, exercises: updatedExercises };
    });
  };

  const handleEditToggle = (exerciseIndex: number) => {
    setEditMode(prev => ({ ...prev, [exerciseIndex]: !prev[exerciseIndex] }));
  };

  if (!workout) return null;

  return (
    <AppLayout onHomeClick={handleHomeClick}>
      <div className="min-h-screen bg-dark-900">
        <div className="w-full max-w-lg mx-auto px-2 py-4 sm:px-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-indigo-400">Workout</h1>
            <div className="flex space-x-2 sm:space-x-3">
              <Button
                variant="secondary"
                onClick={handleCancelWorkout}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleFinishWorkout}
                className="w-full sm:w-auto"
              >
                Finish Workout
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {workout.exercises.map((exerciseWithSets, exerciseIndex) => (
              <Card key={exerciseWithSets.exercise.exercise_id} className="w-full">
                <CardBody>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg sm:text-xl font-semibold">
                      {exerciseWithSets.exercise.name}
                    </h2>
                    <button
                      className="text-xs text-indigo-400 hover:underline focus:outline-none ml-2"
                      onClick={() => handleEditToggle(exerciseIndex)}
                    >
                      {editMode[exerciseIndex] ? 'Save' : 'Edit'}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {exerciseWithSets.sets.map((set, setIndex) => {
                      const weightKey = `${exerciseIndex}-${setIndex}`;
                      const repsKey = `${exerciseIndex}-${setIndex}`;
                      if (editMode[exerciseIndex]) {
                        // Edit mode: show trash icon, adjust layout
                        return (
                          <div key={setIndex} className="flex flex-wrap items-center gap-2 sm:gap-4">
                            <div className="w-12 text-center shrink-0">
                              <span className="text-dark-400 text-sm">Set {setIndex + 1}</span>
                            </div>
                            <input
                              type="text"
                              placeholder="Weight"
                              value={weightInputs[weightKey] || ''}
                              onChange={e => handleWeightChange(exerciseIndex, setIndex, e.target.value)}
                              onBlur={() => handleWeightBlur(exerciseIndex, setIndex)}
                              className={`w-20 sm:w-24 px-3 py-2 bg-dark-800 border border-dark-700 rounded text-sm ${inputErrors[`${exerciseIndex}-${setIndex}`]?.weight ? ' border-red-500' : ''}`}
                              disabled={set.completed}
                              inputMode="decimal"
                            />
                            <input
                              type="text"
                              placeholder="Reps"
                              value={repsInputs[repsKey] || ''}
                              onChange={e => handleRepsChange(exerciseIndex, setIndex, e.target.value)}
                              onBlur={() => handleRepsBlur(exerciseIndex, setIndex)}
                              className={`w-16 sm:w-24 px-3 py-2 bg-dark-800 border border-dark-700 rounded text-sm ${inputErrors[`${exerciseIndex}-${setIndex}`]?.reps ? ' border-red-500' : ''}`}
                              disabled={set.completed}
                              inputMode="numeric"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleSetComplete(exerciseIndex, setIndex)}
                              className={doneButtonErrors[`${exerciseIndex}-${setIndex}`] ? 'border-2 border-red-500' : ''}
                            >
                              {set.completed ? '✓' : 'Done'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeleteSet(exerciseIndex, setIndex)}
                              className="ml-1 px-2"
                              aria-label="Delete set"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        );
                      } else {
                        // Normal mode: no trash icon, full width
                        return (
                          <div key={setIndex} className="flex flex-wrap items-center gap-2 sm:gap-4 w-full">
                            <div className="w-12 text-center shrink-0">
                              <span className="text-dark-400 text-sm">Set {setIndex + 1}</span>
                            </div>
                            <input
                              type="text"
                              placeholder="Weight"
                              value={weightInputs[weightKey] || ''}
                              onChange={e => handleWeightChange(exerciseIndex, setIndex, e.target.value)}
                              onBlur={() => handleWeightBlur(exerciseIndex, setIndex)}
                              className={`w-20 sm:w-24 px-3 py-2 bg-dark-800 border border-dark-700 rounded text-sm flex-1 ${inputErrors[`${exerciseIndex}-${setIndex}`]?.weight ? ' border-red-500' : ''}`}
                              disabled={set.completed}
                              inputMode="decimal"
                            />
                            <input
                              type="text"
                              placeholder="Reps"
                              value={repsInputs[repsKey] || ''}
                              onChange={e => handleRepsChange(exerciseIndex, setIndex, e.target.value)}
                              onBlur={() => handleRepsBlur(exerciseIndex, setIndex)}
                              className={`w-16 sm:w-24 px-3 py-2 bg-dark-800 border border-dark-700 rounded text-sm flex-1 ${inputErrors[`${exerciseIndex}-${setIndex}`]?.reps ? ' border-red-500' : ''}`}
                              disabled={set.completed}
                              inputMode="numeric"
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleToggleSetComplete(exerciseIndex, setIndex)}
                              className={doneButtonErrors[`${exerciseIndex}-${setIndex}`] ? 'border-2 border-red-500' : ''}
                            >
                              {set.completed ? '✓' : 'Done'}
                            </Button>
                          </div>
                        );
                      }
                    })}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleAddSet(exerciseIndex)}
                    >
                      <Plus size={16} className="mr-1" /> Add Set
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-2">
            <div className="bg-dark-800 rounded-lg p-4 max-w-xs w-full shadow-lg">
              <h2 className="text-lg font-bold mb-2">Discard Workout?</h2>
              <p className="mb-6 text-dark-300 text-sm">You have completed at least one set. If you leave, all progress will be lost.</p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button variant="secondary" onClick={handleModalResume} className="w-full sm:w-auto">
                  Resume Workout
                </Button>
                <Button variant="primary" onClick={handleModalDiscard} className="w-full sm:w-auto">
                  Discard Workout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
} 