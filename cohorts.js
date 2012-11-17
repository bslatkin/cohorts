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


function getSelectedGroupValues() {
  return $.makeArray(
    $('.group-value-checkbox:checked').map(function(index, el) {
      return $(el).val();
    }));
}


function getIsNormalized() {
  return $('input:checkbox[name=\'normalize\']:checked').val();
}


function getIsWeekly() {
  return $('input:checkbox[name=\'weekly\']:checked').val();
}


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

  var i = 0;
  $.each(groupTypes, function(key, value) {
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
    $(document).trigger('cohorts.viz');
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

  valuesDiv.append(
      $('<div class="controls-header">')
          .text('Included group values'));

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
    valuesDiv.append(container);
  });

  // Register event handlers
  $('.group-value-checkbox').click(function() {
    $(document).trigger('cohorts.viz');
  });
}


function createLegend(rowsWithHeader) {
  var columnNames = rowsWithHeader[0].slice(3);
  var container = $('#viz_legend');
  container.empty();

  var color = d3.scale.category20();
  $.each(columnNames, function(index, value) {
    var item = $('<div>');
    $('<div class="legend-box">')
        .attr('style', 'background-color: ' + color(index))
        .appendTo(item);
    $('<div class="legend-label">')
        .text(value)
        .appendTo(item);
    // Reverse order to match graph stacking.
    container.prepend(item);
  });
}


function getCohort(cohortDay, cohortsInOrder, weekly) {
  if (weekly) {
    var index = cohortsInOrder.indexOf(cohortDay);
    var indexRounded = 6 * Math.floor(index / 7);
    result = cohortsInOrder[indexRounded];
    return result;
  } else {
    return cohortDay;
  }
};


