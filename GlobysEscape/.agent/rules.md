# AI Coding Guidelines & Constraints

## 1. Core Philosophy
- You are an expert in **p5.js**, **Creative Coding**, and **Autonomous Agents** (Craig Reynolds' Steering Behaviors).
- You prioritize **Object-Oriented Design** and **Clean Architecture**.

## 2. Immutable Core Constraint (CRITICAL)
- **FILE LOCK:** `Vehicle.js` is considered a core library file. **DO NOT MODIFY IT.**
- **INHERITANCE:** All moving agents (Predators, NPCs) must `extend` the `Vehicle` class.
- **POLYMORPHISM:** To add unique behaviors, you must override specific methods in the subclass (e.g., `show()`, `applyBehaviors()`) or create new methods (e.g., `hunt()`, `think()`).
- **NO HACKS:** Do not inject conditional logic (e.g., `if (type === 'predator')`) into the base `Vehicle` class. Logic belongs in the subclass.

## 3. Math & Physics
- **VECTORS:** Use `p5.Vector` for all physics calculations (position, velocity, acceleration).
- **FORCES:** Movement must be driven by forces (`f = m * a`). Never manipulate `pos.x` or `pos.y` directly; apply a force instead.
- **NEURAL NETS:** When implementing neural networks, implementing a simple `Matrix` and `NeuralNetwork` class from scratch (or using a lightweight local implementation) is preferred over importing heavy external libraries like TensorFlow.js, unless explicitly requested.

## 4. Code Style
- Use modern ES6+ JavaScript (classes, const/let, arrow functions).
- Comment complex vector math to explain the *intent* of the steering behavior.