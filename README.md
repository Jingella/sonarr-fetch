
Sonarr Fetch
============

The script will attempt to fetch episodes for existing series.

It was developed to test a number of modules;

* sonarr-api

	This module provides a trivial object supporting Sonarr API calls.  The implementation is extremely
	simple. You need to know whether to use 'get' or 'post', the path of the API endpoint, and any
	parameters.  Then you can call 'sonarr.get("/espisodes", { serialId: 1 })' 
	
	The advantage of the sonarr-api module over others is that it implements Promises.

* commander

	This module handles command line parsing.  This is used simply to abstract parameter passing.

* util.promisify

	This function in part of the system default 'util' library which converts a regular callback based
	function into one that returns a promise.

Installation
------------

This script requires NodeJS (and npm) at least release 8.

if you don't already have node and npm installed, I highly recommend using the
	[Node Version Manager](https://github.com/creationix/nvm) to install and manage node.

Simply clone this repository, then, from the root of the repository, run the node installer;
```
# npm install
```

This will install all the required node modules (refer to packages.json for details).

Operation
---------

Call the main entrypoint (./index.js), passing he name of the series to fetch.
The following command lines arguments are supported;

_-m maximum queued episdes_

The series name is used as a case-insensitive regex.  As such, you must escape any character which may 
be treated specially in a regular expression (such as parenthesis, brackets, astrisks, dots or question marks)

Example
-------

```
# ./index.js the.100
```

This will locate the TV Series 'The 100', identify if any episodes are missing, and fetch them.
It will not fetch episodes which are not monitored, it will not fetch episodes which are already queued
and it will not fetch episodes which it has attempted to fetch previously (All fetched episodes are recorded
in ```episodes.json```)

If there are already 'maximum queued episodes' in the download queue, no further episodes will be queued. 
The default maximum is 2 episodes.


Code Overview
-------------

All operations are performed in the following order;
* Parse the command line, extracting any parameters and command line options
* Open and read the 'episodes.json' file.
* Parse the 'episodes.json' data into a data object
    * Note the 'catch' to trap file errors and parsing errors
* Get all series details from Sonarr
* Filter the series data, locating the series provided on the command line
* Get the download queue from Sonarr
* Filter the download queue data, extracting only queued items for the current series
	* If the number of queued items for this series meets the maximum queued episodes cutoff,
	  throw an exception.
* Get the episode list from Sonarr for the series
* filter the episode list on various criteria;
	* Episode Air Date has passed
	* Season Number is not '0' (don't fetch specials)
	* Episode File is missing
	* Episode is monitored (or in a Monitored Season - even if the series itself is not monitored)
	* Episode does not already appear in the download queue
	* Episode does not already appear in the 'episodes.json' list
* Select one episode from those that meet all criterial
* Trigger an EpisodeSearch for that episode via the Sonarr API
* If the response from Sonarr is positive (request has been successfull queued) Add the episode ID to
  the episodes.json data, and save to disk
* Done.
