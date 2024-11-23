import { GeoJSON, LayersControl } from "react-leaflet";

export const BuildingLayer = ({ data }) => 
{   
    const layer_building = 
        <GeoJSON key='geo-json-layer' 
            data={data}
            // onEachFeature={(feature, layer) => {
            //     layer.bindPopup("<b>Province: </b>" + feature.properties.PROV);
                
            // }}
            style={(feature)=>{
                return{
                    color: "blue",
                    weight: 2,
                    fillOpacity: 0.2
                }
            }}
        ></GeoJSON>

    return (
        <LayersControl.Overlay name="Jakarta Building">
            {layer_building}
        </LayersControl.Overlay>
    );
}