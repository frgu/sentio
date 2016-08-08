sentio.sankey.basic = sentio_sankey_basic;
function sentio_sankey_basic() {
	'use strict';

	var _id = 'sankey_basic_' + Date.now();

	var _margin = {top: 40, right: 40, bottom: 40, left: 40};
	var _width = 1500, _height = _width / 2;
	var _nodeWidth = 15, _nodePadding = 10;

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

		var x0 = sourceNode.x + sourceNode.dx,
			x1 = targetNode.x,
			xi = d3.interpolateNumber(x0, x1),
			x2 = xi(_curvature),
			x3 = xi(1 - _curvature),
			y0 = sourceNode.y + link.sy + link.dy / 2,
			y1 = targetNode.y + link.ty + link.dy / 2;

		return 'M' + x0 + ',' + y0 + 
			   'C' + x2 + ',' + y0 +
			   ' ' + x3 + ',' + y1 +
			   ' ' + x1 + ',' + y1;
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
		scaleNodeBreadths((_width - _nodeWidth) / (x - 1));
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

		console.log(_data);

		return _instance;
	};

	_instance.redraw = function() {

		computeNodeBreadths();
		computeNodeDepths(32);
		computeLinkDepths();

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
				.attr('stroke', function(d) { return d.color ? d.color : '#FFF'; })
				.style('stroke-width', function(d) { return Math.max(1, _data.link_positions[d.source.slug+'_'+d.target.slug].dy); })
				.sort(function(a, b) { return _data.link_positions[b.source.slug+'_'+b.target.slug].dy - _data.link_positions[a.source.slug+'_'+a.target.slug].dy; })
				.on('mouseover', function(d) { d3.select(this).style({'stroke-opacity': '0.5'}); })
				.on('mouseout', function(d) { d3.select(this).style({'stroke-opacity': '0.2'}); });

		linkJoin.transition()
				.attr('d', _path)
				.style('stroke-width', function(d) { return Math.max(1, _data.link_positions[d.source.slug+'_'+d.target.slug].dy); })
				.sort(function(a, b) { return _data.link_positions[b.source.slug+'_'+b.target.slug].dy - _data.link_positions[a.source.slug+'_'+a.target.slug].dy; });

		linkJoin.exit().remove();
	}

	function dragmove(d) {
		_data.node_positions[d.slug].y = Math.max(0, Math.min(_height - _data.node_positions[d.slug].dy, _data.node_positions[d.slug].y + d3.event.dy));
    	/*jshint validthis: true */
		d3.select(this).attr('transform', 'translate('+_data.node_positions[d.slug].x+','+_data.node_positions[d.slug].y+')');
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
				.attr('transform', function(d) { return "translate("+_data.node_positions[d.slug].x+','+_data.node_positions[d.slug].y+')'; })
				.call(drag);

		nodeEnter.append('rect')
				.attr('class', 'node-rect')
				.attr('id', function(d) { return 'node-'+d.slug; })
				.attr('height', function(d) { return _data.node_positions[d.slug].dy; })
				.attr('width', _nodeWidth)
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
				.attr('x', '-6')
				.attr('y', function(d) { return _data.node_positions[d.slug].dy / 2; })
				.attr('dy', '.35em')
				.attr('text-anchor', 'end')
				.attr('transform', null)
				.text(function(d) { return d.name.length > 20 ? '('+d.count+') '+d.name.substring(0,20)+'...' : '('+d.count+') '+d.name; })
			.filter(function(d) { return _data.node_positions[d.slug].x < _width / 2; })
				.attr('x', 6 + _nodeWidth)
				.attr('text-anchor', 'start');
		

		var nodeUpdate = nodeJoin.select('.node-rect');
		var nodeTUpdate = nodeJoin.select('.node-text');

		nodeJoin.transition()
				.attr('transform', function(d) { return "translate("+_data.node_positions[d.slug].x+','+_data.node_positions[d.slug].y+')'; });

		nodeUpdate.transition()
				.attr('height', function(d) { return _data.node_positions[d.slug].dy; });

		nodeTUpdate.transition()
				.attr('x', '-6')
				.attr('y', function(d) { return _data.node_positions[d.slug].dy / 2; })
				.attr('text-anchor', 'end')
				.text(function(d) { return d.name.length > 20 ? '('+d.count+') '+d.name.substring(0,20)+'...' : '('+d.count+') '+d.name; })
			.filter(function(d) { return _data.node_positions[d.slug].x < _width / 2; })
				.attr('x', 6 + _nodeWidth)
				.attr('text-anchor', 'start');

		nodeJoin.exit().remove();

	}

	_instance.width = function(v){
		if(!arguments.length) { return _width; }
		_width = v;
		_height = v/2;
		return _instance;
	};

	return _instance;
}