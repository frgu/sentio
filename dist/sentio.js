/*! sentio Version: 0.7.7 */
if(null == sentio) { var sentio = {}; }
var sentio_util = sentio.util = {};
sentio.util.extent = sentio_util_extent;

function sentio_util_extent(config) {
	'use strict';

	/**
	 * Private variables
	 */
	// Configuration
	var _config = {
		defaultValue: [0, 10],
		overrideValue: undefined
	};

	var _fn = {
		getValue: function(d, i) { return d; },
		filter: function(d, i) { return true; }
	};


	/**
	 * Private Functions
	 */

	function setDefaultValue(v) {
		if(null == v || 2 !== v.length || isNaN(v[0]) || isNaN(v[1]) || v[0] >= v[1]) {
			throw new Error('Default extent must be a two element ordered array of numbers');
		}
		_config.defaultValue = v;
	}

	function setOverrideValue(v) {
		if(null != v && 2 !== v.length) {
			throw new Error('Extent override must be a two element array or null/undefined');
		}
		_config.overrideValue = v;
	}

	function setGetValue(v) {
		if(typeof v !== 'function') {
			throw new Error('Value getter must be a function');
		}

		_fn.getValue = v;
	}

	function setFilter(v) {
		if(typeof v !== 'function') {
			throw new Error('Filter must be a function');
		}

		_fn.filter = v;
	}

	/*
	 * Constructor/initialization method
	 */
	function _instance(extentConfig) {
		if(null != extentConfig) {
			if(null != extentConfig.defaultValue) { setDefaultValue(extentConfig.defaultValue); }
			if(null != extentConfig.overrideValue) { setOverrideValue(extentConfig.overrideValue); }
			if(null != extentConfig.getValue) { setGetValue(extentConfig.getValue); }
			if(null != extentConfig.filter) { setFilter(extentConfig.filter); }
		}
	}


	/**
	 * Public API
	 */

	/*
	 * Get/Set the default value for the extent
	 */
	_instance.defaultValue = function(v) {
		if(!arguments.length) { return _config.defaultValue; }
		setDefaultValue(v);
		return _instance;
	};

	/*
	 * Get/Set the override value for the extent
	 */
	_instance.overrideValue = function(v) {
		if(!arguments.length) { return _config.overrideValue; }
		setOverrideValue(v);
		return _instance;
	};

	/*
	 * Get/Set the value accessor for the extent
	 */
	_instance.getValue = function(v) {
		if(!arguments.length) { return _fn.getValue; }
		setGetValue(v);
		return _instance;
	};

	/*
	 * Get/Set the filter fn for the extent
	 */
	_instance.filter = function(v) {
		if(!arguments.length) { return _fn.filter; }
		setFilter(v);
		return _instance;
	};

	/*
	 * Calculate the extent given some data.
	 * - Default values are used in the absence of data
	 * - Override values are used to clamp or extend the extent
	 */
	_instance.getExtent = function(data) {
		var toReturn;
		var ov = _config.overrideValue;

		// Check to see if we need to calculate the extent
		if(null == ov || null == ov[0] || null == ov[1]) {
			// Since the override isn't complete, we need to calculate the extent
			toReturn = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
			var foundData = false;

			if(null != data) {
				// Iterate over each element of the data
				data.forEach(function(element, i) {
					// If the element passes the filter, then update the extent
					if(_fn.filter(element, i)) {
						foundData = true;
						var v = _fn.getValue(element, i);
						toReturn[0] = Math.min(toReturn[0], v);
						toReturn[1] = Math.max(toReturn[1], v);
					}
				});
			}

			// If we didn't find any data, use the default values
			if(!foundData) {
				toReturn = _config.defaultValue;
			}

			// Apply the overrides
			// - Since we're in this conditional, only one or zero overrides were specified
			if(null != ov) {
				if(null != ov[0]) {
					// Set the lower override
					toReturn[0] = ov[0];
					if(toReturn[0] > toReturn[1]) {
						toReturn[1] = toReturn[0];
					}
				}
				if(null != ov[1]) { 
					toReturn[1] = ov[1];
					if(toReturn[1] < toReturn[0]) {
						toReturn[0] = toReturn[1];
					}
				}
			}
		} else {
			// Since the override is fully specified, use it
			toReturn = ov;
		}

		return toReturn;
	};


	// Initialize the model
	_instance(config);

	return _instance;
}
sentio.util.multiExtent = sentio_util_multi_extent;

function sentio_util_multi_extent(config) {
	'use strict';

	/**
	 * Private variables
	 */

	var _fn = {
		values: function(d) { return d.values; }
	};

	var _extent = sentio.util.extent();

	/**
	 * Private Functions
	 */

	function setExtent(v) {
		_extent = v;
	}

	/*
	 * Constructor/initialization method
	 */
	function _instance(config) {
		if(null != config && null != config.extent) {
			setExtent(config.extent);
		}
	}


	/**
	 * Public API
	 */

	/*
	 * Get/Set the extent to use 
	 */
	_instance.extent = function(v) {
		if(!arguments.length) { return _extent; }
		setExtent(v);
		return _instance;
	};

	/*
	 * Get/Set the values accessor function
	 */
	_instance.values = function(v) {
		if(!arguments.length) { return _fn.values; }
		_fn.values = v;
		return _instance;
	};

	/*
	 * Calculate the extent given some data.
	 * - Default values are used in the absence of data
	 * - Override values are used to clamp or extend the extent
	 */
	_instance.getExtent = function(data) {
		var toReturn;

		data.forEach(function(e) {
			var tExtent = _extent.getExtent(_fn.values(e));
			if(null == toReturn) {
				toReturn = tExtent;
			}
			else {
				toReturn[0] = Math.min(toReturn[0], tExtent[0]);
				toReturn[1] = Math.max(toReturn[1], tExtent[1]);
			}
		});

		// In case there was no data
		if(null == toReturn) {
			toReturn = _extent.getExtent([]);
		}

		return toReturn;
	};

	// Initialize the model
	_instance(config);

	return _instance;
}
var sentio_model = sentio.model = {};
sentio.model.bins = sentio_model_bins;

