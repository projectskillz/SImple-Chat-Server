
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , io = require('socket.io');

var app = module.exports = express.createServer();

//global variable to store input parameter
var params;


// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/:id', function(req, res) {
    params = req.params.id;
	res.sendfile(__dirname +'/views/post.html');
    });

io = io.listen(app);
var port = process.env.PORT || 3000;

app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

//usernames in room
var localUser = {};


//usernames that are currently connected to char
var usernames = {};

//rooms that are currently active
var rooms = [];

//storing room specific history
var history = {};

io.sockets.on('connection', function(socket) {
    
    socket.emit('news', 'testdata');
    
    socket.on('adduser', function(username) {
    //store the username in the socket session for this client
    socket.username = username;
    
    //store room in the socket session
    socket.room = params;
    //store room in rooms array
    rooms.push(params);
    //add client username to global list
    usernames[username] = username;
    
    //adding client to the room speicify array
  
    if(localUser[""+params] === undefined)
    {
        localUser[""+params] = {};
        localUser[""+params][username] = username;
    }
    else
    {
        localUser[""+params][username] = username;
    }
    
    //send client the room
    socket.join(params);
    //user added
    socket.emit('userAdded',{username:username, room:socket.room,  timestamp: new Date()});
   
   io.sockets.in(socket.room).emit("updateUsers", {usernames:localUser[""+params]});
    if(history[""+params] != undefined)
    {
        socket.emit('loadHistory',history[""+params]);
    }
    });
    
    socket.on('message', function(message) {
        console.log("message");
        if(history[""+params] === undefined)
        {
            history[""+params] = [];
            history[""+params].push(message);
        }
        else
        {
            history[""+params].push(message);
        }
         
        io.sockets.in(socket.room).emit('update',message);
    });

    socket.on('disconnect', function() {
        console.log("disconnect called");
    //remove username form the global username list
    delete usernames[socket.username];
    
    //remove username form the localroom username list
    console.log(localUser[""+params]);
    if( localUser[""+params] != undefined)
    {
        delete localUser[""+params][socket.username];
    }
    //update userlist
    
    io.sockets.in(socket.room).emit("updateUsers", {usernames:localUser[""+params]});
    
    socket.leave(socket.room);
    });

});
