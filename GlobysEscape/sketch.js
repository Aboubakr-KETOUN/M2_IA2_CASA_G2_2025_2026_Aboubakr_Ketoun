let player;
let predators = [];
let debugMode = false;
let boundariesEnabled = false; // OFF by default, B key toggles ON

// Level Configuration System
const LEVEL_CONFIG = {
    1: {
        name: "Level 1: The Zombie (Seek)",
        predatorCount: 1,
        predatorConfig: { maxSpeed: 1, maxForce: 0.05, seek: true, seekWeight: 1, image: 'dumb' }
    },
    2: {
        name: "Level 2: The Stalker (Arrive)",
        predatorCount: 2,
        predatorConfig: { maxSpeed: 2, maxForce: 0.1, arrive: true, wander: true, wanderWeight: 0.5, image: 'hunter' }
    },
    3: {
        name: "Level 3: The Hunter (Avoidance)",
        predatorCount: 1,
        predatorConfig: { maxSpeed: 3, maxForce: 0.2, pursue: true, avoidObstacles: true, image: 'smart' }
    },
    4: {
        name: "Level 4: The Sniper (Pack)",
        predatorCount: 3,
        predatorConfig: { maxSpeed: 4, maxForce: 0.25, pursue: true, avoidObstacles: true, separation: true, image: 'pack' }
    },
    5: {
        name: "Level 5: The Boss (Neural AI)",
        predatorCount: 1,
        predatorConfig: {
            image: 'boss',
            isBoss: true
        }
    }
};

let currentLevel = 1;
let walls = [];
let imgDumb, imgSmart, imgHunter, imgPack;
let imgPlayer, imgGround, imgBoss;
let imgColumn, imgGraveyard, imgRocks, imgTree, imgTunnel; // Obstacle images
let loadedBrain = null;
let bgMusic; // Background music

// Survival Vars
let levelStartTime = 0;
let levelDuration = 30000; // 30 seconds per level (FIXED)
let trainingPhase = false;
let trainingTimer = 0;
let topBrains = [];

// --- COMBAT SYSTEM VARIABLES ---
let arrows = [];
let spawnTimer = 0;
let gameState = 'start'; // 'start', 'playing', 'gameover', 'levelcomplete'
let bestLevelReached = 1; // Milestone tracking

// --- GENETIC ALGORITHM VARIABLES (Professor's Pattern) ---
let trainingMode = false;
let gaPopulation = null; // Population class instance
const POP_SIZE = 100;
const lifetime = 300; // Lifespan of each rocket (frames)
const MUTATION_RATE = 0.01;
let lifeCounter = 0;
let population = []; // Neural Population

function preload() {
    imgDumb = loadImage('assets/The_Dumb_One.png');
    imgHunter = loadImage('assets/The_Controller_Hunter.png');
    imgSmart = loadImage('assets/The_Smart_Hunter.png');
    imgPack = loadImage('assets/The_Pack_Leader.png');
    imgPlayer = loadImage('assets/The_Player_Globy.png');
    imgGround = loadImage('assets/The_Ground.png');
    imgBoss = loadImage('assets/The_Boss.png');

    // Obstacle images
    imgColumn = loadImage('assets/Column.png');
    imgGraveyard = loadImage('assets/Graveyard.png');
    imgRocks = loadImage('assets/Rocks.png');
    imgTree = loadImage('assets/Tree.png');
    imgTunnel = loadImage('assets/Tunnel.png');

    // Background music
    bgMusic = loadSound('assets/videoplayback.weba');
}

