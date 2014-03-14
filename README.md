client-python
==============

###Getting started
This python client provides a simple web application which fetches data from the
<a href="https://developers.google.com/genomics">Google Genomics API</a>,
the NCBI Genomics API or the Local Readstore through a web interface.

It can be run with app engine or without.

####Running on App Engine
To run with app engine, you'll need to
<a href="https://developers.google.com/appengine/docs/python/gettingstartedpython27/introduction">set up a
Google App Engine environment</a>.

Then, set `USE_APPENGINE=True` in the top of main.py.

Run the app engine app locally and visit http://localhost:8080 to browse data from the API.

####Running with paste and webapp2

First you'll need to <a href="http://www.pip-installer.org/en/latest/installing.html">install pip</a>.

Then install the required dependencies and run the localserver.py file:
```
pip install WebOb
pip install Paste
pip install webapp2
pip install jinja2
python localserver.py
```

####Enabling the Google API
If you want to pull in data from Google's Genomics API you will need to set `REQUIRE_OAUTH = True` in main.py.
You will also need to follow the <a href="https://developers.google.com/genomics#authenticate">authentication instructions</a>
to generate a valid client_secrets.json file. However, for this application you want to generate secrets
for a "Web application" rather than a "Native Application".

Replace the client_secrets.json file in this directory with your new secrets file.


###Code layout

* **main.py** queries the Genomics API and handles all OAuth flows. It also serves up the html pages.

* **main.html** is the main html page. It is displayed once the user has granted OAuth access to the Genomics API.
  It provides the basic page layout, but most of the display logic is handled in javascript.

* **static/js/main.js** provides some js utility functions, and calls into readgraph.js

* **static/js/readgraph.js** handles the visualization of reads. It contains the most complex code and uses <a href="http://d3js.org">d3.js</a> to display actual Read data.


The python client also depends on several external libraries:

* <a href="https://code.google.com/p/google-api-python-client/wiki/OAuth2Client">oauth2client</a> provides a python decorator which handles the entire oauth user flow

* <a href="https://github.com/jcgregorio/httplib2">httplib2</a> is required by the oauth library

* <a href="http://d3js.org">D3</a> is a javascript library used to make rich visualizations

* <a href="http://underscorejs.org">Underscore.js</a> is a javascript library that provides a variety of utilities

* <a href="http://getbootstrap.com">Bootstrap</a> supplies a great set of default css, icons, and js helpers

* In main.html, <a href="http://jquery.com/">jQuery</a> is also loaded from an external site.
