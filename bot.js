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
var idSender;
var database = [];
var weekNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var updatePercent = 0.25;
var ready = false;

var dateLastClose;
var dateLastStartup;
var dateLastPing;

var missedCount = 0;

var idReset = "";
listeningForReset = false;

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

const dataSchema = new Schema({
    totalRemindersCreated: String,
    totalRemindersSent: String,
    totalRemindersMissed: String,
    totalMessages: String,
    averageTimeSave: String,
    averageTimeLoad: String
})
var totalRemindersCreated = 0;
var totalRemindersSent = 0;
var totalRemindersMissed = 0;
var totalMessages = 0;
var averageTimeSave = 0;
var averageTimeLoad = 0;

const dataModel = mongoose.model("dataCollection", dataSchema);

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
    }).catch((err) => {
        console.log("F")
        console.log(err);
    });
});

client.on("message", message => {
    // Check for admin
    var isAdmin = message.member.roles.cache.some(role => role.id == "828350748953804810");

    idSender = message.author.id;
    if (message.author != ("826098682897891380")) {
        if (idSender == idReset) {
            if (message.content == "POG" && listeningForReset) {
                say("All statistics were deleted! :(");
                Reset();
                listeningForReset = false;
                return;
            } else {
                if (listeningForReset) {
                    say("Statistics deletion aborted!");
                }
            }
            listeningForReset = false;
        }
        
        if (message.content.startsWith(prefix)) {
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
                    say("```• .poke reminder (remindername) [dd-mm-yyyy] [hh:mm] [(name), (name), ...] (message): Sets a reminder \n\n" +
                        "• " + prefix + " weekly (remindername) [&(weekday)] [hh:mm] [(name), (name), ...] (message): Sets a weekly reminder \n\n" +
                        "• " + prefix + " delete (remindername): Deletes a reminder \n\n" +
                        "• " + prefix + " list: Lists all currently active reminders \n\n" +
                        "• " + prefix + " list tag: Lists all reminders mentioning you \n\n" +
                        "• " + prefix + " list today: Lists all reminders are scheduled for today \n\n" +
                        "• " + prefix + " list entries: Lists all references in the database \n\n" +
                        "• " + prefix + " addEntry (reference tag) (id): Adds a reference entry to the database \n\n" +
                        "• " + prefix + " dropEntry (reference tag): Removes a reference entry from the database \n\n" +
                        "• " + prefix + " goblin: Switch to secondary accumulation indicators \n\n" +
                        "• " + prefix + " log: Shows statistics for nerds \n\n" +
                        "• " + prefix + " flush: Seletes all scheduled active reminders \n\n" +
                        "• " + prefix + " reset: Deletes all saved statistiscs```");
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

                case "log":
                    Log();
                    break;

                case "flush":
                    if (isAdmin) {
                        reminderModel.find().then(function (result) {
                            for (var i = 0; i < result.length; i++) {
                                result[i].remove();
                            }
                            say("Deleted " + result.length + " reminders!")
                        })
                    } else {
                        say("Upgrade to premium for only $4.99/month to unlock this feature! Use promo code 'POGGIES' to get 1% off of your purchase xoxo Gossip Girl");
                    }
                    break;

                case "goblin":
                    say("Goblin' on these nuts! (Haha gotem ggs)");
                    break;

                case "reset":
                    if (isAdmin) {
                        say("Warning! You are about to delete ALL statistics! Type 'POG' to continue");
                        idReset = idSender;
                        listeningForReset = true;

                    } else
                        say("You are not authorised for this command.");
                    break;

                default: say("Type '.poke help' for a list of commands");
                    break;
            }
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
        say("Syntax error! Reminder must include a name. :c");
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
        say("Oops, this date/time has already passed, chief! o7");
        return;
    }

    //generate job
    var messageFinal = stringMessage;
    for (var i = mentionNames.length - 1; i >= 0; i--) {
        mentionId = GetId(mentionNames[i]);
        messageFinal = mentionId + " " + messageFinal;
    }
    if (mentionNames.length == 0)
        messageFinal = "<@" + idSender + "> " + messageFinal;
    doJob(remindDay, remindMonth, remindYear, remindTimeHour, remindTimeMinutes, messageFinal, _authorId, reminderTag);
}

function Weekly(user_message, _authorId) {

    //remove prefix
    var commandArray = user_message.split(" ");
    user_message = "";
    var reminderTag = commandArray[0];
    if (reminderTag.includes("[")) {
        say("Syntax error! Reminder must include a name. :c");
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
            for (var i = 0; i < weekNames.length; i++) {
                if (last_element.toLowerCase() === weekNames[i].toLowerCase()) {
                    day = i;
                    break;
                }
            }
            if (day === 8) {
                say("Please enter a valid weekday, eg. 'Tuesday'.");
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
                    say("This reminder tag already exists! Please use another one.")
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
                            say(message);
                            totalRemindersSent++;
                            DataSave();
                            Delete(reminderTag, false);
                        }
                    });
                    job.stop();
                });
                job.start();
                reminder.nextDate = "";
            }
            catch {
                say("Error: Please enter a valid time and/or date. Ff normaal doen schatteke x.")
                return;
            }

            reminder.save().then(function () {
                if (reminder.isNew) {
                    say("Error: MongoDB failed. Ask Buse or **Jesse the Great**");
                    job.stop();
                }
                else {
                    say("Copy that! Reminder set for " + hour + ":" + minute + " on " + day + "-" + month + "-" + year + ".");
                    totalRemindersCreated++;
                    DataSave();
                }
            });

        });

    }
    catch (err) {
        say("👉👈  Oops user-san, I think maybe hypothetically you are dumb.")
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
                    say("This reminder tag already exists! Please use another one.")
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
                            say(message);
                            totalRemindersSent++;
                            DataSave();
                            PingDate();
                        }
                    });
                });
                job.start();
                reminder.nextDate = job.nextDate().toDate().getTime().toString();
            }
            catch (err) {
                say("Error: Please enter a valid time and/or date. Ff normaal doen schatteke x.")
                console.log(err);
                return;
            }

            reminder.save().then(function () {
                if (reminder.isNew) {
                    say("Error: MongoDB failed. Ask Buse or **Jesse the Great**");
                    job.stop();
                }
                else {
                    say("Copy that! Reminder set for " + hour + ":" + minute + " on " + weekNames[weekDay]);
                    totalRemindersCreated++;
                    DataSave();
                }
            });
        });

    }
    catch (err) {
        say("👉👈  Oops user-san, I think maybe hypothetically you are dumb.")
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
                    say(message);
                    totalRemindersSent++;
                    DataSave();
                    if (!_isWeekly)
                        Delete(reminderTag, false);
                }
            });
            if (!_isWeekly)
                job.stop();
        });
        job.start();

    }
    catch (err) {
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
                    say("Reminder tag could not be found! Please check for typos and try again.");
            }
            else {
                result.remove();
                if (printMessage)
                    say("Reminder deleted!");
            }
        }
        else {
            say("Reminder could not be deleted for thou hath not made it!")
        }
    })
}

