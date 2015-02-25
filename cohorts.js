/*
 * Copyright 2012 Brett Slatkin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var GROUP_TYPE_COLUMN = 0;
var GROUP_VALUE_COLUMN = 1;
var DAY_COLUMN = 2;


function getSelectedGroupType() {
  return $('input:radio[name=\'chart1\']:checked').val();
}


function getTotalGroupValues() {
  return $('.group-value-checkbox').length;
}


function getSelectedGroupValues() {
  return $.makeArray(
    $('.group-value-checkbox:checked').map(function(index, el) {
      return $(el).val();
    }));
}


function getEnabledStateNames() {
  return $.makeArray($('.legend-row:not(.disabled)').map(
    function(i, n) {
      return $(n).data('stateName');
  }));
}


function getIsNormalized() {
  return $('input:checkbox[name=\'normalize\']:checked').val();
}


function getPeriod() {
  return $('input:radio[name=\'period\']:checked').val();
}


function getPointType() {
  return $('input:radio[name=\'point_type\']:checked').val();
}

function getIncludedSigns() {
  return $('input:radio[name=\'sign\']:checked').val();
}


// Keep track of the last checked state for group values so we can preserve
// their selection state.
var LAST_GROUP_VALUES = {};


function createGroupTypeRadios(groupTypes) {
  var vizDiv = $('#viz_group_type1');
  vizDiv.empty();

  // Guess that whichever group type has only one value and that value is
  // empty will be the topline data.
  var checkedType = null;
  $.each(groupTypes, function(key, value) {
    if (value.length == 1 && value[0] === '') {
      checkedType = key;
    }
  });

  // Sort the group names so they're in alphabetical order.
  var groupTypesSorted = Object.keys(groupTypes);
  groupTypesSorted.sort();

  // If there is no default type with the top-line then use the first one.
  if (!checkedType) {
    checkedType = groupTypesSorted[0];
  }

  var i = 0;
  $.each(groupTypesSorted, function(index, key) {
    var value = groupTypes[key];
    var radioId = 'group_type_radio1_' + (i++);
    var useRadio = $('<input type="radio">')
        .addClass('group-type-radio')
        .attr('id', radioId)
        .attr('name', 'chart1')
        .attr('value', key);

    // Select the default group type.
    if (!!checkedType && checkedType === key) {
      useRadio.attr('checked', 'checked');
    }

    var container = $('<div>');
    container.append(useRadio);
    container.append($('<label>').attr('for', radioId).text(key));

    vizDiv.append(container);
  });

  // Register event handlers
  $('.group-type-radio').click(function() {
    createGroupValueCheckboxes(groupTypes);
    $(document).trigger('cohorts.viz', 'group-type');
  });
}


function createGroupValueCheckboxes(groupTypes) {
  var type = getSelectedGroupType();
  var values = groupTypes[type];
  if (!values) {
    $.error('Bad group type: ' + type);
  }

  var valuesDiv = $('#viz_group_value1');
  valuesDiv.empty();

  // Special case for group types that only have a single, empty value.
  if (values.length == 1 && values[0] === '') {
    return;
  }

  // Sort values alphabetically!
  values.sort();

  var valuesHeader = $('<div class="section-header">')
      .text('Included group values');

  // Toggles for checking all boxes.
  var selectionToggle = $('<span class="selection-toggle">')
    .append(' &ndash; ');
  $('<a href="javascript:void(0)">')
      .text('all')
      .click(function() {
        $('.group-value-checkbox').prop('checked', true);
        // Clear the set of last group values selected.
        LAST_GROUP_VALUES = {};
        $(document).trigger('cohorts.viz');
      })
      .appendTo(selectionToggle);
  selectionToggle.append(' or ');
  $('<a href="javascript:void(0)">')
      .text('none')
      .click(function() {
        $('.group-value-checkbox').prop('checked', false);
        // Clear the set of last group values selected.
        LAST_GROUP_VALUES = {};
        $(document).trigger('cohorts.viz');
      })
      .appendTo(selectionToggle);
  selectionToggle.appendTo(valuesHeader);
  valuesHeader.appendTo(valuesDiv);

  // Checkboxes for each group value
  var sectionContent = $('<div class="section-content">');
  var i = 0;
  $.each(values, function(key, value) {
    var checkboxId = 'group_value_checkbox1_' + (i++);
    var container = $('<div>');
    container.append(
        $('<input type="checkbox" class="group-value-checkbox" checked>')
        .attr('value', value)
        .attr('id', checkboxId));
    container.append(
        $('<label>').attr('for', checkboxId).text(value));
    sectionContent.append(container);
  });
  valuesDiv.append(sectionContent);

  // Register event handlers
  $('.group-value-checkbox').click(function(e) {
    // When something is explicitly checked or unchecked, preserve its state so
    // it will be restored if the group type is changed later. This will be
    // cleared by selecting None or All.
    var checkbox = $(e.target);
    LAST_GROUP_VALUES[checkbox.val()] = checkbox.attr('checked') === 'checked';

    $(document).trigger('cohorts.viz');
  });

  // Pre-check those group values preserved from before. Any values that were
  // previously removed will be defaulted to unchecked. Thus, only explicit
  // checking is preserved.
  if (Object.keys(LAST_GROUP_VALUES).length > 0) {
    $('.group-value-checkbox').attr('checked', false);

    $.each(LAST_GROUP_VALUES, function(key, value) {
      $('.group-value-checkbox[value="' + key + '"]').attr('checked', value);
    });
  }
}


function createLegend(rowsWithHeader) {
  var columnNames = rowsWithHeader[0].slice(3);
  var container = $('#viz_legend');
  container.empty();

  var legendTable = $('<div class="legend-table inactive">');

  var color = d3.scale.category20();
  $.each(columnNames, function(index, value) {
    var row = $('<div class="legend-row">')
        .attr('data-state-name', value)
        .click(function(e) {
          row.toggleClass('disabled');
          $(document).trigger('cohorts.viz');
        });
    $('<div class="legend-box">')
        .attr('style', 'background-color: ' + color(index))
        .appendTo(row);
    $('<div class="legend-label">')
        .text(value)
        .appendTo(row);
    $('<div class="legend-value">')
        .appendTo(row);
    $('<div class="legend-percentage">')
        .appendTo(row);
    // Reverse order to match graph stacking.
    legendTable.prepend(row);
  });

  // Add a row for the totals
  var row = $('<div class="legend-total">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .text('Total')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  legendTable.append(row);

  // Add row for cumulative percentage upwards
  var calcContainer = $('#calc_legend');
  calcContainer.empty();
  var calcTable = $('<div class="legend-table">');

  var row = $('<div class="legend-cumulative-up">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('&#x2211;&uarr; / &#x2211;&#x2195;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for cumulative percentage downwards
  var row = $('<div class="legend-cumulative-down">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('&#x2211;&darr; / &#x2211;&#x2195;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for cumulative percentage left
  var row = $('<div class="legend-cumulative-left">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('X / &#x2211;&larr;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for cumulative percentage right
  var row = $('<div class="legend-cumulative-right">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('X / &#x2211;&rarr;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for cumulative percentage horizontally
  var row = $('<div class="legend-cumulative-horizontal">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('X / &#x2211;&#x2194;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for cumulative percentage left over percental horizontal
  var row = $('<div class="legend-cumulative-left-ratio">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('&#x2211;&larr; / &#x2211;&#x2194;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for cumulative percentage right over percental horizontal
  var row = $('<div class="legend-cumulative-right-ratio">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('&#x2211;&rarr; / &#x2211;&#x2194;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for x over max
  var row = $('<div class="legend-max-ratio">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('X / Max &#x2194;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  // Add row for 1 - (x over max)
  var row = $('<div class="legend-complement-max-ratio">');
  $('<div class="legend-box">').appendTo(row);
  $('<div class="legend-label">')
      .html('1 - X / Max &#x2194;')
      .appendTo(row);
  $('<div class="legend-value">')
      .appendTo(row);
  $('<div class="legend-percentage">')
      .appendTo(row);
  calcTable.append(row);

  calcContainer.append(calcTable);
  container.append(legendTable);
}

// Resets the info panel back to the default state.
function clearInfoPanel() {
  $('.legend-row').removeClass('highlighted');
  $('.legend-value').text('');
  $('.legend-percentage').text('');
  $('.legend-target').attr('data-target', '').text('');
  $('.legend-table').addClass('inactive');

  // Reset the state of all cohort bars to unhighlighted if
  // we're clearing the info panel.
  $('rect[class="bar"]').attr('fill-opacity', '1');
}


// Resets the info panel back to a state where the mouse isn't hovering
// over part of the graph. The column selected should be sticky, but
// everything else should be reset.
function clearInfoPanelMouseDetail() {
  $('.legend-row').removeClass('highlighted');

  var calcLegend = $('#calc_legend');
  calcLegend.find('.legend-cumulative-up>.legend-value').text('');
  calcLegend.find('.legend-cumulative-up>.legend-percentage').text('');
  calcLegend.find('.legend-cumulative-down>.legend-value').text('');
  calcLegend.find('.legend-cumulative-down>.legend-percentage').text('');
  calcLegend.find('.legend-cumulative-left>.legend-value').text('');
  calcLegend.find('.legend-cumulative-left>.legend-percentage').text('');
  calcLegend.find('.legend-cumulative-right>.legend-value').text('');
  calcLegend.find('.legend-cumulative-right>.legend-percentage').text('');
  calcLegend.find('.legend-cumulative-horizontal>.legend-value').text('');
  calcLegend.find('.legend-cumulative-horizontal>.legend-percentage').text('');
  calcLegend.find('.legend-cumulative-left-ratio>.legend-value').text('');
  calcLegend.find('.legend-cumulative-left-ratio>.legend-percentage').text('');
  calcLegend.find('.legend-cumulative-right-ratio>.legend-value').text('');
  calcLegend.find('.legend-cumulative-right-ratio>.legend-percentage').text('');
  calcLegend.find('.legend-max-ratio>.legend-value').text('');
  calcLegend.find('.legend-max-ratio>.legend-percentage').text('');
  calcLegend.find('.legend-complement-max-ratio>.legend-value').text('');
  calcLegend.find('.legend-complement-max-ratio>.legend-percentage').text('');
}


function handleInfoPanel(e) {
  if (e.type == 'mouseenter') {
    var el = $(e.currentTarget);
    var cohort = el.attr('data-cohort');
    var stateName = el.attr('data-state-name');
    updateInfoPanel(cohort, stateName);
  } else {
    // Mouse out
    clearInfoPanelMouseDetail();
  }
}


function updateInfoPanel(cohort, highlightStateName) {
  var legend = $('#viz_legend');
  if (!cohort) {
    // Cohort wasn't supplied. Use whatever value is in the legend.
    cohort = $('.legend-target').attr('data-target');
    if (!cohort) {
      return;
    }
  }

  // Reset the state of the last cohort bars.
  var lastCohort = $('.legend-target').attr('data-target');
  if (lastCohort != cohort) {
    // Reset the state of the old cohort bars to unhighlighted if
    // we're entering a new bar. Otherwise, leave the last bar
    // highlighted.
    $('rect[data-cohort="' + lastCohort + '"]').attr('fill-opacity', '1');
  }

  var cohortBars = $('rect[data-cohort="' + cohort + '"]');
  cohortBars.attr('fill-opacity', '0.8');

  // Reset the legend
  $('.legend-target').attr('data-target', cohort);
  $('.legend-target').text(' \u2013 ' + cohort);
  $('.legend-table').removeClass('inactive');

  // Count up totals for the highlighted column. This iterates starting at the
  // bottom item in the legend up to the top of the chart, vertically.
  var total = 0;
  var sumUp = 0;
  var before = true;
  var sumDown = 0;
  var highlightedCount = 0;
  $.each(cohortBars, function(index, value) {
    var el = $(value);
    var stateCount = parseInt(el.attr('data-state-count'));
    total += stateCount;

    // Cumulative percentages. Include the point itself.
    var stateName = el.attr('data-state-name');
    if (stateName == highlightStateName) {
      before = false;
      highlightedCount = stateCount;
      sumUp += stateCount;
      sumDown += stateCount;
    } else if (before) {
      sumDown += stateCount;
    } else {
      sumUp += stateCount;
    }
  });
  legend.find('.legend-total>.legend-value').text(total);

  // Count up totals for the highlighted state name horizontally across cohorts.
  var sumLeft = 0;
  var sumHorizontal = 0;
  var maxHorizontal = 0;
  if (!!highlightStateName) {
    var highlightedCohortTime = parseDate(cohort);
    var allStateBars = $('rect[data-state-name="' + highlightStateName + '"]');
    $.each(allStateBars, function(index, value) {
      var el = $(value);
      if (el.attr('width') == 0) {
        // Ignore bars hidden by weekly or monthly grouping.
        return;
      }
      var cohort = parseDate(el.attr('data-cohort'));
      var stateCount = parseInt(el.attr('data-state-count'));
      sumHorizontal += stateCount;
      if (cohort <= highlightedCohortTime) {
        sumLeft += stateCount;
      }
      if (stateCount > maxHorizontal) {
        maxHorizontal = stateCount;
      }
    });
  }

  // Update each legend item to match the highlighted bar
  var format = d3.format('%');
  $.each(cohortBars, function(index, value) {
    var el = $(value);
    var stateName = el.attr('data-state-name');
    var stateCount = el.attr('data-state-count') || 0;
    var percent = total ? stateCount / total : 0;
    var legendRow = legend
        .find('.legend-row[data-state-name="' + stateName + '"]');
    legendRow.find('.legend-value').text(stateCount);
    legendRow.find('.legend-percentage').text(format(percent));

    // Highlight this row if necessary.
    if (highlightStateName == stateName) {
      legendRow.addClass('highlighted');
    }
  });

  // Update cumulative percentages, or clear them if no state is highlighted.
  if (!!highlightStateName) {
    var calcLegend = $('#calc_legend');
    calcLegend.find('.legend-cumulative-up>.legend-value').text(sumUp);
    calcLegend.find('.legend-cumulative-up>.legend-percentage')
      .text(format(total ? sumUp / total : 0));

    calcLegend.find('.legend-cumulative-down>.legend-value').text(sumDown);
    calcLegend.find('.legend-cumulative-down>.legend-percentage')
      .text(format(total ? sumDown / total : 0));

    calcLegend.find('.legend-cumulative-left>.legend-value').text(sumLeft);
    calcLegend.find('.legend-cumulative-left>.legend-percentage')
      .text(format(sumLeft ? highlightedCount / sumLeft : 0));

    var sumRight = sumHorizontal - sumLeft + highlightedCount;
    calcLegend.find('.legend-cumulative-right>.legend-value').text(sumRight);
    calcLegend.find('.legend-cumulative-right>.legend-percentage')
      .text(format(sumRight ? highlightedCount / sumRight : 0));

    calcLegend.find('.legend-cumulative-horizontal>.legend-value')
      .text(sumHorizontal);
    calcLegend.find('.legend-cumulative-horizontal>.legend-percentage')
      .text(format(sumHorizontal ? highlightedCount / sumHorizontal : 0));

    calcLegend.find('.legend-cumulative-right-ratio>.legend-value').text('');
    calcLegend.find('.legend-cumulative-right-ratio>.legend-percentage')
      .text(format(sumRight ? sumRight / sumHorizontal : 0));

    calcLegend.find('.legend-cumulative-left-ratio>.legend-value').text('');
    calcLegend.find('.legend-cumulative-left-ratio>.legend-percentage')
      .text(format(sumLeft ? sumLeft / sumHorizontal : 0));

    calcLegend.find('.legend-max-ratio>.legend-value').text('');
    calcLegend.find('.legend-max-ratio>.legend-percentage')
      .text(format(maxHorizontal ? highlightedCount / maxHorizontal : 0));

    calcLegend.find('.legend-complement-max-ratio>.legend-value').text('');
    calcLegend.find('.legend-complement-max-ratio>.legend-percentage')
      .text(format(maxHorizontal ? 1 - highlightedCount / maxHorizontal : 0));
  } else {
    clearInfoPanelMouseDetail();
  }
}


function getCohort(cohortDay, cohortsInOrder, period) {
  if (period == 'monthly') {
    var index = cohortsInOrder.indexOf(cohortDay);
    var indexRounded = 30 * Math.floor(index / 30);
    result = cohortsInOrder[indexRounded];
    return result;
  } else if (period == 'weekly') {
    var index = cohortsInOrder.indexOf(cohortDay);
    var indexRounded = 7 * Math.floor(index / 7);
    result = cohortsInOrder[indexRounded];
    return result;
  } else {
    // Daily
    return cohortDay;
  }
};


var FORMAT_AMERICAN_SHORT = d3.time.format("%m/%d/%y");
var FORMAT_AMERICAN_LONG = d3.time.format("%m/%d/%Y");
var FORMAT_ISO_8601 = d3.time.format("%Y-%m-%d");


function parseDate(value) {
  var result = FORMAT_AMERICAN_SHORT.parse(value);
  if (result) {
    return result;
  }
  result = FORMAT_AMERICAN_LONG.parse(value);
  if (result) {
    return result;
  }
  result = FORMAT_ISO_8601.parse(value);
  if (result) {
    return result;
  }
  alert('The data contains bad date values.');
  throw Exception('The data contains bad date values.');
}


function printDate(value) {
  return FORMAT_AMERICAN_SHORT(value);
}


function filterData(rows, groupType, groupValues, totalGroupValues,
                    includeStateNames, period, pointType, includedSigns) {
  var positives = includedSigns == 'positive' || includedSigns == 'both';
  var negatives = includedSigns == 'negative' || includedSigns == 'both';

  // Construct a set of group values for faster set membership tests.
  var groupValuesSet = {};
  for (var i = 0, n = groupValues.length; i < n; i++) {
    groupValuesSet[groupValues[i]] = true;
  }

  // Helper function for only pulling the row data that matches.
  function shouldSkip(index, value) {
    // Skip the header row.
    if (index == 0) {
      return true;
    }
    // Skip rows of the wrong group type.
    if (groupType !== value[GROUP_TYPE_COLUMN]) {
      return true;
    }
    // Skip rows with unmatched group values. If this group type has no group
    // values then show everything.
    if (totalGroupValues > 0 &&
        !(value[GROUP_VALUE_COLUMN] in groupValuesSet)) {
      return true;
    }
    return false;
  }

  // Extract the cohort days so we can do arbitrary time regroupings.
  function compareCohorts(a, b) {
    return d3.ascending(parseDate(a), parseDate(b));
  }
  var cohortsSet = {};
  $.each(rows, function(index, value) {
    if (index == 0) {
      // Skip header row
      return;
    }
    var cohortDay = value[DAY_COLUMN];
    if (!(cohortDay in cohortsSet)) {
      cohortsSet[cohortDay] = true;
    }
  });
  var cohortsWithGaps = []
  $.each(cohortsSet, function(key) {
    cohortsWithGaps.push(key);
  });
  cohortsWithGaps.sort(compareCohorts);

  // Fill in any missing cohort days so cumulative data has no gaps.
  var cohortsInOrder = [];
  $.each(cohortsWithGaps, function(index, value) {
    if (cohortsInOrder.length > 0) {
      var lastCohortString = cohortsInOrder[cohortsInOrder.length - 1];
      var lastDate = parseDate(lastCohortString);
      var nextDate = parseDate(value);
      while (d3.time.day.offset(lastDate, 1) < nextDate) {
        var fillDate = d3.time.day.offset(lastDate, 1);
        var cohortString = printDate(fillDate);
        cohortsInOrder.push(cohortString);
        lastDate = fillDate;
      }
    }
    cohortsInOrder.push(value);
  });
  cohortsInOrder.sort(compareCohorts);

  // Figure out the width of each cohort grouping by counting all the cohorts
  // that have the same cohort grouping key.
  var cohortWidth = {};
  $.each(cohortsInOrder, function(index, value) {
    var cohortGrouping = getCohort(value, cohortsInOrder, period);
    var count = cohortWidth[cohortGrouping] || 0;
    cohortWidth[cohortGrouping] = count + 1;
  });

  // Figure out which cohort state columns to skip.
  var headers = rows[0].slice(3);
  var skipColumn = {};
  for (var i = 0; i < headers.length; i++) {
    if (includeStateNames.indexOf(headers[i]) == -1) {
      skipColumn[i] = true;
    }
  }

  // Maps cohort key to the combined data row for the key. The data rows in
  // the values of this map have all cohort columns removed.
  var cohorts = {};

  // Filter matching group type and group values.
  $.each(rows, function(index, value) {
    if (shouldSkip(index, value)) {
      return;
    }

    var cohort = getCohort(value[DAY_COLUMN], cohortsInOrder, period);
    var cohortRow = cohorts[cohort];
    if (!cohortRow) {
      // First row for a cohort. Truncate the group type, group name, and date
      // columns, leaving just numeric data.
      var cohortRow = [];
      for (var i = 3, n = value.length; i < n; ++i) {
        cohortRow.push(0);
      }
      cohorts[cohort] = cohortRow;
    }
    for (var i = 0, n = cohortRow.length; i < n; ++i) {
      var cell = !skipColumn[i] ? parseInt(value[i + 3]) : 0;
      if (cell >= 0) {
        cell = positives ? cell : 0;
      } else if (negatives) {
        if (!positives) {
          cell = negatives ? -cell : 0;
        }
      } else {
        cell = 0;
      }
      cohortRow[i] += cell;
    }
  });

  // Integrate the points across multiple cohorts
  if (pointType == 'cumulative') {
    var prevList = null;
    for (var i = 0, n = cohortsInOrder.length; i < n; i++) {
      var key = cohortsInOrder[i];
      var valueList = cohorts[key];
      if (!valueList && prevList) {
        // If the valueList doesn't exist for this cohort, then just keep
        // the same value that was present in the last one.
        cohorts[key] = prevList.slice();
      } else if (valueList) {
        if (!prevList) {
          prevList = valueList;
          continue;
        }
        for (var j = 0, k = valueList.length; j < k; j++) {
          valueList[j] += prevList[j];
        }
        prevList = valueList;
      }
    }
  }

  // Save some metadata about the cohorts.
  var rowData = [];
  $.each(cohortsInOrder, function(index, key) {
    var valueList = cohorts[key];
    var total = d3.max([0, d3.sum(valueList || [])]);
    rowData.push({
      cohort: key,
      x: index,
      total: total
    });
  });

  // Now regroup the data as sets of points grouped by column (for D3).
  var columns = {};
  function insertPoint(key, columnValues, columnIndex, header) {
    var data = columns[header];
    if (!data) {
      data = []
      columns[header] = data;
    }
    var stateCount = 0;
    if (!!columnValues) {
      stateCount = columnValues[columnIndex];
    }
    var point = {
      cohort: key,
      x: cohortsInOrder.indexOf(key),
      y: d3.max([0, stateCount]),
      barWidth: cohortWidth[key] || 0,
      stateCount: stateCount,  // d3 will modify 'y' but not this
      stateName: header
    };
    data.push(point);
  }

  $.each(cohortsInOrder, function(index, key) {
    // If we're in weekly mode, this will set the dimensions of all of the
    // cohorts in a single weekly bucket to the same height.
    var cohortGrouping = getCohort(key, cohortsInOrder, period);
    var columnValues = cohorts[cohortGrouping];

    for (var i = 0, n = headers.length; i < n; ++i) {
      insertPoint(key, columnValues, i, headers[i]);
    }
  });

  var columnData = [];
  $.each(columns, function(key, value) {
    columnData.push({name: key, values: value});
  });

  return [rowData, columnData];
}


function extractGroupTypes(csvData) {
  // Maps cohort group types to lists of cohort group values
  var cohortGroupTypes = {};

  // Skip the header row
  for (var i = 1; i < csvData.length; ++i) {
    var row = csvData[i];
    var groupType = row[GROUP_TYPE_COLUMN];
    var groupValue = row[GROUP_VALUE_COLUMN];
    var valueList = cohortGroupTypes[groupType];
    if (!valueList) {
      valueList = [];
      cohortGroupTypes[groupType] = valueList;
    }
    if (valueList.indexOf(groupValue) == -1) {
      valueList.push(groupValue);
    }
  }

  return cohortGroupTypes;
}


function clearViz() {
  d3.select('#viz_graph1')
      .select('svg.stacked').select('g').selectAll('g.layer').remove();
}


function updateViz(rows, cause) {
  var groupType = getSelectedGroupType();
  var groupValues = getSelectedGroupValues();
  var totalGroupValues = getTotalGroupValues();
  var includeStateNames = getEnabledStateNames();
  var normalized = getIsNormalized();
  var period = getPeriod();
  var pointType = getPointType();
  var includedSigns = getIncludedSigns();

  var view = filterData(
      rows, groupType, groupValues, totalGroupValues,
      includeStateNames, period, pointType, includedSigns);
  var viewCohorts = view[0];
  var viewBarGroups = view[1];

  // console.log('Cause="' + cause + '", Filtered to: type="' + groupType +
  //             '", values="' + (groupValues.join('|')) +
  //             '"; ' + viewCohorts.length + ' rows found');

  // Scale graph to whole window area, with minimum.
  var width = $(window).width() - 50;
  if (width < 100) {
    width = 100;
  }
  $('#viz_container').width(width);

  // Obey the height of the container.
  var height = $('#viz_graph1').height();

  // Put margins around the graphs so the axes render without clipping
  var marginX = 50;
  var marginY = 20;
  height -= 2 * marginY;
  width -= 2 * marginX;

  var scaleX = d3.scale.linear()
      .domain([0, viewCohorts.length])
      .range([0, width]);
  var barWidth = width / viewCohorts.length;
  var maxY = d3.max(viewCohorts, function(d) { return d.total; });
  if (normalized) {
    maxY = 1;
  }

  var scaleY = d3.scale.linear()
      .domain([0, maxY])
      .range([0, height - marginY]);
  var scaleColor = d3.scale.category20();

  var getColor = function(d, i) {
    return scaleColor(i);
  };
  var getX = function(d) {
    return scaleX(d.x);
  };
  var getY = function(d) {
    return scaleY(maxY - d.y0 - d.y);
  };
  var getHeight = function(d) {
    // Do not stretch zeros to take up 100% height; leave them at zero.
    if (normalized && d.stateCount == 0) {
      return 0;
    }
    return scaleY(d.y);
  };
  var getWidth = function(d) {
    return barWidth * d.barWidth;
  };
  var getValues = function(d) {
    return d.values;
  };
  var getCohort = function(d) {
    return d.cohort;
  };
  var getStateCount = function(d) {
    return d.stateCount;
  };
  var getStateName = function(d) {
    return d.stateName;
  };
  var updateFinished = function(e) {
    updateInfoPanel(null, null);
  }

  var chart = d3.select('#viz_graph1')
      .select('svg.stacked')
        .attr('width', width + 2 * marginX)
        .attr('height', height + 2 * marginY)
      .select('g')
        .attr("transform", "translate(" + marginX + "," + marginY + ")");

  var stack = d3.layout.stack();
  if (normalized) {
    stack = stack.offset('expand');
  }
  stack = stack.values(getValues)(viewBarGroups);

  // Update the UI after the 'data-state-count' transitions are done.
  chart.transition().each('end', updateFinished);

  var layers = chart.selectAll('g.layer').data(stack);

  layers.enter().append('svg:g')
      .attr('class', 'layer')
      .style('fill', getColor);

  layers.exit().remove();

  var bars = layers.selectAll('rect.bar').data(getValues);
  bars.enter().append('svg:rect')
      .attr('class', 'bar')
      .attr('data-cohort', getCohort)
      .attr('data-state-count', getStateCount)
      .attr('data-state-name', getStateName)
      .attr('x', getX)
      .attr('y', getY)
      .attr('width', getWidth)
      .attr('height', getHeight)
      .attr('stroke', d3.rgb('#333'));

  if (cause == 'period') {
    if (period == 'monthly') {
      bars.transition()
          .duration(0)
          .attr('width', barWidth)
          .attr('data-state-count', getStateCount)
        .transition()
          .duration(500)
          .attr('height', getHeight)
          .attr('x', getX)
          .attr('y', getY)
        .transition()
          .delay(750)
          .duration(0)
          .attr('width', getWidth)
    } else if (period == 'weekly') {
      bars.transition()
          .duration(0)
          .attr('width', barWidth)
          .attr('data-state-count', getStateCount)
        .transition()
          .duration(500)
          .attr('height', getHeight)
          .attr('x', getX)
          .attr('y', getY)
        .transition()
          .delay(750)
          .duration(0)
          .attr('width', getWidth)
    } else {
      bars.transition()
          .duration(0)
          .attr('data-state-count', getStateCount)
          .attr('width', getWidth)
        .transition()
          .delay(250)
          .duration(500)
          .attr('height', getHeight)
          .attr('x', getX)
          .attr('y', getY);
    }
  } else if (cause == 'resize') {
    bars.transition()
        .duration(0)
        .attr('data-state-count', getStateCount)
        .attr('width', getWidth)
        .attr('height', getHeight)
        .attr('x', getX)
        .attr('y', getY);
  } else {
    bars.transition()
        .duration(0)
        .attr('data-state-count', getStateCount)
      .transition()
        .duration(500)
        .attr('height', getHeight)
        .attr('width', getWidth)
        .attr('x', getX)
        .attr('y', getY);
  }

  bars.exit().remove();

  // Cohort date axis
  var targetTicks = 2 + Math.ceil(viewCohorts.length / 7);
  var domain = viewCohorts.map(function(d) { return d.cohort; });
  var range = viewCohorts.map(function(d) { return scaleX(d.x); });
  function filterTicks(value, index) {
    return index % targetTicks == 0;
  }
  domain = domain.filter(filterTicks);
  range = range.filter(filterTicks);

  var xAxisScale = d3.scale.ordinal()
    .domain(domain)
    .range(range);

  var xAxis = d3.svg.axis()
      .scale(xAxisScale)
      .tickSize(5, 2, 5);

  chart.selectAll('g.bottom.axis').remove();

  chart.append('g')
      .attr('class', 'bottom axis')
      .attr('transform', 'translate(0,' + (height - marginY) + ')')
      .call(xAxis.orient('bottom'));

  // Vertical axis
  var yAxisScale = d3.time.scale()
    .domain([0, maxY])
    .range([height-marginY, 0]);

  var yAxis = d3.svg.axis().scale(yAxisScale);

  if (normalized) {
    yAxis = yAxis.tickFormat(d3.format("%"))
        .tickSize(5, 0, 5)
        .tickValues([1]);
  } else {
    yAxis = yAxis.tickFormat(d3.format(",.0f"))
        .tickSize(5, 0, 5)
        .tickValues([maxY]);
  }

  chart.selectAll('g.left.axis').remove();

  chart.append("g")
      .attr("class", "left axis")
      .call(yAxis.orient("left"));
}


function handleVisualizeSafe(data) {
  try {
    handleVisualize(data);
  } catch (e) {
    alert('Something is wrong with your data!');
    console.log('Something is wrong with your data!');
    console.log(e);
  }
}


function handleVisualize(data) {
  // Parse the CSV data
  var rowsWithHeader = d3.csv.parseRows(data);
  var groupTypes = extractGroupTypes(rowsWithHeader);

  // Setup UI
  createGroupTypeRadios(groupTypes);
  createGroupValueCheckboxes(groupTypes);
  createLegend(rowsWithHeader);

  // Register event handlers
  $(document).unbind('cohorts.viz');
  $(document).bind('cohorts.viz', function(e, cause) {
    $('#loading-message').addClass('active');
    // Do this in timeout0 so the UI doesn't feel janky when you select
    // checkboxes and it takes a while to register.
    setTimeout(function() {
      if (cause == 'group-type' || cause == 'click-viz') {
        // Force the multi-column height to recalculate by removing the column
        // width property and re-adding it after reflow.
        $('#below-area').removeClass('below-area-column-wrap');
      }
      updateViz(rowsWithHeader, cause);
      $('#loading-message').removeClass('active');
      $('#below-area').addClass('below-area-column-wrap');
    }, 0);
  });

  // Clear any existing chart
  clearViz();

  // Build chart
  $(document).trigger('cohorts.viz', 'click-viz');
}


function handleClickVisualize() {
  handleVisualizeSafe($('#data').val());
}


function init() {
  var prefix = '?resource=';
  if (window.location.search.indexOf(prefix) == 0) {
    var resourcePath = decodeURIComponent(
        window.location.search.substr(prefix.length));
    $.ajax({
      url: resourcePath,
      success: function(data) {
        $('#data').text(data);
        initDone();
      },
      error: function(xhr, status, error) {
        alert('Something is wrong with your data!');
        console.log('Something is wrong with your data!');
        console.log(error);
      },
      dataType: 'text'
    });
  } else {
    initDone();
  }
}


function initDone() {
  $('#visualize_my_data').click(handleClickVisualize);

  var trigger = function(cause) {
    return function() {
      $(document).trigger('cohorts.viz', cause);
    };
  };

  $('#normalize-check').click(trigger('normalize'));
  $('input:radio[name=\'period\']')
      .click(trigger('period'))
      .click(clearInfoPanel);
  $('input:radio[name=\'point_type\']')
      .click(trigger('point_type'))
      .click(clearInfoPanel);
  $('input:radio[name=\'sign\']')
      .click(trigger('sign'))
      .click(clearInfoPanel);

  $(window).resize(trigger('resize'));

  // SVG's "class" attribute is not .className, but something else:
  // See http://stackoverflow.com/a/5875087
  $(document).on('mouseenter mouseleave', 'rect[class="bar"]',
                 handleInfoPanel);

  // Enable drag/drop of CSV files.
  $('body').bind('dragenter', function(e) {
    $('body').addClass('drag-active');
  });
  $('.drop-target').bind('dragleave', function(e) {
    $('body').removeClass('drag-active');
  });
  $('.drop-target').bind('dragover', function(e) {
    e.preventDefault();
  });
  $('.drop-target').bind('drop', function(e) {
    $('body').removeClass('drag-active');
    e.preventDefault();

    if (e.originalEvent.dataTransfer.files.length != 1) {
      return true;
    }
    var sourceFile = e.originalEvent.dataTransfer.files.item(0);
    if (sourceFile.type != 'text/csv') {
      return true;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      handleVisualizeSafe(reader.result);
    };
    reader.readAsText(e.originalEvent.dataTransfer.files.item(0));
  });

  // Start off with the dummy data that's in the textarea on page load.
  handleClickVisualize();
}


$(document).ready(init);
