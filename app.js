const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const router = express.Router();
const app = express();

mongoose.connect('mongodb://localhost/battleship');
let db = mongoose.connection;
let Schema = mongoose.Schema;
let battleshipSchema = new Schema({
    boardState: [[Number]],
    fleetState: [[[Number]]],
    log: String
});
let Battleship = mongoose.model('battleship', battleshipSchema);

const boardHor = 10;
const boardVer = 10;
const fleetType = 4;
const maxFleetSlot = 4;
// let ocean = {} // 0 = blank, 1 = unused,    2 = near fleet, 3 = hit, >10 = fleet
// let fleet = {} // 0 = sink,  1 = unplaced, 2 = placed    , 3 = hit
const shipType = ['Battleship', 'Cruiser', 'Destroyer', 'Submarine']
const shipSlot = [4, 3, 2, 1]
let shipCount;
let shot;
let missShot;

app.use(morgan('dev')); // log all requests
app.use(express.static(path.join(__dirname, "public"))); // starting static fileserver, that will watch `public` folder (in our case there will be `index.html`)
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    app.emit('ready');
    console.log('Database connected!');
});

function createArray(length) {
    let arr = new Array(length || 0),
        i = length;
    if (arguments.length > 1) {
        let args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }
    return arr;
}

function createEmptyBoard() {
    let ocean = createArray(boardVer, boardHor);
    for (let i = 0; i < boardVer; i++) {
        for (let j = 0; j < boardHor; j++) {
            ocean[i][j] = 0;
        }
    }
    return ocean;
}

function createEmptyFleet() {
    let fleet = createArray(fleetType);
    for (let i = 0; i < fleet.length; i++) {
        fleet[i] = createArray(i + 1);
        for (let j = 0; j < fleet[i].length; j++) {
            fleet[i][j] = createArray(4 - i);
            shipCount++;
            for (let k = 0; k < fleet[i][j].length; k++) {
                fleet[i][j][k] = 1;
            }
        }
    }
    return fleet
}

function OnStart() {

    shot = 0;
    missShot = 0;
    let ocean = createEmptyBoard();
    let fleet = createEmptyFleet();
    let game = new Battleship({ boardState: ocean, fleetState: fleet, log: 'Restart' });
    game.save()
        .then(console.log('Saved!'))
        .catch(err => { // if error we will be here
            console.error('Database error:', err.stack);
            process.exit(1);
        });
}

router.get('/', function (req, res) {
    Battleship.find()
        .then((result) => {
            if (result.length === 0) {
                ocean = createEmptyBoard();
                fleet = createEmptyFleet();
                let toSend = 'New board';
                let game = new Battleship({ boardState: ocean, fleetState: fleet, log: toSend });
                game.save()
                    .then(res.send(game))
                    .catch(err => { // if error we will be here
                        console.error('Database error:', err.stack);
                        process.exit(1);
                    });
            } else {
                res.send(result[result.length - 1]);
            }
        })
        .catch(err => { // if error we will be here
            console.error('Database error:', err.stack);
            process.exit(1);
        });
});

router.post('/reset', function (req, res) {
    OnStart();
    res.send('reset successfully');
});

router.post('/ship', function (req, res) {
    let ship = parseInt(req.query.ship);
    let x = parseInt(req.query.x, 10);
    let y = parseInt(req.query.y, 10);
    let direction = parseInt(req.query.direction);
    let xIncrement;
    let yIncrement;

    let flagged = false;
    if (direction === 0) {
        xIncrement = 1;
        yIncrement = 0;
    } else if (direction === 1) {
        xIncrement = 0;
        yIncrement = 1;
    } else {
        res.sendStatus(400);
        flagged = true;
        return;
    }
    let shipNo = -1;
    if (ship === undefined || x === undefined || y === undefined || direction === undefined
        || isNaN(ship) || isNaN(x) || isNaN(y)) {
        res.sendStatus(400);
        flagged = true;
        return;
    }
    if (ship < 0 || ship > shipType.length || x < 0 || x > boardHor || y < 0 || y > boardVer) {
        res.sendStatus(400);
        flagged = true;
        return;
    }
    let ocean;
    let fleet;
    Battleship.find().then((result) => {
        if (result.length === 0) {
            ocean = createEmptyBoard();
            fleet = createEmptyFleet();
        } else {
            ocean = result[result.length - 1].boardState;
            fleet = result[result.length - 1].fleetState;
        }
        if (ocean === undefined || fleet === undefined) {
            res.sendStatus(404);
            return;
        }
        if (flagged === false) {
            for (let i = 0; i < fleet[ship].length; i++) {
                if (fleet[ship][i][0] === 1) {
                    //Find placable ship
                    shipNo = i;
                    break;
                }
            }
            if (shipNo === -1) {
                //No Ship Left
                res.sendStatus(400);
                flagged = true;
            }
            else {
                for (let j = 0; j < shipSlot[ship]; j++) {
                    if (ocean[y + j * yIncrement][x + j * xIncrement] !== 0) {
                        //Illegal placement
                        res.sendStatus(400);
                        flagged = true;
                    }
                }
            }
        }
        if (flagged === false) {
            //Place ship
            for (let j = 0; j < shipSlot[ship]; j++) {
                //(XYZ) -> shipno-1, ship type, status
                ocean[y + j * yIncrement][x + j * xIncrement] = j + 10 * ship + 100 * (shipNo + 1);
                //Block surrounding area
                for (let k = -1; k <= 1; k++) {
                    for (let l = -1; l <= 1; l++) {
                        let xx = x + (j * xIncrement) + k;
                        let yy = y + (j * yIncrement) + l;
                        if (xx >= boardHor || xx < 0) continue;
                        if (yy >= boardVer || yy < 0) continue;
                        if (ocean[yy][xx] === 0) {
                            ocean[yy][xx] = 2;
                        }
                    }
                }
            }
            fleet[ship][shipNo][0] = 2;
            let toSend = 'placed ' + shipType[ship] + ' on ' + x + ' ' + y;
            let game = new Battleship({ boardState: ocean, fleetState: fleet, log: toSend });
            game.save()
                .then(res.send(toSend))
                .catch(err => { // if error we will be here
                    console.error('Database error:', err.stack);
                    process.exit(1);
                });
        }
    });
});

