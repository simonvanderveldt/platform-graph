sigma.utils.pkg('sigma.canvas.nodes');

sigma.canvas.nodes.network = (function() {

  // Return the renderer itself:
  var renderer = function(node, context, settings) {
    var args = arguments,
        prefix = settings('prefix') || '',
        size = node[prefix + 'size'],
        incomingSize;

    context.fillStyle = node.color || settings('defaultNodeColor');
    context.beginPath();
    context.arc(
      node[prefix + 'x'],
      node[prefix + 'y'],
      size,
      0,
      Math.PI * 2,
      true
    );

    context.closePath();
    context.fill();

    // if (node['outgoing'] > 0) {

    //   trafficRatio = node['incoming'] / node['outgoing']

    //   console.log(node['label'], node['incoming'], node['outgoing'], size, trafficRatio)

    //   context.fillStyle = settings('defaultNodeColor');
    //   context.beginPath();
    //   context.arc(
    //     node[prefix + 'x'],
    //     node[prefix + 'y'],
    //     trafficRatio,
    //     0,
    //     Math.PI * 2,
    //     true
    //   );

    //   context.stroke();
    // }
  };

  return renderer;

})();
