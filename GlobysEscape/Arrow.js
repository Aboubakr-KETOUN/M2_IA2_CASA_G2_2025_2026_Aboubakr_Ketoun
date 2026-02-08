// Arrow.js - Extends Vehicle to create a seeking projectile
// Follows RULES.md: Extends Vehicle, uses seek behavior

class Arrow extends Vehicle {
    constructor(x, y, direction) {
        super(x, y);

        // Arrow properties
        this.r = 10;
        this.maxSpeed = 12;
        this.maxForce = 0.5;

        // Set initial velocity based on direction
        this.vel = direction.copy().setMag(this.maxSpeed);

        // Visual properties
        this.color = color(random(100, 255), random(100, 255), random(100, 255));
        this.glowIntensity = 255;

        // Lifetime
        this.lifetime = 120; // 2 seconds at 60fps
        this.dead = false;
    }

    // Override applyBehaviors to seek closest predator
    applyBehaviors(predators) {
        let closest = null;
        let closestDist = Infinity;

        for (let p of predators) {
            if (p.dead) continue;
            let d = dist(this.pos.x, this.pos.y, p.pos.x, p.pos.y);
            if (d < closestDist) {
                closestDist = d;
                closest = p;
            }
        }

        if (closest) {
            let seekForce = this.seek(closest.pos);
            this.applyForce(seekForce);
        }
    }

    update() {
        super.update();
        this.lifetime--;
        if (this.lifetime <= 0) {
            this.dead = true;
        }

        // Fade glow
        this.glowIntensity = map(this.lifetime, 0, 120, 50, 255);
    }

    // Check collision with predators
    checkHits(predators) {
        for (let p of predators) {
            if (p.dead) continue;
            let d = dist(this.pos.x, this.pos.y, p.pos.x, p.pos.y);
            if (d < this.r + p.r) {
                // Hit!
                p.takeDamage(1);
                this.dead = true;
                return true;
            }
        }
        return false;
    }

    // Override show for glowing arrow effect
    show() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());

        // Glow effect
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.glowIntensity * 0.3);
        ellipse(0, 0, this.r * 3, this.r * 3);

        // Arrow body
        stroke(this.color);
        strokeWeight(2);
        fill(this.color);

        // Triangle arrow shape
        triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);

        pop();
    }
}
