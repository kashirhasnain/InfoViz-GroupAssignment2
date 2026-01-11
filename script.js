// Vehicle grouping system
const vehicleGroups = {
  '1': 'Active / Personal',
  '16': 'Active / Personal',
  '22': 'Active / Personal',

  '2': 'Motorcycles',
  '3': 'Motorcycles',
  '4': 'Motorcycles',
  '5': 'Motorcycles',
  '23': 'Motorcycles',
  '97': 'Motorcycles',
  '103': 'Motorcycles',
  '104': 'Motorcycles',
  '105': 'Motorcycles',
  '106': 'Motorcycles',

  '8': 'Cars & Taxis',
  '9': 'Cars & Taxis',
  '108': 'Cars & Taxis',
  '109': 'Cars & Taxis',

  '10': 'Buses & Minibuses',
  '11': 'Buses & Minibuses',
  '110': 'Buses & Minibuses',

  '19': 'Vans & Goods',
  '20': 'Vans & Goods',
  '21': 'Vans & Goods',
  '113': 'Vans & Goods',
  '98': 'Vans & Goods',

  '17': 'Special Vehicles',
  '18': 'Special Vehicles',

  '90': 'Other / Unknown',
  '99': 'Other / Unknown'
};

// Active vehicle filters
let activeVehicleFilters = new Set(['Cars & Taxis', 'Motorcycles', 'Buses & Minibuses', 'Vans & Goods', 'Active / Personal', 'Special Vehicles', 'Other / Unknown']);

// Active engine CC filters
let activeEngineFilters = new Set(['cc100', 'cc500', 'cc1000', 'cc2000']);

// Active vehicle age filters
let activeVehicleAgeFilters = new Set(['age03', 'age310', 'age1020', 'age50']);

// Active month filter (empty string means all months)
let activeMonthFilter = '';

// Function to check if vehicle's engine CC matches active filters
function matchesEngineFilter(engineCC) {
    // If all filters are active, don't filter (show all)
    if (activeEngineFilters.size === 4 && 
        activeEngineFilters.has('cc100') && 
        activeEngineFilters.has('cc500') && 
        activeEngineFilters.has('cc1000') && 
        activeEngineFilters.has('cc2000')) {
        return true;
    }
    
    const cc = +engineCC;
    if (isNaN(cc) || cc < 0) return true; // Include vehicles with no/invalid engine CC
    
    if (activeEngineFilters.has('cc100') && cc <= 100) return true;
    if (activeEngineFilters.has('cc500') && cc > 100 && cc <= 500) return true;
    if (activeEngineFilters.has('cc1000') && cc > 500 && cc <= 1000) return true;
    if (activeEngineFilters.has('cc2000') && cc > 1000) return true; // Changed to include > 2000
    
    return false;
}

// Function to check if vehicle age matches active filters
function matchesVehicleAgeFilter(vehicleAge) {
    // If all filters are active, don't filter (show all)
    if (activeVehicleAgeFilters.size === 4 && 
        activeVehicleAgeFilters.has('age03') && 
        activeVehicleAgeFilters.has('age310') && 
        activeVehicleAgeFilters.has('age1020') && 
        activeVehicleAgeFilters.has('age50')) {
        return true;
    }
    
    const age = +vehicleAge;
    if (isNaN(age) || age < 0) return true; // Include vehicles with no/invalid age
    
    if (activeVehicleAgeFilters.has('age03') && age >= 0 && age <= 3) return true;
    if (activeVehicleAgeFilters.has('age310') && age > 3 && age <= 10) return true;
    if (activeVehicleAgeFilters.has('age1020') && age > 10 && age <= 20) return true;
    if (activeVehicleAgeFilters.has('age50') && age > 20) return true;
    
    return false;
}

// Function to extract month from date string (format: DD/MM/YYYY)
function getMonthFromDate(dateString) {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length >= 2) {
        return parseInt(parts[1], 10); // Month is the second part
    }
    return null;
}

// Store vehicle data globally
let globalVehicleData = [];

