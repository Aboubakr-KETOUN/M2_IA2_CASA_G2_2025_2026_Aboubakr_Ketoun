# Project Specification: "Globy's Escape" (Steering & Neural AI)

## 1. Game Overview
A progressive stealth/survival game built in p5.js. The player ("Globy") must survive levels where enemy AI ("Predators") becomes increasingly intelligent.

## 2. The Player (Globy)
- **Visuals:** A purple spherical character.
- **Movement:** WASD control, but physics-based (has friction/inertia). NOT instant movement.
- **Goal:** Survive for a set time or reach a target to advance the level.

## 3. The Enemy Architecture (The "Hybrid" Engine)
Enemies are defined by a `Predator` class extending `Vehicle`.

### Phase A: Deterministic AI (Levels 1-5)
- Driven by a **Configuration Dictionary** (`LevelConfig`).
- **No Learning:** Intelligence is simulated by tuning weights.
- **Behaviors Implemented:**
  - `Seek`: Move towards target.
  - `Arrive`: Slow down near target.
  - `Wander`: Smooth random movement when target is lost.
  - `Pursue`: Predict future position of target (Level 3+).
  - `ObstacleAvoidance`: Ray-casting to steer away from walls (Level 3+).

### Phase B: Neural AI (Level 6 / Training Mode)
- **Class:** `NeuralPredator extends Vehicle`
- **Brain:** A Feedforward Neural Network (Input -> Hidden -> Output).
- **Sensors (Inputs):** - Raycasts (distances to obstacles/walls).
  - Angle to Player.
  - Distance to Player.
  - Current Velocity.
- **Actuators (Outputs):** Steering Force (x, y) or Torque/Thrust.
- **Training:** Genetic Algorithm (Neuroevolution) executed in a separate "Training Room" scene.

## 4. Level Progression (The Loop)
- **Level 1:** Dumb Predator (Low speed, Seek only).
- **Level 2:** Fast Predator (High speed, cuts corners).
- **Level 3:** Smart Predator (Obstacle Avoidance + Prediction).
- **Level 4:** Pack Tactics (Separation behavior added).
- **Level 5:** "The Boss" (Neural Network trained agent).

## 5. Technical Requirements
- Use `p5.js` global mode or instance mode (consistency is key).
- Canvas size: Dynamic or fixed (e.g., 800x800).
- Debug Mode: Toggle key (e.g., 'D') to visualize steering vectors, wander circles, and vision rays.