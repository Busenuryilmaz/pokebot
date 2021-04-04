//variables ctrl m,h
// bot test channel  499702957391216652
const Discord = require("discord.js");
const fs = require("fs");
const envReader = require('dotenv').config();
const mongoose = require("mongoose");
const MongoClient = require('mongodb').MongoClient;
const Schema = mongoose.Schema;

const client = new Discord.Client();
var CronJob = require('cron').CronJob;
var prefix = ".poke";
var channel_id = "499702957391216652";
var channel01;
var guild; 
var idSender;
var database = [];
var weekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Mongoose collections
const nameSchema = new Schema({
    authorId: String,
    referenceTag: String,
    id: String
})

const nameModel = mongoose.model('namesCollection', nameSchema);

const reminderSchema = new Schema({
    authorId: String,
    reminderTag: String,
    isWeekly: Boolean,
    nextDate: String,
    dateTime: String,
    message: String
})

const reminderModel = mongoose.model("reminderCollection", reminderSchema);

const dateSchema = new Schema({
    year: String,
    month: String,
    date: String,
    hour: String,
    minute: String,
    second: String
})

const dateModel = mongoose.model("dateCollection", dateSchema);

client.on('ready', function () {
    console.log("let's a go!")
    channel01 = client.channels.cache.find(channel => channel.id === channel_id);
    //guild = client.guilds.cache.roles.find();
    mongoose.connect(process.env.BOT_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
    }).then(() => {
        GetDatabase();
        console.log("we're connected chief! o7");

        OnStartup();

        //setup misc cronjobs
        var _today = new Date(new Date().getTime() + 1200);
        var jobPing = new CronJob(_today.getSeconds() + " * * * * *", function () {
            PingDate();
        });
        jobPing.start();
    }).catch((err) => {
        console.log("F")
        console.log(err);
    });
});

client.on("message", message => {
    // Check for admin
    var isAdmin = message.member.roles.cache.some(role => role.id == "828350748953804810");

    idSender = message.author.id;
    if (message.author != ("826098682897891380") && message.content.startsWith(prefix)) {
        var user_message = message.content;

        //remove prefix
        user_message = user_message.replace(prefix + " ", "");
        var commandArray = user_message.split(" ");
        user_message = "";
        for (var i = 1; i < commandArray.length; i++) {
            user_message += commandArray[i] + " ";
        }
        user_message = user_message.trim();
        switch (commandArray[0]) {
            case "reminder":
                Reminder(user_message, message);
                break;

            case "weekly":
                Weekly(user_message, idSender);
                break;

            case "help":
                channel01.send("```• .poke reminder (remindername) [dd-mm-yyyy] [hh:mm] [(name), (name), ...] (message): Sets a reminder \n" +
                    "• " + prefix + " weekly (remindername) [&(weekday)] [hh:mm] [(name), (name), ...] (message): Sets a weekly reminder \n" +
                    "• " + prefix + " delete (remindername): Deletes a reminder \n" +
                    "• " + prefix + " list reminders: Lists all currently active reminders \n" +
                    "• " + prefix + " list reminders tag: Lists all reminders containing your tag \n" +
                    "• " + prefix + " list entries: Lists all references in the database \n" +
                    "• " + prefix + " addEntry (reference tag) (id): Adds a reference entry to the database \n" +
                    "• " + prefix + " dropEntry (reference tag): Removes a reference entry from the database \n" +
                    "• " + prefix + " flush: Deletes all active reminders```");
                break;

            case "addEntry":
                AddEntry(user_message, idSender);
                break;

            case "dropEntry":
                DropEntry(user_message, idSender, isAdmin);
                break;

            case "delete":
                Delete(user_message, true, idSender, isAdmin);
                break;

            case "list":
                List(user_message, message.author, message);
                break;

            case "flush":
                if (isAdmin) {
                    reminderModel.find().then(function (result) {
                        for (var i = 0; i < result.length; i++) {
                            result[i].remove();
                        }
                        channel01.send("Deleted " + result.length + " reminders!")
                    })
                } else {
                    channel01.send("Upgrade to premium for only $4.99/month to unlock this feature! Use promo code 'POGGIES' to get 1% off of your purchase xoxo Gossip Girl");
                }
                break;

            default: channel01.send("Type '.poke help' for a list of commands");
                break;
        }
    }
})

