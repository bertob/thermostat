/** @jsx React.DOM */
var React = require('react');
var moment = require('moment');
var dataset = require('./data/data_years_months_24h.json');
var detail = require('./data/data_2h.json');

var selected = "month";
var selectedData = dataset[3][11]; // inital origin month
var detailTimestamp = dataset[2][2].timestamps[0]; // initally selected month
var originTimestamp = dataset[3][11].timestamps[0]; // inital origin month

var App = React.createClass({
	getInitialState: function() {
    return {
			data: dataset,
			detailData: detail,
			selected: selected,
			selectedData: selectedData,
			detailTimestamp: detailTimestamp,
			originTimestamp: originTimestamp
		};
  },
	updateView: function(data, detailTimestamp, originTimestamp) {
		if (data === null) {
			// set month in detail view
			this.setState({
				detailTimestamp: detailTimestamp
			});
		}
		else {
			// right-click on the selected element -> hide diff areas
			new_timestamp = null;
			new_data = null;
			// set new origin
			if (!sameMonth(originTimestamp, this.state.originTimestamp)) {
				new_timestamp = originTimestamp;
				new_data = data;
			}
			this.setState({
				originTimestamp: new_timestamp,
				selectedData: new_data
			});
		}
	},
	render: function() {
		var detailDataMonth = getMonthAtTimestamp(this.state.detailData, this.state.detailTimestamp);
		var detailOriginalMonth;
		if (this.state.selectedData !== null && this.state.selectedData.length === 12) {
			month_no = parseInt(moment(this.state.detailTimestamp, "X").format("M"));
			detailOriginalMonth = getMonthAtTimestamp(this.state.detailData, moment(this.state.originTimestamp, "X").month(month_no-1).format("X"));
		}
		else {
			detailOriginalMonth = getMonthAtTimestamp(this.state.detailData, this.state.originTimestamp);
		}
		return (
			<div className="app-container">
				<Header />
				<GridView data={this.state.data} originTimestamp={this.state.originTimestamp} detailTimestamp={this.state.detailTimestamp} selectedData={this.state.selectedData} update={this.updateView} />
				<DetailView data={detailDataMonth} original={detailOriginalMonth} />
			</div>
		);
	}

});

var Header = React.createClass({
	render: function() {
		return (
			<header className="header label-row">
					<span className="label-row-offset"></span>
					<label>January</label>
					<label>February</label>
					<label>March</label>
					<label>April</label>
					<label>May</label>
					<label>June</label>
					<label>July</label>
					<label>August</label>
					<label>September</label>
					<label>October</label>
					<label>November</label>
					<label>December</label>
			</header>
		);
	}

});

var GridView = React.createClass({
	render: function() {
		var rows = [];
		var props = this.props;
		this.props.data.map(function(row, index) {
				rows.push(<GridRow data={row} selectedData={props.selectedData} update={props.update} originTimestamp={props.originTimestamp} detailTimestamp={props.detailTimestamp} key={"row_" + moment(row[0].timestamps[0], "X").format("YYYY")} />);
		});
		return (
			<section className="grid-area">
				{rows}
			</section>
		);
	}
});

var GridRow = React.createClass({
	handleRightClick: function(event) {
		event.preventDefault();
		this.props.update(this.props.data, null, this.props.data[0].timestamps[0]);
  },
	render: function() {
		var charts = [];
		var props = this.props;
		var originTimestamp;

		this.props.data.map(function(chart, index){
			var original = null;
			var selected_start;
			var selected_end;

			if (props.selectedData !== null) {
				if (props.selectedData.length === 12) {
					// diff entire year
					var month_no = parseInt(moment(chart.timestamps[0], "X").format("M"));
					original = props.selectedData[month_no-1];
					originTimestamp = null;
				}
				else {
					// diff single month
					original = props.selectedData;
					originTimestamp = props.originTimestamp;
				}
			}
			charts.push(<GridChart data={chart} original={original} update={props.update} originTimestamp={originTimestamp} detailTimestamp={props.detailTimestamp} key={chart.timestamps[0] + parseInt(Math.random()*1000)} />);
		});

		var yearClasses = "grid-row-label grid-row-label-year";
		if (sameMonth(props.data[0].timestamps[0], this.props.originTimestamp)) {
			yearClasses += " grid-chart-origin";
		}

		return (
			<article className="grid-row">
				<label className={yearClasses} onContextMenu={this.handleRightClick}>{moment(this.props.data[0].timestamps[0], "X").format("YYYY")}</label>
				{charts}
			</article>
		);
	}
});

