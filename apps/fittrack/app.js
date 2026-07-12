/**
 * FitTrack — demo workout tracker.
 *
 * A small, framework-free app that simulates a fitness tracker. It owns no
 * GrowthKit logic: the SDK is integrated separately via <script> and is
 * notified of achievements through `window.GrowthKit.onAchievement(...)`.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "fittrack:total-workouts";

  /** Tunables for the (simulated) workout-result calculation. */
  const METRICS = Object.freeze({
    kmPerSecond: 0.003, // ~0.18 km per minute
    kmJitter: 0.4,
    caloriesPerSecond: 0.15,
    caloriesPerMinute: 8,
  });

  /**
   * @typedef {Object} WorkoutResult
   * @property {string} distanceKm
   * @property {number} minutes
   * @property {number} calories
   * @property {string} timeText
   */

  // --- DOM references --------------------------------------------------------
  const els = {
    startBtn: document.getElementById("start-btn"),
    stopBtn: document.getElementById("stop-btn"),
    timerBox: document.getElementById("timer-box"),
    timerValue: document.getElementById("timer-value"),
    result: document.getElementById("result-card"),
    resultStats: document.getElementById("result-stats"),
    totalCount: document.getElementById("total-count"),
  };

  // --- State -----------------------------------------------------------------
  let elapsedSeconds = 0;
  let tickHandle = null;
  let totalWorkouts = readTotal();

  // --- Helpers ---------------------------------------------------------------
  /** @param {number} seconds @returns {string} formatted as MM:SS */
  const formatDuration = (seconds) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  /** @returns {number} */
  function readTotal() {
    return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
  }

  /** @param {number} value */
  function persistTotal(value) {
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  /** Derive a plausible workout result from elapsed time. @returns {WorkoutResult} */
  function computeResult(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    const distanceKm = (
      seconds * METRICS.kmPerSecond +
      Math.random() * METRICS.kmJitter
    ).toFixed(1);
    const calories = Math.round(
      seconds * METRICS.caloriesPerSecond + minutes * METRICS.caloriesPerMinute
    );
    return { distanceKm, minutes, calories, timeText: formatDuration(seconds) };
  }

  /**
   * Map a workout result to GrowthKit's generic achievement shape.
   * Keeping the SDK app-agnostic is intentional — it renders whatever
   * title/stats it is given, with no fitness-specific knowledge.
   * @param {WorkoutResult} r
   */
  function toAchievement(r) {
    return {
      title: "Workout complete!",
      stats: [
        { text: `🏃 ${r.distanceKm} km` },
        { text: `⏱ ${r.timeText}` },
        { text: `🔥 ${r.calories} kcal` },
      ],
    };
  }

  // --- View transitions ------------------------------------------------------
  function showRunningState() {
    els.startBtn.hidden = true;
    els.result.hidden = true;
    els.timerBox.hidden = false;
    els.stopBtn.hidden = false;
  }

  function showIdleState() {
    els.timerBox.hidden = true;
    els.stopBtn.hidden = true;
    els.startBtn.hidden = false;
    els.result.hidden = false;
  }

  /** @param {WorkoutResult} r */
  function renderResult(r) {
    els.resultStats.innerHTML =
      `🏃 ${r.distanceKm} km &nbsp;·&nbsp; ⏱ ${r.timeText} &nbsp;·&nbsp; 🔥 ${r.calories} kcal`;
  }

  // --- Event handlers --------------------------------------------------------
  function startWorkout() {
    elapsedSeconds = 0;
    els.timerValue.textContent = "00:00";
    showRunningState();
    tickHandle = setInterval(() => {
      elapsedSeconds += 1;
      els.timerValue.textContent = formatDuration(elapsedSeconds);
    }, 1000);
  }

  function finishWorkout() {
    clearInterval(tickHandle);

    const result = computeResult(elapsedSeconds);

    totalWorkouts += 1;
    persistTotal(totalWorkouts);
    els.totalCount.textContent = String(totalWorkouts);

    renderResult(result);
    showIdleState();

    // Hand the achievement off to GrowthKit; it owns the share experience.
    // Optional chaining keeps the app working even if the SDK fails to load.
    window.GrowthKit?.onAchievement(toAchievement(result));
  }

  // --- Bootstrap -------------------------------------------------------------
  function init() {
    els.totalCount.textContent = String(totalWorkouts);
    els.startBtn.addEventListener("click", startWorkout);
    els.stopBtn.addEventListener("click", finishWorkout);
  }

  init();
})();
