window.onload = start;

function start() {

    var centered;

    //variables
    var width = 1000,
        height = 600,
        active = d3.select(null);
    
    // projection definitions
    var projection = d3.geoMercator()
                       .scale(150)
                       .translate([width/2, height/2 + 100]);
    var path = d3.geoPath()
                 .projection(projection);

    // SVG related definitions
    var svg = d3.select("body")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .on("click", stopped, true);
    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .on("click", reset);

    // World map data
    var gBackground = svg.append("g");
    d3.json("https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/world-50m.json", function(error, world) {
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
    var gDataPoints = svg.append("g");
    d3.csv("data/aircraft_incidents.csv", function(csv) {
        
        // Draw points
        gDataPoints.selectAll("circles.points")
            .data(csv)
            .enter()
            .append("circle")
            .attr("r", 1)
            .attr("transform", function(d) {
                return "translate(" + projection([d.Longitude, d.Latitude]) + ")";
            });
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
            x = width / 2;
            y = height / 2;
            k = 1;
            centered = null;
        }

        gBackground.selectAll("path")
            .classed("active", centered && function(d) { return d === centered; });

        // Zoom in
        gBackground.transition()
            .duration(1000)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
        gDataPoints.transition()
            .duration(1000)
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
            .style("stroke-width", 1.5 / k + "px");
    }

    // When zooming out from a country
    var reset = function() {
        active.classed("active", false);
        active = d3.select(null);

        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    }

    var stopped = function() {
        if (d3.event.defaultPrevented) d3.event.stopPropagation();
    }

}
