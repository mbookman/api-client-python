api-client-python
=================

.. _Google Genomics Api: https://cloud.google.com/genomics

.. contents::

Introduction
------------

This Python client demonstrates a simple web-based genome browser that fetches data from the 
`Google Genomics API`_, the NCBI Genomics API or the Local Readstore through a web
interface, and displays a pileup of reads with support for zooming and basic navigation and search.

You can try out the sample genome browser, called GABrowse, now by going to https://gabrowse.appspot.com.

The code in this repository can be run with
with `Google App Engine <https://cloud.google.com/appengine/>`_
or locally on your own laptop or workstation under a
`development server <https://cloud.google.com/appengine/docs/python/tools/using-local-server>`_ before deploying to the internet.

It can also be run locally without App Engine
using the Python `paste <https://en.wikipedia.org/wiki/Python_Paste>`_
web application framework.

Set up a Google Cloud project
-----------------------------

If you will run this application under App Engine (local or remote)
or you will access data in Google Genomics, you must set up a Google
Cloud Platform project.

1. Follow instructions `here <https://support.google.com/cloud/answer/6251787>`_ to create a new project

2. Follow instructions `here <https://support.google.com/cloud/answer/6158841>`_ to enable the ``Genomics`` API 

3. Follow instructions `here <https://support.google.com/cloud/answer/6158840>`_ to find your Cloud "project ID"

You will need your project ID if you deploy to App Engine.

4. Follow instructions `here <https://cloud.google.com/sdk/docs/quickstarts>`_ to install and authorize the Cloud SDK

The web application uses `Application Default Credentials <https://developers.google.com/identity/protocols/application-default-credentials>`_ to authorize
requests to the Google Genomics API.

* When running the web application locally, it will use your Cloud SDK user credentials.
* When running on App Engine, it will use the Cloud Project's App Engine `Service Account <https://cloud.google.com/iam/docs/service-accounts>`_.

Running on App Engine
---------------------

`Google App Engine <https://cloud.google.com/appengine/docs/python/>`_
provides an application framework for internet-based web applications.

Running on the App Engine Development Server
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To run the application on the development server, you will:

1. Download the App Engine SDK
2. Install Google's OAuth client libraries
3. Launch the development server
4. Open the application URL in your browser

1. Download the App Engine SDK
''''''''''''''''''''''''''''''

Read about and follow the instructions for downloading and installing the 
`Google App Engine SDK for Python <https://cloud.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python>`_

2. Install Google's OAuth client libraries
''''''''''''''''''''''''''''''''''''''''''

The App Engine environment allows for pure python libraries to be used
at runtime. Documentation can be found
`here <https://cloud.google.com/appengine/docs/python/tools/using-libraries-python-27#adding_libraries>`_.

For this application execute the following in the root of your local copy:

.. code:: shell

  mkdir lib
  pip install -t lib --upgrade oauth2client

This will install the `oauth2client <https://oauth2client.readthedocs.io/en/latest/>`_ and all of its dependencies
(including `httplib2 <http://bitworking.org/projects/httplib2/doc/html/>`_).

3. Launch the development server
''''''''''''''''''''''''''''''''

On Mac OS X you can set up and run the application through the
GoogleAppEngineLauncher UI. 
To use the command line or to run on Linux:
<<<<<<< 441d13dd91d1f0bd1fc978d9a61fd4137a601208

.. code:: shell
=======
>>>>>>> README formatting fixes

.. code:: shell

  dev_appserver.py .
  
To run on Windows:
<<<<<<< 441d13dd91d1f0bd1fc978d9a61fd4137a601208

.. code:: shell
=======
>>>>>>> README formatting fixes

.. code:: shell

  python c:\path\to\dev_appserver.py .

4. Open the application URL in your browser
'''''''''''''''''''''''''''''''''''''''''''

Once running, visit http://localhost:8080 in your browser to browse
data from the API.

Running on the App Engine Production Server
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To deploy this application to App Engine, execute the following command:

.. code:: shell

  appcfg.py -A YOUR_PROJECT_ID -V v1 update .

Replace ``YOUR_PROJECT_ID`` with the project of your Google Cloud Project.

