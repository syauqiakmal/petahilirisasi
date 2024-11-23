import React, { useState } from "react";
import { useMap } from "react-leaflet";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import L from "leaflet";

const Search = () => {
  const map = useMap();
  const [searchText, setSearchText] = useState("");
  const [popup, setPopup] = useState(null); // State untuk menyimpan popup
  const [suggestions, setSuggestions] = useState([]); // State untuk menyimpan saran dropdown
  
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchInputChange = (e) => {
    const userInput = e.target.value;
    setSearchText(userInput);

    // Mencocokkan input pengguna dengan daftar kota atau lokasi
    const provider = new OpenStreetMapProvider();
    provider
      .search({ query: userInput })
      .then((results) => {
        const suggestions = results.map((result) => result.label);
        setSuggestions(suggestions);
      })
      .catch((error) => {
        console.error("Error fetching search suggestions:", error);
        setSuggestions([]);
      });
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchText(suggestion);
    setSuggestions([]);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    const provider = new OpenStreetMapProvider();
    const results = await provider.search({ query: searchText });
    if (results.length > 0) {
      const { x, y, label } = results[0]; // Ambil label (nama daerah) dari hasil pencarian
      const latLng = L.latLng(y, x); // Diperbarui: Koordinat disusun sebagai (latitude, longitude)
      map.setView(latLng, 10); 

      // Hapus popup sebelumnya jika ada
      if (popup) {
        popup.removeFrom(map);
      }

      // Buat popup baru dengan informasi nama daerah dan koordinat
      const newPopup = L.popup()
        .setLatLng(latLng)
        .setContent(
          `<b>${label}</b><br> <br>Latitude: ${y.toFixed(
            6
          )}, Longitude: ${x.toFixed(6)}`
        )
        .openOn(map);

      setPopup(newPopup); // Simpan popup ke dalam state
    }
  };



const clearInput = () => {
  setSearchText('');
  setIsExpanded(false);
};

  return (
<form onSubmit={handleSearch} onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(searchText !== '')} style={{
        position: "absolute",
        top: "1%",
        left: "94%",
        transform: "translate(-50%, 0)", // Translasi horizontal dikoreksi
        zIndex: 1000,
      }}>
  <input
    className="srch"
    type="text"
    value={searchText}
    onChange={handleSearchInputChange}
    list="searchSuggestions"
    placeholder="Search..."
    required
  />
  <datalist id="searchSuggestions">
    {suggestions.map((suggestion, index) => (
      <option key={index} value={suggestion} />
    ))}
  </datalist>
  
  <button type="submit" className="fa fa-search"></button>
  <a
  href="#"
  onClick={clearInput}
  className={isExpanded ? "clear-link visible" : "clear-link"}
>
  &#10005;
</a>
</form>





      
      
      
   
  );
};

export default Search;