client.login(process.env.BOT_TOKEN)

function Reminder(user_message, _authorId) {

    //remove prefix
    var commandArray = user_message.split(" ");
    user_message = "";
    var reminderTag = commandArray[0];
    if (reminderTag.includes("[")) {
        channel01.send("Syntax error! Reminder must include a name. :c");
        return;
    }
    for (var i = 1; i < commandArray.length; i++) {
        user_message += commandArray[i] + " ";
    }
    user_message = user_message.trim();

    //split 1
    var user_message_array = user_message.split("]");
    for (var i = 0; i < user_message_array.length; i++) {

        //gets only the arguments
        user_message_array[i] = user_message_array[i].replace("[", "");
        user_message_array[i] = user_message_array[i].trim();
    }

    //gets notification
    var stringMessage = user_message_array[user_message_array.length - 1];
    user_message_array.length = user_message_array.length - 1;

    //datum
    var today = new Date();
    var remindTimeHour = "00";
    var remindTimeMinutes = "00";
    var remindDay = today.getDate();
    var remindMonth = parseInt(today.getMonth()) + 1;
    var remindYear = today.getFullYear();
    var mentionNames = [];

    while (user_message_array.length > 0) {
        var last_element = user_message_array[user_message_array.length - 1];
        if (last_element.includes(":")) {

            // time
            var lastElementArray = last_element.split(":");
            remindTimeHour = lastElementArray[0];
            remindTimeMinutes = lastElementArray[1];

        } else if (last_element.includes("-")) {
            // date
            var lastElementArray = last_element.split("-");
            remindDay = parseInt(lastElementArray[0]);
            remindMonth = parseInt(lastElementArray[1]);
            remindYear = lastElementArray[2];
        }
        else {
            //mentions
            var mentionNames = last_element.split(",")
            for (var i = 0; i < mentionNames.length; i++) {
                mentionNames[i] = mentionNames[i].trim();

            }
        }

        user_message_array.length--;
    }
    var inputDate = new Date(remindYear, parseInt(remindMonth) - 1, remindDay, parseInt(remindTimeHour), parseInt(remindTimeMinutes), 0, 0);
    if (inputDate < new Date()) { //checks if date passed xoxo
        channel01.send("Oops, this date/time has already passed, chief! o7");
        return;
    }

    //generate job
    var messageFinal = stringMessage;
    for (var i = mentionNames.length - 1; i >= 0; i--) {
        mentionId = GetId(mentionNames[i]);
        messageFinal = mentionId + " " + messageFinal;
    }
    messageFinal = "<@" + idSender + "> " + messageFinal;
    doJob(remindDay, remindMonth, remindYear, remindTimeHour, remindTimeMinutes, messageFinal, _authorId, reminderTag);
}

