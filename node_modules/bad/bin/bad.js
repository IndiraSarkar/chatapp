#!/usr/bin/env node

'use strict';

//dependencies
var async = require('async');
var program = require('commander');

var batch;

//helpers
var helpers = require('../lib/helpers');
var absPathOf = helpers.absPathOf;
var by = helpers.by;
var commandInPath = helpers.commandInPath;
var createExecTask = helpers.createExecTask;
var createExecTaskContexts = helpers.createExecTaskContexts;
var fileExistsSync = helpers.fileExistsSync;
var hr = helpers.hr;
var merge = helpers.merge;
var splitSpaceDelimted = helpers.splitSpaceDelimted;
var to = helpers.to;

//defaults
var argv = [];
var execArg = null;
var isDebug = false;

//exit codes
var MISSING_OPTION=1;
var ERROR_WHILE_EXECUTING=2;
var TASK_EXITED_ABNORMALLY=3;
var EXEC_NOT_FOUND=4;

//misc
var startTime = Date.now();
var tasks = [];

program
  .version(require('../package.json').version)
  .description(
    'bad is a command line tool that allows you to execute a command multiple '
    +'times concurrently for a given number of subjects.'
  )
  .usage('--exec curl --for "google.com linkedin.com" --argv "-s"')
  .option('--debug', 'print information for debugging')
  .option('--concurrency <amount>', 'the number of concurrent processes to spawn', Number)
  .option('-s, --silent', 'show as little as possible.')
  .option('--exec <command>', 'the command to run.  This is passed directly to spawn.')
  .option('--for <subjects>'
    , 'a comma separated list of subject sets.'
    + '  Each subject set is a whitespace separated list of subjects.'
    + '  Subjects are appended to argv except when --to-env is given.'
  )
  .option('--argv [args]'
    , 'a whitespace separated list of arguments to pass to the command.'
    , splitSpaceDelimted
  )
  .option('--to-env <varnames>'
    , 'a comma separated list of varname sets.'
    + '  Each varname set is a whitespace separated list of varnames.'
    + '  Varnames are mapped to the corresponding subject.')
  .option('--show-time', 'display time stats.');

program.parse(process.argv);

//Handle Options
if(!program.exec || !program.for){
  if(!program.exec)console.error('--exec is required!');
  if(!program.for)console.error('--for is required!');

  program.help();
  process.exit(MISSING_OPTION);
}

if(program.argv){
  argv = program.argv;
}

if(!fileExistsSync(program.exec) && !commandInPath(program.exec)){
  console.error('The --exec arg must refer to a command in your PATH or a file.');
  process.exit(EXEC_NOT_FOUND);
}

if(fileExistsSync(program.exec))execArg = absPathOf(program.exec);
else execArg = program.exec;

if (!program.concurrency) {
  program.concurrency = 1;
}

isDebug = !!program.debug;

if(isDebug){
  console.log([
    hr('debug'),
    'Debug info: ',
    '--silent: '+program.silent,
    '--to-env: '+program.toEnv,
    '--argv: '+program.argv,
    '--exec: '+program.exec,
    '--concurrency: '+program.concurrency,
    '--for: '+program.for
  ].join('\n'));
}


var results = [];
var queue = async.queue(function(task, cb) {
  task(function(err, result) {
    results.push(result);
    cb();
  });
}, program.concurrency);

queue.drain = function() {
  var hasStdout = !!results.filter(by('stdout')).length;
  var hasStderr = !!results.filter(by('stderr')).length;

  var stdout = '';

  if(program.showTime){
    stdout += results.reduce(function(output, result){
        return output + [
          'For ' + result.subject + ':',
          '  '+result.time+'ms'
        ].join('\n') + '\n';
      }, hr('time stats') + '\n') +
      'Total Time:\n  ' + (Date.now()-startTime) + 'ms' + '\n';
  }

  if(hasStdout && (program.debug || !program.silent)){
    stdout += results.filter(by('stdout')).reduce(function(output, result){
      return output + [
        'For ' + result.subject + ':',
        result.stdout
      ].join('\n') + '\n';
    }, hr('stdout') + '\n');
  }

  var stderr = '';

  if(hasStderr && (program.debug || !program.silent)){
    stderr += results.filter(by('stderr')).reduce(function(output, result){
        return output + [
          'For '+result.subject+':',
          result.stderr
        ].join('\n') + '\n';
      }, hr('stderr') + '\n');
  }

  var erroredResults = results.filter(by('err'));

  if(erroredResults.length){
    stderr += erroredResults.reduce(function(output, result){
      return output + '\n' + result.subject;
    }, 'The following command[s] exited abnormally:');
  }

  async.series([
    function printStdout(cb) {
      if (stdout) {
        console.log(stdout);
        return setTimeout(cb, 100);
      }
      cb();
    },
    function printStderr(cb) {
      if (stderr) {
        console.error(stderr);
        return setTimeout(cb, 100);
      }
      cb();
    }
  ], function() {
    if (erroredResults.length) {
      process.exit(ERROR_WHILE_EXECUTING);
    }
  });
};

createExecTaskContexts(program).forEach(function(context){
  queue.push(createExecTask.bind(null, execArg, program.argv, context));
});
