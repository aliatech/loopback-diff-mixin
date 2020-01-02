'use strict';

module.exports = (Company) => {

  Company.diffConfig = function () {
    return {
      hooks: {
        name: 'beforeNameChanged',
        'before:socials.*': 'beforeSocialChanged',
        'after:address.*': {
          handler: 'afterAddressChanged',
          multi: true,
        },
        'after:address.**': 'afterAddressDeepChanged',
        'set:address.timetable.days': 'beforeAddressTimetableChanged',
        'set:address.timetable.days.*/m': 'beforeAddressTimetableEachDayChanged',
        'after:updated:address.timetable.hours.1': 'afterAddressTimetableEndHourUpdated',
      },
    };
  };

  Company.prototype.beforeNameChanged = async function (name, prop, prevInst) {
  };

  Company.prototype.beforeSocialChanged = async function (name, prop, prevInst) {
  };

  Company.prototype.afterAddressChanged = async function (name, prop, prevInst) {
  };

  Company.prototype.afterAddressDeepChanged = async function (name, prop, prevInst) {
  };

  Company.prototype.beforeAddressTimetableChanged = async function (name, prop, prevInst) {
  };

  Company.prototype.beforeAddressTimetableEachDayChanged = async function (name, prop, prevInst) {
  };

  Company.prototype.afterAddressTimetableEndHourUpdated = async function (name, prop, prevInst) {
  };

};
