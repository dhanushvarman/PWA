import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

// Store
import Store from "./store/store.js";

// App
import App from "./App.jsx";

// CSS
import "./index.css";

createRoot(document.getElementById("root")).render(
  <Provider store={Store}>
    <App />
  </Provider>
);
