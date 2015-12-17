// node aggregate.js datafile granularity1 granularity2
// node aggregate.js riffian 2 24

var station_name = process.argv[2];
console.log("exporting 2h and 24h for " + station_name);

var data_file = require("./" + station_name + ".json");
var moment = require("moment");
var fs = require("fs");

var date_format = "YYYY-MM-DD HH:mm:ss";

data = fixData(data_file);

aggregate_2h = aggregateInterval(data, 1000*60*60*2);
aggregate_24h = aggregateInterval(data, 1000*60*60*24);

months = groupMonths(aggregate_24h);
years_months_24h = groupYears(months);
writeFile(years_months_24h, station_name + "_years_months_24h.json");

months = groupMonths(aggregate_2h);
writeFile(months, station_name + "_2h.json");

function fixData(data) {
  var new_data = [];

  var next = moment(data[1].timestamp, date_format);
  var most_recent_val = parseFloat(data[0].value);

  for(var i = 0; i < data.length; i++) {
    var current = moment(data[i].timestamp, date_format);

    var a=0;
    while (current.isAfter(next)) {
      // add value to current interval
      next = next.add(1000*60*5);
      new_data.push({timestamp: next.format(date_format), value: formatNum(most_recent_val)});
      a++;
    }

    if (current.isAfter(moment("2014-12-31 11:59", "YYYY-MM-DD HH:mm"))) {
      console.log(new_data[new_data.length-1].timestamp, current.format());
      break;
    }

    new_data.push({timestamp: moment(data[i].timestamp).format(date_format), value: formatNumRandom(data[i].value)});
    most_recent_val = data[i].value;
    next = moment(data[i].timestamp).add(1000*60*5);
  }
  return new_data;
}

// interval to be aggregated in milliseconds
function aggregateInterval(data, interval) {
  var aggregated_data = {timestamps: [], values: []};
  var interval_values = [];

  // start and end of currently aggregated interval
  var start_time = moment(data[0].timestamp, date_format);
  var end_time = moment(start_time).add(interval);

  // output timestamp of aggregated interval is in the middle of the interval
  var output_timestamp = moment(start_time).add(interval/2).format("X");

  for(var i = 0; i < data.length; i++) {
    var current = moment(data[i].timestamp, date_format);

    if (current.isSame(end_time) || current.isAfter(end_time)) {
      // end of current interval
      aggregated_data.timestamps.push(output_timestamp);
      aggregated_data.values.push(Math.round(average(interval_values)*10)/10);

      start_time = moment(current);
      end_time = moment(current).add(interval);
      output_timestamp = moment(current).add(interval/2).format("X");
      interval_values = [];
      interval_values.push(data[i].value);
    }
    else {
      // add value to current interval
      if (i === data.length-1) break;
      interval_values.push(data[i].value);
    }
  }
  return aggregated_data;
}

function groupMonths(data) {
  var grouped_data = [];
  var current_interval_data = {timestamps: [], values: []};
  var current_interval_no = getMonth(data, 0);

  for(var i = 0; i < data.timestamps.length; i++) {

    if(getMonth(data, i) != current_interval_no) {
      // new interval
      grouped_data.push(current_interval_data);

      current_interval_no = getMonth(data, i);
      current_interval_data =  {timestamps: [data.timestamps[i]], values: [data.values[i]]};
    }
    else {
      // add to current interval
      current_interval_data.timestamps.push(data.timestamps[i]);
      current_interval_data.values.push(data.values[i]);

      // if last element, wrap up interval
      if(i === data.timestamps.length-1) {
        grouped_data.push(current_interval_data);
        break;
      }
    }
  }
  return grouped_data;
}

function groupYears(data) {
  var grouped_data = [];
  var current_interval_data = [];
  var current_interval_no = getYear(data[0]);

  for(var i = 0; i < data.length; i++) {

    if(getYear(data[i]) != current_interval_no) {
      // new interval
      grouped_data.push(current_interval_data);

      current_interval_no = getYear(data[i]);
      current_interval_data = [data[i]];
    }
    else {
      // add to current interval
      current_interval_data.push(data[i]);

      // if last element, wrap up interval
      if(i === data.length-1) {
        grouped_data.push(current_interval_data);
        break;
      }
    }
  }
  grouped_data.forEach(function(y, i) {
    y.forEach(function(m, i) {
      console.log(moment(m.timestamps[2], "X").format("MM YYYY"));
    });
  });
  return grouped_data;
}

function printData() {
  for(var i = 0; i < 10000; i++) {
    var current = moment(data[i].timestamp, date_format);
    console.log(current.format(date_format));
  }
}

function groupInterval(data, getIntervalNo) {
  var grouped_data = [];
  //var current_interval_data = [];
  var current_interval_data = {timestamps: [], values: []};
  var current_interval_no = getIntervalNo(data);

  for(var i = 0; i < data.timestamps.length; i++) {

    if(getIntervalNo(data.timestamps[i]) != current_interval_no) {
      // new interval
      grouped_data.push(current_interval_data);

      current_interval_no = getIntervalNo(data.timestamps[i]);
      current_interval_data = [data.timestamps[i]];
    }
    else {
      if(i === data.length-1) {
        current_interval_data.push(data.timestamps[i]);
        grouped_data.push(current_interval_data);
      }

      // add to current interval
      current_interval_data.timestamps.push(data.timestamps[i]);
      current_interval_data.values.push(data.values[i]);
    }
  }
  return grouped_data;
}

function formatNum(val) {
  return Math.floor((parseFloat(val))*100)/100;
}
function formatNumRandom(val) {
  return Math.floor((parseFloat(val) - parseFloat(val) * 0.3 * Math.random()) * 100)/100;
}

function getMonth(data, i) {
  return moment(data.timestamps[i], "X").format("M");
}
function getYear(data) {
  return moment(data.timestamps[0], "X").format("YYYY");
}

function writeFile(data, filename) {
  stream = fs.createWriteStream(filename);
  //stream.write(JSON.stringify(data, null, 1));
  stream.write(JSON.stringify(data));
  stream.end();
}

function average(array) {
  var sum = 0;
  for(var i=0; i < array.length; i++) {
    sum += array[i];
  }
  return sum/array.length;
}
