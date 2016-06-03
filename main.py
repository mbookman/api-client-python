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

# Google Genomics: 0.5.1
# https://github.com/ga4gh/schemas/blob/v0.5.1/src/main/resources/avro/

# Ensembl: 0.6.0
# https://github.com/ga4gh/schemas/blob/v0.6.0a1/src/main/resources/avro/

import json
import logging
import os
import re
import socket
import time

import jinja2
import webapp2

from references import GRCh38

# Need to jump through a few small module import hoops to allow for running in
# multiple environments:
#   * App Engine (local development server)
#   * App Engine (production server)
#   * Standalone (Python paste server)

# Set a few constants for the runtime environment
IS_APP_ENGINE_DEVELOPMENT = \
  os.getenv('SERVER_SOFTWARE', '').startswith('Development/')
IS_APP_ENGINE_SERVER = \
  os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/')
IS_APP_ENGINE = IS_APP_ENGINE_DEVELOPMENT or IS_APP_ENGINE_SERVER

if IS_APP_ENGINE:
  from google.appengine.ext import vendor

  # Add any libraries installed in the "lib" folder.
  vendor.add('lib')

# Imports http2 after libary path is set up
try:
  # For the local server - use the thread-safe httplib2shim
  import httplib2shim as httplib2
except:
  import httplib2

# Set constants for which GA4GH backends to include
INCLUDE_BACKEND_ENSEMBL = True
INCLUDE_BACKEND_GOOGLE = True

if INCLUDE_BACKEND_GOOGLE:
  from oauth2client.client import GoogleCredentials


socket.setdefaulttimeout(60)

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    autoescape=True,
    extensions=['jinja2.ext.autoescape'])


# Supported data types
SET_TYPE_CALLSET = 'CALLSET'
SET_TYPE_READSET = 'READSET'

# But that call is not in the GA4GH API yet
SUPPORTED_BACKENDS = {}

if INCLUDE_BACKEND_ENSEMBL:
  SUPPORTED_BACKENDS['Ensembl'] = {
      'name': 'Ensembl',
      'ga4gh_api_version': '0.6.0',
      'http': httplib2.Http(timeout=60),
      'url': 'http://rest.ensembl.org/ga4gh/%s?%s',
      'datasets': {'1000 Genomes phase3': '6e340c4d1e333c7a676b1710d2e3953c'},
      'set_types' : [ SET_TYPE_CALLSET ],
  }

if INCLUDE_BACKEND_GOOGLE:

  def init_google_http():
    # For requests to Google Genomics, pick up the default credentials from
    # the environment (see https://developers.google.com/identity/protocols/application-default-credentials).

    credentials = GoogleCredentials.get_application_default()
    credentials = credentials.create_scoped(
        'https://www.googleapis.com/auth/genomics')

    http = httplib2.Http()
    http = credentials.authorize(http)

    return http

  SUPPORTED_BACKENDS['GOOGLE'] = {
      'name': 'Google',
      'ga4gh_api_version': '0.5.1',
      'http': init_google_http(),
      'url': 'https://genomics.googleapis.com/v1/%s?%s',
      'supportsPartialResponse': True,
      'datasets': {'1000 Genomes': '10473108253681171589',
                   'Platinum Genomes': '3049512673186936334',
                   'DREAM SMC Challenge': '337315832689',
                   'PGP': '383928317087',
                   'Simons Foundation': '461916304629'},
      'set_types' : [ SET_TYPE_READSET, SET_TYPE_CALLSET ],
  }


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

  def supports_name_filter(self):
    return SUPPORTED_BACKENDS[self.get_backend()].has_key('supportsNameFilter')

  def supports_partial_response(self):
    return SUPPORTED_BACKENDS[self.get_backend()]\
      .has_key('supportsPartialResponse')

  def get_base_api_url(self):
    return SUPPORTED_BACKENDS[self.get_backend()]['url']

  def get_http(self):
    return SUPPORTED_BACKENDS[self.get_backend()]['http']

  def get_ga4gh_api_version(self):
    return SUPPORTED_BACKENDS[self.get_backend()]['ga4gh_api_version']

  def get_set_types(self):
    return SUPPORTED_BACKENDS[self.get_backend()]['set_types']

  def get_content(self, path, method='POST', body=None, params=''):
    uri = self.get_base_api_url() % (path, params)
    start_time = time.clock()

    http = self.get_http()

    try:
      response, content = http.request(
          uri,
          method=method, body=json.dumps(body) if body else None,
          headers={'Content-Type': 'application/json; charset=UTF-8'})
    except Exception, err:
      logging.error('%s', err)
      raise

    try:
      content = json.loads(content)
    except ValueError:
      logging.error('while requesting %s', uri)
      logging.error('non-json api content %s', content[:1000])
      raise ApiException('The API returned invalid JSON')

    if response.status >= 300:
      logging.error('%s FAILED', uri)
      logging.error('error api response %s', response)
      logging.error('error api content %s', content)
      if 'error' in content:
        if 'message' in content['error']:
          raise ApiException(content['error']['message'])
        else:
          raise ApiException(content['error'])
      else:
        raise ApiException('Something went wrong with the API call!')

    logging.info('get_content %s: %sb %ss',
                 uri, len(content), time.clock() - start_time)

    return content

  def write_response(self, content):
    self.response.headers['Content-Type'] = 'application/json'
    self.response.write(json.dumps(content))

  def write_content(self, path, method='POST', body=None, params=''):
    self.write_response(self.get_content(path, method, body, params))


