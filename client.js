$(document).ready(function(){
  var serverAddress = '172.23.0.238:3000';
  var server = io.connect(serverAddress);

  $('#notification').text('');

  $('#new-user-form').submit(function(){
    if($('new-user-nickname').val() == ''){
      return false
    }else{
      $('#join-window').hide();
      $('#chat-window').show();
      $('#message').focus();
      var nickname = $('#new-user-nickname').val();
       
      server.nickname = nickname;
      server.emit('join', nickname);
      console.log('Joined');
    }
  });

  server.on('connect', function(data){
    console.log('Connected to '+serverAddress);
  });
  
  server.on('message', function(data){
    $('#messages').append($('<li>').html('<span class="nickname-span">'+data.nickname+': </span><span class="message-span">'+data.message+'</span>'));
    $('#messages').scrollTop($('#messages')[0].scrollHeight)
  });

  server.on('privateMessage', function(data){
    $('#messages').append($('<li>').html('<span class="pvt-nickname-span">'+data.destinationUsername+'@you: </span><span class="pvt-message-span">'+data.message+'</span>'));
    $('#messages').scrollTop($('#messages')[0].scrollHeight)
    server.emit('privateMessage received', {destinationUser: data.username, originUserID: data.userID, originUsername: server.nickname, message: data.message});
  });

  server.on('show privateMessage sent', function(data){
    console.log('show privateMessage sent');
    $('#messages').append($('<li>').html('<span class="pvt-nickname-span">you@'+data.nickname+': </span><span class="pvt-message-span">'+data.message+'</span>'));
    $('#messages').scrollTop($('#messages')[0].scrollHeight)
  });

  server.on('notification', function(data){
    $('#messages').append($('<li>').html('<span class="notification-span">'+data.message+'</span>'));
    $('#messages').scrollTop($('#messages')[0].scrollHeight)
  });

  server.on('update user list', function(userList){
    $('#user-list').html('<option value="all" selected="selected">all</option>');
    
    
    $.each(userList, function(index, user){
      $('#user-list')
        .append($("<option></option>")
        .attr("value",user)
        .text(user)); 
    });
  });

  server.on('disconnect', function(){
    console.log('Disconnected');
    $('#join-window').show();
    $('#chat-window').hide();
    $('#notification').text('disconnected');
  });      

  $('#message').keypress(function(e){
    if ( e.which == 13 ) {
      var message = $('#message').val();
      var user = $( "#user-list option:selected" ).val();
      server.emit('message', {message: message, user: user});

      $('#message').val('');
    }        
  });
  
  $("#new-user-form").submit(function(e) {
      e.preventDefault();
  });

  $('#user-list').mouseup(function(){
    $('#message').focus();
    $('#destination').html('@'+$( "#user-list option:selected" ).val());
  });
});