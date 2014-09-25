var rootPath = process.cwd(),
        vimeoClient_Id = '6e94a26df51e910b6d40c453d4c0f90224894d99',
        vimeoClient_Secret = '234d0f96c8bda2f3d8eba1d8820f5eeef2d3272c',
        vimeoClient_Token = '0add82e9e834a72387b9e9ca642d37a7',
        vimeo = require('vimeo-api').Vimeo,
        ffmpg = require('fluent-ffmpeg'),
        lib = new vimeo(vimeoClient_Id, vimeoClient_Secret);
/**
 * Vimeo Handler
 * @param {string} filePath
 * @param {function} callback(error, message)
 * @returns {callback}
 */
var upload = function(filePath, callback) {
    
    if (!filePath) return callback('Not found File', null);
    
    var duration;
    // this FUCKING ROW GET 2 hour MY FUCKING LIFE
    lib.access_token = vimeoClient_Token;

    try {
        
        console.log('Start upload:: ' + filePath);
        
        ffmpg.ffprobe(filePath, function(err, metadata) {
            duration = metadata.streams[0].duration
        });
 
        lib.streamingUpload(filePath, function(error, body, status_code, headers) {
            if (error) return callback(error, null);

            lib.request(headers.location, function(error, body, status_code, headers) {
                if (error) return callback(error, null);

                body['custom_duration'] = duration;
                return callback(null, {vimeo:body});
            });
        });
        
    } catch (e) {
        return callback(e, null);
    }
};

module.exports = {
    upload: upload
};