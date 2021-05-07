const fs = require("fs");
const PLAYERS_FILE = "players.json";

const players = JSON.parse(fs.readFileSync(PLAYERS_FILE));

const TRADE_HEADERS = ["[Wanted]", "[For Sale]"];
const trades = [];
for(let player of players) {
    if(player.accessible === false) {
        continue;
    }
    for(let sign of player.signs) {
        if(TRADE_HEADERS.indexOf(sign.lines[0]) === -1) {
            continue;
        }
        trades.push({
            type: sign.lines[0] === "[For Sale]" ? "sale": "want",
            quantity: parseInt(sign.lines[1].match(/\d+/)[0]),
            item: sign.lines[1].match(/\d+\s(.+)/)[1],
            cost: sign.lines[2] === "FREE" ? 0 : parseInt(sign.lines[2].match(/\d+/)[0]),
            username: player.username,
            position: sign.position,
        });
    }
}

const markets = {};
for(let trade of trades) {
    if(!markets[trade.item]) markets[trade.item] = {"sales": [], "wants": []};
    markets[trade.item][trade.type + "s"].push(trade);
}

for(let [item, market] of Object.entries(markets)) {
    let lowestPricePer = Infinity;
    let lowestSale = null;
    let highestPricePer = 0;
    let highestWant = null;
    for(let sale of market.sales) {
        let price_per = sale.cost / sale.quantity;
        if(price_per < lowestPricePer) {
            lowestPricePer = price_per;
            lowestSale = sale;
        }
    }
    for(let want of market.wants) {
        let price_per = want.cost / want.quantity;
        if(price_per > highestPricePer) {
            highestPricePer = price_per;
            highestWant = want;
        }
    }
    if(lowestPricePer < highestPricePer && highestPricePer > 0 && lowestPricePer < Infinity) {
        console.log(`Looks like you could profit in the ${item} market!`)
        console.log(`${lowestSale.username} is selling for ${lowestPricePer} per ${item} at ${lowestSale.position}`);
        console.log(`${highestWant.username} is buying for ${highestPricePer} per ${item} at ${highestWant.position}`);
        console.log("");
        console.log("");
    }
}

