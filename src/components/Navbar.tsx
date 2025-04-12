import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/ledger">Ledger</Link>
      <Link to="/reports">Laporan Keuangan</Link>
    </nav>
  );
};

export default Navbar;