class SetSearchHandler(BaseRequestHandler):

  def write_read_group_sets(self, dataset_id, name):
    if SET_TYPE_READSET not in self.get_set_types():
      self.write_response({})
      return

    self.write_content('readgroupsets/search',
                       body={'datasetIds': [dataset_id], 'name': name},
                       params='fields=readGroupSets(id,name)')

  def write_call_sets(self, dataset_id, name):
    if SET_TYPE_CALLSET not in self.get_set_types():
      self.write_response({})
      return

    ga4gh_api_version = self.get_ga4gh_api_version()

    if ga4gh_api_version == '0.6.0':
      # Single dataset ID as input
      variant_sets = self.get_content('variantsets/search',
                                      body={'datasetId': dataset_id})
      variant_set_id = variant_sets['variantSets'][0]['id']

    elif ga4gh_api_version == '0.5.1':
      # Array of dataset IDs as input
      variant_sets = self.get_content('variantsets/search',
                                      body={'datasetIds': [dataset_id]})
      variant_set_id = variant_sets['variantSets'][0]['id']

    else:
      raise ApiException('Unsupported GA4GH version: %s' % ga4gh_api_version)

    if ga4gh_api_version == '0.6.0':
      # Single variantset ID as input
      self.write_content('callsets/search',
                         body={'variantSetId': variant_set_id,
                               'name': name,
                               'pageSize': 100},
                         params='fields=callSets(id,name)')
    elif ga4gh_api_version == '0.5.1':
      # Array of variantset IDs as input
      self.write_content('callsets/search',
                         body={'variantSetIds': [variant_set_id],
                               'name': name},
                         params='fields=callSets(id,name)')

    else:
      raise ApiException('Unsupported GA4GH version: %s' % ga4gh_api_version)

  def write_read_group_set(self, set_id):
    rg_set = self.get_content('readgroupsets/%s' % set_id, method='GET')
    # For read group sets, we also load up the reference set data
    reference_set_id = rg_set.get('referenceSetId') or \
                       rg_set['readGroups'][0].get('referenceSetId')

    if not reference_set_id:
      buckets = self.get_content('readgroupsets/%s/coveragebuckets' % set_id,
                                 method='GET')
      rg_set['references'] = [{'name': b['range']['referenceName'],
                               'length': b['range']['end']}
                              for b in buckets['coverageBuckets']]
    else:
      references = self.get_content('references/search',
                                    body={'referenceSetId': reference_set_id},
                                    params='fields=references(name,length)')
      rg_set['references'] = references['references']

    self.response.write(json.dumps(rg_set))

  def write_call_set(self, set_id):
    call_set = self.get_content('callsets/%s' % set_id, method='GET')

    # For call sets, we also load up the variant set data to get
    # the available reference names and lengths
    variant_set_id = call_set['variantSetIds'][0]
    variant_set = self.get_content('variantsets/%s' % variant_set_id,
                                   method='GET')

    # Google Genomics implements a custom extension (referenceBounds)
    # which provides the list of reference segments and the upper bounds
    # for each.
    #
    # See: https://cloud.google.com/genomics/reference/rest/v1/variantsets
    #
    # Otherwise, to display the list of chromosomes in the UI, we have a
    # hard-coded list for GRCh38.

    if 'referenceBounds' in variant_set:
      call_set['references'] = [{'name': b['referenceName'],
                                 'length': b['upperBound']}
                                for b in variant_set['referenceBounds']]
    elif ('referenceSetId' in variant_set and
          variant_set['referenceSetId'] == 'GRCh38'):
      call_set['references'] = GRCh38['common_segments']

    self.response.write(json.dumps(call_set))

  def get(self):
    set_type = self.request.get('setType')
    set_id = self.request.get('setId')

    if set_id:
      if set_type == SET_TYPE_CALLSET:
        self.write_call_set(set_id)
      elif set_type == SET_TYPE_READSET:
        self.write_read_group_set(set_id)

    else:
      dataset_id = self.request.get('datasetId')
      name = self.request.get('name')

      if set_type == SET_TYPE_CALLSET:
        self.write_call_sets(dataset_id, name)
      elif set_type == SET_TYPE_READSET:
        self.write_read_group_sets(dataset_id, name)


