var GROUP_TYPE_COLUMN = 0;
var GROUP_VALUE_COLUMN = 1;
var DAY_COLUMN = 2;


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

  $.each(groupTypes, function(key, value) {
    var row = $('<tr>').addClass('grouping');
    row.append($('<td>').addClass('title').text(key));
    row.append(
      $('<td>').append($('<button>').addClass('use-left').text('Use')));
    row.append(
      $('<td>').append($('<button>').addClass('use-right').text('Use')));
    vizBody.append(row);
  });

  vizDiv.show();
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
