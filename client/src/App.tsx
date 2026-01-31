import { useEffect, useCallback, useState } from "react";
import { useGameState, useAudio } from "./hooks";
import { claudeService, hacktronService, elevenlabsService } from "./services";
import { calculateGameConfig } from "./types";
import type { Difficulty, DifficultyFactors, Language } from "./types";

// Components
import { HomePage } from "./components/HomePage/HomePage";
import { DifficultySelect } from "./components/DifficultySelect/DifficultySelect";
import { GameScreen } from "./components/GameScreen/GameScreen";
import { EmergencyOverlay } from "./components/EmergencyOverlay/EmergencyOverlay";
import { ReportModal } from "./components/ReportModal/ReportModal";

import "./App.css";

function App() {
  const { state, currentTask, failedTasks, actions } = useGameState();
  const audio = useAudio();
  const [showEmergency, setShowEmergency] = useState(false);

  // Timer effect
  useEffect(() => {
    if (state.phase !== "PLAYING") return;

    const timer = setInterval(() => {
      if (state.timeRemaining <= 1) {
        // Time's up!
        audio.play("warning");
        actions.timeUp();
        setShowEmergency(true);
      } else {
        actions.tickTimer();
        // Play tick sound when time is low
        if (state.timeRemaining <= 5) {
          audio.play("tick");
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [state.phase, state.timeRemaining, actions, audio]);

  // Handle difficulty selection and game start
  const handleStartGame = useCallback(
    async (
      difficulty: Difficulty,
      factors: DifficultyFactors,
      language: Language,
    ) => {
      // Set difficulty and language
      actions.setDifficulty(difficulty, factors);
      actions.setLanguage(language);
      actions.startLoading();

      // Calculate config for task count
      const config = calculateGameConfig(difficulty, factors);

      // Generate code snippets
      const result = await claudeService.generateSnippets({
        language,
        difficulty,
        complexityLevel: config.complexityLevel,
        count: config.taskCount,
      });

      if (result.success) {
        actions.loadTasks(result.data.tasks);
        actions.startPlaying();
        audio.play("click");
      } else {
        console.error("Failed to generate snippets:", result.error);
        // Show error state or retry
        actions.resetGame();
      }
    },
    [actions, audio],
  );

  // Handle task answer
  const handleAnswer = useCallback(
    (answer: "safe" | "vulnerable") => {
      if (!currentTask) return;

      const isCorrect =
        (answer === "vulnerable" && currentTask.isVulnerable) ||
        (answer === "safe" && !currentTask.isVulnerable);

      // Wrong answer: clicked "vulnerable" on safe code
      if (answer === "vulnerable" && !currentTask.isVulnerable) {
        audio.play("siren");
        actions.answerTask(answer);
        setShowEmergency(true);
        return;
      }

      // Process answer
      actions.answerTask(answer);

      if (isCorrect) {
        audio.play("success");
      } else {
        audio.play("warning");
      }

      // Check if game is complete
      if (state.currentTaskIndex >= state.tasks.length - 1) {
        setShowEmergency(true);
      }
    },
    [currentTask, actions, audio, state.currentTaskIndex, state.tasks.length],
  );

  // Handle continue from emergency overlay
  const handleContinueFromEmergency = useCallback(async () => {
    setShowEmergency(false);

    // Start auditing
    actions.startAuditing();

    // Audit failed tasks
    const tasksToAudit = state.tasks.filter(
      (t) =>
        t.status === "failed" || (t.isVulnerable && t.status !== "completed"),
    );

    if (tasksToAudit.length > 0) {
      const auditResult = await hacktronService.auditTasks({
        tasks: tasksToAudit,
        language: state.language,
      });

      if (auditResult.success) {
        // Try to generate audio for the summary
        const audioUrl = await elevenlabsService.generateReportAudio(
          auditResult.data.report.summary,
        );

        actions.setAuditReport({
          ...auditResult.data.report,
          audioUrl: audioUrl || undefined,
        });
      }
    } else {
      // No failed tasks, create empty report
      actions.setAuditReport({
        findings: [],
        summary:
          "Excellent work! All security checks passed successfully. Ship systems are secure.",
      });
    }

    // Move to debrief
    actions.startDebrief();
  }, [actions, state.tasks, state.language]);

  // Handle restart
  const handleRestart = useCallback(() => {
    audio.stopAll();
    actions.resetGame();
  }, [actions, audio]);

  // Handle play button on home
  const handlePlay = useCallback(() => {
    audio.play("click");
    actions.resetGame();
    actions.startLoading();
  }, [actions, audio]);

  // Determine what to render based on game phase
  const renderPhase = () => {
    switch (state.phase) {
      case "IDLE":
        // Check if we should show difficulty select (after clicking play)
        // We use a simple check: if we just clicked play, we want difficulty select
        return <HomePage onPlay={handlePlay} />;

      case "LOADING":
        // If we're loading but have no tasks yet, show difficulty select
        if (state.tasks.length === 0) {
          return (
            <DifficultySelect
              initialDifficulty={state.difficulty}
              initialFactors={state.difficultyFactors}
              initialLanguage={state.language}
              onStart={handleStartGame}
              onBack={handleRestart}
            />
          );
        }
        // Otherwise show loading in game screen
        return (
          <GameScreen
            tasks={state.tasks}
            currentTaskIndex={state.currentTaskIndex}
            currentTask={null}
            language={state.language}
            timeRemaining={state.timeRemaining}
            timePerTask={state.timePerTask}
            onAnswer={handleAnswer}
            disabled
          />
        );

      case "PLAYING":
        return (
          <>
            <GameScreen
              tasks={state.tasks}
              currentTaskIndex={state.currentTaskIndex}
              currentTask={currentTask}
              language={state.language}
              timeRemaining={state.timeRemaining}
              timePerTask={state.timePerTask}
              onAnswer={handleAnswer}
            />
            {showEmergency && state.gameOverReason && (
              <EmergencyOverlay
                reason={state.gameOverReason}
                onContinue={handleContinueFromEmergency}
                score={state.score}
                totalTasks={state.tasks.length}
                correctAnswers={state.totalCorrect}
              />
            )}
          </>
        );

      case "AUDITING":
        return (
          <>
            <GameScreen
              tasks={state.tasks}
              currentTaskIndex={state.currentTaskIndex}
              currentTask={currentTask}
              language={state.language}
              timeRemaining={0}
              timePerTask={state.timePerTask}
              onAnswer={handleAnswer}
              disabled
            />
            {showEmergency && state.gameOverReason && (
              <EmergencyOverlay
                reason={state.gameOverReason}
                onContinue={handleContinueFromEmergency}
                score={state.score}
                totalTasks={state.tasks.length}
                correctAnswers={state.totalCorrect}
              />
            )}
          </>
        );

      case "DEBRIEF":
        return (
          <ReportModal
            report={state.auditReport || null}
            failedTasks={failedTasks}
            onRestart={handleRestart}
            audioUrl={state.auditReport?.audioUrl}
          />
        );

      default:
        return <HomePage onPlay={handlePlay} />;
    }
  };

  return <div className="app">{renderPhase()}</div>;
}

export default App;
