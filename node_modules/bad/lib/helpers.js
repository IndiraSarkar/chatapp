'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var once = require('once');
var path = require('path');
var which = require('which');

module.exports = {
  absPathOf : absPathOf,
  by : by,
  commandInPath : commandInPath,
  createExecTask : createExecTask,
  createExecTaskContexts : createExecTaskContexts,
  fileExistsSync  : fileExistsSync,
  hr : hr,
  merge : merge,
  splitSpaceDelimted : splitSpaceDelimted,
  to : to
};


function absPathOf(file){
  return path.resolve(process.cwd(), file);
}

function by(prop){
  return function(result){
    return !!result[prop];
  };
}

function commandInPath(cmd){
  try {
    which.sync(cmd);
    return true;
  } catch(e) {
    return false;
  }
}

function createExecTask(execArg, argv, context, cb){
  var args = [execArg.replace(/(?![\\]) /g, '\\ ')].concat(argv);
  var env = process.env;
  var start = Date.now();

  if(context.toEnv){
    env = {};
    env[context.toEnv] = context.subject;
    env = merge(process.env, env);
  } else {
    args.push(context.subject);
  }

  exec(args.join(' '), {env: env}, function(err, stdout, stderr){
    cb(err, {
      subject: context.subject,
      err: err,
      stdout: stdout,
      stderr: stderr,
      time: Date.now() - start
    });
  });
}

function createExecTaskContexts(program){
  var contexts = [];
  var subjectSets = getDelimitedSet(program.for);
  var envSets = getDelimitedSet(program.toEnv);
  var lastEnvSet;

  subjectSets.forEach(function(set, index){
    var envSet = envSets[index];
    var difference;

    if(envSet){
      lastEnvSet = envSet;
    } else {
      envSet = lastEnvSet;
    }

    if(envSet){
      if(envSet.length > set.length){
        envSet.splice(set.length, Math.min(0, envSet.length - set.length));
      } else if(envSet.length < set.length){
        difference = set.length - envSet.length;
        while(difference--){
          envSet[envSet.length] = envSet[envSet.length - 1];
        }
      }
    }

    set.forEach(function(subject, index){
      if(subject){
        contexts.push({
          subject : subject,
          toEnv : envSet && envSet[index] ? envSet[index] : null
        });
      }
    });
  });

  return contexts;
}

function fileExistsSync(file){
  file = absPathOf(file);
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function getDelimitedSet(str){
  if(typeof str === 'string')return str
    .split(',')
    .map(toTrimmed)
    .map(splitSpaceDelimted);
  return [];
}

function hr(title){
  title = (title || '').toUpperCase();
  var rule = '=======================================';
  var startOfTitle = ~~(rule.length/2 - title.length/2);
  return rule.substring(0, startOfTitle)
    + title
    + rule.substring(title.length + startOfTitle);
}

function merge(old, additional){
  var prop;
  var proposed = {};

  for(prop in old){
    proposed[prop] = old[prop];
  }

  for(prop in additional){
    proposed[prop] = additional[prop];
  }
  return proposed;
}

function splitSpaceDelimted(str){
  return str.replace(/\s+/g, ' ').split(' ');
}

function to(prop){
  return function(result){
    return result[prop];
  };
}

function toTrimmed(val){
  return typeof val === 'string' ? val.trim() : '';
}
