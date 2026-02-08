// Rocket class for Genetic Algorithm
// Adapted from professor's 10-missiles genetic algo pattern
// This is the "smart predator" that evolves to chase the player

class Rocket extends Vehicle {
    constructor(x, y, dna, target) {
        super(x, y);
        this.r = 20;
        this.maxSpeed = 5;
        this.maxForce = 0.2;

        this.dna = dna;
        this.target = target; // The player
        this.finishTime = 0;
        this.recordDist = 10000;

        this.fitness = 0;
        this.geneCounter = 0;
        this.hitObstacle = false;
        this.hitTarget = false;

        // Health system for Boss level
        this.maxHealth = 10;
        this.health = this.maxHealth;
        this.dead = false;
    }

    // Calculate fitness based on distance and time
    calcFitness() {
        if (this.recordDist < 1) this.recordDist = 1;

        // Fitness = inverse of time * distance (closer and faster = better)
        this.fitness = 1 / (this.finishTime * this.recordDist);

        // Make the function exponential for stronger selection
        this.fitness = pow(this.fitness, 4);

        // Penalties and bonuses
        if (this.hitObstacle) this.fitness *= 0.1;
        if (this.hitTarget) this.fitness *= 2;
    }

    // Run one frame: apply DNA force, update, check obstacles
    run(walls) {
        if (!this.hitObstacle && !this.hitTarget && !this.dead) {
            this.applyForce(this.dna.genes[this.geneCounter]);
            this.geneCounter = (this.geneCounter + 1) % this.dna.genes.length;
            this.update();
            this.obstacles(walls);
        }
        if (!this.hitObstacle && !this.dead) {
            this.display();
        }
    }

    // Check if approaching target
    checkTarget() {
        if (this.dead) return;

        let d = dist(
            this.pos.x,
            this.pos.y,
            this.target.pos.x,
            this.target.pos.y
        );
        if (d < this.recordDist) this.recordDist = d;

        // Check if touching player
        if (d < this.r + this.target.r && !this.hitTarget) {
            this.hitTarget = true;
        } else if (!this.hitTarget) {
            this.finishTime++;
        }
    }

    // Check wall/obstacle collisions
    obstacles(walls) {
        for (let w of walls) {
            if (this.pos.x > w.x && this.pos.x < w.x + w.w &&
                this.pos.y > w.y && this.pos.y < w.y + w.h) {
                this.hitObstacle = true;
            }
        }

        // Screen edge collisions
        if (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height) {
            // Wrap or stop at edges
            this.pos.x = constrain(this.pos.x, 0, width);
            this.pos.y = constrain(this.pos.y, 0, height);
        }
    }

    // Take damage (for Boss level)
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.dead = true;
        }
    }

    // Override update for physics
    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    // Display the rocket
    display() {
        if (this.dead) return;

        let theta = this.vel.heading() + PI / 2;
        push();
        translate(this.pos.x, this.pos.y);
        rotate(theta);

        // Use Boss image if available
        if (imgBoss) {
            imageMode(CENTER);
            image(imgBoss, 0, 0, this.r * 2, this.r * 2);
        } else {
            // Fallback rocket shape
            fill(0, 200, 0, 150);
            stroke(255);
            strokeWeight(1);

            rectMode(CENTER);
            fill(0);
            rect(-this.r / 2, this.r * 2, this.r / 2, this.r);
            rect(this.r / 2, this.r * 2, this.r / 2, this.r);

            fill(175);
            beginShape(TRIANGLES);
            vertex(0, -this.r * 2);
            vertex(-this.r, this.r * 2);
            vertex(this.r, this.r * 2);
            endShape();
        }

        pop();

        // Draw health bar
        this.drawHealthBar();
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

    getFitness() {
        return this.fitness;
    }

    getDNA() {
        return this.dna;
    }

    stopped() {
        return this.hitObstacle || this.dead;
    }
}