function sentio_model_bins(config) {
	'use strict';

	/**
	 * Private variables
	 */
	// Configuration
	var _config = {
		// The number of bins in our model
		count: 1,

		// The size of a bin in key value units
		size: undefined,

		// The min and max bins
		lwm: undefined,
		hwm: undefined
	};

	var _fn = {
		// The default function for creating the seed value for a bin
		createSeed: function() { return []; },

		// The default key function
		getKey: function(d) { return d; },

		// The default value function
		getValue: function(d) { return d; },

		// The default function for updating a bin given a new value
		updateBin: function(bin, d) { bin[1].push(d); },

		// The default function for counting the contents of the bins (includes code for backward compatibility)
		countBin: function(bin) {
			// If the bin contains a number, just return it
			if (typeof bin[1] === 'number') {
				return bin[1];
			}
			// If the bin contains an array of data, return the number of items
			if (bin[1].hasOwnProperty('length')) {
				return bin[1].length;
			}
			return 0;
		},

		// The default function to be called after items are added to the bins
		afterAdd: function(bins, currentCount, previousCount) {},

		// The default function to be called after the bins are updated
		afterUpdate: function(bins, currentCount, previousCount) {}
	};

	// The data (an array of object containers)
	var _data = [];

	// A cached total count of all the objects in the bins
	var _dataCount = 0;


	/**
	 * Private Functions
	 */

	// Get the index given the value
	function getIndex(v) {
		if(null == _config.size || null == _config.lwm) {
			return 0;
		}

		return Math.floor((v - _config.lwm)/_config.size);
	}

	function calculateHwm() {
		_config.hwm = _config.lwm + (_config.count * _config.size);
	}

	function updateState() {
		var bin;
		var prevCount = _dataCount;

		// drop stuff below the lwm
		while(_data.length > 0 && _data[0][0] < _config.lwm) {
			bin = _data.shift();
			_dataCount -= _fn.countBin(bin);
		}

		// drop stuff above the hwm
		while(_data.length > 0 && _data[_data.length - 1][0] >= _config.hwm) {
			bin = _data.pop();
			_dataCount -= _fn.countBin(bin);
		}

		// if we emptied the array, add an element for the lwm
		if(_data.length === 0) {
			_data.push([_config.lwm, _fn.createSeed()]);
		}

		// fill in any missing values from the lowest bin to the lwm
		for(var i=_data[0][0] - _config.size; i >= _config.lwm; i -= _config.size) {
			_data.unshift([i, _fn.createSeed()]);
		}

		// pad above the hwm
		while(_data[_data.length - 1][0] < _config.hwm - _config.size) {
			_data.push([_data[_data.length-1][0] + _config.size, _fn.createSeed()]);
		}
		if (_fn.afterUpdate) {
			_fn.afterUpdate.call(model, _data, _dataCount, prevCount);
		}
	}

	function addData(dataToAdd) {
		var prevCount = _dataCount;

		dataToAdd.forEach(function(element) {
			var i = getIndex(_fn.getKey(element));
			if(i >= 0 && i < _data.length) {
				var value = _fn.getValue(element);
				var prevBinCount = _fn.countBin(_data[i]);
				_fn.updateBin.call(model, _data[i], value);
				_dataCount += _fn.countBin(_data[i]) - prevBinCount;
			}
		});
		if (_fn.afterAdd) {
			_fn.afterAdd.call(model, _data, _dataCount, prevCount);
		}
	}

	function clearData() {
		_data.length = 0;
		_dataCount = 0;
	}


	/*
	 * Constructor/initialization method
	 */
	function model(binConfig) {
		if(null == binConfig || null == binConfig.size || null == binConfig.count || null == binConfig.lwm) {
			throw new Error('You must provide an initial size, count, and lwm');
		}
		_config.size = binConfig.size;
		_config.count = binConfig.count;
		_config.lwm = binConfig.lwm;

		if(null != binConfig.createSeed) { _fn.createSeed = binConfig.createSeed; }
		if(null != binConfig.getKey) { _fn.getKey = binConfig.getKey; }
		if(null != binConfig.getValue) { _fn.getValue = binConfig.getValue; }
		if(null != binConfig.updateBin) { _fn.updateBin = binConfig.updateBin; }
		if(null != binConfig.countBin) { _fn.countBin = binConfig.countBin; }
		if(null != binConfig.afterAdd) { _fn.afterAdd = binConfig.afterAdd; }
		if(null != binConfig.afterUpdate) { _fn.afterUpdate = binConfig.afterUpdate; }

		calculateHwm();
		updateState();
	}


	/**
	 * Public API
	 */

	/**
	 * Resets the model with the new data
	 */
	model.set = function(data) {
		clearData();
		updateState();
		addData(data);
		return model;
	};

	/**
	 * Clears the data currently in the bin model
	 */
	model.clear = function() {
		clearData();
		updateState();
		return model;
	};

	/**
	 * Add an array of data objects to the bins
	 */
	model.add = function(dataToAdd) {
		addData(dataToAdd);
		return model;
	};

	/**
	 * Get/Set the low water mark value
	 */
	model.lwm = function(v) {
		if(!arguments.length) { return _config.lwm; }

		var oldLwm = _config.lwm;
		_config.lwm = Number(v);

		calculateHwm();

		if((oldLwm - _config.lwm) % _config.size !== 0) {
			// the difference between watermarks is not a multiple of the bin size, so we need to reset
			clearData();
		}

		updateState();

		return model;
	};

	/**
	 * Get the high water mark
	 */
	model.hwm = function() {
		return _config.hwm;
	};

	/**
	 * Get/Set the key function used to determine the key value for indexing into the bins
	 */
	model.getKey = function(v) {
		if(!arguments.length) { return _fn.getKey; }
		_fn.getKey = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the value function for determining what value is added to the bin
	 */
	model.getValue = function(v) {
		if(!arguments.length) { return _fn.getValue; }
		_fn.getValue = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the Update bin function for determining how to update the state of a bin when a new value is added to it
	 */
	model.updateBin = function(v) {
		if(!arguments.length) { return _fn.updateBin; }
		_fn.updateBin = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the seed function for populating
	 */
	model.createSeed = function(v) {
		if(!arguments.length) { return _fn.createSeed; }
		_fn.createSeed = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the countBin function for populating
	 */
	model.countBin = function(v) {
		if(!arguments.length) { return _fn.countBin; }
		_fn.countBin = v;

		clearData();
		updateState();

		return model;
	};

	/**
	 * Get/Set the afterAdd callback function
	 */
	model.afterAdd = function(v) {
		if(!arguments.length) { return _fn.afterAdd; }
		_fn.afterAdd = v;
		return model;
	};

	/**
	 * Get/Set the afterAdd callback function
	 */
	model.afterUpdate = function(v) {
		if(!arguments.length) { return _fn.afterUpdate; }
		_fn.afterUpdate = v;
		return model;
	};

	/**
	 * Get/Set the bin size configuration
	 */
	model.size = function(v) {
		if(!arguments.length) { return _config.size; }

		if(Number(v) < 1) {
			throw new Error('Bin size must be a positive integer');
		}

		// Only change stuff if the size actually changes
		if(Number(v) !== _config.size) {
			_config.size = Number(v);
			calculateHwm();
			clearData();
			updateState();
		}

		return model;
	};

	/**
	 * Get/Set the bin count configuration
	 */
	model.count = function(v) {
		if(!arguments.length) { return _config.count; }

		if(Number(v) < 1) {
			throw new Error('Bin count must be a positive integer');
		}

		// Only change stuff if the count actually changes
		if(Number(v) !== _config.count) {
			_config.count = Math.floor(Number(v));
			calculateHwm();
			updateState();
		}

		return model;
	};

	/**
	 * Accessor for the bins of data
	 * @returns {Array} Returns the complete array of bins
	 */
	model.bins = function() {
		return _data;
	};

	/**
	 * Accessor for the cached count of all the data in the bins, calculated for each bin by the countBin() function
	 * @returns {number} The count of data in the bins
	 */
	model.itemCount = function() {
		return _dataCount;
	};

	/**
	 * Clears all the data in the bin with the given index
	 * @param {number} i The index into the bins array of the bin to clear
	 * @returns {number} The number of items in the bin that was cleared, as returned by countBin() function
	 */
	model.clearBin = function(i) {
		if (i >= 0 && i < _data.length) {
			var count = _fn.countBin(_data[i]);
			_dataCount -= count;
			_data[i][1] = _fn.createSeed();
			return count;
		}
		return 0;
	};

	// Initialize the model
	model(config);

	return model;
}
var sentio_controller = sentio.controller = {};
sentio.controller.rtBins = sentio_controller_rtBins;

/*
 * Controller wrapper for the bin model. Assumes binSize is in milliseconds.
 * Every time binSize elapses, updates the lwm to keep the bins shifting.
 */
function sentio_controller_rtBins(config) {
	'use strict';

	/**
	 * Private variables
	 */
	var _config = {
		delay: 0,
		binSize: 0,
		binCount: 0
	};

	// The bins
	var _model;
	var _running;

	/**
	 * Private Functions
	 */

	function _calculateLwm() {
		// Assume the hwm is now plus two binSize
		var hwm = Date.now() + 2*_model.size();

		// Trunc the hwm down to a round value based on the binSize
		hwm = Math.floor(hwm/_model.size()) * _model.size();

		// Derive the lwm from the hwm
		var lwm = hwm - _model.size() * _model.count();

		return lwm;
	}

	function _update() {
		if(_running === true) {
			// need to update the lwm
			_model.lwm(_calculateLwm());
			window.setTimeout(_update, _model.size());
		}
	}

	function _start() {
		if(!_running) {
			// Start the update loop
			_running = true;
			_update();
		}
	}

	function _stop() {
		// Setting running to false will stop the update loop
		_running = false;
	}

	// create/init method
	function controller(rtConfig) {
		if(null == rtConfig || null == rtConfig.binCount || null == rtConfig.binSize) {
			throw new Error('You must provide an initial binSize and binCount');
		}

		_config.binSize = rtConfig.binSize;
		_config.binCount = rtConfig.binCount;

		if(null != rtConfig.delay) {
			_config.delay = rtConfig.delay;
		}

		_model = sentio.model.bins({
			size: _config.binSize,
			count: _config.binCount + 2,
			lwm: 0
		});
		_model.lwm(_calculateLwm());

		_start();
	}



	/**
	 * Public API
	 */

	/*
	 * Get the model bins
	 */
	controller.model = function() {
		return _model;
	};

	controller.bins = function() {
		return _model.bins();
	};

	controller.start = function() {
		_start();
		return controller;
	};

	controller.stop = function() {
		_stop();
		return controller;
	};

	controller.running = function() {
		return _running;
	};

	controller.add = function(v) {
		_model.add(v);
		return controller;
	};

	controller.clear = function() {
		_model.clear();
		return controller;
	};

	controller.binSize = function(v) {
		if(!arguments.length) { return _config.binSize; }

		if(Number(v) < 1) {
			throw new Error('Bin size must be a positive integer');
		}

		_config.binSize = v;
		_model.size(v);
		_model.lwm(_calculateLwm());

		return controller;
	};

	controller.binCount = function(v) {
		if(!arguments.length) { return _config.binCount; }

		if(Number(v) < 1) {
			throw new Error('Bin count must be a positive integer');
		}

		_config.binCount = v;
		_model.count(v + 2);
		_model.lwm(_calculateLwm());

		return controller;
	};

	// Initialize the layout
	controller(config);

	return controller;
}
var sentio_chart = sentio.chart = {};
sentio.chart.donut = sentio_chart_donut;

function sentio_chart_donut() {
	'use strict';

	// Chart height/width
	var _width = 400;
	var _height = 400;
	var _margin = { top: 2, bottom: 2, right: 2, left: 2 };

	// Inner and outer radius settings
	var _radius;
	var _innerRadiusRatio = 0.7;

	// Transition duration
	var _duration = 500;

	// Legend configuration
	var _legend = {
		enabled: true,
		markSize: 16,
		markMargin: 8,
		labelOffset: 2,
		position: 'center', // only option right now
		layout: 'vertical'
	};

	// d3 dispatcher for handling events
	var _dispatch = d3.dispatch('onMouseOver', 'onMouseOut', 'onClick');

	// Function handlers
	var _fn = {
		updateActiveElement: function(d) {
			var legendEntries = _element.gLegend.selectAll('g.entry');
			var arcs = _element.gChart.selectAll('path.arc');

			if(null != d && null != d.data) {
				d = d.data;
			}

			if(null != d) {
				// Set the highlight on the row
				var key = _fn.key(d);
				legendEntries.classed('active', function(e){
					return _fn.key(e) == key;
				});
				arcs.classed('active', function(e){
					return _fn.key(e.data) == key;
				});
			}
			else {
				legendEntries.classed('active', false);
				arcs.classed('active', false);
			}
		},
		onMouseOver: function(d, i) {
			_fn.updateActiveElement(d);
			_dispatch.onMouseOver(d, this);
		},
		onMouseOut: function(d, i) {
			_fn.updateActiveElement();
			_dispatch.onMouseOut(d, this);
		},
		onClick: function(d, i) {
			_dispatch.onClick(d, this);
		},
		key: function(d, i) { return d.key; },
		value: function(d, i) { return d.value; },
		label: function(d, i) { return d.key + ' (' + d.value + ')'; }
	};


	// Extents
	var _extent = {
	};

	var _scale = {
		color: d3.scale.category10()
	};

	var _layout = {
		arc: d3.svg.arc(),
		pie: d3.layout.pie().value(_fn.value).sort(null)
	};

	// elements
	var _element = {
		div: undefined,
		svg: undefined,
		gChart: undefined,
		legend: undefined
	};

	var _data = [];

	// Chart create/init method
	function _instance(selection){}

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container){
		// Create the DIV element
		_element.div = container.append('div').attr('class', 'sentio donut');

		// Create the svg element
		_element.svg = _element.div.append('svg');

		// Create the main chart group
		_element.gChart = _element.svg.append('g').attr('class', 'chart');

		// Create a group for the legend
		_element.gLegend = _element.svg.append('g').attr('class', 'legend');

		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = v || [];
		return _instance;
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		var chartWidth = _width - _margin.right - _margin.left;
		var chartHeight = _height - _margin.top - _margin.bottom;
		_radius = (Math.min(chartHeight, chartWidth))/2;

		_element.svg
			.attr('width', _width)
			.attr('height', _height);

		_element.gChart
			.attr('transform', 'translate(' + (_margin.left + _radius) + ',' + (_margin.top + _radius) + ')');

		// The outer radius is half of the lesser of the two (chartWidth/chartHeight)
		_layout.arc.innerRadius(_radius * _innerRadiusRatio).outerRadius(_radius);

		// Update legend positioning
		_element.gLegend.attr('transform', legendTransform());

		return _instance;
	};

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		redrawChart();

		if (_legend.enabled) {
			redrawLegend();
		}

		return _instance;
	};

	/**
	 * Private functions
	 */
	function redrawChart() {
		/*
		 * Join the data
		 */
		var g = _element.gChart.selectAll('path.arc')
			.data(_layout.pie(_data), function(d, i) { return _fn.key(d.data, i); });

		/*
		 * Update Only
		 */

		/*
		 * Enter Only
		 * Create the path, add the arc class, register the callbacks
		 * Grow from 0 for both start and end angles
		 */
		var gEnter = g.enter().append('path')
			.attr('class', 'arc')
			.on('mouseover', _fn.onMouseOver)
			.on('mouseout', _fn.onMouseOut)
			.on('click', _fn.onClick)
			.each(function(d) { this._current = { startAngle: 0, endAngle: 0 }; });

		/*
		 * Enter + Update
		 * Apply the update from current angle to next angle
		 */
		g.transition().duration(_duration)
			.attrTween('d', function(d) {
				var interpolate = d3.interpolate(this._current, d);
				this._current = interpolate(0);
				return function(t) {
					return _layout.arc(interpolate(t));
				};
			});

		g.attr('key', function(d, i) { return _fn.key(d.data, i); })
			.attr('fill', function(d, i) { return _scale.color(_fn.key(d.data, i)); });

		g.exit().remove();
	}

	function legendTransform() {
		var entrySpan = _legend.markSize + _legend.markMargin;

		// Only option is 'center' for now
		if (_legend.position === 'center') {
			// The center position of the chart
			var centerX = _margin.left + _radius;
			var centerY = _margin.top + _radius;
			var legendWidth = (null == _element.gLegend._maxWidth)? 0 : _element.gLegend._maxWidth;
			var legendHeight = entrySpan*_data.length + _legend.markMargin;

			var offsetX = legendWidth/2;
			var offsetY = legendHeight/2;

			return 'translate(' + (centerX - offsetX) + ',' + (centerY - offsetY) + ')';
		} else {
			// TODO
		}
	}

	function redrawLegend() {
		/*
		 * Join the data
		 */
		var gLegendGroup = _element.gLegend.selectAll('g.entry')
			.data(_data, function(d, i) { return _fn.key(d, i); });

		/*
		 * Enter Only
		 * Create a g (gLegendGroup) to add the rect & text label,
		 * register the callbacks, apply the transform to position each gLegendGroup
		 */
		var gLegendGroupEnter = gLegendGroup.enter().append('g')
			.attr('class', 'entry')
			.attr('transform', function(d, i) { return 'translate(0, ' + (i*(_legend.markSize + _legend.markMargin)) + ')'; } )
			.on('mouseover', _fn.onMouseOver)
			.on('mouseout', _fn.onMouseOut)
			.on('click', _fn.onClick);

		// Add the legend's rect
		var rect = gLegendGroupEnter
			.append('rect')
			.attr('width', _legend.markSize)
			.attr('height', _legend.markSize);

		// Add the legend text
		gLegendGroupEnter
			.append('text')
			.attr('x', _legend.markSize + _legend.markMargin)
			.attr('y', _legend.markSize - _legend.labelOffset);

		/*
		 * Enter + Update
		 */
		gLegendGroup.select('text')
			.text(function(d, i) { return _fn.label(d, i); });

		gLegendGroup.select('rect')
			.style('fill', function(d) { return _scale.color(_fn.key(d)); });

		// Position each rect on both enter and update to fully account for changing widths and sizes
		gLegendGroup
			// Iterate over all the legend keys to get the max width and store it in gLegendGroup._maxWidth
			.each(function(d, i) {
				if (i === 0) {
					// Reset
					_element.gLegend._maxWidth = this.getBBox().width;
				} else {
					_element.gLegend._maxWidth = Math.max(this.getBBox().width, _element.gLegend._maxWidth);
				}
			});

		// Reassert the legend position
		_element.gLegend.attr('transform', legendTransform());

		gLegendGroup.exit().remove();
	}

	// Basic Getters/Setters
	_instance.width = function(v) {
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v) {
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};

	_instance.innerRadiusRatio = function(v) {
		if(!arguments.length) { return _innerRadiusRatio; }
		_innerRadiusRatio = v;
		return _instance;
	};

	_instance.duration = function(v) {
		if(!arguments.length) { return _duration; }
		_duration = v;
		return _instance;
	};

	_instance.key = function(v) {
		if(!arguments.length) { return _fn.key; }
		_fn.key = v;
		return _instance;
	};
	_instance.value = function(v) {
		if(!arguments.length) { return _fn.value; }
		_fn.value = v;
		_layout.pie.value(v);
		return _instance;
	};
	_instance.label = function(v) {
		if(!arguments.length) { return _fn.label; }
		_fn.label = v;
		return _instance;
	};
	_instance.color = function(v) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = v;
		return _instance;
	};

	_instance.dispatch = function(v) {
		if(!arguments.length) { return _dispatch; }
		return _instance;
	};

	_instance.legend = function(v) {
		if(!arguments.length) { return _legend; }
		_legend = v;
		return _instance;
	};

	return _instance;
}
sentio.chart.matrix = sentio_chart_matrix;

function sentio_chart_matrix() {
	'use strict';

	// Chart dimensions
	var _cellSize = 16;
	var _cellMargin = 1;
	var _margin = { top: 20, right: 2, bottom: 2, left: 64 };

	// Transition duration
	var _duration = 500;

	// d3 dispatcher for handling events
	var _dispatch = d3.dispatch('onMouseOverCell', 'onMouseOutCell', 'onClickCell', 'onMouseOverRow', 'onMouseOutRow', 'onClickRow');

	// Function handlers
	var _fn = {
		updateActiveSeries: function(d) {
			var seriesLabels = _element.g.chart.selectAll('.row text');

			if(null != d) {
				// Set the highlight on the row
				var seriesKey = _fn.seriesKey(d);
				seriesLabels.classed('active', function(series, i){ return _fn.seriesKey(series) == seriesKey; });
			}
			else {
				// Now update the style
				seriesLabels.classed('active', false);
			}
		},
		onMouseOverRow: function(d, i) {
			_fn.updateActiveSeries(d);
			_dispatch.onMouseOverRow(d, this);
		},
		onMouseOutRow: function(d, i) {
			_fn.updateActiveSeries();
			_dispatch.onMouseOutRow(d, this);
		},
		onClickRow: function(d, i) {
			_dispatch.onClickRow(d, this);
		},
		onMouseOverCell: function(d, i) {
			_dispatch.onMouseOverCell(d, this);
		},
		onMouseOutCell: function(d, i) {
			_dispatch.onMouseOutCell(d, this);
		},
		onClickCell: function(d, i) {
			_dispatch.onClickCell(d, this);
		},
		seriesKey: function(d, i) { return d.key; },
		seriesLabel: function(d, i) { return d.label; },
		seriesValues: function(d, i) { return d.values; },
		key: function(d, i) { return d.key; },
		value: function(d, i) { return d.value; }
	};

	// Extents
	var _extent = {
		x: sentio.util.extent().getValue(_fn.key),
		value: sentio.util.extent().getValue(_fn.value),
		multi: sentio.util.multiExtent()
	};

	// Scales for x, y, and color
	var _scale = {
		x: d3.scale.linear(),
		y: d3.scale.ordinal(),
		color: d3.scale.linear().range(['#e7e7e7', '#008500'])
	};

	var _axis = {
		x: d3.svg.axis().scale(_scale.x).orient('top').outerTickSize(0).innerTickSize(2)
	};

	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			chart: undefined,
			xAxis: undefined
		}
	};

	var _data = [];

	var _instance = function () {};

	_instance.init = function(d3Container) {
		// Add the svg element
		_element.div = d3Container.append('div').attr('class', 'sentio matrix');
		_element.svg = _element.div.append('svg');

		// Add the axis
		_element.g.xAxis = _element.svg.append('g').attr('class', 'x axis');

		// Add a group for the chart itself
		_element.g.chart = _element.svg.append('g').attr('class', 'chart');

		_instance.resize();

		return _instance;
	};

	_instance.data = function(d) {
		if(!arguments.length) {
			return _data;
		}
		_data = d || [];
		return _instance;
	};

	_instance.resize = function() { };

	_instance.redraw = function() {
		// Determine the number of rows to render
		var rowCount = _data.length;

		// Determine the number of boxes to render (assume complete data)
		var boxes = [];
		if(rowCount > 0) {
			boxes = _fn.seriesValues(_data[0]);
		}
		var boxCount = boxes.length;

		// Dimensions of the visualization
		var cellSpan = _cellMargin + _cellSize;

		// calculate the width/height of the svg
		var width = boxCount*cellSpan + _cellMargin,
			height = rowCount*cellSpan + _cellMargin;

		// scale the svg to the right size
		_element.svg
			.attr('width', width + _margin.left + _margin.right)
			.attr('height', height + _margin.top + _margin.bottom);

		// Configure the scales
		_scale.x.domain(_extent.x.getExtent(boxes)).range([0, width - _cellMargin - cellSpan]);
		_scale.color.domain(_extent.multi.values(_fn.seriesValues).extent(_extent.value).getExtent(_data));

		// Draw the x axis
		_element.g.xAxis.attr('transform', 'translate(' + (_margin.left + _cellMargin + _cellSize/2) + "," + _margin.top + ")");
		_element.g.xAxis.call(_axis.x);

		/**
		 * Chart Manipulation
		 */

		/*
		 * Row Join
		 */
		var row = _element.g.chart.selectAll('g.row').data(_data, _fn.seriesKey);

		/*
		 * Row Update Only
		 */

		/*
		 * Row Enter Only
		 * Build the row structure
		 */
		var rowEnter = row.enter().append('g');
		rowEnter
			.style('opacity', 0.1)
			.attr('class', 'row')
			.attr('transform', function(d, i) { return 'translate(' + _margin.left + ',' + (_margin.top + (cellSpan*i)) + ')'; })
			.on('mouseover', _fn.onMouseOverRow)
			.on('mouseout', _fn.onMouseOutRow)
			.on('click', _fn.onClickRow);

		// Also must append the label of the row
		rowEnter.append('text')
			.attr('class', 'series label')
			.style('text-anchor', 'end')
			.attr('x', -6)
			.attr('y', _cellMargin + (_cellSize/2))
			.attr('dy', '.32em');

		// Also must append a line
		rowEnter.append('line')
			.attr('class', 'series tick')
			.attr('x1', -3)
			.attr('x2', 0)
			.attr('y1', _cellMargin + (_cellSize/2))
			.attr('y2', _cellMargin + (_cellSize/2));

		/*
		 * Row Enter + Update
		 */
		// Transition rows to their new positions
		row.transition().duration(_duration)
			.style('opacity', 1)
			.attr('transform', function(d, i){
				return 'translate(' + _margin.left + ',' + (_margin.top + (cellSpan*i)) + ')';
			});

		// Update the series labels in case they changed
		row.select('text.series.label')
			.text(_fn.seriesLabel);

		/*
		 * Row Exit
		 */
		row.exit()
			.transition().duration(_duration)
			.style('opacity', 0.1)
			.remove();


		/*
		 * Cell Join - Will be done on row enter + exit
		 */
		var rowCell = row.selectAll('rect.cell').data(_fn.seriesValues, _fn.key);

		/*
		 * Cell Update Only
		 */

		/*
		 * Cell Enter Only
		 */
		rowCell.enter().append('rect')
			.attr('class', 'cell')
			.style('opacity', 0.1)
			.style('fill', function(d, i) { return _scale.color(_fn.value(d, i)); })
			.attr('x', function(d, i){ return _scale.x(_fn.key(d, i)) + _cellMargin; })
			.attr('y', _cellMargin)
			.attr('height', _cellSize)
			.attr('width', _cellSize)
			.on('mouseover', _fn.onMouseOverCell)
			.on('mouseout', _fn.onMouseOutCell)
			.on('click', _fn.onClickCell);

		/*
		 * Cell Enter + Update
		 * Update fill, move to proper x coordinate
		 */
		rowCell.transition().duration(_duration)
			.style('opacity', 1)
			.attr('x', function(d, i){ return _scale.x(_fn.key(d, i)) + _cellMargin; })
			.style('fill', function(d, i) { return _scale.color(_fn.value(d, i)); });

		/*
		 * Cell Remove
		 */
		rowCell.exit().transition().duration(_duration)
			.attr('width', 0)
			.style('opacity', 0.1)
			.remove();

		return _instance;
	};


	_instance.cellSize = function(v) {
		if(!arguments.length) { return _cellSize; }
		_cellSize = v;
		return _instance;
	};
	_instance.cellMargin = function(v) {
		if(!arguments.length) { return _cellMargin; }
		_cellMargin = v;
		return _instance;
	};
	_instance.margin = function(v) {
		if(!arguments.length) { return _margin; }
		_margin = v;
		return _instance;
	};

	_instance.duration = function(v) {
		if(!arguments.length) { return _duration; }
		_duration = v;
		return _instance;
	};

	_instance.seriesKey = function(v) {
		if(!arguments.length) { return _fn.seriesKey; }
		_fn.seriesKey = v;
		return _instance;
	};
	_instance.seriesLabel = function(v) {
		if(!arguments.length) { return _fn.seriesLabel; }
		_fn.seriesLabel = v;
		return _instance;
	};
	_instance.seriesValues = function(v) {
		if(!arguments.length) { return _fn.seriesValues; }
		_fn.seriesValues = v;
		return _instance;
	};
	_instance.key = function(v) {
		if(!arguments.length) { return _fn.key; }
		_extent.x.getValue(v);
		_fn.key = v;
		return _instance;
	};
	_instance.value = function(v) {
		if(!arguments.length) { return _fn.value; }
		_fn.value = v;
		_extent.value.getValue(v);
		return _instance;
	};

	_instance.colorScale = function(v) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = v;
		return _instance;
	};
	_instance.xScale = function(v) {
		if(!arguments.length) { return _scale.xScale; }
		_scale.xScale = v;
		_axis.x.scale(v);
		return _instance;
	};
	_instance.yScale = function(v) {
		if(!arguments.length) { return _scale.yScale; }
		_scale.yScale = v;
		return _instance;
	};

	_instance.xExtent = function(v) {
		if(!arguments.length) { return _extent.x; }
		_extent.x = v;
		return _instance;
	};
	_instance.yExtent = function(v) {
		if(!arguments.length) { return _extent.y; }
		_extent.y = v;
		return _instance;
	};
	_instance.valueExtent = function(v) {
		if(!arguments.length) { return _extent.value; }
		_extent.value = v;
		return _instance;
	};

	_instance.dispatch = function(v) {
		if(!arguments.length) { return _dispatch; }
		return _instance;
	};

	return _instance;
}
sentio.chart.scatterLine = sentio_chart_scatter_line;
function sentio_chart_scatter_line() {
	'use strict';

	// Layout properties
	var _id = 'scatter_line' + Date.now();
	var _margin = { top: 20, right: 50, bottom: 20, left: 50 };
	var _width = 500;
	var _height = 500;
	var _lineGrouping = false;
	var _lineMethod = 'linear';
	var _showLegend = true;

	var _data = [];
	var _groups = {
		groups: [],
		hidden: []
	};
	var _paths = [];

	// Default scales for x and y dimensions
	var _scale = {
		x: d3.scale.linear(),
		y: d3.scale.linear(),
		color: d3.scale.category10()
	};

	// Accessor functions for points
	var _pointValue = {
		id: function(d) { return d[0]; },
		x: function(d) { return d[1]; },
		y: function(d) { return d[2]; },
		group: function(d) { return d[3]; },
		label: function(d) { return d[4]; }
	};

	// Extents
	var _extent = {
		x: sentio.util.extent({
			defaultValue: [-100, 100],
			getValue: function(d) { return _pointValue.x(d); }
		}),
		y: sentio.util.extent({
			defaultValue: [-100, 100],
			getValue: function(d) { return _pointValue.y(d); }
		})
	};

	var _axis = {
		x: d3.svg.axis()
			.scale(_scale.x)
			.orient('bottom')
			.innerTickSize(-_height)
			.ticks(5),
		y: d3.svg.axis()
			.scale(_scale.y)
			.orient('left')
			.innerTickSize(-_width)
			.ticks(5),
		labels: {
			x: undefined,
			y: undefined,
			m: undefined
		}
	};

	// elements
	var _element = {
		div: undefined,
		svg: undefined,
		tooltip: undefined,
		g: {
			xAxis: undefined,
			yAxis: undefined,
			axisLabels: {
				x: undefined,
				y: undefined
			},
			points: undefined,
			pointFocus: {
				g: undefined,
				x: undefined,
				y: undefined
			},
			paths: undefined,
			pathPointer: undefined,
			legend: undefined
		}
	};

	var _line = d3.svg.line().interpolate('linear');
	_line.x(function(d) { return _scale.x(d[0]); });
	_line.y(function(d) { return _scale.y(d[1]); });

	var _generatePoint = function(x, eq) {
		var a, b, c;
		var ret = 0;
		a = eq.equation[0];
		b = eq.equation[1];	
		if (_lineMethod === 'linear') {
			ret = a * x + b;
		} else if (_lineMethod === 'logarithmic') {
			ret = a + b * Math.log(x);
		} else if (_lineMethod === 'power') {
			ret = a * Math.pow(x, b);
		} else if (_lineMethod === 'exponential') {
			ret = a * Math.pow(Math.E, (x*b));
		} else if (_lineMethod === 'polynomial') {
			c = eq.equation[2];
			ret = c*Math.pow(x,2) + b*x + a;
		}
		return ret;
	};

	var _generatePoints = function(eq) {
		var ret = [];
		var a, b, c;
		var x, y, i;
		var range, start, end, steps;

		a = eq.equation[0];
		b = eq.equation[1];
		start = eq.points[0][0]-1;
		end = eq.points[eq.points.length-1][0]+1;
		range = _scale.x.domain()[1]-_scale.x.domain()[0];
		steps = Math.ceil((((end-start)/range)*(_width - _margin.left - _margin.right))/2);

		if (_lineMethod === 'linear') {
			ret.push([start, a * start + b]);
			ret.push([end, a * end + b]);
		} else if (_lineMethod === 'logarithmic') {
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);
				if (x > 0) {
					y = a + b * Math.log(x);
					ret.push([x, y]);
				}
			}
		} else if (_lineMethod === 'power') {
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);			
				y = a * Math.pow(x, b);
				if (y) {
					ret.push([x, y]);
				}
			}
		} else if (_lineMethod === 'exponential') {
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);			
				y = a * Math.pow(Math.E, (x*b));
				if (y) {
					ret.push([x, y]);
				}
			}
		} else if (_lineMethod === 'polynomial') {
			c = eq.equation[2];
			for (i = 0; i < steps; i++) {
				x = start + (end - start) * (i/steps);			
				y = c*Math.pow(x,2) + b*x + a;
				if (y) {
					ret.push([x, y]);
				}
			}
		}
		return ret;
	};

	var gaussianElimination = function(a, o) {
		var i = 0, j = 0, k = 0, maxrow = 0, tmp = 0, n = a.length - 1, x = new Array(o);
		for (i = 0; i < n; i++) {
			maxrow = i;
			for (j = i + 1; j < n; j++) {
				if (Math.abs(a[i][j]) > Math.abs(a[i][maxrow]))
					maxrow = j;
			}
			for (k = i; k < n + 1; k++) {
				tmp = a[k][i];
				a[k][i] = a[k][maxrow];
				a[k][maxrow] = tmp;
			}
			for (j = i + 1; j < n; j++) {
				for (k = n; k >= i; k--) {
					a[k][j] -= a[k][i] * a[i][j] / a[i][i];
				}
			}
		}
		for (j = n - 1; j >= 0; j--) {
			tmp = 0;
			for (k = j + 1; k < n; k++)
				tmp += a[k][j] * x[k];
			x[j] = (a[n][j] - tmp) / a[j][j];
		}
		return (x);
	};

	var _regression_fn = {
		linear: function(data) {
			var sum = [0, 0, 0, 0, 0], n = 0, results = [];

			for (; n < data.length; n++) {
				if (data[n][2] != null) {
					sum[0] += _pointValue.x(data[n]);
					sum[1] += _pointValue.y(data[n]);
					sum[2] += _pointValue.x(data[n]) * _pointValue.x(data[n]);
					sum[3] += _pointValue.x(data[n]) * _pointValue.y(data[n]);
					sum[4] += _pointValue.y(data[n]) * _pointValue.y(data[n]);
				}
			}

			var gradient = (n * sum[3] - sum[0] * sum[1]) / (n * sum[2] - sum[0] * sum[0]);

			var intercept = (sum[1] / n) - (gradient * sum[0]) / n;
			// var correlation = (n * sum[3] - sum[0] * sum[1]) / Math.sqrt((n * sum[2] - sum[0] * sum[0]) * (n * sum[4] - sum[1] * sum[1]));

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), _pointValue.x(data[i]) * gradient + intercept];
				results.push(coordinate);
			}
			results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(gradient*100) / 100 + 'x + ' + Math.round(intercept*100) / 100;

			return {equation: [gradient, intercept], points: results, string: string};
		},
		logarithmic: function(data) {
			var sum = [0, 0, 0, 0], n = 0, results = [];

			for (len = data.length; n < len; n++) {
				if (_pointValue.y(data[n]) != null) {
					sum[0] += Math.log(_pointValue.x(data[n]));
					sum[1] += _pointValue.y(data[n]) * Math.log(_pointValue.x(data[n]));
					sum[2] += _pointValue.y(data[n]);
					sum[3] += Math.pow(Math.log(_pointValue.x(data[n])), 2);
				}
			}

			var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
			var A = (sum[2] - B * sum[0]) / n;

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), A + B * Math.log(_pointValue.x(data[i]))];
				results.push(coordinate);
			}
			results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(A*100) / 100 + ' + ' + Math.round(B*100) / 100 + ' ln(x)';

			return {equation: [A, B], points: results, string: string};
		},
		power: function(data) {
			var sum = [0, 0, 0, 0], n = 0, results = [];

			for (len = data.length; n < len; n++) {
            	if (_pointValue.y(data[n]) != null) {
            		sum[0] += Math.log(_pointValue.x(data[n]));
            		sum[1] += Math.log(_pointValue.y(data[n])) * Math.log(_pointValue.x(data[n]));
            		sum[2] += Math.log(_pointValue.y(data[n]));
            		sum[3] += Math.pow(Math.log(_pointValue.x(data[n])), 2);
            	}
            }
			var B = (n * sum[1] - sum[2] * sum[0]) / (n * sum[3] - sum[0] * sum[0]);
			var A = Math.pow(Math.E, (sum[2] - B * sum[0]) / n);

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), A * Math.pow(_pointValue.x(data[i]), B)];
				results.push(coordinate);
			}
            results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(A*100) / 100 + 'x^' + Math.round(B*100) / 100;

			return {equation: [A, B], points: results, string: string};
		},
		exponential: function(data) {
			var sum = [0, 0, 0, 0, 0, 0], n = 0, results = [];

			for (len = data.length; n < len; n++) {
				if (data[n][2] != null) {
					sum[0] += _pointValue.x(data[n]);
					sum[1] += _pointValue.y(data[n]);
					sum[2] += _pointValue.x(data[n]) * _pointValue.x(data[n]) * _pointValue.y(data[n]);
					sum[3] += _pointValue.y(data[n]) * Math.log(_pointValue.y(data[n]));
					sum[4] += _pointValue.x(data[n]) * _pointValue.y(data[n]) * Math.log(_pointValue.y(data[n]));
					sum[5] += _pointValue.x(data[n]) * _pointValue.y(data[n]);
				}
			}

			var denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
			var A = Math.pow(Math.E, (sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
			var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;

			for (var i = 0, len = data.length; i < len; i++) {
				var coordinate = [_pointValue.x(data[i]), A * Math.pow(Math.E, B * _pointValue.x(data[i]))];
				results.push(coordinate);
			}
            results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ' + Math.round(A*100) / 100 + 'e^(' + Math.round(B*100) / 100 + 'x)';

			return {equation: [A, B], points: results, string: string};
		},
		polynomial: function(data, order) {
			if(typeof order == 'undefined'){
				order = 2;
			}
			var lhs = [], rhs = [], results = [], a = 0, b = 0, i = 0, k = order + 1, l, len;

			for (; i < k; i++) {
				for (l = 0, len = data.length; l < len; l++) {
					if (_pointValue.y(data[l]) != null) {
						a += Math.pow(_pointValue.x(data[l]), i) * _pointValue.y(data[l]);
					}
				}
				lhs.push(a);
				a = 0;
				var c = [];
				for (var j = 0; j < k; j++) {
					for (l = 0, len = data.length; l < len; l++) {
						if (_pointValue.y(data[l]) != null) {
							b += Math.pow(_pointValue.x(data[l]), i + j);
						}
					}
					c.push(b);
					b = 0;
				}
				rhs.push(c);
			}
			rhs.push(lhs);

			var equation = gaussianElimination(rhs, k);
			for (i = 0, len = data.length; i < len; i++) {
				var answer = 0;
				for (var w = 0; w < equation.length; w++) {
					answer += equation[w] * Math.pow(_pointValue.x(data[i]), w);
				}
				results.push([data[i][1], answer]);
			}
            results.sort(function(a, b) { return a[0] > b[0] ? 1 : -1; });

			var string = 'y = ';
			for(i = equation.length-1; i >= 0; i--){
				if(i > 1) string += Math.round(equation[i] * Math.pow(10, i)) / Math.pow(10, i)  + 'x^' + i + ' + ';
				else if (i == 1) string += Math.round(equation[i]*100) / 100 + 'x' + ' + ';
				else string += Math.round(equation[i]*100) / 100;
			}
			return {equation: equation, points: results, string: string};
		}
	};

	// Chart create/init method
	function _instance(selection){}

	function handleSVGMove() {
		/*jshint validthis: true */
		var mouse = d3.mouse(this);
		var x = mouse[0] - _margin.right;
		var xValue = _scale.x.invert(x);
		var y = 0;

		_paths.forEach(function(p) {
			var opacity = 0;
			if (xValue >= p.data[0][0] && xValue <= p.data[p.data.length-1][0] ) {
				opacity = 1;
				y = _generatePoint(xValue, p.eq);
			}
			_element.g.paths.selectAll('circle')
				.filter(function(c) { return c.id === p.id; })
				.attr('cx', x)
				.attr('cy', _scale.y(y))
				.attr('opacity', opacity);
		});

		

	}

	function handleSVGLeave() {
		_element.g.paths.selectAll('circle')
			.attr('opacity', '0');
	}


	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container){
		// Create the DIV element
		_element.div = container.append('div').attr('class', 'sentio scatter-line');

		_element.svg = _element.div.append('svg')
			.on('mousemove', handleSVGMove)
			.on('mouseleave', handleSVGLeave);

		_element.g.container = _element.svg.append('g');

		_element.g.xAxis = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.yAxis = _element.g.container.append('g').attr('class', 'y axis');

		_element.g.axisLabels.x = _element.svg.append('text')
			.attr('class', 'scatter-axis-label')
			.attr('text-anchor', 'end');

		_element.g.axisLabels.y = _element.svg.append('text')
			.attr('class', 'scatter-axis-label')
			.attr('text-anchor', 'end')
			.attr('x', -30)
			.attr('y', 60)
			.attr('dy', '.75em')
			.attr('transform', 'rotate(-90)');

		_element.g.points = _element.g.container.append('g').attr('class', 'points');

		_element.g.pointFocus.g = _element.g.container.append('g')
			.attr('class', 'point-focus');
		_element.g.pointFocus.x = _element.g.pointFocus.g.append('line')
			.attr('stroke-width', '1')
			.attr('x1', '0' );
		_element.g.pointFocus.y = _element.g.pointFocus.g.append('line')
			.attr('stroke-width', '1')
			.attr('y1', _height - _margin.top - _margin.bottom + 5); // Dunno why this needs a 5

		_element.g.paths = _element.g.container.append('g').attr('class', 'scatter-plots');

		_element.g.legend = _element.g.container.append('g').attr('class', 'scatter-legend');

		_element.tooltip = _element.div.append('div').attr('class', 'sentio-tooltip');

		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = v || [];

		return _instance;
	};

	_instance.axes = function(v) {
		if(!arguments.length) { return _axis.labels; }
		_axis.labels.x = v.x;
		_axis.labels.y = v.y;
		_axis.labels.m = v.m;
		return _instance;
	};

	_instance.groups = function(v) {
		if(!arguments.length) { return _groups; }
		_groups.groups = v;
		_groups.hidden = [];
		return _instance;
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		// Set up the x scale (y is fixed)
		_scale.x.range([0, _width - _margin.right - _margin.left]);
		_scale.y.range([_height - _margin.bottom - _margin.top, 0]);

		_element.svg.attr('width', _width).attr('height', _height);

		_element.g.xAxis.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');

		_element.g.container.attr('transform', 'translate('+_margin.left+','+_margin.top+')');

		return _instance;
	};

	function groupPoints(data) {
		var ret = {};
		data.forEach(function(d) {
			var groupName = _pointValue.group(d);
			if (!ret[groupName]) {
				ret[groupName] = [d];
			} else {
				ret[groupName].push(d);
			}
		});
		return ret;
	}

	function generatePaths(visibleData) {
		_paths = [];
		var eq, points;
		if (_lineGrouping) {
			var groupedData = groupPoints(visibleData);
			for (var groupName in groupedData) {
				if (groupedData[groupName].length > 1) {
					eq = _regression_fn[_lineMethod](groupedData[groupName]);
					points = _generatePoints(eq);
					_paths.push({id: groupName, data: points, color: _scale.color(groupName), eq: eq});
				}
			}
		} else {
			eq = _regression_fn[_lineMethod](visibleData);
			points = _generatePoints(eq);
			_paths.push({id: 'scatter_group_path', data: points, color: '#ff69b4', eq: eq});
		}
	}

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		var visibleData = _data.filter(function(d) {
			return _groups.hidden.indexOf(_pointValue.group(d)) === -1;
		});
		_paths = [];

		var xDomain = _extent.x.getExtent(visibleData);
		var yDomain = _extent.y.getExtent(visibleData);
		var xBuffer = xDomain[1] - xDomain[0] === 0 ? 5 : Math.ceil((xDomain[1] - xDomain[0]) * 0.1);
		var yBuffer = yDomain[1] - yDomain[0] === 0 ? 5 : Math.ceil((yDomain[1] - yDomain[0]) * 0.1);

		xDomain[0] -= xBuffer;
		xDomain[1] += xBuffer;
		_scale.x.domain(xDomain);

		yDomain[0] -= yBuffer;
		yDomain[1] += yBuffer;
		_scale.y.domain(yDomain);

		generatePaths(visibleData);

		updateAxes();
		updateLegend();
		updatePoints();
		updatePaths();

		return _instance;
	};

	function updateAxes() {
		// Update actual Axes
		_axis.x = _axis.x.innerTickSize(-(_height - _margin.top - _margin.bottom)).ticks(5);
		_axis.y = _axis.y.innerTickSize(-(_width - _margin.left - _margin.right)).ticks(5);

		_element.g.axisLabels.x
			.transition()
			.attr('x', _width - _margin.left - _margin.right + 35)
			.attr('y', _height - _margin.top - _margin.bottom + 10)
			.text(_axis.labels.x);

		_element.g.axisLabels.y
			.transition()
			.text(_axis.labels.y);

		if (null != _axis.x) {
			_element.g.xAxis.transition()
				.call(_axis.x)
				.selectAll('text')
				.attr('y', 10);
		}
		if (null != _axis.y) {
			_element.g.yAxis.transition()
				.call(_axis.y)
				.selectAll('text')
				.attr('x', -10);
		}

		// Update point ticks on x axis
		var xAxisTickJoin = _element.g.xAxis
			.selectAll('.point-x-tick')
			.data(_data, function(d) { return _pointValue.id(d); });

		var xAxisTickEnter = xAxisTickJoin.enter().append('line');

		xAxisTickEnter
			.attr('class', 'point-x-tick')
			.attr('opacity', '1')
			.attr('y1', 0)
			.attr('y2', 6)
			.attr('stroke-width', '1')
			.attr('stroke', function(d) { return _scale.color(_pointValue.group(d)); });

		xAxisTickJoin.transition()
			.attr('opacity', function(d) { return _groups.hidden.indexOf(_pointValue.group(d)) === -1 ? '1' : '0'; })
			.attr('x1', function(d) { return _scale.x(_pointValue.x(d)); })
			.attr('x2', function(d) { return _scale.x(_pointValue.x(d)); });

		xAxisTickJoin.exit().remove();


		// Update point ticks on y axis
		var yAxisTickJoin = _element.g.yAxis
			.selectAll('.point-y-tick')
			.data(_data, function(d) { return _pointValue.id(d); });

		var yAxisTickEnter = yAxisTickJoin.enter().append('line');

		yAxisTickEnter
			.attr('class', 'point-y-tick')
			.attr('opacity', '1')
			.attr('x1', -6)
			.attr('x2', 0)
			.attr('stroke-width', '1')
			.attr('stroke', function(d) { return _scale.color(_pointValue.group(d)); });

		yAxisTickJoin.transition()
			.attr('opacity', function(d) { return _groups.hidden.indexOf(_pointValue.group(d)) === -1 ? '1' : '0'; })
			.attr('y1', function(d) { return _scale.y(_pointValue.y(d)); })
			.attr('y2', function(d) { return _scale.y(_pointValue.y(d)); });

		yAxisTickJoin.exit().remove();
	}

	function handleLegendClick(d) {
		var idx = _groups.hidden.indexOf(d);
		if (idx === -1) {
			_groups.hidden.push(d);
		} else {
			_groups.hidden.splice(idx, 1);
		}
		if (_groups.hidden.length === _groups.groups.length) {
			_groups.hidden = [];
		}
		_instance.redraw();
	}

	function updateLegend() {
		var legendJoin = _element.g.legend
			.selectAll('.scatter-legend')
			.data(_groups.groups);

		var legendEnter = legendJoin.enter().append('g')
			.attr('class', 'scatter-legend')
			.on('click', handleLegendClick);

		legendJoin.transition()
			.attr('opacity', function(d) { 
				var ret;
				if (_showLegend) {
					ret = _groups.hidden.indexOf(d) === -1 ? '1' : '0.2'; 
				} else {
					ret = '0';
				}
				return ret;
			});


		var iconEnter = legendEnter.append('circle');
		var iconUpdate = legendJoin.select('circle');

		var labelEnter = legendEnter.append('text');
		var labelUpdate = legendJoin.select('text');

		iconEnter
			.attr('r', '8')
			.attr('stroke-width', '2')
			.attr('fill-opacity', '0.75');

		iconUpdate.transition().duration(100)
			.attr('cx', _width - _margin.right - _margin.left)
			.attr('cy', function(d, i) { return i * 25; })
			.attr('fill', function(d) { return _scale.color(d); })
			.attr('stroke', function(d) { return _scale.color(d); });

		labelEnter
			.attr('text-anchor', 'end');

		labelUpdate.transition().duration(100)
			.attr('x', _width - _margin.right - _margin.left - 20)
			.attr('y', function(d, i) { return (i * 25) + 3; })
			.text(function(d) { return d; });


		legendJoin.exit().remove();
	}

	function handlePointEnter(d) {
		// Hide other points
		_element.g.points.selectAll('.point')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '0.2');

		// Hide ticks for other points
		_element.g.xAxis.selectAll('.point-x-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '0.2');
		_element.g.yAxis.selectAll('.point-y-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '0.2');

		// Move and show point focus lines
		_element.g.pointFocus.x.transition().duration(100)
			.attr('opacity', '0.4')
			.attr('x2', _scale.x(_pointValue.x(d)) )
			.attr('y1', _scale.y(_pointValue.y(d)) )
			.attr('y2', _scale.y(_pointValue.y(d)) )
			.attr('stroke', _scale.color(_pointValue.group(d)) );
		_element.g.pointFocus.y.transition().duration(100)
			.attr('opacity', '0.4')
			.attr('x1', _scale.x(_pointValue.x(d)) )
			.attr('x2', _scale.x(_pointValue.x(d)) )
			.attr('y2', _scale.y(_pointValue.y(d)) )
			.attr('stroke', _scale.color(_pointValue.group(d)) );

		// Move and show tooltip
		_element.tooltip.html(
			'<b>' + _pointValue.label(d) + '</b><br>' + 
			_axis.labels.x+': '+_pointValue.x(d)+'<br>' + 
			_axis.labels.y+': '+_pointValue.y(d)+'<br>' +
			_axis.labels.m+': '+(_pointValue.y(d)/_pointValue.x(d)));
		var tooltip_width = _element.tooltip.node().getBoundingClientRect().width;
		_element.tooltip
			.style('top', (_scale.y(_pointValue.y(d)) + _margin.top + _margin.bottom - 30) + 'px')
			.style('left', (_scale.x(_pointValue.x(d)) + _margin.left + _margin.right - 20 - tooltip_width) + 'px');
		_element.tooltip.transition().duration(1000).style('visibility', 'visible');
	}

	function handlePointExit(d) {
		_element.g.points.selectAll('.point')
			.transition().duration(100)
			.attr('opacity', '1');

		_element.g.xAxis.selectAll('.point-x-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '1');
		_element.g.yAxis.selectAll('.point-y-tick')
			.filter(function(p) { return _pointValue.id(p) !== _pointValue.id(d); })
			.transition().duration(100)
			.attr('opacity', '1');

		_element.g.pointFocus.x.transition().duration(100)
			.attr('opacity', '0');
		_element.g.pointFocus.y.transition().duration(100)
			.attr('opacity', '0');


		_element.tooltip.transition().duration(1000).style('visibility', 'hidden');
	}

	function updatePoints() {
		var pointJoin = _element.g.points
			.selectAll('.point')
			.data(_data, function(d) { return _pointValue.id(d)+'_'+_pointValue.x(d)+'_'+_pointValue.y(d); });

		var pointEnter = pointJoin.enter().append('g')
			.attr('class', 'point')
			.attr('opacity', '1')
			.on('mouseover', handlePointEnter)
			.on('mouseleave', handlePointExit);

		pointJoin.transition()
			.attr('opacity', function(d) { return _groups.hidden.indexOf(_pointValue.group(d)) === -1 ? '1' : '0'; });

		var circleEnter = pointEnter.append('circle');
		var circleUpdate = pointJoin.select('circle');

		circleEnter
			.attr('r', '5')
			.attr('fill', function(d, i) { return _scale.color(_pointValue.group(d)); })
			.attr('fill-opacity', '0.5')
			.attr('stroke', function(d, i) { return d3.rgb(_scale.color(_pointValue.group(d))).brighter(); })
			.attr('stroke-width', '1');

		circleUpdate.transition()
			.attr('cx', function(d) { return _scale.x(_pointValue.x(d)); })
			.attr('cy', function(d) { return _scale.y(_pointValue.y(d)); });

		pointJoin.exit().remove();
	}

	function updatePaths() {

		var pathJoin = _element.g.paths
			.selectAll('.scatter-path')
			.data(_paths, function(d) { return d.id; });

		var pathEnter = pathJoin.enter().append('g')
			.attr('class', 'scatter-path')
			.attr('opacity', '1');

		var lineEnter = pathEnter.append('path');
		var lineUpdate = pathJoin.select('path');

		var pointEnter = pathEnter.append('circle');

		lineEnter
			.attr('stroke', function(d) { return d.color; })
			.attr('stroke-width', '1.5')
			.attr('fill', 'none');

		lineUpdate.transition()
			.attr('d', function(d) { return _line(d.data); });

		pointEnter
			.attr('r', '5')
			.attr('cx', '0')
			.attr('cy', '0')
			.attr('stroke-width', '.5')
			.attr('stroke', 'white')
			.attr('fill', function(d) { return d3.rgb(d.color).brighter(2); })
			.attr('opacity', '0');

		pathJoin.exit().transition().attr('opacity', '0').remove();
	}

	// Basic Getters/Setters
	_instance.width = function(v) {
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v) {
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};
	_instance.lineGrouping = function(v) {
		if(!arguments.length) { return _lineMethod; }
		_lineGrouping = v;
		return _instance;
	};
	_instance.lineMethod = function(v) {
		if(!arguments.length) { return _lineMethod; }
		_lineMethod = v;
		return _instance;
	};
	_instance.showLegend = function(v) {
		if(!arguments.length) { return _showLegend; }
		_showLegend = v;
		return _instance;
	};

	return _instance;

}
sentio.chart.verticalBars = sentio_chart_vertical_bars;

function sentio_chart_vertical_bars() {
	'use strict';

	// Layout properties
	var _id = 'vertical_bars_' + Date.now();
	var _margin = { top: 0, right: 0, bottom: 0, left: 0 };
	var _width = 100;
	var _barHeight = 24;
	var _barPadding = 2;
	var _duration = 500;

	// d3 dispatcher for handling events
	var _dispatch = d3.dispatch('onmouseover', 'onmouseout', 'onclick');
	var _fn = {
		onMouseOver: function(d, i) {
			_dispatch.onmouseover(d, this);
		},
		onMouseOut: function(d, i) {
			_dispatch.onmouseout(d, this);
		},
		onClick: function(d, i) {
			_dispatch.onclick(d, this);
		}
	};

	// Default accessors for the dimensions of the data
	var _value = {
		key: function(d, i) { return d.key; },
		value: function(d, i) { return d.value; },
		label: function(d, i) { return d.key + ' (' + d.value + ')'; }
	};

	// Default scales for x and y dimensions
	var _scale = {
		x: d3.scale.linear(),
		y: d3.scale.linear()
	};

	// Extents
	var _extent = {
		width: sentio.util.extent({
			defaultValue: [0, 10],
			getValue: _value.value
		})
	};

	// elements
	var _element = {
		div: undefined
	};

	var _data = [];

	// Chart create/init method
	function _instance(selection){}

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container){
		// Create the DIV element
		_element.div = container.append('div').attr('class', 'sentio bars-vertical');
		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = v || [];

		return _instance;
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		// Set up the x scale (y is fixed)
		_scale.x.range([0, _width - _margin.right - _margin.left]);

		return _instance;
	};

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		// Update the x domain
		_scale.x.domain(_extent.width.getExtent(_data));

		// Update the y domain (based on configuration and data)
		_scale.y.domain([0, _data.length]);
		_scale.y.range([0, (_barHeight + _barPadding) * _data.length]);

		// Data Join
		var div = _element.div.selectAll('div.bar')
			.data(_data, _value.key);

		// Update Only

		// Enter
		var bar = div.enter().append('div')
			.attr('class', 'bar')
			.style('top', (_scale.y.range()[1] + _margin.top + _margin.bottom - _barHeight) + 'px')
			.style('height', _barHeight + 'px')
			.on('mouseover', _fn.onMouseOver)
			.on('mouseout', _fn.onMouseOut)
			.on('click', _fn.onClick)
			.style('opacity', 0.01);

		bar.append('div')
			.attr('class', 'bar-label');

		// Enter + Update
		div.transition().duration(_duration)
			.style('opacity', 1)
			.style('width', function(d, i) { return _scale.x(_value.value(d, i)) + 'px'; })
			.style('top', function(d, i) { return (_scale.y(i) + _margin.top) + 'px'; })
			.style('left', _margin.left + 'px');

		div.select('div.bar-label')
			.html(_value.label)
			.style('max-width', (_scale.x.range()[1] - 10) + 'px');

		// Exit
		div.exit()
			.transition().duration(_duration)
			.style('opacity', 0.01)
			.style('top', (_scale.y.range()[1] + _margin.top + _margin.bottom - _barHeight) + 'px' )
			.remove();

		// Update the size of the parent div
		_element.div
			.style('height', (_margin.bottom + _margin.top + _scale.y.range()[1]) + 'px');

		return _instance;
	};


	// Basic Getters/Setters
	_instance.width = function(v) {
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.barHeight = function(v) {
		if(!arguments.length) { return _barHeight; }
		_barHeight = v;
		return _instance;
	};
	_instance.barPadding = function(v) {
		if(!arguments.length) { return _barPadding; }
		_barPadding = v;
		return _instance;
	};
	_instance.margin = function(v) {
		if(!arguments.length) { return _margin; }
		_margin = v;
		return _instance;
	};
	_instance.key = function(v) {
		if(!arguments.length) { return _value.key; }
		_value.key = v;
		return _instance;
	};
	_instance.value = function(v) {
		if(!arguments.length) { return _value.value; }
		_value.value = v;
		_extent.width.getValue(v);
		return _instance;
	};
	_instance.label = function(v) {
		if(!arguments.length) { return _value.label; }
		_value.label = v;
		return _instance;
	};
	_instance.widthExtent = function(v) {
		if(!arguments.length) { return _extent.width; }
		_extent.width = v;
		return _instance;
	};
	_instance.dispatch = function(v) {
		if(!arguments.length) { return _dispatch; }
		return _instance;
	};
	_instance.duration = function(v) {
		if(!arguments.length) { return _duration; }
		_duration = v;
		return _instance;
	};

	return _instance;
}
var sentio_timeline = sentio.timeline = {};
sentio.timeline.line = sentio_timeline_line;

