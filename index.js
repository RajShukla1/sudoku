/* Responsive Sudoku — script.js
   - Local generator & solver (backtracking)
   - Click tile -> type 1-9 or use number pad
   - New Game (difficulty), Solve, Hint
   - Timer & Lives
*/

///// DOM helpers /////
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));
const id = (s) => document.getElementById(s);

///// UI elements /////
const boardEl = id("board");
const newGameBtn = id("newGame");
const solveBtn = id("solveBtn");
const hintBtn = id("hintBtn");
const difficultySel = id("difficulty");
const timeLimitSel = id("timeLimit");
const timerEl = id("timer");
const livesEl = id("lives");
const numpad = id("numpad");
const eraseBtn = id("erase");
const clearSelBtn = id("clearSel");

///// Game state /////
let selectedTile = null;
let selectedNumButton = null;
let disableSelect = false;
let timerInterval = null;
let timeRemaining = 0;
let lives = 3;
let currentPuzzle = null;  // 81-char '-' for blank
let currentSolution = null; // 81-digit string

///// Utilities /////
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function shuffle(arr){ for (let i = arr.length -1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }

///// Grid helpers /////
function makeEmptyGrid(){ return Array.from({length:9}, ()=>Array(9).fill(0)); }
function gridToString(grid){ return grid.flat().map(v => (v===0 ? "-" : String(v))).join(""); }
function gridToDigits(grid){ return grid.flat().map(v => String(v)).join(""); }

///// Solver (backtracking) /////
function isSafe(grid, r, c, num){
    for (let x=0;x<9;x++) if (grid[r][x]===num || grid[x][c]===num) return false;
    const sr = Math.floor(r/3)*3, sc = Math.floor(c/3)*3;
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) if (grid[sr+i][sc+j]===num) return false;
    return true;
}
function solveGrid(grid){
    for (let r=0;r<9;r++){
        for (let c=0;c<9;c++){
            if (grid[r][c]===0){
                for (let num=1; num<=9; num++){
                    if (isSafe(grid,r,c,num)){
                        grid[r][c]=num;
                        if (solveGrid(grid)) return true;
                        grid[r][c]=0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

///// Generator /////
function generateSolvedBoard(){
    const grid = makeEmptyGrid();
    // fill diagonal boxes with permutations
    for (let box = 0; box < 9; box += 3){
        const nums = shuffle([1,2,3,4,5,6,7,8,9].slice());
        let idx = 0;
        for (let r=0;r<3;r++) for (let c=0;c<3;c++) grid[box+r][box+c] = nums[idx++];
    }
    solveGrid(grid);
    return grid;
}

function removeCells(grid, removals){
    const puzzle = grid.map(r => r.slice());
    const cells = [];
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) cells.push([r,c]);
    shuffle(cells);
    let removed = 0;
    while (removed < removals && cells.length){
        const [r,c] = cells.pop();
        if (puzzle[r][c] !== 0){
            puzzle[r][c] = 0;
            removed++;
        }
    }
    return puzzle;
}

function difficultyToRemovals(diff){
    if (diff === "easy") return 40;
    if (diff === "medium") return 47;
    return 53;
}

///// Create puzzle (fast, not uniqueness-guaranteed) /////
function createPuzzle(difficulty){
    const solvedGrid = generateSolvedBoard();
    const removals = difficultyToRemovals(difficulty);
    const puzzleGrid = removeCells(solvedGrid, removals);
    return {
        puzzleStr: gridToString(puzzleGrid),
        solutionStr: gridToDigits(solvedGrid)
    };
}

///// Render board UI /////
function clearBoard(){
    boardEl.innerHTML = "";
    selectedTile = null;
    selectedNumButton = null;
    qsa(".num").forEach(n => n.classList.remove("selected"));
}

function renderBoard(boardStr){
    clearBoard();
    // create 81 tiles
    for (let i=0;i<81;i++){
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.id = `t${i}`;
        const ch = boardStr.charAt(i);
        if (ch !== "-" && ch !== "0"){
            tile.textContent = ch;
            tile.classList.add("fixed");
        } else {
            tile.textContent = "";
            tile.addEventListener("click", () => {
                if (disableSelect) return;
                if (tile.classList.contains("fixed")) return;
                // toggle selection
                if (selectedTile && selectedTile === tile){
                    tile.classList.remove("selected");
                    selectedTile = null;
                } else {
                    qsa(".tile").forEach(t => t.classList.remove("selected"));
                    tile.classList.add("selected");
                    selectedTile = tile;
                }
            });
        }
        // borders for 3x3 boxes
        const row = Math.floor(i / 9);
        const col = i % 9;
        if (row % 3 === 0) tile.classList.add("topBorder");
        if (row % 3 === 2) tile.classList.add("bottomBorder");
        if (col % 3 === 0) tile.classList.add("leftBorder");
        if (col % 3 === 2) tile.classList.add("rightBorder");
        boardEl.appendChild(tile);
    }
}

///// Timer & lives /////
function startTimer(seconds){
    if (timerInterval) clearInterval(timerInterval);
    timeRemaining = seconds;
    updateTimerUI();
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerUI();
        if (timeRemaining <= 0){
            clearInterval(timerInterval);
            loseGame();
        }
    }, 1000);
}
function updateTimerUI(){ timerEl.textContent = formatTime(timeRemaining); }
function formatTime(sec){
    const m = Math.floor(sec/60); const s = sec%60;
    return `${m<10?'0':''}${m}:${s<10?'0':''}${s}`;
}
function setLives(n){
    lives = n; if (lives <= 0){ livesEl.textContent = "You Lost"; } else { livesEl.textContent = "Lives: " + "♥ ".repeat(lives).trim(); }
}

///// Game actions /////
function newGame(){
    disableSelect = false;
    setLives(3);
    const diff = difficultySel.value;
    const timeLimit = parseInt(timeLimitSel.value, 10) || 300;
    const {puzzleStr, solutionStr} = createPuzzle(diff);
    currentPuzzle = puzzleStr;
    currentSolution = solutionStr;
    renderBoard(puzzleStr);
    startTimer(timeLimit);
}

function placeNumberOnSelected(num){
    if (!selectedTile || disableSelect) return;
    if (selectedTile.classList.contains("fixed")) return;
    selectedTile.textContent = String(num);
    // validate
    const idx = parseInt(selectedTile.id.slice(1),10);
    if (currentSolution && currentSolution.charAt(idx) === String(num)){
        // correct
        selectedTile.classList.remove("selected");
        selectedTile.classList.add("correct");
        if (selectedNumButton){ selectedNumButton.classList.remove("selected"); selectedNumButton = null; }
        selectedTile = null;
        if (isBoardComplete()) winGame();
    } else {
        // incorrect
        selectedTile.classList.add("incorrect");
        disableSelect = true;
        setTimeout(() => {
            selectedTile.classList.remove("incorrect");
            selectedTile.classList.remove("selected");
            selectedTile.textContent = "";
            selectedTile = null;
            if (selectedNumButton){ selectedNumButton.classList.remove("selected"); selectedNumButton = null; }
            setLives(lives - 1);
            if (lives <= 0) { loseGame(); } else { disableSelect = false; }
        }, 800);
    }
}

function eraseSelected(){
    if (!selectedTile || selectedTile.classList.contains("fixed")) return;
    selectedTile.textContent = "";
}

function clearSelection(){
    if (selectedTile){ selectedTile.classList.remove("selected"); selectedTile = null; }
    if (selectedNumButton){ selectedNumButton.classList.remove("selected"); selectedNumButton = null; }
}

function giveHint(){
    if (!currentSolution) return;
    // pick a random empty tile (not fixed)
    const tiles = qsa(".tile").filter(t => !t.classList.contains("fixed") && !t.textContent);
    if (!tiles.length) return;
    const pick = tiles[Math.floor(Math.random()*tiles.length)];
    const idx = parseInt(pick.id.slice(1),10);
    pick.textContent = currentSolution.charAt(idx);
    pick.classList.add("correct");
    // penalty
    setLives(Math.max(0, lives-1));
    if (lives <= 0) loseGame();
}

function solvePuzzle(){
    if (!currentSolution) return;
    qsa(".tile").forEach((tile, i) => {
        tile.textContent = currentSolution.charAt(i);
        tile.classList.add("correct");
    });
    disableSelect = true;
    if (timerInterval) clearInterval(timerInterval);
    livesEl.textContent = "Solved";
}

function isBoardComplete(){
    const tiles = qsa(".tile");
    for (let i=0;i<tiles.length;i++){
        if (!tiles[i].textContent || tiles[i].textContent === "") return false;
    }
    // we can also validate with solution
    for (let i=0;i<tiles.length;i++){
        if (tiles[i].textContent !== currentSolution.charAt(i)) return false;
    }
    return true;
}

function winGame(){
    disableSelect = true;
    if (timerInterval) clearInterval(timerInterval);
    livesEl.textContent = "You Won ☻";
}

function loseGame(){
    disableSelect = true;
    if (timerInterval) clearInterval(timerInterval);
    // reveal solution
    if (currentSolution){
        qsa(".tile").forEach((t, i) => {
            t.textContent = currentSolution.charAt(i);
            t.classList.add("fixed");
        });
    }
    livesEl.textContent = "You Lost";
}

///// Input handling: numpad & keyboard /////
numpad.addEventListener("click", (e) => {
    const btn = e.target.closest(".num");
    if (btn){
        const val = btn.dataset.num;
        if (!val) return;
        // toggle selection of number button
        if (selectedNumButton === btn){
            btn.classList.remove("selected");
            selectedNumButton = null;
        } else {
            qsa(".num").forEach(n => n.classList.remove("selected"));
            btn.classList.add("selected");
            selectedNumButton = btn;
            // if a tile is selected, place immediately
            if (selectedTile) placeNumberOnSelected(val);
        }
    }
});
eraseBtn.addEventListener("click", () => eraseSelected());
clearSelBtn.addEventListener("click", () => clearSelection());

document.addEventListener("keydown", (e) => {
    if (disableSelect) return;
    const k = e.key;
    if (/^[1-9]$/.test(k)){
        // if a number button is selected, clear it because keyboard overrides
        if (selectedNumButton){ selectedNumButton.classList.remove("selected"); selectedNumButton = null; }
        // if a tile selected, place; else select first empty tile
        if (!selectedTile){
            // find first non-fixed empty tile and select it (convenience)
            const first = qsa(".tile").find(t => !t.classList.contains("fixed") && !t.textContent);
            if (first){ first.classList.add("selected"); selectedTile = first; }
        }
        placeNumberOnSelected(k);
    } else if (k === "Backspace" || k === "Delete"){
        eraseSelected();
    } else if (k === "Escape"){
        clearSelection();
    }
});

///// Button binding /////
newGameBtn.addEventListener("click", () => {
    clearSelection();
    newGame();
});
hintBtn.addEventListener("click", () => {
    giveHint();
});
solveBtn.addEventListener("click", () => {
    solvePuzzle();
});

///// Initialize default small puzzle on load /////
window.addEventListener("load", async () => {
    // quick initial puzzle
    const {puzzleStr, solutionStr} = createPuzzle(difficultySel.value);
    currentPuzzle = puzzleStr;
    currentSolution = solutionStr;
    renderBoard(currentPuzzle);
    setLives(3);
    timerEl.textContent = formatTime(parseInt(timeLimitSel.value,10));
});
