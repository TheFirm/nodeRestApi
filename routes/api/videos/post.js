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
var _introMpg = rootPath + '/public/resource/_intro.mpg';

var post = function (req, res, w_p, callback) {

    var form = new multiparty.Form(),
        fileName = crypto.createHash('sha1'),
        avconv, args, output, filePath, url, _filename, socketId, fileSize = 0, proccentReady = 0, sizeIntro = 2000,
        watermark_positions = new Array('SE', 'NE', 'SW', 'NW');

    try {

        fileName.update(Date() + Math.random().toString(36));
        _filename = fileName.digest('hex');
        url = '/files/' + _filename + '.mpeg';
        filePath = rootPath + '/public' + url;


        // set params ffmpeg
        args = [
            '-i', 'pipe:0', '-f', 'mpeg', //set Video
            'pipe:1', //set Audio
//            '-i', _introMpg,
//            '-y','-filter_complex', 'concat=n=2:v=1:a=1',
            '-strict', '-2'
        ];

        // start writeStream
        avconv = spawn('ffmpeg', args); // If no avconc, use ffmpeg instead
        output = fs.createWriteStream(filePath);

        var stats = fs.statSync(_introAvi);

        sizeIntro = (stats["size"] / 1024);

        form.on('part', function (part) {
            //MAGICK!!!, in one at moments fileSize set 2023 byte but file cannot have size 2023
            if (fileSize < parseInt((part.byteCount / 1024) + (sizeIntro / 2))) {
                fileSize = parseInt((part.byteCount / 1024) + (sizeIntro / 2));
            }
            console.log("BYTECODE:: " + fileSize);

            if (part.filename) {
                part.pipe(avconv.stdin);

                part.on('end', function () {

                });
            }
        });

        avconv.stdout.pipe(output);

        avconv.on('exit', function () {

            var urlWithIntro = '/files/' + _filename + 'intro.avi',
                filePathWithIntro = rootPath + '/public' + urlWithIntro;
            var tmpFileMpg = rootPath + '/public/files/' + _filename + 'intro_tmp.mpg',
                tmpFileAvi = rootPath + '/public/files/' + _filename + 'intro_tmp.avi';

//            proccentReady = (proccentReady < 80) ? (proccentReady + 10) : proccentReady;
//            callback(null, null, proccentReady, null);
//

            /**
             * Add intro
             */


            // http://nodejs.org/api.html#_child_processes
            var stats = fs.statSync(_introAvi);
            var exec = require('child_process').exec;
            var myExec = exec("cat " + _introMpg + " " + filePath + " > " + tmpFileMpg + ";ffmpeg -i " + tmpFileMpg + " " + tmpFileAvi + " -y",
                function (error, stdout, stderr) {
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    } else {
                        console.log('Done join!!!');
                        console.log("Start add watermark!");
                        var process = new ffmpegn(tmpFileAvi)
                            .then(function (video) {
                                video.fnAddWatermark(waterMark, '-strict -2 ' + filePathWithIntro, {
                                    position: watermark_positions[w_p]
                                }, function (error, file) {
                                    if (!error) {
                                        proccentReady = (proccentReady < 0) ? (proccentReady += 5) : proccentReady;
                                        callback(null, null, proccentReady, null);

                                        vimeo.upload(filePathWithIntro, function (err, msg) {
                                            if (err) return callback(err, null, null, socketId);

                                            fs.unlinkSync(filePathWithIntro);
                                            fs.unlinkSync(filePath);
                                            fs.unlinkSync(tmpFileAvi);
                                            fs.unlinkSync(tmpFileMpg);

                                            callback(null, msg, null, socketId);
                                        });
                                    } else {
                                        console.log('ERROR Add Water Mark: ' + error);
                                        return callback(error, null, null, null);
                                    }
                                });
                            },
                            function (err) {
                                console.log('Error: ' + err);
                                return callback(err, null, null, null);
                            });
                    }
                });
            myExec.stderr.on('end', function () {
                console.log("My std out end");
            });
            myExec.stderr.on('data', function (data) {
                console.log("My std out data"+ data);
                var re = /size=(.*?)B/;
                var newstr = data.match(re);
                if (newstr){
                    console.log("Converteb bytes: "+newstr[1]);
                }

//                proccentReady +=




                proccentReady = (proccentReady < 80) ? (proccentReady += 0.2) : proccentReady;
                callback(null, null, proccentReady, null);
            });
            /***/



//            var process = new ffmpegn(filePath)
//                .then(function (video) {
//                    video.fnAddWatermark(waterMark, '-strict -2 '+filePathWithIntro, {
//                        position : watermark_positions[w_p]
//                    }, function (error, file) {
//                        if (!error)
//                        {
//                            proccentReady = (proccentReady < 90) ? (proccentReady + 8) : proccentReady;
//                            callback(null, null, proccentReady, null);
//
//                            vimeo.upload(filePathWithIntro, function(err, msg) {
//                                if (err) return callback(err,null,null,socketId);
//
//                                fs.unlinkSync(filePathWithIntro);
//                                fs.unlinkSync(filePath);
//
//                                callback(null, msg, null,socketId);
//                            });
//                        } else {
//                            console.log('ERROR Add Water Mark: ' + error);
//                            return callback(error,null,null,null);
//                        }
//                    });
//                },
//                function (err) {
//                    console.log('Error: ' + err);
//                    return callback(err,null,null,null);
//                });
        });

        avconv.stderr.on('data', function (data) {
            console.log("ffmpeg:: " + data);

            var sr = data.toString('utf-8');
            var a = sr.split("size=");

            if (typeof a[1] !== 'undefined') {
                var sizes = a[1].replace(/ /g, '').split("kB");
                var currentSize = parseInt(sizes[0]);
                proccentReady = (((currentSize * 100) / fileSize) - 10) / 1.4;

                //console.log("currentsize:: " + currentSize);
                console.log("filesize:: " + fileSize);
                //console.log("procent:: " + proccentReady);

                callback(null, null, proccentReady, null);
            }

        });

        output.on('finish', function () {
            // close client connections
            callback(null, null, null, "True");
            console.log("Conversion finish!");
        });

        form.parse(req, function (err, fields) {
            if (err) return callback(err, null, null, "true");
        });

    } catch (e) {
        return callback(e, null, null, "true");
    }
};

module.exports = post;