function sentio_timeline_line() {
	'use strict';

	// Layout properties
	var _id = 'timeline_line_' + Date.now();
	var _margin = { top: 10, right: 10, bottom: 20, left: 40 };
	var _height = 100, _width = 600;

	/*
	 * Callback function for hovers over the markers. Invokes this function
	 * with the data from the marker payload
	 */
	var _markerHoverCallback = null;

	// Default accessors for the dimensions of the data
	var _value = {
		x: function(d, i) { return d[0]; },
		y: function(d, i) { return d[1]; }
	};

	// Accessors for the positions of the markers
	var _markerValue = {
		x: function(d, i) { return d[0]; },
		label: function(d, i) { return d[1]; }
	};

	var now = Date.now();
	var _extent = {
		x: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return d[0]; }
		}),
		y: sentio.util.extent({
			getValue: function(d) { return d[1]; }
		})
	};
	var _multiExtent = sentio.util.multiExtent().values(function(d) { return d.data; });

	// Default scales for x and y dimensions
	var _scale = {
		x: d3.time.scale(),
		y: d3.scale.linear()
	};

	// Default Axis definitions
	var _axis = {
		x: d3.svg.axis().scale(_scale.x).orient('bottom'),
		y: d3.svg.axis().scale(_scale.y).orient('left').ticks(3)
	};

	// g elements
	var _element = {
		svg: undefined,
		g: {
			container: undefined,
			plots: undefined,
			xAxis: undefined,
			yAxis: undefined,
			markers: undefined,
			brush: undefined
		},
		plotClipPath: undefined,
		markerClipPath: undefined
	};

	// Line generator for the plot
	var _line = d3.svg.line().interpolate('linear');
	_line.x(function(d, i) {
		return _scale.x(_value.x(d, i));
	});
	_line.y(function(d, i) {
		return _scale.y(_value.y(d, i));
	});

	// Area generator for the plot
	var _area = d3.svg.area().interpolate('linear');
	_area.x(function(d, i) {
		return _scale.x(_value.x(d, i));
	});
	_area.y1(function(d, i) {
		return _scale.y(_value.y(d, i));
	});

	// Brush filter
	var _filter = {
		enabled: false,
		brush: d3.svg.brush(),
		dispatch: d3.dispatch('filter', 'filterstart', 'filterend')
	};

	var _data = [];

	var _markers = {
		values: [],
		dispatch: d3.dispatch('onclick')
	};

	function brushstart() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filterstart([isEmpty, min, max]);
	}
	function brush() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filter([isEmpty, min, max]);
	}
	function brushend() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filterend([isEmpty, min, max]);
	}

	// Chart create/init method
	function _instance(selection){}

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container){
		// Create a container div
		_element.div = container.append('div').attr('class', 'sentio timeline');

		// Create the SVG element
		_element.svg = _element.div.append('svg');

		// Add the defs and add the clip path definition
		_element.plotClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'plot_' + _id).append('rect');
		_element.markerClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'marker_' + _id).append('rect');

		// Append a container for everything
		_element.g.container = _element.svg.append('g');

		// Append the path group (which will have the clip path and the line path
		_element.g.plots = _element.g.container.append('g').attr('class', 'plots').attr('clip-path', 'url(#plot_' + _id + ')');

		// If the filter is enabled, add it
		if(_filter.enabled) {
			_element.g.brush = _element.g.container.append('g').attr('class', 'x brush');
			_element.g.brush.call(_filter.brush)
				.selectAll('rect').attr('y', -6);
			_filter.brush
				.on('brushend', brushend)
				.on('brushstart', brushstart)
				.on('brush', brush);
		}

		// Append a group for the markers
		_element.g.markers = _element.g.container.append('g').attr('class', 'markers').attr('clip-path', 'url(#marker_' + _id + ')');

		// Append groups for the axes
		_element.g.xAxis = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.yAxis = _element.g.container.append('g').attr('class', 'y axis');

		_instance.resize();

		return _instance;
	};

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = v;

		return _instance;
	};

	/*
	 * Set the markers data
	 */
	_instance.markers = function(v) {
		if(!arguments.length) { return _markers.dispatch; }
		_markers.values = v;
		return _instance;
	};

	/*
	 * Accepts the hovered element and conditionally invokes
	 * the marker hover callback if both the function and data
	 * are non-null
	 */
	function invokeMarkerCallback(d) {
		// fire an event with the payload
		if(null != _markerHoverCallback) {
			_markerHoverCallback(d);
		}
	}

	function markerClicked(d) {
		_markers.dispatch.onclick(d);
	}

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		var now = Date.now();

		// Set up the scales
		_scale.x.range([0, Math.max(0, _width - _margin.left - _margin.right)]);
		_scale.y.range([Math.max(0, _height - _margin.top - _margin.bottom), 0]);

		// Append the clip path
		_element.plotClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));
		_element.markerClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));

		// Now update the size of the svg pane
		_element.svg.attr('width', _width).attr('height', _height);

		// Update the positions of the axes
		_element.g.xAxis.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');
		_element.g.yAxis.attr('class', 'y axis');

		// update the margins on the main draw group
		_element.g.container.attr('transform', 'translate(' + _margin.left + ',' + _margin.top + ')');

		return _instance;
	};

	// Multi Extent Combiner
	function multiExtent(data, extent) {
		return _multiExtent.extent(extent).getExtent(data);
	}

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {
		// Need to grab the filter extent before we change anything
		var filterExtent = getFilter();

		// Update the x domain (to the latest time window)
		_scale.x.domain(multiExtent(_data, _extent.x));

		// Update the y domain (based on configuration and data)
		_scale.y.domain(multiExtent(_data, _extent.y));

		// Update the plot elements
		updateAxes();
		updateLine();
		updateMarkers();
		updateFilter(filterExtent);

		return _instance;
	};

	function updateAxes() {
		if(null != _axis.x) {
			_element.g.xAxis.call(_axis.x);
		}
		if(null != _axis.y) {
			_element.g.yAxis.call(_axis.y);
		}
	}

	function updateLine() {
		// Join
		var plotJoin = _element.g.plots
			.selectAll('.plot')
			.data(_data, function(d) { 
				return d.key; 
			});

		// Enter
		var plotEnter = plotJoin.enter().append('g')
			.attr('class', 'plot');

		plotEnter.append('g').append('path').attr('class', function(d) { return ((d.cssClass)? d.cssClass : '') + ' line'; });
		plotEnter.append('g').append('path').attr('class', function(d) { return ((d.cssClass)? d.cssClass : '') + ' area'; });

		var lineUpdate = plotJoin.select('.line');
		var areaUpdate = plotJoin.select('.area');

		// Update
		lineUpdate.datum(function(d) { return d.data; }).attr('d', _line);
		areaUpdate.datum(function(d) { return d.data; }).attr('d', _area.y0(_scale.y.range()[0]));

		// Exit
		var plotExit = plotJoin.exit();
		plotExit.remove();

	}

	function updateMarkers() {
		// Join
		var markerJoin = _element.g.markers
			.selectAll('.marker')
			.data(_markers.values, function(d) {
				return _markerValue.x(d); 
			});

		// Enter
		var markerEnter = markerJoin.enter().append('g')
			.attr('class', 'marker')
			.on('mouseover', invokeMarkerCallback)
			.on('click', markerClicked);

		var lineEnter = markerEnter.append('line');
		var textEnter = markerEnter.append('text');

		var lineUpdate = markerJoin.select('line');
		var textUpdate = markerJoin.select('text');

		lineEnter
			.attr('y1', function(d) { return _scale.y.range()[1]; })
			.attr('y2', function(d) { return _scale.y.range()[0]; });

		textEnter
			.attr('dy', '0em')
			.attr('y', -3)
			.attr('text-anchor', 'middle')
			.text(function(d) { return _markerValue.label(d); });

		// Update
		lineUpdate
			.attr('x1', function(d) { return _scale.x(_markerValue.x(d)); })
			.attr('x2', function(d) { return _scale.x(_markerValue.x(d)); });

		textUpdate
			.attr('x', function(d) { return _scale.x(_markerValue.x(d)); });

		// Exit
		var markerExit = markerJoin.exit().remove();

	}

	/*
	 * Get the current state of the filter
	 * Returns undefined if the filter is disabled or not set, millsecond time otherwise
	 */
	function getFilter() {
		var extent;
		if(_filter.enabled && !_filter.brush.empty()) {
			extent = _filter.brush.extent();
			if(null != extent) {
				extent = [ extent[0].getTime(), extent[1].getTime() ];
			}
		}

		return extent;
	}

	/*
	 * Set the state of the filter, firing events if necessary
	 */
	function setFilter(newExtent, oldExtent) {
		// Fire the event if the extents are different
		var suppressEvent = newExtent == oldExtent || newExtent == null || oldExtent == null || (newExtent[0] == oldExtent[0] && newExtent[1] == oldExtent[1]);
		var clearFilter = (null == newExtent || newExtent[0] >= newExtent[1]);

		// either clear the filter or assert it
		if(clearFilter) {
			_filter.brush.clear();
		} else {
			_filter.brush.extent([ new Date(newExtent[0]), new Date(newExtent[1]) ]);
		}

		// fire the event if anything changed
		if(!suppressEvent) {
			_filter.brush.event(_element.g.brush);
		}
	}

	/*
	 * Update the state of the existing filter (if any) on the plot.
	 * 
	 * This method accepts the extent of the brush before any plot changes were applied
	 * and updates the brush to be redrawn on the plot after the plot changes are applied.
	 * There is also logic to clip the brush if the extent has moved such that the brush
	 * has moved partially out of the plot boundaries, as well as to clear the brush if it
	 * has moved completely outside of the boundaries of the plot.
	 */
	function updateFilter(extent) {
		// Don't need to do anything if filtering is not enabled
		if(_filter.enabled) {
			// Reassert the x scale of the brush (in case the scale has changed)
			_filter.brush.x(_scale.x);

			// Derive the overall plot extent from the collection of series
			var plotExtent = multiExtent(_data, _extent.x);

			// If there was no previous extent, then there is no brush to update
			if(null != extent) {
				// Clip extent by the full extent of the plot (this is in case we've slipped off the visible plot)
				var nExtent = [ Math.max(plotExtent[0], extent[0]), Math.min(plotExtent[1], extent[1]) ];
				setFilter(nExtent, extent);
			}

			_element.g.brush
				.call(_filter.brush)
				.selectAll('rect')
					.attr('height', _height - _margin.top - _margin.bottom + 7);
		}
	}

	// Basic Getters/Setters
	_instance.width = function(v){
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v){
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};
	_instance.margin = function(v){
		if(!arguments.length) { return _margin; }
		_margin = v;
		return _instance;
	};
	_instance.interpolation = function(v){
		if(!arguments.length) { return _line.interpolate(); }
		_line.interpolate(v);
		_area.interpolate(v);
		return _instance;
	};
	_instance.xAxis = function(v){
		if(!arguments.length) { return _axis.x; }
		_axis.x = v;
		return _instance;
	};
	_instance.yAxis = function(v){
		if(!arguments.length) { return _axis.y; }
		_axis.y = v;
		return _instance;
	};
	_instance.xScale = function(v){
		if(!arguments.length) { return _scale.x; }
		_scale.x = v;
		if(null != _axis.x) {
			_axis.x.scale(v);
		}
		return _instance;
	};
	_instance.yScale = function(v){
		if(!arguments.length) { return _scale.y; }
		_scale.y = v;
		if(null != _axis.y) {
			_axis.y.scale(v);
		}
		return _instance;
	};
	_instance.xValue = function(v){
		if(!arguments.length) { return _value.x; }
		_value.x = v;
		return _instance;
	};
	_instance.yValue = function(v){
		if(!arguments.length) { return _value.y; }
		_value.y = v;
		return _instance;
	};
	_instance.yExtent = function(v){
		if(!arguments.length) { return _extent.y; }
		_extent.y = v;
		return _instance;
	};
	_instance.xExtent = function(v){
		if(!arguments.length) { return _extent.x; }
		_extent.x = v;
		return _instance;
	};
	_instance.markerXValue = function(v){
		if(!arguments.length) { return _markerValue.x; }
		_markerValue.x = v;
		return _instance;
	};
	_instance.markerLabelValue = function(v){
		if(!arguments.length) { return _markerValue.label; }
		_markerValue.label = v;
		return _instance;
	};
	_instance.markerHover = function(v) {
		if(!arguments.length) { return _markerHoverCallback; }
		_markerHoverCallback = v;
		return _instance;
	};
	_instance.filter = function(v) {
		if(!arguments.length) { return _filter.dispatch; }
		_filter.enabled = v;
		return _instance;
	};

	// Expects milliseconds time
	_instance.setFilter = function(extent) {
		var oldExtent = getFilter();
		if(null != extent && extent.length === 2) {
			// Convert to Dates and assert filter
			if(extent[0] instanceof Date) {
				extent[0] = extent[0].getTime();
			}
			if(extent[1] instanceof Date) {
				extent[1] = extent[1].getTime();
			}
		}

		setFilter(extent, oldExtent);
		_instance.redraw();
		return _instance;
	};

	return _instance;
}
var sentio_realtime = sentio.realtime = {};
sentio.realtime.timeline = sentio_realtime_timeline;

