import React, { useState, useEffect } from 'react';
import './App.css';

const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;

const App = () => {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [city, setCity] = useState('Toronto');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false); // New state for location loading
  const [unit, setUnit] = useState('metric');
  const [recentSearches, setRecentSearches] = useState([]);
  const [inputValue, setInputValue] = useState(city);
  const [locationFetched, setLocationFetched] = useState(false);

  const debounceDelay = 500;

  const fetchWeather = async (cityName = city, lat = null, lon = null) => {
    setLoading(true);
    setLocationLoading(false); // Stop location loading if triggered from location
    setError(null);
    try {
      const apiUrl = lat && lon
        ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=${unit}`
        : `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${WEATHER_API_KEY}&units=${unit}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(response.status === 404 ? "City not found! Please enter a valid city name." : `Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      setWeather(data);
      setCity(data.name);
      setInputValue(data.name);
      updateRecentSearches(data.name);
    } catch (err) {
      setError(`Error: ${err.message}. Please try again.`);
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
    } else {
      fetchWeather('Toronto');
    }
  }, []);

  useEffect(() => {
    if (city && unit && !locationFetched) fetchWeather(city);
  }, [unit]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue && inputValue !== city) fetchWeather(inputValue);
    }, debounceDelay);

    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchWeather(inputValue);
    setLocationFetched(false);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setLocationFetched(false);
  };

  const handleRecentSearch = (recentCity) => {
    setInputValue(recentCity);
    fetchWeather(recentCity);
    setLocationFetched(false);
  };

  const toggleUnit = () => setUnit((prevUnit) => (prevUnit === 'metric' ? 'imperial' : 'metric'));

  const getCurrentLocationWeather = () => {
    if (navigator.geolocation) {
      setLocationLoading(true); // Set loading state for location fetching
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(null, latitude, longitude);
          setLocationFetched(true);
        },
        () => {
          setError('Error getting location. Please allow location access.');
          setLocationLoading(false); // Stop location loading on error
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  const determineBackground = () => {
    if (!weather) return "default-background";
    const condition = weather.weather[0].main.toLowerCase();

    switch (condition) {
      case "clouds":
        return "cloudy-background";
      case "clear":
        return weather.main.temp < 15 ? "night-background" : "clear-background";
      case "rain":
        return "rainy-background";
      case "snow":
        return "snowy-background";
      case "thunderstorm":
        return "thunderstorm-background";
      default:
        return "default-background";
    }
  };

  return (
    <div className={`App ${determineBackground()}`}>
      <h1 className="app-title">Weather App</h1>

      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter city name"
          className="input-field"
          autoComplete="off"
        />
        <button type="submit" className="submit-button">Get Weather</button>
      </form>

      <button onClick={getCurrentLocationWeather} className="location-button" disabled={locationLoading}>
        {locationLoading ? "Fetching location..." : "Use Your Current Location"}
      </button>

      {loading && <p className="loading-message">Loading weather data...</p>}
      {error && <p className="error-message">Error fetching weather data: {error}</p>}

      {weather && (
        <div className="weather-info">
          <h2>Weather in {weather.name}</h2>
          <button onClick={toggleUnit} className="toggle-unit">
            Switch to {unit === 'metric' ? 'Fahrenheit' : 'Celsius'}
          </button>
          <div className="unit-indicator">Unit: {unit === 'metric' ? 'Celsius' : 'Fahrenheit'}</div>
          <div className="weather-details">
            <img
              src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
              alt={weather.weather[0].description}
              className="weather-icon"
            />
            <div>
              <p>Temperature: {weather.main.temp}°{unit === 'metric' ? 'C' : 'F'}</p>
              <p>Condition: {weather.weather[0].description}</p>
              <p>Humidity: {weather.main.humidity}%</p>
              <p>Pressure: {weather.main.pressure} hPa</p>
              <p>Visibility: {weather.visibility < 1000 ? "< 1 km" : `${(weather.visibility / 1000).toFixed(2)} km`}</p>
              <p>Wind Speed: {weather.wind.speed} m/s</p>
              <p>Sunrise: {new Date(weather.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p>Sunset: {new Date(weather.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      )}

      {recentSearches.length > 0 && (
        <div className="recent-searches">
          <h3>Recent Searches:</h3>
          <ul>
            {recentSearches.map((recentCity, index) => (
              <li
                key={index}
                onClick={() => handleRecentSearch(recentCity)}
                className="recent-city"
              >
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
