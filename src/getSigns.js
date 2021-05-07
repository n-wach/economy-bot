const mineflayer = require('mineflayer')
const fs = require("fs");
const viewer = require('prismarine-viewer').mineflayer

let mcData;

function loadData() {
  mcData = require('minecraft-data')(bot.version);
  const wood_types = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak"];
  mcData.signIds = [];
  for(let type of wood_types) {
    mcData.signIds.push(mcData.blocksByName[type + "_sign"].id);
  }
}

console.log("Starting up.");

const bot = mineflayer.createBot({
  host: "skyblock.net",
  username: process.env.MC_EMAIL,
  password: process.env.MC_PASSWORD,
});

bot.once('spawn', async () => {
  loadData();
  viewer(bot, { port: 3007, firstPerson: true });
  await runBot();
});

// Log errors and kick reasons:
bot.on('kicked', (message) => {
  console.log(message);
  bot.quit();
});
bot.on('error', (message) => {
  console.log(message);
  bot.quit();
});
bot.on('message', (message) => {
  console.log(message.toAnsi());
});

const PLAYERS_FILE = "players.json";

function getKnownPlayers() {
  const players = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
  const usernames = [];
  Object.values(players).forEach((entry) => {
    usernames.push(entry.username);
  })

  Object.entries(bot.players).forEach(([username, player]) => {
    if(username !== bot.player.username && usernames.indexOf(username) === -1) {
      console.log("New username: ", username);
      players.push({
        "username": username,
      });
    }
  });
  return players;
}

function savePlayers(players) {
  if(players) {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 1));
  }
}

async function runBot() {
  await bot.waitForTicks(30);
  const players = getKnownPlayers();

  for(let player of players) {
    if(player.accessible === false || player.numSigns >= 0) {
      continue;
    }
    console.log("Visiting", player.username);
    await visitPlayer(player);
    savePlayers(players);
  }

  console.log("I've visited everyone I know about. Quitting...");
  await bot.waitForTicks(300);
  bot.quit();
}

async function visitPlayer(player) {
  await bot.waitForTicks(15);
  const position = bot.entity.position;
  clearBlockEntities();
  bot.chat(`/visit ${player.username}`);
  await bot.waitForTicks(15);
  if(bot.entity.position.equals(position)) {
    console.log("Didn't move. Island must be locked or not exist.");
    console.log("I won't visit this player again.");
    player.accessible = false;
    return;
  }
  console.log("Manually wait for chunks...");
  await bot.waitForTicks(100);
  console.log("Looking for signs.");

  let signs = findLoadedSigns();
  console.log(`Found ${signs.length} signs`);
  player.numSigns = signs.length;
  player.signs = [];
  for(let sign of signs) {
    console.log("Sign:");
    const lines = [];
    for(let lineName of ["Text1", "Text2", "Text3", "Text4"]) {
      const line = sign[lineName];
      if(line) {
        lines.push(line.toString());
        console.log(line.toAnsi());
      } else {
        lines.push("");
        console.log();
      }
    }
    player.signs.push({
      position: [sign.x, sign.y, sign.z],
      lines: lines
    })
  }

}

function clearBlockEntities() {
  for(let [pos, ] of Object.entries(bot._blockEntities)) {
    delete bot._blockEntities[pos];
  }
}

function findLoadedSigns() {
  const signs = [];
  for(let [pos, be] of Object.entries(bot._blockEntities)) {
    if(be.id === 'minecraft:sign' || be.id === 'Sign') {
      signs.push(be);
    }
  }
  return signs;
}