function sentio_realtime_timeline() {
	'use strict';

	// Default data delay, this is the difference between now and the latest tick shown on the timeline
	var _delay = 0;

	// Interval of the timeline, this is the amount of time being displayed by the timeline
	var _interval = 60000;

	// Is the timeline running?
	var _running = false;
	var _timeout = null;

	// What is the refresh rate?
	var _fps = 32;

	var _instance = sentio.timeline.line();
	_instance.yExtent().filter(function(d) {
		var x = _instance.xValue()(d);
		var xExtent = _instance.xExtent().getExtent();
		return (x < xExtent[1] && x > xExtent[0]);
	});

	/*
	 * This is the main update loop function. It is called every time the
	 * _instance is updating to proceed through time.
	 */ 
	function tick() {
		// If not running, let the loop die
		if(!_running) return;

		_instance.redraw();

		// Schedule the next update
		_timeout = window.setTimeout(tick, (_fps > 0)? 1000/_fps : 0);
	}

	/*
	 * Redraw the graphic
	 */
	var parentRedraw = _instance.redraw;
	_instance.redraw = function() {
		// Update the x domain (to the latest time window)
		var now = new Date();
		_instance.xExtent().overrideValue([now - _delay - _interval, now - _delay]);

		parentRedraw();
		return _instance;
	};

	_instance.start = function() {
		if(_running){ return; }
		_running = true;

		tick();
		return _instance;
	};

	_instance.stop = function() {
		_running = false;

		if(_timeout != null) {
			window.clearTimeout(_timeout);
		}
		return _instance;
	};

	_instance.restart = function() {
		_instance.stop();
		_instance.start();
		return _instance;
	};

	_instance.interval = function(v) {
		if(!arguments.length) { return _interval; }
		_interval = v;
		return _instance;
	};

	_instance.delay = function(v) {
		if(!arguments.length) { return _delay; }
		_delay = v;
		return _instance;
	};

	_instance.fps = function(v){
		if(!arguments.length) { return _fps; }
		_fps = v;
		if(_running) {
			_instance.restart();
		}
		return _instance;
	};

	return _instance;
}
var sentio_chord = sentio.chord = {};
sentio.chord.basic = sentio_chord_basic;
function sentio_chord_basic() {
	'use strict';

	var _id = 'chord_basic_' + Date.now();

	// var _margin = {top: 40, right: 40, bottom: 40, left: 40};
	var _width = 960, _height = 960;
	var _outerRadius = _width / 2;
	var _innerRadius = _outerRadius - 80;

	// var _data;
	var _data = [];

	var _labels = [];

	var _colorScale = d3.scale.category20c();

	var _chord = d3.layout.chord()
			.padding(0.04)
			.sortSubgroups(d3.descending)
			.sortChords(d3.descending);

	var _arc = d3.svg.arc()
			.innerRadius(_innerRadius)
			.outerRadius(_innerRadius + 20);

	var _element = {
		div: undefined,
		svg: undefined,
		g: undefined,
		tooltip: undefined
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio chord');

		_element.svg = _element.div.append('svg');

		_element.g = _element.svg.append('g');

		_element.tooltip = _element.svg.append('div')
			.attr('class', 'chord-tooltip')
			.style('opacity', '0');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.svg.attr('width', _width).attr('height', _height);

		_outerRadius = _width / 2 - 20;
		_innerRadius = _outerRadius - 80;

		_element.g.attr("transform", "translate(" + (_outerRadius+10) + "," + (_outerRadius+10) + ")");

		_arc = d3.svg.arc()
			.innerRadius(_innerRadius)
			.outerRadius(_innerRadius + 20);

		return _instance;
	};

	function getRelevantSources(d) {
		var ret = [d.index];
		
		_chord.chords().forEach(function(chord) {
			if (chord.source.index === d.index) {
				if (ret.indexOf(chord.target.index) === -1) {
					ret.push(chord.target.index);
				}
			}
		});

		return ret;
	}

	function updateSources() {

		var sourceJoin = _element.g.selectAll('.group')
				.data(_chord.groups);

		var sourceEnter = sourceJoin.enter().append('g')
				.attr('class', 'group')
				.attr('opacity', '1');

		var sourceArcEnter = sourceEnter.append('path');
		var sourceLabelEnter = sourceEnter.append('text');

		sourceArcEnter
			.attr('class', 'source')
			.style('fill', function(d) { return _colorScale(d.index); })
			.style('stroke', function(d) { return _colorScale(d.index); })
			.on('mouseover', function(d) {
				_element.g.selectAll('.link')
					.filter(function(l) { return l.source.index !== d.index; })
					.transition().duration(100)
					.style('opacity', '0.1');

				// Get all node indicies to hide
				var toShow = getRelevantSources(d);

				_element.g.selectAll('.group')
					.filter(function(s) {
						return toShow.indexOf(s.index) === -1;
					})
					.transition().duration(100)
					.style('opacity', '0.1');
				_element.tooltip
					.style('opacity', '0.9')
					.html(_labels[d.index] + "<br/>" + d.value);
			})
			.on('mousemove', function(d) {
				var mouse = d3.mouse(this);
				// console.log(d3.event);
				_element.tooltip
					.style('left', (mouse[0] + _width / 2) + 'px')
					.style('top', (mouse[1] + _height / 2) + 'px');
			})
			.on('mouseout', function(d) {
				_element.g.selectAll('.link')
					.transition().duration(100)
					.style('opacity', '1');
				_element.g.selectAll('.group')
					.transition().duration(100)
					.style('opacity', '1');
				_element.tooltip.transition().duration(100)
					.style('opacity', '0');
			});
		
		sourceLabelEnter
			.attr('class', 'source-label');


		var sourceArcUpdate = sourceJoin.select('.source');
		var sourceLabelUpdate = sourceJoin.select('.source-label');

		sourceArcUpdate.transition().duration(100)
			.attr('d', _arc);

		sourceLabelUpdate.transition().duration(100)
			.each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
			.attr('transform', function(d) {
				return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + 
					   "translate(" + (_innerRadius + 26) + ")" +
					   (d.angle > Math.PI ? "rotate(180)" : "");
			})
			.style('text-anchor', function(d) { return d.angle > Math.PI ? "end" : null; })
			.text(function(d) { return _labels[d.index]; });

		
		var sourceExit = sourceJoin.exit().remove();

	}

	function updateChords() {
		var chordJoin = _element.g.selectAll('.link')
			.data(_chord.chords);

		var chordEnter = chordJoin.enter().append('g')
			.attr('class', 'link')
			.style('opacity', '1');

		var linkEnter = chordEnter.append('path');

		linkEnter
			.attr('class', 'link-path')
			.style("stroke", function(d) { return d3.rgb(_colorScale(d.source.index)).darker(); })
			.style("fill", function(d) { return _colorScale(d.source.index); })
			.on('mouseover', function(d) {
				_element.g.selectAll('.link')
					.filter(function(p) { return p !== d; })
					.transition().duration(100)
					.style('opacity', '0.1');
				_element.g.selectAll('.group')
					.filter(function(s) { return s.index !== d.source.index && s.index !== d.target.index; })
					.transition().duration(100)
					.style('opacity', '0.1');
			})
			.on('mouseout', function(d, i) {
				_element.g.selectAll('.link')
					.transition().duration(100)
					.style('opacity', '1');
				_element.g.selectAll('.group')
					.transition().duration(100)
					.style('opacity', '1');
				_element.tooltip.transition().duration(100)
					.style('opacity', '0');
			});

		var linkUpdate = chordJoin.select('.link-path');

		linkUpdate.transition().duration(100)
			.attr("d", d3.svg.chord().radius(_innerRadius));

		var chordExit = chordJoin.exit().remove();
	}

	_instance.redraw = function() {

		_chord.matrix(_data);

		updateSources();
		updateChords();

		return _instance;
	};

	_instance.data = function(d) {
		if(!arguments.length) { return _data; }
		_labels = d.pop();
		_data = d;
		return _instance;
	};
	_instance.width = function(v) {
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v) {
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};


	return _instance;
}
var sentio_line = sentio.line = {};
sentio.line.line = sentio_line_line;
function sentio_line_line() {
	'use strict';

	// Layout properties
	var _id = 'line_line_' + Date.now();
	// var _margin = { top: 20, right: 200, bottom: 50, left: 40 };

	var _margin = { top: 20, right: 60, bottom: 50, left: 60 };
	var _height = 500, _width = 800;

	var _lockYAxis = true;	// Set whether the Y axis will automatically change as data changes.
	var _lockedY = 1;		// Set default max Y axis value.
	var _stacked = false;	// Set whether different series will stack on top of eachother rather than overlay.
	var _showMarkers = true;	// Set default boolean for showing markers

	// Values for tracking mouse movements on graph and selected elements.
	var _selected = {
		time: 0,
		points: [],
		markers: []
	};

	// Container for legend information to be passed out of sentio.
	var _legend_content = {
		series: undefined,
		markers: undefined,
	};

	/*
	 * Array of series slugs that are hidden from the user.
	 */
	var _hidden_series = [];

	/*
	 * Callback function for hovers over the markers. Invokes this function
	 * with the data from the marker payload
	 */
	var _markerHoverCallback = null;

	/*
	 * Callback function for hovers over plot points.
	 */
	var _hoverCallback = null;

	/*
	 * Callback function to pass legend information
	 */
	var _legendCallback = null;

	// Default accessors for the dimensions of the data
	var _value = {
		x: function(d) { return d[0]; },
		y: function(d) { return d[1]; },
		y__stacked: function(d) { return d[2]; }
	};

	// Default accessors for point information.
	var _pointValue = {
		x: function(d) { return d[0]; },
		y: function(d) { return _stacked ? d[2] : d[1]; },
		series: function(d) { return d[3]; },
		slug: function(d) { return d[4]; },
		color_index: function(d) { return d[5]; }
	};

	// Accessors for the positions of the markers
	var _markerValue = {
		label: function(d, i) { return d[0]; },
		slug: function(d, i) { return d[1]; },
		start: function(d, i) { return d[2]; },
		end: function(d, i) { return d[3]; }
	};

	var now = Date.now();
	var _extent = {
		x: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return _pointValue.x(d[1]); }
		}),
		y: sentio.util.extent({
			getValue: function(d) { return _hidden_series.indexOf(d[0]) === -1 ? _pointValue.y(d[1]) : 0; }
		})
	};
	var _multiExtent = sentio.util.multiExtent().values(function(d) { 
		var extentData = d.data.map(function(e) {
			return [d.key, e];
		});
		return extentData; 
	});

	// Default scales for x and y dimensions
	var _scale = {
		x: d3.time.scale(),
		y: d3.scale.linear(),
		color: d3.scale.category10(),
		marker_color: ['#2CA02C', '#98DF8A', '#9467BD', '#C5B0D5']
	};

	// Bisector for hover line
	var _bisectDate = d3.bisector(function(d) { return d[0]; }).left;

	// Default Axis definitions
	var _axis = {
		x: d3.svg.axis()
			.scale(_scale.x)
			.orient('bottom')
			.innerTickSize(-_height)
			.ticks(7)
			.tickFormat(d3.time.format("%m/%d")),
		y: d3.svg.axis()
			.scale(_scale.y)
			.orient('left')
			.innerTickSize(-_width)
			.ticks(10),
		xLabel: undefined,
		yLabel: undefined
	};

	// g elements
	var _element = {
		svg: undefined,
		g: {
			xAxis: undefined,
			yAxis: undefined,
			xLabel: undefined,
			yLabel: undefined,
			mouseContainer: undefined,
			hoverLine: undefined,
			container: undefined,
			markers: undefined,
			plots: undefined,
			points: undefined,
			brush: undefined
		},
		tooltip: undefined,
		plotClipPath: undefined,
		markerClipPath: undefined,
		pointClipPath: undefined
	};

	// Line generator for the plot
	var _line = d3.svg.line().interpolate('basis');
	_line.x(function(d) {
		return _scale.x(_value.x(d));
	});
	_line.y(function(d) {
		return _stacked ? _scale.y(_value.y__stacked(d)) : _scale.y(_value.y(d));
	});

	// Area generator for the plot
	var _area = d3.svg.area().interpolate('basis');
	_area.x(function(d) {
		return _scale.x(_value.x(d));
	});
	_area.y1(function(d) {
		return _stacked ? _scale.y(_value.y__stacked(d)) : _scale.y(_value.y(d));
	});

	// Brush filter
	var _filter = {
		enabled: false,
		brush: d3.svg.brush(),
		dispatch: d3.dispatch('filter', 'filterstart', 'filterend')
	};

	// Array for various plot data
	var _data = [];

	var _points = [];

	var _markers = {
		values: [],
		dispatch: d3.dispatch('onclick')
	};

	function brushstart() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filterstart([isEmpty, min, max]);
	}
	function brush() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filter([isEmpty, min, max]);
	}
	function brushend() {
		var extent = getFilter();
		var isEmpty = (null == extent);

		var min = (isEmpty)? undefined : extent[0];
		var max = (isEmpty)? undefined : extent[1];

		_filter.dispatch.filterend([isEmpty, min, max]);
	}

	// Chart create/init method
	function _instance(selection){}

	/*
	 * Initialize the chart (should only call this once). Performs all initial chart
	 * creation and setup
	 */
	_instance.init = function(container) {
		// Create a container div
		_element.div = container.append('div').attr('class', 'sentio line');

		// Create the SVG element
		_element.svg = _element.div.append('svg');

		_element.tooltip = _element.div.append('div').attr('class', 'line_tooltip');

		// Add the defs and add the clip path definition
		_element.markerClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'marker_' + _id).append('rect');
		_element.plotClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'plot_' + _id).append('rect');
		_element.pointClipPath = _element.svg.append('defs').append('clipPath').attr('id', 'point_' + _id).append('rect');

		// Append a container for everything
		_element.g.container = _element.svg.append('g')
			.attr('class', 'g-main');

		// Append a group for the markers
		_element.g.markers = _element.g.container.append('g').attr('class', 'markers').attr('clip-path', 'url(#marker_' + _id + ')');

		// Append the path group (which will have the clip path and the line path
		_element.g.plots = _element.g.container.append('g').attr('class', 'plots').attr('clip-path', 'url(#plot_' + _id + ')');

		_element.g.points = _element.g.container.append('g').attr('class', 'points').attr('clip-path', 'url(#point_' + _id + ')');

		// Append groups for the axes
		_element.g.xAxis = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.yAxis = _element.g.container.append('g').attr('class', 'y axis');
		_element.g.xLabel = _element.svg.append('text')
			.attr('class', 'axis-label')
			.attr('text-anchor', 'end');
		_element.g.yLabel = _element.svg.append('text')
			.attr('class', 'axis-label')
			.attr('text-anchor', 'end')
			.attr('x', -(_margin.top + 35))
			.attr('y', _margin.left + 5)
			.attr('dy', '.75em')
			.attr('transform', 'rotate(-90)');

		// Append elements for capturing mouse events.
		_element.g.mouseContainer = _element.g.container.append('rect')
			.attr('class', 'mouse-container')
			.on("mousemove", handleMouseMove)
			.on("mouseover", function () {
				_element.g.hoverLine.style('display', 'block');
			})
			.on("mouseout", function () {
				_element.g.markers.selectAll('.marker-line').transition().duration(100)
					.attr('fill', function(d) { return _scale.marker_color[d[4]*2]; });
				_element.g.hoverLine.style('display', 'none');
				_element.tooltip.style("visibility", "hidden");
			});
		_element.g.hoverLine = _element.g.container.append('line')
			.attr('class', 'hover-line')
			.attr('x1', '10')
			.attr('y1', '0')
			.attr('x2', '10')
			.attr('stroke-dasharray', ('5,5'))
			.style('display', 'none');

		// If the filter is enabled, add it
		if(_filter.enabled) {
			_element.g.brush = _element.g.container.append('g').attr('class', 'x brush');
			_element.g.brush.call(_filter.brush)
				.selectAll('rect').attr('y', -6);
			_filter.brush
				.on('brushend', brushend)
				.on('brushstart', brushstart)
				.on('brush', brush);
		}

		_instance.resize();

		return _instance;
	};

	/* 
	 * Generates _stacked y values in the order that _data arrives in.
	 */
	function stack() {
		for (var i = 0; i < _data.length; i++) {
			for (var j = 0; j < _data[i].data.length; j++) {
				_data[i].data[j].push(i === 0 ? _data[i].data[j][1] : (_data[i-1].data[j][2] + _data[i].data[j][1]));
			}
		}
	}

	/*
	 * Generates point values from data.  Each point is a unique set of data with x, y, and series information.
	 */
	function generatePoints() {
		_points = [];
		for (var i = 0; i < _data.length; i++) {
			for (var j = 0; j < _data[i].data.length; j++) {
				_points.push([_data[i].data[j][0], _data[i].data[j][1], _data[i].data[j][2], _data[i].key, _data[i].name, i]);
			}
		}
	}

	/*
	 * Hide all markers on the graph.
	 */
	function toggleMarkers() {
		_element.g.markers
			.selectAll('.marker')
			.transition()
			.attr('opacity', _showMarkers ? '1' : '0');
	}

	/*
	 * Set the _instance data
	 */
	_instance.data = function(v) {
		if(!arguments.length) { return _data; }
		_data = v;

		// Update _stacked and point data every time it is available.
		stack();
		generatePoints();

		return _instance;
	};

	_instance.axes = function(v) {
		if(!arguments.length) { return _axis; }

		_axis.xLabel = v[0];
		_axis.yLabel = v[1];
		return _instance;
	};

	/*
	 * Set the markers data
	 */
	_instance.markers = function(v) {
		if(!arguments.length) { return _markers.dispatch; }
		_markers.values = v.map(function(arr) { return arr.slice(); });

		// Sort and parse markers for y levels
		_markers.values.sort(function(a, b) {
			var aWidth = _markerValue.end(a) - _markerValue.start(a);
			var bWidth = _markerValue.end(b) - _markerValue.start(b);

			return a[4] != b[4] ? a[4] - b[4] : bWidth - aWidth;
		});

		for (var i = 0; i < _markers.values.length; i++) {
			if (i === 0) { 
				_markers.values[0].push(0); 
			} else {
				var start = _markerValue.start(_markers.values[i]);
				var end = _markerValue.end(_markers.values[i]);
				var idx_conflict = -1;
				for (var j = 0; j < i; j++) {
					if (_markerValue.start(_markers.values[j]) <= end && _markerValue.end(_markers.values[j]) >= start) {
						idx_conflict = j;
					}
				}
				if (idx_conflict === -1) {
					_markers.values[i].push(0);
				} else {
					_markers.values[i].push(_markers.values[idx_conflict][5] + 1);
				}
			}
		}

		return _instance;
	};

	/*
	 * Accepts the hovered element and conditionally invokes
	 * the marker hover callback if both the function and data
	 * are non-null
	 */
	function invokeMarkerCallback(d) {
		// fire an event with the payload
		if(null != _markerHoverCallback) {
			_markerHoverCallback(d);
		}
	}

	function markerClicked(d) {
		_markers.dispatch.onclick(d);
	}

	/*
	 * Accepts object of selected elements and attempts to call
	 * the callback function. 
	 */
	function invokeHoverCallback(d) {
		if(null != _hoverCallback) {
			return _hoverCallback(d);
		}
	}

	/*
	 * Accepts series information and attempts to call
	 * the callback function.
	 */
	function invokeLegendCallback(d) {
		if (null != _legendCallback) {
			return _legendCallback(d);
		}
	}


	/*
	 * Function to handle mouse movement on the graph and gather selected elements.
	 *
	 * Adapted from: http://bl.ocks.org/mikehadlow/93b471e569e31af07cd3
	 */

	function handleMouseMove() {
		if (!_data[0]) {return;}

		_selected.points = [];
		_selected.markers = [];

		// Calculate nearest point and 
		/*jshint validthis: true */
		var mouse = d3.mouse(this);
		var mouseDate = _scale.x.invert(mouse[0]);
		var index = _bisectDate(_data[0].data, mouseDate); // Probably should store x axis info instead
		var targetX = mouse[0];
		var onPoint = false;

		var d0 = _data[0].data[index - 1];
		var d1 = _data[0].data[index];

		if (!d1 || !d0) { return; }
		var d = mouseDate - d0[0] > d1[0] - mouseDate ? d1 : d0;

		// Callback function to check point time equality.
		var pntEql = function(p) { return p[0] === d[0]; };
		// Bind to a point when close enough to it.
		if (Math.abs(mouse[0] - _scale.x(d[0])) < 5) { 
			targetX = _scale.x(d[0]); 
			onPoint = true;
		}
		// Detect markers using mouse coordinate instead of index.
		var targetXDate = _scale.x.invert(targetX);
		_selected.time = targetXDate;

		// End setup for mouse control

		// Retrieve points when over the main graph.
		if (onPoint && mouse[1] > 45) {
			for (var i = 0; i < _data.length; i++) {
				var pnt = _data[i].data.find(pntEql);
				if (pnt) {
					_selected.points.push(pnt.concat([_data[i].key, _data[i].name]));
				}
			}
		}

		for (var j = _markers.values.length-1; j >= 0; j--) {
			if (targetXDate >= _markers.values[j][2] && targetXDate <= _markers.values[j][3]) {
				_selected.markers.push(_markers.values[j]);	
			}
		}

		var marker_default_fn = function(d) {
			return _scale.marker_color[d[4]*2+1];
		};

		var marker_hover_fn = function(d) {
			return _scale.marker_color[d[4]*2];
		};

		for (var k = 0; k < _markers.values.length; k++) {
			var ret = _selected.markers.find(markerFindFunction(_markerValue.slug(_markers.values[k])));
			if (ret) {
				_element.g.markers.select('.marker-line-'+_markerValue.slug(_markers.values[k])).transition().duration(100)
					.attr('fill', marker_default_fn );
			} else {
				_element.g.markers.select('.marker-line-'+_markerValue.slug(_markers.values[k])).transition().duration(100)
					.attr('fill', marker_hover_fn );
			}
		}

		if (_selected.points.length > 0 || (mouse[1] < 45 && _selected.markers.length > 0)) {
			_element.tooltip.html(invokeHoverCallback({d: _selected}));
			var tooltip_width = _element.tooltip.node().getBoundingClientRect().width;
			_element.tooltip.style("top", (mouse[1]+10)+"px").style("left",(mouse[0]+40-(tooltip_width/2))+"px");
			_element.tooltip.style("visibility", "visible");
		} else {
			_element.tooltip.style("visibility", "hidden");
		}

		_element.g.hoverLine
			.attr('x1', targetX)
			.attr('x2', targetX);
	}

	var markerFindFunction = function(toFind) {
		return function(selected) {
			return toFind === _markerValue.slug(selected);
		};
	};

	/*
	 * Updates all the elements that depend on the size of the various components
	 */
	_instance.resize = function() {
		var now = Date.now();

		// Set up the scales
		_scale.x.range([0, Math.max(0, _width - _margin.left - _margin.right)]);
		_scale.y.range([Math.max(0, _height - _margin.top - _margin.bottom - 35), 0]); //Offset for marker space

		// Update mouse capture elements
		_element.g.mouseContainer
			.attr('transform', 'translate(0, -' + (_margin.top+25) + ')')	// Offset for marker container
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));
		_element.g.hoverLine
			.attr('y2', function(d) { return _scale.y.range()[0]; });

		// Append the clip path
		_element.plotClipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));
		_element.markerClipPath
			.attr('transform', 'translate(0, -' + (_margin.top + 25) + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', 40);
		_element.pointClipPath
			.attr('transform', 'translate(-5, -' + (_margin.top - 5) + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right + 10))
			.attr('height', Math.max(0, _height - _margin.bottom + 5));

		// Now update the size of the svg pane
		_element.svg.attr('width', _width).attr('height', _height);

		// Update the positions of the axes
		_element.g.xAxis.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');
		_element.g.yAxis.attr('class', 'y axis');

		// update the margins on the main draw group
		_element.g.container.attr('transform', 'translate(' + _margin.left + ',' + (_margin.top + 25) + ')');

		return _instance;
	};

	// Multi Extent Combiner
	function multiExtent(data, extent) {
		return _multiExtent.extent(extent).getExtent(data);
	}

	/*
	 * Redraw the graphic
	 */
	_instance.redraw = function() {

		if (!_data || _data.length === 0) {
			return _instance;
		}

		// Need to grab the filter extent before we change anything
		var filterExtent = getFilter();

		// Update the x domain (to the latest time window)
		var x = multiExtent(_data, _extent.x);
		_scale.x.domain(x);

		// Update the y domain (based on configuration and data)
		// When locked, the y axis will change if the extent is larger.
		var y = multiExtent(_data, _extent.y)[1];
		if (_lockYAxis) { y = y > _lockedY ? y : _lockedY; }
		_lockedY = y;
		_scale.y.domain([0,y]);

		// Update the plot elements
		updateAxes(x);
		updateLine();
		updateMarkers();
		updatePoints();
		updateLegend();
		updateFilter(filterExtent);

		return _instance;
	};

	var oneDay = 24*60*60*1000;

	function updateAxes(x) {
		var dayCount = Math.ceil(Math.abs((x[1] - x[0]) / oneDay)) + 1;

		_element.g.xLabel.transition()
			.attr('x', _width - _margin.left - _margin.right + 55)
			.attr('y', _height - _margin.top - _margin.bottom + 5)
			.text(_axis.xLabel);
		_element.g.yLabel.transition()
			.text(_axis.yLabel);

		// Change tick type depending on concentration of ticks to prevent overlapping labels and compressed graphs
		var concentration = _width / dayCount;
		if (concentration > 35) { // One tick label is about 35 pixels wide.  Use day spans here.
			_axis.x = _axis.x.innerTickSize(-(_height - _margin.top - _margin.bottom - 35)).ticks(d3.time.day);
		} else if (concentration > 5) { // Weeks are used when days would overlap
			_axis.x = _axis.x.innerTickSize(-(_height - _margin.top - _margin.bottom - 35)).ticks(d3.time.week);
		} else {
			_axis.x = _axis.x.innerTickSize(-(_height - _margin.top - _margin.bottom - 35)).ticks(d3.time.month);
		}
		// Limit y axis ticks if max value is less than 10 to prevent decimal ticks.
		_axis.y = _axis.y.innerTickSize(-_width+60).ticks(_scale.y.domain()[1] < 10 ? _scale.y.domain()[1] : 10);

		// Shift labels away from axis to clear up graph.
		if(null != _axis.x) {
			_element.g.xAxis
				.transition().call(_axis.x)
				.selectAll("text")
				.attr('y', 10);
		}
		if(null != _axis.y) {
			_element.g.yAxis
				.transition().call(_axis.y)
				.selectAll("text")
				.attr('x', -10);
		}
	}

	/*
	 * Line data format:
	 * 	_line = [
	 *		{ key: 'series_1',
	 		  data: [[x1,y1], [x2,y2], ...],
	 		  name: 'series 1',
	 		  total: 1000
	 		},
	 		{ key: 'series_2'
	 		  data: [[x3,y3], ...],
			  name: 'series 2',
			  total: 3000
	 		},
	 		...	
	 *	]
	 */
	
	function updateLine() {

		// Join
		var plotJoin = _element.g.plots
			.selectAll('.plot')
			.data(_data, function(d) { return d.key; });

		var plotEnter = plotJoin.enter().append('g')
			.attr('class', 'plot');

		// Enter
		plotEnter.append('g').append('path')
			.attr('class', 'line')
			.attr('id', function(d) { return 'path-'+d.key; })
			.attr('stroke', function(d, i) { return _scale.color(i); })
			.attr('stroke-width', '2px')
			.attr('stroke-opacity', function(d) {
				return _hidden_series.indexOf(d.key) === -1 ? '0.9' : '0';
			})
			.attr('fill', 'none');
		plotEnter.append('g').append('path')
			.attr('class', 'area')
			.attr('id', function(d) { return 'area-'+d.key; })
			.attr('stroke', 'none')
			.attr('fill', function(d, i) { return _scale.color(i); })
			.attr('fill-opacity', function(d) {
				return _hidden_series.indexOf(d.key) === -1 ? '0.05' : '0';
			});

		var lineUpdate = plotJoin.select('.line');
		var areaUpdate = plotJoin.select('.area');

		// // Update
		lineUpdate.transition()
			.attr('stroke-opacity', function(d) {
				return _hidden_series.indexOf(d.key) === -1 ? '0.9' : '0';
			})
			.attr('d', function(d) { return _line(d.data); });
		areaUpdate.transition()
			.attr('fill-opacity', function(d) {
				return _hidden_series.indexOf(d.key) === -1 ? '0.05' : '0';
			})
			.attr('d', function(d) { return _area.y0(_scale.y.range()[0])(d.data); });

		plotJoin.exit().select('.line')
			.attr('d', _line);

		plotJoin.exit().select('.area')
			.attr('d', _area.y0(_scale.y.range()[0]));

		// Exit
		var plotExit = plotJoin.exit()
			.transition().remove();
	}

	/*
	 * Stores legend information from data series.
	 */
	function updateLegend() {
		_legend_content.series = _data.map(function(series, i) {
			var color = _element.g.plots.select('#path-'+series.key).attr('stroke');
			return {
				key: series.key,
				name: series.name,
				total: series.total,
				color: color
			};
		});

		invokeLegendCallback({d: _legend_content});
	}

	/*
	 * _points format (After conversion from line data)
	 * 	_points = [
	 *				[x1, y1, 'series_1', 'series 1'],
	 *				[x2, y2, 'series_2', 'series 2'],
	 *				...
	 *	]
	 */
	function updatePoints() {

		var pointJoin = _element.g.points
			.selectAll('.point')
			.data(_points, function(d) {
				return 'pt-'+_pointValue.series(d)+'-'+_pointValue.x(d);
			});

		var pointEnter = pointJoin.enter().append('g')
			.attr('class', 'point');

		var circleEnter = pointEnter.append('circle');
		var circleUpdate = pointJoin.select('circle');

		circleEnter
			.attr('class', function(d) { return 'pt-'+_pointValue.series(d); })
			.attr('r', 3)
			.attr('fill', function(d) { return d3.rgb(_scale.color(_pointValue.color_index(d))).darker(); })
			.attr('fill-opacity', 1);

		circleUpdate.transition()
			.attr('class', function(d) { return 'pt-'+_pointValue.series(d); })
			.attr('cx', function(d) {return _scale.x(_pointValue.x(d));})
			.attr('cy', function(d) {return _scale.y(_pointValue.y(d));})
			.attr('fill-opacity', function(d) {
				return _hidden_series.indexOf(_pointValue.series(d)) === -1 ? '1' : '0'; // Hide points if related series is hidden.
			});

		//exit
		pointJoin.exit()
			.remove();
	}

	/* 
	 * Marker update function
	 *
	 * There are five child elements to each marker element:
	 * 	Start line, end line, start point, end point, and marker area.
	 *
	 * _marker format:
	 * 	_marker = {
	 *		values: 
	 *			[
	 *				['label1', 'slug_1', start_x1, end_x1, y_index],
	 *				['label2', 'slug_2', start_x2, end_x2, y_index]
	 *				...
	 *			]
	 *  }
	 */
	function updateMarkers() {
		// Join
		var markerJoin = _element.g.markers
			.selectAll('.marker')
			.data(_markers.values, function(d) {
				return _markerValue.slug(d); 
			});

		// Enter
		var markerEnter = markerJoin.enter().append('g')
			.attr('class', 'marker')
			.attr('opacity', '1');

		var lineEnter = markerEnter.append('rect');
		var startEnter = markerEnter.append('rect');
		var endEnter = markerEnter.append('rect');

		var lineUpdate = markerJoin.select('.marker-line');
		var startUpdate = markerJoin.select('.start');
		var endUpdate = markerJoin.select('.end');

		startEnter
			.attr('class', 'start')
			.attr('x', function(d) { return _scale.x(_markerValue.start(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * d[5]) - 2); })
			.attr('width', '4')
			.attr('height', '4')
			.attr('fill', function(d) { return _scale.marker_color[d[4]*2]; });

		endEnter
			.attr('class', 'end')
			.attr('x', function(d) { return _scale.x(_markerValue.end(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * d[5]) - 2); })
			.attr('width', '4')
			.attr('height', '4')
			.attr('fill', function(d) { return _scale.marker_color[d[4]*2]; });

		lineEnter
			.attr('class', function(d) { return 'marker-line-'+_markerValue.slug(d) + ' marker-line'; })
			.attr('x', function(d) { return _scale.x(_markerValue.start(d)); })
			.attr('y', function(d) { return (-10 - (5 * d[5]) - 1); })
			.attr('width', function(d) { return _scale.x(_markerValue.end(d)) - _scale.x(_markerValue.start(d)); })
			.attr('height', '2')
			.attr('fill', function(d) { return _scale.marker_color[d[4]*2]; });

		startUpdate.transition()
			.attr('x', function(d) { return _scale.x(_markerValue.start(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * d[5]) - 2); })
			.attr('fill', function(d) { return _scale.marker_color[d[4]*2]; });

		endUpdate.transition()
			.attr('x', function(d) { return _scale.x(_markerValue.end(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * d[5]) - 2); })
			.attr('fill', function(d) { return _scale.marker_color[d[4]*2]; });

		lineUpdate.transition()
			.attr('x', function(d) { return _scale.x(_markerValue.start(d)); })
			.attr('y', function(d) { return (-10 - (5 * d[5]) - 1); })
			.attr('fill', function(d) { return _scale.marker_color[d[4]*2]; })
			.attr('width', function(d) { return _scale.x(_markerValue.end(d)) - _scale.x(_markerValue.start(d)); });

		// Exit
		var markerExit = markerJoin.exit().remove();

	}

	/*
	 * Get the current state of the filter
	 * Returns undefined if the filter is disabled or not set, millsecond time otherwise
	 */
	function getFilter() {
		var extent;
		if(_filter.enabled && !_filter.brush.empty()) {
			extent = _filter.brush.extent();
			if(null != extent) {
				extent = [ extent[0].getTime(), extent[1].getTime() ];
			}
		}

		return extent;
	}

	/*
	 * Set the state of the filter, firing events if necessary
	 */
	function setFilter(newExtent, oldExtent) {
		// Fire the event if the extents are different
		var suppressEvent = newExtent == oldExtent || newExtent == null || oldExtent == null || (newExtent[0] == oldExtent[0] && newExtent[1] == oldExtent[1]);
		var clearFilter = (null == newExtent || newExtent[0] >= newExtent[1]);

		// either clear the filter or assert it
		if(clearFilter) {
			_filter.brush.clear();
		} else {
			_filter.brush.extent([ new Date(newExtent[0]), new Date(newExtent[1]) ]);
		}

		// fire the event if anything changed
		if(!suppressEvent) {
			_filter.brush.event(_element.g.brush);
		}
	}

	/*
	 * Update the state of the existing filter (if any) on the plot.
	 * 
	 * This method accepts the extent of the brush before any plot changes were applied
	 * and updates the brush to be redrawn on the plot after the plot changes are applied.
	 * There is also logic to clip the brush if the extent has moved such that the brush
	 * has moved partially out of the plot boundaries, as well as to clear the brush if it
	 * has moved completely outside of the boundaries of the plot.
	 */
	function updateFilter(extent) {
		// Don't need to do anything if filtering is not enabled
		if(_filter.enabled) {
			// Reassert the x scale of the brush (in case the scale has changed)
			_filter.brush.x(_scale.x);

			// Derive the overall plot extent from the collection of series
			var plotExtent = multiExtent(_data, _extent.x);

			// If there was no previous extent, then there is no brush to update
			if(null != extent) {
				// Clip extent by the full extent of the plot (this is in case we've slipped off the visible plot)
				var nExtent = [ Math.max(plotExtent[0], extent[0]), Math.min(plotExtent[1], extent[1]) ];
				setFilter(nExtent, extent);
			}

			_element.g.brush
				.call(_filter.brush)
				.selectAll('rect')
					.attr('height', _height - _margin.top - _margin.bottom + 7);
		}
	}

	/*
	 * Updates series and marker visuals when toggled to hide or show.
	 *
	 * Also updates _stacked values for the data to show updated stack data when a series is hidden.
	 */
	_instance.toggleSeries = function(s) {
		var index = -1;
		var h_index = _hidden_series.indexOf(s); // Determines if series is already hidden or not.

		/*
		 * Iterates through each data series to update values.  It first finds the index of the toggled series
		 * based off of the input key.  Then every subsequent series has its _stacked values added or subtracted by 
		 * the toggled series to update values.
		 * 
		 * Probably a better way to do this.  There might be incorrect behavior depending on the order of toggled series.
		 */
		for (var i = 0; i < _data.length; i++) {
			if (index !== -1) {
				if (h_index == -1) {
					for (var j = 0; j < _data[i].data.length; j++) {
						_data[i].data[j][2] -= _data[index].data[j][1];
					}
				} else {
					for (var k = 0; k < _data[i].data.length; k++) {
						_data[i].data[k][2] += _data[index].data[k][1];
					}
				}
			} else if (_data[i].key === s) {
				index = i;
			}
		}

		// Update hidden series array 
		if (h_index == -1) {
			_hidden_series.push(s);
		} else {
			_hidden_series.splice(h_index, 1);
		}

		// Regenerate values for points.
		generatePoints();

		_instance.redraw();
	};

	// Basic Getters/Setters
	_instance.yLock = function(l) {
		if(!arguments.length) { return _lockYAxis; }
		_lockYAxis = l;
		_instance.redraw();
		return _instance;
	};
	_instance.stacked = function(s) {
		if(!arguments.length) { return _stacked; }
		_stacked = s;
		_instance.redraw();
		return _instance;
	};
	_instance.showMarkers = function(b) {
		if (!arguments.length) { return _showMarkers; }
		_showMarkers = b;
		toggleMarkers();
		return _instance;
	};
	_instance.width = function(v){
		if(!arguments.length) { return _width; }
		_width = v;
		return _instance;
	};
	_instance.height = function(v){
		if(!arguments.length) { return _height; }
		_height = v;
		return _instance;
	};
	_instance.margin = function(v){
		if(!arguments.length) { return _margin; }
		_margin = v;
		return _instance;
	};
	_instance.interpolation = function(v){
		if(!arguments.length) { return _line.interpolate(); }
		_line.interpolate(v);
		_area.interpolate(v);
		return _instance;
	};
	_instance.xAxis = function(v){
		if(!arguments.length) { return _axis.x; }
		_axis.x = v;
		return _instance;
	};
	_instance.yAxis = function(v){
		if(!arguments.length) { return _axis.y; }
		_axis.y = v;
		return _instance;
	};
	_instance.xScale = function(v){
		if(!arguments.length) { return _scale.x; }
		_scale.x = v;
		if(null != _axis.x) {
			_axis.x.scale(v);
		}
		return _instance;
	};
	_instance.yScale = function(v){
		if(!arguments.length) { return _scale.y; }
		_scale.y = v;
		if(null != _axis.y) {
			_axis.y.scale(v);
		}
		return _instance;
	};
	_instance.xValue = function(v){
		if(!arguments.length) { return _value.x; }
		_value.x = v;
		return _instance;
	};
	_instance.yValue = function(v){
		if(!arguments.length) { return _value.y; }
		_value.y = v;
		return _instance;
	};
	_instance.yExtent = function(v){
		if(!arguments.length) { return _extent.y; }
		_extent.y = v;
		return _instance;
	};
	_instance.xExtent = function(v){
		if(!arguments.length) { return _extent.x; }
		_extent.x = v;
		return _instance;
	};
	_instance.markerXValue = function(v){
		if(!arguments.length) { return _markerValue.x; }
		_markerValue.x = v;
		return _instance;
	};
	_instance.markerLabelValue = function(v){
		if(!arguments.length) { return _markerValue.label; }
		_markerValue.label = v;
		return _instance;
	};
	_instance.markerHover = function(v) {
		if(!arguments.length) { return _markerHoverCallback; }
		_markerHoverCallback = v;
		return _instance;
	};
	_instance.pointHover = function(v) {
		if(!arguments.length) { return _hoverCallback; }
		_hoverCallback = v;
		return _instance;
	};
	_instance.legendFn = function(v) {
		if (!arguments.length) { return _legendCallback; }
		_legendCallback = v;
		return _instance;
	};
	_instance.filter = function(v) {
		if(!arguments.length) { return _filter.dispatch; }
		_filter.enabled = v;
		return _instance;
	};

	// Expects milliseconds time
	_instance.setFilter = function(extent) {
		var oldExtent = getFilter();
		if(null != extent && extent.length === 2) {
			// Convert to Dates and assert filter
			if(extent[0] instanceof Date) {
				extent[0] = extent[0].getTime();
			}
			if(extent[1] instanceof Date) {
				extent[1] = extent[1].getTime();
			}
		}

		setFilter(extent, oldExtent);
		_instance.redraw();
		return _instance;
	};

	return _instance;
}
var sentio_sankey = sentio.sankey = {};
sentio.sankey.basic = sentio_sankey_basic;
function sentio_sankey_basic() {
	'use strict';

	var _id = 'sankey_basic_' + Date.now();

	var _margin = {top: 40, right: 40, bottom: 40, left: 40};
	var _width = 1500, _height = _width / 2;
	var _nodeWidth = 15, _nodePadding = 10;
	var _widthPadding = 0;
	var _direction = 'horizontal';

	var _nodeValue = {
		name: function(n) { return n.name; },
		slug: function(n) { return n.slug; },
		value: function(n) { return n.count; }
	};

	var _linkValue = {
		source: function(l) { return l.source; },
		target: function(l) { return l.target; },
		value: function(l) { return l.count; }
	};

	var _scale = {
		color: d3.scale.category20()
	};

	var _data = {
		nodes: [],
		links: [],
		node_positions: {},
		link_positions: {},
		dispatch: d3.dispatch('onclick')
	};

	var _nodeMap = {};

	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			nodes: undefined,
			links: undefined
		}
	};

	var _curvature = 0.5;

	var _path = function(d) {
		var sourceNode = _data.node_positions[d.source.slug];
		var targetNode = _data.node_positions[d.target.slug];
		var link = _data.link_positions[d.source.slug+'_'+d.target.slug];

		var x0, x1, xi, x2, x3, y0, y1, ret;

		if (_direction === 'horizontal') {
			x0 = sourceNode.x + sourceNode.dx + _widthPadding;
			x1 = targetNode.x + _widthPadding;
			xi = d3.interpolateNumber(x0, x1);
			x2 = xi(_curvature) + _widthPadding;
			x3 = xi(1 - _curvature) + _widthPadding;
			y0 = sourceNode.y + link.sy + link.dy / 2;
			y1 = targetNode.y + link.ty + link.dy / 2;

			ret = 'M' + x0 + ',' + y0 + 
			   	  'C' + x2 + ',' + y0 +
			   	  ' ' + x3 + ',' + y1 +
			   	  ' ' + x1 + ',' + y1;
		} else {
			y0 = sourceNode.y + sourceNode.dy;
			y1 = targetNode.y;
			xi = d3.interpolateNumber(y0, y1);
			x2 = xi(_curvature);
			x3 = xi(1 - _curvature);
			x0 = sourceNode.x + link.sy + link.dy / 2 + _widthPadding;
			x1 = targetNode.x + link.ty + link.dy / 2 + _widthPadding;

			ret = 'M' + x0 + ',' + y0 + 
			   	  'C' + x0 + ',' + x2 +
			   	  ' ' + x1 + ',' + x3 +
			   	  ' ' + x1 + ',' + y1;
		}

		return ret;
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio sankey');

		_element.svg = _element.div.append('svg');

		_element.g.container = _element.svg.append('g');

		_element.g.links = _element.g.container.append('g').attr('class', 'links');
		_element.g.nodes = _element.g.container.append('g').attr('class', 'nodes');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.svg.attr('width', _width).attr('height', _height);

		return _instance;
	};

	/**
	 * Util functions
	 */

	function moveSinksRight(x) {
		_data.nodes.forEach(function(node) {
			if (!node.targetLinks.length) {
				_data.node_positions[node.slug].x = x - 1;
			}
		});
	}
	function scaleNodeBreadths(v) {
		_data.nodes.forEach(function(node) {
			_data.node_positions[node.slug].x *= v;
		});
	}
	function computeNodeBreadths() {
		var remainingNodes = _data.nodes,
			nextNodes,
			x = 0;

		function nodeComputer(n) {
			_data.node_positions[n.slug].x = x;
			_data.node_positions[n.slug].dx = _nodeWidth;
			n.targetLinks.forEach(function(link) {
				if (nextNodes.indexOf(link.target) < 0) {
					nextNodes.push(link.target);
				}
			});
		}

		while(remainingNodes.length) {
			nextNodes = [];
			remainingNodes.forEach(nodeComputer);
			remainingNodes = nextNodes;
			++x;
		}

		// moveSinksRight(x);
		if (_direction === 'horizontal') {
			scaleNodeBreadths((_width - _nodeWidth) / (x - 1));
		} else {
			scaleNodeBreadths((_height - _nodeWidth) / (x - 1));	
		}
	}

	function computeNodeDepths(iterations) {
		var nodesByBreadth = d3.nest()
			.key(function(d) { return _data.node_positions[d.slug].x; })
			.sortKeys(d3.ascending)
			.entries(_data.nodes)
			.map(function(d) { return d.values; });

		initializeNodeDepth();
		resolveCollisions();

		for (var alpha = 1; iterations > 0; iterations--) {
			relaxRightToLeft(alpha *= 0.99);
			resolveCollisions();
			relaxLeftToRight(alpha);
			resolveCollisions();
		}

		function initializeNodeDepth() {
			var ky = d3.min(nodesByBreadth, function(nodes) {
				return (_height - (nodes.length - 1) * _nodePadding) / d3.sum(nodes, _nodeValue.value);
			});

			nodesByBreadth.forEach(function(nodes) {
				nodes.forEach(function(node, i) {
					_data.node_positions[node.slug].y = i;
					_data.node_positions[node.slug].dy = node.count * ky;
					node.targetLinks.forEach(function(link) {
						_data.link_positions[link.source.slug+'_'+link.target.slug].dy = link.count * ky;
					});
				});
			});
		}

		function resolveCollisions() {
			nodesByBreadth.forEach(function(nodes) {
				var node, dy, y0 = 0, n = nodes.length, i;

				nodes.sort(ascendingDepth);
				for (i = 0; i < n; ++i) {
					node = _data.node_positions[nodes[i].slug];
					dy = y0 - node.y;
					if (dy > 0) node.y += dy;
					y0 = node.y + node.dy + _nodePadding;
				}

				dy = y0 - _nodePadding - _height;
				if (dy > 0) {
					y0 = node.y -= dy;

					for (i = n-2; i >= 0; --i) {
						node = _data.node_positions[nodes[i].slug];
						dy = node.y + node.dy + _nodePadding - y0;
						if (dy > 0) node.y -= dy;
						y0 = node.y;
					}
				}
			});
		}
		function ascendingDepth(a, b) { 
			return _data.node_positions[a.slug].y - _data.node_positions[b.slug].y; 
		}

		function relaxLeftToRight(alpha) {
			nodesByBreadth.forEach(function(nodes) {
				nodes.forEach(function(node) {
					if (node.targetLinks.length) {
						var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
						_data.node_positions[node.slug].y += (y - center(node)) * alpha;
					}
				});
			});

			function weightedSource(link) {
				return center(link.target) * link.count;
			}
		}

		function relaxRightToLeft(alpha) {
			nodesByBreadth.slice().reverse().forEach(function(nodes) {
				nodes.forEach(function(node) {
					if (node.sourceLinks.length) {
						var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
						_data.node_positions[node.slug].y += (y - center(node)) * alpha;
					}
				});
			});

			function weightedTarget(link) {
				return center(link.source) * link.count;
			}
		}

	}

	function value(link) {
		return link.count;
	}
	
	function center(node) {
		return _data.node_positions[node.slug].y + (_data.node_positions[node.slug].dy / 2);
	}

	function computeLinkDepths() {
		_data.nodes.forEach(function(node) {
			node.targetLinks.sort(ascendingTargetDepth);
			node.sourceLinks.sort(ascendingSourceDepth);
		});

		_data.nodes.forEach(function(node) {
			var sy = 0, ty = 0;
			node.sourceLinks.forEach(function(link) {
				_data.link_positions[link.source.slug+'_'+link.target.slug].ty = ty;
				ty += _data.link_positions[link.source.slug+'_'+link.target.slug].dy;
			});
			node.targetLinks.forEach(function(link) {
				_data.link_positions[link.source.slug+'_'+link.target.slug].sy = sy;
				sy += _data.link_positions[link.source.slug+'_'+link.target.slug].dy;
			});
		});

		function ascendingTargetDepth(a, b) {
			return _data.node_positions[a.target.slug].y - _data.node_positions[b.target.slug].y;
		}

		function ascendingSourceDepth(a, b) {
			return _data.node_positions[a.source.slug].y - _data.node_positions[b.source.slug].y;
		}
	}

	function nodeClicked(d) {
		_data.dispatch.onclick(d);
	}

	_instance.model = function(v) {
		if(!arguments.length) { return _data.dispatch; }
		_data.nodes = v;
		_data.links = [];
		_data.node_positions = {};
		_data.link_positions = {};

		var linkLinker = function(link) {
			var id = link.source.slug + '_' + link.target.slug;
			_data.link_positions[id] = {};

			var foundLink = _data.links.find(function(l) {
				return l.source.slug === link.source.slug && l.target.slug === link.target.slug;
			});

			if (foundLink === undefined) { _data.links.push(link); }
		};

		_data.nodes.forEach(function(node) {
			_data.node_positions[node.slug] = {};
			node.sourceLinks.forEach(linkLinker);
			node.targetLinks.forEach(linkLinker);
		});

		return _instance;
	};

	function updateDirection() {
		if (_direction === 'vertical') {
			for (var key in _data.node_positions) {
				var node = _data.node_positions[key];
				var tmpx = node.x;
				var tmpdx = node.dx;
				node.x = node.y / 2;
				node.y = tmpx;
				node.dx = node.dy / 2;
				node.dy = tmpdx;
			}
			for (var linkkey in _data.link_positions) {
				var link = _data.link_positions[linkkey];
				link.dy = link.dy / 2;
				link.sy = link.sy / 2;
				link.ty = link.ty / 2;
			}
		}
	}

	_instance.redraw = function() {

		computeNodeBreadths();
		computeNodeDepths(32);
		computeLinkDepths();

		updateDirection();

		if (_width > 0) {
			updateLinks();
			updateNodes();
		}

		return _instance;
	};

	function updateLinks() {
		var linkJoin = _element.g.links.selectAll('.link')
				.data(_data.links, function(d) { return ''+d.source.slug+'_'+d.target.slug; });

		linkJoin.enter().append('path')
				.attr('class', 'link')
				.attr('id', function(d) { return 'link-'+d.source.slug+'_'+d.target.slug; })
				.attr('d', _path)
				.attr('stroke', function(d) { return d.color ? d.color : '#1C6CAB'; })
				.style('stroke-width', function(d) { return Math.max(1, _data.link_positions[d.source.slug+'_'+d.target.slug].dy); })
				.sort(function(a, b) { return _data.link_positions[b.source.slug+'_'+b.target.slug].dy - _data.link_positions[a.source.slug+'_'+a.target.slug].dy; })
				.on('mouseover', function(d) { d3.select(this).style({'stroke-opacity': '0.5'}); })
				.on('mouseout', function(d) { d3.select(this).style({'stroke-opacity': '0.2'}); });

		linkJoin.transition().duration(1000)
				.attr('d', _path)
				.style('stroke-width', function(d) { return Math.max(1, _data.link_positions[d.source.slug+'_'+d.target.slug].dy); })
				.sort(function(a, b) { return _data.link_positions[b.source.slug+'_'+b.target.slug].dy - _data.link_positions[a.source.slug+'_'+a.target.slug].dy; });

		linkJoin.exit().remove();
	}

	function dragmove(d) {
		if (_direction === 'horizontal') {
			_data.node_positions[d.slug].y = Math.max(0, Math.min(_height - _data.node_positions[d.slug].dy, _data.node_positions[d.slug].y + d3.event.dy));
		} else {
			_data.node_positions[d.slug].x = Math.max(0, Math.min(_width/2 - _data.node_positions[d.slug].dx, _data.node_positions[d.slug].x + d3.event.dx));
		}
    	/*jshint validthis: true */
		d3.select(this).attr('transform', 'translate('+(_data.node_positions[d.slug].x+_widthPadding) +','+_data.node_positions[d.slug].y+')');
		computeLinkDepths();
		d3.selectAll('.link').attr('d', _path);
	}

	var drag = d3.behavior.drag()
		.origin(function(d) { return d; })
		.on('dragstart', function() { this.parentNode.appendChild(this); })
		.on('drag', dragmove);

	function updateNodes() {

		var nodeJoin = _element.g.nodes.selectAll('.node')
			.data(_data.nodes, function(d) { return d.slug; });

		var nodeEnter = nodeJoin.enter().append('g')
				.attr('class', 'node')
				.attr('id', function(d) { return 'node-group-'+d.slug; })
				.attr('transform', function(d) { return "translate("+(_widthPadding + _data.node_positions[d.slug].x)+','+_data.node_positions[d.slug].y+')'; })
				.call(drag);

		nodeEnter.append('rect')
				.attr('class', 'node-rect')
				.attr('id', function(d) { return 'node-'+d.slug; })
				.style('fill', function(d) { 
					if (d.color) { return d.color; }
					_data.node_positions[d.slug].color = _scale.color(d.slug); 
					return _data.node_positions[d.slug].color;
				})
				.style('stroke', function(d) { return d3.rgb(_data.node_positions[d.slug].color).darker(2); })
				.on('mouseover', function(d) {
					var sourceVisited = d.sourceLinks.slice(0);
					var targetVisited = d.targetLinks.slice(0);
					while (sourceVisited.length > 0) {
						var sl = sourceVisited.shift();
						_element.g.links.select('#link-'+sl.source.slug+'_'+sl.target.slug).style({'stroke-opacity': '0.5'});
						sourceVisited = sourceVisited.concat(sl.source.sourceLinks);
					}
					while (targetVisited.length > 0) {
						var tl = targetVisited.shift();
						_element.g.links.select('#link-'+tl.source.slug+'_'+tl.target.slug).style({'stroke-opacity': '0.5'});
						targetVisited = targetVisited.concat(tl.target.targetLinks);
					}
					_element.g.nodes.select('#node-text-'+d.slug)
						.text(function(d) { return '('+d.count+') '+d.name; });
				})
				.on('mouseout', function(d) {
					var sourceVisited = d.sourceLinks.slice(0);
					var targetVisited = d.targetLinks.slice(0);
					while (sourceVisited.length > 0) {
						var sl = sourceVisited.shift();
						_element.g.links.select('#link-'+sl.source.slug+'_'+sl.target.slug).style({'stroke-opacity': '0.2'});
						sourceVisited = sourceVisited.concat(sl.source.sourceLinks);
					}
					while (targetVisited.length > 0) {
						var tl = targetVisited.shift();
						_element.g.links.select('#link-'+tl.source.slug+'_'+tl.target.slug).style({'stroke-opacity': '0.2'});
						targetVisited = targetVisited.concat(tl.target.targetLinks);
					}
					_element.g.nodes.select('#node-text-'+d.slug)
						.text(function(d) { return d.name.length > 20 ? '('+d.count+') '+d.name.substring(0,20)+'...' : '('+d.count+') '+d.name; });
				})
				.on('dblclick', nodeClicked);

		nodeEnter.append('text')
				.attr('class', 'node-text')
				.attr('id', function(d) { return 'node-text-'+d.slug; })
				.attr('dy', '.35em')
				.attr('transform', null);
		

		var nodeUpdate = nodeJoin.select('.node-rect');
		var nodeTUpdate = nodeJoin.select('.node-text');

		nodeJoin.transition().duration(1000)
				.attr('transform', function(d) { return "translate("+(_widthPadding + _data.node_positions[d.slug].x)+','+_data.node_positions[d.slug].y+')'; });

		nodeUpdate.transition().duration(1000)
				.attr('height', function(d) { return _data.node_positions[d.slug].dy; })
				.attr('width', function(d) { return _data.node_positions[d.slug].dx; });

		nodeTUpdate.transition().duration(1000)
				.attr('x', function(d) { return _direction === 'horizontal' ? '-6' : _data.node_positions[d.slug].dx / 2; })
				.attr('y', function(d) { return _direction === 'horizontal' ? _data.node_positions[d.slug].dy / 2 : '25'; })
				.attr('text-anchor', _direction === 'horizontal' ? 'end' : 'middle')
				.text(function(d) { return d.name.length > 20 ? '('+d.count+') '+d.name.substring(0,20)+'...' : '('+d.count+') '+d.name; })
			.filter(function(d) { return _direction === 'horizontal' ? _data.node_positions[d.slug].x < _width / 2 : _data.node_positions[d.slug].y > _height / 2; })
				.attr('x', function(d) { return _direction === 'horizontal' ? (6 + _nodeWidth) : _data.node_positions[d.slug].dx / 2; })
				.attr('y', function(d) { return _direction === 'horizontal' ? _data.node_positions[d.slug].dy / 2 : '-10'; })
				.attr('text-anchor', _direction === 'horizontal' ? 'start' : 'middle');

		nodeJoin.exit().remove();

	}

	_instance.direction = function(d) {
		if(!arguments.length) { return _direction; }
		_direction = d;
		return _instance;
	};

	_instance.width = function(v){
		if(!arguments.length) { return _width; }
		_width = v;
		if (_direction === 'vertical') {
			_widthPadding = v / 4;
			_height = v;
		} else {
			_widthPadding = 0;
			_height = v/2;
		}
		return _instance;
	};

	return _instance;
}