var GridChart = React.createClass({
	handleClick: function(event) {
		this.props.update(null, this.props.data.timestamps[0], null);
	},
	handleRightClick: function(event) {
		event.preventDefault();
		this.props.update(this.props.data, null, this.props.data.timestamps[0]);
  },
	render: function() {
		var props = this.props;
		var path;
		var areas = [];

		var width = 72;
		var height = 50;
		var minute_width = 0.001665;
		var y_scale = 1.2;
		var x_offset = 0;
		var y_offset = 36;

		// line chart
		if(this.props.original === null) {
			path = calculatePoints(this.props.data, this.props.data.timestamps[0], minute_width, y_scale, x_offset, y_offset);
		}
		else {
			path = calculatePoints(this.props.original, this.props.original.timestamps[0], minute_width, y_scale, x_offset, y_offset);

			// diff areas
			var area_data = findGraphAreas(this.props.data, offsetDates(this.props.original, this.props.data.timestamps[0]));
			var area_list = area_data[0];
			var sign_list = area_data[1];

			area_list.forEach(function(area, i) {
		    if (area.timestamps.length > 2) {
		      var color = "#fd5126";
		      if (sign_list[i] < 0) color = "#28b7f4";
					var area_path = calculatePoints(area, props.data.timestamps[0], minute_width, y_scale, x_offset, y_offset);

					areas.push(<path className="diffArea" d={area_path} stroke="none" fill={color} />);
		    }
		  });
		}

		var classes = "grid-chart";
		if (sameMonth(this.props.data.timestamps[0], this.props.detailTimestamp)) {
			classes += " grid-chart-detail";
		}
		if (sameMonth(this.props.data.timestamps[0], this.props.originTimestamp)) {
			classes += " grid-chart-origin";
		}

		return (
			<svg className={classes} width={width} height={height} onClick={this.handleClick} onContextMenu={this.handleRightClick}>
				<path d="M0 36 H 72" stroke="#999" fill="none"/>
				{areas}
				<path d={path} stroke="#000" fill="none" />
			</svg>
		);
	}
});

var DetailView = React.createClass({
	render: function() {
		var props = this.props;
		var chart;
		var path;
		var areas = [];

		var width = 996;
		var height = 230;
		var axes_width = 50;
		var minute_width = 0.0213;
		var y_scale = 4;
		var y_offset = 160;
		var x_offset = axes_width;

		if(this.props.original === null) {
			path = calculatePoints(this.props.data, this.props.data.timestamps[0], minute_width, y_scale, x_offset, y_offset);
		}
		else {
			path = calculatePoints(this.props.original, this.props.original.timestamps[0], minute_width, y_scale, x_offset, y_offset);

			// diff areas
			var area_data = findGraphAreas(this.props.data, offsetDates(this.props.original, this.props.data.timestamps[0]));
			var area_list = area_data[0];
			var sign_list = area_data[1];

			area_list.forEach(function(area, i) {
				if (area.timestamps.length > 2) {
					var color = "#fd5126";
					if (sign_list[i] < 0) color = "#28b7f4";
					var area_path = calculatePoints(area, props.data.timestamps[0], minute_width, y_scale, x_offset, y_offset);

					areas.push(<path className="diffArea" d={area_path} stroke="none" fill={color} />);
				}
			});
		}

		var axes = [];
		for (var i=-15; i <= 35; i+=5) {
			var y = y_offset - i * y_scale;
			var line = "M" + x_offset + " " + y + " H " + width;
			axes.push(
				<g>
					<path d={line} stroke="#ccc"/>
					<text x="36px" y={(y + 4) + "px"} className="detail-label">{i}</text>
				</g>
			);
		}

		var no_days_data = parseInt(moment(this.props.data.timestamps[this.props.data.timestamps.length-1], "X").format("D"));
		var no_days_original = 35; // arbitrary value higher than the max no of days per month
		if (this.props.original !== null)
			 no_days_original = parseInt(moment(this.props.original.timestamps[this.props.original.timestamps.length-1], "X").format("D"));

		for (var i=0; i < 31; i++) {
			var x = x_offset + (i*24*60) * minute_width;
			var gridline = "M" + x + " " + 0 + " V " + height;
			axes.push(<path d={gridline} stroke="#ccc"/>);

			if (i < no_days_data && i < no_days_original) {
				axes.push(
						<text x={(x + 12*60*minute_width) + "px"} y={14 + "px"} className="detail-label detail-label-x">{i+1}</text>
				);
			}
		}

		var title = moment(this.props.data.timestamps[0], "X").format("MMMM YYYY");
		if (this.props.original !== null)
			title = moment(this.props.data.timestamps[0], "X").format("MMMM YYYY") + " compared to " + moment(this.props.original.timestamps[0], "X").format("MMMM YYYY");

		return (
			<section className="detail-area">
				<svg className="detail-chart month-detail-chart" width={width} height={height}>
					{axes}
					<text x="18px" y="24px" className="detail-label">[°C]</text>
					<text x={(0.5*(width + x_offset)) + "px"} y={(height - 15) + "px"} className="detail-chart-title">{title}</text>
					<path d="M50 160 H 996" stroke="#444"/>
					{areas}
					<path d={path} stroke="black" fill="none"/>
				</svg>
		  </section>
		);
	}

});

