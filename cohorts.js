var GROUP_TYPE_COLUMN = 0;
var GROUP_VALUE_COLUMN = 1;
var DAY_COLUMN = 2;


function getChartCount() {
  return $('#viz_container>thead>tr').children().size();
}


function extractGroupTypes(csvData) {
  // Maps cohort group types to lists of cohort group values
  var cohortGroupTypes = {};

  // Skip row 0, which is the header
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


function createGroupings(groupTypes) {
  var vizDiv = $('#viz_groups');
  var vizBody = vizDiv.find('tbody');
  vizBody.empty();

  var count = getChartCount();

  $.each(groupTypes, function(key, value) {
    var row = $('<tr>').addClass('grouping');
    row.append($('<td>').addClass('title').text(key));

    for (var i = 1; i <= count; ++i) {
      var useRadio = $('<input type="radio">')
          .addClass('use-button')
          .attr('name', 'chart' + i)
          .attr('value', key)
          .data('chart', i);
      row.append($('<td>').append(useRadio));
    }

    vizBody.append(row);
  });

  // TODO Update event handlers
}


function handleClickVisualize() {
  var rows = $.csv.toArrays($('#data').val());
  console.log(rows);

  var groupTypes = extractGroupTypes(rows);
  console.log(groupTypes);

  createGroupings(groupTypes);
}


function init() {
  $('#visualize_my_data').click(handleClickVisualize);
}


$(document).ready(init);
