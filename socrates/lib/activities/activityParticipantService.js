//@flow
/*::
 type Callback<T> = (err: ?Error, res: T) => void;
 type Year = string
 type MemberId = number
 type Activity = {
   allRegisteredMembers: () => Array<MemberId>,
   allWaitinglistEntries: () => mixed
 }
 type ActivityStore = {
   getActivity: (activityName: string, cb: Callback<Activity>) => void
 }
 type Member = {
  id: () => string
  participation: ParticipationType
 }
 type ParticipationType = {
 }
 type Subscriber = {
   id: () => string
   participationOf: (year: Year) => ParticipationType
 }
 type MemberStore = {
    getMembersForIds: (ids: Array<MemberId>, cb: Callback<Member[]>) => void
 }
*/
'use strict';

var _ = require('lodash');
var R = require('ramda');

var async = require('async');

var beans = require('simple-configure').get('beans');
var subscriberstore = beans.get('subscriberstore');
var memberstore /*:MemberStore*/ = beans.get('memberstore');
var activitystore/*:ActivityStore*/ = beans.get('activitystore');
var eventstoreService = beans.get('eventstoreService');
var Participation = beans.get('socratesParticipation');

var getMembers = function (memberIds, year, callback) {
  async.parallel({

    members: _.partial(memberstore.getMembersForIds, memberIds),
    subscribers: subscriberstore.allSubscribers
  }, function (err1, results/*:{members: Member[], subscribers: Subscriber[]}*/) {
    if (err1) { return callback(err1); }
    _.each(results.members, function (member/*:Member*/) {
      var subscriber/*:Subscriber*/ = _.find(results.subscribers, function (sub/*:Subscriber*/) { return sub.id() === member.id(); });
      member.participation = subscriber ? subscriber.participationOf(year) : new Participation();
    });

    callback(null, results.members);

  });
};

module.exports = {



  getParticipantsFor: function (year /*: Year*/, callback /*:Callback)*/) {
    if (Number.parseInt(year) < 2016) {
      activitystore.getActivity('socrates-' + year, function (err, activity) {
        if (err || !activity) { return callback(err); }
        return getMembers(activity.allRegisteredMembers(), year, callback);
      });
    } else {
      eventstoreService.getRegistrationReadModel('socrates-' + year, function (err, readModel) {
        if (err || !readModel) { return callback(err); }
        return getMembers(readModel.registeredMemberIds(), year, callback);
      });
    }
  },

  getWaitinglistParticipantsFor: function (year /*:Year*/, callback /*:Callback*/) {
      if (Number.parseInt(year) < 2016) {
      activitystore.getActivity('socrates-' + year, function (err, activity) {
        if (err || !activity) { return callback(err); }
        return getMembers(activity.allWaitinglistEntries(), year, callback);
      });
    } else {
      eventstoreService.getRegistrationReadModel('socrates-' + year, function (err, readModel) {
        if (err || !readModel) { return callback(err); }
        return getMembers(R.keys(readModel.waitinglistParticipantsByMemberId()), year, callback);
      });
    }
  }
};
