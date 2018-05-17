var _ = require('underscore');



/*
 * The Game object
 */

/**
 * Create new game and initialize
 */
function Game(params) {

  // pending/setup/ongoing/checkmate/stalemate/forfeit
  this.status = 'pending';

  this.activePlayer = null;

  this.players = [
    {color: null, name: null, joined: false, inCheck: false, forfeited: false,  ready: false},
    {color: null, name: null, joined: false, inCheck: false, forfeited: false, ready: false}
  ];



this.board = {
    a8: 'bF_', b8: 'bB_', c8: 'bB_', d8: 'bB_', e8: 'bB_', f8: 'bB_', g8: 'bB_', h8: 'bS_', i8: 'b1', j8: 'b1',
    a7: 'b2_', b7: 'b2_', c7: 'b2_', d7: 'b2_', e7: 'b2_', f7: 'b3_', g7: 'b3_', h7: 'b3_', i7: 'b3', j7: 'b3',
    a6: 'b4',  b6: 'b4',  c6: 'b5',  d6: 'b5',  e6: 'b6',  f6: 'b6',  g6: 'b7',  h6: 'b8', i6: 'b9', j6: 'bT',
    a5: null,  b5: null,  c5: 'lake', d5: 'lake',  e5: null,  f5: null,  g5: 'lake',  h5: 'lake', i5: null, j5: null,
    a4: null,  b4: null,  c4: 'lake', d4: 'lake',  e4: null,  f4: null,  g4: 'lake',  h4: 'lake', i4: null, j4: null,
    a3: 'wT_', b3: 'w9_', c3: 'w8_', d3: 'w7_', e3: 'w6_',  f3: 'w6_',  g3: 'w5_',  h3: 'w5_', i3: 'w4_', j3: 'w4_',
    a2: 'w3_', b2: 'w3_', c2: 'w3_', d2: 'w3_', e2: 'w3_', f2: 'w2_', g2: 'w2_', h2: 'w2_', i2: 'w2_', j2: 'w2_',
    a1: 'w1_', b1: 'w1_', c1: 'wS_', d1: 'wB_', e1: 'wB_', f1: 'wB_', g1: 'wB_', h1: 'wB_', i1: 'wB_', j1: 'wF_'
  };
  this.capturedPieces = [];

  this.validMoves = [
  ];

  this.lastMove = null;

  this.modifiedOn = Date.now();

  // Set player colors
  // params.playerColor is the color of the player who created the game
  if (params.playerColor === 'white') {
    this.players[0].color = 'white';
    this.players[1].color = 'black';
  }
  else if (params.playerColor === 'black') {
    this.players[0].color = 'black';
    this.players[1].color = 'white';
  }
}

/**
 * Add player to game, and after both players have joined activate the game.
 * Returns true on success and false on failure.
 */
Game.prototype.addPlayer = function(playerData) {

  // Check for an open spot
  var p = _.findWhere(this.players, {color: playerData.playerColor, joined: false});
  if (!p) { return false; }

  // Set player info
  p.name = playerData.playerName;
  p.joined = true;

  // If both players have joined, start the game
  if (this.players[0].joined && this.players[1].joined && this.status === 'pending') {
    this.status = 'setup';
    //this.activePlayer = _.findWhere(this.players, {color: 'white'});
    //this.status = 'ongoing';
  }

  this.modifiedOn = Date.now();

  return true;
};

/**
 * Remove player from game, this does not end the game, players may come and go as they please.
 * Returns true on success and false on failure.
 */
Game.prototype.removePlayer = function(playerData) {

  // Find player in question
  var p = _.findWhere(this.players, {color: playerData.playerColor});
  if (!p) { return false; }

  // Set player info
  p.joined = false;

  this.modifiedOn = Date.now();

  return true;
};

/**
 * Apply move and regenerate game state.
 * Returns true on success and false on failure.
 */
