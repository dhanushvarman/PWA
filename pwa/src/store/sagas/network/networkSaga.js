import { all, call, put, takeLatest } from "redux-saga/effects";
import localforage from "localforage";

// Actions
import { NetWorkActions } from "../../slices/network/networkSlice";

// Constants
import { Messages } from "../../../constants/messageConstants";
import { DbKeys } from "../../../constants/dbConstants";

// Service
import NetworkService from "../../../service/networkService";

// Helper Function
function readFileAsDataURL(fileBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Resolve the promise when reading is complete
    reader.onloadend = () => resolve(reader.result);

    // Reject the promise if an error occurs during reading
    reader.onerror = (error) => reject(error);

    // Start reading the file as a Data URL (Base64 string)
    reader.readAsDataURL(fileBlob);
  });
}

// Load Offline Queue
function* loadOfflineQueue() {
  try {
    const queue = (yield localforage.getItem(DbKeys.uploadQueue)) || [];

    yield put(NetWorkActions.loadOfflineQueueSuccess({ queue }));
  } catch (error) {
    console.log("🚀 ~ function*loadOfflineQueue ~ error:", error);
  }
}

// Save Offline Queue
function* saveOfflineQueue(action) {
  const { queue = [] } = action.payload;

  try {
    yield localforage.setItem(DbKeys.uploadQueue, queue);
    yield put(NetWorkActions.saveOfflineQueueSuccess({ queue }));
  } catch (error) {
    console.log("🚀 ~ function*loadOfflineQueue ~ error:", error);
  }
}

function* addToOfflineQueue(action) {
  const { mediaInfo = {} } = action.payload;
  const { fileBlob, filename = "", type = "" } = mediaInfo;

  try {
    const offlineQueue = yield localforage.getItem(DbKeys.uploadQueue);

    const base64data = yield call(readFileAsDataURL, fileBlob);

    const item = {
      data: base64data,
      filename: filename || `upload-${Date.now()}.${type.split("/")[1] || "bin"}`,
      type,
      timestamp: Date.now(),
    };

    yield put(
      NetWorkActions.saveOfflineQueue({
        queue: [...offlineQueue, item],
        message: Messages.addOfflineQueueMsg,
      })
    );
  } catch (error) {
    console.log("🚀 ~ function*addToOfflineQueue ~ error:", error);
  }
}

// Process Offline Queue
function* processOfflineQueue(action) {
  let uploadFileName = "";

  try {
    const { offlineQueue = [] } = action.payload;
    let currentQueue = [...offlineQueue];

    while (currentQueue.length > 0 && navigator.onLine) {
      const { data = {}, type = "", filename = "" } = currentQueue[0];
      uploadFileName = filename;

      // Convert Data URL back to Blob for upload
      const blob = yield fetch(data).then((res) => res.blob());
      const file = new File([blob], filename, { type: type });

      const mediaInfo = {
        fileBlob: file,
        filename,
      };

      yield NetworkService.uploadMedia(mediaInfo);

      yield put(NetWorkActions.setMessage({ message: `Uploaded: ${filename}` }));

      // Remove successfully uploaded item from queue
      currentQueue = currentQueue.slice(1);

      yield put(NetWorkActions.saveOfflineQueue({ queue: currentQueue }));

      // If an upload fails, stop processing to avoid continuous errors
      // and let the next online event trigger a retry.
      break;
    }

    if (currentQueue.length === 0 && navigator.onLine) {
      yield put(NetWorkActions.setMessage({ message: Messages.processOfflineQueueSuccessMsg }));
    } else if (currentQueue.length > 0 && !navigator.onLine) {
      yield put(NetWorkActions.setMessage({ message: Messages.processOfflineQueuePending }));
    }
  } catch (error) {
    yield put(NetWorkActions.setMessage({ message: `Failed to upload ${uploadFileName}. Will retry.` }));
    console.error("Error uploading item from queue:", error);
  }
}

// Upload Media
function* uploadMedia(action) {
  const { mediaInfo = {} } = action.payload;
  const { fileBlob = "", filename = "" } = mediaInfo;

  try {
    if (!fileBlob) {
      yield put(NetWorkActions.setMessage({ message: Messages.noFileMsg }));
      return;
    }

    yield put(NetWorkActions.setMessage({ message: `Attempting to upload ${filename}...` }));

    if (!navigator.onLine) {
      yield put(NetWorkActions.addToOfflineQueue({ mediaInfo }));
      return;
    }

    yield NetworkService.uploadMedia(mediaInfo);

    yield put(NetWorkActions.setMessage({ message: Messages.uploadMediaSuccessMsg }));
  } catch (error) {
    // Add to offline queue if upload fails and it's a network error
    if (error.code === "ERR_NETWORK" || !navigator.onLine) {
      yield put(NetWorkActions.addToOfflineQueue({ mediaInfo }));
    } else {
      yield put(NetWorkActions.setMessage({ message: Messages.uploadMediaFailedMsg }));
    }
  }
}

/**
 * Root Saga
 */
export default function* root() {
  yield all([
    takeLatest(NetWorkActions.loadOfflineQueue.type, loadOfflineQueue),
    takeLatest(NetWorkActions.saveOfflineQueue.type, saveOfflineQueue),
    takeLatest(NetWorkActions.addToOfflineQueue.type, addToOfflineQueue),
    takeLatest(NetWorkActions.processOfflineQueue.type, processOfflineQueue),
    takeLatest(NetWorkActions.uploadMedia.type, uploadMedia),
  ]);
}
