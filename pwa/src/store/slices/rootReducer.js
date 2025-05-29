import { combineReducers } from "redux";

// Network Reducer
import { NetworkReducer } from "./network/networkSlice";

const RootReducer = combineReducers({
  network: NetworkReducer,
});

export default RootReducer;
