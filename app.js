var express = require('express'),
        path = require('path'),
        fs = require('fs'),
        routes = require('./routes');
var util = require('util');
/* Setup Express application */
var app = express(),
        server = require('http').createServer(app),
        io = require('socket.io').listen(server);

io.set('transports', ['xhr-polling']);
app.set('env', process.env.NODE_ENV || 'development');
app.set('port', process.env.PORT || 3001);
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);
app.use(express.static(path.join(__dirname, 'public')));

app.use(function ( req, res, next ) {
    next('it blew');
});

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'Something blew up!' });
  } else {
    next(err);
  }
}

function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT');
    next();
});

app.get('/', function ( req, res ) {
    res.send(500, 'sorry');
});
/* API endpoints */
app.put('/api/videos/:socketid', function(req, res, next) {
        var sockeId = req.params.socketid;
        
        if (typeof sockeId === 'undefined')
        {
            res.status(500);
            res.end();
        }
        
        routes.api.videos.post(req, res, function(err, msg, proccess, closeConnection) {
 
            if (err) {
                io.sockets.socket(sockeId).emit('videoHandler', {error:err});
                res.status(500);
                res.end();
            }
            
            if (proccess) {
                io.sockets.socket(sockeId).emit('videoHandlerProgress', proccess);
            }
            
            if (closeConnection) {
                res.status(200);
                res.end();
            }
            
            if (msg) {
                io.sockets.socket(sockeId).emit('videoHandler', msg);
            }
        });
        
        
});

/* WebSockets API */
io.sockets.on('connection', function(socket) {
   socket.emit("setID",socket.id);
}).on('reconnect', function(socket) {
   socket.emit("setID",socket.id);
});

/* uncaughtException */
server.on('uncaughtException', function(err) {
    if(err.errno === 'EADDRINUSE')
         console.log('EADDRINUSE');
    else
         console.log(err);
     
    server.exit(1);
});

/* Start Express server */
server.listen(app.get('port'), function() {
    console.log('Server is listening on port %d', app.get('port'));
});
