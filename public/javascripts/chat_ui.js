var socket = io.connect();
//handles client-side initiation of Socket.io event handling
$(document).ready(function() {
	var chatApp = new Chat(socket);
  	socket.on('nameResult', function(result) {
  	//Display the results of a name change attempt
    var message;
    if (result.success) {
      message = 'welcome to CMPE273';
    } else {
      message = result.message;
}
    $('#messages').append(divSystemContentElement(message));
  });
  	
  	socket.on('message', function (message) {
  	//Display received messages
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
});
  
  $('#send-message').focus();
  $('#send-form').submit(function() {
    processUserInput(chatApp, socket);
    return false;
	}); 
});

function divEscapedContentElement(message) {
  return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
  return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
  var message = $('#send-message').val();
  var systemMessage;
  if (message.charAt(0) == '#') {
    systemMessage = chatApp.processCommand(message);
    if (systemMessage) {
      $('#messages').append(divSystemContentElement(systemMessage));
    }
} else {
    chatApp.sendMessage($('#room').text(), message);
    //Broadcast non-command input to other users
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
}
  $('#send-message').val('');
}