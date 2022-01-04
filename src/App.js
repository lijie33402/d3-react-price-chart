import './App.css';
import PriceChart from "./components/PriceChart";
import { json } from 'd3';
import { useEffect, useState } from 'react';
function App() {
  const [priceData, setPriceData] = useState([]);
  useEffect(() => {
    fetch('dji.json', {
      headers : { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
       }

    })
    .then((response) => response.json())
    .then((messages) => {
      const data = messages.map(item => ({
        date: new Date(item[0]),
        high: item[4],
        low: item[3],
        open: item[1],
        close: item[2],
        volume: item[5]
      }));
      setPriceData(data)
    });
  }, [])
  return (
    <div className="App">
      <h1>DJI PRICE CHART</h1>
      <PriceChart
       data={ priceData }
      />
    </div>
  );
}

export default App;