function OnStartup() {

    //check for missed reminders
    var bootDate = new Date();

    reminderModel.find().then(function (result) {
        var resultArray = result;
        dateModel.findOne().then(function (_lastDate) {
            var lastDate = new Date(_lastDate.year, _lastDate.month, _lastDate.date, _lastDate.hour, _lastDate.minute, _lastDate.second);
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

                    if (cronDate > lastDate && cronDate < bootDate) {
                        missedArray.length++
                        missedArray[missedArray.length - 1] = resultArray[i];
                    }
                }
            }
            if (missedArray.length > 0) {
                say("I missed the following reminders: ");
                for (var i = 0; i < missedArray.length; i++) {
                    say(resultArray[i].message);
                    Delete(resultArray[i].reminderTag, false);
                }
                missedCount = missedArray.length;
            }

            //reactivate cronjobs
            reminderModel.find().then(function (resultArray) {
                for (var i = 0; i < resultArray.length; i++) {
                    ReactivateJob(resultArray[i].dateTime, resultArray[i].message, resultArray[i].reminderTag, resultArray[i]._id.toString(), resultArray[i].isWeekly);
                }
            })

            // Set date values
            dateLastClose = DateToString(lastDate);
            dateLastStartup = DateToString(new Date());

            //setup misc cronjobs
            var _today = new Date(new Date().getTime() + 1200);
            var jobPing = new CronJob(_today.getSeconds() + " * * * * *", function () {
                PingDate();
            });
            jobPing.start();

            // data
            var dateStart = new Date();
            dataModel.findOne().then(function (_data) {
                averageTimeLoad = parseInt(_data.averageTimeLoad);
                if (_data != null) {
                    var timeLoad = new Date().getTime() - dateStart.getTime();
                    averageTimeLoad = parseInt(averageTimeLoad * (1 - updatePercent) + timeLoad * updatePercent);
                }

                // Get data
                totalRemindersCreated = parseInt(_data.totalRemindersCreated);
                totalRemindersSent = parseInt(_data.totalRemindersSent);
                totalRemindersMissed = parseInt(_data.totalRemindersMissed);
                totalMessages = parseInt(_data.totalMessages);
                averageTimeSave = parseInt(_data.averageTimeSave);

                // Update missed
                totalRemindersMissed += missedCount;
                setTimeout(() => { DataSave(); }, 300);

                ready = true;
            });
        })
    })
}

