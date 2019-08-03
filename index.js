const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const crypto = require("crypto");
var ses = new AWS.SES({ region: 'us-east-1' });

exports.handler = (event, context, callback) => {
    var searchParams = {
        Key: {
            emailId: event.Records[0].Sns.Message
        },
        TableName: 'csye6225'
    };
    dynamo.get(searchParams, function (error, code) {
        var jsString = JSON.stringify(code);
        if (error) {
            console.log("Error",error);
        }
        else {
            if (Object.keys(code).length >= 0) {
                var flag = false;
                if(code.Item == undefined){flag = true;}else
                    if(code.Item.timeStamp < (new Date).getTime()){flag = true;}
                if(flag){
                    var expirationTime = (new Date).getTime() + (1000 * 60 * 2);
                    var params = {
                        Item: {
                            emailId: event.Records[0].Sns.Message,
                            token: crypto.randomBytes(16).toString("hex"),
                            timeStamp: expirationTime
                        },
                        TableName: 'csye6225'
                    };

                    dynamo.put(params, function (err, data) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data);
                            var id = params.Item.token;
                            var username = event.Records[0].Sns.Message;
                            console.log(username);
                            var cParams = {
                                Destination: {
                                    ToAddresses: username
                                },
                                Message: {
                                    Body: {
                                        Text: {
                                            Data: "http://"+process.env.domain+"/reset?email="+username+"&token="+id
                                        }
                                    },
                                    Subject: {
                                        Data: "Password Reset Request URL"
                                    }
                                },
                                Source: "info@"+process.env.domain
                            };
                            ses.sendEmail(cParams, function (err, data) {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    console.log("EMAIL SENT");
                                    context.succeed(event);
                                }
                            });
                        }
                    });
                }
            } else
                console.log(code, "User exists");
        }
    });
};