Game.prototype.change = function(moveString) {  
  if(this.status === 'setup'){

  var mychange = parseMoveString(moveString);

  this.board[mychange.endSquare] = mychange.pieceCode;
  this.board[mychange.startSquare] = mychange.pieceCode2;

  this.modifiedOn = Date.now();


  return mychange;
}
else return null;

}

/**
 * Apply move and regenerate game state.
 * Returns true on success and false on failure.
 */
Game.prototype.move = function(moveString) {  

  // Test if move is valid

  moveString = parseMoveString(moveString)
  if(moveString != 'nomove'){
  var validMove = _.findWhere(this.validMoves,moveString);
  

  if (!validMove) { return false; }


 

  // Apply moves
  switch (validMove.type) {
    case 'move' :
      this.board[validMove.endSquare] =  validMove.pieceCode;
      this.board[validMove.startSquare] = null;
      break;
    case 'change':
          this.board[validMove.endSquare] = validMove.pieceCode;
          this.board[validMove.startSquare] = null;
      break;

    case 'capture' :
    if(this.board[validMove.captureSquare][1] === 'F'){
        console.log('you won')

        this.status = 'checkmate';

      }  
      //if guess
      if(validMove.pieceCode[1] === '1' &&  (this.board[validMove.captureSquare][1] != 'B' ) &&  this.board[validMove.captureSquare][1] != 'F'){
      this.capturedPieces.push(this.board[validMove.captureSquare]);
      this.board[validMove.captureSquare] = null;
      this.board[validMove.endSquare] =  null;


      }
    // if piece capture is sucessfull
      else if(validMove.pieceCode[1] >= this.board[validMove.captureSquare][1]  
      || (this.board[validMove.captureSquare][1] === 'B' && validMove.pieceCode[1] === '3' )
      || (validMove.pieceCode[1] === 'S'  && this.board[validMove.captureSquare][1] === 'T' )){

       
      this.capturedPieces.push(this.board[validMove.captureSquare]);
      this.board[validMove.captureSquare] = null;

      this.board[validMove.endSquare] =  validMove.pieceCode;
      this.board[validMove.startSquare] = null;
      

      break;

    } 

    // if piece gets captured
    else if(validMove.pieceCode[1] < this.board[validMove.captureSquare][1]
       || this.board[validMove.captureSquare][1] === 'B'
       || this.board[validMove.captureSquare][1] === 'T'){
      console.log('you got captured')
      this.capturedPieces.push(validMove.pieceCode);
      this.board[validMove.startSquare] = null;
      break;

    }

    default : break;
  };



  // Set this move as last move
  this.lastMove = validMove
;}
  // Get inactive player
  var inactivePlayer = _.find(this.players, function(p) {
    return (p === this.activePlayer) ? false : true;
  }, this);

  // Regenerate valid moves
  this.validMoves = getMovesForPlayer(inactivePlayer.color, this.board);



  // Toggle active player
  if (this.status === 'ongoing') { this.activePlayer = inactivePlayer;  }
    if (this.status === 'checkmate') { inactivePlayer.inCheck = true  }



  this.modifiedOn = Date.now();

  return true;
};

/**
 * Apply a player's forfeit to the game.
 * Returns true on success and false on failure.
 */
Game.prototype.forfeit = function(playerData) {

  // Find player in question
  var p = _.findWhere(this.players, {color: playerData.playerColor});
  if (!p) { return false; }

  // Set player info
  p.forfeited = true;

  // Set game status
  this.status = 'forfeit';

  this.modifiedOn = Date.now();

  return true;
};

Game.prototype.ready = function(playerData) {

  // Find player in question
  var p = _.findWhere(this.players, {color: playerData.playerColor});
  if (!p) { return false; }

  // Set player info
  p.ready = true;

  if(this.players[0].ready && this.players[1].ready){
  // Set game status
  this.activePlayer = _.findWhere(this.players, {color: 'white'});
  this.status = 'ongoing';
  this.validMoves = getMovesForPlayer(this.activePlayer.color, this.board, this.lastMove);



}

  this.modifiedOn = Date.now();

  return true;
};

