/* POST /api/videos */

var rootPath = process.cwd(),
        vimeo = require(rootPath + '/routes/api/videos/vimeo'),
        multiparty = require('multiparty'),
        crypto = require('crypto'),
        fs = require('fs'),
        ffmpeg = require('fluent-ffmpeg'),
        spawn = require('child_process').spawn;

// set resource 
var waterMark = rootPath + '/public/resource/wm.png';
var _introAvi = rootPath + '/public/resource/_intro.avi';

var post = function(req, res, callback) {

    try {
        
        ffmpeg.ffprobe(_introAvi, function(err, metadata) {
            console.log(metadata);
            console.log(err);
        });
        return;
        
        /*var filePath = rootPath + '/public' + "/files/_intro.avi";
        
        
        vimeo.upload(filePath, function(err, msg) {
                if (err) return callback({error:err},null);
                
                callback(null, msg);
            });
        return;*/
        var form = new multiparty.Form(),
            fileName = crypto.createHash('sha1'),
            avconv, args, output, filePath, url;

        fileName.update(Date() + Math.random().toString(36));
        url = '/files/' + fileName.digest('hex') + '.webm';
        filePath = rootPath + '/public' + url;
        
        // set params ffmpeg
        args = [
            '-i','pipe:0', '-f', 'webm', //set Video
            'pipe:1', //set Audio
           // '-i', _introAvi,
            '-i', waterMark,  // add watermark
            //'-filter_complex', '[0:0] [0:1] [1:0] [1:1] concat=n=1:v=2:a=1 [v] [a]' // add intro
            '-filter_complex', 'overlay'
        ];
        
        //callback(null, {message:"start stream process"});
        
        // start writeStream
        avconv = spawn('ffmpeg', args); // If no avconc, use ffmpeg instead
        output = fs.createWriteStream(filePath);
        
        form.on('part', function(part) {
            if (part.filename) {
                part.pipe(avconv.stdin);

                part.on('end', function() {
                    
                    //set event end
                });
            }
        });

        avconv.stdout.pipe(output);

        avconv.on('exit', function() {
            callback(null, {message:"Conversion done!"});
        });
        avconv.stdout.on('error', function( err ) {
            console.log(err);
            if (err.code == "EPIPE") {
                avconv.exit(0);
            }
        });
        avconv.stderr.on('data', function(data) {
            console.log("ffmpeg:: " + data);
        });

        output.on('finish', function() {
            vimeo.upload(filePath, function(err, msg) {
                if (err) return callback({error:err},null);
                
                callback(null, msg);
            });
        });

        form.parse(req, function(err, fields) {
            if (err) return callback({error:err},null);
        });
        
    } catch(e) {
        return callback({error:e},null);
    }
};

module.exports = post;
