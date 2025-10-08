import fs from 'fs';
import path from 'path';

describe('Render config and docs smoke tests', () => {
  test('render.yaml contains USE_REVERSE_PROXY_SSL: true', () => {
const file = path.resolve(__dirname, '../../../../config/deployment/render.yaml');
    const content = fs.readFileSync(file, 'utf8');
    expect(content).toMatch(/USE_REVERSE_PROXY_SSL\s*\n\s*value:\s*true/);
  });

  test('docs/deployment/render-tls.md exists', () => {
const file = path.resolve(__dirname, '../../../../docs/deployment/render-tls.md');
    expect(fs.existsSync(file)).toBe(true);
  });
});