// Function to reset all filters
function resetFilters() {
    // Reset all filter sets to include all options
    activeVehicleFilters = new Set(['Cars & Taxis', 'Motorcycles', 'Buses & Minibuses', 'Vans & Goods', 'Active / Personal', 'Special Vehicles', 'Other / Unknown']);
    activeEngineFilters = new Set(['cc100', 'cc500', 'cc1000', 'cc2000']);
    activeVehicleAgeFilters = new Set(['age03', 'age310', 'age1020', 'age50']);
    activeMonthFilter = '';
    
    // Check all checkboxes
    ['car', 'bus', 'truck', 'bike', 'agriculture', 'cc100', 'cc500', 'cc1000', 'cc2000', 'age03', 'age310', 'age1020', 'age50'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = true;
    });
    
    // Reset month selector
    const monthSelect = document.querySelector('.month-select');
    if (monthSelect) monthSelect.value = '';
    
    // Refresh both charts
    drawWeatherChart();
    d3.select('#ageChart').selectAll('*').remove();
    drawAgeChart();
}

//Tabs Change Method
document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs and contents
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Show corresponding content
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
//Dashboard1 Method
// Vehicle icons - keys must match the 'type' field exactly
const vehicleIcons = {
    'Cars & Taxis': '🚗',
    'Motorcycles': '🏍️',
    'Buses & Minibuses': '🚌',
    'Vans & Goods': '🚚',
    'Active / Special / Other': '🚜'
};

function drawVehicleStats() {
    const container = d3.select('#vehicleStats');
    
    // Load vehicle data and calculate real collision counts
    d3.csv("Raw%20Dataset/vehicles_2024.csv").then(function(vehicles) {
        // Count unique collisions per vehicle group
        const groupCollisions = {
            'Cars & Taxis': new Set(),
            'Motorcycles': new Set(),
            'Buses & Minibuses': new Set(),
            'Vans & Goods': new Set(),
            'Active / Special / Other': new Set()
        };
        
        vehicles.forEach(vehicle => {
            const group = vehicleGroups[vehicle.vehicle_type];
            if (group) {
                // Map special groups to the combined category
                if (group === 'Special Vehicles' || group === 'Active / Personal' || group === 'Other / Unknown') {
                    groupCollisions['Active / Special / Other'].add(vehicle.collision_index);
                } else {
                    groupCollisions[group].add(vehicle.collision_index);
                }
            }
        });
        
        // Convert to array format with real counts
        const vehicleData = [
            { type: 'Cars & Taxis', value: groupCollisions['Cars & Taxis'].size },
            { type: 'Motorcycles', value: groupCollisions['Motorcycles'].size },
            { type: 'Buses & Minibuses', value: groupCollisions['Buses & Minibuses'].size },
            { type: 'Vans & Goods', value: groupCollisions['Vans & Goods'].size },
            { type: 'Active / Special / Other', value: groupCollisions['Active / Special / Other'].size }
        ];
        
        // Clear existing content
        container.selectAll('*').remove();
        
        // Create cards
        const cards = container.selectAll('.stat-card')
            .data(vehicleData)
            .enter()
            .append('div')
            .attr('class', 'stat-card');

        cards.append('div')
            .attr('class', 'stat-icon')
            .style('font-size', '40px')
            .text(d => vehicleIcons[d.type] || '🚗');

        cards.append('div')
            .attr('class', 'stat-label')
            .text(d => d.type);

        cards.append('div')
            .attr('class', 'stat-value')
            .text(d => d.value.toLocaleString());
            
    }).catch(function(error) {
        console.error("Error loading vehicle stats:", error);
    });
}

drawVehicleStats();

