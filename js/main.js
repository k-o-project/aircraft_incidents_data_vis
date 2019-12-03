window.onload = start;

function start() {

    var centered;

    //variables
    var width_Map = 1000,
        width_Box = 600,
        height_Map = 600,
        height_Box = 600,
        active = d3.select(null);
    
    // projection definitions
    var projection = d3.geoMercator()
                       .scale(150)
                       .translate([width_Map/2, height_Map/2 + 100]);
    var path = d3.geoPath()
                 .projection(projection);

    // SVG related definitions
    var svg_Map = d3.select(".vis_Map")
                .append("svg")
                .attr("width", width_Map)
                .attr("height", height_Map)
                .on("click", stopped, true);
    svg_Map.append("rect")
        .attr("class", "background")
        .attr("width", width_Map)
        .attr("height", height_Map)
        .on("click", reset);
    var svg_Box = d3.select(".vis_Box")
                    .append("svg")
                    .attr("width", width_Box)
                    .attr("height", height_Box);

    // World map data
    var gBackground = svg_Map.append("g");
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json", function(error, world) {
        if (error) throw error;

        gBackground.selectAll("path")
            .data(topojson.feature(world, world.objects.countries).features)
            .enter().append("path")
            .attr("d", path)
            .attr("class", "feature")
            .on("click", clicked);
        
        gBackground.append("path")
            .datum(topojson.mesh(world, world.objects.countries, function(a,b){return a !== b;}))
            .attr("class","mesh")
            .attr("d", path);

    });

    // Aircraft incidents data
    var gDataPoints = svg_Map.append("g");
    d3.csv("data/aircraft_incidents.csv", function(error, data) {
        
        // Draw points
        gDataPoints.selectAll("circles.points")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", 1)
            .attr("transform", function(d) {
                return "translate(" + projection([d.Longitude, d.Latitude]) + ")";
            });

        // Handler for dropdown value change
        var dropdownChange = function() {
            var selected_Option = document.getElementById("world_Filter").options[document.getElementById("world_Filter").selectedIndex].value;

            updateOptions(selected_Option);
        };

        // A function that updates options
        var updateOptions = function(selected_Option) {
            
            d3.csv("data/aircraft_incidents.csv", function(error, data) {

                var filter_Options = [];
                data.forEach(function(d) {

                    switch (selected_Option) {

                        case "event_Date":
                            let year = d.Event_Date.split("/")[2];
                            if (year < 20) {
                                year = "20" + year; 
                            } else {
                                year = "19" + year;
                            }
                            if (!filter_Options.includes(year)) {
                                filter_Options.push(year);
                            }
                            break;

                        case "aircraft_Make":
                            if (!filter_Options.includes(d.Make)) {
                                filter_Options.push(d.Make);
                            }
                            break;

                        case "broad_Phase_Of_Flight":
                            if (!filter_Options.includes(d.Broad_Phase_of_Flight) && d.Broad_Phase_of_Flight.trim() !== "") {
                                filter_Options.push(d.Broad_Phase_of_Flight);
                            }
                            break;
                    }
                });

                // Remove old options
                d3.selectAll(".radio_Option").remove();

                // Add new options
                filter_Options.sort();
                filter_Options.forEach(function(d) {
                    
                    d3.select("#world_Filter_Options")
                      .insert("input")
                      .attr("class", "radio_Option")
                      .attr('type', 'radio')
                      .attr('name', 'world_Filter_Option')
                      .attr('value', d.toString());
                    d3.select("#world_Filter_Options")
                      .append("label")
                      .attr("class", "radio_Option")
                      .html(d.toString() + "<br/>");
                    // d3.select("#world_Filter_Options")
                    //   .append("label")
                    //   .attr("class", "radio_Option")
                    //   .html("<br/>");
                });
                
            });
        };

        // Function that retrieve the selected value from options
        var radioButtonChange = function() {
            
            var option_List = document.forms[0];
            for (let i = 0; i < option_List.length; i++) {
                if (option_List[i].checked) {
                    // console.log("selected is " + option_List[i].value);
                    filterWorldMap(option_List[i].value);
                }
            }
        }

        // Function that filters the world map
        var filterWorldMap = function(filter_Value) {

            d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json", function(error, world) {
                if (error) throw error;
                // console.log("d is " + world.objects.countries.geometries[0].properties.name);

                gBackground.selectAll("path")
                        .data(topojson.feature(world, world.objects.countries).features)
                        
                        // .attr("d", path)
                    .attr("class", function(d) {
                        // console.log("d.properties.name is " + d.properties.name);
                        if (d.properties) {
                            if (d.properties.name === "United Kingdom") {
                                console.log("finally here");
                                return "feature2";
                            } else {
                                console.log("hello...");
                                return "feature";
                            }
                        }
                    })
                    .on("click", clicked);

                // gBackground.selectAll("path")
                           
            });
        }

        // On change
        d3.select("#world_Filter").on("change", dropdownChange);
        d3.select("#world_Filter_Options").on("change", radioButtonChange);
    });

    // When clicked a country
    var clicked = function(d) {
        var x, y, k;

        if (d && centered !== d) {
            var centroid = path.centroid(d);
            x = centroid[0];
            y = centroid[1];
            k = 3;
            centered = d;
        } else {
            x = width_Map / 2;
            y = height_Map / 2;
            k = 1;
            centered = null;
        }

        gBackground.selectAll("path")
            .classed("active", centered && function(d) { return d === centered; });

        // Zoom in
        gBackground.transition()
            .duration(1000)
            .attr("transform", "translate(" + width_Map / 2 + "," + height_Map / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
        gDataPoints.transition()
            .duration(1000)
            .attr("transform", "translate(" + width_Map / 2 + "," + height_Map / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    }

    // When zooming out from a country
    var reset = function() {
        active.classed("active", false);
        active = d3.select(null);

        svg_Map.transition()
            .duration(1000)
            .call(zoom.transform, d3.zoomIdentity);
    }

    var stopped = function() {
        if (d3.event.defaultPrevented) d3.event.stopPropagation();
    }

}
