// Load global configuration
var config    = require('../config');

// Load all necessary nodejs modules
var request   = require('request');
var Nexmo = require('nexmo');

// Load all necessary database models
var DriverModel     = require('../models/driverModel');
var RequestModel    = require('../models/requestModel');
var RestaurantModel = require('../models/restaurantModel');

// NEXMO local configuration
var nexmoRestUrl = "https://rest.nexmo.com/sms/json";
var vancouver    = '17786548275';
var sf           = '13376006129';
var kit			 = '12262101585';

// API functions
exports.processCall = function(req, res){
    console.log('call-id: ' + req.query['call-id']);
    console.log('to: ' + req.query.to);
    console.log('status: ' + req.query.status);
    console.log('digits: ' + req.query.digits);
    console.log('call-price: ' + req.query['call-price']);
    console.log('call-duration: ' + req.query['call-duration']);
    console.log('call-request: ' + req.query['call-request']);
    console.log('call-start: ' + req.query['call-start']);
    console.log('call-end: ' + req.query['call-end']);
    console.log('network-code: ' + req.query['network-code']);
    return res.status(200).json('Successfully receiving call response.');
};

function sendTextMessage(message, to, from){
    from = kit;

    if (config.SMS.ENV === 'PRODUCTION' && config.SMS.CLIENT === 'NEXMO') {
        // var data = {
        //         api_key: config.SMS.API_KEY,
        //         api_secret: config.SMS.API_SECRET,
        //         from: from,
        //         to: to,
        //         text: message
        //     };
        // var options = {
        //     url: nexmoRestUrl,
        //     data: data,
        //     method: 'POST',
        //     port: 443,
        //     headers: {
        //         'Content-Type':'application/json',
        //         'Content-Length': Buffer.byteLength(data)
        //     }
        // };
        // request(options, function(error, response, body){
        //     if (error) {
        //         return console.error(error);
        //     }
        //     var result = JSON.parse(body);
        //     return console.log(result);
        // });
        console.log({from:from, to:to, message:message});

        var nexmo = new Nexmo({
              apiKey: config.SMS.API_KEY, 
              apiSecret: config.SMS.API_SECRET
            },
            {debug: true}
        );
        nexmo.message.sendSms(
          from, to, message,
            function(err, responseData) {
              if (err) {
                return console.error(err);
              } else {
                return console.log(responseData);
              }
            }
         );
    } else {
        return console.log('SMS to ' + to + ': ' + message + ' from ' + from);
    }
}

/*function processDriverMessage(req, res, text) {
    DriverModel.findOne({'phone': req.query.msisdn}, function(err, driver) {
        if (err) {
            console.error('Error exists: ' + err.message);
            return res.status(200).json({
                result: "Database error",
                error: err.message
            });
        } else if (!driver) {
            console.warn('Phone number ' + req.query.msisdn + ' is not registered');
            return res.status(200).json({
                result: "Phone number is not registered with any driver",
                number: req.query.msisdn
            });
        } else {
            RequestModel.findOne({
                deliveredBy: driver._id,
                status: 5
            }).populate('requestedBy').exec(function(err, request) {
                if (err) {
                    console.error('Error exists: ' + err.message);
                    return res.status(200).json({
                        result : "Database error",
                        error : err.message
                    });
                } else if (!request) {
                    console.warn('Driver ' + driver._id + ' does not exist');
                    return res.status(200).json({
                        result : "Driver has not been assigned to any restaurant",
                        driver : driver._id
                    });
                } else {
                    // update driver information
                    driver.available = true;
                    driver.lastDelivery.time = new Date();
                    driver.lastDelivery.requestedBy = request.requestedBy;
                    driver.save();

                    // notify the driver or administrator
                    var message = "";
                    var distance = request.distance ? request.distance.trim().replace('km', '') : '0';
                    var rate = request.requestedBy.newRate + 4.5;
                    if (distance > 14) rate += 7.5;
                    if (distance >= 7 && distance < 14) rate += 2;
                    if (text === "YES" || text === "Y") {
                        message = 'Total Charge=$' + rate + '(' + request.requestedBy.newRate +
                            '); Pick up' +
                            ' from ' + request.requestedBy.fullname +
                            ' at ' + request.requestedBy.address.full + ' .';
                        request.status = 9;
                        request.save();
                        sendTextMessage(message, req.query.msisdn);
                    } else {
                        message = 'Driver ' + driver.fullname +
                            ' rejected the delivery for ' + request.requestedBy.fullname;
                        request.status = 1;
                        request.save();
                        sendTextMessage(message, config.SMS.ADMIN_NO, sf);
                    }

                    return res.status(200).json({
                        result: "Success",
                        msg : "Successfully updating request and driver status."
                    });
                }
            });
        }
    });
}
*/
function processDriverMessage(req, res, text) {
    DriverModel.findOne({'phone': req.query.msisdn}, function(err, driver) {
        if (err) {
            console.error('Error exists: ' + err.message);
            return res.status(200).json({
                result: "Database error",
                error: err.message
            });
        } else if (!driver) {
            console.warn('Phone number ' + req.query.msisdn + ' is not registered');
            return res.status(200).json({
                result: "Phone number is not registered with any driver",
                number: req.query.msisdn
            });
        } else {
            RequestModel.findOne({
                deliveredBy: driver._id,
                status: 5
            }).populate('requestedBy').exec(function(err, request) {
                if (err) {
                    console.error('Error exists: ' + err.message);
                    return res.status(200).json({
                        result : "Database error",
                        error : err.message
                    });
                } else if (!request) {
                    console.warn('Driver ' + driver._id + ' does not exist');
                    return res.status(200).json({
                        result : "Driver has not been assigned to any restaurant",
                        driver : driver._id
                    });
                } else {
                    // update driver information
                    driver.available = true;
                    driver.lastDelivery.time = new Date();
                    driver.lastDelivery.requestedBy = request.requestedBy;
                    driver.save();

                    // notify the driver or administrator
                    var message = "";
                    var address1 = request.destination;
                    var address2 = request.requestedBy.address.full;
                    var rate = 0;
                    /*if (address1.search("Waterloo")!=-1){
                        if (address2.search("Waterloo")!=-1){
                            rate = 7.50
                        }
                        else if(address2.search("Kitchener")!=-1){
                            rate = 9.50
                        }
                        else {
                            rate = 9.50
                        }
                    }
                    else if (address1.search("Kitchener")!=-1){
                        if (address2.search("Waterloo")!=-1){
                            rate = 9.50
                        }
                        else if(address2.search("Kitchener")!=-1){
                            rate = 7.50
                        }
                        else {
                            rate = 9.50
                        }
                    }
                    else {
                        rate = 9.50
                    }*/
                    rate = 7.50

          
                    if (text === "YES" || text === "Y") {
                        message = 'Total Charge=$' + rate + '; Pick up' +
                            ' from ' + request.requestedBy.fullname +
                            ' at ' + request.requestedBy.address.full + ' .';
                        request.status = 9;
                        request.save();
                        sendTextMessage(message, req.query.msisdn);
                    } else {
                        message = 'Driver ' + driver.fullname +
                            ' rejected the delivery for ' + request.requestedBy.fullname;
                        request.status = 1;
                        request.save();
                        sendTextMessage(message, config.SMS.ADMIN_NO, sf);
                    }

                    return res.status(200).json({
                        result: "Success",
                        msg : "Successfully updating request and driver status."
                    });
                }
            });
        }
    });
}

