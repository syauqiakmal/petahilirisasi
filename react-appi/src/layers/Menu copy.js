import React, { useState } from "react";
import logo from "../Logo/Logo GeoBee (Title).png";
import logo2 from "../Logo/Logo GeoBee (Map).png";

const Menu = ({
  selectedOption,
  handleOptionChange,
  isMenuOpen,
  handleMenuToggle,
  isContinentsVisible,
  handleToggleContinents,
  uploadedFiles,
  handleShowFile,
  handleShapefileUpload,
  isContinentsCheckboxEnabled,
  isUploadCheckboxEnabled,
  handleColumnSelection,
  handleGeotiffUpload,
  handleGeoJSONUpload,
}) => {
  const [dropdownStates, setDropdownStates] = useState({});

  const toggleDropdown = (index) => {
    setDropdownStates((prevStates) => ({
      ...prevStates,
      [index]: !prevStates[index],
    }));
  };

  return (
    <div className="dashboard-menu" style={{ zIndex: 1000 }}>
      <input
        type="checkbox"
        id="dashboard-toggle"
        className="dashboard-toggle"
        checked={isMenuOpen}
        onChange={handleMenuToggle}
      />
      <label htmlFor="dashboard-toggle" className="dashboard-icon">
        <div className="strip"></div>
        <div className="strip"></div>
        <div className="strip"></div>
      </label>
      <hr className="divider-vertical" /> {/* Pembatas */}
      <div className="menu-logo-container">
        <img src={logo2} alt="Logo" className="logo2" />
        <img src={logo} alt="Logo" className="logo" />

      </div>
      <div className={`dashboard-links ${isMenuOpen ? "open" : ""}`}>
        <ul>
          <li>
            <label
              className="nameMenu"
              style={{ display: "flex", alignItems: "center" }}
            >
              <input
                type="radio"
                name="mapOption"
                value="OSM"
                checked={selectedOption === "OSM"}
                onChange={() => handleOptionChange("OSM")}
              />
              <p>OSM Street</p>
            </label>
          </li>
          <li>
            <label
              className="nameMenu"
              style={{ display: "flex", alignItems: "center" }}
            >
              <input
                type="radio"
                name="mapOption"
                value="Imagery"
                checked={selectedOption === "Imagery"}
                onChange={() => handleOptionChange("Imagery")}
              />
              <p> ESRI World Imagery</p>
            </label>
          </li>
          <li>
            <label
              className="nameMenu"
              style={{ display: "flex", alignItems: "center" }}
            >
              <input
                type="radio"
                name="mapOption"
                value="Topo"
                checked={selectedOption === "Topo"}
                onChange={() => handleOptionChange("Topo")}
              />
              <p>Topography Map</p>
            </label>
          </li>
          <hr className="divider" /> {/* Pembatas */}

          <li className="inputshp">
            <label className="choose_file">
              <input
                type="file"
                id="shapefileInput"
                accept=".zip"
                onClick={(e) => (e.target.value = null)}
                onChange={handleShapefileUpload}
                disabled={!isUploadCheckboxEnabled}
              />
            </label>
          </li>
          <input type="file" accept=".tif,.tiff" onChange={handleGeotiffUpload} />
          <input type="file" accept=".json,.geojson" onChange={handleGeoJSONUpload} />

          {uploadedFiles.map((file, index) => (
            <li key={index}>
              <details className="checkbox-wrapper-21" open={dropdownStates[index]}>
                <summary
                  style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                  onClick={() => toggleDropdown(index)}
                >
                  <label className="control control--checkbox">
                    <input
                      id={`toggle-${index}`}
                      type="checkbox"
                      checked={file.checked}
                      onChange={(e) => handleShowFile(index, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="upload_file_name">{file.name}</div>
                    <div className="control__indicator"></div>
                  </label>
                </summary>
                {file.checked && (
                  <div className="additional-info">
                    <ul className="ulshp">
                      {Object.keys(file.data.features[0].properties)
                        .filter((column) => {
                          // Ensure all features meet the criteria for each column
                          return file.data.features.every(feature =>
                            column !== "geom" &&
                            column !== "id" &&
                            feature.properties[column] !== '' &&
                            feature.properties[column] !== '0' &&
                            feature.properties[column] !== null
                          );
                        })
                        .map((column) => (
                          <li className="lishp" key={column}>
                            <label className="labelshp">
                              <input
                                type="checkbox"
                                checked={file.selectedColumns.includes(column)}
                                onChange={(e) =>
                                  handleColumnSelection(index, column, e.target.checked)
                                }
                              />
                              <span style={{ marginLeft: "10px" }}>{column}</span>
                            </label>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Menu;
