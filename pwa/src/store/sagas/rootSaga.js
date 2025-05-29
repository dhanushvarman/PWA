import { all, fork } from "redux-saga/effects";

// Network Saga
import NetworkSaga from "./network/networkSaga";

/**
 * Root Saga
 */
export default function* RootSaga() {
  yield all([fork(NetworkSaga)]);
}
