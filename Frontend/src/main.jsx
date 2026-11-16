import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntdApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "antd/dist/reset.css";
import "./styles.css";

const theme = {
  token: {
    colorPrimary: "#2563EB",
    colorSuccess: "#15803D",
    colorWarning: "#B45309",
    colorError: "#B91C1C",
    colorText: "#172033",
    colorTextSecondary: "#526078",
    colorBorder: "#DCE3ED",
    colorBgLayout: "#F5F7FB",
    borderRadius: 8,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 16,
    controlHeight: 40,
  },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConfigProvider locale={viVN} theme={theme}>
      <AntdApp>
        <BrowserRouter>
          <AuthProvider><App /></AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
