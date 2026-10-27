import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import StatusMessage from "./components/StatusMessage";
import CityEventsPage from "./pages/CityEventsPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import HomePage from "./pages/HomePage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (pathname === "/") document.title = "BayPulse · Bay Area Event Finder";
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          BayPulse
        </Link>
        <span className="topbar__tag">Bay Area Event Finder</span>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/city/:cityId" element={<CityEventsPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route
            path="*"
            element={
              <StatusMessage title="Page not found">
                <Link to="/">Go back to the city directory</Link>
              </StatusMessage>
            }
          />
        </Routes>
      </main>
      <footer className="footer">
        Event data © Ticketmaster · Maps © OpenStreetMap contributors · A learning & portfolio project
      </footer>
    </BrowserRouter>
  );
}