function setup() {
    // Canvas is 90% of the window size
    let newWidth = windowWidth * 0.9;
    let newHeight = windowHeight * 0.9;
    let canvas = createCanvas(newWidth, newHeight);
    canvas.parent('canvas-container');

    // Resize background to fit the new canvas size
    imgGround.resize(newWidth, newHeight);

    // Map string keys to actual image objects
    const imgMap = { 'dumb': imgDumb, 'smart': imgSmart, 'hunter': imgHunter, 'pack': imgPack, 'boss': imgBoss };
    for (let key in LEVEL_CONFIG) {
        LEVEL_CONFIG[key].predatorConfig.imgObject = imgMap[LEVEL_CONFIG[key].predatorConfig.image];
    }

    // Setup File Uploader Listener
    const msg = document.getElementById('brain-uploader');
    if (msg) {
        msg.addEventListener('change', handleFileSelect, false);
    }

    // Create Obstacle Images Array (used to add one per level)
    obstacleImages = [imgColumn, imgGraveyard, imgRocks, imgTree, imgTunnel];

    // Initialize walls array (will be populated per level)
    walls = [];

    // Create Player
    player = new Player(width / 2, height / 2, imgPlayer);

    // Expose boundaries toggle to window for Player to access
    window.boundariesEnabled = boundariesEnabled;

    // Initialize standard game
    startLevel(currentLevel);

    // Start background music (loop)
    if (bgMusic) {
        bgMusic.setVolume(0.3);
        bgMusic.loop();
    }

    // Hide Loading Screen
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }

    // Attempt to load trained brains
    loadBrainsFromStorage();

    // Initialize checkpoint UI
    initCheckpointUI();
}

// File Load Handler
function handleFileSelect(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const json = JSON.parse(e.target.result);
        console.log("Brain Loaded!", json);

        // Reconstruct Brain from JSON
        // We need to handle the Matrix reconstruction carefully since JSON just has raw data
        try {
            // Create a dummy network to start (must match NeuralPredator architecture)
            loadedBrain = new NeuralNetwork(13, 16, 2);

            // Hydrate weights - assuming json structure matches NeuralNetwork class
            // Ideally we'd add a 'fromJSON' method to NeuralNetwork, but manually works too:
            if (json.weights_ih) {
                loadedBrain.weights_ih.data = json.weights_ih.data;
                loadedBrain.weights_ho.data = json.weights_ho.data;
                loadedBrain.bias_h.data = json.bias_h.data;
                loadedBrain.bias_o.data = json.bias_o.data;

                alert("Brain Loaded Successfully! Starting Level 5.");
                startLevel(5);
            }
        } catch (err) {
            console.error("Error parsing brain:", err);
            alert("Invalid brain file.");
        }
    };
    reader.readAsText(file);
    // Reset file input so we can load same file again if needed
    evt.target.value = '';
}

