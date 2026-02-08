class Vehicle {
    constructor(x, y) {
        // position du véhicule
        this.pos = createVector(x, y);
        // vitesse du véhicule
        this.vel = createVector(0, 0);
        // accélération du véhicule
        this.acc = createVector(0, 0);
        // vitesse maximale du véhicule
        this.maxSpeed = 4;
        // force maximale appliquée au véhicule
        this.maxForce = 0.1;
        // rayon du véhicule
        this.r = 16;
        // rayon de perception (pour le debug)
        this.perceptionRadius = 100;
    }

    applyBehaviors(target) {
        // Abstract method - to be overridden by subclasses
        // Default implementation does nothing or basic seek
    }

    // seek est un comportement qui permet de faire se rapprocher le véhicule de 
    // la cible passée en paramètre
    seek(target) {
        // on calcule la direction vers la cible : la vitesse DESIREE
        let desiredSpeed = p5.Vector.sub(target, this.pos);

        // on limite ce vecteur à la longueur maxSpeed
        desiredSpeed.setMag(this.maxSpeed);

        // on calcule maintenant LA FORMULE MAGIQUE : force = desiredSpeed - currentSpeed
        let force = p5.Vector.sub(desiredSpeed, this.vel);

        // et on limite cette force à la longueur maxForce
        force.limit(this.maxForce);

        return force;
    }

    // comportement de fuite, inverse de seek
    flee(target) {
        return this.seek(target).mult(-1);
    }

    // applyForce est une méthode qui permet d'appliquer une force au véhicule
    applyForce(force) {
        this.acc.add(force);
    }

    // appelée 60 fois par seconde par la boucle d'animation
    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.set(0, 0);
    }

    // On dessine le véhicule
    show() {
        push();
        stroke("white");
        strokeWeight(2);
        fill("blue");

        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());

        // Dessin d'un véhicule sous la forme d'un triangle
        triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);

        // Debug: cercle de perception
        if (window.debugMode) {
            noFill();
            stroke("rgba(255, 255, 255, 0.2)");
            circle(0, 0, this.perceptionRadius * 2);
        }

        pop();

        if (window.debugMode) {
            this.drawVelocityVector();
        }
    }

    drawVelocityVector() {
        push();
        strokeWeight(3);
        stroke("red");
        line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 10, this.pos.y + this.vel.y * 10);
        pop();
    }

    // Boundaries behavior from professor's code
    // Exerts a steering force to keep vehicle within a rectangle
    // When approaching an edge, calculates desired velocity reflected away from the edge
    boundaries(bx, by, bw, bh, d) {
        let vitesseDesiree = null;

        const xBordGauche = bx + d;
        const xBordDroite = bx + bw - d;
        const yBordHaut = by + d;
        const yBordBas = by + bh - d;

        // If vehicle is too close to left or right edge
        if (this.pos.x < xBordGauche) {
            vitesseDesiree = createVector(this.maxSpeed, this.vel.y);
        } else if (this.pos.x > xBordDroite) {
            vitesseDesiree = createVector(-this.maxSpeed, this.vel.y);
        }

        // If vehicle is too close to top or bottom edge
        if (this.pos.y < yBordHaut) {
            vitesseDesiree = createVector(this.vel.x, this.maxSpeed);
        } else if (this.pos.y > yBordBas) {
            vitesseDesiree = createVector(this.vel.x, -this.maxSpeed);
        }

        if (vitesseDesiree !== null) {
            vitesseDesiree.setMag(this.maxSpeed);
            const force = p5.Vector.sub(vitesseDesiree, this.vel);
            force.limit(this.maxForce);
            return force;
        }

        return createVector(0, 0);
    }

    // Wrap-around edges (when boundaries are disabled)
    edges() {
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
}
