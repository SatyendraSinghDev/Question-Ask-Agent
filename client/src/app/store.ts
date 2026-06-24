import { configureStore, type Middleware } from '@reduxjs/toolkit';
import type { UnknownAction } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { baseApi } from './api';
import { authReducer, type AuthState } from '../features/auth/authSlice';

/** Logs rejected RTK Query mutations (hook point for global toasts). */
const apiErrorLogger: Middleware = () => (next) => (action) => {
  const a = action as UnknownAction & { error?: unknown };
  if (typeof a.type === 'string' && a.type.endsWith('/rejected') && a.error) {
    // surface a toast here if desired
  }
  return next(action);
};

const authPersistConfig = {
  key: 'testask.auth',
  storage,
  whitelist: ['user', 'role', 'isAuthenticated'],
};

// redux-persist's typing doesn't perfectly match RTK's Reducer type; cast through
// unknown to bridge the (harmless) structural mismatch.
const persistedAuthReducer = persistReducer(
  authPersistConfig,
  authReducer,
) as unknown as typeof authReducer;

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: persistedAuthReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(baseApi.middleware, apiErrorLogger),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type { AuthState };