class ReadSearchHandler(BaseRequestHandler):

  def get(self):
    body = {
        'readGroupSetIds': self.request.get('setIds').split(','),
        'referenceName': self.request.get('sequenceName'),
        'start': max(0, int(self.request.get('sequenceStart'))),
        'end': int(self.request.get('sequenceEnd')),
    }
    read_fields = self.request.get('readFields')
    params = ''
    if read_fields and self.supports_partial_response():
      params = 'fields=nextPageToken,alignments(%s)' % read_fields
      body['pageSize'] = 1024

    page_token = self.request.get('pageToken')
    if page_token:
      body['pageToken'] = page_token

    content = self.get_content('reads/search', body=body, params=params)

    # Emulate support for partial responses by supplying only the
    # requested fields to the client.
    if read_fields and not self.supports_partial_response():
      fields = read_fields.split(',')
      def filterKeys(dictionary, keys):
        return {key: dictionary[key] for key in keys}

      new_reads = [filterKeys(read, fields) for read in content['alignments']]
      content['alignments'] = new_reads

    self.write_response(content)


class VariantSearchHandler(BaseRequestHandler):

  def get(self):
    ga4gh_api_version = self.get_ga4gh_api_version()

    body = {
        'callSetIds': self.request.get('setIds').split(','),
        'referenceName': self.request.get('sequenceName'),
        'start': max(0, int(self.request.get('sequenceStart'))),
        'end': int(self.request.get('sequenceEnd')),
        'pageSize': 100
    }

    ga4gh_api_version = self.get_ga4gh_api_version()
    if ga4gh_api_version == '0.6.0':
      # variants/search in 0.6.0 does NOT require the variantSetId,
      # but the Ensembl implementation does.
      # The variantSetId isn't stored in the client (though it could be)
      # and hence it is not passed in here.

      # For now, just look up the variantSetId for each callset
      # (and make sure they all belong to the same one)
      variant_set_ids = set()
      for set_id in self.request.get('setIds').split(','):
        call_set = self.get_content('callsets/%s' % set_id, method='GET')
        variant_set_ids.add(call_set['variantSetIds'][0])

      if len(variant_set_ids) != 1:
        raise ApiException('callsets must all come from the same variantset')

      body['variantSetId'] = variant_set_ids.pop()

    page_token = self.request.get('pageToken')
    if page_token:
      body['pageToken'] = page_token
    self.write_content('variants/search', body=body)


class BaseSnpediaHandler(webapp2.RequestHandler):
  http = httplib2.Http(timeout=60)

  def getSnppediaPageContent(self, snp):
    uri = ('http://bots.snpedia.com/api.php?action=query&prop=revisions&'
           'format=json&rvprop=content&titles=%s' % snp)
    response, content = self.http.request(uri=uri)

    page_id, page = json.loads(content)['query']['pages'].popitem()
    return page['revisions'][0]['*']

  def getContentValue(self, content, key):
    try:
      matcher = '%s=(.*)\n' % key
      return re.search(matcher, content, re.I).group(1)
    except (KeyError, AttributeError):
      return ''

  def complement(self, base):
    return {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}[base]


class SnpSearchHandler(BaseSnpediaHandler):

  def getSnpResponse(self, name, content):
    return {
        'name': name,
        'link': 'http://www.snpedia.com/index.php/%s' % name,
        'position': self.getContentValue(content, 'position'),
        'chr': self.getContentValue(content, 'chromosome')
    }

  def get(self):
    snp = self.request.get('snp')

    try:
      content = self.getSnppediaPageContent(snp)
      if snp[:2].lower() == 'rs':
        snps = [self.getSnpResponse(snp, content)]
      else:
        # Try a gene format
        snps = re.findall('\[\[(rs\d+?)\]\]', content, re.I)
        snps = [self.getSnpResponse(s, self.getSnppediaPageContent(s))
                for s in set(snps)]

    except (ValueError, KeyError, AttributeError):
      snps = []
    self.response.write(json.dumps({'snps': snps}))


class AlleleSearchHandler(BaseSnpediaHandler):

  def getAlleleResponse(self, name, content):
    return {
        'name': name,
        'link': 'http://www.snpedia.com/index.php/%s' % name,
        'repute': self.getContentValue(content, 'repute'),
        'summary': self.getContentValue(content, 'summary') or 'Unknown',
        'magnitude': self.getContentValue(content, 'magnitude')
    }

  def get(self):
    snp = self.request.get('snp')
    a1 = self.request.get('a1')
    a2 = self.request.get('a2')

    a1c = self.complement(a1)
    a2c = self.complement(a2)
    possible_names = [(snp, a1, a2), (snp, a2, a1),
                      (snp, a1c, a2c), (snp, a2c, a1c)]
    for name in possible_names:
      try:
        page = '%s(%s;%s)' % name
        content = self.getSnppediaPageContent(page)
        self.response.write(json.dumps(self.getAlleleResponse(page, content)))
        return
      except (ValueError, KeyError, AttributeError):
        pass  # Continue trying the next allele name

    self.response.write(json.dumps({}))


class MainHandler(webapp2.RequestHandler):

  def get(self):
    template = JINJA_ENVIRONMENT.get_template('main.html')
    self.response.write(template.render({
        'backends': SUPPORTED_BACKENDS,
    }))

web_app = webapp2.WSGIApplication(
    [
        ('/', MainHandler),
        ('/api/reads', ReadSearchHandler),
        ('/api/variants', VariantSearchHandler),
        ('/api/sets', SetSearchHandler),
        ('/api/snps', SnpSearchHandler),
        ('/api/alleles', AlleleSearchHandler),
    ],
    debug=True)
