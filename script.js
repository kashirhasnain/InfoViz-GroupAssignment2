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
const vehicleData = [
    { type: 'Car', value: 302198 },
    { type: 'Bus', value: 18800 },
    { type: 'Truck', value: 37950 },
    { type: 'Agriculture', value: 300 },
    { type: 'BIKE', value: 148400 }
];

// Vehicle icons - keys must match the 'type' field exactly
const vehicleIcons = {
    'Car': '🚗',
    'Bus': '🚌',
    'Truck': '🚚',
    'Agriculture': '🚜',
    'BIKE': '🛵'
};
function drawVehicleStats() {
    const container = d3.select('#vehicleStats');
    
    const cards = container.selectAll('.stat-card')
        .data(vehicleData)
        .enter()
        .append('div')
        .attr('class', 'stat-card');

    cards.append('div')
        .attr('class', 'stat-icon')
        .style('font-size', '40px')
        .text(d => {
            console.log('Type:', d.type, 'Icon:', vehicleIcons[d.type]); // DEBUG LINE
            return vehicleIcons[d.type] || 'AUTO';
        });

    cards.append('div')
        .attr('class', 'stat-label')
        .text(d => d.type);

    cards.append('div')
        .attr('class', 'stat-value')
        .text(d => d.value.toLocaleString());
}
drawVehicleStats();