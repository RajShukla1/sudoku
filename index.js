let timeRemaining;
let lives;
let timer;
let selectedNum;
let selectedTile;
let disableSelect;
let easy;
let medium;
let hard;
let solved;

id("start-btn").addEventListener("click", startGame);

for (let i = 0; i < id("number-container").children.length; i++) {
  id("number-container").children[i].addEventListener("click", function () {
    if (!disableSelect) {
      if (this.classList.contains("selected")) {
        this.classList.remove("selected");
        selectedNum = null;
      } else {
        for (let i = 0; i < 9; i++) {
          id("number-container").children[i].classList.remove("selected");
        }
        this.classList.add("selected");
        selectedNum = this;
        updateMove();
      }
    }
  });
}

async function startGame() {
  let board;
  if (id("diff-1").checked) {
    await getNewBoard("easy");
    board = easy[0];
  } else if (id("diff-2").checked) {
    await getNewBoard("medium");
    board = medium[0];
  } else {
    await getNewBoard("hard");
    board = hard[0];
  }

  lives = 3;
  disableSelect = false;
  id("lives").textContent = "Lives: ♥ ♥ ♥ ";
  generateBoard(board);

  startTimer();

  if (id("theme-1").checked) {
    //   qs("section").classList.add("light");
    qs("section").classList.remove("dark");
    qs("body").classList.remove("dark");
    id("number-container").classList.remove("dark");
  } else {
    qs("section").classList.add("dark");
    qs("body").classList.add("dark");
    id("number-container").classList.add("dark");
  }

  id("number-container").classList.remove("hidden");
}

function startTimer() {
  if (id("time-1").checked) timeRemaining = 180;
  else if (id("time-2").checked) timeRemaining = 300;
  else timeRemaining = 600;

  id("timer").textContent = timeconversion(timeRemaining);
  timer = setInterval(function () {
    timeRemaining--;
    if (timeRemaining === 0) endGame();
    id("timer").textContent = timeconversion(timeRemaining);
  }, 1000);
}

function timeconversion(time) {
  let minutes = Math.floor(time / 60);
  if (minutes < 10) minutes = "0" + minutes;
  let seconds = time % 60;
  if (seconds < 10) seconds = "0" + seconds;
  return minutes + ":" + seconds;
}
function generateBoard(board) {
  clearPrevious();
  let idCount = 0;
  for (let i = 0; i < 81; i++) {
    let tile = document.createElement("p");
    if (board.charAt(i) != "-" && board.charAt(i) != "0") {
      tile.textContent = board.charAt(i);
    } else {
      tile.addEventListener("click", function () {
        if (!disableSelect) {
          if (tile.classList.contains("selected")) {
            tile.classList.remove("selected");
            selectedTile = null;
          } else {
            for (let i = 0; i < 81; i++) {
              qsa(".tile")[i].classList.remove("selected");
            }
            tile.classList.add("selected");
            selectedTile = tile;
            updateMove();
          }
        }
      });
    }

    tile.id = idCount;

    idCount++;

    tile.classList.add("tile");
    //creating dark borders to differentiate
    if ((tile.id > 17 && tile.id < 27) || (tile.id > 44 && tile.id < 54) ||(tile.id > 71 && tile.id < 81)) {
      tile.classList.add("bottomBorder");
    }
    if (tile.id >= 0 && tile.id < 9) {
      tile.classList.add("topBorder");
    }
    if(tile.id % 9 == 0)
    tile.classList.add("leftBorder");
    if ((tile.id + 1) % 9 == 3 || (tile.id + 1) % 9 == 6 || (tile.id + 1) % 9 == 0) {
      tile.classList.add("rightBorder");
    }

    id("board").appendChild(tile);
  }
}

