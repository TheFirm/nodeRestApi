var express = require('express'),
        path = require('path'),
        routes = require('./routes');

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
    res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    next();
});

/* API endpoints */
app.get('/api/videos', routes.api.videos.get);
app.post('/api/videos', function(req, res) {
    routes.api.videos.post(req, res, function(err, msg) {
        if (err) io.sockets.send('videoHandler', {error:err});
        
        io.sockets.emit('videoHandler', msg);
    });
});

/* WebSockets API */
io.sockets.on('connection', function(socket) {
    console.log("user connected");
});

/* uncaughtException */
process.on('uncaughtException', function(err) {
    if(err.errno === 'EADDRINUSE')
         console.log('EADDRINUSE');
    else
         console.log(err);
     
    process.exit(1);
});

/* Start Express server */
server.listen(app.get('port'), function() {
    console.log('Server is listening on port %d', app.get('port'));
});
