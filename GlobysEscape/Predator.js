class Predator extends Vehicle {
    constructor(x, y, config) {
        super(x, y);
        this.config = config || {};

        // Override default physics properties based on config
        this.maxSpeed = this.config.maxSpeed || 4;
        this.maxForce = this.config.maxForce || 0.1;
        this.r = 50; // Bigger predator radius

        // Wander properties
        this.wanderTheta = 0;

        // Health System - scales with level
        this.level = this.config.level || 1;
        this.maxHealth = this.level * 2; // Level 1 = 2 HP, Level 2 = 4 HP, etc.
        this.health = this.maxHealth;
        this.dead = false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.dead = true;
        }
    }

    // Override show to draw distinctive Image or Red shape
    show() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading() + PI / 2); // Adjust for image facing up

        if (this.config.imgObject) {
            imageMode(CENTER);
            image(this.config.imgObject, 0, 0, this.r * 3, this.r * 3); // 3x for bigger image
        } else {
            // Fallback shape if image not loaded
            stroke("white");
            strokeWeight(2);
            fill("red");
            // Triangle facing up (since we rotated PI/2)
            triangle(0, -this.r, -this.r / 2, this.r, this.r / 2, this.r);
        }

        // Debug visualizations
        if (window.debugMode) {
            // Perception circle
            noFill();
            stroke("rgba(255, 0, 0, 0.2)");
            circle(0, 0, this.perceptionRadius * 2);
        }

        pop();

        // Health Bar (drawn outside of rotation)
        this.drawHealthBar();

        if (window.debugMode) {
            this.drawVelocityVector();
            this.drawBehaviors();
        }
    }

    drawHealthBar() {
        let barWidth = this.r * 1.5;
        let barHeight = 6;
        let x = this.pos.x - barWidth / 2;
        let y = this.pos.y - this.r - 15;

        // Background (dark)
        noStroke();
        fill(50);
        rect(x, y, barWidth, barHeight, 2);

        // Health fill (red)
        let healthPercent = this.health / this.maxHealth;
        fill(255, 0, 0);
        rect(x, y, barWidth * healthPercent, barHeight, 2);
    }

    // Main AI Loop: Accumulate forces based on active behaviors
    applyBehaviors(target, obstacles) {
        let force = createVector(0, 0);

        // 1. OBSTACLE AVOIDANCE (Highest Priority)
        if (this.config.avoidObstacles) {
            let avoidForce = this.avoidObstacles(obstacles);
            avoidForce.mult(2.5); // High priority
            force.add(avoidForce);
        }

        // 2. PURSUE (Prediction) or SEEK/ARRIVE
        if (this.config.pursue) {
            let pursueForce = this.pursue(target); // pursue expects Vehicle object
            pursueForce.mult(this.config.seekWeight || 1);
            force.add(pursueForce);
        } else if (this.config.arrive) {
            let arriveForce = this.arrive(target.pos); // Arrive needs Vector input
            arriveForce.mult(this.config.seekWeight || 1);
            force.add(arriveForce);
        } else if (this.config.seek) {
            let seekForce = this.seek(target.pos); // Seek needs Vector input
            seekForce.mult(this.config.seekWeight || 1);
            force.add(seekForce);
        }

        // 3. WANDER (Idle movement)
        if (this.config.wander) {
            let wanderForce = this.wander();
            wanderForce.mult(this.config.wanderWeight || 1);
            force.add(wanderForce);
        }

        // 4. BOUNDARIES - Only when toggle is ON (B key)
        if (window.boundariesEnabled) {
            let boundaryForce = this.boundaries(0, 0, width, height, 50);
            boundaryForce.mult(3); // Strong boundary weight
            force.add(boundaryForce);
        }

        this.applyForce(force);
    }

    // --- BEHAVIORS ---

    // Pursue: Predict target's future position
    pursue(targetVehicle) {
        let target = targetVehicle.pos.copy();
        let prediction = targetVehicle.vel.copy();

        let d = p5.Vector.dist(this.pos, target);
        // Look ahead relative to distance (closer = less prediction)
        let T = d / this.maxSpeed;
        prediction.mult(T);
        target.add(prediction);

        if (window.debugMode) {
            push();
            fill(0, 255, 0); // Green dot for predicted path
            noStroke();
            circle(target.x, target.y, 10);
            pop();
        }

        return this.seek(target);
    }

    // Avoid Obstacles: Raycasting
    avoidObstacles(obstacles) {
        let steer = createVector(0, 0);
        let perception = 100; // Ray length

        // Define 3 Rays: Center, Left, Right
        let rays = [
            this.vel.copy().setMag(perception),
            this.vel.copy().setMag(perception).rotate(radians(25)),
            this.vel.copy().setMag(perception).rotate(radians(-25))
        ];

        let closestDist = Infinity;
        let intersectFound = false;

        for (let ray of rays) {
            let rayEnd = p5.Vector.add(this.pos, ray);

            // Check each obstacle
            for (let obs of obstacles) {
                // Determine which face of rect is hit (simplified to closest distance for now)
                // Better approach: Line-Line intersection with rect sides

                // Line-Rect Intersection Check
                let hit = this.collideLineRect(this.pos.x, this.pos.y, rayEnd.x, rayEnd.y, obs.x, obs.y, obs.w, obs.h);

                if (hit) {
                    intersectFound = true;
                    // Visualize hit
                    if (window.debugMode) {
                        push();
                        stroke("red");
                        line(this.pos.x, this.pos.y, hit.x, hit.y);
                        pop();
                    }

                    // Steer AWAY from the hit normal (simplified: steer opposite to ray)
                    let normal = p5.Vector.sub(this.pos, hit).normalize(); // Bounce back
                    // Better: steer normal to surface. For now, just repel.
                    normal.setMag(this.maxForce * 2);
                    steer.add(normal);
                }
            }

            // Debug Draw Rays
            if (window.debugMode && !intersectFound) {
                push();
                stroke(0, 255, 0, 100);
                line(this.pos.x, this.pos.y, rayEnd.x, rayEnd.y);
                pop();
            }
        }

        if (intersectFound) {
            steer.limit(this.maxForce);
        }

        return steer;
    }

    // Helper: Line to Rect intersection
    collideLineRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        // Check if line touches any of the 4 lines of the rect
        let left = this.lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);
        let right = this.lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
        let top = this.lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);
        let bottom = this.lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);

        // Return closest intersection
        if (left || right || top || bottom) {
            // Find closest dot
            // Simplified: return non-null (first hit)
            return left || right || top || bottom;
            // In a real engine, we'd compare distances
        }
        return false;
    }

    // Helper: Line-Line intersection
    lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        let uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
        let uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
            return createVector(x1 + (uA * (x2 - x1)), y1 + (uA * (y2 - y1)));
        }
        return false;
    }

    // Arrive: Seek but slows down when close
    arrive(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let d = desired.mag();
        let speed = this.maxSpeed;

        // Slow down radius (100px)
        if (d < 100) {
            speed = map(d, 0, 100, 0, this.maxSpeed);
        }

        desired.setMag(speed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(this.maxForce);
        return steer;
    }

    // Wander: Random smooth movement
    wander() {
        let wanderPoint = this.vel.copy();
        wanderPoint.setMag(100); // Distance ahead (wander distance)
        wanderPoint.add(this.pos);

        let wanderRadius = 50;

        let theta = this.wanderTheta + this.vel.heading();

        let x = wanderRadius * cos(theta);
        let y = wanderRadius * sin(theta);

        let target = p5.Vector.add(wanderPoint, createVector(x, y));

        let steer = this.seek(target);

        // Randomly change wanderTheta
        let displaceRange = 0.3;
        this.wanderTheta += random(-displaceRange, displaceRange);

        // Debug visualization for wander
        if (window.debugMode) {
            this.debugWander = { center: wanderPoint, radius: wanderRadius, target: target };
        }

        return steer;
    }

    drawBehaviors() {
        if (this.config.wander && this.debugWander) {
            push();
            noFill();
            stroke(255, 100);
            circle(this.debugWander.center.x, this.debugWander.center.y, this.debugWander.radius * 2);
            line(this.pos.x, this.pos.y, this.debugWander.center.x, this.debugWander.center.y);
            line(this.debugWander.center.x, this.debugWander.center.y, this.debugWander.target.x, this.debugWander.target.y);
            pop();
        }
    }
}