function updateMove() {
  if (selectedTile && selectedNum) {
    selectedTile.textContent = selectedNum.textContent;
    if (id("theme-1").checked) {
      selectedTile.classList.add("correct");
      selectedTile.classList.remove("dark");
    } else {
      selectedTile.classList.add("dark");
    }

    if (checkCorrect(selectedTile)) {
      selectedTile.classList.remove("selected");
      selectedNum.classList.remove("selected");

      selectedNum = null;
      selectedTile = null;
      if (checkDone()) {
        endGame();
      }
    } else {
      disableSelect = true;

      selectedTile.classList.add("incorrect");
      selectedTile.classList.remove("correct");

      setTimeout(function () {
        lives--;
        if (lives === 0) {
          endGame();
        } else {
          if (lives === 2) {
            id("lives").textContent = "Lives : " + "♥ ♥";
          } else if (lives === 1) {
            id("lives").textContent = "Lives : " + "♥";
          }

          disableSelect = false;
        }
        selectedTile.classList.remove("incorrect");
        selectedTile.classList.remove("selected");
        selectedNum.classList.remove("selected");
        selectedTile.textContent = "";
        selectedNum = null;
        selectedTile = null;
      }, 1000);
    }
  }
}
function checkDone() {
  let tile = qsa(".tile");
  for (let i = 0; i < tile.length; i++) {
    if (tile[i].textContent === "") return false;
  }
  return true;
}

function endGame() {
  disableSelect = true;
  clearTimeout(timer);
  if (lives === 0 || timeRemaining === 0) {
    id("lives").textContent = "You Lost ";
  } else {
    id("lives").textContent = "You Won ☻";
  }
}
function checkCorrect(tile) {
  let solution;
  if (id("diff-1").checked) solution = easy[1];
  else if (id("diff-2").checked) solution = medium[1];
  else solution = hard[1];

  if (solution.charAt(tile.id) === tile.textContent) return true;
}
function clearPrevious() {
  let tiles = qsa(".tile");
  for (let i = 0; i < tiles.length; i++) {
    tiles[i].remove();
  }

  if (timer) clearTimeout(timer);

  for (let i = 0; i < id("number-container").children.length; i++) {
    id("number-container").children[i].classList.remove("selected");
  }

  selectedTile = null;
  selectedNum = null;
}

//api calls for new board
async function getNewBoard(difficulty) {
  let response = await fetch(
    "https://sugoku.onrender.com/board?difficulty=" + difficulty
  );
  let data = await response.json();
  unsolved = data.board.map((e) => e.join("")).join("");

  const encodeBoard = (board) =>
    board.reduce(
      (result, row, i) =>
        result +
        `%5B${encodeURIComponent(row)}%5D${
          i === board.length - 1 ? "" : "%2C"
        }`,
      ""
    );
  const encodeParams = (params) =>
    Object.keys(params)
      .map((key) => key + "=" + `%5B${encodeBoard(params[key])}%5D`)
      .join("&");

  //api for getting right answer for puzzle
  fetch("https://sugoku.onrender.com/solve", {
    method: "POST",
    body: encodeParams(data),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
    .then((response) => response.json())
    .then((response) => {
      console.log(response);
      solved = response.solution.map((e) => e.join("")).join("");
    })
    .catch(console.warn);
  try {
    let board = [unsolved, solved];
    if (difficulty == "easy") easy = board;
    else if (difficulty == "medium") medium = board;
    else hard = board;
  } catch (err) {
    console.log(err);
  }
}

//
function id(id) {
  return document.getElementById(id);
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return document.querySelectorAll(selector);
}

// let easy = [
//   "6------7------5-2------1---362----81--96-----71--9-4-5-2---651---78----345-------",
//   "685329174971485326234761859362574981549618732718293465823946517197852643456137298",
// ];
// let medium = [
//   "--9-------4----6-758-31----15--4-36-------4-8----9-------75----3-------1--2--3--",
//   "619472583243985617587316924158247369926531478734698152891754236365829741472163895",
// ];
// let hard = [
//   "-1-5-------97-42----5----7-5---3---7-6--2-41---8--5---1-4------2-3-----9-7----8--",
//   "712583694639714258845269173521436987367928415498175326184697532253841769976352841",
// ];
