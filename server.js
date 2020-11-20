(function() {
  var app, io, redis, redisClient, server, serverPort, bodyParser;

  app = require('express')();
  server = require('http').Server(app);
  io = require('socket.io')(server, {
    'cors': {
      'methods': ['GET', 'PATCH', 'POST', 'PUT'],
      'origin': true // accept from any domain
    }
  });
  redis = require('redis');
  redisClient = redis.createClient({
    host: 'redis-server',
    port: 6379
  });
  bodyParser = require('body-parser')
  serverPort = 3000;
  /*
    This is a chat experiment with node, socket.io,
    express, redis and bootstrap on the frontend.
    */

  app.use(bodyParser.urlencoded({extended : true}));

  /* Routes */
  app.get('/', function(req, res) {
    return res.sendFile(__dirname + '/html/index.html');
  });

  app.get('/css', function(req, res) {
    return res.sendFile(__dirname + '/css/main.css');
  });

  app.get('/js', function(req, res) {
    return res.sendFile(__dirname + '/client.js');
  });

  app.get('/messageHistory', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    return redisClient.lrange('messageHistory', 0, -1, function(err, obj) {
      return res.send(obj);
    });
  });

  app.post('/get_user_id', function(req, res){
    return redisClient.hget('users', req.body.username, function(err, obj) {
      return res.send(obj);
    });
  });

  /* Socket.io */
  io.on('connection', function(client) {
    console.log('New connection -> ' + client.id);
    client.on('join', function(nickname) {
      var error;
      if (nickname === void 0 || nickname === '') {
        return client.emit('login');
      } else {
        console.log('User ' + nickname + ' joined with id ' + client.id);
        client.nickname = nickname.toLowerCase();
        console.log('Retrieve users from Redis');
        try {
          redisClient.hset('users', nickname.toLowerCase(), client.id, function(err, obj) {
            var error, message;
            message = nickname + ' joined';
            client.broadcast.emit('notification', {
              message: message
            });
            try {
              return redisClient.hkeys('users', function(err, obj) {
                client.broadcast.emit('update user list', obj);
                return client.emit('update user list', obj);
              });
            } catch (_error) {
              error = _error;
              return console.log(error);
            }
          });
        } catch (_error) {
          error = _error;
          console.log(error);
        }
        return console.log('Retrieve keys from users list in Redis');
      }
    });

    client.on('message', function(data) {
      var error, nickname;
      nickname = client.nickname;
      if (data.message !== '') {
        if (data.user.toLowerCase() === 'all') {
          client.broadcast.emit('message', {
            nickname: nickname,
            message: data.message
          });
          client.emit('message', {
            nickname: nickname,
            message: data.message
          });
          return redisClient.rpush('messageHistory', JSON.stringify({
            nickname: nickname,
            message: data.message
          }));
        } else {
          try {
            return redisClient.hget('users', data.user.toLowerCase(), function(err, obj) {
              var destinationUserID;
              destinationUserID = obj;
              if (client.broadcast.to(destinationUserID)) {
                return client.broadcast.to(destinationUserID).emit('privateMessage', {
                  userID: client.id,
                  destinationUsername: data.user,
                  username: client.nickname,
                  message: data.message
                });
              } else {
                return console.log('Could not deliver message to user.');
              }
            });
          } catch (_error) {
            error = _error;
            return console.log(error);
          }
        }
      }
    });

    client.on('privateMessage received', function(data) {
      console.log('privateMessage received');
      console.log(client.nickname);
      console.log(data);
      if (client.broadcast.to(data.originUserID)) {
        return client.broadcast.to(data.originUserID).emit('show privateMessage sent', {
          nickname: data.originUsername,
          message: data.message,
          userID: data.originUserID,
        });
      }
    });

    /*
      The messages shouldn't be going back and forth for
      the delivery confirmation. They should be saved in
      redis and only the confirmation should go back and forth.
      For the sake of this experiment I did it in this simple manner.
      */
    return client.on('disconnect', function() {
      var error;
      if (client.nickname !== void 0 && redisClient.exists('users' && redisClient.hexists('users', client.nickname))) {
        try {
          redisClient.hdel('users', client.nickname, function(error, obj) {
            var message;
            if (error) {
              console.log(err);
            }
            message = client.nickname + ' left';
            client.broadcast.emit('notification', {
              message: message
            });
            try {
              return redisClient.hkeys('users', function(err, obj) {
                if (obj !== void 0) {
                  return client.broadcast.emit('update user list', obj);
                }
              });
            } catch (_error) {
              error = _error;
              console.log('Retrieve users from Redis');
              return console.log(error);
            }
          });
        } catch (_error) {
          error = _error;
          console.log('Delete user from list on Redis');
          console.log(error);
        }
        return console.log('User ' + client.nickname + ' disconnected.');
      } else {
        return console.log('Unindentified user disconnected.');
      }
    });
  });

  server.listen(3000, function() {
    var error;
    try {
      redisClient.exists('users', function(error, obj) {
        return redisClient.del('users');
      });
    } catch (_error) {
      error = _error;
      console.log('Deleting list of users on start');
      console.log(error);
    }
    return console.log('listening on *:3000');
  });

}).call(this);