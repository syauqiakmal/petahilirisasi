import L from "leaflet";
import iconUrl from "../images/marker-icon.png";
import iconShadow from "../images/marker-shadow.png";

// console.log(L.Marker.prototype.options.icon.options);

export const defaultIcon = L.icon({
    iconUrl,
    iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});
