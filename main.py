"""
Copyright 2014 Google Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

This file serves two main purposes
- it serves up the main html page
- and it provides a simple set of apis to the javascript
"""

# If this is set to true, the client_secrets.json must be valid and users will
# be required to grant OAuth access to this app before continuing.
# This enables the Google API to work
REQUIRE_OAUTH = False

# If this is set to true, then this file will assume that app engine is
# being used to run the server.
USE_APPENGINE = False

import httplib2
import jinja2
import json
import logging
import os
import socket
import webapp2


if USE_APPENGINE:
  from oauth2client import appengine
  from google.appengine.api import users
  from google.appengine.api import memcache

socket.setdefaulttimeout(60)
http = httplib2.Http(cache=memcache if USE_APPENGINE else None)

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    autoescape=True,
    extensions=['jinja2.ext.autoescape'])

client_secrets = os.path.join(os.path.dirname(__file__), 'client_secrets.json')

if USE_APPENGINE and REQUIRE_OAUTH:
  decorator = appengine.oauth2decorator_from_clientsecrets(
      client_secrets,
      scope=[
        'https://www.googleapis.com/auth/genomics',
        'https://www.googleapis.com/auth/devstorage.read_write'
      ])
else:
  class FakeOauthDecorator():
    def http(self):
      return http
    def oauth_aware(self, method):
      return method
    @property
    def callback_path(self):
      return '/unused'
    def callback_handler(self):
      pass
  decorator = FakeOauthDecorator()

SUPPORTED_BACKENDS = {
  'NCBI' : {'name' : 'NCBI', 'url': 'http://trace.ncbi.nlm.nih.gov/Traces/gg'},
  'LOCAL' : {'name' : 'Local', 'url': 'http://localhost:5000'},
}
if REQUIRE_OAUTH:
  # Google temporarily requires OAuth on all calls
  SUPPORTED_BACKENDS['GOOGLE'] = {'name' : 'Google', 'url': 'https://www.googleapis.com/genomics/v1beta'}


class ApiException(Exception):
  pass


# Request handlers
class BaseRequestHandler(webapp2.RequestHandler):
  def handle_exception(self, exception, debug_mode):
    if isinstance(exception, ApiException):
      # ApiExceptions are expected, and will return nice error
      # messages to the client
      self.response.write(exception.message)
      self.response.set_status(400)
    else:
      # All other exceptions are unexpected and should be logged
      logging.exception('Unexpected exception')
      self.response.write('Unexpected internal exception')
      self.response.set_status(500)

  def get_backend(self):
    backend = self.request.get('backend')
    if not backend:
      raise ApiException('Backend parameter must be set')
    return backend

  def get_base_api_url(self):
    return SUPPORTED_BACKENDS[self.get_backend()]['url']

  def get_content(self, path, method='POST', body=None):
    http = decorator.http()
    response, content = http.request(
      uri="%s/%s" % (self.get_base_api_url(), path),
      method=method, body=json.dumps(body) if body else None,
      headers={'Content-Type': 'application/json; charset=UTF-8'})

    try:
      content = json.loads(content)
    except ValueError:
      logging.error("non-json api content %s" % content)
      raise ApiException('The API returned invalid JSON')

    if response.status >= 300:
      logging.error("error api response %s" % response)
      logging.error("error api content %s" % content)
      if 'error' in content:
        raise ApiException(content['error']['message'])
      else:
        raise ApiException('Something went wrong with the API call!')

    self.response.write(json.dumps(content))


class ReadsetSearchHandler(BaseRequestHandler):

  @decorator.oauth_aware
  def get(self):
    readset_id = self.request.get('readsetId')
    backend = self.get_backend()
    if not readset_id:
      # Temporary requirements to satisfy each backend
      if backend == 'GOOGLE':
        body = {'datasetIds': ['383928317087']}
      elif backend == 'NCBI':
        body = {'datasetIds': ['SRP034507']}
      else:
        body = {'datasetIds' : []}
      self.get_content("readsets/search?fields=readsets(id,name)", body=body)
      return

    # Single readset response
    self.get_content("readsets/%s" % readset_id, method='GET')


class ReadSearchHandler(BaseRequestHandler):

  @decorator.oauth_aware
  def get(self):
    body = {
      'readsetIds': self.request.get('readsetIds').split(','),
      'sequenceName': self.request.get('sequenceName'),
      'sequenceStart': max(0, int(self.request.get('sequenceStart'))),
      'sequenceEnd': int(self.request.get('sequenceEnd')),
    }
    pageToken = self.request.get('pageToken')
    if pageToken:
      body['pageToken'] = pageToken
    self.get_content("reads/search", body=body)


class SnpSearchHandler(webapp2.RequestHandler):
  def get(self):
    snp = self.request.get('snp')
    response, content = http.request(
        uri="https://opensnp.org/snps/json/annotation/%s.json" % (snp))

    try:
      content = json.loads(content)['snp']
      position = content['position']
      chromosome = content['chromosome']
    except (ValueError, KeyError):
      position = -1
      chromosome = ""
    self.response.write(json.dumps({'position': position, 'chr': chromosome}))

class MainHandler(webapp2.RequestHandler):

  @decorator.oauth_aware
  def get(self):
    if not REQUIRE_OAUTH or decorator.has_credentials():
      template = JINJA_ENVIRONMENT.get_template('main.html')
      self.response.write(template.render({
        'username': users.User().nickname() if USE_APPENGINE else '',
        'logout_url': users.create_logout_url('/') if USE_APPENGINE else '',
        'backends': SUPPORTED_BACKENDS,
      }))
    else:
      # TODO: What kind of access do the non-google backends need?
      template = JINJA_ENVIRONMENT.get_template('grantaccess.html')
      self.response.write(template.render({
        'url': decorator.authorize_url()
      }))

web_app = webapp2.WSGIApplication(
    [
     ('/', MainHandler),
     ('/api/reads', ReadSearchHandler),
     ('/api/readsets', ReadsetSearchHandler),
     ('/api/snps', SnpSearchHandler),
     (decorator.callback_path, decorator.callback_handler()),
    ],
    debug=True)