function startLevel(levelIdx) {
    if (!LEVEL_CONFIG[levelIdx]) return;

    // Special handling for loading boss level if brain isn't ready
    // Special handling for loading boss level if brain isn't ready
    if (levelIdx === 5 && !loadedBrain && topBrains.length === 0) {
        // Trigger file upload if no topBrains and no loadedBrain
        document.getElementById('brain-uploader').click();
        return;
    }

    currentLevel = levelIdx;
    levelStartTime = millis(); // Reset Timer
    predators = [];
    arrows = []; // Clear arrows
    let config = LEVEL_CONFIG[levelIdx];

    // Wave system variables
    waveCount = 0;
    waveTimer = millis();

    // Add obstacles based on level (cumulative - level 1 = 1 obstacle, level 5 = 5 obstacles)
    walls = [];
    for (let i = 0; i < levelIdx && i < obstacleImages.length; i++) {
        let obstacleSize = 300;  // Bigger obstacles
        let x, y;
        let validPos = false;
        let attempts = 0;

        // Find valid position (not too close to player spawn, not overlapping other obstacles)
        while (!validPos && attempts < 50) {
            x = random(120, width - 120);
            y = random(120, height - 120);
            validPos = true;

            // Check distance from center (player spawn)
            if (dist(x, y, width / 2, height / 2) < 150) {
                validPos = false;
            }

            // Check overlap with existing obstacles
            for (let w of walls) {
                if (dist(x, y, w.x + w.w / 2, w.y + w.h / 2) < 120) {
                    validPos = false;
                    break;
                }
            }
            attempts++;
        }

        walls.push({
            x: x - obstacleSize / 2,
            y: y - obstacleSize / 2,
            w: obstacleSize,
            h: obstacleSize,
            img: obstacleImages[i],
            pos: createVector(x, y), // Center position for avoidance
            r: obstacleSize / 2       // Radius for collision
        });
    }

    // Expose obstacles to window for Player's avoid() method
    window.obstacles = walls;

    // Initial spawn: 2 predators from current level
    if (levelIdx !== 5) {
        let predConfig = Object.assign({}, config.predatorConfig, { level: levelIdx });
        for (let i = 0; i < 2; i++) {
            let x = random(width), y = random(height);
            while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }
            predators.push(new Predator(x, y, predConfig));
        }
    } else {
        // Boss Logic Level 5 - Use Rockets with trained DNA (Professor's GA Pattern)

        // Level 5 Wave Spawning - Start with 1 boss only
        // Waves will be handled by spawnL5Wave() called in draw loop
        l5WaveCount = 0;
        l5WaveTimer = millis();

        // Spawn initial 1 boss using trained DNA
        let x = random(width), y = random(height);
        while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }

        let brainUse = (topBrains.length > 0) ? topBrains[0] : (loadedBrain || new NeuralNetwork(13, 16, 2));
        let boss = new NeuralPredator(x, y, brainUse);
        boss.config = LEVEL_CONFIG[5].predatorConfig; // Ensure it looks like a boss
        predators.push(boss);
    }
}

// Wave System Variables (L1-L4)
let waveCount = 0;
let waveTimer = 0;
const WAVE_INTERVAL = 3000; // 3 seconds

function spawnLevelWave() {
    if (currentLevel >= 5 || trainingPhase) return;

    if (millis() < waveTimer + WAVE_INTERVAL) return;

    waveCount++;
    waveTimer = millis();

    let config = LEVEL_CONFIG[currentLevel];
    let predConfig = Object.assign({}, config.predatorConfig, { level: currentLevel });

    // Wave pattern:
    // Wave 1: 2 from current level
    // Wave 2: 2 from current + 2 from previous levels
    // Wave 3+: 2 from current + 3 from previous levels

    let currentToSpawn = 2;
    let previousToSpawn = 0;

    if (waveCount === 1) {
        previousToSpawn = 0;
    } else if (waveCount === 2) {
        previousToSpawn = 2;
    } else {
        previousToSpawn = 3;
    }

    // Spawn 2 from current level
    for (let i = 0; i < currentToSpawn; i++) {
        let x = random(width), y = random(height);
        while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }
        predators.push(new Predator(x, y, predConfig));
    }

    // Spawn from previous levels (if currentLevel > 1)
    if (currentLevel > 1 && previousToSpawn > 0) {
        for (let i = 0; i < previousToSpawn; i++) {
            let randomLvl = floor(random(1, currentLevel)); // 1 to currentLevel-1
            let lvlConfig = LEVEL_CONFIG[randomLvl];
            let prevConfig = Object.assign({}, lvlConfig.predatorConfig, { level: randomLvl });

            let x = random(width), y = random(height);
            while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }
            predators.push(new Predator(x, y, prevConfig));
        }
    }

    console.log(`L${currentLevel} Wave ${waveCount}: +${currentToSpawn} current + ${previousToSpawn} previous`);
}

// Level 5 Wave Variables
let l5WaveCount = 0;
let l5WaveTimer = 0;
const L5_WAVE_INTERVAL = 3000; // 3 seconds

