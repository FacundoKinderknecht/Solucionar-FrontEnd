import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./index.css";

import Home from "./pages/Home";
import Login from "./pages/Login";
import RegisterUser from "./pages/RegisterUser";
import RegisterProvider from "./pages/RegisterProvider";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import CreateService from "./pages/CreateService";
import EditService from "./pages/EditService";
import BecomeProvider from "./pages/BecomeProvider";
import Account from "./pages/Account";
import ProviderDashboard from "./pages/ProviderDashboard";
import Protected from "./components/Protected";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
    { index: true, element: <Home /> },
    { path: "login", element: <Login /> },
    { path: "register", element: <RegisterUser /> },
    { path: "register-provider", element: <RegisterProvider /> },
  { path: "services", element: <Protected />, children: [ { index: true, element: <Services /> }, { path: "new", element: <CreateService /> }, { path: ":id", element: <ServiceDetail /> }, { path: ":id/edit", element: <EditService /> } ] },
    { path: "become-provider", element: <Protected />, children: [ { index: true, element: <BecomeProvider /> } ] },
  { path: "account", element: <Protected />, children: [ { index: true, element: <Account /> } ] },
  { path: "provider", element: <Protected />, children: [ { index: true, element: <ProviderDashboard /> } ] },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