function AddEntry(messageContent, _authorId) {
    var messageContentArray = messageContent.split(" ");
    if (messageContentArray.length != 2) {
        say("Syntax error! Please refer to .poke help!")
        return;
    }

    var refTag = messageContentArray[0].toLowerCase();
    var refID = messageContentArray[1];

    //checks if name already exists in db
    nameModel.find().then(function (result) {
        for (var i = 0; i < result.length; i++) {
            if (result[i].referenceTag === refTag) {
                say("This reference tag already exists! Please use another one.")
                return;
            }
        }
        //adds to database
        var name = new nameModel({ authorId: _authorId, referenceTag: refTag, id: refID });
        name.save().then(function () {
            if (name.isNew === false) {
                say(messageContentArray[0] + " has been saved to the database!");
                GetDatabase();
            }
            else
                say("Failed to add " + messageContentArray[0] + " to the database!")
        });
    });
}

function DropEntry(messageContent, _authorId, isAdmin) {
    var messageContentArray = messageContent.split(" ");
    if (messageContentArray.length != 1) {
        say("Syntax error! Please refer to .poke help!")
        return;
    }

    var refTag = messageContentArray[0].toLowerCase();

    nameModel.findOne({ referenceTag: refTag }).then(function (result) {
        if (result != null) {
            // Check admin
            if (!(isAdmin || result.authorId === _authorId)) {
                say("You don't have permission to do that! :P");
                return;
            }
            result.remove().then(function () {
                say(messageContent + " has been removed from the database.");
            }).catch((err) => {
                say("Database error, ask mods (pay in natura pls)");
                console.log(err);
            })
        } else {
            say("That tag doesn't exist! O_O");
        }
    })
}

