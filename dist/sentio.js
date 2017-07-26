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
sentio.chart.gantt = sentio_gantt;
function sentio_gantt() {
	'use strict';

	var _id = 'gantt_' + Date.now();

	var _margin = {top: 60, right: 60, bottom: 60, left: 60};
	var _width = 1000, _height = 600;

	var _data = [];
	var _dateRange;

	var _barPaddingRatio = 0.05;
	var _minBarHeight = 30;

	var _scale = {
		x: d3.time.scale(),
		y: d3.scale.ordinal(),
		color: d3.scale.category10()
	};

	var _dispatch = d3.dispatch('onmouseover', 'onmouseout', 'onclick');

	var _dateFormat = d3.time.format.multi([
		['%e', function(d) { return d.getDay() && d.getDate() != 1; }],
		['%e', function(d) { return d.getDate() != 1; }],
		['%B', function(d) { return d.getMonth(); }],
		['%Y', function(d) { return true; }]
	]);

	var _axis = {
		x: d3.svg.axis().scale(_scale.x).orient('top').tickFormat(_dateFormat),
		y: d3.svg.axis().scale(_scale.y).orient('left')
	};

	var _bar = {
		label: function(d) { return d[0]; },
		start: function(d) { return d[1][0]; },
		end: function(d) { return d[d.length - 1][1]; }
	};

	var _segment = {
		start: function(d) { return d[0]; },
		end: function(d) { return d[1]; }
	};

	var now = Date.now();
	var _extent = {
		start: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return _bar.start(d); }
		}),
		end: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return _bar.end(d); }
		})
	};

	var _element = {
		div: undefined,
		svg: undefined,
		clipPath: undefined,
		g: {
			container: undefined,
			bars: undefined,
			axis: {
				x: undefined,
				y: undefined
			}
		}
	};

	var _fn = {
		filterFn: function(e, i, a) {
			return a[i+1] ? Math.abs(a[i+1].getTime() - e.getTime()) > 0 : true;
		},
		sortFn: function(a, b) {
			return a.getTime() - b.getTime();
		},
		generateTicks: function(arrays) {
			var ret = [];
			var tickCount = Math.floor(_width / 60);

			var i = 0;
			do {
				ret = d3.merge([ret, arrays[i]]).sort(_fn.sortFn).filter(_fn.filterFn);  // Merge, sort, and remove duplicates
				i++;
			} while (i < arrays.length && ret.length + arrays[i].length < tickCount);

			return ret;
		},
		onMouseOver: function(d, i, j) {
			_dispatch.onmouseover(d, i, j, this);
		},
		onMouseOut: function(d, i, j) {
			_dispatch.onmouseout(d, i, j, this);
		},
		onClick: function(d, i, j) {
			_dispatch.onclick(d, i, j, this);
		}
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio gantt').style('overflow', 'scroll');

		_element.svg = _element.div.append('svg');

		_element.clipPath = _element.svg.append('defs').append('clipPath').attr('id', _id).append('rect');

		_element.g.container = _element.svg.append('g');

		_element.g.bars = _element.g.container.append('g').attr('class', 'bars').attr('clip-path', 'url(#' + _id + ')');

		_element.g.axis.x = _element.g.container.append('g').attr('class', 'axis x');
		_element.g.axis.y = _element.g.container.append('g').attr('class', 'axis y');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.div.style('width', _width + 'px').style('height', _height + 'px');
		_element.svg.attr('width', _width).attr('height', _scale.y.rangeBand() < _minBarHeight ? _data.length * _minBarHeight + _margin.top + _margin.bottom : _height);

		_element.clipPath
			.attr('transform', 'translate(0, -' + _margin.top + ')')
			.attr('width', Math.max(0, _width - _margin.left - _margin.right))
			.attr('height', Math.max(0, _height - _margin.bottom));

		_scale.x.range([0, Math.max(0, _width - _margin.left - _margin.right)]);
		_scale.y.rangeBands([0, Math.max(0, _height - _margin.top - _margin.bottom, _data.length * _minBarHeight)], _barPaddingRatio);

		_element.g.container.attr('transform', 'translate(' + _margin.left + ',' + _margin.top + ')');

		_axis.y.innerTickSize(-(_width - _margin.left - _margin.right));

		return _instance;
	};

	function updateAxes() {
		_element.g.axis.x.transition().call(_axis.x);

		// Emphasize ticks for the first of a month or the first of a year
		_element.g.axis.x.selectAll('text').transition()
			.attr('y', function(d) { return d.getDate() === 1 ? '-20' : '-6'; })
			.attr('font-weight', function(d) { return d.getDate() === 1 ? 'bold' : ''; })
			.attr('font-size', function(d) { return d.getMonth() === 0 && d.getDate() === 1 ? 'larger'  : 'inherit'; });
		_element.g.axis.x.selectAll('line').transition()
			.attr('y2', function(d) { return d.getDate() === 1 ? '-14' : '-6'; })
			.attr('y1', function(d) { 
				var ret = '';
				if (d.getDate() === 1) {
					ret = _scale.y.rangeBand() < _minBarHeight ? _data.length * _minBarHeight : _height - _margin.top - _margin.bottom;
				}
				return ret;
			});

		_element.g.axis.y.transition().call(_axis.y);

		_element.g.axis.y.selectAll('text').transition()
			.attr('x', '15')
			.attr('y', '15')
			.style('text-anchor', 'start');
	}

	function updateBars() {
		var barJoin = _element.g.bars.selectAll('.bar')
				.data(_data, function(d) { return _bar.label(d); });

		var barEnter = barJoin.enter().append('g')
				.attr('class', 'bar');

		var segmentEnter = barEnter.selectAll('.segment')
				.data(function(d) { return d.slice(1); });

		segmentEnter.enter().append('rect')
				.attr('class', 'segment')
				.attr('opacity', '0.8')
				.on('mouseover', _fn.onMouseOver)
				.on('mouseout', _fn.onMouseOut)
				.on('click', _fn.onClick);

		var barUpdate = barJoin.selectAll('.segment');

		barUpdate.transition()
				.attr('x', function(d, i, j) { return _scale.x(_segment.start(d)); })
				.attr('y', function(d, i, j) { return _scale.y(_bar.label(_data[j])) + _scale.y.rangeBand()/(2*(1-_barPaddingRatio)); })
				.attr('width', function(d, i, j) { return _scale.x(_segment.end(d)) - _scale.x(_segment.start(d)); })
				.attr('height', function(d, i, j) { return Math.max(_scale.y.rangeBand(), _minBarHeight); })
				.attr('fill', function(d, i, j) { return _scale.color(i); });
				
		barJoin.exit().remove();

	}

	_instance.redraw = function() {
		if (!_data) { return; }

		var startOfDomain = new Date(_extent.start.getExtent(_data)[0]);
		var endOfDomain = new Date(_extent.end.getExtent(_data)[1]);

		if (_dateRange) {
			startOfDomain = new Date(_dateRange[0]);
			endOfDomain = new Date(_dateRange[1]);
		}

		_scale.x.domain([startOfDomain, endOfDomain]);

		var dayTicks = _scale.x.ticks(d3.time.day, 1);
		var weekTicks = _scale.x.ticks(d3.time.week, 1);
		var monthTicks = _scale.x.ticks(d3.time.month, 1);
		var yearTicks = _scale.x.ticks(d3.time.year, 1);

		var ticks = _fn.generateTicks([yearTicks, monthTicks, weekTicks, dayTicks]);

		_axis.x.tickValues(ticks);

		var labels = _data.map(function(d) {
			return _bar.label(d);
		});
		labels.push('');
		_scale.y.domain(labels);
		_axis.y.tickValues(labels);

		updateAxes();
		updateBars();

		return _instance;
	};

	_instance.data = function(d) {
		if(!arguments.length) { return _data; }
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
	_instance.dispatch = function(v) {
		if(!arguments.length) { return _dispatch; }
		return _instance;
	};
	_instance.colorScale = function(v) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = d3.scale.ordinal().domain(d3.range(v.length)).range(v);
		return _instance;
	};
	_instance.dateRange = function(v) {
		if(!arguments.length) { return _dateRange; }
		_dateRange = v;
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
sentio.chart.scatter = sentio_chart_scatter;
function sentio_chart_scatter() {
	'use strict';
	
	var _id = 'scatter_' + Date.now();

	var _layout = {
		margin: { top: 50, right: 50, bottom: 50, left: 50 },
		width: 600,
		height: 600
	};

	var _config = {
		paddingRatio: 0.05,
		tickCount: 10
	};

	var _data = [[]];
	var _lineData = [];

	var _scale = {
		x: d3.scale.linear(),
		y: d3.scale.linear(),
		color: d3.scale.category10()
	};

	var _dispatch = d3.dispatch('onmouseover', 'onmouseout', 'onclick');

	var _pointValue = {
		id: function(d) { return d[0]; },
		x: function(d) { return d[1]; },
		y: function(d) { return d[2]; }
	};

	var _lineValue = {
		x: function(d) { return d[0]; },
		y: function(d) { return d[1]; }
	};

	var _extent = {
		x: sentio.util.extent({
			defaultValue: [0, 100],
			getValue: function(d) { return _pointValue.x(d); }
		}),
		y: sentio.util.extent({
			defaultValue: [0, 100],
			getValue: function(d) { return _pointValue.y(d); }
		})
	};
	var _multiExtent = sentio.util.multiExtent().values(function(d) { return d; });

	var _axis = {
		x: d3.svg.axis()
			.scale(_scale.x)
			.orient('bottom')
			.innerTickSize(-_layout.height)
			.ticks(_config.tickCount),
		y: d3.svg.axis()
			.scale(_scale.y)
			.orient('left')
			.innerTickSize(-_layout.width)
			.ticks(_config.tickCount),
		labels: ['',''] // Default empty axis labels
	};

	var _line = d3.svg.line().interpolate('basis');
	_line.x(function(d) { return _scale.x(_lineValue.x(d)); });
	_line.y(function(d) { return _scale.y(_lineValue.y(d)); });

	var _element = {
		div: undefined,
		svg: undefined,
		g: {
			container: undefined,
			axis: {
				x: undefined,
				xLabel: undefined,
				y: undefined,
				yLabel: undefined
			},
			lines: undefined,
			points: undefined
		}
	};

	var _fn = {
		multiExtent: function(data, extent) {
			return _multiExtent.extent(extent).getExtent(data);
		},
		onMouseOver: function(d, i, j) {
			_element.g.points.select('#id_'+_pointValue.id(d)).transition()
					.attr('r', '10')
					.attr('fill-opacity', '1');
			_element.g.axis.x.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '2')
					.attr('y2', '10');
			_element.g.axis.y.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '2')
					.attr('x1', '-10');
			
			_dispatch.onmouseover(d, i, j, this);
		},
		onMouseOut: function(d, i, j) {
			_element.g.points.select('#id_'+_pointValue.id(d)).transition()
					.attr('r', '5')
					.attr('fill-opacity', '0.5');
			_element.g.axis.x.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '1')
					.attr('y2', '6');
			_element.g.axis.y.select('#id_'+_pointValue.id(d)).transition()
					.attr('stroke-width', '1')
					.attr('x1', '-6');
			_dispatch.onmouseout(d, i, j, this);
		},
		onClick: function(d, i, j) {
			_dispatch.onclick(d, i, j, this);
		}
	};

	function _instance(selection){}

	_instance.init = function(container) {
		_element.div = container.append('div').attr('class', 'sentio scatter');

		_element.svg = _element.div.append('svg');

		_element.g.container = _element.svg.append('g');

		_element.g.axis.x = _element.g.container.append('g').attr('class', 'x axis');
		_element.g.axis.xLabel = _element.g.container.append('text').attr('class', 'scatter-axis-label').attr('text-anchor', 'end');
		_element.g.axis.y = _element.g.container.append('g').attr('class', 'y axis');
		_element.g.axis.yLabel = _element.g.container.append('text').attr('class', 'scatter-axis-label')
				.attr('text-anchor', 'end')
				.attr('x', -10).attr('y', 15)
				.attr('transform', 'rotate(-90)');

		_element.g.lines = _element.g.container.append('g').attr('class', 'lines');

		_element.g.points = _element.g.container.append('g').attr('class', 'point-groups');

		_instance.resize();

		return _instance;
	};

	_instance.resize = function() {
		_element.svg.attr('width', _layout.width).attr('height', _layout.height);

		_scale.x.range([0, _layout.width - _layout.margin.right - _layout.margin.left]);
		_scale.y.range([_layout.height - _layout.margin.top - _layout.margin.bottom, 0]);

		_element.g.axis.x.attr('transform', 'translate(0,' + _scale.y.range()[0] + ')');

		_element.g.container.attr('transform', 'translate(' + _layout.margin.left + ',' + _layout.margin.top + ')');

		_axis.x.innerTickSize(-(_layout.height - _layout.margin.top - _layout.margin.bottom));
		_axis.y.innerTickSize(-(_layout.width - _layout.margin.left - _layout.margin.right));

		return _instance;
	};

	function updateTicks(axis) {
		var ticksJoin = _element.g.axis[axis]
				.selectAll('.point-ticks')
				.data(_data);

		ticksJoin.enter().append('g')
				.attr('class', 'point-ticks');

		var tickJoin = ticksJoin
				.selectAll('.point-tick')
				.data(function(d) { return d; });

		tickJoin.enter().append('line')
				.attr('class', 'point-tick')
				.attr('id', function(d) { return 'id_' + _pointValue.id(d); })
				.attr('stroke-width', '1');
		
		tickJoin.transition()
				.attr('y1', function(d) { return axis === 'x' ? 0 : _scale.y(_pointValue.y(d)); })
				.attr('y2', function(d) { return axis === 'x' ? 6 : _scale.y(_pointValue.y(d)); })
				.attr('x1', function(d) { return axis === 'y' ? -6 : _scale.x(_pointValue.x(d)); })
				.attr('x2', function(d) { return axis === 'y' ? 0 : _scale.x(_pointValue.x(d)); })
				.attr('stroke', function(d, i, j) { return _scale.color(j); });

		tickJoin.exit().remove();
		ticksJoin.exit().remove();
	}

	function updateAxes() {
		_element.g.axis.xLabel.transition()
				.attr('x', _layout.width - _layout.margin.left - _layout.margin.right - 10)
				.attr('y', _layout.height - _layout.margin.top - _layout.margin.bottom - 10)
				.text(_axis.labels[0]);

		_element.g.axis.yLabel.transition()
				.text(_axis.labels[1]);

		if (null != _axis.x) {
			_element.g.axis.x.transition()
					.call(_axis.x).selectAll('text')
					.attr('y', 10);
		}

		if (null != _axis.y) {
			_element.g.axis.y.transition()
					.call(_axis.y).selectAll('text')
					.attr('x', -10);
		}

		updateTicks('x');
		updateTicks('y');
	}

	function updatePoints() {
		var pointsJoin = _element.g.points
				.selectAll('.points')
				.data(_data);
		
		pointsJoin.enter().append('g')
				.attr('class', 'points');

		var pointJoin = pointsJoin
				.selectAll('.point')
				.data(function(d) { return d; });

		pointJoin.enter().append('circle')
				.attr('class', 'point')
				.attr('r', '5')
				.attr('fill-opacity', '0.5')
				.attr('stroke-width', '1')
				.on('mouseover', _fn.onMouseOver)
				.on('mouseout', _fn.onMouseOut)
				.on('click', _fn.onClick);

		pointJoin.transition()
				.attr('id', function(d) { return 'id_' + _pointValue.id(d); })
				.attr('cx', function(d) { return _scale.x(_pointValue.x(d)); })
				.attr('cy', function(d) { return _scale.y(_pointValue.y(d)); })
				.attr('fill', function(d, i, j) { return _scale.color(j); })
				.attr('stroke', function(d, i, j) { return _scale.color(j); });
		
		pointJoin.exit().remove();

		pointsJoin.exit().remove();
	}

	function updateLines() {
		var lineJoin = _element.g.lines
				.selectAll('.line')
				.data(_lineData);

		lineJoin.enter().append('path')
				.attr('class', 'line')
				.attr('stroke-width', '2px')
				.attr('fill-opacity', '0');

		lineJoin.transition()
				.attr('stroke', function(d, i) { return _scale.color(i); })
				.attr('d', function(d) { return _line(d); });

		lineJoin.exit().remove();
	}

	_instance.redraw = function() {

		var xDomain = _fn.multiExtent(_data, _extent.x);
		var xBuffer = Math.ceil((xDomain[1] - xDomain[0] - 1) * _config.paddingRatio);
		xDomain = [xDomain[0]-xBuffer, xDomain[1]+xBuffer];
		var yDomain = _fn.multiExtent(_data, _extent.y);
		var yBuffer = Math.ceil((yDomain[1] - yDomain[0] - 1) * _config.paddingRatio);
		yDomain = [yDomain[0]-yBuffer, yDomain[1]+yBuffer];

		_scale.x.domain(xDomain);
		_scale.y.domain(yDomain);

		updateAxes();
		updatePoints();
		updateLines();

		return _instance;
	};

	_instance.data = function(d) {
		if(!arguments.length) { return _data; }
		_data = d;
		return _instance;
	};
	_instance.lineData = function(d) {
		if(!arguments.length) { return _lineData; }
		_lineData = d;
		return _instance;
	};
	_instance.axes = function(a) {
		if(!arguments.length) { return _axis.labels; }
		_axis.labels = a;
		return _instance;
	};
	_instance.width = function(d) {
		if(!arguments.length) { return _layout.width; }
		_layout.width = d;
		return _instance;
	};
	_instance.height = function(d) {
		if(!arguments.length) { return _layout.height; }
		_layout.height = d;
		return _instance;
	};
	_instance.dispatch = function(d) {
		if(!arguments.length) { return _dispatch; }
		_dispatch = d;
		return _instance;
	};
	_instance.color = function(d) {
		if(!arguments.length) { return _scale.color; }
		_scale.color = d;
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
	var _point = {
		x: function(d) { return d[0]; },
		y: function(d) { return _stacked ? d[2] : d[1]; },
		series: function(d) { return d[3]; },
		slug: function(d) { return d[4]; },
		color_index: function(d) { return d[5]; }
	};

	// Accessors for the positions of the markers
	var _marker = {
		label: function(d, i) { return d[0]; },
		slug: function(d, i) { return d[1]; },
		start: function(d, i) { return d[2]; },
		end: function(d, i) { return d[3]; },
		color: function(d, i) { return d[4]; },
		layer: function(d, i) { return d[5]; },
		level: function(d, i) { return d[6]; }
	};

	var now = Date.now();
	var _extent = {
		x: sentio.util.extent({
			defaultValue: [now - 60000*5, now],
			getValue: function(d) { return _point.x(d[1]); }
		}),
		y: sentio.util.extent({
			getValue: function(d) { return _hidden_series.indexOf(d[0]) === -1 ? _point.y(d[1]) : 0; }
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
		color: d3.scale.category10()
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

	// Array for various plot data
	var _data = [];

	var _points = [];

	var _markers = {
		values: [],
		dispatch: d3.dispatch('onclick')
	};

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
			.on('mousemove', handleMouseMove)
			.on('mouseover', function () {
				_element.g.hoverLine.style('display', 'block');
			})
			.on('mouseout', function () {
				_element.g.markers.selectAll('.line').transition().duration(100)
					.attr('fill', function(d) { return _marker.color(d) ? _marker.color(d) : _scale.color(_marker.slug(d)); });
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
				_points.push([_data[i].data[j][0], _data[i].data[j][1], _data[i].data[j][2], _data[i].key, _data[i].name, _data[i].color ? _data[i].color : i]);
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
	_instance.data = function(v, r) {
		if(!arguments.length) { return _data; }
		if(r) _lockedY = 1;
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

		// Create copy of markers
		var markers = v.map(function(arr) { return arr.slice(0); });
		if (markers.length === 0) {
			_markers.values = [];
			return _instance;
		}

		// Sort markers by width
		markers.sort(function(a, b) {
			var aWidth = _marker.end(a) - _marker.start(a);
			var bWidth = _marker.end(b) - _marker.start(b);

			return bWidth - aWidth;
		});

		// Assign levels, which are essentially y positions.
		var levels = [[[_marker.start(markers[0]), _marker.end(markers[0])]]];
		markers[0].push(0);
		for (var m = 1; m < markers.length; m++) {
			var start = _marker.start(markers[m]);
			var end = _marker.end(markers[m]);
			var l, span;
			var levels_length = levels.length;
			for (l = 0; l < levels_length; l++) {
				var spaceAvailable = true;
				for (span = 0; span < levels[l].length; span++) {
					if (start < levels[l][span][1] && end > levels[l][span][0]) {
						spaceAvailable = false;
					}
				}
				if (spaceAvailable) {
					levels[l].push([start,end]);
					markers[m].push(l);
					break;
				} else if (l === levels_length - 1) {
					levels.push([[start, end]]);
					markers[m].push(l+1);
				}
			}
		}

		_markers.values = markers;

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
		_selected.points = [];	
		if (onPoint && mouse[1] > 45) {
			for (var i = 0; i < _data.length; i++) {
				var pnt = _data[i].data.find(pntEql);
				if (pnt) {
					_selected.points.push(pnt.concat([_data[i].key, _data[i].name]));
				}
			}
		}

		_selected.markers = [];
		for (var j = 0; j < _markers.values.length; j++) {
			var marker = _markers.values[j];
			var baseColor = _marker.color(marker) ? _marker.color(marker) : _scale.color(_marker.slug(marker));
			if (targetXDate >= _marker.start(marker) && targetXDate <= _marker.end(marker)) {
				_selected.markers.unshift(marker);

				_element.g.markers.select('.marker-line-'+_marker.slug(marker)).transition()
					.attr('fill', d3.rgb(baseColor).brighter());
			} else {
				_element.g.markers.select('.marker-line-'+_marker.slug(marker)).transition()
					.attr('fill', baseColor);
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
			return toFind === _marker.slug(selected);
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
			.attr('stroke', function(d, i) { return d.color ? d.color : _scale.color(i); })
			.attr('stroke-width', '2px')
			.attr('stroke-opacity', function(d) {
				return _hidden_series.indexOf(d.key) === -1 ? '0.9' : '0';
			})
			.attr('fill', 'none');
		plotEnter.append('g').append('path')
			.attr('class', 'area')
			.attr('id', function(d) { return 'area-'+d.key; })
			.attr('stroke', 'none')
			.attr('fill', function(d, i) { return d.color ? d.color : _scale.color(i); })
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
				return 'pt-'+_point.series(d)+'-'+_point.x(d);
			});

		var pointEnter = pointJoin.enter().append('g')
			.attr('class', 'point');

		var circleEnter = pointEnter.append('circle');
		var circleUpdate = pointJoin.select('circle');

		circleEnter
			.attr('class', function(d) { return 'pt-'+_point.series(d); })
			.attr('r', 3)
			.attr('fill', function(d) { return d3.rgb(_point.color_index(d)).darker(); })
			.attr('fill-opacity', 1);

		circleUpdate.transition()
			.attr('class', function(d) { return 'pt-'+_point.series(d); })
			.attr('cx', function(d) {return _scale.x(_point.x(d));})
			.attr('cy', function(d) {return _scale.y(_point.y(d));})
			.attr('fill-opacity', function(d) {
				return _hidden_series.indexOf(_point.series(d)) === -1 ? '1' : '0'; // Hide points if related series is hidden.
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
				return _marker.slug(d); 
			});

		// Enter
		var markerEnter = markerJoin.enter().append('g')
			.attr('class', 'marker')
			.attr('opacity', '1');

		var lineEnter = markerEnter.append('rect');
		var startEnter = markerEnter.append('rect');
		var endEnter = markerEnter.append('rect');

		var lineUpdate = markerJoin.select('.line');
		var startUpdate = markerJoin.select('.start');
		var endUpdate = markerJoin.select('.end');

		startEnter
			.attr('class', 'start')
			.attr('width', '4')
			.attr('height', '4')
			.attr('x', function(d) { return _scale.x(_marker.start(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * _marker.level(d)) - 2); })
			.attr('fill', function(d) { return _marker.color(d) ? _marker.color(d) : _scale.color(_marker.slug(d)); });

		endEnter
			.attr('class', 'end')
			.attr('width', '4')
			.attr('height', '4')
			.attr('x', function(d) { return _scale.x(_marker.end(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * _marker.level(d)) - 2); })
			.attr('fill', function(d) { return _marker.color(d) ? _marker.color(d) : _scale.color(_marker.slug(d)); });

		lineEnter
			.attr('class', function(d) { return 'marker-line-'+_marker.slug(d) + ' line'; })
			.attr('fill', function(d) { return _marker.color(d) ? _marker.color(d) : _scale.color(_marker.slug(d)); })
			.attr('x', function(d) { return _scale.x(_marker.start(d)); })
			.attr('y', function(d) { return (-10 - (5 * _marker.level(d)) - 1); })
			.attr('width', function(d) { return _scale.x(_marker.end(d)) - _scale.x(_marker.start(d)); })
			.attr('height', '2');

		startUpdate.transition()
			.attr('x', function(d) { return _scale.x(_marker.start(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * _marker.level(d)) - 2); })
			.attr('fill', function(d) { return _marker.color(d) ? _marker.color(d) : _scale.color(_marker.slug(d)); });

		endUpdate.transition()
			.attr('x', function(d) { return _scale.x(_marker.end(d)) - 2; })
			.attr('y', function(d) { return (-10 - (5 * _marker.level(d)) - 2); })
			.attr('fill', function(d) { return _marker.color(d) ? _marker.color(d) : _scale.color(_marker.slug(d)); });

		lineUpdate.transition()
			.attr('x', function(d) { return _scale.x(_marker.start(d)); })
			.attr('y', function(d) { return (-10 - (5 * _marker.level(d)) - 1); })
			.attr('width', function(d) { return _scale.x(_marker.end(d)) - _scale.x(_marker.start(d)); });

		// Exit
		var markerExit = markerJoin.exit().remove();

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
				if (h_index === -1) {
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
		if (h_index === -1) {
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
		if(!arguments.length) { return _marker.x; }
		_marker.x = v;
		return _instance;
	};
	_instance.markerLabelValue = function(v){
		if(!arguments.length) { return _marker.label; }
		_marker.label = v;
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