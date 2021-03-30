require("dotenv").config();

const Discord = require("discord.js");
const fs = require("fs");
const logger = fs.createWriteStream('log.txt', {
    flags: 'a' // 'a' means appending (old data will be preserved)
})

const client = new Discord.Client();
var CronJob = require('cron').CronJob;
var prefix = ".poke";
var channel_id = "499702957391216652";
var baseMessageid = "826391920581541939";//826391920581541939 bot test server base
var channel01;
var idSender;
var database = [];

client.on('ready', function () {
    console.log("let's a go!")
    channel01 = client.channels.cache.find(channel => channel.id === channel_id);
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
                Refresh(baseMessageid, message);
                Reminder(user_message);
                break; 

            case "refresh":
                Refresh(baseMessageid, message);
                channel01.send("Database refreshed! :D");
                break;

            case "help":
                channel01.send("```• .poke remind [dd-mm-yyyy] [hh:mm] [name, name, ...] message: Sets a reminder \n" +
                    "• .poke refresh: Refreshes the database```")
                break;

            case "txt":
                WriteScheduleFile();
                ReadScheduleFile();
                break;

            default: channel01.send("Type '.poke help' for a list of commands");
                break;
        }
    }
})
// bot test channel  499702957391216652

client.login(process.env.BOT_TOKEN)

function Reminder(user_message) {
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
    var remindTimeHour = 0;
    var remindTimeMinutes = 0;
    var remindDay = today.getDate();
    var remindMonth = today.getMonth();
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
            remindDay = lastElementArray[0];
            remindMonth = lastElementArray[1] -1;
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
    var inputDate = new Date(remindYear, remindMonth, remindDay, remindTimeHour, remindTimeMinutes, 0, 0);
    if (inputDate < new Date()) { //checks if date passed xoxo
        channel01.send("Oops, this date/time has already passed, chief! o7");
        return;
    }

    inputWeekDay = inputDate.getDay();


    //generate job
    var messageFinal = stringMessage;
    for (var i = mentionNames.length - 1; i >= 0; i--) {
        mentionId = GetId(mentionNames[i]);
        messageFinal = mentionId + " " + messageFinal;
    }
    messageFinal = "<@" + idSender + "> " + messageFinal;
    doJob(remindDay, remindMonth+1, remindYear, remindTimeHour, remindTimeMinutes, messageFinal);
}

function AddMention(user_message) {

}
//seconds, 
function doJob(day, month, year, hour, minute, message) {
    try {
        var job = new CronJob("0 " + minute + " " + hour + " " + day + " " + inputWeekDay + " " + month, function () { //seconds minutes hours day weekday month
            //check if in list

            channel01.send(message);
            // minute + " " + hour + " " + day + " " + month + " *"
        });
        job.start();
        channel01.send("Copy that! Reminder set for " + hour + ":" + minute + " on " + day + "-" + month + "-" + year + ".");
    }
    catch {
        channel01.send("👉👈  Oops user-san, I think maybe hypothetically you are dumb.")
    }
    
}


function GetId(name) {
    name = name.toLowerCase();
    name = name.trim();
    for (var i = 0; i < database.length; i++) {

        if (name === database[i][0]) {
            return "<@" +  database[i][1] + ">";
        }
    }
    return "@" + name;
}

function Refresh(message_id, msg) {
    msg.channel.messages.fetch(message_id)
        .then(message => {
            var messageString = "" + message.content;
            var baseArray = messageString.split("\n");
            for (var i = 0; i < baseArray.length; i++) {
                var entryArray = baseArray[i].split(" ");
                database.length++;
                database[database.length - 1] = [entryArray[0], entryArray[1]];
            } 
        })
    //var baseArray = baseMessage.content.split("\n");
    //for (var i; i < baseArray.length; i++) {
    //    channel01.send(baseArray[i]);
    //}
}
function WriteScheduleFile() {
    logger.write("poggers \n");
    logger.write("poggers2 \n");
    logger.write("poggers3 \n");
    logger.end();
}
function ReadScheduleFile() {
    var line1 = fs.readFileSync("log.txt").toString();
    channel01.send(line1);
}