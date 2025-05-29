import { useDispatch, useSelector } from "react-redux";
import { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import localforage from "localforage";

// Actions
import { NetWorkActions } from "./store/slices/network/networkSlice";

// Helpers
import CameraHelper from "./helpers/cameraHelper";

// Constants
import { MediaTypes } from "./constants/generalConstants";

// CSS
import "./App.css";

/**
 * App
 */
export default function App() {
  // Dispatch
  const dispatch = useDispatch();

  // Refs
  const fileInputRef = useRef(null);
  const cameraRef = useRef(null);

  // State
  const [showCamera, setShowCamera] = useState(false);

  // Selector State
  const capturedMediaInfo = useSelector((state) => state.network.capturedMediaInfo);
  const { mediaUrl = "", mediaType = "" } = capturedMediaInfo || {};

  const message = useSelector((state) => state.network.message);
  const offlineQueue = useSelector((state) => state.network.offlineQueue);
  const isOnline = useSelector((state) => state.network.isOnline);

  //
  const { image, audio, video } = MediaTypes;

  // Functions
  function handleCameraToggle(mediaType) {
    setShowCamera((prev) => !prev);
    dispatch(NetWorkActions.setCapturedMediaInfo({ capturedMediaInfo: { mediaType, mediaUrl: "" } }));
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      // const mediaType = getMediaType(file.type);

      dispatch(
        NetWorkActions.setCapturedMediaInfo({
          capturedMediaInfo: { mediaUrl: URL.createObjectURL(file), mediaType },
        })
      );
      dispatch(NetWorkActions.uploadMedia({ mediaInfo: { fileBlob: file } }));
    }
  }

  function handleOnlineStatus() {
    dispatch(NetWorkActions.setOnlineStatus());
  }

  // useEffect
  useEffect(() => {
    // Initialize localforage for offline queue
    localforage.config({
      name: "mediaUploaderPWA",
      storeName: "offlineUploadQueue",
    });

    // Load existing queue on startup
    dispatch(NetWorkActions.loadOfflineQueue());

    // Listen for online/offline events
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, [dispatch]);

  useEffect(() => {
    // Attempt to process queue when online
    if (isOnline && offlineQueue.length > 0) {
      dispatch(NetWorkActions.processOfflineQueue({ offlineQueue }));
    }
  }, [dispatch, isOnline, offlineQueue]);

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
        <button onClick={() => handleCameraToggle(image)}>
          {showCamera && mediaType === image ? "Close Camera (Image)" : "Open Camera (Image)"}
        </button>
        <button onClick={() => handleCameraToggle(video)}>
          {showCamera && mediaType === video ? "Close Camera (Video)" : "Open Camera (Video)"}
        </button>
        <button onClick={() => handleCameraToggle(audio)}>
          {showCamera && mediaType === audio ? "Close Camera (Audio)" : "Open Camera (Audio)"}
        </button>

        {showCamera && (
          <div className="camera-preview">
            {mediaType === image && (
              <>
                <Webcam
                  audio={false}
                  ref={cameraRef}
                  screenshotFormat="image/png"
                  width={320}
                  height={240}
                  // videoConstraints={{ facingMode: "environment" }} // Or "user" for front camera
                />
                <button onClick={() => CameraHelper.handleCameraCapture(cameraRef, image, dispatch, setShowCamera)}>
                  Capture Photo
                </button>
              </>
            )}
            {mediaType === video && (
              <>
                <Webcam
                  audio={true}
                  ref={cameraRef}
                  width={320}
                  height={240}
                  // videoConstraints={{ facingMode: "environment" }}
                />
                <button onClick={() => CameraHelper.handleCameraCapture(cameraRef, video, dispatch, setShowCamera)}>
                  Record Video (5s)
                </button>
                <p>Recording will stop automatically after 5 seconds.</p>
              </>
            )}
            {mediaType === audio && (
              <>
                <Webcam
                  audio={true}
                  video={false} // Only audio
                  ref={cameraRef}
                />
                <button onClick={() => CameraHelper.handleCameraCapture(cameraRef, audio, dispatch, setShowCamera)}>
                  Record Audio (5s)
                </button>
                <p>Recording will stop automatically after 5 seconds.</p>
              </>
            )}
          </div>
        )}
      </div>

      {mediaUrl && (
        <div className="preview-section">
          <h2>Captured/Selected Media Preview:</h2>
          {mediaType === image && <img src={mediaUrl} alt="Captured" className="media-preview" />}
          {mediaType === video && (
            <video controls src={mediaUrl} className="media-preview">
              Your browser does not support the video tag.
            </video>
          )}
          {mediaType === audio && (
            <audio controls src={mediaUrl} className="media-preview">
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
