app = require('express')()
server = require('http').Server(app)
io = require('socket.io')(server)
redis = require('redis')
redisClient = redis.createClient()


serverPort = 3000

###
 This is a chat experiment with node, socket.io,
 express, redis and bootstrap on the frontend.
###

### Root route ###
app.get '/', (req, res) ->
  res.sendFile __dirname + '/html/index.html'

# CSS
app.get '/css', (req, res) ->
  res.sendFile __dirname + '/css/main.css'

# Client side JS
app.get '/js', (req, res) ->
  res.sendFile __dirname + '/client.js'

# Socket.io connection
io.on 'connection', (client) ->
  console.log 'New connection -> '+client.id

  # Client joined chat
  client.on 'join', (nickname) ->
    if nickname == undefined || nickname == ''
      client.emit 'login'
    else
      console.log('User '+nickname+' joined with id '+client.id)
      client.nickname = nickname.toLowerCase()

      # Add user to list on Redis
      console.log 'Retrieve users from Redis'
      try
        redisClient.hset 'users', nickname.toLowerCase(), client.id, (err, obj) ->
          message = nickname+' joined'
          client.broadcast.emit 'notification', {message: message}
          try
            redisClient.hkeys 'users', (err, obj) ->
              client.broadcast.emit 'update user list', obj
              client.emit 'update user list', obj
          catch error
            console.log error
      catch error
        console.log error
        # Update user list
      console.log 'Retrieve keys from users list in Redis'
    
          
  
  # Client sent message
  client.on 'message', (data) ->
    nickname = client.nickname

    # Dont send empty messages
    if data.message != ''
          
      # Differ message for all or private message
      if data.user.toLowerCase() == 'all'
        client.broadcast.emit 'message', {
          nickname: nickname,
          message: data.message
        }
        client.emit 'message', {nickname: nickname, message: data.message}
      else
        # Retrieve user id from Redis
        # console.log 'Retrieve user id from Redis'
        try
          redisClient.hget 'users', data.user.toLowerCase(), (err, obj) ->
            destinationUserID = obj
          # Send message to specific user
            # console.log obj
            if client.broadcast.to(destinationUserID)
              # console.log 'pvt msgs from '+client.nickname+' to '+nickname
              client.broadcast.to(destinationUserID).emit 'privateMessage', {
                userID: client.id,
                destinationUsername: data.user,
                username: client.nickname,
                message: data.message
              }
            else
              console.log 'Could not deliver message to user.'
        catch error
          console.log error

  # Message delivery confirmation
  client.on 'privateMessage received', (data) ->
    console.log 'privateMessage received'
    console.log client.nickname
    console.log data
    if client.broadcast.to(data.originUserID)
      # Send message
      client.broadcast.to(data.originUserID).emit 'show privateMessage sent', {
        nickname: data.originUsername,
        message: data.message
      }

  ###
    The messages shouldn't be going back and forth for
    the delivery confirmation. They should be saved in
    redis and only the confirmation should go back and forth.
    For the sake of this experiment I did it in this simple manner.
  ###


  # Client disconnection | Remove from user list on Redis
  client.on 'disconnect', () ->
    # console.log 'nickname -> '+client.nickname
    if client.nickname != undefined && redisClient.exists 'users' && redisClient.hexists 'users', client.nickname
      try
        redisClient.hdel 'users', client.nickname, (error, obj) ->
          if error
            console.log err
          # Update user list
          message = client.nickname+' left'
          client.broadcast.emit 'notification', {message: message}
          try
            redisClient.hkeys 'users', (err, obj) ->
              if obj != undefined
                client.broadcast.emit 'update user list', obj
          catch error
            console.log 'Retrieve users from Redis'
            console.log error

      catch error
        console.log 'Delete user from list on Redis'
        console.log error

      console.log 'User '+client.nickname+' disconnected.'
    else
      console.log 'Unindentified user disconnected.'


# Run server
server.listen 3000, () ->
  try
    redisClient.exists 'users', (error, obj) ->
      redisClient.del 'users'
  catch error
    console.log 'Deleting list of users on start'
    console.log error

  console.log 'listening on *:3000'
