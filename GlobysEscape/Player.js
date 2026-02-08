class Player {
    constructor(x, y, img) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.r = 60; // Increased size (was 40)

        this.maxSpeed = 5;
        this.friction = 0.95; // Physics simulation

        this.img = img;

        // Survival Stats
        this.health = 100;
        this.maxHealth = 100;
        this.invincibleUntil = 0;

        // Shooting
        this.lastMoveDir = createVector(1, 0); // Default right

        // For obstacle avoidance (professor's pattern)
        this.largeurZoneEvitementDevantVaisseau = this.r / 2;
    }

    takeDamage() {
        if (millis() < this.invincibleUntil) return false;

        this.health = Math.floor(this.health / 2);
        this.invincibleUntil = millis() + 1000; // 1 sec immunity
        return true;
    }

    // Shoot an arrow in the last movement direction
    shoot() {
        return new Arrow(this.pos.x, this.pos.y, this.lastMoveDir);
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        // Controls (Arrow Keys Only) - Physics based
        let force = createVector(0, 0);
        if (keyIsDown(UP_ARROW)) force.y -= 1;
        if (keyIsDown(DOWN_ARROW)) force.y += 1;
        if (keyIsDown(LEFT_ARROW)) force.x -= 1;
        if (keyIsDown(RIGHT_ARROW)) force.x += 1;

        // Normalize diagonal movement
        if (force.mag() > 0) {
            force.setMag(0.5); // Acceleration strength
            this.lastMoveDir = force.copy().normalize(); // Track direction
        }

        this.applyForce(force);

        // BOUNDARIES - Only when toggle is ON (B key)
        if (window.boundariesEnabled) {
            let boundaryForce = this.boundaries(0, 0, width, height, 50);
            boundaryForce.mult(3); // Strong boundary weight
            this.applyForce(boundaryForce);
        }

        // Apply obstacle avoidance force (professor's method)
        if (window.obstacles && window.obstacles.length > 0) {
            let avoidForce = this.avoid(window.obstacles);
            avoidForce.mult(3); // Strong avoidance weight
            this.applyForce(avoidForce);
        }

        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.vel.mult(this.friction); // Friction
        this.pos.add(this.vel);
        this.acc.mult(0); // Reset acceleration

        // edges() always called as fallback (professor's pattern)
        this.wrapEdges();
    }

    // Professor's obstacle avoidance method
    avoid(obstacles) {
        // Ahead vector (sensor looking ahead)
        let ahead = this.vel.copy();
        ahead.mult(30);
        // Ahead2 is half the distance
        let ahead2 = ahead.copy();
        ahead2.mult(0.5);

        // Debug: draw ahead vector
        if (window.debugMode) {
            this.drawVector(this.pos, ahead, "yellow");
        }

        // Calculate ahead point positions
        let pointAuBoutDeAhead = this.pos.copy().add(ahead);
        let pointAuBoutDeAhead2 = this.pos.copy().add(ahead2);

        // Find closest obstacle
        let obstacleLePlusProche = this.getObstacleLePlusProche(obstacles);

        // No obstacle = no force
        if (obstacleLePlusProche == undefined) {
            return createVector(0, 0);
        }

        // Calculate distance to obstacle
        let distance1 = pointAuBoutDeAhead.dist(obstacleLePlusProche.pos);
        let distance2 = pointAuBoutDeAhead2.dist(obstacleLePlusProche.pos);
        let distance = min(distance1, distance2);

        // Debug visualization
        if (window.debugMode) {
            push();
            fill("red");
            circle(pointAuBoutDeAhead.x, pointAuBoutDeAhead.y, 10);
            fill("blue");
            circle(pointAuBoutDeAhead2.x, pointAuBoutDeAhead2.y, 10);

            // Draw avoidance zone
            stroke(100, 100);
            strokeWeight(this.largeurZoneEvitementDevantVaisseau);
            line(this.pos.x, this.pos.y, pointAuBoutDeAhead.x, pointAuBoutDeAhead.y);
            pop();
        }

        // Check collision zone
        if (distance < obstacleLePlusProche.r + this.largeurZoneEvitementDevantVaisseau) {
            // Calculate avoidance force (from obstacle center to ahead point)
            let avoidForce;
            if (distance1 < distance2) {
                avoidForce = p5.Vector.sub(pointAuBoutDeAhead, obstacleLePlusProche.pos);
            } else {
                avoidForce = p5.Vector.sub(pointAuBoutDeAhead2, obstacleLePlusProche.pos);
            }

            // Debug: draw the PUSH VECTOR from obstacle (yellow arrow)
            if (window.debugMode) {
                this.drawVector(obstacleLePlusProche.pos, avoidForce, "yellow");
            }

            // Set magnitude and apply steering formula
            avoidForce.setMag(this.maxSpeed);
            avoidForce.sub(this.vel);
            avoidForce.limit(this.maxForce || 0.5);
            return avoidForce;
        }

        return createVector(0, 0);
    }

    // Draw vector with arrow (professor's method)
    drawVector(pos, v, color) {
        push();
        strokeWeight(3);
        stroke(color);
        line(pos.x, pos.y, pos.x + v.x, pos.y + v.y);
        // Arrow head
        let arrowSize = 5;
        translate(pos.x + v.x, pos.y + v.y);
        rotate(v.heading());
        translate(-arrowSize / 2, 0);
        fill(color);
        noStroke();
        triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
        pop();
    }

    // Find closest obstacle
    getObstacleLePlusProche(obstacles) {
        let plusPetiteDistance = 100000000;
        let obstacleLePlusProche = undefined;

        for (let o of obstacles) {
            let distance = this.pos.dist(o.pos);
            if (distance < plusPetiteDistance) {
                plusPetiteDistance = distance;
                obstacleLePlusProche = o;
            }
        }

        return obstacleLePlusProche;
    }

    // Boundaries behavior from professor's code
    boundaries(bx, by, bw, bh, d) {
        let vitesseDesiree = null;

        const xBordGauche = bx + d;
        const xBordDroite = bx + bw - d;
        const yBordHaut = by + d;
        const yBordBas = by + bh - d;

        if (this.pos.x < xBordGauche) {
            vitesseDesiree = createVector(this.maxSpeed, this.vel.y);
        } else if (this.pos.x > xBordDroite) {
            vitesseDesiree = createVector(-this.maxSpeed, this.vel.y);
        }

        if (this.pos.y < yBordHaut) {
            vitesseDesiree = createVector(this.vel.x, this.maxSpeed);
        } else if (this.pos.y > yBordBas) {
            vitesseDesiree = createVector(this.vel.x, -this.maxSpeed);
        }

        if (vitesseDesiree !== null) {
            vitesseDesiree.setMag(this.maxSpeed);
            const boundaryForce = p5.Vector.sub(vitesseDesiree, this.vel);
            boundaryForce.limit(0.5);
            return boundaryForce;
        }

        return createVector(0, 0);
    }

    // Hard constrain to screen (when boundaries enabled)
    constrainToScreen() {
        this.pos.x = constrain(this.pos.x, this.r, width - this.r);
        this.pos.y = constrain(this.pos.y, this.r, height - this.r);
    }

    // Wrap-around screen edges (when boundaries disabled)
    wrapEdges() {
        if (this.pos.x > width + this.r) {
            this.pos.x = -this.r;
        } else if (this.pos.x < -this.r) {
            this.pos.x = width + this.r;
        }
        if (this.pos.y > height + this.r) {
            this.pos.y = -this.r;
        } else if (this.pos.y < -this.r) {
            this.pos.y = height + this.r;
        }
    }

    show() {
        push();
        translate(this.pos.x, this.pos.y);

        // Flashing effect if invincible
        if (millis() < this.invincibleUntil) {
            if (frameCount % 10 < 5) return; // Blink (don't draw)
        }

        if (this.img) {
            // Rotate towards movement? Optional
            // Globy might look better just facing proper direction or static
            // Let's rotate if moving
            if (this.vel.mag() > 0.1) {
                rotate(this.vel.heading() + PI / 2);
            }
            imageMode(CENTER);
            image(this.img, 0, 0, this.r * 2.5, this.r * 2.5);
        } else {
            // Fallback drawing if image missing
            fill("purple");
            stroke("white");
            strokeWeight(2);
            circle(0, 0, this.r * 2);
            // Eyes
            fill(255);
            circle(-8, -5, 8);
            circle(8, -5, 8);
            fill(0);
            circle(-8, -5, 3);
            circle(8, -5, 3);
        }

        pop();
    }
}