function spawnL5Wave() {
    if (currentLevel !== 5 || trainingPhase) return;

    if (millis() < l5WaveTimer + L5_WAVE_INTERVAL) return;

    l5WaveCount++;
    l5WaveTimer = millis();

    let config = LEVEL_CONFIG[5];

    // Wave pattern:
    // Wave 1: 2 bosses
    // Wave 2: 3 bosses
    // Wave 3: 3 bosses + 2 random preds
    // Wave 4+: 3 bosses + 3 random preds

    let bossesToSpawn = 0;
    let predsToSpawn = 0;

    if (l5WaveCount === 1) {
        bossesToSpawn = 2;
    } else if (l5WaveCount === 2) {
        bossesToSpawn = 3;
    } else if (l5WaveCount === 3) {
        bossesToSpawn = 3;
        predsToSpawn = 2;
    } else {
        bossesToSpawn = 3;
        predsToSpawn = 3;
    }

    // Spawn bosses
    for (let i = 0; i < bossesToSpawn; i++) {
        let x = random(width), y = random(height);
        while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }

        let brainUse = loadedBrain;
        if (topBrains.length > 0) brainUse = topBrains[i % topBrains.length];

        let predator = new NeuralPredator(x, y, brainUse);
        predator.config = config.predatorConfig;
        predators.push(predator);
    }

    // Spawn random predators from previous levels
    for (let i = 0; i < predsToSpawn; i++) {
        let randomLvl = floor(random(1, 5)); // 1-4
        let lvlConfig = LEVEL_CONFIG[randomLvl];
        let predConfig = Object.assign({}, lvlConfig.predatorConfig, { level: randomLvl });

        let x = random(width), y = random(height);
        while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }
        predators.push(new Predator(x, y, predConfig));
    }

    console.log(`L5 Wave ${l5WaveCount}: Spawned ${bossesToSpawn} bosses + ${predsToSpawn} predators`);
}

function draw() {
    background(imgGround);

    // Only run game logic if playing
    if (gameState !== 'playing') return;

    // Draw Boundaries/Walls
    if (boundariesEnabled) {
        noFill();
        stroke("red");
        strokeWeight(4);
        rect(0, 0, width, height);
    }

    // Draw Obstacles with images
    for (let w of walls) {
        if (w.img) {
            image(w.img, w.x, w.y, w.w, w.h);
        } else {
            fill(100);
            stroke(200);
            strokeWeight(2);
            rect(w.x, w.y, w.w, w.h);
        }
    }

    // Update Player and check obstacle collision
    player.update();
    checkPlayerObstacleCollision(); // Player can't pass obstacles
    player.show();

    // Check Game Over
    if (player.health <= 0) {
        gameState = 'gameover';
        document.getElementById('gameover-overlay').style.display = 'flex';
        document.getElementById('final-score').textContent = `You reached Level ${currentLevel}`;

        // Show checkpoint button if player has reached a milestone
        if (bestLevelReached > 1) {
            document.getElementById('gameover-checkpoint-btn').style.display = 'block';
        }
        return;
    }

    // Process Arrows
    for (let i = arrows.length - 1; i >= 0; i--) {
        let a = arrows[i];
        a.applyBehaviors(predators);
        a.update();
        a.show();
        a.checkHits(predators);
        if (a.dead) arrows.splice(i, 1);
    }

    // Remove dead predators
    predators = predators.filter(p => !p.dead);

    // Wave Spawning System
    if (currentLevel < 5 && !trainingPhase) {
        spawnLevelWave();
    } else if (currentLevel === 5) {
        spawnL5Wave();
    }

    if (trainingMode) {
        runTrainingLoop();
    } else {
        runGameLoop();

        // Check Level Timer
        if (currentLevel < 5) {
            let elapsed = millis() - levelStartTime;
            if (elapsed > levelDuration) {
                // Show level complete overlay instead of auto-advancing
                showLevelComplete();
            }
        }
    }

    // Handle Training Phase (Professor's GA Pattern - Adapted for Neural Networks)
    if (trainingPhase) {
        runTrainingLoop(); // Uses NeuralPredator population
        checkTrainingComplete();
    }

    drawUI();
}

// --- TRAINING PHASE FUNCTIONS (Neuroevolution) ---
const TRAINING_DURATION = 120000; // 120 seconds

