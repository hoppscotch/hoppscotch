export default [
  {
    name: "Environment: Set an environment variable",
    script: `\n\n// Set an environment variable
pw.env.set("variable", "value");`,
  },
  {
    name: "Environment: Set timestamp variable",
    script: `\n\n// Set timestamp variable
const currentTime = Date.now();
pw.env.set("timestamp", currentTime.toString());`,
  },
  {
    name: "Environment: Set random number variable",
    script: `\n\n// Set random number variable
const min = 1
const max = 1000
const randomArbitrary = Math.random() * (max - min) + min
pw.env.set("randomNumber", randomArbitrary.toString());`,
  },
  {
    name: "HTTP: Fetch API call to set authentication token",
    script: `(async () => {
  try {
    console.log("Fetching authentication token...");
    
    const authResponse = await fetch("https://api.example.com/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "your_username",
        password: "your_password"
      })
    });

    console.log("Auth response status:", authResponse.status);

    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log("Authentication successful");
      pw.env.set("auth_token", authData.token);
    } else {
      console.error("Authentication failed:", authResponse.status);
    }
  } catch (err) {
    console.error("Authentication request failed:", err);
  }
})();`,
  },
  {
    name: "HTTP: Fetch data and set environment variable",
    script: `(async () => {
  try {
    console.log("Fetching data from API...");
    
    const response = await fetch("https://api.example.com/data");
    console.log("API response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Data received:", data);
      
      pw.env.set("api_data", JSON.stringify(data));
      pw.env.set("user_id", data.userId || "");
      
      console.log("Environment variables set successfully");
    } else {
      console.error("API call failed:", response.status);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
})();`,
  },
]
