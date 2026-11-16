import { Link } from "react-router-dom";

export default function Brand({ to = "/" }) {
  return (
    <Link className="brand" to={to} aria-label="Smart Recruitment — về trang chính">
      <span className="brand-mark" aria-hidden="true">sr</span>
      <span className="brand-name">Smart<span>Recruitment</span></span>
    </Link>
  );
}
