import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import localforage from "localforage";
import axios from "axios";
import "./App.css";

const API_UPLOAD_URL = "http://192.168.0.229:5000/upload"; // Your backend upload URL

function App() {
  const fileInputRef = useRef(null);
  const cameraRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [capturedMediaType, setCapturedMediaType] = useState("");
  const [message, setMessage] = useState("");
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Initialize localforage for offline queue
    localforage.config({
      name: "mediaUploaderPWA",
      storeName: "offlineUploadQueue",
    });

    // Load existing queue on startup
    loadOfflineQueue();

    // Listen for online/offline events
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    // This block registers the service worker if it's not already handled by vite-plugin-pwa's autoUpdate
    // VitePWA plugin typically handles registration automatically, but it's good to keep awareness.
    // For 'autoUpdate' in vite-plugin-pwa, you usually don't need this explicit registration.
    // However, if you chose `injectRegister: null` in vite.config.js, you would put it here.
    /*
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // The vite-plugin-pwa might generate a `registerSW.js` or similar.
                // Or you might point to your own `sw.js` if using 'injectManifest' strategy.
                navigator.serviceWorker.register('/sw.js') // or /registerSW.js, check your vite build output
                    .then(registration => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        }
        */

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    // Attempt to process queue when online
    if (isOnline && offlineQueue.length > 0) {
      processOfflineQueue();
    }
  }, [isOnline, offlineQueue]);

  const handleOnlineStatus = () => {
    setIsOnline(navigator.onLine);
    setMessage(navigator.onLine ? "Online" : "Offline");
  };

  const loadOfflineQueue = async () => {
    try {
      const queue = (await localforage.getItem("uploadQueue")) || [];
      setOfflineQueue(queue);
      console.log("Loaded offline queue:", queue);
    } catch (error) {
      console.error("Error loading offline queue:", error);
    }
  };

  const saveOfflineQueue = async (queue) => {
    try {
      await localforage.setItem("uploadQueue", queue);
      setOfflineQueue(queue);
      console.log("Saved offline queue:", queue);
    } catch (error) {
      console.error("Error saving offline queue:", error);
    }
  };

  const addToOfflineQueue = async (blob, filename, type) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob); // Convert blob to Data URL for storage
    reader.onloadend = async () => {
      const base64data = reader.result;
      const item = {
        data: base64data,
        filename: filename || `upload-${Date.now()}.${type.split("/")[1] || "bin"}`,
        type: type,
        timestamp: Date.now(),
      };
      const newQueue = [...offlineQueue, item];
      await saveOfflineQueue(newQueue);
      setMessage("Added to offline queue. Will upload when online.");
    };
    reader.onerror = () => {
      console.error("Error reading blob as data URL");
      setMessage("Error preparing file for offline queue.");
    };
  };

  const processOfflineQueue = async () => {
    setMessage("Processing offline queue...");
    let currentQueue = [...offlineQueue];

    while (currentQueue.length > 0 && navigator.onLine) {
      const item = currentQueue[0];
      try {
        // Convert Data URL back to Blob for upload
        const blob = await fetch(item.data).then((res) => res.blob());
        const file = new File([blob], item.filename, { type: item.type });

        const formData = new FormData();
        formData.append("mediaFile", file);

        const response = await axios.post(API_UPLOAD_URL, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        console.log("Offline upload successful:", response.data);
        setMessage(`Uploaded: ${item.filename}`);

        // Remove successfully uploaded item from queue
        currentQueue = currentQueue.slice(1);
        await saveOfflineQueue(currentQueue);
      } catch (error) {
        console.error("Error uploading item from queue:", error);
        setMessage(`Failed to upload ${item.filename}. Will retry.`);
        // If an upload fails, stop processing to avoid continuous errors
        // and let the next online event trigger a retry.
        break;
      }
    }
    if (currentQueue.length === 0 && navigator.onLine) {
      setMessage("Offline queue processed successfully!");
    } else if (currentQueue.length > 0 && !navigator.onLine) {
      setMessage("Still offline. Queue remains.");
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCapturedMedia(URL.createObjectURL(file));
      setCapturedMediaType(
        file.type.startsWith("image")
          ? "image"
          : file.type.startsWith("video")
          ? "video"
          : file.type.startsWith("audio")
          ? "audio"
          : "other"
      );
      uploadFile(file);
    }
  };

  const handleCameraCapture = async (mediaType) => {
    let mediaBlob;
    let filename;
    let mimeType;

    if (mediaType === "image" && cameraRef.current) {
      const imageSrc = cameraRef.current.getScreenshot();
      if (imageSrc) {
        mediaBlob = await fetch(imageSrc).then((res) => res.blob());
        filename = `camera_image_${Date.now()}.png`;
        mimeType = "image/png";
      }
    } else if (mediaType === "video" && cameraRef.current.stream) {
      // Basic video capture (more complex for precise control)
      const mediaRecorder = new MediaRecorder(cameraRef.current.stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        mediaBlob = new Blob(chunks, { type: "video/webm" }); // Or 'video/mp4' if supported
        filename = `camera_video_${Date.now()}.webm`;
        mimeType = "video/webm";
        setCapturedMedia(URL.createObjectURL(mediaBlob));
        setCapturedMediaType("video");
        uploadFile(mediaBlob, filename, mimeType);
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
      setMessage("Recording video...");
      return;
    } else if (mediaType === "audio" && cameraRef.current.stream) {
      const mediaRecorder = new MediaRecorder(cameraRef.current.stream.getAudioTracks()[0], { mimeType: "audio/webm" });
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        mediaBlob = new Blob(chunks, { type: "audio/webm" });
        filename = `camera_audio_${Date.now()}.webm`;
        mimeType = "audio/webm";
        setCapturedMedia(URL.createObjectURL(mediaBlob));
        setCapturedMediaType("audio");
        uploadFile(mediaBlob, filename, mimeType);
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
      setMessage("Recording audio...");
      return;
    }

    if (mediaBlob) {
      setCapturedMedia(URL.createObjectURL(mediaBlob));
      setCapturedMediaType(mediaType);
      uploadFile(mediaBlob, filename, mimeType);
    } else {
      setMessage("No media captured. Ensure camera is active.");
    }
    setShowCamera(false);
  };

  const uploadFile = async (fileBlob, filename = fileBlob.name, type = fileBlob.type) => {
    if (!fileBlob) {
      setMessage("No file to upload.");
      return;
    }

    setMessage(`Attempting to upload ${filename}...`);

    if (!isOnline) {
      await addToOfflineQueue(fileBlob, filename, type);
      return;
    }

    const formData = new FormData();
    formData.append("mediaFile", fileBlob, filename); // Append Blob directly with filename

    try {
      const response = await axios.post(API_UPLOAD_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("Upload successful:", response.data);
      setMessage(`Upload successful: ${response.data.filename}`);
    } catch (error) {
      console.error("Upload failed:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      // Add to offline queue if upload fails and it's a network error
      if (error.code === "ERR_NETWORK" || !navigator.onLine) {
        await addToOfflineQueue(fileBlob, filename, type);
      } else {
        setMessage(`Upload failed: ${error.message}.`);
      }
    }
  };

  const handleCameraToggle = (mediaType) => {
    setShowCamera((prev) => !prev);
    setCapturedMediaType(mediaType); // Set expected media type for camera
    setCapturedMedia(null); // Clear previous capture
  };

  return (
    <div className="App">
      <h1>PWA Media Uploader (Vite React)</h1>
      <p>Status: {message}</p>
      <p>Network: {isOnline ? "Online" : "Offline"}</p>

      <div className="upload-options">
        <h2>Upload from Gallery</h2>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*"
          style={{ display: "none" }}
        />
        <button onClick={() => fileInputRef.current.click()}>Choose from Gallery</button>
      </div>

      <div className="camera-options">
        <h2>Capture from Camera</h2>
        <button onClick={() => handleCameraToggle("image")}>
          {showCamera && capturedMediaType === "image" ? "Close Camera (Image)" : "Open Camera (Image)"}
        </button>
        <button onClick={() => handleCameraToggle("video")}>
          {showCamera && capturedMediaType === "video" ? "Close Camera (Video)" : "Open Camera (Video)"}
        </button>
        <button onClick={() => handleCameraToggle("audio")}>
          {showCamera && capturedMediaType === "audio" ? "Close Camera (Audio)" : "Open Camera (Audio)"}
        </button>

        {showCamera && (
          <div className="camera-preview">
            {capturedMediaType === "image" && (
              <>
                <Webcam
                  audio={false}
                  ref={cameraRef}
                  screenshotFormat="image/png"
                  width={320}
                  height={240}
                  // videoConstraints={{ facingMode: "environment" }} // Or "user" for front camera
                />
                <button onClick={() => handleCameraCapture("image")}>Capture Photo</button>
              </>
            )}
            {capturedMediaType === "video" && (
              <>
                <Webcam
                  audio={true}
                  ref={cameraRef}
                  width={320}
                  height={240}
                  // videoConstraints={{ facingMode: "environment" }}
                />
                <button onClick={() => handleCameraCapture("video")}>Record Video (5s)</button>
                <p>Recording will stop automatically after 5 seconds.</p>
              </>
            )}
            {capturedMediaType === "audio" && (
              <>
                <Webcam
                  audio={true}
                  video={false} // Only audio
                  ref={cameraRef}
                />
                <button onClick={() => handleCameraCapture("audio")}>Record Audio (5s)</button>
                <p>Recording will stop automatically after 5 seconds.</p>
              </>
            )}
          </div>
        )}
      </div>

      {capturedMedia && (
        <div className="preview-section">
          <h2>Captured/Selected Media Preview:</h2>
          {capturedMediaType === "image" && <img src={capturedMedia} alt="Captured" className="media-preview" />}
          {capturedMediaType === "video" && (
            <video controls src={capturedMedia} className="media-preview">
              Your browser does not support the video tag.
            </video>
          )}
          {capturedMediaType === "audio" && (
            <audio controls src={capturedMedia} className="media-preview">
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}

      {offlineQueue.length > 0 && (
        <div className="offline-queue-section">
          <h2>Offline Upload Queue ({offlineQueue.length} items)</h2>
          <ul>
            {offlineQueue.map((item) => (
              <li key={item.timestamp}>
                {item.filename} ({item.type}) - Added: {new Date(item.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
          {!isOnline && <p>Waiting for network to resume uploads...</p>}
        </div>
      )}
    </div>
  );
}

export default App;
