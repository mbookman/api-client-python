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
  var margin = 40;

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
  // Format: {id, type, backend, sequences}
  var setObjects = [];
  var mergedSequences = [];
  var currentSequence = null;
  var readStats = {}; // Map from position to stat information
  var xhrTimeout = null;

  var readTrackLength = 0;
  var callsetTrackLength = 0;

  // Dom elements
  var svg, axisGroup, readGroup, readDiv, variantDiv, spinner = null;
  var hoverline, positionIndicator, positionIndicatorBg, positionIndicatorText;

  var updateHeight = function() {
    var totalTracks = readTrackLength + callsetTrackLength;
    height = totalTracks * textHeight + 100;
    height = Math.max(height, 450);

    y.range([margin, height - margin*2]).domain([totalTracks, -1]);
    $('#graph').height(height);

    // TODO: Reduce duplicate height setting code
    axisGroup.attr('transform', 'translate(0,' + (height - margin) + ')');
    positionIndicatorBg.attr('height', height - margin);
    positionIndicatorText.attr('y', height - margin - textHeight);
    hoverline.attr("y2", height);

    zoom.size([width, height]);

    return totalTracks;
  };

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
    variantDiv = $('#variantDiv');


    // Svg init
    // Reads Axis
    axisGroup = svg.append('g')
        .attr('transform', 'translate(0,' + (height - margin) + ')')
        .attr('class', 'axis');

    // Unsupported message
    unsupportedMessage = addText(svg, 'This zoom level is coming soon!',
        width/2, height/4);

    // Hover line
    hoverline = svg.append("line")
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
    positionIndicatorBg = positionIndicator.append('rect')
        .attr('class', 'positionIndicator background')
        .attr('x', 0).attr('y', 0)
        .attr('width', textWidth * 1.5).attr('height', height - margin);
    positionIndicatorText = positionIndicator.append('text')
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

  var chrLocation = /^(.*):(\d*)$/;
  this.jumpGraph = function(location) {
    var jumpResults = $("#jumpResults").empty();

    // Locations of the form chr:position
    if (chrLocation.test(location)) {
      var matches = chrLocation.exec(location);
      jumpToPosition(parseInt(matches[2].replace(/,/g, '')), matches[1], true);
      return;
    }

    var position = parseInt(location.replace(/,/g, ''));
    // Numbered locations
    if (position > 0) {
      jumpToPosition(position, null, true);
      return;
    }

    // Queried locations
    showMessage('Looking up location: ' + location);

    $.getJSON('api/snps', {snp: location}).done(function(res) {
      if (res.snps.length == 0) {
        showMessage('Could not find location: ' + location);

      } else {
        $.each(res.snps, function(i, snp) {
          var listItem = $('<a/>', {'href': '#', 'class': 'list-group-item'})
              .appendTo(jumpResults).click(function() {
                if (snp.position) {
                  jumpToPosition(snp.position, snp.chr, true, snp.name);
                } else {
                  showMessage('Could not find a position for this snp.' +
                      ' Check SNPedia for more information.');
                }
                return false;
              });
          $('<span>', {'class': 'title'}).text(snp.name + ' ')
              .appendTo(listItem);
          $('<a>', {'href': snp.link, 'target': '_blank'}).text('SNPedia')
              .appendTo(listItem).click(function() {
                window.open(snp.link);
                return false;
              });
          if (snp.position) {
            $('<div>').text('chr ' + snp.chr + ' at ' + xFormat(snp.position))
                .appendTo(listItem);
          }
        });

        $("#jumpResults .list-group-item").click();
      }
    });
  };

  var fuzzyFindSequence = function(chr) {
    var actualNames = _.pluck(mergedSequences, 'name');
    var possibleNames = [chr, "chr" + chr];
    possibleNames = _.intersection(actualNames, possibleNames);

    if (possibleNames.length > 0) {
      return _.findWhere(mergedSequences, {name: possibleNames[0]});
    }
    return null;
  };

  var jumpToPosition = function(position, chr, baseView, snp) {
    if (chr) {
      // Update our sequence
      var sequence = fuzzyFindSequence(chr);
      if (!sequence) {
        showError('This data doesn\'t have the sequence ' + chr +
          '. Please try a different position.');
        return;
      }

      selectSequence(sequence);
    }

    var currentLength = currentSequence['length'];
    if (position > currentLength) {
      showError('This sequence only has ' + xFormat(currentLength) +
          ' bases. Please try a smaller position.');
      return;
    }

    positionIndicator.attr('position', baseView ? position : -1)
        .attr('snp', snp || '').attr('loaded', '');
    positionIndicator.selectAll('text')
        .text(baseView ? (snp || xFormat(position)) : '');

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

  var selectSequence = function(sequence) {
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
  };

  var makeImageUrl = function(name) {
    return '/static/img/' + name + '.png';
  };

  var getSequenceName = function(sequence) {
    return sequence.name;
  };

  var updateSequences = function() {
    var sequencesDiv = $("#sequences").empty();
    var allSequences = _.flatten(_.pluck(setObjects, 'sequences'));
    var indexedSequences = _.countBy(allSequences, getSequenceName);
    mergedSequences = _.uniq(allSequences, false, getSequenceName);

    $.each(mergedSequences, function(i, sequence) {
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
      var setCount = indexedSequences[sequence.name];

      var sequenceDiv = $('<div/>', {'class': 'sequence',
        id: sequenceId(sequence.name)}).appendTo(sequencesDiv);
      if (imageUrl) {
        $('<img>', {'class': 'pull-left', src: imageUrl}).appendTo(sequenceDiv);
      }
      $('<div>', {'class': 'title'}).text(title).appendTo(sequenceDiv);
      if (setObjects.length != setCount) {
        $('<div>', {'class': 'badge pull-right'}).text(setCount)
          .appendTo(sequenceDiv);
      }
      $('<div>', {'class': 'summary'}).text(summary).appendTo(sequenceDiv);

      sequenceDiv.click(function() {
        switchToLocation(sequence.name + ":" + Math.floor(sequence['length'] / 2));
      });
    });

    $('#jumpDiv').show();
  };

  var updateDisplay = function(opt_skipDataQuery) {
    var maxY = updateHeight();

    var scaleLevel = getScaleLevel();
    var summaryView = scaleLevel < 2;
    var coverageView = scaleLevel == 2 || scaleLevel == 3;
    var readView = scaleLevel == 4 || scaleLevel == 5;
    var baseView = scaleLevel > 5;

    var reads = readGroup.selectAll(".read");
    var variants = readGroup.selectAll(".variant");

    var readOutlines = reads.selectAll(".outline");
    var readLetters = reads.selectAll(".letter");
    var variantOutlines = variants.selectAll(".outline");
    var variantLetters = variants.selectAll(".letter");

    toggleVisibility(unsupportedMessage, summaryView || coverageView);
    toggleVisibility(readOutlines, readView);
    toggleVisibility(variantOutlines, readView);
    toggleVisibility(readLetters, baseView);
    toggleVisibility(variantLetters, baseView);
    toggleVisibility(positionIndicator, baseView);

    var sequenceStart = parseInt(x.domain()[0]);
    var sequenceEnd = parseInt(x.domain()[1]);

    if (!opt_skipDataQuery && (readView || baseView)) {
      queryData(sequenceStart, sequenceEnd);
    }

    // TODO: Bring back coverage and summary views
    if (readView) {
      // Read outlines
      readOutlines.attr("points", outlinePoints);

      // Variant outlines
      variantOutlines
        .attr("x1", function(data) { return x(data.rx) + textWidth; })
        .attr("x2", function(data) { return x(data.rx) + textWidth; })
        .attr("y1", function(data) { return y(maxY - data.ry); })
        .attr("y2", function(data) { return y(maxY - data.ry) + textHeight; });

    } else if (baseView) {
      // Read bases
      readLetters.style('display', function(data, i) {
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

      // Red position highlight box
      var position = positionIndicator.attr('position');
      var indicatorX = x(position) + textWidth/2 - 2;
      positionIndicator.attr('transform', 'translate(' + indicatorX + ',0)');

      // Read base stats
      var snp = positionIndicator.attr('snp');
      var loaded = positionIndicator.attr('loaded');
      if (!loaded && snp && readStats[position]) {
        positionIndicator.attr('loaded', true);
        var alleles = getAlleles(snp, readStats[position]);
        $.getJSON('api/alleles', alleles).done(function(res) {
          if (res.summary) {
            var text = positionIndicator.selectAll('text').text(res.name + " ");
            text.append('a').attr('xlink:href', res.link)
                .attr('target', '_blank')
                .text(res.repute + ' - ' + res.summary);
          }
        });
      }

      // Variants
      variantLetters.style('display', function(data, i) {
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
            return y(maxY - data.ry) + textHeight/2;
          });
    }
  };

  var getAlleles = function(snp, stats) {
    var counts = _.countBy(stats);

    // First strip out low values
    var totalCount = _.reduce(counts, function(memo, key) {
      return memo + key;
    }, 0);
    var minCount = totalCount * .2;
    var bases = _.compact(_.map(counts, function(key, value) {
      return key > minCount ? value : '';
    }));

    var a1 = bases[0];
    var a2 = bases.length == 1 ? a1 : bases[1];
    return {'snp': snp, 'a1': a1, 'a2': a2};
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

  // Hover details
  var addField = function(dl, title, field) {
    if (field) {
      $("<dt/>").text(title).appendTo(dl);
      $("<dd/>").text(field).appendTo(dl);
    }
  };

  var showRead = function(read, i) {
    readDiv.empty().show();

    $("<h4/>").text("Read: " + read.name).appendTo(readDiv);
    var dl = $("<dl/>").addClass("dl").appendTo(readDiv);

    addField(dl, "Position", read.position);
    addField(dl, "Length", read.length);
    addField(dl, "Mate position", read.matePosition);
    addField(dl, "Mapping quality", read.mappingQuality);
    addField(dl, "Cigar", read.cigar);

    d3.select(this).classed("selected", true);
  };

  var showVariant = function(data) {
    variantDiv.empty().show();
    var variant = data.variant;
    var call = variant.calls[data.callIndex];

    $("<h4/>").text("Variant: " + variant.names.join(", "))
      .appendTo(variantDiv);
    var dl = $("<dl/>").addClass("dl").appendTo(variantDiv);

    addField(dl, "Callset name", call.callsetName);
    addField(dl, "Position", variant.position);

    d3.select(this).classed("selected", true);
  };

  var deselectObject = function(read, i) {
    d3.select(this).classed("selected", false);
  };

  var setYOrder = function(read, yOrder) {
    read.yOrder = yOrder;

    for (var r = 0; r < read.readPieces.length; r++) {
      read.readPieces[r].ry = read.yOrder;
    }
  };

  var getGenotype = function(variant, call) {

    // TODO: Switch to genotype field when its ready
    var genotype = [];
    var splits = call.info["GT"][0].split(/[|\/]/);
    for (var g = 0; g < splits.length; g++) {
      var allele = splits[g];
      if (allele == 0) {
        genotype.push(variant.referenceBases);
      } else {
        genotype.push(variant.alternateBases[allele - 1]);
      }
    }

    return genotype;
  };

  var setVariants = function(variants) {
    var data = [];
    var maxCalls = 0;

    $.each(variants, function(i, variant) {
      maxCalls = Math.max(variant.calls.length, maxCalls);

      $.each(variant.calls, function(callIndex, call) {
        data.push({
          id: variant.id + call.callsetId,
          rx: variant.position,
          ry: callIndex,
          genotype: getGenotype(variant, call).join(";"),
          variant: variant,
          callIndex: callIndex
          // TODO: Use likelihood for opacity
        });
      });

    });

    var variantDivs = readGroup.selectAll(".variant").data(data,
        function(data){ return data.id; });

    variantDivs.enter().append("g")
        .attr('class', 'variant')
        .on("mouseover", showVariant)
        .on("mouseout", deselectObject);

    var outlines = variantDivs.selectAll('.outline')
        .data(function(variant, i) { return [variant];});
    outlines.enter().append('line').attr('class', 'outline');

    var baseView = getScaleLevel() > 5;
    if (baseView) {
      var bases = variantDivs.selectAll(".letter")
          .data(function(variant, i) { return [variant];});

      bases.enter().append('text')
          .attr('class', 'letter')
          .text(function(data, i) { return data.genotype; });
    }

    variantDivs.exit().remove();

    callsetTrackLength = maxCalls;
    updateDisplay(true);
  };

  var setReads = function(reads) {
    var yTracks = [];
    var readIds = {};
    readStats = {};
    $.each(reads, function(readi, read) {
      // Interpret the cigar
      // TODO: Compare the read against a reference as well

      // TODO: Nobody is handing back actually unique ids right now
      read.id = (read.id || read.name) + read.position + read.cigar;
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

    readTrackLength = yTracks.length;

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
        .on("mouseout", deselectObject);

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
    var sets = _.where(setObjects, {type: type});
    if (sets.length == 0) {
      return null;
    }

    var setIds = _.pluck(sets, 'id');
    var setBackends = _.uniq(_.pluck(sets, 'backend'));
    if (setBackends.length > 1) {
      showError("Currently all sets of the same type " +
        "must be from the same backend");
      return null;
    }

    var queryParams = {};
    queryParams.setIds = setIds.join(',');
    queryParams.backend = setBackends[0];
    queryParams.sequenceName = currentSequence.name;
    queryParams.sequenceStart = parseInt(sequenceStart);
    queryParams.sequenceEnd = parseInt(sequenceEnd);
    return queryParams;
  };

  var queryData = function(start, end) {
    var readParams = makeQueryParams(start, end, READSET_TYPE);
    var variantParams = makeQueryParams(start, end, CALLSET_TYPE);

    if (xhrTimeout) {
      clearTimeout(xhrTimeout);
    }

    xhrTimeout = setTimeout(function() {
      if (readParams) {
        callXhr('/api/reads', readParams, setReads);
      } else {
        setReads([]);
      }
      if (variantParams) {
        callXhr('/api/variants', variantParams, setVariants);
      } else {
        setVariants([]);
      }
    }, 500);
  };

  var callXhr = function(url, queryParams, handler, opt_data) {
    spinner.style('display', 'block');
    $.getJSON(url, queryParams)
        .done(function(res) {
          var data = (opt_data || []).concat(res.reads || res.variants || []);
          handler(data);

          if (res.nextPageToken) {
            queryParams['pageToken'] = res.nextPageToken;
            callXhr(url, queryParams, handler, data);
          } else {
            spinner.style('display', 'none');
          }
        })
        .fail(function() {
          spinner.style('display', 'none');
        });
  };

  this.getCurrentSequence = function() {
    return currentSequence.name;
  }

  this.updateSets = function(setData) {
    if (_.isEqual(setObjects, setData)) {
      return;
    }

    setObjects = setData;
    updateSequences();

    if (setObjects.length == 0) {
      $('#chooseSetMessage').show();
      $('#graph').hide();
      $('#jumpDiv').hide();

      readDiv && readDiv.hide();
      variantDiv && variantDiv.hide();

    } else {
      $('#chooseSetMessage').hide();
    }
  };
};
