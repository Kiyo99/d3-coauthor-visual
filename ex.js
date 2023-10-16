
// Define the chart function that takes data as a parameter
function chart(data) {
  // Specify the chart’s dimensions.
  const width = 1000;
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
// const data = {
//   "name": "ICSE Authors",
//   "children": [
//     {
//       "name": "Author kio",
//       "most_collaborated": "CoAuthor1.1",
//       "url": "https://dblp.uni-trier.de/pid/273/8775.html",
//       "children": [
//         {
//           "name": "CoAuthor1.1",
//           "children": [
//             {
//               "name": "Kio Godsfaour",
//               "url": "https://dblp.uni-trier.de/pid/273/8775.html",
//               "value": 10,
//               "most_collaborated": null,
//               "children": []
//             },
//             { "name": "SubCoAuthor1.1.2", "value": 0 }
//           ]
//         },
//         {
//           "name": "CoAuthor1.2",
//           "children": [
//             {
//               "name": "HHHHHHHH.2.1",
//               "children": [
//                 {
//                   "name": "CoAuthor1.1",
//                   "children": [
//                     { "name": "SubCoAuthor1.1.1", "value": 10 },
//                     { "name": "SubCoAuthor1.1.2", "value": 15 }
//                   ]
//                 }],
//               "value": 20
//             },
//             { "name": "SubCoAuthor1.2.2", "value": 25 }
//           ]
//         }
//       ],
//       "value": 0
//     },
//     {
//       "name": "Author2",
//       "children": [
//         {
//           "name": "CoAuthor2.1",
//           "children": [
//             { "name": "SubCoAuthor2.1.1", "value": 30 },
//             { "name": "SubCoAuthor2.1.2", "value": 35 }
//           ]
//         },
//         {
//           "name": "CoAuthor2.2",
//           "children": [
//             { "name": "SubCoAuthor2.2.1", "value": 40 },
//             { "name": "SubCoAuthor2.2.2", "value": 45 }
//           ]
//         }
//       ]
//     },
//     {
//       "name": "Author4",
//       "children": [
//         {
//           "name": "CoAuthor2.1",
//           "children": [
//             { "name": "SubCoAuthor2.1.1", "value": 30 },
//             { "name": "SubCoAuthor2.1.2", "value": 35 }
//           ]
//         },
//         {
//           "name": "CoAuthor2.2",
//           "children": [
//             { "name": "SubCoAuthor2.2.1", "value": 40 },
//             { "name": "SubCoAuthor2.2.2", "value": 45 }
//           ]
//         }
//       ]
//     },
//     {
//       "name": "Author3",
//       "children": [
//         {
//           "name": "CoAuthor3.1",
//           "children": [
//             { "name": "SubCoAuthor3.1.1", "value": 50 },
//             { "name": "SubCoAuthor3.1.2", "value": 55 }
//           ]
//         },
//         {
//           "name": "CoAuthor3.2",
//           "children": [
//             { "name": "SubCoAuthor3.2.1", "value": 60 },
//             { "name": "SubCoAuthor3.2.2", "value": 65 }
//           ]
//         }
//       ]
//     },
//     {
//       "name": "Author5",
//       "children": [
//         {
//           "name": "CoAuthor2.1",
//           "children": [
//             { "name": "SubCoAuthor2.1.1", "value": 30 },
//             { "name": "SubCoAuthor2.1.2", "value": 35 }
//           ]
//         },
//         {
//           "name": "CoAuthor2.2",
//           "children": [
//             { "name": "SubCoAuthor2.2.1", "value": 40 },
//             { "name": "SubCoAuthor2.2.2", "value": 45 }
//           ]
//         }
//       ]
//     },
//     {
//       "name": "Author6",
//       "children": [
//         {
//           "name": "CoAuthor2.1",
//           "children": [
//             { "name": "SubCoAuthor2.1.1", "value": 30 },
//             { "name": "SubCoAuthor2.1.2", "value": 35 }
//           ]
//         },
//         {
//           "name": "CoAuthor2.2",
//           "children": [
//             { "name": "SubCoAuthor2.2.1", "value": 40 },
//             { "name": "SubCoAuthor2.2.2", "value": 45 }
//           ]
//         }
//       ]
//     },
//     {
//       "name": "Author7",
//       "children": [
//         {
//           "name": "CoAuthor2.1",
//           "children": [
//             { "name": "SubCoAuthor2.1.1", "value": 30 },
//             { "name": "SubCoAuthor2.1.2", "value": 35 }
//           ]
//         },
//         {
//           "name": "CoAuthor2.2",
//           "children": [
//             { "name": "SubCoAuthor2.2.1", "value": 40 },
//             { "name": "SubCoAuthor2.2.2", "value": 45 }
//           ]
//         }
//       ]
//     },
//     {
//       "name": "Author2",
//       "children": [
//         {
//           "name": "CoAuthor2.1",
//           "children": [
//             {
//               "name": "SubCoAuthor2.1.1", "children": [
//                 {
//                   "name": "CoAuthor2.1",
//                   "children": [
//                     { "name": "SubCoAuthor2.1.1", "value": 30 },
//                     { "name": "SubCoAuthor2.1.2", "value": 35 }
//                   ]
//                 },
//                 {
//                   "name": "CoAuthor2.2",
//                   "children": [
//                     {
//                       "name": "SubCoAuthor2.2.1",
//                       "children": [
//                         {
//                           "name": "CoAuthor2.1",
//                           "children": [
//                             { "name": "SubCoAuthor2.1.1", "value": 30 },
//                             { "name": "SubCoAuthor2.1.2", "value": 35 }
//                           ]
//                         },
//                         {
//                           "name": "CoAuthor2.2",
//                           "children": [
//                             { "name": "SubCoAuthor2.2.1", "value": 40 },
//                             { "name": "SubCoAuthor2.2.2", "value": 45 }
//                           ]
//                         }
//                       ],
//                       "value": 40
//                     },
//                     { "name": "SubCoAuthor2.2.2", "value": 45 }
//                   ]
//                 }
//               ],
//               "value": 30
//             },
//             { "name": "SubCoAuthor2.1.2", "value": 35 }
//           ]
//         },
//         {
//           "name": "CoAuthor2.2",
//           "children": [
//             { "name": "SubCoAuthor2.2.1", "value": 40 },
//             { "name": "SubCoAuthor2.2.2", "value": 45 }
//           ]
//         }
//       ]
//     }
//   ]
// };

const data = {
  "name": "ICSE Authors",
  "children": [
      {
          "name": "Ahmed E. Hassan (68)",
          "most_collaborated": "Bram Adams",
          "url": "https://dblp.uni-trier.de/pid/h/AhmedEHassan.html",
          "children": [
              {
                  "name": "Bram Adams (81)",
                  "url": "https://dblp.uni-trier.de/pid/98/6356.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (81)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Foutse Khomh (23)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhen Ming (Jack) Jiang (20)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Emad Shihab (16)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Meiyappan Nagappan (14)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Weiyi Shang (44)",
                  "url": "https://dblp.uni-trier.de/pid/96/7305.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Tse-Hsun (Peter) Chen (25)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Heng Li 0007 (21)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (11)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Cor-Paul Bezemer (11)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Zhen Ming (Jack) Jiang (42)",
                  "url": "https://dblp.uni-trier.de/pid/50/23.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (42)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (20)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Parminder Flora (19)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Boyuan Chen 0002 (16)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Weiyi Shang (10)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Shane McIntosh (40)",
                  "url": "https://dblp.uni-trier.de/pid/31/8127.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (40)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Yasutaka Kamei (19)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ken-ichi Matsumoto (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (13)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Keheliya Gallaba (9)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Ying Zou 0001 (39)",
                  "url": "https://dblp.uni-trier.de/pid/55/3451-1.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (39)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Joanna W. Ng (29)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Foutse Khomh (27)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Iman Keivanloo (21)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shaohua Wang 0002 (19)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Lionel C. Briand (36)",
          "most_collaborated": "Yvan Labiche",
          "url": "https://dblp.uni-trier.de/pid/93/1501.html",
          "children": [
              {
                  "name": "Yvan Labiche (74)",
                  "url": "https://dblp.uni-trier.de/pid/52/1881.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Lionel C. Briand (74)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Maged Elaasar (13)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Marcela Genero (9)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Damiano Torre (9)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Fr\u00e9d\u00e9ric Massicotte (7)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Mehrdad Sabetzadeh (71)",
                  "url": "https://dblp.uni-trier.de/pid/25/6367.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Lionel C. Briand (71)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shiva Nejati (35)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Chetan Arora 0002 (23)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Sallam Abualhaija (17)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Marsha Chechik (15)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Shiva Nejati (62)",
                  "url": "https://dblp.uni-trier.de/pid/57/3937.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Lionel C. Briand (62)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Mehrdad Sabetzadeh (35)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Marsha Chechik (20)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Claudio Menghi (11)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Thomas Bruckmann (10)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Fabrizio Pastore (49)",
                  "url": "https://dblp.uni-trier.de/pid/61/1343.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Lionel C. Briand (49)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Leonardo Mariani (32)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Arda Goknil (18)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Hazem M. Fahmy (11)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Phu X. Mai (10)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Domenico Bianculli (43)",
                  "url": "https://dblp.uni-trier.de/pid/b/DomenicoBianculli.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Lionel C. Briand (43)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Carlo Ghezzi (26)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Srdan Krstic (12)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Donghwan Shin 0001 (12)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Pierluigi San Pietro (8)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "David Lo 0001 (35)",
          "most_collaborated": "Xin Xia 0001",
          "url": "https://dblp.uni-trier.de/pid/89/6793-1.html",
          "children": [
              {
                  "name": "Xin Xia 0001 (212)",
                  "url": "https://dblp.uni-trier.de/pid/06/2072-1.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "David Lo 0001 (212)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shanping Li (64)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhenchang Xing (49)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "John C. Grundy (47)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ahmed E. Hassan (37)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Ferdian Thung (95)",
                  "url": "https://dblp.uni-trier.de/pid/07/10158.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "David Lo 0001 (95)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Lingxiao Jiang (41)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ting Zhang (19)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Julia Lawall (17)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ivana Clairine Irsan (15)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Lingxiao Jiang (71)",
                  "url": "https://dblp.uni-trier.de/pid/82/3572.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "David Lo 0001 (71)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ferdian Thung (41)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Nghi D. Q. Bui (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Julia Lawall (14)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shaowei Wang 0002 (12)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Shanping Li (51)",
                  "url": "https://dblp.uni-trier.de/pid/35/1103.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Xin Xia 0001 (64)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "David Lo 0001 (51)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ahmed E. Hassan (17)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Lingfeng Bao (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhenchang Xing (11)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Zhou Yang 0003 (44)",
                  "url": "https://dblp.uni-trier.de/pid/323/9260-3.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "David Lo 0001 (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Jieke Shi (24)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bowen Xu (16)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Junda He (12)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Muhammad Hilmi Asyrofi (11)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Foutse Khomh (25)",
          "most_collaborated": "Giuliano Antoniol",
          "url": "https://dblp.uni-trier.de/pid/32/147.html",
          "children": [
              {
                  "name": "Giuliano Antoniol (67)",
                  "url": "https://dblp.uni-trier.de/pid/73/3515.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Yann-Ga\u00ebl Gu\u00e9h\u00e9neuc (78)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Foutse Khomh (67)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Massimiliano Di Penta (67)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ettore Merlo (47)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Paolo Tonella (30)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Yann-Ga\u00ebl Gu\u00e9h\u00e9neuc (65)",
                  "url": "https://dblp.uni-trier.de/pid/20/6995.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Giuliano Antoniol (78)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Foutse Khomh (65)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Naouel Moha (46)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "F\u00e1bio Petrillo (46)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Cristiano Politowski (31)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Amin Nikanjam (29)",
                  "url": "https://dblp.uni-trier.de/pid/42/1656.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Foutse Khomh (29)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Adel Torkaman Rahmani (9)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhen Ming (Jack) Jiang (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Mohammad Mehdi Morovati (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Vahid Rafe (7)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Ying Zou 0001 (27)",
                  "url": "https://dblp.uni-trier.de/pid/55/3451-1.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (39)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Joanna W. Ng (29)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Foutse Khomh (27)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Iman Keivanloo (21)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shaohua Wang 0002 (19)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Bram Adams (23)",
                  "url": "https://dblp.uni-trier.de/pid/98/6356.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (81)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Foutse Khomh (23)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhen Ming (Jack) Jiang (20)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Emad Shihab (16)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Meiyappan Nagappan (14)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Massimiliano Di Penta (25)",
          "most_collaborated": "Gabriele Bavota",
          "url": "https://dblp.uni-trier.de/pid/d/MassimilianoDiPenta.html",
          "children": [
              {
                  "name": "Gabriele Bavota (83)",
                  "url": "https://dblp.uni-trier.de/pid/09/8523.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Rocco Oliveto (110)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Massimiliano Di Penta (83)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Denys Poshyvanyk (60)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Andrea De Lucia (52)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Michele Lanza (45)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Rocco Oliveto (71)",
                  "url": "https://dblp.uni-trier.de/pid/18/6986.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Gabriele Bavota (110)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Andrea De Lucia (109)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Massimiliano Di Penta (71)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Simone Scalabrino (56)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Denys Poshyvanyk (43)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Giuliano Antoniol (67)",
                  "url": "https://dblp.uni-trier.de/pid/73/3515.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Yann-Ga\u00ebl Gu\u00e9h\u00e9neuc (78)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Foutse Khomh (67)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Massimiliano Di Penta (67)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ettore Merlo (47)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Paolo Tonella (30)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Gerardo Canfora (58)",
                  "url": "https://dblp.uni-trier.de/pid/63/4434.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Corrado Aaron Visaggio (73)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Massimiliano Di Penta (58)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Aniello Cimitile (41)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Andrea De Lucia (34)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Sebastiano Panichella (28)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Denys Poshyvanyk (50)",
                  "url": "https://dblp.uni-trier.de/pid/02/320.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Kevin Moran (86)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Mario Linares-V\u00e1squez (66)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Gabriele Bavota (60)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Carlos Bernal-C\u00e1rdenas (54)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Massimiliano Di Penta (50)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Victor R. Basili (24)",
          "most_collaborated": "Forrest Shull",
          "url": "https://dblp.uni-trier.de/pid/b/VRBasili.html",
          "children": [
              {
                  "name": "Forrest Shull (36)",
                  "url": "https://dblp.uni-trier.de/pid/18/462.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Victor R. Basili (36)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Carolyn B. Seaman (19)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Jeffrey C. Carver (16)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Nico Zazworka (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Marvin V. Zelkowitz (10)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Lionel C. Briand (29)",
                  "url": "https://dblp.uni-trier.de/pid/93/1501.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Yvan Labiche (74)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Mehrdad Sabetzadeh (71)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shiva Nejati (62)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Fabrizio Pastore (49)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Domenico Bianculli (43)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Marvin V. Zelkowitz (25)",
                  "url": "https://dblp.uni-trier.de/pid/z/MarvinVZelkowitz.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Victor R. Basili (25)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Forrest Shull (10)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ioana Rus (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Roseanne Tesoriero Tvedt (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Lorin Hochstein (6)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Carolyn B. Seaman (16)",
                  "url": "https://dblp.uni-trier.de/pid/s/CarolynBSeaman.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Rodrigo O. Sp\u00ednola (29)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Nicolli Rios (24)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Clemente Izurieta (22)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Manoel G. Mendon\u00e7a (19)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Forrest Shull (19)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Jeffrey C. Carver (13)",
                  "url": "https://dblp.uni-trier.de/pid/c/JeffreyCCarver.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Gursimran Singh Walia (24)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Forrest Shull (16)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Gary L. Bradshaw (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Birgit Penzenstadler (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Victor R. Basili (13)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Bram Adams (24)",
          "most_collaborated": "Ahmed E. Hassan",
          "url": "https://dblp.uni-trier.de/pid/98/6356.html",
          "children": [
              {
                  "name": "Ahmed E. Hassan (81)",
                  "url": "https://dblp.uni-trier.de/pid/h/AhmedEHassan.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Bram Adams (81)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Weiyi Shang (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhen Ming (Jack) Jiang (42)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shane McIntosh (40)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ying Zou 0001 (39)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Foutse Khomh (23)",
                  "url": "https://dblp.uni-trier.de/pid/32/147.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Giuliano Antoniol (67)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Yann-Ga\u00ebl Gu\u00e9h\u00e9neuc (65)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Amin Nikanjam (29)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ying Zou 0001 (27)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (23)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Zhen Ming (Jack) Jiang (20)",
                  "url": "https://dblp.uni-trier.de/pid/50/23.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (42)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (20)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Parminder Flora (19)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Boyuan Chen 0002 (16)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Weiyi Shang (10)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Emad Shihab (16)",
                  "url": "https://dblp.uni-trier.de/pid/05/5996.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Diego Costa 0001 (33)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Rabe Abdalkareem (31)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ahmed E. Hassan (22)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Suhaib Mujahid (21)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (16)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Meiyappan Nagappan (14)",
                  "url": "https://dblp.uni-trier.de/pid/27/2828.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (35)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (14)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Emad Shihab (9)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Gema Rodr\u00edguez-P\u00e9rez (8)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Yasutaka Kamei (7)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Xin Xia 0001 (22)",
          "most_collaborated": "David Lo 0001",
          "url": "https://dblp.uni-trier.de/pid/06/2072-1.html",
          "children": [
              {
                  "name": "David Lo 0001 (212)",
                  "url": "https://dblp.uni-trier.de/pid/89/6793-1.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Xin Xia 0001 (212)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ferdian Thung (95)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Lingxiao Jiang (71)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shanping Li (51)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhou Yang 0003 (44)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Shanping Li (64)",
                  "url": "https://dblp.uni-trier.de/pid/35/1103.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Xin Xia 0001 (64)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "David Lo 0001 (51)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ahmed E. Hassan (17)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Lingfeng Bao (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhenchang Xing (11)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Zhenchang Xing (49)",
                  "url": "https://dblp.uni-trier.de/pid/52/6482.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Xin Xia 0001 (49)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Xiwei Xu 0001 (48)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Chunyang Chen (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Liming Zhu 0001 (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Xin Peng 0001 (39)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "John C. Grundy (47)",
                  "url": "https://dblp.uni-trier.de/pid/g/JohnCGrundy.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "John G. Hosking (131)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Mohamed Almorsy (108)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Li Li 0029 (49)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Xin Xia 0001 (47)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Qiang He 0001 (42)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Ahmed E. Hassan (37)",
                  "url": "https://dblp.uni-trier.de/pid/h/AhmedEHassan.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Bram Adams (81)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Weiyi Shang (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhen Ming (Jack) Jiang (42)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shane McIntosh (40)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ying Zou 0001 (39)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Tim Menzies (21)",
          "most_collaborated": "Rahul Krishna",
          "url": "https://dblp.uni-trier.de/pid/m/TimMenzies.html",
          "children": [
              {
                  "name": "Rahul Krishna (30)",
                  "url": "https://dblp.uni-trier.de/pid/138/9821.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Tim Menzies (30)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Baishakhi Ray (11)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Amritanshu Agrawal (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Pooyan Jamshidi (6)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Anup K. Kalia (6)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Zhe Yu 0002 (30)",
                  "url": "https://dblp.uni-trier.de/pid/32/9128-2.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Tim Menzies (30)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Amritanshu Agrawal (5)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Fahmid M. Fahid (5)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Vivek Nair (5)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Jianfeng Chen (4)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Amritanshu Agrawal (23)",
                  "url": "https://dblp.uni-trier.de/pid/180/3246.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Tim Menzies (23)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Wei Fu 0002 (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Rahul Krishna (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Akond Ashfaque Ur Rahman (6)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Alexander Sobran (6)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Vivek Nair (23)",
                  "url": "https://dblp.uni-trier.de/pid/185/0774.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Tim Menzies (23)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Dawn Song (15)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Jianfeng Chen (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Sven Apel (6)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "James F. O'Brien (6)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Wei Fu 0002 (22)",
                  "url": "https://dblp.uni-trier.de/pid/26/4472-2.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Tim Menzies (22)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Amritanshu Agrawal (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Di Chen (5)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Xipeng Shen (4)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Rahul Krishna (3)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      },
      {
          "name": "Cor-Paul Bezemer (20)",
          "most_collaborated": "Ahmed E. Hassan",
          "url": "https://dblp.uni-trier.de/pid/95/7251.html",
          "children": [
              {
                  "name": "Ahmed E. Hassan (33)",
                  "url": "https://dblp.uni-trier.de/pid/h/AhmedEHassan.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Bram Adams (81)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Weiyi Shang (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhen Ming (Jack) Jiang (42)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Shane McIntosh (40)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ying Zou 0001 (39)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Dayi Lin (12)",
                  "url": "https://dblp.uni-trier.de/pid/187/9420.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Cor-Paul Bezemer (12)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Ahmed E. Hassan (10)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Gopi Krishnan Rajbahadur (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Boyuan Chen 0002 (5)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Zhen Ming (Jack) Jiang (5)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Weiyi Shang (11)",
                  "url": "https://dblp.uni-trier.de/pid/96/7305.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Ahmed E. Hassan (44)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Tse-Hsun (Peter) Chen (25)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Heng Li 0007 (21)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Bram Adams (11)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Cor-Paul Bezemer (11)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Markos Viggiato (9)",
                  "url": "https://dblp.uni-trier.de/pid/223/6503.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Eduardo Figueiredo 0001 (11)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Cor-Paul Bezemer (9)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Johnatan Oliveira (8)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Dale Paas (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Chris Buzon (5)",
                          "value": 100,
                          "children": []
                      }
                  ]
              },
              {
                  "name": "Finlay Macklon (7)",
                  "url": "https://dblp.uni-trier.de/pid/311/5363.html",
                  "value": 60,
                  "children": [
                      {
                          "name": "Cor-Paul Bezemer (7)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Mohammad Reza Taesiri (5)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Dale Paas (4)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Natalia Romanova (4)",
                          "value": 100,
                          "children": []
                      },
                      {
                          "name": "Markos Viggiato (4)",
                          "value": 100,
                          "children": []
                      }
                  ]
              }
          ]
      }
  ]
}



// Call the chart function with your data
const svg = chart(data);

// Append the chart to an HTML element
document.getElementById("sunburst-chart").appendChild(svg);

