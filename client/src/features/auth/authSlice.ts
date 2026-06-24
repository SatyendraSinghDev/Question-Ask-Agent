import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { UserRole, type User } from '../../types';

export interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User }>) {
      state.user = action.payload.user;
      state.role = action.payload.user.role;
      state.isAuthenticated = true;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.role = action.payload.role;
    },
    logout(state) {
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