//                                 Weather Conditions Bar Chart
function drawWeatherChart() {

    let tooltip = d3.select("#tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("font-size", "14px")
            .style("pointer-events", "none")
            .style("z-index", "1000");
    }

    // Set up SVG and chart
    const container = d3.select("#weatherChart");
    const containerWidth = container.node().getBoundingClientRect().width || 400;
    const containerHeight = 350;


    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight);

    const margin = {top: 20, right: 80, bottom: 60, left: 120};
    const chartWidth = containerWidth - margin.left - margin.right;
    const chartHeight = containerHeight - margin.top - margin.bottom;

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const weatherLabels = {
        '1': 'Fine',
        '2': 'Raining',
        '3': 'Snowing',
        '4': 'Fine + high winds',
        '5': 'Raining + high winds',
        '6': 'Snowing + high winds',
        '7': 'Fog / mist',
        '8': 'Other',
        '9': 'Unknown'
    };

    const colorScale = d3.scaleOrdinal()
        .domain(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
        .range([
            '#f1c40f', // Fine (sunny yellow)
            '#3498db', // Raining (rain blue)
            '#85c1e9', // Snowing (icy light blue)
            '#f39c12', // Fine + high winds (windy yellow/orange)
            '#2e86c1', // Raining + high winds (dark rain blue)
            '#5dade2', // Snowing + high winds (cold blue)
            '#bdc3c7', // Fog / mist (fog gray)
            '#e67e22', // Other (orange – attention)
            '#7f8c8d'  // Unknown (neutral gray)
        ]);
    
    // Scale x
    const x = d3.scaleLinear().range([0, chartWidth]);

    // Scale y
    const y = d3.scaleBand().range([0, chartHeight]).padding(0.3);

    // Func to count collisions by weather condition
    function countByWeather(data) {
        const counts = {};
        const uniqueCollisions = new Set();
        
        data.forEach(row => {
            const weather = row.weather_conditions;
            const collisionId = row.collision_index;
            
            // Count unique collisions per weather condition
            const key = weather + '_' + collisionId;
            if (!uniqueCollisions.has(key)) {
                uniqueCollisions.add(key);
                if (!counts[weather]) {
                    counts[weather] = 0;
                }
                counts[weather]++;
            }
        });

        // Convert to array
        const countWeatherArr = [];
        for (let code = 1; code <= 9; code++) {
            const key = String(code);
            if (counts[key]) {
                countWeatherArr.push({
                    weather: key,
                    label: weatherLabels[key],
                    count: counts[key]
                });
            }
        }
        return countWeatherArr;
    }

    // Function to draw and update chart
    function updateChart(chartData) {
   
        y.domain(chartData.map(d => d.label));
        x.domain([0, d3.max(chartData, d => d.count)]).nice();

        const bars = chart.selectAll("rect")
            .data(chartData, d => d.label);

        // Remove old bars
        bars.exit()
            .transition()
            .duration(500)
            .attr("width", 0)
            .remove();

        // Update existing bars
        bars.transition()
            .duration(750)
            .attr("y", d => y(d.label))
            .attr("width", d => x(d.count))
            .attr("height", y.bandwidth())
            .attr("fill", d => colorScale(d.weather));

        // Add new bars
        bars.enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", d => y(d.label))
            .attr("width", 0)
            .attr("height", y.bandwidth())
            .attr("fill", d => colorScale(d.weather))
            .attr("rx", 3)
            .attr("ry", 3)
            .on("mouseover", function(event, d) {
                tooltip.style("visibility", "visible")
                    .html(`<strong>${d.label}</strong><br/>Collisions: ${d.count.toLocaleString()}`);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            })
            .transition()
            .duration(750)
            .attr("width", d => x(d.count));

        // Update value labels with data join
        const labels = chart.selectAll(".value-label")
            .data(chartData, d => d.label);

        // Remove old labels
        labels.exit()
            .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();

        // Update existing labels
        labels.transition()
            .duration(750)
            .attr("x", d => x(d.count) + 5)
            .attr("y", d => y(d.label) + y.bandwidth() / 2)
            .text(d => d.count.toLocaleString());

        // Add new labels
        labels.enter()
            .append("text")
            .attr("class", "value-label")
            .attr("x", d => x(d.count) + 5)
            .attr("y", d => y(d.label) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", "#2c3e50")
            .style("opacity", 0)
            .text(d => d.count.toLocaleString())
            .transition()
            .duration(750)
            .style("opacity", 1);

        // Remove old axes
        chart.selectAll(".x-axis").remove();
        chart.selectAll(".y-axis").remove();

        // Draw axes
        chart.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",d")))
            .selectAll("text")
            .style("font-size", "10px");

        chart.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "11px")
            .on("mouseover", function(event, d) {
                const dataPoint = chartData.find(item => item.label === d);
                if (dataPoint) {
                    tooltip.style("visibility", "visible")
                        .html(`<strong>${dataPoint.label}</strong><br/>Collisions: ${dataPoint.count.toLocaleString()}`);
                }
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("visibility", "hidden");
            });
    }

    // Load both collision and vehicle data
    Promise.all([
        d3.csv("Raw%20Dataset/collisions_2024.csv"),
        d3.csv("Raw%20Dataset/vehicles_2024.csv")
    ]).then(function([collisions, vehicles]) {
        globalVehicleData = vehicles;
        
        // Function to filter collisions by active vehicle types
        function getFilteredCollisions() {
            if (activeVehicleFilters.size === 0) return [];
            
            // Get collision IDs that match the active vehicle filters
            const validCollisionIds = new Set();
            vehicles.forEach(vehicle => {
                const vehicleType = vehicle.vehicle_type;
                const group = vehicleGroups[vehicleType];
                const matchesVehicle = group && activeVehicleFilters.has(group);
                const matchesEngine = matchesEngineFilter(vehicle.engine_capacity_cc);
                const matchesAge = matchesVehicleAgeFilter(vehicle.age_of_vehicle);
                
                if (matchesVehicle && matchesEngine && matchesAge) {
                    validCollisionIds.add(vehicle.collision_index);
                }
            });
            
            // Filter collisions by collision IDs and month
            return collisions.filter(collision => {
                const matchesVehicle = validCollisionIds.has(collision.collision_index);
                
                // Check month filter
                if (activeMonthFilter !== '') {
                    const collisionMonth = getMonthFromDate(collision.date);
                    const matchesMonth = collisionMonth === parseInt(activeMonthFilter);
                    return matchesVehicle && matchesMonth;
                }
                
                return matchesVehicle;
            });
        }
        
        const initialData = countByWeather(getFilteredCollisions());
        updateChart(initialData);
        
        // Setup filter event listeners
        ['car', 'bus', 'truck', 'bike', 'agriculture'].forEach(filterId => {
            const checkbox = document.getElementById(filterId);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    // Update active filters based on checkbox mapping
                    if (filterId === 'car') {
                        if (this.checked) activeVehicleFilters.add('Cars & Taxis');
                        else activeVehicleFilters.delete('Cars & Taxis');
                    } else if (filterId === 'bike') {
                        if (this.checked) activeVehicleFilters.add('Motorcycles');
                        else activeVehicleFilters.delete('Motorcycles');
                    } else if (filterId === 'bus') {
                        if (this.checked) activeVehicleFilters.add('Buses & Minibuses');
                        else activeVehicleFilters.delete('Buses & Minibuses');
                    } else if (filterId === 'truck') {
                        if (this.checked) activeVehicleFilters.add('Vans & Goods');
                        else activeVehicleFilters.delete('Vans & Goods');
                    } else if (filterId === 'agriculture') {
                        if (this.checked) {
                            activeVehicleFilters.add('Special Vehicles');
                            activeVehicleFilters.add('Active / Personal');
                            activeVehicleFilters.add('Other / Unknown');
                        } else {
                            activeVehicleFilters.delete('Special Vehicles');
                            activeVehicleFilters.delete('Active / Personal');
                            activeVehicleFilters.delete('Other / Unknown');
                        }
                    }
                    
                    // Refresh weather chart
                    const filteredData = countByWeather(getFilteredCollisions());
                    updateChart(filteredData);
                    
                    // Refresh age chart
                    d3.select('#ageChart').selectAll('*').remove();
                    drawAgeChart();
                });
            }
        });
        
        // Setup Engine CC filter event listeners
        ['cc100', 'cc500', 'cc1000', 'cc2000'].forEach(filterId => {
            const checkbox = document.getElementById(filterId);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    // Update active engine filters
                    if (this.checked) {
                        activeEngineFilters.add(filterId);
                    } else {
                        activeEngineFilters.delete(filterId);
                    }
                    
                    // Refresh weather chart
                    const filteredData = countByWeather(getFilteredCollisions());
                    updateChart(filteredData);
                    
                    // Refresh age chart
                    d3.select('#ageChart').selectAll('*').remove();
                    drawAgeChart();
                });
            }
        });
        
        // Setup Engine CC filter event listeners
        ['cc100', 'cc500', 'cc1000', 'cc2000'].forEach(filterId => {
            const checkbox = document.getElementById(filterId);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    // Update active engine filters
                    if (this.checked) {
                        activeEngineFilters.add(filterId);
                    } else {
                        activeEngineFilters.delete(filterId);
                    }
                    
                    // Refresh weather chart
                    const filteredData = countByWeather(getFilteredCollisions());
                    updateChart(filteredData);
                    
                    // Refresh age chart
                    d3.select('#ageChart').selectAll('*').remove();
                    drawAgeChart();
                });
            }
        });
        
        // Setup Vehicle Age filter event listeners
        ['age03', 'age310', 'age1020', 'age50'].forEach(filterId => {
            const checkbox = document.getElementById(filterId);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    // Update active vehicle age filters
                    if (this.checked) {
                        activeVehicleAgeFilters.add(filterId);
                    } else {
                        activeVehicleAgeFilters.delete(filterId);
                    }
                    
                    // Refresh weather chart
                    const filteredData = countByWeather(getFilteredCollisions());
                    updateChart(filteredData);
                    
                    // Refresh age chart
                    d3.select('#ageChart').selectAll('*').remove();
                    drawAgeChart();
                });
            }
        });
        
        // Setup Month filter event listener
        const monthSelect = document.querySelector('.month-select');
        if (monthSelect) {
            monthSelect.addEventListener('change', function() {
                activeMonthFilter = this.value;
                
                // Refresh weather chart
                const filteredData = countByWeather(getFilteredCollisions());
                updateChart(filteredData);
                
                // Refresh age chart
                d3.select('#ageChart').selectAll('*').remove();
                drawAgeChart();
            });
        }
    }).catch(function(error) {
        console.error("Error loading the data:", error);
        container.append("div")
            .style("padding", "20px")
            .style("text-align", "center")
            .style("color", "#e74c3c")
            .text("Error loading weather data");
    });
}

