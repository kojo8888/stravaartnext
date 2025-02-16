"use client";

import { useState } from "react";

export default function Home() {
  const [geojsonData, setGeojsonData] = useState(null);

  async function fetchFittedShape() {
    const response = await fetch("http://localhost:8000/fit-heart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // If you want to pass parameters, include them in the body:
      body: JSON.stringify({ /* custom parameters if needed */ }),
    });
    const data = await response.json();
    setGeojsonData(data);
  }

  return (
    <div>
      <h1>Bike Routing with Fitted Shape</h1>
      <button onClick={fetchFittedShape}>Get Fitted Shape</button>
      {geojsonData && (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(geojsonData, null, 2)}
        </pre>
      )}
    </div>
  );
}
