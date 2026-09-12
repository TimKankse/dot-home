import { describe, expect, it } from 'vitest';

import {
  APP_REQUEST_HEADER,
  classifyRequestPath,
  validateAppMutationRequest,
} from './request-security';

describe('request path classification', () => {
  it.each([
    ['/login', 'GET', 'public-page'],
    ['/setup', 'GET', 'public-page'],
    ['/api/setup', 'POST', 'public-api'],
    ['/api/setup/check', 'GET', 'public-api'],
    ['/api/auth/session', 'GET', 'next-auth'],
    ['/api/auth/callback/credentials', 'POST', 'next-auth'],
    ['/_next/static/chunks/app.js', 'GET', 'static'],
    ['/_next/image', 'GET', 'static'],
    ['/dotHome-icon.png', 'GET', 'static'],
  ] as const)('classifies %s %s as %s', (pathname, method, expected) => {
    expect(classifyRequestPath(pathname, method)).toBe(expected);
  });

  it.each([
    ['/login.evil', 'GET'],
    ['/setup-admin', 'GET'],
    ['/forgot-password', 'GET'],
    ['/api/auth/forgot-password', 'POST'],
    ['/api/setup-anything', 'POST'],
    ['/api/users.json', 'GET'],
    ['/reports/quarter.pdf', 'GET'],
    ['/dotHome-icon.png/api/users', 'GET'],
    ['/_next/static/chunks/app.js', 'POST'],
  ] as const)('does not exempt application-like path %s', (pathname, method) => {
    expect(classifyRequestPath(pathname, method)).toBe('protected');
  });
});

describe('application mutation validation', () => {
  it('accepts a first-party request without canonical URL configuration', () => {
    const result = validateAppMutationRequest(new Request(
      'https://home.example.test/api/config',
      {
        method: 'POST',
        headers: {
          'Sec-Fetch-Site': 'same-origin',
          [APP_REQUEST_HEADER]: '1',
        },
      },
    ));
    expect(result).toEqual({ allowed: true });
  });

  it('rejects cross-site fetch metadata even with the application header', () => {
    const result = validateAppMutationRequest(new Request(
      'https://home.example.test/api/config',
      {
        method: 'POST',
        headers: {
          'Sec-Fetch-Site': 'cross-site',
          [APP_REQUEST_HEADER]: '1',
        },
      },
    ));
    expect(result).toMatchObject({ allowed: false, code: 'cross_site_request' });
  });

  it('rejects unsafe requests without the application header', () => {
    expect(validateAppMutationRequest(new Request(
      'https://home.example.test/api/config',
      { method: 'POST' },
    ))).toMatchObject({ allowed: false, code: 'missing_request_header' });
  });

  it('does not require the header for safe methods', () => {
    expect(validateAppMutationRequest(new Request(
      'https://home.example.test/api/config',
    ))).toEqual({ allowed: true });
  });
});
