declare global {
  interface Window {
    VercelEnv: {
      PUSH_PUBLIC_KEY: string;
      PUSH_PRIVATE_KEY: string;
      VERCEL_TOKEN: string;
    };
  }
}

export {};
