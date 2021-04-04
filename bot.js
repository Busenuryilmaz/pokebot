//variabeles
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
var idSender;
var database = [];
var weekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Mongoose collections
const nameSchema = new Schema({
    referenceTag: String,
    id: String
})

const nameModel = mongoose.model('namesCollection', nameSchema);

const reminderSchema = new Schema({
    authorId: String,
    reminderTag: String,
    isWeekly: Boolean,
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
        var jobPing = new CronJob(_today.getSeconds() + " * * * * *", function() {
            var _day = new Date();
            var currentDate = new dateModel({
                year: _day.getFullYear, month: _day.getMonth, date: _day.getDate, hour: _day.getHours, minute: _day.getMinutes, second: _day.getSeconds
            });
            currentDate.save();
            console.log(_day.toDateString());
        });
    }).catch((err) => {
        console.log("F")
        console.log(err);
    });
});

client.on("message", message => {
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
                Reminder(user_message, idSender);
                break;

            case "weekly":
                Weekly(user_message, idSender);
                break;

            case "help":
                channel01.send("```• .poke remind (remindername) [dd-mm-yyyy] [hh:mm] [(name), (name), ...] (message): Sets a reminder \n" +
                    "• .poke weekly (remindername) [&(weekday)] [hh:mm] [(name), (name), ...] (message): Sets a weekly reminder \n" +
                    "• .poke addEntry (reference tag) (id): Adds an entry to the database \n" +
                    "• .poke delete (remindername): Deletes a reminder \n" + 
                    "• .poke list: Lists all entries in reminder database.```");
                break;

            case "addEntry":
                AddEntry(user_message);
                break;

            case "delete":
                Delete(user_message, true, message.author.id);
                break;

            case "list":
                List();
                break;

            case "flush":
                reminderModel.find().then(function (result) {
                    for (var i = 0; i < result.length; i++) {
                        result[i].remove();
                    }
                    channel01.send("Deleted " + result.length + " reminders!")
                })
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

    if (day === 8) {
        channel01.send("Please enter a valid weekday, eg. 'Tuesday'.");
        return;
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
                        }
                    });
                });
                job.start();
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

function Delete(tag, printMessage, _authorId = "") {
    reminderModel.findOne({
        reminderTag: tag
    }).then(function (result) {
        if (_authorId === "" || _authorId === result.authorId) {

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
        var missedArray = [];
        for (var i = 0; i < result.length; i++) {
            var cronString = result[i].dateTime;
            var cronArray = cronString.split(" ");

            // "0 " + minute + " " + hour + " " + day + " " + monthToInt + " " + "*" + " " + year

            var cronDate = new Date(cronArray[6], cronArray[4], cronArray[3], cronArray[2], cronArray[1], 0, 0);
            if (cronDate < bootDate && !result[i].isWeekly) { // Checks if the date has passed and it's not a weekly cronjob
                missedArray.length++
                missedArray[missedArray.length - 1] = result[i];
            }
        }
        if (missedArray.length > 0) {
            channel01.send("I missed the following reminders: ");
            for (var i = 0; i < missedArray.length; i++) {
                channel01.send(result[i].message);
                Delete(result[i].reminderTag, false);
            }
        }

        //reactivate cronjobs
        reminderModel.find().then(function (result) {
            for (var i = 0; i < result.length; i++) {
                ReactivateJob(result[i].dateTime, result[i].message, result[i].reminderTag, result[i]._id.toString(), result[i].isWeekly);
            }
        })
    })
} //*

function AddEntry(messageContent) {
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
        var name = new nameModel({ referenceTag: refTag, id: refID });
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

function GetDatabase() {
    nameModel.find().then(function (result) {
        for (var i = 0; i < result.length; i++) {
            database.length++;
            database[database.length - 1] = [result[i].referenceTag, result[i].id];
        }
    });   
}

function List() {

    reminderModel.find().then(function (result) {
        if (result.length === 0) {
            channel01.send("Seems like there are no reminders scheduled!");
            return;
        }

        var logger = fs.createWriteStream('reminderList.txt', {
            flags: 'w' // 'a' means appending (old data will be preserved)
        })

        // split the array in two based on weekly's
        var resultReminder = [];
        var resultWeekly = [];
        for (var i = 0; i < result.length; i ++) {
            if (result[i].isWeekly) {
                resultWeekly.length ++;
                resultWeekly[resultWeekly.length - 1] = result[i];
            } else {
                resultReminder.length ++;
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
            var arrayA = a.dateTime.split(" ");
            var arrayB = b.dateTime.split(" ");

            return arrayA[5] - arrayB[5];
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

                channel01.send("Too many reminders for a discord message, please refer to this file:", {
                    files: [
                        "./reminderList.txt"
                    ]
                });
        }

        else channel01.send("```" + listMessage + "```");
    })
}