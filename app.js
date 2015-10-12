var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var ent = require('ent');
var todoList = require('./todoList')();

var serverPort = 8080;

var messages = [];
var keepLast = 16;

app.use(express.static('public'));

app.get('/', function(request, response) {
    response.render('todo.ejs');
});

app.use(function(request, response) {
    response.status(404);
    response.render('404.ejs');
});

io.on('connection', function(socket, rinfo) {
    var client = {};

    console.log('Client connected!');
    socket.broadcast.emit('system', 'Another client is joining...');
    socket.emit('system', 'You are connected!');

    socket.on('login', function(login, cb) {
        client.login = ent.encode(login);
        console.log(login + ' has joined the page');
        socket.broadcast.emit('system', login + ' has joined the page');
        cb && cb(true);
        socket.emit('tasks', todoList.list());
        socket.emit('messages', messages);
    });

    socket.on('logout', function() {
        console.log(client.login + ' has left the page');
        socket.broadcast.emit('system', client.login + ' has left the page');
        client = {};
    });

    socket.on('message', function(message) {
        var chunk, len;
        if (client.login) {
            console.log(client.login + ' says: ' + message);
            chunk = {
                login: client.login,
                message: ent.encode(message)
            };
            len = messages.push(chunk);
            if (len > keepLast) {
                console.log('truncate the messages log...');
                messages.splice(0, len - keepLast);
            }
            socket.broadcast.emit('message', chunk);
        }
    });

    socket.on('add', function(label) {
        var task = todoList.add(ent.encode(label));
        console.log(client.login + ' tries to add this task:' + label);
        if (client.login) {
            if (task) {
                io.sockets.emit('add', task);
            }
        }
    });

    socket.on('remove', function(id, cb) {
        var task = todoList.remove(ent.encode(id));
        console.log(client.login + ' tries to remove this task:' + id);
        if (client.login) {
            if (task) {
                socket.broadcast.emit('remove', task);
                cb && cb(true);
            }
        }
    });

    socket.on('check', function(id, flag, cb) {
        var task = todoList.check(ent.encode(id), flag);
        console.log(client.login + ' tries to check this task:' + id);
        if (client.login) {
            if (task) {
                socket.broadcast.emit('check', task);
                cb && cb(true);
            }
        }
    });

    socket.on('disconnect', function() {
        var login = client.login || 'A client';
        console.log(login + ' has left the page');
        socket.broadcast.emit('system', login + ' has left the page');
    });
});

server.listen(serverPort);
