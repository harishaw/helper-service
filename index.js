const redis = require("redis");
var request = require('request');
var winston = require('winston');

var redisClient = null;



// var rotateTransport = new Rotate({
//   file: 'ca-trigger-pricing.log',
//   colorize: true,
//   timestamp: true,
//   size: '100m',
//   keep: 5,
//   compress: true,
//   level: 'silly'
// });

var consoleTransport = new winston.transports.Console({ 
    format: winston.format.combine(
        winston.format.timestamp(new Date()),
        winston.format.colorize(),
        winston.format.simple(),
      ),
  level: "silly"
});


var loggerOpts = {
  transports: [consoleTransport]
};

var logger = new winston.createLogger(loggerOpts);
//#region  Redis
function createRedisConnection(redishost,redisport)
{
    var redisOptions = {
        host: redishost,
        port: redisport,
    };
    
    redisClient = redis.createClient(redisOptions);
    redisClient.on('connect', function () {
        logger.info('Redis connection established');
  });
   
   redisClient.on('error', function (err) {
        // Don't include err in the log as it includes the Redis creds.
        logger.error('Redis connection failed');
    });
}

function cache(options, cb) {
    try{
        if(options.act === "save"){
            Save(options,function(err,response){
                if(err){
                    cb(err,null)
                }
                else{
                    cb(null,response)
                }
            });
        }
        else if(options.act === "load"){
            Load(options,function(err,response){
                if(err){

                    cb(err,null)
                }
                else{
                    cb(null,response)
                }
            });
        }
        else if(options.act === "remove"){
            Remove(options,function(err,response){
                if(err){
                    cb(err,null)
                }
                else{
                    cb(null,response)
                }
            });
        }
        else{
            logger.error("Invvalid act");
        }
    } catch(e){
        cb(e,null)
    }
}

function Remove(options,cb)
{
redisClient.del(options.key, function(err, response) {
    logger.info("Removed value ",response.toString());
    if(err){
        cb(err,null)
    }
    else{
        cb(null,response)
    }
  });
}

function Save(options,cb)
{
    if(options.expire){
        redisClient.SETEX(options.key,options.expire,options.value, function(err, response) {
            logger.info("Saved value ",response.toString());
            if(err){
                cb(err,null)
            }
            else{
                cb(null,response)
            }
            });
    }
    else{
        redisClient.SET(options.key,options.value, function(err, response) {
            logger.info("Saved value ",response.toString());
            if(err){
                cb(err,null)
            }
            else{
                cb(null,response)
            }
        });
}
}

function Load(options,cb)
{
redisClient.get(options.key, function(err, response) {
    if(response){
        logger.info("Fetched value ",response.toString());
    }
    if(err){
        cb(err,null)
    }
    else{
        cb(null,response)
    }
  });
}
//#endregion

//#region Service
function service(option,cb){
    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        const requestOptions = {
            json: true,
            uri: option.url + option.path,
            method:option.method,
            headers:headers
          };

        if(option.params!=null)
            requestOptions.body = option.params

        request(requestOptions, function (err, res, body) {
            if (err) {
                logger.error("HTTP Error : " + err);
                cb(err, res, body);
            } else if ((res != null) && (res.statusCode !== 200)) {
                let error = err;
                if (error == null) {
                    error = body;
                }
                logger.error("HTTP Request failed : " + res.statusCode + " Error: " + JSON.stringify(error) + " Body: " + body);
                cb(err, res, body);
            }
            cb(err, body, res);
        });
    }
    catch(e){
        cb(e,null,null);
    }
}
//#endregion



module.exports = {
    createRedisConnection:createRedisConnection,
    cache:cache,
    service:service,
    logger:logger
}
