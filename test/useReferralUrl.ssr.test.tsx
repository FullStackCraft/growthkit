/**
 * @jest-environment node
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useReferralUrl } from '../src/useReferralUrl';

function ServerComponent() {
  useReferralUrl({ productName: 'ssr-site' });
  return React.createElement('div', null, 'ok');
}

describe('useReferralUrl SSR safety', () => {
  it('does not throw during server render', () => {
    expect(() => renderToString(React.createElement(ServerComponent))).not.toThrow();
  });
});
