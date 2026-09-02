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
        To learn with your AI agent, open this page in{' '}
        <a
          href="https://learn.chatgpt.com/docs/webmcp"
          target="_blank"
          rel="noopener noreferrer"
          style={LINK_STYLES}
        >
          Codex on ChatGPT desktop
        </a>
        , or use{' '}
        <a
          href="https://www.google.com/chrome/"
          target="_blank"
          rel="noopener noreferrer"
          style={LINK_STYLES}
        >
          Chrome
        </a>
        {' '}with{' '}
        <strong>chrome://flags/#enable-webmcp-testing</strong>
        {' '}enabled.
      </span>
    </div>
  );
}