function Weekly(user_message, _authorId) {

    //remove prefix
    var commandArray = user_message.split(" ");
    user_message = "";
    var reminderTag = commandArray[0];
    if (reminderTag.includes("[")) {
        channel01.send("Syntax error! Reminder must include a name. :c");
        return;
    }
    for (var i = 1; i < commandArray.length; i++) {
        user_message += commandArray[i] + " ";
    }
    user_message = user_message.trim();

    //split 1
    var user_message_array = user_message.split("]");
    for (var i = 0; i < user_message_array.length; i++) {
       
        //gets only the arguments
        user_message_array[i] = user_message_array[i].replace("[", "");
        user_message_array[i] = user_message_array[i].trim();
    }

    //gets notification
    var stringMessage = user_message_array[user_message_array.length - 1];
    user_message_array.length = user_message_array.length - 1;

    //datum
    var today = new Date();
    var remindTimeHour = "00";
    var remindTimeMinutes = "00";
    var remindWeekday = today.getDay();
    var mentionNames = [];
    var day = 8;

    while (user_message_array.length > 0) {
        var last_element = user_message_array[user_message_array.length - 1];
        if (last_element.includes(":")) {

            // time
            var lastElementArray = last_element.split(":");
            remindTimeHour = lastElementArray[0];
            remindTimeMinutes = lastElementArray[1];

        } else if (last_element.includes("&")) {
            // day of week
            last_element = last_element.replace("&", "");
            for (var i = 0; i < weekNames.length; i ++) {
                if (last_element.toLowerCase() === weekNames[i].toLowerCase()) {
                    day = i;
                    break;
                }
            }
            if (day === 8) {
                channel01.send("Please enter a valid weekday, eg. 'Tuesday'.");
                return;
            }
            remindWeekday = day;
        }
        else if (!last_element.includes("&")) {
            //mentions
            var mentionNames = last_element.split(",")
            for (var i = 0; i < mentionNames.length; i++) {
                mentionNames[i] = mentionNames[i].trim();
            }
        }

        user_message_array.length--;
    }

    //generate job
    var messageFinal = stringMessage;
    for (var i = mentionNames.length - 1; i >= 0; i--) {
        mentionId = GetId(mentionNames[i]);
        messageFinal = mentionId + " " + messageFinal;
    }
    messageFinal = "<@" + idSender + "> " + messageFinal;
    WeeklyJob(remindWeekday, remindTimeHour, remindTimeMinutes, messageFinal, _authorId, reminderTag);
}

function doJob(day, month, year, hour, minute, message, authorId, reminderTag) {
    try {
        //addsReminder
        var monthToInt = parseInt(month) - 1;
        var dateTimeString = "0 " + minute + " " + hour + " " + day + " " + monthToInt + " " + "*";

        //checks if tag already exists in db
        reminderModel.find().then(function (result) {
            for (var i = 0; i < result.length; i++) {
                if (result[i].reminderTag === reminderTag) {
                    channel01.send("This reminder tag already exists! Please use another one.")
                    return;
                }
            }
            //adds to database
            var reminder = new reminderModel({ authorId: authorId, reminderTag: reminderTag, isWeekly: false, dateTime: dateTimeString + " " + year, message: message });

            var reminderId = reminder._id.toString();
            try {
                var job = new CronJob(dateTimeString, function () { //seconds minutes hours day weekday month
                    //check if in list
                    reminderModel.findOne({ _id: reminderId }).then(function (result) {
                        if (result != null) {
                            channel01.send(message);
                            Delete(reminderTag, false);
                        }
                    });
                    job.stop();
                });
                job.start();
                reminder.nextDate = "";
            }
            catch {
                channel01.send("Error: Please enter a valid time and/or date. Ff normaal doen schatteke x.")
                return;
            }

            reminder.save().then(function () {
                if (reminder.isNew) {
                    channel01.send("Error: MongoDB failed. Ask Buse or **Jesse the Great**");
                    job.stop();
                }
                else {
                    channel01.send("Copy that! Reminder set for " + hour + ":" + minute + " on " + day + "-" + month + "-" + year + ".");
                }
            });

        });

    }
    catch (err){
        channel01.send("👉👈  Oops user-san, I think maybe hypothetically you are dumb.")
        console.log(err);
    }
}

function WeeklyJob(weekDay, hour, minute, message, authorId, reminderTag) {
    try {
        var dateTimeString = "0 " + minute + " " + hour + " * * " + weekDay;

        //checks if tag already exists in db
        reminderModel.find().then(function (result) {
            for (var i = 0; i < result.length; i++) {
                if (result[i].reminderTag === reminderTag) {
                    channel01.send("This reminder tag already exists! Please use another one.")
                    return;
                }
            }
            //adds to database
            var reminder = new reminderModel({ authorId: authorId, reminderTag: reminderTag, isWeekly: true, dateTime: dateTimeString + " *", message: message });

            var reminderId = reminder._id.toString();
            try {
                var job = new CronJob(dateTimeString, function () { //seconds minutes hours day weekday month
                    //check if in list
                    reminderModel.findOne({ _id: reminderId }).then(function (result) {
                        if (result != null) {
                            channel01.send(message);
                            PingDate();

                        }
                    });
                });
                job.start();
                reminder.nextDate = job.nextDate().toDate().getTime().toString();
            }
            catch(err) {
                channel01.send("Error: Please enter a valid time and/or date. Ff normaal doen schatteke x.")
                console.log(err);
                return;
            }

            reminder.save().then(function () {
                if (reminder.isNew) {
                    channel01.send("Error: MongoDB failed. Ask Buse or **Jesse the Great**");
                    job.stop();
                }
                else {
                    channel01.send("Copy that! Reminder set for " + hour + ":" + minute + " on " + weekNames[weekDay]);
                }
            });
        });

    }
    catch (err){
        channel01.send("👉👈  Oops user-san, I think maybe hypothetically you are dumb.")
        console.log(err);
    }
}

