
// Define the chart function that takes data as a parameter
function chart(data) {
  // Specify the chart’s dimensions.
  const width = 400;
  const height = width;
  const radius = width / 7;

  // Create the color scale.
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  // Compute the layout.
  const hierarchy = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  const root = d3.partition()
    .size([2 * Math.PI, hierarchy.height + 1])
    (hierarchy);
  root.each(d => d.current = d);

  // Create the arc generator.
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

  // Create the SVG container.
  const svg = d3.create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, width])
    .style("font", "10px sans-serif");

  // Append the arcs.
  const path = svg.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
    .attr("fill", d => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
    .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
    .attr("d", d => arc(d.current));

  // Make them clickable if they have children.
  path.filter(d => d.children)
    .style("cursor", "pointer")
    .on("click", clicked);

  const format = d3.format(",d");
  path.append("title")
    .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

  const label = svg.append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", d => +labelVisible(d.current))
    .attr("transform", d => labelTransform(d.current))
    .text(d => d.data.name);

  const parent = svg.append("circle")
    .datum(root)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", clicked);

  // Handle zoom on click.
  function clicked(p) {
    parent.datum(p.parent || root);

    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

    const t = svg.transition().duration(750);

    // Transition the data on all arcs
    path.transition(t)
      .tween("data", d => {
        const i = d3.interpolate(d.current, d.target);
        return t => d.current = i(t);
      })
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
      .attrTween("d", d => () => arc(d.current));

    // Update the labels separately
    updateLabels(t);
  }

  function updateLabels(transition) {
    label.transition(transition)
      .attr("fill-opacity", d => +labelVisible(d.target))
      .attrTween("transform", d => () => labelTransform(d.current));
  }



  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    console.log(`Incoming d: ${d}`);
    let x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    let y = (d.y0 + d.y1) / 2 * radius;

    console.log(`x: ${x}, y: ${y}`);

    // Add guard clauses to check if x and y are NaN and replace them with default values (0)
    if (isNaN(x)) x = 0;
    if (isNaN(y)) y = 0;

    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  return svg.node();
}

