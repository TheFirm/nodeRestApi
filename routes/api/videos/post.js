/* POST /api/videos */


var rootPath = process.cwd(),
        vimeo = require(rootPath + '/routes/api/videos/vimeo'),
        multiparty = require('multiparty'),
        crypto = require('crypto'),
        fs = require('fs'),
        ffmpg = require('fluent-ffmpeg'),
        spawn = require('child_process').spawn;

//set resource 
var waterMark = require(rootPath + '/public/resource/wm.png');
var _introAvi = require(rootPath + '/public/resource/_intro.avi');

var post = function(req, res) {

    var form = new multiparty.Form(),
            fileName = crypto.createHash('sha1'),
            avconv, args, output, filePath, url;

    fileName.update(Date() + Math.random().toString(36));
    url = '/files/' + fileName.digest('hex') + '.webm';
    filePath = rootPath + '/public' + url;
    
    args = [
        '-i','pipe:0', '-f', 'webm', //set Video
        'pipe:1', //set Audio
       // '-i', _introAvi,
        '-i', waterMark,  // add watermark
        //'-filter_complex', '[0:0] [0:1] [1:0] [1:1] concat=n=1:v=2:a=1 [v] [a]' // add intro
        '-filter_complex', 'overlay'
    ];

    avconv = spawn('ffmpeg', args); // If no avconc, use ffmpeg instead
    output = fs.createWriteStream(filePath);

    form.on('part', function(part) {
        if (part.filename) {
            part.pipe(avconv.stdin);
            
            part.on('end', function() {
                console.log('===== Video has been uploaded! =====');
            });
        }
    });

    avconv.stdout.pipe(output);

    avconv.on('exit', function() {
        console.log('===== Conversion done! =====');
    });

    avconv.stderr.on('data', function(data) {
        console.log('avconv: ' + data);
    });
    
    output.on('finish', function() {
        console.log('===== File has been written to file system =====');

        vimeo.upload(filePath, function(err, msg) {
            console.log(err);
            console.log(msg);
        });
        
    });

    form.parse(req, function(err, fields) {
        if (err)
            return console.log(err);

    });
};

module.exports = post;
