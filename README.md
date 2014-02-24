client-python
==============

###Getting started

This python client provides a simple app engine application which fetches data from the
<a href="https://developers.google.com/genomics">Google Genomics API</a> through a web interface.

To run this code, you'll need to
<a href="https://developers.google.com/appengine/docs/python/gettingstartedpython27/introduction">set up a
Google App Engine environment</a>.

You will also need to follow the <a href="https://developers.google.com/genomics/v1beta/quickstart">quickstart instructions</a>
to generate a valid client_secrets.json file. However, for this application you want to generate secrets
for a "Web application" rather than a "Native Application".

Replace the client_secrets.json file in this directory with your new secrets file.

Then, run this app engine app locally and visit http://localhost:8080 to browse data from the API.


###Code layout

* **main.py** queries the Genomics API and handles all OAuth flows. It also serves up the html pages.

* **main.html** is the main html page. It is displayed once the user has granted OAuth access to the Genomics API
  and uses <a href="d3js.org">d3.js</a> to visualize Read data. Most of the logic is handled in javascript.

* **static/js/main.js** provides some js utility functions, and calls into readgraph.js

* **static/js/readgraph.js** handles the visualization of reads. It contains the most complex code.


The python client also depends on several external libraries:

* <a href="https://code.google.com/p/google-api-python-client/wiki/OAuth2Client">oauth2client</a> provides a python decorator which handles the entire oauth user flow

* <a href="https://github.com/jcgregorio/httplib2">httplib2</a> is required by the oauth library

* <a href="d3js.org">static/js/d3.v3.min.js</a> is a javascript library used to make rich visualizations

* <a href="underscorejs.org">static/js/underscore-min.js</a> is a javascript library that provides a variety of utilities

* In main.html, both <a href="http://getbootstrap.com">Bootstrap</a> and <a href="http://jquery.com/">jQuery</a>
  are also loaded from external sites.
