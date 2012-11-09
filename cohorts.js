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


function createGroupTypeRadios(groupTypes) {
  var vizDiv = $('#viz_group_type1');
  vizDiv.empty();
  vizDiv.append($('<span class="group-types-header">').text('Group types'));

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
      $('<span class="group-values-header">').text('Group values'));

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


function getCohort(cohortDay) {
  // TODO: Do date-based grouping with start/end times.
  return cohortDay;
};


function filterData(rows, groupType, groupValues) {
  // Maps cohort key to the combined data row for the key. The data rows in
  // the values of this map have all cohort columns removed.
  var cohorts = {};

  // Filter matching group type and group values.
  $.each(rows, function(index, value) {
    // Skip the header row.
    if (index == 0) {
      return;
    }
    // Skip rows of the wrong group type.
    if (groupType !== value[GROUP_TYPE_COLUMN]) {
      return;
    }
    // Skip rows with unmatched group values. Match everything if no values
    // were supplied.
    if (groupValues.length > 0 &&
        groupValues.indexOf(value[GROUP_VALUE_COLUMN]) == -1) {
      return;
    }
    var cohort = getCohort(value[DAY_COLUMN]);
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

  // Sort cohort keys in ascending order.
  var keys = $.map(cohorts, function(value, key) { return key; });
  keys.sort();

  // Now regroup the data as sets of points grouped by column (for D3).
  var columns = {};
  var headers = rows[0].slice(3);
  $.each(cohorts, function(key, value) {
    $.each(headers, function(index, header) {
      var data = columns[header];
      if (!data) {
        data = []
        columns[header] = data;
      }
      data.push({cohort: key, height: value[index]});
    });
  });

  var data = [];
  $.each(columns, function(key, value) {
    var total = 0;
    $.each(value, function(index, cell) {
      total += cell.height;
    });
    data.push({name: key, values: value, total: total});
  });

  return [keys, data];

  // 
  // // Sort cohort keys in ascending order.
  // var keys = $.map(cohorts, function(value, key) { return key; });
  // keys.sort();
  // 
  // // Return an array of arrays, with the cohort as the first column.
  // var result = [];
  // $.each(keys, function(index, value) {
  //   result.push([value].concat(cohorts[value]))
  // });
  // return result;
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


function updateViz(rows) {
  var groupType = getSelectedGroupType();
  var groupValues = getSelectedGroupValues();
  var view = filterData(rows, groupType, groupValues);
  var viewCohorts = view[0];
  var viewBarGroups = view[1];
  console.log('Filtered to: type="' + groupType +
              '", values="' + (groupValues.join('|')) +
              '"; ' + viewCohorts.length + ' rows found');
  console.log(viewBarGroups);

  var height = 400;
  var width = 500;


  var data = [
    [{'x': 0, 'y': 10, 'y0': 0}, {'x': 1, 'y': 20}, {'x': 2, 'y': 15}],
    [{'x': 0, 'y': 5}, {'x': 1, 'y': 10}, {'x': 2, 'y': 25}],
  ];

  var scaleX = d3.scale.linear()
      .domain([0, 3])
      .range([0, width]);
  var barWidth = width / data[0].length;
  var maxY = 50;  // set this to 1 and use 'expand' for equal view
  scaleY = d3.scale.linear()
      .domain([0, maxY])
      .range([0, height]);
  var scaleColor = d3.scale.category20();

  // var getColor = function(d) {
  //   return scaleColor(data.indexOf(d));
  // };
  var getX = function(d) {
    return scaleX(d.x);
  };
  var getY = function(d) {
    console.log('Get y maxY = ' + maxY);
    console.log(d);
    return scaleY(maxY - d.y0 - d.y);
  };
  var getHeight = function(d) {
    console.log('Get height');
    console.log(d);
    return scaleY(d.y);
  };

  var chart = d3.select('#viz_graph1').select('svg.stacked')
        .attr('width', width)
        .attr('height', height)
      .append('svg:g');

  var stack = d3.layout.stack()(data);
    // .values(function(d) { return d.values; })(viewBarGroups);

  var layers = chart.selectAll('g.layer')
      .data(stack)
    .enter().append('svg:g')
      .attr('class', 'layer')
      .style('fill', '#999')
      .style('stroke', d3.rgb('#333'));

  var bars = layers.selectAll('rect.bar')
      .data(function(d) { return d; })
    .enter().append('svg:rect')
      .attr('class', 'bar')
      .attr('width', barWidth)
      .attr('x', getX)
      .attr('y', getY)
      .attr('height', getHeight);

  var normalized = false;
  window.mytransition = function() {
    console.log('top');
    var chart2 = d3.select('#viz_graph1').selectAll('g.layer');
    console.log(chart2);
    var t1 = chart2
        .data(function() {
          var data2 = [
            [{'x': 0, 'y': 10, 'y0': 0}, {'x': 1, 'y': 20}, {'x': 2, 'y': 15}],
            [{'x': 0, 'y': 5}, {'x': 1, 'y': 10}, {'x': 2, 'y': 25}],
          ];
          normalized = !normalized;
          console.log('here! ' + normalized);
          console.log(data2);
          if (normalized) {
            // Transition to normalized
            maxY = 1;
            scaleY.domain([0, 1]);
            return d3.layout.stack().offset('expand')(data2);
          } else {
            // Transition to not normalized
            maxY = 50;
            scaleY.domain([0, 50]);
            return d3.layout.stack()(data2);
          }
        });
    var t2 = d3.select('#viz_graph1')
        .selectAll('g.layer').selectAll('rect.bar');
    console.log(t2);
        t2.data(function(d, i) {
          console.log('Transitioning bar data! ' + i);
          console.log(d);
          return d;
        })
          .transition()
        .duration(1000)
          .attr('y', getY)
          .attr('height', getHeight);
  };

  // chart.selectAll('rect').data(stack(viewBarGroups));

      // 
      // .data([10, 20, 30])
      // .enter()
      //   .append('svg:rect')
      //     .attr('x', 0)
      //     .attr('y', function(d, i) { return 10 * i + 1; })
      //     .attr('height', 25)
      //     .attr('width', 10);
}


function handleClickVisualize() {
  // Parse the CSV data
  var rowsWithHeader = $.csv.toArrays($('#data').val());
  var groupTypes = extractGroupTypes(rowsWithHeader);

  // Setup UI
  createGroupTypeRadios(groupTypes);
  createGroupValueCheckboxes(groupTypes);

  // Register event handlers
  $(document).unbind('cohorts.viz');
  $(document).bind('cohorts.viz', function() {
    updateViz(rowsWithHeader);
  });

  // Build chart
  $(document).trigger('cohorts.viz');
}


function init() {
  $('#visualize_my_data').click(handleClickVisualize);

  // Start off with the dummy data that's in the textarea on page load.
  handleClickVisualize();
}


$(document).ready(init);