function startTrainingPhase() {
    trainingPhase = true;
    trainingTimer = millis();
    lifeCounter = 0;

    // Initialize Neural Population
    startTraining();

    console.log("TRAINING PHASE STARTED - Evolving Neural Predators!");
}

function runGATrainingLoop() {
    if (!trainingPhase || !gaPopulation) return;

    // Run all rockets for one frame
    gaPopulation.live(walls);
    lifeCounter++;

    // Show generation stats
    fill(255);
    textSize(16);
    text(`Generation: ${gaPopulation.getGenerations()} | Life: ${lifeCounter}/${lifetime}`, 10, 100);

    // End of generation (lifetime reached or all dead)
    if (lifeCounter >= lifetime || gaPopulation.allDead()) {
        // Fitness calculation
        gaPopulation.calcFitness();

        // Selection
        gaPopulation.selection();

        // Reproduction (crossover + mutation)
        gaPopulation.reproduction();

        // Reset life counter
        lifeCounter = 0;

        console.log(`Generation ${gaPopulation.getGenerations()} complete`);
    }
}

function checkTrainingComplete() {
    if (!trainingPhase) return;

    let elapsed = millis() - trainingTimer;
    if (elapsed > TRAINING_DURATION) {
        console.log("TRAINING COMPLETE! Capturing best brains...");
        captureTopBrains(); // Capture Neural Brains
        trainingPhase = false;
        trainingMode = false;
        gaPopulation = null;
        console.log("Starting Boss Level 5!");
        startLevel(5);
    }
}

function captureTopRockets() {
    if (!gaPopulation) return;

    // Calculate final fitness
    gaPopulation.calcFitness();

    // Get and save the best rockets' DNA
    let bestRockets = [];
    let sorted = [...gaPopulation.population].sort((a, b) => b.getFitness() - a.getFitness());

    // Capture top 3
    topBrains = [];
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
        topBrains.push(sorted[i].getDNA());
    }

    // Save to localStorage
    try {
        let dnaData = topBrains.map(dna => ({
            genes: dna.genes.map(v => ({ x: v.x, y: v.y }))
        }));
        localStorage.setItem('globyEscapeTopRockets', JSON.stringify(dnaData));
        console.log("Top 3 rocket DNA saved to localStorage!");
    } catch (e) {
        console.error("Failed to save rockets to localStorage:", e);
    }
}

function loadBrainsFromStorage() {
    try {
        let jsonStr = localStorage.getItem('globysEscape_neural');
        if (jsonStr) {
            let savedBrains = JSON.parse(jsonStr);
            // savedBrains should be an array of serialized NN strings
            topBrains = savedBrains.map(str => {
                let data = JSON.parse(str);
                let nn = new NeuralNetwork(13, 16, 2); // New architecture (13 inputs)
                // Manually restore weights/biases
                if (data.weights_ih) nn.weights_ih.data = data.weights_ih.data;
                if (data.weights_ho) nn.weights_ho.data = data.weights_ho.data;
                if (data.bias_h) nn.bias_h.data = data.bias_h.data;
                if (data.bias_o) nn.bias_o.data = data.bias_o.data;
                return nn;
            });
            console.log("Loaded " + topBrains.length + " trained brains from storage.");
        }
    } catch (e) {
        console.error("Failed to load brains from localStorage:", e);
    }
}

// Spawn a single predator (for timer spawning)
function spawnPredator() {
    let config = LEVEL_CONFIG[currentLevel];
    let x = random(width), y = random(height);
    while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }

    let predConfig = Object.assign({}, config.predatorConfig, { level: currentLevel });
    predators.push(new Predator(x, y, predConfig));
}

// Game Control Functions
function startGame() {
    gameState = 'playing';
    document.getElementById('start-overlay').style.display = 'none';
    currentLevel = 1;
    player.health = player.maxHealth;
    arrows = [];
    startLevel(1);
    spawnTimer = millis();
}

