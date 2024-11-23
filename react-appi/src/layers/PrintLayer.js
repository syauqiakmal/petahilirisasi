import logo from "../Logo/Printer.png";
import { Map } from "../Map/Map";

import React, { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";

export const PrintLayer = () => {
    const [hideComponents, setHideComponents] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const mapRef = useRef();

    const setMapRef = useCallback((node) => {
        if (node !== null) {
            mapRef.current = node;
        }
    }, []);

    const handleCapture = () => {
        setHideComponents(true); // Hide components before capture
        setIsLoading(true); // Show loading message

        setTimeout(() => {
            if (mapRef.current === null) {
                return;
            }

            // Hide loading message before capture
            setIsLoading(false);

            setTimeout(() => {
                toPng(mapRef.current)
                    .then((dataUrl) => {
                        // Save as image
                        const link = document.createElement("a");
                        link.href = dataUrl;
                        link.download = "map.png";
                        link.click();

                        setHideComponents(false); // Show components after capture
                    })
                    .catch((error) => {
                        console.error("Oops, something went wrong!", error);
                        setHideComponents(false); // Show components after error
                    });
            }, 100); // Short delay to ensure loading message is hidden
        }, 1000); // Delay to ensure components are hidden
    };

    const toggleForm = () => {
        handleCapture(); // Immediately capture when button is clicked
    };

    return (
        <div>
      <button
        style={{
          position: "absolute",
          top: "10%",
          right: "28px",
          border: "3px solid white",
          background: "rgba(255, 255, 255)",
          padding: "20px",
          borderRadius: "100px",
          zIndex: 1000,
          backgroundImage: `url(${logo})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "30px",
          backgroundPosition: "center",
          cursor: "pointer",
          transition: "transform 0.3s ease-out", // Transisi transformasi saat hover
        }}
        onClick={toggleForm}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.1)"; // Scale up saat hover
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)"; // Kembali ke ukuran normal saat tidak hover
        }}
      ></button>

            <div ref={setMapRef} style={{ position: "relative" }}>
                <Map hideComponents={hideComponents} />
                {isLoading && (
                    <div
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            background: "rgba(255, 255, 255, 0.8)",
                            padding: "20px",
                            borderRadius: "8px",
                            zIndex: 1000,
                        }}
                    >
                        Loading...
                    </div>
                )}
            </div>
        </div>
    );
};
