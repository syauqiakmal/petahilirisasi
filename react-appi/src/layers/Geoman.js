import  { useEffect, useRef, useState } from 'react';
import { defaultIcon } from '../icons/defaultIcon';

import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useGeomanControls } from 'react-leaflet-geoman-v2'
import geodesic from "geographiclib-geodesic";
import { useMap } from 'react-leaflet';
import L from "leaflet";
import { ColorPickerControl } from './ColorPicker';
import { createCustomIcon } from '../icons/customIcon';



export const GeomanToolbar = ({setcolorPickerRef}) => {

    const map = useMap();
    const colorPickerControlRef = useRef(null);
    const customIcon = createCustomIcon();



    useEffect(() => {
        // Add custom control to the map
        colorPickerControlRef.current = new ColorPickerControl({
            position: "bottomleft",
        });
        colorPickerControlRef.current.addTo(map);
        setcolorPickerRef(colorPickerControlRef)

        map.pm.setGlobalOptions({
            markerStyle: {
                icon: customIcon
            }
        });

        return () => {
            map.removeControl(colorPickerControlRef.current);
        };
    }, [map, customIcon, setcolorPickerRef]);

    // let selectedLayer = null;

    useGeomanControls({
        options: { 
            position: 'bottomleft',
            drawCircle: true,        // Enable circle drawing tool
            drawCircleMarker: false, // Disable circle marker drawing tool
            drawMarker: true,        // Enable marker drawing tool
            drawPolygon: true,       // Enable polygon drawing tool
            drawPolyline: true,     // Disable polyline drawing tool
            drawRectangle: true,     // Enable rectangle drawing tool
            drawText: true,          // Enable text drawing tool
            editPolygon: true,       // Enable polygon editing tool
            editRectangle: true,    // Disable rectangle editing tool
            editPolyline: true,     // Disable polyline editing tool
            editCircle: true,        // Enable circle editing tool
            editCircleMarker: true, // Disable circle marker editing tool
            editMarker: true,        // Enable marker editing tool
            editText: true,          // Enable text editing tool
            deleteLayer: true,       // Enable delete layer tool
            cutPolygon: false,       // Disable polygon cutting tool
            rotateMode: false,       // Disable rotate mode for shapes
                     // Enable drag mode for layers
            removalMode: true,       // Enable removal mode for layers
            globalEditMode: true,    // Enable global edit mode
            globalDragMode: false,   // Disable global drag mode
            globalRemovalMode: true, // Enable global removal mode
            editMode:true,
            dragMode: true, 
        },
        
        
        onCreate: (e) => {
            if (e.shape === 'Text') {
                return;
            }
          
            createPopupContent(e);

            const layer = e.layer;
            layer.on('click', function(event) {
                // const newColor = document.getElementById('color-picker').value;
                const newopacity = colorPickerControlRef.current.getSliderValue();

                if (layer instanceof L.Polygon || layer instanceof L.Circle || layer instanceof L.Polyline ) {
                    // layer.setStyle({ color: newColor });
                    layer.setStyle({ fillOpacity: newopacity });
                } 
                else if (layer instanceof L.Marker) {
                
                }
            });

            e.layer.on('pm:edit', () => {
                updatePopupContent(e);
                console.log('layer is edited');
            });
        },
        
    });
    
    const geographicLibArea = (coordinates) => {
        const geod = geodesic.Geodesic.WGS84;
        let poly = geod.Polygon(false);
        for (let i = 0; i < coordinates.length; ++i) {
            poly.AddPoint(coordinates[i][0], coordinates[i][1]);
        }
        poly = poly.Compute(false, true);
        return Math.abs(poly.area.toFixed(2));
    };

    const calculateDistance = (point1, point2) => {
        const geod = geodesic.Geodesic.WGS84;
        const result = geod.Inverse(point1[0], point1[1], point2[0], point2[1]);        
        const distance = result.s12;
        return distance;
    };

    const createPopupContent = (e) => {
        const newColor = document.getElementById('color-picker').value;

        if (e.shape === 'Polygon' || e.shape === 'Rectangle') {
            const coordinates = e.layer.getLatLngs()[0].map(point => [
                Number(point.lat.toFixed(5)),
                Number(point.lng.toFixed(5))
            ]);
            let area = geographicLibArea(coordinates);

            let unit = ' m²'
            if(area >= 1000000){
                area /= 1000000;
                unit = ' km²'
            }
            
            e.layer.bindPopup(
                `<b>Shape:</b> ${e.shape}</br>
                 <b>Nodes:</b> ${coordinates.length}</br>
                 <b>Area:</b> ${area.toFixed(2) + unit}`
            ).openPopup();
            e.layer.setStyle({color:newColor})
        } 
        else if (e.shape === 'Line') {
            const coordinates = e.layer.getLatLngs().map(point => [
                Number(point.lat.toFixed(5)),
                Number(point.lng.toFixed(5))
            ]);
            
            let totalDistance = 0;
            for (let i = 0; i < coordinates.length - 1; i++) {
                const startPoint = coordinates[i];
                const endPoint = coordinates[i + 1];
                const segmentDistance = calculateDistance(startPoint, endPoint);
                totalDistance += segmentDistance;
            }
        
            // console.log("Total Distance:", totalDistance.toFixed(2), "meters");
            let unit = ' m'
            if(totalDistance >= 10000){
                totalDistance /= 1000;
                unit = ' km'
            }
            e.layer.bindPopup(
                `<b>Shape:</b> ${e.shape}</br>
                 <b>Distance:</b> ${totalDistance.toFixed(2) + unit}`
            ).openPopup();
            // console.log(coordinates)
            e.layer.setStyle({color:newColor})
        } 
        else if (e.shape === 'Circle') {
            let radius = e.layer.getRadius();
            let area = Math.PI * radius * radius;
            let areaUnit = ' m²'
            if(area >= 1000000){
                area /= 1000000;
                areaUnit = ' km²'
            }
            e.layer.bindPopup(
                `<b>Shape:</b> ${e.shape}</br>
                 <b>Radius:</b> ${radius.toFixed(2)} m</br>
                 <b>Area:</b> ${area.toFixed(2) + areaUnit}`
            ).openPopup();
            e.layer.setStyle({color:newColor})
        }
        else if (e.shape === 'Marker') {
            const latLng = e.layer.getLatLng();
            const lat = latLng.lat.toFixed(5);
            const lng = latLng.lng.toFixed(5);
        
            // Tetapkan ID unik untuk input file
            const inputFileId = `image-upload-${Date.now()}`;
        
            // Buat elemen input file dengan ID yang unik
            const inputContainer = document.createElement('div');
            inputContainer.innerHTML = `
                <div class="popup-content">
                    <div>
                        <b><label for="description">Description:</label></b><br>
                        <input type="text" id="description" /><br><br>
                        <input type="file" id="${inputFileId}" accept="image/*" /><br><br>
                        <button id="submit-btn" class="centered-btn">Submit</button>
                    </div>
                </div>
            `;
        
            const descriptionInput = inputContainer.querySelector('input[type="text"]');
            const submitButton = inputContainer.querySelector('#submit-btn');
        
            submitButton.addEventListener('click', () => {
                const imageFile = inputContainer.querySelector('input[type="file"]').files[0];
                const imageURL = imageFile ? URL.createObjectURL(imageFile) : '';
                const description = descriptionInput.value;
        
                // Ganti konten popup dengan gambar yang diunggah atau teks informasi
                const popupContent = document.createElement('div');
                popupContent.innerHTML = `
                    ${imageFile ? `
                        <img src="${imageURL}" alt="Uploaded Image" style="max-width: 100%; max-height: 300px;"></br>
                        <b>Description:</b> ${description}</br>
                    ` : `
                        <b>Description:</b> ${description}</br>
                        <i>No image selected</i></br>
                    `}
                    
                    <b>Latitude:</b> ${lat}</br>
                    <b>Longitude:</b> ${lng}</br>
                    <b>Nama:</b> Smelting Plan</br>
                    <b>Perusahaan:</b> Vale Indonesia TBK</br>
                    <b>Kapasitas Input:</b> 8,000,000 T</br>
                    <b>Kapasitas Output:</b> 80,000 T</br>

                `;
        
                // Sesuaikan konten popup dengan informasi tambahan jika perlu
               
                // Atur tinggi popup
                const customPopup = L.popup().setContent(popupContent);
                e.layer.bindPopup(customPopup).openPopup();
            });
        
            // Tambahkan input file ke dalam popup
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
                <b>Shape:</b> ${e.shape}</br>
                <b>Latitude:</b> ${lat}</br>
                <b>Longitude:</b> ${lng}</br>
                 <b>Nama:</b> Smelting Plan</br>
                    <b>Perusahaan:</b> Vale Indonesia TBK</br>
                    <b>Kapasitas Input:</b> 8,000,000 T</br>
                    <b>Kapasitas Output:</b> 80,000 T</br>
            `;
            // popupContent.appendChild(inputContainer);
        
            e.layer.bindPopup(popupContent).openPopup();
            e.layer.setIcon(customIcon);
        }
        
        
        
    
    
    }
    
    const updatePopupContent = (e) => {
        const newColor = document.getElementById('color-picker').value;
        if (e.shape === 'Polygon' || e.shape === 'Rectangle') {
            const coordinates = e.layer.getLatLngs()[0].map(point => [
                Number(point.lat.toFixed(5)),
                Number(point.lng.toFixed(5))
            ]);
            let area = geographicLibArea(coordinates);

            let unit = ' m²'
            if(area >= 1000000){
                area /= 1000000;
                unit = ' km²'
            }
            
            e.layer.bindPopup(
                `<b>Shape:</b> ${e.shape}</br>
                 <b>Nodes:</b> ${coordinates.length}</br>
                 <b>Area:</b> ${area.toFixed(2) + unit}`
            ).openPopup();
            // e.layer.setStyle({color:newColor})
        } 
        else if (e.shape === 'Line') {
            const coordinates = e.layer.getLatLngs().map(point => [
                Number(point.lat.toFixed(5)),
                Number(point.lng.toFixed(5))
            ]);
            
            let totalDistance = 0;
            for (let i = 0; i < coordinates.length - 1; i++) {
                const startPoint = coordinates[i];
                const endPoint = coordinates[i + 1];
                const segmentDistance = calculateDistance(startPoint, endPoint);
                totalDistance += segmentDistance;
            }
        
            // console.log("Total Distance:", totalDistance.toFixed(2), "meters");
            let unit = ' m'
            if(totalDistance >= 10000){
                totalDistance /= 1000;
                unit = ' km'
            }
            e.layer.bindPopup(
                `<b>Shape:</b> ${e.shape}</br>
                 <b>Distance:</b> ${totalDistance.toFixed(2) + unit}`
            ).openPopup();
            // console.log(coordinates)
            // e.layer.setStyle({color:newColor})
        } 
        else if (e.shape === 'Circle') {
            let radius = e.layer.getRadius();
            let area = Math.PI * radius * radius;
            let areaUnit = ' m²'
            if(area >= 1000000){
                area /= 1000000;
                areaUnit = ' km²'
            }
            e.layer.bindPopup(
                `<b>Shape:</b> ${e.shape}</br>
                 <b>Radius:</b> ${radius.toFixed(2)} m</br>
                 <b>Area:</b> ${area.toFixed(2) + areaUnit}`
            ).openPopup();
            // e.layer.setStyle({color:newColor})
        }
        else if(e.shape === 'Text'){

        } 
        else if (e.shape === 'Marker') {
            const latLng = e.layer.getLatLng();
            const lat = latLng.lat.toFixed(5);
            const lng = latLng.lng.toFixed(5);
        
            // Tetapkan ID unik untuk input file
            const inputFileId = `image-upload-${Date.now()}`;
        
            // Buat elemen input file dengan ID yang unik
            const inputContainer = document.createElement('div');
            inputContainer.innerHTML = `
                <div class="popup-content">
                    <div>
                        <b><label for="description">Description:</label></b><br>
                        <input type="text" id="description" /><br><br>
                        <input type="file" id="${inputFileId}" accept="image/*" /><br><br>
                        <button id="submit-btn" class="centered-btn">Submit</button>
                    </div>
                </div>
            `;
        
            const descriptionInput = inputContainer.querySelector('input[type="text"]');
            const submitButton = inputContainer.querySelector('#submit-btn');
        
            submitButton.addEventListener('click', () => {
                const imageFile = inputContainer.querySelector('input[type="file"]').files[0];
                const imageURL = imageFile ? URL.createObjectURL(imageFile) : '';
                const description = descriptionInput.value;
        
                // Ganti konten popup dengan gambar yang diunggah atau teks informasi
                const popupContent = document.createElement('div');
                popupContent.innerHTML = `
                    ${imageFile ? `
                        <img src="${imageURL}" alt="Uploaded Image" style="max-width: 100%; max-height: 300px;"></br>
                        <b>Description:</b> ${description}</br>
                    ` : `
                        <b>Description:</b> ${description}</br>
                        <i>No image selected</i></br>
                    `}
                    <b>Shape:</b> ${e.shape}</br>
                    <b>Latitude:</b> ${lat}</br>
                    <b>Longitude:</b> ${lng}</br>
                    <b>Nama:</b> Smelting Plan</br>
                    <b>Perusahaan:</b> Vale Indonesia TBK</br>
                    <b>Kapasitas Input:</b> 8,000,000 T</br>
                    <b>Kapasitas Output:</b> 80,000 T</br>
                `;
        
                // Sesuaikan konten popup dengan informasi tambahan jika perlu
               
                // Atur tinggi popup
                const customPopup = L.popup().setContent(popupContent);
                e.layer.bindPopup(customPopup).openPopup();
            });
        
            // Tambahkan input file ke dalam popup
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
                <b>Shape:</b> ${e.shape}</br>
                <b>Latitude:</b> ${lat}</br>
                <b>Longitude:</b> ${lng}</br>
                <b>Nama:</b> Smelting Plan</br>
                <b>Perusahaan:</b> Vale Indonesia TBK</br>
                <b>Kapasitas Input:</b> 8,000,000 T</br>
                <b>Kapasitas Output:</b> 80,000 T</br>
            `;
            popupContent.appendChild(inputContainer);
        
            e.layer.bindPopup(popupContent).openPopup();
            e.layer.setIcon(customIcon);
        }
    }

    return null;
};

