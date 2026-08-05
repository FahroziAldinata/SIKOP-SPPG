import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles, requiredPerm }) => {
  const { token, user, loading, hasPerm, permissionsReady } = useAuth();

  if (loading || (requiredPerm && !permissionsReady)) {
    return <div>Loading auth...</div>;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPerm) {
    const permList = Array.isArray(requiredPerm) ? requiredPerm : [requiredPerm];
    const hasAll = permList.every((perm) => hasPerm(perm));
    if (!hasAll) {
      return <div>Akses ditolak: Anda tidak memiliki izin untuk halaman ini.</div>;
    }
  } else if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div>Akses ditolak: Anda tidak memiliki izin untuk halaman ini.</div>;
  }

  return children;
};