Once running, visit http://YOUR_PROJECT_ID.appspot.com in your browser
to browse data from the API.

Running with paste and webapp2
------------------------------

You can also run the server locally using
the Python `paste <https://en.wikipedia.org/wiki/Python_Paste>`_
web server framework.

It is highly recommended that you install Python libraries in a
`virtualenv <http://docs.python-guide.org/en/latest/dev/virtualenvs/>`_.
This allows you to contain your installation and dependent libraries
in one place.

The instructions here explicitly use a Python virtualenv and have only
been tested in this environment.

1. Install pip
^^^^^^^^^^^^^^
If you do not already have `pip <https://en.wikipedia.org/wiki/Pip_(package_manager)>`_
installed, you can find instructions 
`here <http://www.pip-installer.org/en/latest/installing.html>`_.

2. Install virtualenv
^^^^^^^^^^^^^^^^^^^^^
If you have not installed ``virtualenv``, then do so with:

.. code:: shell

  [sudo] pip install virtualenv

3. Create a virtualenv
^^^^^^^^^^^^^^^^^^^^^^

Create a virtualenv called ``localserver_libs``:

.. code:: shell

  virtualenv localserver_libs

4. Activate the virtualenv
^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code:: shell

  source localserver_libs/bin/activate

5. Install localserver.py dependent libraries
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Install the required dependencies:

.. code:: shell

  pip install WebOb Paste webapp2 jinja2
  pip install urllib3[secure] httplib2shim
  pip install --upgrade oauth2client

6. Run the localserver.py file
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code:: shell

  python localserver.py

Troubleshooting
---------------
  
* The ``google.appengine.tools.devappserver2.wsgi_server.BindError: Unable to bind`` message 
  means that one of the default App Engine ports is unavailable. The default ports are 8080 and 8000. 
  You can try different ports with these flags::

.. code:: shell

  python dev_appserver.py --port 12080 --admin_port=12000 .
  
Your server will then be available at ``localhost:12080``.

* Problem with a non-Chrome browser?

Please  `file an issue <https://github.com/googlegenomics/api-client-python/issues/new>`_.
jQuery and d3 get us a lot of browser portability for free -
but testing on all configurations is tricky, so just let us knowif there are issues!

Code layout
-----------

main.py:
  queries the Genomics API. It also serves up the HTML
  pages.

main.html:
  is the main HTML page. It provides the basic page layout, but most of the display logic is handled in
  JavaScript.

static/js/main.js:
  provides some JS utility functions, and calls into ``readgraph.js``.

static/js/readgraph.js:
  handles the visualization of reads. It contains the most complex code and uses
  `d3.js <http://d3js.org>`_ to display actual Read data.

The python client also depends on several external libraries:

`D3`_:
  is a javascript library used to make rich visualizations

`Underscore.js`_:
  is a javascript library that provides a variety of utilities

`Bootstrap`_:
  supplies a great set of default css, icons, and js helpers

In ``main.html``, `jQuery <http://jquery.com>`_ is also loaded from an external
site.

.. _httplib2: https://github.com/jcgregorio/httplib2
.. _D3: http://d3js.org
.. _Underscore.js: http://underscorejs.org
.. _Bootstrap: http://getbootstrap.com


Project status
--------------

Goals
^^^^^

* Provide an easily deployable demo that demonstrates what Genomics API interop
  can achieve for the community.
* Provide an example of how to use the Genomics APIs to build a
  non-trivial python application.

Current status
^^^^^^^^^^^^^^
This code *wants* to be in active development, but has few contributions coming
in at the moment.

Currently, it provides a basic genome browser that can consume genomic data
from any API provider. It deploys on App Engine (to meet the
'easily deployable' goal), and has a layman-friendly UI.

Awesome possible features include:

* Add more information to the read display (show inserts, highlight mismatches
  against the reference, etc)
* Possibly cleaning up the js code to be more plugin friendly - so that pieces
  could be shared and reused (d3 library? jquery plugin?)
* Staying up to date on API changes (readset searching now has pagination, etc)
* Better searching of Snpedia (or another provider - EBI?)
* Other enhancement ideas are very welcome
* (for smaller/additional tasks see the GitHub issues)