function ReactivateJob(dateTimeString, message, reminderTag, reminderId, _isWeekly) {

    //remove year
    var dateTimeArray = dateTimeString.split(" ");
    dateTimeString = "";
    for (var i = 0; i < dateTimeArray.length - 1; i++) {
        dateTimeString += dateTimeArray[i] + " ";
    }
    dateTimeString = dateTimeString.trim();
    try {
        var job = new CronJob(dateTimeString, function () { //seconds minutes hours day weekday month
            //check if in list
            reminderModel.findOne({ _id: reminderId }).then(function (result) {
                if (result != null) {
                    channel01.send(message);
                    if (!_isWeekly)
                        Delete(reminderTag, false);
                }
            });
            if (!_isWeekly)
                job.stop();
        });
        job.start();

    }
    catch(err){
        console.log(err);
    }
}

function GetId(name) {
    name = name.toLowerCase();
    name = name.trim();
    for (var i = 0; i < database.length; i++) {

        if (name === database[i][0]) {
            return "<@" + database[i][1] + ">";
        }
    }
    return "@" + name;
}

function Delete(tag, printMessage, _authorId = "", isAdmin = false) {
    reminderModel.findOne({
        reminderTag: tag
    }).then(function (result) {
        if (_authorId === "" || _authorId === result.authorId || isAdmin) {

            //print message
            if (result === null) {
                if (printMessage)
                    channel01.send("Reminder tag could not be found! Please check for typos and try again.");
            }
            else {
                result.remove();
                if (printMessage)
                    channel01.send("Reminder deleted!");
            }
        }
        else {
            channel01.send("Reminder could not be deleted for thou hath not made it!")
        }
    })
}

function OnStartup() {

    //check for missed reminders
    var bootDate = new Date();

    reminderModel.find().then(function (result) {
        var resultArray = result;
        dateModel.findOne().then(function (_lastDate) {
            var missedArray = [];
            for (var i = 0; i < resultArray.length; i++) {
                var cronString = resultArray[i].dateTime;
                var cronArray = cronString.split(" ");

                // "0 " + minute + " " + hour + " " + day + " " + monthToInt + " " + "*" + " " + year

                // Default
                var cronDate = new Date(cronArray[6], cronArray[4], cronArray[3], cronArray[2], cronArray[1], 0, 0);
                if (cronDate < bootDate && !resultArray[i].isWeekly) {
                    missedArray.length++
                    missedArray[missedArray.length - 1] = resultArray[i];
                }
                // Weekly
                if (resultArray[i].isWeekly) {
                    cronDate = new Date(parseInt(resultArray[i].nextDate));

                    var lastDate = new Date(_lastDate.year, _lastDate.month, _lastDate.date, _lastDate.hour, _lastDate.minute, _lastDate.second);
                    if (cronDate > lastDate && cronDate < bootDate) {
                        missedArray.length++
                        missedArray[missedArray.length - 1] = resultArray[i];
                    }
                }
            }
            if (missedArray.length > 0) {
                channel01.send("I missed the following reminders: ");
                for (var i = 0; i < missedArray.length; i++) {
                    channel01.send(resultArray[i].message);
                    Delete(resultArray[i].reminderTag, false);
                }
            }

            //reactivate cronjobs
            reminderModel.find().then(function (resultArray) {
                for (var i = 0; i < resultArray.length; i++) {
                    ReactivateJob(resultArray[i].dateTime, resultArray[i].message, resultArray[i].reminderTag, resultArray[i]._id.toString(), resultArray[i].isWeekly);
                }
            })

            // Debugging
            channel01.send("Ready! o7");
        })
    })
}

