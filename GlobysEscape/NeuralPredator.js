class NeuralPredator extends Vehicle {
    constructor(x, y, brain) {
        super(x, y);
        this.r = 45; // Bigger boss radius
        this.maxSpeed = 5;
        this.maxForce = 0.2;

        // GA Stats
        this.score = 0;
        this.fitness = 0;
        this.dead = false;
        this.closestDistToPlayer = 99999; // Track closest approach

        // Health System (for Boss level)
        this.level = 5; // Boss level
        this.maxHealth = 10; // Boss has 10 HP
        this.health = this.maxHealth;

        // 13 Inputs: 5 Wall Rays + 5 Player Rays + Angle + Dist + Speed
        // 2 Outputs: Steering X, Steering Y
        const INPUT_NODES = 13;
        const HIDDEN_NODES = 16; // Larger hidden layer for better learning
        const OUTPUT_NODES = 2;

        if (brain) {
            this.brain = brain.copy();
        } else {
            this.brain = new NeuralNetwork(INPUT_NODES, HIDDEN_NODES, OUTPUT_NODES);
        }

        this.rays = [];
        // Define ray angles relative to heading
        this.rayAngles = [-PI / 2, -PI / 4, 0, PI / 4, PI / 2];
        this.perceptionLength = 200; // Increased perception
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.dead = true;
        }
    }

    drawHealthBar() {
        let barWidth = this.r * 1.5;
        let barHeight = 6;
        let x = this.pos.x - barWidth / 2;
        let y = this.pos.y - this.r - 15;

        noStroke();
        fill(50);
        rect(x, y, barWidth, barHeight, 2);

        let healthPercent = this.health / this.maxHealth;
        fill(255, 0, 0);
        rect(x, y, barWidth * healthPercent, barHeight, 2);
    }

    // Override Update to calculate score
    update() {
        if (this.dead) return;

        super.update();

        // Only small reward for staying alive; main fitness comes from chasing
        this.score += 0.1;
    }

    // Main AI Loop
    think(target, walls) {
        if (this.dead) return;

        let inputs = [];
        let playerDetected = false; // Track if ANY ray sees player

        // For each ray direction, we detect:
        // 1. Distance to nearest WALL (obstacle avoidance)
        // 2. Is the PLAYER in this ray cone? (player detection)

        for (let angle of this.rayAngles) {
            let rayDir = p5.Vector.fromAngle(this.vel.heading() + angle);
            rayDir.setMag(this.perceptionLength);
            let rayEnd = p5.Vector.add(this.pos, rayDir);

            // --- WALL DETECTION ---
            let wallRecord = this.perceptionLength;
            for (let wall of walls) {
                let hit = this.collideLineRect(this.pos.x, this.pos.y, rayEnd.x, rayEnd.y, wall.x, wall.y, wall.w, wall.h);
                if (hit) {
                    let d = p5.Vector.dist(this.pos, hit);
                    if (d < wallRecord) wallRecord = d;
                }
            }
            inputs.push(map(wallRecord, 0, this.perceptionLength, 0, 1));

            // --- PLAYER DETECTION (is player in this ray's cone?) ---
            // Check angle between ray direction and direction to player
            let toPlayer = p5.Vector.sub(target.pos, this.pos);
            let playerDist = toPlayer.mag();
            let angleDiff = abs(rayDir.heading() - toPlayer.heading());
            // Normalize angle diff
            if (angleDiff > PI) angleDiff = TWO_PI - angleDiff;

            // If player is within ~30 degrees of this ray direction AND within perception range
            let playerInRay = 0;
            if (angleDiff < PI / 6 && playerDist < this.perceptionLength * 1.5) {
                // Player detected in this direction! 
                // Value = how close (1 = touching, 0 = far)
                playerInRay = map(playerDist, 0, this.perceptionLength * 1.5, 1, 0);
                playerDetected = true; // Flag that player is seen!
            }
            inputs.push(playerInRay);

            // Visualization
            if (window.debugMode) {
                push();
                stroke(playerInRay > 0 ? color(255, 255, 0) : (wallRecord < this.perceptionLength ? "red" : "green"));
                strokeWeight(playerInRay > 0 ? 3 : 1);
                line(this.pos.x, this.pos.y, this.pos.x + rayDir.x * (wallRecord / this.perceptionLength), this.pos.y + rayDir.y * (wallRecord / this.perceptionLength));
                pop();
            }
        }

        // Direct angle to target (-1 to 1)
        let desired = p5.Vector.sub(target.pos, this.pos);
        let angleToTarget = desired.heading();
        let relativeAngle = angleToTarget - this.vel.heading();
        if (relativeAngle > PI) relativeAngle -= TWO_PI;
        if (relativeAngle < -PI) relativeAngle += TWO_PI;
        inputs.push(map(relativeAngle, -PI, PI, -1, 1));

        // Distance to target (normalized)
        let dist = desired.mag();
        inputs.push(map(constrain(dist, 0, 800), 0, 800, 1, 0));

        // Current speed (normalized)
        inputs.push(map(this.vel.mag(), 0, this.maxSpeed, 0, 1));

        // --- PREDICT --- (now 13 inputs: 5 wall rays + 5 player rays + angle + dist + speed)
        let outputs = this.brain.predict(inputs);
        let force = createVector(outputs[0] * 2 - 1, outputs[1] * 2 - 1);
        force.setMag(this.maxForce);

        // *** HYBRID CHASE SYSTEM ***
        // If player is detected, add a DIRECT seek force toward the player!
        if (playerDetected) {
            let seekForce = p5.Vector.sub(target.pos, this.pos);
            seekForce.setMag(this.maxSpeed);
            seekForce.sub(this.vel);
            seekForce.limit(this.maxForce * 2); // Stronger seek when player visible
            force.add(seekForce); // Combine with NN output

            // Signal to spawn duplicate (handled in sketch.js)
            this.playerDetectedThisFrame = true;
        } else {
            this.playerDetectedThisFrame = false;
        }

        // BOUNDARIES - Only when toggle is ON (B key)
        if (window.boundariesEnabled) {
            let boundaryForce = this.boundaries(0, 0, width, height, 50);
            boundaryForce.mult(3);
            force.add(boundaryForce);
        }

        this.applyForce(force);

        // Track closest distance
        if (dist < this.closestDistToPlayer) {
            this.closestDistToPlayer = dist;
        }

        // Rewards
        if (dist < 50) this.score += 10;
        if (dist < 30) this.score += 50;
    }

    // Check collisions
    checkCollisions(walls) {
        // Wall collisions
        for (let w of walls) {
            if (this.pos.x > w.x && this.pos.x < w.x + w.w &&
                this.pos.y > w.y && this.pos.y < w.y + w.h) {
                this.dead = true;
                this.score *= 0.5; // Penalty for dying
            }
        }

        // Screen edge collisions
        if (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height) {
            this.dead = true;
            this.score *= 0.5;
        }
    }

    // Genetic Algorithm Mutation
    mutate(rate) {
        this.brain.mutate(rate);
    }

    // Create a copy for next generation
    copy() {
        return new NeuralPredator(this.pos.x, this.pos.y, this.brain);
    }

    // Helper: Line Rect collision (reused/simplified)
    collideLineRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        // Simplified check: intersection with any of 4 sides
        let left = this.lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);
        let right = this.lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
        let top = this.lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);
        let bottom = this.lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);
        return left || right || top || bottom;
    }

    lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        let uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
        let uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
            return createVector(x1 + (uA * (x2 - x1)), y1 + (uA * (y2 - y1)));
        }
        return false;
    }

    show() {
        if (this.dead) return;

        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());

        // Use Boss image if config has it - BIGGER SIZE
        if (this.config && this.config.imgObject) {
            imageMode(CENTER);
            image(this.config.imgObject, 0, 0, this.r * 4, this.r * 4); // 4x radius for bigger boss
        } else {
            fill(0, 150, 0, 150);
            stroke(255);
            triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
        }
        pop();

        // Draw health bar
        this.drawHealthBar();
    }
}
