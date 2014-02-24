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

import os
import json
import webapp2
import jinja2
from google.appengine.api.urlfetch_errors import DeadlineExceededError

from oauth2client import appengine
from google.appengine.api import users
from google.appengine.api import urlfetch


# Increase timeout to the maximum for all requests
urlfetch.set_default_fetch_deadline(60)

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    autoescape=True,
    extensions=['jinja2.ext.autoescape'])

client_secrets = os.path.join(os.path.dirname(__file__), 'client_secrets.json')

decorator = appengine.oauth2decorator_from_clientsecrets(
    client_secrets,
    scope=[
      'https://www.googleapis.com/auth/genomics',
      'https://www.googleapis.com/auth/devstorage.read_write'
    ])


class ApiException(Exception):
  pass


class BaseRequestHandler(webapp2.RequestHandler):
  def handle_exception(self, exception, debug_mode):
    if isinstance(exception, ApiException):
      # ApiExceptions are expected, and will return nice error
      # messages to the client
      self.response.write(exception.message)
      self.response.set_status(400)
    else:
      # All other exceptions are unexpected and should crash properly
      return webapp2.RequestHandler.handle_exception(
        self, exception, debug_mode)

  def get_content(self, path, method='POST', body=None):
    http = decorator.http()
    try:
      response, content = http.request(
        uri="https://www.googleapis.com/genomics/v1beta/%s" % path,
        method=method, body=json.dumps(body) if body else None,
        headers={'Content-Type': 'application/json; charset=UTF-8'})
    except DeadlineExceededError:
      raise ApiException('API fetch timed out')

    # TODO: Delete debug code
    print(response)
    print(content)

    if response.status == 404:
      raise ApiException('API not found')
    elif response.status == 400:
      raise ApiException('API request malformed')
    elif response.status != 200:
      raise ApiException('Something went wrong with the API call!')

    content = json.loads(content)
    if 'error' in content:
      raise ApiException(content['error']['message'])

    self.response.write(json.dumps(content))


class ReadsetSearchHandler(BaseRequestHandler):

  @decorator.oauth_aware
  def get(self):
    readset_id = self.request.get('readsetId')
    if not readset_id:
      body = {'datasetIds': ['383928317087']}
      self.get_content("readsets/search", body=body)
      return

    # Single readset response
    targets = [
      {'name': "chr1", 'sequenceLength': 249250621},
      {'name': "chr2", 'sequenceLength': 243199373},
      {'name': "chr3", 'sequenceLength': 198022430},
      {'name': "chr4", 'sequenceLength': 191154276},
      {'name': "chr5", 'sequenceLength': 180915260},
      {'name': "chr6", 'sequenceLength': 171115067},
      {'name': "chr7", 'sequenceLength': 159138663},
      {'name': "chr8", 'sequenceLength': 146364022},
      {'name': "chr9", 'sequenceLength': 141213431},
      {'name': "chr10", 'sequenceLength': 135534747},
      {'name': "chr11", 'sequenceLength': 135006516},
      {'name': "chr12", 'sequenceLength': 133851895},
      {'name': "chr13", 'sequenceLength': 115169878},
      {'name': "chr14", 'sequenceLength': 107349540},
      {'name': "chr15", 'sequenceLength': 102531392},
      {'name': "chr16", 'sequenceLength': 90354753},
      {'name': "chr17", 'sequenceLength': 81195210},
      {'name': "chr18", 'sequenceLength': 78077248},
      {'name': "chr19", 'sequenceLength': 59128983},
      {'name': "chr20", 'sequenceLength': 63025520},
      {'name': "chr21", 'sequenceLength': 48129895},
      {'name': "chr22", 'sequenceLength': 51304566},
      {'name': "chrX", 'sequenceLength': 155270560},
      {'name': "chrY", 'sequenceLength': 59373566},
    ]
    self.response.write("%s" % json.dumps(targets))
    # TODO: Use the actual readset method
    # self.get_content("readsets/%s" % readset_id, method='GET')


class ReadSearchHandler(BaseRequestHandler):

  @decorator.oauth_aware
  def get(self):
    readset_ids = [id for id in self.request.get('readsetIds').split(',')]

    body = {
      'readsetIds': readset_ids,
      'sequenceName': self.request.get('sequenceName'),
      'sequenceStart': max(0, int(self.request.get('sequenceStart'))),
      'sequenceEnd': int(self.request.get('sequenceEnd')),
      'pageToken': self.request.get('pageToken'),
     }
    self.get_content("reads/search", body=body)


class MainHandler(webapp2.RequestHandler):

  @decorator.oauth_aware
  def get(self):
    if decorator.has_credentials():
      template = JINJA_ENVIRONMENT.get_template('main.html')
      self.response.write(template.render({
        'username': users.User().nickname(),
        'logout_url': users.create_logout_url('/')
      }))
    else:
      template = JINJA_ENVIRONMENT.get_template('grantaccess.html')
      self.response.write(template.render({
        'url': decorator.authorize_url()
      }))

app = webapp2.WSGIApplication(
    [
     ('/', MainHandler),
     ('/api/reads', ReadSearchHandler),
     ('/api/readsets', ReadsetSearchHandler),
     (decorator.callback_path, decorator.callback_handler()),
    ],
    debug=True)
