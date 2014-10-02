/* POST /api/videos */

var rootPath = process.cwd(),
        vimeo = require(rootPath + '/routes/api/videos/vimeo'),
        multiparty = require('multiparty'),
        crypto = require('crypto'),
        fs = require('fs'),
        ffmpeg = require('fluent-ffmpeg'),
        spawn = require('child_process').spawn;
var ffmpegn = require('ffmpeg');

// set resource 
var waterMark = rootPath + '/public/resource/wm.png';
var _introAvi = rootPath + '/public/resource/_intro.avi';

var post = function(req, res, callback) {
    
    var form = new multiparty.Form(),
            fileName = crypto.createHash('sha1'),
            avconv, args, output, filePath, url, _filename, socketId, fileSize = 0, proccentReady =0, sizeIntro = 2000;
    
    try {

        fileName.update(Date() + Math.random().toString(36));
        _filename = fileName.digest('hex');
        url = '/files/' + _filename + '.avi';
        filePath = rootPath + '/public' + url;
        
        
        // set params ffmpeg
        args = [
            '-i','pipe:0', '-f', 'avi', //set Video
            'pipe:1', //set Audio
            '-i', _introAvi,
            '-y','-filter_complex', 'concat=n=2:v=1:a=1',
            '-strict', '-2'
        ];
        
        // start writeStream
        avconv = spawn('ffmpeg', args); // If no avconc, use ffmpeg instead
        output = fs.createWriteStream(filePath);
        var stats = fs.statSync(_introAvi);
        
        sizeIntro = (stats["size"]/1024);
        
        form.on('part', function(part) {
            
            if(fileSize < parseInt((part.byteCount/1024) + (sizeIntro/2))) {
                fileSize = parseInt((part.byteCount/1024) + (sizeIntro/2));
            }
            console.log("BYTECODE:: " + fileSize);
            if (part.filename) {
                console.log("BYTECODE:: " + parseInt((part.byteCount/1024) + (sizeIntro/2)));
                //2000 size intro/2
                part.pipe(avconv.stdin);

                part.on('end', function() {

                });
            }
        });

        avconv.stdout.pipe(output);

        avconv.on('exit', function() {
            
           console.log("Start add watermark!");
           var urlWithIntro = '/files/' + _filename + 'intro.avi',
                filePathWithIntro = rootPath + '/public' + urlWithIntro;
            
            proccentReady = (proccentReady < 85) ? (proccentReady + 10) : proccentReady;
            callback(null, null, proccentReady, socketId);
            
            var process = new ffmpegn(filePath)
                .then(function (video) {   
                    video.fnAddWatermark(waterMark, '-strict -2 '+filePathWithIntro, {
                        position : 'SE'
                    }, function (error, file) {
                        if (!error) 
                        {
                            vimeo.upload(filePathWithIntro, function(err, msg) {
                                if (err) return callback(err,null,null,socketId);

                                fs.unlinkSync(filePathWithIntro);
                                fs.unlinkSync(filePath);

                                callback(null, msg, null,socketId);
                            });
                        } else {
                            console.log('ERROR Add Water Mark: ' + error);
                            return callback(error,null,null,socketId);
                        }
                    }); 
                }, 
                function (err) {
                    console.log('Error: ' + err);
                    return callback(err,null,null,socketId);
                });
        });
       
        avconv.stderr.on('data', function(data) {
            //console.log("ffmpeg:: " + data);
            
            var sr = data.toString('utf-8');
            var a = sr.split("size=");
            
            if(typeof a[1] !=='undefined') 
            {
                var sizes = a[1].replace(/ /g,'').split("kB");
                var currentSize = parseInt(sizes[0]);
                proccentReady = (((currentSize*100)/fileSize)-10)/1.4;
                
                //console.log("currentsize:: " + currentSize);
                console.log("filesize:: " + fileSize);
                //console.log("procent:: " + proccentReady);
                
                callback(null, null, proccentReady, socketId);
            }

        });
        
        output.on('finish', function() {
            // close client connections
            callback(null, null, null, "True");
            console.log("Conversion finish!");
        });

        form.parse(req, function(err, fields) {
            if (err) return callback(err,null,null,socketId);
        });
        
    } catch(e) {
        return callback(e,null,null,socketId);
    }
};

module.exports = post;
