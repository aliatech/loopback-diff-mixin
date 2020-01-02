'use strict';

module.exports = (Person) => {

  Person.prototype.beforeNameChanged = async function (name, prop, prevInst) {
    this.name = name.toUpperCase();
    return [...arguments];
  };

  Person.prototype.beforeEmailChanged = async function (email, prevInst) {
    this._beforeEmailChanged = true;
  };

  Person.prototype.beforeEmailAdded = async function (email, prevInst) {
  };

  Person.prototype.beforeEmailUpdated = async function (name, prop, prevInst) {
  };

  Person.prototype.beforeEmailAddedOrUpdated = async function (name, prop, prevInst) {
  };

  Person.prototype.afterEmailChanged = async function (email, prevInst) {
    this._afterEmailChanged = true;
  };

  Person.prototype.afterEmailAdded = async function (email, prevInst) {
  };

  Person.prototype.afterEmailUpdated = async function (name, prop, prevInst) {
    return [...arguments];
  };

  Person.prototype.afterEmailAddedOrUpdated = async function (name, prop, prevInst) {
  };

  Person.prototype.beforeZipCodeChanged = async function (zipCode, prevInst) {
  };

  Person.prototype.beforeCityDeleted = async function (zipCode, prevInst) {
  };

};
