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
        '/category|sector/': 'beforeCategoryOrSectorChanged',
        'before:/ratings\\.(node|.*js)/i': 'beforeJsCapabilitiesChanged',
        '/ratings\\.(quality|commitment)/i/m': 'beforeQualityOrCommitmentCapabilitiesChanged',
      },
    };
  };

  Company.prototype.beforeNameChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.beforeSocialChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.afterAddressChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.afterAddressDeepChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.beforeAddressTimetableChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.beforeAddressTimetableEachDayChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.afterAddressTimetableEndHourUpdated = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.beforeCategoryOrSectorChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.beforeJsCapabilitiesChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

  Company.prototype.beforeQualityOrCommitmentCapabilitiesChanged = async function (name, prop, helpers, prevInst, ctx) {
  };

};
