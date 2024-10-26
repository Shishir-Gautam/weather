import React, { useState, useEffect } from 'react';
import './App.css';

// Access API keys from environment variables
const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const TELEPORT_API_KEY = process.env.REACT_APP_TELEPORT_API_KEY;

const App = () => {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [city, setCity] = useState('New York');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState('metric');
  const [recentSearches, setRecentSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const fetchWeather = async (lat = null, lon = null) => {
    setLoading(true);
    setError(null);
    try {
      let apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=${unit}`;
      
      if (lat && lon) {
        apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=${unit}`;
      }

      const response = await fetch(apiUrl);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("City not found! Please enter a valid city name.");
        }
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      setWeather(data);
      updateRecentSearches(city);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRecentSearches = (newCity) => {
    setRecentSearches((prevSearches) => {
      const updatedSearches = [newCity, ...prevSearches.filter(city => city !== newCity)];
      if (updatedSearches.length > 5) updatedSearches.pop();
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      return updatedSearches;
    });
  };

  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
    fetchWeather();
  }, [unit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchWeather();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCity(value);
    if (value.length >= 3) {
      fetchCitySuggestions(value);
    } else {
      setSuggestions([]);
    }
  };

  const fetchCitySuggestions = async (input) => {
    try {
      const response = await fetch(
        `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${input}`,
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': TELEPORT_API_KEY,
            'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
          },
        }
      );
      const data = await response.json();
      const cityNames = data.data.map((city) => `${city.city}, ${city.countryCode}`);
      setSuggestions(cityNames);
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setCity(suggestion);
    setSuggestions([]);
    fetchWeather();
  };

  const handleRecentSearch = (recentCity) => {
    setCity(recentCity);
    setSuggestions([]);
    fetchWeather();
  };

  const toggleUnit = () => {
    setUnit((prevUnit) => (prevUnit === 'metric' ? 'imperial' : 'metric'));
  };

  const getCurrentLocationWeather = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
        },
        (error) => {
          setError('Error getting location. Please allow location access.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  const determineBackground = () => {
    if (!weather) return "default-background";
    const { main, weather: weatherConditions } = weather;
    const condition = weatherConditions[0].main.toLowerCase();

    if (condition.includes("cloud")) return "cloudy-background";
    if (condition.includes("clear")) {
      return main.temp < 15 ? "night-background" : "clear-background";
    }
    return "default-background";
  };

  return (
    <div className={`App ${determineBackground()}`}>
      <h1 style={{ fontSize: '2em', textAlign: 'center', marginBottom: '20px' }}>Weather App</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={city}
          onChange={handleInputChange}
          placeholder="Enter city name"
          style={{ width: '300px', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>Get Weather</button>
      </form>

      <button onClick={getCurrentLocationWeather} style={{ padding: '10px 20px', marginTop: '10px' }}>
        Use Your Current Location
      </button>

      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((suggestion, index) => (
            <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {loading && <p>Loading weather data...</p>}
      {error && <p style={{ color: 'red' }}>Error fetching weather data: {error}</p>}
      {weather && (
        <div className="weather-info" style={{ position: 'relative', marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '10px' }}>
          <h2>Weather in {weather.name}</h2>
          <button onClick={toggleUnit} style={{ position: 'absolute', top: '20px', right: '20px' }}>
            Switch to {unit === 'metric' ? 'Fahrenheit' : 'Celsius'}
          </button>
          <p>Temperature: {weather.main.temp}°{unit === 'metric' ? 'C' : 'F'}</p>
          <p>Condition: {weather.weather[0].description}</p>
          <p>Humidity: {weather.main.humidity}%</p>
          <p>Pressure: {weather.main.pressure} hPa</p>
          <p>Visibility: {(weather.visibility / 1000).toFixed(2)} km</p>
          <p>Wind Speed: {weather.wind.speed} m/s</p>
          <p>Sunrise: {new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}</p>
          <p>Sunset: {new Date(weather.sys.sunset * 1000).toLocaleTimeString()}</p>
        </div>
      )}

      {recentSearches.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Recent Searches:</h3>
          <ul>
            {recentSearches.map((recentCity, index) => (
              <li key={index} onClick={() => handleRecentSearch(recentCity)}>
                {recentCity}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