// returns string for d attr
function calculatePoints(data, start_date, x_scale, y_scale, x_offset, y_offset) {
	var start_time = moment(start_date, "X");
	var time_difference = parseFloat((moment(data.timestamps[0], "X")).diff(start_time, "minutes"));
	var d = "M " + parseFloat(x_offset + time_difference * x_scale) +
		" " + (y_offset - parseFloat(data.values[0] * y_scale));

	for (var i=1; i<data.timestamps.length; i++) {
		var x = x_offset + parseFloat((moment(data.timestamps[i], "X")).diff(start_time, "minutes")) * x_scale;
		var y = y_offset - parseFloat(data.values[i] * y_scale);
		d += " L " + x + " " + y;
	}
	return d;
}

function findGraphAreas(data, original) {
  var areas = [{timestamps: [], values: []}];
  var back = {timestamps: [], values: []}; // second half of the area's nodes on the original graph
  var area_index = 0;
  var area_start = 0;
  var area_length = 0;

	var signs = [1]; // 1 = positive, -1 = negative
  if (data.values[0] < original.values[0]) signs = [-1];

	for (var j = 0; j < data.timestamps.length; j++) {

    if(data.timestamps[j] != null && original.timestamps[j] != null) {

      y = data.values[j] - original.values[j];

      if(!sameSign(signs[area_index], y)) {
				// new area

				// calculate intersection point
				var x_orig_1 = parseFloat(original.timestamps[j-1]);
				var x_orig_2 = parseFloat(original.timestamps[j]);
				var x_data_1 = parseFloat(data.timestamps[j-1]);
				var x_data_2 = parseFloat(data.timestamps[j]);

				var y_orig_1 = parseFloat(original.values[j-1]);
				var y_orig_2 = parseFloat(original.values[j]);
				var y_data_1 = parseFloat(data.values[j-1]);
				var y_data_2 = parseFloat(data.values[j]);

				var incl_data = (y_data_2 - y_data_1) / (x_data_2 - x_data_1);
				var incl_orig = (y_orig_2 - y_orig_1) / (x_orig_2 - x_orig_1);

				var x_intersection = (incl_data * x_data_1 - incl_orig * x_orig_1 - y_data_1 + y_orig_1) / (incl_data - incl_orig);
				var y_intersection = incl_data * (x_intersection - x_data_1) + y_data_1;

				areas[area_index].timestamps.push(x_intersection);
				areas[area_index].values.push(y_intersection);

				area_start += area_length;
				area_length = 0;
				areas[area_index].timestamps = (areas[area_index].timestamps).concat(back.timestamps);
				areas[area_index].values = (areas[area_index].values).concat(back.values);
				back = {timestamps: [], values: []};
				areas.push({timestamps: [x_intersection], values: [y_intersection]});

				area_index++;
				signs[area_index] = getSign(y);
				areas[area_index].timestamps.push(data.timestamps[j]);
				areas[area_index].values.push(data.values[j]);
				back.timestamps.unshift(original.timestamps[j]);
				back.values.unshift(original.values[j]);
      }
      else {
				// add to current area
				area_length++;
				areas[area_index].timestamps.push(data.timestamps[j]);
				areas[area_index].values.push(data.values[j]);
				back.timestamps.unshift(original.timestamps[j]);
				back.values.unshift(original.values[j]);

				// if it's the last element of the list
				if (j === data.timestamps.length - 1 || j === original.timestamps.length - 1 ) {
					areas[area_index].timestamps = (areas[area_index].timestamps).concat(back.timestamps);
					areas[area_index].values = (areas[area_index].values).concat(back.values);
					break;
		    }
	    }
    }
    else {
      areas[area_index].timestamps = (areas[area_index].timestamps).concat(back.timestamps);
      areas[area_index].values = (areas[area_index].values).concat(back.values);
      break;
    }

  }
  return [areas, signs];
}

// normalizes the starting point for months for diffing
function offsetDates(data, start_date) {
	var normalized = {timestamps: [], values: data.values};
	var old_start_date = data.timestamps[0];
	var offset = moment(start_date, "X").diff(moment(old_start_date, "X"));

	for (var i=0; i < data.timestamps.length; i++) {
		normalized.timestamps.push(moment(data.timestamps[i], "X").add(offset).format("X"));
	}
	return normalized;
}

function sameMonth(a, b) {
	var same = false;
	if (moment(a, "X").format("YYYY M") === moment(b, "X").format("YYYY M"))
		same = true;
	return same;
}

function getMonthAtTimestamp(data, timestamp) {
	month = null;
	if (timestamp !== null) {
		month = {};
		var month_id = moment(timestamp, "X").format("YYYY M");
		data.forEach(function(el, i) {
			if (moment(el.timestamps[0], "X").format("YYYY M") === month_id) month = el;
		});
	}
	return month;
}

function sameSign(a, b) {
  if ((a?a<0?-1:1:0) === (b?b<0?-1:1:0)) return true;
  else return false;
}

function getSign(a) {
  return a?a<0?-1:1:0;
}

module.exports = App;
