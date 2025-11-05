import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../services/api";

const Protected: React.FC = () => {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default Protected;
