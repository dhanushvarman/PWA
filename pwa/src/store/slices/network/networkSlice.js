import { createSlice } from "@reduxjs/toolkit";

// Constants
import { Messages } from "../../../constants/messageConstants";

// Initial State
const initialState = {
  //
  capturedMediaInfo: {},

  //
  offlineQueue: [],

  //
  isOnline: navigator.onLine,

  //
  message: "",
};

// Netowrk Slice
const networkSlice = createSlice({
  name: "Network",
  initialState,
  reducers: {
    // Set Captured Media Information
    setCapturedMediaInfo: (state, action) => {
      const { capturedMediaInfo = {} } = action.payload;
      state.capturedMediaInfo = capturedMediaInfo;
    },

    // Set Online Status
    setOnlineStatus: (state) => {
      state.isOnline = navigator.onLine;
    },

    // Set Message
    setMessage: (state, action) => {
      const { message = "" } = action.payload;
      state.message = message;
    },

    // Load Offline Queue
    loadOfflineQueue: (state) => {
      state.message = Messages.loadingOfflineQueueMsg;
    },

    loadOfflineQueueSuccess: (state, action) => {
      const { queue = [] } = action.payload;
      state.offlineQueue = queue;
      state.message = "";
    },

    // Save Offline Queue
    saveOfflineQueue: (state) => {
      state.message = Messages.savingOfflineQueueMsg;
    },

    saveOfflineQueueSuccess: (state, action) => {
      const { queue = {} } = action.payload;
      state.offlineQueue = queue;
      state.message = "";
    },

    // Add To Offline Queue
    addToOfflineQueue: (state) => {
      state.message = Messages.addOfflineQueueMsg;
    },

    // Process Offline Queue
    processOfflineQueue: (state) => {
      state.message = Messages.processOfflineQueueMsg;
    },

    // Upload Media
    uploadMedia: (state) => {
      state.message = Messages.uploadingMsg;
    },
  },
});

// Reducer
export const NetworkReducer = networkSlice.reducer;

// Actions
export const NetWorkActions = networkSlice.actions;
