/**
 * The Message Class
 * @class Message
 * @param {Object} document An object representing a Message in a conversation ususally a Mongo document
 */
Message = BaseModel.extend();

/**
 * Get the user that wrote the message
 * @method user
 * @returns {User} The user who wrote the message
 */
Message.prototype.user = function () {
    return Meteor.users.findOne(this.userId);
};

/**
 * The message timestamp
 * @method timestamp
 * @returns {String} A string representing the time when the message was sent
 */
Message.prototype.timestamp = function () {
    var now = new Date();
    var stamp = "";

    if(now.toLocaleDateString() != this.date.toLocaleDateString()){
        stamp += this.date.toLocaleDateString() + " ";
    }

    return stamp += this.date.toLocaleTimeString();
};

/**
 * Get the number of likes of a message
 */
Message.prototype.numLikes = function () {
    if (!this.likes) {
        return 0;
    } else {
        return this.likes.length;
    }
}

/**
 * Does a message have likes?
 */
Message.prototype.hasLikes = function () {
    return this.numLikes() > 0;
}

/**
 * Like a message
 */
Message.prototype.like = function () {
    if (_.find(this.likes, function(el) { return el == Meteor.userId()})) {
        return false;
    } else {
        Meteor.messages.update(this._id, {$push: {'likes': Meteor.userId()}});
        return true;
    }
}

/**
 * Stop liking a message
 */
Message.prototype.unlike = function () {
    if (_.find(this.likes, function(el) { return el == Meteor.userId()})) {
        Meteor.messages.update(this._id, {$pull: {'likes': Meteor.userId()}});
        return true;
    } else {
        return false;
    }
}

/**
 * Toggle like status of this message
 */
Message.prototype.likeToggle = function () {
    if (_.find(this.likes, function(el) { return el == Meteor.userId()})) {
        return this.unlike();
    } else {
        return this.like();
    }
}

//Create the messages collection and assign a reference to Message.prototype._collection so BaseModel has access to it
MessagesCollection = Message.prototype._collection = new Mongo.Collection("messages", {
    transform: function (document) {
        return new Message(document);
    }
});

Meteor.messages = MessagesCollection;

//Create our message schema
var MessageSchema = new SimpleSchema({
    "userId":{
        type:String,
        regEx:SimpleSchema.RegEx.Id,
        autoValue:function () {
            if(this.isInsert){
                return Meteor.userId();
            }else{
                this.unset();
            }
        },
        optional:true,
        denyUpdate:true
    },
    "conversationId":{
        type:String,
        regEx:SimpleSchema.RegEx.Id
    },
    "body":{
        type:String,
    },
    "date":{
        type:Date,
        autoValue:function() {
            if(this.isInsert){
                return new Date();
            }
        },
        optional:true,
        denyUpdate:true
    },
    "deleted":{
        type:[String],
        defaultValue:[],
        optional:true
    },
    "messageType":{
        type:String,
        optional:true,
    },
    "likes":{
        type:[String],
        defaultValue:[],
        optional:true,
    },
});

//Attach the schema
MessagesCollection.attachSchema(MessageSchema);
