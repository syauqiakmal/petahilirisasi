import { useMapEvents } from 'react-leaflet';
import { useState } from 'react';

export const ShowCoordinates = () => {
    const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });

    useMapEvents({
        mousemove(e) {
            setCoordinates({ lat: e.latlng.lat.toFixed(5), lng: e.latlng.lng.toFixed(5) });
        }
    });
    return (
        <div className="coordinate" style={{ zIndex: 1000}}>
            Latitude: {coordinates.lat}, Longitude: {coordinates.lng}
        </div>
    );
};