// Population class for Genetic Algorithm
// Adapted from professor's 10-missiles genetic algo pattern

class Population {
    constructor(m, num, target) {
        this.mutationRate = m;
        this.population = new Array(num);
        this.matingPool = [];
        this.generations = 0;
        this.target = target; // The player (target to chase)

        // Initialize population with Rockets
        for (let i = 0; i < this.population.length; i++) {
            let x = random(width);
            let y = random(height);
            // Ensure spawn away from player
            while (dist(x, y, target.pos.x, target.pos.y) < 200) {
                x = random(width);
                y = random(height);
            }
            this.population[i] = new Rocket(x, y, new DNA(), target);
        }
    }

    // Run all rockets for one frame
    live(walls) {
        for (let i = 0; i < this.population.length; i++) {
            this.population[i].checkTarget();
            this.population[i].run(walls);
        }
    }

    // Did any rocket reach the target?
    targetReached() {
        for (let i = 0; i < this.population.length; i++) {
            if (this.population[i].hitTarget) return true;
        }
        return false;
    }

    // Calculate fitness for each rocket
    calcFitness() {
        for (let i = 0; i < this.population.length; i++) {
            this.population[i].calcFitness();
        }
    }

    // Generate a mating pool based on fitness
    selection() {
        this.matingPool = [];

        // Find maximum fitness
        let maxFitness = this.getMaxFitness();

        // Create mating pool with fitness-proportional representation
        for (let i = 0; i < this.population.length; i++) {
            let fitnessNormal = map(
                this.population[i].getFitness(),
                0,
                maxFitness,
                0,
                1
            );
            let n = int(fitnessNormal * 120);
            for (let j = 0; j < n; j++) {
                this.matingPool.push(this.population[i]);
            }
        }
    }

    // Making the next generation
    reproduction() {
        // Refill the population with children from the mating pool
        for (let i = 0; i < this.population.length; i++) {
            let m = int(random(this.matingPool.length));
            let d = int(random(this.matingPool.length));
            let mom = this.matingPool[m];
            let dad = this.matingPool[d];
            let momgenes = mom.getDNA();
            let dadgenes = dad.getDNA();
            let child = momgenes.crossover(dadgenes);
            child.mutate(this.mutationRate);

            let x = random(width);
            let y = random(height);
            while (dist(x, y, this.target.pos.x, this.target.pos.y) < 200) {
                x = random(width);
                y = random(height);
            }
            this.population[i] = new Rocket(x, y, child, this.target);
        }
        this.generations++;
    }

    getGenerations() {
        return this.generations;
    }

    // Find highest fitness for the population
    getMaxFitness() {
        let record = 0;
        for (let i = 0; i < this.population.length; i++) {
            if (this.population[i].getFitness() > record) {
                record = this.population[i].getFitness();
            }
        }
        return record;
    }

    // Get the best rocket (for saving)
    getBestRocket() {
        let maxFitness = 0;
        let best = null;
        for (let p of this.population) {
            if (p.getFitness() > maxFitness) {
                maxFitness = p.getFitness();
                best = p;
            }
        }
        return best;
    }

    // Show all rockets
    show() {
        for (let p of this.population) {
            p.display();
        }
    }

    // Check if all rockets are dead/stopped
    allDead() {
        for (let p of this.population) {
            if (!p.stopped()) return false;
        }
        return true;
    }
}
