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
  var readsetBackend = null;
  var sequences = null;
  var currentSequence = null;
  var readStats = {}; // Map from position to stat information
  var xhrTimeout = null;

  // Dom elements
  var svg, positionIndicator, readGroup, readDiv, spinner = null;

  var getScaleLevel = function() {
    return Math.floor(Math.log(zoom.scale()) / Math.log(zoomLevelChange) + .1);
  };

  var handleZoom = function() {
    var tx = zoom.translate()[0];
    // TODO: This isn't strict enough
    tx = Math.max(tx, (1 - zoom.scale()) * width);
    tx = Math.min(tx, 0);
    zoom.translate([tx, 0]);
    svg.select(".axis").call(xAxis);

    // Update scale bar
    d3.select('.zoomLevel').attr('y', (6 - getScaleLevel()) * 24 + 38);
    updateDisplay();
  };

  var moveToSequencePosition = function(position) {
    position = Math.max(0, position);
    position = Math.min(currentSequence['length'], position);

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
    unsupportedMessage = addText(svg, 'This zoom level is coming soon!',
        width/2, height/4);

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

      var position = Math.floor(x.invert(mouseX));
      hovertext.selectAll('tspan').remove();
      hovertext.append('tspan').text(xFormat(position));

      if (readStats[position]) {
        var counts = _.countBy(readStats[position]);
        hovertext.append('tspan')
            .attr('y', textHeight*2).attr('x', hovertext.attr('x'))
            .text(_.reduce(counts, function(memo, num, key) {
              return memo + num + key + " ";
            }, ""));
      }

      hoverline.attr("x1", mouseX).attr("x2", mouseX)
    });

    // Position indicator
    positionIndicator = svg.append('g')
        .attr('transform', 'translate(0,0)')
        .attr('class', 'axis');
    positionIndicator.append('rect')
        .attr('class', 'positionIndicator background')
        .attr('x', 0).attr('y', 0)
        .attr('width', textWidth * 1.5).attr('height', height - margin);
    positionIndicator.append('text')
        .attr('class', 'positionIndicator text')
        .attr('x', 3)
        .attr('y', height - margin - textHeight);
    toggleVisibility(positionIndicator, false);

    // Groups
    readGroup = svg.append('g').attr('class', 'readGroup');
    var zoomGroup = svg.append('g').attr('class', 'zoomGroup');

    // Zooming
    var changeZoomLevel = function(levelChange) {
      var newZoom = zoom.scale();
      // Keep the graph centered on the middle position
      var middleX = x.invert(width / 2);

      if (levelChange > 0) {
        newZoom = zoom.scale() * zoomLevelChange;
      } else {
        newZoom = zoom.scale() / zoomLevelChange;
      }
      newZoom = Math.max(1, newZoom);
      newZoom = Math.min(maxZoom, newZoom);
      zoom.scale(newZoom);

      handleZoom();
      moveToSequencePosition(middleX);
    };

    zoom = d3.behavior.zoom().size([width, height]).on("zoom", handleZoom);
    svg.call(zoom);

    // Zoom background
    zoomGroup.append('rect')
        .attr('x', 23).attr('y', 35)
        .attr('width', 66).attr('height', 170);

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
    var jumpResults = $("#jumpResults").empty();

    // TODO: Support more non-int positions - feature, gene, etc
    if (/^rs/i.test(position)) {
      // Snps
      showMessage('Looking up SNP: ' + position);
      $.getJSON('api/snps', {snp: position}).done(function(res) {
        if (res.position == -1) {
          showMessage('Could not find SNP: ' + position);
        } else {
          var listItem = $('<a/>', {'href': '#', 'class': 'list-group-item'})
              .appendTo(jumpResults).click(function() {
                jumpToPosition(res.position, res.chr, true, position);
              });
          $('<span>', {'class': 'title'}).text(res.name).appendTo(listItem);
          $('<a>', {'href': res.link, 'target': '_blank'}).text(' SNPedia')
              .appendTo(listItem);
          $('<div>').text('chr ' + res.chr + ' at ' + xFormat(res.position))
              .appendTo(listItem);

          jumpToPosition(res.position, res.chr, true, position);
        }
      });
    } else {
      // Numbered positions
      position = parseInt(position.replace(/,/g, ''));
      if (position != 0 && !position) {
        showMessage('Only numbered positions and SNPs are supported right now');
        return;
      }
      jumpToPosition(position, null, true);
    }
  };

  var fuzzyFindSequence = function(chr) {
    var actualNames = _.pluck(sequences, 'name');
    var possibleNames = [chr, "chr" + chr];
    possibleNames = _.intersection(actualNames, possibleNames);

    if (possibleNames.length > 0) {
      return _.findWhere(sequences, {name: possibleNames[0]});
    }
    return null;
  };

  var jumpToPosition = function(position, chr, baseView, displayName) {
    if (chr) {
      // Update our sequence
      var sequence = fuzzyFindSequence(chr);
      if (!sequence) {
        showError('This readset doesn\'t have the sequence ' + chr +
          '. Please try a different position.');
        return;
      }

      selectSequence(sequence, true);
    }

    var currentLength = currentSequence['length'];
    if (position > currentLength) {
      showError('This sequence only has ' + xFormat(currentLength) +
          ' bases. Please try a smaller position.');
      return;
    }

    positionIndicator.attr('position', baseView ? position : -1);
    positionIndicator.selectAll('text')
        .text(baseView ? (displayName || xFormat(position)) : '');

    var zoomLevel = baseView ? maxZoom : maxZoom / zoomLevelChange; // Read level
    if (zoom.scale() != zoomLevel) {
      zoom.scale(zoomLevel);
      handleZoom();
    }
    moveToSequencePosition(position);
  };

  var addImage = function(parent, name, width, height, x, y,
      opt_handler, opt_class) {
    return parent.append('image').attr('xlink:href', '/static/img/' + name)
        .attr('width', width).attr('height', height)
        .attr('x', x).attr('y', y)
        .on("mouseup", opt_handler || function(){})
        .attr('class', opt_class || '');
  };

  var addText = function(parent, name, x, y) {
    return parent.append('text').text(name).attr('x', x).attr('y', y);
  };

  var sequenceId = function(name) {
    return 'sequence-' + name.replace(/[\|\.]/g, '');
  };

  var selectSequence = function(sequence, opt_skipJumping) {
    currentSequence = sequence;
    $('.sequence').removeClass('active');
    var div = $('#' + sequenceId(sequence.name)).addClass('active');

    // Make sure the selected sequence div is visible
    var divLeft = div.offset().left;
    var windowWidth = $(window).width();
    if (divLeft < 0 || divLeft > windowWidth - 200) {
      var currentScroll = $("#sequences").scrollLeft();
      $("#sequences").animate({scrollLeft: currentScroll + divLeft - windowWidth/2});
    }

    $('#graph').show();
    if (!setupRun) {
      setup();
    }

    // Axis and zoom
    x.domain([0, sequence['length']]);
    maxZoom = Math.ceil(Math.max(1, sequence['length'] / minRange));
    zoomLevelChange = Math.pow(maxZoom, 1/6);
    zoom.x(x).scaleExtent([1, maxZoom]).size([width, height]);

    $('#jumpDiv').show();
    if (opt_skipJumping) {
      return;
    }

    handleZoom();

    // Zoom into a given position because the overall zoom isn't supported
    var initialPosition = currentSequence['length'] / 2;
    jumpToPosition(initialPosition);
  };

  var makeImageUrl = function(name) {
    return '/static/img/' + name + '.png';
  };

  var updateSequences = function() {
    var sequencesDiv = $("#sequences").empty();

    $.each(sequences, function(i, sequence) {
      var title, imageUrl;

      if (sequence.name.indexOf('X') != -1) {
        title = 'Chromosome X';
        imageUrl = makeImageUrl('chrX');
      } else if (sequence.name.indexOf('Y') != -1) {
        title = 'Chromosome Y';
        imageUrl = makeImageUrl('chrY');
      } else {
        var number = sequence.name.replace(/\D/g,'');
        if (!!number && number < 23) {
          title = 'Chromosome ' + number;
          imageUrl = makeImageUrl('chr' + number);
        } else {
          title = sequence.name;
        }
      }

      var summary = xFormat(sequence['length']) + " bases";

      var sequenceDiv = $('<div/>', {'class': 'sequence',
        id: sequenceId(sequence.name)}).appendTo(sequencesDiv);
      if (imageUrl) {
        $('<img>', {'class': 'pull-left', src: imageUrl}).appendTo(sequenceDiv);
      }
      $('<div>', {'class': 'title'}).text(title).appendTo(sequenceDiv);
      $('<div>', {'class': 'summary'}).text(summary).appendTo(sequenceDiv);

      sequenceDiv.click(function() {
        selectSequence(sequence);
      });
    });

    $('#jumpDiv').show();
  };

  var updateDisplay = function(opt_skipReadQuery) {
    var scaleLevel = getScaleLevel();
    var summaryView = scaleLevel < 2;
    var coverageView = scaleLevel == 2 || scaleLevel == 3;
    var readView = scaleLevel == 4 || scaleLevel == 5;
    var baseView = scaleLevel > 5;

    var reads = readGroup.selectAll(".read");
    var outlines = reads.selectAll(".outline");
    var letters = reads.selectAll(".letter");

    toggleVisibility(unsupportedMessage, summaryView || coverageView);
    toggleVisibility(outlines, readView);
    toggleVisibility(letters, baseView);
    toggleVisibility(positionIndicator, baseView);

    var sequenceStart = parseInt(x.domain()[0]);
    var sequenceEnd = parseInt(x.domain()[1]);

    if (!opt_skipReadQuery && (readView || baseView)) {
      queryReads(sequenceStart, sequenceEnd);
    }

    // TODO: Bring back coverage and summary views
    if (readView) {
      outlines.attr("points", outlinePoints);

    } else if (baseView) {
      letters.style('display', function(data, i) {
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
      var indicatorX = x(positionIndicator.attr('position')) + textWidth/2 - 2;
      positionIndicator.attr('transform', 'translate(' + indicatorX + ',0)');
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
    var barHeight = Math.min(30, Math.max(2,
        (height - margin * 3) / yTracksLength - 5));

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

    $("<h4/>").text("Read: " + read.name).appendTo(readDiv);
    var dl = $("<dl/>").addClass("dl").appendTo(readDiv);

    var addField = function(title, field) {
      if (field) {
        $("<dt/>").text(title).appendTo(dl);
        $("<dd/>").text(field).appendTo(dl);
      }
    };

    addField("Position", read.position);
    addField("Length", read.length);
    addField("Mate position", read.matePosition);
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

  var clearReads = function() {
    if (readGroup) {
      readGroup.selectAll('.read').remove();
    }
    if (readDiv) {
      readDiv.hide();
    }
  };

  var setReads = function(reads) {
    var yTracks = [];
    var readIds = {};
    readStats = {};
    $.each(reads, function(readi, read) {
      // Interpret the cigar
      // TODO: Compare the read against a reference as well
      if (!read.id) {
        read.id = read.name + read.position + read.cigar;
      }
      if (readIds[read.id]) {
        showError('There is more than one read with the ID ' + read.id +
            ' - this will cause display problems');
      }
      readIds[read.id] = true;

      read.name = read.name || read.id;
      read.readPieces = [];
      read.index = readi;
      if (!read.cigar) {
        // Hack for unmapped reads
        read.length = 0;
        read.end = read.position;
        return;
      }

      var addLetter = function(type, letter, qual) {
        var basePosition = read.position + read.readPieces.length;
        readStats[basePosition] = readStats[basePosition] || [];
        readStats[basePosition].push(letter);
        read.readPieces.push({
          'letter' : letter,
          'rx': basePosition,
          'qual': qual,
          'cigarType': type
        });
      };

      var bases = read.originalBases.split('');
      var baseIndex = 0;
      var matches = read.cigar.match(cigarMatcher);

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
              addLetter(baseType, bases[baseIndex],
                  read.baseQuality.charCodeAt(baseIndex) - 33);
              baseIndex++;
            }
            break;
        }
      }

      read.length = read.readPieces.length;
      read.end = read.position + read.length;
      // The 5th flag bit indicates this read is reversed
      read.reverse = (read.flags >> 4) % 2 == 1;

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

    readGroup.selectAll('.read').remove();
    if (reads.length == 0) {
      // Update the data behind the graph
      return;
    }

    var reads = readGroup.selectAll(".read").data(reads,
        function(read){ return read.id; });

    reads.enter().append("g")
        .attr('class', 'read')
        .attr('index', function(read, i) { return read.index; })
        .on("mouseover", showRead)
        .on("mouseout", hideRead);

    var outlines = reads.selectAll('.outline')
        .data(function(read, i) { return [read];});
    outlines.enter().append('polygon')
        .attr('class', 'outline');

    var baseView = getScaleLevel() > 5;
    if (baseView) {
      var letters = reads.selectAll(".letter")
          .data(function(read, i) { return read.readPieces; });

      letters.enter().append('text')
          .attr('class', 'letter')
          .style('opacity', function(data, i) { return opacity(data.qual); })
          .text(function(data, i) { return data.letter; });
    }
    reads.exit().remove();
    updateDisplay(true);
  };

  var makeQueryParams = function(sequenceStart, sequenceEnd, type) {
    var queryParams = {};
    queryParams.readsetIds = readsetIds.join(',');
    queryParams.backend = readsetBackend;
    queryParams.type = type;
    queryParams.sequenceName = currentSequence.name;
    queryParams.sequenceStart = parseInt(sequenceStart);
    queryParams.sequenceEnd = parseInt(sequenceEnd);
    return queryParams;
  };

  var queryReads = function(sequenceStart, sequenceEnd) {
    queryApi(sequenceStart, sequenceEnd, 'reads', setReads);
  };

  // TODO: Make this cleaner
  var queryApi = function(sequenceStart, sequenceEnd, type, handler) {
    var queryParams = makeQueryParams(sequenceStart, sequenceEnd, type);

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
          } else {
            spinner.style('display', 'none');
          }
        })
        .fail(function() {
          spinner.style('display', 'none');
        });
  };

  this.hasReadset = function(id) {
    return $.inArray(id, readsetIds) != -1;
  };

  // TODO: Support multiple readsets
  this.addReadset = function(backend, id, sequenceData) {
    readsetBackend = backend;
    readsetIds = [id];
    if (readsetIds.length == 1) {
      sequences = sequenceData;
      updateSequences();
      $('#chooseReadsetMessage').hide();
      clearReads();
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
