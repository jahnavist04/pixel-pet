
const $ = (id) => document.getElementById(id);

const DEFAULT_STATE = {
  hunger: 25,
  happiness: 85,
  energy: 90,
  points: 0,
  actions: 0,
  lastTime: Date.now(),
  lastAction: Date.now(),
  sleeping: false
};

const MESSAGES = {
  feed: [
    "Nom nom! Mochi loved that treat! 🍓",
    "Yummy! That was delicious! ♡",
    "Mochi's tummy is happy now!"
  ],
  play: [
    "Wheee! Mochi had the best time! 🎾",
    "Playtime = the best time!",
    "Mochi sends you a tiny happy dance! 💗"
  ],
  sleep: [
    "Shhh... Mochi is having sweet dreams. 🌙",
    "Rest time! Sweet dreams, little Mochi.",
    "Mochi is all tucked in and cozy. ♡"
  ]
};

let state = { ...DEFAULT_STATE };
let toastTimeout;
let messageTimeout;
let sleepInterval;

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function saveGame() {
  state.lastTime = Date.now();

  try {
    localStorage.setItem("pixelPetMochi", JSON.stringify(state));
  } catch (error) {
    console.warn("Game progress could not be saved.", error);
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem("pixelPetMochi");

    if (saved) {
      const parsed = JSON.parse(saved);

      if (
        parsed &&
        typeof parsed === "object" &&
        ["hunger", "happiness", "energy", "points", "actions"]
          .every((key) => Number.isFinite(parsed[key])) &&
        parsed.hunger >= 0 && parsed.hunger <= 100 &&
        parsed.happiness >= 0 && parsed.happiness <= 100 &&
        parsed.energy >= 0 && parsed.energy <= 100 &&
        parsed.points >= 0 && parsed.actions >= 0
      ) {
        state = {
          ...DEFAULT_STATE,
          ...parsed,
          sleeping: false,
          lastTime: Number.isFinite(parsed.lastTime)
            ? parsed.lastTime
            : Date.now(),
          lastAction: Number.isFinite(parsed.lastAction)
            ? parsed.lastAction
            : Date.now()
        };

        applyOfflineChanges();
      }
    }
  } catch (error) {
    console.warn("Saved game could not be loaded.", error);
    state = { ...DEFAULT_STATE };
  }
}

function applyOfflineChanges() {
  const now = Date.now();
  const elapsed = Math.max(
    0,
    Math.min(86400, (now - state.lastTime) / 1000)
  );

  // Stats change while you're away, up to 24 hours.
  state.hunger = clamp(state.hunger + elapsed / 120);
  state.happiness = clamp(state.happiness - elapsed / 180);
  state.energy = clamp(state.energy - elapsed / 240);
  state.sleeping = false;
  state.lastTime = now;
}

function getLevel() {
  return Math.floor(state.points / 100) + 1;
}

function getMood() {
  if (state.sleeping) {
    return { label: "😴 Sleeping", status: "Dreaming of tiny fish...", className: "sleeping" };
  }

  if (state.hunger >= 75) {
    return { label: "🍎 Hungry", status: "Mochi could really use a snack!", className: "hungry" };
  }

  if (state.energy <= 20) {
    return { label: "🥱 Tired", status: "Mochi needs a little rest.", className: "tired" };
  }

  if (state.happiness <= 25) {
    return { label: "🥺 Sad", status: "A little playtime might help!", className: "sad" };
  }

  if (state.happiness >= 75 && state.hunger < 50 && state.energy > 40) {
    return { label: "😊 Happy", status: "Mochi is feeling absolutely loved!", className: "happy" };
  }

  return { label: "🐾 Cozy", status: "Mochi is enjoying a quiet moment.", className: "cozy" };
}

function render() {
  $("points").textContent = state.points;
  $("total-points").textContent = state.points;
  $("level").textContent = `LVL ${getLevel()}`;

  $("hunger-value").textContent = `${state.hunger}%`;
  $("happiness-value").textContent = `${state.happiness}%`;
  $("energy-value").textContent = `${state.energy}%`;

  $("hunger-bar").style.width = `${state.hunger}%`;
  $("happiness-bar").style.width = `${state.happiness}%`;
  $("energy-bar").style.width = `${state.energy}%`;

  const mood = getMood();

  $("mood").textContent = mood.label;
  $("pet-status").textContent = mood.status;

  const pet = $("pet");
  pet.className = "pet";

  if (state.sleeping) {
    pet.classList.add("sleeping");
  } else if (state.hunger >= 75) {
    pet.classList.add("hungry");
  } else if (mood.className === "happy") {
    pet.classList.add("celebrate");
  }

  $("feed-btn").disabled = state.sleeping;
  $("play-btn").disabled = state.sleeping;
  $("sleep-btn").disabled = state.sleeping;
}

