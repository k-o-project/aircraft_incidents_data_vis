window.onload = start;

function start() {

    var centered;

    //variables
    var width_Map = 960,
        width_Box = 200,
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
            .style("fill", "#ffb816")
            .style("opacity", 0.8)
            .attr("r", 2)
            .attr("transform", function(d) {
                return "translate(" + projection([d.Longitude, d.Latitude]) + ")";
            })
            .on("click", function(d) {

                // TODO: Remove and add new notifier
                // gDataPoints.append("circle")
                //            .attr("class", "red_Dot")
                //            .attr("cx", )

                // Remove old accident's information
                d3.select(".tooltip").remove();

                // Div for each accident's information
                var div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

                // Add the info into the div
                div.transition().duration(200).style("opacity", .8);
                div.html("</br><strong>Accident Number: </strong><span style='color:#ffb816'>  " + d.Accident_Number + "</span>" + 
                    "</br><strong>Event Date: </strong><span style='color:#ffb816'>  " + d.Event_Date + "</span>" + 
                    "</br><strong>Location: </strong><span style='color:#ffb816'>  " + d.Location + "</span>" + 
                    "</br><strong>Country: </strong><span style='color:#ffb816'>  " + d.Country + "</span>" + 
                    "</br><strong>Airport Code: </strong><span style='color:#ffb816'>  " + d.Airport_Code + "</span>" + 
                    "</br><strong>Airport Name: </strong><span style='color:#ffb816'>  " + d.Airport_Name + "</span>" + 
                    "</br><strong>Injury Severity :</strong><span style='color:#ffb816'>  " + d.Injury_Severity + "</span>" + 
                    "</br><strong>Aircraft Damage :</strong><span style='color:#ffb816'>  " + d.Accident_Damage + "</span></br>" )
            
                    .style("left", "700px")
                    .style("top", "220px");
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

                // Remove old options and color the world map if nothing is selected
                d3.selectAll(".radio_Option").remove();
                if (selected_Option === "") {
                    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json", function(error, world) {
                        gBackground.selectAll(".feature")
                                    .data(topojson.feature(world, world.objects.countries).features)
                                    .on("mouseover", function(d) {
                                        d3.select(this).style("fill", "#7d7d7d");
                                    })
                                    .on("mouseout", function(d) {
                                        d3.select(this).style("fill", "#ccc");
                                    })
                                    .style("fill", "#ccc");
                    });
                }

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
                });
                
            });
        };

        // Function that retrieve the selected value from options
        var radioButtonChange = function() {

            var selected_Option = document.getElementById("world_Filter").options[document.getElementById("world_Filter").selectedIndex].value;
            
            var option_List = document.forms[0];
            for (let i = 0; i < option_List.length; i++) {
                if (option_List[i].checked) {
                    filterWorldMap(selected_Option, option_List[i].value);
                }
            }
        }

        // Function that filters the world map
        var filterWorldMap = function(filter_Option, filter_Value) {

            var country_List = [];
            var count_List = [];
            var max_Count = 0;

            // Sort countries by filter_Value
            d3.csv("data/aircraft_incidents.csv", function(error, data) {
                if (error) throw error;

                data.forEach(function(d) {

                    switch(filter_Option) {

                        case "event_Date":
                            let year = (filter_Value >= 2000) ? (filter_Value - 2000) : (filter_Value - 1900);
                            if (year === 0) {
                                year = "00";
                            }
                            if(d.Event_Date.split("/")[2] == year) {

                                if (d.Country.trim() !== "") {

                                    // Fix US name as US
                                    let temp_Country_Name = d.Country.trim();
                                    temp_Country_Name = (temp_Country_Name === "United States") ? "United States of America" : temp_Country_Name;

                                    // Find if there is one
                                    let flag = false;
                                    country_List.forEach(function(each) {
                                        if (each.name === temp_Country_Name) {
                                            each.count++;
                                            flag = true;
                                            return;
                                        }
                                    });

                                    // Else, push new country
                                    if (!flag) {
                                        var new_Country = {
                                            name: temp_Country_Name,
                                            count: 1
                                        };
                                        country_List.push(new_Country);
                                    }
                                }
                            }
                            break;

                        case "aircraft_Make":
                            if (d.Make === filter_Value) {

                                if (d.Country.trim() !== "") {

                                    // Fix US name as US
                                    let temp_Country_Name = d.Country.trim();
                                    temp_Country_Name = (temp_Country_Name === "United States") ? "United States of America" : temp_Country_Name;

                                    // Find if there is one
                                    let flag = false;
                                    country_List.forEach(function(each) {
                                        if (each.name === temp_Country_Name) {
                                            each.count++;
                                            flag = true;
                                            return;
                                        }
                                    });

                                    // Else, push new country
                                    if (!flag) {
                                        var new_Country = {
                                            name: temp_Country_Name,
                                            count: 1
                                        };
                                        country_List.push(new_Country);
                                    }
                                }
                            }
                            break;

                        case "broad_Phase_Of_Flight":
                            if (d.Broad_Phase_of_Flight === filter_Value) {

                                if (d.Country.trim() !== "") {

                                    // Fix US name as US
                                    let temp_Country_Name = d.Country.trim();
                                    temp_Country_Name = (temp_Country_Name === "United States") ? "United States of America" : temp_Country_Name;

                                    // Find if there is one
                                    let flag = false;
                                    country_List.forEach(function(each) {
                                        if (each.name === temp_Country_Name) {
                                            each.count++;
                                            flag = true;
                                            return;
                                        }
                                    });

                                    // Else, push new country
                                    if (!flag) {
                                        var new_Country = {
                                            name: temp_Country_Name,
                                            count: 1
                                        };
                                        country_List.push(new_Country);
                                    }
                                }
                            }
                            break;
                        
                        default:
                            country_List = [];
                            break;
                    }
                });

                // Set up count_List and max_Count
                for (let i = 0; i < country_List.length; i++) {
                    count_List[i] = country_List[i].count;
                    if (max_Count < count_List[i]) {
                        max_Count = count_List[i];
                    }
                }
                
            });

            // Apply color filter
            d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json", function(error, world) {
                if (error) throw error;
                
                gBackground.selectAll("path")
                           .data(topojson.feature(world, world.objects.countries).features)
                           .on("mouseover", function(d) {
                               d3.select(this).style("fill", "#7d7d7d");
                           })
                           .on("mouseout", function(d) {
                               d3.select(this).style("fill", function(d) {
                                    if (d.properties) {
                                        if (country_List.length > 0) {
                                            let country_Name = d.properties.name;  
                                            var color = "#ccc";
                                            country_List.forEach(function(each) {
                                                if (each.name === country_Name) {
                                                    color = d3.interpolateOrRd(each.count / max_Count);
                                                    flag2 = true;
                                                    return;
                                                }
                                            });
                                            return color;
                                        }

                                        if (country_List.legnth === 0) {
                                            return "#ccc";
                                        }
                                    }
                               });
                           })
                           .style("fill", function(d) {
                               
                               if (d.properties) {
                                   let country_Name = d.properties.name;  
                                   var color = "#ccc";
                                   country_List.forEach(function(each) {
                                       if (each.name === country_Name) {
                                           color = d3.interpolateOrRd(each.count / max_Count);
                                           flag2 = true;
                                           return;
                                       }
                                   });
                                   return color;
                               }
                           });
            });
        }

        // Handler for each accident information
        var accidentListChange = function() {
            var selected_Option = document.getElementById("accident_List").options[document.getElementById("accident_List").selectedIndex].value;

            displayInfo(selected_Option);
        }
        
        // Function that displays each selected accident's information
        function displayInfo(selected_Option) {

            // Remove old accident's information
            d3.select(".tooltip").remove();

            // Update new accident's information
            d3.csv("data/aircraft_incidents.csv", function(error, data) {
                data.forEach(function(d) {
                    if (d.Accident_Number === selected_Option) {

                        // Div for each accident's information
                        var div = d3.select("body").append("div")
                        .attr("class", "tooltip")
                        .style("opacity", 0);
                        
                        // Add the new information into the div
                        div.transition().duration(200).style("opacity", .8);
                        div.html("</br><strong>Accident Number: </strong><span style='color:#ffb816'>  " + d.Accident_Number + "</span>" + 
                            "</br><strong>Event Date: </strong><span style='color:#ffb816'>  " + d.Event_Date + "</span>" + 
                            "</br><strong>Location: </strong><span style='color:#ffb816'>  " + d.Location + "</span>" + 
                            "</br><strong>Country: </strong><span style='color:#ffb816'>  " + d.Country + "</span>" + 
                            "</br><strong>Airport Code: </strong><span style='color:#ffb816'>  " + d.Airport_Code + "</span>" + 
                            "</br><strong>Airport Name: </strong><span style='color:#ffb816'>  " + d.Airport_Name + "</span>" + 
                            "</br><strong>Injury Severity :</strong><span style='color:#ffb816'>  " + d.Injury_Severity + "</span>" + 
                            "</br><strong>Aircraft Damage :</strong><span style='color:#ffb816'>  " + d.Accident_Damage + "</span></br>" )
                    
                            .style("left", "700px")
                            .style("top", "220px");
                    }
                })
            });
            
        }

        // On change
        d3.select("#world_Filter").on("change", dropdownChange).style("font-size", "15px");
        d3.select("#world_Filter_Options").on("change", radioButtonChange);
        d3.select("#accident_List").on("change", accidentListChange);
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

        // Remove old accidents
        d3.selectAll(".accidents").remove();

        // Remove old accident's information
        d3.select(".tooltip").remove();

        // Remove current country name
        d3.select('.country_Name_HTML').remove();

        // Add new accidents in the select box
        if (centered) {

            var accident_Dropdown = d3.select("#accident_List");
            var current_Country_Name = d.properties.name;
            current_Country_Name = (current_Country_Name === "United States of America") ? "United States" : current_Country_Name;
            
            // Update country name on html
            var current_Country_Name_HTML = d3.select("#country_Name").append("label").attr('class', 'country_Name_HTML');
            current_Country_Name_HTML.html(current_Country_Name);

            // Add new incident option
            d3.csv("data/aircraft_incidents.csv", function(error, data) {
                data.forEach(function(each) {
                    if (each.Country === current_Country_Name) {
                        accident_Dropdown.append('option').attr('class', 'accidents').attr('value', each.Accident_Number).text(each.Accident_Number);
                    }
                });
            });
        }
    }

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