/*
 * Private Utility Functions
 */

/**
 * Get all the valid/safe moves a player can make.
 * Returns an array of move objects on success or an empty array on failure.
 */
var getMovesForPlayer = function(playerColor, board) {
  var moves = [];
  var piece, square = null;



  

  // Loop board
  for (square in board) {
    piece = board[square];


    // Skip empty squares and opponent's pieces
    if (piece === null) { continue; }
    if (piece[0] !== playerColor[0] ) { continue; }
    if (piece[1] === 'B' || piece[1] === 'F' ) { continue; }


    if(piece[1] === '2'){
      moves.push.apply(moves, getMovesForTwo(piece, square, board));
      continue;}


     moves.push.apply(moves, getMovesForToken(piece, square, board));
  
  }
  

  return moves;
};




/**
 * Get all the moves a pawn can make.
 * If includeUnsafe is true then moves that put the player's own king in check will be included.
 * Returns an array of move objects on success or an empty array on failure.
 */
var getMovesForToken = function(piece, square, board) {
  var moves = [];
  console.log(piece);
    console.log(square);

  var moveTransforms, captureTransforms = [];

    moveTransforms    =  [{x:+0, y:+1} , {x:+0, y:-1}, {x:-1, y:+0}, {x:+1, y:+0}];
    captureTransforms = [{x:+0, y:+1} , {x:+0, y:-1}, {x:-1, y:+0}, {x:+1, y:+0}];
  



  if (piece[1]  === 2){}

  var destination, move, capture = null;

  // Loop moves
  for (var i=0; i<moveTransforms.length; i++) {

    // Get destination square for move
    destination = transformSquare(square, moveTransforms[i]);

    console.log(destination);
    if (!destination) { continue; }

    // If destination square is empty
    if (board[destination] === null) {
      move = {type: 'move', pieceCode: piece.substring(0,2), startSquare: square, endSquare: destination};
     moves.push(move); 
    }
    // If destination square is occupied
    else {
    }
  }

  // Loop captures


  for (var i=0; i<captureTransforms.length; i++) {


    // Get destination square for capture
    destination = transformSquare(square, captureTransforms[i]);
    if (!destination) { continue; }

    // If destination square is empty
     if (board[destination] === null || board[destination] === undefined) {

    }
    //if destination is lake
    else if (board[destination] === 'lake') {

    }
    // If destination square is occupied by foe
    else if (board[destination][0] !== piece[0]) {
      capture = {
        type          : 'capture',
        pieceCode     : piece.substring(0,2),
        startSquare   : square,
        endSquare     : destination,
        captureSquare : destination
      };
       moves.push(capture); 
    }

    // If destination square is occupied by friend
    else {
      // Do nothing
    }
  }


  return moves;
};

/**
 * Get all the moves a two can make.
 * Returns an array of move objects on success or an empty array on failure.
 */
var getMovesForTwo = function(piece, square, board) {
  console.log('DOIS');
  var moves = [];

  var transforms = {
    n: [{x:0, y:+1}, {x:0, y:+2}, {x:0, y:+3}, {x:0, y:+4}, {x:0, y:+5}, {x:0, y:+6}, {x:0, y:+7}],
    e: [{x:+1, y:0}, {x:+2, y:0}, {x:+3, y:0}, {x:+4, y:0}, {x:+5, y:0}, {x:+6, y:0}, {x:+7, y:0}, {x:+8, y:0}, {x:+9, y:0}],
    s: [{x:0, y:-1}, {x:0, y:-2}, {x:0, y:-3}, {x:0, y:-4}, {x:0, y:-5}, {x:0, y:-6}, {x:0, y:-7}],
    w: [{x:-1, y:0}, {x:-2, y:0}, {x:-3, y:0}, {x:-4, y:0}, {x:-5, y:0}, {x:-6, y:0}, {x:-7, y:0}, {x:-8, y:0}, {x:-9, y:0}]
  };

  var destination, move = null;

  // Loop all moves
  for (var group in transforms) {
    for (var i=0; i<transforms[group].length; i++) {

      // Get destination square for move
      destination = transformSquare(square, transforms[group][i]);
      if (!destination) { break; }

      // If destination square is empty
      if (board[destination] === null) {
        move = {
          type        : 'move',
          pieceCode   : piece.substring(0,2),
          startSquare : square,
          endSquare   : destination
        };
        moves.push(move); 
      }
      // If destination square is occupied by foe
      else if (board[destination][0] !== piece[0]) {
        move = {
          type          : 'capture',
          pieceCode     : piece.substring(0,2),
          startSquare   : square,
          endSquare     : destination,
          captureSquare : destination
        };
         moves.push(move); 
        break;
      }
      // If destination square is occupied by friend
      else {
        break;
      }
    }
  }

  return moves;
};