function startFromCheckpoint() {
    gameState = 'playing';
    document.getElementById('start-overlay').style.display = 'none';
    let savedLevel = loadMilestone();
    currentLevel = savedLevel;
    player.health = player.maxHealth;
    arrows = [];
    startLevel(savedLevel);
    spawnTimer = millis();
}

function continueToNextLevel() {
    document.getElementById('level-complete-overlay').style.display = 'none';
    gameState = 'playing';

    if (currentLevel === 4) {
        // Go to training phase
        startTrainingPhase();
    } else if (currentLevel < 5) {
        startLevel(currentLevel + 1);
    } else {
        // Boss level complete = YOU WIN!
        alert("Congratulations! You defeated the Boss!");
        restartGame();
    }
}

function showLevelComplete() {
    gameState = 'levelcomplete';
    let msg = `You completed ${LEVEL_CONFIG[currentLevel].name}!`;
    document.getElementById('level-complete-msg').textContent = msg;
    document.getElementById('level-complete-overlay').style.display = 'flex';

    // Save milestone if this is the best level
    if (currentLevel > bestLevelReached) {
        bestLevelReached = currentLevel;
        saveMilestone(currentLevel);
    }
}

function saveMilestone(level) {
    try {
        localStorage.setItem('globysEscape_milestone', level);
        console.log("Milestone saved: Level " + level);
    } catch (e) {
        console.error("Failed to save milestone", e);
    }
}

function loadMilestone() {
    try {
        let saved = localStorage.getItem('globysEscape_milestone');
        if (saved) return parseInt(saved);
    } catch (e) {
        console.error("Failed to load milestone", e);
    }
    return 1;
}

function initCheckpointUI() {
    let savedLevel = loadMilestone();
    bestLevelReached = savedLevel;
    if (savedLevel > 1) {
        document.getElementById('checkpoint-btn').style.display = 'block';
        document.getElementById('checkpoint-info').textContent = `Best: Level ${savedLevel}`;
    }
}

function restartGame() {
    document.getElementById('gameover-overlay').style.display = 'none';
    document.getElementById('gameover-checkpoint-btn').style.display = 'none';
    startGame();
}

function restartFromCheckpoint() {
    document.getElementById('gameover-overlay').style.display = 'none';
    document.getElementById('gameover-checkpoint-btn').style.display = 'none';
    startFromCheckpoint();
}

// Mouse Click = Shoot
function mousePressed() {
    if (gameState === 'playing') {
        arrows.push(player.shoot());
    }
}

function runGameLoop() {
    for (let p of predators) {
        // Check if it's a NeuralPredator (Boss) or Standard
        if (p instanceof NeuralPredator) {
            p.checkCollisions(walls); // Boss takes damage/dies
            p.think(player, walls);   // Boss thinks

            // BOSS DUPLICATION: If player detected and we have room, spawn a clone!
            if (p.playerDetectedThisFrame && predators.length < 15 && random() < 0.01) {
                // 1% chance per frame when player is detected
                let clone = new NeuralPredator(p.pos.x + random(-50, 50), p.pos.y + random(-50, 50), p.brain);
                clone.config = LEVEL_CONFIG[5].predatorConfig;
                predators.push(clone);
                console.log("BOSS DUPLICATED! Total bosses:", predators.length);
            }
        } else {
            // Standard Steering
            if (p.config.seek || p.config.arrive) {
                p.applyBehaviors(player, walls);
            } else {
                p.applyBehaviors(player, walls);
            }
        }

        p.edges();
        p.update();
        checkPredatorObstacleCollision(p); // Level 3+ can't pass obstacles
        p.show();

        // Check Collision with Player
        let d = dist(player.pos.x, player.pos.y, p.pos.x, p.pos.y);
        if (d < player.r + p.r) {
            player.takeDamage();
        }
    }

    // Check Boss Cloning (Level 5) - periodic spawn
    if (currentLevel === 5 && millis() > bossSpawnTimer + 10000) {
        spawnBossClone();
        bossSpawnTimer = millis();
    }
}

