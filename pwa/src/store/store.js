import { compose, configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";

// Reducer
import RootReducer from "./slices/rootReducer";

// Saga
import RootSaga from "./sagas/rootSaga";

const sagaMiddleware = createSagaMiddleware();
const middleware = [sagaMiddleware];

const composeEnhancers = (typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

const Store = configureStore({
  reducer: RootReducer,
  composeEnhancers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(middleware),
});

sagaMiddleware.run(RootSaga);

export default Store;
