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
    
    var form = new multiparty.Form(),
            fileName = crypto.createHash('sha1'),
            avconv, args, output, filePath, url, _filename;
    
    try {

        fileName.update(Date() + Math.random().toString(36));
        _filename = fileName.digest('hex');
        url = '/files/' + _filename + '.avi';
        filePath = rootPath + '/public' + url;
        
        
        // set params ffmpeg
        args = [
            '-i','pipe:0', '-f', 'avi', //set Video
            'pipe:1', //set Audio
           // '-i', _introAvi,
            '-i', waterMark,  // add watermark
            //'-filter_complex', '[0:0] [0:1] [1:0] [1:1] concat=n=1:v=2:a=1 [v] [a]' // add intro
            '-filter_complex', 'overlay'
        ];
        
        // start writeStream
        avconv = spawn('ffmpeg', args); // If no avconc, use ffmpeg instead
        output = fs.createWriteStream(filePath);
            
        form.on('part', function(part) {
            if (part.filename) {
                part.pipe(avconv.stdin);

                part.on('end', function() {

                });
               
            }
        });

        avconv.stdout.pipe(output);

        avconv.on('exit', function() {
            callback(null, {message:"Conversion done!"},null);
        });
        avconv.on('progress', function(progress) {
            console.log(progress);
        });
        
        avconv.on('error', function(err) {
            console.log("avconv.on.errr:: " +err);
            if (err.code == "EPIPE") {
                avconv.exit(0);
            }
        });

        avconv.stderr.on('data', function(data) {
            console.log("ffmpeg:: " + data);
        });
        

        output.on('finish', function() {

            var urlWithIntro = '/files/' + _filename + 'intro.avi',
            filePathWithIntro = rootPath + '/public' + urlWithIntro;
            
             var command = ffmpeg(_introAvi)
                    .input(filePath)
                    .on('error', function(err) {
                        console.log('An error occurred: ' + err.message);
                    })
                    .on('end', function() {
                        console.log('Processing merge finished !');
                        vimeo.upload(filePathWithIntro, function(err, msg) {
                            if (err) return callback({error:err},null,null);
                            
                            fs.unlinkSync(filePathWithIntro);
                            fs.unlinkSync(filePath);
                            
                            callback(null, msg, null);
                            return true;
                        });
                    })
                    .on('progress', function(progress) {
                        console.log('Processing: ' + progress.percent + '% done');
                        callback(null, null, progress.percent);
                        
                    })
                    .on('start', function(commandLine) {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                    }).mergeToFile(filePathWithIntro);

        });

        form.parse(req, function(err, fields) {
            if (err) return callback({error:err},null,null);
        });
        
    } catch(e) {
        return callback({error:e},null,null);
    }
};

module.exports = post;
