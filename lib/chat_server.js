﻿var socketio = require('socket.io');
var io;
var guestNumber = 10;
var usernames = {};
var namesUsed = [];
var currentRoom = {};
var sha1 = require('sha1');
sha1("password");

exports.listen = function(server) {
  io = socketio.listen(server);
  //Start the Socket.io server, allowing it to piggyback on the existing HTTP server
  io.set('log level', 1);
  io.sockets.on('connection', function (socket) {
  //Fire when event emit 'connection', everytime user login, socket will fire up 'connection'
  //Define how each user connection will be handled
    guestNumber = assignGuestName(socket, guestNumber,usernames, namesUsed);
    //Assign user a guest name when they connect

    handleMessageBroadcasting(socket, usernames);
    //Handle user messages, name change attempts, and room creation/changes.
    handleNameChangeAttempts(socket, usernames, namesUsed);
    handleRoomJoining(socket);
 
    handleClientDisconnection(socket, usernames, namesUsed);
    //Define "cleanup" logic for when a user disconnects
  });
};

function assignGuestName(socket, guestNumber, usernames, namesUsed) {
  var name = 'Guest' + guestNumber;//Generate new guest name
  usernames[socket.id] = name; //Associate guest name with client connection ID
  socket.emit('nameResult', {
  //Let user know their guest name
    success: true,
    name: name
});
  namesUsed.push(name);//Note that guest name is now used
  return guestNumber + 1; //Increment counter used to generate guest names
}

/*
While having a user join a Socket.io room is simple, 
requiring only a call to the join method of a socket object, 
the application communicates related details to the user and other users in the same room. 
The application lets the user know what other users are in the room 
and lets these other users know that the user is now present.

key - socket.id
All Events are bound per socket - socket.id 
here each room have unique socket.id
*/

function joinRoom(socket, room) {
  socket.join(room); //Make user join room
  currentRoom[socket.id] = room;//Note that user is now in this room
  socket.emit('joinResult', {room: room}); //Let user know they're now in a new room
  socket.broadcast.to(room).emit('message', {
  //Let other users in room know that a user has joined
    text: usernames[socket.id] + ' has joined ' + room + '.'
});
  var usersInRoom = io.sockets.clients(room);
  //Determine what other users are in the same room as the user
  if (usersInRoom.length > 1) {
  //If other users exist, summarize who they are
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
}
        usersInRoomSummary += usernames[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {text: usersInRoomSummary});
    //Send the summary of other users in the room to the user
  }
}

function handleNameChangeAttempts(socket, usernames, namesUsed) {
	  socket.on('nameAttempt', function(name) {
	  //Added listener for nameAttempt events
	    if (name.indexOf('Guest') == 0) {
	      socket.emit('nameResult', {
	        success: false,
	        message: 'Names cannot begin with "Guest".'
	      });
	    //Don't allow usernames to begin with "Guest"
	} else {
	      if (namesUsed.indexOf(name) == -1) {
	        var previousName = usernames[socket.id];
	        var previousNameIndex = namesUsed.indexOf(previousName);
	        namesUsed.push(name);
	        usernames[socket.id] = name;
	        delete namesUsed[previousNameIndex];
	        //Remove previous name to make available to other clients.
	        socket.emit('nameResult', {
	          success: true,
	          name: name
	        });
	        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
	          text: previousName + ' is now known as ' + name + '.'
			});
		//If the name isn't already registered, register it
	} else {
	        socket.emit('nameResult', {
	          success: false,
	          message: 'That name is already in use.'
			}); 
		}
		//Send an error to the client if the name's already registered
	} 
	});
}
/*
function handlepasswordChangeAttempts(socket, passwords, namesUsed) {
	  socket.on('passwordAttempt', function(password) {
	  //Added listener for nameAttempt events
	    if (name.indexOf('Guest') == 0) {
	      socket.emit('nameResult', {
	        success: false,
	        message: 'Names cannot begin with "Guest".'
	      });
	    //Don't allow usernames to begin with "Guest"
	} else {
	      if (namesUsed.indexOf(name) == -1) {
	        var previousName = usernames[socket.id];
	        var previousNameIndex = namesUsed.indexOf(previousName);
	        namesUsed.push(name);
	        usernames[socket.id] = name;
	        delete namesUsed[previousNameIndex];
	        //Remove previous name to make available to other clients.
	        socket.emit('nameResult', {
	          success: true,
	          name: name
	        });
	        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
	          text: previousName + ' is now known as ' + name + '.'
			});
		//If the name isn't already registered, register it
	} else {
	        socket.emit('nameResult', {
	          success: false,
	          message: 'That name is already in use.'
			}); 
		}
		//Send an error to the client if the name's already registered
	} 
	});
}
*/

/*
the user emits an event indicating the room where the message is to be sent and the message text. 
The server then relays the message to all other users in the same room.
*/
function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: usernames[socket.id] + ': ' + message.text
		}); 
	});
}
/*
add functionality that allows a user to join an existing room or, if it doesn't yet exist, create it
*/
function handleRoomJoining(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}
/*
remove a user's usernames from usernames and namesUsed when the user leaves the chat application.
*/
function handleClientDisconnection(socket) {
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(usernames[socket.id]);
    delete namesUsed[nameIndex];
    delete usernames[socket.id];
	}); 
}