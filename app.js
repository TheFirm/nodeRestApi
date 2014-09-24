var express = require('express'),
        path = require('path'),
        routes = require('./routes');

/* Setup Express application */
var app = express(),
        server = require('http').createServer(app),
        io = require('socket.io').listen(server);

app.set('transports', ['xhr-polling']);
app.set('env', process.env.NODE_ENV || 'development');
app.set('port', process.env.PORT || 8080);
//app.set('view engine', 'jade');
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);

app.use(express.static(path.join(__dirname, 'public')));

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    next();
});

/* API endpoints */
app.get('/api/videos', routes.api.videos.get);
app.post('/api/videos', routes.api.videos.post);

/* WebSockets API */
io.sockets.on('connection', function(socket) {
    console.log("user connected");
    socket.on('startUpload', function(data) {
        console.log('Upload Start');
    });
});

/* Start Express server */
server.listen(app.get('port'), function() {
    console.log('Server is listening on port %d', app.get('port'));
});