function AddEntry(messageContent, _authorId) {
    var messageContentArray = messageContent.split(" ");
    if (messageContentArray.length != 2) {
        channel01.send("Syntax error! Please refer to .poke help!")
        return;
    }

    var refTag = messageContentArray[0].toLowerCase();
    var refID = messageContentArray[1];

    //checks if name already exists in db
    nameModel.find().then(function (result) {
        for (var i = 0; i < result.length; i++) {
            if (result[i].referenceTag === refTag) {
                channel01.send("This reference tag already exists! Please use another one.")
                return;
            }
        }
        //adds to database
        var name = new nameModel({ authorId: _authorId, referenceTag: refTag, id: refID });
        name.save().then(function () {
            if (name.isNew === false) {
                channel01.send(messageContentArray[0] + " has been saved to the database!");
                GetDatabase();
            }
            else
                channel01.send("Failed to add " + messageContentArray[0] + " to the database!")
        });
    });
}

function DropEntry(messageContent, _authorId, isAdmin) {
    var messageContentArray = messageContent.split(" ");
    if (messageContentArray.length != 1) {
        channel01.send("Syntax error! Please refer to .poke help!")
        return;
    }

    var refTag = messageContentArray[0].toLowerCase();

    nameModel.findOne({ referenceTag: refTag }).then(function(result) {
        if (result != null) {
            // Check admin
            if (!(isAdmin || result.authorId === _authorId)) {
                channel01.send("You don't have permission to do that! :P");
                return;
            }
            result.remove().then(function() {
                channel01.send(messageContent + " has been removed from the database.");
            }).catch((err) => {
                channel01.send("Database error, ask mods (pay in natura pls)");
                console.log(err);
            })
        } else {
            channel01.send("That tag doesn't exist! O_O");
        }
    })
}

function PingDate() {
    var _day = new Date();

    // Clear date database
    dateModel.deleteMany({}).then(function(result) {
        // Save date to database
        var currentDate = new dateModel({
            year: _day.getFullYear(), month: _day.getMonth(), date: _day.getDate(), hour: _day.getHours(), minute: _day.getMinutes(), second: _day.getSeconds()
        });
        currentDate.save();
    })
}

function GetDatabase() {
    nameModel.find().then(function (result) {
        for (var i = 0; i < result.length; i++) {
            database.length++;
            database[database.length - 1] = [result[i].referenceTag, result[i].id];
        }
    });   
}