// --- GENETIC ALGORITHM LOOP ---
function runTrainingLoop() {
    let allDead = true;
    for (let p of population) {
        if (!p.dead) {
            p.checkCollisions(walls);
            p.think(player, walls);
            p.update();
            p.show();
            allDead = false;
        }
    }

    if (allDead) {
        nextGeneration();
    }
}

function startTraining() {
    trainingMode = true;
    generation = 1;
    population = [];
    for (let i = 0; i < POP_SIZE; i++) {
        population.push(new NeuralPredator(random(width), random(height)));
    }
}

function nextGeneration() {
    calculateFitness();

    let nextPop = [];
    for (let i = 0; i < POP_SIZE; i++) {
        let parent = pickOne();
        let childBrain = parent.brain.copy();
        childBrain.mutate(0.1); // 10% mutation rate

        let x = random(width);
        let y = random(height);
        // Safety buffer spawn
        while (dist(x, y, player.pos.x, player.pos.y) < 200) { x = random(width); y = random(height); }

        nextPop.push(new NeuralPredator(x, y, childBrain));
    }
    population = nextPop;
    generation++;
}

function calculateFitness() {
    let sum = 0;
    for (let p of population) {
        // Main fitness: how close did this predator get to the player?
        // closestDistToPlayer closer to 0 = better
        // Also include score (proximity bonuses accumulated during think())
        let closeness = 1 / (p.closestDistToPlayer + 1); // +1 to avoid divide by zero
        p.fitness = pow(closeness * 100 + p.score, 2); // Square for selection pressure
        sum += p.fitness;
    }
    // Normalize
    for (let p of population) {
        if (sum > 0) p.fitness = p.fitness / sum;
    }
}

// --- OBSTACLE COLLISION FUNCTIONS ---

// Player always collides with obstacles
function checkPlayerObstacleCollision() {
    for (let w of walls) {
        if (rectCircleColliding(w, player.pos, player.r)) {
            // Push player out of obstacle
            let obstacleCenter = createVector(w.x + w.w / 2, w.y + w.h / 2);
            let pushDir = p5.Vector.sub(player.pos, obstacleCenter);
            pushDir.normalize();
            pushDir.mult(5);
            player.pos.add(pushDir);
        }
    }
}

// Check if predator can pass through obstacles (level 1-2 can, level 3+ cannot)
function checkPredatorObstacleCollision(predator) {
    // Level 1 and 2 predators can pass through obstacles
    if (predator.config && predator.config.level <= 2) {
        return false; // No collision
    }

    // Level 3, 4, 5 and boss cannot pass through
    for (let w of walls) {
        if (rectCircleColliding(w, predator.pos, predator.r)) {
            // Push predator out of obstacle
            let obstacleCenter = createVector(w.x + w.w / 2, w.y + w.h / 2);
            let pushDir = p5.Vector.sub(predator.pos, obstacleCenter);
            pushDir.normalize();
            pushDir.mult(5);
            predator.pos.add(pushDir);
            return true;
        }
    }
    return false;
}

// Helper: Rectangle-Circle collision
function rectCircleColliding(rect, circlePos, circleR) {
    let closestX = constrain(circlePos.x, rect.x, rect.x + rect.w);
    let closestY = constrain(circlePos.y, rect.y, rect.y + rect.h);
    let distX = circlePos.x - closestX;
    let distY = circlePos.y - closestY;
    let distSq = (distX * distX) + (distY * distY);
    return distSq < (circleR * circleR);
}

function pickOne() {
    let index = 0;
    let r = random(1);
    while (r > 0) {
        r = r - population[index].fitness;
        index++;
    }
    index--;
    return population[index];
}

function saveBestBrain() {
    // Find highest score
    let best = population[0];
    for (let p of population) {
        if (p.score > best.score) best = p;
    }
    saveJSON(best.brain, 'best_predator_brain.json');
}

