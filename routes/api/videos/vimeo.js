var rootPath = process.cwd(),
        vimeoKey = '6e94a26df51e910b6d40c453d4c0f90224894d99',
        vimeoId = '234d0f96c8bda2f3d8eba1d8820f5eeef2d3272c',
        vimeoToken = '0add82e9e834a72387b9e9ca642d37a7',
        vimeo = require('vimeo-api').Vimeo;

var upload = function(filePath, callback) {
    
    if (!filePath) return callback({error: 'Not found File'}, null);
    
    try {
        callback(null, "START VIMEO UPLOAD");

        var lib = new vimeo(vimeoKey, vimeoId);
        // this FUCKING ROW GET 2 hour MY FUCKING LIFE
        lib.access_token = vimeoToken;

        lib.streamingUpload(filePath, function(error, body, status_code, headers) {
            if (error) return callback({error: error}, null);

            lib.request(headers.location, function(error, body, status_code, headers) {
                if (error) return callback(error, null);
                
                callback(null, {body:body});
            });
        });
        
    } catch (e) {
        return callback(e, null);
    }
};

module.exports = {
    upload: upload
};