function List(user_message, _author, _message) {
    var _authorId = _author.id;
    
    user_message = user_message.trim();

    var onlyTagged = false;
    switch (user_message) {
        case "reminders tag":
            onlyTagged = true;
        case "":
        case "reminders":
            reminderModel.find().then(function (result) {
                var logger = fs.createWriteStream('reminderList.txt', {
                    flags: 'w' // 'a' means appending (old data will be preserved)
                })

                // add tagged reminders
                if (onlyTagged) {
                    // check per message
                    var resultNew = [];
                    for (var i = 0; i < result.length; i++) {
                        // Check if this is the user or if everyone is mentioned
                        if (result[i].message.includes(_authorId) || result[i].message.includes("@everyone")) {
                            resultNew.length ++;
                            resultNew[resultNew.length - 1] = result[i];
                            continue;
                        }

                        // Get mentions
                        messageMentions = [];
                        var splits = result[i].message.split("<");
                        for (var o = 0; o < splits.length; o ++) {
                            if (splits[o].includes("@&")) {
                                var splits2 = splits[o].split(">");
                                var mention = splits2[0].replace("@&", "");
                                messageMentions.length ++;
                                messageMentions[messageMentions.length - 1] = mention;
                            }
                        }

                        // Check per role if the user has it
                        for (var o = 0; o < messageMentions.length; o++) {
                            if (_message.member.roles.cache.some(role => role.id == messageMentions[o])) {
                                resultNew.length ++;
                                resultNew[resultNew.length - 1] = result[i];
                                break;
                            }
                        }
                    }
                    result = resultNew;
                }

                // Check if the list is not empty
                if (result.length === 0) {
                    if (onlyTagged)
                        channel01.send("You are not tagged in any upcoming reminders!");
                    else
                        channel01.send("Seems like there are no reminders scheduled!");
                    return;
                }

                // split the array in two based on weekly's
                var resultReminder = [];
                var resultWeekly = [];
                for (var i = 0; i < result.length; i++) {
                    if (result[i].isWeekly) {
                        resultWeekly.length++;
                        resultWeekly[resultWeekly.length - 1] = result[i];
                    } else {
                        resultReminder.length++;
                        resultReminder[resultReminder.length - 1] = result[i];
                    }
                }

                //sorts by date
                resultReminder.sort(function (a, b) {
                    var arrayA = a.dateTime.split(" ");
                    var dateA = new Date(arrayA[6], arrayA[4], arrayA[3], arrayA[2], arrayA[1]);
                    var arrayB = b.dateTime.split(" ");
                    var dateB = new Date(arrayB[6], arrayB[4], arrayB[3], arrayB[2], arrayB[1]);

                    return dateA - dateB;
                })

                // sorts by day
                resultWeekly.sort(function (a, b) {
                    var dateA = new Date(parseInt(a.nextDate));
                    var dateB = new Date(parseInt(b.nextDate));

                    return dateA - dateB;
                })

                //print
                var listMessage = "";
                if (resultReminder.length > 0) {
                    for (var i = 0; i < resultReminder.length; i++) {
                        var dateTimeArray = resultReminder[i].dateTime.split(" ");
                        dateTimeArray[4] = parseInt(dateTimeArray[4]) + 1;
                        listMessage += "• " + resultReminder[i].reminderTag + " (" + dateTimeArray[3] + "-" + dateTimeArray[4] + "-" + dateTimeArray[6] + ", " + dateTimeArray[2] + ":" + dateTimeArray[1] + ") \n";
                    }
                    listMessage += "\n"
                }
                if (resultWeekly.length > 0) {
                    for (var i = 0; i < resultWeekly.length; i++) {
                        var dateTimeArray = resultWeekly[i].dateTime.split(" ");
                        listMessage += "• " + resultWeekly[i].reminderTag + " (" + weekNames[dateTimeArray[5]] + ", " + dateTimeArray[2] + ":" + dateTimeArray[1] + ") \n";
                    }
                }
                listMessage = listMessage.trim();
                if (listMessage.length > 1950) {
                        logger.write(listMessage);

                        channel01.send("Too many characters for a discord message, please refer to this file:", {
                            files: [
                                "./reminderList.txt"
                            ]
                        });
                }

                else channel01.send("```" + listMessage + "```");
            })
            break;

        case "entries":
            nameModel.find().then(function (result) {
                if (result.length === 0) {
                    channel01.send("There are currently no references.");
                    return;
                }

                var logger = fs.createWriteStream('referenceList.txt', {
                    flags: 'w' // 'a' means appending (old data will be preserved)
                })

                //array
                var listArray = [];
                for (var i = 0; i < result.length; i++) {
                    listArray.length ++;
                    listArray[listArray.length - 1] = "• " + result[i].referenceTag + ": " + result[i].id + "\n";
                }

                //sorts alphabetically
                listArray.sort();

                //print
                var listMessage = "";
                    for (var i = 0; i < listArray.length; i++) {
                        listMessage += listArray[i];
                    }
                    listMessage += "\n"
                listMessage = listMessage.trim();
                if (listMessage.length > 1950) {
                        logger.write(listMessage);

                        channel01.send("Too many characters for a discord message, please refer to this file:", {
                            files: [
                                "./referenceList.txt"
                            ]
                        });
                }

                else channel01.send("```" + listMessage + "```");
            })
            break;
        default:
            channel01.send("Error: unknown identifier " + user_message + ".");
            break;
    }
}