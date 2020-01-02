'use strict';

const debug = require('debug')('loopback:mixins:diff');
const _ = require('lodash');
const {buildCleaner} = require('lodash-clean');
const {detailedDiff} = require('deep-object-diff');
const Dot = require('dot-object');

function Diff (Model, initialSettings) {

  const WILDCARD = '*';
  const HOOK_REGEX_PATTERN = `^((before|after|\\${WILDCARD}):)?((added|updated|set|deleted|\\${WILDCARD}):)?([\\w.${WILDCARD}]+)(\\/\\w+)?$`;
  const HOOK_REGEX = new RegExp(HOOK_REGEX_PATTERN);
  const DEFAULT_PHASE = 'before';
  const OPTS_SKIP = 'skipDiff';
  const HOOK_STATE_DIFF = 'diff';
  const HOOK_STATE_PREV_INST = 'prevInstance';
  const HOOK_STATE_EXEC_HOOKS = 'diffHooksExecuted';
  const INST_EXEC_HOOKS = '__diffLastExecHooks';

  const dot = new Dot();
  dot.useBrackets = false;

  const clean = buildCleaner({isString: _.identity});

  const HookDefaults = {
    multi: false,
  };

  //============================================================================
  //  INIT
  //============================================================================

  Model.once('attached', () => {

    if (_.isString(initialSettings.config)) {
      // Get settings from a method
      const getConfig = Model[initialSettings.config];
      /* istanbul ignore if */
      if (!_.isFunction(getConfig)) {
        throw `Missing method '${Model.modelName}.${initialSettings.config}'`;
      }
      initialSettings = getConfig();
    }

    // Extend default settings
    const settings = _.merge({
      hooks: {},
    }, initialSettings);

    const opts = {hooks: {}, props: []};

    // Build hook options
    _.each(settings.hooks, (hookOpts, key) => {
      if (!_.isPlainObject(hookOpts)) {
        hookOpts = {handler: hookOpts};
      }
      hookOpts = _.merge({}, HookDefaults, hookOpts);
      // Detect hook parts
      const hook = str2parts(key, {
        phase: DEFAULT_PHASE,
      });
      const {phase, changeSet, prop} = hook;
      /* istanbul ignore if */
      if (!prop) {
        throw `Model ${Model.modelName} hook '${hook.src}' has invalid format`;
      }
      // Register model property
      opts.props.push(prop);
      opts.props = _.uniq(opts.props);
      // Index hooks
      if (!opts.hooks[phase]) {
        opts.hooks[phase] = {};
      }
      if (!opts.hooks[phase][changeSet]) {
        opts.hooks[phase][changeSet] = {};
      }
      /* istanbul ignore else */
      if (!opts.hooks[phase][changeSet][prop]) {
        opts.hooks[phase][changeSet][prop] = {
          regex: token2regex(prop),
          hooks: [],
        };
      }
      opts.hooks[phase][changeSet][prop].hooks.push(hook);
      hook.handler = hookOpts.handler;
      hook.opts = _.merge(hookOpts, hook.opts);
    });

    //============================================================================
    //  HOOKS
    //============================================================================

    Model.observe('before save', async (ctx) => {
      _.set(ctx, `hookState.${HOOK_STATE_EXEC_HOOKS}`, []);
      let inst = ctx.currentInstance || ctx.instance;
      /* istanbul ignore else */
      if (inst) {
        let prevData = inst.toJSON();
        let newData;
        if (ctx.data) {
          // Instance is being updated and got patch data (updateAttributes)
          // Merge new data with previous to properly diff
          newData = _.assign({}, prevData, ctx.data);
        } else {
          newData = prevData;
          if (ctx.isNewInstance) {
            // Instance is being created: there is not previous data
            prevData = {};
          } else {
            // Instance is the being updated and didn't got patch data
            // Instance is actually the mutated instance ready to save
            // Need to fetch the previous data from database to diff
            inst = await Model.findById(inst.getId());
            prevData = inst.toJSON();
          }
        }
        prevData = cleanDataObject(prevData);
        newData = cleanDataObject(newData);
        const diff = calculateDiff(prevData, newData);
        // Remember instance before applying changes
        _.set(ctx, `hookState.${HOOK_STATE_PREV_INST}`, inst);
        // Remember diff
        _.set(ctx, `hookState.${HOOK_STATE_DIFF}`, diff);
        // Execute hooks
        await inst.executeDiffHooks('before', diff, ctx);
      }
    });

    Model.observe('after save', async (ctx) => {
      const inst = ctx.currentInstance || ctx.instance;
      const diff = _.get(ctx, `hookState.${HOOK_STATE_DIFF}`);
      /* istanbul ignore else */
      if (inst && diff) {
        // Execute hooks
        await inst.executeDiffHooks('after', diff, ctx);
      }
    });

    //============================================================================
    //  INSTANCE METHODS
    //============================================================================

    /**
     * Execute hooks for a diff object and a specific hook phase
     * @param {string} phase Hook phase ('before'|'after')
     * @param {object} diff Diff object
     * @param {object} ctx Loopback hook context
     * @return {Promise<void>}
     */
    Model.prototype.executeDiffHooks = async function (phase, diff, ctx) {
      const executedHooks = _.get(ctx, `hookState.${HOOK_STATE_EXEC_HOOKS}`, []);
      const skipOpts = _.get(ctx, `options.${OPTS_SKIP}`);
      if (skipOpts !== true) {
        const shouldSkipHook = getShouldSkipHookTester(skipOpts);
        // Iterate through changeSets
        for (let [changeSet, props] of Object.entries(diff)) {
          // Iterate through properties
          for (let [prop, value] of Object.entries(props)) {
            const hooks = this.getDiffHooks(prop, changeSet, phase);
            // Execute all hooks in series
            for (let hook of hooks) {
              const {key, handler, opts: hookOpts} = hook;
              // Check if it has been executed before or allows multi
              if (!hookOpts.multi && _.some(executedHooks, {key})) {
                debug(`Model ${Model.modelName} skipped hook '${key}' because it has been already executed`);
                continue;
              }
              // Check if hook should be skipped
              if (shouldSkipHook(hook, skipOpts)) {
                debug(`Model ${Model.modelName} programmatically skipped hook '${key}'`);
                continue;
              }
              // Fetch handler to be executed
              let f = this[handler];
              /* istanbul ignore else */
              if (_.isFunction(f)) {
                const prevInst = _.get(ctx, `hookState.${HOOK_STATE_PREV_INST}`);
                const hookResult = await f.apply(this, [value, prop, prevInst, ctx]);
                executedHooks.push({key, hook, result: hookResult});
                debug(`Model ${Model.modelName} executed method '${handler}' for hook '${key}'`);
              } else {
                debug(`Hook '${handler}' not found for model ${Model.modelName}`);
              }
            }
          }
        }
      }
      // Update executed hooks into the hookState and the instance
      _.set(ctx, `hookState.${HOOK_STATE_EXEC_HOOKS}`, executedHooks);
      _.set(this, INST_EXEC_HOOKS, executedHooks);
    };

    /**
     * Get hooks filtered by property, changeSet and phase
     * @param {string} prop Dot notation
     * @param {string} changeSet
     * @param {string} phase
     * @param {boolean} [recursive]
     *  Whether to deep search hooks for nested properties when changeSet is deleted
     * @return {[object]} List of hooks
     */
    Model.prototype.getDiffHooks = function (prop, changeSet, phase, recursive = true) {
      let hooks = [];
      let phases = opts.hooks;
      // Filter by phase
      /* istanbul ignore next */
      phases = phase ? _.pick(phases, phase) : _.values(phases);
      _.each(phases, (changeSets) => {
        // Filter by changeSet
        /* istanbul ignore next */
        let selectedChangeSets = changeSet ? changeSets[changeSet] : _.values(changeSets);
        /* istanbul ignore else */
        if (changeSet !== WILDCARD) {
          // Include hooks from the wildcard changeSet
          selectedChangeSets = _.concat(selectedChangeSets, changeSets[WILDCARD]);
          // If changeSet is 'added' or 'updated', also include 'set'
          if (_.includes(['added', 'updated'], changeSet)) {
            selectedChangeSets = _.concat(selectedChangeSets, changeSets['set']);
          }
        }
        selectedChangeSets = _.compact(selectedChangeSets);
        // Filter props that match the required prop
        _.each(selectedChangeSets, (props) => {
          _.each(props, (propDef) => {
            if (propDef.regex.test(prop)) {
              hooks = _.concat(hooks, propDef.hooks);
            }
          });
        });
      }, []);
      // If changeSet is 'deleted', also include nested properties
      if (!!recursive && changeSet === 'deleted') {
        _.filter(opts.props, (otherProp) => {
          if (_.startsWith(otherProp, `${prop}.`)) {
            hooks = _.concat(hooks, this.getDiffHooks(otherProp, changeSet, phase, false));
          }
        });
      }
      return hooks
    };

    /**
     * Get the list of hooks that were executed in the last save operation
     * @return {[{key: string, handler: string}]}
     */
    Model.prototype.getDiffLastExecutedHooks = function () {
      return _.get(this, INST_EXEC_HOOKS, []);
    };

  });

//============================================================================
//  PRIVATE METHODS
//============================================================================

  /**
   * Calculate diff between two model instances serialized to JSON
   * @param {object} a Old object
   * @param {object} b New object
   */
  function calculateDiff (a, b) {
    const diffObj = detailedDiff(a, b);
    return _.transform(diffObj, (result, subDiffObj, changeSet) => {
      // Convert object to dotted-key/value pair
      _.merge(result[changeSet], dot.dot(subDiffObj));
      const changeSetResult = result[changeSet];
      // Include separately each parent in nested path
      if (_.includes(['added', 'updated'], changeSet)) {
        for (let [path] of Object.entries(changeSetResult)) {
          const tokens = path.split('.');
          while (tokens.pop() && tokens.length) {
            const parentPath = tokens.join('.');
            const parentChangeSet = changeSet === 'added' && !_.has(a, parentPath) ? 'added' : 'updated';
            result[parentChangeSet][parentPath] = _.get(subDiffObj, parentPath);
          }
        }
      }
    }, {
      added: {},
      updated: {},
      deleted: {},
    });
  }

  /**
   * Clean data object to be suitable to diff
   * @param {object} data
   * @return {object}
   */
  function cleanDataObject (data) {
    return clean(_.omit(data, Model.getIdName())) || {};
  }

  /**
   * Given skip options, generate a tester function to check whether a hook should be skipped
   * @param {string|[string]} skipOpts Skip options
   * @return {function}
   */
  function getShouldSkipHookTester (skipOpts) {
    const testers = [];
    skipOpts = _.castArray(skipOpts);
    for (let skip of skipOpts) {
      if (skip) {
        const regex = str2regex(skip);
        testers.push((hook) => {
          return regex.test(hook.key);
        });
      }
    }
    return (hook) => {
      return _.some(testers, (tester) => tester(hook));
    };
  }

  /**
   * Split a hook key into hook parts
   * @param {string} str
   * @param {object} [defaults]
   * @return {{phase: string, src: string, prop: string, changeSet: string}}
   */
  function str2parts (str, defaults = {}) {
    defaults = _.merge({
      phase: WILDCARD,
      changeSet: WILDCARD,
    }, defaults);
    /* istanbul ignore next */
    let [, , phase, , changeSet, prop, mods] = HOOK_REGEX.exec(str) || [];
    phase = _.toLower(phase || defaults.phase);
    changeSet = _.toLower(changeSet || defaults.changeSet);
    let hookOpts;
    if (mods) {
      hookOpts = mods2opts(mods);
    }
    const hook = {
      src: str,
      phase,
      changeSet,
      prop,
      opts: hookOpts,
    };
    hook.key = hook2key(hook);
    return hook;
  }

  /**
   * Transform a hook key into a RegExp
   * @param {string|RegExp} str
   * @return {RegExp}
   */
  function str2regex (str) {
    let regex = str;
    if (_.isString(regex)) {
      const {key} = str2parts(str);
      return token2regex(key);
    }
    return regex;
  }

  /**
   * Transform a key part into a RegExp
   * @param {string} str
   * @return {RegExp}
   */
  function token2regex (str) {
    let pattern = '', wcs = 0;
    const chars = str.split('');
    for (let i = 0; i <= chars.length; i++) {
      const c = chars[i];
      let sub = '';
      if (c !== WILDCARD) {
        // Process pending wildcards
        if (wcs === 1) {
          // Simple wildcard
          sub = `(\\w*|\\${WILDCARD})`;
        } else if (wcs > 1) {
          // Globstar
          sub = `([\\w.]*|\\${WILDCARD})`;
        }
        wcs = 0;
      }
      switch (c) {
        case '.':
          sub += '\\.';
          break;
        case WILDCARD:
          wcs++;
          break;
        default:
          if (c) {
            sub += c;
          }
      }
      pattern += sub;
    }
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Build a full qualified hook key from hook parts
   * @param {string} hook
   * @return {string} Full qualified hook key
   */
  function hook2key (hook) {
    return `${hook.phase}:${hook.changeSet}:${hook.prop}`;
  }

  /**
   * Transform mods string into hook options
   * @param {string} modsStr
   * @return {object}
   */
  function mods2opts (modsStr) {
    const mods = modsStr.split('');
    const options = {};
    for (let mod of mods) {
      let optName, value;
      switch (mod) {
        case 'm':
          optName = 'multi';
          value = true;
          break;
        // Add more mods below
      }
      if (optName) {
        options[optName] = value;
      }
    }
    return options;
  }

}

module.exports = Diff;