function showMessage(message) {
  $("message").textContent = message;

  clearTimeout(messageTimeout);

  messageTimeout = setTimeout(() => {
    $("message").textContent = "A little love goes a long way. ♡";
  }, 4500);

  $("toast").textContent = message;
  $("toast").classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    $("toast").classList.remove("show");
  }, 2500);
}

function earnPoints(amount) {
  const oldLevel = getLevel();

  state.points += amount;
  state.actions += 1;

  if (getLevel() > oldLevel) {
    showMessage(`LEVEL UP! Mochi reached level ${getLevel()}! 🎉`);
  }
}

function feedPet() {
  if (state.sleeping) return;

  if (state.hunger <= 0) {
    showMessage("Mochi is already full! ♡");
    return;
  }

  state.hunger = clamp(state.hunger - 25);
  state.happiness = clamp(state.happiness + 5);

  earnPoints(10);

  state.lastAction = Date.now();
  saveGame();
  render();

  if (state.hunger === 0) {
    showMessage("Mochi is completely full! 🍓");
  } else {
    showMessage(randomMessage("feed"));
  }
}

function playWithPet() {
  if (state.sleeping) return;

  if (state.energy < 15) {
    showMessage("Mochi is too tired to play. Let them rest! 🌙");
    return;
  }

  state.happiness = clamp(state.happiness + 20);
  state.energy = clamp(state.energy - 15);
  state.hunger = clamp(state.hunger + 8);

  earnPoints(15);

  state.lastAction = Date.now();
  saveGame();

  $("pet").classList.add("playing");

  setTimeout(() => {
    render();
  }, 1300);

  render();
  showMessage(randomMessage("play"));
}

function sleepPet() {
  if (state.sleeping) return;

  if (state.energy >= 100) {
    showMessage("Mochi is fully rested already! ☀️");
    return;
  }

  state.sleeping = true;
  state.lastAction = Date.now();

  render();
  showMessage(randomMessage("sleep"));

  clearInterval(sleepInterval);

  sleepInterval = setInterval(() => {
    state.energy = clamp(state.energy + 20);
    state.hunger = clamp(state.hunger + 3);

    if (state.energy >= 100) {
      state.sleeping = false;
      clearInterval(sleepInterval);
      sleepInterval = null;

      earnPoints(5);
      showMessage("Mochi woke up refreshed! Good morning! ☀️");
    }

    saveGame();
    render();
  }, 1500);
}

function randomMessage(action) {
  const messages = MESSAGES[action];
  return messages[Math.floor(Math.random() * messages.length)];
}

function resetGame() {
  const confirmed = confirm(
    "Start a fresh adventure with Mochi? Your saved progress will be reset."
  );

  if (!confirmed) return;

  clearInterval(sleepInterval);
  sleepInterval = null;

  state = { ...DEFAULT_STATE, lastTime: Date.now() };

  try {
    localStorage.removeItem("pixelPetMochi");
  } catch (error) {
    console.warn("Saved progress could not be cleared.", error);
  }

  render();
  showMessage("A fresh new adventure begins! Hello, Mochi! 🐾");
}

function updateStats() {
  if (state.sleeping) return;

  const now = Date.now();
  const elapsed = Math.max(
    0,
    Math.min(60, (now - state.lastTime) / 1000)
  );

  state.hunger = clamp(state.hunger + elapsed / 120);
  state.happiness = clamp(state.happiness - elapsed / 180);
  state.energy = clamp(state.energy - elapsed / 240);
  state.lastTime = now;

  saveGame();
  render();
}

$("feed-btn").addEventListener("click", feedPet);
$("play-btn").addEventListener("click", playWithPet);
$("sleep-btn").addEventListener("click", sleepPet);
$("reset-btn").addEventListener("click", resetGame);

loadGame();
render();

setInterval(updateStats, 5000);
