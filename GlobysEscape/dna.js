// DNA class for Genetic Algorithm
// Adapted from professor's 10-missiles genetic algo pattern

class DNA {
    constructor(newgenes) {
        // The maximum strength of the forces
        this.maxforce = 0.2;

        if (newgenes) {
            this.genes = newgenes;
        } else {
            // Generate random genes (array of force vectors for each timestep)
            this.genes = [];
            for (let i = 0; i < lifetime; i++) {
                let angle = random(TWO_PI);
                this.genes[i] = createVector(cos(angle), sin(angle));
                this.genes[i].mult(random(0, this.maxforce));
            }
        }

        // Normalize the first gene for consistent starting direction
        this.genes[0].normalize();
    }

    // Crossover: combine genes from two parents
    crossover(partner) {
        let child = new Array(this.genes.length);
        // Pick a midpoint for crossover
        let crossover = int(random(this.genes.length));
        for (let i = 0; i < this.genes.length; i++) {
            if (i > crossover) {
                child[i] = this.genes[i].copy();
            } else {
                child[i] = partner.genes[i].copy();
            }
        }
        let newgenes = new DNA(child);
        return newgenes;
    }

    // Mutation: randomly change some genes
    mutate(m) {
        for (let i = 0; i < this.genes.length; i++) {
            if (random(1) < m) {
                let angle = random(TWO_PI);
                this.genes[i] = createVector(cos(angle), sin(angle));
                this.genes[i].mult(random(0, this.maxforce));

                if (i == 0) this.genes[i].normalize();
            }
        }
    }
}
