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
"use strict";

/*
 * Return whether two ranges overlap at all.
 */
function overlaps(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
};

/*
 * A data structure for keeping track of all the reads we have loaded.
 * The objects in the cache have already been processed, and so must have
 * their computed fields like end and readPieces (rather than the raw fields
 * like originalBases).
 */
var readCache = new function() {
  /*
   * Whether we're caching base data.  All reads stored into the cache
   * should have the 'originalBases' property if and only if this is true.
   * When this changes from true to false, all cached base data is cleared.
   * But when this changes from false to true, reads without base data are
   * preserved until they can be updated to include the base data.
   */
  var wantBases = false;
  this.__defineGetter__("wantBases", function() { return wantBases; });

  /*
   * The range [start,end) of sequence positions for which we are caching reads.
   * There should never be any reads inside the cache that lie entirely outside
   * this range.
   */
  var start = 0;
  var end = 0;
  this.__defineGetter__("start", function() { return start; });
  this.__defineGetter__("end", function() { return end; });

  // A map from read ID to read object.
  var readsById = {};

  /*
   * Returns all the reads in the cache.
   */
  this.getReads = function() {
    return d3.values(readsById);
  };

  /*
   * Clear the entire cache.
   */
  this.clear = function() {
    wantBases = false;
    start = 0;
    end = 0;
    readsById = {};
  };

  /*
   * Reset the cache range, clearing elements / base data that are no longer
   * necessary.
   */
  this.setRange = function(newStart, newEnd, newBases) {
    // Discard any cached reads that are now entirely outside our desired window.
    $.each(readsById, function(id, read) {
      if (!overlaps(read.position, read.end, newStart, newEnd)) {
        delete readsById[id];
      } else if (!newBases) {
        read.readPieces = [];
      }
    });

    start = newStart;
    end = newEnd;
    wantBases = newBases;
  };

  /*
   * Return whether the cache already contains a read with the specified
   * id and base status.
   */
  this.hasRead = function(id, bases) {
    var existingRead = readsById[id];
    if (existingRead && bases == ('readPieces' in existingRead)) {
      return true;
    }
    return false;
  };

  /*
   * Adds the supplied read to the cache if it's still relevant, assigning a
   * free yOrder property to thr read.
   * If a read with this ID already exists, updates the read (eg. to add
   * or remove base data) without changing the yOrder.
   */
  this.addOrUpdateRead = function(read) {
    // The read should have already been processed.
    assert('end' in read);
    assert('readPieces' in read);
    assert(!('originalBases' in read));

    // If we don't actually want this read anymore, do nothing.
    if (!overlaps(read.position, read.end, start, end)
            || (read.readPieces.length > 0) != wantBases) {
      return;
    }

    var existingRead = readsById[read.id];
    if (existingRead) {
      read.yOrder = existingRead.yOrder;
    } else {
      // Find the lowest available track for this read.
      // TODO: Use a more efficient algorithm.
      var trackUnavailable = [];
      $.each(readsById, function(id, read2) {
        if (overlaps(read.position, read.end, read2.position, read2.end)) {
          trackUnavailable[read2.yOrder] = true;
        }
      });
      for(read.yOrder = 0; trackUnavailable[read.yOrder]; read.yOrder++) {
      }
    }
    readsById[read.id] = read;
  };
};

