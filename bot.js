require("dotenv").config();

const Discord = require("discord.js");
const fs = require("fs");
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
var uri = "mongodb+srv://Mods:RemindMePlease69@pokecluster.q3420.mongodb.net/PokeDB?retryWrites=true&w=majority"

const nameSchema = new Schema({
    referenceTag: String,
    id: Number
})
const nameModel = mongoose.model('namesCollection', nameSchema);

client.on('ready', function () {
    console.log("let's a go!")
    channel01 = client.channels.cache.find(channel => channel.id === channel_id);
    mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: true
    }).then(() => {
        console.log("we're connected chief! o7");
        var name = new nameModel({ referenceTag: "buse", id: "318525928558952449" });
        name.save();
    }).catch((err) => {
        console.log(err);
    });

    ReadDatabaseFile();
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
                Reminder(user_message);
                break;

            case "help":
                channel01.send("```• .poke remind [dd-mm-yyyy] [hh:mm] [(name), (name), ...] (message): Sets a reminder \n" +
                    "• .poke addEntry (reference tag) (id): Adds an entry to the database```")
                break;

            case "txt":
                WriteScheduleFile();
                ReadDatabaseFile();
                break;

            case "addEntry":
                AddEntry(user_message);
                break;

            case "baseStatus":
                channel01.send(lines);
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
            remindMonth = lastElementArray[1] - 1;
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
    doJob(remindDay, remindMonth + 1, remindYear, remindTimeHour, remindTimeMinutes, messageFinal);
}

function AddMention(user_message) {

}
//seconds, 
function doJob(day, month, year, hour, minute, message) {
    try {
        var job = new CronJob("0 " + minute + " " + hour + " " + day + " " + inputWeekDay + " " + month, function () { //seconds minutes hours day weekday month
            //check if in list

            channel01.send(message);
            job.stop();
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
            return "<@" + database[i][1] + ">";
        }
    }
    return "@" + name;
}

function AddEntry(messageContent) {


}
function ReadDatabaseFile() {
    var lines = fs.readFileSync("database.txt").toString();
    var baseArray = lines.split("\n");
    for (var i = 0; i < baseArray.length-1; i++) {
        var entryArray = baseArray[i].split(" ");
        database.length++;
        database[database.length - 1] = [entryArray[0], entryArray[1]];
    }
}