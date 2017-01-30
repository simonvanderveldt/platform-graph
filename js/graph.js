// Create a new sigma.js instance
s = new sigma({
    renderer: {
        container: document.getElementById('container'),
        type: 'canvas'
    },
    settings: {
        defaultEdgeType: 'arrow',
        edgeLabelSize: 'proportional',
        defaultLabelColor: '#fff',
        minArrowSize: 10,
        minEdgeSize: 1,
        maxEdgeSize: 5,
        maxNodeSize: 50,
        labelThreshold: 0,
        enableEdgeHovering: true,
        edgeHoverColor: 'edge',
        edgeHoverSizeRatio: 2,
        edgeHoverExtremities: true
    }
});

// Load the graph and pass the sigma.js instance
sigma.parsers.gexf('graph.gexf', s, function (s) {

    filter = new sigma.plugins.filter(s);

    // Generate a circle layout for all nodes
    s.graph.nodes().forEach(function (node, i, a) {
        node.x = Math.cos(Math.PI * 2 * i / a.length);
        node.y = Math.sin(Math.PI * 2 * i / a.length);
        node.size = node.attributes[2] * 10.0;
        node.incoming = node.attributes[1]
        node.outgoing = node.attributes[0]
        node.color = randomColor({luminosity: 'light', format: 'rgb'})
        node.type = 'network'
    });

    // Set size and label of edges based on the attributes
    s.graph.edges().forEach(e => {
        e.size = e.attributes[3];
        e.label = e.attributes[4];
    });

    // Refresh the data structure
    s.refresh();

    // Enable node dragging
    var listener = sigma.plugins.dragNodes(s, s.renderers[0]);

    // Temporarily unbind the clickNode event while dragging
    listener.bind("drag", function (e) {
        s.unbind('clickNode');
    });

    // Function to determine the direct node neighbours and hide any edges that
    // are not directly connected to the clicked node.
    var nodeClickFn = function (node, data) {
        filter
            .neighborsOf(node.data.node.id)
            .edgesBy(function (edge) {
                return (edge.source == node.data.node.id || edge.target == node.data.node.id)
            })
            .apply();
    };

    // Re-enable node clicking after dragging is done
    listener.bind("dragend", function (e) {
        setTimeout(function () {
            s.bind('clickNode', nodeClickFn);
        }, 250);
    });

    // Bind to node and stage clicking
    s.bind('clickNode', nodeClickFn);
    s.bind('clickStage', function (e) {
        filter.undo().apply();
    });

    // Bind to the edge hover event
    s.bind('overEdge', function (e) {
        var labels = e.data.edge.label.split('*');

        labels.forEach(function (label) {
            var h3 = document.createElement("h4");
            h3.innerHTML = label;
            document.getElementById("requests").appendChild(h3);
        })
    });

    s.bind('outEdge', function (e) {
        var requests = document.getElementById("requests");
        // Remove request DOM nodes
        while (requests.firstChild) {
            requests.removeChild(requests.firstChild);
        }
    });

    // Start force directed layout
    s.startForceAtlas2({strongGravityMode: true, scalingRatio: 70, slowDown: 1000});

    // Stop layoutcafter ten seconds
    setTimeout(function () {
        s.stopForceAtlas2();
    }, 10000);
});
