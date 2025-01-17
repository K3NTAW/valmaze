const canvas = document.getElementById('labyrinth');
const ctx = canvas.getContext('2d');
const solution = document.getElementById('solution');
const checkButton = document.getElementById('checkButton');
const valentine = document.getElementById('valentine');
const resetButton = document.getElementById('resetButton');

const CANVAS_SIZE = 800;
const CELL_SIZE = 2;
let currentMaze = 1;
let highestUnlockedMaze = 1;
let mazeImage = new Image();
let playerX = 30;  // Will be set when maze loads
let playerY = 30;  // Will be set when maze loads
let pathHistory = [];

// Load maze image and find starting position
function loadMaze(mazeNumber) {
    // Strict check for locked mazes
    if (mazeNumber > highestUnlockedMaze) {
        console.error('Cannot load locked maze');
        return Promise.reject('Maze is locked');
    }
    
    currentMaze = mazeNumber;
    return new Promise((resolve, reject) => {
        mazeImage = new Image();
        mazeImage.onload = () => {
            // Draw maze to canvas temporarily to find starting position
            ctx.drawImage(mazeImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
            
            // Find the red dot in the maze
            let startFound = false;
            let dotSize = 0;  // Will store the detected dot size
            
            // Search through the entire maze for the red dot
            const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
            for (let y = 0; y < CANVAS_SIZE && !startFound; y++) {
                for (let x = 0; x < CANVAS_SIZE && !startFound; x++) {
                    const idx = (y * CANVAS_SIZE + x) * 4;
                    const r = imageData[idx];
                    const g = imageData[idx + 1];
                    const b = imageData[idx + 2];
                    
                    // More lenient red detection
                    if (r > 100 && // Lower red threshold
                        g < 100 && 
                        b < 100 && 
                        (r - Math.max(g, b)) > 50) { // Less strict red dominance
                        
                        // Find the size of the dot by scanning outward
                        let maxRadius = 0;
                        let scanning = true;
                        let radius = 0;
                        
                        while (scanning && radius < 20) { // Limit max scan radius
                            radius++;
                            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                                const checkX = Math.round(x + radius * Math.cos(angle));
                                const checkY = Math.round(y + radius * Math.sin(angle));
                                
                                if (checkX >= 0 && checkX < CANVAS_SIZE && 
                                    checkY >= 0 && checkY < CANVAS_SIZE) {
                                    const checkIdx = (checkY * CANVAS_SIZE + checkX) * 4;
                                    const checkR = imageData[checkIdx];
                                    const checkG = imageData[checkIdx + 1];
                                    const checkB = imageData[checkIdx + 2];
                                    
                                    if (checkR > 100 && checkG < 100 && checkB < 100 && 
                                        (checkR - Math.max(checkG, checkB)) > 50) {
                                        maxRadius = radius;
                                    } else {
                                        scanning = false;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (maxRadius > 0) {
                            dotSize = maxRadius;
                            playerX = x;
                            playerY = y;
                            startFound = true;
                            console.log(`Found red dot at x=${x}, y=${y} with size=${dotSize}`);
                            
                            // Draw a temporary marker to show where we detected the dot
                            ctx.strokeStyle = 'yellow';
                            ctx.beginPath();
                            ctx.arc(x, y, maxRadius, 0, Math.PI * 2);
                            ctx.stroke();
                            
                            setTimeout(() => {
                                drawMaze();
                            }, 1000);
                        }
                    }
                }
            }
            
            if (!startFound) {
                console.error('No red dot found in maze');
                playerX = 30;
                playerY = 30;
                dotSize = 5; // Default size
            }
            
            // Store the dot size for use in drawMaze
            window.currentDotSize = dotSize;
            
            // Reset path
            pathHistory = [];
            drawMaze();
            resolve();
        };
        mazeImage.onerror = (e) => {
            console.error('Error loading maze:', e);
            reject(e);
        };
        mazeImage.src = `mazes/maze${mazeNumber}.png`;
    });
}

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the maze image
    ctx.drawImage(mazeImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw path
    if (pathHistory.length > 0) {
        // Draw glow
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(pathHistory[0].x, pathHistory[0].y);
        pathHistory.forEach((point, index) => {
            if (index > 0) {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
        
        // Draw main path
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pathHistory[0].x, pathHistory[0].y);
        pathHistory.forEach((point, index) => {
            if (index > 0) {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
    }
    
    // Draw player with glow effect
    ctx.fillStyle = 'rgba(255, 77, 77, 0.3)';
    ctx.beginPath();
    ctx.arc(playerX, playerY, CELL_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#0066ff';  // Changed to blue
    ctx.beginPath();
    ctx.arc(playerX, playerY, window.currentDotSize || 5, 0, Math.PI * 2);
    ctx.fill();
}

function checkCollision(x, y) {
    // Check multiple points around the player to prevent wall clipping
    const points = [
        {x: x, y: y},                           // Center
        {x: x - CELL_SIZE/3, y: y},            // Left
        {x: x + CELL_SIZE/3, y: y},            // Right
        {x: x, y: y - CELL_SIZE/3},            // Top
        {x: x, y: y + CELL_SIZE/3},            // Bottom
        {x: x - CELL_SIZE/3, y: y - CELL_SIZE/3}, // Top-left
        {x: x + CELL_SIZE/3, y: y - CELL_SIZE/3}, // Top-right
        {x: x - CELL_SIZE/3, y: y + CELL_SIZE/3}, // Bottom-left
        {x: x + CELL_SIZE/3, y: y + CELL_SIZE/3}  // Bottom-right
    ];

    // Check if any of these points hit a wall (black pixel)
    return points.some(point => {
        if (point.x < 0 || point.x >= CANVAS_SIZE || point.y < 0 || point.y >= CANVAS_SIZE) {
            return true; // Out of bounds
        }
        const imageData = ctx.getImageData(point.x, point.y, 1, 1).data;
        // Check if the pixel is close to black (allowing for some image compression artifacts)
        return imageData[0] < 50 && imageData[1] < 50 && imageData[2] < 50;
    });
}

function updateMazeProgress() {
    const mazeItems = document.querySelectorAll('.maze-item');
    mazeItems.forEach(item => {
        const mazeNum = parseInt(item.dataset.maze);
        item.classList.remove('current');
        
        if (mazeNum <= highestUnlockedMaze) {
            item.classList.remove('locked');
            item.style.cursor = 'pointer';
            if (mazeNum === currentMaze) {
                item.classList.add('current');
                item.textContent = `Maze ${mazeNum} 🎮`;
                resetButton.textContent = `Reset Maze ${mazeNum} 🔄`;
            } else if (mazeNum < currentMaze) {
                item.classList.add('completed');
                item.textContent = `Maze ${mazeNum} ✅`;
            } else {
                item.textContent = `Maze ${mazeNum} 🔓`;
            }
        } else {
            item.classList.add('locked');
            item.style.cursor = 'not-allowed';
            item.textContent = `Maze ${mazeNum} 🔒`;
        }
    });
}

function nextMaze() {
    if (currentMaze === highestUnlockedMaze && currentMaze < 6) {
        highestUnlockedMaze++;
    }
    if (currentMaze < 6) {
        currentMaze++;
        loadMaze(currentMaze);
        updateMazeProgress();
    } else if (currentMaze === 6) {
        // Show password when maze 6 is completed
        alert("Congratulations! You've completed all mazes! The password is: I<3u4ever");
    }
}

document.addEventListener('keydown', (e) => {
    let newX = playerX;
    let newY = playerY;
    const speed = 5; // Increased from 3 to 5 for faster movement

    switch(e.key.toLowerCase()) {
        case 'w': newY -= speed; break;
        case 's': newY += speed; break;
        case 'a': newX -= speed; break;
        case 'd': newX += speed; break;
        default: return; // Ignore other keys
    }

    if (!checkCollision(newX, newY)) {
        playerX = newX;
        playerY = newY;
        pathHistory.push({x: playerX, y: playerY});
        drawMaze();
        
        // Check if player reached the exit (check for white pixels in bottom-right area)
        const exitArea = ctx.getImageData(CANVAS_SIZE - 50, CANVAS_SIZE - 50, 40, 40).data;
        const isInExitArea = playerX > CANVAS_SIZE - 50 && 
                            playerY > CANVAS_SIZE - 50 &&
                            exitArea.some((val, index) => index % 4 === 0 && val > 200);
        
        if (isInExitArea) {
            nextMaze();
        }
    }
});

function createHeart() {
    const heart = document.createElement('div');
    heart.classList.add('floating-heart');
    heart.innerHTML = ['❤️', '💖', '💝', '💕', '💗'][Math.floor(Math.random() * 5)];
    heart.style.left = Math.random() * 90 + 5 + 'vw'; // Keep away from edges
    heart.style.animationDuration = (Math.random() * 3 + 2) + 's';
    heart.style.fontSize = (Math.random() * 30 + 24) + 'px'; // Larger size range
    document.body.appendChild(heart);
    
    setTimeout(() => {
        heart.remove();
    }, 5000);
}

function createFirework() {
    const firework = document.createElement('div');
    firework.classList.add('firework');
    firework.style.left = Math.random() * 80 + 10 + 'vw'; // Keep away from edges
    firework.style.top = Math.random() * 40 + 5 + 'vh'; // Keep in upper portion
    document.body.appendChild(firework);

    // Create particles
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.setProperty('--angle', (i * 18) + 'deg');
        particle.style.setProperty('--speed', (Math.random() * 0.5 + 0.5) + 's');
        particle.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 60%)`; // Brighter colors
        firework.appendChild(particle);
    }

    setTimeout(() => {
        firework.remove();
    }, 1000);
}

function startCelebration() {
    valentine.classList.remove('hidden');
    // Create hearts continuously
    setInterval(createHeart, 200);
    // Create fireworks
    setInterval(createFirework, 800);
    
    // Add sparkle effect to text
    const text = valentine.querySelectorAll('h2, h3');
    text.forEach(element => {
        element.classList.add('sparkle');
    });
}

// Reset functionality
function resetMaze() {
    // Clear the path
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the maze
    ctx.drawImage(mazeImage, 0, 0, canvas.width, canvas.height);
    
    // Reset player position to start
    const startPos = findStartPosition();
    if (startPos) {
        playerX = startPos.x;
        playerY = startPos.y;
        drawPlayer();
    }
    
    // Update button text to show current maze
    resetButton.textContent = `Reset Maze ${currentMaze} 🔄`;
}

resetButton.addEventListener('click', resetMaze);

// Add click event listeners to maze items
document.querySelectorAll('.maze-item').forEach(item => {
    item.addEventListener('click', () => {
        const mazeNum = parseInt(item.dataset.maze);
        if (mazeNum > highestUnlockedMaze) {
            // Prevent loading locked mazes
            console.error('This maze is locked! Complete the previous maze first.');
            return;
        }
        currentMaze = mazeNum;
        loadMaze(mazeNum).catch(error => {
            console.error('Failed to load maze:', error);
        });
        updateMazeProgress();
    });
});

// Add click event listener for the check button
checkButton.addEventListener('click', () => {
    const password = solution.value.trim();
    if (password === 'I<3u4ever') {
        startCelebration();
    }
});

// Initialize with all mazes unlocked
document.addEventListener('DOMContentLoaded', () => {
    currentMaze = 1;
    highestUnlockedMaze = 6; // Set to 6 to unlock all mazes
    loadMaze(1);
    updateMazeProgress();
    resetButton.textContent = 'Reset Maze 1 🔄';
});

function findStartPosition() {
    // Draw maze to canvas temporarily to find starting position
    ctx.drawImage(mazeImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Find the red dot in the maze
    let startFound = false;
    let dotSize = 0;  // Will store the detected dot size
    let startPos = null;
    
    // Search through the entire maze for the red dot
    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    for (let y = 0; y < CANVAS_SIZE && !startFound; y++) {
        for (let x = 0; x < CANVAS_SIZE && !startFound; x++) {
            const idx = (y * CANVAS_SIZE + x) * 4;
            const r = imageData[idx];
            const g = imageData[idx + 1];
            const b = imageData[idx + 2];
            
            // More lenient red detection
            if (r > 100 && // Lower red threshold
                g < 100 && 
                b < 100 && 
                (r - Math.max(g, b)) > 50) { // Less strict red dominance
                
                // Find the size of the dot by scanning outward
                let maxRadius = 0;
                let scanning = true;
                let radius = 0;
                
                while (scanning && radius < 20) { // Limit max scan radius
                    radius++;
                    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                        const checkX = Math.round(x + radius * Math.cos(angle));
                        const checkY = Math.round(y + radius * Math.sin(angle));
                        
                        if (checkX >= 0 && checkX < CANVAS_SIZE && 
                            checkY >= 0 && checkY < CANVAS_SIZE) {
                            const checkIdx = (checkY * CANVAS_SIZE + checkX) * 4;
                            const checkR = imageData[checkIdx];
                            const checkG = imageData[checkIdx + 1];
                            const checkB = imageData[checkIdx + 2];
                            
                            if (checkR > 100 && checkG < 100 && checkB < 100 && 
                                (checkR - Math.max(checkG, checkB)) > 50) {
                                maxRadius = radius;
                            } else {
                                scanning = false;
                                break;
                            }
                        }
                    }
                }
                
                if (maxRadius > 0) {
                    dotSize = maxRadius;
                    startPos = {x, y};
                    startFound = true;
                    console.log(`Found red dot at x=${x}, y=${y} with size=${dotSize}`);
                }
            }
        }
    }
    
    return startPos;
}

function drawPlayer() {
    // Draw player with glow effect
    ctx.fillStyle = 'rgba(255, 77, 77, 0.3)';
    ctx.beginPath();
    ctx.arc(playerX, playerY, CELL_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#0066ff';  // Changed to blue
    ctx.beginPath();
    ctx.arc(playerX, playerY, window.currentDotSize || 5, 0, Math.PI * 2);
    ctx.fill();
}
