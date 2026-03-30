import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { userApi } from '../api/admin';
import type { User } from '../types';

interface UsersState {
    users: User[];
    isLoading: boolean;
    error: string | null;
}

const initialState: UsersState = {
    users: [],
    isLoading: false,
    error: null,
};

export const fetchUsers = createAsyncThunk('users/fetchUsers', async () => {
    const response = await userApi.list(1, 1000); // Fetch up to 1000 users
    return response.data || [];
});

const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        clearUsers: (state) => {
            state.users = [];
            state.isLoading = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
                state.users = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'Failed to fetch users';
            });
    },
});

export const { clearUsers } = usersSlice.actions;
export default usersSlice.reducer;
