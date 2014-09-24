var express = require('express'),
        path = require('path'),
        routes = require('./routes');

/* Setup Express application */
var app = express(),
        server = require('http').createServer(app),
        io = require('socket.io').listen(server);

io.set('transports', ['xhr-polling']);
app.set('env', process.env.NODE_ENV || 'development');
app.set('port', process.env.PORT || 8080);
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

/* Start Express server */
server.listen(app.get('port'), function() {
    console.log('Server is listening on port %d', app.get('port'));
});
