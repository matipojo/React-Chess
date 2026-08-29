import { useEffect, useState } from "react";
import { getModelContext } from "../../model-context-types";

const BANNER_STYLES = {
  background: 'linear-gradient(90deg, #ff6f00, #d32f2f)',
  color: '#fff',
  padding: '12px 20px',
  textAlign: 'center' as const,
  fontSize: '14px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  flexWrap: 'wrap' as const,
};

const LINK_STYLES = {
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'underline',
};

export default function ModelContextBanner() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    setAvailable(Boolean(getModelContext()));
  }, []);

  if (available) {
    return null;
  }

  return (
    <div style={BANNER_STYLES}>
      <span>
        This demo requires the <strong>document.modelContext</strong> API.
        Download{' '}
        <a
          href="https://www.google.com/chrome/canary/"
          target="_blank"
          rel="noopener noreferrer"
          style={LINK_STYLES}
        >
          Chrome Canary
        </a>
        {' '}and enable{' '}
        <strong>chrome://flags/#enable-webmcp-testing</strong>
        {' '}to use AI tools with this chess game.
      </span>
    </div>
  );
}
