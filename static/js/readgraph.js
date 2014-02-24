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

var readgraph = new function() {
  var cigarMatcher = /([0-9]+[MIDNSHP=X])/gi

  var width = 0;
  var height = 800;
  var margin = 30;

  var textHeight, textWidth = 0;

  var y = d3.scale.linear().range([margin, height - margin*2]);
  var x = d3.scale.linear();
  var xAxis = d3.svg.axis().ticks(5).scale(x);
  var xFormat = d3.format(',f');

  var zoom = null;
  var maxZoom = 1;
  var zoomLevelChange = 1;
  var minRange = 0;

  var opacity = d3.scale.linear().domain([0, 93]).range([.2, 1]);
  var unsupportedMessage = null;

  // Current state
  var readsetIds = [];
  var sequences = null;
  var currentSequence = null;
  var xhrTimeout = null;

  // Dom elements
  var svg, readGroup, readDiv, spinner = null;

  var getScaleLevel = function() {
    return Math.floor(Math.log(zoom.scale()) / Math.log(zoomLevelChange) + .1);
  };

  var handleZoom = function() {
    var tx = zoom.translate()[0];
    tx = Math.max(tx, (1 - zoom.scale()) * width); // TODO: This isn't strict enough
    tx = Math.min(tx, 0);
    zoom.translate([tx, 0]);
    svg.select(".axis").call(xAxis);

    // Update scale bar
    d3.select('.zoomLevel').attr('y', (6 - getScaleLevel()) * 24 + 38);
    updateDisplay();
  };

  var moveTosequencePosition = function(position) {
    position = Math.max(0, position);
    position = Math.min(currentSequence.sequenceLength, position);

    var newX = x(position);
    newX = zoom.translate()[0] - newX + width / 2;
    zoom.translate([newX, 0]);
    handleZoom();
  };

  var setupRun = false;
  var setup = function() {
    setupRun = true;

    // Measurements
    svg = d3.select("#graph");
    var text = addText(svg, 'G', 0, 0);
    var bbox = text.node().getBBox();
    textWidth = bbox.width;
    textHeight = bbox.height;
    text.remove();

    width = $('#graph').width();
    x.rangeRound([margin, width - margin]);
    minRange = (width / textWidth / 2); // Twice the zoom of individual bases

    readDiv = $('#readDiv');


    // Svg init
    // Reads Axis
    svg.append('g')
        .attr('transform', 'translate(0,' + (height - margin) + ')')
        .attr('class', 'axis');

    // Unsupported message
    unsupportedMessage = addText(svg, 'This zoom level is coming soon!', width/2, height/4);

    // Hover line
    var hoverline = svg.append("line")
        .attr("class", "hover hoverline")
        .attr("x1", 0).attr("x2", 0)
        .attr("y1", 0).attr("y2", height);

    var hovertext = svg.append('text')
        .attr("class", "hover hovertext")
        .attr('y', textHeight);

    svg.on("mousemove", function() {
      var mouseX = d3.mouse(this)[0];
      mouseX = Math.max(margin, mouseX);
      mouseX = Math.min(width - margin, mouseX);

      if (mouseX > width * 2/3) {
        hovertext.attr('x', mouseX - 3).style('text-anchor', 'end');
      } else {
        hovertext.attr('x', mouseX + 3).style('text-anchor', 'start');
      }
      hovertext.text(xFormat(x.invert(mouseX)));
      hoverline.attr("x1", mouseX).attr("x2", mouseX)
    });

    // Groups
    readGroup = svg.append('g').attr('class', 'readGroup');
    var zoomGroup = svg.append('g').attr('class', 'zoomGroup');

    // Zooming
    var changeZoomLevel = function(levelChange) {
      var newZoom = zoom.scale();
      var middleX = x.invert(width / 2); // Keep the graph centered on the middle position

      if (levelChange > 0) {
        newZoom = zoom.scale() * zoomLevelChange;
      } else {
        newZoom = zoom.scale() / zoomLevelChange;
      }
      newZoom = Math.max(1, newZoom);
      newZoom = Math.min(maxZoom, newZoom);
      zoom.scale(newZoom);
      console.log("switched to zoom: " + newZoom + " and scale " + getScaleLevel());

      handleZoom();
      moveTosequencePosition(middleX);
    };

    zoom = d3.behavior.zoom().size([width, height]).on("zoom", handleZoom);
    svg.call(zoom);

    addImage(zoomGroup, 'zoom-bar.png', 10, 201, 7, 10);
    addImage(zoomGroup, 'zoom-level.png', 22, 15, 2, 183, null, 'zoomLevel');
    addImage(zoomGroup, 'zoom-plus.png', 25, 25, 0, 10, function() {
      changeZoomLevel(1);
    });
    addImage(zoomGroup, 'zoom-minus.png', 25, 25, 0, 200, function() {
      changeZoomLevel(-1);
    });
    var zoomTextX = 23;
    addText(zoomGroup, 'Bases', zoomTextX, 50);
    addText(zoomGroup, 'Reads', zoomTextX, 98);
    addText(zoomGroup, 'Coverage', zoomTextX, 147);
    addText(zoomGroup, 'Summary', zoomTextX, 195);

    // Spinner
    spinner = addImage(readGroup, 'spinner.gif', 16, 16, width - 16, 0);
    spinner.style('display', 'none');
  };

  this.jumpGraph = function(position) {
    // TODO: Support non-int positions - feature, gene, etc
    position = parseInt(position.replace(/,/g, ''));
    if (position != 0 && !position) {
      showMessage('Only numbered positions are supported right now');
      return;
    }

    var zoomLevel = maxZoom / (zoomLevelChange * 2); // Read level
    if (zoom.scale() != zoomLevel) {
      zoom.scale(zoomLevel);
      handleZoom();
    }
    moveTosequencePosition(position);
  };

  var addImage = function(parent, name, width, height, x, y, opt_handler, opt_class) {
    return parent.append('image').attr('xlink:href', '/static/img/' + name)
        .attr('width', width).attr('height', height)
        .attr('x', x).attr('y', y)
        .on("mouseup", opt_handler || function(){})
        .attr('class', opt_class || '');
  };

  var addText = function(parent, name, x, y) {
    return parent.append('text').text(name).attr('x', x).attr('y', y);
  };

  var selectSequence = function(sequence) {
    currentSequence = sequence;
    $('.sequence').removeClass('active');
    $('#sequence-' + sequence.name).addClass('active');
    $('#graph').show();
    if (!setupRun) {
      setup();
    }

    // Axis and zoom
    x.domain([0, sequence.sequenceLength]);
    maxZoom = Math.ceil(Math.max(1, sequence.sequenceLength / minRange));
    zoomLevelChange = Math.pow(maxZoom, 1/6);
    zoom.x(x).scaleExtent([1, maxZoom]).size([width, height]);

    $('#jumpDiv').show();
    handleZoom();
  };

  var updateSequences = function() {
    var sequencesDiv = $("#sequences").empty();

    $.each(sequences, function(i, sequence) {
      var canonicalName = sequence.name;
      if (sequence.name.indexOf('X') != -1) {
        canonicalName = 'X';
      } else if (sequence.name.indexOf('Y') != -1) {
        canonicalName = 'Y';
      } else {
        var number = canonicalName.replace(/\D/g,'');
        canonicalName = number || canonicalName;
      }

      var sequenceDiv = $('<div/>', {'class': 'sequence', id: 'sequence-' + sequence.name}).appendTo(sequencesDiv);
      $('<img>', {'class': 'pull-left', src: '/static/img/chr' + canonicalName + '.png'}).appendTo(sequenceDiv);
      $('<div>', {'class': 'title'}).text("Chromosome " + canonicalName).appendTo(sequenceDiv);
      $('<div>', {'class': 'summary'}).text(xFormat(sequence.sequenceLength) + " bases").appendTo(sequenceDiv);

      sequenceDiv.click(function() {
        selectSequence(sequence);
      });
    });
  };

  var updateDisplay = function() {
    var scaleLevel = getScaleLevel();
    var summaryView = scaleLevel < 2;
    var coverageView = scaleLevel == 2 || scaleLevel == 3;
    var readView = scaleLevel > 3;
    var baseView = scaleLevel > 5;

    var reads = readGroup.selectAll(".read");
    toggleVisibility(unsupportedMessage, summaryView || coverageView);
    toggleVisibility(reads, readView);

    var sequenceStart = parseInt(x.domain()[0]);
    var sequenceEnd = parseInt(x.domain()[1]);

    // TODO: Bring back coverage and summary views
    if (readView) {
      queryReads(sequenceStart, sequenceEnd);

      reads.selectAll('.outline')
          .attr("points", outlinePoints);

      if (!baseView) {
        reads.selectAll('.letter').style('display', 'none');
      } else {
        reads.selectAll('.letter')
            .style('display', function(data, i) {
              if (data.rx < sequenceStart || data.rx >= sequenceEnd - 1) {
                return 'none';
              } else {
                return 'block';
              }
            })
            .attr("x", function(data, i) {
              return x(data.rx) + textWidth;
            })
            .attr("y", function(data, i) {
              return y(data.ry) + textHeight/2;
            });
      }
    }
  };

  var toggleVisibility = function(items, visible) {
    items.style('display', visible ? 'block' : 'none');
  };

  // Read position
  var stringifyPoints = function(points) {
    for (var i = 0; i < points.length; i++) {
      points[i] = points[i].join(',');
    }
    return points.join(' ');
  };

  var outlinePoints = function(read, i) {
    var yTracksLength = y.domain()[0];
    var barHeight = Math.min(30, Math.max(2, (height - margin*3)/ yTracksLength - 5));

    var pointWidth = 10;
    var startX = Math.max(margin, x(read.position));
    var endX = Math.min(width - margin, x(read.end));

    if (startX > endX - pointWidth) {
      return '0,0';
    }

    var startY = y(read.yOrder);
    var endY = startY + barHeight;
    var midY = (startY + barHeight / 2);


    if (read.reverse) {
      startX += pointWidth;
    } else {
      endX -= pointWidth;
    }

    var points = [];
    points.push([startX, startY]);
    if (read.reverse) {
      points.push([startX - pointWidth, midY]);
    }
    points.push([startX, endY]);
    points.push([endX, endY]);
    if (!read.reverse) {
      points.push([endX + pointWidth, midY]);
    }
    points.push([endX, startY]);
    return stringifyPoints(points);
  };

  // Read details
  var showRead = function(read, i) {
    readDiv.empty().show();

    $("<h4/>").text("Read: " + read.qname).appendTo(readDiv);
    var dl = $("<dl/>").addClass("dl").appendTo(readDiv);

    var addField = function(title, field) {
      if (field) {
        $("<dt/>").text(title).appendTo(dl);
        $("<dd/>").text(field).appendTo(dl);
      }
    };

    addField("Position", read.position);
    addField("Length", read.length);
    addField("Mate position", read.mateSegmentPosition);
    addField("Mapping quality", read.mappingQuality);
    addField("Cigar", read.cigar);

    d3.select(this).classed("selected", true);
  };

  var hideRead = function(read, i) {
    d3.select(this).classed("selected", false);
  };

  var setYOrder = function(read, yOrder) {
    read.yOrder = yOrder;

    for (var r = 0; r < read.readPieces.length; r++) {
      read.readPieces[r].ry = read.yOrder;
    }
  };

  var setReads = function(reads) {
    var yTracks = [];
    $.each(reads, function(readi, read) {
      // Interpret the cigar
      // TODO: Compare the read against a reference rather than relying on the cigar
      var bases = read.originalSequence.split('');
      var matches = read.cigar.match(cigarMatcher);
      var baseIndex = 0;

      read.id = read.qname + read.position + read.cigar;
      read.readPieces = [];
      if (!read.cigar) {
        // Hack for unmapped reads
        read.length = 0;
        read.end = read.position;
        return;
      }

      var addLetter = function(type, letter, qual) {
        read.readPieces.push({
          'letter' : letter,
          'rx': read.position + read.readPieces.length,
          'qual': qual,
          'cigarType': type
        });
      };

      for (var m = 0; m < matches.length; m++) {
        var match = matches[m];
        var baseCount = parseInt(match);
        var baseType = match.match(/[^0-9]/)[0];

        switch (baseType) {
          case 'H':
          case 'P':
            // We don't display clipped sequences right now
            break;
          case 'D':
          case 'N':
            // Deletions get placeholders inserted
            for (var b = 0; b < baseCount; b++) {
              addLetter(baseType, '-', 100);
            }
            break;
          case 'S': // TODO: Reveal this skipped data somewhere
            baseIndex += baseCount;
            break;
          case 'I': // TODO: What should an insertion look like?
          case 'x': // TODO: Color these differently
          case 'M':
          case '=':
            // Matches and insertions get displayed
            for (var j = 0; j < baseCount; j++) {
              addLetter(baseType, bases[baseIndex], read.qual.charCodeAt(baseIndex) - 33);
              baseIndex++;
            }
            break;
        }
      }

      read.length = read.readPieces.length;
      read.end = read.position + read.length;
      read.reverse = (read.flags >> 4) % 2 == 1; // The 5th flag bit indicates this read is reversed
      read.index = readi;

      for (var i = 0; i < yTracks.length; i++) {
        if (yTracks[i] < read.position) {
          yTracks[i] = read.end;
          setYOrder(read, i);
          return;
        }
      }

      setYOrder(read, yTracks.length);
      yTracks.push(read.end);
    });

    y.domain([yTracks.length, -1]);

    if (reads.length == 0) {
      // Update the data behind the graph
      readGroup.selectAll('.read').remove();
      return;
    }

    var reads = readGroup.selectAll(".read").data(reads, function(read){return read.id;});

    reads.enter().append("g")
        .attr('class', 'read')
        .on("mouseover", showRead)
        .on("mouseout", hideRead);

    var outlines = reads.selectAll('.outline')
        .data(function(read, i) { return [read];});
    outlines.enter().append('polygon')
        .attr('class', 'outline');

    var letters = reads.selectAll(".letter")
        .data(function(read, i) { return read.readPieces; });

    letters.enter().append('text')
        .attr('class', 'letter')
        .style('opacity', function(data, i) { return opacity(data.qual); })
        .text(function(data, i) { return data.letter; });

    reads.exit().remove();
    updateDisplay();
  };

  var makeQueryParams = function(sequenceStart, sequenceEnd, type) {
    var queryParams = {};
    queryParams.readsetIds = readsetIds.join(',');
    queryParams.type = type;
    queryParams.sequenceName = currentSequence.name;
    queryParams.sequenceStart = parseInt(sequenceStart);
    queryParams.sequenceEnd = parseInt(sequenceEnd);
    return queryParams;
  };

  var queryReads = function(sequenceStart, sequenceEnd) {
    queryApi(sequenceStart, sequenceEnd, 'reads', setReads);
  };

  var lastQueryParams = null;
  var queryApi = function(sequenceStart, sequenceEnd, type, handler) { // TODO: Make this cleaner
    var queryParams = makeQueryParams(sequenceStart, sequenceEnd, type);

    if (lastQueryParams
        && lastQueryParams.readsetIds == queryParams.readsetIds
        && lastQueryParams.type == queryParams.type
        && lastQueryParams.sequenceName == queryParams.sequenceName
        && lastQueryParams.sequenceStart <= queryParams.sequenceStart
        && lastQueryParams.sequenceEnd >= queryParams.sequenceEnd) {
      return;
    }

    if (xhrTimeout) {
      clearTimeout(xhrTimeout);
    }

    xhrTimeout = setTimeout(function() {
      callXhr('/api/reads', queryParams, handler);
    }, 500);
  };

  var callXhr = function(url, queryParams, handler, opt_reads) {
    spinner.style('display', 'block');
    $.getJSON(url, queryParams)
        .done(function(res) {
          lastQueryParams = queryParams;
          var reads = (opt_reads || []).concat(res.reads || []);
          handler(reads);

          if (res.nextPageToken) {
            queryParams['pageToken'] = res.nextPageToken;
            callXhr(url, queryParams, handler, reads);
          }
        })
        .fail(function(xhr) {
          showError("Sorry, the api request failed for some reason. Better error handling to come! (" + xhr.responseText + ")");
        })
        .always(function() {
          spinner.style('display', 'none');
        });
  };

  this.hasReadset = function(id) {
    return $.inArray(id, readsetIds) != -1;
  };

  // TODO: Support multiple readsets
  this.addReadset = function(id, sequenceData) {
    readsetIds = [id];
    if (readsetIds.length == 1) {
      sequences = sequenceData;
      updateSequences();
      $('#chooseReadsetMessage').hide();
    }
  };

  this.removeReadset = function(id) {
    readsetIds = _.without(readsetIds, id);
    if (readsetIds.length == 0) {
      sequences = [];
      updateSequences();
      $('#chooseReadsetMessage').show();
      $('#graph').hide();
      $('#jumpDiv').hide();
    }
  }
};
