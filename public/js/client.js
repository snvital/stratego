

var Client = (function(window) {

  var socket      = null;
  var gameState   = null;

  var gameID      = null;
  var playerColor = null;
  var playerName  = null;

  var container   = null;
  var messages    = null;
  var board       = null;
  var squares     = null;

  var gameClasses = null;

  var selection   = null;

  var gameOverMessage     = null;
  var pawnPromotionPrompt = null;
  var forfeitPrompt       = null;
  var guess = null;
  var guessTarget = null;


  /**
   * Initialize the UI
   */
  var init = function(config) {
    gameID      = config.gameID;
    playerColor = config.playerColor;
    playerName  = config.playerName;

    container   = $('#game');
    messages    = $('#messages');
    board       = $('#board');
    squares     = board.find('.square');

    gameOverMessage     = $('#game-over');
    pawnPromotionPrompt = $('#pawn-promotion');
    forfeitPrompt       = $('#forfeit-game');
    readyPrompt       = $('#ready-game');

    gameClasses = "white black one two three four five six seven eight nine ten flag spy bomb  not-moved empty selected" +
                  "valid-move valid-capture valid-en-passant-capture valid-castle last-move hidden unknown";

    // Create socket connection
    socket = io.connect();

    // Define board based on player's perspective
    assignSquares();

    // Attach event handlers
    attachDOMEventHandlers();
    attachSocketEventHandlers();

    // Initialize modal popup windows
    gameOverMessage.modal({show: false, keyboard: false, backdrop: 'static'});
    pawnPromotionPrompt.modal({show: false, keyboard: false, backdrop: 'static'});
    forfeitPrompt.modal({show: false, keyboard: false, backdrop: 'static'});

    // Join game
    socket.emit('join', gameID);

    
  };

  /**
   * Assign square IDs and labels based on player's perspective
   */
  var assignSquares = function() {
    var fileLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    var rankLabels = [8, 7, 6, 5, 4, 3, 2, 1];
    var squareIDs  = [
      'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'i8', 'j8' ,
      'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'i7', 'j7' ,
      'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', 'i6', 'j6' ,
      'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'i5', 'j5' ,
      'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'i4', 'j4' ,
      'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'i3', 'j3' ,
      'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'i2', 'j2' ,
      'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'i1', 'j1'];

    if (playerColor === 'black') {
      fileLabels.reverse();
      rankLabels.reverse();
      squareIDs.reverse();
    }

    // Set file and rank labels
    $('.top-edge').each(function(i) { $(this).text(fileLabels[i]); });
    $('.right-edge').each(function(i) { $(this).text(rankLabels[i]); });
    $('.bottom-edge').each(function(i) { $(this).text(fileLabels[i]); });
    $('.left-edge').each(function(i) { $(this).text(rankLabels[i]); });

    // Set square IDs
    squares.each(function(i) { $(this).attr('id', squareIDs[i]); });
  };

  /**
   * Attach DOM event handlers
   */
  var attachDOMEventHandlers = function() {

    // Highlight valid moves for white pieces



    if (playerColor === 'white') {
      container.on('click', '.white', function(ev) {
    
        if (gameState.status === 'setup' && !$(ev.target).hasClass('valid-change')) { //change
          highlightValidChanges('w' + wordsToNumbers($(ev.target).attr('class').split(' ')[2]), ev.target);
        }
        if (gameState.status === 'ongoing'){ //change
          highlightValidMoves('w' + wordsToNumbers($(ev.target).attr('class').split(' ')[2]), ev.target);
      }
      });

 
    }

    // Highlight valid moves for black pieces
    if (playerColor === 'black') {
         container.on('click', '.black', function(ev) {
        if (gameState.status === 'setup' && !$(ev.target).hasClass('valid-change')) { //change
          highlightValidChanges('b' + wordsToNumbers($(ev.target).attr('class').split(' ')[2]), ev.target);
        }
        if (gameState.status === 'ongoing'){ //change
          highlightValidMoves('b' + wordsToNumbers($(ev.target).attr('class').split(' ')[2]), ev.target);
      }
      });
    }

    //guess piece

        container.on('click', '.guess', function(ev) {
      if(guess === 'B'){
          messages.empty();
        var m = capture(guessTarget);
        socket.emit('move', {gameID: gameID, move: m});

      }

     else if(wordsToNumbers($(ev.target).attr('class').split(' ')[1]) === guess){
        var m = guessFunction(guessTarget,true);
        messages.empty();
        socket.emit('move', {gameID: gameID, move: m});
     }
     else{
      clearHighlights();
      socket.emit('move', {gameID: gameID, move: null});

     }
    });


    // Clear all move highlights
    container.on('click', '.empty', function(ev) {
      clearHighlights();
    });

    // Perform a regular change
    container.on('click', '.valid-change', function(ev) {
      var m = change(ev.target);

        messages.empty();
        socket.emit('change', {gameID: gameID, move: m});
    });

    // Perform a regular move
    container.on('click', '.valid-move', function(ev) {
      var m = move(ev.target);

      // Test for pawn promotion
      if (/wP....8/.test(m) || /bP....1/.test(m)) {
        showPawnPromotionPrompt(function(p) {
          // replace piece
          messages.empty();
          socket.emit('move', {gameID: gameID, move: m+p});
        });
      } else {
        messages.empty();
        socket.emit('move', {gameID: gameID, move: m});
      }
    });

    // Perform a regular capture
    container.on('click', '.valid-capture', function(ev) {

      if(selection.piece === '1'){
                guess = wordsToNumbers($(ev.target).attr('class').split(' ')[2]);
                guessTarget = ev.target;
      var myContent = '<td class="guess one"></td><td class="guess two"></td><td class="guess three"></td><td class="guess four"></td><td class="guess five"></td><td class="guess six"></td><td class="guess seven"></td><td class="guess eight"></td><td class="guess nine"></td><td class="guess ten"></td><td class="guess spy"></td>';
        $(ev.target).popover({
                  html: true,
                  trigger: "click",
                  container:'#game',
                  content: myContent
                });
      }
      else{

            var m = capture(ev.target);

        messages.empty();
        socket.emit('move', {gameID: gameID, move: m});
      }
    });


  

    // Forfeit game
    container.on('click', '#forfeit', function(ev) {
      showForfeitPrompt(function(confirmed) {
        if (confirmed) {
          messages.empty();
          socket.emit('forfeit', gameID);
        }
      });
    });
    // Ready to start game
    container.on('click', '#ready', function(ev) {
      showReadyPrompt(function(confirmed) {
        if (confirmed) {
 
          $('#ready').text('Waiting for the other player');
          $('#ready').prop('disabled', true);

          messages.empty();
          socket.emit('ready', gameID);
        }
      });
    });
  };

  /**
   * Attach Socket.IO event handlers
   */
  var attachSocketEventHandlers = function() {

    // Update UI with new game state
    socket.on('update', function(data) {
      console.log(data);
      gameState = data;
      update();
    });

    // Display an error
    socket.on('error', function(data) {
      console.log(data);
      showErrorMessage(data);
    });
  };


  /**
   * Highlight valid changes for the selected piece
   */
  var highlightValidChanges = function(piece, selectedSquare) {

    var square = $(selectedSquare);
    var move   = null;

      // Set selection object
    selection = {
      color: piece[0],
      piece: piece[1],
      file:  square.attr('id')[0],
      rank:  square.attr('id')[1]
    };


        // Highlight the selected square
    squares.removeClass('selected');
    square.addClass('selected');


        // Highlight any valid moves
    squares.removeClass('valid-change');
  for (var i=0; i<squares.length; i++) {
    if($(squares[i]).hasClass('white') && piece[0] === 'w' && !($(squares[i]).attr('id') == square.attr('id'))
     || $(squares[i]).hasClass('black') && piece[0] === 'b' && !($(squares[i]).attr('id') == square.attr('id'))){
      $(squares[i]).addClass('valid-change');
    }

    }

     



}
  /**
   * Highlight valid moves for the selected piece
   */
  var highlightValidMoves = function(piece, selectedSquare) {
    var square = $(selectedSquare);
    var move   = null;

    // Set selection object
    selection = {
      color: piece[0],
      piece: piece[1],
      file:  square.attr('id')[0],
      rank:  square.attr('id')[1]
    };

    // Highlight the selected square
    squares.removeClass('selected');
    square.addClass('selected');

    // Highlight any valid moves
    squares.removeClass('valid-move valid-capture valid-en-passant-capture');
    for (var i=0; i<gameState.validMoves.length; i++) {
      move = gameState.validMoves[i];

      if (move.type === 'move') {
        if (move.pieceCode === piece && move.startSquare === square.attr('id')) {
          $('#'+move.endSquare).addClass('valid-move');
        }
      }

      if (move.type === 'capture') {
        if (move.pieceCode === piece && move.startSquare === square.attr('id')) {
          if (move.captureSquare === move.endSquare) {
            $('#'+move.endSquare).addClass('valid-capture');
          } else {
            $('#'+move.endSquare).addClass('valid-en-passant-capture');
          }
        }
      }

      
    }
  };

  /**
   * Clear valid move highlights
   */
  var clearHighlights = function() {
    squares.removeClass('selected');
    squares.removeClass('valid-move');
    squares.removeClass('valid-capture');
    squares.removeClass('valid-change');
    $("[data-rel='popover']").popover('destroy');
    $( ".popover" ).remove();



  };



    /**
   * Change selected piece with destination square piece
   */


  var change = function(destinationSquare) {

    console.log($(destinationSquare).attr('class').split(' ')[2]);
    var piece = selection.color+selection.piece;
    var piece2 = selection.color + wordsToNumbers($(destinationSquare).attr('class').split(' ')[2]);
    var src   = $('#'+selection.file+selection.rank);
    var dest  = $(destinationSquare);

    clearHighlights();

    // Move piece on board

    console.log(piece);
    console.log(piece2);
    src.removeClass(gameClasses).addClass(getPieceClasses(piece2));
    dest.removeClass(gameClasses).addClass(getPieceClasses(piece));

    // Return move string
    return 'c'+piece+piece2+selection.file+selection.rank+'x'+dest.attr('id');
  };

  /**
   * Move selected piece to destination square
   */
  var move = function(destinationSquare) {
    var piece = selection.color+selection.piece;
    var src   = $('#'+selection.file+selection.rank);
    var dest  = $(destinationSquare);

    clearHighlights();

    // Move piece on board
    src.removeClass(getPieceClasses(piece)).addClass('empty');
    dest.removeClass('empty').addClass(getPieceClasses(piece));

    // Return move string
    return piece+selection.file+selection.rank+'-'+dest.attr('id');
  };

  /**
   * Move selected piece to destination square and capture an opponents piece
   */
  var capture = function(destinationSquare) {
    var piece = selection.color+selection.piece;
    var src   = $('#'+selection.file+selection.rank);
    var dest  = $(destinationSquare);

    clearHighlights();

    // Move piece on board
    src.removeClass(getPieceClasses(piece)).addClass('empty');
    dest.removeClass(gameClasses).addClass(getPieceClasses(piece));

    // Return move string
    return piece+selection.file+selection.rank+'x'+dest.attr('id');
  };

   /**
   * Guess
   */
  var guessFunction = function(destinationSquare,) {
    var piece = selection.color+selection.piece;
    var src   = $('#'+selection.file+selection.rank);
    var dest  = $(destinationSquare);

    clearHighlights();

    // Move piece on board
    src.removeClass(getPieceClasses(piece)).addClass('empty');
    dest.removeClass(gameClasses).addClass(getPieceClasses(piece));

    // Return move string
    return piece+selection.file+selection.rank+'g'+dest.attr('id');
  };


  /**
   * Update UI from game state
   */
  var update = function() {
    var you, opponent = null;

    var container, name, status, captures = null;

    // Update player info
    for (var i=0; i<gameState.players.length; i++) {

      // Determine if player is you or opponent
      if (gameState.players[i].color === playerColor) {
        you = gameState.players[i];
        container = $('#you');
      }
      else if (gameState.players[i].color !== playerColor) {
        opponent = gameState.players[i];
        container = $('#opponent');
      }

      name     = container.find('strong');
      status   = container.find('.status');
      captures = container.find('ul');

      // Name
      if (gameState.players[i].name) {
        name.text(gameState.players[i].name);
      }

      // Active Status
      container.removeClass('active-player');
      if (gameState.activePlayer && gameState.activePlayer.color === gameState.players[i].color) {
        container.addClass('active-player');
      }

      // Check Status
      status.removeClass('label label-danger').text('');
      if (gameState.players[i].inCheck) {
        status.addClass('label label-danger').text('Check');
      }

      // Captured Pieces
      captures.empty();
      for (var j=0; j<gameState.capturedPieces.length; j++) {
        if (gameState.capturedPieces[j][0] !== gameState.players[i].color[0]) {
          captures.append('<li class="'+getPieceClasses(gameState.capturedPieces[j])+'"></li>');
        }
      }
    }

    // Update board
    for (var sq in gameState.board) {
      $('#'+sq).removeClass(gameClasses).addClass(getPieceClasses(gameState.board[sq]));
    }

    // Highlight last move
    if (gameState.lastMove) {
      if (gameState.lastMove.type === 'move') {
        $('#'+gameState.lastMove.startSquare).addClass('last-move');
        $('#'+gameState.lastMove.endSquare).addClass('last-move');
      }
        if(gameState.lastMove.type === 'capture'){
          $('#'+gameState.lastMove.startSquare).addClass('last-move');
          $('#'+gameState.lastMove.endSquare).addClass('last-move');


        }

      
      
    }

    // Test for checkmate

    if (gameState.status === 'setup') {
      $('#ready-button').show();
    }
     if (gameState.status === 'ongoing') {
      $('#ready-button').hide();
      clearHighlights();
    }

    if (gameState.status === 'checkmate') {
      if (opponent.inCheck) { showGameOverMessage('checkmate-win');  }
      if (you.inCheck)      { showGameOverMessage('checkmate-lose'); }
    }

    // Test for stalemate
    if (gameState.status === 'stalemate') { showGameOverMessage('stalemate'); }

   

    // Test for forfeit
    if (gameState.status === 'forfeit') {
      if (opponent.forfeited) { showGameOverMessage('forfeit-win');  }
      if (you.forfeited)      { showGameOverMessage('forfeit-lose'); }
    }
  };

  /**
   * Display an error message on the page
   */
  var showErrorMessage = function(data) {
    var msg, html = '';

    if (data == 'handshake unauthorized') {
      msg = 'Client connection failed';
    } else {
      msg = data.message;
    }

    html = '<div class="alert alert-danger">'+msg+'</div>';
    messages.append(html);
  };

  /**
   * Display the "Game Over" window
   */
  var showGameOverMessage = function(type) {
    var header = gameOverMessage.find('h2');

    // Set the header's content and CSS classes
    header.removeClass('alert-success alert-danger alert-warning');
    switch (type) {
      case 'checkmate-win'  : header.addClass('alert-success').text('You win the game'); break;
      case 'checkmate-lose' : header.addClass('alert-danger').text('You lost the game'); break;
      case 'forfeit-win'    : header.addClass('alert-success').text('Your opponent has forfeited the game'); break;
      case 'forfeit-lose'   : header.addClass('alert-danger').text('You have forfeited the game'); break;
      case 'stalemate'      : header.addClass('alert-warning').text('Stalemate'); break;
    }

    gameOverMessage.modal('show');
  };



  /**
   * Display the "Forfeit Game" confirmation prompt
   */
  var showForfeitPrompt = function(callback) {

    // Temporarily attach click handler for the Cancel button, note the use of .one()
    forfeitPrompt.one('click', '#cancel-forfeit', function(ev) {
      callback(false);
      forfeitPrompt.modal('hide');
    });

    // Temporarily attach click handler for the Confirm button, note the use of .one()
    forfeitPrompt.one('click', '#confirm-forfeit', function(ev) {
      callback(true);
      forfeitPrompt.modal('hide');
    });

    forfeitPrompt.modal('show');
  };


  /**
   * Display the "Forfeit Game" confirmation prompt
   */
  var showReadyPrompt = function(callback) {

    // Temporarily attach click handler for the Cancel button, note the use of .one()
    readyPrompt.one('click', '#cancel-ready', function(ev) {
      callback(false);
      readyPrompt.modal('hide');
    });

    // Temporarily attach click handler for the Confirm button, note the use of .one()
    readyPrompt.one('click', '#confirm-ready', function(ev) {
      callback(true);
      readyPrompt.modal('hide');
    });

    readyPrompt.modal('show');
  };

  /**
   * Get the corresponding CSS classes for a given piece
   */
  var getPieceClasses = function(piece) {


if(piece === 'lake')
 return piece;


 if (playerColor === 'black') {

  switch (piece) {
      case 'b1'  : return 'black one';
      case 'b1_' : return 'black one not-moved';
      case 'b2'  : return 'black two';
      case 'b2_' : return 'black two not-moved';
      case 'b3'  : return 'black three';
      case 'b3_' : return 'black three not-moved';
      case 'b4'  : return 'black four';
      case 'b4_' : return 'black four not-moved';
      case 'b5'  : return 'black five';
      case 'b5_' : return 'black five not-moved';
      case 'b6'  : return 'black six';
      case 'b6_' : return 'black six not-moved';
      case 'b7'  : return 'black seven';
      case 'b7_' : return 'black seven not-moved';
      case 'b8'  : return 'black eight';
      case 'b8_' : return 'black eight not-moved';
      case 'b9'  : return 'black nine';
      case 'b9_' : return 'black nine not-moved';
      case 'bT'  : return 'black ten';
      case 'bT_' : return 'black ten not-moved';
      case 'bS'  : return 'black spy';
      case 'bS_' : return 'black spy not-moved';
      case 'bB'  : return 'black bomb';
      case 'bB_' : return 'black bomb not-moved';
      case 'bF'  : return 'black flag';
      case 'bF_' : return 'black flag not-moved';
      case 'w1'  : return 'white unknown one';
      case 'w1_' : return 'white unknown one not-moved';
      case 'w2'  : return 'white unknown two';
      case 'w2_' : return 'white unknown two not-moved';
      case 'w3'  : return 'white unknown three';
      case 'w3_' : return 'white unknown three not-moved';
      case 'w4'  : return 'white unknown four';
      case 'w4_' : return 'white unknown four not-moved';
      case 'w5'  : return 'white unknown five';
      case 'w5_' : return 'white unknown five not-moved';
      case 'w6'  : return 'white unknown six';
      case 'w6_' : return 'white unknown six not-moved';
      case 'w7'  : return 'white unknown seven';
      case 'w7_' : return 'white unknown seven not-moved';
      case 'w8'  : return 'white unknown eight';
      case 'w8_' : return 'white unknown eight not-moved';
      case 'w9'  : return 'white unknown nine';
      case 'w9_' : return 'white unknown nine not-moved';
      case 'wT'  : return 'white unknown ten';
      case 'wT_' : return 'white unknown ten not-moved';
      case 'wS'  : return 'white unknown spy';
      case 'wS_' : return 'white unknown spy not-moved';
      case 'wB'  : return 'white unknown bomb';
      case 'wB_' : return 'white unknown bomb not-moved';
      case 'wF'  : return 'white unknown flag';
      case 'wF_' : return 'white unknown flag not-moved';
      default    : return 'empty';
    }
    }

    if(playerColor === 'white'){
        switch (piece) {
      case 'b1'  : return 'black unknown one';
      case 'b1_' : return 'black unknown one not-moved';
      case 'b2'  : return 'black unknown two';
      case 'b2_' : return 'black unknown two not-moved';
      case 'b3'  : return 'black unknown three';
      case 'b3_' : return 'black unknown three not-moved';
      case 'b4'  : return 'black unknown four';
      case 'b4_' : return 'black unknown four not-moved';
      case 'b5'  : return 'black unknown five';
      case 'b5_' : return 'black unknown five not-moved';
      case 'b6'  : return 'black unknown six';
      case 'b6_' : return 'black unknown six not-moved';
      case 'b7'  : return 'black unknown seven';
      case 'b7_' : return 'black unknown seven not-moved';
      case 'b8'  : return 'black unknown eight';
      case 'b8_' : return 'black unknown eight not-moved';
      case 'b9'  : return 'black unknown nine';
      case 'b9_' : return 'black unknown nine not-moved';
      case 'bT'  : return 'black unknown ten';
      case 'bT_' : return 'black unknown ten not-moved';
      case 'bS'  : return 'black unknown spy';
      case 'bS_' : return 'black unknown spy not-moved';
      case 'bB'  : return 'black unknown bomb';
      case 'bB_' : return 'black unknown bomb not-moved';
      case 'bF'  : return 'black unknown flag';
      case 'bF_' : return 'black unknown flag not-moved';
      case 'w1'  : return 'white one';
      case 'w1_' : return 'white one not-moved';
      case 'w2'  : return 'white two';
      case 'w2_' : return 'white two not-moved';
      case 'w3'  : return 'white three';
      case 'w3_' : return 'white three not-moved';
      case 'w4'  : return 'white four';
      case 'w4_' : return 'white four not-moved';
      case 'w5'  : return 'white five';
      case 'w5_' : return 'white five not-moved';
      case 'w6'  : return 'white six';
      case 'w6_' : return 'white six not-moved';
      case 'w7'  : return 'white seven';
      case 'w7_' : return 'white seven not-moved';
      case 'w8'  : return 'white eight';
      case 'w8_' : return 'white eight not-moved';
      case 'w9'  : return 'white nine';
      case 'w9_' : return 'white nine not-moved';
      case 'wT'  : return 'white ten';
      case 'wT_' : return 'white ten not-moved';
      case 'wS'  : return 'white spy';
      case 'wS_' : return 'white spy not-moved';
      case 'wB'  : return 'white bomb';
      case 'wB_' : return 'white bomb not-moved';
      case 'wF'  : return 'white flag';
      case 'wF_' : return 'white flag not-moved';
      default    : return 'empty';
    }

    }


    
  };

  var wordsToNumbers = function(word) {
    var translation = {
    'zero': '0',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
    'ten': 'T',
    'spy': 'S',
    'bomb': 'B',
    'flag': 'F',

};

    return translation[word];

  }



  return init;

}(window));