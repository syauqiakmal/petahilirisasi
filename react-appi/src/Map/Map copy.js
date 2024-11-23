// Map.js
import React, { useState, useRef, useEffect, } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  ScaleControl,
  ImageOverlay,
} from "react-leaflet";
import { GeomanToolbar } from "../layers/Geoman";
import { ShowCoordinates } from "../layers/ShowCoordinates";
// import { ContinentsPolygonLayer } from "../layers/ContinentLayer";
import Search from "../layers/Search";
// import { continents } from "../data/indo_provinces";
import Menu from "../layers/Menu";
import Legend from "../layers/legends";
import L from "leaflet";
import {PopupComponent, getFeatureStyle, onEachFeature} from '../layers/popupcontent'; // Import the PopupComponent
import logo from "../Logo/trash-bin.png";


// import MapPrint from "../layers/MapPrint";

export const Map = ({ hideComponents }) => {
  const [selectedOption, setSelectedOption] = useState("OSM");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContinentsVisible, setIsContinentsVisible] = useState(false);
  const [geojsonData, setGeojsonData] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isContinentsCheckboxEnabled, setIsContinentsCheckboxEnabled] = useState(true);
  const [isUploadCheckboxEnabled, setIsUploadCheckboxEnabled] = useState(true);
  const mapRef = useRef(null);
  const [isNewUpload, setIsNewUpload] = useState(false);
  const [rasterData, setRasterData] = useState(null);
  const [bounds, setBounds] = useState(null);
  // const [adminDesaData, setAdminDesaData] = useState(null);
  const imageOverlayRef = useRef(null);
  const colorPickerControlRef = useRef(null);
  const [rasterOpacity, setRasterOpacity] = useState({});
  const [selectedProperty, setSelectedProperty] = useState('penanganan_sampah');
  const [showPopup, setShowPopup] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const togglePopup = () => setShowPopup(prev => !prev);
  const toggleLegend = () => setShowLegend(prev => !prev);
  

  const handleClick =  (e, index) => {
    // Ensure colorPickerControlRef.current is defined before accessing it
    if (colorPickerControlRef.current) {
      const newOpacity = colorPickerControlRef.current.getSliderValue();
      setRasterOpacity((prevOpacities) => ({
        ...prevOpacities,
        [index]: newOpacity,
      }));
    }
  };


  const handleSelectPropertyChange = (newSelectedProperty) => {
    setSelectedProperty(newSelectedProperty);
  };
  
  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleToggleContinents = () => {
    // setIsContinentsVisible(!isContinentsVisible);
  };



  const handleShowFile = (index, checked) => {
    const updatedFiles = uploadedFiles.map((file, i) => {
      return i === index ? { ...file, checked } : file;
    });
    setUploadedFiles(updatedFiles);

    const selectedFiles = updatedFiles.filter((file) => file.checked);
    const combinedData = selectedFiles.flatMap((file) => file.data.features); // Gabungkan data geometri dari semua file yang dipilih

    console.log("Combined GeoJSON Data:", combinedData);

    const mergedGeojsonData = {
      type: "FeatureCollection",
      features: combinedData,
    };

    setGeojsonData(selectedFiles.length > 0 ? mergedGeojsonData : null);
  };

  const handleRasterFile = (index, checked) => {
    const updatedFiles = uploadedFiles.map((file, i) =>
      i === index ? { ...file, checked } : file
    );
    setUploadedFiles(updatedFiles);
  
    const selectedRasterFiles = updatedFiles.filter(
      (file) =>
        file.checked &&
        (file.name.endsWith(".tif") || file.name.endsWith(".tiff"))
    );
  
    // Combine all raster data for rendering on map
    const combinedRasterData = selectedRasterFiles.flatMap((file) =>
      file.data.raster_images
    );
  
    // Get bounds for the selected files
    let selectedBounds = null;
    if (selectedRasterFiles.length > 0) {
      selectedRasterFiles.forEach((file) => {
        if (file.data.bounds) {
          const fileBounds = L.latLngBounds(file.data.bounds);
          if (fileBounds.isValid()) {
            if (selectedBounds) {
              selectedBounds.extend(fileBounds);
            } else {
              selectedBounds = fileBounds;
            }
          }
        }
      });
    }
  
    console.log("Selected Raster Files:", selectedRasterFiles);
    console.log("Combined Raster Data:", combinedRasterData);
    console.log("Selected Bounds:", selectedBounds);
  
    setRasterData(combinedRasterData.length > 0 ? combinedRasterData : null);
    setBounds(selectedBounds && selectedBounds.isValid() ? selectedBounds : null);
    setIsNewUpload(true); // Trigger map update
  };
   
  
  

  const handleColumnSelection = (fileIndex, column, isChecked) => {
    const updatedFiles = uploadedFiles.map((file, index) => {
      if (index === fileIndex) {
        const updatedColumns = isChecked
          ? [...file.selectedColumns, column]
          : file.selectedColumns.filter((col) => col !== column);
        return { ...file, selectedColumns: updatedColumns };
      }
      return file;
    });
    setUploadedFiles(updatedFiles);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    const tableName = file.name.split(".")[0];
    const maxSize = 100 * 1024 * 1024; // 50 MB in bytes

    if (file.size > maxSize) {
      alert("File size exceeds 100 MB. Please upload a smaller file.");
      event.target.value = null; // Clear the file input
      return;
    }

    try {
      // Upload file
      const uploadResponse = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Handle zipped shapefile
      if (file.name.endsWith(".zip")) {
        const dataResponse = await fetch(
          `http://localhost:8000/data/${tableName}`
        );
        if (!dataResponse.ok) {
          throw new Error("Failed to fetch shapefile data");
        }
        const geojsonData = await dataResponse.json();

        const newUploadedFile = {
          name: file.name,
          data: geojsonData,
          checked: true, // Automatically checked after upload
          selectedColumns: Object.keys(geojsonData.features[0].properties),
        };
        setUploadedFiles((prevUploadedFiles) => [
          ...prevUploadedFiles,
          newUploadedFile,
        ]);
        setGeojsonData(geojsonData);
      }
      // Handle raster file
      else if (file.name.endsWith(".tif") || file.name.endsWith(".tiff")) {
        const dataResponse = await fetch(
          `http://localhost:8000/raster/${tableName}`
        );
        if (!dataResponse.ok) {
          throw new Error("Failed to fetch raster data");
        }
        // Inside the GeoTIFF handling block
        const rasterData = await dataResponse.json();

        console.log("Raster Data:", rasterData); // Check what rasterData contains

        // Ensure rasterData is valid and has expected properties
        if (!rasterData || !rasterData.raster_images) {
          throw new Error(
            "Invalid raster data or missing raster_images property"
          );
        }

        const newUploadedFile = {
          name: file.name,
          data: rasterData,
          checked: true,
          bounds: rasterData.bounds,
        };
        setUploadedFiles((prevUploadedFiles) => [
          ...prevUploadedFiles,
          newUploadedFile,
        ]);
        setRasterData((prevRasterData) => [
          ...(prevRasterData || []),
          ...rasterData.raster_images,
        ]);
        setBounds((prevBounds) =>
          prevBounds
            ? prevBounds.extend(L.latLngBounds(rasterData.bounds))
            : L.latLngBounds(rasterData.bounds)
        );

        setIsMenuOpen(true); // Open menu after uploading file
        setIsNewUpload(true);
      }
      // Handle geojson file
      else if (file.name.endsWith(".geojson")) {
        const dataResponse = await fetch(
          `http://localhost:8000/geojson/${tableName}`
        );
        if (!dataResponse.ok) {
          throw new Error(
            `Failed to fetch GeoJSON data: ${dataResponse.status}`
          );
        }
        const geojsonData = await dataResponse.json();
        console.log("GeoJSON Data:", geojsonData);

        const newUploadedFile = {
          name: file.name,
          data: geojsonData,
          checked: true, // Automatically checked after upload
          selectedColumns: Object.keys(geojsonData.features[0].properties),
        };
        setUploadedFiles((prevUploadedFiles) => [
          ...prevUploadedFiles,
          newUploadedFile,
        ]);
        setGeojsonData(geojsonData);
      }
      setIsMenuOpen(true); // Open menu after uploading file
      setIsNewUpload(true);
    } catch (error) {
      console.error("Error handling file upload:", error);
      alert(
        "An error occurred while uploading the file and fetching data. Please try again."
      );
    }
  };


  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const years = [2020, 2023];
  
        // Fetching GeoJSON data
        const geojsonPromises = years.map(year =>
          fetch(`http://localhost:8000/data/Tangerang_baru_${year}`).then(res => res.json())
        );
  
        // Fetching cluster data
        const clusterPromises = years.map(year =>
          fetch(`http://localhost:8000/data/cluster_in_tangerang_${year}`).then(res => res.json())
        );
  
        // Waiting for both fetches to complete
        const [geojsonData2020, geojsonData2023] = await Promise.all(geojsonPromises);
        const [clusterData2020, clusterData2023] = await Promise.all(clusterPromises);
  
        // Prepare the files data
        const newFiles = [
          {
            name: "Kecamatan Kota Tangerang 2020",
            data: geojsonData2020,
            checked: false,
            selectedColumns: Object.keys(geojsonData2020.features[0].properties),
          },
          {
            name: "Kecamatan Kota Tangerang 2023",
            data: geojsonData2023,
            checked: false,
            selectedColumns: Object.keys(geojsonData2023.features[0].properties),
          },
          
          {
            name: "Analisa 2020",
            data: clusterData2020,
            checked: false,
            selectedColumns: Object.keys(clusterData2020.features[0].properties),
          },
          {
            name: "Analisa 2023",
            data: clusterData2023,
            checked: true,
            selectedColumns: Object.keys(clusterData2023.features[0].properties),
          },
          
        ];
  
        // Update state
        setUploadedFiles([...uploadedFiles, ...newFiles]);
        setGeojsonData(clusterData2023); // Set data for 2024 as default
  
        // Compute bounds
        const bounds = [geojsonData2020, geojsonData2023]
          .flatMap(data => data.features.map(f => f.bounds));
        if (bounds.length) {
          setBounds(L.latLngBounds(bounds));
        }
  
        setIsNewUpload(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchAllData();
  }, []);
  
  






  // Get bounds everytime shapefile uploaded
  useEffect(() => {
    console.log("useEffect triggered with dependencies: ", {
      geojsonData,
      rasterData,
      bounds,
      isNewUpload,
      uploadedFiles,
    });
  
    if (mapRef.current && isNewUpload) {
      const map = mapRef.current;
      let combinedBounds = null;
  
      // Fit bounds for geojsonData
      if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
        try {
          const geoJsonLayer = L.geoJSON(geojsonData);
          if (geoJsonLayer.getBounds().isValid()) {
            combinedBounds = L.latLngBounds(geoJsonLayer.getBounds());
          } else {
            console.error("Invalid bounds for geojsonData:", geojsonData);
          }
        } catch (error) {
          console.error("Error creating GeoJSON layer:", error);
        }
      }
  
      // Fit bounds for rasterData
      if (rasterData && rasterData.length > 0) {
        rasterData.forEach((raster) => {
          if (raster.bounds) {
            const rasterBounds = L.latLngBounds(raster.bounds);
            if (rasterBounds.isValid()) {
              combinedBounds = combinedBounds
                ? combinedBounds.extend(rasterBounds)
                : rasterBounds;
            }
          }
        });
      }
  
      // Check if combinedBounds is valid before fitting map bounds
      if (combinedBounds && combinedBounds.isValid()) {
        map.fitBounds(combinedBounds, {
          maxZoom: 12,
        });
      } else {
        console.error("Invalid combinedBounds:", combinedBounds);
      }
  
      setIsNewUpload(false); // Reset isNewUpload after fitting bounds
  
      console.log("Bounds fit completed, isNewUpload reset");
    }
  }, [geojsonData, rasterData, bounds, isNewUpload, uploadedFiles]);
  
  
  const position = [-2.483383, 117.890285];

  return (
    <div className="container">
      <MapContainer
        ref={mapRef}
        center={position}
        zoom={5}
        style={{ width: "100%", height: "97vh" }}
        minZoom={3}
        maxBounds={[
          [-90, -180], // Batas sudut barat daya
          [90, 180], // Batas sudut timur laut
        ]}
      >
        {!hideComponents && (
          <Menu
            selectedOption={selectedOption}
            handleOptionChange={handleOptionChange}
            isMenuOpen={isMenuOpen}
            handleMenuToggle={handleMenuToggle}
            isContinentsVisible={isContinentsVisible}
            handleToggleContinents={handleToggleContinents}
            uploadedFiles={uploadedFiles}
            handleShowFile={handleShowFile}
            handleRasterFile={handleRasterFile}
            // handleGeoJSONUpload={handleGeoJSONUpload}
            handleFileUpload={handleFileUpload}
            isContinentsCheckboxEnabled={isContinentsCheckboxEnabled}
            isUploadCheckboxEnabled={isUploadCheckboxEnabled}
            handleColumnSelection={handleColumnSelection}
          />
        )}

        {!hideComponents && <Search />}
        {selectedOption === "OSM" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {selectedOption === "Imagery" && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          />
        )}
        {selectedOption === "Topo" && (
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          />
        )}
        {/* {renderGeoJSONLayers()} */}
        {/* {isContinentsVisible && <ContinentsPolygonLayer data={continents} />} */}
        {geojsonData &&
        uploadedFiles.map(
          (file, index) =>
            file.checked && // Only show checked files
            !file.name.endsWith(".tif") &&
            !file.name.endsWith(".tiff") &&
            file.data && (
              <GeoJSON
                key={index}
                data={file.data}
                style={(feature) => getFeatureStyle(feature, selectedProperty)}
                onEachFeature={(feature, layer) =>
                  onEachFeature(feature, layer, uploadedFiles)
                }
              />
            )
        )}



        {rasterData &&
          bounds &&
          rasterData.map((raster, index) => {
            console.log("Rendering raster image:", raster);
            console.log('index',index);
            return (
              <ImageOverlay
                key={index}
                url={`data:image/png;base64,${raster}`}
                bounds={bounds}
                opacity={rasterOpacity[index] || 0.8}
                interactive={true}
                ref={imageOverlayRef}
                eventHandlers={{
                  click: (e) => {
                    handleClick(e, index);
                  },
                }}
              />
            );
          })}
        <ScaleControl position="bottomleft" imperial={true} />
        <GeomanToolbar
          setcolorPickerRef={(ref) =>
            (colorPickerControlRef.current = ref.current)
          }
        />
        <ShowCoordinates />

        {
  uploadedFiles.map((file, index) => {
    if (
      file.checked && // Only show checked files
      !file.name.endsWith(".tif") &&
      !file.name.endsWith(".tiff") &&
      file.data
    ) {
      return (
        <button
          key={index} // Ensure each button has a unique key
          onClick={() => {
            togglePopup();
            toggleLegend(); // Toggle both popup and legend visibility
          }}
          style={{
            position: "absolute",
            top: "150px",
            right: "20px",
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            backgroundColor: "white",
            color: "black",
            border: "none",
            cursor: "pointer",
            backgroundImage: `url(${logo})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "40px",
            backgroundPosition: "center",
            zIndex: 1000,
            transition: "transform 0.3s ease-out",
          }}
          onMouseEnter={(e) => (e.target.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
        />
      );
    }
    return null; // Return null for files that do not meet the conditions
  })
}
{showPopup && (
  <PopupComponent
    data={geojsonData} // Ensure geojsonData is defined and passed correctly
    onSelectPropertyChange={handleSelectPropertyChange}
    onTogglePopup={togglePopup}
    onToggleLegend={toggleLegend}
  />
)}
{showLegend && <Legend />}
      </MapContainer>
      
    </div>
  );
};
