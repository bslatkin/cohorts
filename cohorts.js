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


function updateViz(data, groupTypes) {
  
};


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
    if (groupType !== value[GROUP_TYPE_COLUMN]) {
      return;
    }
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

  // Return an array of arrays, with the cohort as the first column.
  var result = [];
  $.each(keys, function(index, value) {
    result.push([value].concat(cohorts[value]))
  });
  return result;
}


function extractGroupTypes(csvData) {
  // Maps cohort group types to lists of cohort group values
  var cohortGroupTypes = {};

  for (var i = 0; i < csvData.length; ++i) {
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
  console.log('Filtered to: type="' + groupType +
              '", values="' + (groupValues.join('|')) +
              '"; ' + view.length + ' rows found');
}


function handleClickVisualize() {
  // Parse the CSV data
  var rowWithHeader = $.csv.toArrays($('#data').val());
  var rows = rowWithHeader.slice(1)
  var groupTypes = extractGroupTypes(rows);

  // Setup UI
  createGroupTypeRadios(groupTypes);
  createGroupValueCheckboxes(groupTypes);

  // Register event handlers
  $(document).unbind('cohorts.viz');
  $(document).bind('cohorts.viz', function() {
    updateViz(rows);
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
