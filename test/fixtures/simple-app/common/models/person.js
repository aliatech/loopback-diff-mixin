'use strict';

module.exports = (Person) => {

  Person.prototype.beforeNameChanged = async function (name, prop, helpers, prevInst, ctx) {
    helpers.extendAttributes({
      name: name.toUpperCase(),
    });
    return [...arguments];
  };

  Person.prototype.beforeEmailChanged = async function (email, prop, helpers) {
    helpers.extendAttributes({
      _beforeEmailChanged: true,
    });
  };

  Person.prototype.beforeEmailAdded = async function (email) {
  };

  Person.prototype.beforeEmailUpdated = async function (email) {
  };

  Person.prototype.beforeEmailAddedOrUpdated = async function (email) {
  };

  Person.prototype.beforeJobChargeChanged = async function (jobCharge, prop, helpers) {
    helpers.extendAttributes({jobCharge});
  };

  Person.prototype.beforeJobChargeSyncChanged = async function (jobCharge, prop, helpers) {
    helpers.extendAttributes({
      _beforeJobChargeSyncChanged: !this._beforeJobChargeSyncChanged,
    });
  };

  Person.prototype.afterEmailChanged = async function (email, prop, helpers) {
    helpers.extendAttributes({
      _afterEmailChanged: true,
    });
  };

  Person.prototype.afterEmailAdded = async function () {
  };

  Person.prototype.afterEmailUpdated = async function () {
    return [...arguments];
  };

  Person.prototype.afterEmailAddedOrUpdated = async function () {
  };

  Person.prototype.beforeZipCodeChanged = async function (zipCode) {
  };

  Person.prototype.beforeCityDeleted = async function (zipCode) {
  };

};
