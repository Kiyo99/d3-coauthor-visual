d3.json("coauthors_collab_filtered.json").then(function(graph) {
    const width = 1000;
    const height = 1000;

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    // Filter out links with missing source nodes
    const validSourceIds = new Set(graph.nodes.map(node => node.id));
    graph.links = graph.links.filter(link => validSourceIds.has(link.source));

    const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Append line elements for co-author connections
    const linkLines = svg.selectAll(".link-line")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link-line");

    // Append text elements for author names
    const authorLabels = svg.selectAll(".author-label")
        .data(graph.nodes)
        .enter().append("text")
        .attr("class", "author-label")
        .text(d => d.id)
        .attr("dy", 15); // Adjust the vertical position

    const link = svg.append("g")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke-width", 1);

    const node = svg.append("g")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", 5)
        .attr("fill", "blue")
        .call(d3.drag()
            .on("start", dragstart)
            .on("drag", dragging)
            .on("end", dragend));

    node.append("title")
        .text(d => d.id);

    simulation.nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        linkLines
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        authorLabels
            .attr("x", d => d.x)
            .attr("y", d => d.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    function dragstart(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragging(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragend(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
});
