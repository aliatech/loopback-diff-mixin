'use strict';

const _ = require('lodash');
const should = require('should');

describe('Mixin features', () => {
  let Person, Company;
  let john, jane;
  let alia;

  //=====================================================================================
  // Init fixture
  //=====================================================================================

  before(async () => {
    const app = await require('./fixtures/get-app')('simple-app')();
    require('../')(app);
    Person = app.models.Person;
    Company = app.models.Company;
  });

  //=====================================================================================
  // Tests
  //=====================================================================================

  it('Should trigger simplest hook on create', async () => {
    john = await Person.create({
      name: 'John',
    });
    const hooks = _.map(john.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql(['before:*:name']);
    const [result] = _.map(john.getDiffLastExecutedHooks(), 'result');
    result[0].should.eql('John');
    result[1].should.eql('name');
    result[2].should.be.instanceOf(Person);
    john.name.should.eql('JOHN');
    const dbJohn = await Person.findById(john.id);
    dbJohn.name.should.eql('JOHN');
  });

  it('Should trigger hook specifying phase and/or changeSet on .create', async () => {
    john = await Person.create({
      email: 'john@doe.org',
      address: {city: 'Madrid'},
    });
    const hooks = _.map(john.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:added:email',
      'before:*:email',
      'before:set:email',
      'after:added:email',
      'after:*:email',
      'after:set:email',
    ]);
    john._beforeEmailChanged.should.eql(true);
    john._afterEmailChanged.should.eql(true);
    const dbJohn = await Person.findById(john.id);
    dbJohn._beforeEmailChanged.should.eql(true);
    should.not.exists(dbJohn._afterEmailChanged);
  });

  it('Should trigger hook specifying phase and/or changeSet on .save (update)', async () => {
    john.email = 'john@doe.net';
    await john.save();
    const hooks = _.map(john.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:updated:email',
      'before:*:email',
      'before:set:email',
      'after:updated:email',
      'after:*:email',
      'after:set:email',
    ]);
    const [, , , result] = _.map(john.getDiffLastExecutedHooks(), 'result');
    result[0].should.eql('john@doe.net');
    result[1].should.eql('email');
    result[2].should.be.instanceOf(Person);
    result[2].email.should.eql('john@doe.org');
  });

  it('Should trigger hook specifying phase and/or changeSet on .updateAttributes', async () => {
    await john.updateAttributes({
      email: 'john@doe.com',
      address: {
        city: 'Madrid',
        zipCode: '32004',
      },
    });
    const hooks = _.map(john.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:*:address.zipCode',
      'before:updated:email',
      'before:*:email',
      'before:set:email',
      'after:updated:email',
      'after:*:email',
      'after:set:email',
    ]);
  });

  it('Should trigger delete hooks on nested props when wrapper object was emptied (save update)', async () => {
    john.address = {}; // delete address.city and address.zipCode
    await john.save();
    const hooks = _.map(john.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:*:address.zipCode',
      'before:deleted:address.city',
    ]);
  });

  it('Should skip all hooks specifying skipDiff=true (create)', async () => {
    jane = await Person.create({
      email: 'jane@doe.org',
      address: {zipCode: 32004},
    }, {skipDiff: true});
    const hooks = _.map(jane.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([]);
  });

  it('Should skip hooks specifying property name (create)', async () => {
    jane = await Person.create({
      email: 'jane@doe.org',
      address: {zipCode: 32004},
    }, {skipDiff: 'email'});
    const hooks = _.map(jane.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:*:address.zipCode',
    ]);
  });

  it('Should skip hooks specifying property name with wildcards (save create)', async () => {
    jane = new Person({
      email: 'jane@doe.org',
      address: {
        city: 'Madrid',
        zipCode: 32004,
      },
    });
    await jane.save({skipDiff: 'address.*'});
    const hooks = _.map(jane.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:added:email',
      'before:*:email',
      'before:set:email',
      'after:added:email',
      'after:*:email',
      'after:set:email',
    ]);
  });

  it('Should skip hooks specifying key with wildcards (save update)', async () => {
    jane.email = 'jane@foo.com';
    jane.address = {}; // delete address.city and address.zipCode
    await jane.save({
      skipDiff: [
        'after:*', // skip phase after
        'before:*:email', // Skip all hooks related to email at phase before
        'before:*:*.*', // skip phase before for nested properties
      ],
    });
    const hooks = _.map(jane.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([]);
  });

  it('Should skip hooks specifying RegExp (updateAttributes)', async () => {
    await jane.updateAttributes({email: 'jane@bar.net'}, {
      skipDiff: /^before.*$/,
    });
    const hooks = _.map(jane.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'after:updated:email',
      'after:*:email',
      'after:set:email',
    ]);
  });

  it('Should trigger hooks with wildcards and globstar in property', async () => {
    alia = new Company({
      name: 'alia',
      address: {street: 'Rúa Nova'},
    });
    await alia.save();
    const hooks = _.map(alia.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:*:name',
      'after:*:address.*',
      'after:*:address.**',
    ]);
  });

  it('Should not trigger twice a wildcard hook without multi=true', async () => {
    await alia.updateAttributes({
      socials: {
        facebook: 'facebook.com/aliatechs',
        linkedin: 'linkedin.com/company/alia-technologies',
      },
    });
    const hooks = _.map(alia.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:*:socials.*',
    ]);
  });

  it('Should trigger more than once when a wildcard hook when multi=true', async () => {
    await alia.updateAttributes({
      address: {
        street: 'Rúa Nova',
        city: 'Ourense',
        zipCode: '32004',
      },
    });
    const hooks = _.map(alia.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'after:*:address.*',
      'after:*:address.**',
      'after:*:address.*',
    ]);
  });

  it('Should trigger more than once when using /m', async () => {
    alia.address.timetable = {
      days: [0, 4],
      hours: ['10:00', '20:00'],
    };
    await alia.save();
    const hooks = _.map(alia.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'before:set:address.timetable.days.*',
      'before:set:address.timetable.days.*',
      'before:set:address.timetable.days',
      'after:*:address.**',
      'after:*:address.*',
    ]);
  });

  it('Should trigger hook for a specific array element position', async () => {
    alia.address.timetable.hours[1] = '19:00';
    await alia.save();
    const hooks = _.map(alia.getDiffLastExecutedHooks(), 'key');
    hooks.should.be.Array().which.eql([
      'after:updated:address.timetable.hours.1',
      'after:*:address.**',
      'after:*:address.*',
    ]);
  });

});
