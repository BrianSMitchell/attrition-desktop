const viteMock = {
  env: {
    VITE_FORCE_DEV_MODE: 'false',
    VITE_API_URL: 'http://localhost:3000',
    MODE: 'test'
  }
};

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.import = { meta: viteMock };
}

export default viteMock;