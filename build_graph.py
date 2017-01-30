#!/usr/bin/env python

import sys
import logging
import re
from elasticsearch import Elasticsearch
from networkx import nx
from difflib import SequenceMatcher
from collections import defaultdict

# Setup logging
logger = logging.getLogger('graph-builder')
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'))
handler.setLevel(logging.INFO)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Connect to Elasticsearch
client = Elasticsearch(hosts=[''])

# Use static list of components for now. Would be nicer to just build the
# graph nodes dynamically from the logs.
components = {
    "component_name": {'incoming': 0.0, 'outgoing': 0.0},
}

# Convenience function to determine similarity of two strings
def similar(a, b):
    return SequenceMatcher(None, a, b).ratio() > 0.7

# Analyze the request and strip out dynamic or useless elements
def strip_request(request):
    # Strip off the HTTP protocol version
    request = request.replace('HTTP/1.1', '')

    # Strip out any UUID's
    request = re.sub(
        r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", '{UUID}',
        request,
        count=0,
        flags=re.IGNORECASE
    )

    # Strip out sequences of four digits and longer, they're probably an identifier
    request = re.sub(r"\d\d\d\d+", '{ID}', request)

    # We are also not interested in any query parameters
    if request.find('?') != -1:
        request = request[:request.find('?')]

    return request

logger.info('Building graph nodes...')

# Create a directed graph
G = nx.DiGraph()

# For each component, retrieve the logs and analyse the requests to build the
# graph edges.
for component in components.keys():
    logger.info("Building edges for {0}".format(component))

    edges = []

    # If dict key does not exist, init with an empty list automatically
    requests = defaultdict(lambda: [])

    # Fetch the logs from Elasticsearch
    response = client.search(
        index="haproxy-*",
        scroll='2m',
        search_type='scan',
        size=1000,
        body={
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": {
                                "request_headers": {
                                    "query": "\"{0}\"".format(component),
                                    "type": "phrase"
                                }
                            }
                        }
                    ],
                    "filter": [
                        {
                            "term": {
                                "env": "production"
                            }
                        }
                    ]
                }
            }
        }
    )

    # Initialise the scroll parameters
    sid = response['_scroll_id']
    scroll_position = 0

    # Start scrolling until we hit 50000 logs
    while scroll_position < 50000:
        page = client.scroll(scroll_id=sid, scroll='2m')
        sid = page['_scroll_id']

        hits = page['hits']['hits']
        scroll_position += len(hits)

        if len(hits) > 0:
            for hit in hits:
                # Sanitize the request
                hitRequest = strip_request(hit['_source']['http_request'])
                hitBackend = hit['_source']['backend_name']

                # Increase the counters
                components[hitBackend]['incoming'] += 1.0
                components[component]['outgoing'] += 1.0

                # Do an url similarity check on previously added requests
                if all(not similar(existingRequest, hitRequest) for existingRequest in requests[hitBackend]):
                    requests[hitBackend].append(hitRequest)

            # Add the edges
            for backend, reqs in requests.iteritems():
                if len(reqs) > 0:
                    G.add_edge(component, backend, None, requests="*".join(reqs), count=len(reqs))
        else:
            # No more hits, so move on to the next component
            break

max_node_size = 0.0

# Update the node sizes
for component in components.keys():
    if component in G.nodes():
        node_size = components[component]['incoming'] + components[component]['outgoing']
        if node_size > max_node_size:
            max_node_size = node_size

        G.node[component]['size'] = node_size
        G.node[component]['incoming'] = components[component]['incoming']
        G.node[component]['outgoing'] = components[component]['outgoing']

# Set node ratio based on max node size
for node in G.nodes():
    G.node[node]['size'] = G.node[node]['size'] / max_node_size

# Write the graph
nx.write_gexf(G, "graph.gexf", version="1.2draft")