function PingDate() {
    var _day = new Date();
    dateLastPing = DateToString(_day);

    // Clear date database
    dateModel.deleteMany({}).then(function (result) {
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
    var onlyTagged = false;
    var onlyToday = false;

    user_message = user_message.trim();
    user_message_parts = user_message.split(" ");

    if (user_message_parts[0] == "")
        user_message_parts.length = 0;

    for (var i = 0; i < user_message_parts.length; i++) {
        console.log("'" + user_message_parts[i] + "'");
    }

    for (var i = 0; i < user_message_parts.length; i++) {
        switch (user_message_parts[i]) {
            case "tag":
                onlyTagged = true;
                break;
            case "today":
                onlyToday = true;
                break;
            case "entries":
                if (user_message_parts.length == 1) {
                    nameModel.find().then(function (result) {
                        if (result.length === 0) {
                            say("There are currently no references.");
                            return;
                        }

                        var logger = fs.createWriteStream('referenceList.txt', {
                            flags: 'w' // 'a' means appending (old data will be preserved)
                        })

                        //array
                        var listArray = [];
                        for (var i = 0; i < result.length; i++) {
                            listArray.length++;
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

                            say("Too many characters for a discord message, please refer to this file:", {
                                files: [
                                    "./referenceList.txt"
                                ]
                            });
                        }

                        else say("```" + listMessage + "```");
                    })
                } else {
                    ListError();
                    return;
                }
                break;
            default:
                say("Error: unknown identifier " + user_message + ".");
                break;
        }
    }

    ListReminders(onlyTagged, onlyToday, _authorId);
}

function ListError() {
    say("Syntaxt error, Please try again!");
}

function ListReminders(onlyTagged, onlyToday, _authorId) {
    reminderModel.find().then(function (result) {
        var logger = fs.createWriteStream('reminderList.txt', {
            flags: 'w' // 'a' means appending (old data will be preserved)
        })

        // add todays reminders
        if (onlyToday) {
            var resultNew = [];

            var _check = new Date();
            var year = _check.getFullYear();
            var month = _check.getMonth();
            var date = _check.getDate();
            var weekDay = _check.getDay();

            for (var i = 0; i < result.length; i++) {
                var datesArray = result[i].dateTime.split(" ");
                var resYear = datesArray[6];
                var resMonth = datesArray[4];
                var resDate = datesArray[3];
                var resWeekDay = datesArray[5];

                if ((result[i].isWeekly && (weekDay == resWeekDay)) || (!result[i].isWeekly && (year == resYear && month == resMonth && date == resDate))) {
                    resultNew.length++;
                    resultNew[resultNew.length - 1] = result[i];
                }
            }
            result = resultNew;
        }

        // add tagged reminders
        if (onlyTagged) {
            var resultNew = [];

            // check per message
            for (var i = 0; i < result.length; i++) {
                // Check if this is the user or if everyone is mentioned
                if (result[i].message.includes(_authorId) || result[i].message.includes("@everyone")) {
                    resultNew.length++;
                    resultNew[resultNew.length - 1] = result[i];
                    continue;
                }

                // Get mentions
                messageMentions = [];
                var splits = result[i].message.split("<");
                for (var o = 0; o < splits.length; o++) {
                    if (splits[o].includes("@&")) {
                        var splits2 = splits[o].split(">");
                        var mention = splits2[0].replace("@&", "");
                        messageMentions.length++;
                        messageMentions[messageMentions.length - 1] = mention;
                    }
                }

                // Check per role if the user has it
                for (var o = 0; o < messageMentions.length; o++) {
                    if (_message.member.roles.cache.some(role => role.id == messageMentions[o])) {
                        resultNew.length++;
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
                say("You are not tagged in any upcoming reminders!");
            else
                say("Seems like there are no reminders scheduled!");
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

            say("Too many characters for a discord message, please refer to this file:", {
                files: [
                    "./reminderList.txt"
                ]
            });
        }

        else say("```" + listMessage + "```");
    })
}

function Log() {
    // Timezone
    var messageLog = "```";
    var today = new Date();
    var timeString = today.toTimeString();
    var timeArray = timeString.split(" ");
    timeString = "";
    for (var i = 1; i < timeArray.length; i++) {
        timeString += timeArray[i] + " ";
    }
    timeString = timeString.trim();
    messageLog += "Timezone: " + timeString + "\n\n"

    // Dates
    messageLog += "Last shutdown: " + dateLastClose + "\n";
    messageLog += "Last startup: " + dateLastStartup + "\n";
    messageLog += "Last database ping: " + dateLastPing + "\n\n";

    // Random stats
    messageLog += "Total reminders created: " + totalRemindersCreated + "\n";
    messageLog += "Total reminders sent: " + totalRemindersSent + "\n";
    messageLog += "Total reminders missed: " + totalRemindersMissed + "\n";
    messageLog += "Total messages sent by Poke: " + totalMessages + "\n";
    messageLog += "Average database save time (ms): " + averageTimeSave + "\n";
    messageLog += "Average database load time (ms): " + averageTimeLoad + "\n";

    messageLog += "```";

    say(messageLog);
}

function DateToString(date) {
    randomDate = new Date();
    var options = { hour12: false };

    date = date.toLocaleString('nl-NL', options);
    var dateArray = date.split(" ");
    date = dateArray[1] + ", " + dateArray[0];

    return date;
}

function DataSave() {
    // Clear data database
    dataModel.deleteMany({}).then(function () {
        // Save data to database
        var data = new dataModel({
            totalRemindersCreated: totalRemindersCreated.toString(),
            totalRemindersSent: totalRemindersSent.toString(),
            totalRemindersMissed: totalRemindersMissed.toString(),
            totalMessages: totalMessages.toString(),
            averageTimeSave: averageTimeSave.toString(),
            averageTimeLoad: averageTimeLoad.toString()
        });

        var dateStart = new Date();
        data.save().then(function () {
            if (!data.isNew) {
                var timeSave = new Date().getTime() - dateStart.getTime();
                averageTimeSave = parseInt(averageTimeSave * (1 - updatePercent) + timeSave * updatePercent);
            }
        })
    })
}

function say(text) {
    // Send a message
    channel01.send(text);
    totalMessages++;
    if (ready)
        DataSave();
}

function Reset() {
    // Clear data database
    dataModel.deleteMany({}).then(function (result) {
        // Save data to database
        var data = new dataModel({
            totalRemindersCreated: "0",
            totalRemindersSent: "0",
            totalRemindersMissed: "0",
            totalMessages: "0",
            averageTimeSave: "0",
            averageTimeLoad: "0"
        });

        averageTimeLoad = 0;
        totalRemindersCreated = 0;
        totalRemindersSent = 0;
        totalRemindersMissed = 0;
        totalMessages = 0;
        averageTimeSave = 0;

        var dateStart = new Date();
        data.save().then(function () {
            if (!data.isNew) {
                var timeSave = new Date().getTime() - dateStart.getTime();
                averageTimeSave = parseInt(averageTimeSave * (1 - updatePercent) + timeSave * updatePercent);
            }
        })
    })
}