import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAppDispatch } from '../../hooks/redux';
import { fetchUsers } from '../../store/usersSlice';

export const UserBootstrap: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchUsers());
        }
    }, [isAuthenticated, dispatch]);

    return <>{children}</>;
};