function processRestaurantMessage(req, res) {
    RestaurantModel.findOneAndUpdate({
        mobileNumbers: {
            $elemMatch: {
                number: req.query.msisdn
            }
        }
    }, {
        $inc: {
            "currentRequests": 1,
            "totalRequests": 1,
            "mobileNumbers.$.count": 1
        }
    }, function(err, restaurant) {
        if (err){
            console.error('Error exists: ' + err.message);
            return res.status(200).json({
                result : "Database error",
                error : err.message
            });
        } else if (restaurant === null) {
            console.warn('Phone number ' + req.query.msisdn + ' is not registered');
            return res.status(200).json({
                result : "Phone number not registered with the restaurant",
                number : req.query.msisdn
            });
        } else {
            var request = new RequestModel();

            // save request
            request.status = 0;
            request.requestedAt = new Date();
            request.requestedBy = restaurant._id;
            request.save();

            // send confirmation message to restaurant
            var message = 'Your request was received at ' +
                (new Date()).toString().substring(16, 25);
            sendTextMessage(message, req.query.msisdn, vancouver);
            exports.notifyAdmin("request");

            return res.status(200).json({
                msg: "Successfully notifying admin a new request."
            });
        }
    });
}

exports.handleMessage = function(req, res) {
    if (!req.query.text) {
        return res.status(200).json({
            msg: "Did not received any text"
        });
    }
    var text = req.query.text.toUpperCase().trim();
    if (!text) {
        return res.status(200).json({
            msg: "Did not received any text"
        });
    }

    if (text === "YES" || text === "NO" || text === "Y" || text === "N") {
        processDriverMessage(req, res, text);
    } else if (text === "DRIVER") {
        processRestaurantMessage(req, res, text);
    } else {
        return res.status(200).json({
            msg: "Invalid text message"
        });
    }
};

exports.notifyAdmin = function(type) {
    var message = 'A new ' + type + ' request at ' + (new Date()).toString().substring(16, 25);
    sendTextMessage(message, config.SMS.ADMIN_NO, sf);
};

exports.notifyDriver = function(phone, city) {
    var message = 'A delivery was assigned to you in ' + city + ' at ' +
        (new Date()).toString().substring(16, 24) +
        '. You have 2 minutes to reply "YES/Y" to accept, or "NO/N" to reject.';
    sendTextMessage(message, phone, vancouver);
};

exports.notifyRejection = function(driverName, restaurantName) {
    var message = 'Driver ' + driverName +
        ' rejected the delivery for ' + restaurantName;
    sendTextMessage(message, config.SMS.ADMIN_NO, sf);
};

exports.checkAccepted = function(id) {
    RequestModel
    .findOne({'_id': id})
    .populate('requestedBy deliveredBy')
    .exec(function(err, request) {
        if (err) {
            return console.error('Error exists: ' + err.message);
        } else if (!request) {
            return console.error('Driver request ' + id + ' does not exists');
        } else {
            if (request.status === 5) {
                request.status = 2;
                request.save();

                var message = 'Driver ' + request.deliveredBy.fullname +
                    ' did not respond to the delivery request for ' +
                    request.requestedBy.fullname;
                sendTextMessage(message, config.SMS.ADMIN_NO, sf);
                request.deliveredBy.available = true;
                request.deliveredBy.save();
            }
        }
    });
};
