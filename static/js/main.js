/*
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
*/

function toggleUi(clazz, link) {
  $(".toggleable").hide();
  $("." + clazz).show();

  $('#mainNav li').removeClass('active');
  $(link).parent().addClass('active');
}

function showError(message) {
  showAlert(message, 'danger');
}

function showMessage(message) {
  showAlert(message, 'info');
}

function showAlert(message, type) {
  var alert = $('<div class="alert alert-info alert-dismissable"/>')
      .addClass('alert-' + type)
      .text(message).appendTo($("body"));
  closeButton().attr('data-dismiss', 'alert').appendTo(alert);
  alert.css('margin-left', -1 * alert.width()/2);

  setTimeout(function() {
    alert.alert('close')
  }, type == 'danger' ? 5000 : 3000);
}

function closeButton() {
  return $('<button type="button" class="close" aria-hidden="true">&times;</button>');
}

function addReadset(backend, id, opt_location) {
  if (readgraph.hasReadset(id)) {
    if (opt_location) {
      readgraph.jumpGraph(opt_location);
    }
    return;
  }
  showMessage('Loading readset');

  $.getJSON('/api/readsets', {'backend' : backend, 'readsetId': id})
      .done(function(res) {
        readgraph.addReadset(backend, id, res.fileData[0].refSequences);
        if (opt_location) {
          readgraph.jumpGraph(opt_location);
        }

        // TODO: Get this data from a better location
        var backendName = $('#backend option[value=' + backend + ']').text().trim();
        var name = backendName + ": " + res.name;

        var readsetList = $('#activeReadsets').empty();
        var li = $('<li>', {'id': 'readset-' + id, 'class': 'list-group-item'})
            .text(name).appendTo(readsetList);
        closeButton().appendTo(li).click(function() {
          li.remove();
          readgraph.removeReadset(id);
          return false;
        });
      });
}

function searchReadsets(button) {
  if (button) {
    button = $(button);
    button.button('loading');
  }

  var div = $('#readsetResults').html('<img src="static/img/spinner.gif"/>');
  var backend = $('#backend').val();
  var datasetId = $('#datasetId' + backend).val();

  function getItemsOnPage(page) {
    return $('#readsetResults .list-group-item[page=' + page + ']');
  }

  var readsetsPerPage = 10;
  $.getJSON('/api/readsets', {'backend': backend, 'datasetId': datasetId,
      'name': $('#readsetName').val()})
      .done(function(res) {
        div.empty();

        var pagination = $('#readsetPagination');
        pagination.hide();

        if (!res.readsets) {
          div.html('No readsets found');
          return;
        }

        var totalPages = Math.ceil(res.readsets.length / readsetsPerPage);

        $.each(res.readsets, function(i, data) {
          var page = Math.floor(i / readsetsPerPage) + 1;
          $('<a/>', {'href': '#', 'class': 'list-group-item', 'page': page})
              .text(data.name).appendTo(div).click(function() {
            switchToReadset(backend, data.id);
            return false;
          }).hide();
        });
        getItemsOnPage(1).show();

        if (totalPages > 1) {
          pagination.show();
          pagination.bootpag({
            page: 1,
            total: totalPages,
            maxVisible: 10
          }).on("page", function(event, newPage) {
            $('#readsetResults .list-group-item').hide();
            getItemsOnPage(newPage).show();
          });
        }

      }).always(function() {
        button && button.button('reset');
      });
  return false;
}


// Hash functions

function switchToReadset(backend, id) {
  $.uriAnchor.setAnchor({
    backend: backend,
    readsetId: id
  });
  $('#readsetSearch').modal('hide');
}

function switchToLocation(location) {
  var state = _.extend($.uriAnchor.makeAnchorMap(), {'location': location});
  $.uriAnchor.setAnchor(state);
}

function handleHash() {
  var state = $.uriAnchor.makeAnchorMap();
  if (state.backend) {
    $("#backend").val(state.backend);
    if (state.readsetId) {
      addReadset(state.backend, state.readsetId, state.location);

      if (state.location) {
        $("#readsetPosition").val(state.location);
      }
    }
  }
}


// Show the about popup when the page loads, read the hash,
// and prep the initial readset search
$(document).ready(function() {
  $('#about').modal('show');

  $(document).ajaxError(function(e, xhr) {
    showError('Sorry, the api request failed for some reason. ' +
        '(' + xhr.responseText + ')');
  });

  $(window).on('hashchange', handleHash);
  handleHash();

  $('#backend').change(function() {
    $('.datasetSelector').hide();
    $('#datasetId' + $(this).val()).show()
  }).change();
  searchReadsets();
});