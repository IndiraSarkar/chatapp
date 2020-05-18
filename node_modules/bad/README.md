bad
======================
[![Build Status](https://travis-ci.org/jsdevel/node-bad.png)](https://travis-ci.org/jsdevel/node-bad)

`bad` is a command line tool that allows you to execute a command multiple times
concurrently for a given number of subjects.

It is general enough for just about anything that requires parallel execution,
and it's *bad* enough to accomplish it with ease!

##Why the name?
I couldn't think of anything better so I entered "batch command" at:
http://www.portmanteaur.com/?words=batch+command+node

`bad` stood out :)

##Usage
````
Usage: bad --exec curl --for "google.com linkedin.com" --argv "-s"

Options:

  -h, --help           output usage information
  -V, --version        output the version number
  --debug              print information for debugging
  -s, --silent         show as little as possible.
  --exec <command>     the command to run.  This is passed directly to spawn.
  --for <subjects>     a comma separated list of subject sets.
                       Each subject set is a whitespace separated list of subjects.
                       Subjects are appended to argv except when --to-env is given.
  --argv [args]        a whitespace separated list of arguments to pass to the command.
  --to-env <varnames>  a comma separated list of varname sets.
                       Each varname set is a whitespace separated list of varnames.
                       Varnames are mapped to the corresponding subject.
  --show-time          display time stats.

````

##Example
This would silently curl the given urls concurrently:
````
bad --exec curl --argv '-s' --for "google.com linkedin.com npmjs.org"
````

##Advanced mapping
You can map subjects to an environment variable using the `--to-env` flag.

Consider this example:
````
bad --exec echo --for '1 2, 3 4 5, 6' --to-env 'FOO DOO, XOO, ZOO'

....

#FOO set to 1
#DOO set to 2
#XOO set to 3
#XOO set to 4
#XOO set to 5
#ZOO set to 6
````