/**
 * Apply an x and y offset to a starting square to get a destination square.
 * Returns the destination square on success or false on failure.
 */
var transformSquare = function(square, transform) {

  var alpha2num = function(a) {
    switch (a) {
      case 'a': return 1;
      case 'b': return 2;
      case 'c': return 3;
      case 'd': return 4;
      case 'e': return 5;
      case 'f': return 6;
      case 'g': return 7;
      case 'h': return 8;
      case 'i': return 9;
      case 'j': return 10;
      default : return 11; // out of bounds
    }
  };

  var num2alpha = function(n) {
    switch (n) {
       case 1: return 'a';
       case 2: return 'b';
       case 3: return 'c';
       case 4: return 'd';
       case 5: return 'e';
       case 6: return 'f';
       case 7: return 'g';
       case 8: return 'h';
       case 9: return 'i';
       case 10: return 'j';
       default: return 'k'; // out of bounds
    }
  };

  // Parse square
  var file = square[0];
  var rank = parseInt(square[1], 10);

  // Apply transform
  var destFile = alpha2num(file) + transform.x;
  var destRank = rank + transform.y;

  // Check boundaries
  if (destFile < 1 || destFile > 10) { return false; }
  if (destRank < 1 || destRank > 8) { return false; }

  // Return new square
  return num2alpha(destFile) + destRank;
};

/**
 * Parse a move string and convert it to an object.
 * Returns the move object on success or null on failure.
 */
var parseMoveString = function(moveString) {

  console.log(moveString);
  console.log(this.status);

  // En Passant Captures

  if(moveString === null){
    return 'nomove';
  }

  if(moveString[0] === 'c'){
    return {
      type          : 'change',
      pieceCode     : moveString.substring(1, 3),
      pieceCode2     : moveString.substring(3, 5),
      startSquare   : moveString.substring(5, 7),
      endSquare     : moveString.substring(8, 10)    }
  }
  if (moveString[1] === 'P' && moveString[4] === 'x' && moveString.slice(-2) === 'ep') {
    return {
      type          : 'capture',
      pieceCode     : moveString.substring(0, 2),
      startSquare   : moveString.substring(2, 4),
      endSquare     : moveString.substring(5, 7),
      captureSquare : moveString[5] + moveString[3]
    }
  }

  // Moves
  if (moveString[4] === '-') {
    return {
      type        : 'move',
      pieceCode   : moveString.substring(0, 2),
      startSquare : moveString.substring(2, 4),
      endSquare   : moveString.substring(5, 7)
    }
  }
  // Captures
  else if (moveString[4] === 'x') {
    return {
      type          : 'capture',
      pieceCode     : moveString.substring(0, 2),
      startSquare   : moveString.substring(2, 4),
      endSquare     : moveString.substring(5, 7),
      captureSquare : moveString.substring(5, 7)
    }
  } else if (moveString[4] === 'g') {
        return {
      type          : 'capture',
      pieceCode     : moveString.substring(0, 2),
      startSquare   : moveString.substring(2, 4),
      captureSquare : moveString.substring(5, 7)
    }


  }
  else{
    return null;
  
  }
};

// Export the game object
module.exports = Game;