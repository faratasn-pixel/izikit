import { describe, it, expect } from 'vitest';
import { classifySource } from './classify-source';

describe('classifySource', () => {
  it('classifies no referer as DIRECT', () => {
    expect(classifySource(null, null)).toBe('DIRECT');
  });

  it('classifies search engines as ORGANIC', () => {
    expect(classifySource('https://www.google.com/search?q=villa', null)).toBe('ORGANIC');
    expect(classifySource('https://www.bing.com/search?q=villa', null)).toBe('ORGANIC');
  });

  it('classifies social networks as SOCIAL', () => {
    expect(classifySource('https://www.facebook.com/', null)).toBe('SOCIAL');
    expect(classifySource('https://t.co/abc123', null)).toBe('SOCIAL');
  });

  it('classifies webmail referers as EMAIL', () => {
    expect(classifySource('https://mail.google.com/', null)).toBe('EMAIL');
  });

  it('classifies utm_source=email as EMAIL regardless of referer', () => {
    expect(classifySource('https://example.com/', 'email')).toBe('EMAIL');
  });

  it('classifies an unrecognized referer as OTHER', () => {
    expect(classifySource('https://random-blog.example/', null)).toBe('OTHER');
  });

  it('classifies a malformed referer as OTHER', () => {
    expect(classifySource('not-a-url', null)).toBe('OTHER');
  });
});
