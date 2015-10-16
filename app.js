var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var ent = require('ent');
var todoList = require('./todoList')();

/**
 * The TCP port on which the server will respond
 * @type {Number}
 */
var serverPort = 8080;

/**
 * The list of last messages. This list will be regularly truncated.
 * @type {Array}
 */
var messages = [];

/**
 * The number of kept messages
 * @type {Number}
 */
var keepLast = 16;

// the server needs to serve some static files (stylesheets, javascripts, html pages)
app.use(express.static('public'));

// the server only handles a single page
app.get('/', function(request, response) {
    response.render('todo.ejs');
});

// all other pages are 404
app.use(function(request, response) {
    response.status(404);
    response.render('404.ejs');
});

// entry point for WebSocket connection
io.on('connection', function(socket) {
    /**
     * Info about the logged in user. When this object contains a login, a user is connected.
     * @type {Object}
     */
    var client = {};

    /**
     * Sends a system message to other clients and put the same message on the server console
     * @param {String} message
     */
    var systemMessage = function(message) {
        console.log(message);
        socket.broadcast.emit('system', message);
    };

    // a new client is now connected
    systemMessage('Another client is joining...');
    socket.emit('system', 'You are connected!');

    // respond to login attempts
    socket.on('login', function(login, cb) {
        // keep the login: this is the way we known the user is logged in
        client.login = ent.encode(login);

        // notify the others
        systemMessage(client.login + ' has joined the page');

        // acknowledge the attempt
        cb && cb(true);

        // for each new client, send the list of existing tasks and the last messages
        socket.emit('tasks', todoList.list());
        socket.emit('messages', messages);
    });

    // respond to logout attempts
    socket.on('logout', function() {
        // notify the others
        systemMessage(client.login + ' has left the page');

        // from now this client is unknown
        client = {};
    });

    // take care of messages sent by the client
    socket.on('message', function(message) {
        var chunk, len;

        // prevent injection
        message = ent.encode(message);

        console.log(client.login, 'says:', message);

        // need a logged in client
        if (client.login) {
            // store the message server side
            chunk = {
                login: client.login,
                message: message
            };
            len = messages.push(chunk);

            // truncate the list of last messages if needed
            if (len > keepLast) {
                console.log('truncate the messages log...');
                messages.splice(0, len - keepLast);
            }

            // notify others
            socket.broadcast.emit('message', chunk);
        }
    });

    // take care of new tasks
    socket.on('add', function(label) {
        var task;

        // prevent injection
        label = ent.encode(label);

        console.log(client.login , 'tries to add this task:', label);

        // need a logged in client
        if (client.login) {
            // store the task server side
            task = todoList.add(label);

            if (task) {
                // notify all clients, including the emitter
                io.sockets.emit('add', task);
            }
        }
    });

    // take care of removed tasks
    socket.on('remove', function(id, cb) {
        var task;

        // prevent injection
        id = ent.encode(id);

        console.log(client.login, 'tries to remove this task:', id);

        // need a logged in client
        if (client.login) {
            // remove the task server side
            task = todoList.remove(id);

            if (task) {
                // notify others
                socket.broadcast.emit('remove', task);

                // acknowledge the removal
                cb && cb(true);
            }
        }
    });

    // take care of checked tasks
    socket.on('check', function(id, flag, cb) {
        var task;

        // prevent injection
        id = ent.encode(id);

        console.log(client.login, 'tries to', flag ? 'check' : 'uncheck', 'this task:', id);

        // need a logged in client
        if (client.login) {
            // check the task server side
            task = todoList.check(id, flag);

            if (task) {
                // notify others
                socket.broadcast.emit('check', task);

                // acknowledge the check
                cb && cb(true);
            }
        }
    });

    // take care of client disconnection
    socket.on('disconnect', function() {
        // the disconnecting client may not have been logged in
        var login = client.login || 'A client';

        // notify others
        systemMessage(login + ' has left the page');

        // this client is now unknown
        client = {};
    });
});

// it's time to accept clients!
server.listen(serverPort, function() {
    console.log('Server is listening on port ' + serverPort);
});