// Initialize weather chart
drawWeatherChart();

//                                 Driver Age Groups Pie Chart
function drawAgeChart() {
    const container = d3.select("#ageChart");
    const containerWidth = container.node().getBoundingClientRect().width || 400;
    const containerHeight = 350;

    // Clear any existing content
    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight);

    const margin = {top: 20, right: 20, bottom: 20, left: 20};
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    const chart = svg.append("g")
        .attr("transform", `translate(${containerWidth/2},${containerHeight/2})`);

    // Create tooltip
    let tooltip = d3.select("#age-pie-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "age-pie-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");
    }

    // Color scale for age groups
    const colorScale = d3.scaleOrdinal()
        .domain(['<18', '18-25', '25-55', '>55', 'Unknown'])
        .range(['#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#95a5a6']);

    // Function to categorize actual age to age group
    function getAgeGroup(age) {
        const ageNum = +age;
        if (isNaN(ageNum) || ageNum < 0) return 'Unknown';
        if (ageNum < 18) return '<18';
        if (ageNum >= 18 && ageNum <= 25) return '18-25';
        if (ageNum > 25 && ageNum <= 55) return '25-55';
        if (ageNum > 55) return '>55';
        return 'Unknown';
    }

    // Function to count collisions by age group
    function countByAgeGroup(data) {
        const groupCounts = {
            '<18': 0,
            '18-25': 0,
            '25-55': 0,
            '>55': 0,
            'Unknown': 0
        };
        
        const uniqueCollisions = {};

        data.forEach(row => {
            const age = row.age_of_driver;
            const collisionId = row.collision_index;
            const ageGroup = getAgeGroup(age);

            // Track unique collisions per age group
            if (!uniqueCollisions[collisionId]) {
                uniqueCollisions[collisionId] = new Set();
            }
            uniqueCollisions[collisionId].add(ageGroup);
        });

        // Count collisions for each age group
        Object.keys(uniqueCollisions).forEach(collisionId => {
            uniqueCollisions[collisionId].forEach(group => {
                groupCounts[group]++;
            });
        });

        // Convert to array
        return Object.keys(groupCounts).map(group => ({
            group: group,
            count: groupCounts[group]
        })).filter(d => d.count > 0);
    }

    // Pie generator
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    // Arc generator
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius - 20);

    // Arc for hover effect
    const arcHover = d3.arc()
        .innerRadius(0)
        .outerRadius(radius - 10);

    // Load and process data
    d3.csv("Raw%20Dataset/vehicles_2024.csv").then(function(data) {
        // Filter vehicles by active vehicle type filters, engine CC filters, AND vehicle age filters
        const filteredData = data.filter(vehicle => {
            const group = vehicleGroups[vehicle.vehicle_type];
            const matchesVehicle = group && activeVehicleFilters.has(group);
            const matchesEngine = matchesEngineFilter(vehicle.engine_capacity_cc);
            const matchesAge = matchesVehicleAgeFilter(vehicle.age_of_vehicle);
            return matchesVehicle && matchesEngine && matchesAge;
        });
        
        const ageData = countByAgeGroup(filteredData);
        const total = d3.sum(ageData, d => d.count);

        // Create pie slices
        const slices = chart.selectAll(".arc")
            .data(pie(ageData))
            .enter()
            .append("g")
            .attr("class", "arc");

        slices.append("path")
            .attr("d", arc)
            .attr("fill", d => colorScale(d.data.group))
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .style("opacity", 0.9)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("d", arcHover)
                    .style("opacity", 1);

                const percentage = ((d.data.count / total) * 100).toFixed(1);
                tooltip.style("visibility", "visible")
                    .html(`<strong>${d.data.group}</strong><br/>Collisions: ${d.data.count.toLocaleString()}<br/>Percentage: ${percentage}%`);
            })
            .on("mousemove", function(event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("d", arc)
                    .style("opacity", 0.9);
                
                tooltip.style("visibility", "hidden");
            })
            .transition()
            .duration(1000)
            .attrTween("d", function(d) {
                const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
                return function(t) {
                    return arc(interpolate(t));
                };
            });

        // Add labels
        slices.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", "white")
            .style("opacity", 0)
            .text(d => {
                const percentage = ((d.data.count / total) * 100);
                return percentage > 5 ? `${percentage.toFixed(1)}%` : '';
            })
            .transition()
            .delay(1000)
            .duration(500)
            .style("opacity", 1);

        // Add legend
        const legend = svg.append("g")
            .attr("transform", `translate(20, 20)`);

        const legendItems = legend.selectAll(".legend-item")
            .data(ageData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legendItems.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", d => colorScale(d.group))
            .attr("rx", 2);

        legendItems.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .style("font-size", "11px")
            .style("fill", "#333")
            .text(d => `${d.group}`);

    }).catch(function(error) {
        console.error("Error loading the data:", error);
        container.append("div")
            .style("padding", "20px")
            .style("text-align", "center")
            .style("color", "#e74c3c")
            .text("Error loading age data");
    });
}

// Initialize age chart
drawAgeChart();

// Setup reset button event listener
document.addEventListener('DOMContentLoaded', function() {
    const resetButton = document.getElementById('resetFilters');
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
});