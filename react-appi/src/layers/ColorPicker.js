import L from 'leaflet';
import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';

export const ColorPickerControl = L.Control.extend({
    slider: null,

    onAdd: function(map) {
        // Create container element for color picker and slider
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.display = 'flex'; // Set display to flex for layout
        
        
        // Create color picker input element
        var colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.id = 'color-picker'; // Set an ID for styling or event handling
        colorPicker.title = 'Choose Color';
        colorPicker.value = '#0000ff';
        
        // Create opacity slider container
        var opacitySliderContainer = document.createElement('div');
        opacitySliderContainer.id = 'opacity-pick';
        opacitySliderContainer.title = 'Choose Opacity';
        opacitySliderContainer.style.marginLeft = '10px'; // Add margin to separate from color picker
        opacitySliderContainer.style.width = '150px';
        opacitySliderContainer.style.height = '15px'; 
        opacitySliderContainer.style.marginTop = '8px';
        opacitySliderContainer.style.marginRight = '5px';
        
        // Append color picker and opacity slider container to container
        container.appendChild(colorPicker);
        container.appendChild(opacitySliderContainer);

        // Initialize noUiSlider
        this.slider = noUiSlider.create(opacitySliderContainer, {
            start: 0.2, // Initial value
            range: {
                'min': 0,
                'max': 1
            },
            step: 0.1, // Step size
            connect: [true, false], // Connect the slider handle
        });
        
        // Set CSS rules for slider handle
        this.slider.on('update', function() {
            var handle = opacitySliderContainer.querySelector('.noUi-handle');
            if (handle) {
                handle.style.width = '25px';
                handle.style.height = '25px';
            }
        });

        // Function to update thumb color
        function updateThumbColor(color) {
            // Set the background color of the slider handle
            const handle = opacitySliderContainer.querySelector('.noUi-connect');
            if (handle) {
                handle.style.backgroundColor = color || '#0040FF'; 
                handle.style.setProperty('background-color', color || '#0040FF', 'important');
            }
        }
        
        // Add event listener to color picker
        colorPicker.addEventListener('input', function() {
            var color = colorPicker.value;
            updateThumbColor(color);
        });
        
        // Function to update opacity value
        function updateOpacity(value) {
            var opacitySlider = document.getElementById('opacity-pick');
            if (opacitySlider) {
                // Change slider color based on opacity value
                opacitySlider.style.backgroundColor = 'rgba(0, 0, 0, ' + value + ')';
            }
        }
        
        // Add event listener to slider
        this.slider.on('update', function(values) {
            var opacity = parseFloat(values[0]);
            updateOpacity(opacity);
        });

        return container;
    },
    
    getSliderValue: function() {
        if (this.slider) {
            return parseFloat(this.slider.get());
        }
        return null;
    },

    onRemove: function(map) {
        // Nothing to do here
    }
});