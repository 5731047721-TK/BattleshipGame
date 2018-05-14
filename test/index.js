const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const should = chai.should();
const mocha = require('mocha');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const Apps = require('../app');
const app = Apps.app;
const Battleship = Apps.Battleship;
const PORT = 1337;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'))
chai.use(chaiHttp);

const clearDB = (done) => {
  mongoose.connection.db.dropDatabase(done);
};

let Schema = mongoose.Schema;
let battleshipSchema = new Schema({
  boardState: [[Number]],
  fleetState: [[[Number]]],
  log: String
});

describe('Battleship API', () => {
  let server;
  before((done) => {
    if (mongoose.connection.db) {
      return done;
    }
    mongoose.connect('mongodb://localhost/battleship', done);
    let db = mongoose.connection;

    server = app;
  });

  beforeEach((done) => {

    return server = app.listen(PORT, () => {
      clearDB(done);
    });
    // done();
    //clearDB(done);
  });

  afterEach(() => {
    server.close();
  });

  describe('/api/reset', () => {
    it('should return status 200', (done) => {
      chai.request(app)
        .post('/api/reset')
        .end((err, res) => {
          res.should.have.status(200);
          should.not.exist(err);
          done();
        });
    });
    it('should reset the game state', (done) => {
      chai.request(app)
        .post('/api/reset')
        .end((err, res) => {
          Battleship.find()
            .then((result) => {
              if (result.length < 1) {
                throw new Error('No data!');
              }
              let ocean = result[result.length - 1].boardState;
              let fleet = result[result.length - 1].fleetState;
              if (ocean === undefined) {
                throw new Error('No board state');
              }
              if (fleet === undefined) {
                throw new Error('No fleet state');
              }
              ocean.forEach(function (element) {
                element.forEach(function (val) {
                  chai.assert.equal(val, 0);
                }, this);
              }, this);
              fleet.forEach(function (element) {
                element.forEach(function (ship) {
                  ship.forEach(function (val) {
                    chai.assert.equal(val, 1);
                  }, this);
                }, this);
              }, this);
              done();
            })
            .catch(err => { // if error we will be here
              console.error('Database error:', err.stack);
              process.exit(1);
            });
        });

    });
  });

  describe('/api', () => {
    it('should return status 200', (done) => {
      chai.request(app)
        .get('/api')
        .end((err, res) => {
          res.should.have.status(200);
          should.not.exist(err);
          done();
        });
    });

    it('should return the state of the game', (done) => {
      chai.request(app)
        .get('/api')
        .end((err, res) => {
          Battleship.find()
            .then((result) => {
              if (result.length < 1) {
                throw new Error('No data!');
              }
              let ocean = result[result.length - 1].boardState;
              let fleet = result[result.length - 1].fleetState;
              if (ocean === undefined) {
                throw new Error('No board state');
              }
              if (fleet === undefined) {
                throw new Error('No fleet state');
              }
              ocean.forEach(function (element) {
                element.forEach(function (val) {
                  chai.assert.equal(val, 0);
                }, this);
              }, this);
              fleet.forEach(function (element) {
                element.forEach(function (ship) {
                  ship.forEach(function (val) {
                    chai.assert.equal(val, 1);
                  }, this);
                }, this);
              }, this);
              done();
            })
            .catch(err => { // if error we will be here
              console.error('Database error:', err.stack);
              process.exit(1);
            });
        });
    });
  });

  describe('/api/ship', () => {
    it('should return status 200', (done) => {
      chai.request(app)
        .post('/api/ship')
        .query({
          'ship': 0,
          'direction': 0,
          'x': 0,
          'y': 0
        })
        .end((err, res) => {
          res.should.have.status(200);
          should.not.exist(err);
          done();
        });
    });
    it('does not have complete parameter, should return status 400', (done) => {
      chai.request(app)
        .post('/api/ship')
        .query({
          'x': 0,
          'y': 7
        })
        .end((err, res) => {
          res.should.have.status(400);
          should.not.exist(err);
          done();
        })
    });
    it('is already placed should return status 400', (done) => {
      chai.request(app)
        .post('/api/ship')
        .query({
          'ship': 0,
          'direction': 0,
          'x': 0,
          'y': 0
        }).end((err, res) => {
          chai.request(app)
            .post('/api/ship')
            .query({
              'ship': 0,
              'direction': 0,
              'x': 0,
              'y': 0
            })
            .end((err, res) => {
              res.should.have.status(400);
              should.not.exist(err);
              done();
            })
        });

    });
    it('is NaN should return status 400', (done) => {
      chai.request(app)
        .post('/api/ship')
        .query({
          'ship': 'lol',
          'direction': 0,
          'x': 0,
          'y': 0
        })
        .end((err, res) => {
          res.should.have.status(400);
          should.not.exist(err);
          done();
        })
    });
    it('is OoB should return status 400', (done) => {
      chai.request(app)
        .post('/api/ship')
        .query({
          'ship': 15,
          'direction': 0,
          'x': 0,
          'y': -2
        })
        .end((err, res) => {
          res.should.have.status(400);
          should.not.exist(err);
          done();
        })
    });
    it('should place a ship', (done) => {
      chai.request(app)
        .post('/api/ship')
        .query({
          'ship': 1,
          'direction': 1,
          'x': 4,
          'y': 4
        })
        .end((err, res) => {
          Battleship.find()
            .then((result) => {
              res.should.have.status(200);
              if (result.length < 1) {
                throw new Error('No data!');
              }
              let ocean = result[result.length - 1].boardState;
              let fleet = result[result.length - 1].fleetState;
              if (ocean === undefined) {
                throw new Error('No board state');
              }
              if (fleet === undefined) {
                throw new Error('No fleet state');
              }
              chai.assert.equal(ocean[4][4], 110);
              chai.assert.equal(ocean[5][4], 111);
              chai.assert.equal(ocean[6][4], 112);
              chai.assert.equal(ocean[4][5], 2);
              chai.assert.equal(fleet[1][0][0], 2);
              done();
            })
            .catch(err => { // if error we will be here
              console.error('Database error:', err.stack);
              process.exit(1);
            });
        });
    });
  });

  describe('/api/attack', () => {
    it('should return status 401 before all fleet are placed', (done) => {
      chai.request(app)
        .post('/api/attack')
        .query({
          'x': 0,
          'y': 0
        })
        .end((err, res) => {
          res.should.have.status(401);
          should.not.exist(err);

          done();
        });
    });

    after(() => {
      server.close();
    })
  });

  describe('Attack API', (done) => {
    let server = app;

    beforeEach((done) => {
      return server = app.listen(1338, () => {
        // clearDB(done);
        done();
      });
    });

    afterEach(() => {
      server.close();
    });

    it('should place all ship and hit', (done) => {
      chai.request(app)
        .post('/api/ship')
        .query({
          'ship': 0,
          'direction': 0,
          'x': 0,
          'y': 0
        }).end((err, res) => {
          chai.request(app)
            .post('/api/ship')
            .query({
              'ship': 1,
              'direction': 1,
              'x': 0,
              'y': 2
            }).end((err, res) => {
              chai.request(app)
                .post('/api/ship')
                .query({
                  'ship': 1,
                  'direction': 1,
                  'x': 2,
                  'y': 2
                }).end((err, res) => {
                  chai.request(app)
                    .post('/api/ship')
                    .query({
                      'ship': 2,
                      'direction': 1,
                      'x': 4,
                      'y': 2
                    }).end((err, res) => {
                      chai.request(app)
                        .post('/api/ship')
                        .query({
                          'ship': 2,
                          'direction': 1,
                          'x': 6,
                          'y': 2
                        }).end((err, res) => {
                          chai.request(app)
                            .post('/api/ship')
                            .query({
                              'ship': 2,
                              'direction': 1,
                              'x': 8,
                              'y': 2
                            }).end((err, res) => {
                              chai.request(app)
                                .post('/api/ship')
                                .query({
                                  'ship': 3,
                                  'direction': 0,
                                  'x': 9,
                                  'y': 7
                                }).end((err, res) => {
                                  chai.request(app)
                                    .post('/api/ship')
                                    .query({
                                      'ship': 3,
                                      'direction': 0,
                                      'x': 7,
                                      'y': 9
                                    })
                                    .end((err, res) => {
                                      chai.request(app)
                                        .post('/api/ship')
                                        .query({
                                          'ship': 3,
                                          'direction': 0,
                                          'x': 7,
                                          'y': 7
                                        }).end((err, res) => {
                                          chai.request(app)
                                            .post('/api/ship')
                                            .query({
                                              'ship': 3,
                                              'direction': 0,
                                              'x': 9,
                                              'y': 9
                                            })
                                            .end((err, res) => {
                                              console.log('All ship Placed!')
                                              chai.request(app)
                                                .post('/api/attack')
                                                .query({
                                                  'x': 0,
                                                  'y': 0
                                                })
                                                .end((err, res) => {
                                                  Battleship.find()
                                                    .then((result) => {
                                                      if (result.length < 1) {
                                                        throw new Error('No data!');
                                                      }
                                                      let ocean = result[result.length - 1].boardState;
                                                      let fleet = result[result.length - 1].fleetState;
                                                      if (ocean === undefined) {
                                                        throw new Error('No board state');
                                                      }
                                                      if (fleet === undefined) {
                                                        throw new Error('No fleet state');
                                                      }
                                                      chai.assert(ocean[0][0], 3);
                                                      chai.assert(fleet[0][0][0], 3);
                                                      done();
                                                    })
                                                    .catch(err => { // if error we will be here
                                                      console.error('Database error:', err.stack);
                                                      process.exit(1);
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
  })

  it('should miss', (done) => {
    chai.request(app)
        .post('/api/ship')
        .query({
          'ship': 0,
          'direction': 0,
          'x': 0,
          'y': 0
        }).end((err, res) => {
          chai.request(app)
            .post('/api/ship')
            .query({
              'ship': 1,
              'direction': 1,
              'x': 0,
              'y': 2
            }).end((err, res) => {
              chai.request(app)
                .post('/api/ship')
                .query({
                  'ship': 1,
                  'direction': 1,
                  'x': 2,
                  'y': 2
                }).end((err, res) => {
                  chai.request(app)
                    .post('/api/ship')
                    .query({
                      'ship': 2,
                      'direction': 1,
                      'x': 4,
                      'y': 2
                    }).end((err, res) => {
                      chai.request(app)
                        .post('/api/ship')
                        .query({
                          'ship': 2,
                          'direction': 1,
                          'x': 6,
                          'y': 2
                        }).end((err, res) => {
                          chai.request(app)
                            .post('/api/ship')
                            .query({
                              'ship': 2,
                              'direction': 1,
                              'x': 8,
                              'y': 2
                            }).end((err, res) => {
                              chai.request(app)
                                .post('/api/ship')
                                .query({
                                  'ship': 3,
                                  'direction': 0,
                                  'x': 9,
                                  'y': 7
                                }).end((err, res) => {
                                  chai.request(app)
                                    .post('/api/ship')
                                    .query({
                                      'ship': 3,
                                      'direction': 0,
                                      'x': 7,
                                      'y': 9
                                    })
                                    .end((err, res) => {
                                      chai.request(app)
                                        .post('/api/ship')
                                        .query({
                                          'ship': 3,
                                          'direction': 0,
                                          'x': 7,
                                          'y': 7
                                        }).end((err, res) => {
                                          chai.request(app)
                                            .post('/api/ship')
                                            .query({
                                              'ship': 3,
                                              'direction': 0,
                                              'x': 9,
                                              'y': 9
                                            })
                                            .end((err, res) => {
                                              console.log('All ship Placed!')
                                              chai.request(app)
                                                .post('/api/attack')
                                                .query({
                                                  'x': 1,
                                                  'y': 1
                                                })
                                                .end((err, res) => {
                                                  Battleship.find()
                                                    .then((result) => {
                                                      if (result.length < 1) {
                                                        throw new Error('No data!');
                                                      }
                                                      let ocean = result[result.length - 1].boardState;
                                                      let fleet = result[result.length - 1].fleetState;
                                                      if (ocean === undefined) {
                                                        throw new Error('No board state');
                                                      }
                                                      if (fleet === undefined) {
                                                        throw new Error('No fleet state');
                                                      }
                                                      chai.assert(ocean[1][1], 3);
                                                      done();
                                                    })
                                                    .catch(err => { // if error we will be here
                                                      console.error('Database error:', err.stack);
                                                      process.exit(1);
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