function filterData(rows, groupType, groupValues, weekly) {
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
    // Skip rows with unmatched group values. Match everything if no values
    // were supplied.
    if (groupValues.length > 0 &&
        groupValues.indexOf(value[GROUP_VALUE_COLUMN]) == -1) {
      return true;
    }
  }

  // Extract the cohort days so we can do arbitrary time regroupings.
  function compareCohorts(a, b) {
    return d3.ascending(format.parse(a), format.parse(b));
  }
  var cohortsInOrder = [];
  $.each(rows, function(index, value) {
    if (shouldSkip(index, value)) {
      return;
    }
    var cohortDay = value[DAY_COLUMN];
    if (cohortsInOrder.indexOf(cohortDay) == -1) {
      cohortsInOrder.push(cohortDay);
    }
  });
  var format = d3.time.format("%m/%d/%y");
  cohortsInOrder.sort(compareCohorts);

  // Maps cohort key to the combined data row for the key. The data rows in
  // the values of this map have all cohort columns removed.
  var cohorts = {};

  // Filter matching group type and group values.
  $.each(rows, function(index, value) {
    if (shouldSkip(index, value)) {
      return;
    }

    var cohort = getCohort(value[DAY_COLUMN], cohortsInOrder, weekly);
    var cohortRows = cohorts[cohort];
    if (!cohortRows) {
      // First row for a cohort. Truncate the group type, group name, and date
      // columns, leaving just numeric data.
      var firstRow = [];
      for (var i = 3, n = value.length; i < n; ++i) {
        firstRow.push(parseInt(value[i]));
      }
      cohorts[cohort] = firstRow;
    } else {
      for (var i = 0, n = cohortRows.length; i < n; ++i) {
        cohortRows[i] += parseInt(value[i + 3]);
      }
    }
  });

  // Save some metadata about the cohorts.
  var rowData = [];
  $.each(cohortsInOrder, function(index, key) {
    var valueList = cohorts[key];
    var total = d3.sum(valueList || []);
    rowData.push({
      cohort: key,
      x: index,
      total: total
    });
  });

  // Now regroup the data as sets of points grouped by column (for D3).
  var columns = {};
  var headers = rows[0].slice(3);
  $.each(cohorts, function(key, columnValues) {
    $.each(headers, function(columnIndex, header) {
      var data = columns[header];
      if (!data) {
        data = []
        columns[header] = data;
      }
      data.push({
        cohort: key,
        x: cohortsInOrder.indexOf(key),
        y: columnValues[columnIndex]
      });
    });
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


function updateViz(rows) {
  var groupType = getSelectedGroupType();
  var groupValues = getSelectedGroupValues();
  var normalized = getIsNormalized();
  var weekly = getIsWeekly();

  view = filterData(rows, groupType, groupValues, weekly);
  var viewCohorts = view[0];
  var viewBarGroups = view[1];

  console.log('Filtered to: type="' + groupType +
              '", values="' + (groupValues.join('|')) +
              '"; ' + viewCohorts.length + ' rows found');

  // Scale graph to whole window area, with minimum
  var height = 500;
  var width = $(window).width() - 100;
  if (width < 500) {
    width = 500;
  }
  $('#viz_container').width(width);

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
      .range([marginY, height - (2 * marginY)]);
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
    return scaleY(d.y);
  };
  var getWidth = function(d, i) {
    return barWidth;
  };

  var getValues = function(d) { return d.values; };

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

  var layers = chart.selectAll('g.layer').data(stack);
  layers.enter().append('svg:g')
      .attr('class', 'layer')
      .style('fill', getColor)
      .style('stroke', d3.rgb('#333'));

  layers.exit().remove();

  var bars = layers.selectAll('rect.bar').data(getValues);
  bars.enter().append('svg:rect')
      .attr('class', 'bar')
      .attr('x', getX)
      .attr('y', height - marginY) // TODO: Clean this up
      .attr('width', getWidth)
      .attr('height', 0)
    .transition()
      .duration(500)
      .attr('width', getWidth)
      .attr('height', getHeight)
      .attr('x', getX)
      .attr('y', getY);

  bars.transition()
      .duration(500)
      .attr('x', getX)
      .attr('y', getY)
      .attr('height', getHeight)
    .transition()
      .delay(500)
      .attr('width', getWidth);

  bars.exit().remove();

  // Cohort date axis
  // TODO: Always include the last one!
  function filterTicks(value, index) {
    // With very few ticks, show them all
    if (viewCohorts.length <= 5) {
      return true;
    }
    if (index % 7 == 0) {
      return true;
    }
    return false;
  };

  var domain = viewCohorts.map(function(d) { return d.cohort; });
  var range = viewCohorts.map(function(d, i) {
    return scaleX(i);
  });
  domain = domain.filter(filterTicks);
  range = range.filter(filterTicks);

  var xAxisScale = d3.scale.ordinal()
    .domain(domain)
    .range(range);

  var xAxis = d3.svg.axis()
      .scale(xAxisScale)
      .tickSize(5, 2, 0);

  chart.selectAll('g.bottom.axis').remove();

  chart.append("g")
      .attr("class", "bottom axis")
      .attr("transform", "translate(0," + (height-marginY) + ")")
      .call(xAxis.orient("bottom"));

  // Vertical axis
  var yAxisScale = d3.time.scale()
    .domain([0, maxY])
    .range([height-marginY, marginY]);

  var yAxis = d3.svg.axis().scale(yAxisScale);

  if (normalized) {
    yAxis = yAxis.tickFormat(d3.format("%"))
        .tickSize(5, 0, 0)
        .tickValues([1]);
  } else {
    yAxis = yAxis.tickFormat(d3.format(",.0f"))
        .tickSize(5, 0, 0)
        .tickValues([maxY]);
  }

  chart.selectAll('g.left.axis').remove();

  chart.append("g")
      .attr("class", "left axis")
      .call(yAxis.orient("left"));
}


function handleClickVisualize() {
  // Parse the CSV data
  var rowsWithHeader = $.csv.toArrays($('#data').val());
  var groupTypes = extractGroupTypes(rowsWithHeader);

  // Setup UI
  createGroupTypeRadios(groupTypes);
  createGroupValueCheckboxes(groupTypes);
  createLegend(rowsWithHeader);

  // Register event handlers
  $(document).unbind('cohorts.viz');
  $(document).bind('cohorts.viz', function() {
    updateViz(rowsWithHeader);
  });

  // Clear any existing chart
  clearViz();

  // Build chart
  $(document).trigger('cohorts.viz');
}


function init() {
  $('#visualize_my_data').click(handleClickVisualize);

  var trigger = function() {
    $(document).trigger('cohorts.viz');
  };

  $('#normalize-check').click(trigger);
  $('#weekly-check').click(trigger)

  $(window).resize(trigger);

  // Start off with the dummy data that's in the textarea on page load.
  handleClickVisualize();
}


$(document).ready(init);