// --- UI & CONTROLS ---

function drawUI() {
    push();
    resetMatrix(); // Force drawing in screen coordinates to fix "stats on player" bug
    fill(255);
    noStroke();
    textSize(14);

    if (trainingMode) {
        text(`TRAINING MODE | Gen: ${generation} | Pop: ${population.length}`, 10, 20);
        text("Controls: WASD (Move Globy), S (Save Brain), T (Exit)", 10, 40);

        // Show some stats
        let liveCount = population.filter(p => !p.dead).length;
        text(`Alive: ${liveCount}`, 10, 60);
    } else {
        let timeLeft = Math.max(0, Math.ceil((levelDuration - (millis() - levelStartTime)) / 1000));

        text(`GAME MODE | ${LEVEL_CONFIG[currentLevel].name}`, 10, 20);
        text(`Time: ${timeLeft}s | Health: ${player.health}%`, 10, 40);

        // Draw Hearts Bar
        let hearts = Math.ceil(player.health / 25); // 4 hearts total
        let heartStr = "❤️".repeat(hearts);
        textSize(20);
        text(heartStr, 10, 70);

        text("Controls: Arrow Keys (Move), S (Shoot), D (Debug), B (Boundaries)", 10, 90);
    }

    if (loadedBrain && currentLevel === 5) {
        fill(0, 255, 0);
        text("BOSS BRAIN ACTIVE", width - 150, 20);
    }
    pop();
}

function keyPressed() {
    // D for Debug
    if (key === 'd' || key === 'D') {
        debugMode = !debugMode;
        window.debugMode = debugMode;
    }

    // S for Shoot
    if ((key === 's' || key === 'S') && gameState === 'playing') {
        arrows.push(player.shoot());
    }

    // B for Boundaries
    if (key === 'b' || key === 'B') {
        boundariesEnabled = !boundariesEnabled;
        window.boundariesEnabled = boundariesEnabled;
        console.log("Boundaries: " + (boundariesEnabled ? "ON (steering)" : "OFF (wrap-around)"));
    }

    // Level switching keys removed - progression is automatic

    // Prevent default browser scrolling for arrow keys
    if (keyCode === UP_ARROW || keyCode === DOWN_ARROW || keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
        return false;
    }
}

// --- GAUNTLET HELPERS ---
let bossSpawnTimer = 0;

function spawnBossClone() {
    if (predators.length > 20) return; // Limit cap
    // Pick a random existing boss to clone
    let parent = random(predators);
    // Or just use top brains if available
    let brainUse;
    if (topBrains.length > 0) {
        brainUse = random(topBrains);
    } else {
        brainUse = (parent instanceof NeuralPredator) ? parent.brain : loadedBrain;
    }

    if (brainUse) {
        // Spawn new
        let clone = new NeuralPredator(random(width), random(height), brainUse);
        clone.config = LEVEL_CONFIG[5].predatorConfig;
        predators.push(clone);
    }
}

function startTrainingPhase() {
    trainingPhase = true;
    levelStartTime = millis();
    levelDuration = 30000; // 30 seconds training
    startTraining(); // Reset and init pop
}

function captureTopBrains() {
    // Sort population by fitness/score
    population.sort((a, b) => b.score - a.score);

    topBrains = [];
    // Save top 3
    for (let i = 0; i < Math.min(3, population.length); i++) {
        if (population[i]) topBrains.push(population[i].brain.copy());
    }

    // Save to localStorage
    try {
        // We need to serialize the NeuralNetwork objects
        // A simple JSON.stringify might work if the structure is clean, 
        // but let's be safe and just rely on the object structure.
        const serialized = topBrains.map(b => JSON.stringify(b));
        localStorage.setItem('globysEscape_neural', JSON.stringify(serialized));
        console.log("Captured Top 3 Neural Brains and saved to localStorage!", topBrains);
    } catch (e) {
        console.error("Failed to save brains to localStorage", e);
    }
}