router.post('/attack', function (req, res) {
    let x = parseInt(req.query.x, 10);
    let y = parseInt(req.query.y, 10);
    let flagged = false;
    //Check if fleet if empty
    if (x === undefined || y === undefined || isNaN(x) || isNaN(y)) {
        res.sendStatus(401);
        flagged = true;
        return;
    }
    if (x < 0 || x > boardHor || y < 0 || y > boardVer) {
        res.sendStatus(400);
        flagged = true;
        return;
    }
    let ocean;
    let fleet;
    Battleship.find().then((result) => {
        if (result.length === 0) {
            ocean = createEmptyBoard();
            fleet = createEmptyFleet();
        } else {
            ocean = result[result.length - 1].boardState;
            fleet = result[result.length - 1].fleetState;
        }
        for (let i = 0; i < fleet.length; i++) {
            for (let j = 0; j < fleet[i].length; j++) {
                if (fleet[i][j][0] === 1) {
                    flagged = true;
                    res.sendStatus(401);
                    return;
                }
            }
        }
        if (flagged === false) {
            //Fleet placed
            if (ocean[y][x] === 3) {
                res.sendStatus(400);
            } else if (ocean[y][x] === 0 || ocean[y][x] === 2) {
                missShot = missShot + 1;
                shot = shot + 1;
                ocean[y][x] = 3;
                let toSend = 'Miss shot to ' + x + ' ' + y;
                let game = new Battleship({ boardState: ocean, fleetState: fleet, log: toSend });
                game.save().then(res.send('Miss'));
                return;
            } else {
                let type = parseInt((ocean[y][x] % 100) / 10);
                let no = parseInt(ocean[y][x] / 100) - 1;
                let pos = ocean[y][x] % 10;
                fleet[type][no][pos] = 3;
                console.log(fleet);
                let health = shipSlot[type];
                let sunk = true;
                for (let i = 0; i < health; i++) {
                    if (fleet[type][no][i] !== 3) {
                        sunk = false;
                        break;
                    }
                }
                if (sunk === true) {
                    shipCount = shipCount - 1;
                    if (shipCount === 0) {
                        let toSend = 'Game over from shooting on ' + x + ' ' + y;
                        let game = new Battleship({ boardState: ocean, fleetState: fleet, log: toSend });
                        game.save().then(res.send('Game over\nShot required: ' + shot + '\nMiss shot: ' + missShot));
                        return;
                    } else {
                        let toSend = 'Sunk ' + shipType[type] + ' from shooting on ' + x + ' ' + y;
                        let game = new Battleship({ boardState: ocean, fleetState: fleet, log: toSend });
                        game.save().then(res.send('You just sunk the ' + shipType[type]));
                        return;
                    }
                } else {
                    ocean[y][x] = 3;
                    let toSend = 'Hit from shooting on ' + x + ' ' + y;
                    let game = new Battleship({ boardState: ocean, fleetState: fleet, log: toSend });
                    game.save().then(res.send('Hit'));
                    return;
                }
            }
        }
    })
        .catch(err => { // if error we will be here
            console.error('Database error:', err.stack);
            process.exit(1);
        });
});

app.use('/api', router)

OnStart();

exports.app = app;
exports.Battleship = Battleship;