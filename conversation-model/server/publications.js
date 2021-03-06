Meteor.publish("conversations", function (options) {
    this.unblock();
    var currentUser;

    if(!this.userId){
        return this.ready();
    }

    options = options || {};

    options = _.pick(options, ["limit, skip"]);

    options.sort = {date:-1};

    currentUser = Meteor.users.findOne(this.userId);

    var participantsPublication = new SimplePublication({
        subHandle:this,
        collection:ParticipantsCollection,
        selector:{userId:{$ne:this.userId}},
        foreignKey:"conversationId",
        dependant: new SimplePublication({
            subHandle:this,
            collection:Meteor.users,
            foreignKey:"userId",
            inverted:true
        })
    });

    var messagesPublication = new SimplePublication({
        subHandle:this,
        collection:MessagesCollection,
        selector:{deleted:{$ne:this.userId}},
        options:{sort:{date:-1}, limit:1},
        foreignKey:"conversationId",
        straightPublish:true
    });

    new SimplePublication({
        subHandle:this,
        collection:ParticipantsCollection,
        selector:{userId:this.userId, deleted:{$exists:false}},
        dependant:new SimplePublication({
            subHandle:this,
            collection:ConversationsCollection,
            options:options,
            foreignKey:"conversationId",
            inverted:true,
            dependant:[participantsPublication, messagesPublication]
        })
    }).start();
});


/**
 * Publish messages for a particular conversation
 * @param   {String}       conversationId The _id of the conversation to fetch messages for
 * @param   {Object}       options        Query options {limit:Number, skip:Number}
 * @returns {Mongo.Cursor} A cursor of messsages that belong to the current conversation
 */
Meteor.publish("messagesFor", function(conversationId, options){
    var self = this;
    var user = User.createEmpty(self.userId);

    self.unblock();

    if(!self.userId){
        return this.ready();
    }

    var conversation = Conversation.createEmpty(conversationId);

    if (options == undefined) {
        options = {};
    }
    if (options.limit == undefined) {
        options.limit = 0;
    }
    if (options.skip == undefined) {
        options.skip = 0;
    }

    if(user.isParticipatingIn(conversation)){
        return conversation.messages(options.limit, options.skip, "date", 1);
    } else {
        return [];
    }
});


/**
 * This publication when subscribed to, updates the state of the participant
 * to keep track of the last message read by the user and whether they are viewing
 * it at this current moment. When the publication stops it updates the participant
 * to indicate they are no longer viewing the conversation
 *
 * @param   {String}       conversationId The _id of the conversation the user is viewing
 */
Meteor.publish("viewingConversation", function(conversationId){
    this.unblock();

    if(!this.userId){
        return this.ready();
    }

    var self = this;
    var sessionId = this._session.id;


    ParticipantsCollection.update({
        conversationId:conversationId, userId:self.userId
    },{
        $addToSet:{observing:sessionId},
        $set:{read:true},
    });

    self.onStop(function () {
        ParticipantsCollection.update({conversationId:conversationId, userId:self.userId}, {$pull:{observing:sessionId}});
    });

    this.ready();
});


/**
 * This publication when subscribed to sets the typing state of a participant in a conversation to true. When stopped it sets it to false.
 * @param   {String}   conversationId The _id of the conversation
 */
Meteor.publish("typing", function(conversationId){
    this.unblock();

    if(!this.userId){
        return this.ready();
    }

    var self = this;

    ParticipantsCollection.update({
        conversationId:conversationId, userId:self.userId
    },{
        $set:{typing:true}
    });

    self.onStop(function () {
        ParticipantsCollection.update({conversationId:conversationId, userId:self.userId}, {$set:{typing:false}});
    });

    this.ready();
});
