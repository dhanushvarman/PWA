// Actions
import { NetWorkActions } from "../store/slices/network/networkSlice";

// Constants
import { Messages } from "../constants/messageConstants";
import { MediaMimeTypes } from "../constants/generalConstants";

// Get Audio Or Video Media Info
function getAudioOrVideoMediaInfo(chunks = [], mediaType = "audio") {
  const mimeType = MediaMimeTypes[mediaType] || "";
  const filename = `camera_${mediaType}_${Date.now()}.webm`;
  const fileBlob = new Blob(chunks, { type: mimeType });
  const file = new File([fileBlob], filename, { type: mimeType });

  return {
    fileBlob: file,
    filename,
    type: mimeType,
    mediaType,
    mediaUrl: URL.createObjectURL(fileBlob),
  };
}

// Get Image Media Info
async function getImageMediaInfo(imageSrc = "") {
  const mimeType = MediaMimeTypes["image"] || "";
  const filename = `camera_image_${Date.now()}.png`;

  const data = await fetch(imageSrc);
  const fileBlob = await data.blob();
  const file = new File([fileBlob], filename, { type: mimeType });

  return {
    fileBlob: file,
    filename,
    type: mimeType,
    mediaType: "image",
    mediaUrl: URL.createObjectURL(fileBlob),
  };
}

// Handle Camera Capture
async function handleCameraCapture(cameraRef, mediaType, dispatch, setShowCamera = () => {}) {
  if (mediaType === "image" && cameraRef.current) {
    const imageSrc = cameraRef.current.getScreenshot();
    if (imageSrc) {
      const mediaInfo = await getImageMediaInfo(imageSrc);

      dispatch(NetWorkActions.uploadMedia({ mediaInfo }));
      dispatch(NetWorkActions.setCapturedMediaInfo({ capturedMediaInfo: mediaInfo }));
    }
  }

  if (mediaType === "video" && cameraRef.current.stream) {
    // Basic video capture (more complex for precise control)
    const mediaRecorder = new MediaRecorder(cameraRef.current.stream);
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const mediaInfo = getAudioOrVideoMediaInfo(chunks, mediaType);

      dispatch(NetWorkActions.uploadMedia({ mediaInfo }));
      dispatch(NetWorkActions.setCapturedMediaInfo({ capturedMediaInfo: mediaInfo }));
    };
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds

    dispatch(NetWorkActions.setMessage({ message: Messages.recordingVideoMsg }));
    // setMessage("Recording video...");
    return;
  }

  if (mediaType === "audio" && cameraRef.current.stream) {
    const mediaRecorder = new MediaRecorder(cameraRef.current.stream.getAudioTracks()[0], { mimeType: "audio/webm" });
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const mediaInfo = getAudioOrVideoMediaInfo(chunks, mediaType);

      dispatch(NetWorkActions.uploadMedia({ mediaInfo }));
      dispatch(NetWorkActions.setCapturedMediaInfo({ capturedMediaInfo: mediaInfo }));
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds

    dispatch(NetWorkActions.setMessage({ message: Messages.recordingAudioMsg }));
    return;
  }

  setShowCamera(false);
}

const CameraHelper = {
  handleCameraCapture,
};

export default CameraHelper;
