game.turn = {
  build: function (time) {
    if (!game.turn.builded) {
      game.turn.builded = true;
      game.turn.msg = $('<p>').appendTo(game.topbar).addClass('turns').text(game.data.ui.turns + ': 0/0 (0)');
      game.turn.time = $('<p>').appendTo(game.topbar).addClass('time').text(game.data.ui.time + ': 0:00 Day');
      game.turn.el = $('<h1>').addClass('turntitle').appendTo(game.states.table.el);
    }
    game.time = time || 0;
    game.player.turn = 0;
    game.enemy.turn = 0;
    game.player.kills = 0;
    game.enemy.kills = 0;
    game.player.deaths = 0;
    game.enemy.deaths = 0;
    game.moves = [];
    game.turn.tickTime(true);
  },
  beginPlayer: function (cb) {
    if (game.currentState == 'table') {
      game.player.turn += 1;
      game.message.text(game.data.ui.yourturn);
      game.turn.el.text(game.data.ui.yourturn).addClass('show');
      game.turn.beforeStart('player', cb);
    }
  },
  beginEnemy: function (cb) {
    if (game.currentState == 'table') {
      game.enemy.turn += 1;
      game.message.text(game.data.ui.enemyturn);
      game.turn.el.text(game.data.ui.enemyturn).addClass('show');
      game.turn.beforeStart('enemy', cb);
    }
  },
  beforeStart: function (turn, cb) {
    game.currentMoves = [];
    $('.table .card.dead').each(game.turn.reborn);
    $('.map .fountain.enemyarea .card.enemy, .map .fountain.playerarea .card.player').heal(game.fountainHeal);
    $('.table .card').each(function () {
      game.turn.triggerStart(this, turn);
    });
    var t = 800;
    if (game.mode == 'local') t = 2800;
    game.timeout(t, function () {
      game.turn.el.removeClass('show');
      game.timeout(400, game.turn.start.bind(this, turn, cb));
    });
  },
  start: function (turn, cb) {
    game.currentTurnSide = turn;
    if (game.mode == 'library') {
      if (turn != 'enemy') game.turn.enableAttack('enemy');
    } else game.turn.enableAttack(turn);
    $('.map .card.done').each(game.turn.enableMove);
    if (turn == 'player') game.states.table.el.addClass('turn');
    if (turn == 'enemy' && game.mode == 'local') game.states.table.el.addClass('unturn');
    game.loader.removeClass('loading');
    game.states.table.skip.attr('disabled', false);
    game.highlight.map();
    if (cb) {
      game.timeout(400, cb.bind(this, turn));
    }
  },
  count: function (turn, endCallback, countCallback) {
    if (game.turn.counter >= 0) {
      var turncount;
      if (turn === 'player') turncount = game.data.ui.yourturncount;
      if (turn === 'enemy') turncount = game.data.ui.enemyturncount;
      game.message.text(turncount + ' ' + game.turn.counter + ' ' + game.data.ui.seconds);
      if (game.turn.counter > 0) {
        if (countCallback) countCallback(turn);
        if (!((game.mode == 'local' || game.mode == 'single') && game.container.hasClass('option-state'))) {
          game.turn.counter -= 1;
        }
        game.turn.timeout = game.timeout(1000, game.turn.count.bind(this, turn, endCallback, countCallback));
      }
      if (game.turn.counter === 0 && endCallback) {
        clearTimeout(game.turn.timeout);
        game.turn.timeout = game.timeout(1000, function () { endCallback(turn); });
      }
    }
  },
  stopCount: function () {
    clearTimeout(game.turn.timeout);
    game.turn.counter = -1;
  },
  end: function (turn, cb) {
    if (game.currentState == 'table') {
      game.currentTurnSide = false;
      game.message.text(game.data.ui.turnend);
      game.moves.push(game.currentMoves.join('|'));
      game.states.table.skip.attr('disabled', true);
      $('.map .card').each(function (i, el) {
        var card = $(el);
        card.removeClass('can-attack');
        game.turn.channel(card);
        game.buff.turn(card);
        card.trigger('turnend', { target: card });
      });
      if (turn == 'player') {
        game.states.table.el.removeClass('turn');
      }
      if (game.mode == 'local') {
        game.states.table.el.removeClass('turn unturn');
      }
      if (turn == 'enemy' && game.mode !== 'library') {
        game.states.table.el.removeClass('unturn');
      }
      game.audio.play('activate');
      game.turn.tickTime();
      if (cb) cb(turn);
    }
  },
  reborn: function () {
    var dead = $(this);
    if (game.time > dead.data('reborn') && !dead.hasBuff('wk-ult') ) { 
      dead.reborn();
    }
  },
  triggerStart: function (el, turn) {
    var card = $(el);
    card.trigger('turnstart', { target: card });
    card.trigger(turn+'turnstart', { target: card });
  },
  channel: function (hero) {
    if (hero.hasClass('channeling')) {
      var duration = hero.data('channeling');
      if (duration >= 0) {
        hero.trigger('channel', hero.data('channel event')); 
        duration -= 1;
        hero.data('channeling', duration);
        if (duration === 0) hero.stopChanneling();
      }
    }
  },
  enableAttack: function(turn) {
    $('.map .card.'+turn+':not(.towers, .ghost)').each(function () {
      var unit = $(this);
      if (unit.canAttack(true)) unit.addClass('can-attack');
    });
  },
  enableMove: function() {
    var unit = $(this);
    if (unit.canMove(true)) unit.removeClass('done');
  },
  noAvailableMoves: function () {
    var mapdone = ($('.map .player.card:not(.towers, .ghost)').length == $('.map .player.card.done:not(.towers, .ghost)').length);
    var skilldone = $('.table .player .skills.hand .card, .table .player .skills.sidehand .card').length;
    var moves = mapdone && skilldone;
    return moves;
  },
  tickTime: function (build) { 
    if (!build) game.time += 0.5; // console.trace('t', game.time, game.turn.hours() );
    game.totalTurns = Math.floor(game.player.turn + game.enemy.turn);
    game.turn.msg.text(game.data.ui.turns + ': ' + game.player.turn + '/' + game.enemy.turn + ' (' + game.totalTurns + ')');
    game.turn.time.html(game.data.ui.time + ': ' + game.turn.hours() + ' ' + game.turn.dayNight());
  },
  hours: function () {
    var convertedMin, intMin, stringMin,
      hours = game.time % (game.dayLength * 2),
      intHours = parseInt(hours, 10),
      minutes = hours - intHours;
    convertedMin = minutes * 60;
    intMin = parseInt(convertedMin, 10);
    stringMin = intMin < 10 ? '0' + intMin : intMin;
    return intHours + ':' + stringMin;
  },
  dayNight: function () {
    var hours = game.time % (game.dayLength * 2);
    if (hours >= 6 && hours < 18) {
      game.camera.removeClass('night');
      return '<span title="' + game.data.ui.day + '">☀</span>';
    } else {
      game.camera.addClass('night');
      return '<span title="' + game.data.ui.night + '">🌙</span>';
    }
  }
};
