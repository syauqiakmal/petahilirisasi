import logo from "../Logo/Printer.png";
import footerLogo from "../Logo/Logo Geobee Geodashboard.png";

import { Map } from "../Map/Map";

import React, { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export const PrintLayer = () => {

    const [hideComponents, setHideComponents] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [date, setDescription] = useState("");
    const [outputFormat, setOutputFormat] = useState("pdf");
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
                        if (outputFormat === "pdf") {
                            const pdf = new jsPDF("landscape");
                            const imgProps = pdf.getImageProperties(dataUrl);
                            const pdfWidth = pdf.internal.pageSize.getWidth();
                            const pdfHeight =
                                (imgProps.height * (pdfWidth - 40)) / imgProps.width; // Reduce width by 40 units for margins

                            // Set the background color
                            pdf.setFillColor("#FFFFFF");
                            pdf.rect(0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), "F");

                            // Set the font color to white
                            pdf.setTextColor("#000000");

                            // Add the image to the PDF, slightly lower
                            const imageX = 20; // 20 units margin on the left
                            const imageY = 20; // 20 units margin from the top
                            pdf.addImage(
                                dataUrl,
                                "PNG",
                                imageX,
                                imageY,
                                pdfWidth - 40,
                                pdfHeight
                            );

                            pdf.setLineWidth(0.6);
                            pdf.setDrawColor(0, 0, 0); // Border color (white)
                            pdf.rect(imageX, imageY, pdfWidth - 40, pdfHeight, "S"); // Draw the border rectangle

                            // Add the user input text at the bottom
                            const textY = pdf.internal.pageSize.getHeight() - 10; // 10 units from the bottom

                            pdf.text(`Description: ${ name }`, 20, textY - 30); // 10 units above the bottom
                            pdf.text(`Date: ${ date }`, 20, textY - 20);

                            // Add the fixed text at the top and center it horizontally
                            const textX = pdfWidth - 20; // Center the text horizontally

                            const textYTop = 10; // 10 units from the top edge

                            const textXi = pdfWidth / 2; // Center the text horizontally
                            const textYTopi = 10; // 10 units from the top edge
                            pdf.text("Geobee-Dashboard", textX, textYTop, { align: "right" });
                            pdf.text(`${ title }`, textXi, textYTopi, { align: "center" });

                            // Add the footer logo in the top right corner
                            const footerLogoX = pdfWidth - 277; // 20 units from the right edge
                            const footerLogoY = 2; // 5 units from the top edge
                            pdf.addImage(footerLogo, "PNG", footerLogoX, footerLogoY, 20, 20);

                            // Save the PDF
                            pdf.save("map.pdf");
                        } else {
                            // Save as image
                            const link = document.createElement("a");
                            link.href = dataUrl;
                            link.download = "map.png";
                            link.click();
                        }

                        setHideComponents(false); // Show components after capture
                    })
                    .catch((error) => {
                        console.error("oops, something went wrong!", error);
                        setHideComponents(false); // Show components after error
                    });
            }, 100); // Short delay to ensure loading message is hidden
        }, 1000); // Delay to ensure components are hidden
    };

    const toggleForm = () => {
        setShowForm(!showForm);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleCapture();
    };

    const handleCancel = () => {
        setShowForm(false);
    };

    return (
        <div>
            <button
                style={{
                    position: "absolute",
                    top: "12%",
                    right: "5px",
                    border: "3px solid white",
                    transform: "translate(-50%, -50%)",
                    background: "rgba(255, 255, 255)",
                    padding: "20px",
                    borderRadius: "100px",
                    zIndex: 1000,
                    backgroundImage: `url(${ logo })`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "20px",
                    backgroundPosition: "center",
                }}
                onClick={toggleForm}
            ></button>

            {showForm && (
                <form className="format" onSubmit={handleSubmit}>
                    <div className="labelform">
                        <label>
                            Title:
                            <input
                                className="labelname"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </label>
                        <label>
                            Description:
                            <input
                                className="labelname"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </label>
                        <label>
                            Date:
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </label>
                        <div className="imagepdf">
                            <label>
                                Output Format:
                                <select
                                    value={outputFormat}
                                    onChange={(e) => setOutputFormat(e.target.value)}
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="image">Image</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    <button type="submit" className="form-button capture-button">
                        Submit
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="form-button cancel-button"
                    >
                        Cancel
                    </button>
                </form>
            )}
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