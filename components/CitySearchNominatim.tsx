"use client";

import React, { useState, useEffect } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface CitySearchProps {
  onSelect: (coords: Coordinates) => void;
}

const CitySearchNominatim: React.FC<CitySearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only search when query is at least 3 characters
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&addressdetails=1&limit=5`,
      {
        signal: controller.signal,
        headers: {
          // Nominatim requires a proper User-Agent header
          "User-Agent": "YourAppName/1.0 (your-email@example.com)",
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
        setIsLoading(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Error fetching geocode data: ", error);
          setIsLoading(false);
        }
      });
    return () => {
      controller.abort();
    };
  }, [query]);

  const handleSelect = (result: NominatimResult) => {
    setQuery(result.display_name);
    setResults([]);
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onSelect({ lat, lng });
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        placeholder="Search for a city"
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
      />
      {isLoading && <p>Loading...</p>}
      {results.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            position: "absolute",
            background: "#fff",
            border: "1px solid #ccc",
            width: "100%",
            maxHeight: "150px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {results.map((result) => (
            <li
              key={result.display_name}
              onClick={() => handleSelect(result)}
              style={{
                cursor: "pointer",
                padding: "4px",
                borderBottom: "1px solid #eee",
              }}
            >
              {result.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CitySearchNominatim;
