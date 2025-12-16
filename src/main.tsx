import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import "./styles/forms.css";
import "./styles/service-detail.css";
import "./styles/home.css";
import "./styles/payment.css";

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
import MyBookings from './pages/MyBookings';
import ProviderDashboard from "./pages/ProviderDashboard";
import Protected from "./components/Protected";
import Payment from "./pages/Payment";

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
  { path: "my-bookings", element: <Protected />, children: [ { index: true, element: <MyBookings /> } ] },
  { path: "provider", element: <Protected />, children: [ { index: true, element: <ProviderDashboard /> } ] },
  { path: "payments/new", element: <Protected />, children: [ { index: true, element: <Payment /> } ] },
  { path: "payments/:id", element: <Protected />, children: [ { index: true, element: <Payment /> } ] },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);

// Optional: load Crisp chat widget if website ID is provided
type CrispEnv = ImportMeta & { env: { VITE_CRISP_WEBSITE_ID?: string } };
type CrispWindow = Window & {
  $crisp?: Array<[string, ...unknown[]]>;
  CRISP_WEBSITE_ID?: string;
  __CRISP_ID__?: string;
};

const envId = (import.meta as CrispEnv).env?.VITE_CRISP_WEBSITE_ID;
const winId = (window as CrispWindow).__CRISP_ID__;
const lsId = localStorage.getItem('CRISP_WEBSITE_ID') || undefined;
const CRISP_ID = envId || winId || lsId;
console.log('CRISP_WEBSITE_ID (env|window|ls):', envId, winId, lsId);
if (CRISP_ID) {
  const crispWindow = window as CrispWindow;
  crispWindow.$crisp = crispWindow.$crisp ?? [];
  crispWindow.CRISP_WEBSITE_ID = CRISP_ID;
  const d = document;
  const s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = true;
  s.onload = () => {
    try {
      // Ensure chat widget is visible; optionally open on first load
      crispWindow.$crisp?.push(["do", "chat:show"]);
      // Delay open slightly to avoid intrusive auto-open; uncomment to auto-open
      // setTimeout(() => crispWindow.$crisp?.push(["do", "chat:open"]), 300);
    } catch (error) {
      console.error('Error initializing Crisp chat', error);
    }
  };
  d.getElementsByTagName("head")[0].appendChild(s);
} else {
  console.warn('Crisp ID not set. Add VITE_CRISP_WEBSITE_ID in Solucionar-FrontEnd/.env, or set window.__CRISP_ID__ in index.html, or localStorage.CRISP_WEBSITE_ID via DevTools.');
}
