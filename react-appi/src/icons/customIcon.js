// import L from 'leaflet';

// export const createCustomIcon = (newColor, iconSize = [35, 41]) => {
//     const iconHtml = `
//         <div style="display: flex; justify-content: center; align-items: center; height: 0px;">
//             <i class="fas fa-map-marker-alt" style="color: ${newColor}; font-size: ${iconSize[0]}px;"></i>
//         </div>`;
//     return L.divIcon({
//         className: 'custom-icon',
//         html: iconHtml,
//         iconSize: null,
//     });
// };


import L from 'leaflet';
import iconUrl from '../images/icon-smelting.png'; // Adjusted import for the icon image


export const createCustomIcon = (
    // iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', 
    
    iconSize = [25, 25], 
    iconAnchor = [12, 41], 
    popupAnchor = [1, -34], 
    // shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', 
    shadowSize = [41, 41], 
    shadowAnchor = [12, 41] ) => {
        
        return L.icon({
            iconUrl: iconUrl,
            iconSize: iconSize,
            iconAnchor: iconAnchor,
            popupAnchor: popupAnchor,
            // shadowUrl: shadowUrl,
            shadowSize: shadowSize,
            shadowAnchor: shadowAnchor
        });
    };