// Sample data (replace with your data)
const data = {
  "name": "ICSE Authors",
  "children": [
    {
      "name": "Author kio",
      "most_collaborated": "CoAuthor1.1",
      "url": "https://dblp.uni-trier.de/pid/273/8775.html",
      "children": [
        {
          "name": "CoAuthor1.1",
          "children": [
            {
              "name": "Kio Godsfaour",
              "url": "https://dblp.uni-trier.de/pid/273/8775.html",
              "value": 10,
              "most_collaborated": null,
              "children": []
            },
            { "name": "SubCoAuthor1.1.2", "value": 0 }
          ]
        },
        {
          "name": "CoAuthor1.2",
          "children": [
            {
              "name": "HHHHHHHH.2.1",
              "children": [
                {
                  "name": "CoAuthor1.1",
                  "children": [
                    { "name": "SubCoAuthor1.1.1", "value": 10 },
                    { "name": "SubCoAuthor1.1.2", "value": 15 }
                  ]
                }],
              "value": 20
            },
            { "name": "SubCoAuthor1.2.2", "value": 25 }
          ]
        }
      ],
      "value": 0
    },
    {
      "name": "Author2",
      "children": [
        {
          "name": "CoAuthor2.1",
          "children": [
            { "name": "SubCoAuthor2.1.1", "value": 30 },
            { "name": "SubCoAuthor2.1.2", "value": 35 }
          ]
        },
        {
          "name": "CoAuthor2.2",
          "children": [
            { "name": "SubCoAuthor2.2.1", "value": 40 },
            { "name": "SubCoAuthor2.2.2", "value": 45 }
          ]
        }
      ]
    },
    {
      "name": "Author4",
      "children": [
        {
          "name": "CoAuthor2.1",
          "children": [
            { "name": "SubCoAuthor2.1.1", "value": 30 },
            { "name": "SubCoAuthor2.1.2", "value": 35 }
          ]
        },
        {
          "name": "CoAuthor2.2",
          "children": [
            { "name": "SubCoAuthor2.2.1", "value": 40 },
            { "name": "SubCoAuthor2.2.2", "value": 45 }
          ]
        }
      ]
    },
    {
      "name": "Author3",
      "children": [
        {
          "name": "CoAuthor3.1",
          "children": [
            { "name": "SubCoAuthor3.1.1", "value": 50 },
            { "name": "SubCoAuthor3.1.2", "value": 55 }
          ]
        },
        {
          "name": "CoAuthor3.2",
          "children": [
            { "name": "SubCoAuthor3.2.1", "value": 60 },
            { "name": "SubCoAuthor3.2.2", "value": 65 }
          ]
        }
      ]
    },
    {
      "name": "Author5",
      "children": [
        {
          "name": "CoAuthor2.1",
          "children": [
            { "name": "SubCoAuthor2.1.1", "value": 30 },
            { "name": "SubCoAuthor2.1.2", "value": 35 }
          ]
        },
        {
          "name": "CoAuthor2.2",
          "children": [
            { "name": "SubCoAuthor2.2.1", "value": 40 },
            { "name": "SubCoAuthor2.2.2", "value": 45 }
          ]
        }
      ]
    },
    {
      "name": "Author6",
      "children": [
        {
          "name": "CoAuthor2.1",
          "children": [
            { "name": "SubCoAuthor2.1.1", "value": 30 },
            { "name": "SubCoAuthor2.1.2", "value": 35 }
          ]
        },
        {
          "name": "CoAuthor2.2",
          "children": [
            { "name": "SubCoAuthor2.2.1", "value": 40 },
            { "name": "SubCoAuthor2.2.2", "value": 45 }
          ]
        }
      ]
    },
    {
      "name": "Author7",
      "children": [
        {
          "name": "CoAuthor2.1",
          "children": [
            { "name": "SubCoAuthor2.1.1", "value": 30 },
            { "name": "SubCoAuthor2.1.2", "value": 35 }
          ]
        },
        {
          "name": "CoAuthor2.2",
          "children": [
            { "name": "SubCoAuthor2.2.1", "value": 40 },
            { "name": "SubCoAuthor2.2.2", "value": 45 }
          ]
        }
      ]
    },
    {
      "name": "Author2",
      "children": [
        {
          "name": "CoAuthor2.1",
          "children": [
            {
              "name": "SubCoAuthor2.1.1", "children": [
                {
                  "name": "CoAuthor2.1",
                  "children": [
                    { "name": "SubCoAuthor2.1.1", "value": 30 },
                    { "name": "SubCoAuthor2.1.2", "value": 35 }
                  ]
                },
                {
                  "name": "CoAuthor2.2",
                  "children": [
                    {
                      "name": "SubCoAuthor2.2.1",
                      "children": [
                        {
                          "name": "CoAuthor2.1",
                          "children": [
                            { "name": "SubCoAuthor2.1.1", "value": 30 },
                            { "name": "SubCoAuthor2.1.2", "value": 35 }
                          ]
                        },
                        {
                          "name": "CoAuthor2.2",
                          "children": [
                            { "name": "SubCoAuthor2.2.1", "value": 40 },
                            { "name": "SubCoAuthor2.2.2", "value": 45 }
                          ]
                        }
                      ],
                      "value": 40
                    },
                    { "name": "SubCoAuthor2.2.2", "value": 45 }
                  ]
                }
              ],
              "value": 30
            },
            { "name": "SubCoAuthor2.1.2", "value": 35 }
          ]
        },
        {
          "name": "CoAuthor2.2",
          "children": [
            { "name": "SubCoAuthor2.2.1", "value": 40 },
            { "name": "SubCoAuthor2.2.2", "value": 45 }
          ]
        }
      ]
    }
  ]
};



// Call the chart function with your data
const svg = chart(data);

// Append the chart to an HTML element
document.getElementById("sunburst-chart").appendChild(svg);

