import { useNavigate } from 'react-router-dom';
import { RiHome2Line, RiArrowLeftLine } from 'react-icons/ri';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <div className="notfound-number">404</div>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="notfound-actions">
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <RiHome2Line /> Go to Dashboard
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <RiArrowLeftLine /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
